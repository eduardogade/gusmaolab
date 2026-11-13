/**
 * The site's canonical records, validated once when the module loads (P11). An invalid
 * dataset throws, which fails the build. Pages and components import from here; they
 * never read src/data/records/ directly and never keep a copy of a record's facts.
 *
 * The site's dataset is loaded without `allowSynthetic`, so an invented record cannot
 * pass. It is empty until the owner supplies verified records (D-087).
 */
import { PRODUCTION_RECORDS } from "../data/records/index.ts"
import { createRecords } from "./registry.ts"

export const siteRecords = createRecords(PRODUCTION_RECORDS)

export { RecordsConfigError, createRecords, validateRecords } from "./registry.ts"
export type { Records, RecordsOptions } from "./registry.ts"
export * from "./selectors.ts"
export * from "./projections.ts"
export { citationOf, doiUrl, isPeerReviewed } from "./citation.ts"
export type { Citation, CitationAuthor } from "./citation.ts"
export {
  PRESENT,
  compareDates,
  formatPartialDate,
  formatPeriod,
  isPartialDate,
  parsePartialDate,
  precisionOf,
  yearOf,
} from "./dates.ts"
export { FAMILIES, FAMILY_NAMES, RECORD_ID_PATTERN, familyOfId } from "./schema.ts"
export type * from "./schema.ts"
