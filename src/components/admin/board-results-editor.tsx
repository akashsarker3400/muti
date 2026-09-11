"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Link2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  autoLinkBoardResults,
  deleteBoardResultRow,
  saveBoardResultRows,
  type BoardResultRow,
} from "@/app/actions/admin-board-results";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseBoardNotice } from "@/lib/verify";

type EditableRow = BoardResultRow & { id?: string; linked?: boolean };

const SELECT =
  "h-9 w-full rounded-md border border-[color:var(--input)] bg-white px-2 text-sm focus-visible:border-[color:var(--brand)] focus-visible:outline-none";
const CELL = "h-9 font-latin text-sm";

const STATUS_OPTIONS = [
  ["PASS", "উত্তীর্ণ"],
  ["FAIL", "অনুত্তীর্ণ"],
  ["WITHHELD", "স্থগিত"],
  ["ABSENT", "অনুপস্থিত"],
] as const;

const EMPTY: EditableRow = {
  roll: "",
  registrationNo: "",
  studentName: "",
  status: "PASS",
  gpa: "",
  failedSubjects: "",
  remark: "",
};

/**
 * Inline editor for one exam's rows (addendum 3, §2). Edits stay local until
 * "Save all", which upserts by roll — so pasting a board notice, fixing a
 * typo and saving is one round trip.
 */
export function BoardResultsEditor({
  examId,
  initialRows,
}: {
  examId: string;
  initialRows: EditableRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<EditableRow[]>(initialRows);
  const [paste, setPaste] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function update(index: number, patch: Partial<EditableRow>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    setRows((current) => [...current, { ...EMPTY }]);
  }

  function removeRow(index: number) {
    const row = rows[index]!;
    if (!row.id) {
      setRows((current) => current.filter((_, i) => i !== index));
      return;
    }
    if (!window.confirm(`রোল ${row.roll} মুছে ফেলবেন?`)) return;
    startTransition(async () => {
      await deleteBoardResultRow(row.id!);
      setRows((current) => current.filter((_, i) => i !== index));
      toast.success("মুছে ফেলা হয়েছে।");
    });
  }

  /** Merges parsed notice rows over the table: same roll → replace. */
  function applyPaste() {
    const parsed = parseBoardNotice(paste);
    if (parsed.length === 0) {
      toast.error("কোনো “রোল (GPA)” বা “রোল {বিষয়}” প্যাটার্ন পাওয়া যায়নি।");
      return;
    }
    setRows((current) => {
      const byRoll = new Map(current.map((row) => [row.roll, row]));
      for (const item of parsed) {
        const existing = byRoll.get(item.roll);
        byRoll.set(item.roll, {
          ...(existing ?? EMPTY),
          roll: item.roll,
          status: item.status,
          gpa: item.gpa ?? "",
          failedSubjects: item.failedSubjects ?? "",
        });
      }
      return [...byRoll.values()];
    });
    toast.success(
      `${parsed.length}টি সারি পাওয়া গেছে — দেখে নিয়ে “সব সংরক্ষণ” চাপুন।`,
    );
    setPaste("");
    setPasteOpen(false);
  }

  function saveAll() {
    const filled = rows.filter((row) => row.roll.trim());
    startTransition(async () => {
      const result = await saveBoardResultRows(examId, filled);
      if (!result.ok) {
        toast.error(result.error ?? "সংরক্ষণ করা যায়নি।");
        return;
      }
      const problems = result.errors?.length
        ? ` ${result.errors.length}টি সারি বাদ: ${result.errors
            .slice(0, 3)
            .map((e) => `সারি ${e.row} — ${e.message}`)
            .join("; ")}`
        : "";
      toast.success(
        `সংরক্ষিত: ${result.created} নতুন, ${result.updated} আপডেট, ${result.linked} শিক্ষার্থীর সাথে লিংক।${problems}`,
        { duration: 8000 },
      );
      router.refresh();
    });
  }

  function autoLink() {
    startTransition(async () => {
      const result = await autoLinkBoardResults(examId);
      toast.success(`${result.linked}টি সারি শিক্ষার্থীর সাথে লিংক হয়েছে।`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="cta" onClick={addRow}>
          <Plus className="size-4" aria-hidden="true" />
          সারি যোগ
        </Button>
        <Button
          type="button"
          variant="outline"
          size="cta"
          onClick={() => setPasteOpen((open) => !open)}
        >
          <ClipboardPaste className="size-4" aria-hidden="true" />
          নোটিশ পেস্ট করুন
        </Button>
        <Button
          type="button"
          variant="outline"
          size="cta"
          onClick={autoLink}
          disabled={pending}
        >
          <Link2 className="size-4" aria-hidden="true" />
          রোল দিয়ে শিক্ষার্থী লিংক
        </Button>
        <span className="flex-1" />
        <Button
          type="button"
          variant="brand"
          size="cta"
          onClick={saveAll}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          সব সংরক্ষণ
        </Button>
      </div>

      {pasteOpen && (
        <Panel>
          <p className="mb-2 text-sm text-[color:var(--muted-foreground)]">
            বোর্ডের নোটিশ থেকে লেখা কপি করে এখানে পেস্ট করুন। “3825000128 (4.00)”
            উত্তীর্ণ, “3825000129 {"{01101[T], 01103[T]}"}” অনুত্তীর্ণ হিসেবে পড়া হবে।
            টেবিলে বসার পর নাম বা রেজিস্ট্রেশন যোগ করে সংরক্ষণ করুন।
          </p>
          <Textarea
            value={paste}
            onChange={(event) => setPaste(event.target.value)}
            rows={6}
            dir="ltr"
            className="font-latin text-xs"
            placeholder="3825000128 (4.00), 3825000129 {01101[T], 01103[T]} …"
          />
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="brand" size="cta" onClick={applyPaste}>
              পার্স করুন
            </Button>
            <Button
              type="button"
              variant="outline"
              size="cta"
              onClick={() => setPasteOpen(false)}
            >
              বাতিল
            </Button>
          </div>
        </Panel>
      )}

      <Panel className="overflow-x-auto p-0">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-[color:var(--bg-soft)] text-xs text-[color:var(--muted-foreground)]">
            <tr>
              <th className="px-3 py-2 text-start font-medium">রোল</th>
              <th className="px-3 py-2 text-start font-medium">রেজিস্ট্রেশন</th>
              <th className="px-3 py-2 text-start font-medium">নাম</th>
              <th className="px-3 py-2 text-start font-medium">অবস্থা</th>
              <th className="px-3 py-2 text-start font-medium">GPA</th>
              <th className="px-3 py-2 text-start font-medium">অনুত্তীর্ণ বিষয়</th>
              <th className="px-3 py-2 text-start font-medium">মন্তব্য</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-[color:var(--muted-foreground)]"
                >
                  এখনো কোনো সারি নেই — “সারি যোগ”, “নোটিশ পেস্ট” বা ইমপোর্ট ব্যবহার
                  করুন।
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr
                key={row.id ?? `new-${index}`}
                className={row.id ? "" : "bg-[color:var(--highlight)]/10"}
              >
                <td className="px-2 py-1.5">
                  <Input
                    value={row.roll}
                    onChange={(e) => update(index, { roll: e.target.value })}
                    dir="ltr"
                    className={CELL}
                    aria-label={`সারি ${index + 1} রোল`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={row.registrationNo}
                    onChange={(e) => update(index, { registrationNo: e.target.value })}
                    dir="ltr"
                    className={CELL}
                    aria-label={`সারি ${index + 1} রেজিস্ট্রেশন`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={row.studentName}
                    onChange={(e) => update(index, { studentName: e.target.value })}
                    className="h-9 text-sm"
                    placeholder={row.linked ? "(শিক্ষার্থী লিংকড)" : ""}
                    aria-label={`সারি ${index + 1} নাম`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={row.status}
                    onChange={(e) =>
                      update(index, { status: e.target.value as EditableRow["status"] })
                    }
                    className={SELECT}
                    aria-label={`সারি ${index + 1} অবস্থা`}
                  >
                    {STATUS_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={row.gpa}
                    onChange={(e) => update(index, { gpa: e.target.value })}
                    dir="ltr"
                    className={`${CELL} w-20`}
                    aria-label={`সারি ${index + 1} GPA`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={row.failedSubjects}
                    onChange={(e) => update(index, { failedSubjects: e.target.value })}
                    dir="ltr"
                    className={CELL}
                    placeholder="01101[T], 01103[T,P]"
                    aria-label={`সারি ${index + 1} অনুত্তীর্ণ বিষয়`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={row.remark}
                    onChange={(e) => update(index, { remark: e.target.value })}
                    className="h-9 text-sm"
                    aria-label={`সারি ${index + 1} মন্তব্য`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="সারি মুছুন"
                    onClick={() => removeRow(index)}
                  >
                    <Trash2
                      className="size-4 text-[color:var(--error)]"
                      aria-hidden="true"
                    />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
