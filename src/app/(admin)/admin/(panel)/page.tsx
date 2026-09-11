import Link from "next/link";
import {
  BookMarked,
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
import { langOf } from "@/lib/lang";
import { formatDate } from "@/lib/format";
import { displayPhone, telHref } from "@/lib/phone";
import { uploadsHealth } from "@/lib/admin/uploads-health";
import { prisma } from "@/lib/prisma";
import { waLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

const APPLICATION_TYPE_LABELS: Record<string, string> = {
  ADMISSION: "Admission application",
  FREE_CLASS: "Free class",
  CONTACT: "Contact",
  BOOK_SAMPLE: "Book sample",
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
    sampleDownloads,
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
    // Course book sample downloads this calendar month (addendum 5, A4).
    prisma.bookSampleDownload.count({
      where: {
        createdAt: {
          gte: new Date(
            Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
          ),
        },
      },
    }),
  ]);

  const chartData = buildDailySeries(
    chartRows.map((row) => row.createdAt),
    30,
  );

  return (
    <>
      <AdminPageHeader
        title={`Welcome, ${admin.name}`}
        description="The website at a glance"
      />

      {(!uploads.writable || uploads.missing.length > 0) && (
        <div
          role="alert"
          className="mb-5 rounded-[14px] border border-[color:var(--error)]/40 bg-[color:var(--error)]/8 p-4 text-sm"
          data-testid="uploads-alert"
        >
          <p className="flex items-center gap-2 font-semibold text-[color:var(--error)]">
            <AlertTriangle className="size-4" aria-hidden="true" />
            Uploaded files are missing from storage
          </p>
          <p className="mt-1">
            {!uploads.writable
              ? uploads.driver === "r2"
                ? "Cannot connect to the Cloudflare R2 bucket. Check the R2_* environment variables. "
                : "The upload folder is not writable. "
              : `${uploads.missing.length} of ${uploads.checked} files are missing. `}
            {uploads.driver === "r2" ? (
              <>
                Files are stored in Cloudflare R2. The missing ones were either deleted
                from the bucket or uploaded to the server before R2 was enabled. Upload
                them .
              </>
            ) : (
              <>
                Broken logo, hero or gallery images on the site? There is usually one
                cause: no persistent volume at{" "}
                <code className="font-latin">/app/uploads</code> under the app’s
                <strong>Storages</strong> in Coolify, so every redeploy wipes the
                uploads. Safest fix: enable Cloudflare R2 (deploy guide step 5), then
                upload the images .
              </>
            )}
          </p>
          {uploads.missing.length > 0 && (
            <ul className="mt-2 space-y-1">
              {uploads.missing.map((file) => (
                <li key={file.url} className="flex flex-wrap gap-x-2">
                  <span className="font-medium">{file.where}</span>
                  <code className="font-latin text-xs text-[color:var(--muted-foreground)]">
                    {file.url}
                  </code>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="New applications (7 days)"
          value={String(newApplications)}
          icon={Inbox}
          href="/admin/applications"
        />
        <StatCard
          label="Total students"
          value={String(totalStudents)}
          icon={GraduationCap}
          href="/admin/students"
        />
        <StatCard
          label="Running batches"
          value={String(runningBatches)}
          icon={CalendarRange}
          href="/admin/batches"
        />
        <StatCard
          label="Published notices"
          value={String(publishedNotices)}
          icon={Newspaper}
          href="/admin/notices"
        />
        <StatCard
          label="Sample downloads this month"
          value={String(sampleDownloads)}
          icon={BookMarked}
          href="/admin/applications?type=BOOK_SAMPLE"
        />
      </div>

      <Panel className="mt-5">
        <h2 className="mb-3 text-base font-semibold">Applications, last 30 days</h2>
        <ApplicationsChart data={chartData} />
      </Panel>

      <Panel className="mt-5" padded={false}>
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] p-4 sm:px-5">
          <h2 className="text-base font-semibold">Latest applications</h2>
          <Button asChild variant="outline" size="cta">
            <Link href="/admin/applications">View all</Link>
          </Button>
        </div>

        {recentApplications.length === 0 ? (
          <p className="p-8 text-center text-sm text-[color:var(--muted-foreground)]">
            No applications yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)]">
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    Type
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-start font-semibold lg:table-cell"
                  >
                    Course
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-3 text-start font-semibold sm:table-cell"
                  >
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-end font-semibold">
                    Contact
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {recentApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-[color:var(--bg-soft)]">
                    <td className="px-4 py-2.5">
                      <p className="font-medium" lang={langOf(application.name)}>
                        {application.name}
                      </p>
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
                      {formatDate(application.createdAt, "en")}
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
                          aria-label="Call"
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
      label: `${day.getUTCDate()}/${day.getUTCMonth() + 1}`,
      count: counts.get(key) ?? 0,
    });
  }

  return series;
}
