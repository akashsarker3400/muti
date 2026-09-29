"use server";

import { revalidatePath } from "next/cache";

import { logActivity, requireAdmin } from "@/lib/admin-auth";
import { bumpSeatsFilled } from "@/lib/admin/seats";
import { allocateRoll } from "@/lib/roll-number";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSiteSettings } from "@/lib/site-settings";

/** Student actions: roll numbers, and admitting an applicant (ERP addendum, 2.7/2.9). */

export type RollResult = { ok: true; roll: string } | { ok: false; error: string };

/** The next roll in this course's series for this year. */
export async function nextRollNumber(input: { courseId: string }): Promise<RollResult> {
  const admin = await requireAdmin();
  if (!input.courseId) {
    return { ok: false, error: "Choose the course first, then press Generate." };
  }

  // Every generated roll is spent whether or not the student is saved.
  const limit = await checkRateLimit("certificateNumber", `roll:${admin.id}`);
  if (!limit.allowed) {
    return { ok: false, error: "Too many roll numbers generated in the last hour." };
  }

  const settings = await getSiteSettings();
  const roll = await allocateRoll(admin.id, {
    courseId: input.courseId,
    prefix: settings.documents.certificatePrefix || "MUTI",
  });

  return roll
    ? { ok: true, roll }
    : { ok: false, error: "Could not generate a roll number. Check the course." };
}

/**
 * Turns an application into a student record (ERP addendum, 2.9).
 *
 * The office already typed everything at the desk, so nobody should type it
 * again: this copies the application across, takes the next roll in the
 * series, links the two records and marks the application admitted. Running it
 * twice is safe — the second press opens the student that already exists.
 */
export async function admitApplication(
  applicationId: string,
): Promise<
  { ok: true; studentId: string; roll: string } | { ok: false; error: string }
> {
  const admin = await requireAdmin();

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { student: { select: { id: true, roll: true } } },
  });
  if (!application) return { ok: false, error: "That application no longer exists." };
  if (application.student) {
    return {
      ok: true,
      studentId: application.student.id,
      roll: application.student.roll,
    };
  }
  if (!application.courseId) {
    return {
      ok: false,
      error: "This application has no course on it. Set the course first.",
    };
  }

  const settings = await getSiteSettings();
  const roll = await allocateRoll(admin.id, {
    courseId: application.courseId,
    prefix: settings.documents.certificatePrefix || "MUTI",
  });
  if (!roll) return { ok: false, error: "Could not allocate a roll number." };

  try {
    const student = await prisma.student.create({
      data: {
        roll,
        applicationId: application.id,
        name: application.name,
        phone: application.phone,
        email: application.email,
        photo: application.photo,
        courseId: application.courseId,
        batchId: application.batchId,
        dateOfBirth: application.dateOfBirth,
        fatherName: application.fatherName,
        motherName: application.motherName,
        nid: application.nationalId,
        bmdc: application.bmdc,
        bloodGroup: application.bloodGroup,
        address: application.presentAddress,
        admissionDate: new Date(),
        status: "ACTIVE",
      },
      select: { id: true },
    });

    // Admitting fills a seat, exactly as the status change does, and the
    // status moves with it so the inbox and the register agree.
    if (application.status !== "ADMITTED") {
      await prisma.application.update({
        where: { id: application.id },
        data: { status: "ADMITTED" },
      });
      await bumpSeatsFilled(application.batchId, 1);
    }

    // The fee plan comes with the admission: half at the desk and the rest
    // monthly, which is what the office was going to write down anyway.
    // A failure here must not undo the admission, so it is caught.
    try {
      const { createFeePlan } = await import("@/app/actions/admin-fees");
      await createFeePlan({ studentId: student.id });
    } catch (error) {
      console.error("Could not create the fee plan on admission", error);
    }

    await logActivity(admin.id, "admit", "application", application.id);
    await logActivity(admin.id, "create", "student", student.id);
    revalidatePath("/admin/applications");
    revalidatePath("/admin/students");

    return { ok: true, studentId: student.id, roll };
  } catch (error) {
    console.error("admitApplication failed", error);
    return { ok: false, error: "Could not create the student record." };
  }
}
