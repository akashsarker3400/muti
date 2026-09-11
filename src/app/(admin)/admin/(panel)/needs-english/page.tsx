import Link from "next/link";

import { AdminBadge, AdminPageHeader, EmptyState, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin-auth";
import { needsEnglish } from "@/lib/admin/needs-english";

export const dynamic = "force-dynamic";

/** Every record whose English text is still the Bangla placeholder (locale change). */
export default async function NeedsEnglishPage() {
  await requireAdmin();
  const rows = await needsEnglish();

  return (
    <>
      <AdminPageHeader
        title="Needs English"
        description="English is the primary language of the site. These records still show Bangla text in an English field (copied in as a placeholder). Open each one and write the English; the row disappears when no Bangla script remains in its English fields."
      />
      {rows.length === 0 ? (
        <EmptyState title="Every record has English text." />
      ) : (
        <Panel className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--bg-soft)] text-xs text-[color:var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-2 text-start font-medium">Type</th>
                <th className="px-4 py-2 text-start font-medium">Record</th>
                <th className="px-4 py-2 text-start font-medium">
                  Fields still in Bangla
                </th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {rows.map((row) => (
                <tr key={`${row.model}-${row.id}`}>
                  <td className="px-4 py-2 whitespace-nowrap">{row.model}</td>
                  <td className="max-w-[24rem] truncate px-4 py-2" lang="bn">
                    {row.label}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {row.fields.map((field) => (
                        <AdminBadge key={field} tone="warning">
                          <span className="font-latin">{field}</span>
                        </AdminBadge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-end">
                    <Link
                      href={row.href}
                      className="font-medium text-[color:var(--brand)] hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
