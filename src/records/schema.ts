/**
 * Schemas of the canonical records (P11, D-083 to D-086): the people, organizations,
 * research areas, projects, scholarly outputs, appointments, education and activities
 * that the site presents in several places from one source each.
 *
 * Written with Zod through `astro/zod`, as the editorial schemas are, so the build and
 * the tests validate with the same code. These schemas check one record at a time;
 * registry.ts checks the records against each other (unique IDs, references, cycles).
 *
 * Rules that hold for every family:
 * - `id` is stable, prefixed by its family (`project-…`), and never derived from a title,
 *   a position in a list or anything private. A reference names an ID, never a label.
 * - `visibility` and `provenance.status` are explicit: a record says whether it may be
 *   shown, and how far its facts have been checked. Neither is a security boundary: the
 *   repository is public, so nothing confidential belongs in a record at all.
 * - Unknown fields are rejected. A fact that is not known is left out, never guessed.
 * - Dates keep the precision they were written with (dates.ts).
 */
import { z } from "astro/zod"
import { isPartialDate, endsBeforeStart, PRESENT } from "./dates.ts"

// --- Families and identifiers -------------------------------------------------------------

/** The eight record families, with the prefix every ID of the family starts with. */
export const FAMILIES = {
  people: "person",
  organizations: "organization",
  researchAreas: "area",
  projects: "project",
  publications: "publication",
  appointments: "appointment",
  education: "education",
  activities: "activity",
} as const

export type Family = keyof typeof FAMILIES
export const FAMILY_NAMES = Object.keys(FAMILIES) as Family[]

const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*"
/** Any record ID: a family prefix, a hyphen, and a lowercase kebab-case name. */
export const RECORD_ID_PATTERN = new RegExp(
  `^(?:${Object.values(FAMILIES).join("|")})-${SLUG}$`,
)

/** The family an ID belongs to, from its prefix, or undefined for a malformed ID. */
export function familyOfId(id: string): Family | undefined {
  if (!RECORD_ID_PATTERN.test(id)) return undefined
  return FAMILY_NAMES.find((family) => id.startsWith(`${FAMILIES[family]}-`))
}

const idOf = (family: Family) =>
  z
    .string()
    .max(96)
    .regex(
      new RegExp(`^${FAMILIES[family]}-${SLUG}$`),
      `write "${FAMILIES[family]}-" followed by lowercase letters, digits and single hyphens`,
    )

// --- Shared fragments ---------------------------------------------------------------------

const text = z.string().trim().min(1)
const partialDate = z
  .string()
  .refine(isPartialDate, "write a date as YYYY, YYYY-MM or YYYY-MM-DD")
const fullDate = z
  .string()
  .refine(
    (value) => isPartialDate(value) && value.length === 10,
    "write a date as YYYY-MM-DD",
  )

/**
 * An external link: an absolute https URL (http is accepted for old sites), with a host.
 * Nothing is fetched and nothing is guessed: a URL is stored only when someone wrote it.
 */
const url = z.string().refine((value) => {
  try {
    const parsed = new URL(value)
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      parsed.hostname.includes(".") &&
      value === value.trim() &&
      !/\s/.test(value)
    )
  } catch {
    return false
  }
}, "write an absolute http(s) URL")

const period = z
  .strictObject({
    start: partialDate.optional(),
    end: z.union([z.literal(PRESENT), partialDate]).optional(),
  })
  .refine(
    (value) =>
      value.start === undefined ||
      value.end === undefined ||
      value.end === PRESENT ||
      !endsBeforeStart(value.start, value.end),
    "the period ends before it starts",
  )

export const PROVENANCE_STATUSES = [
  "verified",
  "imported",
  "unreviewed",
  "synthetic",
] as const
export type ProvenanceStatus = (typeof PROVENANCE_STATUSES)[number]

/**
 * How far a record's facts have been checked:
 * - verified: written or confirmed by the owner;
 * - imported: brought in from another source and not yet confirmed;
 * - unreviewed: legacy or draft material nobody has checked;
 * - synthetic: invented for tests and design studies; never allowed in the site's data.
 * Only verified records are shown publicly.
 */
const provenance = z.strictObject({
  status: z.enum(PROVENANCE_STATUSES),
  /** Where the facts come from, in the owner's words: a document, a page, a person. */
  source: text.optional(),
  /** A public page that supports the record. */
  url: url.optional(),
  /** When the owner last confirmed the record. */
  reviewedAt: fullDate.optional(),
})

export const VISIBILITIES = ["public", "hidden"] as const

/** What every record carries. */
const base = {
  visibility: z.enum(VISIBILITIES),
  provenance,
}

const unique = (values: readonly string[]) => new Set(values).size === values.length
const idList = (family: Family) =>
  z.array(idOf(family)).refine(unique, "an ID is listed twice").default([])

// --- People -------------------------------------------------------------------------------

const ORCID = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/

/** True for an ORCID iD with a valid ISO 7064 check character. */
export function isOrcid(value: string): boolean {
  if (!ORCID.test(value)) return false
  const digits = value.replaceAll("-", "")
  let total = 0
  for (const digit of digits.slice(0, 15)) total = (total + Number(digit)) * 2
  const check = (12 - (total % 11)) % 11
  return digits[15] === (check === 10 ? "X" : String(check))
}

/**
 * A person who can be referred to: the owner, a co-author, a collaborator. Being a record
 * is not being profiled: `profile` is "none" unless a dedicated public profile has been
 * agreed. No email, no portrait, no private detail. Affiliations are not stored here:
 * they are the person's appointments (one source).
 */
const person = z.strictObject({
  id: idOf("people"),
  ...base,
  displayName: text,
  /** How the name sorts, such as "Gusmao, Eduardo Gade". Default: the display name. */
  sortName: text.optional(),
  /** How the name is printed in author lists, such as "Gusmao EG". Default: display name. */
  citationName: text.optional(),
  professionalTitle: text.optional(),
  shortBiography: text.optional(),
  orcid: z
    .string()
    .refine(isOrcid, "not a valid ORCID iD (0000-0000-0000-0000)")
    .optional(),
  links: z.array(z.strictObject({ label: text, url })).default([]),
  researchAreaIds: idList("researchAreas"),
  profile: z.enum(["none", "public"]).default("none"),
})

// --- Organizations ------------------------------------------------------------------------

export const ORGANIZATION_TYPES = [
  "university",
  "research-institute",
  "laboratory",
  "company",
  "public-institution",
  "consortium",
  "other",
] as const

const organization = z.strictObject({
  id: idOf("organizations"),
  ...base,
  name: text,
  shortName: text.optional(),
  type: z.enum(ORGANIZATION_TYPES),
  website: url.optional(),
  location: text.optional(),
  /** The organization this one is part of. A hierarchy: it may not loop. */
  parentId: idOf("organizations").optional(),
  /** Other ties, which need not form a tree: a laboratory may partner with several. */
  relations: z
    .array(
      z.strictObject({
        relation: z.enum(["member-of", "partner-of", "hosted-by"]),
        organizationId: idOf("organizations"),
      }),
    )
    .default([]),
})

// --- Research areas -----------------------------------------------------------------------

/** A research area. Its projects and outputs are derived from their own records. */
const researchArea = z.strictObject({
  id: idOf("researchAreas"),
  ...base,
  title: text,
  summary: text.optional(),
  keywords: z.array(text).refine(unique, "a keyword is listed twice").default([]),
})

// --- Projects -----------------------------------------------------------------------------

export const PROJECT_KINDS = [
  "research",
  "software",
  "platform",
  "infrastructure",
  "other",
] as const
export const PROJECT_STATUSES = ["planned", "active", "completed", "archived"] as const

/**
 * A research or engineering project. Its outputs are not listed here: each output names
 * its projects, and the reverse is derived. `slug` reserves a future address; it creates
 * no page.
 */
const project = z.strictObject({
  id: idOf("projects"),
  ...base,
  title: text,
  kind: z.enum(PROJECT_KINDS),
  status: z.enum(PROJECT_STATUSES),
  shortDescription: text.optional(),
  period: period.optional(),
  researchAreaIds: idList("researchAreas"),
  participants: z
    .array(z.strictObject({ personId: idOf("people"), role: text.optional() }))
    .refine(
      (list) => unique(list.map((entry) => entry.personId)),
      "a participant is listed twice",
    )
    .default([]),
  organizationIds: idList("organizations"),
  links: z
    .strictObject({
      repository: url.optional(),
      documentation: url.optional(),
      website: url.optional(),
    })
    .default({}),
  slug: z
    .string()
    .regex(new RegExp(`^${SLUG}$`))
    .optional(),
})

// --- Scholarly outputs --------------------------------------------------------------------

export const PUBLICATION_TYPES = [
  "journal-article",
  "conference-paper",
  "preprint",
  "book-chapter",
  "dataset",
  "software",
  "technical-report",
  "thesis",
  "other",
] as const

/**
 * Where an output stands. Only "published" is a published (for articles: peer-reviewed)
 * work; a preprint is public but not reviewed; "submitted" and "accepted" are not out.
 */
export const PUBLICATION_STATUSES = [
  "submitted",
  "accepted",
  "preprint",
  "published",
] as const

const DOI = /^10\.\d{4,9}\/[^\s]+$/

/**
 * A DOI in one form: the bare, lowercase identifier ("10.1234/abc"). A pasted
 * "https://doi.org/…" or "doi:…" is reduced to it, so the link is always generated and
 * never stored twice. Nothing is looked up: a DOI exists in a record only if written.
 */
const doi = z
  .string()
  .transform((value) =>
    value
      .trim()
      .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
      .replace(/^doi:\s*/i, "")
      .toLowerCase(),
  )
  .refine((value) => DOI.test(value), "not a DOI (10.xxxx/…)")

/**
 * One author, in the order printed. Either a person in the registry (with `as`, the name
 * exactly as printed on this work, when it differs) or an external credit: a name only,
 * which needs no person record and gets no profile.
 */
const author = z.union([
  z.strictObject({ personId: idOf("people"), as: text.optional() }),
  z.strictObject({ name: text }),
])

const publication = z
  .strictObject({
    id: idOf("publications"),
    ...base,
    title: text,
    type: z.enum(PUBLICATION_TYPES),
    status: z.enum(PUBLICATION_STATUSES),
    /** Ordered. Never sorted, never deduplicated silently. */
    authors: z.array(author).min(1),
    /** The publication date, as precisely as it is known: often only a year. */
    date: partialDate.optional(),
    /** The journal, conference, book or repository. */
    venue: text.optional(),
    volume: text.optional(),
    issue: text.optional(),
    pages: text.optional(),
    doi: doi.optional(),
    /** The official page, when there is no DOI or it differs. */
    url: url.optional(),
    projectIds: idList("projects"),
    researchAreaIds: idList("researchAreas"),
    /** Ties to other outputs. A preprint and its article are two records, linked here. */
    related: z
      .array(
        z.strictObject({
          relation: z.enum(["preprint-of", "version-of", "supplement-to"]),
          publicationId: idOf("publications"),
        }),
      )
      .default([]),
  })
  .superRefine((data, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message })
    if ((data.type === "preprint") !== (data.status === "preprint"))
      issue(
        "status",
        'a preprint has the type "preprint" and the status "preprint", together',
      )
    if (
      (data.status === "published" || data.status === "preprint") &&
      data.date === undefined
    )
      issue("date", `a ${data.status} output needs its date, at least the year`)
    const people = data.authors.flatMap((entry) =>
      "personId" in entry ? [entry.personId] : [],
    )
    if (!unique(people)) issue("authors", "a person is listed twice among the authors")
    if (data.related.some((entry) => entry.publicationId === data.id))
      issue("related", "an output cannot be related to itself")
  })

// --- Appointments -------------------------------------------------------------------------

export const APPOINTMENT_TYPES = [
  "employment",
  "academic",
  "visiting",
  "affiliation",
  "other",
] as const

/**
 * A position a person holds or held at an organization. "affiliation" is a tie without a
 * post (a collaborator's institution); every other type needs its official title, exactly
 * as given. Positions may overlap.
 */
const appointment = z
  .strictObject({
    id: idOf("appointments"),
    ...base,
    personId: idOf("people"),
    organizationId: idOf("organizations"),
    type: z.enum(APPOINTMENT_TYPES),
    title: text.optional(),
    period: period.optional(),
    summary: text.optional(),
    location: text.optional(),
    projectIds: idList("projects"),
  })
  .superRefine((data, context) => {
    if (data.type !== "affiliation" && data.title === undefined)
      context.addIssue({
        code: "custom",
        path: ["title"],
        message: `an ${data.type} appointment needs its title`,
      })
  })

// --- Education ----------------------------------------------------------------------------

export const EDUCATION_LEVELS = [
  "undergraduate",
  "masters",
  "doctorate",
  "other",
] as const
export const EDUCATION_STATUSES = ["completed", "in-progress", "incomplete"] as const

/** A degree or formal qualification. A person may hold several at one level. */
const education = z
  .strictObject({
    id: idOf("education"),
    ...base,
    personId: idOf("people"),
    institutionId: idOf("organizations"),
    /** The qualification as awarded, such as "PhD in Computer Science". */
    qualification: text,
    level: z.enum(EDUCATION_LEVELS),
    status: z.enum(EDUCATION_STATUSES),
    field: text.optional(),
    startDate: partialDate.optional(),
    completionDate: partialDate.optional(),
    thesisTitle: text.optional(),
    supervisorIds: idList("people"),
  })
  .superRefine((data, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message })
    if (data.status !== "completed" && data.completionDate !== undefined)
      issue(
        "completionDate",
        `a qualification that is ${data.status} has no completion date`,
      )
    if (
      data.startDate !== undefined &&
      data.completionDate !== undefined &&
      endsBeforeStart(data.startDate, data.completionDate)
    )
      issue("completionDate", "the qualification is completed before it starts")
    if (data.supervisorIds.includes(data.personId))
      issue("supervisorIds", "a person cannot supervise their own qualification")
  })

// --- Activities ---------------------------------------------------------------------------

export const ACTIVITY_TYPES = [
  "teaching",
  "presentation",
  "mentoring",
  "award",
  "service",
  "outreach",
] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

/** What every activity has: whose it is, and an optional note. */
const activityBase = {
  id: idOf("activities"),
  ...base,
  personId: idOf("people"),
  summary: text.optional(),
}

/**
 * Academic and professional activities: six small shapes, told apart by `type`, each with
 * only the fields that kind of activity has.
 */
const activity = z.discriminatedUnion("type", [
  z.strictObject({
    ...activityBase,
    type: z.literal("teaching"),
    /** The course or subject. */
    title: text,
    role: text.optional(),
    organizationId: idOf("organizations").optional(),
    period: period.optional(),
    resources: z.array(z.strictObject({ label: text, url })).default([]),
  }),
  z.strictObject({
    ...activityBase,
    type: z.literal("presentation"),
    title: text,
    presentationType: z.enum([
      "invited",
      "keynote",
      "contributed",
      "poster",
      "seminar",
      "other",
    ]),
    event: text.optional(),
    date: partialDate.optional(),
    location: text.optional(),
    publicationIds: idList("publications"),
    projectIds: idList("projects"),
  }),
  z.strictObject({
    ...activityBase,
    type: z.literal("mentoring"),
    mentorshipType: z.enum(["supervision", "co-supervision", "mentoring"]),
    level: z
      .enum(["undergraduate", "masters", "doctorate", "postdoctoral", "other"])
      .optional(),
    /**
     * The person mentored, when they have a record. Optional on purpose: a mentoring
     * record can count without naming anyone, and a name is shown only for a person
     * whose own record is public.
     */
    menteeId: idOf("people").optional(),
    topic: text.optional(),
    organizationId: idOf("organizations").optional(),
    period: period.optional(),
    projectIds: idList("projects"),
  }),
  z.strictObject({
    ...activityBase,
    type: z.literal("award"),
    name: text,
    grantorId: idOf("organizations").optional(),
    date: partialDate.optional(),
  }),
  z.strictObject({
    ...activityBase,
    type: z.literal("service"),
    serviceType: z.enum([
      "committee",
      "review",
      "organizing",
      "editorial",
      "advisory",
      "other",
    ]),
    role: text,
    /** The committee, journal, conference or body served, when it is not an organization record. */
    body: text.optional(),
    organizationId: idOf("organizations").optional(),
    period: period.optional(),
  }),
  z.strictObject({
    ...activityBase,
    type: z.literal("outreach"),
    title: text,
    event: text.optional(),
    date: partialDate.optional(),
    organizationId: idOf("organizations").optional(),
    url: url.optional(),
  }),
])

// --- Exports ------------------------------------------------------------------------------

export const SCHEMAS = {
  people: person,
  organizations: organization,
  researchAreas: researchArea,
  projects: project,
  publications: publication,
  appointments: appointment,
  education,
  activities: activity,
} as const

export type Person = z.infer<typeof person>
export type Organization = z.infer<typeof organization>
export type ResearchArea = z.infer<typeof researchArea>
export type Project = z.infer<typeof project>
export type Publication = z.infer<typeof publication>
export type Author = z.infer<typeof author>
export type Appointment = z.infer<typeof appointment>
export type Education = z.infer<typeof education>
export type Activity = z.infer<typeof activity>
export type ActivityOf<T extends ActivityType> = Extract<Activity, { type: T }>

/** A validated record of each family. */
export interface RecordOf {
  people: Person
  organizations: Organization
  researchAreas: ResearchArea
  projects: Project
  publications: Publication
  appointments: Appointment
  education: Education
  activities: Activity
}
export type AnyRecord = RecordOf[Family]

/** What an author writes: the same shapes before defaults are filled in. */
export interface RecordsInput {
  people?: readonly z.input<typeof person>[]
  organizations?: readonly z.input<typeof organization>[]
  researchAreas?: readonly z.input<typeof researchArea>[]
  projects?: readonly z.input<typeof project>[]
  publications?: readonly z.input<typeof publication>[]
  appointments?: readonly z.input<typeof appointment>[]
  education?: readonly z.input<typeof education>[]
  activities?: readonly z.input<typeof activity>[]
}
export type PersonInput = z.input<typeof person>
export type OrganizationInput = z.input<typeof organization>
export type ResearchAreaInput = z.input<typeof researchArea>
export type ProjectInput = z.input<typeof project>
export type PublicationInput = z.input<typeof publication>
export type AppointmentInput = z.input<typeof appointment>
export type EducationInput = z.input<typeof education>
export type ActivityInput = z.input<typeof activity>
