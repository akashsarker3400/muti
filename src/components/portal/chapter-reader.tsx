"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { answerQuestion, markChapterRead } from "@/app/actions/portal";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

type Chapter = {
  id: string;
  number: number;
  title: string;
  bodyHtml: string;
  watermark: string;
};

type Question = { id: string; stem: string; options: string[] };

/**
 * The reader and its practice questions (addendum 5, B1/B2).
 *
 * Copy protection is best effort and honest about it: selection off, the
 * roll number tiled faintly across the text. A determined student can
 * photograph the screen; the point is that a copy which spreads carries the
 * name of whoever let it out.
 */
export function ChapterReader({
  chapter,
  questions,
}: {
  chapter: Chapter;
  questions: Question[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<
    Record<string, { chosen: number; correct: boolean; explanation?: string | null }>
  >({});

  function answer(questionId: string, chosen: number) {
    if (answers[questionId]) return;
    startTransition(async () => {
      const result = await answerQuestion(questionId, chosen);
      if (!result.ok) {
        toast.error("উত্তরটি জমা হয়নি।");
        return;
      }
      setAnswers((current) => ({
        ...current,
        [questionId]: {
          chosen,
          correct: Boolean(result.correct),
          explanation: result.explanation,
        },
      }));
    });
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href="/portal/book">
          <ArrowLeft className="size-4" aria-hidden="true" />
          অধ্যায়ের তালিকা
        </Link>
      </Button>

      <article
        className="relative overflow-hidden rounded-2xl bg-white p-5 select-none"
        onContextMenu={(event) => event.preventDefault()}
      >
        <h1 className="text-xl font-semibold">
          {chapter.number}. {chapter.title}
        </h1>

        {/* The roll number, tiled faintly behind the text. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex flex-wrap content-start gap-10 overflow-hidden p-6 text-[10px] text-black/[0.05]"
        >
          {Array.from({ length: 60 }, (_, index) => (
            <span key={index} className="-rotate-12 whitespace-nowrap">
              {chapter.watermark}
            </span>
          ))}
        </div>

        <div
          className="prose prose-sm relative mt-4 max-w-none"
          dangerouslySetInnerHTML={{ __html: chapter.bodyHtml }}
        />

        <Button
          type="button"
          variant="brand"
          size="cta"
          className="relative mt-6 w-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markChapterRead(chapter.id);
              toast.success("পড়া হয়েছে হিসেবে চিহ্নিত।");
              router.refresh();
            })
          }
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
          পড়া হয়েছে
        </Button>
      </article>

      {questions.length > 0 && (
        <section className="rounded-2xl bg-white p-5">
          <h2 className="font-semibold">অনুশীলন</h2>
          <ol className="mt-4 space-y-6">
            {questions.map((question, index) => {
              const given = answers[question.id];
              return (
                <li key={question.id}>
                  <p className="font-medium">
                    {index + 1}. {question.stem}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {question.options.map((option, optionIndex) => {
                      const chosen = given?.chosen === optionIndex;
                      return (
                        <li key={optionIndex}>
                          <button
                            type="button"
                            disabled={Boolean(given) || pending}
                            onClick={() => answer(question.id, optionIndex)}
                            className={cn(
                              "min-h-12 w-full rounded-xl border px-4 text-start",
                              chosen && given?.correct
                                ? "border-[color:var(--success)] bg-green-50"
                                : chosen
                                  ? "border-[color:var(--error)] bg-red-50"
                                  : "border-[color:var(--border)]",
                            )}
                          >
                            {option}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {given && (
                    <p className="mt-2 text-sm">
                      <span
                        className={
                          given.correct
                            ? "font-semibold text-[color:var(--success)]"
                            : "font-semibold text-[color:var(--error)]"
                        }
                      >
                        {given.correct ? "ঠিক" : "ভুল"}
                      </span>
                      {given.explanation ? ` — ${given.explanation}` : ""}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
