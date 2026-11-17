/**
 * What each approved destination is for (P17, D-122, D-123): one entry per registered folder, keyed by
 * the registry's ID, holding only what the registry cannot: a sentence of purpose, where the page's
 * material comes from, what it says while that material is missing, and a few related folders.
 *
 * What it does not hold: a label, a URL, a category or a parent (all from the registry, so a rename
 * or a move cannot leave this file behind), and a state. A page's state is derived (coverage.ts)
 * from its real source: the editorial collection's published entries, the canonical records, or,
 * for a feature that is only planned, the `planned` declaration below.
 *
 * Copy rules: say what a page is for, never what it contains today; invent no biography, project,
 * result, address, facility, collaborator, opportunity or date; tell the truth about what is
 * missing. Related folders are registry IDs, never paths.
 *
 * Pure data and no imports: Node runs it for the tests and the inspector (D-040).
 */

/** Where a destination's material comes from, which decides how its state is derived. */
export type DestinationSource =
  /** The homepage (P15): always ready; it draws its own regions. */
  | "home"
  /** An editorial collection (P10): `empty` until it has a published entry. */
  | "collection"
  /** Canonical records (P11) through a projection: `preparation` until a verified record exists. */
  | "records"
  /** A feature declared planned here: `preparation` until the owner supplies the material. */
  | "planned"
  /** The Contact page (P18): `ready` once the owner has approved at least one public channel. */
  | "contact"
  /** A parent folder: its page introduces its children, and its state follows theirs. */
  | "overview"

/** The projection of the canonical records a `records` destination shows. */
export type RecordsKey =
  | "portfolio"
  | "lab-people"
  | "lab-areas"
  | "lab-partners"
  | "cv-teaching"
  | "cv-research"
  | "cv-publications"
  | "cv-talks"
  | "cv-mentoring"
  | "cv-awards"
  | "cv-service"
  | "cv-outreach"

export interface DestinationSpec {
  readonly source: DestinationSource
  /** What the page is for, in a sentence or two. */
  readonly intro?: string
  /** For `records` and `planned`: what the page says while its material is missing. */
  readonly whileMissing?: string
  /** For `records`: which projection supplies the material. */
  readonly records?: RecordsKey
  /** Public downloads of this category are listed on the page, with the planned ones as "not yet available" (P18). */
  readonly downloads?: "cv" | "research" | "reference" | "project"
  /** Registry IDs of closely related folders (at most three), shown as links. */
  readonly related?: readonly string[]
}

const cvMissing = (what: string): string =>
  `No ${what} has been published yet. The CV is filled from a version the owner has approved, and none has been approved, so nothing is shown from drafts.`

export const DESTINATIONS: Readonly<Record<string, DestinationSpec>> = {
  // --- Core ---------------------------------------------------------------------------------
  home: { source: "home" },
  about: {
    source: "planned",
    intro:
      "GusmaoLab is the personal workshop of Eduardo Gade Gusmao, who works where biology and computation meet: genomes, data, software and the questions that connect them. This page is for saying who is behind the site, how research and engineering fit together, and what a visitor can find here.",
    whileMissing:
      "The About text has not been written yet, and nothing is guessed in its place. The work itself is in the Portfolio, the Lecture Notes and Writing.",
    related: ["portfolio", "lecture-notes", "writing"],
  },
  contact: {
    source: "contact",
    intro:
      "Contact is for reaching Eduardo Gade Gusmao about research collaboration, professional opportunities, or technical and project discussions.",
    whileMissing:
      "Direct contact details are being prepared. No public way of getting in touch has been approved yet, so none is listed, and there is no contact form: a message typed on this page would not be delivered anywhere. Please check back.",
    related: ["schedule", "lab-join-us"],
  },
  schedule: {
    source: "planned",
    intro: "Schedule is where meetings with Eduardo Gade Gusmao will be arranged.",
    whileMissing:
      "Booking is not set up yet, so no times are shown and no request can be sent. When it is, it is expected to use an external scheduling service rather than a calendar kept on this site.",
    related: ["contact"],
  },

  // --- Research -----------------------------------------------------------------------------
  portfolio: {
    source: "records",
    records: "portfolio",
    intro:
      "The Portfolio presents projects (software, scientific research, machine learning and bioinformatics), each with the people, organizations and outputs behind it.",
    whileMissing:
      "No project has been verified for publication yet, so none is listed. Projects appear here, from the site's canonical records, once the owner confirms them.",
    related: ["lab-research-areas", "cv-publications"],
  },
  cv: {
    source: "overview",
    intro:
      "The CV is the professional record, in eight sections: teaching, research, publications, talks, mentoring, awards, service and outreach.",
    downloads: "cv",
    whileMissing:
      "The public CV is built from a version the owner approves, and none has been approved yet. Until then the sections below stay in preparation, and nothing is taken from drafts.",
    related: ["lab", "portfolio"],
  },
  "cv-teaching": {
    source: "records",
    records: "cv-teaching",
    intro: "Courses taught, teaching assistantships and other instruction.",
    whileMissing: cvMissing("teaching record"),
  },
  "cv-research": {
    source: "records",
    records: "cv-research",
    intro: "Research positions and the projects worked on.",
    whileMissing: cvMissing("research record"),
    related: ["lab", "portfolio"],
  },
  "cv-publications": {
    source: "records",
    records: "cv-publications",
    intro: "Papers, preprints and other scholarly outputs.",
    whileMissing: cvMissing("publication"),
    related: ["portfolio"],
  },
  "cv-talks": {
    source: "records",
    records: "cv-talks",
    intro: "Invited talks, conference presentations and posters.",
    whileMissing: cvMissing("talk or presentation"),
  },
  "cv-mentoring": {
    source: "records",
    records: "cv-mentoring",
    intro: "Students and colleagues mentored or supervised.",
    whileMissing: cvMissing("mentoring record"),
  },
  "cv-awards": {
    source: "records",
    records: "cv-awards",
    intro: "Awards, honors and fellowships.",
    whileMissing: cvMissing("award"),
  },
  "cv-service": {
    source: "records",
    records: "cv-service",
    intro: "Service to the research community: reviewing, committees and organizing.",
    whileMissing: cvMissing("service record"),
  },
  "cv-outreach": {
    source: "records",
    records: "cv-outreach",
    intro: "Public engagement and science communication.",
    whileMissing: cvMissing("outreach activity"),
  },
  lab: {
    source: "overview",
    intro:
      "The Lab gathers the collaborative side of the work: people, research areas, partners, facilities and resources.",
    whileMissing:
      "GusmaoLab is a personal research workshop, and no person, partner or facility is listed until it is verified and agreed. The sections below stay in preparation until then.",
    related: ["portfolio", "cv"],
  },
  "lab-people": {
    source: "records",
    records: "lab-people",
    intro: "People who have agreed to a public profile.",
    whileMissing: "No profile has been approved for publication, so nobody is listed.",
    related: ["lab-research-areas"],
  },
  "lab-join-us": {
    source: "planned",
    intro: "Join Us is for opportunities to work or study with the group.",
    whileMissing:
      "There is no open opportunity to announce, so none is shown. If one is approved it will be described here.",
    related: ["contact"],
  },
  "lab-research-areas": {
    source: "records",
    records: "lab-areas",
    intro: "The research areas the work belongs to, each with its projects and outputs.",
    whileMissing: "No research area has been verified for publication yet.",
    related: ["portfolio"],
  },
  "lab-facilities": {
    source: "planned",
    intro:
      "Facilities is for the physical and computational resources the work is done with.",
    whileMissing:
      "No facility has been described, and none is implied. The page waits for details the owner has verified.",
  },
  "lab-partners": {
    source: "records",
    records: "lab-partners",
    intro: "Organizations the work is done with.",
    whileMissing: "No partner has been confirmed for publication.",
    related: ["portfolio"],
  },
  "lab-resources": {
    source: "planned",
    intro: "Resources is for tools, datasets and teaching material meant to be reused.",
    whileMissing:
      "Nothing is published here yet. In the meantime, the Lecture Notes hold the tutorials and short insights.",
    related: ["lecture-notes"],
  },

  // --- Blog & Notes -------------------------------------------------------------------------
  blog: { source: "collection" },
  "lecture-notes": {
    source: "overview",
    intro:
      "Lecture Notes is for learning the subject. It holds four collections that differ in length and purpose: lessons in order, long tutorials, short insights and monthly records of work.",
  },
  "lecture-notes-bearnards-trail": { source: "collection" },
  "lecture-notes-greenhouse": { source: "collection" },
  "lecture-notes-berries": { source: "collection" },
  "lecture-notes-timber-logs": { source: "collection" },

  // --- Writing ------------------------------------------------------------------------------
  writing: {
    source: "overview",
    intro:
      "Writing is the literary side of GusmaoLab. It holds three collections: original prose each month, a series organized into works, and notes from a book club.",
  },
  "writing-months-original": { source: "collection" },
  "writing-kosmos": { source: "collection" },
  "writing-book-club": { source: "collection" },

  // --- Bearnard -----------------------------------------------------------------------------
  "bearnards-area": {
    source: "overview",
    intro:
      "Bearnard's Area is the personal corner of the site, named after its mascot: photos, videos, powerlifting and everyday bear life.",
    whileMissing:
      "Nothing has been chosen for these four pages yet, so each one says so. Bearnard himself is here to keep you company.",
  },
  "bearnards-area-photos": {
    source: "planned",
    intro: "A place for photographs chosen for the site.",
    whileMissing:
      "No photograph has been selected for publication. Bearnard's illustrations and drafts are not photographs and are not shown in their place.",
  },
  "bearnards-area-videos": {
    source: "planned",
    intro: "A place for videos chosen for the site.",
    whileMissing:
      "No video has been chosen, and none is embedded from elsewhere.",
  },
  "bearnards-area-powerlifting": {
    source: "planned",
    intro: "Powerlifting, as a personal interest.",
    whileMissing:
      "Nothing is published yet: no training log, weights or records are shown until the owner supplies them.",
  },
  "bearnards-area-bear-life": {
    source: "planned",
    intro: "Everyday life with Bearnard.",
    whileMissing:
      "No story is published here yet, and none is made up in its place. This page is for everyday life with Bearnard, once there is something to tell.",
  },
}

export const destinationSpec = (id: string): DestinationSpec | undefined => DESTINATIONS[id]
