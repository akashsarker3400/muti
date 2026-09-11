import Image from "next/image";
import { ArrowRight, Quote } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/site/section";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import type { getLeadershipMessages } from "@/lib/queries";

type Message = Awaited<ReturnType<typeof getLeadershipMessages>>[number];

/**
 * Homepage / About "Messages from leadership" (addendum 3, §4): one card per
 * published message, side by side on wide screens. Hidden when none is
 * published, so the seeded TODO rows never show.
 */
export async function LeadershipCards({
  messages,
  locale,
  soft = false,
}: {
  messages: Message[];
  locale: Locale;
  soft?: boolean;
}) {
  if (messages.length === 0) return null;
  const t = await getTranslations("leadership");

  return (
    <Section soft={soft}>
      <SectionHeading title={t("sectionTitle")} align="center" />
      <ul
        className={`grid gap-5 ${messages.length === 1 ? "mx-auto max-w-2xl" : "md:grid-cols-2"}`}
      >
        {messages.map((message) => {
          const name = pick(locale, message.personNameBn, message.personName);
          const role = pick(locale, message.roleTitleBn, message.roleTitleEn);
          const excerpt = pick(locale, message.excerptBn, message.excerptEn);
          return (
            <li
              key={message.id}
              className="flex h-full flex-col rounded-[14px] border border-[color:var(--border)] bg-white p-6 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center gap-4">
                <Portrait src={message.photo} name={name} size={72} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[color:var(--accent-red-ink)] uppercase">
                    {role}
                  </p>
                  <h3 className="mt-0.5 text-lg leading-snug font-semibold">{name}</h3>
                  {message.degrees && (
                    <p className="font-latin text-xs text-[color:var(--muted-foreground)]">
                      {message.degrees}
                    </p>
                  )}
                </div>
              </div>

              {excerpt && (
                <p className="relative mt-5 flex-1 text-[15px] leading-relaxed text-[color:var(--muted-foreground)]">
                  <Quote
                    className="absolute -start-1 -top-2 size-5 text-[color:var(--highlight)]"
                    aria-hidden="true"
                  />
                  <span className="line-clamp-3 ps-5">{excerpt}</span>
                </p>
              )}

              <Link
                href={`/messages/${message.key}`}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--brand)] hover:underline"
              >
                {t("readFull")}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export function Portrait({
  src,
  name,
  size,
}: {
  src: string | null;
  name: string;
  size: number;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full bg-[color:var(--brand-soft)] text-2xl font-bold text-[color:var(--brand)]"
      style={{ width: size, height: size }}
    >
      {name.trim().charAt(0)}
    </span>
  );
}
