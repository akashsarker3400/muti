import { NextResponse } from "next/server";

import { anonymizeOldAppointments } from "@/lib/health";
import { pruneOldViews } from "@/lib/visitors";

export const dynamic = "force-dynamic";

/**
 * Nightly data retention. Two jobs, because they are the same promise made
 * twice: health appointments older than 90 days are anonymised (addendum 4,
 * §5) and page views older than 180 days are deleted (addendum 2, A6).
 *
 * Coolify runs `curl -fsS -H "Authorization: Bearer $CRON_SECRET"
 * http://localhost:3000/api/cron/anonymize` on a schedule; the admin page
 * also sweeps appointments opportunistically, so a missed night costs nothing.
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
  const viewsDeleted = await pruneOldViews().catch((error) => {
    console.error("Could not prune page views", error);
    return 0;
  });
  return NextResponse.json({ ok: true, anonymized, viewsDeleted });
}

export const GET = POST;
