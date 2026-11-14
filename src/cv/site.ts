/**
 * What the site knows of the owner's CV (P11-A01, D-092): the generated public snapshot,
 * or nothing. Pages read CV facts through the canonical records (src/records/), which
 * already include the snapshot's records; this adds only what is not a record: the
 * owner's profile, and which approved version the site shows.
 *
 * Neither is ever read from the CV file: the site cannot see it.
 */
import { CV_SNAPSHOT } from "../data/cv/snapshot.ts"
import type { CvProfile } from "./snapshot.ts"

export interface SiteCv {
  /** True once an approved version has been published. */
  readonly published: boolean
  /** The approved version shown, and the day it was approved. */
  readonly version?: string
  readonly approvedOn?: string
  /** The owner's person record, to pass to `cvProjection`. */
  readonly ownerId?: string
  readonly profile?: CvProfile
}

export const siteCv: SiteCv =
  CV_SNAPSHOT === null
    ? { published: false }
    : {
        published: true,
        version: CV_SNAPSHOT.source.version,
        approvedOn: CV_SNAPSHOT.approvedOn,
        ownerId: CV_SNAPSHOT.ownerId,
        profile: CV_SNAPSHOT.profile,
      }
