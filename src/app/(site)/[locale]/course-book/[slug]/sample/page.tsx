import { redirect } from "next/navigation";

import type { Locale } from "@/i18n/routing";
import { localizedPath } from "@/i18n/routing";

/** Short address for the sample form: it lives on the book page (addendum 5, A4). */
export default async function BookSamplePage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  redirect(`${localizedPath(locale, `/course-book/${slug}`)}#sample`);
}
