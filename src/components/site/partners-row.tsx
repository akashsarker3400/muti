import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/site/section";
import type { getPartners } from "@/lib/queries";

type Partner = Awaited<ReturnType<typeof getPartners>>[number];

/**
 * Affiliation & Collaboration logo cards (section 3 / 5.1 item 8).
 * Logos are TODO, so a partner without one falls back to its initials —
 * never a broken image, and never an invented logo.
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

  return (
    <Section soft={soft}>
      <SectionHeading title={home("partnersTitle")} align="center" />

      {showGroups ? (
        <div className="space-y-10">
          {affiliations.length > 0 && (
            <div>
              <h3 className="mb-4 text-center text-base font-semibold">
                {accreditation("affiliationTitle")}
              </h3>
              <PartnerGrid partners={affiliations} />
            </div>
          )}
          {collaborations.length > 0 && (
            <div>
              <h3 className="mb-4 text-center text-base font-semibold">
                {accreditation("collaborationTitle")}
              </h3>
              <PartnerGrid partners={collaborations} />
            </div>
          )}
        </div>
      ) : (
        <PartnerGrid partners={partners} />
      )}
    </Section>
  );
}

function PartnerGrid({ partners }: { partners: Partner[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {partners.map((partner) => (
        <li
          key={partner.id}
          className="flex h-full flex-col items-center gap-3 rounded-[14px] border border-[color:var(--border)] bg-white p-5 text-center shadow-[var(--shadow-card)]"
        >
          {partner.logo ? (
            <span className="relative h-14 w-full">
              <Image
                src={partner.logo}
                alt={partner.name}
                fill
                sizes="220px"
                className="object-contain"
              />
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="grid size-14 place-items-center rounded-xl bg-[color:var(--brand-soft)] font-latin text-lg font-bold text-[color:var(--brand)]"
            >
              {initials(partner.name)}
            </span>
          )}

          <p className="text-sm font-semibold text-[color:var(--brand)]">
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
          {partner.description && (
            <p className="text-xs leading-relaxed text-[color:var(--muted-foreground)]">
              {partner.description}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** "Bangladesh Technical Education Board (BTEB)" -> "BT" */
function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
