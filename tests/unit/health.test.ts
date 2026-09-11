import { describe, expect, it } from "vitest";

import { dhakaDateKey, dhakaWeekday, keyToIso, openToday } from "@/lib/health-schedule";
import { defaultSiteSettings } from "@/lib/site-settings-schema";

const base = defaultSiteSettings.health;

describe("Dhaka calendar helpers", () => {
  it("keys the day in Asia/Dhaka, not UTC", () => {
    // 22:30 UTC on 11 Sep is 04:30 on 12 Sep in Dhaka (UTC+6).
    const late = new Date("2026-09-11T22:30:00Z");
    expect(dhakaDateKey(late)).toBe("20260912");
    expect(keyToIso("20260912")).toBe("2026-09-12");
  });

  it("names the weekday the institute would", () => {
    expect(dhakaWeekday(new Date("2026-09-12T06:00:00Z"))).toBe("SAT");
    expect(dhakaWeekday(new Date("2026-09-11T22:30:00Z"))).toBe("SAT");
  });
});

describe("open today", () => {
  const saturday = new Date("2026-09-12T06:00:00Z");
  const friday = new Date("2026-09-11T06:00:00Z");

  it("is unknown until a schedule is entered", () => {
    expect(openToday({ ...base, openDays: [] }, saturday)).toBe("unknown");
  });

  it("follows the scheduled weekdays", () => {
    const health = { ...base, openDays: ["SAT", "SUN"] };
    expect(openToday(health, saturday)).toBe("open");
    expect(openToday(health, friday)).toBe("closed");
  });

  it("closes on the holiday switch regardless of the schedule", () => {
    expect(openToday({ ...base, openDays: ["SAT"], holiday: true }, saturday)).toBe(
      "closed",
    );
  });
});
