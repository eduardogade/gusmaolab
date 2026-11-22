/**
 * The boundary for the owner's future availability file (P21, D-146). One authoritative file will
 * eventually say when the owner is willing to meet; its path is configured, in one place
 * (`availabilitySourcePath` in src/data/scheduling.ts), and the file itself is supplied later.
 *
 * What exists now is the boundary, and only the boundary:
 *   - `validateSourceReference` says whether a configured path is acceptable;
 *   - `describeSource` says honestly what is known about it (not configured, missing, present but
 *     with no adapter for its format yet), given what a Node script found on disk;
 *   - `AvailabilityAdapter` is the shape the future adapter must have, and `planSync` is the one
 *     entry point, which today reports that it cannot plan anything, because the format is unknown.
 *
 * What does not exist, on purpose: a parser, a schema, a weekly schedule, a sync engine. The file
 * is a statement of *policy*; real bookability also depends on the provider's confirmed bookings,
 * pending holds, connected-calendar conflicts and limits, and the provider is the authority on
 * those. A static file is not a transaction-safe booking database, so nothing here is presented
 * as real-time availability, and no synchronisation may replace the provider's schedule from an
 * unvalidated source, discard a pending or confirmed booking, or run on a timer without an
 * approved operational policy (development/scheduling-guide.md, "The availability file").
 *
 * Public safety: this module never reads a file. The path stays out of the public view and out of
 * every client bundle; the file is never copied under public/.
 *
 * Pure and Node-runnable.
 */

/** A configured source: a file in the repository, or a local path held in an environment variable. */
export type SourceReference =
  | { readonly kind: "repo"; readonly path: string }
  | { readonly kind: "env"; readonly name: string }

const ENV_NAME = /^[A-Z][A-Z0-9_]*$/
/** Places a source may not be: published folders, build output, and the CV (whose sources only the CV tools open). */
const FORBIDDEN_PREFIXES = ["public/", "dist/", "dist-demo/", "src/pages/", "cv/", "node_modules/", ".git/", "brand/"]

/** Why a configured path is unacceptable; empty when it is fine. */
export function validateSourceReference(value: string): string[] {
  const reasons: string[] = []
  if (value.startsWith("env:")) {
    const name = value.slice(4)
    if (!ENV_NAME.test(name)) reasons.push(`"${name}" is not an environment variable name (UPPER_SNAKE_CASE)`)
    if (/^(PUBLIC_|VITE_|ASTRO_)/.test(name))
      reasons.push("a variable with a client-exposed prefix (PUBLIC_, VITE_, ASTRO_) would put the path in the browser")
    return reasons
  }
  if (!value.startsWith("repo:")) return ['it must start with "repo:" (a file in this repository) or "env:" (a variable that holds a local path)']
  const path = value.slice(5)
  if (path === "") return ["the repository path is empty"]
  if (path.startsWith("/") || /^[A-Za-z]:/.test(path)) reasons.push("an absolute path is not portable between machines; use a repository-relative path, or env:NAME")
  if (path.includes("\\")) reasons.push("use forward slashes")
  if (path.split("/").some((part) => part === ".." || part === "." || part === "")) reasons.push('no "..", "." or empty segments')
  const normal = path.replace(/^\.\//, "")
  for (const prefix of FORBIDDEN_PREFIXES)
    if (normal.startsWith(prefix)) reasons.push(`a file under ${prefix} is public, generated or private; the source must not live there`)
  return reasons
}

/** The parsed reference. Call `validateSourceReference` first. */
export function parseSourceReference(value: string): SourceReference {
  return value.startsWith("env:") ? { kind: "env", name: value.slice(4) } : { kind: "repo", path: value.slice(5) }
}

export type SourceStatus =
  /** Nothing configured: the provider's own settings are the temporary authority. */
  | "not-configured"
  /** Configured but the variable is unset, or the file is not there yet. */
  | "missing"
  /** The file exists, but no adapter understands its format yet. */
  | "present-no-adapter"

export interface SourceDescription {
  readonly status: SourceStatus
  /** A sentence for the maintainer. Never shown to visitors, and never contains the file's content. */
  readonly message: string
}

/** What a Node script found: whether a reference resolves to an existing file. */
export interface SourceProbe {
  /** For `env:` references: whether the variable is set. Ignored for `repo:`. */
  readonly variableSet?: boolean
  /** Whether the resolved file exists. */
  readonly fileExists: boolean
}

export function describeSource(reference: string | undefined, probe?: SourceProbe): SourceDescription {
  if (reference === undefined)
    return {
      status: "not-configured",
      message:
        "No availability file is configured. The provider's own availability is the temporary authority, and the page offers no times of its own.",
    }
  const parsed = parseSourceReference(reference)
  if (parsed.kind === "env" && probe?.variableSet === false)
    return { status: "missing", message: `The environment variable ${parsed.name} is not set on this machine, so no file can be read.` }
  if (probe === undefined || !probe.fileExists)
    return {
      status: "missing",
      message: "The configured availability file does not exist yet. Nothing is synchronised, and no availability is invented in its place.",
    }
  return {
    status: "present-no-adapter",
    message:
      "The availability file exists, but its format has not been given to an adapter, so nothing is read or synchronised. (P21 prepares the boundary; the owner's format comes first.)",
  }
}

/** A permitted meeting window, once an adapter can read the owner's format. */
export interface AvailabilityWindow {
  /** IANA zone the window is defined in. */
  readonly zone: string
  /** ISO 8601 local start and end, in `zone`. */
  readonly start: string
  readonly end: string
}

/**
 * What the future adapter will be: it reads the owner's file and says which windows are permitted
 * (policy), then plans provider-supported rules from them. It never applies anything: applying is a
 * separate, deliberate, reported step that the owner runs, after a dry run.
 */
export interface AvailabilityAdapter {
  /** A short ID for the format it reads. */
  readonly id: string
  parse(text: string): { windows: readonly AvailabilityWindow[]; unsupported: readonly string[] }
}

export interface SyncPlan {
  /** Always false until an adapter exists and the owner runs an approved synchronisation. */
  readonly applied: false
  readonly dryRun: true
  readonly reason: string
}

/** The one entry point for a future synchronisation. Today: it cannot plan, and it changes nothing. */
export function planSync(adapter: AvailabilityAdapter | undefined): SyncPlan {
  return {
    applied: false,
    dryRun: true,
    reason:
      adapter === undefined
        ? "There is no adapter for the owner's availability file yet; nothing was planned or changed."
        : "An adapter can read the file, but synchronisation has no approved operational policy yet; nothing was changed.",
  }
}
