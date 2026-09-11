import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Upload } from "lucide-react";

import { BoardResultsEditor } from "@/components/admin/board-results-editor";
import { AdminBadge, AdminPageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Result rows of one board exam (addendum 3, §2). */
export default async function BoardExamResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("results.manage");
  const { id } = await params;

  const exam = await prisma.boardExam.findUnique({
    where: { id },
    include: {
      results: {
        orderBy: { roll: "asc" },
        include: { student: { select: { name: true } } },
      },
    },
  });
  if (!exam) notFound();

  const pass = exam.results.filter((r) => r.status === "PASS").length;

  return (
    <>
      <AdminPageHeader
        title={exam.title}
        description={`${exam.session} · ${exam.results.length} rows, ${pass} passed · ${exam.published ? "Published" : "Unpublished"}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="cta">
              <Link href={`/admin/import?entity=board-results&examId=${exam.id}`}>
                <Upload className="size-4" aria-hidden="true" />
                Import
              </Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <a href={`/api/admin/export/board-results?examId=${exam.id}`}>
                <Download className="size-4" aria-hidden="true" />
                CSV
              </a>
            </Button>
            <Button asChild variant="outline" size="cta">
              <Link href={`/admin/board-exams/${exam.id}`}>Edit exam</Link>
            </Button>
          </div>
        }
      />

      {!exam.published && (
        <p className="mb-4 flex items-center gap-2 text-sm text-[color:var(--muted-foreground)]">
          <AdminBadge tone="warning">Unpublished</AdminBadge>
          These results cannot be searched on /results until the exam is published.
        </p>
      )}

      <BoardResultsEditor
        examId={exam.id}
        initialRows={exam.results.map((row) => ({
          id: row.id,
          roll: row.roll,
          registrationNo: row.registrationNo ?? "",
          studentName: row.studentName ?? row.student?.name ?? "",
          status: row.status,
          gpa: row.gpa ? row.gpa.toFixed(2) : "",
          failedSubjects: row.failedSubjects ?? "",
          remark: row.remark ?? "",
          linked: Boolean(row.studentId),
        }))}
      />
    </>
  );
}
