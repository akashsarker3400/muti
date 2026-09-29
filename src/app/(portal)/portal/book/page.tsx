import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Check, CircleHelp } from "lucide-react";

import { myBook } from "@/app/actions/portal";
import { currentStudent } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "বই" };

/** The course book's chapters (addendum 5, B1). */
export default async function PortalBook() {
  if (!(await currentStudent())) redirect("/portal");
  const book = await myBook();

  if (!book) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">বই</h1>
        <p className="rounded-2xl bg-white p-5 text-sm text-[color:var(--muted-foreground)]">
          আপনার কোর্সের জন্য এখনো কোনো বই যোগ করা হয়নি।
        </p>
      </div>
    );
  }

  const done = book.chapters.filter((chapter) => chapter.done).length;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-5">
        <h1 className="text-xl font-semibold">{book.title}</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
          {done} / {book.chapters.length} অধ্যায় পড়া হয়েছে
        </p>
      </section>

      <ul className="divide-y divide-[color:var(--border)] overflow-hidden rounded-2xl bg-white">
        {book.chapters.map((chapter) => (
          <li key={chapter.id}>
            {chapter.readable ? (
              <Link
                href={`/portal/book/${chapter.id}`}
                className="flex items-center gap-3 p-4"
              >
                <BookOpen
                  className="size-5 shrink-0 text-[color:var(--brand)]"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {chapter.number}. {chapter.titleBn || chapter.title}
                  </span>
                  <span className="block text-xs text-[color:var(--muted-foreground)]">
                    {chapter.covered ? "ক্লাসে পড়ানো হয়েছে" : ""}
                    {chapter.questions > 0
                      ? `${chapter.covered ? " · " : ""}${chapter.questions}টি প্রশ্ন`
                      : ""}
                  </span>
                </span>
                {chapter.done && (
                  <Check
                    className="size-5 shrink-0 text-[color:var(--success)]"
                    aria-hidden="true"
                  />
                )}
              </Link>
            ) : (
              <div className="flex items-center gap-3 p-4 opacity-60">
                <CircleHelp className="size-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {chapter.number}. {chapter.titleBn || chapter.title}
                  </span>
                  <span className="block text-xs text-[color:var(--muted-foreground)]">
                    এখনো যোগ করা হয়নি
                  </span>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
