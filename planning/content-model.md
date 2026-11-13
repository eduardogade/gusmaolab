# Content model

Status: the eight editorial collections were established in P10 (2026-11-13, D-078 to D-082). The canonical records (research, publications, people, teaching, talks) are **To be supplied**, expected in P11. Differentiated reading layouts are P12, Quarto is P13, and authoring helpers are P14.

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

Records are written once and reused across pages:

- Research projects
- Publications
- People
- Teaching
- Talks
- Related information (**To be supplied**)

Fields, identifiers and relationships are **To be supplied**.

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
