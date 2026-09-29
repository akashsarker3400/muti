"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Award, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { issueCertificatesForBatch } from "@/app/actions/admin-certificates";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { langOf } from "@/lib/lang";

type Student = {
  id: string;
  roll: string;
  name: string;
  status: string;
  grade: string;
  existing: Array<{ type: string; certificateNo: string }>;
};

type CertificateType = "COURSE" | "SEMESTER" | "BOARD";

const TYPES: Array<{ value: CertificateType; label: string }> = [
  { value: "COURSE", label: "Course certificate (MUTI)" },
  { value: "SEMESTER", label: "Semester certificate" },
  { value: "BOARD", label: "Board certificate (recorded, issued by BTEB)" },
];

const SELECT =
  "h-11 w-full rounded-md border border-[color:var(--input)] bg-white px-3 text-sm focus-visible:border-[color:var(--brand)] focus-visible:outline-none";

/**
 * Tick the students, press the button, one certificate each.
 *
 * Students who already hold a certificate of the chosen type cannot be ticked
 * and say which number they hold, because the commonest reason to open this
 * page twice is one late student, and the second run must not hand the rest of
 * the batch a second certificate.
 *
 * Completed students are pre-ticked; anyone still active is not, since that is
 * the case where the office has to decide.
 */
export function CertificateIssueForm({
  batchId,
  batchName,
  courseName,
  students,
}: {
  batchId: string;
  batchName: string;
  courseName: string;
  students: Student[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<CertificateType>("COURSE");
  const [session, setSession] = useState("");
  const [issuedAt, setIssuedAt] = useState(today());
  const [copyGrade, setCopyGrade] = useState(true);
  const [ticked, setTicked] = useState<Set<string>>(
    () =>
      new Set(
        students
          .filter((student) => student.status === "COMPLETED")
          .map((student) => student.id),
      ),
  );

  // Which students are out of reach for the type currently chosen.
  const held = useMemo(() => {
    const map = new Map<string, string>();
    for (const student of students) {
      const match = student.existing.find((entry) => entry.type === type);
      if (match) map.set(student.id, match.certificateNo);
    }
    return map;
  }, [students, type]);

  const selectable = students.filter((student) => !held.has(student.id));
  const selected = selectable.filter((student) => ticked.has(student.id));
  const allTicked = selectable.length > 0 && selected.length === selectable.length;

  function toggle(id: string, next: boolean) {
    setTicked((current) => {
      const copy = new Set(current);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  function toggleAll(next: boolean) {
    setTicked(next ? new Set(selectable.map((student) => student.id)) : new Set());
  }

  function submit() {
    const studentIds = selected.map((student) => student.id);
    if (studentIds.length === 0) {
      toast.error("Tick at least one student.");
      return;
    }
    if (
      !window.confirm(
        `Issue ${studentIds.length} certificate${studentIds.length === 1 ? "" : "s"} for ${batchName}? Each one takes the next number in the series.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await issueCertificatesForBatch({
        batchId,
        studentIds,
        type,
        session,
        issuedAt,
        copyGrade,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `${result.created} certificate${result.created === 1 ? "" : "s"} prepared. Approve them on the register before printing.`,
      );
      if (result.skipped.length > 0) {
        toast.warning(
          `Skipped ${result.skipped.length}: ${result.skipped
            .slice(0, 4)
            .map((entry) => `${entry.name} (${entry.reason})`)
            .join(", ")}${result.skipped.length > 4 ? "…" : ""}`,
        );
      }
      setTicked(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Panel>
        <h2 className="text-base font-semibold">{batchName}</h2>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
          {courseName}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="cert-type">Certificate type</Label>
            <select
              id="cert-type"
              value={type}
              onChange={(event) => setType(event.target.value as CertificateType)}
              className={`mt-1 ${SELECT}`}
            >
              {TYPES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="cert-session">Session</Label>
            <Input
              id="cert-session"
              value={session}
              onChange={(event) => setSession(event.target.value)}
              placeholder="Jan-June 2026"
              dir="ltr"
              className="mt-1 h-11 font-latin"
            />
          </div>
          <div>
            <Label htmlFor="cert-date">Date of issue</Label>
            <Input
              id="cert-date"
              type="date"
              value={issuedAt}
              onChange={(event) => setIssuedAt(event.target.value)}
              className="mt-1 h-11 font-latin"
            />
          </div>
          <label className="flex items-start gap-2 self-end pb-2 text-sm">
            <Checkbox
              checked={copyGrade}
              onCheckedChange={(next) => setCopyGrade(next === true)}
              className="mt-0.5"
            />
            <span>
              Print the grade from the student record
              <span className="block text-xs text-[color:var(--muted-foreground)]">
                Left blank where the record has none.
              </span>
            </span>
          </label>
        </div>
      </Panel>

      <Panel padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] bg-[color:var(--bg-soft)] px-4 py-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={allTicked}
              onCheckedChange={(next) => toggleAll(next === true)}
              disabled={selectable.length === 0}
            />
            {selected.length} of {selectable.length} ticked
          </label>
          <Button
            type="button"
            variant="brand"
            size="cta"
            disabled={pending || selected.length === 0}
            onClick={submit}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Award className="size-4" aria-hidden="true" />
            )}
            Issue {selected.length > 0 ? selected.length : ""} certificate
            {selected.length === 1 ? "" : "s"}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-start">
                <th scope="col" className="w-10 px-4 py-2.5" />
                <th scope="col" className="px-4 py-2.5 text-start font-semibold">
                  Roll
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-semibold">
                  Name
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-semibold">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-semibold">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {students.map((student) => {
                const has = held.get(student.id);
                return (
                  <tr
                    key={student.id}
                    className={has ? "bg-[color:var(--bg-soft)]" : undefined}
                  >
                    <td className="px-4 py-2.5">
                      <Checkbox
                        checked={ticked.has(student.id) && !has}
                        disabled={Boolean(has)}
                        onCheckedChange={(next) => toggle(student.id, next === true)}
                        aria-label={`Issue a certificate to ${student.name}`}
                      />
                    </td>
                    <td className="px-4 py-2.5 font-latin">{student.roll}</td>
                    <td className="px-4 py-2.5" lang={langOf(student.name)}>
                      {student.name}
                      {has && (
                        <span className="ms-2 font-latin text-xs text-[color:var(--muted-foreground)]">
                          already has {has}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[color:var(--muted-foreground)]">
                      {student.status.toLowerCase()}
                    </td>
                    <td className="px-4 py-2.5 font-latin">{student.grade || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
