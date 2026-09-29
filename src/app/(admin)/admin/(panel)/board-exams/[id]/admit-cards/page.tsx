import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CornerMotifs,
  DocumentBorder,
  Letterhead,
  SignatureRow,
} from "@/components/admin/documents/document-chrome";
import { SiteUrlWarning } from "@/components/admin/documents/site-url-warning";
import { PrintButton } from "@/components/admin/print-button";
import { AdminPageHeader, EmptyState, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/admin-auth";
import { signCardToken } from "@/lib/card-token";
import { requiredEnv, siteUrl } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { langOf } from "@/lib/lang";
import { prisma } from "@/lib/prisma";
import { qrSvg } from "@/lib/qr";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admit cards" };

/** What every board tells a candidate, when the office has not said otherwise. */
const DEFAULT_INSTRUCTIONS = [
  "Bring this admit card to the examination hall. No candidate is allowed to sit without it.",
  "Be at the centre at least thirty minutes before the examination begins.",
  "Mobile phones, smart watches and any printed material are not allowed in the hall.",
  "Follow the invigilator's instructions at all times.",
];

/**
 * Examination admit cards, one A4 page per candidate.
 *
 * Built from what the office already holds: the board examination record and
 * the students of the batch sitting it. Everything the board prints on its own
 * card is here — candidate, roll, registration, centre, date and time — and a
 * field left empty prints a ruled line to fill in by hand rather than a gap.
 *
 * English only, like the certificate and the registration card.
 */
export default async function AdmitCardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ only?: string }>;
}) {
  await requirePermission("results.manage");
  const [{ id }, { only }] = await Promise.all([params, searchParams]);

  const [settings, exam] = await Promise.all([
    getSiteSettings(),
    prisma.boardExam.findUnique({
      where: { id },
      include: {
        course: true,
        batch: {
          include: {
            course: true,
            students: {
              where: { deletedAt: null, status: { not: "DROPPED" } },
              orderBy: { roll: "asc" },
            },
          },
        },
      },
    }),
  ]);
  if (!exam) notFound();

  const wanted = only ? new Set(only.split(",").filter(Boolean)) : null;
  const students = (exam.batch?.students ?? []).filter(
    (student) => !wanted || wanted.has(student.id),
  );

  const instructions = (exam.instructions ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const rules = instructions.length > 0 ? instructions : DEFAULT_INSTRUCTIONS;

  // One QR per candidate, opening the same signed page the ID card uses: it
  // shows the photo, which is what an invigilator actually needs to check.
  const qrs = new Map<string, string>(
    await Promise.all(
      students.map(
        async (student) =>
          [
            student.id,
            await qrSvg(`${siteUrl}/card/${signCardToken(student.id, requiredEnv("AUTH_SECRET"))}`, 96),
          ] as const,
      ),
    ),
  );

  const seal = settings.documents.sealImage || undefined;

  return (
    <>
      <div className="no-print">
        <AdminPageHeader
          title="Admit cards"
          description={`${exam.title} · ${exam.session}${exam.batch ? ` · ${exam.batch.name}` : ""}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="cta">
                <Link href={`/admin/board-exams/${exam.id}`}>Edit the examination</Link>
              </Button>
              {students.length > 0 && <PrintButton label="Print admit cards" />}
            </div>
          }
        />

        <SiteUrlWarning />

        {!exam.batch && (
          <Panel className="mb-4 text-sm">
            <strong>No batch is set on this examination.</strong> Open it and choose
            the batch sitting it; the admit cards are printed for that batch&rsquo;s
            students.
          </Panel>
        )}

        {(!exam.examDate || !exam.centre) && exam.batch && (
          <Panel className="mb-4 text-sm">
            The date and the centre are not filled in yet, so the cards print ruled
            lines for them. Add them on the examination for a card the candidate can
            read without asking.
          </Panel>
        )}

        {students.length > 0 && (
          <p className="mb-4 text-sm text-[color:var(--muted-foreground)]">
            {students.length} card{students.length === 1 ? "" : "s"}, one per A4 page.
            Plain white paper, margins set to None. Students marked dropped are left
            out.
          </p>
        )}
      </div>

      {students.length === 0 ? (
        <EmptyState
          title="No candidates to print."
          description={
            exam.batch
              ? "The batch has no students on it yet."
              : "Choose the batch sitting this examination first."
          }
        />
      ) : (
        <div className="mx-auto w-fit">
          <style>{`
            @page { size: A4; margin: 0 }
            .sheet { print-color-adjust: exact; -webkit-print-color-adjust: exact }
            @media print {
              body { background: white }
              nav, aside, header, .no-print { display: none !important }
              main { padding: 0 !important }
              .sheet { box-shadow: none !important; margin: 0 !important;
                       break-after: page; page-break-after: always }
              .sheet:last-child { break-after: auto; page-break-after: auto }
            }
          `}</style>

          {students.map((student) => (
            <div
              key={student.id}
              className="sheet relative mb-6 overflow-hidden bg-white text-black shadow-[var(--shadow-card)] print:mb-0 print:shadow-none"
              style={{
                width: "210mm",
                height: "297mm",
                fontFamily: "var(--font-body-serif), Georgia, serif",
              }}
            >
              <DocumentBorder variant="card" />
              <CornerMotifs size={26} />

              {/* The frame sits 7 mm in and its corner motifs 9 mm in, so the
                  content keeps well clear of both rather than running under
                  them at the foot of the page. */}
              <div className="relative flex h-full flex-col px-[18mm] pt-[12mm] pb-[14mm]">
                <Letterhead settings={settings} compact />

                <div className="mt-[5mm] text-center">
                  <h2 className="inline-block border-y-2 border-[color:#12204f] px-6 py-1 font-[family-name:var(--font-display-serif)] text-[15pt] font-bold tracking-[0.18em] text-[color:#12204f] uppercase">
                    Admit Card
                  </h2>
                  <p className="mt-2 text-[11pt] font-semibold">{exam.title}</p>
                  <p className="text-[9.5pt] text-[color:#444]">
                    {exam.boardName}
                    {exam.session ? ` · Session ${exam.session}` : ""}
                  </p>
                </div>

                <div className="mt-[6mm] flex items-start gap-6">
                  <dl className="min-w-0 flex-1 space-y-[2.5mm] text-[10.5pt]">
                    <Row label="Name of the Candidate" value={student.name} />
                    <Row label="Father's Name" value={student.fatherName} />
                    <Row label="Mother's Name" value={student.motherName} />
                    <Row
                      label="Course"
                      value={exam.course?.fullNameEn ?? exam.batch?.course.fullNameEn}
                    />
                    <Row label="Roll No" value={student.boardRoll || student.roll} latin />
                    <Row
                      label="Registration No"
                      value={student.boardRegistrationNo}
                      latin
                    />
                    <Row label="Session / Batch" value={exam.batch?.name} />
                  </dl>

                  {/* The photo is the point of the card at the door. */}
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

                <dl className="mt-[6mm] grid grid-cols-2 gap-x-6 gap-y-[2.5mm] border-y border-[color:#ccc] py-[4mm] text-[10.5pt]">
                  <Row
                    label="Date of Examination"
                    value={exam.examDate ? formatDate(exam.examDate, "en") : null}
                    latin
                  />
                  <Row label="Time" value={exam.examTime} latin />
                  <Row label="Centre" value={exam.centre} wide />
                </dl>

                <ol className="mt-[5mm] list-decimal space-y-[1mm] ps-5 text-[9pt] text-[color:#333]">
                  {rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ol>

                <div className="mt-auto">
                  <SignatureRow
                    signatories={[
                      { name: "", title: "Signature of the Candidate", image: "" },
                      {
                        name: settings.documents.sign1Name,
                        title:
                          settings.documents.sign1Title || "Head of the Institute",
                        image: settings.documents.sign1Image,
                      },
                    ]}
                    seal={seal}
                    width="50mm"
                  />

                  <div className="mt-[4mm] flex items-end justify-between gap-4 border-t border-[color:#ccc] pt-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="block size-[18mm] shrink-0 [&>svg]:size-full"
                        dangerouslySetInnerHTML={{ __html: qrs.get(student.id) ?? "" }}
                      />
                      <div className="text-[7pt] leading-snug text-[color:#333]">
                        <p className="font-semibold">Scan to verify this candidate</p>
                        <p className="font-latin">
                          {siteUrl.replace(/^https?:\/\//, "")}/card
                        </p>
                      </div>
                    </div>
                    <p className="text-[7.5pt] text-[color:#666]">
                      Institute code {settings.general.govtCode} · printed{" "}
                      {formatDate(new Date(), "en")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** One "label : value" line, with a ruled line where the office has no value. */
function Row({
  label,
  value,
  latin = false,
  wide = false,
}: {
  label: string;
  value?: string | null;
  latin?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`flex items-baseline gap-2 ${wide ? "col-span-2" : ""}`}>
      <dt className="w-[42mm] shrink-0 text-[color:#555]">{label}</dt>
      <span aria-hidden="true">:</span>
      {value ? (
        <dd
          className={`min-w-0 font-semibold ${latin ? "font-latin" : ""}`}
          lang={latin ? undefined : langOf(value)}
        >
          {value}
        </dd>
      ) : (
        <dd className="min-w-0 flex-1 border-b border-dotted border-[color:#999]">
          &nbsp;
        </dd>
      )}
    </div>
  );
}
