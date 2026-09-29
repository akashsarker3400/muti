import { describe, expect, it } from "vitest";

import { DEFAULT_SCALE, gradeFor, parseScale, passed } from "@/lib/grades";

/** BTEB's scale, because these students sit BTEB examinations. */
describe("grading", () => {
  it("grades on the percentage, not the raw mark", () => {
    expect(gradeFor(80, 100)?.grade).toBe("A+");
    expect(gradeFor(40, 50)?.grade).toBe("A+"); // 80% of 50
    expect(gradeFor(20, 50)?.grade).toBe("D"); // 40%
    expect(gradeFor(19, 50)?.grade).toBe("F");
  });

  it("carries the grade point", () => {
    expect(gradeFor(78, 100)).toEqual({ grade: "A", point: 3.75 });
    expect(gradeFor(0, 100)).toEqual({ grade: "F", point: 0 });
  });

  it("says nothing about a student who did not sit", () => {
    expect(gradeFor(null, 100)).toBeNull();
    expect(gradeFor(undefined, 100)).toBeNull();
    expect(passed(null, 40)).toBeNull();
  });

  it("passes on the examination's own pass mark", () => {
    expect(passed(40, 40)).toBe(true);
    expect(passed(39, 40)).toBe(false);
  });

  it("reads a scale the office typed, and ignores a bad line", () => {
    const scale = parseScale("90=A+=4.00\nnonsense\n50=B=3.00\n0=F=0");
    expect(scale.map((band) => band.grade)).toEqual(["A+", "B", "F"]);
    expect(gradeFor(95, 100, scale)?.grade).toBe("A+");
    expect(gradeFor(60, 100, scale)?.grade).toBe("B");
  });

  it("falls back to the default when the box is empty or unreadable", () => {
    expect(parseScale("")).toBe(DEFAULT_SCALE);
    expect(parseScale(null)).toBe(DEFAULT_SCALE);
    expect(parseScale("what even is this")).toBe(DEFAULT_SCALE);
  });
});
