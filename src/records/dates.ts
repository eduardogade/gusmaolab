/**
 * Partial dates for canonical records (P11, D-084). Academic history is often known only
 * to the year or the month, and a record must not claim more than is known, so a date is
 * text at one of three precisions:
 *
 *   "2022"         a year
 *   "2022-06"      a month
 *   "2022-06-14"   a day
 *
 * Nothing here ever turns "2022" into "2022-01-01": the precision that was written is the
 * precision that is stored, compared and displayed.
 *
 * Code in this directory also runs directly in Node.js: erasable TypeScript only,
 * `import type` for types, and `.ts` extensions (D-040).
 */

export type DatePrecision = "year" | "month" | "day"

const PATTERN = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/

/** The parts of a partial date, or null when the text is malformed or impossible. */
export function parsePartialDate(
  text: string,
): { year: number; month?: number; day?: number; precision: DatePrecision } | null {
  const match = PATTERN.exec(text)
  if (match === null) return null
  const year = Number(match[1])
  if (year < 1000) return null
  if (match[2] === undefined) return { year, precision: "year" }
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  if (match[3] === undefined) return { year, month, precision: "month" }
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return { year, month, day, precision: "day" }
}

export const isPartialDate = (text: string): boolean => parsePartialDate(text) !== null

export function precisionOf(text: string): DatePrecision {
  const parsed = parsePartialDate(text)
  if (parsed === null) throw new Error(`"${text}" is not a date`)
  return parsed.precision
}

export function yearOf(text: string): number {
  const parsed = parsePartialDate(text)
  if (parsed === null) throw new Error(`"${text}" is not a date`)
  return parsed.year
}

/**
 * A total chronological order. A less precise date sorts where its period begins, before
 * every more precise date inside it: "2022" < "2022-01" < "2022-01-01" < "2022-06". So in
 * a newest-first list a year-only entry comes after the dated entries of the same year,
 * and in an oldest-first list before them. That is a rule for ordering only; it says
 * nothing about when in 2022 the thing happened. Plain text comparison gives exactly this
 * order, because a shorter date is a prefix of the longer ones it contains.
 */
export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * True when `end` is certainly before `start`. Dates are compared only as far as both are
 * known: "2021" does not come before "2021-06", because it may be any day of that year.
 */
export function endsBeforeStart(start: string, end: string): boolean {
  const shared = Math.min(start.length, end.length)
  return end.slice(0, shared) < start.slice(0, shared)
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/** A date at its own precision: "2022", "June 2022" or "14 June 2022". No locale, no zone. */
export function formatPartialDate(text: string): string {
  const parsed = parsePartialDate(text)
  if (parsed === null) throw new Error(`"${text}" is not a date`)
  if (parsed.month === undefined) return String(parsed.year)
  const month = MONTHS[parsed.month - 1]
  return parsed.day === undefined
    ? `${month} ${parsed.year}`
    : `${parsed.day} ${month} ${parsed.year}`
}

/**
 * A period of time whose ends are known as far as they are known. `end: "present"` says
 * the thing is still going on; a missing `end` says only that the end is not recorded,
 * which is never shown as "present".
 */
export interface Period {
  readonly start?: string
  readonly end?: string
}

export const PRESENT = "present"

export const isOngoing = (period: Period | undefined): boolean =>
  period?.end === PRESENT

/**
 * "2019 – present", "June 2019 – 2021", "2019" (a start with no recorded end: nothing is
 * added, least of all "present"), "until 2021" (an end with no recorded start).
 */
export function formatPeriod(period: Period | undefined): string {
  if (period === undefined) return ""
  const start = period.start === undefined ? "" : formatPartialDate(period.start)
  const end =
    period.end === undefined
      ? ""
      : period.end === PRESENT
        ? "present"
        : formatPartialDate(period.end)
  if (start !== "" && end !== "") return start === end ? start : `${start} – ${end}`
  if (start !== "") return start
  return end === "" ? "" : `until ${end}`
}
