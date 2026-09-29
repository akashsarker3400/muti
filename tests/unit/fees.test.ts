import { describe, expect, it } from "vitest";

import { draftInstallments, statusFor } from "@/lib/fees-math";

/**
 * The arithmetic the office's money rests on. Whole Taka everywhere, and the
 * rounding has to land somewhere a student will not be surprised by.
 */
const base = { courseFee: 25000, otherFees: 2000, discount: 0, firstDueDate: new Date("2026-01-15T00:00:00") };

describe("drafting a fee plan", () => {
  it("halves at admission and spreads the balance", () => {
    const { total, installments } = draftInstallments({ ...base, instalments: 3 });
    expect(total).toBe(27000);
    expect(installments).toHaveLength(4);
    expect(installments[0]!.amount).toBe(13500);
    expect(installments.reduce((sum, i) => sum + i.amount, 0)).toBe(total);
  });

  it("puts the odd Taka in the first instalment, never the last", () => {
    // 27001 halves to 13501 + 13500; 13500 over 4 months is 3375 each.
    const { installments } = draftInstallments({
      ...base,
      courseFee: 25001,
      instalments: 4,
    });
    const monthly = installments.slice(1).map((i) => i.amount);
    expect(monthly[0]).toBeGreaterThanOrEqual(monthly.at(-1)!);
    // A student who pays on time never meets a stray Taka at the end.
    expect(monthly.at(-1)).toBe(Math.min(...monthly));
  });

  it("always adds up to the total", () => {
    for (const fee of [1, 999, 12345, 25000, 31337]) {
      for (const count of [0, 1, 2, 5, 11]) {
        const { total, installments } = draftInstallments({
          ...base,
          courseFee: fee,
          instalments: count,
        });
        expect(installments.reduce((sum, i) => sum + i.amount, 0), `${fee}/${count}`).toBe(
          total,
        );
      }
    }
  });

  it("takes the discount off before splitting", () => {
    const { total } = draftInstallments({ ...base, discount: 5000, instalments: 2 });
    expect(total).toBe(22000);
  });

  it("never goes negative on a discount larger than the fee", () => {
    const { total, installments } = draftInstallments({
      ...base,
      discount: 999999,
      instalments: 3,
    });
    expect(total).toBe(0);
    expect(installments).toEqual([]);
  });

  it("charges the whole fee at once when there are no instalments", () => {
    const { installments } = draftInstallments({ ...base, instalments: 0 });
    expect(installments).toHaveLength(1);
    expect(installments[0]!.amount).toBe(27000);
  });

  it("dates the instalments on the first of the following months", () => {
    const { installments } = draftInstallments({ ...base, instalments: 2 });
    expect(installments[1]!.dueDate.getDate()).toBe(1);
    expect(installments[1]!.dueDate.getMonth()).toBe(1); // February
    expect(installments[2]!.dueDate.getMonth()).toBe(2); // March
  });
});

describe("installment status", () => {
  const due = new Date("2026-01-01T00:00:00");

  it("is paid once the money is in, even if late", () => {
    expect(statusFor(1000, 1000, due, new Date("2026-03-01"))).toBe("PAID");
    expect(statusFor(1000, 1200, due, new Date("2026-03-01"))).toBe("PAID");
  });

  it("allows the grace week before calling anything overdue", () => {
    expect(statusFor(1000, 0, due, new Date("2026-01-05"))).toBe("DUE");
    expect(statusFor(1000, 0, due, new Date("2026-01-07"))).toBe("DUE");
    expect(statusFor(1000, 0, due, new Date("2026-01-09"))).toBe("OVERDUE");
  });

  it("calls a part payment partial until the grace runs out", () => {
    expect(statusFor(1000, 400, due, new Date("2026-01-03"))).toBe("PARTIAL");
    expect(statusFor(1000, 400, due, new Date("2026-02-03"))).toBe("OVERDUE");
  });
});
