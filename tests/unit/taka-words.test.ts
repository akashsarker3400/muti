import { describe, expect, it } from "vitest";

import { inWords, takaInWords } from "@/lib/taka-words";

/**
 * A receipt that says only "5000" can be altered with a pen. The words are
 * what make it hard, so they have to be right — including the lakh and crore
 * grouping every receipt book in the country uses.
 */
describe("amounts in words", () => {
  it("writes the small numbers", () => {
    expect(inWords(0)).toBe("zero");
    expect(inWords(7)).toBe("seven");
    expect(inWords(15)).toBe("fifteen");
    expect(inWords(42)).toBe("forty-two");
    expect(inWords(100)).toBe("one hundred");
    expect(inWords(305)).toBe("three hundred five");
  });

  it("groups in lakh and crore, not millions", () => {
    expect(inWords(1000)).toBe("one thousand");
    expect(inWords(25000)).toBe("twenty-five thousand");
    expect(inWords(100000)).toBe("one lakh");
    expect(inWords(250000)).toBe("two lakh fifty thousand");
    expect(inWords(10000000)).toBe("one crore");
    expect(inWords(12345678)).toBe(
      "one crore twenty-three lakh forty-five thousand six hundred seventy-eight",
    );
  });

  it("writes a receipt line", () => {
    expect(takaInWords(5000)).toBe("Five thousand taka only");
    expect(takaInWords(13500)).toBe("Thirteen thousand five hundred taka only");
  });
});
