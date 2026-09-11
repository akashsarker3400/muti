import { saveCourseBook } from "@/app/actions/admin-book";
import { BookChapters } from "@/components/admin/book-chapters";
import { ResourceForm } from "@/components/admin/resource-form";
import { SamplePdfUpload } from "@/components/admin/sample-pdf-upload";
import { AdminBadge, AdminPageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin-auth";
import type { FormSection } from "@/lib/admin/fields";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Course book" };

/**
 * Course book admin (addendum 5, A7). One book for now: the seed creates
 * "Easy Ultrasound" and this page edits it. Details, cover, chapters, the
 * sample PDF, course links and the publish switch all live here.
 */
export default async function AdminCourseBookPage() {
  await requirePermission("book.manage");
  const [book, courses] = await Promise.all([
    prisma.courseBook.findFirst({
      orderBy: { createdAt: "asc" },
      include: {
        chapters: { orderBy: [{ sortOrder: "asc" }, { number: "asc" }] },
        courses: true,
        samplePdf: true,
      },
    }),
    prisma.course.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameEn: true, code: true },
    }),
  ]);

  if (!book) {
    return (
      <>
        <AdminPageHeader title="Course book" />
        <p className="text-sm text-[color:var(--muted-foreground)]">
          The book has not been seeded yet. Run{" "}
          <code className="font-latin">npm run db:seed</code>.
        </p>
      </>
    );
  }

  const sections: FormSection[] = [
    {
      id: "details",
      label: "Book",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        {
          name: "subtitle",
          label: "Subtitle",
          type: "text",
          placeholder: "Abdomen & Pregnancy",
        },
        {
          name: "edition",
          label: "Edition",
          type: "text",
          latin: true,
          placeholder: "2026",
        },
        { name: "pages", label: "Pages", type: "number" },
        {
          name: "priceNote",
          label: "Price note",
          type: "text",
          placeholder: "Included in the book fee",
          hint: "Shown as a badge. Keep it about inclusion, not a shop price.",
        },
        {
          name: "sampleChapterTitle",
          label: "Sample chapter title",
          type: "text",
          placeholder: "Chapter 01: USG Physics",
        },
        {
          name: "coverImage",
          label: "Cover image",
          type: "image",
          hint: "TODO: the owner supplies the cover. Portrait, at least 640×900. Never use a page or image from inside the book.",
        },
        {
          name: "slug",
          label: "URL slug",
          type: "text",
          latin: true,
          hint: "The page lives at /course-book/<slug>. Changing it breaks old links.",
        },
        {
          name: "description",
          label: "Description (English)",
          type: "richtext",
          lang: "en",
        },
        {
          name: "descriptionBn",
          label: "Description (Bangla)",
          type: "richtext",
          lang: "bn",
        },
        {
          name: "courseIds",
          label: "Courses that use this book",
          type: "multiselect",
          full: true,
          options: courses.map((course) => ({
            value: course.id,
            label: `${course.nameEn} (${course.code})`,
          })),
          hint: "Each linked course page shows a “Course book” section.",
        },
        {
          name: "published",
          label: "Published (needs chapters and the sample PDF)",
          type: "checkbox",
        },
      ],
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Course book"
        description="MUTI's own course book on the website: a product-style page, a free sample chapter that captures leads, and a section on every linked course page."
        action={
          book.published ? (
            <AdminBadge tone="success">
              Published at /course-book/{book.slug}
            </AdminBadge>
          ) : (
            <AdminBadge tone="warning">Unpublished</AdminBadge>
          )
        }
      />

      <div className="space-y-5">
        <ResourceForm
          sections={sections}
          defaultValues={{
            title: book.title,
            subtitle: book.subtitle ?? "",
            edition: book.edition ?? "",
            pages: book.pages ?? 0,
            priceNote: book.priceNote ?? "",
            sampleChapterTitle: book.sampleChapterTitle ?? "",
            coverImage: book.coverImage ?? "",
            slug: book.slug,
            description: book.description ?? "",
            descriptionBn: book.descriptionBn ?? "",
            courseIds: book.courses.map((link) => link.courseId),
            published: book.published,
          }}
          cancelHref="/admin"
          stayAfterSave
          onSave={async (values) => {
            "use server";
            return saveCourseBook(book.id, values);
          }}
        />

        {/* Outside the book form: these panels carry forms of their own. */}
        <SamplePdfUpload
          bookId={book.id}
          current={
            book.samplePdf
              ? {
                  size: book.samplePdf.size,
                  uploadedAt: formatDate(book.samplePdf.createdAt, "en"),
                }
              : null
          }
        />
        <BookChapters
          bookId={book.id}
          chapters={book.chapters.map((chapter) => ({
            id: chapter.id,
            number: chapter.number,
            title: chapter.title,
            titleBn: chapter.titleBn ?? "",
            summary: chapter.summary ?? "",
            topics: chapter.topics,
            isSample: chapter.isSample,
          }))}
        />
      </div>
    </>
  );
}
