/**
 * Canonical records: publications (P11). Scholarly outputs: articles, preprints, datasets, software. Authors stay in the
 * order printed; an author without a person record is `{ name: "…" }`.
 *
 * EMPTY ON PURPOSE. Add a record only when its facts come from the owner or a source the
 * owner has confirmed, and say so in `provenance`. Never guess a date, a title, a DOI or
 * an affiliation: leave an unknown field out. Field by field: planning/content-model.md.
 */
import type { PublicationInput } from "../../records/schema.ts"

export const publications: readonly PublicationInput[] = []
