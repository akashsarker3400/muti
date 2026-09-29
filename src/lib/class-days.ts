/**
 * Turning a batch's "class days" into actual dates (addendum 2, B1).
 *
 * The office types the days the way it says them out loud — "Saturday and
 * Monday", "Sat, Mon, Wed", "শনি, সোম" — so the parser accepts the spellings
 * people actually use rather than demanding a format nobody would remember.
 */

const DAYS: Array<{ index: number; names: string[] }> = [
  { index: 0, names: ["sunday", "sun", "রবি", "রবিবার"] },
  { index: 1, names: ["monday", "mon", "সোম", "সোমবার"] },
  { index: 2, names: ["tuesday", "tue", "tues", "মঙ্গল", "মঙ্গলবার"] },
  { index: 3, names: ["wednesday", "wed", "বুধ", "বুধবার"] },
  { index: 4, names: ["thursday", "thu", "thur", "thurs", "বৃহস্পতি", "বৃহস্পতিবার"] },
  { index: 5, names: ["friday", "fri", "শুক্র", "শুক্রবার"] },
  { index: 6, names: ["saturday", "sat", "শনি", "শনিবার"] },
];

/**
 * The weekdays named in a batch's `classDays`, as JavaScript day numbers.
 * Nothing recognised means "every day", because a routine still has to be
 * generated and one class a week apart is a worse guess than consecutive days
 * the office can then edit.
 */
export function parseClassDays(classDays: string | null | undefined): number[] {
  if (!classDays?.trim()) return [];

  const text = classDays.toLowerCase();
  const found = new Set<number>();

  for (const day of DAYS) {
    // Longest names first so "sun" inside "sunday" cannot claim a second day.
    for (const name of [...day.names].sort((a, b) => b.length - a.length)) {
      if (text.includes(name)) {
        found.add(day.index);
        break;
      }
    }
  }

  return [...found].sort((a, b) => a - b);
}

/**
 * `count` dates, starting on or after `from`, that fall on the given weekdays.
 * With no weekdays it returns consecutive days.
 */
export function classDates(from: Date, count: number, weekdays: number[]): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  // A year of looking is far more than any course needs, and stops a bad
  // weekday list turning into an endless loop.
  for (let guard = 0; dates.length < count && guard < 400; guard += 1) {
    if (weekdays.length === 0 || weekdays.includes(cursor.getDay())) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}
