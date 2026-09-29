import Image from "next/image";

import { langOf } from "@/lib/lang";
import { displayPhone } from "@/lib/phone";
import type { SiteSettings } from "@/lib/site-settings";

/**
 * CR80 wallet card, 85.6 × 54 mm: the size of a bank card, so it fits a
 * wallet and any standard PVC card printer or laminating pouch. Front and
 * back print side by side on one A4 sheet with crop marks.
 */

export type WalletStudent = {
  name: string;
  roll: string;
  photo: string | null;
  bloodGroup: string | null;
  phone: string | null;
  batchName: string | null;
  courseCode: string;
  courseName: string;
};

const CARD = { width: "85.6mm", height: "54mm" };

export function WalletCardSheet({
  student,
  settings,
  qr,
  validUntil,
  notes,
}: {
  student: WalletStudent;
  settings: SiteSettings;
  qr: string;
  validUntil: string | null;
  notes: string[];
}) {
  return (
    <div className="sheet flex flex-wrap gap-[10mm] bg-white p-[6mm] print:p-0">
      <CropFrame>
        <CardFront student={student} settings={settings} validUntil={validUntil} />
      </CropFrame>
      <CropFrame>
        <CardBack student={student} settings={settings} qr={qr} notes={notes} />
      </CropFrame>
    </div>
  );
}

/** Crop marks so a press or a guillotine has a line to cut on. */
function CropFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative" style={CARD}>
      {[
        "-top-[3mm] -start-[3mm] border-t border-s",
        "-top-[3mm] -end-[3mm] border-t border-e",
        "-bottom-[3mm] -start-[3mm] border-b border-s",
        "-bottom-[3mm] -end-[3mm] border-b border-e",
      ].map((position) => (
        <span
          key={position}
          aria-hidden="true"
          className={`absolute size-[3mm] border-black/60 ${position}`}
        />
      ))}
      {children}
    </div>
  );
}

function CardFront({
  student,
  settings,
  validUntil,
}: {
  student: WalletStudent;
  settings: SiteSettings;
  validUntil: string | null;
}) {
  return (
    <div
      className="relative flex size-full flex-col overflow-hidden rounded-[3mm] border border-[color:#12204f] bg-white"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* Header band */}
      <div className="flex items-center gap-2 bg-[color:#12204f] px-[3mm] py-[1.6mm] text-white">
        {settings.branding.logo && (
          <Image
            src={settings.branding.logo}
            alt=""
            width={40}
            height={40}
            className="size-[7mm] shrink-0 rounded-[1mm] bg-white object-contain p-[0.5mm]"
          />
        )}
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[7pt] font-bold tracking-wide">
            {settings.general.nameEn}
          </p>
          <p className="text-[5pt] tracking-[0.12em] text-white/75 uppercase">
            Student Identity Card
            {settings.general.govtCode ? ` · Code ${settings.general.govtCode}` : ""}
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-[2.5mm] p-[2.5mm]">
        <span className="grid h-[27mm] w-[21mm] shrink-0 place-items-center overflow-hidden rounded-[1.5mm] border border-[color:#12204f]/40 bg-[color:#f2f4f9]">
          {student.photo ? (
            <Image
              src={student.photo}
              alt=""
              width={70}
              height={90}
              className="size-full object-cover object-top"
            />
          ) : (
            <span className="text-[5pt] text-[color:#777]">Photo</span>
          )}
        </span>

        <dl className="min-w-0 flex-1 text-[6.5pt] leading-[1.45]">
          <dd
            lang={langOf(student.name)}
            className="truncate text-[9pt] leading-tight font-bold text-[color:#12204f]"
          >
            {student.name}
          </dd>
          <div className="mt-[1mm] grid grid-cols-[13mm_1fr] gap-x-1">
            <dt className="text-[color:#666]">Roll</dt>
            <dd className="font-latin font-semibold">{student.roll}</dd>
            <dt className="text-[color:#666]">Course</dt>
            <dd className="truncate font-semibold">{student.courseCode}</dd>
            {student.batchName && (
              <>
                <dt className="text-[color:#666]">Batch</dt>
                <dd className="truncate">{student.batchName}</dd>
              </>
            )}
            {student.bloodGroup && (
              <>
                <dt className="text-[color:#666]">Blood</dt>
                <dd className="font-latin font-semibold text-[color:#b3121f]">
                  {student.bloodGroup}
                </dd>
              </>
            )}
            {validUntil && (
              <>
                <dt className="text-[color:#666]">Valid to</dt>
                <dd className="font-latin">{validUntil}</dd>
              </>
            )}
          </div>
        </dl>
      </div>

      <div className="h-[2mm] bg-gradient-to-r from-[color:#12204f] via-[color:#9a7b2f] to-[color:#b3121f]" />
    </div>
  );
}

function CardBack({
  student,
  settings,
  qr,
  notes,
}: {
  student: WalletStudent;
  settings: SiteSettings;
  qr: string;
  notes: string[];
}) {
  return (
    <div
      className="relative flex size-full flex-col overflow-hidden rounded-[3mm] border border-[color:#12204f] bg-white p-[3mm]"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <div className="flex gap-[3mm]">
        <span
          className="block size-[17mm] shrink-0 [&>svg]:size-full"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <div className="min-w-0 text-[5.5pt] leading-[1.5] text-[color:#333]">
          <p className="text-[6pt] font-bold text-[color:#12204f]">
            Scan to verify this card
          </p>
          <p>{settings.contact.addressEn}</p>
          <p className="font-latin">
            {displayPhone(settings.contact.phone1)}
            {settings.contact.email ? ` · ${settings.contact.email}` : ""}
          </p>
        </div>
      </div>

      {notes.length > 0 && (
        <ol className="mt-[2mm] list-decimal space-y-[0.3mm] ps-[3.5mm] text-[5pt] leading-[1.45] text-[color:#444]">
          {notes.slice(0, 3).map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ol>
      )}

      <div className="mt-auto flex items-end justify-between gap-3">
        <p className="font-latin text-[5pt] text-[color:#777]">{student.courseName}</p>
        <div className="text-center">
          <div className="w-[26mm] border-t border-black" />
          <p className="text-[5pt]">Authorised signature</p>
        </div>
      </div>
    </div>
  );
}
