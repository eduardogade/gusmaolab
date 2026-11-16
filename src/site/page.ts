/**
 * Page coverage for the Astro side (P17, D-122): the site's rows, derived once per build from the
 * registry, the editorial collections' counts and the canonical records. The route files ask it for
 * a page's state; the development site map asks it for every row.
 *
 * Only .astro files import this (it needs `astro:content` through editorial/site.ts). The rules
 * are in coverage.ts and run anywhere.
 */
import { editorialCounts, pageStaticPaths } from "../editorial/site.ts"
import { ROUTE_PARAMS, siteNavigation } from "../navigation/index.ts"
import { coverage, rowOf } from "./coverage.ts"
import type { CoverageRow } from "./coverage.ts"
import { pageFacts } from "./facts.ts"

/** Every registered folder's row. A build reads the content once; the dev server on every request. */
export async function siteCoverage(): Promise<CoverageRow[]> {
  return coverage(siteNavigation, pageFacts(await editorialCounts()))
}

/** The row of the folder at a path (a registered folder page), or undefined. */
export async function coverageFor(path: string): Promise<CoverageRow | undefined> {
  const resolved = siteNavigation.resolve(path)
  if (!resolved.found || resolved.state.page.kind !== "folder") return undefined
  return rowOf(await siteCoverage(), resolved.state.page.node.id)
}

/** What the route files actually generate, as canonical paths (P17, D-124). */
export interface RouteAudit {
  /** Every generated folder page and entry page path, including Home. */
  readonly generated: ReadonlySet<string>
  /** Paths two routes claim: always an error. */
  readonly duplicates: readonly string[]
  /** Generated paths that are neither a registered folder nor an editorial entry. */
  readonly unregistered: readonly string[]
  /** How many generated pages are editorial entries (owned by a folder, never a tab). */
  readonly entryPages: number
}

export async function routeAudit(): Promise<RouteAudit> {
  const all = (await Promise.all(([1, 2, 3] as const).map((depth) => pageStaticPaths(depth)))).flat()
  const seen = new Set<string>(["/"])
  const duplicates: string[] = []
  const unregistered: string[] = []
  let entryPages = 0
  for (const { params, props } of all) {
    const path = `/${ROUTE_PARAMS.map((key) => params[key]).filter(Boolean).join("/")}/`
    if (seen.has(path)) duplicates.push(path)
    seen.add(path)
    if (props.entry !== undefined) entryPages += 1
    else if (!siteNavigation.resolve(path).found) unregistered.push(path)
  }
  return { generated: seen, duplicates, unregistered, entryPages }
}
