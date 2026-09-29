"use server";

import { revalidatePath } from "next/cache";

import type { AttendanceStatus } from "@/generated/prisma/enums";
import { logActivity, requireAdmin, requirePermission } from "@/lib/admin-auth";
import { classDates, parseClassDays } from "@/lib/class-days";
import { prisma } from "@/lib/prisma";

/** Attendance (addendum 2, B1): sessions, marking, and who may mark what. */

/**
 * A teacher may only touch their own classes.
 *
 * The office (STAFF, SUPER_ADMIN) marks anybody's, because somebody has to
 * when a teacher is off sick. A TEACHER account is restricted to sessions
 * assigned to their own faculty record, which is the whole reason that role
 * can be handed out at all.
 */
async function requireSessionAccess(sessionId: string) {
  const admin = await requirePermission("attendance.mark");
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: { teacher: { select: { userId: true } } },
  });
  if (!session) return { ok: false as const, error: "That class no longer exists." };

  if (admin.role === "TEACHER" && session.teacher?.userId !== admin.id) {
    return { ok: false as const, error: "That class is not yours to mark." };
  }
  return { ok: true as const, admin, session };
}

/**
 * Writes one class per routine row, spaced across the batch's class days.
 *
 * Skips the rows that already have a session, so pressing it again after the
 * course routine grew adds the new classes without disturbing the dates the
 * office has already fixed.
 */
export async function generateSessions(
  batchId: string,
): Promise<{ ok: boolean; created?: number; error?: string }> {
  const admin = await requirePermission("attendance.mark");

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      course: { include: { routines: { orderBy: { sortOrder: "asc" } } } },
      sessions: { select: { courseRoutineId: true } },
    },
  });
  if (!batch) return { ok: false, error: "That batch no longer exists." };
  if (batch.course.routines.length === 0) {
    return {
      ok: false,
      error: "This course has no routine yet. Add the classes to the course first.",
    };
  }

  const already = new Set(
    batch.sessions.map((session) => session.courseRoutineId).filter(Boolean),
  );
  const pending = batch.course.routines.filter((routine) => !already.has(routine.id));
  if (pending.length === 0) {
    return { ok: true, created: 0 };
  }

  const dates = classDates(
    batch.startDate ?? new Date(),
    pending.length,
    parseClassDays(batch.classDays),
  );

  try {
    await prisma.classSession.createMany({
      data: pending.map((routine, index) => ({
        batchId: batch.id,
        courseRoutineId: routine.id,
        date: dates[index] ?? new Date(),
        startTime: batch.classTime,
        topic: routine.title,
        type: routine.type,
      })),
    });
    await logActivity(admin.id, "sessions-generate", "batch", batch.id);
    revalidatePath(`/admin/batches/${batch.id}/sessions`);
    return { ok: true, created: pending.length };
  } catch (error) {
    console.error("generateSessions failed", error);
    return { ok: false, error: "Could not create the classes." };
  }
}

/** Edits one class: date, time, topic, teacher, status. */
export async function saveSession(input: {
  id: string;
  date?: string;
  startTime?: string;
  topic?: string;
  teacherId?: string;
  status?: "PLANNED" | "DONE" | "CANCELLED";
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const access = await requireSessionAccess(input.id);
  if (!access.ok) return access;

  const date = input.date ? new Date(`${input.date}T00:00:00.000Z`) : undefined;
  if (date && Number.isNaN(date.getTime())) {
    return { ok: false, error: "That date could not be read." };
  }

  try {
    await prisma.classSession.update({
      where: { id: input.id },
      data: {
        ...(date ? { date } : {}),
        ...(input.startTime !== undefined
          ? { startTime: input.startTime.trim() || null }
          : {}),
        ...(input.topic !== undefined ? { topic: input.topic.trim() } : {}),
        ...(input.teacherId !== undefined
          ? { teacherId: input.teacherId || null }
          : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.note !== undefined ? { note: input.note.trim() || null } : {}),
      },
    });
    await logActivity(access.admin.id, "session-save", "classSession", input.id);
    revalidatePath(`/admin/batches/${access.session.batchId}/sessions`);
    return { ok: true };
  } catch (error) {
    console.error("saveSession failed", error);
    return { ok: false, error: "Could not save the class." };
  }
}

export async function deleteSession(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const access = await requireSessionAccess(id);
  if (!access.ok) return access;

  try {
    await prisma.classSession.delete({ where: { id } });
    await logActivity(access.admin.id, "session-delete", "classSession", id);
    revalidatePath(`/admin/batches/${access.session.batchId}/sessions`);
    return { ok: true };
  } catch (error) {
    console.error("deleteSession failed", error);
    return { ok: false, error: "Could not delete the class." };
  }
}

/**
 * Saves the register for one class and marks it DONE.
 *
 * Every student of the batch gets a row, including the absent ones: "marked
 * absent" and "nobody took the register" are different facts, and the
 * attendance percentage is only honest if both are recorded.
 */
export async function markAttendance(input: {
  sessionId: string;
  marks: Array<{ studentId: string; status: AttendanceStatus }>;
}): Promise<{ ok: boolean; saved?: number; error?: string }> {
  const access = await requireSessionAccess(input.sessionId);
  if (!access.ok) return access;

  const students = await prisma.student.findMany({
    where: { batchId: access.session.batchId, deletedAt: null },
    select: { id: true },
  });
  const known = new Set(students.map((student) => student.id));
  const marks = input.marks.filter((mark) => known.has(mark.studentId));

  try {
    await prisma.$transaction([
      ...marks.map((mark) =>
        prisma.attendance.upsert({
          where: {
            sessionId_studentId: {
              sessionId: input.sessionId,
              studentId: mark.studentId,
            },
          },
          create: {
            sessionId: input.sessionId,
            studentId: mark.studentId,
            status: mark.status,
            markedById: access.admin.id,
          },
          update: {
            status: mark.status,
            markedById: access.admin.id,
            markedAt: new Date(),
          },
        }),
      ),
      prisma.classSession.update({
        where: { id: input.sessionId },
        data: { status: "DONE" },
      }),
    ]);

    await logActivity(
      access.admin.id,
      "attendance",
      "classSession",
      input.sessionId,
    );
    revalidatePath(`/admin/batches/${access.session.batchId}/sessions`);
    revalidatePath(`/admin/sessions/${input.sessionId}`);
    return { ok: true, saved: marks.length };
  } catch (error) {
    console.error("markAttendance failed", error);
    return { ok: false, error: "Could not save the register." };
  }
}

/** The teacher's own list, for the TEACHER role's landing page. */
export async function mySessions() {
  const admin = await requireAdmin();
  const faculty = await prisma.faculty.findUnique({
    where: { userId: admin.id },
    select: { id: true },
  });
  if (!faculty) return [];

  return prisma.classSession.findMany({
    where: { teacherId: faculty.id },
    orderBy: { date: "asc" },
    include: { batch: { select: { name: true } } },
    take: 100,
  });
}
