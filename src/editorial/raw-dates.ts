/**
 * A guard for one thing the YAML parser does silently (P10, D-079): it reads an unquoted
 * `publishedAt: 2026-02-30` as a date, and rolls it over to 2026-03-02. By the time the
 * schema sees the value, the mistake is gone. So the raw text of the date fields is
 * checked before parsing: an unquoted YYYY-MM-DD that is not a real calendar day is an
 * error, naming the field and the value.
 *
 * Quoted dates are plain strings and are checked by the schema; timestamps with a time
 * are rejected by the schema too.
 */
import { isCalendarDate } from "./schema.ts"

/** The metadata fields that hold a calendar date. */
export const DATE_FIELDS = ["publishedAt", "updatedAt", "sessionDate"] as const

/** Problems in the date fields of a Markdown file's frontmatter, from its raw text. */
export function rawDateIssues(source: string): string[] {
  const front = /^﻿?---\r?\n([\s\S]*?)\r?\n---/.exec(source)?.[1]
  if (front === undefined) return []
  const issues: string[] = []
  for (const field of DATE_FIELDS) {
    // A top-level key only: nested keys are indented.
    const match = new RegExp(`^${field}:[ \\t]*([^\\r\\n]*)$`, "m").exec(front)
    if (match === null) continue
    const value = match[1].replace(/\s+#.*$/, "").trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) && !isCalendarDate(value)) {
      issues.push(`${field}: ${value} is not a calendar date; write YYYY-MM-DD`)
    }
  }
  return issues
}
