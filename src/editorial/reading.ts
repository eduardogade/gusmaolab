/**
 * The reading experience of the editorial collections (P12, D-094 to D-097): which reading
 * layout each collection uses, what a collection's index groups, how an entry's neighbours
 * and related entries are found, and what an article's table of contents holds. Pure
 * functions over plain records, like model.ts, so the build and the tests share one
 * implementation and nothing here needs Astro.
 *
 * Nothing is invented. Order, grouping and neighbours come only from metadata the author
 * wrote (a period, a position, a series, a work, a book, an explicit `related` reference);
 * a tag, a year or a similar title never connects two entries.
 *
 * Code in this directory that tests import also runs directly in Node.js: erasable
 * TypeScript only, `import type` for types, and `.ts` extensions (D-040).
 */
import {
  collectionById,
  collectionPrefix,
  COLLECTION_IDS,
  COLLECTIONS,
} from "./collections.ts"
import type { CollectionId } from "./collections.ts"
import { formatWhen, isPublic, publicPath, sortRecords } from "./model.ts"
import type { EditorialRecord, IndexItem } from "./model.ts"

// --- The collection-to-layout registry ----------------------------------------------------

/** How long a line of body text is, by kind of reading (a width token each, editorial.css). */
export type Measure = "technical" | "literary" | "note"

/** How an entry's previous and next links are found. */
export type NeighbourRule =
  | "none" // no sequence: the entry stands alone
  | "chronology" // the collection's own chronological order
  | "series" // the lessons of one series, by position
  | "work" // the chapters of one work, by position or chapter number
  | "book" // the discussions of one book, by session date

export interface Presentation {
  /** The reading layout and the index: the same identifier as the collection. */
  readonly layout: CollectionId
  /** The width of a line of body text. */
  readonly measure: Measure
  /** Whether a table of contents may be offered (it still needs enough headings). */
  readonly contents: boolean
  readonly neighbours: NeighbourRule
  /** What the index says when no entry is published. */
  readonly emptyText: string
  /** What the "previous" and "next" links are called. */
  readonly previousLabel: string
  readonly nextLabel: string
}

/**
 * One row per collection, and nothing else decides a collection's reading layout: the
 * components map `layout` to a component (src/components/editorial/layouts.ts), the tests
 * check that this table and that map agree.
 */
export const PRESENTATIONS: Readonly<Record<CollectionId, Presentation>> = {
  blog: {
    layout: "blog",
    measure: "note",
    contents: false,
    neighbours: "chronology",
    emptyText:
      "No posts yet. Announcements and updates will appear here, newest first.",
    previousLabel: "Older post",
    nextLabel: "Newer post",
  },
  trail: {
    layout: "trail",
    measure: "technical",
    contents: false,
    neighbours: "series",
    emptyText:
      "No lessons yet. Each learning sequence will appear here, lesson by lesson, in the order it is meant to be read.",
    previousLabel: "Previous lesson",
    nextLabel: "Next lesson",
  },
  greenhouse: {
    layout: "greenhouse",
    measure: "technical",
    contents: true,
    neighbours: "none",
    emptyText:
      "No tutorials yet. Longer technical articles will appear here, with their code, figures and references.",
    previousLabel: "Previous article",
    nextLabel: "Next article",
  },
  berries: {
    layout: "berries",
    measure: "note",
    contents: false,
    neighbours: "none",
    emptyText:
      "No berries yet. Short technical insights, one idea each, will appear here.",
    previousLabel: "Previous berry",
    nextLabel: "Next berry",
  },
  timberLogs: {
    layout: "timberLogs",
    measure: "technical",
    contents: false,
    neighbours: "chronology",
    emptyText:
      "No logs yet. Monthly records of work will appear here, by year and month.",
    previousLabel: "Earlier log",
    nextLabel: "Later log",
  },
  monthsOriginal: {
    layout: "monthsOriginal",
    measure: "literary",
    contents: false,
    neighbours: "chronology",
    emptyText: "No essays yet. Each month's original writing will appear here.",
    previousLabel: "Earlier month",
    nextLabel: "Later month",
  },
  kosmos: {
    layout: "kosmos",
    measure: "literary",
    contents: false,
    neighbours: "work",
    emptyText:
      "No works yet. Longer literary works, and their chapters in reading order, will appear here.",
    previousLabel: "Previous chapter",
    nextLabel: "Next chapter",
  },
  bookClub: {
    layout: "bookClub",
    measure: "literary",
    contents: false,
    neighbours: "book",
    emptyText:
      "No discussions yet. Notes on the books we read, and what we made of them, will appear here.",
    previousLabel: "Earlier discussion",
    nextLabel: "Later discussion",
  },
}

// --- Table of contents ---------------------------------------------------------------------

/** A heading as Astro's Markdown rendering reports it (`render(entry).headings`). */
export interface Heading {
  readonly depth: number
  readonly slug: string
  readonly text: string
}

export interface TocItem {
  /** 2 for a section, 3 for a subsection. */
  readonly depth: 2 | 3
  readonly slug: string
  readonly text: string
}

/** A table of contents needs at least this many entries: fewer is not worth a list. */
export const TOC_MINIMUM = 3

/**
 * The table of contents of an article, from the headings Astro found in its Markdown, in
 * the order written. The document's own title (depth 1) is left out, so are headings
 * deeper than 3 and any without text or anchor. `extra` entries come last, for sections
 * the layout adds itself (the references). An article with fewer than TOC_MINIMUM entries
 * gets none: an empty or one-line contents list is noise.
 */
export function tableOfContents(
  headings: readonly Heading[],
  extra: readonly TocItem[] = [],
): TocItem[] {
  const seen = new Set<string>()
  const items: TocItem[] = []
  for (const heading of [
    ...headings,
    ...extra.map(({ depth, slug, text }) => ({ depth, slug, text })),
  ]) {
    if (heading.depth !== 2 && heading.depth !== 3) continue
    const text = heading.text.trim()
    if (text === "" || heading.slug === "" || seen.has(heading.slug)) continue
    seen.add(heading.slug)
    items.push({ depth: heading.depth, slug: heading.slug, text })
  }
  return items.length >= TOC_MINIMUM ? items : []
}

// --- Entry references ----------------------------------------------------------------------

const collectionByDirectory = (directory: string) =>
  COLLECTIONS.find((collection) => collection.directory === directory)

const text = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/** The reference other entries use for this one: `<collection directory>/<slug>`. */
export const entryReference = (
  record: Pick<EditorialRecord, "collection" | "data">,
): string => `${collectionById(record.collection).directory}/${record.data.slug}`

/**
 * Problems in `related`: a reference must name an entry that exists, and not the entry
 * itself. Every status is checked, drafts too, so a broken reference is fixed before it
 * is published. Whether a link is drawn is another matter: only a public entry is linked.
 */
export function entryReferenceIssues(records: readonly EditorialRecord[]): string[] {
  const known = new Set(records.map(entryReference))
  const issues: string[] = []
  const ordered = [...records].sort(
    (a, b) => text(a.collection, b.collection) || text(a.id, b.id),
  )
  for (const record of ordered) {
    for (const reference of record.data.related ?? []) {
      const [directory] = reference.split("/")
      if (collectionByDirectory(directory ?? "") === undefined)
        issues.push(
          `${record.collection}: "${record.id}" relates to ${reference}, but there is no collection "${directory}"`,
        )
      else if (reference === entryReference(record))
        issues.push(`${record.collection}: "${record.id}" relates to itself`)
      else if (!known.has(reference))
        issues.push(
          `${record.collection}: "${record.id}" relates to ${reference}, which does not exist`,
        )
    }
  }
  return issues
}

// --- Neighbours and related entries -----------------------------------------------------------

export interface ReadingLink {
  readonly path: string
  readonly title: string
  /** A chapter's own mark ("IV", "3"), on the links of a work's chapter list. */
  readonly mark?: string
  /** True for an archived entry, which stays listed but is marked as historical. */
  readonly archived?: boolean
}

export interface RelatedLink extends ReadingLink {
  /** The collection the related entry belongs to, by name. */
  readonly collection: string
}

/** Where an entry stands in a series of lessons or in a work. */
export interface Sequence {
  readonly kind: "series" | "work"
  readonly id: string
  /** The sequence's or work's name, when the author gave one. */
  readonly title: string | undefined
  /** The entry in an index or work page that stands for the whole sequence. */
  readonly overviewPath: string
  /** The author's number for this entry (lesson position or chapter number). */
  readonly number: number | undefined
  /** The author's label for a chapter ("IV"), shown instead of the number. */
  readonly label: string | undefined
  /** How many entries of the sequence are published. */
  readonly count: number
  /** True when the published entries are numbered 1 to `count` without a gap. */
  readonly complete: boolean
}

export interface ReadingContext {
  readonly collectionLabel: string
  readonly collectionPath: string
  readonly previous: ReadingLink | undefined
  readonly next: ReadingLink | undefined
  readonly previousLabel: string
  readonly nextLabel: string
  readonly related: readonly RelatedLink[]
  readonly sequence: Sequence | undefined
  /** On a work's own page: its chapters, in reading order. */
  readonly chapters: readonly ReadingLink[]
}

const link = (record: EditorialRecord): ReadingLink => ({
  path: publicPath(record),
  title: record.data.title,
  ...(record.data.status === "archived" ? { archived: true } : {}),
})

const str = (value: unknown): string => (typeof value === "string" ? value : "")
const num = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined

/** The published records of one collection, oldest first: the reverse of its index order. */
function ascending(collection: CollectionId, records: readonly EditorialRecord[]) {
  return sortRecords(
    collection,
    records.filter((record) => isPublic(record.data.status)),
  ).reverse()
}

/** A chapter's mark as the author wrote it: the label if there is one, else the number. */
export function chapterMark(
  data:
    | { readonly chapterLabel?: unknown; readonly chapterNumber?: unknown }
    | Readonly<Record<string, unknown>>,
): string | undefined {
  if (typeof data.chapterLabel === "string" && data.chapterLabel !== "")
    return data.chapterLabel
  return typeof data.chapterNumber === "number" ? String(data.chapterNumber) : undefined
}

/** True for the entry that stands for a whole work: it has no position and no chapter. */
export const isWorkEntry = (record: EditorialRecord): boolean =>
  record.collection === "kosmos" &&
  num(record.data.position) === undefined &&
  num(record.data.chapterNumber) === undefined

const placeOf = (record: EditorialRecord): number | undefined =>
  num(record.data.position) ?? num(record.data.chapterNumber)

/**
 * What a reader of one entry is offered besides its text: the way back to its collection,
 * the entry before and after it, the sequence it belongs to, and the entries the author
 * relates to it. All of it follows the collection's own rule (PRESENTATIONS): a blog by
 * date, a log by period, a lesson by position, a chapter by chapter, a discussion by
 * session within its book. Drafts are never linked.
 */
export function readingContext(
  record: EditorialRecord,
  records: readonly EditorialRecord[],
): ReadingContext {
  const collection = collectionById(record.collection)
  const presentation = PRESENTATIONS[record.collection]
  const collectionPath = collectionPrefix(collection)
  const published = records.filter((other) => isPublic(other.data.status))
  const same = (other: EditorialRecord) => other.collection === record.collection

  let line: EditorialRecord[] = []
  let sequence: Sequence | undefined
  let chapters: ReadingLink[] = []
  const data = record.data

  if (presentation.neighbours === "chronology") {
    line = ascending(record.collection, published)
  } else if (presentation.neighbours === "book") {
    const book = str(data.bookTitle)
    line = ascending(
      record.collection,
      published.filter((other) => str(other.data.bookTitle) === book),
    )
  } else if (presentation.neighbours === "series") {
    const seriesId = str(data.seriesId)
    if (seriesId !== "") {
      const members = sortRecords(
        record.collection,
        published.filter((other) => str(other.data.seriesId) === seriesId),
      )
      const placed = members.filter((other) => num(other.data.position) !== undefined)
      const positions = placed.map((other) => num(other.data.position) as number)
      sequence = {
        kind: "series",
        id: seriesId,
        title:
          str(members.find((m) => str(m.data.seriesTitle) !== "")?.data.seriesTitle) ||
          undefined,
        overviewPath: `${collectionPath}#series-${seriesId}`,
        number: num(data.position),
        label: undefined,
        count: placed.length,
        complete: positions.every((position, index) => position === index + 1),
      }
      if (num(data.position) !== undefined) line = placed
    }
  } else if (presentation.neighbours === "work") {
    const workId = str(data.workId)
    const members = sortRecords(
      record.collection,
      published.filter((other) => str(other.data.workId) === workId),
    )
    const work = members.find(isWorkEntry)
    const parts = members.filter((member) => !isWorkEntry(member))
    const places = parts.map((part) => placeOf(part))
    sequence = {
      kind: "work",
      id: workId,
      title: work?.data.title,
      overviewPath:
        work === undefined ? `${collectionPath}#work-${workId}` : publicPath(work),
      number: isWorkEntry(record)
        ? undefined
        : (num(data.chapterNumber) ?? num(data.position)),
      label: str(data.chapterLabel) || undefined,
      count: parts.length,
      complete: places.every((place, index) => place === index + 1),
    }
    if (isWorkEntry(record)) {
      chapters = parts.map((part) => ({
        ...link(part),
        ...(chapterMark(part.data) === undefined
          ? {}
          : { mark: chapterMark(part.data) }),
      }))
      line = [record, ...parts]
    } else {
      line = parts
    }
  }

  const index = line.findIndex((other) => other.id === record.id && same(other))
  const before = index > 0 ? line[index - 1] : undefined
  const after = index >= 0 ? line[index + 1] : undefined

  const related: RelatedLink[] = []
  for (const reference of data.related ?? []) {
    const target = published.find((other) => entryReference(other) === reference)
    if (target !== undefined)
      related.push({
        ...link(target),
        collection: collectionById(target.collection).label,
      })
  }

  return {
    collectionLabel: collection.label,
    collectionPath,
    previous: before === undefined ? undefined : link(before),
    next: after === undefined ? undefined : link(after),
    previousLabel: presentation.previousLabel,
    nextLabel: presentation.nextLabel,
    related,
    sequence,
    chapters,
  }
}

// --- Display helpers ------------------------------------------------------------------------

export interface MetaItem {
  readonly label?: string
  readonly value: string
  /** The machine-readable date or period, when the value is one. */
  readonly datetime?: string
}

/** The publication and update dates an entry states, as display items; none is invented. */
export function dateMeta(
  data: { publishedAt?: string; updatedAt?: string },
  options: { updated?: boolean } = {},
): MetaItem[] {
  const items: MetaItem[] = []
  if (data.publishedAt !== undefined)
    items.push({
      label: "Published",
      value: formatWhen(data.publishedAt),
      datetime: data.publishedAt,
    })
  if (options.updated !== false && data.updatedAt !== undefined)
    items.push({
      label: "Updated",
      value: formatWhen(data.updatedAt),
      datetime: data.updatedAt,
    })
  return items
}

// --- Index groups ---------------------------------------------------------------------------

/** A run of an index: a year, a learning series, a work, a book. */
export interface IndexGroup {
  /** A valid fragment identifier: the index's own anchor for this group. */
  readonly id: string
  readonly heading: string
  /** A second line under the heading, such as a book's author. */
  readonly byline?: string
  /** A work's own entry: the page that stands for the whole. */
  readonly lead?: IndexItem
  readonly items: readonly IndexItem[]
}

const anchorOf = (value: string): string =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "group"

/** The month of a `YYYY-MM` period as a name ("November"), without the year. */
export const monthName = (period: string): string =>
  formatWhen(period.slice(0, 7)).replace(/ \d{4}$/, "")

/** Groups items in order of first appearance, which keeps the index's own order. */
function groupBy(
  items: readonly IndexItem[],
  keyOf: (item: IndexItem) => string,
): Map<string, IndexItem[]> {
  const groups = new Map<string, IndexItem[]>()
  for (const item of items) {
    const key = keyOf(item)
    const run = groups.get(key)
    if (run === undefined) groups.set(key, [item])
    else run.push(item)
  }
  return groups
}

/**
 * How a collection's index is divided, from its entries in index order:
 * - Timber Logs and Months' Original: by year of the period;
 * - Bearnard's Trail: by learning series, standalone lessons last;
 * - Kosmos Series: by work, the work's own entry leading its chapters;
 * - Book Club: by book, the book most recently discussed first;
 * - the others: no division, one run of entries (nothing at all when there are none).
 * Every group is non-empty, and every item is in exactly one group.
 */
export function groupIndex(
  collection: CollectionId,
  items: readonly IndexItem[],
): IndexGroup[] {
  if (items.length === 0) return []
  const rule = COLLECTION_IDS.includes(collection) ? collection : "blog"
  if (rule === "timberLogs" || rule === "monthsOriginal") {
    return [...groupBy(items, (item) => (item.when ?? "").slice(0, 4))].map(
      ([year, run]) => ({ id: `year-${year}`, heading: year, items: run }),
    )
  }
  if (rule === "trail") {
    return [...groupBy(items, (item) => item.details.seriesId ?? "")].map(
      ([seriesId, run]) => ({
        id: seriesId === "" ? "standalone" : `series-${seriesId}`,
        heading:
          seriesId === ""
            ? "Standalone lessons"
            : (run.find((item) => item.details.seriesTitle !== undefined)?.details
                .seriesTitle ?? seriesId),
        items: run,
      }),
    )
  }
  if (rule === "kosmos") {
    return [...groupBy(items, (item) => item.details.workId ?? "")].map(
      ([workId, run]) => {
        const lead = run.find(
          (item) =>
            item.details.position === undefined &&
            item.details.chapterNumber === undefined,
        )
        return {
          id: `work-${workId}`,
          heading: lead?.title ?? workId,
          ...(lead === undefined ? {} : { lead }),
          items: run.filter((item) => item !== lead),
        }
      },
    )
  }
  if (rule === "bookClub") {
    const used = new Set<string>()
    return [...groupBy(items, (item) => item.details.bookTitle ?? "")].map(
      ([book, run]) => {
        let id = `book-${anchorOf(book)}`
        for (let n = 2; used.has(id); n++) id = `book-${anchorOf(book)}-${n}`
        used.add(id)
        const author = run.find((item) => item.details.bookAuthor !== undefined)
        return {
          id,
          heading: book,
          ...(author === undefined ? {} : { byline: author.details.bookAuthor }),
          items: run,
        }
      },
    )
  }
  return [{ id: "entries", heading: "Entries", items: [...items] }]
}
