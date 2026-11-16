/**
 * The authoring workflow's shared definitions (P14, D-107 to D-111): what a new article of each
 * collection starts as, which formats a collection accepts, the one list of commands, and the
 * one list of publication checks. Data and pure functions only, so the command-line tool
 * (scripts/content.mjs), the tests and the development workbench (/_design/publishing/) all read
 * the same text and cannot disagree.
 *
 * It declares no collection: identities, directories and owners are src/editorial/collections.ts,
 * metadata rules are src/editorial/schema.ts. What is added here is only what authoring needs on
 * top of them, and a test (tests/authoring.mjs) checks every template against the real schemas.
 *
 * Erasable TypeScript only (D-040): Node.js runs this file directly.
 */
import { collectionById } from "./collections.ts"
import type { CollectionId } from "./collections.ts"
import { SLUG_PATTERN } from "./schema.ts"

// --- Formats ------------------------------------------------------------------------------------

export const FORMATS = ["md", "qmd"] as const
export type SourceFormat = (typeof FORMATS)[number]

/**
 * The collections whose articles may be written in Quarto: those P13 integrated and verified
 * (science/<directory>/<name>.qmd, scripts/science.mjs DIRECTORIES). Every collection takes
 * Markdown. tests/authoring.mjs checks this list against the tool's own.
 */
export const QUARTO_COLLECTIONS: readonly CollectionId[] = ["greenhouse", "trail"]

export const formatsOf = (collection: CollectionId): readonly SourceFormat[] =>
  QUARTO_COLLECTIONS.includes(collection) ? ["md", "qmd"] : ["md"]

/**
 * Where the author's own file lives, relative to the repository root. For Markdown that is the
 * entry; for Quarto it is the `.qmd`, and `src/content/<dir>/<slug>.md` is only its generated
 * registration (never edited, scripts/science.mjs).
 */
export function sourcePath(
  collection: CollectionId,
  slug: string,
  format: SourceFormat,
): string {
  const { directory } = collectionById(collection)
  return format === "qmd"
    ? `science/${directory}/${slug}.qmd`
    : `src/content/${directory}/${slug}.md`
}

/** The generated Markdown registration of a Quarto source: derived, never authoritative. */
export const registrationPath = (collection: CollectionId, slug: string): string =>
  `src/content/${collectionById(collection).directory}/${slug}.md`

// --- Slugs and titles -----------------------------------------------------------------------------

/**
 * A suggested slug from a title, used only when an article is created (D-080: the slug is chosen
 * once and never follows the title). Accents are folded to their letters, everything that is not
 * a letter or digit becomes one hyphen, and the result is cut at a word boundary to 80 characters.
 * Returns "" when nothing usable is left, which the caller reports.
 */
export function slugFromTitle(title: string): string {
  const folded = title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  if (folded.length <= 80) return folded
  const cut = folded.slice(0, 80)
  const at = cut.lastIndexOf("-")
  return (at > 0 ? cut.slice(0, at) : cut).replace(/-+$/, "")
}

export const isSlug = (value: string): boolean =>
  value.length <= 80 && SLUG_PATTERN.test(value)

// --- Collection-specific fields -------------------------------------------------------------------

export interface FieldOption {
  /** The metadata key, exactly as the schema names it. */
  readonly key: string
  /** The command-line flag (without the dashes). */
  readonly flag: string
  readonly type: "string" | "number" | "boolean" | "enum"
  readonly required: boolean
  readonly values?: readonly string[]
  readonly help: string
}

/**
 * What a collection's metadata asks of a new article beyond title and slug. A `required` field
 * is one the schema requires even in a draft (a monthly period, a work, a book). The rest is
 * optional and only written when the author gives it.
 */
export const COLLECTION_FIELDS: Readonly<Record<CollectionId, readonly FieldOption[]>> =
  {
    blog: [
      {
        key: "kind",
        flag: "kind",
        type: "enum",
        required: false,
        values: ["announcement", "update", "news", "microblog", "post"],
        help: "the kind of post",
      },
    ],
    trail: [
      {
        key: "seriesId",
        flag: "series-id",
        type: "string",
        required: false,
        help: "the series' slug",
      },
      {
        key: "seriesTitle",
        flag: "series-title",
        type: "string",
        required: false,
        help: "the series' name",
      },
      {
        key: "position",
        flag: "position",
        type: "number",
        required: false,
        help: "the lesson's place in its series",
      },
    ],
    greenhouse: [
      {
        key: "difficulty",
        flag: "difficulty",
        type: "enum",
        required: false,
        values: ["introductory", "intermediate", "advanced"],
        help: "the level, only if you want to state one",
      },
    ],
    berries: [],
    timberLogs: [
      {
        key: "period",
        flag: "period",
        type: "string",
        required: true,
        help: "the month reported, YYYY-MM",
      },
    ],
    monthsOriginal: [
      {
        key: "period",
        flag: "period",
        type: "string",
        required: true,
        help: "the month, YYYY-MM",
      },
      {
        key: "epigraph",
        flag: "epigraph",
        type: "string",
        required: false,
        help: "an epigraph",
      },
      {
        key: "epigraphSource",
        flag: "epigraph-source",
        type: "string",
        required: false,
        help: "its source",
      },
    ],
    kosmos: [
      {
        key: "workId",
        flag: "work",
        type: "string",
        required: true,
        help: "the work's slug",
      },
      {
        key: "chapterNumber",
        flag: "chapter",
        type: "number",
        required: false,
        help: "a chapter number, if you number them",
      },
      {
        key: "chapterLabel",
        flag: "chapter-label",
        type: "string",
        required: false,
        help: "how you label the chapter",
      },
      {
        key: "position",
        flag: "position",
        type: "number",
        required: false,
        help: "its place in the work",
      },
    ],
    bookClub: [
      {
        key: "bookTitle",
        flag: "book",
        type: "string",
        required: true,
        help: "the book's title",
      },
      {
        key: "bookAuthor",
        flag: "author",
        type: "string",
        required: false,
        help: "the book's author",
      },
      {
        key: "sessionDate",
        flag: "session-date",
        type: "string",
        required: false,
        help: "the discussion's date, YYYY-MM-DD",
      },
      {
        key: "spoilers",
        flag: "spoilers",
        type: "boolean",
        required: false,
        help: "the discussion gives away the plot",
      },
    ],
  }

/** One line in a new article's front matter that says what else can be added, and what it means. */
const HINTS: Readonly<Partial<Record<CollectionId, string>>> = {
  blog: "optional: kind, tags, related. publishedAt is the date shown; it is set when you publish.",
  trail:
    "optional: seriesId, seriesTitle, position, prerequisites. position orders lessons within a series; publishedAt is only the date.",
  greenhouse: "optional: difficulty, prerequisites, references, tags, related.",
  berries: "optional: tags, related.",
  timberLogs: "period is the month reported; publishedAt is the day you publish it.",
  monthsOriginal: "optional: epigraph, epigraphSource.",
  kosmos:
    "optional: chapterNumber, chapterLabel, position, epigraph, epigraphSource. No numbering is assumed.",
  bookClub: "optional: bookAuthor, sessionDate, spoilers.",
}

// --- Templates ----------------------------------------------------------------------------------

/**
 * The marker in every template that stops publication until the author has dealt with it: the
 * publication check refuses an entry that still contains it (scripts/content-lib.mjs).
 */
export const PLACEHOLDER_PATTERN = /\b(?:TODO|FIXME|TBD|XXX)\b|lorem ipsum/i

export interface NewArticle {
  readonly collection: CollectionId
  readonly format: SourceFormat
  readonly title: string
  readonly slug: string
  readonly description?: string
  /** Only when the author asks for a date on a draft. */
  readonly publishedAt?: string
  /** Collection-specific values, by metadata key. */
  readonly fields: Readonly<Record<string, string | number | boolean>>
}

const yamlValue = (value: string | number | boolean): string =>
  typeof value === "string" ? JSON.stringify(value) : String(value)

const BODIES: Readonly<Record<CollectionId, string>> = {
  blog: `<!-- TODO: write the post, then delete this line. -->

One short paragraph: what happened, or what you want to say.
`,
  trail: `<!-- TODO: write the lesson, then delete this line. -->

## What this lesson covers

One paragraph.

## The lesson

Write it.
`,
  greenhouse: `<!-- TODO: write the article, then delete this line. -->

## Background

State the question in a paragraph.

## The idea

Develop it.

## Summary

What the reader should remember.
`,
  berries: `<!-- TODO: write the berry, then delete this line. -->

One concept, in a few paragraphs.
`,
  timberLogs: `<!-- TODO: write the log, then delete this line. -->

## Done this month

## Next
`,
  monthsOriginal: `<!-- TODO: write the piece, then delete this line. -->

Begin.
`,
  kosmos: `<!-- TODO: write the chapter, then delete this line. -->

Begin.
`,
  bookClub: `<!-- TODO: write the notes, then delete this line. -->

## The book

## Discussion
`,
}

/** The Quarto body of a Greenhouse or Trail article: a few examples of what Quarto adds. */
const QUARTO_BODY = `<!-- TODO: replace these examples with your own text, then delete this line. -->

## Background

State the question in a paragraph. A formula in the text is written between dollar signs, as in $y = \\alpha + \\beta x$.

## Method

A numbered equation has a label, so that the text can refer to it:

$$
y = \\alpha + \\beta x
$$ {#eq-linear}

The model is @eq-linear. Code that is only shown, and never run, is an ordinary fence:

\`\`\`python
print("shown, not executed")
\`\`\`

## Results

A table with a caption and a label:

| Quantity | Value |
| -------- | ----- |
| a        | 1     |

: What the table shows. {#tbl-example}

@tbl-example is cited like this. To cite a source, add \`bibliography: <name>.bib\` to the front matter and write \`[@key]\`.
`

/** The text of a new article's source file. Its metadata is valid for the collection's schema. */
export function articleTemplate(article: NewArticle): string {
  const lines = ["---", `title: ${yamlValue(article.title)}`]
  if (article.description !== undefined)
    lines.push(`description: ${yamlValue(article.description)}`)
  else lines.push("# description: one sentence for the index; required to publish")
  lines.push("status: draft", `slug: ${article.slug}`)
  if (article.publishedAt !== undefined)
    lines.push(`publishedAt: ${article.publishedAt}`)
  for (const option of COLLECTION_FIELDS[article.collection]) {
    const value = article.fields[option.key]
    if (value !== undefined) lines.push(`${option.key}: ${yamlValue(value)}`)
  }
  const hint = HINTS[article.collection]
  if (hint !== undefined) lines.push(`# ${hint}`)
  lines.push("---", "")
  const body = article.format === "qmd" ? QUARTO_BODY : BODIES[article.collection]
  return lines.join("\n") + "\n" + body
}

// --- Editing a source's front matter ------------------------------------------------------------

/**
 * Sets one top-level front-matter key in a source file, changing nothing else: not the other
 * lines, not the comments, not the body. An existing line is replaced; a missing key is added
 * after `after` (or at the end of the front matter). Returns null when the text has no front
 * matter, so the caller can say so instead of writing.
 */
export function setFrontMatterField(
  text: string,
  key: string,
  value: string,
  after?: string,
): string | null {
  const eol = text.includes("\r\n") ? "\r\n" : "\n"
  const lines = text.split(eol)
  if (lines[0] !== "---") return null
  const end = lines.indexOf("---", 1)
  if (end < 0) return null
  const own = new RegExp(`^${key}\\s*:`)
  const at = lines.findIndex(
    (line, index) => index > 0 && index < end && own.test(line),
  )
  if (at >= 0) {
    // A key whose value continues on indented lines is not a scalar: leave it to the author.
    const next = lines[at + 1]
    if (at + 1 < end && next !== undefined && /^\s+\S/.test(next)) return null
    lines[at] = `${key}: ${value}`
    return lines.join(eol)
  }
  const anchor = after
    ? lines.findIndex(
        (line, index) =>
          index > 0 && index < end && new RegExp(`^${after}\\s*:`).test(line),
      )
    : -1
  lines.splice(anchor >= 0 ? anchor + 1 : end, 0, `${key}: ${value}`)
  return lines.join(eol)
}

// --- The commands and the checks ----------------------------------------------------------------

export interface CommandDefinition {
  /** The word after `content:` in `npm run content:<id>`. */
  readonly id: "new" | "validate" | "preview" | "publish" | "archive"
  readonly script: string
  readonly summary: string
  /** A command line that works as written once the placeholders are replaced. */
  readonly examples: readonly string[]
  /** Whether it changes a source file. */
  readonly writes: boolean
}

/**
 * The one list of commands. package.json exposes exactly these (a test compares them), the guide
 * and the README quote them, and the workbench prints them from here.
 */
export const COMMANDS: readonly CommandDefinition[] = [
  {
    id: "new",
    script: "content:new",
    summary:
      "Create a draft: a Markdown file, or a Quarto source with its registration.",
    writes: true,
    examples: [
      'npm run content:new -- --collection greenhouse --title "My Article"',
      'npm run content:new -- --collection greenhouse --format qmd --title "My Scientific Tutorial"',
    ],
  },
  {
    id: "validate",
    script: "content:validate",
    summary: "Check one article, or all of them. Changes nothing.",
    writes: false,
    examples: [
      "npm run content:validate -- --all",
      "npm run content:validate -- --collection greenhouse --slug my-article",
    ],
  },
  {
    id: "preview",
    script: "content:preview",
    summary:
      "Show where an article is, its state, and its local address. Changes nothing.",
    writes: false,
    examples: ["npm run content:preview -- --collection greenhouse --slug my-article"],
  },
  {
    id: "publish",
    script: "content:publish",
    summary:
      "Check a draft as it would be published and show the change; with --yes, make it.",
    writes: true,
    examples: [
      "npm run content:publish -- --collection greenhouse --slug my-article --date 2026-11-20",
      "npm run content:publish -- --collection greenhouse --slug my-article --date 2026-11-20 --yes",
    ],
  },
  {
    id: "archive",
    script: "content:archive",
    summary:
      "Mark a published article as archived; its address and date stay. With --yes, make it.",
    writes: true,
    examples: [
      "npm run content:archive -- --collection greenhouse --slug my-article",
      "npm run content:archive -- --collection greenhouse --slug my-article --yes",
    ],
  },
]

export type Level = "error" | "warning" | "info"

export interface PreflightCheck {
  readonly id: string
  readonly group:
    | "metadata"
    | "identity"
    | "relationships"
    | "markdown"
    | "quarto"
    | "safety"
  readonly summary: string
  /**
   * `error`: always blocks. `critical`: a warning while the entry is a draft and an error once
   * it is, or is about to be, public. `warning`: reported, never blocks.
   */
  readonly severity: "error" | "critical" | "warning"
}

/**
 * The one list of publication checks. scripts/content-lib.mjs gives every finding one of these
 * ids, the workbench's checklist is printed from this list, and a test fails when a finding uses
 * an id that is not here.
 */
export const PREFLIGHT_CHECKS: readonly PreflightCheck[] = [
  {
    id: "metadata.syntax",
    group: "metadata",
    severity: "error",
    summary: "The front matter exists and is valid YAML, with real calendar dates.",
  },
  {
    id: "metadata.schema",
    group: "metadata",
    severity: "error",
    summary:
      "The metadata satisfies the collection's schema: known fields, a supported status, a valid slug, the collection's own required fields.",
  },
  {
    id: "metadata.publication",
    group: "metadata",
    severity: "critical",
    summary: "A published or archived entry has a description and a publication date.",
  },
  {
    id: "identity.slug",
    group: "identity",
    severity: "error",
    summary:
      "The slug is unique in its collection, and order fields (position, chapter) are not shared.",
  },
  {
    id: "identity.route",
    group: "identity",
    severity: "error",
    summary: "The public address does not collide with a folder or another page.",
  },
  {
    id: "identity.source",
    group: "identity",
    severity: "error",
    summary:
      "There is one authoritative source: no hand-written entry beside a Quarto source, and a generated registration is never edited.",
  },
  {
    id: "identity.stable",
    group: "identity",
    severity: "error",
    summary:
      "A public entry's slug is unchanged since the last commit: a changed address is a migration, not an edit.",
  },
  {
    id: "identity.filename",
    group: "identity",
    severity: "warning",
    summary: "The file name matches the slug.",
  },
  {
    id: "relationships.entries",
    group: "relationships",
    severity: "error",
    summary: "Every related entry exists, and none is the entry itself.",
  },
  {
    id: "relationships.records",
    group: "relationships",
    severity: "error",
    summary: "Every canonical record the entry names exists.",
  },
  {
    id: "relationships.public",
    group: "relationships",
    severity: "critical",
    summary:
      "A public entry relates only to public entries: a draft is never recommended.",
  },
  {
    id: "markdown.heading-level",
    group: "markdown",
    severity: "error",
    summary: "The body has no level-1 heading: the title is the page's one.",
  },
  {
    id: "markdown.heading-order",
    group: "markdown",
    severity: "warning",
    summary: "Heading levels do not skip.",
  },
  {
    id: "markdown.links",
    group: "markdown",
    severity: "critical",
    summary:
      "Internal links point at pages of the site, and are written from the site root.",
  },
  {
    id: "markdown.resources",
    group: "markdown",
    severity: "critical",
    summary: "Images and files named by a site path exist in public/.",
  },
  {
    id: "quarto.freshness",
    group: "quarto",
    severity: "error",
    summary:
      "The generated article is current with its source: not missing, stale or edited by hand.",
  },
  {
    id: "quarto.execution",
    group: "quarto",
    severity: "error",
    summary:
      "Code in a source has been executed in its current form (only the explicit execute command runs it).",
  },
  {
    id: "quarto.references",
    group: "quarto",
    severity: "critical",
    summary: "The rendered article has no unresolved cross-reference or citation.",
  },
  {
    id: "safety.placeholders",
    group: "safety",
    severity: "critical",
    summary:
      "No authoring placeholder (TODO, FIXME, TBD, XXX, lorem ipsum) is left in the text.",
  },
  {
    id: "safety.local",
    group: "safety",
    severity: "critical",
    summary: "No local file path or localhost address is in the text.",
  },
  {
    id: "safety.synthetic",
    group: "safety",
    severity: "error",
    summary:
      "A real entry is not a demonstration: no synthetic marker in its metadata or text.",
  },
]

const CHECK_IDS = new Set(PREFLIGHT_CHECKS.map((check) => check.id))
export const isCheckId = (id: string): boolean => CHECK_IDS.has(id)

/** The finding's level: a critical check is only a warning for a draft that is staying one. */
export function levelOf(
  check: PreflightCheck["severity"],
  becomesPublic: boolean,
): Level {
  if (check === "error") return "error"
  if (check === "warning") return "warning"
  return becomesPublic ? "error" : "warning"
}

export interface LifecycleState {
  readonly status: "draft" | "published" | "archived"
  readonly meaning: string
  readonly route: string
}

/** What each publication state means; the same words as planning/content-model.md. */
export const LIFECYCLE: readonly LifecycleState[] = [
  {
    status: "draft",
    meaning:
      "Being written. Previewable with the dev server; no page, no listing and no link in a build.",
    route: "none in a build",
  },
  {
    status: "published",
    meaning: "Has its page and its place in the collection's index.",
    route: "its address",
  },
  {
    status: "archived",
    meaning:
      "Kept for the record and marked as historical. Same address, same date, still listed.",
    route: "its address, unchanged",
  },
]
