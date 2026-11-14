/**
 * Projections (P11, D-086): what a page of a given kind needs from the records, in the
 * shape that page reads. The CV wants compact dated lines; the Portfolio, projects with
 * their people, links and outputs; the Lab, research areas with their work.
 *
 * A projection holds no facts of its own. Each is computed from the store through the
 * selectors, so the same project or output cannot say two different things on two pages,
 * and nothing here knows whose CV or which project it is drawing: it is all parameters.
 *
 * Only shown records appear (selectors.ts, isShown). A person is named only when their
 * own record may be shown, except in a citation, where the author list is part of the
 * work.
 */
import { citationOf } from "./citation.ts"
import type { Citation } from "./citation.ts"
import { formatPartialDate, formatPeriod } from "./dates.ts"
import type { Records } from "./registry.ts"
import {
  activitiesOf,
  appointmentsOf,
  areasOf,
  educationOf,
  isShown,
  profiledPeople,
  projectOrganizations,
  projects,
  projectsInArea,
  projectsOfPerson,
  publicationsByPerson,
  publicationsInArea,
  publicationsOfProject,
  researchAreas,
} from "./selectors.ts"
import type { Project } from "./schema.ts"

/** The name of an organization that may be shown, or undefined. */
function organizationName(
  records: Records,
  id: string | undefined,
): string | undefined {
  const organization = id === undefined ? undefined : records.find("organizations", id)
  return organization !== undefined && isShown(records, organization)
    ? organization.name
    : undefined
}

/** The name of a person who may be shown, or undefined. */
function personName(records: Records, id: string | undefined): string | undefined {
  const person = id === undefined ? undefined : records.find("people", id)
  return person !== undefined && isShown(records, person)
    ? person.displayName
    : undefined
}

const defined = <T>(value: T | undefined): value is T => value !== undefined
const join = (...parts: (string | undefined)[]): string | undefined => {
  const kept = parts.filter(defined)
  return kept.length === 0 ? undefined : kept.join(", ")
}
const when = (date: string | undefined): string =>
  date === undefined ? "" : formatPartialDate(date)

// --- CV -----------------------------------------------------------------------------------

/** One dated line of a CV. `when` is "" when no date is recorded: nothing is invented. */
export interface CvEntry {
  readonly id: string
  readonly heading: string
  readonly organization?: string
  readonly detail?: string
  readonly when: string
}

export interface CvProjection {
  readonly person: {
    readonly id: string
    readonly name: string
    readonly title?: string
  }
  readonly appointments: readonly CvEntry[]
  readonly education: readonly CvEntry[]
  readonly projects: readonly CvEntry[]
  readonly publications: readonly Citation[]
  readonly teaching: readonly CvEntry[]
  readonly presentations: readonly CvEntry[]
  readonly participations: readonly CvEntry[]
  readonly mentoring: readonly CvEntry[]
  readonly awards: readonly CvEntry[]
  readonly funding: readonly CvEntry[]
  readonly service: readonly CvEntry[]
  readonly outreach: readonly CvEntry[]
  readonly training: readonly CvEntry[]
  readonly certifications: readonly CvEntry[]
}

const entry = (
  id: string,
  heading: string,
  whenText: string,
  organization?: string,
  detail?: string,
): CvEntry => ({
  id,
  heading,
  ...(organization === undefined ? {} : { organization }),
  ...(detail === undefined ? {} : { detail }),
  when: whenText,
})

/** One person's CV, section by section, each in its own chronological order. */
export function cvProjection(records: Records, personId: string): CvProjection {
  const person = records.get("people", personId)
  if (!isShown(records, person)) throw new Error(`${personId} may not be shown`)
  return {
    person: {
      id: person.id,
      name: person.displayName,
      ...(person.professionalTitle === undefined
        ? {}
        : { title: person.professionalTitle }),
    },
    appointments: appointmentsOf(records, personId).map((a) =>
      entry(
        a.id,
        a.title ?? "Affiliation",
        formatPeriod(a.period),
        // A registered organization, else the institution as its source wrote it.
        organizationName(records, a.organizationId) ?? a.institution,
        join(a.department, a.location, a.summary),
      ),
    ),
    education: educationOf(records, personId).map((e) =>
      entry(
        e.id,
        e.qualification,
        e.status === "in-progress"
          ? formatPeriod({ start: e.startDate, end: "present" })
          : e.startDate === undefined
            ? when(e.completionDate)
            : formatPeriod({ start: e.startDate, end: e.completionDate }),
        organizationName(records, e.institutionId) ?? e.institution,
        join(
          e.field,
          e.thesisTitle === undefined ? undefined : `Thesis: ${e.thesisTitle}`,
          e.supervision === undefined ? undefined : `Supervision: ${e.supervision}`,
          e.status === "incomplete" ? "not completed" : undefined,
        ),
      ),
    ),
    projects: projectsOfPerson(records, personId).map((p) =>
      entry(
        p.id,
        p.title,
        formatPeriod(p.period),
        undefined,
        p.participants.find((x) => x.personId === personId)?.role,
      ),
    ),
    publications: publicationsByPerson(records, personId).map((p) =>
      citationOf(records, p),
    ),
    teaching: activitiesOf(records, personId, "teaching").map((a) =>
      entry(
        a.id,
        a.title,
        formatPeriod(a.period),
        organizationName(records, a.organizationId) ?? a.context,
        join(a.role, a.duration, a.summary),
      ),
    ),
    presentations: activitiesOf(records, personId, "presentation").map((a) =>
      entry(
        a.id,
        a.title,
        when(a.date),
        a.context,
        join(a.presentationType, a.event, a.location),
      ),
    ),
    participations: activitiesOf(records, personId, "participation").map((a) =>
      entry(a.id, a.event, formatPeriod(a.period), a.context, a.summary),
    ),
    mentoring: activitiesOf(records, personId, "mentoring").map((a) =>
      entry(
        a.id,
        // The kind of mentorship is stated only when the record states it.
        join(a.mentorshipType ?? "mentoring", a.level) ?? "mentoring",
        formatPeriod(a.period),
        organizationName(records, a.organizationId) ?? a.context,
        // The mentee is named only if their own record may be shown.
        join(personName(records, a.menteeId), a.topic),
      ),
    ),
    awards: activitiesOf(records, personId, "award").map((a) =>
      entry(
        a.id,
        a.name,
        when(a.date),
        organizationName(records, a.grantorId) ?? a.grantor,
        join(a.topic, a.summary),
      ),
    ),
    funding: activitiesOf(records, personId, "funding").map((a) =>
      entry(
        a.id,
        a.name,
        when(a.date),
        organizationName(records, a.grantorId) ?? a.grantor,
        join(a.topic, a.summary),
      ),
    ),
    service: activitiesOf(records, personId, "service").map((a) =>
      entry(
        a.id,
        a.role,
        formatPeriod(a.period),
        organizationName(records, a.organizationId) ?? a.context,
        join(a.serviceType, a.body, a.subject),
      ),
    ),
    outreach: activitiesOf(records, personId, "outreach").map((a) =>
      entry(
        a.id,
        a.title,
        a.date === undefined ? formatPeriod(a.period) : when(a.date),
        organizationName(records, a.organizationId) ?? a.context,
        join(a.event, a.summary),
      ),
    ),
    training: activitiesOf(records, personId, "training").map((a) =>
      entry(a.id, a.title, formatPeriod(a.period), a.context, a.summary),
    ),
    certifications: activitiesOf(records, personId, "certification").map((a) =>
      entry(a.id, a.name, when(a.date), a.issuer ?? a.context, a.summary),
    ),
  }
}

// --- Portfolio ----------------------------------------------------------------------------

export interface PortfolioProject {
  readonly id: string
  readonly title: string
  readonly kind: Project["kind"]
  readonly status: Project["status"]
  readonly description?: string
  readonly when: string
  readonly areas: readonly { readonly id: string; readonly title: string }[]
  readonly people: readonly {
    readonly id: string
    readonly name: string
    readonly role?: string
  }[]
  readonly organizations: readonly string[]
  readonly links: readonly { readonly label: string; readonly url: string }[]
  readonly outputs: readonly Citation[]
}

const LINK_LABELS = {
  repository: "Repository",
  documentation: "Documentation",
  website: "Website",
} as const

function portfolioProject(records: Records, project: Project): PortfolioProject {
  return {
    id: project.id,
    title: project.title,
    kind: project.kind,
    status: project.status,
    ...(project.shortDescription === undefined
      ? {}
      : { description: project.shortDescription }),
    when: formatPeriod(project.period),
    areas: areasOf(records, project).map(({ id, title }) => ({ id, title })),
    people: project.participants.flatMap((participant) => {
      const name = personName(records, participant.personId)
      return name === undefined
        ? []
        : [
            {
              id: participant.personId,
              name,
              ...(participant.role === undefined ? {} : { role: participant.role }),
            },
          ]
    }),
    organizations: project.organizationIds
      .map((id) => organizationName(records, id))
      .filter(defined),
    links: (Object.keys(LINK_LABELS) as (keyof typeof LINK_LABELS)[]).flatMap((key) => {
      const url = project.links[key]
      return url === undefined ? [] : [{ label: LINK_LABELS[key], url }]
    }),
    outputs: publicationsOfProject(records, project.id).map((p) =>
      citationOf(records, p),
    ),
  }
}

/** Every shown project, in Portfolio order, each with its people, links and outputs. */
export function portfolioProjection(records: Records): PortfolioProject[] {
  return projects(records).map((project) => portfolioProject(records, project))
}

// --- Lab ----------------------------------------------------------------------------------

export interface LabProjection {
  readonly areas: readonly {
    readonly id: string
    readonly title: string
    readonly summary?: string
    readonly keywords: readonly string[]
    readonly projects: readonly {
      readonly id: string
      readonly title: string
      readonly status: Project["status"]
    }[]
    readonly outputs: readonly Citation[]
  }[]
  /** People who have agreed to a profile, with the organizations of their current positions. */
  readonly people: readonly {
    readonly id: string
    readonly name: string
    readonly title?: string
    readonly affiliations: readonly string[]
  }[]
  /** The organizations of the shown projects. */
  readonly organizations: readonly { readonly id: string; readonly name: string }[]
}

/** The research view: areas with their projects and outputs, people and organizations. */
export function labProjection(records: Records): LabProjection {
  return {
    areas: researchAreas(records).map((area) => ({
      id: area.id,
      title: area.title,
      ...(area.summary === undefined ? {} : { summary: area.summary }),
      keywords: [...area.keywords],
      projects: projectsInArea(records, area.id).map(({ id, title, status }) => ({
        id,
        title,
        status,
      })),
      outputs: publicationsInArea(records, area.id).map((p) => citationOf(records, p)),
    })),
    people: profiledPeople(records).map((person) => ({
      id: person.id,
      name: person.displayName,
      ...(person.professionalTitle === undefined
        ? {}
        : { title: person.professionalTitle }),
      affiliations: appointmentsOf(records, person.id)
        .filter((a) => a.period?.end === "present")
        .map((a) => organizationName(records, a.organizationId))
        .filter(defined),
    })),
    organizations: projectOrganizations(records).map(({ id, name }) => ({ id, name })),
  }
}
