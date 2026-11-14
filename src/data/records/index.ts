/**
 * The site's canonical records (P11, D-083): the one authoritative copy of every person,
 * organization, research area, project, scholarly output, appointment, qualification and
 * activity that the site presents. They have two sources, and no fact has both:
 *
 * - independent.ts: the records written by hand in this folder (projects, research areas,
 *   organizations, other people). All eight lists are empty: no verified record has been
 *   supplied yet.
 * - ../cv/snapshot.ts: the records derived from the owner's CV, which owns the owner's
 *   professional history (P11-A01, D-089). It is `null` until the owner approves a
 *   version, and then it is generated, never edited.
 *
 * `mergeRecords` joins the two and refuses a fact stated on both sides. Synthetic records
 * are refused here; the test fixture lives in src/design/records-fixture.ts and is never
 * part of this dataset.
 */
import { mergeRecords } from "../../cv/snapshot.ts"
import { CV_SNAPSHOT } from "../cv/snapshot.ts"
import { INDEPENDENT_RECORDS } from "./independent.ts"
import type { RecordsInput } from "../../records/schema.ts"

export { INDEPENDENT_RECORDS }

export const PRODUCTION_RECORDS: RecordsInput = mergeRecords(
  INDEPENDENT_RECORDS,
  CV_SNAPSHOT,
)
