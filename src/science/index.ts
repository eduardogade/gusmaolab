/**
 * The scientific articles on the site's side (P13, D-098): what Astro reads of the documents
 * that scripts/science.mjs prepared from Quarto sources. Astro never runs Quarto, Python or
 * the tool: it reads the validated article fragments (`src/science/<dir>/<name>.html`) and
 * the manifest that names them. A fragment is trusted HTML, checked when it was made and again
 * by `npm run science:verify`, which `npm run build` runs first.
 *
 * An entry is a scientific article when the manifest has a document for it: the entry's own
 * file (src/content/<dir>/<name>.md) carries only its P10 metadata. Everything else about it,
 * routes, ownership, publication state and layout, is the editorial system's.
 */
import manifestData from "./manifest.json"
import type { Heading } from "../editorial/reading.ts"

export interface ScientificFeatures {
  readonly math: number
  readonly equations: number
  readonly figures: number
  readonly tables: number
  readonly citations: number
  readonly footnotes: number
  readonly callouts: number
  readonly code: number
}

export interface ScientificDocument {
  readonly doc: string
  readonly kind: "entry" | "study" | "demo"
  readonly html: string
  readonly headings: readonly Heading[]
  readonly features: ScientificFeatures
  /** The entry's metadata, derived from the source's front matter. */
  readonly metadata: Record<string, unknown>
}

interface ManifestRecord {
  readonly kind: "entry" | "study" | "demo"
  readonly output: { readonly fragment: string }
  readonly headings: readonly Heading[]
  readonly features: ScientificFeatures
  readonly metadata: Record<string, unknown>
}

const manifest = manifestData as { documents: Record<string, ManifestRecord> }

// Fragments are raw text; each is read only when it is the page's own.
const fragments = import.meta.glob<string>(
  ["/src/science/**/*.html", "/src/design/quarto/*.html", "/src/demos/science/*.html"],
  { query: "?raw", import: "default", eager: true },
)

/** The document registered as `<dir>/<name>`, or undefined. */
export function scientificDocument(doc: string): ScientificDocument | undefined {
  const record = manifest.documents[doc]
  if (record === undefined) return undefined
  const html = fragments[`/${record.output.fragment}`]
  if (html === undefined)
    throw new Error(
      `science: the article ${record.output.fragment} of ${doc} is missing: run npm run science:render -- ${doc}`,
    )
  return {
    doc,
    kind: record.kind,
    html,
    headings: record.headings,
    features: record.features,
    metadata: record.metadata,
  }
}

/** The scientific article behind an editorial entry, by its collection's directory and its ID. */
export const scientificEntry = (directory: string, entryId: string) =>
  scientificDocument(`${directory}/${entryId}`)
