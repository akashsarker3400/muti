import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminBadge, AdminPageHeader, EmptyState, Panel } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Activity log" };

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Change",
  delete: "Delete",
  duplicate: "Copy",
  reorder: "Reorder",
  routine: "Save routine",
  upload: "Upload",
  "export-csv": "Export CSV",
  "delete-media": "Delete file",
  "import-students": "Import students",
};

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.activityLog.count(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Activity log"
        description="A record of who changed what, and when."
      />

      {logs.length === 0 ? (
        <EmptyState title="No activity recorded yet." />
      ) : (
        <Panel padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)]">
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    Time
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    User
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    Actions
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    Where
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {formatDateTime(log.createdAt, "en")}
                    </td>
                    <td className="px-4 py-2.5">{log.user.name}</td>
                    <td className="px-4 py-2.5">
                      <AdminBadge tone="brand">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-2.5 font-latin text-xs text-[color:var(--muted-foreground)]">
                      {log.entity}
                      {log.entityId ? ` · ${log.entityId}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <AdminPagination
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        basePath="/admin/activity"
      />
    </>
  );
}
