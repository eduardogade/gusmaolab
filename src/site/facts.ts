/**
 * The material the content states are derived from (P17, D-122): the canonical records, through the
 * P11 projections, and, from site.ts, the editorial collections' published entry counts. Pages read
 * their records through `recordViews()` and never keep a copy of a fact.
 *
 * Only shown records count and appear (src/records/selectors.ts `isShown`), and the site's own
 * dataset refuses synthetic records, so nothing invented can make a page "ready". A fixture
 * can be passed in for a test or the development specimen, and only there.
 *
 * Pure of Astro: Node runs it (D-040). The CV comes only from the approved snapshot
 * (src/data/cv/snapshot.ts, generated); no page or module here opens a CV file.
 */
import { CV_SNAPSHOT } from "../data/cv/snapshot.ts"
import { cvProjection, labProjection, portfolioProjection, siteRecords } from "../records/index.ts"
import type { CvProjection, LabProjection, PortfolioProject, Records } from "../records/index.ts"
import { siteChannels } from "../contact/index.ts"
import { siteScheduling } from "../scheduling/index.ts"
import type { PageFacts } from "./coverage.ts"
import type { RecordsKey } from "./destinations.ts"

/** What the records pages draw from. `cv` is null while no CV version is approved. */
export interface RecordViews {
  readonly portfolio: readonly PortfolioProject[]
  readonly lab: LabProjection
  readonly cv: CvProjection | null
}

/**
 * The projections of a record store. `ownerId` names the person whose CV the `cv` view is; without
 * one (no approved CV snapshot) there is no CV view, and the CV pages are in preparation.
 */
export function recordViews(records: Records, ownerId?: string): RecordViews {
  return {
    portfolio: portfolioProjection(records),
    lab: labProjection(records),
    cv: ownerId === undefined ? null : cvProjection(records, ownerId),
  }
}

/** The site's own views: the production records and, if the owner approved one, the CV snapshot. */
export const siteRecordViews = (): RecordViews =>
  recordViews(siteRecords, CV_SNAPSHOT?.ownerId)

/** How many shown records stand behind each records destination. */
export function recordCounts(views: RecordViews): Partial<Record<RecordsKey, number>> {
  const cv = views.cv
  return {
    portfolio: views.portfolio.length,
    "lab-people": views.lab.people.length,
    "lab-areas": views.lab.areas.length,
    "lab-partners": views.lab.organizations.length,
    "cv-teaching": cv?.teaching.length ?? 0,
    "cv-research": (cv?.appointments.length ?? 0) + (cv?.projects.length ?? 0),
    "cv-publications": cv?.publications.length ?? 0,
    "cv-talks": cv?.presentations.length ?? 0,
    "cv-mentoring": cv?.mentoring.length ?? 0,
    "cv-awards": cv?.awards.length ?? 0,
    "cv-service": cv?.service.length ?? 0,
    "cv-outreach": cv?.outreach.length ?? 0,
  }
}

/** The facts for the derivation: the editorial counts (from site.ts) and the record counts. */
export function pageFacts(
  editorial: Readonly<Record<string, number>>,
  views: RecordViews = siteRecordViews(),
  contact: number = siteChannels.length,
  scheduling: boolean = siteScheduling.state === "ready",
): PageFacts {
  return { editorial, records: recordCounts(views), contact, scheduling }
}
