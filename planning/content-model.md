# Content model

Status: the eight editorial collections were established in P10 (2026-11-13, D-078 to D-082), and the canonical records in P11 (2026-11-13, D-083 to D-088). Both hold no real entry or record yet: the systems exist, the content is the owner's to supply. Differentiated reading layouts are P12, Quarto is P13, and authoring helpers are P14.

## Editorial collections

Eight independent publishing identities that share one pipeline. Each has its own directory, its own metadata extensions, its own public prefix and one owning folder. None holds a published entry yet: an empty collection is a normal state, and no content was written, migrated or invented in P10.

| ID | Public collection | Directory in `src/content/` | Owning folder | Public prefix | Category |
| --- | --- | --- | --- | --- | --- |
| `blog` | Blog | `blog/` | Blog (`blog`) | `/blog/` | Blog & Notes |
| `trail` | Bearnard's Trail | `trail/` | `lecture-notes-bearnards-trail` | `/lecture-notes/bearnards-trail/` | Blog & Notes |
| `greenhouse` | The Greenhouse | `greenhouse/` | `lecture-notes-greenhouse` | `/lecture-notes/greenhouse/` | Blog & Notes |
| `berries` | Berries | `berries/` | `lecture-notes-berries` | `/lecture-notes/berries/` | Blog & Notes |
| `timberLogs` | Timber Logs | `timber-logs/` | `lecture-notes-timber-logs` | `/lecture-notes/timber-logs/` | Blog & Notes |
| `monthsOriginal` | Months' Original | `months-original/` | `writing-months-original` | `/writing/months-original/` | Writing |
| `kosmos` | Kosmos Series | `kosmos/` | `writing-kosmos` | `/writing/kosmos/` | Writing |
| `bookClub` | Book Club | `book-club/` | `writing-book-club` | `/writing/book-club/` | Writing |

What each is for:

- **Blog:** news, announcements, updates and microblogging, in chronological order.
- **Bearnard's Trail:** ongoing learning: related lessons in continuing subjects, in reading order where it matters.
- **The Greenhouse:** longer technical tutorials and scientific explanations, with references, code, mathematics and figures.
- **Berries:** short technical insights; compact, one concept each.
- **Timber Logs:** monthly records of work completed, with reflections and progress.
- **Months' Original:** monthly original literary essays and short prose.
- **Kosmos Series:** literary prose organized into works and, eventually, chapters (Pikokosmos, Nanokosmos, Mikrokosmos, Milikosmos, Kosmos): stable ordering and work identity.
- **Book Club:** reading notes, book discussions and literary commentary.

### Where things are

| Concern | File |
| --- | --- |
| The eight collections: ID, label, directory, owning folder (data only) | `src/editorial/collections.ts` |
| Metadata schemas, written with Zod through `astro/zod` | `src/editorial/schema.ts` |
| Routing, ordering, index and clash rules (pure functions) | `src/editorial/model.ts` |
| Raw date guard (see "Dates") | `src/editorial/raw-dates.ts` |
| Astro wiring: loaders and schemas | `src/content.config.ts` |
| Astro wiring: loading, navigation with entry routes, static paths | `src/editorial/site.ts` |
| Rendering: one entry, one collection index | `src/components/editorial/EditorialEntry.astro`, `CollectionIndex.astro` |
| Synthetic test fixtures (never loaded by the site) | `tests/fixtures/editorial/` |

### Entries and identifiers

One Markdown file per entry, in its collection's directory. Three things are kept apart:

- **Entry ID:** the file's path below its directory, without `.md` (`chromatin-architecture`). Internal; chosen for the author's convenience; renaming a file never moves a page.
- **Slug:** the `slug` in the metadata, chosen by the author. It is the last segment of the public URL.
- **Public URL:** the owning folder's path plus the slug: `/lecture-notes/berries/<slug>/`. Neither the title nor the file name enters it.

A slug is one segment of lowercase letters, digits and single hyphens (at most 80 characters), unique within its collection whatever the entry's status, so publishing a draft can never clash with a page that exists. Entry URLs are **content routes** owned by the collection's folder (D-039): they get no tab, never enter the registry, and show inside the owner's folder body, with the page's Level 1 and Level 2 tabs selected as they are on the folder's own page. Files whose names start with `_` are ignored.

### Common metadata

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `title` | text | always | Human-readable title. |
| `status` | `draft`, `published`, `archived` | always | Explicit: there is no default. |
| `slug` | slug | always | Stable public URL segment. |
| `description` | text | published, archived | Summaries, indexes, the page's meta description. |
| `publishedAt` | date | published, archived | `YYYY-MM-DD`. A draft may omit it. |
| `updatedAt` | date | never | A substantive update, not a commit; not before `publishedAt`. |
| `tags` | list of slugs | never | Defaults to none; no repeats. |

`relatedRecords` (P11, optional, default none) lists the canonical records an entry is about, by ID: see "Entries and records" below.

Unknown fields are rejected, so a misspelt key is an error and never a silent omission. The schemas are Zod objects in `src/editorial/schema.ts`; Astro validates every entry against them while it loads the collection, and an invalid file fails the build with the file named.

**Proposed, not implemented** (no reader yet, so no field): `heroImage`, `mascot` (to be validated against the Bearnard registry's IDs, never a path to a master), `related` and `featured`. They belong to P12's reading layouts and the homepage; adding one is a schema change plus a test.

### Collection extensions

| Collection | Field | Type | Required | Notes |
| --- | --- | --- | --- | --- |
| Blog | `kind` | `announcement`, `update`, `news`, `microblog`, `post` | no | Default `post`. |
| Bearnard's Trail | `seriesId` | slug | no | The learning sequence the entry belongs to. |
| | `position` | positive integer | no | Needs `seriesId`; unique within a series. |
| | `prerequisites` | list of text | no | Free text or links; not resolved yet. |
| The Greenhouse | `difficulty` | `introductory`, `intermediate`, `advanced` | no | |
| | `prerequisites`, `references` | list of text | no | Ordinary links or strings; there is no citation manager (P11 and later). |
| Berries | none | | | The shared `tags` are enough. |
| Timber Logs | `period` | `YYYY-MM` | always | The month recorded. Never derived from a display date. |
| Months' Original | `period` | `YYYY-MM` | always | The month of the essay. |
| Kosmos Series | `workId` | slug | always | The literary work the entry belongs to. |
| | `chapterNumber` | positive integer | no | Unique within a work. An entry without one is the work's own page. |
| | `position` | positive integer | no | Unique within a work; overrides `chapterNumber` in the order. |
| Book Club | `bookTitle` | text | always | |
| | `bookAuthor` | text | no | |
| | `sessionDate` | date | no | The meeting or session. |

A book, a work and a series are plain fields for now, not entities: P11 may turn them into canonical records without rewriting entries.

### Copyable frontmatter

Every example is a template. Nothing here is a real entry.

```yaml
# src/content/blog/<file>.md
---
title: "A title"
description: "One sentence for indexes and previews."
publishedAt: 2026-11-13
status: draft          # draft | published | archived
slug: a-title
kind: update           # optional; default post
tags: [announcement]
---
```

```yaml
# src/content/trail/<file>.md
---
title: "A lesson"
description: "…"
publishedAt: 2026-11-13
status: draft
slug: a-lesson
seriesId: a-series     # optional
position: 1            # optional; needs seriesId
prerequisites: ["Another lesson"]
---
```

```yaml
# src/content/greenhouse/<file>.md
---
title: "A tutorial"
description: "…"
publishedAt: 2026-11-13
status: draft
slug: a-tutorial
difficulty: intermediate
prerequisites: ["Linear algebra"]
references: ["Author (2020). Title. https://example.org"]
---
```

```yaml
# src/content/berries/<file>.md
---
title: "One concept"
description: "…"
publishedAt: 2026-11-13
status: draft
slug: one-concept
tags: [chromatin]
---
```

```yaml
# src/content/timber-logs/<file>.md   (the same two fields serve months-original/)
---
title: "Timber log, November 2026"
description: "…"
publishedAt: 2026-12-01
status: draft
slug: 2026-11
period: 2026-11
---
```

```yaml
# src/content/kosmos/<file>.md
---
title: "A chapter"
description: "…"
publishedAt: 2026-11-13
status: draft
slug: a-chapter
workId: a-work
chapterNumber: 1
---
```

```yaml
# src/content/book-club/<file>.md
---
title: "Notes on a book"
description: "…"
publishedAt: 2026-11-13
status: draft
slug: notes-on-a-book
bookTitle: "A Book"
bookAuthor: "An Author"
sessionDate: 2026-11-08
---
```

### Dates

- A date is a **calendar date**, `YYYY-MM-DD`, with no time and no zone, so ordering and display never depend on the reader's time zone. A period is `YYYY-MM`.
- The YAML parser reads an unquoted `2026-11-13` as a date; the schema accepts it and converts it back to `2026-11-13`. A date carrying a time, or any other text, is rejected.
- **The parser also corrects impossible dates without a word**: an unquoted `2026-02-30` becomes `2026-03-02` before any schema sees it. `src/editorial/raw-dates.ts` therefore checks the raw text of the three date fields before parsing, and the build fails, naming the file, the field and the value. A quoted impossible date is a string, which the schema rejects.
- Dates are shown as `13 November 2026` and `November 2026`, computed from the digits alone, with no locale.

### Publication state

| Status | Page | Index | Notes |
| --- | --- | --- | --- |
| `draft` | none, in a build | never | Validated, kept in the repository, absent from the output, indexes and any future feeds. |
| `published` | yes | yes | Needs a description and a publication date. |
| `archived` | yes, same URL | yes, marked "archived" | A previously published entry, kept and marked historical. Not the same as a draft. |

The state decides **route generation**, not only the lists: a production build generates no page for a draft. `astro dev` alone also serves drafts, at the URL they will have, with a "Draft preview" notice, so an author can read a draft before publishing; they stay out of every index there too.

### Index order

Every order is total: the slug, unique within a collection, breaks every tie, so the same entries always list the same way.

| Collection | Order |
| --- | --- |
| Blog, Berries, The Greenhouse | Newest publication first. |
| Timber Logs, Months' Original | Newest period first, then newest publication. |
| Book Club | Newest session first, then newest publication. |
| Bearnard's Trail | By series, then position (unplaced last), then newest; entries outside a series come after every series. |
| Kosmos Series | By work, then position or chapter number (a work's own entry first). **Provisional**: the order of the works themselves is the owner's decision. |

A collection's index appears on its owning folder's own page (Blog's page, Berries' Overview and so on) and lists link, date and description; with no entries it says "This collection has no published entries yet." The indexes are a foundation; P12 designs the real ones.

### Rendering

`EditorialEntry.astro` renders title, description, dates, an archived or draft notice and the Markdown body through Astro's own `render()`, inside the owning folder's paper: the category's reading paper and the global typography, no new font and no colour of its own. Headings, lists, tables (scrolling inside themselves), code blocks, links and images are styled minimally. Standard Markdown only: MDX (and Quarto) are not installed and are decided in P13.

### Authoring workflow

1. Pick the collection and create `src/content/<directory>/<file>.md`.
2. Paste the frontmatter above, set a `slug`, and keep `status: draft`.
3. Write the body in Markdown.
4. Preview with `npm run dev`: the draft is served at its future URL.
5. When it is ready, add the description and `publishedAt` and set `status: published`.
6. `npm run verify` builds the site and runs the tests; a schema error names the file.
7. Commit the entry. Nothing else needs editing: the page, the index entry and the route appear from the file.

To retire an entry without breaking its link, set `status: archived`. To take one off the site, set `draft`; its URL then disappears.

### Extension points

- **Deeper Kosmos URLs.** A slug is one segment, so `/writing/kosmos/<slug>/` is the deepest entry URL. Series and chapter paths such as `/writing/kosmos/<work>/<chapter>/` would need one explicit route file for that depth and a rule for the slug; it is not built, and no such route exists, until the owner approves the Kosmos structure. The visible folders stay at three levels whatever the URL length.
- **A ninth collection:** add it to `collections.ts`, `schema.ts` and `content.config.ts`, give it an owning folder, and add the tests.
- **A new field:** add it to the schema, to the collection's table above, and to the tests; `heroImage`, `mascot`, `related` and `featured` are the candidates.
- **Feeds, sitemaps and related-content indexes** read `routableRecords()` and `indexItems()`, so they inherit the draft rule.

## Canonical records

**One authoritative record, many contextual presentations** (P11, D-083). A project, a publication, a person or an appointment is written once and referred to by its ID; the CV, the Portfolio, the Lab and any publication list compute their own view of it and keep no copy. Records are structured data, not articles: they are a different system from the editorial collections above, and the two meet only through explicit references.

**All eight families are empty.** P11 built and tested the system with a synthetic fixture; no real record was written, imported or inferred (D-087).

### Families

| Family | ID prefix | What it is |
| --- | --- | --- |
| `people` | `person-` | Someone who can be referred to: the owner, a co-author, a collaborator. A record is not a profile. |
| `organizations` | `organization-` | A university, institute, laboratory, company, public institution or consortium. |
| `researchAreas` | `area-` | A research area. Its projects and outputs are derived. |
| `projects` | `project-` | A research or engineering project (research, software, platform, infrastructure). |
| `publications` | `publication-` | A scholarly output: article, conference paper, preprint, chapter, dataset, software, report, thesis. |
| `appointments` | `appointment-` | A position a person holds or held at an organization. |
| `education` | `education-` | A degree or formal qualification. |
| `activities` | `activity-` | Teaching, presentations, mentoring, awards, service and outreach, told apart by `type`. |

Funding and grants are not a family yet: nothing in P11 needed them (see "Extension points").

### Where things are

| Concern | File |
| --- | --- |
| The site's records: one typed list per family, all empty | `src/data/records/` (`people.ts`, `organizations.ts`, `research-areas.ts`, `projects.ts`, `publications.ts`, `appointments.ts`, `education.ts`, `activities.ts`, `index.ts`) |
| Schemas, families, ID patterns, types | `src/records/schema.ts` |
| Partial dates and periods | `src/records/dates.ts` |
| Validation across records, and the frozen store | `src/records/registry.ts` |
| Questions pages ask (derived relationships, orders, visibility) | `src/records/selectors.ts` |
| CV, Portfolio and Lab view models | `src/records/projections.ts` |
| The citation of an output | `src/records/citation.ts` |
| The site's validated store, `siteRecords` | `src/records/index.ts` |
| The synthetic fixture (never the site's data) | `src/design/records-fixture.ts` |
| Design study, development only | `/_design/records/` |
| Tests | `tests/records.mjs` (REC-001 to REC-026) |

### Source format

**Typed TypeScript data modules**, one list per family, validated by Zod when the module loads (D-083). Chosen over YAML and JSON because the project has no YAML parser of its own and adding one is a dependency; because the editor checks a record as it is typed and completes its fields; because dates are plain text, so the YAML date hazard of P10 (KL-41) cannot occur; and because the same files load in the build and in plain Node.js tests. Records do **not** use Astro's Content Layer: the eight editorial collections stay exactly eight.

A record looks like this (a template, not a real record):

```ts
// src/data/records/projects.ts
export const projects: readonly ProjectInput[] = [
  {
    id: "project-example",
    visibility: "public",
    provenance: { status: "verified", source: "owner, 2026-11", reviewedAt: "2026-11-13" },
    title: "Example",
    kind: "software",
    status: "active",
    period: { start: "2024-03", end: "present" },
    participants: [{ personId: "person-example", role: "Lead" }],
  },
]
```

### Identity, visibility and provenance

Every record has three things:

| Field | Values | Meaning |
| --- | --- | --- |
| `id` | `<prefix>-<lowercase-kebab-name>` | Stable, unique across all records, independent of any title, of the record's position in its list and of anything private (never an email). Renaming a thing never changes its ID. |
| `visibility` | `public`, `hidden` | Whether the record may be shown. Explicit: there is no default. |
| `provenance.status` | `verified`, `imported`, `unreviewed`, `synthetic` | How far the facts have been checked. Optional `source` (where they come from, in the owner's words), `url` (a public page that supports them) and `reviewedAt` (`YYYY-MM-DD`). |

- **A record is shown only if it is `public` and `verified`.** `imported` (brought in, not yet confirmed) and `unreviewed` (legacy or draft) records can sit in the data and are never rendered. `synthetic` is for tests and studies: the site's dataset refuses it outright.
- **Neither field is a security boundary.** The repository is public, and so is everything in `src/data/records/`, shown or not. Nothing confidential belongs in a record: no private contact detail, no unpublished manuscript's content, no student's personal history.
- **Four separate things:** the record's ID; an optional `slug` (projects only, so far) that reserves a future address; an actual route (none exists: a record creates no page); and the decision to show it. P11 generates no page for any entity.

### Fields

Unknown fields are rejected. A fact that is not known is left out; no field has a guessing default.

**People.** `displayName` (required); `sortName`, `citationName` (how the name is printed in author lists), `professionalTitle`, `shortBiography`, `orcid` (checked, including its check digit; never generated), `links` (`label`, `url`), `researchAreaIds`, `profile` (`none` by default, `public` only when a dedicated profile has been agreed). No email, no portrait. Affiliations are not stored on the person: they are the person's appointments.

**Organizations.** `name`, `type` (`university`, `research-institute`, `laboratory`, `company`, `public-institution`, `consortium`, `other`) required; `shortName`, `website`, `location`, `parentId` (the one hierarchy: it may not loop), `relations` (`member-of`, `partner-of`, `hosted-by` another organization; these need not form a tree and may be mutual).

**Research areas.** `title` required; `summary`, `keywords`.

**Projects.** `title`, `kind` (`research`, `software`, `platform`, `infrastructure`, `other`), `status` (`planned`, `active`, `completed`, `archived`) required; `shortDescription`, `period`, `researchAreaIds`, `participants` (`personId`, optional `role`), `organizationIds`, `links` (`repository`, `documentation`, `website`), `slug`. A status is stated, never inferred from a repository or a last commit.

**Scholarly outputs.** `title`, `type`, `status`, `authors` (at least one) required; `date`, `venue`, `volume`, `issue`, `pages`, `doi`, `url`, `projectIds`, `researchAreaIds`, `related`.

- `status`: `submitted` (under review), `accepted` (in press), `preprint` (public, not reviewed), `published`. A `preprint`-type output has the status `preprint` and nothing else has; a published or preprint output needs its date, at least the year.
- `authors` is an ordered list and is never sorted. Each author is either `{ personId, as? }` (a registered person; `as` is the name exactly as printed on this work) or `{ name }` (an external credit, which needs no person record). A person appears once.
- `doi` is stored in one form, the bare lowercase identifier (`10.1234/abc`): a pasted `https://doi.org/…` or `doi:…` is reduced to it, and the link is generated. No metadata is fetched.
- `related` ties outputs together (`preprint-of`, `version-of`, `supplement-to`). A preprint and its article are two records; nothing merges outputs by title.

**Appointments.** `personId`, `organizationId`, `type` (`employment`, `academic`, `visiting`, `affiliation`, `other`) required; `title` (required unless the type is `affiliation`: a tie without a post), `period`, `summary`, `location`, `projectIds`. Titles are kept as given. Positions may overlap.

**Education.** `personId`, `institutionId`, `qualification`, `level` (`undergraduate`, `masters`, `doctorate`, `other`), `status` (`completed`, `in-progress`, `incomplete`) required; `field`, `startDate`, `completionDate` (only when completed), `thesisTitle`, `supervisorIds`. Several qualifications at one level are fine; no date is inferred from a sequence of degrees.

**Activities.** `personId` and `type` required, plus:

| `type` | Required | Optional |
| --- | --- | --- |
| `teaching` | `title` (the course) | `role`, `organizationId`, `period`, `resources` |
| `presentation` | `title`, `presentationType` (`invited`, `keynote`, `contributed`, `poster`, `seminar`, `other`) | `event`, `date`, `location`, `publicationIds`, `projectIds` |
| `mentoring` | `mentorshipType` (`supervision`, `co-supervision`, `mentoring`) | `level`, `menteeId`, `topic`, `organizationId`, `period`, `projectIds` |
| `award` | `name` | `grantorId`, `date` |
| `service` | `serviceType` (`committee`, `review`, `organizing`, `editorial`, `advisory`, `other`), `role` | `body`, `organizationId`, `period` |
| `outreach` | `title` | `event`, `date`, `organizationId`, `url` |

Every activity may carry a `summary`. A mentoring record does not have to name anyone, and a mentee is named on a page only if their own record may be shown.

### Dates

- A date is text at the precision that is known: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. `2022` stays `2022`: it is never stored, compared or shown as 1 January 2022. Impossible dates are rejected.
- A `period` has an optional `start` and an optional `end`. `end: "present"` says the thing is ongoing. **A missing end means only that the end is not recorded; it is never shown as "present".**
- An end is rejected only when it is certainly before the start, comparing as far as both are known (`2021` is not before `2021-06`).
- **Order.** A less precise date sorts where its period begins: `2022` < `2022-01` < `2022-01-01` < `2022-06`. So in a newest-first list a year-only entry follows the dated entries of the same year. That is a rule for ordering, not a claim about the date. Every order ends with the record's ID, so it is total.
- Display: `2022`, `June 2022`, `14 June 2022`; `March 2021 – present`; `2019` for a start with no recorded end.

### Relationships

- **By ID, checked.** Every reference must name an existing record of the right family; a wrong prefix, an unknown ID, a repeat in a list, a person as their own mentee or supervisor, and an organization as its own parent are all errors, each reported with the record that made it.
- **Stored on one side, derived on the other.** An output names its projects and areas; a project names its areas, participants and organizations; an appointment names its person and organization. The reverse (a project's outputs, an area's projects, a person's publications, collaborators) is computed by the selectors and never written down, so two lists cannot disagree.
- **Only a declared hierarchy may not loop.** That is one field: an organization's `parentId`. Everything else is a graph, and records may refer to each other through different relations.
- **Validation is all-or-nothing.** Every problem in a dataset is listed, in a stable order, and an invalid dataset fails the build; it never half-loads. A record that fails its own schema is reported once, and references to it are not also reported as missing.

### Selectors, projections and citations

- **Selectors** (`src/records/selectors.ts`) answer the questions pages ask: projects in an area, outputs of a project, outputs by a person, a person's positions (current ones first), education, activities of one type, collaborators, related outputs, an organization's lineage. They are pure, deterministic, return new lists, and return only records that may be shown unless a tool asks for everything.
- **Projections** (`projections.ts`) shape records for a kind of page and hold no facts: `cvProjection(records, personId)` (dated lines by section), `portfolioProjection(records)` (projects with people, organizations, links and outputs) and `labProjection(records)` (areas with their projects and outputs, profiled people, the projects' organizations). They are parameters all the way: none knows whose CV it draws.
- **Citations** (`citation.ts`). Every presentation of an output goes through `citationOf`, so its facts cannot differ between pages. One internal format, not a citation-style engine: `Authors. Title. Venue volume(issue):pages (year). Status.` Missing parts are absent, never filled in; the status is stated unless the output is published, so a submitted manuscript or a preprint never reads as a peer-reviewed publication. An author is named even when their person record is hidden (the author list is part of the work), and nothing else about them is shown.

CSL tooling (the empty `publications/style.csl` hints at an earlier intention) is a future consideration for real bibliographies; nothing was installed.

### Entries and records

An editorial entry may say which canonical records it is about:

```yaml
relatedRecords:
  - project-example
  - publication-example-2024
```

- Optional in all eight collections; a literary entry usually has none. Each value must be a well-formed record ID, listed once.
- The build checks that every ID exists in the site's records, drafts included, and fails otherwise. The site's records are empty today, so no entry can carry a reference yet.
- The entry stays an entry of its collection, with its own folder and URL; the record stays a record. The reverse (the entries about a record) is derived by `entriesAbout()`.
- The editorial code knows the record ID pattern and asks the store whether an ID exists; the record code knows nothing about entries. There is no import cycle.

### Adding real records

1. Write the record in its family's file in `src/data/records/`, with an ID that will never need to change.
2. Give only the facts that are known, at the precision they are known. Leave the rest out.
3. Set `provenance`: `verified` once the owner has confirmed it, with a `source`; `imported` or `unreviewed` until then (the record then stays off every page).
4. Set `visibility`. Remember that the file itself is public either way.
5. Run `npm run verify`: a broken reference or an impossible date names the record.

### The CV workflow in `cv/codex-yaml/`

A separate, concurrent task keeps a proposed master CV there as YAML. P11 did not read its contents into any record, and changed nothing in that directory. It is an unverified proposal with pending placeholders, and it holds contact details and references that do not belong in a public data file.

Its section names suggest an eventual mapping, as an **import boundary**, not as work done: education to `education`; professional experience to `appointments`; publications to `publications` (and `people` for registered co-authors); presentations, teaching, mentoring, awards, service and outreach to `activities`; funding to a future family. An import would be a reviewed, one-way conversion into `src/data/records/`, record by record, landing as `imported` until the owner verifies each one. Nothing would be read from it at build time.

### Extension points

- **Funding and grants:** a ninth family, when the CV needs it.
- **Entity pages:** a project or profile page would be a content route owned by a folder (Portfolio, Lab), built from the store through a projection; `slug` already reserves the address. None exists.
- **Narrative text** for an area or a project: Markdown beside the record, keeping identity and relationships structured.
- **Portraits:** through the same kind of registry as Bearnard's illustrations, never a path in a record.
- **Author roles** (corresponding, equal contribution) and further bibliographic fields, when a real bibliography needs them.
- **A YAML or JSON source,** if the owner prefers it for authoring: the same schemas would validate it; only the loader would change.

## Authoring

Markdown-first, with Python and Quarto for scientific content when appropriate. The editorial workflow is above; Quarto is P13.

## Legacy content available for migration

Nothing here has been migrated, and P10 did not import any of it: the owner has said the old site is mostly historical scaffolding, so it is reused only when instructed. Archived in `_backup/pelican-legacy/`. Pages and posts use Pelican's metadata header (`Title:`, `Date:`, `Category:`, `Tags:`, `Slug:`).

| Path | Tracked files | Notes |
| --- | ---: | --- |
| `content/blog/` | 28 | Includes `_archetypes/` (5) and `c03-one-pagers/` (1). Four posts are empty. |
| `content/pages/` | 25 | |
| `content/images/` | 64 | 49 of them in `github/` |
| `content/extra/` | 10 | CV PDF, CNAME, intro videos and a ZIP. `humans.txt`, `robots.txt` and `security.txt` are empty. |
| `content/data/` | 6 | All six JSON files are empty. |
| `content/static/` | 4 | |
| `content-pt/pages/` | 10 | All empty (Portuguese placeholders) |

Still at the repository root, and also empty: `cv/cv.md`, `cv/template.tex`, `publications/publications.bib`, `publications/style.csl` and `publications/templates/pub_list.md`.
