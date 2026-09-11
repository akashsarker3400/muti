import { AdminShell } from "@/components/admin/admin-shell";
import { signOut } from "@/auth";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  return (
    <AdminShell user={user} signOutAction={signOutAction}>
      {children}
    </AdminShell>
  );
}
