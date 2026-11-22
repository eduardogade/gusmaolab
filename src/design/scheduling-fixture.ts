/**
 * Synthetic data for the development scheduling specimen (P21, D-150): a pretend "now", a month, a
 * few slot instants and some zones, all fixed, so the specimen and its tests do not depend on the
 * clock. None of it is the owner's availability, a working hour, a meeting length or a policy:
 * it exists to show how a monthly calendar, a slot list and a time zone read. Only the specimen
 * and the tests import this file; a release build must not contain it (scripts/demo-check.mjs).
 *
 * Pure and Node-runnable.
 */

/** The pretend current instant. Dates on or before its day are "in the past" for the specimen. */
export const SIM_NOW = "2027-01-05T12:00:00Z"
export const SIM_YEAR = 2027
export const SIM_MONTH = 1 // January 2027: the 1st is a Friday
/** A weekday the specimen shows as already taken, to show an unavailable weekday. */
export const SIM_BOOKED: readonly string[] = ["2027-01-18"]
/** Slot start instants, as UTC times of day, on every available date. Not working hours. */
export const SIM_SLOT_TIMES_UTC: readonly string[] = ["12:00", "13:30", "17:00"]

/** Zones the specimen can show slots in: Brazil, Europe, North America, and zones ahead of Recife. */
export const SIM_ZONES: readonly { zone: string; label: string }[] = [
  { zone: "America/Recife", label: "Brazil: America/Recife" },
  { zone: "Europe/Lisbon", label: "Europe: Europe/Lisbon" },
  { zone: "America/New_York", label: "North America: America/New_York" },
  { zone: "America/Los_Angeles", label: "North America: America/Los_Angeles" },
  { zone: "Asia/Tokyo", label: "Ahead of Recife: Asia/Tokyo" },
  { zone: "Pacific/Auckland", label: "Ahead of Recife, next day: Pacific/Auckland" },
]

export type DayStatus = "available" | "past" | "weekend" | "booked"

export interface SimDay {
  /** `YYYY-MM-DD`. */
  readonly date: string
  readonly day: number
  /** 0 = Sunday. */
  readonly weekday: number
  readonly status: DayStatus
}

const pad = (n: number): string => String(n).padStart(2, "0")

/** Every day of the specimen month with its synthetic status. */
export function simMonth(): SimDay[] {
  const today = SIM_NOW.slice(0, 10)
  const days: SimDay[] = []
  const count = new Date(Date.UTC(SIM_YEAR, SIM_MONTH, 0)).getUTCDate()
  for (let day = 1; day <= count; day += 1) {
    const date = `${SIM_YEAR}-${pad(SIM_MONTH)}-${pad(day)}`
    const weekday = new Date(Date.UTC(SIM_YEAR, SIM_MONTH - 1, day)).getUTCDay()
    const status: DayStatus =
      date <= today ? "past" : weekday === 0 || weekday === 6 ? "weekend" : SIM_BOOKED.includes(date) ? "booked" : "available"
    days.push({ date, day, weekday, status })
  }
  return days
}

/** The instants of one date's synthetic slots (UTC, ISO 8601). */
export const simSlots = (date: string): string[] => SIM_SLOT_TIMES_UTC.map((time) => `${date}T${time}:00Z`)

export const STATUS_WORDS: Readonly<Record<DayStatus, string>> = {
  available: "available",
  past: "unavailable, in the past",
  weekend: "unavailable, weekend",
  booked: "unavailable, already taken",
}
