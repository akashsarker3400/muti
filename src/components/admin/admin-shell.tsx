"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BadgeCheck,
  BookOpen,
  CreditCard,
  FileCheck2,
  ListOrdered,
  Sparkles,
  Target,
  CalendarRange,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
  Handshake,
  Images,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Newspaper,
  NotebookPen,
  ScrollText,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
  X,
  Upload,
  HeartPulse,
  Languages,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Role } from "@/generated/prisma/enums";
import { cn } from "cn";

type NavEntry = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
};

type NavGroup = { title: string; items: NavEntry[] };

/** Sidebar structure follows the order of section 7 in the spec. */
const NAV: NavGroup[] = [
  {
    title: "General",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/applications", label: "Applications", icon: Inbox },
    ],
  },
  {
    title: "Academic",
    items: [
      { href: "/admin/courses", label: "Courses", icon: BookOpen },
      { href: "/admin/batches", label: "Batches", icon: CalendarRange },
      { href: "/admin/students", label: "Students", icon: GraduationCap },
      { href: "/admin/certificates", label: "Certificates", icon: Award },
      { href: "/admin/board-exams", label: "Board results", icon: Trophy },
      { href: "/admin/results", label: "Results (notices)", icon: Trophy },
      { href: "/admin/import", label: "Import (CSV/Excel)", icon: Upload },
      { href: "/admin/verification-logs", label: "Verification log", icon: BadgeCheck },
    ],
  },
  {
    title: "Health service",
    items: [
      { href: "/admin/health", label: "Serials & daily count", icon: HeartPulse },
      {
        href: "/admin/health-services",
        label: "What we provide (list)",
        icon: ListOrdered,
      },
      {
        href: "/admin/settings",
        label: "Health settings",
        icon: Settings,
      },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/banners", label: "Hero banners", icon: Images },
      { href: "/admin/notices", label: "Notices", icon: Newspaper },
      {
        href: "/admin/leadership",
        label: "Leadership messages",
        icon: MessageSquareQuote,
      },
      { href: "/admin/advisors", label: "Advisory board", icon: Users },
      { href: "/admin/faculty", label: "Faculty", icon: Users },
      { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote },
      { href: "/admin/faq", label: "FAQ", icon: ScrollText },
      { href: "/admin/partners", label: "Affiliations & partners", icon: Handshake },
      { href: "/admin/gallery", label: "Gallery", icon: Images },
      { href: "/admin/downloads", label: "Downloads", icon: FileText },
      { href: "/admin/blog", label: "Blog", icon: NotebookPen },
      { href: "/admin/pages", label: "Pages", icon: FolderOpen },
    ],
  },
  {
    title: "Site texts",
    items: [
      { href: "/admin/why-choose", label: "Why MUTI", icon: Sparkles },
      { href: "/admin/documents", label: "Required documents", icon: FileCheck2 },
      { href: "/admin/payment-policy", label: "Payment policy", icon: CreditCard },
      { href: "/admin/admission-steps", label: "Admission steps", icon: ListOrdered },
      { href: "/admin/values", label: "Mission & values", icon: Target },
      {
        href: "/admin/certificate-types",
        label: "Certificates offered (list)",
        icon: Award,
      },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/settings", label: "Site settings", icon: Settings },
      { href: "/admin/media", label: "Media", icon: Images },
      { href: "/admin/needs-english", label: "Needs English", icon: Languages },
      {
        href: "/admin/users",
        label: "Users",
        icon: ShieldCheck,
        superAdminOnly: true,
      },
      { href: "/admin/activity", label: "Activity log", icon: BadgeCheck },
    ],
  },
];

export function AdminShell({
  user,
  signOutAction,
  children,
}: {
  user: { name: string; email: string; role: Role };
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      {/* Backdrop for the mobile drawer */}
      {open && (
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-72 flex-col bg-[color:var(--sidebar)] text-[color:var(--sidebar-foreground)] transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[color:var(--sidebar-border)] px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-white/10 text-sm font-bold text-white">
              M
            </span>
            <span className="font-latin text-lg font-bold text-white">MUTI Admin</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="grid size-9 place-items-center rounded-lg hover:bg-white/10 lg:hidden"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => {
            const items = group.items.filter(
              (item) => !item.superAdminOnly || user.role === "SUPER_ADMIN",
            );
            if (items.length === 0) return null;

            return (
              <div key={group.title} className="mb-5">
                <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
                  {group.title}
                </p>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item.href}>
                      <SidebarLink item={item} onNavigate={() => setOpen(false)} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-[color:var(--sidebar-border)] p-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm transition hover:bg-white/10"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            View site
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-[color:var(--border)] bg-white px-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            size="icon-cta"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </Button>

          <div className="ms-auto flex items-center gap-3">
            <div className="hidden text-end sm:block">
              <p className="text-sm leading-tight font-semibold">{user.name}</p>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                {user.role === "SUPER_ADMIN" ? "Super admin" : "Staff"}
              </p>
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="cta">
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </form>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarLink({ item, onNavigate }: { item: NavEntry; onNavigate: () => void }) {
  const pathname = usePathname();
  // "/admin" must only match exactly, or every page would look active.
  const active =
    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "nav-text flex items-center gap-2.5 rounded-[10px] px-3 !py-3 transition",
        active
          ? "bg-[color:var(--sidebar-accent)] text-white"
          : "text-white/75 hover:bg-white/10 hover:text-white",
      )}
    >
      <item.icon className="size-4 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  );
}
