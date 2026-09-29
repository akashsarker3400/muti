import Image from "next/image";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/admin/print-button";
import { requireAdmin } from "@/lib/admin-auth";
import { formatDate } from "@/lib/format";
import { langOf } from "@/lib/lang";
import { displayPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admission form" };

const EMPLOYMENT: Record<string, string> = {
  GOVT: "Government",
  PRIVATE: "Private",
  OTHER: "Other",
};

type EducationRow = { exam: string; year: string; gpa: string; board: string };

/**
 * The admission application as a paper form (A4): what the office used to
 * fill in by hand, printed with the online answers already in place, a photo
 * box and signature lines. Blank fields stay as ruled lines so the applicant
 * can complete them at the desk.
 */
export default async function ApplicationPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [settings, application] = await Promise.all([
    getSiteSettings(),
    prisma.application.findUnique({
      where: { id },
      include: { course: true, batch: true },
    }),
  ]);
  if (!application) notFound();

  const education: EducationRow[] = Array.isArray(application.education)
    ? (application.education as EducationRow[])
    : [];

  return (
    <div className="mx-auto max-w-[820px] bg-white p-8 text-black print:max-w-none print:p-0">
      <style>{`
        @page { size: A4; margin: 14mm }
        @media print {
          body { background: white }
          nav, aside, header, .no-print { display: none !important }
          main { padding: 0 !important }
        }
      `}</style>

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[color:var(--bg-soft)] p-3 text-sm">
        <span className="text-[color:var(--muted-foreground)]">
          Print or save as PDF. Empty fields print as ruled lines for the applicant to
          complete at the desk.
        </span>
        <PrintButton label="Print form" />
      </div>

      {/* Letterhead */}
      <header className="flex items-start gap-4 border-b-2 border-black pb-3">
        {settings.branding.logo && (
          <Image
            src={settings.branding.logo}
            alt=""
            width={64}
            height={64}
            className="size-16 shrink-0 object-contain"
          />
        )}
        <div className="min-w-0 flex-1 text-center">
          <h1 className="text-xl leading-tight font-bold">{settings.general.nameEn}</h1>
          <p lang="bn" className="text-sm">
            {settings.general.nameBn}
          </p>
          <p className="text-[11px] leading-snug">
            {settings.contact.addressEn}
            {settings.general.govtCode
              ? ` · Govt. institute code ${settings.general.govtCode}`
              : ""}
          </p>
          <p className="text-[11px]">
            {displayPhone(settings.contact.phone1)}
            {settings.contact.email ? ` · ${settings.contact.email}` : ""}
          </p>
        </div>
        {/* Photo box: the uploaded photo, or an empty frame for a paste-in print. */}
        <span className="grid h-[45mm] w-[35mm] shrink-0 place-items-center overflow-hidden border border-black text-center text-[10px] leading-tight">
          {application.photo ? (
            <Image
              src={application.photo}
              alt=""
              width={132}
              height={170}
              className="size-full object-cover object-top"
            />
          ) : (
            <span className="px-1 text-[color:#555]">
              Passport size
              <br />
              photo
            </span>
          )}
        </span>
      </header>

      <div className="mt-3 flex items-baseline justify-between">
        <h2 className="text-base font-bold tracking-wide uppercase">
          Admission application form
        </h2>
        <p className="font-latin text-[11px]">
          Application no: {application.id.slice(-8).toUpperCase()} · Received{" "}
          {formatDate(application.createdAt, "en")}
        </p>
      </div>

      <Section title="Course">
        <Row label="Course applied for" value={application.course?.nameEn} wide />
        <Row label="Course code" value={application.course?.code} />
        <Row label="Batch / session" value={application.batch?.name} />
      </Section>

      <Section title="Personal details">
        <Row label="Full name" value={application.name} wide />
        <Row label="Father's name" value={application.fatherName} />
        <Row label="Mother's name" value={application.motherName} />
        <Row
          label="Date of birth"
          value={
            application.dateOfBirth ? formatDate(application.dateOfBirth, "en") : null
          }
        />
        <Row label="Religion" value={application.religion} />
        <Row label="Blood group" value={application.bloodGroup} />
        <Row
          label="Employment"
          value={application.employment ? EMPLOYMENT[application.employment] : null}
        />
        <Row label="National ID" value={application.nationalId} wide />
      </Section>

      <Section title="Contact">
        <Row label="Mobile" value={displayPhone(application.phone)} />
        <Row
          label="WhatsApp"
          value={application.whatsapp ? displayPhone(application.whatsapp) : null}
        />
        <Row label="Email" value={application.email} wide />
        <Row label="Present address" value={application.presentAddress} wide />
        <Row label="Permanent address" value={application.permanentAddress} wide />
      </Section>

      <Section title="Qualification">
        <Row label="Qualification" value={application.qualification} />
        <Row label="BMDC registration" value={application.bmdc} />
        <Row label="Medical college" value={application.medicalCollege} wide />
      </Section>

      <div className="mt-4">
        <h3 className="mb-1 text-sm font-bold">Academic record</h3>
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr>
              {["Examination", "Year", "GPA / result", "Board / university"].map(
                (head) => (
                  <th
                    key={head}
                    className="border border-black px-2 py-1 text-start font-semibold"
                  >
                    {head}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3].map((index) => {
              const row = education[index];
              return (
                <tr key={index}>
                  <td className="h-7 border border-black px-2">{row?.exam ?? ""}</td>
                  <td className="border border-black px-2 font-latin">
                    {row?.year ?? ""}
                  </td>
                  <td className="border border-black px-2 font-latin">
                    {row?.gpa ?? ""}
                  </td>
                  <td className="border border-black px-2">{row?.board ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {application.message && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-bold">Applicant&rsquo;s message</h3>
          <p
            lang={langOf(application.message)}
            className="text-[12px] whitespace-pre-line"
          >
            {application.message}
          </p>
        </div>
      )}

      {/* Office use: fees and admission are settled at the desk. */}
      <div className="mt-4 border border-black p-3">
        <h3 className="text-sm font-bold">For office use</h3>
        <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-3 text-[12px]">
          <Blank label="Student roll" />
          <Blank label="Admission date" />
          <Blank label="Course fee" />
          <Blank label="Amount received" />
          <Blank label="Due" />
          <Blank label="Money receipt no" />
          <Blank label="Documents received" wide />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-10 text-[12px]">
        <SignatureLine label="Applicant's signature" />
        <SignatureLine label="Authorised signature, MUTI" />
      </div>

      <p className="mt-6 text-[10px] text-[color:#555]">
        Declaration: the information above is true to the best of my knowledge. I agree
        to follow the rules of {settings.general.nameEn}.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="mb-1 text-sm font-bold">{title}</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[12px]">{children}</div>
    </div>
  );
}

/** A filled value prints as text; an empty one prints as a ruled line. */
function Row({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <span className="text-[color:#555]">{label}:</span>{" "}
      {value ? (
        <span lang={langOf(value)} className="font-medium">
          {value}
        </span>
      ) : (
        <span className="inline-block min-w-[40%] border-b border-dotted border-black align-bottom">
          &nbsp;
        </span>
      )}
    </div>
  );
}

function Blank({ label, wide = false }: { label: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <span className="text-[color:#555]">{label}:</span>{" "}
      <span className="inline-block min-w-[50%] border-b border-dotted border-black align-bottom">
        &nbsp;
      </span>
    </div>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div className="text-center">
      <div className="h-10 border-b border-black" />
      <p className="mt-1">{label}</p>
    </div>
  );
}
