import Image from "next/image";

import { cn } from "cn";
import { BadgeCheck, Handshake } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/site/section";
import type { getPartners } from "@/lib/queries";

type Partner = Awaited<ReturnType<typeof getPartners>>[number];

/**
 * Column count follows the number of cards, so a group of two does not sit in
 * the left half of a four-column row.
 */
const COLUMNS: Record<number, string> = {
  1: "sm:grid-cols-1 sm:max-w-sm sm:mx-auto",
  2: "sm:grid-cols-2 lg:max-w-3xl lg:mx-auto",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * Affiliation & Collaboration cards (section 3 / 5.1 item 8).
 *
 * Real logos are uploaded from the admin. Until then each card shows a solid
 * monogram — a deliberate mark rather than an empty frame, because a blank
 * placeholder reads as a broken image. We never draw a stand-in version of a
 * government emblem or another organisation's trademark.
 */
export async function PartnersRow({
  partners,
  soft = false,
  showGroups = false,
}: {
  partners: Partner[];
  soft?: boolean;
  showGroups?: boolean;
}) {
  if (partners.length === 0) return null;

  const [home, accreditation] = await Promise.all([
    getTranslations("home"),
    getTranslations("accreditation"),
  ]);

  const affiliations = partners.filter((p) => p.type === "AFFILIATION");
  const collaborations = partners.filter((p) => p.type === "COLLABORATION");

  const labels = {
    AFFILIATION: accreditation("affiliationTitle"),
    COLLABORATION: accreditation("collaborationTitle"),
  };

  return (
    <Section soft={soft}>
      <SectionHeading title={home("partnersTitle")} align="center" />

      {showGroups ? (
        <div className="space-y-10">
          {affiliations.length > 0 && (
            <div>
              <h3 className="mb-4 text-center text-base font-semibold">
                {labels.AFFILIATION}
              </h3>
              <PartnerGrid partners={affiliations} labels={labels} />
            </div>
          )}
          {collaborations.length > 0 && (
            <div>
              <h3 className="mb-4 text-center text-base font-semibold">
                {labels.COLLABORATION}
              </h3>
              <PartnerGrid partners={collaborations} labels={labels} />
            </div>
          )}
        </div>
      ) : (
        <PartnerGrid partners={partners} labels={labels} showType />
      )}
    </Section>
  );
}

function PartnerGrid({
  partners,
  labels,
  showType = false,
}: {
  partners: Partner[];
  labels: Record<string, string>;
  showType?: boolean;
}) {
  return (
    <ul
      className={cn("grid gap-4", COLUMNS[Math.min(partners.length, 4)] ?? COLUMNS[4])}
    >
      {partners.map((partner) => {
        const isAffiliation = partner.type === "AFFILIATION";

        return (
          <li
            key={partner.id}
            className="flex h-full flex-col rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
          >
            <div className="flex min-w-0 items-start gap-3">
              {partner.logo ? (
                // A real logo sits on a white plate so any background works.
                <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-[color:var(--border)] bg-white p-1">
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    fill
                    sizes="48px"
                    className="object-contain p-1"
                  />
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className="grid size-12 shrink-0 place-items-center rounded-xl bg-[color:var(--brand)] font-latin text-base font-bold tracking-wide text-white"
                >
                  {initials(partner.name)}
                </span>
              )}

              <div className="min-w-0 flex-1">
                {showType && (
                  <p className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--muted-foreground)]">
                    {isAffiliation ? (
                      <BadgeCheck
                        className="size-3.5 text-[color:var(--brand)]"
                        aria-hidden="true"
                      />
                    ) : (
                      <Handshake className="size-3.5" aria-hidden="true" />
                    )}
                    {labels[partner.type]}
                  </p>
                )}

                <p className="text-sm leading-snug font-semibold text-[color:var(--brand)]">
                  {partner.url ? (
                    <a
                      href={partner.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {partner.name}
                    </a>
                  ) : (
                    partner.name
                  )}
                </p>
              </div>
            </div>

            {partner.description && (
              <p className="mt-3 text-xs leading-relaxed text-[color:var(--muted-foreground)]">
                {partner.description}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * "Bangladesh Technical Education Board (BTEB)" -> "BT".
 * Parenthesised acronyms are ignored so the monogram comes from the real name.
 */
function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
