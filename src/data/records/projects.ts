/**
 * Canonical records: projects (P11). Research and engineering projects. A project's outputs are the outputs that name it.
 *
 * EMPTY ON PURPOSE. Add a record only when its facts come from the owner or a source the
 * owner has confirmed, and say so in `provenance`. Never guess a date, a title, a DOI or
 * an affiliation: leave an unknown field out. Field by field: planning/content-model.md.
 */
import type { ProjectInput } from "../../records/schema.ts"

export const projects: readonly ProjectInput[] = []
