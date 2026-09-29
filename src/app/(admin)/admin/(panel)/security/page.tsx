import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { TwoFactorSetup } from "@/components/admin/two-factor-setup";
import { requireAdmin } from "@/lib/admin-auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { qrSvg } from "@/lib/qr";

export const dynamic = "force-dynamic";

export const metadata = { title: "Security" };

/** Each admin's own security settings: two-factor and recent sign-in facts. */
export default async function SecurityPage() {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({
    where: { id: admin.id },
    select: {
      totpEnabledAt: true,
      backupCodes: true,
      lastLoginAt: true,
      failedLogins: true,
    },
  });

  async function qrFor(uri: string) {
    "use server";
    // Rendered on the server so the enrolment secret is never put in an
    // <img> URL, where it would reach browser history and any proxy log.
    await requireAdmin();
    return qrSvg(uri, 180);
  }

  return (
    <>
      <AdminPageHeader
        title="Security"
        description="Your own account. Changes here affect only how you sign in."
      />

      <div className="space-y-5">
        <TwoFactorSetup
          enabled={Boolean(user?.totpEnabledAt)}
          enabledAt={user?.totpEnabledAt ? formatDate(user.totpEnabledAt, "en") : null}
          remainingCodes={user?.backupCodes.length ?? 0}
          qrFor={qrFor}
        />

        <Panel>
          <h2 className="text-base font-semibold">Sign-in</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-[color:var(--muted-foreground)]">Last signed in</dt>
              <dd className="font-medium">
                {user?.lastLoginAt
                  ? formatDate(user.lastLoginAt, "en")
                  : "Not recorded yet"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-[color:var(--muted-foreground)]">
                Failed attempts since
              </dt>
              <dd className="font-latin font-medium">{user?.failedLogins ?? 0}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-[color:var(--muted-foreground)]">
            Eight failed attempts lock an account for fifteen minutes. A super admin can
            unlock it from the Users page. Every sign-in, and every change made in this
            panel, is written to the Activity log.
          </p>
        </Panel>
      </div>
    </>
  );
}
