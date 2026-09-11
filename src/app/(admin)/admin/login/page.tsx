import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { currentAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "লগইন" };

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

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-[color:var(--brand)] text-lg font-bold text-white">
            M
          </span>
          <h1 className="mt-4 text-xl font-semibold">MUTI অ্যাডমিন প্যানেল</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            ওয়েবসাইটের কনটেন্ট পরিচালনা করতে লগইন করুন
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
