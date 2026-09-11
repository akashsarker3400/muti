import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Promo click counter (homepage additions, 1). Called with `sendBeacon` as
 * the visitor leaves, so it answers 204 whatever happens: a lost count must
 * never surface as an error on the site.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { id?: unknown };
    const id = typeof body.id === "string" ? body.id : "";
    if (/^[a-z0-9]{10,40}$/i.test(id)) {
      await prisma.promo.updateMany({
        where: { id },
        data: { clicks: { increment: 1 } },
      });
    }
  } catch {
    // Malformed beacon or database hiccup: ignore.
  }
  return new NextResponse(null, { status: 204 });
}
