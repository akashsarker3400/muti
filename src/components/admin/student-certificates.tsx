import Link from "next/link";
import { Award, Plus } from "lucide-react";

import { AdminBadge, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/** Read-only list of a student's certificates under the student editor (addendum 3, §1). */
export async function StudentCertificates({ studentId }: { studentId: string }) {
  const certificates = await prisma.certificate.findMany({
    where: { studentId, deletedAt: null },
    include: { course: { select: { code: true } } },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Award className="size-4 text-[color:var(--brand)]" aria-hidden="true" />
          Certificates
        </h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/certificates/new">
            <Plus className="size-4" aria-hidden="true" />
            New certificate
          </Link>
        </Button>
      </div>

      {certificates.length === 0 ? (
        <p className="text-sm text-[color:var(--muted-foreground)]">
          This student has no certificate records.
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--border)] text-sm">
          {certificates.map((certificate) => (
            <li key={certificate.id} className="flex flex-wrap items-center gap-3 py-2">
              <Link
                href={`/admin/certificates/${certificate.id}`}
                className="font-latin font-semibold text-[color:var(--brand)] hover:underline"
              >
                {certificate.certificateNo}
              </Link>
              <span className="font-latin text-[color:var(--muted-foreground)]">
                {certificate.course.code}
                {certificate.session ? ` · ${certificate.session}` : ""}
                {certificate.issuedAt
                  ? ` · ${formatDate(certificate.issuedAt, "en")}`
                  : ""}
              </span>
              <AdminBadge tone={certificate.status === "VALID" ? "success" : "danger"}>
                {certificate.status === "VALID" ? "Valid" : "Cancel"}
              </AdminBadge>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
