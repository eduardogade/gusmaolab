/**
 * Time zones for scheduling (P21, D-148). Standards only: an IANA zone name and `Intl.DateTimeFormat`
 * (which carries the tz database, DST included) over one instant. Never an offset, never "UTC-3",
 * never an added hour, and never the current time as the source of an expected result: callers pass
 * the instant.
 *
 * The site does not convert booking times. The provider shows each visitor their own zone and owns
 * the booked instant; this module exists to validate the owner's configured zone and to draw the
 * development specimen's synthetic slots in a chosen zone with the same standard machinery.
 *
 * Pure and Node-runnable.
 */

/** Whether `zone` is an IANA zone this runtime knows. */
export function isValidTimeZone(zone: string): boolean {
  if (typeof zone !== "string" || zone.trim() === "" || zone !== zone.trim()) return false
  // `Intl` also accepts offsets such as "-03:00", which are not IANA names and would stop following daylight saving.
  if (!/^(UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+)$/.test(zone)) return false
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone })
    return true
  } catch {
    return false
  }
}

export interface ZonedInstant {
  /** The IANA zone the parts are in. */
  readonly zone: string
  /** `YYYY-MM-DD` in the zone. */
  readonly date: string
  /** `HH:mm` (24-hour) in the zone. */
  readonly time: string
  /** Short zone name as `Intl` gives it ("GMT-3", "CET"), for a label next to the time. */
  readonly zoneName: string
  /** Day of the week, 0 = Sunday, in the zone. */
  readonly weekday: number
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

/** An instant (an ISO 8601 string with an offset or Z, or a Date) as it reads in `zone`. */
export function inZone(instant: string | Date, zone: string): ZonedInstant {
  if (!isValidTimeZone(zone)) throw new RangeError(`"${zone}" is not an IANA time zone`)
  const moment = typeof instant === "string" ? new Date(instant) : instant
  if (Number.isNaN(moment.getTime())) throw new RangeError(`"${String(instant)}" is not an instant`)
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    timeZoneName: "short",
  }).formatToParts(moment)
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? ""
  return {
    zone,
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    zoneName: get("timeZoneName"),
    weekday: WEEKDAYS.indexOf(get("weekday") as (typeof WEEKDAYS)[number]),
  }
}

/** A readable line for a slot: "Mon 2027-01-04, 09:00 GMT-3 (America/Recife)". The zone is always named in full. */
export function describeSlot(instant: string | Date, zone: string): string {
  const z = inZone(instant, zone)
  return `${WEEKDAYS[z.weekday]} ${z.date}, ${z.time} ${z.zoneName} (${z.zone})`
}

/** How many minutes `zone` is ahead of UTC at an instant, from the standard library (for tests and labels only). */
export function offsetMinutes(instant: string | Date, zone: string): number {
  const moment = typeof instant === "string" ? new Date(instant) : instant
  const z = inZone(moment, zone)
  const [y, mo, d] = z.date.split("-").map(Number) as [number, number, number]
  const [h, mi] = z.time.split(":").map(Number) as [number, number]
  // The local wall time read as if it were UTC, minus the true UTC time, whole minutes.
  return Math.round((Date.UTC(y, mo - 1, d, h, mi) - Math.floor(moment.getTime() / 60000) * 60000) / 60000)
}
