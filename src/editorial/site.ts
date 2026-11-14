/**
 * The Astro side of the editorial pipeline (P10, D-080): loads the collections, builds
 * the site navigation with the entries' content routes, and supplies the route files
 * with their static paths and the folder pages with their collection index.
 *
 * Only .astro files and src/content.config.ts import this: it needs Astro's
 * `astro:content`. The rules themselves are in model.ts and run anywhere.
 *
 * `siteNavigation` (src/navigation/index.ts) stays the folders alone. A page that may be
 * an entry resolves its URL through `getSiteNavigation()` instead, which adds the
 * entries' routes. Entries own no tab: they sit in the body of their folder.
 */
import { getCollection } from "astro:content"
import type { CollectionEntry, CollectionKey } from "astro:content"
import { collectionOwnedBy, COLLECTION_IDS } from "./collections.ts"
import type { CollectionId } from "./collections.ts"
import {
  collectionIssues,
  recordReferenceIssues,
  contentRoutes,
  indexItems,
  publicPath,
  routableRecords,
} from "./model.ts"
import type { EditorialRecord, IndexItem } from "./model.ts"
import { entryReferenceIssues, readingContext } from "./reading.ts"
import type { ReadingContext } from "./reading.ts"
import { SECTIONS } from "../navigation/registry.ts"
import {
  createNavigation,
  normalizePath,
  ROUTE_PARAMS,
  siteNavigation,
} from "../navigation/index.ts"
import type { Navigation } from "../navigation/index.ts"
import type { CommonData } from "./schema.ts"
import { siteRecords } from "../records/index.ts"

/** Only the dev server previews drafts; a build never routes one. */
const routeOptions = () => ({ drafts: import.meta.env.DEV })

export class EditorialConfigError extends Error {
  readonly issues: readonly string[]
  constructor(issues: readonly string[]) {
    super(`Invalid editorial content:\n- ${issues.join("\n- ")}`)
    this.name = "EditorialConfigError"
    this.issues = issues
  }
}

/** A loaded entry with everything a page needs: the record and Astro's own entry. */
export interface LoadedEntry extends EditorialRecord {
  readonly entry: CollectionEntry<CollectionKey>
}

async function loadEntries(): Promise<LoadedEntry[]> {
  const loaded = await Promise.all(
    COLLECTION_IDS.map(async (collection) =>
      (await getCollection(collection as CollectionKey)).map((entry) => ({
        collection,
        id: entry.id,
        data: entry.data as CommonData,
        entry,
      })),
    ),
  )
  const entries = loaded.flat()
  // Entries may name canonical records (P11): every ID must exist in the site's records.
  const issues = [
    ...collectionIssues(entries),
    ...recordReferenceIssues(entries, (id) => siteRecords.byId.has(id)),
    ...entryReferenceIssues(entries),
  ]
  if (issues.length > 0) throw new EditorialConfigError(issues)
  return entries
}

// A build reads the content once. The dev server reads it on every request, so that an
// edited file shows on reload.
let cached: Promise<LoadedEntry[]> | undefined
const entries = (): Promise<LoadedEntry[]> =>
  import.meta.env.PROD ? (cached ??= loadEntries()) : loadEntries()

let cachedNavigation: Promise<Navigation> | undefined
async function buildNavigation(): Promise<Navigation> {
  return createNavigation(SECTIONS, contentRoutes(await entries(), routeOptions()))
}

/** The folders and every entry's page. An invalid combination fails the build. */
export const getSiteNavigation = (): Promise<Navigation> =>
  import.meta.env.PROD ? (cachedNavigation ??= buildNavigation()) : buildNavigation()

/** What the route files give Astro for each page: its URL parameters and its entry. */
interface PagePath {
  params: Record<string, string>
  props: {
    collection: CollectionId | undefined
    entry: LoadedEntry["entry"] | undefined
  }
}

const paramsOf = (path: string): Record<string, string> =>
  Object.fromEntries(
    path
      .slice(1, -1)
      .split("/")
      .map((segment, index) => [ROUTE_PARAMS[index], segment]),
  )

/**
 * The static paths of one route file: the registered folders at that depth, then the
 * entries' pages at that depth. Both are generated from data, never from a catch-all, so
 * a URL nobody registered has no page.
 */
export async function pageStaticPaths(depth: 1 | 2 | 3): Promise<PagePath[]> {
  const folders: PagePath[] = siteNavigation
    .folderStaticPaths(depth)
    .map((path) => ({ ...path, props: { collection: undefined, entry: undefined } }))
  const pages: PagePath[] = routableRecords(await entries(), routeOptions())
    .map((record) => ({ record, path: publicPath(record) }))
    .filter(({ path }) => path.split("/").length - 2 === depth)
    .map(({ record, path }) => ({
      params: paramsOf(path),
      props: { collection: record.collection, entry: (record as LoadedEntry).entry },
    }))
  return [...folders, ...pages]
}

/** The index of the collection a folder page lists, or null for a folder with none. */
export async function collectionIndexFor(path: string): Promise<{
  id: CollectionId
  label: string
  identity: string
  items: IndexItem[]
} | null> {
  const folder = siteNavigation.resolve(normalizePath(path))
  if (!folder.found || folder.state.page.kind !== "folder") return null
  const collection = collectionOwnedBy(folder.state.page.node.id)
  if (collection === undefined) return null
  return {
    id: collection.id,
    label: collection.label,
    identity: collection.identity,
    items: indexItems(collection.id, await entries()),
  }
}

/** What a reader of one entry is offered besides its text (reading.ts), from the real entries. */
export async function readingContextFor(
  collection: CollectionId,
  entryId: string,
): Promise<ReadingContext> {
  const all = await entries()
  const record = all.find(
    (candidate) => candidate.collection === collection && candidate.id === entryId,
  )
  if (record === undefined) throw new Error(`no ${collection} entry "${entryId}"`)
  return readingContext(record, all)
}
