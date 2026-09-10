"use client";

import { useState } from "react";
import { ChevronRight, Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageSwitch } from "@/components/site/language-switch";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { allNav } from "@/lib/nav";

export function MobileNav({
  courseLinks,
  applyLabel,
}: {
  courseLinks: Array<{ href: string; label: string }>;
  applyLabel: string;
}) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon-cta"
          aria-label={t("openMenu")}
          className="lg:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[86vw] max-w-sm overflow-y-auto p-0">
        <SheetHeader className="border-b border-[color:var(--border)] px-5 py-4">
          <SheetTitle className="text-base">{t("menu")}</SheetTitle>
        </SheetHeader>

        <nav className="px-3 py-3" aria-label={t("menu")}>
          <ul className="space-y-0.5">
            {allNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center justify-between rounded-lg px-3 text-[0.95rem] font-medium text-[color:var(--foreground)] transition hover:bg-[color:var(--bg-soft)] hover:text-[color:var(--brand)]"
                >
                  {t(item.labelKey)}
                  <ChevronRight
                    className="size-4 text-[color:var(--muted-foreground)]"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>

          {courseLinks.length > 0 && (
            <div className="mt-4 border-t border-[color:var(--border)] pt-3">
              <p className="eyebrow px-3 pb-1">{t("courses")}</p>
              <ul className="space-y-0.5">
                {courseLinks.map((course) => (
                  <li key={course.href}>
                    <Link
                      href={course.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-10 items-center rounded-lg px-3 text-sm text-[color:var(--muted-foreground)] transition hover:bg-[color:var(--bg-soft)] hover:text-[color:var(--brand)]"
                    >
                      {course.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 space-y-3 border-t border-[color:var(--border)] px-3 pt-4">
            <Button asChild variant="accent" size="cta" className="w-full">
              <Link href="/apply" onClick={() => setOpen(false)}>
                {applyLabel}
              </Link>
            </Button>
            <LanguageSwitch className="w-full justify-center" />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
