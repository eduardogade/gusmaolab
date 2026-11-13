/**
 * Canonical records: people (P11). People who can be referred to: the owner, co-authors, collaborators.
 * A record is not a profile: `profile` stays "none" unless a public profile is agreed.
 * No email, portrait or private detail belongs here: this repository is public.
 *
 * EMPTY ON PURPOSE. Add a record only when its facts come from the owner or a source the
 * owner has confirmed, and say so in `provenance`. Never guess a date, a title, a DOI or
 * an affiliation: leave an unknown field out. Field by field: planning/content-model.md.
 */
import type { PersonInput } from "../../records/schema.ts"

export const people: readonly PersonInput[] = []
