/**
 * The eight editorial collections (P10, D-078): independent publishing identities that
 * share one pipeline. This file is data only; the schemas are in schema.ts, the routing
 * rules in model.ts, and the Astro wiring in site.ts and src/content.config.ts.
 *
 * Each collection is owned by exactly one registered folder. Ownership is declared here,
 * by folder ID: it is never inferred from a URL prefix. The public prefix and the colour
 * category come from that folder in the navigation registry, so the registry stays the
 * only place that declares paths (planning/content-model.md).
 *
 * Code in this directory that tests import also runs directly in Node.js: erasable
 * TypeScript only, `import type` for types, and `.ts` extensions (D-040).
 */
import { siteNavigation } from "../navigation/index.ts"
import type { ArchiveCategory } from "../navigation/index.ts"

export const COLLECTION_IDS = [
  "blog",
  "trail",
  "greenhouse",
  "berries",
  "timberLogs",
  "monthsOriginal",
  "kosmos",
  "bookClub",
] as const

export type CollectionId = (typeof COLLECTION_IDS)[number]

export interface CollectionDefinition {
  /** Stable identifier: the Astro collection name. */
  readonly id: CollectionId
  /** The public name, as in the folder tab. */
  readonly label: string
  /** The directory below `src/content/`: one Markdown file per entry. */
  readonly directory: string
  /** ID of the registered folder whose body displays this collection's entries. */
  readonly owner: string
  /** What the collection is for, in one line. */
  readonly identity: string
}

export const COLLECTIONS: readonly CollectionDefinition[] = [
  {
    id: "blog",
    label: "Blog",
    directory: "blog",
    owner: "blog",
    identity: "News, announcements, updates and microblogging, in chronological order.",
  },
  {
    id: "trail",
    label: "Bearnard's Trail",
    directory: "trail",
    owner: "lecture-notes-bearnards-trail",
    identity: "Ongoing learning: related lessons in continuing, ordered subjects.",
  },
  {
    id: "greenhouse",
    label: "The Greenhouse",
    directory: "greenhouse",
    owner: "lecture-notes-greenhouse",
    identity:
      "Longer technical tutorials and scientific explanations, with code, mathematics and figures.",
  },
  {
    id: "berries",
    label: "Berries",
    directory: "berries",
    owner: "lecture-notes-berries",
    identity:
      "Short technical insights: compact, educational pieces on one concept each.",
  },
  {
    id: "timberLogs",
    label: "Timber Logs",
    directory: "timber-logs",
    owner: "lecture-notes-timber-logs",
    identity: "Monthly records of work completed, with reflections and progress.",
  },
  {
    id: "monthsOriginal",
    label: "Months' Original",
    directory: "months-original",
    owner: "writing-months-original",
    identity: "Monthly original literary essays and short prose.",
  },
  {
    id: "kosmos",
    label: "Kosmos Series",
    directory: "kosmos",
    owner: "writing-kosmos",
    identity: "Literary prose organized into works and, eventually, chapters.",
  },
  {
    id: "bookClub",
    label: "Book Club",
    directory: "book-club",
    owner: "writing-book-club",
    identity: "Reading notes, book discussions and literary commentary.",
  },
]

const byId = new Map(COLLECTIONS.map((collection) => [collection.id, collection]))

export function collectionById(id: string): CollectionDefinition {
  const found = byId.get(id as CollectionId)
  if (found === undefined) throw new Error(`unknown editorial collection "${id}"`)
  return found
}

/** The collection a folder owns, or undefined: only the folder's own page lists entries. */
export function collectionOwnedBy(folderId: string): CollectionDefinition | undefined {
  return COLLECTIONS.find((collection) => collection.owner === folderId)
}

/** The public prefix of a collection's entries: its owning folder's canonical path. */
export function collectionPrefix(collection: CollectionDefinition): string {
  return siteNavigation.node(collection.owner).path
}

/** The archive category the collection's pages inherit from its owning folder. */
export function collectionCategory(collection: CollectionDefinition): ArchiveCategory {
  return siteNavigation.node(collection.owner).category
}
