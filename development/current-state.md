# Current state

Last updated: P14, 2026-11-15. Verified facts only.

## Framework

- **Astro 7.4.8**, static output. The repository root is the Astro project.
- **72 pages:**
  - **36 folder pages**, one for every registered folder, generated from the navigation registry (P06). Each shows the physical folders with working tab links, folder previews (P07) and **temporary development content only**.
  - **36 pages of temporary design studies**, not part of the website (four studies of one page each, the editorial study of 30 and the Quarto study of 2):
    - the **P03 tokens specimen** at `/_design/tokens/` (`src/pages/[design]/tokens.astro`; it was `/` until P06);
    - the **P05 folder study** at `/_design/folders/` (`src/pages/[design]/folders.astro`);
    - the **P09 Bearnard study** at `/_design/bearnard/` (`src/pages/[design]/bearnard.astro`);
    - the **P11 records study** at `/_design/records/` (`src/pages/[design]/records.astro`): the canonical records, with invented data.
  - the **P12 editorial study** at `/_design/editorial/` (`src/pages/[design]/editorial/`): 30 pages, an overview and an index and article pages for each of the eight collections, drawn with the production components from a synthetic fixture (D-097). It is the fifth study.
  - the **P13 Quarto study** at `/_design/quarto/` (a synthetic scientific article written in Quarto) and `/_design/quarto/markdown/` (its ordinary Markdown counterpart), both in the Greenhouse folder with the P12 layout (`src/pages/[design]/quarto/`, D-098 to D-103).
  - The P09 environments study (`/_design/environments-v2/`) was removed in P09-A01 (D-076).
- **Editorial entries (P10):** none. The eight collections exist and are empty, so every build page is a folder page or a study; an entry would add one page below its owning folder (see "Editorial collections").
- **Not implemented:** real section content, the homepage composition, Bearnard on any site page (the foundation exists, below) and a designed 404 page.
- The archived Pelican site in `_backup/pelican-legacy/` is not built.
- Nothing has been deployed, and no deployment workflow is active.

## Design foundation (P03)

The owner approved the visual direction and overall appearance (D-041). Tokens are in `src/styles/`, the contract in `src/design/`, and the description in `planning/design-system.md`. Colour has been the Chromatic Archive since P09-A01 (below, D-076); fonts, sizes, spacing and geometry are P03's. Typography consolidation is a deferred refinement (D-042).

## Navigation model (P04)

| Item | Where |
| --- | --- |
| Types | `src/navigation/types.ts` |
| Registry: 11 top-level and 25 second-level folders, no third level yet; each section declares its category and environment; the global row is grouped by category (P10) | `src/navigation/registry.ts` |
| Helpers: normalization, validation, resolution, previews | `src/navigation/navigation.ts` |
| Compiled site navigation (`siteNavigation`) | `src/navigation/index.ts` |
| Rules and site map | `planning/information-architecture.md` |

Every one of the 36 registered destinations has a page (P06; 37 until External was removed in P09-A01). The content-route list is empty until content collections exist.

## Physical folders (P05)

| Item | Where |
| --- | --- |
| Components: `FolderStack`, `FolderLayer`, `FolderTabStrip`, `FolderTab`, and `FolderPreview` since P07 | `src/components/folders/` |
| Styles: tab silhouette, seam, fillets, V, materials, scrolling rows | `src/styles/folders.css` |
| Description and open visual questions | `planning/design-system.md` sections 9 and 10 |
| Study page: cases A–I (case F updated and case G added in P06; case H, a second-level preview, added in P07; case I, wide content in three levels, added in P08) | `/_design/folders/` |

Built: one to three nested folder levels drawn from P04's `state.rows`. Each level has:

- a selected tab joined to its open body, with a V;
- recessed inactive tabs;
- the page on the category's reading paper in the deepest folder;
- the same structure in every category and environment.

A row that is too wide scrolls inside its own strip. All of this renders statically.

Tabs became links in P06, previews arrived in P07, and P08 made the folders work on every screen size (below).

**Visual approval:** the owner approved the folder appearance (G-P05-17, D-049). The questions in `planning/design-system.md` section 10 remain refinements.

## Folder navigation (P06)

| Item | Where |
| --- | --- |
| Overview display tabs, `currentTabId`, `folderStaticPaths()` | `src/navigation/types.ts`, `navigation.ts` |
| Page layout: resolves the URL, sets the category and environment, draws the folders, `<main>` in the deepest folder | `src/layouts/FolderPage.astro` |
| Route files, one per tab level | `src/pages/index.astro`, `src/pages/[section]/…` |
| Temporary page content | `src/components/scaffold/ScaffoldContent.astro` |
| Rules | `planning/information-architecture.md` sections 12 and 14; D-050–D-056 |

Built:

- Every tab is a link.
- An open folder with children always shows its row with a selected tab: its **Overview** on its own page.
- The page's own tab carries `aria-current="page"`, and the open folders above it `aria-current="true"`.
- Each row is a labelled `nav`.
- Each section's category (colour) and environment (typography) are applied.
- Inactive tabs give hover feedback.
- Navigation needs no JavaScript; links, Back, Forward and reload work as on any static site (checked in Chromium). P07's preview script is the only script.
- Unknown URLs have no page.
- Case F of the folder study now shows Overview selected, and case G shows a third-level Overview (synthetic fixture).

**Visual approval of P06:** the owner approved the navigation and Overview tabs (G-P06-20, D-057). Questions 18 and 20 in `planning/design-system.md` section 10 remain refinements.

## Folder previews (P07)

| Item | Where |
| --- | --- |
| Preview data: `TabRow.previews`, built from the P06 display tabs | `src/navigation/types.ts`, `navigation.ts` |
| Preview markup: an index card after each eligible tab's link, a `popover="manual"` | `src/components/folders/FolderPreview.astro`, `FolderTab.astro` |
| The only client-side script: shows, hides and places previews (2.75 KB, inlined) | `src/scripts/folder-previews.ts` |
| Styles | `src/styles/folders.css` section 5 |
| Rules | `planning/information-architecture.md` section 15; `planning/design-system.md` section 9; D-058–D-062 |

Built:

- Hovering (mouse or pen) or keyboard-focusing an unopened folder with children shows its Overview and immediate children on a card of its own Level 2 cardstock, hanging from its tab. Open folders, leaves and Overview tabs show none.
- Preview links are real destinations. Hovering changes no URL, history, selection, V, category or environment.
- One preview at a time; 120 ms close delay and 90 ms switch delay against flicker; Escape closes and returns focus; touch is ignored, so a tap navigates.
- Cards live in the top layer: never clipped by a scrolling row, kept 8 px inside the viewport, scrolling inside themselves when long.
- Without JavaScript or the Popover API, no previews and the same plain links.

**Visual approval of P07:** the owner approved the folder previews (G-P07-19, D-063). Question 21 in `planning/design-system.md` section 10 remains a refinement.

## Small screens (P08)

| Item | Where |
| --- | --- |
| Spacing curves: the gutter stops at 1440 px; shell padding and nest insets shrink below 1024 px | `src/styles/tokens.css` |
| Rows: scroll padding clear of the fades; nested tabs 44 px under a coarse pointer; the paper contains wide content | `src/styles/folders.css` |
| `.gl-scroll-x` regions for wide tables and figures | `src/styles/global.css` |
| Rows open at their selected tab where the browser cannot; focus kept clear of the fades | `src/scripts/folder-rows.ts` |
| Rules | `planning/design-system.md` section 9; `planning/information-architecture.md` section 16; D-064–D-069 |

Built:

- The folders stay physical folders at every width from 320 to 2560 px; rows scroll sideways inside their folders and the page never does.
- Each row opens with its selected tab in view (Chromium natively; other browsers through the script), and keyboard focus stays clear of the edge fades.
- From 1024 px up the layout is pixel-identical to P07; above 1440 px the shell no longer narrows, so the global row fits.
- Phones: 4 px shell padding and nest insets; three levels at 320 px leave a 238 px reading column.
- Touch: swipes scroll a row, taps open a page, previews never open, every tab at least 44 px tall.
- Wide content scrolls inside itself; study case I shows it.

**Visual approval of P08:** the owner approved the small-screen layout (G-P08-20, D-070). Question 22 in `planning/design-system.md` section 10 remains a refinement. Real phones and tablets are still untested (G-P08-21, KL-32).

## Navigation continuity (P09)

| Item | Where |
| --- | --- |
| A 140 ms cross-document fade between folder pages; off under reduced motion | `src/styles/view-transitions.css`, imported by `src/layouts/FolderPage.astro` |
| Hover previews wait for real pointer movement after a page appears | `src/scripts/folder-previews.ts` |
| Diagnosis and status | `debugging/investigations/ISSUE-0004.md` (open: awaiting the owner's retest); D-071, D-072 |

Navigation is still ordinary: real pages, real URLs, no client router. The reported blink was a one-frame hard cut, not a blank frame; the fade replaces it where the browser supports cross-document view transitions (Chromium; Safari 18.2+).

## Bearnard illustrations (P09)

| Item | Where |
| --- | --- |
| Registry: one illustration (`bearnard-v1.3-portrait`), nine roles, none assigned | `src/illustrations/bearnard.ts` |
| Component: by role or by ID; fallback slot; responsive, lazy, sized | `src/components/bearnard/BearnardIllustration.astro` |
| Web derivatives of the v1.3 master: WebP, 320 × 632 (54,626 bytes) and 640 × 1265 (187,394 bytes) | `public/illustrations/bearnard/` |
| Provenance: source checksum, settings, output checksums | `assets/bearnard/derivatives.json` |
| Generator, run by hand (Python with Pillow); never part of the build | `scripts/bearnard_derivatives.py` |
| Study page | `/_design/bearnard/` |
| Rules | `planning/design-system.md` section 11; `planning/architecture.md`, "Bearnard illustrations"; D-073, D-074 |

No site page shows Bearnard yet, and no role has an illustration: assigning one is the owner's decision (G-P09-B7). The build does not need the masters: a copy of the repository without `brand/bearnard/` passes `npm run verify`, with BEAR-004 reported as skipped. Only the canonical master is registered; the 2 approved-derived, 5 historical, 310 experimental, 31 unclassified and 3 working-copy images in the inventory are not.

## Chromatic Archive (P09-A01)

**Approved and locked by the owner (D-076).** Colour belongs to five categories; the four environments set typography and texture only.

| Item | Where |
| --- | --- |
| The five palettes, 25 locked colours, five tokens per `[data-category]`: the only source | `src/styles/categories.css` |
| Shared colours (shell `#29282C`, links and accent `#275B52`, V `#26313B`), text inks, focus rings, and the aliases | `src/styles/tokens.css` |
| Environments: ten typography and texture tokens each, no colour | `src/styles/environments.css` |
| Each section's `category` and `environment`; `ArchiveCategory` | `src/navigation/registry.ts`, `types.ts` |
| Contract: `CATEGORIES`, `CATEGORY_TOKENS`, `ENVIRONMENT_TOKENS`, contrast pairings | `src/design/contract.mjs` |
| Markup: `data-category` on `<html>`, on the folder stack and on every top-level tab | `BaseLayout.astro`, `FolderPage.astro`, `FolderStack.astro`, `FolderTab.astro` |
| Checks | `tests/categories.mjs` (CAT-001 to CAT-010), `tests/categories-browser.mjs` (CAT-011 to CAT-017), `tests/contrast.mjs` |
| Values, derived colours and contrast | `planning/design-system.md` sections 7 and 8; `planning/architecture.md`, "Colour architecture" |

| Category | Sections | Environment (typography) |
| --- | --- | --- |
| Core | Home, About, Contact, Schedule | Core |
| Research | Portfolio, CV, Lab | Scientific |
| Blog & Notes | Blog, Lecture Notes | Core (Blog), Technical (Lecture Notes) |
| Writing | Writing | Literary |
| Bearnard | Bearnard's Area | Personal |

Built:

- Every top-level tab is painted in its own category's Level 1 cardstock on every page, slightly dimmed while inactive; all five colours share the global row.
- The selected tab and its open folder are one colour; second-level tabs and bodies use Level 2; the page is on the category's reading paper; the flannel's ground and line are the page's category; the shell is Deep Charcoal everywhere.
- Links and the accent are Forest Teal and the V is Midnight Ink on every page. Links on the dark shell use the eye green, because Forest Teal reaches only 1.88:1 there (KL-38).
- A preview card is the hovered folder's own Level 2 cardstock, whatever page it opens from.
- External is no longer in the navigation; `/external/` is not built. It held only the development placeholder.
- Removed: the P09 environment candidates (`src/styles/environment-candidates.css`, `/_design/environments-v2/`, `tests/environments.mjs`; D-075 superseded), and nine primitives that only the old environment colours used.
- Folder geometry, Overview tabs, previews, small-screen behaviour, the cross-fade, fonts and type values are unchanged.

**Not owner-reviewed yet:** the colours as they look on the running site and on real screens (G-A01-23, KL-39). The palette itself is the owner's and is not in question.

## Global row order (P10)

The eleven top-level tabs are grouped by category, in this order (D-077): **Core** Home, About, Contact, Schedule; **Research** Portfolio, CV, Lab; **Blog & Notes** Blog, Lecture Notes; **Writing** Writing; **Bearnard** Bearnard's Area. Only the order changed: labels, IDs, URLs, categories, environments, children, geometry, previews, small-screen scrolling and the locked palettes are as before. `validateNavigation()` rejects a registry that splits a category; NAV-001, NAV-033 and CAT-001 check the row, and CAT-018 navigates the five pairs the brief names in headless Chrome. Blog, a leaf, now follows Lab, so keyboard Tab from Lab's preview reaches Blog before Lecture Notes (PREV-008).

## Editorial collections (P10)

| Item | Where |
| --- | --- |
| Eight collections (Blog, Bearnard's Trail, The Greenhouse, Berries, Timber Logs, Months' Original, Kosmos Series, Book Club): ID, directory, owning folder | `src/editorial/collections.ts`; `src/content/<directory>/` (empty; `.gitkeep` only) |
| Astro configuration: Content Layer `glob()` loaders, schemas, date guard | `src/content.config.ts` |
| Metadata schemas (Zod through `astro/zod`) | `src/editorial/schema.ts` |
| Routing, ordering, index and clash rules; pure | `src/editorial/model.ts`, `raw-dates.ts` |
| Astro side: loading, navigation with entry routes, static paths, indexes | `src/editorial/site.ts` |
| Rendering: one entry; one collection index | `src/components/editorial/EditorialEntry.astro`, `CollectionIndex.astro` |
| Route files: folders and entries at each depth | `src/pages/[section]/…` (`pageStaticPaths`) |
| Rules, schemas, frontmatter examples, workflow | `planning/content-model.md`; D-078 to D-081 |
| Checks | `tests/content.mjs` (CONT-001 to CONT-015, 017, 019), `tests/editorial-build.mjs` (CONT-004 to CONT-016, CONT-018, built), fixtures in `tests/fixtures/editorial/` |

Built:

- Entries are Markdown files, one per entry, validated at load time; a bad file fails the build and is named. Status (`draft`, `published`, `archived`) decides route generation: drafts have no page in a build, published and archived entries get one at the owner's path plus an explicit slug. `astro dev` alone previews drafts.
- Entries are content routes owned by their collection's folder: no tab, no registry node, at most three rows. They render inside the folder on the category's reading paper; unknown slugs have no page.
- A collection's index appears on its folder's own page, or says "This collection has no published entries yet." The Berries, Timber Logs and Greenhouse pages show it now, and so do the others.
- Verified with synthetic fixtures built in throwaway copies of the project (never in `src/content/`): 46 pages in the good scenario (36 folders, 3 studies, 7 entries), drafts and ignored files absent, three invalid scenarios and a slug clash failing the build.
- No content was written, migrated or published; the Pelican archive was not read; no dependency was added.

Not built, on purpose: the differentiated reading layouts (P12), Quarto and MDX (P13), authoring helpers (P14), feeds, search, related content, deeper Kosmos work and chapter URLs, and any Bearnard illustration on an entry.

## Canonical records (P11)

**One authoritative record, many presentations** (D-083 to D-088). The system exists and is tested; **the site's records are empty**, because no verified record has been supplied.

| Item | Where |
| --- | --- |
| The hand-written (independent) records: eight typed lists, all empty | `src/data/records/` (`independent.ts`) |
| The site's dataset: those, joined with the CV snapshot's records (P11-A01) | `src/data/records/index.ts` |
| Schemas, families, ID patterns (Zod through `astro/zod`) | `src/records/schema.ts` |
| Partial dates and periods | `src/records/dates.ts` |
| Dataset validation and the frozen store | `src/records/registry.ts` |
| Selectors: derived relationships, orders, what may be shown | `src/records/selectors.ts` |
| Projections: CV, Portfolio, Lab | `src/records/projections.ts` |
| Citation of an output | `src/records/citation.ts` |
| The site's store, `siteRecords` | `src/records/index.ts` |
| Synthetic fixture: 29 invented records | `src/design/records-fixture.ts` |
| Study, development only | `/_design/records/` |
| Entries may name records: `relatedRecords` | `src/editorial/schema.ts`, `model.ts`, `site.ts` |
| Rules and fields | `planning/content-model.md`, "Canonical records" |
| Checks | `tests/records.mjs` (REC-001 to REC-026); CONT-020 |

Built:

- **Eight families:** people, organizations, research areas, projects, scholarly outputs, appointments, education, activities (teaching, presentation, participation, mentoring, award, funding, service, outreach, training, certification; four of them added in P11-A01). IDs carry their family (`project-…`) and are unique across all records.
- **Validation at load:** each record against its schema, then the dataset as a whole (unique IDs, references that exist and name the right family, no loop of parent organizations, no synthetic record in the site's data). Every problem is listed with the record's ID; an invalid dataset fails the build.
- **Dates keep their precision** (`2022`, `2022-06`, `2022-06-14`); `end: "present"` marks an ongoing period; a missing end is never shown as present.
- **Relationships are stored on one side** and derived on the other; authors are ordered and may be registered people or external names.
- **Selectors, three projections and one citation format**, all pure, all returning only records that are public and verified.
- **A record creates no page**, and no navigation changed. The study shows the projections with invented data only.
- **Not done, on purpose:** no real record; nothing imported from `cv/codex-yaml/`, the Pelican archive or the web; no entity pages; no CV, Portfolio or Lab page; no citation-style engine; no funding family; no rendering of related records on entries.

Also fixed: the P10 entry component used an undefined token (`--font-size-lg`), so an entry's description fell back to the inherited size. Found when the editorial components were added to the token check; it now uses `--font-size-lead`.

## Editorial reading layouts (P12)

Each of the eight collections has its own reading layout and index on one shared shell (D-094 to D-097; `planning/design-system.md` section 12, `planning/content-model.md`, `planning/architecture.md`).

- **Real content:** still none. Every collection's folder shows its name, its identity and an empty state. No entry was added.
- **Code:** `src/editorial/reading.ts` (presentation table, contents, neighbours, related entries, index groups), `src/components/editorial/` (shell, metadata, contents, pagination, related, epigraph, chapter list, overview, eight indexes), `src/layouts/editorial/` (eight layouts and `layouts.ts`), `src/styles/editorial.css`, editorial tokens in `tokens.css`.
- **Schemas:** six optional fields (D-095); nothing required changed.
- **Study:** `/_design/editorial/` (overview), `/_design/editorial/<collection directory>/` (index) and `/_design/editorial/<collection directory>/<slug>/` (article), with 21 synthetic entries and 10 synthetic Markdown bodies (`src/design/`). The pages sit in the real folders of each collection (`FolderPage`'s `path`).
- **Tests:** `tests/editorial-layouts.mjs` (EDIT-001 to EDIT-022 without a browser), `tests/editorial-browser.mjs` (EDIT-012B, EDIT-014, EDIT-015, EDIT-016B, EDIT-017B, EDIT-B01 to EDIT-B03 in headless Chromium), and EDIT-003B, EDIT-016B, EDIT-018B in `tests/editorial-build.mjs`. The older tests were updated for the study's pages and the new index markup.
- **Verified:** `npm run verify` and `npm run test:browser` pass; the layouts were looked at in the app's browser pane at 1440 and 390 px (all eight articles, six indexes, the contents, the Kosmos chapter on a phone) and the five widths 320, 390, 768, 1280 and 1440 px by script. Not looked at: Safari, Firefox, real devices, screen readers.
- **Waiting for the owner:** visual approval of the eight layouts (G-P12-13).
- **Not done, by design:** Quarto, a citation processor, equation numbering and a code-copy button (P13); real entries; Bearnard on article pages; the order of the Kosmos works.

## Scientific articles (P13)

Quarto is an optional way to write an entry that needs equations, numbered figures and tables, citations or computed figures (D-098 to D-103; `science/README.md` is the guide; `planning/architecture.md`, "Quarto and Astro"). Astro stays the only site framework.

- **Real content:** none. No Quarto article is published; only the synthetic specimen (study) and the test fixture exist.
- **Tool:** `scripts/science.mjs` (`check`, `verify`, `render`, `execute`) and `scripts/science-html.mjs` (Quarto's HTML to a checked article fragment). `npm run build` runs only the offline `verify`.
- **Sources and outputs:** `science/` (Quarto project, specimen source and bibliography, frozen results `_freeze/`; the Python packages moved to `environments/science/` in P13-A01); generated and committed: `src/science/` (manifest, articles), `src/design/quarto/` (the study's article), `public/_design/quarto/assets/` (its figure), and, for a real entry, `src/content/<dir>/<name>.md` and `public/assets/scientific/`.
- **Site side:** `src/science/index.ts` reads the manifest and the articles; `EditorialEntry.astro` uses an entry's article in place of rendered Markdown. P12's layouts, indexes and routes are unchanged.
- **Tested with:** Quarto 1.10.19, Pandoc 3.10.0, Python 3.12.13 (ipykernel 7.3.0, jupyter_core 5.9.1, nbformat 5.10.4, nbclient 0.11.0, pyyaml 6.0.3, from an existing conda environment chosen with `SCIENCE_PYTHON`). Nothing was installed.
- **Features shown by the specimen:** inline and numbered display equations (MathML, no script), a computed figure and table with numbers and cross-references, citations and a reference list, a footnote with its backlink, callouts, a code listing with output, the Greenhouse contents list.
- **Tests:** `tests/science.mjs` (QTO-001 to QTO-016, QTO-019 to QTO-029: 27 checks, one throwaway build), `tests/science-execute.mjs` (QTO-017, QTO-018: SKIPPED without Quarto and Jupyter), `tests/science-browser.mjs` (QTO-030). Existing tests were updated for the new pages, figures and dependency.
- **Verified:** `npm run verify` and `npm run test:browser` pass; the specimen was looked at in the browser pane at 1440 and 390 px. Not looked at: Safari, Firefox, screen readers, other MathML engines.
- **Waiting for the owner:** review of `/_design/quarto/` (G-P13-13).
- **Not done, by design:** the authoring CLI (P14), PDF output, R or Julia, a citation import or mapping to records, any real scientific content.

## The author's CV as the source (P11-A01)

**CV YAML → validated canonical records → pages and document generators** (D-089 to D-093). The owner's versioned CV YAML is the source of truth for the owner's professional history. The integration exists and is tested; **nothing of the CV is published**, and the owner's file is unchanged.

| Item | Where |
| --- | --- |
| The working proposal (private, ignored by Git, 22 sections, 186 records, 967 placeholders, version 0.1.0) | `cv/codex-yaml/CV.proposta.yaml` |
| Which file is the working file, and which version is approved: none | `cv/manifest.json` |
| Source identifier → permanent record ID: none assigned | `cv/identities.json` |
| How to publish a version, step by step | `cv/README.md` |
| Reading the YAML; authoring validation (tool side) | `src/cv/source.ts` |
| Approval and version rules | `src/cv/manifest.ts`, `src/cv/versions.ts` |
| The adapter: the allowlist, CV sections to record shapes (tool side) | `src/cv/adapter.ts` |
| The public snapshot's shape and checks; `mergeRecords` | `src/cv/snapshot.ts` |
| The generated snapshot: `null` | `src/data/cv/snapshot.ts` |
| What pages read: `siteCv` (published or not, version, owner, profile) | `src/cv/site.ts` |
| The tool: `npm run cv:check`, `npm run cv:snapshot` | `scripts/cv.mjs` |
| Synthetic CV fixture | `tests/fixtures/cv/` |
| Rules, states, mapping | `planning/content-model.md`, "The author's CV" |
| Checks | `tests/cv.mjs` (CV-001 to CV-020) |

Built:

- **A read-only path** from the CV to the P11 record families. The tool's only write is the snapshot module; no code writes, formats, renames or moves a CV file.
- **Explicit version selection and approval.** Nothing is published unless `cv/manifest.json` switches publication on and names a `CV-vX.Y.yaml` file with its version, SHA-256 and approval date. `fonte_de_verdade: true`, the review status, the file name and the newest file decide nothing.
- **Two validation layers.** Authoring validation accepts the draft as it is, placeholders included. Publication validation leaves out unresolved fields, records without a required field, drafts and records without an assigned ID, and never turns an unknown end into "present".
- **Text as written.** The record schemas were extended so that an author line (with co-first-author marks), an institution or a venue line is kept whole; statuses the CV does not state are left out.
- **An allowlist.** Letters, statements, references, plans, the placeholder inventory, writing templates, internal source notes, email, telephone, location, mentees' names and grades, amounts and confidential titles are never read.
- **A generated public snapshot** is what a build reads; a build never needs the CV file. Without a snapshot the site builds with no CV data, as now.
- **One source per fact.** `src/data/records/` is for independent records only; a hand-written fact of the owner's CV fails the build once a snapshot exists. The CV relates outputs to the site's projects and never describes a project.
- **The real file was read, not changed** (SHA-256 `8e402f27…4e49` before and after). In memory only, with throwaway IDs and a pretend approval, 181 of its 186 list records mapped and validated, with the owner's person record; the other five are two drafts and the three software entries, which name no project the site has. Nothing of that run was written.
- **Not done, on purpose:** no version approved; no ID assigned; no snapshot generated; no CV page, export or download; no translation of the CV's Portuguese text; no structuring of author lines or institutions.

## Toolchain

| Item | Value |
| --- | --- |
| Node.js policy | The 26 LTS line: `.node-version` says `26`; `package.json` engines `>=26.12.0 <27` |
| Local Node.js | v26.12.0. Compatible, but it predates the first 26 LTS release (v26.13.0) and lacks the v26.12.1 security release. |
| Package manager | npm 11.20.0. `package-lock.json` is committed; install with `npm ci`. |
| Dependencies | `astro` 7.4.8. P03–P05 added none. |
| Dev dependencies | `@astrojs/check` 0.9.12, `typescript` 6.0.3, `prettier` 3.6.2 (range `^3.6.2`), `yaml` 2.9.1 (P11-A01, D-089: the CV tool and its tests only; already installed through Astro), `ultrahtml` 1.7.0 (P13, D-100: the scientific-article tool and its tests only; already installed through Astro) |
| TypeScript | `astro/tsconfigs/strict` with `erasableSyntaxOnly` |
| Astro config | `site: "https://www.gusmaolab.org"`, `output: "static"`, no `base`, no adapter |
| Local preview | `.claude/launch.json`: `astro-preview` (built site, port 4322) and `astro-dev` (port 4321) |

## Scientific environment and demonstrations (P13-A01)

The scientific Python is now isolated and specified, and the scientific publishing features can be seen in the running site (D-104 to D-106; `development/scientific-environment.md`, `development/demonstrations.md`).

- **Environment:** micromamba environment `gusmaolab-science` (Python 3.12.16 from conda-forge, ARM64, `uv` 0.13.8) from `environments/science/environment.yml`; the 39 packages that apply on this machine are pinned with hashes in `requirements.txt` (universal lock, `uv pip compile`), installed with `uv pip install` (not `sync`: conda-forge owns `pip`, `setuptools` and `wheel`). `scripts/science-env.mjs` (`npm run science:env`, `science:quarto`) finds it by name, checks it in both directions, and runs Quarto with it. `science/environment.txt` is gone. Quarto 1.11.9 (`quarto-required: >=1.10.19 <2`).
- **After the Homebrew upgrades:** Node 26.13.1, npm 11.20.0 and Astro 7.4.8 unchanged in behaviour; Quarto went from 1.10.19 to 1.11.9. `npm run verify` and the browser suites passed before any change; re-executing the P13 specimen with Quarto 1.11.9 and the new Python gave byte-identical files (only the recorded versions changed). Nothing was downgraded, installed globally or upgraded.
- **Demonstrations:** three synthetic Greenhouse articles, a Markdown guide, a Quarto tutorial (two signals, a model, a computed figure and table, citations, a bibliography) and a comparison, in `src/demos/` and `science/demo/`. They are listed under "Development Demonstrations" in the Greenhouse Overview in `npm run dev`, and built by `npm run demo:build` into `dist-demo/` (`npm run demo:preview`, port 4323). `npm run build` never includes them and checks its own output (`scripts/public-build.mjs`).
- **Changed on the site side:** `src/editorial/demo.ts`, the `greenhouseDemos` collection (`src/content.config.ts`), `src/editorial/site.ts` (entries carry a `demo` flag; demonstrations are read among themselves), `schemaFor(collection, {synthetic})`, the demonstrations section and the notice (`CollectionOverview`, `GreenhouseIndex`, `EditorialArticle`, `editorial.css`), `src/pages/demo-assets/[name]/[file].svg.ts`, a fourth document directory in the science tool, `colgroup` dropped by the HTML cleaner. P12's layouts and `reading.ts`, the registry, the folders, the palettes, P10's routing rules, P11 and the CV are byte-identical to their commits.
- **Tests:** `tests/science-env.mjs`, `tests/demos.mjs`, `tests/demo-execute.mjs`, and the browser files `tests/demo-browser.mjs` and `tests/demo-dev-browser.mjs` (P13A-001 to P13A-030; the acceptance matrix has the table); `tests/science-restore.mjs` (`npm run science:restore-test`) rebuilds the environment from its specification and was run once. Existing tests changed only for the new files, figures and the additive changes (QTO-001, QTO-023, QTO-024, routes, smoke, bearnard).
- **Looked at:** the demonstrations at 1440 and 390 px in headless Chrome (screenshots of the live dev server, kept outside the repository), and by clicking from Home in the real dev server. Not looked at: Safari, Firefox, Android Chrome on a phone, screen readers.
- **Waiting for the owner:** open `http://localhost:4321/lecture-notes/greenhouse/` and read the three articles (G-P13A-10); P13's own review of the layout (G-P13-13) can be done on the same pages.

## Authoring workflow (P14)

Writing and publishing an article is now five commands over one file, with a development workbench that shows them (D-107 to D-111; `development/authoring-guide.md`).

- **Commands:** `npm run content:new | content:validate | content:preview | content:publish | content:archive` (`scripts/content.mjs`, engine `scripts/content-lib.mjs`, definitions `src/editorial/authoring.ts`). Explicit arguments, no prompts. They create drafts in all eight collections (Markdown; Quarto for The Greenhouse and Bearnard's Trail), validate with one preflight of 21 checks, print an article's local address and whether the dev server answers, publish and archive with a dry run unless `--yes`, and never commit, push, deploy, delete or run a notebook cell. No new dependency.
- **Workbench:** `/_design/publishing/` (overview), `/_design/publishing/workflow/` (the real commands on a throwaway article, with their output) and `/_design/publishing/draft-example/` (a synthetic draft in the real Greenhouse layout). Reached by clicking from the Greenhouse Overview's Development Demonstrations section. Development and demonstration builds only: the release build has 72 pages and none of it; the demonstration build has the three pages more.
- **Changed elsewhere:** one link in `CollectionOverview.astro`, three route files, release-guard markers in `scripts/demo-check.mjs`, `tests/routes.mjs` (the route allowlist), and two P13-A01 tests adjusted to allow the link inside the demonstrations section (`tests/demos.mjs`, `tests/demo-dev-browser.mjs`). P10's schemas and routes, P12's layouts, P13's tool, the CV, the palettes, the folders and the registry are untouched.
- **Tests:** `tests/authoring.mjs` (AUTH-001 to AUTH-043, real commands on throwaway project folders), `tests/authoring-build.mjs` (a release and a demonstration build of a throwaway copy holding articles made by the commands) and `tests/authoring-browser.mjs` (AUTH-031, AUTH-032, AUTH-045 in the real dev server); the acceptance matrix has the table.
- **Looked at:** the workbench's pages at 320, 390, 768, 1280 and 1440 px in headless Chrome, and screenshots at 1440 and 390 px (kept outside the repository). A real draft was created, opened in the running dev server (HTTP 200, draft notice, not in the index) and removed. Not looked at: Safari, Firefox, Android Chrome, screen readers.
- **Waiting for the owner:** use the workflow on a real article, and read the workbench (G-P14-11).

## Homepage (P15)

Home (`/`) is the real homepage, not scaffolding (D-112 to D-117; `planning/design-system.md`, "Homepage").

- **Regions:** welcome with Bearnard and the one `<h1>`; "Where to begin" (seven folders in three groups, from the registry); the reserved "Inside the nucleus" stage; "From the Blog" (the newest three published Blog entries, or an honest empty state, which is what the real page shows now); "Around the world" (eight places, configured, not live). Components in `src/components/home/`, data in `src/home/` (`archive.ts`, `clocks.ts`, `updates.ts`).
- **Bearnard:** the registry's one approved illustration, by ID (`bearnard-v1.3-portrait`), eager, with its width and height. No role was assigned to `home-welcome`: that stays the owner's decision.
- **Specimen:** `/_design/home/` (development and demonstration builds only) shows the same page with synthetic Blog posts; the real homepage links to it at its foot while developing. A release build has neither.
- **Tests:** `tests/home.mjs` (HOME-001 to HOME-022 and HOME-027 to HOME-036, on `dist/` and the sources) and `tests/home-browser.mjs` (HOME-009B, 010B, 022B and HOME-023 to HOME-026, headless Chromium against `dist-demo/`).
- **Looked at:** the page at 320, 390, 430, 768, 1024, 1280 and 1440 px (automated overflow, overlap, Bearnard ratio, clocks, keyboard and motion checks) and screenshots at 1440, 1280, 768, 390 and 320 px, kept outside the repository.
- **Not shown:** Safari, Firefox, a real phone, a screen reader. The copy is provisional.
- **Waiting for the owner:** review the homepage, its words and layout (G-P15-10), and decide the `home-welcome` role.
- **The nucleus stage:** filled by P20 with the 3D nucleus (see "The nucleus on the homepage (P20)"). (The clocks were filled by P16, below.)

## World clocks (P16)

The homepage's "Around the world" region shows eight live clocks (D-118 to D-121), Anchorage, Mexico City, Brasília, Accra, Moscow, Dhaka, Koror and Auckland, in that order, on the IANA zones of `src/home/clocks.ts`.

- **What each shows:** the local time as `HH:mm` (24-hour, no seconds), the local weekday and date ("Monday, 16 November"), from `Intl.DateTimeFormat` with the zone and one instant for all eight (`src/home/clock-time.ts`, pure). Daylight saving comes from the browser's own time-zone database; nothing holds an offset. Anchorage and Auckland change with their own rules, Mexico City does not change, Brasília uses `America/Sao_Paulo` and is named Brasília.
- **Updates:** one timer for all eight, aimed at the next minute and recomputed from the real time on every tick; none while the page is hidden; redrawn on becoming visible and on restoration from the history cache (`src/home/clock-loop.ts`, `src/scripts/world-clocks.ts`). No framework, network call, geolocation or storage.
- **Before the script, and without it:** the built HTML holds `--:--` placeholders of the same size as a live reading, hidden from assistive technology; with JavaScript off the section says "Live times need JavaScript". An unformattable zone would show "Unavailable", never the visitor's time.
- **Accuracy limit:** the device's clock is the only time source, so a wrong device clock shifts every clock; the page says so.
- **Specimen:** `/_design/world-clocks/` (development and demonstration builds only), linked from the dev note at the foot of the real homepage, draws the real component for four simulated instants (New Year's Eve, Anchorage's and Auckland's daylight-saving changes), labelled as simulated.
- **Tests:** `tests/clocks.mjs` (CLOCK-001 to CLOCK-018 on fixed UTC instants against an independent `zoneinfo` reference, CLOCK-019 to CLOCK-025 on the loop with fake timers, CLOCK-026, 027, 029 and 032 to 040 on the built page, the sources and git) and `tests/clocks-browser.mjs` (CLOCK-019B to 026B, 028, 030, 031, 032B to 034B and 041 in headless Chromium against `dist-demo/`, with a controllable page clock and a count of pending timers).
- **Looked at:** the homepage and specimen at 320, 390, 430, 768, 1024, 1280 and 1440 px (automated overflow, order and fit checks) and screenshots at 1440, 768, 390 and 320 px, kept outside the repository.
- **Not shown:** Chrome on Android or any real device, Safari, Firefox, a real background tab (hiding is simulated through the page's own visibility events), a screen reader, or the owner's view.
- **Waiting for the owner:** review the clocks (G-P16-10).

## Navigation coverage and content states (P17)

Every one of the 36 registered folders (11 sections, 25 children) has a built page that says what it is for and what state it is in (D-122 to D-125). The states are derived, never typed: with the site's real data, **3 are ready** (Home and the Lecture Notes and Writing overviews), **8 are empty** (the eight editorial collections, working, with no published entry) and **25 are in preparation** (About, Contact, Schedule, Portfolio, the CV and its eight sections, the Lab and its six, Bearnard's Area and its four); none is unavailable.

- **Model:** `src/site/state.ts` (the four states), `src/site/destinations.ts` (per folder: purpose, source, what it says while the material is missing, up to three related folders by registry ID), `src/site/coverage.ts` (derivation from a registry and facts; pure), `src/site/facts.ts` (record counts from the P11 projections) and `src/site/page.ts` (Astro side: the editorial counts and the route audit). The P06 `ScaffoldContent` is gone.
- **Components:** `src/components/states/` (`DestinationPage`, `StateNotice`, `ChildGuide`, `RelatedLinks`, `RecordsContent`) and `src/styles/states.css` (global, imported by `BaseLayout`). The page's state is `data-page-state` on a `div` inside `<main>`. `FolderPage`, the folders, the registry and the palettes are unchanged.
- **Honesty:** the records pages (Portfolio, the CV sections, Lab People, Research Areas and Partners) show verified P11 records through their projections once any exist, and are in preparation until then; the CV pages read only the approved snapshot, which does not exist yet. Contact has no form and no address, Schedule no booking control, Join Us no opportunity, Facilities no facility. Bearnard's Area Overview shows his approved illustration by ID; his other pages ask for the unassigned `under-construction` role and draw nothing.
- **Development tools** (development and demonstration builds only, absent from `npm run build`): `/_design/site-map/` "Site Map & Page Coverage" (every folder, URL, parent, state, reason, route generated, computed counts, the other development pages) and `/_design/page-states/` (the components in each state and records pages from the synthetic fixture). Both are linked from the local homepage's development note and the Publishing Workbench's banner.
- **Link check:** `npm run links` (`scripts/links.mjs`): 72 pages, 3554 internal links in `dist/`, none broken; also SITE-013.
- **Tests:** `tests/site.mjs` (SITE-001 to SITE-011, 013 to 034 and 039 to 044 on the registry, the built pages and git; 40 checks) and `tests/site-browser.mjs` (SITE-010B, 012, 035 to 038 and 045 to 047 in headless Chromium against `dist-demo/`; 9 checks).
- **Looked at:** pages at 1440 px and 375 px in the Browser pane, and automated overflow, heading, row, image, keyboard-focus, reduced-motion and 200%-text checks at 320, 390, 430, 768, 1024, 1280 and 1440 px.
- **Not shown:** Safari, Firefox, Chrome on Android, a screen reader, the owner's view of the copy.
- **Waiting for the owner:** review the site-wide pages and their wording (G-P17-12); supply the real material (About text, contact details, the CV approval, projects, people, photographs).

## Contact, downloads and the 404 page (P18)

- **Contact** (`/contact/`, Core): lists only channels the owner has approved, from `src/data/contact.ts`, which is empty (D-126). With none, the page says direct contact details are being prepared; with some, it groups them by use and draws plain `mailto:` and external links. No form, no script, no invented address. Its state is derived: preparation today, `ready` once a channel is approved.
- **Downloads** (D-127): `src/data/downloads.ts` (approved: none; planned: the CV as a PDF), `src/downloads/` (rules and file reads), `DownloadList.astro`, `scripts/downloads.mjs` (run by `npm run build` before and after Astro, and by `npm run downloads:check`). The CV page shows the planned CV document as "Not yet available". `public/downloads/` does not exist yet; the `.gitignore` is changed so it will be tracked. Workflow: `development/downloads-guide.md`.
- **404 page** (D-128): `src/pages/404.astro` writes `dist/404.html`; `src/layouts/ErrorPage.astro` draws it (no tab row, no selection, no script, Core atmosphere). It offers Home, Portfolio, Lecture Notes, Writing and Contact. Unknown addresses return 404 with it from the dev server, `astro preview` and a Pages-style test server. GitHub Pages itself is untested.
- **Development specimens** (development and demonstration builds only): `/_design/contact/` (synthetic channels), `/_design/downloads/` (two synthetic files that really download, one planned example); the synthetic files are served from `/demo-downloads/`. Linked from the local homepage's development note, the site map and the Publishing Workbench's banner; the homepage note and the site map also link a missing URL that shows the 404 page.
- **Tests:** `tests/util.mjs` (UTIL-001 to UTIL-050 on the registry, the build, real local servers and git; 47 checks) and `tests/util-browser.mjs` (UTIL-003B, 009, 019B, 021B, 022, 025B, 029B, 032, 051; 9 checks).
- **Not shown:** an email delivered or a mail client opened, GitHub Pages itself, Safari, Firefox, Chrome on Android, a screen reader, the owner's view.
- **Waiting for the owner:** approved contact channels (G-P18-12) and any downloads; review of Contact, the downloads specimen and the 404 page (G-P18-13).

## npm scripts

`dev`, `build`, `preview`, `check`, `test`, `test:browser`, `verify` (`check`, then `build`, then `test`), `astro`, `format`, and `science:check`, `science:verify`, `science:render`, `science:execute`, `science:env`, `science:quarto`, `science:restore-test`, `content:new`, `content:validate`, `content:preview`, `content:publish`, `content:archive`, `demo:build`, `demo:preview` and `demo:verify` (the scientific-article tool and the demonstrations; `build` runs `science:verify` first, and nothing else runs the others), and `cv:check` and `cv:snapshot` (the CV tool, run by hand, never by a build). `npm test` runs `tests/design-tokens.mjs`, `tests/contrast.mjs`, `tests/navigation.mjs`, `tests/smoke-test.mjs`, `tests/folders.mjs`, `tests/routes.mjs`, `tests/previews.mjs`, `tests/responsive.mjs`, `tests/transitions.mjs`, `tests/bearnard.mjs`, `tests/categories.mjs`, `tests/content.mjs`, `tests/editorial-build.mjs`, `tests/records.mjs` and `tests/cv.mjs`. `npm run test:browser` runs `tests/previews-browser.mjs`, `tests/responsive-browser.mjs`, `tests/transitions-browser.mjs` and `tests/categories-browser.mjs` in a local headless Chrome, through `tests/browser-harness.mjs`, separately from `verify` (D-062, D-069).

## Build status

`npm run verify` passes:

- `astro check`: 0 errors, 0 warnings, 0 hints across 131 files.
- Build: 72 pages (40, the 30 of the editorial study and the 2 of the Quarto study). `dist/` holds 79 files, 1,712,818 bytes in all: the site's pages and stylesheets (627,252 bytes), the design studies (843,546, with the Quarto study's one figure) and the two Bearnard derivatives (242,020), each under its own ceiling (D-074, KL-30, KL-42, KL-51). No script file: the 37 pages with folders each inline one module (4.1 KB: previews and rows; at Vite's inlining limit, KL-36); the P03 specimen, the Bearnard study and the records study have no script.
- Token checks pass (43 primitives, 213 tokens; 5 categories with 5 colour tokens each, 4 environments with 10 typography and texture tokens each). Contrast checks pass: 245 of 245 enforced pairings, 260 in all, across the five categories.
- Navigation: 23 of 23 model tests pass (NAV-001 to NAV-021, NAV-025, NAV-033), for 11 sections and 36 folders.
- Smoke test passes. The built pages are exactly the 36 registered destinations and the declared `/_design/` studies (the four of one page and the editorial study's 30), and the only other files are stylesheets and the registered derivatives.
- Folders: 10 of 10 tests pass (FOLD-001 to FOLD-010).
- Routes: 9 of 9 tests pass (NAV-022, NAV-023, NAV-026 to NAV-032). NAV-024 passed in the browser.
- Previews: 11 of 11 checks pass without a browser (PREV-001 to PREV-007, and the markup of PREV-004, PREV-013, PREV-014 and PREV-015).
- Responsive: 8 of 8 checks pass without a browser (RESP-006 to RESP-008 and RESP-013 to RESP-017).
- Transitions: 4 of 4 checks pass without a browser (TRANS-B01 to TRANS-B04).
- Bearnard: 8 of 8 checks pass (BEAR-001 to BEAR-008); BEAR-004 is skipped in a checkout without the masters.
- Chromatic Archive: 10 of 10 checks pass (CAT-001 to CAT-010), for 5 categories, 11 tabs and 36 pages.
- Editorial model: 17 of 17 checks pass (CONT-001 to CONT-015, CONT-017, CONT-019), for 8 collections.
- Editorial builds: 14 of 14 checks pass (CONT-004 to CONT-016, CONT-018 and CONT-020, built), in 6 throwaway builds.
- Records: 26 of 26 checks pass (REC-001 to REC-026), for 8 families and 29 synthetic records; the site's own records number 0.
- CV: 20 of 20 checks pass (CV-001 to CV-020), on 27 synthetic records derived from the fixture and one throwaway build; CV-001, CV-003 and CV-018 also read the real working file where it is present, and say so where it is not.

`npm run test:browser` passes separately in headless Chrome 157: 12 of 12 preview checks (PREV-005, PREV-008 to PREV-014), 17 of 17 responsive checks (RESP-001 to RESP-017), 12 of 12 navigation-continuity checks (TRANS-001 to TRANS-012) and 8 of 8 colour and navigation checks (CAT-011 to CAT-018).

## Repository

| Item | Value |
| --- | --- |
| Working branch | `development` (D-035), local only. P04 at `ef5f78a`; P05 at `4771127` and `40083ce`; the Bearnard sticker task's notes at `cda026e`, `fa522dc` and `aaa32a7`; P06 at `39bc564` and its approval record `f8eead2`; P07 at `750e98f` and its approval record `28392b0`; P08 at `5a906f1` and its approval record `ca0dc82`; P09 at `93d3af0` (navigation continuity), `6ddf084` (Bearnard foundations), `b76f3b0` (environment candidates, since superseded) and `ceec322` (records); P09-A01, the Chromatic Archive, at `4f1e68f` and `10b3223`; P10 at `2748020` (global row grouping) and `3108d93` (editorial collections); P11 at `48d7ae3` (canonical records); P11-A01 at `92bf5d3` (the CV as the source of the owner's records), then a commit recording that hash |
| Milestone branches | `chore/gusmaolab-foundation-p01` (`4096691`), `chore/gusmaolab-astro-foundation-p02` (`5fab52c`), `feat/gusmaolab-design-system-p03` (`851fdbb`), all kept |
| Recovery tag | `pre-astro-checkpoint` → `6eedf02`, local only |
| `main` | `6036137`, the same tree as the checkpoint |
| `origin/main` | `e28d43a`, two commits ahead of local `main`: a fetch at 08:22 on 2026-11-11, not run by Claude Code, brought in a merge (pull request 125) that adds seven files under `__frag8/`, unrelated to this work. Noticed at the end of P09; nothing was fetched, merged or pushed in response. No `development` branch exists on `origin`. |
| Remote | `origin` = `git@github.com:eduardogade/GusmaoLab.git`, public. Nothing was pushed in P01–P11 or P11-A01: the decisions are recorded in D-082, D-087 and D-093. `origin/main` was still `e28d43a` and `origin` still had no `development` branch when checked on 2026-11-13 with `git ls-remote`. |
| Untracked | `clean`, a byte-identical copy of `clean.sh` that appeared at 18:01 on 2026-11-10. Claude Code did not create it, and left it alone at the owner's instruction. Also on disk and, since P11-A01, ignored by Git (D-093): `cv/codex-yaml/`, the author's CV working folder (the CV-01 task), which Claude Code did not create, stage or change; P11-A01 read `CV.proposta.yaml` there and nothing else. |

## Assets

- The 352 Bearnard images in `brand/bearnard/` are unchanged and gitignored; every checksum in `assets/bearnard/SHA256SUMS` matches.
- `public/` and `dist/` hold two Bearnard images, both registered WebP derivatives of the v1.3 master (D-073). No master, and no other image, is in either.

## Legacy archive

Unchanged since P03; P05 to P09-A01 did not touch it. ISSUE-0003 stays open: the recruiter-era files in the public history, and a possible third file.

## Completed prompts

P01 to P18, including P09's Addendum 01 (the Chromatic Archive) and P11's Addendum 01 (the CV as the source of the owner's records, D-089 to D-093). P08's real-device checks are pending. P09 is technically completed; two owner reviews are pending (G-P09-A6, G-P09-B7); the third, G-P09-C7, was closed by D-076. P10 is completed (D-077 to D-082), and so is P11 (D-083 to D-088), with empty production records. P12 to P16 are described in their own sections above; owner reviews of P13's demonstrations, P14's workflow, P15's homepage and P16's clocks are pending.

## Blockers

None.

## Waiting for the owner

- **Retest folder navigation** on a real desktop and Android phone in Chrome, and say whether the blink has meaningfully improved (G-P09-A6, ISSUE-0004).
- If possible, try the site on a real phone and tablet (G-P08-21, KL-32).
- **Look at the Chromatic Archive on the running site** and on real screens (G-A01-23, KL-39). Two points for the owner's eye, neither changed because the values are locked: Core's and Research's cardstocks are the closest pair on the global row (question 25), and Forest Teal cannot be a link colour on the shell or directly on the three darker Level 1 cardstocks (question 26, KL-38).
- Optional refinements to the folders, the Overview tab, the previews and small screens, if wanted: `planning/design-system.md` section 10, questions 13, 14, 16, 18 and 20–22.
- A concurrent task: another agent (CV-01) appended a section to the working copies of this file and of the implementation log, and created the folder `cv/codex-yaml/`. P09-A01 left all three unchanged and out of its commit; the owner decides when they are committed.
- **The CV** (P11-A01), in order: (1) done: the owner confirmed the Git ignore rule for the CV files on 2026-11-14 (D-093); (2) say where the CV files are to live, since the brief names `cv/CV.proposta.yaml` and the file is in `cv/codex-yaml/`; (3) when the CV is reviewed, create `cv/CV-vX.Y.yaml`, assign the record IDs in `cv/identities.json` and approve the version in `cv/manifest.json` (`cv/README.md`); (4) decide which contact links to release; (5) decide how the CV's Portuguese text appears on an English site (KL-54); (6) look at the names of thesis candidates and supervisors in the first snapshot's diff (KL-57); (7) keep a backup of the CV files, which Git no longer sees (KL-55).
- **Records** (P11): the system is empty. To fill it, the owner supplies or confirms the facts: which people, organizations, projects, outputs, positions, degrees and activities are to be public; whether the proposed CV in `cv/codex-yaml/` is to become their source once verified, and through what review (`planning/content-model.md`, "The CV workflow"); whether a YAML source is preferred to the TypeScript lists; whether funding should be a family; which collaborators may have a profile (KL-46).
- **Editorial decisions** (P10): whether to write the first entries; the Kosmos structure, including the order of the works and any work and chapter URLs (KL-44); whether `heroImage`, `mascot`, `related` and `featured` are wanted (`planning/content-model.md`); whether a push of `development` is wanted as a backup (D-082).
- **Assign Bearnard illustrations to roles**, or leave them empty for now (G-P09-B7; question 23).
- Typography consolidation (D-042), still deferred.
- `origin/main` holds two commits that local `main` lacks, adding `__frag8/` (see Repository). Decide whether they belong there before `development` is ever merged into `main` (D-082 lists the steps).
- The third-level folders, when content work reaches them (`planning/information-architecture.md` section 3).
- Whether the second-level slugs are final before first publication (D-037).
- Update the local Node.js to the latest 26.x LTS release (KL-06).
- Decide what to do about ISSUE-0003, including the possible third file.
- The deployment design: target repository, CNAME and token (D-005).
- How to store Bearnard masters (D-011).
- **Bearnard roles:** whether the v1.3 portrait should stand in for any role, and which other illustrations to approve (G-P09-B7; `planning/design-system.md` section 10, question 23).
- Approval of the 204 Codex expression candidates.
- What to do with the untracked `clean` file.

## Bearnard WhatsApp preparation — Prompt 1/3 (2026-11-10)

Local derivatives are complete in `brand/bearnard/expressions2/_all/`: 204 static transparent 512 × 512 WebPs, each ≤100,000 bytes (79,210–99,996 bytes; total 18,872,908 bytes). All exports pass decode, static-frame, dimensions, alpha, margin and size checks. All 210 protected source/reference/prompt files retain their hashes. Nine existing side-edge contacts are documented and preserved. Every sticker received overview QA; 18 representative/edge cases received larger previews. Ready for emotional categorization; no packs or app were created. Script, manifest, preparation report and QA previews are local ignored assets.


## Bearnard sticker categorization — Prompt 2/3 (2026-11-11)

Completed seven local packs under `brand/bearnard/expressions2/packs/`: Good Vibes & Wins (30), Love & Hugs (30), Let's Talk (30), Awkward Moments (30), Not Today (30), Big Drama (30), and Goofing Around (24). All 204 copied WebPs match `_all/` byte-for-byte. Each has emoji tags, a unique accessibility description and explicit order. Seven transparent 96 × 96 tray icons, per-pack manifests, the consolidated preparation manifest, editable assignments, seven contact sheets, semantic-review evidence and a categorization report are complete.

All 204 stickers received contact-sheet visual review; all seven icons were inspected at native size. Ambiguous editorial choices are documented (52 medium-confidence assignments). `ready_for_prompt3` is true; `user_approved` remains false. No Android application or APK was created. All assets remain local and gitignored; the source library and original PNGs were preserved.

Executed `python3 tools/build_sticker_packs.py` and `python3 tools/build_sticker_packs.py --validate-only`: 7 packs, 204 unique assignments, 0 missing/duplicates/file/metadata/icon failures; 441 protected input hashes unchanged. Repeated execution preserved hashes and modification times for all 204 copies, seven icons, CSV and consolidated manifest (213 files). The builder respects manual CSV edits and marks semantic review stale when reviewed inputs change. No dependency installation or site changes; site build checks were not applicable to this asset-only task.


## Bearnard Stickers Android application — Prompt 3/3 (2026-11-11)

Built `brand/bearnard/expressions2/android/dist/BearnardStickers-debug.apk`: one debug-signed Android app, application ID `org.gusmaolab.bearnard.stickers`, version 1.0.0 (1), 19,577,132 bytes. Seven independently importable packs preserve all 204 curated stickers byte-for-byte. Includes ordered previews, light/dark UI, accessible descriptions, representative launcher icon, official ContentProvider/import protocol, consumer/Business handling and verified-only install status. Upstream WhatsApp revision: `06144a1f6077bbb346e1230032fc4e0bce996d03`; BSD notice retained in source and APK.

Executed asset conversion/validation and 5 Python tests; Gradle `:app:assembleDebug :app:testDebugUnitTest :app:lintDebug` succeeded with 7 Android tests passing and lint reporting no issues. APK inspection via aapt/apksigner and ZIP-byte comparison passed: correct identity, signed package, 7 packs, 204 WebPs, 7 tray icons, no runtime permissions. All 682 protected input files retain their hashes. SDK/build caches/debug signing stay local under android and ignored. README, upstream notes and build report are complete. APK SHA-256: `c4cad5af8b6e368d6409a9c611a1bfb2ab773606abbc7ef33731788ce8e7ff89`.

ADB diagnostic found no devices. No app installation or real WhatsApp import was attempted; real-device confirmation, cross-app permission behavior and Samsung/TalkBack UI review remain pending. This milestone does not claim those tests passed. No site source change or site-wide build was needed; ignored brand artifacts were not force-added, and the unrelated `clean` file was preserved.


## CV-01 — Estruturação do CV mestre (2026-11-12)

Criada a proposta local `cv/codex-yaml/CV.proposta.yaml`, com apresentação integral em um único bloco YAML em `cv/codex-yaml/CV.entrega.md`. O `CV.yaml` anterior e os 13 documentos Word foram preservados por SHA-256. Fonte factual: `0.Curriculum.docx`, com corte no início de 2025; nenhuma verificação factual externa foi realizada.

Inclui 3 formações, 14 experiências documentadas (2 consultorias industriais), 19 artigos, 3 trabalhos completos em anais, 13 resumos, 12 palestras, 27 participações em eventos, 4 financiamentos, 4 prêmios, 19 atividades docentes, 10 orientações de 7 pessoas, 7 atividades de extensão, 24 cursos e 8 referências. Inclui cartas e declarações em português, 176 variantes sem vínculos institucionais, stubs industriais e 158 marcadores únicos em 26 grupos de pendências. Datas impossíveis e vínculos descritos como atuais em 2025 aguardam confirmação; credenciais e totais inflados não foram incorporados.

Validação: extração OOXML somente leitura com o Python empacotado; geração e `python3 /tmp/cv-yaml-audit/validate.py` com PyYAML 6.0.3 passaram após ajustes no extrator bibliográfico. Verificados parsing sem chaves duplicadas, indentação de dois espaços, ausência de tabs, datas ISO, cobertura dos inventários, campos bibliográficos contra a fonte, cadastro de todos os marcadores, variantes sem instituições e hashes das 14 entradas. A primeira tentativa de geração no Python empacotado falhou por ausência de PyYAML; a geração YAML usou o Python local, sem instalação de dependências. Verificação factual externa: não realizada. `npm run verify` e testes de navegador: não executados nesta alteração documental, sem mudança no site.

O trabalho começou na branch `development` com alterações alheias, inclusive exclusões já staged; elas foram preservadas. Nenhum commit ou push foi realizado nesta entrega de proposta. A promoção da proposta a `CV.yaml` depende da revisão do autor e da resolução da instrução de preservar os arquivos de entrada.

## 3D nucleus prototype (P19)

A standalone, interactive Three.js model of an interphase nucleus and its folded chromatin, with one yellow region that opens and reaches modestly toward a navigation target (D-130 to D-136). P20 mounted it on the real homepage (next section); this section describes the standalone prototype, which remains.

| Item | Where / what |
| --- | --- |
| Code | `src/visualization/nucleus/` (12 modules, about 1,700 lines); guide: `development/nucleus-guide.md` |
| Figure markup and fallback | `src/components/scientific/NucleusFigure.astro` (a still SVG picture from the same model; the canvas replaces it when live) |
| Specimen | `/_design/nucleus/`, "3D Nucleus Prototype", development and demonstration builds only; linked from the local homepage's development note and the Site Map & Page Coverage list; five simulated tabs, a play button, frame-width presets, a still-nucleus preview, hideable diagnostics |
| Entry script | `src/scripts/nucleus-specimen.ts` (a guard) loads `src/design/nucleus/specimen.ts` only in development and demonstration builds |
| Dependencies | `three` 0.187.0 and `@types/three` 0.187.0 (the only additions); the graphics chunk is 537 KB, 132 KB gzip, loaded on demand on the specimen page only |
| Tests | `tests/nucleus.mjs` (42 checks, Node) and `tests/nucleus-browser.mjs` (19 checks, headless Chrome with software WebGL) |
| Release build | no page, no script, no Three.js (`scripts/demo-check.mjs` searches for them) |

Observed: at 896 × 672 px (pixel ratio 1) on an Apple M1 Max in headless Chrome 157 (Metal) the nucleus holds 60 fps while responding (median and 95th percentile 16.7 ms) and draws 0 frames while still; on software WebGL it runs at about 15 fps. 128,000 triangles at full detail and 78,000 at `light`, four draw calls, three materials. Untested: Safari, Firefox, Android Chrome, a real phone, a screen reader.

The homepage, its stage and clocks, the folders, the five palettes, Bearnard, the editorial and CV code, and the contact, downloads, 404 and site-map pages are unchanged. Pending: the owner's review of the biology, look, motion, suitability and performance (G-P19-15).

## The nucleus on the homepage (P20)

The P19 nucleus is on the real Home (`/`), driven by the real folder tabs (D-137 to D-143; `development/nucleus-guide.md`, `planning/nucleus-multidomain.md`). P19's geometry, deformation, materials, renderer and fallback files are unchanged; the only change to P19's code is one new constant (`DEFORMATION.targetLimit`), the navigation contract (`activate` / `clear`, `observeNavigation`, `domains.ts`, `localTarget`) and a status callback.

| Item | Where / what |
| --- | --- |
| Mount | `NucleusStage.astro` (P15's footprint and ratios, no border) with the shared `NucleusFrame.astro` (a still picture of the model in the static HTML); `src/scripts/home-nucleus.ts` (3.8 KB, 1.8 KB gzip) loads the nucleus when the stage is within 300 px of the viewport |
| Navigation side | `src/home/nucleus-navigation.ts`: the eleven global-row folder tabs, identified by `data-tab-id`; attention point = the tab's visible part |
| Contract | `NucleusNavigationTarget { navigationId, position, chromatinDomainId? }`; `activate` / `clear`; `setTarget` / `release` kept |
| Domains | **One** (`highlighted-region`); `NAVIGATION_DOMAINS` is empty; every ID takes the default; unknown IDs fall back and are reported. Multiple regions are not implemented |
| Precedence | the most recent input wins; an input ends the response only if it set it (D-138) |
| Touch and reduced motion | still nucleus; keyboard focus lifts stillness on touch, never under reduced motion (D-141) |
| Release build | three JavaScript files, Home only: stage script 3.8 KB, nucleus 15.2 KB (6.5 KB gzip), renderer with Three.js 537 KB (132 KB gzip); no specimen |
| Tests | `tests/nucleus-integration.mjs` (54 checks, Node) and `tests/nucleus-integration-browser.mjs` (21 checks, headless Chrome with software WebGL, against the release build) |

**Observed** (Apple M1 Max, headless Chrome 157, Metal; five cold loads, median; the P19 homepage built the same way as the comparison): a 1440 × 1800 window loads Home in 15 ms (load event) in both, first contentful paint 32 ms before and 36 ms after, layout shift 0, one 50 ms-class long task after (total blocking about 4 ms) and none before. The nucleus starts loading at about 19 ms and is mounted and drawn about 66 ms later (median), 154 ms with the CPU throttled four times (a simulation, not a phone). At an ordinary window height (900 px) the stage is far below the fold, so none of the 540 KB loads: Home's transfer is the P19 page plus the 3.8 KB script. Home's HTML grew from 26.9 KB (6.6 KB gzip) to 72.9 KB (25.0 KB gzip) because the still picture is inline (KL-108). While responding: 60 fps (median 16.7 ms, 95th percentile 17.5 ms, worst 19.8 ms), four draw calls per frame; at rest or settled: 0 frames and 0 draw calls in 5 s, after repeated hovers too. The highlighted region's centroid moved 27 to 35 px toward About, CV and Writing and came back to within 2.5 px. Not measured: a real GPU other than this one, a phone, Safari, Firefox.

**Looked at:** 1440 and 1280 px (1,800 px tall, so tabs and nucleus are both on screen), 390 px with touch emulation (still nucleus), and the specimen's mapping inspector; screenshots and a recording are outside the repository. 320, 430, 768 and 1024 px were checked by layout assertions (no overflow, the P15 proportions) rather than by eye.

**Three facts to know.** (1) At an ordinary window height the tabs and the stage are not on screen together (D-143, KL-112); the response is real but off screen. (2) All eleven tabs open the same region, and because the tabs are all far above the nucleus, the directions differ only a little (mostly up, tilted left or right). (3) The cross-document transition's snapshot of the canvas is an owner visual check (KL-115).

Pending: the owner's review of the homepage with the nucleus (G-P20-23) and the decision on D-143.
