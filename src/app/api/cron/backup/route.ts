import { NextResponse } from "next/server";

import { createBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";
/** A dump of a few megabytes takes seconds, but never assume the database is small. */
export const maxDuration = 300;

/**
 * The nightly database backup (addendum 2, A6). Coolify runs
 * `curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/backup`
 * once a night, and the last fourteen dumps are kept.
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

  const result = await createBackup();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export const GET = POST;
