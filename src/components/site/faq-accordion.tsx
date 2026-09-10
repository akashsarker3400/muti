import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RichText } from "@/components/site/rich-text";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";

export type FaqEntry = {
  id: string;
  questionBn: string;
  questionEn: string | null;
  answerBn: string;
  answerEn: string | null;
};

export function FaqAccordion({ faqs, locale }: { faqs: FaqEntry[]; locale: Locale }) {
  if (faqs.length === 0) return null;

  return (
    <Accordion
      type="single"
      collapsible
      className="divide-y divide-[color:var(--border)] overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-white shadow-[var(--shadow-card)]"
    >
      {faqs.map((faq) => (
        <AccordionItem key={faq.id} value={faq.id} className="border-0 px-4 sm:px-5">
          <AccordionTrigger className="py-4 text-start text-[0.95rem] font-medium hover:no-underline">
            {pick(locale, faq.questionBn, faq.questionEn)}
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <RichText
              html={pick(locale, faq.answerBn, faq.answerEn)}
              className="text-sm text-[color:var(--muted-foreground)]"
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
