import { describe, expect, it } from "vitest";

import { seatsLeftLabel, seatState } from "@/lib/seats";

const batch = (seats: number | null, filled = 0, show = true) => ({
  seats,
  seatsFilled: filled,
  showSeatCounter: show,
});

describe("seatState", () => {
  it("stays hidden when the capacity is unknown or the switch is off", () => {
    expect(seatState(batch(null)).show).toBe(false);
    expect(seatState(batch(0)).show).toBe(false);
    expect(seatState(batch(20, 0, false)).show).toBe(false);
    expect(seatState(null).show).toBe(false);
    expect(seatState(undefined).show).toBe(false);
  });

  it("counts the seats left", () => {
    const state = seatState(batch(20, 6));
    expect(state).toMatchObject({
      show: true,
      seatsLeft: 14,
      urgent: false,
      full: false,
    });
  });

  it("turns urgent at five seats or fewer", () => {
    expect(seatState(batch(20, 15))).toMatchObject({
      seatsLeft: 5,
      urgent: true,
      full: false,
    });
    expect(seatState(batch(20, 14))).toMatchObject({ seatsLeft: 6, urgent: false });
    expect(seatState(batch(20, 19))).toMatchObject({ seatsLeft: 1, urgent: true });
  });

  it("is full at zero, and never reports a negative count", () => {
    expect(seatState(batch(12, 12))).toMatchObject({
      seatsLeft: 0,
      full: true,
      urgent: false,
    });
    // Over-admitted batches must not show "-3 seats left".
    expect(seatState(batch(12, 15))).toMatchObject({ seatsLeft: 0, full: true });
  });
});

describe("seatsLeftLabel", () => {
  it("uses Bangla digits in Bangla", () => {
    expect(seatsLeftLabel(14, "bn")).toBe("সিট বাকি ১৪টি");
    expect(seatsLeftLabel(3, "bn")).toBe("সিট বাকি ৩টি");
  });

  it("reads naturally in English", () => {
    expect(seatsLeftLabel(14, "en")).toBe("14 seats left");
  });
});
