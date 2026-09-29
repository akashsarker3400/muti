import Link from "next/link";
import { notFound } from "next/navigation";

import { MarksGrid } from "@/components/admin/marks-grid";
import { AdminPageHeader, EmptyState, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { formatDate } from "@/lib/format";
import { parseScale } from "@/lib/grades";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Marks" };

/** The marks grid for one examination (addendum 2, B3). */
export default async function ExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("exams.manage");
  const me = await requireAdmin();
  const { id } = await params;

  const [settings, exam] = await Promise.all([
    getSiteSettings(),
    prisma.exam.findUnique({
      where: { id },
      include: {
        batch: {
          select: {
            id: true,
            name: true,
            students: {
              where: { deletedAt: null, status: { not: "DROPPED" } },
              orderBy: { roll: "asc" },
              select: { id: true, roll: true, name: true },
            },
          },
        },
        marks: true,
      },
    }),
  ]);
  if (!exam) notFound();

  const existing = new Map(exam.marks.map((mark) => [mark.studentId, mark]));
  const scale = parseScale(settings.results.gradeScale);

  return (
    <>
      <AdminPageHeader
        title={exam.name}
        description={`${exam.batch.name} · ${exam.date ? formatDate(exam.date, "en") : "no date"} · full marks ${exam.fullMarks}, pass ${exam.passMarks}`}
        action={
          <Button asChild variant="outline" size="cta">
            <Link href={`/admin/batches/${exam.batch.id}/exams`}>All examinations</Link>
          </Button>
        }
      />

      {exam.batch.students.length === 0 ? (
        <EmptyState
          title="No students in this batch."
          description="Add students to the batch before entering marks."
        />
      ) : (
        <>
          {exam.published && (
            <Panel className="mb-4 text-sm">
              This result is <strong>published</strong>. Changing a mark now changes
              what a student has already been told, so correct it only with a reason
              you would be happy to give them.
            </Panel>
          )}

          <MarksGrid
            examId={exam.id}
            fullMarks={exam.fullMarks}
            passMarks={exam.passMarks}
            published={exam.published}
            canPublish={hasPermission(me, "results.publish")}
            scale={scale}
            rows={exam.batch.students.map((student) => {
              const mark = existing.get(student.id);
              return {
                studentId: student.id,
                roll: student.roll,
                name: student.name,
                marks: mark?.marks ?? null,
                remark: mark?.remark ?? "",
              };
            })}
          />
        </>
      )}
    </>
  );
}
