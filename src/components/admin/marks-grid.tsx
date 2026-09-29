"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Megaphone, Save } from "lucide-react";
import { toast } from "sonner";

import { publishExam, saveMarks } from "@/app/actions/admin-exams";
import { AdminBadge, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gradeFor, type GradeBand } from "@/lib/grades";
import { langOf } from "@/lib/lang";

type Row = {
  studentId: string;
  roll: string;
  name: string;
  marks: number | null;
  remark: string;
};

/**
 * Marks entry (addendum 2, B3).
 *
 * The grade is shown as the mark is typed and is never typed itself: a grade
 * and a mark that disagree is the one mistake nobody spots until a student
 * brings the sheet back. A blank is a student who did not sit, which is a
 * different thing from a zero, and stays blank all the way to the database.
 */
export function MarksGrid({
  examId,
  rows,
  fullMarks,
  passMarks,
  published,
  canPublish,
  scale,
}: {
  examId: string;
  rows: Row[];
  fullMarks: number;
  passMarks: number;
  published: boolean;
  canPublish: boolean;
  scale: GradeBand[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [marks, setMarks] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      rows.map((row) => [row.studentId, row.marks === null ? "" : String(row.marks)]),
    ),
  );
  const [remarks, setRemarks] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.studentId, row.remark])),
  );

  const stats = useMemo(() => {
    const sat = rows.filter((row) => marks[row.studentId]?.trim() !== "");
    const passing = sat.filter(
      (row) => Number(marks[row.studentId]) >= passMarks,
    ).length;
    return { sat: sat.length, passing, absent: rows.length - sat.length };
  }, [rows, marks, passMarks]);

  function save() {
    startTransition(async () => {
      const result = await saveMarks({
        examId,
        marks: rows.map((row) => {
          const raw = marks[row.studentId]?.trim() ?? "";
          return {
            studentId: row.studentId,
            marks: raw === "" ? null : Number(raw),
            remark: remarks[row.studentId] ?? "",
          };
        }),
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save the marks.");
        return;
      }
      toast.success(`Marks saved for ${result.saved} students.`);
      router.refresh();
    });
  }

  function togglePublish() {
    if (
      !published &&
      !window.confirm(
        "Publish this result? Every student in the batch is told by SMS, and a published mark cannot be quietly corrected.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await publishExam(examId, !published);
      if (!result.ok) {
        toast.error(result.error ?? "Could not change the publication state.");
        return;
      }
      toast.success(
        published
          ? "Unpublished."
          : `Published. ${result.notified ?? 0} students told by SMS.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Panel className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="font-semibold">{stats.sat} sat</span>, {stats.passing}{" "}
          passed
          {stats.absent > 0 && (
            <span className="text-[color:var(--muted-foreground)]">
              {" "}
              · {stats.absent} did not sit
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
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
            Save marks
          </Button>
          {canPublish && (
            <Button
              type="button"
              variant={published ? "outline" : "brand"}
              size="cta"
              disabled={pending}
              onClick={togglePublish}
            >
              <Megaphone className="size-4" aria-hidden="true" />
              {published ? "Unpublish" : "Publish result"}
            </Button>
          )}
        </div>
      </Panel>

      <Panel padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)]">
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  Roll
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  Marks / {fullMarks}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  Grade
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  Remark
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {rows.map((row) => {
                const raw = marks[row.studentId] ?? "";
                const value = raw.trim() === "" ? null : Number(raw);
                const grade = gradeFor(value, fullMarks, scale);
                const fails = value !== null && value < passMarks;

                return (
                  <tr key={row.studentId}>
                    <td className="px-4 py-2 font-latin whitespace-nowrap">{row.roll}</td>
                    <td className="px-4 py-2" lang={langOf(row.name)}>
                      {row.name}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={raw}
                        onChange={(event) =>
                          setMarks((current) => ({
                            ...current,
                            [row.studentId]: event.target.value,
                          }))
                        }
                        inputMode="numeric"
                        dir="ltr"
                        aria-label={`Marks for ${row.name}`}
                        placeholder="—"
                        className="h-10 w-20 font-latin"
                      />
                    </td>
                    <td className="px-4 py-2">
                      {grade ? (
                        <AdminBadge tone={fails ? "danger" : "success"}>
                          {grade.grade}
                        </AdminBadge>
                      ) : (
                        <span className="text-xs text-[color:var(--muted-foreground)]">
                          did not sit
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={remarks[row.studentId] ?? ""}
                        onChange={(event) =>
                          setRemarks((current) => ({
                            ...current,
                            [row.studentId]: event.target.value,
                          }))
                        }
                        aria-label={`Remark for ${row.name}`}
                        className="h-10"
                      />
                    </td>
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
