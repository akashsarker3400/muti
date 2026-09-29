import Link from "next/link";
import { Award } from "lucide-react";

import { CertificateRegister } from "@/components/admin/certificate-register";
import { AdminPageHeader, EmptyState, Panel, StatCard } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export const metadata = { title: "Certificate register" };

const PAGE_SIZE = 40;

type State = "draft" | "approved" | "delivered" | "all";

const TABS: Array<{ value: State; label: string }> = [
  { value: "draft", label: "Waiting for approval" },
  { value: "approved", label: "Approved, not handed over" },
  { value: "delivered", label: "Handed over" },
  { value: "all", label: "All" },
];

function whereFor(state: State) {
  switch (state) {
    case "draft":
      return { approvedAt: null, status: "VALID" as const };
    case "approved":
      return { approvedAt: { not: null }, deliveredAt: null };
    case "delivered":
      return { deliveredAt: { not: null } };
    default:
      return {};
  }
}

/**
 * The register: approval, the print log and the handover record in one place
 * (proposal stage 3).
 *
 * Kept apart from the certificate editor because it answers a different
 * question. The editor is where a record is corrected; this is where the
 * office sees what is waiting on the principal's signature, what has been
 * printed and how often, and which certificates are still in the drawer.
 */
export default async function CertificateRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; page?: string }>;
}) {
  await requirePermission("certificates.manage");
  const admin = await requireAdmin();
  const canApprove = hasPermission(admin, "certificates.issue");

  const { state: stateParam, page: pageParam } = await searchParams;
  const state: State = TABS.some((tab) => tab.value === stateParam)
    ? (stateParam as State)
    : "draft";
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const base = { deletedAt: null };
  const where = { ...base, ...whereFor(state) };

  const [rows, total, counts] = await Promise.all([
    prisma.certificate.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        certificateNo: true,
        type: true,
        status: true,
        issuedAt: true,
        approvedAt: true,
        deliveredAt: true,
        deliveredTo: true,
        deliveryNote: true,
        student: { select: { name: true, roll: true } },
        course: { select: { code: true } },
        approvedBy: { select: { name: true } },
        issuedBy: { select: { name: true } },
        _count: { select: { prints: true } },
        prints: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, user: { select: { name: true } } },
        },
      },
    }),
    prisma.certificate.count({ where }),
    Promise.all([
      prisma.certificate.count({ where: { ...base, ...whereFor("draft") } }),
      prisma.certificate.count({ where: { ...base, ...whereFor("approved") } }),
      prisma.certificate.count({ where: { ...base, ...whereFor("delivered") } }),
    ]),
  ]);

  const [drafts, approved, delivered] = counts;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <AdminPageHeader
        title="Certificate register"
        description="Approve prepared certificates, see who printed what, and record each handover. Only an approved certificate can be printed."
        action={
          <Button asChild variant="brand" size="cta">
            <Link href="/admin/certificates/issue">
              <Award className="size-4" aria-hidden="true" />
              Issue for a batch
            </Link>
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Waiting for approval" value={drafts} />
        <StatCard label="Approved, in the drawer" value={approved} />
        <StatCard label="Handed over" value={delivered} />
      </div>

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filter">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/certificates/register?state=${tab.value}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              tab.value === state
                ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white"
                : "border-[color:var(--border)] bg-white hover:bg-[color:var(--bg-soft)]",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {!canApprove && state === "draft" && (
        <Panel className="mb-4 text-sm text-[color:var(--muted-foreground)]">
          You can prepare and print certificates but not approve them. A super admin
          approves what is listed here.
        </Panel>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing here."
          description={
            state === "draft"
              ? "No certificate is waiting for approval."
              : "Try another tab above."
          }
        />
      ) : (
        <CertificateRegister
          canApprove={canApprove}
          rows={rows.map((row) => ({
            id: row.id,
            certificateNo: row.certificateNo,
            type: row.type,
            status: row.status,
            studentName: row.student.name,
            studentRoll: row.student.roll,
            courseCode: row.course.code,
            issuedAt: iso(row.issuedAt),
            approvedAt: iso(row.approvedAt),
            approvedBy: row.approvedBy?.name ?? null,
            issuedBy: row.issuedBy?.name ?? null,
            deliveredAt: iso(row.deliveredAt),
            deliveredTo: row.deliveredTo,
            deliveryNote: row.deliveryNote,
            printCount: row._count.prints,
            lastPrintAt: iso(row.prints[0]?.createdAt ?? null),
            lastPrintBy: row.prints[0]?.user.name ?? null,
          }))}
        />
      )}

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="text-[color:var(--muted-foreground)]">
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/admin/certificates/register?state=${state}&page=${page - 1}`}
                >
                  Previous
                </Link>
              </Button>
            )}
            {page < pageCount && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/admin/certificates/register?state=${state}&page=${page + 1}`}
                >
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}
