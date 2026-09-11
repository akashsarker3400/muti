import "server-only";

import { BANGLA } from "@/lib/lang";
import { prisma } from "@/lib/prisma";

/**
 * Records whose English fields still hold the Bangla placeholder that the
 * English-primary migration copied in (locale change). Detected by script:
 * any Bengali-block character in an English column means the office has not
 * written the English yet. Nothing is stored — the list is computed.
 */

export type NeedsEnglishRow = {
  model: string;
  id: string;
  label: string;
  fields: string[];
  href: string;
};

function flag(value: string | null | undefined): boolean {
  return Boolean(value && BANGLA.test(value));
}

export async function needsEnglish(): Promise<NeedsEnglishRow[]> {
  const rows: NeedsEnglishRow[] = [];
  const push = (
    model: string,
    id: string,
    label: string,
    href: string,
    checks: Array<[string, string | null | undefined]>,
  ) => {
    const fields = checks.filter(([, value]) => flag(value)).map(([name]) => name);
    if (fields.length > 0) rows.push({ model, id, label, fields, href });
  };

  const [courses, notices, faqs, pages, posts, items, leadership, banners] =
    await Promise.all([
      prisma.course.findMany({
        select: {
          id: true,
          code: true,
          nameEn: true,
          fullNameEn: true,
          durationLabelEn: true,
          overviewEn: true,
          eligibilityEn: true,
          certificateNoteEn: true,
          offerLabelEn: true,
        },
      }),
      prisma.notice.findMany({ select: { id: true, titleEn: true, bodyEn: true } }),
      prisma.faq.findMany({ select: { id: true, questionEn: true, answerEn: true } }),
      prisma.page.findMany({
        select: { id: true, slug: true, titleEn: true, bodyEn: true },
      }),
      prisma.post.findMany({ select: { id: true, titleEn: true, bodyEn: true } }),
      prisma.contentItem.findMany({
        select: { id: true, kind: true, titleEn: true, bodyEn: true },
      }),
      prisma.leadershipMessage.findMany({
        select: {
          id: true,
          key: true,
          roleTitleEn: true,
          messageEn: true,
          excerptEn: true,
        },
      }),
      prisma.banner.findMany({
        select: {
          id: true,
          title: true,
          subtitle: true,
          ctaLabelEn: true,
          cta2LabelEn: true,
        },
      }),
    ]);

  for (const c of courses) {
    push("Course", c.id, `${c.code} — ${c.nameEn}`, `/admin/courses/${c.id}`, [
      ["nameEn", c.nameEn],
      ["fullNameEn", c.fullNameEn],
      ["durationLabelEn", c.durationLabelEn],
      ["overviewEn", c.overviewEn],
      ["eligibilityEn", c.eligibilityEn],
      ["certificateNoteEn", c.certificateNoteEn],
      ["offerLabelEn", c.offerLabelEn],
    ]);
  }
  for (const n of notices)
    push("Notice", n.id, n.titleEn, `/admin/notices/${n.id}`, [
      ["titleEn", n.titleEn],
      ["bodyEn", n.bodyEn],
    ]);
  for (const f of faqs)
    push("FAQ", f.id, f.questionEn, `/admin/faq/${f.id}`, [
      ["questionEn", f.questionEn],
      ["answerEn", f.answerEn],
    ]);
  for (const p of pages)
    push("Page", p.id, `${p.slug} — ${p.titleEn}`, `/admin/pages/${p.id}`, [
      ["titleEn", p.titleEn],
      ["bodyEn", p.bodyEn],
    ]);
  for (const p of posts)
    push("Blog post", p.id, p.titleEn, `/admin/blog/${p.id}`, [
      ["titleEn", p.titleEn],
      ["bodyEn", p.bodyEn],
    ]);
  const kindKey: Record<string, string> = {
    WHY_CHOOSE: "why-choose",
    DOCUMENT: "documents",
    PAYMENT_POLICY: "payment-policy",
    ADMISSION_STEP: "admission-steps",
    VALUE: "values",
    CERTIFICATE: "certificate-types",
    HEALTH_SERVICE: "health-services",
  };
  for (const i of items)
    push(
      `Content (${i.kind})`,
      i.id,
      i.titleEn || i.bodyEn,
      `/admin/${kindKey[i.kind] ?? "why-choose"}/${i.id}`,
      [
        ["titleEn", i.titleEn],
        ["bodyEn", i.bodyEn],
      ],
    );
  for (const l of leadership)
    push("Leadership", l.id, l.key, `/admin/leadership/${l.id}`, [
      ["roleTitleEn", l.roleTitleEn],
      ["messageEn", l.messageEn],
      ["excerptEn", l.excerptEn],
    ]);
  for (const b of banners)
    push("Banner", b.id, b.title ?? b.id, `/admin/banners/${b.id}`, [
      ["title", b.title],
      ["subtitle", b.subtitle],
      ["ctaLabelEn", b.ctaLabelEn],
      ["cta2LabelEn", b.cta2LabelEn],
    ]);

  return rows;
}
