import type { SiteSettings } from "@/lib/site-settings-schema";

/**
 * Calendar helpers for the free health service (addendum 4). Pure functions
 * — no database — so the unit tests and client components can use them.
 * Everything time-based uses the institute's clock (Asia/Dhaka).
 */

export const WEEKDAYS = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, { bn: string; en: string }> = {
  SAT: { bn: "শনিবার", en: "Saturday" },
  SUN: { bn: "রবিবার", en: "Sunday" },
  MON: { bn: "সোমবার", en: "Monday" },
  TUE: { bn: "মঙ্গলবার", en: "Tuesday" },
  WED: { bn: "বুধবার", en: "Wednesday" },
  THU: { bn: "বৃহস্পতিবার", en: "Thursday" },
  FRI: { bn: "শুক্রবার", en: "Friday" },
};

const DHAKA = "Asia/Dhaka";

/** "YYYYMMDD" for today in Dhaka — the key serial numbers reset on. */
export function dhakaDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DHAKA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

/** "YYYYMMDD" -> "YYYY-MM-DD". */
export function keyToIso(key: string): string {
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
}

export function dhakaWeekday(date = new Date()): Weekday {
  const short = new Intl.DateTimeFormat("en-US", { timeZone: DHAKA, weekday: "short" })
    .format(date)
    .toUpperCase()
    .slice(0, 3);
  return (WEEKDAYS as readonly string[]).includes(short) ? (short as Weekday) : "SAT";
}

export type OpenState = "open" | "closed" | "unknown";

/**
 * Open today = a scheduled weekday and no holiday switch. With no schedule
 * entered the badge is not shown at all rather than guessed.
 */
export function openToday(health: SiteSettings["health"], now = new Date()): OpenState {
  if (health.holiday) return "closed";
  if (health.openDays.length === 0) return "unknown";
  return health.openDays.includes(dhakaWeekday(now)) ? "open" : "closed";
}
