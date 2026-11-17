/**
 * The public downloads (P18, D-127): the only list of files the site offers for download. Every
 * entry in `DOWNLOADS` is a file the owner has approved for public distribution and that sits in
 * `public/downloads/`; the build fails if one is missing. `PLANNED_DOWNLOADS` are things the site
 * expects to offer later: they have no file and no link, and are shown only as "not yet available".
 *
 * To publish a file: put it in `public/downloads/` under a stable, descriptive, lowercase name,
 * then add an entry to `DOWNLOADS` (see development/downloads-guide.md). Being in the repository
 * is not approval: `approvedOn` is the day the owner approved it. The unfinished CV and its
 * versioned source files are never a download; a CV document is registered only from a version
 * the owner has approved (development/downloads-guide.md).
 */
import type { DownloadResource, PlannedDownload } from "../downloads/registry.ts"

export const DOWNLOADS: readonly DownloadResource[] = []

export const PLANNED_DOWNLOADS: readonly PlannedDownload[] = [
  {
    id: "cv-pdf",
    title: "Curriculum vitae (PDF)",
    description: "The professional record as a document, made from a CV version the owner has approved.",
    category: "cv",
    waitingFor: "an approved CV version and a document made from it",
  },
]
