/**
 * The fixed instants the world-clocks specimen shows (P16, D-121). Synthetic by construction: each
 * is a moment chosen because a clock does something worth seeing at it, never a current time. The
 * expected local values for the same instants are in tests/fixtures/clocks/reference.json, computed
 * independently of the code. Erasable TypeScript only (D-040).
 */
export const CLOCKS_SPECIMEN = "/_design/world-clocks/"

export interface ClockScenario {
  readonly id: string
  readonly title: string
  readonly instant: string
  readonly note: string
}

export const CLOCK_SCENARIOS: readonly ClockScenario[] = [
  {
    id: "new-year",
    title: "New Year’s Eve",
    instant: "2026-12-31T23:30:00Z",
    note: "Four places are already in 2027 and four are still in 2026, so the weekday and the date differ across the row.",
  },
  {
    id: "anchorage-spring",
    title: "Anchorage, one minute after daylight time begins",
    instant: "2026-03-08T11:00:00Z",
    note: "At 11:00 UTC Anchorage’s clock jumps from 01:59 to 03:00. Mexico City does not change: it no longer observes daylight saving.",
  },
  {
    id: "auckland-autumn",
    title: "Auckland, when daylight time ends",
    instant: "2026-04-04T14:00:00Z",
    note: "At 14:00 UTC Auckland’s clocks go back an hour, to 02:00 on Sunday 5 April, while every other place keeps its offset.",
  },
  {
    id: "anchorage-autumn",
    title: "Anchorage, when daylight time ends",
    instant: "2026-11-01T10:00:00Z",
    note: "At 10:00 UTC Anchorage repeats its 01:00 hour; the other seven places carry on.",
  },
]
