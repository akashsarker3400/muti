import { getTranslations } from "next-intl/server";

import { Section } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("common");

  return (
    <Section>
      <div className="mx-auto max-w-lg py-10 text-center">
        <p className="nums font-latin text-6xl font-bold text-[color:var(--brand-soft)]">
          404
        </p>
        <h1 className="h2 mt-3">{t("notFoundTitle")}</h1>
        <p className="mt-3 text-[color:var(--muted-foreground)]">{t("notFoundBody")}</p>
        <Button asChild variant="brand" size="cta-lg" className="mt-7">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    </Section>
  );
}
