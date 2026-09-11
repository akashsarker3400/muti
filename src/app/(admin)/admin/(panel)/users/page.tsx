import { deleteUser } from "@/app/actions/admin-users";
import { RowActions } from "@/components/admin/row-actions";
import { AdminBadge, AdminPageHeader, NewButton, Panel } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "ব্যবহারকারী" };

export default async function AdminUsersPage() {
  await requireSuperAdmin();

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <AdminPageHeader
        title="ব্যবহারকারী"
        description="অফিসের স্টাফদের অ্যাকাউন্ট তৈরি ও পরিচালনা করুন। শুধু সুপার অ্যাডমিন এই পাতা দেখতে পান।"
        action={<NewButton href="/admin/users/new" label="নতুন ব্যবহারকারী" />}
      />

      <Panel padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[38rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)]">
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  নাম
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  ইমেইল
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  ভূমিকা
                </th>
                <th
                  scope="col"
                  className="hidden px-4 py-3 text-start font-semibold sm:table-cell"
                >
                  যোগদান
                </th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">
                  কাজ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[color:var(--bg-soft)]">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{user.name}</span>
                    {!user.active && <AdminBadge tone="danger">নিষ্ক্রিয়</AdminBadge>}
                  </td>
                  <td className="px-4 py-2.5 font-latin">{user.email}</td>
                  <td className="px-4 py-2.5">
                    <AdminBadge
                      tone={user.role === "SUPER_ADMIN" ? "brand" : "neutral"}
                    >
                      {user.role === "SUPER_ADMIN" ? "সুপার অ্যাডমিন" : "স্টাফ"}
                    </AdminBadge>
                  </td>
                  <td className="hidden px-4 py-2.5 whitespace-nowrap sm:table-cell">
                    {formatDate(user.createdAt, "bn")}
                  </td>
                  <td className="px-4 py-2.5">
                    <RowActions
                      editHref={`/admin/users/${user.id}`}
                      label={user.name}
                      onDelete={async () => {
                        "use server";
                        return deleteUser(user.id);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
