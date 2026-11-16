/**
 * The eight world-clock locations of the homepage (P15, D-112). This is configuration only: it
 * names the places and their IANA time zones, in the owner's approved order. It computes no time,
 * holds no offset and shows no clock value. P16 turns each entry into a working clock and reads
 * the zone's current local time from the browser's own time-zone database, so daylight-saving
 * changes are never written down here.
 *
 * Zones are IANA identifiers, never guessed UTC offsets. The tests check each one against the
 * runtime's own support (`isValidTimeZone`). Erasable TypeScript only, so Node runs it (D-040).
 */

export interface ClockLocation {
  /** Stable identity: P16 and the tests refer to a place by it. */
  readonly id: string
  /** The place as the clock names it. */
  readonly city: string
  /** The place's country; for the United States, the state is part of the name. */
  readonly place: string
  /** IANA time-zone identifier. */
  readonly timeZone: string
}

/** The approved set, in display order. Order is part of the contract (HOME-014). */
export const CLOCK_LOCATIONS: readonly ClockLocation[] = [
  { id: "anchorage", city: "Anchorage", place: "Alaska, United States", timeZone: "America/Anchorage" },
  { id: "mexico-city", city: "Mexico City", place: "Mexico", timeZone: "America/Mexico_City" },
  { id: "brasilia", city: "Brasília", place: "Brazil", timeZone: "America/Sao_Paulo" },
  { id: "accra", city: "Accra", place: "Ghana", timeZone: "Africa/Accra" },
  { id: "moscow", city: "Moscow", place: "Russia", timeZone: "Europe/Moscow" },
  { id: "dhaka", city: "Dhaka", place: "Bangladesh", timeZone: "Asia/Dhaka" },
  { id: "koror", city: "Koror", place: "Palau", timeZone: "Pacific/Palau" },
  { id: "auckland", city: "Auckland", place: "New Zealand", timeZone: "Pacific/Auckland" },
]

/** True when the runtime's time-zone database knows this identifier. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone })
    return true
  } catch {
    return false
  }
}
