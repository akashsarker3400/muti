import { describe, expect, it } from "vitest";

import {
  courseFeeLabel,
  durationLabel,
  feeBreakdown,
  totalClasses,
} from "@/lib/course";

const CMU_BTEB = {
  courseFee: 30750,
  examFee: 5350,
  formFee: 200,
  bookFee: 850,
  offerPrice: null,
  offerLabelBn: null,
  offerLabelEn: null,
};

describe("feeBreakdown", () => {
  it("adds up the seeded CMU (BTEB) fees", () => {
    const fees = feeBreakdown(CMU_BTEB);
    expect(fees.hasFee).toBe(true);
    expect(fees.rows.map((row) => row.key)).toEqual([
      "feeCourse",
      "feeExam",
      "feeForm",
      "feeBook",
    ]);
    expect(fees.total).toBe(37150);
  });

  it("omits fees that are not set", () => {
    const fees = feeBreakdown({
      ...CMU_BTEB,
      examFee: null,
      formFee: null,
      bookFee: null,
    });
    expect(fees.rows).toHaveLength(1);
    expect(fees.total).toBe(30750);
  });

  it("treats a zero course fee as 'contact for fee'", () => {
    const fees = feeBreakdown({ ...CMU_BTEB, courseFee: 0 });
    expect(fees.hasFee).toBe(false);
  });

  it("only shows an offer when both the price and a label exist", () => {
    expect(feeBreakdown({ ...CMU_BTEB, offerPrice: 28000 }).hasOffer).toBe(false);
    expect(
      feeBreakdown({ ...CMU_BTEB, offerPrice: 28000, offerLabelBn: "ঈদ অফার" })
        .hasOffer,
    ).toBe(true);
  });
});

describe("display fallbacks", () => {
  it("shows the contact line instead of a zero fee", () => {
    expect(courseFeeLabel({ courseFee: 0 }, "bn", "ফি জানতে যোগাযোগ করুন")).toBe(
      "ফি জানতে যোগাযোগ করুন",
    );
    expect(courseFeeLabel({ courseFee: 11000 }, "bn", "x")).toBe("৳ ১১,০০০");
  });

  it("prefers the admin label, then months, then the contact line", () => {
    const labels = { months: (n: string) => `${n} months`, contact: "contact" };

    expect(
      durationLabel(
        { durationMonths: 3, durationLabelBn: "৩ মাস", durationLabelEn: "3 months" },
        "bn",
        labels,
      ),
    ).toBe("৩ মাস");

    expect(
      durationLabel(
        { durationMonths: 6, durationLabelBn: "", durationLabelEn: "" },
        "en",
        labels,
      ),
    ).toBe("6 months");

    expect(
      durationLabel(
        { durationMonths: 0, durationLabelBn: "", durationLabelEn: "" },
        "en",
        labels,
      ),
    ).toBe("contact");
  });
});

describe("totalClasses", () => {
  it("adds lectures and practicals", () => {
    expect(totalClasses({ lectureClasses: 20, practicalClasses: 26 })).toBe(46);
    expect(totalClasses({ lectureClasses: 6, practicalClasses: null })).toBe(6);
  });

  it("returns null when neither is recorded", () => {
    expect(totalClasses({ lectureClasses: null, practicalClasses: null })).toBeNull();
  });
});
