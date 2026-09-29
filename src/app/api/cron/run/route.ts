import { NextResponse } from "next/server";

import { sweepAlerts } from "@/lib/alerts";
import { createBackup } from "@/lib/backup";
import { anonymizeOldAppointments } from "@/lib/health";
import { runReminders } from "@/lib/reminders";
import { pruneOldViews } from "@/lib/visitors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * One scheduled entry point (ERP addendum, 2.14).
 *
 * Coolify calls this once a night and everything runs: the reminders, the
 * retention sweeps and the database backup. The individual routes are still
 * there for anyone who wants a different schedule for one of them, but one
 * cron line is easier to set up correctly than four, and a job the office
 * forgot to schedule is a job that never runs.
 *
 * Each step is caught on its own: a failed backup must not stop tomorrow's
 * class reminders going out.
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

  const results: Record<string, unknown> = {};

  async function step<T>(name: string, run: () => Promise<T>) {
    try {
      results[name] = await run();
    } catch (error) {
      console.error(`Scheduled job "${name}" failed`, error);
      results[name] = { error: (error as Error).message?.slice(0, 200) ?? "failed" };
    }
  }

  await step("reminders", runReminders);
  await step("alerts", sweepAlerts);
  await step("anonymize", anonymizeOldAppointments);
  await step("pruneViews", pruneOldViews);
  await step("backup", createBackup);

  return NextResponse.json({ ok: true, ...results });
}

export const GET = POST;
