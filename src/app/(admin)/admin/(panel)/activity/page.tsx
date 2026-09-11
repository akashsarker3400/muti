import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminBadge, AdminPageHeader, EmptyState, Panel } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "কার্যক্রম লগ" };

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  create: "তৈরি",
  update: "পরিবর্তন",
  delete: "মুছে ফেলা",
  duplicate: "কপি",
  reorder: "ক্রম পরিবর্তন",
  routine: "রুটিন সংরক্ষণ",
  upload: "আপলোড",
  "export-csv": "CSV এক্সপোর্ট",
  "delete-media": "ফাইল মুছে ফেলা",
  "import-students": "শিক্ষার্থী ইমপোর্ট",
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
        title="কার্যক্রম লগ"
        description="কে কখন কী পরিবর্তন করেছেন তার রেকর্ড।"
      />

      {logs.length === 0 ? (
        <EmptyState title="এখনো কোনো কার্যক্রম রেকর্ড হয়নি।" />
      ) : (
        <Panel padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)]">
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    সময়
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    ব্যবহারকারী
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    কাজ
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    কোথায়
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {formatDateTime(log.createdAt, "bn")}
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
