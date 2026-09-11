import Link from "next/link";
import {
  CalendarRange,
  GraduationCap,
  Inbox,
  Newspaper,
  Phone,
  AlertTriangle,
} from "lucide-react";

import { ApplicationsChart } from "@/components/admin/applications-chart";
import { ApplicationStatusSelect } from "@/components/admin/application-status-select";
import { AdminPageHeader, Panel, StatCard } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/site/icons";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin-auth";
import { formatDate, toBanglaDigits } from "@/lib/format";
import { displayPhone, telHref } from "@/lib/phone";
import { uploadsHealth } from "@/lib/admin/uploads-health";
import { prisma } from "@/lib/prisma";
import { waLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export const metadata = { title: "ড্যাশবোর্ড" };

const APPLICATION_TYPE_LABELS: Record<string, string> = {
  ADMISSION: "ভর্তি আবেদন",
  FREE_CLASS: "ফ্রি ক্লাস",
  CONTACT: "যোগাযোগ",
};

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  const uploads = await uploadsHealth();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = startOfUtcDay(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

  const [
    newApplications,
    totalStudents,
    runningBatches,
    publishedNotices,
    recentApplications,
    chartRows,
  ] = await Promise.all([
    prisma.application.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.student.count(),
    prisma.batch.count({ where: { status: "RUNNING" } }),
    prisma.notice.count({ where: { published: true } }),
    prisma.application.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { course: true },
    }),
    prisma.application.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
  ]);

  const chartData = buildDailySeries(
    chartRows.map((row) => row.createdAt),
    30,
  );

  return (
    <>
      <AdminPageHeader
        title={`স্বাগতম, ${admin.name}`}
        description="ওয়েবসাইটের সর্বশেষ অবস্থা এক নজরে"
      />

      {(!uploads.writable || uploads.missing.length > 0) && (
        <div
          role="alert"
          className="mb-5 rounded-[14px] border border-[color:var(--error)]/40 bg-[color:var(--error)]/8 p-4 text-sm"
          data-testid="uploads-alert"
        >
          <p className="flex items-center gap-2 font-semibold text-[color:var(--error)]">
            <AlertTriangle className="size-4" aria-hidden="true" />
            আপলোড করা ফাইল সার্ভারে পাওয়া যাচ্ছে না
          </p>
          <p className="mt-1">
            {!uploads.writable
              ? "আপলোড ফোল্ডারে লেখা যাচ্ছে না। "
              : `${uploads.checked}টি ফাইলের মধ্যে ${uploads.missing.length}টি নেই (যেমন ${uploads.missing[0]})। `}
            সাইটে লোগো, হিরো বা গ্যালারির ছবি ভাঙা দেখাচ্ছে? কারণ সাধারণত একটাই:
            Coolify-তে অ্যাপের <strong>Storages</strong>-এ{" "}
            <code className="font-latin">/app/uploads</code> পাথে persistent volume যোগ
            করা নেই, তাই প্রতিটি redeploy-তে আপলোড মুছে যায়। ভলিউম যোগ করে (deploy
            guide ধাপ ৫) redeploy করুন, তারপর ছবিগুলো আবার আপলোড করুন।
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="নতুন আবেদন (৭ দিন)"
          value={toBanglaDigits(newApplications)}
          icon={Inbox}
          href="/admin/applications"
        />
        <StatCard
          label="মোট শিক্ষার্থী"
          value={toBanglaDigits(totalStudents)}
          icon={GraduationCap}
          href="/admin/students"
        />
        <StatCard
          label="চলমান ব্যাচ"
          value={toBanglaDigits(runningBatches)}
          icon={CalendarRange}
          href="/admin/batches"
        />
        <StatCard
          label="প্রকাশিত নোটিশ"
          value={toBanglaDigits(publishedNotices)}
          icon={Newspaper}
          href="/admin/notices"
        />
      </div>

      <Panel className="mt-5">
        <h2 className="mb-3 text-base font-semibold">গত ৩০ দিনের আবেদন</h2>
        <ApplicationsChart data={chartData} />
      </Panel>

      <Panel className="mt-5" padded={false}>
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] p-4 sm:px-5">
          <h2 className="text-base font-semibold">সর্বশেষ আবেদন</h2>
          <Button asChild variant="outline" size="cta">
            <Link href="/admin/applications">সব দেখুন</Link>
          </Button>
        </div>

        {recentApplications.length === 0 ? (
          <p className="p-8 text-center text-sm text-[color:var(--muted-foreground)]">
            এখনো কোনো আবেদন আসেনি।
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)]">
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    নাম
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    ধরন
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-start font-semibold lg:table-cell"
                  >
                    কোর্স
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-start font-semibold sm:table-cell"
                  >
                    তারিখ
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    অবস্থা
                  </th>
                  <th scope="col" className="px-4 py-3 text-end font-semibold">
                    যোগাযোগ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {recentApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-[color:var(--bg-soft)]">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{application.name}</p>
                      <p className="font-latin text-xs text-[color:var(--muted-foreground)]">
                        {displayPhone(application.phone)}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {APPLICATION_TYPE_LABELS[application.type]}
                    </td>
                    <td className="hidden px-4 py-2.5 lg:table-cell">
                      {application.course?.nameEn ?? "—"}
                    </td>
                    <td className="hidden px-4 py-2.5 whitespace-nowrap sm:table-cell">
                      {formatDate(application.createdAt, "bn")}
                    </td>
                    <td className="px-4 py-2.5">
                      <ApplicationStatusSelect
                        id={application.id}
                        status={application.status}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          aria-label="কল করুন"
                        >
                          <a href={telHref(application.phone)}>
                            <Phone className="size-4" aria-hidden="true" />
                          </a>
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          aria-label="WhatsApp"
                        >
                          <a
                            href={waLink(application.whatsapp ?? application.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <WhatsAppIcon className="size-4 text-[color:var(--whatsapp)]" />
                          </a>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Buckets timestamps into one entry per day, including days with no rows. */
function buildDailySeries(dates: Date[], days: number) {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = startOfUtcDay(date).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = startOfUtcDay(new Date());
  const series: Array<{ date: string; label: string; count: number }> = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today.getTime() - offset * 24 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    series.push({
      date: key,
      label: toBanglaDigits(`${day.getUTCDate()}/${day.getUTCMonth() + 1}`),
      count: counts.get(key) ?? 0,
    });
  }

  return series;
}
