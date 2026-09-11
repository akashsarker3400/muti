import { requirePermission } from "@/lib/admin-auth";
import { dhakaDateKey, keyToIso } from "@/lib/health";
import { displayPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

/** Printable serial list for one day (addendum 4, §4). Opens print automatically. */
export default async function HealthPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requirePermission("health.appointments");
  const { date: dateParam } = await searchParams;
  const date = /^\d{8}$/.test(dateParam ?? "") ? dateParam! : dhakaDateKey();

  const [settings, rows] = await Promise.all([
    getSiteSettings(),
    prisma.healthAppointment.findMany({
      where: { serialDate: date, status: { not: "CANCELLED" } },
      orderBy: { serialNo: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-black print:p-0">
      <style>{`@media print { body { background: white } nav, aside, header, .no-print { display: none !important } }`}</style>
      <h1 className="text-xl font-bold">{settings.general.nameBn}</h1>
      <p className="text-sm">
        বিনামূল্যে আল্ট্রাসাউন্ড সেবা — সিরিয়াল তালিকা · {keyToIso(date)}
      </p>
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr>
            {["সিরিয়াল", "নাম", "মোবাইল", "বয়স", "এলাকা", "সমস্যা", "টিক"].map(
              (h) => (
                <th
                  key={h}
                  className="border border-black px-2 py-1 text-start font-semibold"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="border border-black px-2 py-1 font-latin font-bold">
                {row.serialNo}
              </td>
              <td className="border border-black px-2 py-1">
                {row.anonymizedAt ? "—" : row.name}
              </td>
              <td className="border border-black px-2 py-1 font-latin">
                {row.anonymizedAt ? "—" : displayPhone(row.phone)}
              </td>
              <td className="border border-black px-2 py-1 font-latin">
                {row.age ?? ""}
              </td>
              <td className="border border-black px-2 py-1">{row.area ?? ""}</td>
              <td className="border border-black px-2 py-1">{row.complaint ?? ""}</td>
              <td className="w-10 border border-black px-2 py-1" />
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="border border-black px-2 py-4 text-center">
                কোনো সিরিয়াল নেই
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-3 text-xs">মোট {rows.length} জন</p>
      <script
        dangerouslySetInnerHTML={{
          __html: "window.addEventListener('load',()=>window.print())",
        }}
      />
    </div>
  );
}
