/**
 * The development site map (P17, D-124): where it lives and the development pages it lists. The
 * registered folders and their states are never listed here: the page derives them from the
 * registry and src/site/coverage.ts. This file holds only what the registry cannot know, the
 * development pages under /_design/, which are routes but not folders, and tests/site.mjs
 * checks that this list and the built development pages agree, so it cannot go stale.
 *
 * Development and demonstration builds only (src/editorial/demo.ts); a release build has no page
 * here and its output is searched for it (scripts/demo-check.mjs).
 */
export const SITE_MAP = "/_design/site-map/"

/** The label of the link that leads to the site map from the other development pages. */
export const SITE_MAP_LABEL = "Site Map & Page Coverage"

export interface DevPage {
  readonly href: string
  readonly label: string
  readonly note: string
}

export const DEV_PAGES: readonly DevPage[] = [
  { href: SITE_MAP, label: SITE_MAP_LABEL, note: "This page." },
  { href: "/_design/page-states/", label: "Page states specimen", note: "The content-state components, and records pages from a synthetic fixture." },
  { href: "/_design/home/", label: "Homepage specimen", note: "The homepage with example Blog posts." },
  { href: "/_design/world-clocks/", label: "World clocks specimen", note: "The eight clocks at simulated instants." },
  { href: "/_design/publishing/", label: "Publishing Workbench", note: "How articles are written, checked and published." },
  { href: "/_design/quarto/", label: "Quarto specimen", note: "Scientific articles prepared by Quarto." },
  { href: "/_design/editorial/", label: "Editorial study", note: "The eight collections' reading experiences, with synthetic entries." },
  { href: "/_design/records/", label: "Records study", note: "Canonical records through their projections, with a synthetic fixture." },
  { href: "/_design/bearnard/", label: "Bearnard study", note: "The approved illustration and its derivatives." },
  { href: "/_design/folders/", label: "Physical folders study", note: "The folders at every depth." },
  { href: "/_design/tokens/", label: "Design tokens", note: "The colour, type and spacing tokens." },
]
