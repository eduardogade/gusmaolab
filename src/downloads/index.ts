/**
 * The site's downloads, validated once when the module loads (P18, D-127): an invalid, unapproved or
 * missing file throws, which fails the build with the problem named. Pages import from here and
 * never read src/data/downloads.ts directly.
 */
import { DOWNLOADS, PLANNED_DOWNLOADS } from "../data/downloads.ts"
import { factsOf } from "./files.ts"
import { validateDownloads } from "./registry.ts"
import type { DownloadResource, PlannedDownload } from "./registry.ts"

export class DownloadsConfigError extends Error {
  readonly issues: readonly string[]
  constructor(issues: readonly string[]) {
    super(`Invalid downloads:\n- ${issues.join("\n- ")}`)
    this.name = "DownloadsConfigError"
    this.issues = issues
  }
}

const issues = validateDownloads(DOWNLOADS, PLANNED_DOWNLOADS, factsOf(DOWNLOADS))
if (issues.length > 0) throw new DownloadsConfigError(issues)

export const siteDownloads: readonly DownloadResource[] = DOWNLOADS
export const sitePlannedDownloads: readonly PlannedDownload[] = PLANNED_DOWNLOADS
export * from "./registry.ts"
export { sizeOf, checksumOf, fileOf } from "./files.ts"
