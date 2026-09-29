import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { CertificateIssueForm } from "@/components/admin/certificate-issue-form";
import { AdminPageHeader, EmptyState, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/admin-auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Issue certificates" };

/**
 * Bulk issue, one batch at a time (proposal stage 3).
 *
 * A batch is the unit the office actually works in: the whole group finishes
 * together, so the numbers should be allocated together and in roll order.
 * Everything created here is a draft until it is approved on the register.
 */
export default async function IssueCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  await requirePermission("certificates.manage");
  const { batch: batchId } = await searchParams;

  const batches = await prisma.batch.findMany({
    // `deletedAt` is spelt out because a relation filter is not covered by the
    // client's soft-delete extension (ERP addendum, 2.4).
    where: { deletedAt: null, students: { some: { deletedAt: null } } },
    select: {
      id: true,
      name: true,
      startDate: true,
      course: { select: { code: true } },
      _count: { select: { students: true } },
    },
    orderBy: [{ startDate: "desc" }, { name: "asc" }],
    take: 200,
  });

  const selected = batchId ? batches.find((row) => row.id === batchId) : undefined;

  const batch = selected
    ? await prisma.batch.findUnique({
        where: { id: selected.id },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          course: { select: { code: true, fullNameEn: true } },
          students: {
            where: { deletedAt: null },
            orderBy: { roll: "asc" },
            select: {
              id: true,
              roll: true,
              name: true,
              status: true,
              resultGrade: true,
              certificates: {
                where: { deletedAt: null },
                select: { type: true, certificateNo: true },
              },
            },
          },
        },
      })
    : null;

  return (
    <>
      <AdminPageHeader
        title="Issue certificates"
        description="Pick a batch, tick the students who have completed, and the numbers are taken from the series in roll order. Nothing can be printed until it is approved on the register."
        action={
          <Button asChild variant="outline" size="cta">
            <Link href="/admin/certificates/register">
              <ClipboardList className="size-4" aria-hidden="true" />
              Register
            </Link>
          </Button>
        }
      />

      <Panel className="mb-5">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="batch" className="mb-1 block text-sm font-medium">
              Batch
            </label>
            <select
              id="batch"
              name="batch"
              defaultValue={selected?.id ?? ""}
              className="h-11 w-full rounded-md border border-[color:var(--input)] bg-white px-3 text-sm focus-visible:border-[color:var(--brand)] focus-visible:outline-none"
            >
              <option value="">Choose a batch…</option>
              {batches.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.course.code} ·{" "}
                  {row._count.students === 1
                    ? "1 student"
                    : `${row._count.students} students`}
                  {row.startDate ? ` · from ${formatDate(row.startDate, "en")}` : ""}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="brand" size="cta">
            Load students
          </Button>
        </form>
      </Panel>

      {batches.length === 0 ? (
        <EmptyState
          title="No batch has any students yet."
          description="Add students to a batch first, or import them from a spreadsheet."
          action={
            <Button asChild variant="brand" size="cta">
              <Link href="/admin/students">Students</Link>
            </Button>
          }
        />
      ) : !batch ? (
        <EmptyState
          title="Choose a batch above."
          description="The students of that batch will be listed here with a tick box each."
        />
      ) : (
        <CertificateIssueForm
          batchId={batch.id}
          batchName={batch.name}
          courseName={`${batch.course.code} — ${batch.course.fullNameEn}`}
          students={batch.students.map((student) => ({
            id: student.id,
            roll: student.roll,
            name: student.name,
            status: student.status,
            grade: student.resultGrade ?? "",
            existing: student.certificates.map((certificate) => ({
              type: certificate.type,
              certificateNo: certificate.certificateNo,
            })),
          }))}
        />
      )}
    </>
  );
}
