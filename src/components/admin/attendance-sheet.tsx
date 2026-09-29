"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { markAttendance } from "@/app/actions/admin-attendance";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { langOf } from "@/lib/lang";
import { cn } from "cn";

type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

type Row = {
  id: string;
  roll: string;
  name: string;
  photo: string | null;
  status: Status;
};

/** Four states, in the order a teacher reaches for them. */
const STATUSES: Array<{ value: Status; label: string; tone: string }> = [
  { value: "PRESENT", label: "Present", tone: "bg-[color:var(--success)] text-white" },
  { value: "ABSENT", label: "Absent", tone: "bg-[color:var(--error)] text-white" },
  { value: "LATE", label: "Late", tone: "bg-[color:var(--warning)] text-black" },
  { value: "EXCUSED", label: "Excused", tone: "bg-[color:var(--brand)] text-white" },
];

/**
 * The register, built for a phone held in one hand at the front of a room.
 *
 * Everybody starts present and the teacher taps the few who are not, because
 * that is the common case and the fast one. Tap targets are full-height rows,
 * not radio dots.
 */
export function AttendanceSheet({
  sessionId,
  students,
  canMark,
  alreadyTaken,
}: {
  sessionId: string;
  students: Row[];
  canMark: boolean;
  alreadyTaken: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Row[]>(students);

  const counts = useMemo(() => {
    const tally = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 } as Record<
      Status,
      number
    >;
    for (const row of rows) tally[row.status] += 1;
    return tally;
  }, [rows]);

  function set(id: string, status: Status) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, status } : row)),
    );
  }

  function setAll(status: Status) {
    setRows((current) => current.map((row) => ({ ...row, status })));
  }

  function save() {
    startTransition(async () => {
      const result = await markAttendance({
        sessionId,
        marks: rows.map((row) => ({ studentId: row.id, status: row.status })),
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save the register.");
        return;
      }
      toast.success(`Register saved for ${result.saved} students.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Panel className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-semibold">{counts.PRESENT} present</span>
          {counts.LATE > 0 && <span> · {counts.LATE} late</span>}
          {counts.EXCUSED > 0 && <span> · {counts.EXCUSED} excused</span>}
          {counts.ABSENT > 0 && (
            <span className="text-[color:var(--error)]"> · {counts.ABSENT} absent</span>
          )}
          {alreadyTaken && (
            <span className="block text-xs text-[color:var(--muted-foreground)]">
              This register has been taken before; saving again replaces it.
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="cta"
            onClick={() => setAll("PRESENT")}
          >
            All present
          </Button>
          {canMark && (
            <Button
              type="button"
              variant="brand"
              size="cta"
              disabled={pending}
              onClick={save}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              Save register
            </Button>
          )}
        </div>
      </Panel>

      <Panel padded={false} className="overflow-hidden">
        <ul className="divide-y divide-[color:var(--border)]">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 p-3">
              <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-[color:var(--bg-soft)]">
                {row.photo && (
                  <Image src={row.photo} alt="" fill sizes="40px" className="object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium" lang={langOf(row.name)}>
                  {row.name}
                </span>
                <span className="block font-latin text-xs text-[color:var(--muted-foreground)]">
                  {row.roll}
                </span>
              </span>
              <span className="flex flex-wrap gap-1">
                {STATUSES.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    aria-pressed={row.status === status.value}
                    aria-label={`${status.label}: ${row.name}`}
                    disabled={!canMark}
                    onClick={() => set(row.id, status.value)}
                    className={cn(
                      "min-h-10 rounded-lg border px-3 text-sm font-medium transition",
                      row.status === status.value
                        ? `${status.tone} border-transparent`
                        : "border-[color:var(--border)] bg-white hover:bg-[color:var(--bg-soft)]",
                      !canMark && "opacity-60",
                    )}
                  >
                    {row.status === status.value && (
                      <Check className="me-1 inline size-3.5" aria-hidden="true" />
                    )}
                    {status.label}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
