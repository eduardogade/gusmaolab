/**
 * Canonical records: activities (P11). Teaching, presentations, mentoring, awards, service and outreach, told apart by `type`.
 *
 * EMPTY ON PURPOSE. Add a record only when its facts come from the owner or a source the
 * owner has confirmed, and say so in `provenance`. Never guess a date, a title, a DOI or
 * an affiliation: leave an unknown field out. Field by field: planning/content-model.md.
 */
import type { ActivityInput } from "../../records/schema.ts"

export const activities: readonly ActivityInput[] = []
