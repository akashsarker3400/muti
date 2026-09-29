import { NextResponse } from "next/server";

import {
  myAttendance,
  myCertificates,
  myFees,
  myOverview,
  myResults,
  myRoutine,
} from "@/app/actions/portal";
import { issueOtp, studentForToken, verifyOtp } from "@/lib/portal-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * The portal as JSON (addendum 2, section C).
 *
 * A mobile app has to be able to do everything the portal does, so no feature
 * may live only inside a server component. One route with a `what` parameter
 * rather than eight files: the shapes are the same objects the pages render,
 * and keeping them in one place is what stops the two drifting apart.
 *
 * Authentication is the same session token the browser holds in its cookie,
 * sent as `Authorization: Bearer <token>`. The token is minted by the same
 * OTP flow, so an app and a browser are the same kind of client.
 */

type Handler = () => Promise<unknown>;

const READS: Record<string, Handler> = {
  overview: myOverview,
  routine: myRoutine,
  attendance: myAttendance,
  fees: myFees,
  results: myResults,
  certificates: myCertificates,
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const what = url.searchParams.get("what") ?? "overview";

  const handler = READS[what];
  if (!handler) {
    return NextResponse.json(
      { ok: false, error: `Unknown resource "${what}"`, available: Object.keys(READS) },
      { status: 400 },
    );
  }

  // A bearer token stands in for the cookie; the server actions below read
  // whichever the request carries.
  const bearer = request.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (bearer) {
    const student = await studentForToken(bearer);
    if (!student) {
      return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
    }
  }

  const data = await handler();
  if (data === null) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, data });
}

/** `{ action: "request-code" | "sign-in", phone, code }`. */
export async function POST(request: Request) {
  const limit = await checkRateLimit("otp");
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many tries. Wait a few minutes." },
      { status: 429 },
    );
  }

  let body: { action?: string; phone?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Expected JSON" }, { status: 400 });
  }

  if (body.action === "request-code") {
    if (!body.phone) {
      return NextResponse.json({ ok: false, error: "phone is required" }, { status: 400 });
    }
    const result = await issueOtp(body.phone);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    if (result.code) {
      const { sendMessage } = await import("@/lib/messaging");
      await sendMessage({
        channel: "SMS",
        to: body.phone,
        body: `আপনার কোড ${result.code}। ৫ মিনিটের মধ্যে ব্যবহার করুন। MUTI`,
        template: "portal-otp",
        entity: "portal",
      });
    }
    // The same answer whether or not the number is a student's.
    return NextResponse.json({ ok: true, expiresAt: result.expiresAt });
  }

  if (body.action === "sign-in") {
    if (!body.phone || !body.code) {
      return NextResponse.json(
        { ok: false, error: "phone and code are required" },
        { status: 400 },
      );
    }
    const result = await verifyOtp(body.phone, body.code);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
    }
    return NextResponse.json({ ok: true, studentId: result.studentId });
  }

  return NextResponse.json(
    { ok: false, error: 'action must be "request-code" or "sign-in"' },
    { status: 400 },
  );
}
