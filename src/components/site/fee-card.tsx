import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { paymentPolicy, localize } from "@/lib/content";
import { feeBreakdown, offerLabel, type FeeFields } from "@/lib/course";
import { formatMoney } from "@/lib/format";

/**
 * Fee table for the course detail page (section 5.4 item 3).
 * When `courseFee` is 0 the fee is unknown, so the table is replaced with the
 * "contact for fee" line rather than showing zeroes.
 */
export async function FeeCard({
  course,
  locale,
}: {
  course: FeeFields;
  locale: Locale;
}) {
  const [t, common] = await Promise.all([
    getTranslations("course"),
    getTranslations("common"),
  ]);

  const fees = feeBreakdown(course);

  return (
    <div className="rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h2 className="h3">{t("feeTitle")}</h2>

      {!fees.hasFee ? (
        <p className="mt-4 text-[color:var(--muted-foreground)]">
          {common("contactForFee")}
        </p>
      ) : (
        <>
          <dl className="mt-4 divide-y divide-[color:var(--border)]">
            {fees.rows.map((row) => (
              <div key={row.key} className="flex justify-between gap-4 py-2.5">
                <dt className="text-[color:var(--muted-foreground)]">{t(row.key)}</dt>
                <dd className="nums font-medium">{formatMoney(row.amount, locale)}</dd>
              </div>
            ))}

            <div className="flex items-baseline justify-between gap-4 border-t-2 border-[color:var(--brand)]/15 pt-3">
              <dt className="font-semibold">{t("feeTotal")}</dt>
              <dd className="nums text-xl font-bold text-[color:var(--brand)]">
                {fees.hasOffer && course.offerPrice ? (
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-medium text-[color:var(--muted-foreground)] line-through">
                      {formatMoney(fees.total, locale)}
                    </span>
                    <span>{formatMoney(course.offerPrice, locale)}</span>
                    <span className="text-[11px] font-semibold text-[color:var(--accent-red)]">
                      {offerLabel(course, locale)}
                    </span>
                  </span>
                ) : (
                  formatMoney(fees.total, locale)
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-5 rounded-xl bg-[color:var(--bg-soft)] p-4">
            <h3 className="text-sm font-semibold">{t("paymentPolicyTitle")}</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-[color:var(--muted-foreground)]">
              {paymentPolicy.map((item) => (
                <li key={item.en} className="flex gap-2">
                  <span aria-hidden="true" className="text-[color:var(--brand)]">
                    •
                  </span>
                  <span>{localize(item, locale)}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
