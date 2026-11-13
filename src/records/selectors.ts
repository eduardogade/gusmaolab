/**
 * Selectors over a validated record store (P11, D-086): the questions pages ask, answered
 * from the one copy of each record. Every relationship is stored on one side and derived
 * here on the other: a project's outputs are the outputs that name it.
 *
 * - Pure and deterministic: the same store gives the same answer, in the same order.
 * - Nothing is changed: stores are frozen, and every list returned is a new array.
 * - Public by default: a selector returns only records that may be shown (isShown), unless
 *   it is asked for everything with `{ includeHidden: true }`, which only tools and tests
 *   should do.
 * - A missing optional relationship is an empty list or undefined, never a placeholder.
 */
import { PRESENT, compareDates } from "./dates.ts"
import type { Period } from "./dates.ts"
import type { Records } from "./registry.ts"
import type {
  Activity,
  ActivityOf,
  ActivityType,
  AnyRecord,
  Appointment,
  Education,
  Organization,
  Person,
  Project,
  Publication,
  ResearchArea,
} from "./schema.ts"

export interface Audience {
  /** Also return records that are hidden or not yet verified. Never for a public page. */
  readonly includeHidden?: boolean
}

/**
 * May this record be shown on the site? It must be marked public, and its facts must be
 * verified. A synthetic record counts only in a store that allows synthetic data: a
 * fixture. This decides rendering only: the repository is public, so it hides nothing.
 */
export function isShown(records: Records, record: AnyRecord): boolean {
  if (record.visibility !== "public") return false
  const status = record.provenance.status
  return (
    status === "verified" ||
    (status === "synthetic" && records.options.allowSynthetic === true)
  )
}

const visible = <T extends AnyRecord>(
  records: Records,
  list: readonly T[],
  audience: Audience = {},
): T[] =>
  audience.includeHidden === true ? [...list] : list.filter((r) => isShown(records, r))

// --- Orders -------------------------------------------------------------------------------

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
/** Newest first; a record without a date comes last. */
const newestFirst = (a: string | undefined, b: string | undefined): number =>
  a === b ? 0 : a === undefined ? 1 : b === undefined ? -1 : compareDates(b, a)
const ongoingFirst = (a: Period | undefined, b: Period | undefined): number =>
  Number(b?.end === PRESENT) - Number(a?.end === PRESENT)

const PROJECT_ORDER = { active: 0, planned: 1, completed: 2, archived: 3 } as const

/** Outputs: newest first, then by title; undated ones last. The ID breaks every tie. */
export const comparePublications = (a: Publication, b: Publication): number =>
  newestFirst(a.date, b.date) || byText(a.title, b.title) || byText(a.id, b.id)

/** Projects: active, planned, completed, archived; then the latest start first; then title. */
export const compareProjects = (a: Project, b: Project): number =>
  PROJECT_ORDER[a.status] - PROJECT_ORDER[b.status] ||
  newestFirst(a.period?.start, b.period?.start) ||
  byText(a.title, b.title) ||
  byText(a.id, b.id)

/** Positions: current ones first, then the latest start first. */
export const compareAppointments = (a: Appointment, b: Appointment): number =>
  ongoingFirst(a.period, b.period) ||
  newestFirst(a.period?.start, b.period?.start) ||
  byText(a.id, b.id)

/** Qualifications: in progress first, then the latest completion, then the latest start. */
export const compareEducation = (a: Education, b: Education): number =>
  Number(b.status === "in-progress") - Number(a.status === "in-progress") ||
  newestFirst(a.completionDate, b.completionDate) ||
  newestFirst(a.startDate, b.startDate) ||
  byText(a.id, b.id)

/** The period of an activity that lasts (teaching, mentoring, service), else undefined. */
export function activityPeriod(activity: Activity): Period | undefined {
  switch (activity.type) {
    case "teaching":
    case "mentoring":
    case "service":
      return activity.period
    default:
      return undefined
  }
}

/** When an activity happened, for ordering: its date, or the start of its period. */
export function activityDate(activity: Activity): string | undefined {
  switch (activity.type) {
    case "presentation":
    case "award":
    case "outreach":
      return activity.date
    default:
      return activity.period?.start
  }
}

/** Activities: ongoing first, then newest first; undated ones last. */
export const compareActivities = (a: Activity, b: Activity): number =>
  ongoingFirst(activityPeriod(a), activityPeriod(b)) ||
  newestFirst(activityDate(a), activityDate(b)) ||
  byText(a.id, b.id)

export const comparePeople = (a: Person, b: Person): number =>
  byText(a.sortName ?? a.displayName, b.sortName ?? b.displayName) || byText(a.id, b.id)

const byTitle = (
  a: { title: string; id: string },
  b: { title: string; id: string },
): number => byText(a.title, b.title) || byText(a.id, b.id)

// --- Research areas, projects and outputs -------------------------------------------------

export function researchAreas(records: Records, audience?: Audience): ResearchArea[] {
  return visible(records, records.researchAreas, audience).sort(byTitle)
}

export function projects(records: Records, audience?: Audience): Project[] {
  return visible(records, records.projects, audience).sort(compareProjects)
}

export function publications(records: Records, audience?: Audience): Publication[] {
  return visible(records, records.publications, audience).sort(comparePublications)
}

export function projectsInArea(
  records: Records,
  areaId: string,
  audience?: Audience,
): Project[] {
  return projects(records, audience).filter((p) => p.researchAreaIds.includes(areaId))
}

export function publicationsInArea(
  records: Records,
  areaId: string,
  audience?: Audience,
): Publication[] {
  return publications(records, audience).filter((p) =>
    p.researchAreaIds.includes(areaId),
  )
}

/** A project's outputs: derived from the outputs that name the project. */
export function publicationsOfProject(
  records: Records,
  projectId: string,
  audience?: Audience,
): Publication[] {
  return publications(records, audience).filter((p) => p.projectIds.includes(projectId))
}

export function areasOf(
  records: Records,
  record: { researchAreaIds: readonly string[] },
  audience?: Audience,
): ResearchArea[] {
  return researchAreas(records, audience).filter((area) =>
    record.researchAreaIds.includes(area.id),
  )
}

/**
 * Outputs tied to this one, in both directions: the ones it names, and the ones that name
 * it (a preprint names its article; the article finds its preprint here).
 */
export function relatedOutputs(
  records: Records,
  publicationId: string,
  audience?: Audience,
): { relation: string; direction: "from" | "to"; publication: Publication }[] {
  const shown = new Map(publications(records, audience).map((p) => [p.id, p]))
  const own = records.find("publications", publicationId)
  const out: {
    relation: string
    direction: "from" | "to"
    publication: Publication
  }[] = []
  for (const entry of own?.related ?? []) {
    const publication = shown.get(entry.publicationId)
    if (publication !== undefined)
      out.push({ relation: entry.relation, direction: "to", publication })
  }
  for (const publication of shown.values()) {
    for (const entry of publication.related) {
      if (entry.publicationId === publicationId)
        out.push({ relation: entry.relation, direction: "from", publication })
    }
  }
  return out
}

// --- People -------------------------------------------------------------------------------

export function people(records: Records, audience?: Audience): Person[] {
  return visible(records, records.people, audience).sort(comparePeople)
}

/** People who have agreed to a dedicated profile. Being an author is not enough. */
export function profiledPeople(records: Records, audience?: Audience): Person[] {
  return people(records, audience).filter((person) => person.profile === "public")
}

/** The outputs a person authored, wherever they stand in the author list. */
export function publicationsByPerson(
  records: Records,
  personId: string,
  audience?: Audience,
): Publication[] {
  return publications(records, audience).filter((p) =>
    p.authors.some((author) => "personId" in author && author.personId === personId),
  )
}

export function projectsOfPerson(
  records: Records,
  personId: string,
  audience?: Audience,
): Project[] {
  return projects(records, audience).filter((p) =>
    p.participants.some((participant) => participant.personId === personId),
  )
}

/** A person's positions, current ones first. */
export function appointmentsOf(
  records: Records,
  personId: string,
  audience?: Audience,
): Appointment[] {
  return visible(records, records.appointments, audience)
    .filter((a) => a.personId === personId)
    .sort(compareAppointments)
}

/** Positions explicitly marked as ongoing. An unrecorded end is not "current". */
export function currentAppointments(
  records: Records,
  personId: string,
  audience?: Audience,
): Appointment[] {
  return appointmentsOf(records, personId, audience).filter(
    (a) => a.period?.end === PRESENT,
  )
}

export function educationOf(
  records: Records,
  personId: string,
  audience?: Audience,
): Education[] {
  return visible(records, records.education, audience)
    .filter((e) => e.personId === personId)
    .sort(compareEducation)
}

/** A person's activities of one kind, typed as that kind. */
export function activitiesOf<T extends ActivityType>(
  records: Records,
  personId: string,
  type: T,
  audience?: Audience,
): ActivityOf<T>[] {
  return visible(records, records.activities, audience)
    .filter((a): a is ActivityOf<T> => a.personId === personId && a.type === type)
    .sort(compareActivities)
}

/**
 * The people a person has worked with: fellow participants of a shown project and fellow
 * registered authors of a shown output. External author credits are names, not people,
 * so they are not collaborators here.
 */
export function collaboratorsOf(
  records: Records,
  personId: string,
  audience?: Audience,
): Person[] {
  const ids = new Set<string>()
  for (const project of projectsOfPerson(records, personId, audience)) {
    for (const participant of project.participants) ids.add(participant.personId)
  }
  for (const publication of publicationsByPerson(records, personId, audience)) {
    for (const author of publication.authors) {
      if ("personId" in author) ids.add(author.personId)
    }
  }
  ids.delete(personId)
  return people(records, audience).filter((person) => ids.has(person.id))
}

// --- Organizations ------------------------------------------------------------------------

export function organizations(records: Records, audience?: Audience): Organization[] {
  return visible(records, records.organizations, audience).sort(
    (a, b) => byText(a.name, b.name) || byText(a.id, b.id),
  )
}

/** An organization and the ones above it, nearest first. The registry forbids loops. */
export function organizationLineage(
  records: Records,
  organizationId: string,
): Organization[] {
  const lineage: Organization[] = []
  let next = records.find("organizations", organizationId)
  while (next !== undefined && !lineage.includes(next)) {
    lineage.push(next)
    next =
      next.parentId === undefined
        ? undefined
        : records.find("organizations", next.parentId)
  }
  return lineage
}

/** The organizations of the shown projects: hosts and partners of the work. */
export function projectOrganizations(
  records: Records,
  audience?: Audience,
): Organization[] {
  const ids = new Set(projects(records, audience).flatMap((p) => p.organizationIds))
  return organizations(records, audience).filter((o) => ids.has(o.id))
}
