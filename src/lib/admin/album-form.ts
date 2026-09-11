import type { FormSection, FormValues } from "@/lib/admin/fields";

/** Album metadata fields; the images are managed by AlbumImages. */
export const albumFormSections: FormSection[] = [
  {
    id: "main",
    label: "অ্যালবাম",
    fields: [
      { name: "titleBn", label: "শিরোনাম (বাংলা)", type: "text", lang: "bn" },
      {
        name: "title",
        label: "Title (English)",
        type: "text",
        required: true,
        latin: true,
        lang: "en",
      },
      {
        name: "slug",
        label: "URL slug",
        type: "text",
        latin: true,
        hint: "ফাঁকা রাখলে ইংরেজি শিরোনাম থেকে তৈরি হবে।",
      },
      { name: "sortOrder", label: "ক্রম (ছোট আগে)", type: "number" },
      {
        name: "cover",
        label: "কভার ছবি",
        type: "image",
        hint: "ছবি তালিকা থেকেও “কভার” বাটনে ক্লিক করে সেট করা যায়।",
      },
    ],
  },
];

export function albumToForm(row: Record<string, unknown>): FormValues {
  const text = (value: unknown) => (value == null ? "" : String(value));
  return {
    title: text(row.title),
    titleBn: text(row.titleBn),
    slug: text(row.slug),
    cover: text(row.cover),
    sortOrder: row.sortOrder == null ? 0 : Number(row.sortOrder),
  };
}
