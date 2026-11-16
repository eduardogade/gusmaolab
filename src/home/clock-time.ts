/**
 * What a world clock shows for one instant (P16, D-118): pure functions, no DOM, no timers and
 * no `Date.now()`. Each takes the instant it is asked about, so a test can give it an explicit
 * UTC instant and the page can give it the current one.
 *
 * The local time and calendar date of a zone come from `Intl.DateTimeFormat` with the zone's
 * IANA identifier (`formatToParts`), so the runtime's own time-zone database decides the offset,
 * daylight saving and the date for that instant. Nothing here holds a UTC offset, adds or
 * subtracts hours, or reads the visitor's zone. One instant formatted for every zone is the same
 * moment in all of them.
 *
 * The locale is fixed (`en-GB`, Gregorian calendar, Latin digits) so the reading does not change
 * with the visitor's language or regional settings: the clocks are a 24-hour instrument. The
 * reading is built from the parts, not from a formatted string, so no engine's punctuation or
 * "24:00" quirk can reach the page (`hourCycle: "h23"` gives 00 to 23).
 *
 * Erasable TypeScript only, so Node runs it for the tests and the browser bundles it (D-040).
 */

/** What one clock shows at one instant. */
export interface ClockReading {
  /** 24-hour time, two digits each: "08:42". */
  readonly time: string
  /** The zone's local weekday, in full: "Monday". */
  readonly weekday: string
  /** The zone's local date for a reader: "Monday, 16 November". */
  readonly date: string
  /** The local calendar date, machine-readable: "2026-11-16". */
  readonly isoDate: string
  /** The local civil date and time, machine-readable and offset-free: "2026-11-16T08:42". */
  readonly isoDateTime: string
}

const formatters = new Map<string, Intl.DateTimeFormat>()

/** One formatter per zone, made once: building one is the expensive part, using one is cheap. */
function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone)
  if (formatter === undefined) {
    // Throws a RangeError for an identifier the runtime does not know; nothing is cached then.
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      calendar: "gregory",
      numberingSystem: "latn",
      hourCycle: "h23",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    })
    formatters.set(timeZone, formatter)
  }
  return formatter
}

const two = (value: string): string => value.padStart(2, "0")

/**
 * The reading of one zone at one instant. Throws a `RangeError` for a time zone the runtime does
 * not know, or for an instant that is not a valid date: the caller decides what an unavailable
 * clock looks like (`tryReadClock`).
 */
export function readClock(instant: number | Date, timeZone: string): ClockReading {
  const at = typeof instant === "number" ? instant : instant.getTime()
  if (!Number.isFinite(at)) throw new RangeError("the instant is not a valid time")
  const part: Record<string, string> = {}
  for (const { type, value } of formatterFor(timeZone).formatToParts(at)) part[type] = value
  const { weekday, day, month, year, hour, minute } = part
  if (!weekday || !day || !month || !year || !hour || !minute)
    throw new RangeError(`${timeZone} could not be formatted`)
  const isoDate = `${year.padStart(4, "0")}-${monthNumber(at, timeZone)}-${two(day)}`
  return {
    time: `${two(hour)}:${two(minute)}`,
    weekday,
    date: `${weekday}, ${Number(day)} ${month}`,
    isoDate,
    isoDateTime: `${isoDate}T${two(hour)}:${two(minute)}`,
  }
}

const monthFormatters = new Map<string, Intl.DateTimeFormat>()

/** The local month as "01" to "12", from its own numeric formatter (the names above are text). */
function monthNumber(at: number, timeZone: string): string {
  let formatter = monthFormatters.get(timeZone)
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      calendar: "gregory",
      numberingSystem: "latn",
      month: "2-digit",
    })
    monthFormatters.set(timeZone, formatter)
  }
  return two(formatter.format(at))
}

/** `readClock`, or `null` when the zone cannot be formatted: an unavailable clock, never a guess. */
export function tryReadClock(instant: number | Date, timeZone: string): ClockReading | null {
  try {
    return readClock(instant, timeZone)
  } catch {
    return null
  }
}

/** The milliseconds from `instant` to the start of the next UTC minute, always 1 to 60 000. */
export function msToNextMinute(instant: number): number {
  return 60_000 - (((instant % 60_000) + 60_000) % 60_000)
}
