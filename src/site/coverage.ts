/**
 * Page coverage (P17, D-122): for every registered folder, what kind of page it is and which
 * presentation state it is in, derived from the registry, the destinations' declared sources and the
 * real material (facts). It is the one place that answers "what state is this page in?": the
 * pages draw from it, the development site map (/_design/site-map/) lists it, and the tests read it.
 *
 * Nothing here is a manually kept status. A collection is `empty` or `ready` by its published entry
 * count; a records page is `ready` or `in preparation` by whether a verified record exists; a
 * declared-planned page is `in preparation`; a parent follows its children.
 *
 * Pure: no Astro, no DOM, no file access. The facts are passed in (facts.ts gathers them), so
 * Node can run it with any facts for the tests (D-040).
 */
import { DESTINATIONS } from "./destinations.ts"
import type { DestinationSource, DestinationSpec, RecordsKey } from "./destinations.ts"
import type { PageState } from "./state.ts"
import type { Navigation } from "../navigation/index.ts"
import type { NavigationNode } from "../navigation/types.ts"

/** The real material the states are derived from. */
export interface PageFacts {
  /** Published and archived entries of the collection a folder owns, by folder ID. */
  readonly editorial: Readonly<Record<string, number>>
  /** Shown (public, verified) records behind each projection. */
  readonly records: Readonly<Partial<Record<RecordsKey, number>>>
}

export const NO_FACTS: PageFacts = { editorial: {}, records: {} }

/** One registered folder, with what the site knows about its page. */
export interface CoverageRow {
  readonly id: string
  readonly label: string
  readonly path: string
  readonly parentId: string | null
  readonly level: 1 | 2 | 3
  readonly category: NavigationNode["category"]
  readonly source: DestinationSource
  readonly state: PageState
  /** Why: the fact the state was derived from, in plain words. */
  readonly reason: string
  readonly childIds: readonly string[]
}

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`

function ownState(
  node: NavigationNode,
  spec: DestinationSpec,
  facts: PageFacts,
): { state: PageState; reason: string } {
  switch (spec.source) {
    case "home":
      return { state: "ready", reason: "the composed homepage" }
    case "collection": {
      const n = facts.editorial[node.id] ?? 0
      return n > 0
        ? { state: "ready", reason: plural(n, "published entry", "published entries") }
        : { state: "empty", reason: "collection works; no published entry yet" }
    }
    case "records": {
      const key = spec.records
      const n = key === undefined ? 0 : (facts.records[key] ?? 0)
      return n > 0
        ? { state: "ready", reason: plural(n, "verified record", "verified records") }
        : { state: "preparation", reason: "no verified record to show" }
    }
    case "planned":
      return { state: "preparation", reason: "declared planned; material not yet supplied" }
    case "overview":
      throw new Error("an overview's state follows its children")
  }
}

/** Every registered folder in registry order (a section, then its children), with its state. */
export function coverage(navigation: Navigation, facts: PageFacts = NO_FACTS): CoverageRow[] {
  const states = new Map<string, { state: PageState; reason: string }>()
  const resolve = (node: NavigationNode): { state: PageState; reason: string } => {
    const known = states.get(node.id)
    if (known !== undefined) return known
    const spec = DESTINATIONS[node.id]
    if (spec === undefined)
      throw new Error(`destination "${node.id}" (${node.path}) has no entry in src/site/destinations.ts`)
    let result: { state: PageState; reason: string }
    if (spec.source === "overview") {
      const kids = node.children.map((child) => resolve(child).state)
      const working = kids.filter((state) => state === "ready" || state === "empty").length
      result =
        working > 0
          ? { state: "ready", reason: `${working} of ${kids.length} folders have material or a working collection` }
          : { state: "preparation", reason: `none of its ${kids.length} folders has material yet` }
    } else {
      result = ownState(node, spec, facts)
    }
    states.set(node.id, result)
    return result
  }
  const rows: CoverageRow[] = []
  const visit = (node: NavigationNode): void => {
    const spec = DESTINATIONS[node.id]
    const { state, reason } = resolve(node)
    rows.push({
      id: node.id,
      label: node.label,
      path: node.path,
      parentId: node.parentId,
      level: node.level as 1 | 2 | 3,
      category: node.category,
      source: spec?.source ?? "planned",
      state,
      reason,
      childIds: node.children.map((child) => child.id),
    })
    for (const child of node.children) visit(child)
  }
  for (const section of navigation.sections) visit(section)
  return rows
}

/** Counts of the rows by state, computed, never typed in. */
export function summarize(rows: readonly CoverageRow[]): Record<PageState | "total", number> {
  const counts = { ready: 0, empty: 0, preparation: 0, unavailable: 0, total: rows.length }
  for (const row of rows) counts[row.state] += 1
  return counts
}

/** The row of one folder, or undefined. */
export const rowOf = (rows: readonly CoverageRow[], id: string): CoverageRow | undefined =>
  rows.find((row) => row.id === id)

/** Problems in the destinations file against the registry: an entry for nothing, or none for a folder. */
export function destinationIssues(navigation: Navigation): string[] {
  const issues: string[] = []
  for (const id of Object.keys(DESTINATIONS))
    if (!navigation.nodes.has(id)) issues.push(`destinations.ts: "${id}" is not a registered folder`)
  for (const [id, node] of navigation.nodes) {
    const spec = DESTINATIONS[id]
    if (spec === undefined) {
      issues.push(`destinations.ts: no entry for "${id}" (${node.path})`)
      continue
    }
    if ((spec.source === "overview") !== (node.children.length > 0))
      issues.push(`destinations.ts: "${id}" is ${spec.source} but has ${node.children.length} children`)
    if (spec.source === "records" && spec.records === undefined)
      issues.push(`destinations.ts: "${id}" is a records page without a projection`)
    if ((spec.related?.length ?? 0) > 3) issues.push(`destinations.ts: "${id}" has more than three related folders`)
    for (const related of spec.related ?? [])
      if (!navigation.nodes.has(related) || related === id)
        issues.push(`destinations.ts: "${id}" relates to "${related}", which is not another registered folder`)
  }
  return issues
}
