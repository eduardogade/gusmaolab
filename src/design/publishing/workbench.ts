/**
 * The development Publishing Workbench's addresses and its one source of facts (P14, D-110).
 * The workbench is read-only: it explains the authoring commands and shows real output, and it
 * has no button that changes a file. Everything it lists comes from src/editorial/authoring.ts,
 * src/editorial/collections.ts and the schemas, so it cannot drift from the command line.
 *
 * Routed only when src/editorial/demo.ts says so (the dev server and the demonstration build);
 * a release build has none of these pages. Erasable TypeScript only (D-040).
 */
import { COLLECTIONS, collectionPrefix } from "../../editorial/collections.ts"
import {
  COLLECTION_FIELDS,
  COMMANDS,
  PREFLIGHT_CHECKS,
  formatsOf,
  registrationPath,
  sourcePath,
} from "../../editorial/authoring.ts"

export const WORKBENCH_ROOT = "/_design/publishing/"
export const WORKFLOW_PAGE = `${WORKBENCH_ROOT}workflow/`
export const DRAFT_PAGE = `${WORKBENCH_ROOT}draft-example/`
export const DRAFT_SLUG = "an-example-of-the-publishing-workflow"

/** One collection as the workbench describes it. */
export interface CollectionCard {
  readonly id: string
  readonly label: string
  readonly formats: readonly string[]
  readonly sources: readonly string[]
  readonly prefix: string
  readonly required: readonly string[]
  readonly optional: readonly string[]
}

export const collectionCards = (): CollectionCard[] =>
  COLLECTIONS.map((collection) => {
    const fields = COLLECTION_FIELDS[collection.id]
    const formats = formatsOf(collection.id)
    return {
      id: collection.id,
      label: collection.label,
      formats,
      sources: formats.map((format) =>
        format === "qmd"
          ? `${sourcePath(collection.id, "<slug>", "qmd")} (registered in ${registrationPath(collection.id, "<slug>")}, generated)`
          : sourcePath(collection.id, "<slug>", "md"),
      ),
      prefix: `${collectionPrefix(collection)}<slug>/`,
      required: ["title", "status", "slug", ...fields.filter((f) => f.required).map((f) => f.key)],
      optional: fields.filter((f) => !f.required).map((f) => f.key),
    }
  })

/** The checks grouped as the checklist shows them. */
export function checklist() {
  const groups = new Map<string, typeof PREFLIGHT_CHECKS[number][]>()
  for (const check of PREFLIGHT_CHECKS) {
    const list = groups.get(check.group) ?? []
    list.push(check)
    groups.set(check.group, list)
  }
  return [...groups.entries()].map(([group, checks]) => ({ group, checks }))
}

export const SEVERITY_TEXT = {
  error: "always blocks",
  critical: "blocks publication; a warning in a draft",
  warning: "reported, never blocks",
} as const

export { COMMANDS }
