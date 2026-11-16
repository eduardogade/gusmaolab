/**
 * The homepage's recent Blog updates (P15, D-114): the newest published Blog entries, from the
 * same records and the same order as the Blog's own index (model.ts `indexItems`), so the home
 * page and the Blog can never disagree. Nothing is kept by hand.
 *
 * Eligible: a Blog entry whose status is `published`. A draft has no page and no listing, and an
 * archived entry is history, not an update, so neither appears. Demonstrations are not Blog
 * entries and are never in the records a caller passes (site.ts), so they cannot appear either.
 * An empty list is a valid answer: the page then says so plainly.
 */
import { indexItems } from "../editorial/model.ts"
import type { EditorialRecord, IndexItem } from "../editorial/model.ts"

/** How many updates the homepage shows. */
export const RECENT_UPDATES_LIMIT = 3

export function recentUpdates(
  records: readonly EditorialRecord[],
  limit: number = RECENT_UPDATES_LIMIT,
): IndexItem[] {
  return indexItems(
    "blog",
    records.filter((record) => record.collection === "blog" && record.data.status === "published"),
  ).slice(0, limit)
}
