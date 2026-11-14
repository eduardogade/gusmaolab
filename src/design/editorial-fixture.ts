/**
 * SYNTHETIC FIXTURE for the P12 editorial study (/_design/editorial/). Every entry here is
 * invented: it says nothing true about anyone's research, writing or reading. It lives in
 * src/design/, never in src/content/, so no collection loader ever reads it, and only the
 * study pages under src/pages/[design]/editorial/ import it (tests/editorial-layouts.mjs,
 * EDIT-019). The study draws these entries with the production layouts and indexes.
 *
 * Erasable TypeScript only (D-040): the tests import this file in Node.js.
 */
import {
  collectionById,
  collectionPrefix,
  COLLECTION_IDS,
} from "../editorial/collections.ts"
import type { CollectionId } from "../editorial/collections.ts"
import type { EditorialRecord, IndexItem } from "../editorial/model.ts"
import type { ReadingContext, ReadingLink } from "../editorial/reading.ts"
import type { CommonData } from "../editorial/schema.ts"

/** The Markdown bodies in src/design/editorial/, by file name without extension. */
export type BodyName =
  | "greenhouse-long"
  | "short"
  | "blog"
  | "trail"
  | "berry"
  | "timber-log"
  | "essay"
  | "work"
  | "chapter"
  | "discussion"

export interface SyntheticEntry extends EditorialRecord {
  readonly body: BodyName
}

const entry = (
  collection: CollectionId,
  slug: string,
  body: BodyName,
  data: Record<string, unknown>,
): SyntheticEntry => ({
  collection,
  id: slug,
  body,
  data: {
    status: "published",
    tags: [],
    relatedRecords: [],
    related: [],
    slug,
    ...data,
  } as unknown as CommonData,
})

const TUTORIAL = "greenhouse/synthetic-long-tutorial"

export const SYNTHETIC_ENTRIES: readonly SyntheticEntry[] = [
  // Blog
  entry("blog", "synthetic-announcement", "blog", {
    title: "Synthetic announcement: a page was added",
    description: "An invented announcement, to show a recent post in the Blog layout.",
    publishedAt: "2026-03-12",
    kind: "announcement",
  }),
  entry("blog", "synthetic-older-note", "short", {
    title: "Synthetic note: a paragraph was corrected",
    description: "An invented, older update.",
    publishedAt: "2026-02-02",
    kind: "update",
  }),
  entry("blog", "synthetic-draft-post", "short", {
    title: "Synthetic draft post, never shown",
    status: "draft",
    kind: "post",
  }),
  // Bearnard's Trail
  entry("trail", "synthetic-lesson-one", "short", {
    title: "Synthetic lesson one: what is a unit",
    description: "The first lesson of an invented sequence.",
    publishedAt: "2026-01-10",
    seriesId: "synthetic-sequence",
    seriesTitle: "A synthetic sequence on counting",
    position: 1,
  }),
  entry("trail", "synthetic-lesson-two", "trail", {
    title: "Synthetic lesson two: counting what matters",
    description: "The second lesson, with prerequisites and a related tutorial.",
    publishedAt: "2026-01-17",
    seriesId: "synthetic-sequence",
    seriesTitle: "A synthetic sequence on counting",
    position: 2,
    prerequisites: ["Synthetic lesson one", "Comfort with simple arithmetic"],
    related: [TUTORIAL],
  }),
  entry("trail", "synthetic-lesson-three", "short", {
    title: "Synthetic lesson three: comparing two counts",
    description: "The third lesson.",
    publishedAt: "2026-01-24",
    seriesId: "synthetic-sequence",
    seriesTitle: "A synthetic sequence on counting",
    position: 3,
  }),
  entry("trail", "synthetic-lesson-four", "short", {
    title: "Synthetic lesson four, a draft, never shown",
    status: "draft",
    seriesId: "synthetic-sequence",
    position: 4,
  }),
  entry("trail", "synthetic-standalone-lesson", "short", {
    title: "A synthetic standalone lesson",
    description: "A lesson that belongs to no sequence, so it has no lesson number.",
    publishedAt: "2026-02-14",
  }),
  // The Greenhouse
  entry("greenhouse", "synthetic-long-tutorial", "greenhouse-long", {
    title: "Synthetic tutorial: counting characters is harder than it looks",
    description:
      "An invented long-form article with headings, code, a table, a figure, notation and references, to show the technical reading layout.",
    publishedAt: "2026-03-01",
    updatedAt: "2026-03-08",
    difficulty: "intermediate",
    prerequisites: ["Reading simple Python", "Knowing what Unicode is, roughly"],
    references: [
      "Invented Author A. (2020). An invented paper about counting. Synthetic Journal of Nothing, 1(1), 1–2.",
      "Invented Author B. (2021). A second invented reference, long enough that it must wrap rather than widen the page: https://example.org/a/very/long/synthetic/address/that/goes/nowhere",
    ],
    tags: ["unicode", "strings"],
  }),
  entry("greenhouse", "synthetic-short-article", "short", {
    title: "A synthetic short article, without sections",
    description: "Too short for a table of contents, which therefore does not appear.",
    publishedAt: "2026-02-20",
    tags: ["notes"],
  }),
  // Berries
  entry("berries", "synthetic-berry", "berry", {
    title: "Synthetic berry: the mean is not the middle",
    description: "One invented idea, framed in one sentence.",
    publishedAt: "2026-03-10",
    tags: ["statistics"],
    related: [TUTORIAL],
  }),
  entry("berries", "synthetic-second-berry", "short", {
    title: "A second synthetic berry",
    description: "Another small invented idea.",
    publishedAt: "2026-03-03",
    tags: ["notes"],
  }),
  // Timber Logs (February is absent on purpose)
  entry("timberLogs", "synthetic-log-2026-03", "short", {
    title: "Synthetic log, March",
    description: "An invented record of an invented month.",
    publishedAt: "2026-04-02",
    period: "2026-03",
  }),
  entry("timberLogs", "synthetic-log-2026-01", "timber-log", {
    title: "Synthetic log, January",
    description:
      "An invented record with activities, observations, decisions and next steps.",
    publishedAt: "2026-02-03",
    period: "2026-01",
  }),
  entry("timberLogs", "synthetic-log-2025-11", "short", {
    title: "Synthetic log, November",
    description: "An invented record from the year before.",
    publishedAt: "2025-12-02",
    period: "2025-11",
  }),
  // Months' Original
  entry("monthsOriginal", "synthetic-essay", "essay", {
    title: "Synthetic essay: the weight of a spoon",
    description: "An invented short essay, to show literary reading.",
    publishedAt: "2026-03-31",
    period: "2026-03",
    epigraph: "An invented line that no one ever wrote.",
    epigraphSource: "Nobody, in nothing",
  }),
  entry("monthsOriginal", "synthetic-earlier-essay", "short", {
    title: "A synthetic earlier essay",
    description: "An invented essay from the month before.",
    publishedAt: "2026-02-28",
    period: "2026-02",
  }),
  // Kosmos Series
  entry("kosmos", "synthetic-work", "work", {
    title: "A Synthetic Work",
    description: "An invented work, to show a work's own page and its chapters.",
    publishedAt: "2026-01-05",
    workId: "synthetic-work",
    epigraph: "Invented words for an invented book.",
    epigraphSource: "No one",
  }),
  entry("kosmos", "synthetic-chapter-one", "chapter", {
    title: "The first synthetic chapter",
    description: "An invented opening.",
    publishedAt: "2026-01-12",
    workId: "synthetic-work",
    chapterNumber: 1,
    chapterLabel: "I",
    position: 1,
    epigraph: "A chapter may have an epigraph of its own.",
    epigraphSource: "Still no one",
  }),
  entry("kosmos", "synthetic-chapter-two", "short", {
    title: "An interlude",
    description: "A chapter the author labels as she wishes.",
    publishedAt: "2026-01-19",
    workId: "synthetic-work",
    chapterLabel: "Interlude",
    position: 2,
  }),
  // Book Club
  entry("bookClub", "synthetic-discussion", "discussion", {
    title: "Synthetic discussion: was it about what it said?",
    description: "An invented discussion of an invented book, with a spoiler notice.",
    publishedAt: "2026-03-07",
    bookTitle: "A Synthetic Book",
    bookAuthor: "An Invented Author",
    sessionDate: "2026-03-05",
    spoilers: true,
  }),
  entry("bookClub", "synthetic-first-session", "short", {
    title: "Synthetic first session",
    description: "The invented first conversation about the same invented book.",
    publishedAt: "2026-02-07",
    bookTitle: "A Synthetic Book",
    bookAuthor: "An Invented Author",
    sessionDate: "2026-02-05",
  }),
  entry("bookClub", "synthetic-other-book", "short", {
    title: "Synthetic notes on another book",
    description: "Another invented book.",
    publishedAt: "2026-01-17",
    bookTitle: "Another Invented Book",
    sessionDate: "2026-01-15",
  }),
]

// --- The study's own addresses ----------------------------------------------------------------

export const STUDY_ROOT = "/_design/editorial/"

/** The study's address for a collection's index, or for one of its entries. */
export const studyPath = (collection: CollectionId, slug?: string): string =>
  `${STUDY_ROOT}${collectionById(collection).directory}/${slug === undefined ? "" : `${slug}/`}`

/** Every address the study has: its overview, each index and each published entry. */
export function studyPaths(): string[] {
  return [
    STUDY_ROOT,
    ...COLLECTION_IDS.map((id) => studyPath(id)),
    ...SYNTHETIC_ENTRIES.filter((e) => e.data.status !== "draft").map((e) =>
      studyPath(e.collection, e.data.slug),
    ),
  ]
}

/**
 * Turns an address on the real site (such as /lecture-notes/greenhouse/<slug>/ or
 * /blog/#fragment) into the study's, so that links on a study page stay on the study.
 */
export function rebase(path: string): string {
  for (const id of COLLECTION_IDS) {
    const prefix = collectionPrefix(collectionById(id))
    if (path.startsWith(prefix))
      return `${STUDY_ROOT}${collectionById(id).directory}/${path.slice(prefix.length)}`
  }
  return path
}

const link = (l: ReadingLink | undefined): ReadingLink | undefined =>
  l === undefined ? undefined : { ...l, path: rebase(l.path) }

export function rebaseContext(context: ReadingContext): ReadingContext {
  return {
    ...context,
    collectionPath: rebase(context.collectionPath),
    previous: link(context.previous),
    next: link(context.next),
    related: context.related.map((r) => ({ ...r, path: rebase(r.path) })),
    chapters: context.chapters.map((c) => link(c) as ReadingLink),
    sequence:
      context.sequence === undefined
        ? undefined
        : { ...context.sequence, overviewPath: rebase(context.sequence.overviewPath) },
  }
}

export const rebaseItems = (items: readonly IndexItem[]): IndexItem[] =>
  items.map((item) => ({ ...item, path: rebase(item.path) }))
