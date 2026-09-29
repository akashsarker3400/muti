"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Table2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteExam, saveExam } from "@/app/actions/admin-exams";
import { AdminBadge, EmptyState, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";

type Exam = {
  id: string;
  name: string;
  date: string | null;
  fullMarks: number;
  passMarks: number;
  published: boolean;
  marked: number;
};

/** Add an examination, then enter its marks. */
export function ExamList({ batchId, exams }: { batchId: string; exams: Exam[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [fullMarks, setFullMarks] = useState("100");
  const [passMarks, setPassMarks] = useState("40");

  function add() {
    startTransition(async () => {
      const result = await saveExam({
        batchId,
        name,
        date,
        fullMarks: Number(fullMarks),
        passMarks: Number(passMarks),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      setName("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Panel>
        {open ? (
          <div className="grid gap-4 sm:grid-cols-4 sm:items-end">
            <div className="sm:col-span-2">
              <Label htmlFor="exam-name">Examination</Label>
              <Input
                id="exam-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="First semester final"
                className="mt-1 h-11"
              />
            </div>
            <div>
              <Label htmlFor="exam-date">Date</Label>
              <Input
                id="exam-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1 h-11 font-latin"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="exam-full">Full</Label>
                <Input
                  id="exam-full"
                  value={fullMarks}
                  onChange={(event) => setFullMarks(event.target.value)}
                  inputMode="numeric"
                  className="mt-1 h-11 font-latin"
                />
              </div>
              <div>
                <Label htmlFor="exam-pass">Pass</Label>
                <Input
                  id="exam-pass"
                  value={passMarks}
                  onChange={(event) => setPassMarks(event.target.value)}
                  inputMode="numeric"
                  className="mt-1 h-11 font-latin"
                />
              </div>
            </div>
            <div className="flex gap-2 sm:col-span-4">
              <Button
                type="button"
                variant="brand"
                size="cta"
                disabled={pending || !name}
                onClick={add}
              >
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Add examination
              </Button>
              <Button type="button" variant="outline" size="cta" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="brand" size="cta" onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add an examination
          </Button>
        )}
      </Panel>

      {exams.length === 0 ? (
        <EmptyState
          title="No examination yet."
          description="Add one, then enter the marks. Publishing tells the batch by SMS."
        />
      ) : (
        <Panel padded={false} className="overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <tbody className="divide-y divide-[color:var(--border)]">
              {exams.map((exam) => (
                <tr key={exam.id}>
                  <td className="px-4 py-2.5">
                    {exam.name}
                    <span className="block text-xs text-[color:var(--muted-foreground)]">
                      {exam.date ? formatDate(exam.date, "en") : "no date"} · full{" "}
                      {exam.fullMarks}, pass {exam.passMarks}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {exam.published ? (
                      <AdminBadge tone="success">Published</AdminBadge>
                    ) : (
                      <AdminBadge tone="neutral">Draft</AdminBadge>
                    )}
                    <span className="block text-xs text-[color:var(--muted-foreground)]">
                      {exam.marked} marked
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-end">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/exams/${exam.id}`}>
                          <Table2 className="size-4" aria-hidden="true" />
                          Marks
                        </Link>
                      </Button>
                      {!exam.published && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${exam.name}`}
                          disabled={pending}
                          onClick={() => {
                            if (!window.confirm(`Delete "${exam.name}"?`)) return;
                            startTransition(async () => {
                              const result = await deleteExam(exam.id);
                              if (!result.ok) {
                                toast.error(result.error ?? "Could not delete.");
                                return;
                              }
                              router.refresh();
                            });
                          }}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}

