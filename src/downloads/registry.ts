/**
 * Public downloads (P18, D-127): the model and the rules. A download is a deliberate publication of
 * one file, not a link to something that happens to be in the repository. This file defines what a
 * registered resource is and `validateDownloads` is the gate; src/data/downloads.ts holds the
 * approved resources (none yet) and the planned ones.
 *
 * Two lists, never mixed. An *approved* resource has a file, in an allowed public folder, and a link.
 * A *planned* resource has no path, no file name and no link: it can only be shown as "not yet
 * available", so a missing file cannot be presented as a working download.
 *
 * The unfinished CV is not a candidate: its YAML source can never be a resource (the extensions
 * allowed here exclude it), and a CV PDF is registered only once the owner has approved a version
 * and produced it (the CV workflow, cv/README.md, is a later step).
 *
 * Pure and Node-runnable (erasable TypeScript, D-040). Reading files is src/downloads/files.ts.
 */

export const DOWNLOAD_CATEGORIES = ["cv", "research", "reference", "project"] as const
export type DownloadCategory = (typeof DOWNLOAD_CATEGORIES)[number]

export const CATEGORY_LABELS: Readonly<Record<DownloadCategory, string>> = {
  cv: "Curriculum vitae",
  research: "Research documents",
  reference: "Reference material",
  project: "Project files",
}

/** The only file types a download may be: extension, media type and the name a visitor reads. */
export const FILE_TYPES: Readonly<Record<string, { mediaType: string; label: string }>> = {
  pdf: { mediaType: "application/pdf", label: "PDF" },
  txt: { mediaType: "text/plain", label: "Text" },
  md: { mediaType: "text/markdown", label: "Markdown" },
  csv: { mediaType: "text/csv", label: "CSV" },
}

/**
 * Where a public path may point, and where its file lives in the repository. `/downloads/` is the
 * release's folder (`public/downloads/`, which every build copies). `/demo-downloads/` is the
 * development specimen's: its files sit in src/demos/downloads/ and are served by a route that
 * exists only in development and demonstration builds, so a release never contains them.
 */
export const DOWNLOAD_ROOTS = {
  release: { urlPrefix: "/downloads/", directory: "public/downloads" },
  demo: { urlPrefix: "/demo-downloads/", directory: "src/demos/downloads" },
} as const

export type DownloadRoot = keyof typeof DOWNLOAD_ROOTS

export interface DownloadResource {
  /** Stable, lowercase, never changes with a title: "cv-academic". */
  readonly id: string
  readonly title: string
  /** What the file contains, in a sentence. */
  readonly description: string
  readonly category: DownloadCategory
  /** Where the site serves it: `/downloads/<fileName>`. */
  readonly publicPath: string
  /** The name a visitor's browser saves it as; the last segment of `publicPath`. */
  readonly fileName: string
  readonly mediaType: string
  /** The version of the document, when it has one: "1.2". Never invented. */
  readonly version?: string
  /** The day the owner approved this file for public distribution, `YYYY-MM-DD`. */
  readonly approvedOn: string
}

export interface PlannedDownload {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly category: DownloadCategory
  /** What it is waiting for, in a sentence: "an approved CV version". */
  readonly waitingFor: string
}

/** What a check found out about one resource's file; reading it is files.ts's work. */
export interface FileFact {
  readonly exists: boolean
  readonly size?: number
}

export interface DownloadOptions {
  /** Which public root the resources belong to. Default: the release's. */
  readonly root?: DownloadRoot
}

const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const FILE_NAME = /^[a-z0-9][a-z0-9._-]*\.[a-z0-9]+$/
const DAY = /^\d{4}-\d{2}-\d{2}$/
const VERSION = /^\d+(?:\.\d+){0,2}$/
const SENSITIVE = /proposta|\bcv\.(?:ya?ml|md)\b|identities|manifest|secret|token|password|\bprivate\b|\.env|final-final|v\d+[-_]?final/i

/** The lowercase extension of a file name, without the dot. */
export const extensionOf = (fileName: string): string => fileName.split(".").pop()?.toLowerCase() ?? ""

/** "12 B", "1.4 KB", "2.3 MB": whole bytes below a kilobyte, one decimal above. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Every problem with the registered downloads, as sentences a maintainer can act on. `files` maps a
 * public path to what is known of its file; without it only the registry itself is checked. A
 * resource whose file is missing is an error, never a quietly broken link.
 */
export function validateDownloads(
  approved: readonly DownloadResource[],
  planned: readonly PlannedDownload[],
  files: ReadonlyMap<string, FileFact> | undefined = undefined,
  options: DownloadOptions = {},
): string[] {
  const root = DOWNLOAD_ROOTS[options.root ?? "release"]
  const issues: string[] = []
  const ids = new Set<string>()
  const paths = new Set<string>()
  for (const resource of approved) {
    const at = `download "${resource.id}"`
    if (!ID.test(resource.id)) issues.push(`${at}: the ID must be lowercase words joined by hyphens`)
    if (ids.has(resource.id)) issues.push(`${at}: the ID is used twice`)
    ids.add(resource.id)
    if (resource.title.trim() === "") issues.push(`${at}: it has no title`)
    if (resource.description.trim() === "") issues.push(`${at}: it has no description`)
    if (!(DOWNLOAD_CATEGORIES as readonly string[]).includes(resource.category)) issues.push(`${at}: unknown category "${resource.category}"`)
    if (!DAY.test(resource.approvedOn) || Number.isNaN(Date.parse(resource.approvedOn)))
      issues.push(`${at}: it has no valid approval date (approvedOn, YYYY-MM-DD); a file the owner has not approved is not published`)
    if (resource.version !== undefined && !VERSION.test(resource.version)) issues.push(`${at}: the version "${resource.version}" must look like 1, 1.2 or 1.2.3`)
    // Where it is served.
    if (!resource.publicPath.startsWith(root.urlPrefix))
      issues.push(`${at}: the path ${resource.publicPath} is outside ${root.urlPrefix}, the only folder a download may be served from`)
    if (/\.\.|\/\/|[\s?#\\]/.test(resource.publicPath.slice(1))) issues.push(`${at}: the path ${resource.publicPath} is not a plain path`)
    const last = resource.publicPath.split("/").at(-1) ?? ""
    if (resource.publicPath.slice(root.urlPrefix.length).includes("/")) issues.push(`${at}: the path ${resource.publicPath} is in a subfolder; downloads sit directly in ${root.urlPrefix}`)
    if (resource.fileName !== last) issues.push(`${at}: the file name "${resource.fileName}" is not the end of its path (${last})`)
    if (!FILE_NAME.test(resource.fileName)) issues.push(`${at}: "${resource.fileName}" is not a plain lowercase file name (letters, digits, dot, hyphen, underscore)`)
    if (SENSITIVE.test(resource.fileName) || SENSITIVE.test(resource.publicPath))
      issues.push(`${at}: "${resource.fileName}" looks like a private or unfinished source, or an ambiguous name; give a stable, descriptive public name`)
    if (paths.has(resource.publicPath)) issues.push(`${at}: the path ${resource.publicPath} is another download's path`)
    paths.add(resource.publicPath)
    // What it is.
    const type = FILE_TYPES[extensionOf(resource.fileName)]
    if (type === undefined) issues.push(`${at}: ".${extensionOf(resource.fileName)}" is not an allowed download type (${Object.keys(FILE_TYPES).join(", ")})`)
    else if (type.mediaType !== resource.mediaType) issues.push(`${at}: the media type ${resource.mediaType} does not match ".${extensionOf(resource.fileName)}" (${type.mediaType})`)
    // Whether it exists.
    if (files !== undefined) {
      const fact = files.get(resource.publicPath)
      if (fact === undefined || !fact.exists) issues.push(`${at}: its file is missing; put it at ${resource.publicPath.replace(root.urlPrefix, `${root.directory}/`)} or remove the entry`)
      else if (fact.size === 0) issues.push(`${at}: its file is empty`)
    }
  }
  for (const item of planned) {
    const at = `planned download "${item.id}"`
    if (!ID.test(item.id)) issues.push(`${at}: the ID must be lowercase words joined by hyphens`)
    if (ids.has(item.id)) issues.push(`${at}: the ID is also an approved download's`)
    ids.add(item.id)
    if ("publicPath" in item || "fileName" in item || "href" in item) issues.push(`${at}: a planned download has no path, file name or link`)
    if (item.title.trim() === "" || item.waitingFor.trim() === "") issues.push(`${at}: it needs a title and what it is waiting for`)
    if (!(DOWNLOAD_CATEGORIES as readonly string[]).includes(item.category)) issues.push(`${at}: unknown category "${item.category}"`)
  }
  return issues
}

/** The approved resources of one category, in registry order. */
export const inCategory = <T extends { category: DownloadCategory }>(
  list: readonly T[],
  category: DownloadCategory,
): T[] => list.filter((item) => item.category === category)
