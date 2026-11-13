/**
 * The site's canonical records (P11, D-083): the one authoritative copy of every person,
 * organization, research area, project, scholarly output, appointment, qualification and
 * activity that the site presents. One file per family; every file is a typed list.
 *
 * All eight are empty: P11 built the system, and no verified record has been supplied
 * yet. Synthetic records are refused here; the test fixture lives in
 * src/design/records-fixture.ts and is never part of this dataset.
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

export const PRODUCTION_RECORDS: RecordsInput = {
  people,
  organizations,
  researchAreas,
  projects,
  publications,
  appointments,
  education,
  activities,
}
