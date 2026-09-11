import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminBadge, AdminPageHeader, EmptyState, Panel } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin-auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const TYPE_LABELS: Record<string, string> = {
  certificate: "Certificate number",
  bmdc: "BMDC",
  token: "QR token",
  roll: "Roll",
  registration: "Registration",
  "result-bmdc": "Results: BMDC",
};

/**
 * Every public lookup on /verify and /results (addendum 3, §1). The IP and
 * the "found" column make a scraping attempt obvious: many misses from one
 * address in a short time.
 */
export default async function VerificationLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission("verification.logs.view");
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const [rows, total, last24h, misses24h] = await Promise.all([
    prisma.verificationLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.verificationLog.count(),
    prisma.verificationLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } },
    }),
    prisma.verificationLog.count({
      where: { found: false, createdAt: { gte: new Date(Date.now() - 86_400_000) } },
    }),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Verification log"
        description={`${last24h} lookups in the last 24 hours, ${misses24h} not found. Many “not found” from one IP means someone is guessing numbers.`}
      />

      {rows.length === 0 ? (
        <EmptyState title="No lookups yet." />
      ) : (
        <Panel className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--bg-soft)] text-xs text-[color:var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-2 text-start font-medium">Time</th>
                <th className="px-4 py-2 text-start font-medium">Type</th>
                <th className="px-4 py-2 text-start font-medium">Query</th>
                <th className="px-4 py-2 text-start font-medium">Result</th>
                <th className="px-4 py-2 text-start font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatDate(row.createdAt, "en")}{" "}
                    <span className="font-latin text-xs text-[color:var(--muted-foreground)]">
                      {row.createdAt.toISOString().slice(11, 16)} UTC
                    </span>
                  </td>
                  <td className="px-4 py-2">{TYPE_LABELS[row.type] ?? row.type}</td>
                  <td className="px-4 py-2 font-latin">{row.query}</td>
                  <td className="px-4 py-2">
                    <AdminBadge tone={row.found ? "success" : "warning"}>
                      {row.found ? "Found" : "Not found"}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-2 font-latin text-xs">{row.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <AdminPagination
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        basePath="/admin/verification-logs"
      />
    </>
  );
}
