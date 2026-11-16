/**
 * What a page of the archive is in (P17, D-122): its presentation state, a small closed set. These
 * describe a page, never an article: the P10 statuses (draft, published, archived) belong to
 * editorial entries and are a separate idea (src/editorial/model.ts).
 *
 * - ready        the page has genuine, approved material to show.
 * - empty        the page's feature works and holds no published record yet (an editorial
 *                collection without a published entry). Not a broken page.
 * - preparation  the page has an approved purpose, and the material or feature it depends on is
 *                not complete: it says so, and nothing is invented to fill it.
 * - unavailable  a feature cannot be used because a real integration or resource it needs is not
 *                available. Used sparingly: no page is in this state today.
 *
 * Pure data and no imports: Node runs it for the tests and the inspector (D-040).
 */
export const PAGE_STATES = ["ready", "empty", "preparation", "unavailable"] as const

export type PageState = (typeof PAGE_STATES)[number]

/** The short name of a state, as a page or the inspector says it. */
export const STATE_LABELS: Readonly<Record<PageState, string>> = {
  ready: "Ready",
  empty: "Empty",
  preparation: "In preparation",
  unavailable: "Unavailable",
}

/** What a visitor is told, in a heading, about a page in each non-ready state. */
export const STATE_HEADINGS: Readonly<Record<Exclude<PageState, "ready">, string>> = {
  empty: "Nothing published yet",
  preparation: "In preparation",
  unavailable: "Not available right now",
}

export const isPageState = (value: unknown): value is PageState =>
  typeof value === "string" && (PAGE_STATES as readonly string[]).includes(value)
