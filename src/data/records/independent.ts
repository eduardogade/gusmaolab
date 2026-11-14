/**
 * The records written by hand (P11, D-083; P11-A01, D-089): projects, research areas,
 * organizations and other people. One file per family; every file is a typed list.
 *
 * The owner's own professional history is never written here: the author's CV owns it,
 * and index.ts adds the records derived from its approved public snapshot.
 */
import { people } from "./people.ts"
import { organizations } from "./organizations.ts"
import { researchAreas } from "./research-areas.ts"
import { projects } from "./projects.ts"
import { publications } from "./publications.ts"
import { appointments } from "./appointments.ts"
import { education } from "./education.ts"
import { activities } from "./activities.ts"
import type { RecordsInput } from "../../records/schema.ts"

export const INDEPENDENT_RECORDS: RecordsInput = {
  people,
  organizations,
  researchAreas,
  projects,
  publications,
  appointments,
  education,
  activities,
}
