/**
 * Canonical records: organizations (P11). Universities, institutes, laboratories, companies and consortia.
 *
 * EMPTY ON PURPOSE. Add a record only when its facts come from the owner or a source the
 * owner has confirmed, and say so in `provenance`. Never guess a date, a title, a DOI or
 * an affiliation: leave an unknown field out. Field by field: planning/content-model.md.
 */
import type { OrganizationInput } from "../../records/schema.ts"

export const organizations: readonly OrganizationInput[] = []
