/**
 * An amount in words, for the money receipt (addendum 2, B2).
 *
 * A receipt that says only "5000" can be turned into "15000" with a pen; one
 * that also says "five thousand taka only" cannot. That is the whole reason
 * every receipt book in the country prints both.
 *
 * Bangladeshi grouping: lakh and crore, not million.
 */

const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];

const TENS = [
  "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty",
  "ninety",
];

function underThousand(value: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;

  if (hundreds > 0) parts.push(`${ONES[hundreds]} hundred`);
  if (rest > 0) {
    if (rest < 20) parts.push(ONES[rest]!);
    else {
      const tens = TENS[Math.floor(rest / 10)]!;
      const ones = rest % 10;
      parts.push(ones > 0 ? `${tens}-${ONES[ones]}` : tens);
    }
  }
  return parts.join(" ");
}

export function inWords(value: number): string {
  const amount = Math.abs(Math.round(value));
  if (amount === 0) return "zero";

  const crore = Math.floor(amount / 10_000_000);
  const lakh = Math.floor((amount % 10_000_000) / 100_000);
  const thousand = Math.floor((amount % 100_000) / 1000);
  const rest = amount % 1000;

  const parts: string[] = [];
  if (crore > 0) parts.push(`${inWords(crore)} crore`);
  if (lakh > 0) parts.push(`${underThousand(lakh)} lakh`);
  if (thousand > 0) parts.push(`${underThousand(thousand)} thousand`);
  if (rest > 0) parts.push(underThousand(rest));

  return parts.join(" ");
}

/** "Five thousand taka only", the way a receipt book writes it. */
export function takaInWords(value: number): string {
  const words = inWords(value);
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} taka only`;
}
