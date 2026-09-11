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
  REQUESTED: "অনুরোধ",
  CONFIRMED: "নিশ্চিত",
  SEEN: "দেখা হয়েছে",
  CANCELLED: "বাতিল",
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
      if (!result.ok) toast.error(result.error ?? "পরিবর্তন করা যায়নি।");
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
      if (result.ok) toast.success("দিনের হিসাব সংরক্ষিত।");
      else toast.error(result.error ?? "সংরক্ষণ করা যায়নি।");
      router.refresh();
    });
  }

  function addAtDesk(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createHealthAppointmentAtDesk(desk);
      if (!result.ok) {
        toast.error(result.error ?? "যোগ করা যায়নি।");
        return;
      }
      toast.success(`সিরিয়াল নম্বর ${result.serialNo} দেওয়া হয়েছে।`, {
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
          <h2 className="mb-1 text-base font-semibold">দিনের হিসাব</h2>
          <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
            এই দিনে কতজন রোগী দেখা হয়েছে আর কতটি রিপোর্ট দেওয়া হয়েছে। সাইটের “আমাদের
            সেবার হিসাব” এখান থেকেই যোগ হয়। তালিকায় “দেখা হয়েছে” {seen} জন।
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="count-patients">রোগী</Label>
              <Input
                id="count-patients"
                inputMode="numeric"
                value={patients}
                onChange={(e) => setPatients(e.target.value)}
                className="h-10 w-24 font-latin"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="count-consultations">পরামর্শ</Label>
              <Input
                id="count-consultations"
                inputMode="numeric"
                value={consultations}
                onChange={(e) => setConsultations(e.target.value)}
                className="h-10 w-24 font-latin"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="count-reports">রিপোর্ট</Label>
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
              সংরক্ষণ
            </Button>
          </div>
        </Panel>

        {/* Desk entry */}
        {isToday && (
          <Panel>
            <h2 className="mb-1 text-base font-semibold">ফোনে / অফিসে আসা সিরিয়াল</h2>
            <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
              পরের নম্বরটি নিজে থেকে পড়বে, ওয়েবসাইটের সিরিয়ালের সাথে একই ধারায়।
            </p>
            <form onSubmit={addAtDesk} className="grid gap-3 sm:grid-cols-2">
              <Input
                aria-label="নাম"
                placeholder="নাম *"
                value={desk.name}
                onChange={(e) => setDesk({ ...desk, name: e.target.value })}
                required
                className="h-10"
              />
              <Input
                aria-label="মোবাইল"
                placeholder="মোবাইল *"
                dir="ltr"
                value={desk.phone}
                onChange={(e) => setDesk({ ...desk, phone: e.target.value })}
                required
                className="h-10 font-latin"
              />
              <Input
                aria-label="বয়স"
                placeholder="বয়স"
                inputMode="numeric"
                value={desk.age}
                onChange={(e) => setDesk({ ...desk, age: e.target.value })}
                className="h-10 font-latin"
              />
              <Input
                aria-label="এলাকা"
                placeholder="এলাকা"
                value={desk.area}
                onChange={(e) => setDesk({ ...desk, area: e.target.value })}
                className="h-10"
              />
              <Input
                aria-label="সমস্যা"
                placeholder="সমস্যা (এক লাইনে)"
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
                সিরিয়াল দিন
              </Button>
            </form>
          </Panel>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[color:var(--muted-foreground)]">
          {rows.length}টি সিরিয়াল · {seen} দেখা হয়েছে
        </p>
        <Button asChild variant="outline" size="cta">
          <a href={`/admin/health/print?date=${date}`} target="_blank" rel="noopener">
            <Printer className="size-4" aria-hidden="true" />
            আজকের তালিকা প্রিন্ট
          </a>
        </Button>
      </div>

      <Panel className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--bg-soft)] text-xs text-[color:var(--muted-foreground)]">
            <tr>
              <th className="px-3 py-2 text-start font-medium">সিরিয়াল</th>
              <th className="px-3 py-2 text-start font-medium">নাম</th>
              <th className="px-3 py-2 text-start font-medium">মোবাইল</th>
              <th className="px-3 py-2 text-start font-medium">বয়স/লিঙ্গ</th>
              <th className="px-3 py-2 text-start font-medium">গর্ভবতী</th>
              <th className="px-3 py-2 text-start font-medium">এলাকা</th>
              <th className="px-3 py-2 text-start font-medium">সমস্যা</th>
              <th className="px-3 py-2 text-start font-medium">পছন্দের দিন</th>
              <th className="px-3 py-2 text-start font-medium">অবস্থা</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-8 text-center text-[color:var(--muted-foreground)]"
                >
                  এই দিনে কোনো সিরিয়াল নেই।
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
                <td className="px-3 py-2 font-medium">
                  {row.anonymized ? (
                    <span className="text-[color:var(--muted-foreground)]">
                      (মুছে ফেলা)
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
                    ? `হ্যাঁ${row.pregnancyMonths ? ` (${row.pregnancyMonths} মাস)` : ""}`
                    : row.pregnant === "NO"
                      ? "না"
                      : "—"}
                </td>
                <td className="px-3 py-2">{row.area ?? "—"}</td>
                <td
                  className="max-w-[14rem] truncate px-3 py-2"
                  title={row.complaint ?? ""}
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
                      aria-label={`সিরিয়াল ${row.serialNo} অবস্থা`}
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
