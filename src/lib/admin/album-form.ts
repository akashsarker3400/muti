import type { FormSection, FormValues } from "@/lib/admin/fields";

/** Album metadata fields; the images are managed by AlbumImages. */
export const albumFormSections: FormSection[] = [
  {
    id: "main",
    label: "Album",
    fields: [
      { name: "titleBn", label: "Title (Bangla)", type: "text", lang: "bn" },
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
        hint: "Leave empty to generate from the English title.",
      },
      { name: "sortOrder", label: "Order (lowest first)", type: "number" },
      {
        name: "cover",
        label: "Cover image",
        type: "image",
        hint: "Can also be set with the “Cover” button in the photo list.",
      },
      {
        name: "isHealthService",
        label: "Health service album (photos shown on /health-service)",
        type: "checkbox",
        hint: "Patient photos only with written consent, faces blurred or absent.",
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
    isHealthService: Boolean(row.isHealthService),
  };
}
