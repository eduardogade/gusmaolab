/**
 * Chromatin domains and the mapping from navigation to them (P20, D-137 to D-139).
 *
 * A *navigation target* carries a stable navigation ID (the registry's, such as "cv") and, optionally,
 * a chromatin-domain ID. A *chromatin domain* is a stretch of the model that can respond: today
 * exactly one exists, the highlighted region of P19. The page never names it; the nucleus decides
 * which domain answers a target, here, from three things in order:
 *
 *   1. an explicit `chromatinDomainId`, if the caller gave one and the model has that domain;
 *   2. `NAVIGATION_DOMAINS[navigationId]`, the stable mapping, if it names a domain the model has;
 *   3. the default domain: the highlighted region.
 *
 * Both a missing mapping and an unknown ID resolve to the default (the second is reported as
 * `unknown-domain`, never thrown): a page cannot break the nucleus with an ID it invented.
 *
 * What this is not: it does not make eleven regions. The production mapping is empty, so all eleven
 * top-level tabs resolve to the one domain, and `domainsOf()` lists exactly one. Different chromatin
 * means different geometry (a second strand stretch that deforms on its own), which the model does
 * not have; planning/nucleus-multidomain.md says what it would take. Pure data and logic, no engine,
 * so it runs in Node.js (D-040).
 */
import type { NucleusModel, Vec3 } from "./types.ts"

/** The one domain of the P19 model: the highlighted region, in the strand's own order. */
export const DEFAULT_DOMAIN_ID = "highlighted-region"

/**
 * The stable mapping from a navigation ID to a domain ID. Empty on purpose: with one domain, every
 * tab resolves to the default, and an entry here would claim a distinction the model cannot draw.
 * When the model gains domains, an entry is added per tab, once the owner has chosen the mapping.
 */
export const NAVIGATION_DOMAINS: Readonly<Record<string, string>> = Object.freeze({})

/** A region that can answer a target. `center` is its rest centre in model space. */
export interface ChromatinDomain {
  readonly id: string
  readonly strandId: string
  readonly start: number
  readonly end: number
  readonly center: Vec3
}

export type DomainResolution = "requested" | "mapped" | "default" | "unknown-domain"

export interface ResolvedDomain {
  readonly domain: ChromatinDomain
  readonly resolution: DomainResolution
  /** The ID that could not be found, when the resolution is `unknown-domain`. */
  readonly unknownId?: string
}

/** What the model can actually deform. One entry today. */
export function domainsOf(model: NucleusModel): readonly ChromatinDomain[] {
  const h = model.highlight
  return [{ id: DEFAULT_DOMAIN_ID, strandId: h.strandId, start: h.start, end: h.end, center: h.center }]
}

export interface DomainRequest {
  readonly navigationId?: string
  readonly chromatinDomainId?: string
}

/**
 * Which domain answers a request. `domains` must not be empty and its first entry is the default.
 * `map` is the navigation mapping (the production one unless a test passes its own).
 */
export function resolveDomain(
  domains: readonly ChromatinDomain[],
  request: DomainRequest,
  map: Readonly<Record<string, string>> = NAVIGATION_DOMAINS,
): ResolvedDomain {
  const fallback = domains[0]
  if (fallback === undefined) throw new Error("resolveDomain needs at least one domain")
  const find = (id: string): ChromatinDomain | undefined => domains.find((d) => d.id === id)
  const { navigationId, chromatinDomainId } = request

  if (chromatinDomainId !== undefined) {
    const found = find(chromatinDomainId)
    if (found !== undefined) return { domain: found, resolution: "requested" }
    return { domain: fallback, resolution: "unknown-domain", unknownId: chromatinDomainId }
  }
  if (navigationId !== undefined && Object.hasOwn(map, navigationId)) {
    const mapped = map[navigationId]!
    const found = find(mapped)
    if (found !== undefined) return { domain: found, resolution: "mapped" }
    return { domain: fallback, resolution: "unknown-domain", unknownId: mapped }
  }
  return { domain: fallback, resolution: "default" }
}
