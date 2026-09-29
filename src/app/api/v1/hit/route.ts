import { NextResponse } from "next/server";

import { clientIp, checkRateLimit } from "@/lib/rate-limit";
import { recordHit } from "@/lib/visitors";

export const dynamic = "force-dynamic";

/**
 * The visitor counter (addendum 2, A6). One small POST per page view from
 * `<VisitorBeacon />`, answered with 204 and nothing else.
 *
 * Public by necessity, so it is capped per address: a script hammering it
 * would otherwise inflate the office's numbers, which is worse than having no
 * numbers at all. Nothing here can read or change any other data.
 */
export async function POST(request: Request) {
  let body: { path?: unknown; locale?: unknown; referrer?: unknown };
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  if (typeof body.path !== "string") return new NextResponse(null, { status: 204 });

  // 240 views an hour from one address is a busy reader; beyond that it is a
  // script, and the count is quietly dropped rather than argued with.
  const limit = await checkRateLimit("hit");
  if (!limit.allowed) return new NextResponse(null, { status: 204 });

  await recordHit(
    {
      path: body.path,
      locale: typeof body.locale === "string" ? body.locale : null,
      referrer: typeof body.referrer === "string" ? body.referrer : null,
      ip: await clientIp(),
      userAgent: request.headers.get("user-agent") ?? "",
    },
    new URL(request.url).hostname,
  );

  return new NextResponse(null, { status: 204 });
}
