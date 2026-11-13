/**
 * The authoritative GusmaoLab navigation registry (P04).
 *
 * Provenance: the first-level sections, their order and labels, and the second-level
 * folders come from the approved P04 brief (sections 4 and 5), matching
 * planning/information-architecture.md. P09-A01 (D-076) removed External, leaving eleven
 * sections, and gave each one its permanent archive category. P10 grouped the row by
 * category: tabs of one category are adjacent (D-077), which tests/categories.mjs enforces. No third-level folder is
 * approved yet, so none is declared here; the model supports three levels, and the tests
 * use synthetic fixtures.
 *
 * `category` is the section's cardstock: the colour its tab keeps on every page, and the
 * materials of everything inside it (src/styles/categories.css). It is declared on
 * first-level sections only; their folders inherit it. `environment` is separate: it
 * chooses typography and texture, never colour (src/styles/environments.css).
 *
 * Paths are derived: a tab's path is its parent's path plus its slug, so a folder cannot
 * escape its parent. Slugs are the recommended canonical URLs, chosen in P04 and
 * changeable before publication. IDs are stable and never change with a label.
 *
 * To add a tab, add an entry here: no component should hardcode labels or URLs.
 */
import type { ContentRoute, NavigationEntry } from "./types.ts"

export const SECTIONS: readonly NavigationEntry[] = [
  // Core
  { id: "home", label: "Home", slug: "", category: "core" }, // /
  { id: "about", label: "About", slug: "about", category: "core" },
  { id: "contact", label: "Contact", slug: "contact", category: "core" },
  { id: "schedule", label: "Schedule", slug: "schedule", category: "core" },
  // Research
  {
    id: "portfolio",
    label: "Portfolio",
    slug: "portfolio",
    category: "research",
    environment: "scientific",
  },
  {
    id: "cv",
    label: "CV",
    slug: "cv",
    category: "research",
    environment: "scientific",
    children: [
      { id: "cv-teaching", label: "Teaching", slug: "teaching" },
      { id: "cv-research", label: "Research", slug: "research" },
      { id: "cv-publications", label: "Publications", slug: "publications" },
      { id: "cv-talks", label: "Talks / Presentations", slug: "talks" },
      { id: "cv-mentoring", label: "Mentoring / Supervision", slug: "mentoring" },
      { id: "cv-awards", label: "Awards & Honors", slug: "awards" },
      { id: "cv-service", label: "Service", slug: "service" },
      { id: "cv-outreach", label: "Outreach / Public Engagement", slug: "outreach" },
    ],
  },
  {
    id: "lab",
    label: "Lab",
    slug: "lab",
    category: "research",
    environment: "scientific",
    children: [
      { id: "lab-people", label: "People", slug: "people" },
      { id: "lab-join-us", label: "Join Us", slug: "join-us" },
      { id: "lab-research-areas", label: "Research Areas", slug: "research-areas" },
      { id: "lab-facilities", label: "Facilities", slug: "facilities" },
      { id: "lab-partners", label: "Partners", slug: "partners" },
      { id: "lab-resources", label: "Resources", slug: "resources" },
    ],
  },
  // Blog & Notes
  // Blog articles arrive as content routes (P10).
  { id: "blog", label: "Blog", slug: "blog", category: "blog-notes" },
  {
    id: "lecture-notes",
    label: "Lecture Notes",
    slug: "lecture-notes",
    category: "blog-notes",
    environment: "technical",
    children: [
      {
        id: "lecture-notes-bearnards-trail",
        label: "Bearnard's Trail",
        slug: "bearnards-trail",
      },
      { id: "lecture-notes-greenhouse", label: "The Greenhouse", slug: "greenhouse" },
      { id: "lecture-notes-berries", label: "Berries", slug: "berries" },
      { id: "lecture-notes-timber-logs", label: "Timber Logs", slug: "timber-logs" },
    ],
  },
  // Writing
  {
    id: "writing",
    label: "Writing",
    slug: "writing",
    category: "writing",
    environment: "literary",
    children: [
      {
        id: "writing-months-original",
        label: "Months' Original",
        slug: "months-original",
      },
      { id: "writing-kosmos", label: "Kosmos Series", slug: "kosmos" },
      { id: "writing-book-club", label: "Book Club", slug: "book-club" },
    ],
  },
  // Bearnard
  {
    id: "bearnards-area",
    label: "Bearnard's Area",
    slug: "bearnards-area",
    category: "bearnard",
    environment: "personal",
    children: [
      { id: "bearnards-area-photos", label: "Photos", slug: "photos" },
      { id: "bearnards-area-videos", label: "Videos", slug: "videos" },
      {
        id: "bearnards-area-powerlifting",
        label: "Powerlifting",
        slug: "powerlifting",
      },
      { id: "bearnards-area-bear-life", label: "Bear Life", slug: "bear-life" },
    ],
  },
]

/**
 * Pages below the folder tabs, each owned by a folder. Empty until content exists: the
 * content-collection prompts (Wave III) will generate these entries from their
 * collections at build time and pass them to createNavigation().
 */
export const CONTENT_ROUTES: readonly ContentRoute[] = []
