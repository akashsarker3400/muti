import Link from "next/link";

import { QuestionBank } from "@/components/admin/question-bank";
import { AdminPageHeader, EmptyState, Panel, StatCard } from "@/components/admin/ui";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Practice questions" };

/**
 * The practice question bank (addendum 5, B2).
 *
 * Nothing here is generated. A wrong answer in an ultrasound question is a
 * clinical error rather than a typo, so every question is written by the
 * office and approved by a doctor before a student ever sees it.
 */
export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string }>;
}) {
  await requirePermission("questions.manage");
  const me = await requireAdmin();
  const { chapter: chapterId } = await searchParams;

  const [chapters, questions, approved] = await Promise.all([
    prisma.courseBookChapter.findMany({
      orderBy: { number: "asc" },
      select: { id: true, number: true, title: true },
    }),
    prisma.question.findMany({
      where: chapterId ? { chapterId } : {},
      orderBy: [{ chapterId: "asc" }, { createdAt: "asc" }],
      take: 300,
      include: { chapter: { select: { number: true, title: true } } },
    }),
    prisma.question.count({ where: { reviewed: true } }),
  ]);

  const chosen = chapterId
    ? chapters.find((chapter) => chapter.id === chapterId)
    : undefined;

  return (
    <>
      <AdminPageHeader
        title="Practice questions"
        description={
          chosen
            ? `Chapter ${chosen.number}: ${chosen.title}`
            : "Written by the office, approved by a doctor, practised in the portal."
        }
        action={
          chapterId ? (
            <Link href="/admin/questions" className="text-sm underline">
              All chapters
            </Link>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <StatCard label="Questions" value={questions.length} />
        <StatCard
          label="Approved"
          value={approved}
          hint="only these are practised"
        />
      </div>

      {chapters.length === 0 ? (
        <EmptyState
          title="The book has no chapters yet."
          description="Add the book and its chapters first, under Course book."
        />
      ) : (
        <>
          <Panel className="mb-5 text-sm">
            A question is invisible to students until a doctor approves it, and any
            edit takes the approval off again: a changed question is a new question.
          </Panel>

          <QuestionBank
            chapters={chapters}
            selectedChapter={chapterId ?? chapters[0]!.id}
            canApprove={hasPermission(me, "questions.approve")}
            questions={questions.map((question) => ({
              id: question.id,
              chapterId: question.chapterId,
              chapterLabel: `${question.chapter.number}. ${question.chapter.title}`,
              stem: question.stem,
              options: question.options,
              correctIndex: question.correctIndex,
              explanation: question.explanation,
              reviewed: question.reviewed,
              reviewedBy: question.reviewedBy,
            }))}
          />
        </>
      )}
    </>
  );
}
