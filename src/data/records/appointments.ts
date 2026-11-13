/**
 * Canonical records: appointments (P11). Positions held at organizations. `period.end: "present"` marks an ongoing one;
 * a missing end is simply not recorded.
 *
 * EMPTY ON PURPOSE. Add a record only when its facts come from the owner or a source the
 * owner has confirmed, and say so in `provenance`. Never guess a date, a title, a DOI or
 * an affiliation: leave an unknown field out. Field by field: planning/content-model.md.
 */
import type { AppointmentInput } from "../../records/schema.ts"

export const appointments: readonly AppointmentInput[] = []
