/**
 * Metadata schemas for the editorial collections (P10, D-079): one small common contract
 * and a few collection-specific extensions. Written with Zod through `astro/zod`, the
 * library Astro's content collections validate with, so the same schemas serve the build
 * and the tests.
 *
 * Rules that apply everywhere:
 * - Unknown fields are rejected, so a misspelt key is an error, never a silent omission.
 * - `status` and `slug` are always required. The slug is the public URL's last segment,
 *   chosen by the author: renaming a title never moves a page, and publishing a draft
 *   never changes its address.
 * - Dates are calendar dates (YYYY-MM-DD) without a time or a zone, so ordering and
 *   display never depend on the reader's time zone. Periods are YYYY-MM.
 * - A published or archived entry also needs a description and a publication date.
 */
import { z } from "astro/zod"
import type { CollectionId } from "./collections.ts"
import { RECORD_ID_PATTERN } from "../records/schema.ts"

export const STATUSES = ["draft", "published", "archived"] as const
export type EntryStatus = (typeof STATUSES)[number]

/** One lowercase kebab-case segment: the only characters a public slug may contain. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const PERIOD_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/

/** True for a real calendar date written as YYYY-MM-DD (so not 2026-02-30). */
export function isCalendarDate(text: string): boolean {
  const match = DATE_PATTERN.exec(text)
  if (match === null) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/**
 * A calendar date, as YYYY-MM-DD text. YAML turns an unquoted 2026-11-13 into a Date at
 * midnight UTC, which is accepted and converted back; a Date carrying a time, or any
 * other text, is rejected.
 */
const calendarDate = z.union([z.string(), z.date()]).transform((value, context) => {
  let text: string
  if (value instanceof Date) {
    const valid = !Number.isNaN(value.getTime())
    if (!valid || value.getTime() % 86_400_000 !== 0) {
      context.addIssue({
        code: "custom",
        message: "write a date as YYYY-MM-DD, without a time",
      })
      return z.NEVER
    }
    text = value.toISOString().slice(0, 10)
  } else {
    text = value
  }
  if (!isCalendarDate(text)) {
    context.addIssue({
      code: "custom",
      message: `"${text}" is not a calendar date; write YYYY-MM-DD`,
    })
    return z.NEVER
  }
  return text
})

const slug = z
  .string()
  .max(80)
  .regex(SLUG_PATTERN, "use lowercase letters, digits and single hyphens")
const text = z.string().trim().min(1)
const positiveInteger = z.number().int().positive()
const period = z.string().regex(PERIOD_PATTERN, "write a period as YYYY-MM")

/**
 * A reference to another entry (P12, D-095): `<collection directory>/<slug>`, such as
 * `greenhouse/reading-a-vcf`. The build checks that the entry exists (model.ts).
 */
export const ENTRY_REFERENCE_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/
const entryReference = z
  .string()
  .regex(
    ENTRY_REFERENCE_PATTERN,
    "not an entry reference: write <collection directory>/<slug>, such as greenhouse/my-tutorial",
  )

/** Fields every collection has. */
const common = {
  title: text,
  description: text.optional(),
  publishedAt: calendarDate.optional(),
  updatedAt: calendarDate.optional(),
  status: z.enum(STATUSES),
  slug,
  tags: z.array(slug).default([]),
  /**
   * Canonical records this entry is about (P11, D-088): IDs such as `project-…` or
   * `publication-…`. Optional, and most entries have none. The entry stays an entry and
   * the record stays a record; the build checks that every ID exists.
   */
  relatedRecords: z
    .array(
      z.string().regex(RECORD_ID_PATTERN, "not a record ID, such as project-example"),
    )
    .default([]),
  /**
   * Entries the author relates to this one on purpose (P12, D-095): a Berry to its
   * Greenhouse tutorial, a lesson to its prerequisite. Never derived from shared tags.
   */
  related: z.array(entryReference).default([]),
}

/** What each collection adds (D-079). Berries add nothing: the shared tags are enough. */
const extensions = {
  blog: {
    kind: z
      .enum(["announcement", "update", "news", "microblog", "post"])
      .default("post"),
  },
  trail: {
    seriesId: slug.optional(),
    /** The sequence's name, shown with its lessons (P12). Without it the page shows the seriesId. */
    seriesTitle: text.optional(),
    position: positiveInteger.optional(),
    prerequisites: z.array(text).default([]),
  },
  greenhouse: {
    difficulty: z.enum(["introductory", "intermediate", "advanced"]).optional(),
    prerequisites: z.array(text).default([]),
    references: z.array(text).default([]),
  },
  berries: {},
  timberLogs: { period },
  monthsOriginal: {
    period,
    epigraph: text.optional(),
    epigraphSource: text.optional(),
  },
  kosmos: {
    workId: slug,
    chapterNumber: positiveInteger.optional(),
    /**
     * How the author labels this chapter: "IV", "§", "Interlude". Shown as written, in place of
     * "Chapter <number>" (P12). Never derived from `chapterNumber`.
     */
    chapterLabel: text.optional(),
    position: positiveInteger.optional(),
    epigraph: text.optional(),
    epigraphSource: text.optional(),
  },
  bookClub: {
    bookTitle: text,
    bookAuthor: text.optional(),
    sessionDate: calendarDate.optional(),
    /** True when the discussion gives away the book's plot: the page then says so (P12). */
    spoilers: z.boolean().default(false),
  },
} satisfies Record<CollectionId, z.ZodRawShape>

/** The shape of every parsed entry's data, whatever its collection. */
export interface CommonData {
  title: string
  description?: string
  publishedAt?: string
  updatedAt?: string
  status: EntryStatus
  slug: string
  tags: string[]
  relatedRecords: string[]
  /** Entry references (P12); absent in older plain records, treated as none. */
  related?: string[]
  [extension: string]: unknown
}

/**
 * The schema of one collection. Astro validates every entry against it while loading the
 * collection, so an invalid file fails the build with the file named.
 */
export function schemaFor(
  collection: CollectionId,
  options: { readonly synthetic?: boolean } = {},
) {
  return z
    .strictObject({
      ...common,
      ...extensions[collection],
      // Only a demonstration (src/demos/, P13-A01) states it is synthetic, and must. The real
      // collections do not have the field, so an entry in src/content/ cannot claim it.
      ...(options.synthetic === true ? { synthetic: z.literal(true) } : {}),
    })
    .superRefine((data: Record<string, unknown>, context) => {
      const issue = (path: string, message: string) =>
        context.addIssue({ code: "custom", path: [path], message })
      const status = data.status as EntryStatus
      if (status !== "draft") {
        if (data.description === undefined)
          issue("description", `a ${status} entry needs a description`)
        if (data.publishedAt === undefined)
          issue("publishedAt", `a ${status} entry needs a publication date`)
      }
      if (
        typeof data.updatedAt === "string" &&
        typeof data.publishedAt === "string" &&
        data.updatedAt < data.publishedAt
      ) {
        issue("updatedAt", "an update cannot come before the publication")
      }
      const tags = data.tags as string[]
      if (new Set(tags).size !== tags.length) issue("tags", "a tag is listed twice")
      const related = data.relatedRecords as string[]
      if (new Set(related).size !== related.length)
        issue("relatedRecords", "a record is listed twice")
      const entries = data.related as string[]
      if (new Set(entries).size !== entries.length)
        issue("related", "an entry is listed twice")
      if (
        collection === "trail" &&
        data.position !== undefined &&
        data.seriesId === undefined
      )
        issue("position", "a position belongs to a series: add seriesId")
      if (
        collection === "kosmos" &&
        data.chapterNumber !== undefined &&
        data.workId === undefined
      )
        issue("chapterNumber", "a chapter belongs to a work: add workId")
      if (
        (collection === "kosmos" || collection === "monthsOriginal") &&
        data.epigraphSource !== undefined &&
        data.epigraph === undefined
      )
        issue("epigraphSource", "a source belongs to an epigraph: add epigraph")
      if (
        collection === "trail" &&
        data.seriesTitle !== undefined &&
        data.seriesId === undefined
      )
        issue("seriesTitle", "a series title belongs to a series: add seriesId")
    })
}
