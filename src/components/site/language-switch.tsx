"use client";

import { useParams } from "next/navigation";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { cn } from "cn";

/**
 * Switches locale while staying on the current page (section 9). `usePathname`
 * from next-intl already strips the locale prefix, so the same path can be
 * pushed against the other locale.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const current = (params?.locale as Locale) ?? "bn";

  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-[color:var(--border)] bg-white p-0.5",
        className,
      )}
      role="group"
      aria-label={t("languageSwitch")}
    >
      <Globe
        className="mx-1.5 size-3.5 shrink-0 text-[color:var(--muted-foreground)]"
        aria-hidden="true"
      />
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-current={locale === current ? "true" : undefined}
          onClick={() => {
            // Replace so language toggling doesn't fill the back button.
            router.replace(pathname, { locale });
          }}
          className={cn(
            "min-h-8 rounded-md px-2 text-xs font-semibold transition",
            locale === current
              ? "bg-[color:var(--brand)] text-white"
              : "text-[color:var(--muted-foreground)] hover:bg-[color:var(--bg-soft)]",
          )}
        >
          {locale === "bn" ? t("bangla") : t("english")}
        </button>
      ))}
    </div>
  );
}
