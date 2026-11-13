/**
 * SYNTHETIC FIXTURE (P11): a small invented graph of canonical records, for the tests
 * (tests/records.mjs) and the design study at /_design/records/. Every name, title, date,
 * DOI and URL below is made up. None of it describes Eduardo Gade Gusmao, GusmaoLab or
 * any real person, organization, project or publication.
 *
 * It lives here, beside the other things shared by studies and tests, and never in
 * src/data/records/: the site's own dataset refuses synthetic records. The DOI prefix
 * 10.5555 and the example.org domain are reserved for examples.
 *
 * The graph is deliberately awkward: dates at three precisions, an ongoing position and
 * overlapping ones, an external author, a hidden co-author, a hidden project, a record
 * that is public but not verified, a preprint and its article, a mentee who is not named.
 */
import type { RecordsInput } from "../records/schema.ts"

const synthetic = { visibility: "public", provenance: { status: "synthetic" } } as const
const hidden = { visibility: "hidden", provenance: { status: "synthetic" } } as const

export const SYNTHETIC_PERSON = "person-synthetic-lead"
export const SYNTHETIC_PROJECT = "project-synthetic-atlas"
export const SYNTHETIC_PUBLICATION = "publication-synthetic-article"

export const SYNTHETIC_RECORDS: RecordsInput = {
  people: [
    {
      id: "person-synthetic-lead",
      ...synthetic,
      displayName: "Synthetic Lead (fixture)",
      sortName: "Lead, Synthetic",
      citationName: "Lead S",
      professionalTitle: "Synthetic Group Leader",
      researchAreaIds: ["area-synthetic-alpha"],
      profile: "public",
    },
    {
      id: "person-synthetic-collaborator",
      ...synthetic,
      displayName: "Synthetic Collaborator (fixture)",
      sortName: "Collaborator, Synthetic",
      citationName: "Collaborator S",
    },
    {
      // A co-author and mentee without a public record: named in the author list of the
      // work, and nowhere else.
      id: "person-synthetic-student",
      ...hidden,
      displayName: "Synthetic Student (fixture, hidden)",
      citationName: "Student S",
    },
  ],
  organizations: [
    {
      id: "organization-synthetic-university",
      ...synthetic,
      name: "Synthetic University (fixture)",
      shortName: "SynU",
      type: "university",
      website: "https://example.org/synthetic-university",
      location: "Nowhere",
    },
    {
      id: "organization-synthetic-lab",
      ...synthetic,
      name: "Synthetic Laboratory (fixture)",
      type: "laboratory",
      parentId: "organization-synthetic-university",
      relations: [
        { relation: "partner-of", organizationId: "organization-synthetic-institute" },
      ],
    },
    {
      id: "organization-synthetic-institute",
      ...synthetic,
      name: "Synthetic Institute (fixture)",
      type: "research-institute",
      relations: [
        { relation: "partner-of", organizationId: "organization-synthetic-lab" },
      ],
    },
    {
      id: "organization-synthetic-hidden",
      ...hidden,
      name: "SYNTHETIC HIDDEN organization: must never be shown",
      type: "company",
    },
  ],
  researchAreas: [
    {
      id: "area-synthetic-alpha",
      ...synthetic,
      title: "Synthetic area alpha (fixture)",
      summary: "An invented research area used to test the Lab projection.",
      keywords: ["synthetic", "alpha"],
    },
    { id: "area-synthetic-beta", ...synthetic, title: "Synthetic area beta (fixture)" },
  ],
  projects: [
    {
      id: "project-synthetic-atlas",
      ...synthetic,
      title: "Synthetic Atlas (fixture)",
      kind: "research",
      status: "active",
      shortDescription: "An invented project: one record, shown in three places.",
      period: { start: "2021-03", end: "present" },
      researchAreaIds: ["area-synthetic-alpha"],
      participants: [
        { personId: "person-synthetic-lead", role: "Lead" },
        { personId: "person-synthetic-collaborator" },
        { personId: "person-synthetic-student", role: "Doctoral researcher" },
      ],
      organizationIds: [
        "organization-synthetic-lab",
        "organization-synthetic-institute",
      ],
      links: { repository: "https://example.org/synthetic-atlas" },
      slug: "synthetic-atlas",
    },
    {
      id: "project-synthetic-toolkit",
      ...synthetic,
      title: "Synthetic Toolkit (fixture)",
      kind: "software",
      status: "completed",
      period: { start: "2019", end: "2021" },
      researchAreaIds: ["area-synthetic-beta"],
      participants: [{ personId: "person-synthetic-lead" }],
      organizationIds: [
        "organization-synthetic-institute",
        "organization-synthetic-hidden",
      ],
    },
    {
      id: "project-synthetic-hidden",
      ...hidden,
      title: "SYNTHETIC HIDDEN project: must never be shown",
      kind: "research",
      status: "planned",
      researchAreaIds: ["area-synthetic-alpha"],
      participants: [{ personId: "person-synthetic-lead" }],
    },
    {
      // Marked public, but nobody has verified it: it is not shown either.
      id: "project-synthetic-unreviewed",
      visibility: "public",
      provenance: { status: "unreviewed", source: "an invented legacy note" },
      title: "SYNTHETIC UNREVIEWED project: must never be shown",
      kind: "other",
      status: "archived",
      participants: [{ personId: "person-synthetic-lead" }],
    },
  ],
  publications: [
    {
      id: "publication-synthetic-article",
      ...synthetic,
      title: "A synthetic article that reports nothing",
      type: "journal-article",
      status: "published",
      // The order printed on the (invented) paper: it is neither alphabetical nor by role.
      authors: [
        { personId: "person-synthetic-student" },
        { personId: "person-synthetic-lead", as: "Lead SF" },
        { name: "External E" },
        { personId: "person-synthetic-collaborator" },
      ],
      date: "2022-06",
      venue: "Journal of Synthetic Results",
      volume: "12",
      issue: "3",
      pages: "45–67",
      doi: "https://doi.org/10.5555/SYNTHETIC.2022.001",
      projectIds: ["project-synthetic-atlas"],
      researchAreaIds: ["area-synthetic-alpha"],
    },
    {
      id: "publication-synthetic-preprint",
      ...synthetic,
      title: "A synthetic article that reports nothing (preprint)",
      type: "preprint",
      status: "preprint",
      authors: [{ personId: "person-synthetic-lead" }, { name: "External E" }],
      date: "2021",
      venue: "Synthetic Preprint Server",
      url: "https://example.org/preprints/synthetic-001",
      projectIds: ["project-synthetic-atlas"],
      researchAreaIds: ["area-synthetic-alpha"],
      related: [
        { relation: "preprint-of", publicationId: "publication-synthetic-article" },
      ],
    },
    {
      id: "publication-synthetic-dataset",
      ...synthetic,
      title: "Synthetic Toolkit reference data",
      type: "dataset",
      status: "published",
      authors: [{ personId: "person-synthetic-lead" }],
      date: "2020-03-15",
      projectIds: ["project-synthetic-toolkit"],
      researchAreaIds: ["area-synthetic-beta"],
    },
    {
      // A manuscript under review: a record exists, and it is not shown.
      id: "publication-synthetic-submitted",
      ...hidden,
      title: "SYNTHETIC HIDDEN manuscript: must never be shown",
      type: "journal-article",
      status: "submitted",
      authors: [{ personId: "person-synthetic-lead" }],
      projectIds: ["project-synthetic-atlas"],
    },
  ],
  appointments: [
    {
      id: "appointment-synthetic-current",
      ...synthetic,
      personId: "person-synthetic-lead",
      organizationId: "organization-synthetic-lab",
      type: "academic",
      title: "Synthetic Group Leader",
      period: { start: "2021-03", end: "present" },
      projectIds: ["project-synthetic-atlas"],
    },
    {
      id: "appointment-synthetic-past",
      ...synthetic,
      personId: "person-synthetic-lead",
      organizationId: "organization-synthetic-institute",
      type: "employment",
      title: "Synthetic Researcher",
      period: { start: "2017", end: "2021-02" },
    },
    {
      // A short visit inside the previous position: overlaps are legitimate.
      id: "appointment-synthetic-visit",
      ...synthetic,
      personId: "person-synthetic-lead",
      organizationId: "organization-synthetic-university",
      type: "visiting",
      title: "Synthetic Visiting Scholar",
      period: { start: "2019-09", end: "2019-12" },
    },
    {
      // A collaborator's institution: a tie without a post, a title or dates.
      id: "appointment-synthetic-affiliation",
      ...synthetic,
      personId: "person-synthetic-collaborator",
      organizationId: "organization-synthetic-institute",
      type: "affiliation",
    },
  ],
  education: [
    {
      id: "education-synthetic-doctorate",
      ...synthetic,
      personId: "person-synthetic-lead",
      institutionId: "organization-synthetic-university",
      qualification: "PhD in Synthetic Studies",
      level: "doctorate",
      status: "completed",
      startDate: "2012",
      completionDate: "2016-11",
      thesisTitle: "A synthetic thesis",
      supervisorIds: ["person-synthetic-collaborator"],
    },
    {
      id: "education-synthetic-masters",
      ...synthetic,
      personId: "person-synthetic-lead",
      institutionId: "organization-synthetic-university",
      qualification: "MSc in Synthetic Studies",
      level: "masters",
      status: "completed",
      completionDate: "2012",
    },
  ],
  activities: [
    {
      id: "activity-synthetic-teaching",
      ...synthetic,
      personId: "person-synthetic-lead",
      type: "teaching",
      title: "Synthetic Methods 101",
      role: "Lecturer",
      organizationId: "organization-synthetic-university",
      period: { start: "2022" },
    },
    {
      id: "activity-synthetic-talk",
      ...synthetic,
      personId: "person-synthetic-lead",
      type: "presentation",
      title: "A synthetic talk",
      presentationType: "invited",
      event: "Synthetic Symposium",
      date: "2023-05-17",
      publicationIds: ["publication-synthetic-article"],
      projectIds: ["project-synthetic-atlas"],
    },
    {
      // The mentee has a record but it is hidden: the activity counts, the name is not shown.
      id: "activity-synthetic-supervision",
      ...synthetic,
      personId: "person-synthetic-lead",
      type: "mentoring",
      mentorshipType: "supervision",
      level: "doctorate",
      menteeId: "person-synthetic-student",
      topic: "A synthetic topic",
      period: { start: "2022", end: "present" },
      projectIds: ["project-synthetic-atlas"],
    },
    {
      id: "activity-synthetic-award",
      ...synthetic,
      personId: "person-synthetic-lead",
      type: "award",
      name: "Synthetic Prize",
      grantorId: "organization-synthetic-institute",
      date: "2020",
    },
    {
      id: "activity-synthetic-review",
      ...synthetic,
      personId: "person-synthetic-lead",
      type: "service",
      serviceType: "review",
      role: "Reviewer",
      body: "Journal of Synthetic Results",
      period: { start: "2021", end: "present" },
    },
    {
      id: "activity-synthetic-outreach",
      ...synthetic,
      personId: "person-synthetic-lead",
      type: "outreach",
      title: "A synthetic open day",
      date: "2021-10",
    },
  ],
}
