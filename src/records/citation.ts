/**
 * A display-ready citation of a scholarly output (P11, D-086): one consistent internal
 * format, not a citation-style engine. Every presentation of an output (CV, Portfolio,
 * Lab, a publication list) goes through `citationOf`, so its facts cannot differ between
 * pages.
 *
 * - Authors stay in the order printed. A registered author is named as on the work
 *   (`as`), else by their citation name, else their display name.
 * - Nothing is filled in: a missing venue, year or DOI is simply absent from the text.
 * - The status is stated unless the output is published, so a submitted manuscript or a
 *   preprint never reads as a published, peer-reviewed work.
 */
import { yearOf } from "./dates.ts"
import type { Records } from "./registry.ts"
import { isShown } from "./selectors.ts"
import type { Publication } from "./schema.ts"

export interface CitationAuthor {
  readonly name: string
  /** Set only for a registered person whose record may be shown: a name, never a profile. */
  readonly personId?: string
}

export interface Citation {
  readonly id: string
  readonly title: string
  readonly type: Publication["type"]
  readonly status: Publication["status"]
  /** "Submitted", "In press" or "Preprint"; undefined for a published output. */
  readonly statusLabel?: string
  readonly authors: readonly CitationAuthor[]
  readonly date?: string
  readonly year?: number
  readonly venue?: string
  readonly volume?: string
  readonly issue?: string
  readonly pages?: string
  readonly doi?: string
  /** The DOI link, when there is a DOI; else the official URL, when there is one. */
  readonly link?: string
  /** The whole citation as one line of plain text. */
  readonly text: string
}

const STATUS_LABELS = {
  submitted: "Submitted",
  accepted: "In press",
  preprint: "Preprint",
  published: undefined,
} as const

/** The resolver link of a DOI. Generated here, never stored in a record. */
export const doiUrl = (doi: string): string => `https://doi.org/${doi}`

/** True for a published output of a type that is peer-reviewed by nature. */
export function isPeerReviewed(publication: Publication): boolean {
  return (
    publication.status === "published" &&
    ["journal-article", "conference-paper", "book-chapter"].includes(publication.type)
  )
}

const sentence = (text: string): string => (/[.!?]$/.test(text) ? text : `${text}.`)

export function citationOf(records: Records, publication: Publication): Citation {
  const authors = publication.authors.map((author): CitationAuthor => {
    if (!("personId" in author)) return { name: author.name }
    const person = records.get("people", author.personId)
    const name = author.as ?? person.citationName ?? person.displayName
    return isShown(records, person) ? { name, personId: person.id } : { name }
  })
  const statusLabel = STATUS_LABELS[publication.status]
  const year = publication.date === undefined ? undefined : yearOf(publication.date)
  const { venue, volume, issue, pages, doi } = publication
  let where = ""
  if (venue !== undefined) {
    where = venue
    if (volume !== undefined) where += ` ${volume}`
    if (issue !== undefined) where += `(${issue})`
    if (pages !== undefined)
      where += `${volume !== undefined || issue !== undefined ? ":" : ", "}${pages}`
  }
  // The year follows the venue in parentheses; alone, it stands as it is.
  if (year !== undefined) where = where === "" ? String(year) : `${where} (${year})`
  const parts = [
    sentence(authors.map((author) => author.name).join(", ")),
    sentence(publication.title),
    where === "" ? undefined : sentence(where),
    statusLabel === undefined ? undefined : sentence(statusLabel),
  ]
  const link = doi !== undefined ? doiUrl(doi) : publication.url
  return {
    id: publication.id,
    title: publication.title,
    type: publication.type,
    status: publication.status,
    ...(statusLabel === undefined ? {} : { statusLabel }),
    authors,
    ...(publication.date === undefined ? {} : { date: publication.date, year }),
    ...(venue === undefined ? {} : { venue }),
    ...(volume === undefined ? {} : { volume }),
    ...(issue === undefined ? {} : { issue }),
    ...(pages === undefined ? {} : { pages }),
    ...(doi === undefined ? {} : { doi }),
    ...(link === undefined ? {} : { link }),
    text: parts.filter((part) => part !== undefined).join(" "),
  }
}
