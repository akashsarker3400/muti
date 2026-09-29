import Link from "next/link";
import { notFound } from "next/navigation";

import { ExamList } from "@/components/admin/exam-list";
import { AdminPageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Examinations" };

/** The institute's own examinations for one batch (addendum 2, B3). */
export default async function BatchExamsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("exams.manage");
  const { id } = await params;

  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      course: { select: { nameEn: true } },
      _count: { select: { students: true } },
      exams: {
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        include: { _count: { select: { marks: true } } },
      },
    },
  });
  if (!batch) notFound();

  return (
    <>
      <AdminPageHeader
        title={`Examinations — ${batch.name}`}
        description={`${batch.course.nameEn} · ${batch._count.students} student${batch._count.students === 1 ? "" : "s"}`}
        action={
          <Button asChild variant="outline" size="cta">
            <Link href={`/admin/batches/${batch.id}/sessions`}>Classes</Link>
          </Button>
        }
      />

      <ExamList
        batchId={batch.id}
        exams={batch.exams.map((exam) => ({
          id: exam.id,
          name: exam.name,
          date: exam.date ? exam.date.toISOString() : null,
          fullMarks: exam.fullMarks,
          passMarks: exam.passMarks,
          published: exam.published,
          marked: exam._count.marks,
        }))}
      />
    </>
  );
}
