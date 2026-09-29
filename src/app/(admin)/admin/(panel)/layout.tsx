import { AdminShell } from "@/components/admin/admin-shell";
import { signOut } from "@/auth";
import { requireAdmin } from "@/lib/admin-auth";
import { siteUrl } from "@/lib/env";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const settings = await getSiteSettings();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  return (
    <AdminShell
      user={user}
      signOutAction={signOutAction}
      siteUrl={siteUrl}
      logo={settings.branding.logo}
    >
      {children}
    </AdminShell>
  );
}
