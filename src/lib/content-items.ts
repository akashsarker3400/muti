import { cache } from "react";

import type { ContentKind } from "@/generated/prisma/enums";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/**
 * The fixed lists the office edits from the admin panel: why choose MUTI,
 * required documents, payment policy, admission steps, mission/vision/values
 * and the certificates offered.
 *
 * They were hardcoded in `src/lib/content.ts` until the owner asked to be able
 * to change them; that file is now only the seed source. Deleting every row in
 * a list hides that section on the public site, which is how the rest of the
 * site behaves too.
 */

export type ContentEntry = {
  id: string;
  icon: string | null;
  title: string;
  body: string;
};

export const getContentItems = cache(async (kind: ContentKind) => {
  try {
    return await prisma.contentItem.findMany({
      where: { kind, published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  } catch (error) {
    console.error(`getContentItems(${kind}) failed`, error);
    return [];
  }
});

/** Same list, already resolved into the reader's language. */
export async function getContent(
  kind: ContentKind,
  locale: Locale,
  limit?: number,
): Promise<ContentEntry[]> {
  const items = await getContentItems(kind);

  return items.slice(0, limit).map((item) => ({
    id: item.id,
    icon: item.icon,
    title: pick(locale, item.titleBn, item.titleEn),
    body: pick(locale, item.bodyBn, item.bodyEn),
  }));
}
