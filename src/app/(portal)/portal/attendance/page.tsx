import { redirect } from "next/navigation";

import { myAttendance } from "@/app/actions/portal";
import { attendanceFor } from "@/lib/attendance";
import { formatDate } from "@/lib/format";
import { currentStudent } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "উপস্থিতি" };

const LABELS: Record<string, string> = {
  PRESENT: "উপস্থিত",
  ABSENT: "অনুপস্থিত",
  LATE: "দেরিতে",
  EXCUSED: "ছুটি",
};

/** Class by class, so a disputed percentage can be checked (addendum 2, B12). */
export default async function PortalAttendance() {
  const student = await currentStudent();
  if (!student) redirect("/portal");

  const [rows, summary] = await Promise.all([
    myAttendance(),
    attendanceFor(student.id),
  ]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-5">
        <h1 className="text-xl font-semibold">উপস্থিতি</h1>
        <p className="mt-2 text-4xl font-semibold">
          {summary.percent === null ? "—" : `${summary.percent}%`}
        </p>
        <p className="text-sm text-[color:var(--muted-foreground)]">
          {summary.attended} উপস্থিত, {summary.absent} অনুপস্থিত
          {summary.excused > 0 ? `, ${summary.excused} ছুটি` : ""}
        </p>
      </section>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-[color:var(--muted-foreground)]">
          এখনো কোনো ক্লাসের হাজিরা নেওয়া হয়নি।
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--border)] overflow-hidden rounded-2xl bg-white">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{row.session.topic}</p>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  {formatDate(row.session.date, "bn")}
                </p>
              </div>
              <span
                className={
                  row.status === "ABSENT"
                    ? "text-sm text-[color:var(--error)]"
                    : "text-sm"
                }
              >
                {LABELS[row.status] ?? row.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
