import { notFound, redirect } from "next/navigation";

import { ChapterReader } from "@/components/portal/chapter-reader";
import { practiceQuestions, readChapter } from "@/app/actions/portal";
import { currentStudent } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "অধ্যায়", robots: { index: false } };

/**
 * One chapter, with its practice questions underneath (addendum 5, B1/B2).
 *
 * The reader carries the student's roll as a watermark. It is best effort and
 * says so: a screenshot can always be taken, but one that leaves the portal
 * carries the name of whoever took it, which is what actually deters sharing.
 */
export default async function ChapterPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  if (!(await currentStudent())) redirect("/portal");
  const { chapterId } = await params;

  const [chapter, questions] = await Promise.all([
    readChapter(chapterId),
    practiceQuestions(chapterId),
  ]);
  if (!chapter) notFound();

  return <ChapterReader chapter={chapter} questions={questions} />;
}
