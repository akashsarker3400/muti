import Link from "next/link";
import { CalendarDays, ClipboardCheck, Wallet } from "lucide-react";

import { PortalLogin } from "@/components/portal/portal-login";
import { myOverview } from "@/app/actions/portal";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * The portal home (addendum 2, B12): the next class, what is owed, and the
 * attendance figure — the three things a student actually opens this for.
 */
export default async function PortalHome() {
  const overview = await myOverview();

  if (!overview) return <PortalLogin />;

  const { student, attendance, fees, nextClass, notices } = overview;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-5">
        <p className="text-sm text-[color:var(--muted-foreground)]">
          {student.roll} · {student.course}
          {student.batch ? ` · ${student.batch}` : ""}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{student.name}</h1>
      </section>

      <section className="rounded-2xl bg-white p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <CalendarDays className="size-4" aria-hidden="true" />
          পরের ক্লাস
        </h2>
        {nextClass ? (
          <p className="mt-2">
            <span className="font-medium">{nextClass.topic}</span>
            <span className="block text-sm text-[color:var(--muted-foreground)]">
              {formatDate(nextClass.date, "bn")}
              {nextClass.startTime ? ` · ${nextClass.startTime}` : ""}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            পরের ক্লাসের তারিখ এখনো ঠিক হয়নি।
          </p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/portal/attendance" className="rounded-2xl bg-white p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <ClipboardCheck className="size-4" aria-hidden="true" />
            উপস্থিতি
          </h2>
          <p className="mt-2 text-3xl font-semibold">
            {attendance.percent === null ? "—" : `${attendance.percent}%`}
          </p>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {attendance.attended} ক্লাসে উপস্থিত
          </p>
        </Link>

        <Link href="/portal/fees" className="rounded-2xl bg-white p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Wallet className="size-4" aria-hidden="true" />
            বকেয়া
          </h2>
          <p className="mt-2 text-3xl font-semibold">
            {fees ? formatMoney(fees.due, "bn") : "—"}
          </p>
          {fees?.nextDue && (
            <p className="text-sm text-[color:var(--muted-foreground)]">
              পরের কিস্তি {formatDate(fees.nextDue.dueDate, "bn")}
            </p>
          )}
        </Link>
      </div>

      {notices.length > 0 && (
        <section className="rounded-2xl bg-white p-5">
          <h2 className="font-semibold">নোটিশ</h2>
          <ul className="mt-2 divide-y divide-[color:var(--border)] text-sm">
            {notices.map((notice) => (
              <li key={notice.id} className="py-2">
                {notice.titleBn || notice.titleEn}
                <span className="block text-xs text-[color:var(--muted-foreground)]">
                  {formatDate(notice.createdAt, "bn")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
