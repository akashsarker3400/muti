import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Healthcheck used by the Coolify container check (section 12). It verifies
 * that the app is up *and* that Postgres answers, so a database outage marks
 * the container unhealthy instead of serving broken pages.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "up" });
  } catch (error) {
    console.error("Healthcheck failed", error);
    return NextResponse.json({ status: "error", db: "down" }, { status: 503 });
  }
}
