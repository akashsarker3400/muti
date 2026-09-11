"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Printer, Save, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  createHealthAppointmentAtDesk,
  saveHealthDailyCount,
  setHealthAppointmentStatus,
} from "@/app/actions/admin-health";
import { AdminBadge, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { langOf } from "@/lib/lang";
import { displayPhone } from "@/lib/phone";

type Status = "REQUESTED" | "CONFIRMED" | "SEEN" | "CANCELLED";

export type DeskRow = {
  id: string;
  serialNo: number;
  name: string;
  phone: string;
  age: number | null;
  gender: string | null;
  area: string | null;
  complaint: string | null;
  preferredDate: string | null;
  referredBy: string | null;
  pregnant: string | null;
  pregnancyMonths: number | null;
  status: Status;
  note: string | null;
  anonymized: boolean;
};

const STATUS_LABEL: Record<Status, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  SEEN: "Seen",
  CANCELLED: "Cancel",
};
const STATUS_TONE: Record<Status, "neutral" | "warning" | "success" | "danger"> = {
  REQUESTED: "warning",
  CONFIRMED: "neutral",
  SEEN: "success",
  CANCELLED: "danger",
};
const SELECT =
  "h-9 rounded-md border border-[color:var(--input)] bg-white px-2 text-sm focus-visible:border-[color:var(--brand)] focus-visible:outline-none";

/**
 * The day's serial list with status changes, a desk entry for phone/walk-in
 * serials, the daily count box and a print button (addendum 4, §4).
 */
export function HealthDesk({
  date,
  rows,
  count,
  isToday,
}: {
  /** "YYYYMMDD" */
  date: string;
  rows: DeskRow[];
  count: { patients: number; reports: number; consultations: number };
  isToday: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [patients, setPatients] = useState(String(count.patients));
  const [reports, setReports] = useState(String(count.reports));
  const [consultations, setConsultations] = useState(String(count.consultations));
  const [desk, setDesk] = useState({
    name: "",
    phone: "",
    age: "",
    area: "",
    complaint: "",
  });

  function setStatus(id: string, status: Status) {
    startTransition(async () => {
      const result = await setHealthAppointmentStatus(id, status);
      if (!result.ok) toast.error(result.error ?? "The change could not be saved.");
      router.refresh();
    });
  }

  function saveCount() {
    startTransition(async () => {
      const result = await saveHealthDailyCount({
        date,
        patients,
        reports,
        consultations,
      });
      if (result.ok) toast.success("Daily count saved.");
      else toast.error(result.error ?? "Could not save.");
      router.refresh();
    });
  }

  function addAtDesk(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createHealthAppointmentAtDesk(desk);
      if (!result.ok) {
        toast.error(result.error ?? "Could not add.");
        return;
      }
      toast.success(`Serial number ${result.serialNo} issued.`, {
        duration: 8000,
      });
      setDesk({ name: "", phone: "", age: "", area: "", complaint: "" });
      router.refresh();
    });
  }

  const seen = rows.filter((row) => row.status === "SEEN").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* Daily count */}
        <Panel>
          <h2 className="mb-1 text-base font-semibold">Daily count</h2>
          <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
            How many patients were seen and reports given on this day. The website’s
            “service in numbers” adds up from here. {seen} marked “Seen” in the list.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="count-patients">Patients</Label>
              <Input
                id="count-patients"
                inputMode="numeric"
                value={patients}
                onChange={(e) => setPatients(e.target.value)}
                className="h-10 w-24 font-latin"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="count-consultations">Consultations</Label>
              <Input
                id="count-consultations"
                inputMode="numeric"
                value={consultations}
                onChange={(e) => setConsultations(e.target.value)}
                className="h-10 w-24 font-latin"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="count-reports">Reports</Label>
              <Input
                id="count-reports"
                inputMode="numeric"
                value={reports}
                onChange={(e) => setReports(e.target.value)}
                className="h-10 w-24 font-latin"
              />
            </div>
            <Button
              type="button"
              variant="brand"
              size="cta"
              onClick={saveCount}
              disabled={pending}
            >
              <Save className="size-4" aria-hidden="true" />
              Save
            </Button>
          </div>
        </Panel>

        {/* Desk entry */}
        {isToday && (
          <Panel>
            <h2 className="mb-1 text-base font-semibold">
              Serial by phone / at the desk
            </h2>
            <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
              The next number is assigned automatically, in the same sequence as the
              website.
            </p>
            <form onSubmit={addAtDesk} className="grid gap-3 sm:grid-cols-2">
              <Input
                aria-label="Name"
                placeholder="Name *"
                value={desk.name}
                onChange={(e) => setDesk({ ...desk, name: e.target.value })}
                required
                className="h-10"
              />
              <Input
                aria-label="Mobile"
                placeholder="Mobile *"
                dir="ltr"
                value={desk.phone}
                onChange={(e) => setDesk({ ...desk, phone: e.target.value })}
                required
                className="h-10 font-latin"
              />
              <Input
                aria-label="Age"
                placeholder="Age"
                inputMode="numeric"
                value={desk.age}
                onChange={(e) => setDesk({ ...desk, age: e.target.value })}
                className="h-10 font-latin"
              />
              <Input
                aria-label="Area"
                placeholder="Area"
                value={desk.area}
                onChange={(e) => setDesk({ ...desk, area: e.target.value })}
                className="h-10"
              />
              <Input
                aria-label="Complaint"
                placeholder="Complaint (one line)"
                value={desk.complaint}
                onChange={(e) => setDesk({ ...desk, complaint: e.target.value })}
                className="h-10 sm:col-span-2"
              />
              <Button
                type="submit"
                variant="outline"
                size="cta"
                disabled={pending}
                className="sm:col-span-2"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <UserPlus className="size-4" aria-hidden="true" />
                )}
                Issue serial
              </Button>
            </form>
          </Panel>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[color:var(--muted-foreground)]">
          {rows.length} serials · {seen} seen
        </p>
        <Button asChild variant="outline" size="cta">
          <a href={`/admin/health/print?date=${date}`} target="_blank" rel="noopener">
            <Printer className="size-4" aria-hidden="true" />
            Print today’s list
          </a>
        </Button>
      </div>

      <Panel className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--bg-soft)] text-xs text-[color:var(--muted-foreground)]">
            <tr>
              <th className="px-3 py-2 text-start font-medium">Serial</th>
              <th className="px-3 py-2 text-start font-medium">Name</th>
              <th className="px-3 py-2 text-start font-medium">Mobile</th>
              <th className="px-3 py-2 text-start font-medium">Age / gender</th>
              <th className="px-3 py-2 text-start font-medium">Pregnant</th>
              <th className="px-3 py-2 text-start font-medium">Area</th>
              <th className="px-3 py-2 text-start font-medium">Complaint</th>
              <th className="px-3 py-2 text-start font-medium">Preferred date</th>
              <th className="px-3 py-2 text-start font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-8 text-center text-[color:var(--muted-foreground)]"
                >
                  No serials on this day.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                className={row.status === "CANCELLED" ? "opacity-60" : ""}
              >
                <td className="px-3 py-2 font-latin text-lg font-bold text-[color:var(--brand)]">
                  {row.serialNo}
                </td>
                <td className="px-3 py-2 font-medium" lang={langOf(row.name)}>
                  {row.anonymized ? (
                    <span className="text-[color:var(--muted-foreground)]">
                      (anonymised)
                    </span>
                  ) : (
                    row.name
                  )}
                </td>
                <td className="px-3 py-2 font-latin">
                  {row.anonymized ? "—" : displayPhone(row.phone)}
                </td>
                <td className="px-3 py-2 font-latin">
                  {[row.age, row.gender?.charAt(0)].filter(Boolean).join(" / ") || "—"}
                </td>
                <td className="px-3 py-2">
                  {row.pregnant === "YES"
                    ? `Yes${row.pregnancyMonths ? ` (${row.pregnancyMonths} months)` : ""}`
                    : row.pregnant === "NO"
                      ? "No"
                      : "—"}
                </td>
                <td className="px-3 py-2" lang={langOf(row.area)}>
                  {row.area ?? "—"}
                </td>
                <td
                  className="max-w-[14rem] truncate px-3 py-2"
                  title={row.complaint ?? ""}
                  lang={langOf(row.complaint)}
                >
                  {row.complaint ?? "—"}
                </td>
                <td className="px-3 py-2 font-latin">{row.preferredDate ?? "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <AdminBadge tone={STATUS_TONE[row.status]}>
                      {STATUS_LABEL[row.status]}
                    </AdminBadge>
                    <select
                      value={row.status}
                      onChange={(e) => setStatus(row.id, e.target.value as Status)}
                      className={SELECT}
                      aria-label={`Serial ${row.serialNo} status`}
                      disabled={pending}
                    >
                      {(Object.keys(STATUS_LABEL) as Status[]).map((value) => (
                        <option key={value} value={value}>
                          {STATUS_LABEL[value]}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
