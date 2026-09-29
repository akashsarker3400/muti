import Image from "next/image";
import { notFound } from "next/navigation";

import {
  CornerMotifs,
  DocumentBorder,
  Letterhead,
  SignatureRow,
  signatoriesOf,
  VerifyBlock,
} from "@/components/admin/documents/document-chrome";
import { PrintButton } from "@/components/admin/print-button";
import { requirePermission } from "@/lib/admin-auth";
import { siteUrl } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { langOf } from "@/lib/lang";
import { prisma } from "@/lib/prisma";
import { qrSvg } from "@/lib/qr";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Certificate" };

const TYPE_LABEL: Record<string, string> = {
  COURSE: "course",
  SEMESTER: "semester",
  BOARD: "board examination",
};

/**
 * The MUTI course completion certificate, A4 landscape.
 *
 * Laid out for the same reading order a board certificate uses (letterhead,
 * declaration, name, qualification, result, date, signatures) so it reads as
 * familiar to anyone who has seen a BTEB paper, but drawn in MUTI's own navy
 * and gold with its own border rather than copying another body's design.
 *
 * Everything that changes between institutes or principals comes from Site
 * Settings: title, wording, signatories, seal and watermark.
 */
export default async function CertificatePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("certificates.manage");
  const { id } = await params;

  const [settings, certificate] = await Promise.all([
    getSiteSettings(),
    prisma.certificate.findFirst({
      where: { id, deletedAt: null },
      include: { student: true, course: true },
    }),
  ]);
  if (!certificate) notFound();

  const doc = settings.documents;
  const student = certificate.student;
  const verifyUrl = `${siteUrl}/verify?q=${encodeURIComponent(certificate.certificateNo)}`;
  const qr = await qrSvg(verifyUrl, 120);
  const watermark = doc.watermarkImage || settings.branding.logo;
  const parents = [student.fatherName, student.motherName].filter(Boolean);
  // "son of" reads better than "son / daughter of" when the record knows.
  const child =
    student.gender === "MALE"
      ? "son"
      : student.gender === "FEMALE"
        ? "daughter"
        : "son / daughter";
  const revoked = certificate.status === "REVOKED";

  return (
    <div className="mx-auto w-fit">
      <style>{`
        @page { size: A4 landscape; margin: 0 }
        @media print {
          body { background: white }
          nav, aside, header, .no-print { display: none !important }
          main { padding: 0 !important }
          .sheet { box-shadow: none !important; margin: 0 !important }
        }
      `}</style>

      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[color:var(--bg-soft)] p-3 text-sm">
        <span className="text-[color:var(--muted-foreground)]">
          A4 landscape. In the print dialog set margins to None and turn on background
          graphics, or the border and seal will not print.
        </span>
        <PrintButton label="Print certificate" />
      </div>

      {revoked && (
        <p className="no-print mb-4 rounded-lg border border-[color:var(--error)] bg-red-50 p-3 text-sm text-[color:var(--error)]">
          This certificate is revoked
          {certificate.revokedReason ? `: ${certificate.revokedReason}` : ""}. It should
          not be printed or handed over.
        </p>
      )}

      {/* A4 landscape at 96dpi = 1123 × 794 px. */}
      <div
        className="sheet relative overflow-hidden bg-white text-black shadow-[var(--shadow-card)] print:shadow-none"
        style={{
          width: "297mm",
          height: "210mm",
          fontFamily: "var(--font-body-serif), Georgia, serif",
        }}
      >
        <DocumentBorder />
        <CornerMotifs size={40} />

        {watermark && (
          <Image
            src={watermark}
            alt=""
            width={520}
            height={520}
            className="pointer-events-none absolute start-1/2 top-1/2 size-[95mm] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.022] grayscale"
          />
        )}

        <div className="relative flex h-full flex-col px-[26mm] py-[14mm]">
          <Letterhead settings={settings} />

          {/* Title */}
          <div className="mt-[6mm] text-center">
            <h2 className="font-[family-name:var(--font-display-serif)] text-[26pt] leading-none font-bold tracking-[0.12em] text-[color:#12204f] uppercase">
              {doc.certificateTitleEn || "Certificate of Completion"}
            </h2>
            {doc.certificateTitleBn && (
              <p lang="bn" className="mt-1 text-[12pt] text-[color:#9a7b2f]">
                {doc.certificateTitleBn}
              </p>
            )}
            <div className="mx-auto mt-2 flex w-[70mm] items-center gap-2">
              <span className="h-px flex-1 bg-[color:#9a7b2f]" />
              <span className="size-1.5 rotate-45 bg-[color:#9a7b2f]" />
              <span className="h-px flex-1 bg-[color:#9a7b2f]" />
            </div>
          </div>

          {/* Declaration */}
          <div className="mt-[7mm] flex-1 text-center text-[12.5pt] leading-[2]">
            <p>{doc.certificateLeadEn || "This is to certify that"}</p>

            <p
              lang={langOf(student.name)}
              className="mx-auto mt-1 inline-block min-w-[120mm] border-b border-dotted border-[color:#12204f] px-4 font-[family-name:var(--font-display-serif)] text-[19pt] leading-tight font-bold text-[color:#12204f]"
            >
              {student.name}
            </p>

            {parents.length > 0 && (
              <p className="mt-2 text-[11pt]">
                {child} of{" "}
                <span className="font-semibold" lang={langOf(parents.join(" "))}>
                  {parents.join(" and ")}
                </span>
              </p>
            )}

            <p className="mt-2">
              bearing Roll No{" "}
              <span className="font-latin font-semibold">{student.roll}</span>
              {student.bmdc && (
                <>
                  {" "}
                  and BMDC Reg. No{" "}
                  <span className="font-latin font-semibold">{student.bmdc}</span>
                </>
              )}{" "}
              has successfully completed the {TYPE_LABEL[certificate.type] ?? "course"}{" "}
              of
            </p>

            <p className="mt-1 font-[family-name:var(--font-display-serif)] text-[15pt] font-semibold text-[color:#12204f]">
              {certificate.course.fullNameEn}
            </p>

            <p className="mt-1 text-[11.5pt]">
              conducted by this institute
              {certificate.session ? (
                <>
                  {" "}
                  in the session{" "}
                  <span className="font-latin font-semibold">
                    {certificate.session}
                  </span>
                </>
              ) : null}
              {certificate.batchName ? ` (${certificate.batchName})` : ""}
              {certificate.grade ? (
                <>
                  , securing{" "}
                  <span className="font-latin font-semibold">{certificate.grade}</span>
                </>
              ) : null}
              .
            </p>

            {doc.certificateClosingEn && (
              <p className="mt-3 text-[11pt] italic">{doc.certificateClosingEn}</p>
            )}
          </div>

          {/* Facts strip */}
          <dl className="mb-[5mm] flex items-end justify-center gap-10 text-[9pt]">
            <Fact label="Certificate No" value={certificate.certificateNo} latin />
            <Fact
              label="Date of issue"
              value={
                certificate.issuedAt
                  ? formatDate(certificate.issuedAt, "en")
                  : "____________"
              }
            />
            <Fact label="Institute code" value={settings.general.govtCode} latin />
          </dl>

          <SignatureRow
            signatories={signatoriesOf(settings)}
            seal={doc.sealImage || undefined}
            width="42mm"
          />

          <div className="mt-[4mm] flex items-end justify-between gap-6">
            <VerifyBlock
              qr={qr}
              url={verifyUrl.replace(/^https?:\/\//, "")}
              label="Scan to verify this certificate"
            />
            {doc.certificateFooterEn && (
              <p className="pb-1 text-[8pt] font-semibold tracking-wide text-[color:#b3121f] uppercase">
                {doc.certificateFooterEn}
              </p>
            )}
          </div>
        </div>

        {revoked && (
          <span className="pointer-events-none absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[18deg] border-8 border-[color:#b3121f] px-8 py-3 text-[40pt] font-bold tracking-[0.2em] text-[color:#b3121f] opacity-30">
            REVOKED
          </span>
        )}
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  latin = false,
}: {
  label: string;
  value: string;
  latin?: boolean;
}) {
  return (
    <div className="text-center">
      <dt className="text-[7.5pt] tracking-wide text-[color:#555] uppercase">
        {label}
      </dt>
      <dd className={`font-semibold ${latin ? "font-latin" : ""}`}>{value}</dd>
    </div>
  );
}
