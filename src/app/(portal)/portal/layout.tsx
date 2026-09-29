import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  Home,
  Wallet,
} from "lucide-react";

import { PortalSignOut } from "@/components/portal/portal-sign-out";
import { Toaster } from "@/components/ui/sonner";
import { fontVariables } from "@/lib/fonts";
import { currentStudent } from "@/lib/portal-auth";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: { default: "MUTI portal", template: "%s · MUTI portal" },
  robots: { index: false, follow: false },
};

/**
 * The student portal (addendum 2, B12).
 *
 * Its own layout, not the public site's: a student on a phone in a corridor
 * wants four big targets and their own name, not the institute's marketing
 * navigation. Bangla by default, because that is what they read.
 *
 * `noindex` throughout — this is somebody's fee record, not a page for search
 * engines.
 */
const TABS = [
  { href: "/portal", label: "হোম", icon: Home },
  { href: "/portal/routine", label: "রুটিন", icon: CalendarDays },
  { href: "/portal/attendance", label: "উপস্থিতি", icon: ClipboardCheck },
  { href: "/portal/fees", label: "ফি", icon: Wallet },
  { href: "/portal/results", label: "ফলাফল", icon: GraduationCap },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const student = await currentStudent();

  return (
    <html lang="bn" className={fontVariables}>
      <body className="min-h-dvh bg-[color:var(--bg-soft)] pb-20 text-[color:var(--foreground)]">
        <header className="sticky top-0 z-10 border-b border-[color:var(--border)] bg-white">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/portal" className="font-semibold">
              MUTI
            </Link>
            {student && (
              <div className="flex items-center gap-3 text-sm">
                <span className="truncate">{student.name}</span>
                <PortalSignOut />
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-5">{children}</main>

        {/* Without this, every message the portal tries to show goes nowhere:
            a wrong code would simply do nothing at all. */}
        <Toaster position="top-center" richColors />

        {student && (
          <nav
            aria-label="Portal"
            className="fixed inset-x-0 bottom-0 border-t border-[color:var(--border)] bg-white"
          >
            <ul className="mx-auto flex max-w-2xl">
              {TABS.map((tab) => (
                <li key={tab.href} className="flex-1">
                  <Link
                    href={tab.href}
                    className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs"
                  >
                    <tab.icon className="size-5" aria-hidden="true" />
                    {tab.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </body>
    </html>
  );
}
