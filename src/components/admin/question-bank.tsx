"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  approveQuestion,
  deleteQuestion,
  saveQuestion,
} from "@/app/actions/admin-book-content";
import { AdminBadge, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Question = {
  id: string;
  chapterId: string;
  chapterLabel: string;
  stem: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  reviewed: boolean;
  reviewedBy: string | null;
};

const SELECT =
  "h-11 w-full rounded-md border border-[color:var(--input)] bg-white px-3 text-sm focus-visible:border-[color:var(--brand)] focus-visible:outline-none";

/** Writing questions, and the doctor's approval that releases them. */
export function QuestionBank({
  chapters,
  selectedChapter,
  questions,
  canApprove,
}: {
  chapters: Array<{ id: string; number: number; title: string }>;
  selectedChapter: string;
  questions: Question[];
  canApprove: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [chapterId, setChapterId] = useState(selectedChapter);
  const [stem, setStem] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState("");

  function add() {
    startTransition(async () => {
      const result = await saveQuestion({
        chapterId,
        stem,
        options,
        correctIndex,
        explanation,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save.");
        return;
      }
      toast.success("Saved. A doctor must approve it before students see it.");
      setStem("");
      setOptions(["", "", "", ""]);
      setExplanation("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Panel>
        {open ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="q-chapter">Chapter</Label>
              <select
                id="q-chapter"
                value={chapterId}
                onChange={(event) => setChapterId(event.target.value)}
                className={`mt-1 ${SELECT}`}
              >
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.number}. {chapter.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="q-stem">Question</Label>
              <Textarea
                id="q-stem"
                value={stem}
                onChange={(event) => setStem(event.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>

            <fieldset>
              <legend className="text-sm font-medium">
                Choices — tick the correct one
              </legend>
              <ul className="mt-2 space-y-2">
                {options.map((option, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct"
                      checked={correctIndex === index}
                      onChange={() => setCorrectIndex(index)}
                      aria-label={`Choice ${index + 1} is correct`}
                      className="size-4"
                    />
                    <Input
                      value={option}
                      onChange={(event) =>
                        setOptions((current) =>
                          current.map((entry, i) =>
                            i === index ? event.target.value : entry,
                          ),
                        )
                      }
                      aria-label={`Choice ${index + 1}`}
                      className="h-11"
                    />
                  </li>
                ))}
              </ul>
            </fieldset>

            <div>
              <Label htmlFor="q-explanation">Explanation</Label>
              <Textarea
                id="q-explanation"
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
                rows={2}
                className="mt-1"
                placeholder="Shown after the student answers."
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="brand"
                size="cta"
                disabled={pending || !stem}
                onClick={add}
              >
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Save question
              </Button>
              <Button
                type="button"
                variant="outline"
                size="cta"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="brand" size="cta" onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add a question
          </Button>
        )}
      </Panel>

      {questions.length === 0 ? (
        <Panel className="text-sm text-[color:var(--muted-foreground)]">
          No question yet.
        </Panel>
      ) : (
        <ul className="space-y-3">
          {questions.map((question) => (
            <li key={question.id}>
              <Panel>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[color:var(--muted-foreground)]">
                      {question.chapterLabel}
                    </p>
                    <p className="mt-1 font-medium">{question.stem}</p>
                    <ol className="mt-2 space-y-1 text-sm">
                      {question.options.map((option, index) => (
                        <li
                          key={index}
                          className={
                            index === question.correctIndex
                              ? "font-semibold text-[color:var(--success)]"
                              : "text-[color:var(--muted-foreground)]"
                          }
                        >
                          {option}
                        </li>
                      ))}
                    </ol>
                    {question.explanation && (
                      <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                        {question.explanation}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {question.reviewed ? (
                      <AdminBadge tone="success">
                        Approved{question.reviewedBy ? ` · ${question.reviewedBy}` : ""}
                      </AdminBadge>
                    ) : (
                      <AdminBadge tone="warning">Not approved</AdminBadge>
                    )}

                    <div className="flex gap-1">
                      {canApprove && !question.reviewed && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() => {
                            const reviewer = window.prompt(
                              "Which doctor approved this question?",
                            );
                            if (!reviewer?.trim()) return;
                            startTransition(async () => {
                              const result = await approveQuestion(question.id, reviewer);
                              if (!result.ok) {
                                toast.error(result.error ?? "Could not approve.");
                                return;
                              }
                              router.refresh();
                            });
                          }}
                        >
                          <BadgeCheck className="size-4" aria-hidden="true" />
                          Approve
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete question"
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm("Delete this question?")) return;
                          startTransition(async () => {
                            await deleteQuestion(question.id);
                            router.refresh();
                          });
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
