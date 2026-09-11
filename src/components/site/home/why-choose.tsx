import {
  Award,
  BadgeCheck,
  BookOpen,
  Clock,
  CreditCard,
  Gift,
  GraduationCap,
  HeartHandshake,
  Infinity as InfinityIcon,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/site/section";
import type { Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content-items";

/**
 * Icons the admin can pick for a "why choose" card. Keeping it to a named list
 * means an unknown or mistyped value can never break the page — it falls back
 * to the check mark.
 */
export const WHY_ICONS = {
  ShieldCheck,
  Stethoscope,
  GraduationCap,
  MonitorSmartphone,
  Gift,
  Infinity: InfinityIcon,
  Users,
  Award,
  UsersRound,
  CreditCard,
  BadgeCheck,
  BookOpen,
  Clock,
  HeartHandshake,
  Sparkles,
  Trophy,
} as const;

export type WhyIconName = keyof typeof WHY_ICONS;

export async function WhyChoose({
  locale,
  limit = 8,
}: {
  locale: Locale;
  limit?: number;
}) {
  const [items, home] = await Promise.all([
    getContent("WHY_CHOOSE", locale, limit),
    getTranslations("home"),
  ]);

  if (items.length === 0) return null;

  return (
    <Section soft>
      <SectionHeading
        title={home("whyTitle")}
        subtitle={home("whySubtitle")}
        align="center"
      />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = WHY_ICONS[item.icon as WhyIconName] ?? BadgeCheck;
          return (
            <li
              key={item.id}
              className="flex h-full flex-col gap-3 rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color:var(--brand-soft)] text-[color:var(--brand)]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <p className="text-[0.95rem] leading-relaxed font-medium">{item.body}</p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
