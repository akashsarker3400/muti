"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error("Public page error", error);
  }, [error]);

  return (
    <section className="section">
      <div className="container-content mx-auto max-w-lg text-center">
        <h1 className="h2">{t("errorTitle")}</h1>
        <p className="mt-3 text-[color:var(--muted-foreground)]">{t("errorBody")}</p>
        <Button
          type="button"
          onClick={reset}
          variant="brand"
          size="cta-lg"
          className="mt-7"
        >
          {t("tryAgain")}
        </Button>
      </div>
    </section>
  );
}
