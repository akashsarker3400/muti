import { notFound } from "next/navigation";

import { Letterhead } from "@/components/admin/documents/document-chrome";
import { PrintButton } from "@/components/admin/print-button";
import { requirePermission } from "@/lib/admin-auth";
import { formatDate, formatMoney } from "@/lib/format";
import { langOf } from "@/lib/lang";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { takaInWords } from "@/lib/taka-words";

export const dynamic = "force-dynamic";

export const metadata = { title: "Receipt" };

/**
 * A money receipt (addendum 2, B2).
 *
 * Half of A4, because that is what a receipt book page is and two print on one
 * sheet: one for the student, one for the file. The amount is written in words
 * as well as figures, which is what makes a receipt hard to alter afterwards.
 */
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("fees.view");
  const { id } = await params;

  const [settings, payment] = await Promise.all([
    getSiteSettings(),
    prisma.payment.findUnique({
      where: { id },
      include: {
        student: {
          select: { name: true, roll: true, course: { select: { nameEn: true } } },
        },
        installment: { select: { label: true } },
        receivedBy: { select: { name: true } },
      },
    }),
  ]);
  if (!payment) notFound();

  const copies = ["Student's copy", "Office copy"] as const;

  return (
    <div className="mx-auto w-fit">
      <style>{`
        @page { size: A4; margin: 0 }
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
          Two halves of one A4 page: the student&rsquo;s copy and the office copy.
          Margins set to None.
        </span>
        <PrintButton label="Print receipt" />
      </div>

      <div
        className="sheet bg-white text-black shadow-[var(--shadow-card)] print:shadow-none"
        style={{ width: "210mm", height: "297mm", fontFamily: "var(--font-body-serif), Georgia, serif" }}
      >
        {copies.map((copy, index) => (
          <div
            key={copy}
            className={`relative h-[148.5mm] px-[14mm] py-[10mm] ${index === 0 ? "border-b border-dashed border-[color:#999]" : ""}`}
          >
            <Letterhead settings={settings} compact />

            <div className="mt-[4mm] flex items-baseline justify-between">
              <h2 className="font-[family-name:var(--font-display-serif)] text-[13pt] font-bold tracking-[0.2em] text-[color:#12204f] uppercase">
                Money Receipt
              </h2>
              <span className="text-[8.5pt] text-[color:#666]">{copy}</span>
            </div>

            <dl className="mt-[4mm] grid grid-cols-2 gap-x-6 gap-y-[2mm] text-[10pt]">
              <Row label="Receipt no" value={payment.receiptNo} latin />
              <Row label="Date" value={formatDate(payment.paidAt, "en")} latin />
              <Row label="Received from" value={payment.student.name} wide />
              <Row label="Roll" value={payment.student.roll} latin />
              <Row label="Course" value={payment.student.course.nameEn} />
              <Row
                label="Towards"
                value={payment.installment?.label ?? "Course fee"}
                wide
              />
            </dl>

            <div className="mt-[4mm] border-y border-[color:#ccc] py-[3mm]">
              <p className="text-[10pt]">
                <span className="text-[color:#555]">Amount</span>{" "}
                <span className="font-latin text-[15pt] font-bold">
                  {formatMoney(payment.amount, "en")}
                </span>
              </p>
              <p className="text-[9.5pt]">
                <span className="text-[color:#555]">In words</span>{" "}
                <span className="font-semibold">{takaInWords(payment.amount)}</span>
              </p>
              <p className="mt-1 text-[9pt] text-[color:#555]">
                Paid by {payment.method.toLowerCase()}
                {payment.reference ? ` · ref ${payment.reference}` : ""}
              </p>
            </div>

            {payment.voidedAt && (
              <p className="mt-[3mm] text-[10pt] font-bold text-[color:#b3121f]">
                CANCELLED{payment.voidReason ? `: ${payment.voidReason}` : ""}
              </p>
            )}

            <div className="absolute inset-x-[14mm] bottom-[10mm] flex items-end justify-between text-[9pt]">
              <span className="text-[color:#666]">
                {settings.contact.phone1}
                {settings.general.govtCode ? ` · code ${settings.general.govtCode}` : ""}
              </span>
              <span className="text-center">
                <span className="block w-[45mm] border-t border-black pt-1">
                  {payment.receivedBy?.name ?? "Received by"}
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  latin = false,
  wide = false,
}: {
  label: string;
  value: string;
  latin?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`flex items-baseline gap-2 ${wide ? "col-span-2" : ""}`}>
      <dt className="w-[26mm] shrink-0 text-[color:#555]">{label}</dt>
      <span aria-hidden="true">:</span>
      <dd
        className={`min-w-0 font-semibold ${latin ? "font-latin" : ""}`}
        lang={latin ? undefined : langOf(value)}
      >
        {value}
      </dd>
    </div>
  );
}
