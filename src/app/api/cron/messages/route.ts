import { NextResponse } from "next/server";

import { runReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/**
 * The automatic reminders (addendum 2, A4). Coolify runs
 * `curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/messages`
 * once a day, in the morning.
 *
 * Safe to run as often as anyone likes: every message carries a unique dedupe
 * key, so a second run in the same day sends nothing at all.
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

  const summary = await runReminders();
  return NextResponse.json({ ok: true, ...summary });
}

export const GET = POST;
