import Link from "next/link";
import { notFound } from "next/navigation";

import { ChapterEditor } from "@/components/admin/chapter-editor";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Chapter" };

/**
 * Writing one chapter for the portal reader (addendum 5, B1).
 *
 * The text is the office's to type or paste from the book. Nothing writes it
 * automatically: the book is the institute's own work, and its accuracy is a
 * medical matter rather than an editorial one.
 */
export default async function ChapterEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("book.content.edit");
  const me = await requireAdmin();
  const { id } = await params;

  const chapter = await prisma.courseBookChapter.findUnique({
    where: { id },
    include: {
      book: { select: { title: true } },
      content: true,
      _count: { select: { questions: true } },
    },
  });
  if (!chapter) notFound();

  return (
    <>
      <AdminPageHeader
        title={`${chapter.number}. ${chapter.title}`}
        description={chapter.book.title}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="cta">
              <Link href={`/admin/questions?chapter=${chapter.id}`}>
                Questions ({chapter._count.questions})
              </Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <Link href="/admin/course-book">Back to the book</Link>
            </Button>
          </div>
        }
      />

      <Panel className="mb-5 text-sm">
        Students read this in the portal only once a doctor has marked it reviewed.
        Editing it takes the review off again, because what was approved is no longer
        what they would be reading.
      </Panel>

      <ChapterEditor
        chapterId={chapter.id}
        bodyHtml={chapter.content?.bodyHtml ?? ""}
        reviewed={chapter.content?.reviewed ?? false}
        reviewedBy={chapter.content?.reviewedBy ?? null}
        canApprove={hasPermission(me, "questions.approve")}
      />
    </>
  );
}
