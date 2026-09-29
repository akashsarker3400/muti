import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

import { GenerateSessionsButton } from "@/components/admin/generate-sessions-button";
import { SessionRow } from "@/components/admin/session-row";
import {
  AdminBadge,
  AdminPageHeader,
  EmptyState,
  Panel,
  StatCard,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Classes" };

/**
 * The class register of one batch (addendum 2, B1).
 *
 * Generated from the course routine and editable afterwards, because a real
 * timetable moves: a teacher falls ill, a hartal closes the road, a practical
 * runs long. The dates here are the ones attendance is taken against.
 */
export default async function BatchSessionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("attendance.view");
  const { id } = await params;

  const [batch, teachers] = await Promise.all([
    prisma.batch.findUnique({
      where: { id },
      include: {
        course: { select: { nameEn: true, code: true } },
        _count: { select: { students: true } },
        sessions: {
          orderBy: [{ date: "asc" }, { createdAt: "asc" }],
          include: {
            teacher: { select: { id: true, name: true } },
            _count: { select: { attendance: true } },
          },
        },
      },
    }),
    prisma.faculty.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!batch) notFound();

  const done = batch.sessions.filter((session) => session.status === "DONE").length;
  const planned = batch.sessions.filter(
    (session) => session.status === "PLANNED",
  ).length;

  return (
    <>
      <AdminPageHeader
        title={`Classes — ${batch.name}`}
        description={`${batch.course.nameEn} · ${batch._count.students} student${batch._count.students === 1 ? "" : "s"}${batch.classDays ? ` · ${batch.classDays}` : ""}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="cta">
              <Link href={`/admin/batches/${batch.id}`}>Edit batch</Link>
            </Button>
            <GenerateSessionsButton batchId={batch.id} />
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Classes" value={batch.sessions.length} />
        <StatCard label="Taken" value={done} hint="attendance saved" />
        <StatCard label="Still to come" value={planned} />
      </div>

      {batch.sessions.length === 0 ? (
        <EmptyState
          title="No classes yet."
          description="Press “Generate from routine” to create one class per routine row, spaced across this batch's class days. Every date can be changed afterwards."
        />
      ) : (
        <Panel padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)]">
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    Topic
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-start font-semibold lg:table-cell"
                  >
                    Teacher
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-end font-semibold">
                    Register
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {batch.sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={{
                      id: session.id,
                      date: session.date.toISOString(),
                      startTime: session.startTime,
                      topic: session.topic,
                      type: session.type,
                      status: session.status,
                      teacherId: session.teacherId,
                      teacherName: session.teacher?.name ?? null,
                      marked: session._count.attendance,
                    }}
                    teachers={teachers}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Panel className="mt-5 text-sm text-[color:var(--muted-foreground)]">
        <p className="flex items-start gap-2">
          <ClipboardCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <AdminBadge tone="success">Taken</AdminBadge> means the register has been
            saved for that class. A student&rsquo;s attendance percentage counts present
            and late against the classes marked taken, so a class nobody registered does
            not count against anybody.
          </span>
        </p>
      </Panel>
    </>
  );
}
