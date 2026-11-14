/**
 * The public CV snapshot (P11-A01, D-092): what the website knows of the owner's CV.
 *
 * The author's CV file is private and is not in the repository, so a build (GitHub
 * Actions included) cannot read it. What the build reads instead is a snapshot: the
 * records and the profile that the adapter derives from one approved version, through
 * its allowlist, written to src/data/cv/snapshot.ts by the CV tool. A snapshot is a
 * generated derivative. Nobody edits it; to change a fact, the author changes the CV,
 * approves a version and generates the snapshot again.
 *
 * Until the owner approves a version there is no snapshot (`null`), and the site simply
 * has no CV data: nothing breaks.
 *
 * This module is what the site imports. It has no parser and reads no file.
 */
import { isPartialDate } from "../records/dates.ts"
import { FAMILY_NAMES } from "../records/schema.ts"
import type { RecordsInput } from "../records/schema.ts"

/**
 * The owner's profile: what the CV says of the owner that is not a record of a family.
 * Text is in the language of the CV (`language`), as written.
 */
export interface CvProfile {
  readonly personId: string
  /** The language of the CV's text, such as "pt-BR". */
  readonly language?: string
  readonly name: string
  /** The name as used abroad, when the CV gives one. */
  readonly internationalName?: string
  readonly title?: string
  readonly summary?: string
  readonly expertise: readonly string[]
  readonly keywords: readonly string[]
  readonly languages: readonly {
    readonly language: string
    readonly proficiency?: string
  }[]
  readonly skills: readonly {
    readonly group: string
    readonly items: readonly string[]
  }[]
}

export interface CvSnapshot {
  /** The approved file this was generated from. The file itself is not in the repository. */
  readonly source: {
    readonly file: string
    readonly version: string
    /** The SHA-256 of that file: a fingerprint, to tell whether the snapshot is current. */
    readonly sha256: string
  }
  /** The day the owner approved that version. */
  readonly approvedOn: string
  readonly ownerId: string
  /** CV-derived records, in the shapes of the canonical record families. */
  readonly records: RecordsInput
  readonly profile: CvProfile
}

export class CvIntegrationError extends Error {
  readonly issues: readonly string[]
  constructor(issues: readonly string[]) {
    super(`Invalid CV integration:\n- ${issues.join("\n- ")}`)
    this.name = "CvIntegrationError"
    this.issues = issues
  }
}

/** Keys that exist only in the author's file. Their presence means raw source leaked. */
const SOURCE_ONLY_KEYS =
  /^(?:modelo_sem_vinculos|texto_sem_vinculos|fonte|fonte_email|email|telefone|email_historico|contato_atual_e_autorizacao|orientando|avaliacao_final|valor_e_condicoes|marcadores|motivo)$/

function walk(value: unknown, path: string, visit: (v: unknown, p: string) => void) {
  visit(value, path)
  if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`, visit))
  else if (value !== null && typeof value === "object")
    for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`, visit)
}

/**
 * Every reason a snapshot may not be used. It re-checks, on the site's side, what the
 * generator promises: an approval, only verified public records that name their source,
 * no unresolved placeholder and no field of the raw file anywhere.
 */
export function snapshotIssues(snapshot: CvSnapshot): string[] {
  const issues: string[] = []
  const s = snapshot as Partial<CvSnapshot> | null
  if (s === null || typeof s !== "object") return ["the snapshot must be an object"]
  if (
    typeof s.source?.file !== "string" ||
    typeof s.source.version !== "string" ||
    !/^[0-9a-f]{64}$/.test(String(s.source.sha256))
  )
    issues.push("the snapshot does not say which approved file it was generated from")
  if (
    typeof s.approvedOn !== "string" ||
    !isPartialDate(s.approvedOn) ||
    s.approvedOn.length !== 10
  )
    issues.push("the snapshot does not carry the date of the owner's approval")
  if (typeof s.ownerId !== "string" || !s.ownerId.startsWith("person-"))
    issues.push("the snapshot does not name the owner's person record")
  if (s.profile === undefined || s.profile.personId !== s.ownerId)
    issues.push("the snapshot's profile is not the owner's")
  const records = (s.records ?? {}) as Record<string, unknown>
  for (const key of Object.keys(records)) {
    if (!(FAMILY_NAMES as string[]).includes(key))
      issues.push(`the snapshot has an unknown record family "${key}"`)
  }
  if (((records.projects as unknown[] | undefined) ?? []).length > 0)
    issues.push(
      "the snapshot holds a project: the CV relates outputs to the site's projects, it does not describe them",
    )
  for (const family of FAMILY_NAMES) {
    const list = records[family] ?? []
    if (!Array.isArray(list)) {
      issues.push(`the snapshot's ${family} is not a list`)
      continue
    }
    for (const record of list as Record<string, unknown>[]) {
      const id = String(record?.id)
      const provenance = record?.provenance as Record<string, unknown> | undefined
      if (provenance?.status !== "verified" || record.visibility !== "public")
        issues.push(`${id}: a snapshot holds only public, verified records`)
      if (typeof provenance?.source !== "string")
        issues.push(`${id}: the record does not name its source`)
      if (family !== "people" && typeof provenance?.sourceId !== "string")
        issues.push(`${id}: the record does not carry its identifier in the CV`)
    }
  }
  walk({ records, profile: s.profile }, "snapshot", (value, path) => {
    if (typeof value === "string" && /\{\{|\}\}/.test(value))
      issues.push(`${path} holds an unresolved placeholder`)
    const key = path.split(".").at(-1) ?? ""
    if (SOURCE_ONLY_KEYS.test(key))
      issues.push(`${path} is a field of the raw CV file, not of a public record`)
  })
  return issues
}

const listOf = (input: RecordsInput, family: string): Record<string, unknown>[] =>
  [
    ...(((input as Record<string, unknown>)[family] as unknown[] | undefined) ?? []),
  ] as Record<string, unknown>[]

/**
 * The site's records: the independent ones (src/data/records/) and those derived from the
 * CV snapshot, as one dataset. The two never state the same fact twice:
 * - an ID exists on one side only;
 * - the owner's person record, education, appointments, activities and scholarly outputs
 *   belong to the CV. Writing one by hand in src/data/records/ is an error.
 * Other records (projects, research areas, organizations, other people) stay independent.
 * Throws, listing every problem. Without a snapshot the independent records pass through.
 */
export function mergeRecords(
  independent: RecordsInput,
  snapshot: CvSnapshot | null,
): RecordsInput {
  if (snapshot === null) return independent
  const issues = snapshotIssues(snapshot)
  if (issues.length > 0) throw new CvIntegrationError(issues)
  const owner = snapshot.ownerId
  const derivedIds = new Set(
    FAMILY_NAMES.flatMap((f) => listOf(snapshot.records, f).map((r) => String(r.id))),
  )
  for (const family of FAMILY_NAMES) {
    for (const record of listOf(independent, family)) {
      const id = String(record.id)
      if (derivedIds.has(id))
        issues.push(
          `${id} is in src/data/records/ and in the CV snapshot: a fact has one source`,
        )
      const ownsIt =
        (family === "people" && id === owner) ||
        (["education", "appointments", "activities"].includes(family) &&
          record.personId === owner) ||
        (family === "publications" &&
          (((record.creditedTo as string[] | undefined) ?? []).includes(owner) ||
            ((record.authors as { personId?: string }[] | undefined) ?? []).some(
              (a) => a.personId === owner,
            )))
      if (ownsIt && !derivedIds.has(id))
        issues.push(
          `${id} states a fact of the owner's CV by hand: it belongs in the CV file, which owns it`,
        )
    }
  }
  if (issues.length > 0) throw new CvIntegrationError(issues)
  return Object.fromEntries(
    FAMILY_NAMES.map((family) => [
      family,
      [...listOf(independent, family), ...listOf(snapshot.records, family)],
    ]),
  ) as RecordsInput
}
