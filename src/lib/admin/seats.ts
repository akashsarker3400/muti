import "server-only";

import { revalidateTag } from "next/cache";

import { BATCHES_TAG } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

/**
 * Keeps `Batch.seatsFilled` up to date (addendum 2, A1).
 *
 * The counter rises automatically when an application is admitted into a batch
 * or a student is created in one. As soon as an admin types a number into the
 * field by hand, `seatsFilledManual` is set and these helpers leave the batch
 * alone — the office's own count always wins over our guess.
 */

/** Drops the 60-second public cache so a correction shows up immediately. */
export function revalidateBatches() {
  revalidateTag(BATCHES_TAG);
}

export async function bumpSeatsFilled(
  batchId: string | null | undefined,
  by = 1,
): Promise<void> {
  if (!batchId) return;

  try {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { seatsFilled: true, seatsFilledManual: true },
    });

    if (!batch || batch.seatsFilledManual) return;

    await prisma.batch.update({
      where: { id: batchId },
      // Never go below zero, and never count past a removed admission.
      data: { seatsFilled: Math.max(0, batch.seatsFilled + by) },
    });

    revalidateBatches();
  } catch (error) {
    // A miscounted seat must never fail the admission it came from.
    console.error("Could not update the batch seat counter", error);
  }
}
