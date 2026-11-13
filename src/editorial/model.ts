/**
 * Editorial routing rules (P10, D-080): which entries become pages, at which URLs, owned
 * by which folder, and in which order they are listed. Pure functions over plain records,
 * so the build and the tests share one implementation and no part of it needs Astro.
 *
 * An entry is a record: its collection, its internal ID (the file name, unrelated to its
 * URL) and its validated metadata. Public URLs are `<owner folder path><slug>/`.
 *
 * Publication state decides routes, not just lists:
 * - draft: no route, no listing (previewed only by `astro dev`, with `drafts: true`);
 * - published: a route, listed;
 * - archived: keeps its route and its listing, marked as historical.
 */
import { collectionById, collectionPrefix, COLLECTION_IDS } from "./collections.ts"
import type { CollectionId } from "./collections.ts"
import type { CommonData, EntryStatus } from "./schema.ts"
import type { ContentRoute } from "../navigation/index.ts"

export interface EditorialRecord {
  readonly collection: CollectionId
  /** The entry's internal identifier: its file path below the collection, no extension. */
  readonly id: string
  readonly data: CommonData
}

export interface RouteOptions {
  /**
   * Also route drafts. Only the local dev server sets it, so that an author can preview a
   * draft before publishing it. A production build never does.
   */
  readonly drafts?: boolean
}

/** True for a state with a public page: published and archived, never draft. */
export function isPublic(status: EntryStatus): boolean {
  return status === "published" || status === "archived"
}

/** The records that get a page: public ones, and drafts only when previewing. */
export function routableRecords(
  records: readonly EditorialRecord[],
  options: RouteOptions = {},
): EditorialRecord[] {
  return records.filter(
    (record) =>
      isPublic(record.data.status) ||
      (options.drafts === true && record.data.status === "draft"),
  )
}

/** The canonical public path of an entry: its owner folder's path plus its own slug. */
export function publicPath(
  record: Pick<EditorialRecord, "collection" | "data">,
): string {
  return `${collectionPrefix(collectionById(record.collection))}${record.data.slug}/`
}

/** One content route per page, owned by the collection's folder, in path order. */
export function contentRoutes(
  records: readonly EditorialRecord[],
  options: RouteOptions = {},
): ContentRoute[] {
  return routableRecords(records, options)
    .map((record) => ({
      path: publicPath(record),
      owner: collectionById(record.collection).owner,
      title: record.data.title,
    }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

/**
 * Every problem that two entries cause each other, in a stable order. Slugs are unique
 * within a collection whatever the status, so publishing a draft can never collide with
 * a page that already exists. Fields that identify a place in a sequence are unique too.
 */
export function collectionIssues(records: readonly EditorialRecord[]): string[] {
  const issues: string[] = []
  const claim = (
    seen: Map<string, string>,
    key: string,
    record: EditorialRecord,
    what: string,
  ) => {
    const owner = seen.get(key)
    if (owner !== undefined) {
      issues.push(`${record.collection}: "${owner}" and "${record.id}" share ${what}`)
    } else {
      seen.set(key, record.id)
    }
  }
  for (const collection of COLLECTION_IDS) {
    const slugs = new Map<string, string>()
    const places = new Map<string, string>()
    const ordered = records
      .filter((record) => record.collection === collection)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    for (const record of ordered) {
      claim(slugs, record.data.slug, record, `the slug "${record.data.slug}"`)
      const { seriesId, workId, position, chapterNumber } = record.data
      if (collection === "trail" && seriesId !== undefined && position !== undefined)
        claim(
          places,
          `${seriesId}/${position}`,
          record,
          `position ${position} in series "${seriesId}"`,
        )
      if (collection === "kosmos") {
        if (chapterNumber !== undefined)
          claim(
            places,
            `chapter/${workId}/${chapterNumber}`,
            record,
            `chapter ${chapterNumber} of work "${workId}"`,
          )
        if (position !== undefined)
          claim(
            places,
            `position/${workId}/${position}`,
            record,
            `position ${position} in work "${workId}"`,
          )
      }
    }
  }
  return issues
}

// --- Ordering -----------------------------------------------------------------------------

type Compare = (a: EditorialRecord, b: EditorialRecord) => number
const text = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
const number = (a: unknown, b: unknown, missing: number): number =>
  (typeof a === "number" ? a : missing) - (typeof b === "number" ? b : missing)
const str = (value: unknown): string => (typeof value === "string" ? value : "")
/** Newest first; an entry without a date (a draft) sorts last. */
const newest = (a: string | undefined, b: string | undefined): number =>
  text(b ?? "", a ?? "")
const bySlug: Compare = (a, b) => text(a.data.slug, b.data.slug)

/**
 * How each collection lists its entries. Every order is total: the slug, unique within a
 * collection, breaks every tie, so the same entries always list the same way.
 *
 * - Blog, Berries, The Greenhouse: newest publication first.
 * - Timber Logs, Months' Original: newest period first, then newest publication.
 * - Book Club: newest session first, then newest publication.
 * - Bearnard's Trail: by series, then by position within it (unplaced entries last),
 *   then newest first; entries outside any series come after every series.
 * - Kosmos Series: by work, then by position, or by chapter number where there is none
 *   (the work's own entry, with neither, comes first). Provisional: the order of the
 *   works themselves is the owner's to decide (planning/content-model.md).
 */
const COMPARATORS: Record<CollectionId, Compare> = {
  blog: (a, b) => newest(a.data.publishedAt, b.data.publishedAt) || bySlug(a, b),
  berries: (a, b) => newest(a.data.publishedAt, b.data.publishedAt) || bySlug(a, b),
  greenhouse: (a, b) => newest(a.data.publishedAt, b.data.publishedAt) || bySlug(a, b),
  timberLogs: (a, b) =>
    newest(str(a.data.period), str(b.data.period)) ||
    newest(a.data.publishedAt, b.data.publishedAt) ||
    bySlug(a, b),
  monthsOriginal: (a, b) =>
    newest(str(a.data.period), str(b.data.period)) ||
    newest(a.data.publishedAt, b.data.publishedAt) ||
    bySlug(a, b),
  bookClub: (a, b) =>
    newest(
      str(a.data.sessionDate) || undefined,
      str(b.data.sessionDate) || undefined,
    ) ||
    newest(a.data.publishedAt, b.data.publishedAt) ||
    bySlug(a, b),
  trail: (a, b) =>
    // "~" sorts after every slug: entries without a series come last.
    text(str(a.data.seriesId) || "~", str(b.data.seriesId) || "~") ||
    number(a.data.position, b.data.position, Number.MAX_SAFE_INTEGER) ||
    newest(a.data.publishedAt, b.data.publishedAt) ||
    bySlug(a, b),
  kosmos: (a, b) =>
    text(str(a.data.workId), str(b.data.workId)) ||
    number(
      a.data.position ?? a.data.chapterNumber,
      b.data.position ?? b.data.chapterNumber,
      0,
    ) ||
    bySlug(a, b),
}

export function sortRecords(
  collection: CollectionId,
  records: readonly EditorialRecord[],
): EditorialRecord[] {
  return records
    .filter((record) => record.collection === collection)
    .sort(COMPARATORS[collection])
}

// --- Indexes ------------------------------------------------------------------------------

/** What a collection's index needs to list one entry; the entry itself is not loaded. */
export interface IndexItem {
  readonly id: string
  readonly path: string
  readonly title: string
  readonly description: string | undefined
  readonly status: EntryStatus
  /** The publication date (YYYY-MM-DD), or the period (YYYY-MM) for monthly collections. */
  readonly when: string | undefined
}

/**
 * The entries a collection's index lists, in order: public ones only. Drafts never appear
 * in an index, not even in the dev server, where they merely have a preview page.
 * An empty collection gives an empty list, not an error.
 */
export function indexItems(
  collection: CollectionId,
  records: readonly EditorialRecord[],
): IndexItem[] {
  return sortRecords(
    collection,
    records.filter((record) => isPublic(record.data.status)),
  ).map((record) => ({
    id: record.id,
    path: publicPath(record),
    title: record.data.title,
    description: record.data.description,
    status: record.data.status,
    when: str(record.data.period) || record.data.publishedAt,
  }))
}

// --- Display ------------------------------------------------------------------------------

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

/**
 * A date or a period as text, computed from its digits alone: "13 November 2026" or
 * "November 2026". It uses no locale and no time zone, so it reads the same everywhere.
 */
export function formatWhen(value: string): string {
  const [year, month, day] = value.split("-")
  const name = MONTHS[Number(month) - 1]
  return day === undefined ? `${name} ${year}` : `${Number(day)} ${name} ${year}`
}
