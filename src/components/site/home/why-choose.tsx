import {
  Award,
  CreditCard,
  Gift,
  GraduationCap,
  Infinity as InfinityIcon,
  MonitorSmartphone,
  ShieldCheck,
  Stethoscope,
  Users,
  UsersRound,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/site/section";
import type { Locale } from "@/i18n/routing";
import { localize, whyChooseMuti } from "@/lib/content";

/** Icon names used in `whyChooseMuti`, resolved without a dynamic import. */
const ICONS = {
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
} as const;

export async function WhyChoose({
  locale,
  limit = 8,
}: {
  locale: Locale;
  limit?: number;
}) {
  const home = await getTranslations("home");
  const items = whyChooseMuti.slice(0, limit);

  return (
    <Section soft>
      <SectionHeading
        title={home("whyTitle")}
        subtitle={home("whySubtitle")}
        align="center"
      />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = ICONS[item.icon as keyof typeof ICONS] ?? ShieldCheck;
          return (
            <li
              key={item.icon}
              className="flex h-full flex-col gap-3 rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color:var(--brand-soft)] text-[color:var(--brand)]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <p className="text-[0.95rem] leading-relaxed font-medium">
                {localize(item, locale)}
              </p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
