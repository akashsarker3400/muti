import Link from "next/link";
import { notFound } from "next/navigation";

import { AttendanceSheet } from "@/components/admin/attendance-sheet";
import { AdminPageHeader, EmptyState } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Attendance" };

/**
 * The register for one class (addendum 2, B1).
 *
 * Taken on a phone at the front of a room, so everybody starts present and the
 * teacher taps the few who are not. That is both the common case and the fast
 * one; making somebody tap thirty names to record a full house would mean the
 * register stops being taken by the second week.
 */
export default async function SessionRegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requirePermission("attendance.view");
  const { id } = await params;

  const session = await prisma.classSession.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, name: true, userId: true } },
      batch: {
        select: {
          id: true,
          name: true,
          students: {
            where: { deletedAt: null, status: { not: "DROPPED" } },
            orderBy: { roll: "asc" },
            select: { id: true, roll: true, name: true, photo: true },
          },
        },
      },
      attendance: { select: { studentId: true, status: true } },
    },
  });
  if (!session) notFound();

  const me = await requireAdmin();
  // A teacher marks their own classes only; the office marks anybody's,
  // because somebody has to when a teacher is away.
  const mine = me.role !== "TEACHER" || session.teacher?.userId === me.id;

  const existing = new Map(
    session.attendance.map((row) => [row.studentId, row.status] as const),
  );

  return (
    <>
      <AdminPageHeader
        title={session.topic}
        description={`${session.batch.name} · ${formatDate(session.date, "en")}${session.startTime ? ` · ${session.startTime}` : ""}${session.teacher ? ` · ${session.teacher.name}` : ""}`}
        action={
          <Button asChild variant="outline" size="cta">
            <Link href={`/admin/batches/${session.batch.id}/sessions`}>
              All classes
            </Link>
          </Button>
        }
      />

      {session.batch.students.length === 0 ? (
        <EmptyState
          title="No students in this batch."
          description="Add students to the batch before taking the register."
        />
      ) : !mine ? (
        <EmptyState
          title="This class is not yours."
          description="A teacher can take the register for their own classes. Ask the office to mark this one, or to assign the class to you."
        />
      ) : (
        <AttendanceSheet
          sessionId={session.id}
          canMark={hasMarkPermission(admin.permissions, admin.role)}
          students={session.batch.students.map((student) => ({
            id: student.id,
            roll: student.roll,
            name: student.name,
            photo: student.photo,
            status: existing.get(student.id) ?? "PRESENT",
          }))}
          alreadyTaken={session.attendance.length > 0}
        />
      )}
    </>
  );
}

/** Viewing the register is a wider permission than writing it. */
function hasMarkPermission(permissions: string[], role: string): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "STAFF" ||
    role === "TEACHER" ||
    permissions.includes("attendance.mark")
  );
}
