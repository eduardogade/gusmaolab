/**
 * The homepage's editorial selection of places to begin (P15, D-113). It is a selection, not a
 * second navigation: the global folder row still holds all eleven destinations. Each entry names
 * a registered folder by ID, and its label and URL come from the registry (`siteNavigation`), so
 * a renamed or moved folder changes here by itself and no URL is written down. The sentences are
 * the only text kept here, and they say what a folder is for, never what it contains today.
 *
 * Grouping is an editorial aid, not a colour category: the groups are not the archive's five
 * categories and carry no colour of their own.
 */
import { siteNavigation } from "../navigation/index.ts"

interface RouteSpec {
  /** A registered top-level folder's ID. */
  readonly id: string
  /** What the folder is for, in a sentence. */
  readonly about: string
}

interface GroupSpec {
  readonly id: string
  readonly title: string
  readonly routes: readonly RouteSpec[]
}

export const ARCHIVE_GROUPS: readonly GroupSpec[] = [
  {
    id: "research",
    title: "Research and engineering",
    routes: [
      { id: "portfolio", about: "Projects, with the people, organizations and outputs behind them." },
      { id: "cv", about: "The professional record: research, teaching, publications and service." },
      { id: "lab", about: "Research areas, people and partners." },
    ],
  },
  {
    id: "learning",
    title: "Learning and explanation",
    routes: [
      { id: "lecture-notes", about: "Tutorials, short insights and lessons for learning the subject." },
      { id: "blog", about: "News, announcements and updates, newest first." },
    ],
  },
  {
    id: "writing",
    title: "Writing and personality",
    routes: [
      { id: "writing", about: "Literary writing and reading: monthly pieces, a series and a book club." },
      { id: "bearnards-area", about: "Bearnard's own corner, with photos, videos and bear life." },
    ],
  },
]

/** A group's route as the page draws it: label, URL and the folders inside, all from the registry. */
export interface ArchiveRoute {
  readonly id: string
  readonly label: string
  readonly href: string
  readonly about: string
  /** Labels of the folder's immediate children, in registry order. */
  readonly inside: readonly string[]
}

export interface ArchiveGroup {
  readonly id: string
  readonly title: string
  readonly routes: readonly ArchiveRoute[]
}

export function archiveGroups(): ArchiveGroup[] {
  return ARCHIVE_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    routes: group.routes.map(({ id, about }) => {
      const node = siteNavigation.node(id)
      return {
        id,
        label: node.label,
        href: node.path,
        about,
        // The Blog's own articles are not folders, so a folder without children lists nothing.
        inside: node.children.map((child) => child.label),
      }
    }),
  }))
}

/** One registered page as a plain link: a label and a URL from the registry. */
export function linkTo(id: string): { label: string; href: string } {
  const node = siteNavigation.node(id)
  return { label: node.label, href: node.path }
}
