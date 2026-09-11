import { NextResponse } from "next/server";

import { anonymizeOldAppointments } from "@/lib/health";

export const dynamic = "force-dynamic";

/**
 * Nightly anonymisation of health appointments older than 90 days (addendum
 * 4, §5). Coolify runs `curl -fsS -H "Authorization: Bearer $CRON_SECRET"
 * http://localhost:3000/api/cron/anonymize` on a schedule; the admin page
 * also sweeps opportunistically, so a missed night costs nothing.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const anonymized = await anonymizeOldAppointments();
  return NextResponse.json({ ok: true, anonymized });
}

export const GET = POST;
