import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AdvisorGrid, type AdvisorCardData } from "@/components/site/advisor-grid";
import { Section, SectionHeading } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import type { getAdvisors } from "@/lib/queries";

type Advisor = Awaited<ReturnType<typeof getAdvisors>>[number];

export function toCard(advisor: Advisor, locale: Locale): AdvisorCardData {
  return {
    id: advisor.id,
    name: pick(locale, advisor.nameBn, advisor.name),
    degrees: advisor.degrees,
    designation: pick(locale, advisor.designationBn, advisor.designation),
    organization: advisor.organization,
    bio: advisor.bio,
    photo: advisor.photo,
  };
}

/** Homepage strip of up to four advisors (addendum 3, §5). */
export async function AdvisorsStrip({
  advisors,
  locale,
  soft = false,
}: {
  advisors: Advisor[];
  locale: Locale;
  soft?: boolean;
}) {
  if (advisors.length === 0) return null;
  const [t, common] = await Promise.all([
    getTranslations("advisors"),
    getTranslations("common"),
  ]);

  return (
    <Section soft={soft}>
      <SectionHeading
        title={t("homeTitle")}
        action={
          <Button asChild variant="brandOutline" size="cta">
            <Link href="/advisors">
              {common("viewAll")}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <AdvisorGrid advisors={advisors.slice(0, 4).map((a) => toCard(a, locale))} />
    </Section>
  );
}
