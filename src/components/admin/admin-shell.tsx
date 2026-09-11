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
    title: "সাধারণ",
    items: [
      { href: "/admin", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
      { href: "/admin/applications", label: "আবেদন", icon: Inbox },
    ],
  },
  {
    title: "একাডেমিক",
    items: [
      { href: "/admin/courses", label: "কোর্স", icon: BookOpen },
      { href: "/admin/batches", label: "ব্যাচ", icon: CalendarRange },
      { href: "/admin/students", label: "শিক্ষার্থী", icon: GraduationCap },
      { href: "/admin/certificates", label: "সার্টিফিকেট", icon: Award },
      { href: "/admin/board-exams", label: "বোর্ড ফলাফল", icon: Trophy },
      { href: "/admin/results", label: "ফলাফল (নোটিশ)", icon: Trophy },
      { href: "/admin/import", label: "ইমপোর্ট (CSV/Excel)", icon: Upload },
      { href: "/admin/verification-logs", label: "যাচাই লগ", icon: BadgeCheck },
    ],
  },
  {
    title: "স্বাস্থ্যসেবা",
    items: [
      { href: "/admin/health", label: "সিরিয়াল ও দিনের হিসাব", icon: HeartPulse },
      {
        href: "/admin/health-services",
        label: "আমরা যা দিই (তালিকা)",
        icon: ListOrdered,
      },
      {
        href: "/admin/settings",
        label: "সেটিংস (সাইট সেটিংস → স্বাস্থ্যসেবা)",
        icon: Settings,
      },
    ],
  },
  {
    title: "কনটেন্ট",
    items: [
      { href: "/admin/banners", label: "হিরো ব্যানার", icon: Images },
      { href: "/admin/notices", label: "নোটিশ", icon: Newspaper },
      {
        href: "/admin/leadership",
        label: "নেতৃত্বের বক্তব্য",
        icon: MessageSquareQuote,
      },
      { href: "/admin/advisors", label: "উপদেষ্টা মণ্ডলী", icon: Users },
      { href: "/admin/faculty", label: "শিক্ষকমণ্ডলী", icon: Users },
      { href: "/admin/testimonials", label: "অভিমত", icon: MessageSquareQuote },
      { href: "/admin/faq", label: "সাধারণ প্রশ্ন", icon: ScrollText },
      { href: "/admin/partners", label: "অনুমোদন ও সহযোগী", icon: Handshake },
      { href: "/admin/gallery", label: "গ্যালারি", icon: Images },
      { href: "/admin/downloads", label: "ডাউনলোড", icon: FileText },
      { href: "/admin/blog", label: "ব্লগ", icon: NotebookPen },
      { href: "/admin/pages", label: "পেজ", icon: FolderOpen },
    ],
  },
  {
    title: "সাইটের লেখা",
    items: [
      { href: "/admin/why-choose", label: "কেন MUTI", icon: Sparkles },
      { href: "/admin/documents", label: "প্রয়োজনীয় কাগজপত্র", icon: FileCheck2 },
      { href: "/admin/payment-policy", label: "পেমেন্ট নীতিমালা", icon: CreditCard },
      { href: "/admin/admission-steps", label: "ভর্তির ধাপ", icon: ListOrdered },
      { href: "/admin/values", label: "লক্ষ্য ও মূল্যবোধ", icon: Target },
      {
        href: "/admin/certificate-types",
        label: "প্রদত্ত সার্টিফিকেটের তালিকা",
        icon: Award,
      },
    ],
  },
  {
    title: "সিস্টেম",
    items: [
      { href: "/admin/settings", label: "সাইট সেটিংস", icon: Settings },
      { href: "/admin/media", label: "মিডিয়া", icon: Images },
      {
        href: "/admin/users",
        label: "ব্যবহারকারী",
        icon: ShieldCheck,
        superAdminOnly: true,
      },
      { href: "/admin/activity", label: "কার্যক্রম লগ", icon: BadgeCheck },
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
          aria-label="বন্ধ করুন"
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
            aria-label="মেনু বন্ধ করুন"
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
                <ul className="space-y-0.5">
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
            সাইট দেখুন
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
            aria-label="মেনু খুলুন"
            className="lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </Button>

          <div className="ms-auto flex items-center gap-3">
            <div className="hidden text-end sm:block">
              <p className="text-sm leading-tight font-semibold">{user.name}</p>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                {user.role === "SUPER_ADMIN" ? "সুপার অ্যাডমিন" : "স্টাফ"}
              </p>
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="cta">
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">লগআউট</span>
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
        "flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition",
        active
          ? "bg-[color:var(--sidebar-accent)] font-medium text-white"
          : "text-white/75 hover:bg-white/10 hover:text-white",
      )}
    >
      <item.icon className="size-4 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  );
}
