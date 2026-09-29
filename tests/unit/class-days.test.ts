import { describe, expect, it } from "vitest";

import { classDates, parseClassDays } from "@/lib/class-days";

/**
 * The office types class days the way it says them out loud, so the parser is
 * tested against the spellings people actually use rather than a format
 * nobody would remember.
 */
describe("parsing class days", () => {
  it("reads the English shapes", () => {
    expect(parseClassDays("Saturday and Monday")).toEqual([1, 6]);
    expect(parseClassDays("Sat, Mon, Wed")).toEqual([1, 3, 6]);
    expect(parseClassDays("Sunday to Thursday")).toEqual([0, 4]);
  });

  it("reads Bangla", () => {
    expect(parseClassDays("শনি, সোম")).toEqual([1, 6]);
    expect(parseClassDays("বৃহস্পতিবার")).toEqual([4]);
  });

  it("does not let a short name claim a second day", () => {
    // "sun" lives inside "sunday"; only one day should come back.
    expect(parseClassDays("Sunday")).toEqual([0]);
    expect(parseClassDays("Tuesday and Thursday")).toEqual([2, 4]);
  });

  it("returns nothing it cannot recognise", () => {
    expect(parseClassDays("")).toEqual([]);
    expect(parseClassDays(null)).toEqual([]);
    expect(parseClassDays("as announced")).toEqual([]);
  });
});

describe("spacing the classes", () => {
  // Wednesday 1 October 2025.
  const start = new Date("2025-10-01T00:00:00");

  it("puts one class on each matching weekday", () => {
    const dates = classDates(start, 4, [1, 6]); // Monday, Saturday
    expect(dates.map((d) => d.getDay())).toEqual([6, 1, 6, 1]);
    expect(dates[0]!.getDate()).toBe(4); // the Saturday after the 1st
  });

  it("falls back to consecutive days when no weekday is known", () => {
    // A routine still has to be generated; consecutive days the office can
    // then edit beat one class a week apart.
    const dates = classDates(start, 3, []);
    expect(dates.map((d) => d.getDate())).toEqual([1, 2, 3]);
  });

  it("stops rather than looping for ever on an impossible list", () => {
    expect(classDates(start, 500, [2]).length).toBeLessThan(500);
  });
});
