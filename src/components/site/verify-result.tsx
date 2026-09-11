import { BadgeCheck, SearchX, ShieldAlert, ShieldX } from "lucide-react";
import { useTranslations } from "next-intl";

import { WhatsAppIcon } from "@/components/site/icons";
import { Button } from "@/components/ui/button";
import type { VerifiedCertificate } from "@/app/actions/verify";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";

/**
 * The verification card (addendum 3, §1): green when valid, red when revoked.
 * Shared by the interactive form and the QR landing (`/verify?t=…`), which
 * renders it on the server — so no hooks beyond translations.
 */
export function CertificateCard({
  certificate,
  locale,
}: {
  certificate: VerifiedCertificate;
  locale: Locale;
}) {
  const t = useTranslations("verify");
  const revoked = certificate.status === "REVOKED";

  return (
    <article
      className="overflow-hidden rounded-[14px] border bg-white shadow-[var(--shadow-card)]"
      style={{
        borderColor: revoked ? "var(--error)" : "var(--success)",
      }}
      data-testid="verify-card"
    >
      <header
        className={`flex items-center gap-2 px-5 py-3 text-white ${
          revoked ? "bg-[color:var(--error)]" : "bg-[color:var(--success)]"
        }`}
      >
        {revoked ? (
          <ShieldX className="size-5" aria-hidden="true" />
        ) : (
          <BadgeCheck className="size-5" aria-hidden="true" />
        )}
        <h2 className="text-base font-semibold">
          {revoked ? t("revoked") : t("valid")}
        </h2>
      </header>

      <dl className="space-y-2.5 p-5 text-sm">
        <Row label={t("studentName")} value={certificate.name} latin />
        <Row
          label={t("courseName")}
          value={locale === "bn" ? certificate.courseBn : certificate.course}
        />
        {(certificate.session || certificate.batch) && (
          <Row
            label={t("session")}
            value={[certificate.session, certificate.batch].filter(Boolean).join(" · ")}
            latin
          />
        )}
        <Row label={t("certificateNo")} value={certificate.certificateNo} latin />
        <Row label={t("type")} value={t(`types.${certificate.type}`)} />
        {certificate.issuedAt && (
          <Row label={t("issuedAt")} value={formatDate(certificate.issuedAt, locale)} />
        )}
        {certificate.grade && (
          <Row label={t("grade")} value={certificate.grade} latin />
        )}
        <Row
          label={t("status")}
          value={revoked ? t("statusRevoked") : t("statusValid")}
        />
        {revoked && certificate.revokedReason && (
          <Row label={t("revokedReason")} value={certificate.revokedReason} />
        )}
      </dl>
    </article>
  );
}

export function LookupNotice({
  tone,
  title,
  whatsappHref,
}: {
  tone: "warning" | "error";
  title: string;
  whatsappHref?: string;
}) {
  const common = useTranslations("common");
  const Icon = tone === "warning" ? SearchX : ShieldAlert;
  const classes =
    tone === "warning"
      ? "border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 text-[color:var(--warning-ink)]"
      : "border-[color:var(--error)]/40 bg-[color:var(--error)]/8 text-[color:var(--error)]";

  return (
    <div
      role="status"
      className={`flex flex-col gap-3 rounded-[14px] border p-5 text-sm sm:flex-row sm:items-center ${classes}`}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <p className="flex-1 font-medium">{title}</p>
      {whatsappHref && (
        <Button asChild variant="whatsapp" size="cta">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon className="size-4" />
            {common("whatsapp")}
          </a>
        </Button>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  latin = false,
}: {
  label: string;
  value: string;
  latin?: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-[color:var(--muted-foreground)]">{label}</dt>
      <dd className={latin ? "font-latin font-medium" : "font-medium"}>{value}</dd>
    </div>
  );
}
