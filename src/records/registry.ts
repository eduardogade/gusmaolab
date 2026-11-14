/**
 * The record registry (P11, D-083, D-085): validates a whole dataset and returns it as
 * one frozen, indexed store. A dataset is plain data: eight lists of records. Nothing is
 * read from disk or the network here, so the same function serves the site's own data
 * (src/data/records/), the synthetic fixture and the tests.
 *
 * Validation has two passes:
 *  1. each record against its family's schema (schema.ts);
 *  2. the records against each other: unique IDs, references that exist and name the
 *     right family, hierarchies that do not loop, and provenance the dataset may hold.
 * Every problem is reported, in a stable order, with the record's ID: an invalid dataset
 * never half-loads.
 *
 * Relationships are stored on one side only and derived on the other (selectors.ts): an
 * output names its projects, a project never lists its outputs. Two records may refer to
 * each other through different relations; only a declared hierarchy may not loop.
 */
import { FAMILIES, FAMILY_NAMES, SCHEMAS, familyOfId } from "./schema.ts"
import type {
  Activity,
  AnyRecord,
  Appointment,
  Education,
  Family,
  Organization,
  Person,
  Project,
  Publication,
  RecordOf,
  RecordsInput,
  ResearchArea,
} from "./schema.ts"

export interface RecordsOptions {
  /**
   * Accept records whose provenance is "synthetic". Only fixtures set it: the site's own
   * dataset is loaded without it, so an invented record cannot enter production data.
   */
  readonly allowSynthetic?: boolean
}

/** A validated dataset: every record frozen, by family and by ID. */
export interface Records {
  readonly people: readonly Person[]
  readonly organizations: readonly Organization[]
  readonly researchAreas: readonly ResearchArea[]
  readonly projects: readonly Project[]
  readonly publications: readonly Publication[]
  readonly appointments: readonly Appointment[]
  readonly education: readonly Education[]
  readonly activities: readonly Activity[]
  /** Every record of every family, by ID. */
  readonly byId: ReadonlyMap<string, AnyRecord>
  /** The record with this ID in this family; throws for an unknown ID. */
  get<F extends Family>(family: F, id: string): RecordOf[F]
  /** The same, or undefined. */
  find<F extends Family>(family: F, id: string): RecordOf[F] | undefined
  readonly options: RecordsOptions
}

export class RecordsConfigError extends Error {
  readonly issues: readonly string[]
  constructor(issues: readonly string[]) {
    super(`Invalid canonical records:\n- ${issues.join("\n- ")}`)
    this.name = "RecordsConfigError"
    this.issues = issues
  }
}

type Parsed = { [F in Family]: RecordOf[F][] }

const label = (family: Family, record: unknown, index: number): string => {
  const id = (record as { id?: unknown } | null)?.id
  return typeof id === "string" && id !== "" ? id : `${family}[${index}]`
}

function parse(input: RecordsInput): {
  parsed: Parsed
  issues: string[]
  /** IDs of records that failed their schema: declared, though not loaded. */
  rejected: Map<string, Family>
} {
  const issues: string[] = []
  const rejected = new Map<string, Family>()
  const parsed = Object.fromEntries(
    FAMILY_NAMES.map((family) => [family, []]),
  ) as unknown as Parsed
  if (input === null || typeof input !== "object") {
    return {
      parsed,
      issues: ["the dataset must be an object with a list for each family"],
      rejected,
    }
  }
  for (const key of Object.keys(input)) {
    if (!(key in FAMILIES)) issues.push(`unknown record family "${key}"`)
  }
  for (const family of FAMILY_NAMES) {
    const list = (input as Record<string, unknown>)[family] ?? []
    if (!Array.isArray(list)) {
      issues.push(`${family} must be a list`)
      continue
    }
    list.forEach((record, index) => {
      const result = SCHEMAS[family].safeParse(record)
      if (result.success) {
        ;(parsed[family] as unknown[]).push(result.data)
        return
      }
      const id = (record as { id?: unknown } | null)?.id
      if (typeof id === "string" && familyOfId(id) === family) rejected.set(id, family)
      for (const issue of result.error.issues) {
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : ""
        issues.push(`${label(family, record, index)}: ${path}${issue.message}`)
      }
    })
  }
  return { parsed, issues, rejected }
}

/** Every reference a record makes: the field it is written in, the ID, and the family expected. */
function references(family: Family, record: AnyRecord): [string, string, Family][] {
  const refs: [string, string, Family][] = []
  const one = (field: string, id: string | undefined, target: Family) => {
    if (id !== undefined) refs.push([field, id, target])
  }
  const many = (field: string, ids: readonly string[], target: Family) => {
    for (const id of ids) refs.push([field, id, target])
  }
  switch (family) {
    case "people":
      many("researchAreaIds", (record as Person).researchAreaIds, "researchAreas")
      break
    case "organizations": {
      const r = record as Organization
      one("parentId", r.parentId, "organizations")
      many(
        "relations",
        r.relations.map((x) => x.organizationId),
        "organizations",
      )
      break
    }
    case "researchAreas":
      break
    case "projects": {
      const r = record as Project
      many("researchAreaIds", r.researchAreaIds, "researchAreas")
      many(
        "participants",
        r.participants.map((x) => x.personId),
        "people",
      )
      many("organizationIds", r.organizationIds, "organizations")
      break
    }
    case "publications": {
      const r = record as Publication
      many(
        "authors",
        (r.authors ?? []).flatMap((a) => ("personId" in a ? [a.personId] : [])),
        "people",
      )
      many("creditedTo", r.creditedTo, "people")
      many("projectIds", r.projectIds, "projects")
      many("researchAreaIds", r.researchAreaIds, "researchAreas")
      many(
        "related",
        r.related.map((x) => x.publicationId),
        "publications",
      )
      break
    }
    case "appointments": {
      const r = record as Appointment
      one("personId", r.personId, "people")
      one("organizationId", r.organizationId, "organizations")
      many("projectIds", r.projectIds, "projects")
      break
    }
    case "education": {
      const r = record as Education
      one("personId", r.personId, "people")
      one("institutionId", r.institutionId, "organizations")
      many("supervisorIds", r.supervisorIds, "people")
      break
    }
    case "activities": {
      const r = record as Activity
      one("personId", r.personId, "people")
      if ("organizationId" in r)
        one("organizationId", r.organizationId, "organizations")
      if ("projectIds" in r) many("projectIds", r.projectIds, "projects")
      if (r.type === "presentation")
        many("publicationIds", r.publicationIds, "publications")
      if (r.type === "mentoring") one("menteeId", r.menteeId, "people")
      if (r.type === "award" || r.type === "funding")
        one("grantorId", r.grantorId, "organizations")
      break
    }
  }
  return refs
}

/**
 * Every problem in a dataset, in a stable order. An empty list means the dataset is
 * valid. An empty dataset is valid: having nothing to say is not an error.
 */
export function validateRecords(
  input: RecordsInput,
  options: RecordsOptions = {},
): string[] {
  const { parsed, issues, rejected } = parse(input)
  const ids = new Map<string, Family>()
  for (const family of FAMILY_NAMES) {
    for (const record of parsed[family]) {
      if (ids.has(record.id)) issues.push(`${record.id} is declared more than once`)
      else ids.set(record.id, family)
    }
  }
  for (const family of FAMILY_NAMES) {
    for (const record of parsed[family]) {
      if (record.provenance.status === "synthetic" && options.allowSynthetic !== true) {
        issues.push(
          `${record.id} is synthetic: invented records are for tests and studies, never for the site's data`,
        )
      }
      for (const [field, id, target] of references(family, record)) {
        if (familyOfId(id) !== target) {
          issues.push(
            `${record.id}: ${field} names ${id}, which is not a ${FAMILIES[target]} ID`,
          )
        } else if (ids.get(id) !== target && rejected.get(id) !== target) {
          // A record that exists but failed its own schema is reported once, there: every
          // reference to it is not reported again as missing.
          issues.push(`${record.id}: ${field} names ${id}, which does not exist`)
        }
      }
      if (family === "organizations") {
        const organization = record as Organization
        if (organization.parentId === organization.id) {
          issues.push(`${record.id}: an organization cannot be its own parent`)
        }
        if (organization.relations.some((x) => x.organizationId === organization.id)) {
          issues.push(`${record.id}: an organization cannot be related to itself`)
        }
      }
      if (family === "activities") {
        const activity = record as Activity
        if (activity.type === "mentoring" && activity.menteeId === activity.personId) {
          issues.push(`${record.id}: a person cannot mentor themselves`)
        }
      }
    }
  }
  // The one declared hierarchy: an organization's parents may not loop.
  const parents = new Map(parsed.organizations.map((o) => [o.id, o.parentId]))
  const reported = new Set<string>()
  for (const start of parents.keys()) {
    const seen = [start]
    let next = parents.get(start)
    while (
      next !== undefined &&
      next !== start &&
      parents.has(next) &&
      !seen.includes(next)
    ) {
      seen.push(next)
      next = parents.get(next)
    }
    if (next === start && seen.length > 1) {
      const loop = [...seen].sort().join(" → ")
      if (!reported.has(loop)) {
        reported.add(loop)
        issues.push(
          `organizations form a loop of parents: ${seen.join(" → ")} → ${start}`,
        )
      }
    }
  }
  return issues
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}

/** Validates a dataset and returns it frozen and indexed. Throws, listing every problem. */
export function createRecords(
  input: RecordsInput,
  options: RecordsOptions = {},
): Records {
  const issues = validateRecords(input, options)
  if (issues.length > 0) throw new RecordsConfigError(issues)
  // Parsing again from the caller's input gives fresh objects: the source is never
  // frozen or changed, and two stores never share a record.
  const { parsed } = parse(input)
  const byId = new Map<string, AnyRecord>()
  for (const family of FAMILY_NAMES) {
    for (const record of parsed[family]) byId.set(record.id, deepFreeze(record))
    Object.freeze(parsed[family])
  }
  const find = <F extends Family>(family: F, id: string): RecordOf[F] | undefined => {
    const record = byId.get(id)
    return record !== undefined && familyOfId(id) === family
      ? (record as RecordOf[F])
      : undefined
  }
  return Object.freeze({
    ...parsed,
    byId,
    find,
    get<F extends Family>(family: F, id: string): RecordOf[F] {
      const record = find(family, id)
      if (record === undefined) throw new Error(`no ${FAMILIES[family]} record "${id}"`)
      return record
    },
    options: Object.freeze({ ...options }),
  })
}
