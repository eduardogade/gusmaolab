/**
 * The synthetic Blog entries of the homepage specimen (P15, D-117). They exist only to show the
 * recent-updates section populated, which the real homepage cannot do while no post is published.
 * They are invented: nobody wrote them, they appear in no collection and no build of the website,
 * and the specimen page that draws them is routed only in development and in a demonstration
 * build (src/editorial/demo.ts).
 *
 * The set also holds the cases the selector must refuse (a draft, an archived entry, a non-Blog
 * entry), and one very long title, so the specimen and its tests show filtering and wrapping.
 * Erasable TypeScript only (D-040).
 */
import type { EditorialRecord } from "../editorial/model.ts"

export const HOME_SPECIMEN = "/_design/home/"

const entry = (
  collection: EditorialRecord["collection"],
  id: string,
  data: Record<string, unknown>,
): EditorialRecord => ({
  collection,
  id,
  data: { tags: [], relatedRecords: [], related: [], slug: id, ...data } as unknown as EditorialRecord["data"],
})

export const HOME_SPECIMEN_ENTRIES: readonly EditorialRecord[] = [
  entry("blog", "specimen-newest", {
    title: "A specimen post, newest of the three",
    description: "Synthetic. A short summary, as the Blog index shows one.",
    status: "published",
    publishedAt: "2026-11-14",
  }),
  entry("blog", "specimen-long-title", {
    title:
      "A specimen post whose title is deliberately long, so that it must wrap across several lines on a narrow phone without overflowing",
    description:
      "Synthetic. A longer summary that also wraps: it shows how a description sits under a title that takes many lines, and that nothing is cut off.",
    status: "published",
    publishedAt: "2026-10-30",
  }),
  entry("blog", "specimen-without-summary", {
    title: "A specimen post without a summary",
    status: "published",
    publishedAt: "2026-10-02",
  }),
  entry("blog", "specimen-fourth-oldest", {
    title: "A fourth published specimen, left out by the limit of three",
    description: "Synthetic. It is eligible, but the homepage shows only the newest three.",
    status: "published",
    publishedAt: "2026-09-12",
  }),
  entry("blog", "specimen-draft", {
    title: "A specimen draft: never listed",
    description: "Synthetic. A draft has no date and no place on the homepage.",
    status: "draft",
  }),
  entry("blog", "specimen-archived", {
    title: "A specimen archived post: history, not an update",
    description: "Synthetic. Archived entries keep their page but are not recent updates.",
    status: "archived",
    publishedAt: "2026-11-20",
  }),
  entry("berries", "specimen-berry", {
    title: "A specimen Berry: not a Blog entry",
    description: "Synthetic. Only the Blog feeds the homepage.",
    status: "published",
    publishedAt: "2026-11-21",
  }),
]
