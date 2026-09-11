import { ImportWizard } from "@/components/admin/import-wizard";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin-auth";
import { formatDate } from "@/lib/format";
import { IMPORT_ENTITIES } from "@/lib/admin/import/entities";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Bulk import (addendum 3, §3) plus the last ten import runs. */
export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; examId?: string }>;
}) {
  await requirePermission("import.run");
  const { entity = "students", examId = "" } = await searchParams;

  const [exams, jobs] = await Promise.all([
    prisma.boardExam.findMany({
      orderBy: [{ publishedOn: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, session: true },
    }),
    prisma.importJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { uploadedBy: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Import (CSV / Excel)"
        description="Load students, certificates, board results and advisors in bulk. Download a template, fill it in, upload. Adding records one by one still works as before."
      />

      <ImportWizard
        initialEntity={entity}
        exams={exams.map((exam) => ({
          id: exam.id,
          label: `${exam.title} — ${exam.session}`,
        }))}
        initialExamId={examId}
      />

      {jobs.length > 0 && (
        <Panel className="mt-6 overflow-x-auto p-0">
          <h2 className="px-4 pt-4 text-base font-semibold">Recent imports</h2>
          <table className="mt-2 w-full text-sm">
            <thead className="bg-[color:var(--bg-soft)] text-xs text-[color:var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-2 text-start font-medium">Time</th>
                <th className="px-4 py-2 text-start font-medium">Type</th>
                <th className="px-4 py-2 text-start font-medium">File</th>
                <th className="px-4 py-2 text-start font-medium">By</th>
                <th className="px-4 py-2 text-end font-medium">Created</th>
                <th className="px-4 py-2 text-end font-medium">Updated</th>
                <th className="px-4 py-2 text-end font-medium">Skipped</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatDate(job.createdAt, "en")}
                  </td>
                  <td className="px-4 py-2">
                    {IMPORT_ENTITIES[job.entity]?.labelEn ?? job.entity}
                  </td>
                  <td className="max-w-[16rem] truncate px-4 py-2 font-latin text-xs">
                    {job.fileName}
                  </td>
                  <td className="px-4 py-2">{job.uploadedBy?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-end font-latin">{job.created}</td>
                  <td className="px-4 py-2 text-end font-latin">{job.updated}</td>
                  <td className="px-4 py-2 text-end font-latin">{job.skipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
