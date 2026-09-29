import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/site/logo";
import { currentAdmin } from "@/lib/admin-auth";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Already signed in: skip the form.
  if (await currentAdmin()) {
    redirect(safeNext(next));
  }

  const settings = await getSiteSettings();

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto grid size-20 place-items-center overflow-hidden rounded-2xl border border-[color:var(--border)] bg-white p-1.5 shadow-sm">
            <Logo src={settings.branding.logo} size={80} className="size-full" />
          </span>
          <h1 className="mt-4 text-xl font-semibold">MUTI admin panel</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Sign in to manage the website content
          </p>
        </div>

        <LoginForm next={safeNext(next)} />
      </div>
    </div>
  );
}

/** Only same-site admin paths are accepted as a post-login redirect. */
function safeNext(next?: string): string {
  if (!next || !next.startsWith("/admin") || next.startsWith("//")) {
    return "/admin";
  }
  return next;
}
