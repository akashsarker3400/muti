import type { Locale } from "@/i18n/routing";
import { formatNumber } from "@/lib/format";

/**
 * Live seat counter (addendum 2, A1).
 *
 * `seatsLeft = seats - seatsFilled`. The counter only appears when the admin
 * has entered a seat count for the batch and left the counter switched on —
 * an unknown capacity must never be presented as scarcity.
 */

export type SeatFields = {
  seats: number | null;
  seatsFilled: number;
  showSeatCounter: boolean;
};

export type SeatState =
  | { show: false }
  | {
      show: true;
      seatsLeft: number;
      /** 5 or fewer seats: urge visitors to enrol. */
      urgent: boolean;
      /** No seats left: the Apply button becomes "join the waitlist". */
      full: boolean;
    };

export function seatState(batch: SeatFields | null | undefined): SeatState {
  if (!batch || !batch.showSeatCounter || batch.seats == null || batch.seats <= 0) {
    return { show: false };
  }

  const seatsLeft = batch.seats - batch.seatsFilled;

  return {
    show: true,
    seatsLeft: Math.max(0, seatsLeft),
    urgent: seatsLeft > 0 && seatsLeft <= 5,
    full: seatsLeft <= 0,
  };
}

/** "সিট বাকি ৪টি" / "4 seats left" */
export function seatsLeftLabel(seatsLeft: number, locale: Locale): string {
  const value = formatNumber(seatsLeft, locale);
  return locale === "bn" ? `সিট বাকি ${value}টি` : `${value} seats left`;
}
