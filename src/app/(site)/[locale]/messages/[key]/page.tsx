import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Portrait } from "@/components/site/leadership-cards";
import { PageHero } from "@/components/site/page-hero";
import { RichText } from "@/components/site/rich-text";
import { Section } from "@/components/site/section";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import { getLeadershipMessage } from "@/lib/queries";
import { pageAlternates } from "@/i18n/routing";

type Params = Promise<{ locale: Locale; key: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, key } = await params;
  const message = await getLeadershipMessage(key);
  if (!message) return {};
  const role = pick(locale, message.roleTitleBn, message.roleTitleEn);
  const name = pick(locale, message.personNameBn, message.personName);
  return {
    title: `${role}: ${name}`,
    description: pick(locale, message.excerptBn, message.excerptEn) || undefined,
    alternates: pageAlternates(locale, `/messages/${message.key}`),
  };
}

/** Full leadership message (addendum 3, §4) — one page per published key. */
export default async function LeadershipMessagePage({ params }: { params: Params }) {
  const { locale, key } = await params;
  setRequestLocale(locale);

  const [message, t] = await Promise.all([
    getLeadershipMessage(key),
    getTranslations("leadership"),
  ]);
  if (!message) notFound();

  const name = pick(locale, message.personNameBn, message.personName);
  const role = pick(locale, message.roleTitleBn, message.roleTitleEn);
  const body = pick(locale, message.messageBn, message.messageEn);

  return (
    <>
      <PageHero title={t("pageTitle", { role })} subtitle={name} />
      <Section>
        <article className="mx-auto grid max-w-4xl gap-8 md:grid-cols-[220px_1fr]">
          <aside className="text-center md:text-start">
            <div className="inline-block">
              <Portrait src={message.photo} name={name} size={180} />
            </div>
            <h2 className="mt-4 text-lg font-semibold">{name}</h2>
            <p className="text-sm font-medium text-[color:var(--brand)]">{role}</p>
            {message.degrees && (
              <p className="mt-1 font-latin text-sm text-[color:var(--muted-foreground)]">
                {message.degrees}
              </p>
            )}
            {message.designationLine && (
              <p className="font-latin text-sm text-[color:var(--muted-foreground)]">
                {message.designationLine}
              </p>
            )}
          </aside>

          <div>
            <RichText html={body} />
            {message.signatureImage && (
              <figure className="mt-8">
                <Image
                  src={message.signatureImage}
                  alt={t("signatureOf", { name })}
                  width={220}
                  height={80}
                  className="h-16 w-auto object-contain"
                />
                <figcaption className="mt-1 text-sm font-semibold">{name}</figcaption>
              </figure>
            )}
          </div>
        </article>
      </Section>
    </>
  );
}
