import Link from "next/link";
import { Settings2, Images, ListChecks } from "lucide-react";

import { HealthDesk } from "@/components/admin/health-desk";
import { AdminBadge, AdminPageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/admin-auth";
import { anonymizeOldAppointments, dhakaDateKey, keyToIso } from "@/lib/health";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

/** Free health service desk (addendum 4, §4): today's serials by default. */
export default async function HealthAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string }>;
}) {
  await requirePermission("health.appointments");
  const { date: dateParam, status } = await searchParams;

  const today = dhakaDateKey();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "")
    ? dateParam!.replace(/-/g, "")
    : today;

  // Opportunistic sweep: a missed nightly cron never leaves old names behind.
  await anonymizeOldAppointments();

  const [settings, rows, count] = await Promise.all([
    getSiteSettings(),
    prisma.healthAppointment.findMany({
      where: {
        serialDate: date,
        ...(status && status !== "ALL" ? { status: status as never } : {}),
      },
      orderBy: { serialNo: "asc" },
    }),
    prisma.healthDailyCount.findUnique({ where: { date } }),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Health service: serials"
        description="The day’s list for the free ultrasound service. Mark a patient “Seen” after the visit; enter the day’s count at the end."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!settings.health.published && (
              <AdminBadge tone="warning">Unpublished on the site</AdminBadge>
            )}
            <Button asChild variant="outline" size="cta">
              <Link href="/admin/settings?tab=health">
                <Settings2 className="size-4" aria-hidden="true" />
                Settings
              </Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <Link href="/admin/health-services">
                <ListChecks className="size-4" aria-hidden="true" />
                Service list
              </Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <Link href="/admin/gallery">
                <Images className="size-4" aria-hidden="true" />
                Gallery album
              </Link>
            </Button>
          </div>
        }
      />

      <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
        <label className="space-y-1 text-sm">
          <span className="block text-xs text-[color:var(--muted-foreground)]">
            Date
          </span>
          <input
            type="date"
            name="date"
            defaultValue={keyToIso(date)}
            className="h-10 rounded-lg border border-[color:var(--input)] bg-white px-3 font-latin text-sm"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-xs text-[color:var(--muted-foreground)]">
            Status
          </span>
          <select
            name="status"
            defaultValue={status ?? "ALL"}
            className="h-10 rounded-lg border border-[color:var(--input)] bg-white px-3 text-sm"
          >
            <option value="ALL">All</option>
            <option value="REQUESTED">Requested</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="SEEN">Seen</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
        <Button type="submit" variant="brand" size="cta">
          Show
        </Button>
        {date !== today && (
          <Button asChild variant="outline" size="cta">
            <Link href="/admin/health">Today</Link>
          </Button>
        )}
      </form>

      <HealthDesk
        date={date}
        isToday={date === today}
        count={{
          patients: count?.patients ?? 0,
          reports: count?.reports ?? 0,
          consultations: count?.consultations ?? 0,
        }}
        rows={rows.map((row) => ({
          id: row.id,
          serialNo: row.serialNo,
          name: row.name,
          phone: row.phone,
          age: row.age,
          gender: row.gender,
          area: row.area,
          complaint: row.complaint,
          preferredDate: row.preferredDate?.toISOString().slice(0, 10) ?? null,
          referredBy: row.referredBy,
          pregnant: row.pregnant,
          pregnancyMonths: row.pregnancyMonths,
          status: row.status,
          note: row.note,
          anonymized: Boolean(row.anonymizedAt),
        }))}
      />
    </>
  );
}
