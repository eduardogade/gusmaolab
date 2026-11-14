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

**Two sources, and no fact in both** (P11-A01, D-089). The owner's own professional history (their person record, education, appointments, activities and scholarly outputs) is owned by the author's CV and reaches the site as records derived from an approved version: see "The author's CV" below. Everything else (projects, research areas, organizations, other people) is written by hand in `src/data/records/`.

### Families

| Family | ID prefix | What it is |
| --- | --- | --- |
| `people` | `person-` | Someone who can be referred to: the owner, a co-author, a collaborator. A record is not a profile. |
| `organizations` | `organization-` | A university, institute, laboratory, company, public institution or consortium. |
| `researchAreas` | `area-` | A research area. Its projects and outputs are derived. |
| `projects` | `project-` | A research or engineering project (research, software, platform, infrastructure). |
| `publications` | `publication-` | A scholarly output: article, conference paper, conference abstract, preprint, chapter, dataset, software, report, thesis. |
| `appointments` | `appointment-` | A position a person holds or held at an organization. |
| `education` | `education-` | A degree or formal qualification. |
| `activities` | `activity-` | Teaching, presentations, participation in events, mentoring, awards, funding, service, outreach, training and certifications, told apart by `type`. |

Funding and grants are an activity type since P11-A01 (`funding`), not a family of their own.

### Where things are

| Concern | File |
| --- | --- |
| The hand-written (independent) records: one typed list per family, all empty | `src/data/records/` (`people.ts`, `organizations.ts`, `research-areas.ts`, `projects.ts`, `publications.ts`, `appointments.ts`, `education.ts`, `activities.ts`, joined in `independent.ts`) |
| The site's dataset: the independent records and those derived from the CV snapshot | `src/data/records/index.ts` (`PRODUCTION_RECORDS`) |
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
| `provenance.status` | `verified`, `imported`, `unreviewed`, `synthetic` | How far the facts have been checked. Optional `source` (where they come from, in the owner's words), `sourceId` (the record's identifier in its source document, exactly as written there, such as `4.1.1`; never the record's own ID), `url` (a public page that supports them) and `reviewedAt` (`YYYY-MM-DD`). |

- **A record is shown only if it is `public` and `verified`.** `imported` (brought in, not yet confirmed) and `unreviewed` (legacy or draft) records can sit in the data and are never rendered. `synthetic` is for tests and studies: the site's dataset refuses it outright.
- **Neither field is a security boundary.** The repository is public, and so is everything in `src/data/records/`, shown or not. Nothing confidential belongs in a record: no private contact detail, no unpublished manuscript's content, no student's personal history.
- **Four separate things:** the record's ID; an optional `slug` (projects only, so far) that reserves a future address; an actual route (none exists: a record creates no page); and the decision to show it. P11 generates no page for any entity.

### Fields

Unknown fields are rejected. A fact that is not known is left out; no field has a guessing default.

**Text as written** (P11-A01, D-091). Where a source states a fact only as one line of text (an author list, an institution with its place), the record may keep that line exactly as written, in the fields marked "as written" below, instead of structured fields or a reference. Such a line is never split, sorted or corrected. Structuring it is a deliberate later step.

**People.** `displayName` (required); `sortName`, `citationName` (how the name is printed in author lists), `professionalTitle`, `shortBiography`, `orcid` (checked, including its check digit; never generated), `links` (`label`, `url`), `researchAreaIds`, `profile` (`none` by default, `public` only when a dedicated profile has been agreed). No email, no portrait. Affiliations are not stored on the person: they are the person's appointments.

**Organizations.** `name`, `type` (`university`, `research-institute`, `laboratory`, `company`, `public-institution`, `consortium`, `other`) required; `shortName`, `website`, `location`, `parentId` (the one hierarchy: it may not loop), `relations` (`member-of`, `partner-of`, `hosted-by` another organization; these need not form a tree and may be mutual).

**Research areas.** `title` required; `summary`, `keywords`.

**Projects.** `title`, `kind` (`research`, `software`, `platform`, `infrastructure`, `other`), `status` (`planned`, `active`, `completed`, `archived`) required; `shortDescription`, `period`, `researchAreaIds`, `participants` (`personId`, optional `role`), `organizationIds`, `links` (`repository`, `documentation`, `website`), `slug`. A status is stated, never inferred from a repository or a last commit.

**Scholarly outputs.** `title`, `type`, `status` and the authors required, as either `authors` (a list, at least one) or `authorsText` (the author line as written), never both; `authorshipNote`, `creditedTo`, `date`, `venue`, `volume`, `issue`, `pages`, `details`, `doi`, `url`, `projectIds`, `researchAreaIds`, `related`.

- `status`: `submitted` (under review), `accepted` (in press), `preprint` (public, not reviewed), `published`. A `preprint`-type output has the status `preprint` and nothing else has; a published or preprint output needs its date, at least the year.
- `authors` is an ordered list and is never sorted. Each author is either `{ personId, as? }` (a registered person; `as` is the name exactly as printed on this work) or `{ name }` (an external credit, which needs no person record). A person appears once.
- `authorsText` is the author line exactly as printed: order, initials and marks such as a co-first-author asterisk are kept, and `authorshipNote` says what a mark means. `creditedTo` lists the registered people among those authors, so that the output is theirs without the line being parsed; it is allowed only with `authorsText`.
- `details` is venue, volume, pages and year as one line, as written, instead of `venue`, `volume`, `issue` and `pages`. The citation prints it unchanged and adds no year.
- `doi` is stored in one form, the bare lowercase identifier (`10.1234/abc`): a pasted `https://doi.org/…` or `doi:…` is reduced to it, and the link is generated. No metadata is fetched.
- `related` ties outputs together (`preprint-of`, `version-of`, `supplement-to`). A preprint and its article are two records; nothing merges outputs by title.

**Appointments.** `personId`, `type` (`employment`, `academic`, `visiting`, `consulting`, `affiliation`, `other`) and the organization required, as either `organizationId` or `institution` (the institution and place as written), never both; `title` (required unless the type is `affiliation`: a tie without a post), `department` (as written), `period`, `summary`, `location`, `projectIds`. Titles are kept as given. Positions may overlap.

**Education.** `personId`, `qualification`, `level` (`undergraduate`, `masters`, `doctorate`, `other`) required; `institutionId` or `institution` (as written; not both), `status` (`completed`, `in-progress`, `incomplete`; left out when the source does not state it, never inferred from a date), `field`, `startDate`, `completionDate` (not allowed when the status is in progress or incomplete; with no status it is the end of the period as recorded), `thesisTitle`, `supervisorIds`, `supervision` (the supervisors as written). Several qualifications at one level are fine; no date is inferred from a sequence of degrees.

**Activities.** `personId` and `type` required, plus:

| `type` | Required | Optional |
| --- | --- | --- |
| `teaching` | `title` (the course) | `role`, `organizationId`, `period`, `duration` (as written, such as "Two semesters"), `resources` |
| `presentation` | `title` | `presentationType` (`invited`, `keynote`, `contributed`, `poster`, `seminar`, `other`), `event`, `date`, `location`, `publicationIds`, `projectIds` |
| `participation` | `event` | `period` |
| `mentoring` | | `mentorshipType` (`supervision`, `co-supervision`, `mentoring`; left out when the source does not say, never presumed), `level`, `menteeId`, `topic`, `organizationId`, `period`, `projectIds` |
| `award` | `name` | `grantorId` or `grantor` (as written), `topic`, `date` |
| `funding` | `name` (the kind of grant, as written) | `grantorId` or `grantor`, `topic`, `date` |
| `service` | `serviceType` (`committee`, `review`, `organizing`, `editorial`, `advisory`, `administration`, `examination`, `other`), `role` | `body`, `subject` (what was examined, when it is public), `organizationId`, `period` |
| `outreach` | `title` | `event`, `date`, `period`, `organizationId`, `url` |
| `training` | `title` | `period` |
| `certification` | `name` | `issuer`, `date`, `url` |

Every activity may carry a `summary` and a `context`: the role and institution, or the setting, in one line as written, when the source does not separate them. A mentoring record does not have to name anyone, and a mentee is named on a page only if their own record may be shown.

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

Only independent records are written by hand: projects, research areas, organizations, people other than the owner. A fact of the owner's CV is never written here. It is changed in the CV file and reaches the site through the snapshot; `mergeRecords` fails the build for a hand-written education, appointment, activity or output of the owner once a snapshot exists.

1. Write the record in its family's file in `src/data/records/`, with an ID that will never need to change.
2. Give only the facts that are known, at the precision they are known. Leave the rest out.
3. Set `provenance`: `verified` once the owner has confirmed it, with a `source`; `imported` or `unreviewed` until then (the record then stays off every page).
4. Set `visibility`. Remember that the file itself is public either way.
5. Run `npm run verify`: a broken reference or an impossible date names the record.

### Extension points

- **Funding as a family of its own,** with amounts and roles, if a page ever needs more than the `funding` activity.
- **Entity pages:** a project or profile page would be a content route owned by a folder (Portfolio, Lab), built from the store through a projection; `slug` already reserves the address. None exists.
- **Narrative text** for an area or a project: Markdown beside the record, keeping identity and relationships structured.
- **Portraits:** through the same kind of registry as Bearnard's illustrations, never a path in a record.
- **Author roles** (corresponding, equal contribution) and further bibliographic fields, when a real bibliography needs them.
- **Structured authors and organizations for CV-derived records:** a deliberate conversion of `authorsText` into `authors`, or of `institution` into organization records, reviewed by the owner. Never an automatic split.

## The author's CV

**CV YAML → validated canonical records → website pages and document generators** (P11-A01, D-089 to D-093). The owner keeps one comprehensive, versioned YAML file of their professional history. It is the source of truth for that history. The P11 records are how the site reads it, never a second copy of it.

### Ownership

| Fact | Owner | Where it is written |
| --- | --- | --- |
| The owner's identity, education, positions, publications, presentations, teaching, mentoring, service, outreach, awards, funding, training, skills | The CV | The author's CV file |
| Projects, software documentation, research areas, datasets, organizations, other people | The site | `src/data/records/` |
| Editorial entries | The site | `src/content/` |
| Which outputs belong to a project | The CV names them (`software_e_metodos.evidencia`); the site owns the project | Derived: the output's `projectIds` |

- When both describe the same thing, the richer, independently maintained record wins and the CV adds only a relationship. The CV's one-line description of a software project never overwrites the site's project record: the CV does not create project records at all.
- A fact is never stated on both sides. `mergeRecords` (`src/cv/snapshot.ts`) refuses a record ID present in both, and a hand-written record that states a fact of the owner's CV.

### Files and states

| Path | In Git | Role |
| --- | --- | --- |
| `cv/codex-yaml/CV.proposta.yaml` | no | The working proposal the author is editing (22 sections, Portuguese field names). The P11-A01 brief gives its path as `cv/CV.proposta.yaml`; it is where the manifest says. |
| `cv/CV-vX.Y.yaml` | no | Versions the author creates explicitly. None exists yet. |
| `cv/manifest.json` | yes | Which file is the working file, and which version is approved for publication |
| `cv/identities.json` | yes | The permanent record ID of each CV entry |
| `src/data/cv/snapshot.ts` | yes | The generated public snapshot; `null` until a version is approved |

A CV passes through five states, and only an explicit act of the owner moves it from one to the next:

1. **Working proposal:** being written; may hold any number of placeholders.
2. **Versioned working document:** saved by the author as `CV-vX.Y.yaml`.
3. **Author-reviewed version:** the author has checked its facts.
4. **Approved public snapshot:** the owner names the version, its fingerprint and the approval date in `cv/manifest.json` and switches publication on; the tool then generates the snapshot.
5. **Published projection:** the snapshot is committed and pages render its records.

**Source authority is not publication approval.** `metadados.fonte_de_verdade: true` and `metadados.situacao` are the file's statements about itself. No code that decides publication reads them, the file name or how complete the file looks (CV-006, CV-007).

### Version selection

`cv/manifest.json`:

```json
{
  "workingFile": "codex-yaml/CV.proposta.yaml",
  "published": null,
  "publishEnabled": false
}
```

- Nothing lists a directory. The newest file is never picked, a working file is never promoted, and no file is renamed (CV-008).
- An approval (`published`) names `file` (must be named `CV-vX.Y.yaml` and is never the working file), `version` (equal to the file's `metadados.versao`), `sha256` (the file's fingerprint: a file edited after approval is refused until approved again), `approvedOn` and `contact` (the profile links released, none by default).
- `publishEnabled: false` keeps every CV fact off the site whatever else is set.
- A file name and a `metadados.versao` that disagree are a warning for the owner (`1.0` and `1.0.0` agree). Nothing is renamed or rewritten.

### Two validation layers

| Layer | Question | Placeholders | Code |
| --- | --- | --- | --- |
| A. Authoring | Can the file be understood? | Allowed, counted, never changed | `authoringIssues` in `src/cv/source.ts` |
| B. Publication | Is this field or record approved and complete enough to show? | Never shown | `adaptCv` in `src/cv/adapter.ts`, then `snapshotIssues` |

Layer A reports as errors only what stops the file from being read: invalid YAML, a record list that is not a list, an identifier used twice in one list. Unknown sections, missing sections and records without an identifier are notes.

Layer B, record by record:

- An unresolved placeholder (`{{EXP_1_FIM}}`) in a field the record can do without leaves the field out. In a field it cannot do without (a title, a name), it leaves the record out. Both are reported.
- **An unknown end is no end.** It is never turned into "present", and a role is never treated as current without the author saying so.
- An impossible date (`2023-02-30`) is left out, never corrected. An unresolved identifier is not a DOI.
- A record marked as a draft (`situacao: Rascunho…`) is left out.
- A record without an identity in `cv/identities.json` is left out.
- Every kept record is then checked against its family's schema, and the whole dataset for referential integrity.

### Identity

The CV's own identifiers (`4.1.1`, `exp_1`, `formacao_1`) follow the document's numbering and may change. They are kept, exactly as written, in `provenance.sourceId`, and never rewritten. The site's permanent IDs are assigned by hand in `cv/identities.json`:

```json
{
  "owner": "person-…",
  "records": {
    "publicacoes.artigos/4.1.1": "publication-…",
    "formacao_academica/formacao_1": "education-…"
  }
}
```

- The key is the list and the source identifier; the value must be an ID of that list's family, and no ID is given twice (CV-009).
- An ID is never derived from a position in a list, a title or a DOI. A record without an entry is not projected.
- The file is empty today (`owner: null`): assigning IDs is the owner's step.

### Mapping

| CV section | Becomes | Fields read (the allowlist) |
| --- | --- | --- |
| `identidade_profissional` | The owner's person record and profile | `nome`, `nome_exterior`, `titulo_profissional`, `resumo`, `areas_de_especialidade`, `palavras_chave`, `idiomas` |
| `contato` | The person's `orcid` and `links` | Only the fields the approval releases, from: `orcid`, `lattes`, `linkedin`, `github`, `google_scholar`, `site`, `researchgate` |
| `formacao_academica` | `education` | `grau`, `instituicao_e_local`, `supervisao`, `periodo`, `titulo_trabalho` |
| `experiencia_profissional` (`academica_e_pesquisa`, `consultoria_industrial_documentada`, `industria`) | `appointments` (`academic`, `consulting`, `employment`) | `cargo`, `instituicao_e_local` or `empresa`, `departamento_e_regime`, `periodo`, `responsabilidades` |
| `publicacoes` (`artigos`, `anais_completos`, `resumos_em_anais`, `capitulos`, `preprints`) | `publications` (`journal-article`, `conference-paper`, `conference-abstract`, `book-chapter`, `preprint`) | `autores`, `nota_autoria`, `titulo`, `veiculo_e_detalhes`, `ano`, `doi_ou_url` |
| `apresentacoes_e_eventos` (`palestras`, `participacoes`) | `presentation` and `participation` activities | `descricao`, `data` or `periodo` |
| `financiamentos_e_grants` | `funding` activities | `tipo`, `instituicao`, `tema`, `data` |
| `premios_e_honrarias` | `award` activities | `tipo`, `instituicao`, `tema`, `data` |
| `experiencia_docente` | `teaching` activities | `disciplina_e_codigo`, `atividade_e_instituicao`, `periodo`, `semestres` |
| `mentoria_e_orientacao.registros` | `mentoring` activities | `nivel`, `tema`, `instituicao`, `periodo` |
| `servico_e_lideranca` (`administracao`, `bancas_academicas`, `avaliacao_de_projetos`, `revisao_por_pares`, `organizacao_de_eventos`) | `service` activities (`administration`, `examination`, `review`, `review`, `organizing`) | `funcao` or `atividade`, `instituicao`, `periodo` or `data`; `titulo` for examination boards only |
| `extensao` | `outreach` activities | `projeto`, `atividade_e_instituicao`, `periodo` |
| `formacao_complementar` | `training` activities | `curso_carga_e_instituicao`, `periodo` |
| `certificacoes` | `certification` activities | `nome`, `emissor`, `data`, `credencial` |
| `habilidades_tecnicas` | The profile's skills | `pesquisa.metodos`, `industria[].competencia`. Groups still named `…_a_classificar` or `…_a_confirmar` are not skills yet. |
| `software_e_metodos` | Relationships: the outputs in `evidencia` name a project the site already has | `nome`, `evidencia` |

- Composite fields stay whole: `instituicao_e_local` becomes `institution`, `autores` becomes `authorsText`, `veiculo_e_detalhes` becomes `details`. Nothing is split on commas.
- Author order, initials and co-first-author asterisks are kept, with their note (CV-010).
- A degree's level is read from the first word of `grau` (Doutorado, Mestrado, Bacharelado); its status is not stated in the CV and is left out.
- The text stays in the CV's language. The profile records it (`language`, from `metadados.idioma`).

**Never read, whatever they hold:** the sections `declaracoes`, `cartas_de_apresentacao`, `referencias`, `topicos_master_sugeridos` and `placeholders_pendentes`; the writing templates `modelo_sem_vinculos` and `texto_sem_vinculos`, which are not biographical statements; the internal source notes `fonte` and `fonte_identificador`, which name private documents; `email`, `telefone` and `localizacao`; the name and grade of a person mentored (`orientando`, `avaliacao_final`); amounts of money (`valor_e_condicoes`); teaching hours still to be confirmed; `tecnologias`; `experiencia_declarada`; and the title of a proposal reviewed in confidence. This is an allowlist: a field that no builder names is not read, so a new field in the CV is private until it is added here by a decision.

### The public snapshot

- The CV files are private and are not in the repository, so a build, GitHub Actions included, cannot and does not read them.
- `npm run cv:snapshot` writes `src/data/cv/snapshot.ts` from the approved version: the derived records, the profile, the version, the approval date and the file's SHA-256. It refuses unless every condition of an approval holds, and then it leaves the file as it was.
- The snapshot is a generated derivative, never edited by hand and never a second source. To change a fact: change the CV, approve a version, generate again.
- It is committed only after the owner has read its diff, which is public.
- The site re-checks it when it loads (`snapshotIssues`): an approval, only public and verified records that name their source, no placeholder, no field of the raw file.
- Until then it is `null`, the site has no CV data, and it builds (CV-015). No snapshot was generated in P11-A01.

### Future consumers

All of these are selections and presentations of the same records. None is a database of its own, and none exists yet.

| Consumer | Reads |
| --- | --- |
| Website CV (the CV section's folders) | `cvProjection(siteRecords, siteCv.ownerId)` and `siteCv.profile` |
| Academic CV export | The same projection, complete |
| Industry CV export | A targeted selection of the same records; profile-specific wording may be authored separately, and must add no unverified claim |
| Portfolio | `portfolioProjection`, with outputs related through `software_e_metodos` |
| Lab | `labProjection` |

## Reading layouts (P12)

How each collection's metadata becomes a reading experience (D-094 to D-096). The code is `src/editorial/reading.ts`; the layouts are in `src/layouts/editorial/`.

| Collection | Layout | Index order | Index grouping | Previous and next | Contents |
| --- | --- | --- | --- | --- | --- |
| Blog | `BlogLayout` | newest `publishedAt` first | none | older and newer post | never |
| Bearnard's Trail | `TrailLayout` | by `seriesId`, then `position`; unplaced last; standalone after every series | by series (`seriesTitle`, else `seriesId`) | previous and next `position` in the series; none without a position | never |
| The Greenhouse | `GreenhouseLayout` | newest first | none | none | when the Markdown has three or more `##` or `###` headings (references count) |
| Berries | `BerriesLayout` | newest first | none | none | never |
| Timber Logs | `TimberLogLayout` | newest `period`, then publication | by year, then month | earlier and later period (a month without a log is not there) | never |
| Months' Original | `MonthsOriginalLayout` | newest `period`, then publication | by year | earlier and later month | never |
| Kosmos Series | `KosmosLayout` | by `workId`, then `position` or `chapterNumber` (the work's own entry first) | by work | previous and next chapter; the work's own page lists its chapters | never |
| Book Club | `BookClubLayout` | newest `sessionDate`, then publication | by book, the most recently discussed first | earlier and later discussion of the same book | never |

- **Fields that control display:** `title`, `description` (the lede), `publishedAt`, `updatedAt`, `tags` (Greenhouse articles only), `kind` (Blog), `seriesId`, `seriesTitle`, `position`, `prerequisites` (Trail, Greenhouse), `difficulty`, `references` (Greenhouse), `period` (Timber Logs, Months' Original), `workId`, `chapterNumber`, `chapterLabel`, `epigraph`, `epigraphSource` (Kosmos, Months' Original), `bookTitle`, `bookAuthor`, `sessionDate`, `spoilers` (Book Club). Nothing is shown that the entry does not state.
- **New optional fields (D-095):** `related`, `seriesTitle`, `chapterLabel`, `epigraph`, `epigraphSource`, `spoilers`. None is required; no existing entry changes.
- **Related entries:** `related: ["greenhouse/some-slug"]`, `<collection directory>/<slug>`. A reference to an entry that does not exist, to a collection that does not exist or to the entry itself fails the build, drafts included. Only published entries are linked. A tag never relates two entries.
- **Neighbours** are computed from the collection's own order over published entries only. A lesson is "Lesson N of M" only when the published lessons are numbered 1 to M without a gap; otherwise "Lesson N".
- **Contents:** built from Astro's own heading list (depths 2 and 3, never the title), at least three entries, in document order, linking to Astro's anchors.
- **Headings:** Markdown starts at `##`. A `#` in an entry's body fails the build.
- **Empty states:** a collection with no published entry shows its name, its one-line identity and a sentence saying what will appear, never a fabricated entry. The sentences are in `PRESENTATIONS`.
- **Archived** entries keep their listing and are marked "Archived" in every index and by a notice on the page.
- **Separate from the CV:** editorial layouts read no CV file and no CV record (D-089 to D-093).

## Scientific articles (P13)

**Two ways to write an entry.** Markdown (`src/content/<dir>/<name>.md`) is the default and is unchanged. Quarto (`science/<dir>/<name>.qmd`) is chosen when an article needs numbered equations, figures and tables with cross-references, citations with a bibliography, or computed figures. Quarto is accepted for The Greenhouse and Bearnard's Trail; Berries and Timber Logs could follow by adding their directory to the tool; the literary collections never use it.

- **One entry.** A `.qmd` produces exactly one entry, `src/content/<dir>/<name>.md`, whose ID is the file name and whose URL is `<folder path><slug>/`, as for any entry. It is generated, says so in its body, and holds only metadata. It is in no way a second page: a build has one page for it, and the Greenhouse index lists it once.
- **Metadata** is written once, in the `.qmd` front matter. Every key that is not a Quarto option (`bibliography`, `csl`, `engine`, `jupyter`, `execute`, `lang`, `link-citations`, `format`) is the entry's P10 metadata and is validated against that collection's schema; the entry file and the manifest's copy are derived from it. A Quarto document keeps its references in its bibliography, so the Greenhouse `references` list must be empty. Technical facts (the source, the fingerprints, the versions of Quarto and Python) are in `src/science/manifest.json`, not in the front matter.
- **Publication state** is the P10 `status` key. A draft Quarto document is rendered and committed like any other, and has no page (routes follow state, not the index).
- **Citations and bibliographies.** `[@key]` resolves against the document's `.bib`; a missing key fails the render. The reference list is the article's own and ends the body under a `References` heading (id `references`). The style is Pandoc's default author-date; a `.csl` file may be added later. A bibliography is not a record of the owner's work: it cites external literature, and nothing in it is imported into or checked against the canonical records (P11). A future explicit mapping from a citation key to a publication record is possible and not built.
- **Headings and contents.** The article starts at `##`. The headings P12's contents list shows are the rendered article's own (`h2` and `h3`, with their ids, stored in the manifest), so cross-references and contents links share one set of anchors; `References` and `Footnotes` are among them.
- **Where a document can fail:** an unknown metadata field, a missing field, a bad date, an unresolved reference or citation, an image without alt text, a figure that is not a local file, a script or a style, or a code change after the last execution.
- **Not a Quarto website:** no Quarto page, listing or search reaches the site; Quarto's output is read, cleaned and discarded.

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
