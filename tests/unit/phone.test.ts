import { describe, expect, it } from "vitest";

import {
  BD_PHONE_REGEX,
  displayPhone,
  isValidPhone,
  normalizePhone,
  telHref,
  waNumber,
} from "@/lib/phone";

describe("normalizePhone", () => {
  it("accepts the shapes people actually type", () => {
    const expected = "+8801778838644";
    for (const input of [
      "01778838644",
      "01778-838644",
      "+8801778838644",
      "8801778838644",
      "+880 1778 838644",
      "(01778) 838644",
      "০১৭৭৮৮৩৮৬৪৪", // Bangla digits
    ]) {
      expect(normalizePhone(input), input).toBe(expected);
    }
  });

  it("accepts every valid operator prefix 013–019", () => {
    for (const prefix of [13, 14, 15, 16, 17, 18, 19]) {
      expect(normalizePhone(`01${prefix % 10}12345678`)).toBe(
        `+8801${prefix % 10}12345678`,
      );
    }
  });

  it("rejects numbers that are not Bangladeshi mobiles", () => {
    for (const input of [
      "",
      "0177883864", // 10 digits
      "017788386445", // 12 digits
      "01278838644", // 012 is not an operator prefix
      "+9101778838644", // wrong country code
      "not a phone",
    ]) {
      expect(normalizePhone(input), input).toBeNull();
      expect(isValidPhone(input), input).toBe(false);
    }
  });

  it("uses the regex the spec defines", () => {
    expect(BD_PHONE_REGEX.test("01778838644")).toBe(true);
    expect(BD_PHONE_REGEX.test("+8801778838644")).toBe(true);
    expect(BD_PHONE_REGEX.test("01178838644")).toBe(false);
  });
});

describe("phone formatting", () => {
  it("formats for display", () => {
    expect(displayPhone("+8801778838644")).toBe("01778-838644");
    expect(displayPhone("01995357860")).toBe("01995-357860");
  });

  it("builds the digits wa.me expects", () => {
    expect(waNumber("01778838644")).toBe("8801778838644");
    expect(waNumber("+8801778838644")).toBe("8801778838644");
  });

  it("builds a tel: href with the country code", () => {
    expect(telHref("01778838644")).toBe("tel:+8801778838644");
  });
});
