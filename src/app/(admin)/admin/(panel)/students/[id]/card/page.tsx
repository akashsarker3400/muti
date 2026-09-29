import Image from "next/image";
import { notFound } from "next/navigation";

import {
  CornerMotifs,
  DocumentBorder,
  Letterhead,
  SignatureRow,
  VerifyBlock,
} from "@/components/admin/documents/document-chrome";
import { WalletCardSheet } from "@/components/admin/documents/wallet-card";
import { SiteUrlWarning } from "@/components/admin/documents/site-url-warning";
import { PrintButton } from "@/components/admin/print-button";
import { requireAdmin } from "@/lib/admin-auth";
import { signCardToken } from "@/lib/card-token";
import { requiredEnv, siteUrl } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { langOf } from "@/lib/lang";
import { displayPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { qrSvg } from "@/lib/qr";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Student card" };

const GENDER: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

/**
 * Two documents from one record (docs/id-card-certificate-proposal.md):
 *
 * - an A4 **registration card** in the shape the board issues, for the file
 *   and for anything official the student has to show;
 * - a **wallet card** at CR80 (85.6 × 54 mm), front and back, for daily use.
 *
 * Both carry the same QR, which opens a public page that shows the student's
 * photo. Matching the face on the card to the face on the screen is the check
 * that actually catches a forgery.
 */
export default async function StudentCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { view }] = await Promise.all([params, searchParams]);

  const [settings, student] = await Promise.all([
    getSiteSettings(),
    prisma.student.findUnique({
      where: { id },
      include: { course: true, batch: true },
    }),
  ]);
  if (!student) notFound();

  const doc = settings.documents;
  const token = signCardToken(student.id, requiredEnv("AUTH_SECRET"));
  const cardUrl = `${siteUrl}/card/${token}`;
  const [qrLarge, qrSmall] = await Promise.all([
    qrSvg(cardUrl, 120),
    qrSvg(cardUrl, 80),
  ]);

  const validUntil =
    doc.cardValidityMonths > 0 && student.admissionDate
      ? new Date(
          new Date(student.admissionDate).setMonth(
            new Date(student.admissionDate).getMonth() + doc.cardValidityMonths,
          ),
        )
      : null;
  const notes = doc.cardNotesEn
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const wallet = view === "wallet";

  return (
    <div className="mx-auto w-fit">
      <style>{`
        @page { size: A4; margin: ${wallet ? "12mm" : "0"} }
        /* Plain paper: the office prints the whole design, so the colours must
           come out without anyone having to tick "background graphics". */
        .sheet { print-color-adjust: exact; -webkit-print-color-adjust: exact }
        @media print {
          body { background: white }
          nav, aside, header, .no-print { display: none !important }
          main { padding: 0 !important }
          .sheet { box-shadow: none !important; margin: 0 !important }
        }
      `}</style>

      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[color:var(--bg-soft)] p-3 text-sm">
        <span className="text-[color:var(--muted-foreground)]">
          Plain white paper, margins set to None.{" "}
          {wallet
            ? "Wallet cards print two to a sheet; cut along the crop marks."
            : "Registration card prints on one A4 page with no margins."}
        </span>
        <div className="flex gap-2">
          <a
            href={`/admin/students/${student.id}/card${wallet ? "" : "?view=wallet"}`}
            className="inline-flex min-h-10 items-center rounded-lg border border-[color:var(--border)] px-3 font-medium"
          >
            {wallet ? "Registration card (A4)" : "Wallet card (85.6 × 54 mm)"}
          </a>
          <PrintButton label="Print" />
        </div>
      </div>

      <SiteUrlWarning />

      {!student.photo && (
        <p className="no-print mb-4 rounded-lg border border-[color:var(--accent-red)]/40 bg-red-50 p-3 text-sm text-[color:var(--accent-red)]">
          This student has no photo yet. Add one on the student record before printing:
          a card without a photo cannot be used to verify anybody.
        </p>
      )}

      {wallet ? (
        <WalletCardSheet
          student={{
            name: student.name,
            nameBn: student.nameBn,
            roll: student.roll,
            photo: student.photo,
            bloodGroup: student.bloodGroup,
            phone: student.phone,
            batchName: student.batch?.name ?? null,
            courseCode: student.course.code,
            courseName: student.course.fullNameEn,
          }}
          settings={settings}
          qr={qrSmall}
          validUntil={validUntil ? formatDate(validUntil, "en") : null}
          notes={notes}
        />
      ) : (
        <div
          className="sheet relative overflow-hidden bg-white text-black shadow-[var(--shadow-card)] print:shadow-none"
          style={{
            width: "210mm",
            height: "297mm",
            fontFamily: "var(--font-body-serif), Georgia, serif",
          }}
        >
          <DocumentBorder variant="card" />
          <CornerMotifs size={28} />

          <div className="relative flex h-full flex-col px-[16mm] pt-[12mm] pb-[10mm]">
            <Letterhead settings={settings} compact />

            <div className="mt-[5mm] text-center">
              <h2 className="inline-block border-y-2 border-[color:#b3121f] px-6 py-1 font-[family-name:var(--font-display-serif)] text-[15pt] font-bold tracking-[0.18em] text-[color:#b3121f] uppercase">
                Student Registration Card
              </h2>
            </div>

            <div className="mt-[4mm] flex items-start gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-[10pt]">
                  <span className="text-[color:#555]">Serial No</span>{" "}
                  <span className="font-latin text-[12pt] font-bold tracking-wide">
                    {student.roll}
                  </span>
                </p>
                <p className="mt-1 font-[family-name:var(--font-display-serif)] text-[14pt] font-bold text-[color:#12204f]">
                  {student.course.fullNameEn}
                </p>
                <p className="text-[10pt] text-[color:#333]">
                  Course code: {student.course.code} · Duration:{" "}
                  {student.course.durationLabelEn}
                </p>
              </div>
              {/* Photo box, the same 35 × 45 mm the board and the passport office use. */}
              <span className="grid h-[42mm] w-[33mm] shrink-0 place-items-center overflow-hidden border border-black bg-white text-center text-[8pt] text-[color:#666]">
                {student.photo ? (
                  <Image
                    src={student.photo}
                    alt=""
                    width={140}
                    height={180}
                    className="size-full object-cover object-top"
                  />
                ) : (
                  <span>
                    Passport size
                    <br />
                    photo
                  </span>
                )}
              </span>
            </div>

            <dl className="mt-[5mm] space-y-[2mm] text-[10.5pt]">
              <CardRow label="Name of the Student" value={student.name} />
              {student.nameBn && <CardRow label="নাম (বাংলা)" value={student.nameBn} />}
              <CardRow label="Father's Name" value={student.fatherName} />
              <CardRow label="Mother's Name" value={student.motherName} />
              <CardRow
                label="Sex"
                value={student.gender ? GENDER[student.gender] : null}
              />
              <CardRow
                label="Date of Birth"
                value={
                  student.dateOfBirth ? formatDate(student.dateOfBirth, "en") : null
                }
                latin
              />
              <CardRow
                label="Name of the Institute and Code"
                value={`${settings.general.nameEn}${settings.general.govtCode ? ` (${settings.general.govtCode})` : ""}`}
              />
              <CardRow label="Address" value={student.address} />
              <CardRow
                label="Mobile"
                value={student.phone ? displayPhone(student.phone) : null}
                latin
              />
              <CardRow label="BMDC Registration" value={student.bmdc} latin />
              <CardRow label="Board Roll" value={student.boardRoll} latin />
              <CardRow
                label="Board Registration Number"
                value={student.boardRegistrationNo}
                latin
              />
              <CardRow label="Session / Batch" value={student.batch?.name} />
              <CardRow
                label="Date of Admission"
                value={
                  student.admissionDate ? formatDate(student.admissionDate, "en") : null
                }
                latin
              />
              {validUntil && (
                <CardRow
                  label="Valid Until"
                  value={formatDate(validUntil, "en")}
                  latin
                />
              )}
            </dl>

            <div className="mt-auto">
              <SignatureRow
                signatories={[
                  { name: "", title: "Signature of the Student", image: "" },
                  {
                    name: settings.documents.sign1Name,
                    title: settings.documents.sign1Title || "Head of the Institute",
                    image: settings.documents.sign1Image,
                  },
                ]}
                seal={doc.sealImage || undefined}
                width="50mm"
              />

              {notes.length > 0 && (
                <ol className="mt-[5mm] list-decimal space-y-0.5 ps-5 text-[8.5pt] text-[color:#333]">
                  {notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ol>
              )}

              <div className="mt-[3mm] flex items-end justify-between gap-4 border-t border-[color:#ccc] pt-2">
                <VerifyBlock
                  qr={qrLarge}
                  url={cardUrl.replace(/^https?:\/\//, "").slice(0, 46) + "…"}
                  label="Scan to verify this student"
                  size="22mm"
                />
                <p className="text-[8pt] text-[color:#555]">
                  Date of print: {formatDate(new Date(), "en")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CardRow({
  label,
  value,
  latin = false,
}: {
  label: string;
  value?: string | null;
  latin?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <dt className="w-[62mm] shrink-0 text-[color:#333]" lang={langOf(label)}>
        {label}
      </dt>
      <dd className={`min-w-0 flex-1 font-semibold ${latin ? "font-latin" : ""}`}>
        <span className="me-2">:</span>
        {value ? (
          <span lang={langOf(value)}>{value}</span>
        ) : (
          <span className="inline-block min-w-[40%] border-b border-dotted border-black align-bottom">
            &nbsp;
          </span>
        )}
      </dd>
    </div>
  );
}
