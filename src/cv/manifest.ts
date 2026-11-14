/**
 * Which CV file is which (P11-A01, D-090): the working file the author is editing, and
 * the version the author has approved for publication, if any. Both are named explicitly
 * in cv/manifest.json. Nothing here looks at a directory: the newest file is never
 * picked, a working file is never promoted, and a file is never renamed.
 *
 * Source authority is not publication approval. `metadados.fonte_de_verdade: true` says
 * the file is the authoritative CV; it says nothing about whether its content has been
 * reviewed or may be shown. Publication needs every one of:
 *  1. `publishEnabled: true`;
 *  2. a `published` entry naming an explicitly created version file (`CV-vX.Y.yaml`),
 *     which is never the working file;
 *  3. that file's SHA-256, so a file edited after approval is not published by accident;
 *  4. the version the owner approved, equal to the file's own `metadados.versao`;
 *  5. the date of the approval.
 *
 * Plain data and pure functions: this module reads no file.
 */
import { isPartialDate } from "../records/dates.ts"
import { VERSION_FILE, fileNameVersion, versionsAgree } from "./versions.ts"

/**
 * The contact fields an approval may release, one by one. They are public profile links.
 * An email address, a telephone number and a location are not in this list on purpose:
 * this path can never publish them.
 */
export const PUBLIC_CONTACT_FIELDS = [
  "orcid",
  "lattes",
  "linkedin",
  "github",
  "google_scholar",
  "site",
  "researchgate",
] as const
export type PublicContactField = (typeof PUBLIC_CONTACT_FIELDS)[number]

export interface CvApproval {
  /** The approved version file, relative to cv/. */
  readonly file: string
  /** The version approved: the file's `metadados.versao`. */
  readonly version: string
  /** The SHA-256 of the file as approved. */
  readonly sha256: string
  /** The day the owner approved it, YYYY-MM-DD. */
  readonly approvedOn: string
  /** The contact fields the owner releases. None by default. */
  readonly contact: readonly PublicContactField[]
}

export interface CvManifest {
  /** The file the author is editing, relative to cv/; null when there is none. */
  readonly workingFile: string | null
  /** The version approved for publication; null until the owner approves one. */
  readonly published: CvApproval | null
  /** The switch: false keeps every CV fact off the site, whatever else is set. */
  readonly publishEnabled: boolean
}

const isMapping = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)

const safePath = (value: unknown): value is string =>
  typeof value === "string" &&
  value !== "" &&
  !value.startsWith("/") &&
  !value.split("/").includes("..") &&
  !value.includes("\\")

/** Every problem in a manifest. An empty list means it can be used. */
export function manifestIssues(value: unknown): string[] {
  if (!isMapping(value)) return ["the manifest must be an object"]
  const issues: string[] = []
  const known = ["workingFile", "published", "publishEnabled"]
  for (const key of Object.keys(value)) {
    if (!known.includes(key)) issues.push(`unknown manifest field "${key}"`)
  }
  if (value.workingFile !== null && !safePath(value.workingFile))
    issues.push("workingFile must be null or a path inside cv/")
  if (typeof value.publishEnabled !== "boolean")
    issues.push("publishEnabled must be true or false")
  const published = value.published
  if (published === null) {
    if (value.publishEnabled === true)
      issues.push("publishEnabled is true, but no published version is named")
    return issues
  }
  if (!isMapping(published)) {
    issues.push("published must be null or an approval")
    return issues
  }
  const fields = ["file", "version", "sha256", "approvedOn", "contact"]
  for (const key of Object.keys(published)) {
    if (!fields.includes(key)) issues.push(`unknown approval field "${key}"`)
  }
  const { file, version, sha256, approvedOn, contact } = published
  if (!safePath(file)) {
    issues.push("published.file must be a path inside cv/")
  } else {
    if (!VERSION_FILE.test(file.split("/").at(-1) ?? ""))
      issues.push(
        `published.file must be an explicitly created version named CV-vX.Y.yaml, not "${file}"`,
      )
    if (file === value.workingFile)
      issues.push("the working file is never the published version")
    const named = fileNameVersion(file)
    if (
      named !== undefined &&
      typeof version === "string" &&
      !versionsAgree(named, version)
    )
      issues.push(
        `published.file says version ${named}, published.version says ${version}`,
      )
  }
  if (typeof version !== "string" || !/^\d+(?:\.\d+){1,2}$/.test(version))
    issues.push("published.version must be a version such as 1.0 or 1.0.0")
  if (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/.test(sha256))
    issues.push("published.sha256 must be the file's SHA-256, in lowercase hex")
  if (
    typeof approvedOn !== "string" ||
    !isPartialDate(approvedOn) ||
    approvedOn.length !== 10
  )
    issues.push("published.approvedOn must be the approval date, YYYY-MM-DD")
  if (
    !Array.isArray(contact) ||
    contact.some((x) => !(PUBLIC_CONTACT_FIELDS as readonly unknown[]).includes(x)) ||
    new Set(contact).size !== contact.length
  )
    issues.push(
      `published.contact must list, once each, only: ${PUBLIC_CONTACT_FIELDS.join(", ")}`,
    )
  return issues
}

/** What is known about a file on disk, for comparing with an approval. */
export interface SourceFacts {
  readonly version: string | undefined
  readonly sha256: string
}

export interface PublicationDecision {
  readonly approved: boolean
  /** Why not, in the owner's terms. Empty when approved. */
  readonly reasons: string[]
}

/**
 * May CV data be published? `source` is the approved file as it is on disk now; leave it
 * out to ask only what the manifest says. The answer is never inferred from the file's
 * name, from `fonte_de_verdade`, from its review status or from how complete it looks.
 */
export function publicationDecision(
  manifest: CvManifest,
  source?: SourceFacts,
): PublicationDecision {
  const reasons = manifestIssues(manifest)
  if (reasons.length > 0) return { approved: false, reasons }
  if (!manifest.publishEnabled)
    reasons.push("publication is switched off (publishEnabled)")
  if (manifest.published === null) reasons.push("the owner has approved no version")
  if (manifest.published !== null && source !== undefined) {
    if (source.sha256 !== manifest.published.sha256)
      reasons.push(
        `${manifest.published.file} has changed since it was approved: approve it again`,
      )
    if (source.version === undefined || source.version !== manifest.published.version)
      reasons.push(
        `the approved version is ${manifest.published.version}, the file states ${source.version ?? "none"}`,
      )
  }
  return { approved: reasons.length === 0, reasons }
}

// --- Identities ---------------------------------------------------------------------------

/**
 * The identity map (cv/identities.json): the explicit link between a record's identifier
 * in the CV ("4.1.1", which follows the document's numbering and may change) and its
 * permanent ID on the site ("publication-…"). An identity is written by hand, once; it is
 * never derived from a position, a title or a DOI. A record without one is not projected.
 */
export interface CvIdentities {
  /** The owner's person ID; null until it is assigned. */
  readonly owner: string | null
  /** `<list key>/<source id>` → record ID. */
  readonly records: Readonly<Record<string, string>>
}
