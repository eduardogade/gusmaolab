# Implementation log

Newest entry first.

## P11-A01 — The Author's Versioned CV YAML as the Canonical Professional Source of Truth — 2026-11-14

**Agent:** Claude Code. **Branch:** `development`. **Result:** completed. The CV is recognised as the source of the owner's professional history, a read-only path from it to the P11 records exists and is tested, and **nothing of the CV is published**: no version is approved, no ID is assigned, no snapshot was generated. The owner's CV file is byte-for-byte unchanged. Nothing was pushed, `main` was not touched, and P12 was not started.

### Starting state (verified)

- **HEAD:** `development` at `0ff702f` (the P11 records commit). Working tree: the other agent's CV-01 sections in `development/current-state.md` and this log, the untracked `cv/codex-yaml/` and the untracked `clean`.
- **The CV file is not where the brief says.** The brief names `cv/CV.proposta.yaml`; the file is `cv/codex-yaml/CV.proposta.yaml` (117,100 bytes, last modified 2026-11-12 18:17). It was read there and not moved. Beside it are `CV.yaml`, `CV.entrega.md` and thirteen `.docx` source documents, none of which was opened.
- **Tracking:** the file was untracked and **not ignored**; `git log --all -- cv` shows only the first commit's two empty files. It has never been committed or pushed. The repository is public (`origin` on GitHub).
- **Other agents:** the Codex desktop app was running, and the directory's modification time changed at 04:05 while the file's own did not. The file's SHA-256 was recorded at the start (`8e402f27…4e49`) and compared after every read.
- **P11 as it stood:** eight empty typed lists in `src/data/records/`, loaded by `createRecords`; nothing in them overlapped the CV, so there was nothing to migrate or delete. The synthetic fixture and the study were kept.

### What the file is

- Valid YAML, 22 top-level sections, all 22 the ones the brief lists; 186 records in 21 lists; 967 placeholder occurrences (158 distinct); `metadados.versao` 0.1.0, `fonte_de_verdade: true`, `situacao: Proposta para revisão do autor`.
- Most facts are single lines of text (`instituicao_e_local`, `autores`, `veiculo_e_detalhes`, `descricao`), identifiers follow the old documents' section numbers (`4.1.1`, `exp_1`), two records are drafts without identifiers, and the three software entries are named, not numbered.
- It holds a telephone number, an email address and eight references with historical email addresses.

### Done

- **Records model (D-091):** `src/records/schema.ts` gained `provenance.sourceId`; on outputs `authorsText`, `authorshipNote`, `creditedTo`, `details` and the type `conference-abstract`; on appointments `institution`, `department` and the type `consulting`; on education `institution`, `supervision` and an optional `status`; on activities `context`, four new types (`participation`, `funding`, `training`, `certification`), two service types, and optional `mentorshipType` and `presentationType`. `registry.ts`, `selectors.ts`, `projections.ts` and `citation.ts` follow: the CV projection has four more sections and shows an institution kept as text; the citation prints an author line and a venue line as written.
- **`src/cv/` (new):** `source.ts` (YAML, sections, record lists, authoring validation), `versions.ts`, `manifest.ts` (approval rules), `adapter.ts` (the allowlist and the mapping), `snapshot.ts` (snapshot shape, checks, `mergeRecords`), `site.ts` (`siteCv`).
- **`scripts/cv.mjs` (new):** `check` and `snapshot`; `npm run cv:check`, `npm run cv:snapshot`.
- **Data:** `src/data/records/independent.ts` (the hand-written lists), `index.ts` now merges them with `src/data/cv/snapshot.ts` (`null`).
- **`cv/`:** `manifest.json` (working file named, nothing approved, publication off), `identities.json` (empty), `README.md`.
- **Dependency:** `yaml` 2.9.1 as a development dependency (D-089), installed offline: it was already in `node_modules` through Astro, and the lockfile gained one line.
- **Safeguards (D-093):** `.gitignore` now ignores `/cv/codex-yaml/` and `/cv/CV*.yaml`; `.prettierignore` excludes the CV files from `npm run format`.
- **Tests:** `tests/cv.mjs` (CV-001 to CV-020) with the synthetic fixture `tests/fixtures/cv/CV.fixture.yaml`; `tests/records.mjs` updated for the optional references, five new conditional cases and the development dependency.
- **Documents:** `planning/content-model.md` (record fields; new section "The author's CV"), `planning/architecture.md`, `planning/information-architecture.md`, `development/decisions.md` (D-089 to D-093), `development/roadmap.md`, `development/acceptance-matrix.md`, `debugging/known-limitations.md` (KL-52 to KL-58), `AGENTS.md`, `README.md`, this log and the current state.

### Decisions taken while implementing

- **A committed, generated snapshot** rather than reading the CV at build time: the file is private and absent from GitHub Actions (D-092).
- **Text as written** rather than splitting: the P11 schemas were extended instead of the adapter guessing organizations and authors (D-091).
- **Software yields relationships, not projects,** so the CV cannot overwrite the site's description of a project (D-092).
- **An explicit identity map, empty,** rather than IDs derived from section numbers (D-091). No ID was assigned for the owner, not even the owner's own.
- **Funding as an activity type,** not a ninth family: in the CV it has the shape of an award.
- **The Git ignore rule** is Claude Code's addition, not the brief's (D-093). Reason: one `git add -A` would publish private details irreversibly. The owner confirmed it after the report, on 2026-11-14 ("Keep ignored").
- **Left out of the allowlist** beyond the brief's list: mentees' names and grades, amounts of money, unconfirmed teaching hours, `tecnologias`, `experiencia_declarada`, and the titles of proposals reviewed in confidence.

### Checks

- **Before any change:** nothing to re-verify beyond P11's own final state (`0ff702f`, verified in the previous prompt).
- **`npm run verify`:** passes. `astro check` 0 errors in 88 files; 40 pages; `dist/` 45 files, 1,176,165 bytes, the same as before P11-A01; 23 navigation, 10 folder, 9 route, 11 preview, 8 responsive, 4 transition, 8 Bearnard, 10 archive, 17 editorial model, 14 editorial build, 26 record and 20 CV checks.
- **`npm run test:browser`:** 12, 17, 12 and 8 checks pass in headless Chrome 157. The folders' interaction was not changed; run for regressions.
- **Mutation checks:** six safeguards were broken one at a time and restored: an unknown end shown as "present" (CV-002, CV-011, CV-012 failed), a mentee's name projected (CV-014, CV-017), the fingerprint not compared (CV-008), co-first-author marks dropped (CV-010), a private section read (CV-013), a hand-written fact of the owner accepted (CV-012).
- **The real file:** `npm run cv:check` reads it (22 sections, 186 records, 967 placeholders; "Publication: NOT approved"). An in-memory run with throwaway IDs and a pretend approval mapped 181 of the 186 list records (35 outputs, 14 appointments, 3 degrees, 129 activities) and the owner's person record, all valid, with no placeholder, email address, telephone number, template or source-document name in the result. Nothing of that run was written anywhere. CV-018 searched the built site for 539 texts of the real file: none found.
- **Preservation:** the CV file's SHA-256 is unchanged; nothing under `cv/codex-yaml/` was written, staged or renamed; 352 of 352 Bearnard checksums match; `git diff --check` is clean; no file under `src/styles/`, `src/navigation/`, `src/components/` or `src/pages/` changed.
- **Not tested:** a real approval and a real snapshot (there is none); Safari, Firefox and real devices (nothing visible changed); the tool on a machine without the CV file other than through the fixture.

### Found

- Of the real file's 186 list records, the in-memory run left out five: two drafts (`industria`, `certificacoes`) and the three software entries, which name no project the site has yet. Those three become relationships once the site has the project records.
- **`npm run format` would have rewritten the CV file** (Prettier's pattern includes `**/*.yaml`). It was not run; the file is now excluded.
- A P11 test (REC-024) forbade any path containing `cv/` in the record modules; it now forbids YAML files and `codex-yaml` instead, since `src/data/records/index.ts` legitimately imports `src/cv/snapshot.ts`.

### Git

- Commit on `development`: `92bf5d3 feat(cv): derive the owner's records from the versioned CV (P11-A01) [P11]`, then a records commit that only notes this hash. No push (D-082): integration code only, no content, and `origin` was not contacted.
- The first attempt to commit was stopped by the `check-yaml` hook, correctly: the fixture held an unquoted impossible date (`2023-02-30`), which that hook's YAML 1.1 reader turns into a date. The fixture now quotes it; the adapter still leaves it out (CV-005). No hook was bypassed.
- The other agent's CV-01 sections in this log and in the current state were left in the working tree and out of the commit, as before.

## P11 — Canonical Research, Publication, People & Professional Records — 2026-11-13

**Agent:** Claude Code. **Branch:** `development`. **Result:** completed. The canonical record system exists, is validated and tested, and holds **no real record**: the site's eight lists are empty, and everything was proved with a synthetic fixture. Nothing was pushed or deployed, `main` was not touched, and P12 was not started.

### Starting state (verified)

- **HEAD:** `development` at `426712c` (the P10 records commit). Working tree: the other agent's CV-01 sections in `development/current-state.md` and this log, the untracked `cv/codex-yaml/` and the untracked `clean`, all left alone.
- **P10 verified:** `npm run verify` passed before any change (39 pages; 23 navigation, 17 editorial model and 13 editorial build checks among the rest). Eleven tabs in five category blocks, eight collections, drafts without pages, entries owned by their folders: as recorded.
- **Existing structured data:** none usable. `cv/cv.md`, `cv/template.tex`, `publications/publications.bib` and `publications/style.csl` are empty files; `data/` holds empty legacy placeholders; there was no `src/data/`.
- **`cv/codex-yaml/` (another task):** looked at only as far as needed to judge the overlap: its file names and sizes, and the top-level section keys of its proposal. No content was read into a record, quoted or changed, and nothing there was staged. It is an unverified proposal with pending placeholders, and it holds contact details and references.

### What was built

- **Model** (`src/records/`, pure, Node-runnable):
  - `schema.ts`: eight families (people, organizations, research areas, projects, scholarly outputs, appointments, education, activities as a discriminated union of six types), family-prefixed IDs, strict Zod schemas, DOI normalization, ORCID check digit, URL validation.
  - `dates.ts`: dates as text at the precision known, periods with `end: "present"`, order and display.
  - `registry.ts`: `validateRecords()` and `createRecords()`: schema pass, then dataset pass (unique IDs, references, the organization hierarchy, synthetic records refused unless allowed); a deeply frozen store.
  - `selectors.ts`, `projections.ts`, `citation.ts`: derived relationships and orders; CV, Portfolio and Lab view models; one citation per output.
  - `index.ts`: `siteRecords`, the site's validated store.
- **Data** (`src/data/records/`): one typed list per family, all empty, each file saying when a record may be added.
- **Fixture and study:** `src/design/records-fixture.ts` (29 invented records, deliberately awkward) and `/_design/records/` (one project in three projections, one citation three times, a CV projection, counts, a validation example).
- **Editorial contract:** the optional `relatedRecords` in the common entry metadata; `recordReferenceIssues()` in the loader; `entriesAbout()` for the reverse.
- **Tests:** `tests/records.mjs` (REC-001 to REC-026, in `npm test`); CONT-020 and the `bad-related-record` fixture; the study declared in the smoke, route, transition, responsive and editorial-build tests; the editorial components and the study added to the token check.
- **Dependencies:** none.

### Decisions taken (D-083 to D-088)

- TypeScript data modules, not YAML (no parser in the project, no checking while typing, and the YAML date hazard of P10) and not content collections (the editorial collections stay eight).
- `src/records/`, not the suggested `src/lib/`, which the root `.gitignore` hides.
- One side of every relationship is stored; reverses are selectors.
- A record is shown only if `public` and `verified`; neither flag is a security boundary.
- The site's data stays empty rather than hold a plausible guess.

### Findings

- **A P10 defect, fixed.** Adding the editorial components to the token check showed that `EditorialEntry.astro` used `--font-size-lg`, which does not exist, so an entry's description rendered at the inherited size. It now uses `--font-size-lead`. P10's tests had not listed the new components for that check.
- **Cascading diagnostics, fixed before commit.** A record that failed its schema was dropped, and every reference to it was then reported as "does not exist" (one bad URL on a person gave twenty messages). Such a record is now remembered as declared, so only its own error is reported (KL-48).
- **The study leaked a reference, fixed before commit.** Its first version printed the raw project record, which names a participant whose own record is hidden. REC-025 caught the ID in the page. The study now prints the record without its participants; the rule is that a page never prints a reference to a person it may not name.
- **Shared objects in the fixture.** Spreading one `provenance` object into every record meant a test that edited one record's provenance edited all of them. The tests replace the object instead; the store itself parses fresh copies.
- **The scratch directory was emptied** between sessions (the helper scripts of earlier prompts were gone). Nothing in the repository depended on it.

### Visual review

The study at `/_design/records/`, from the production preview (`astro preview`, port 4322), in the app's browser pane.

- **Looked at:** 1440 px (all five sections) and 390 px (the three projections and the CV section).
- **Measured, not looked at:** 1280, 768 and 320 px: no sideways page scroll.
- **Regression:** the folders were not changed; the browser suites cover them (RESP-001 includes the new study at ten widths).
- **Not checked:** Safari, Firefox, real devices.

### Validation (final)

- `npm run verify`: passes. `astro check` 0 errors, warnings and hints in 78 files; 40 pages; 43 primitives and 213 tokens; 260 contrast pairings; 23 navigation, 10 folder, 9 route, 11 preview, 8 responsive, 4 transition, 8 Bearnard, 10 archive, 17 editorial model, 14 editorial build and 26 record checks; `dist/` 45 files, 1,176,165 bytes (site 702,682, studies 231,463, illustrations 242,020).
- `npm run test:browser`: 12 of 12 preview, 17 of 17 responsive, 12 of 12 navigation-continuity and 8 of 8 colour and navigation checks in headless Chrome 157.
- **Mutation check:** with `isShown` made to show hidden records, REC-011, 013, 016, 017, 018, 019 and 020 failed, as they should; reverted.
- `shasum -a 256 -c assets/bearnard/SHA256SUMS`: 352 of 352 match.
- `git diff --check`: clean. The pre-commit hooks ran on the commit.
- **Push decision:** none (D-082, D-087): an internal data milestone with no production content. `origin/main` is still `e28d43a`.
- **Other agent's work:** the CV-01 sections of `development/current-state.md` and this log, `cv/codex-yaml/` and `clean` stayed unstaged and unchanged.
- **Commit:** `48d7ae3 feat(records): establish canonical research and professional entities [P11]`, followed by a records commit that only adds this hash.

## P10 — Editorial Collections, Structured Publishing Foundations & Navigation Consolidation — 2026-11-13

**Agent:** Claude Code. **Branch:** `development`. **Result:** completed, in two commits: the global row grouped by category, and the editorial collections. Nothing was pushed or deployed, `main` was not touched, and P11 was not started.

### Starting state (verified)

- **HEAD:** `development` at `10b3223` (the P09-A01 records commit). Working tree: the other agent's CV-01 sections in `development/current-state.md` and `development/implementation-log.md`, the untracked `cv/codex-yaml/` and the untracked `clean`, all left alone.
- **Baseline claims checked against the files:** Astro 7.4.8, static output, 11 top-level and 25 second-level folders (36 destinations), 3 design studies, 5 locked palettes, previews, scrolling rows, the cross-fade and the Bearnard registry; no content collections, no `src/content/`, no `src/content.config.ts`, no `@types/node`. All as recorded.
- **Remote (read-only, `git ls-remote`):** `origin/main` at `e28d43a` (the `__frag8/` merge, two commits ahead of local `main`), 19 unrelated branches, no `development`. `development` is 24 commits ahead of `origin/main`.
- **Local dev server:** an `astro dev` process the owner started at 05:03 was listening on 4321 (PID 62816); left running (see "Colours in the local browser").

### Part A — the global row, grouped by category (D-077)

- **Registry:** the sections were reordered to Home, About, Contact, Schedule · Portfolio, CV, Lab · Blog, Lecture Notes · Writing · Bearnard's Area. Labels, IDs, URLs, categories, environments and children are unchanged.
- **Rule:** `validateNavigation()` now rejects a registry in which a category returns after another began. NAV-033 checks the five blocks (4, 3, 2, 1, 1), the rejection and its message, and that a reversed row stays valid.
- **Tests updated:** NAV-001 and CAT-001 (the order). PREV-008 (keyboard) assumed Lecture Notes followed Lab; Blog, a leaf, now does, so it checks Blog (no preview) and then Lecture Notes. RESP-002 (browser) hardcoded the old order; it now reads the registry's.
- **CAT-018 (new, browser):** Home ↔ CV, CV ↔ Writing, Blog ↔ Lecture Notes, Lecture Notes ↔ Berries, Writing ↔ Kosmos Series, at 1440 and 390 px, by clicking the destination's tab, then Back and Forward: URL, selected tabs, one V per row in Midnight Ink, every global tab's own colour (selected or dimmed), the open folder, paper and flannel, and the shell and link colours.
- **Commit:** `2748020 refactor(navigation): group tabs by archive category [P10]`.

### Part B — editorial collections (D-078 to D-081)

- **Collections:** eight, in `src/editorial/collections.ts`, each with a directory in `src/content/`, an owning folder by ID, and a prefix and category read from that folder. Each directory holds a `.gitkeep` only.
- **Schemas:** `src/editorial/schema.ts`, Zod through `astro/zod`: a strict common contract (`title`, `status`, `slug` always; `description` and `publishedAt` for published and archived; `updatedAt`, `tags`) and extensions for Blog, Trail, Greenhouse, Timber Logs, Months' Original, Kosmos and Book Club.
- **Loader:** `src/content.config.ts`, the stable `glob()` loader with an explicit `generateId` (the file path), so the ID never mixes with the slug; files starting with `_` are ignored.
- **Routing model:** `src/editorial/model.ts` (pure): routes for published and archived entries (and drafts only in the dev server), clash detection, total orders, index items, display of dates.
- **Astro side:** `src/editorial/site.ts`: `getSiteNavigation()` (folders plus entry routes; `FolderPage` resolves through it), `pageStaticPaths(1 | 2 | 3)` (the three existing route files list folders then entries) and `collectionIndexFor()`.
- **Components:** `EditorialEntry.astro` and `CollectionIndex.astro`; no font, colour or geometry was added.
- **Smoke test:** accepts a page beyond the registered ones only if it declares itself a published or archived entry at its collection's prefix plus its slug.
- **Tests:** `tests/content.mjs` (17 checks, on synthetic records) and `tests/editorial-build.mjs` (13 checks, in 5 throwaway builds of a copy of the project with the fixtures in `tests/fixtures/editorial/`). A mutation check (a draft counted as public) failed CONT-007, CONT-013 and CONT-014 as it should.
- **Fixtures:** synthetic, marked "SYNTHETIC FIXTURE", outside `src/content/`; never published; the real `dist/` holds no editorial page.
- **Dependencies:** none. `src/node-fs.d.ts` declares the one Node function `content.config.ts` uses, because the project installs no `@types/node`.

### Findings

- **The YAML parser corrects impossible dates silently.** The first build of the `bad-date` scenario (`publishedAt: 2026-02-30`) succeeded and published the entry as 2026-03-02. `src/editorial/raw-dates.ts` now checks the raw text of the three date fields and the build fails (KL-41, D-079). Found by the test, not by inspection.
- **Temporary directories on macOS:** `os.tmpdir()` is `/var/…`, a link to `/private/var/…`; Vite then sees two names for one file and fails to find its compile metadata. The build test uses the real path.
- **Per-page weight:** the route files import both editorial components, so every folder page inlines about 2 KB more CSS (KL-42).
- **Build noise:** each empty collection prints two warnings (KL-40).
- **Draft preview:** checked by hand in a throwaway `astro dev` (draft 200 with its notice, absent from the index, unknown slug 404); not automated (G-P10-18).

### Colours in the local browser

The brief asks to verify the local serving before changing any CSS. Read-only: the owner's dev server (started 05:03 today, working directory this repository) serves `<html data-category="core">`, `src/styles/categories.css` with all 25 locked values (`#a09a91`, `#cbc5b9`, `#f4f2ec` …), every top-level tab with its own `data-category`, and the new tab order. The production preview (port 4322) paints the same colours (CAT-011 to CAT-018, and screenshots). No CSS was changed and no browser storage was touched. If the owner's browser shows different colours, the discrepancy is in that browser (a cached page or an old tab), not in what is served; a hard reload or reopening the tab is the next thing to try, and the dev server may need a restart now that `src/content.config.ts` exists (KL-43). I could not see the owner's browser.

### Visual review

Headless Chrome 157, the production preview (`astro preview`, port 4322) and, for entries, a throwaway fixture build served locally.

- **Global row:** looked at Home, CV, Blog, Berries and Writing at 1440 px (four silver Core tabs, three cream Research, two cinnamon Blog & Notes, one golden Writing, one powder-blue Bearnard; geometry as before), and measured all five at 1280 px and 390 px (no sideways page scroll; the selected tab in view; the row scrolls on the phone).
- **Entries (synthetic):** looked at a published berry at 1440 and 390 px (Lecture Notes and Berries tabs selected, Blog & Notes cardstock and paper, headings, link, list, table). Captured and measured but not looked at one by one: the archived berry, the Blog index and a Kosmos chapter, and the 1280 px captures of the entries.
- **Not checked:** Safari, Firefox, real phones and tablets, forced-colors, other displays.

### Validation (final)

- `npm run verify`: passes. `astro check` 0 errors, warnings and hints in 59 files; 39 pages; 43 primitives and 213 tokens; 260 contrast pairings (245 enforced, 0 failures); 23 navigation, 10 folder, 9 route, 11 preview, 8 responsive, 4 transition, 8 Bearnard, 10 archive, 17 editorial model and 13 editorial build checks; `dist/` 44 files, 1,154,869 bytes (site 702,612, studies 210,237, illustrations 242,020).
- `npm run test:browser`: 12 of 12 preview, 17 of 17 responsive, 12 of 12 navigation-continuity and 8 of 8 colour and navigation checks in headless Chrome 157.
- `shasum -a 256 -c assets/bearnard/SHA256SUMS`: 352 of 352 match; `brand/bearnard/` was not touched and is still ignored.
- `git diff --check`: clean. The pre-commit hooks ran on each commit.
- **Push decision:** none (D-082). P10 is unfinished infrastructure with temporary pages; no backup or collaboration need was stated; `origin/main` still has the `__frag8/` commits that `main` lacks.
- **Other agent's work:** the CV-01 sections of `development/current-state.md` and this log, `cv/codex-yaml/` and `clean` stayed unstaged and unchanged.
- **Commits:** `2748020 refactor(navigation): group tabs by archive category [P10]` (Part A) and `3108d93 feat(content): establish editorial collections [P10]` (Part B), followed by a records commit that only adds these hashes.

## P09-A01 — Final Color Architecture: Chromatic Archive — 2026-11-12

**Agent:** Claude Code. **Branch:** `development`. **Result:** completed. The owner's Addendum 01 to P09, "approved and locked by the owner", replaces the palette-experimentation part of P09 (Part C below) with five permanent category palettes (D-076). Nothing was pushed or deployed. P10 was not started.

### Starting state (verified)

- **HEAD:** `development` at `ceec322` (the last P09 records commit). Working tree clean apart from the untracked `clean` file, left alone.
- **Baseline:** `npm run verify` and `npm run test:browser` passed as recorded at the end of P09.
- **Uncommitted palette work:** none. P09's candidates were committed (`b76f3b0`) and were study-only; no site page used them.

### What changed

- **Navigation.** External was removed from `src/navigation/registry.ts`: 11 sections, 36 nodes, 36 pages (`folderStaticPaths` counts 10, 25 and 0). Every section now declares a `category` (`ArchiveCategory`: `core`, `research`, `blog-notes`, `writing`, `bearnard`) beside its `environment`; descendants inherit both, and the resolved state carries the page's category and each top-level tab's own.
- **`/external/`.** It existed only as a page generated from the registry, with the development placeholder. Removing the entry stops it being built. Nothing else was deleted, no redirect or new destination was added, and no history was rewritten.
- **Colour tokens.**
  - `src/styles/categories.css` (new): the 25 locked colours as primitives named after the owner's colour names, and five tokens per `[data-category]` (flannel ground, flannel line, Level 1, Level 2, reading paper). `:root` is Core. It is the only file that declares them.
  - `src/styles/tokens.css`: the three shared colours (Deep Charcoal, Forest Teal, Midnight Ink) and the global tokens that use them; nine primitives that only the old environment colours used were removed (24 → 15, plus 3 shared = 18; 43 with the archive). The aliases (inactive and hovered tabs, preview card, supporting surfaces) now recompute on `:root, [data-environment], [data-category]`.
  - `src/styles/environments.css`: each environment keeps its ten typography and texture values, unchanged from P03, and sets no colour.
  - `src/styles/folders.css`, `global.css`: colour inputs only. The third level's material is the reading paper; the flannel's thread is drawn from the category's line colour. No geometry, spacing, font or motion changed.
- **Markup.** `BaseLayout` takes `category` and sets `data-category` on `<html>`; `FolderPage` passes the page's; `FolderStack` puts it on the stack, and `FolderTab` puts each top-level tab's own on its `<li>`. That is what keeps a tab's cardstock when another folder is open, with no script.
- **Contract and reader.** `src/design/contract.mjs`: `CATEGORIES`, `CATEGORY_TOKENS` (5), `ENVIRONMENT_TOKENS` (10, was 33), and contrast pairings per category. `src/design/css-tokens.mjs` resolves tokens for a category.
- **Removed (superseded, D-075):** `src/styles/environment-candidates.css`, `src/pages/[design]/environments-v2.astro` and `tests/environments.mjs`. They remain in the history at `b76f3b0`.
- **Studies.** The tokens specimen and the folder study show the five categories; the Bearnard study is unchanged.
- **Tests.** New: `tests/categories.mjs` (CAT-001 to CAT-010, in `npm test`) and `tests/categories-browser.mjs` (CAT-011 to CAT-017, in `npm run test:browser`). Updated for eleven tabs, 36 pages, three studies, categories and the colour-free environments: the token, contrast, navigation, folder, route, smoke, preview, responsive and transition tests and the browser harness.

### What the locked colours required

No locked value was changed. Recorded in D-076, `planning/design-system.md` section 8 and KL-38:

- Forest Teal reaches 1.88:1 on the Deep Charcoal shell, so links on the shell keep the eye green (5.88:1).
- Forest Teal reaches 2.78:1, 3.41:1 and 3.67:1 directly on the Core, Research and Blog & Notes Level 1 cardstock. No page places a link there. Links on Level 2 cardstock and on paper pass in every category; the tightest is Core's Level 2, 4.52:1.
- Tab labels use the darkest ink; the tightest label is on an inactive Core tab, 4.57:1.
- Muted text was darkened from `#6E5646` to `#654B3D` (an unlocked value) so it passes on every Level 2 cardstock.
- The third level uses the reading paper itself, with no derived tint.

### Visual review

Screenshots in headless Chrome 157 from the production preview (`astro preview`, port 4322).

- **Looked at:** at 1440 px, Home, CV, Blog, Writing, Bearnard's Area, CV → Research and Writing → Kosmos Series; at 1280 px, Lecture Notes → The Greenhouse and the tokens specimen; at 1024 px, Lecture Notes → The Greenhouse; at 768 px, CV → Research; at 390 px, Home and Writing → Kosmos Series; at 320 px, Bearnard's Area → Powerlifting.
- **Captured and measured but not looked at one by one:** CV → Research and Bearnard's Area at 390 px, and the rest of the 56 captures.
- **Sent to the owner:** the eight views the addendum asks for (Home, CV, Blog, Writing, Bearnard's Area, CV → Research and Writing → Kosmos Series at 1440 px; four phone views at 390 px).
- **Not checked:** Safari, Firefox, real phones and tablets, forced-colors and high-contrast modes, colour-vision deficiencies, other displays (KL-39).

### Other activity in the repository

During this work another agent (Codex, task CV-01) appended a "CV-01" section to `development/current-state.md` and to this log, and created the untracked folder `cv/codex-yaml/`. Its text was left exactly as written and was **not** committed with P09-A01: only this entry and P09-A01's own changes to the two records were staged. The folder was not opened for editing, staged or changed. The `astro dev` server on port 4321 that had been running since before P09 was no longer listening when the work resumed after a pause; Claude Code did not stop it.

### Validation (final)

- `npm run verify`: passes. `astro check` 0 errors, warnings and hints in 48 files; 39 pages; 43 primitives and 213 tokens; 260 contrast pairings in 5 categories (245 enforced, 0 failures); 22 navigation, 10 folder, 9 route, 11 preview, 8 responsive, 4 transition, 8 Bearnard and 10 archive checks; `dist/` 44 files, 1,080,362 bytes (site 628,105, studies 210,237, illustrations 242,020).
- `npm run test:browser`: 12 of 12 preview, 17 of 17 responsive, 12 of 12 navigation-continuity and 7 of 7 colour checks in headless Chrome 157.
- `shasum -a 256 -c assets/bearnard/SHA256SUMS`: 352 of 352 match. `brand/bearnard/` is still ignored.
- `git diff --check`: clean. The pre-commit hooks ran on the commit.
- **Commit:** `4f1e68f feat(design): implement the Chromatic Archive category palettes [P09]`, followed by a records commit that only adds this hash.

## P09 — Navigation Continuity, Environmental Refinement & Bearnard Integration Foundations — 2026-11-11

**Agent:** Claude Code. **Branch:** `development`. **Result:** technically completed, in three parts with one commit each. Three reviews are the owner's and still open: a retest of the folder transition on real browsers (G-P09-A6), the Bearnard role assignments (G-P09-B7) and the environment candidates (G-P09-C7). Nothing was pushed or deployed. P10 was not started.

### Starting state (verified)

- **HEAD:** `development` at `ca0dc82` (P08 and its approval record). Working tree clean apart from the untracked `clean` file, left alone.
- **Baseline:** `npm run verify` passed (0 errors, warnings and hints); `npm run test:browser` passed 12 of 12 preview and 17 of 17 responsive checks.
- **Other activity:** an `astro dev` server started outside this session was running on port 4321 (PID 73580). Astro 7 allows one dev server per project, so P09 used it read-only for the dev-mode comparison and did not stop it. No repository file had changed since the P08 approval commit.

### Part A — Navigation continuity

- **Diagnosis** (ISSUE-0004): frame-by-frame traces and screencasts of eight scenarios, production preview and dev server, headless and visible Chrome 157, at 1440 px and 390 px. No blank or unstyled frame anywhere; every navigation was a three-frame hard cut, the whole viewport changing in one frame (mean colour change 26.5–27.6 between sections, 17.1 within CV on a phone).
- **Fix** (D-071): `src/styles/view-transitions.css`, imported by `FolderPage`: native cross-document view transitions, a 140 ms cross-fade of the root (group, old and new), off under reduced motion; no `view-transition-name`, no client router, no new script. Afterwards: 2.5–4.8 per frame over about 18 frames, no white frame in 52 visible-window runs.
- **Found on the way:**
  - In headless Chrome about 1 cross-fade in 4 to 10 began from a blank white snapshot. A magenta backdrop test showed the white is the snapshot itself, not the canvas behind it. It never happened in a visible window (KL-35).
  - While a fade plays, clicks go to the page root: the P07 browser tests, which clicked 80 ms after arriving, timed out. The harness now waits for any transition to finish (KL-34).
  - After Back from the back-forward cache, Chrome replayed a stale pointer position once the fade ended and reopened a preview: previews now wait for real pointer movement (D-072).
- **Tests:** `tests/transitions.mjs` (TRANS-B01 to TRANS-B04, in `npm test`) and `tests/transitions-browser.mjs` (TRANS-001 to TRANS-012, in `npm run test:browser`), with a small PNG reader for frame checks and an `on()` event hook in the harness.
- **Recordings:** CV → Writing at 1440 px and CV → Research at 390 px, before and after, slowed five times, sent to the owner.
- **Commit:** `93d3af0 fix(navigation): improve folder transition continuity [P09]`.

### Part B — Bearnard foundations

- **Inspected, read-only:** `assets/bearnard/README.md`, `inventory.csv` (352 rows: 1 canonical-master, 2 approved-derived, 5 historical-version, 310 experimental, 31 unclassified, 3 working-copy) and `SHA256SUMS`; the v1.3 master's size and mode (892 × 1763, RGBA). `shasum -a 256 -c` matched 352 of 352 before and after generating.
- **Approved for the site:** only what the inventory already approves. One illustration is registered, the canonical v1.3 portrait. The two approved-derived files (the Codex working reference and the model sheet) are not website illustrations and were left out. Nothing was reclassified.
- **Built** (D-073, D-074):
  - `scripts/bearnard_derivatives.py`: checks the inventory category and both checksums, then writes WebP derivatives to `public/illustrations/bearnard/` and their provenance to `assets/bearnard/derivatives.json`; refuses to write inside `brand/bearnard/`. Run once, with Pillow 12.3.0: 320 × 632 (54,626 bytes) and 640 × 1265 (187,394 bytes).
  - `src/illustrations/bearnard.ts`: the registry, with nine named roles and none assigned.
  - `src/components/bearnard/BearnardIllustration.astro`: role or ID, fallback slot, `srcset`, reserved size, lazy loading, registry alt text or `decorative`.
  - `/_design/bearnard/`: a study showing the portrait on paper beside text, the registry entry, and all nine roles falling back.
- **Tests:** `tests/bearnard.mjs` (BEAR-001 to BEAR-008, in `npm test`). The smoke test now allows registered derivatives only, compares every image against the 352 master checksums, and has three size ceilings. RESP-001 covers the study.
- **Reproducibility:** a copy of the repository without `brand/bearnard/`, installed with `npm ci`, passed `npm run verify`; BEAR-004 reported SKIPPED and the other seven checks passed.
- **Not done, on purpose:** no role assignment, no Bearnard on a site page, no new artwork, no approval of any experimental or unclassified image.
- **Commit:** `6ddf084 feat(bearnard): establish illustration registry [P09]`.

### Part C — Environmental refinement

- **Approach** (D-075): proposals beside the approved palette, not changes to it. The brief does not authorize applying every candidate to the production layout, so no site page changed.
- **Built:**
  - `src/styles/environment-candidates.css`: four complete environment contracts, `proposed-scientific`, `proposed-technical`, `proposed-literary` and `proposed-personal`, and eleven candidate hues. Fonts and type values are copied unchanged. A twelfth hue that no candidate used was removed before the commit.
  - `/_design/environments-v2/` (`src/pages/[design]/environments-v2.astro`): each section twice, "Current · approved" and "Proposed · pending the owner's approval", with the same folder state and sample text, and a table of nine colour roles marking the ones that stay the same. The scientific pair also shows the Bearnard portrait on its paper, through `BearnardIllustration`, on a study page only.
  - `tests/environments.mjs` (ENV-001 to ENV-006, in `npm test`): complete token sets; all 49 enforced contrast pairings in each candidate; tab distinction no lower than the approved environments; colours only and identical folder structure on both sides; no candidate styling on any other page; a fingerprint of the approved palette.
  - The smoke, route, token, transition and responsive tests list the new study.
- **Ideas:** scientific, celadon cardstock on midnight navy with spruce lines; technical, honey kraft on a spruce workbench; literary, copper and peach on oxblood; personal, amber and honey cream on forest-green flannel. `planning/design-system.md` section 7 has every value and the contrast figures.
- **Unchanged:** `environments.css`, `tokens.css`, the contract, folder geometry and behaviour, fonts, and every site page.
- **Not done, on purpose:** no candidate adopted; no candidate for Core; no typography change (D-042); no claim that a candidate is better.

### Visual review

Screenshots were taken in headless Chrome 157 from the production preview (`astro preview`, port 4322).

- **Environment pairs, 16 screenshots** (four sections at 1440, 1280, 768 and 390 px). Looked at: all four at 1440, 768 and 390 px; scientific, technical and personal at 1280 px. Not looked at one by one: literary at 1280 px. The pairs sit side by side at 1440 and 1280 px and stack at 768 and 390 px.
- **Bearnard study, 4 screenshots** (1440, 1280, 768, 390 px). Looked at: 1440, 768 and 390 px. Not looked at: 1280 px.
- **Folder regression, 6 screenshots** (`/cv/research/` and `/writing/kosmos/` at 1440, 390 and 320 px). Looked at: all but `/writing/kosmos/` at 320 px.
- **Measured at 1440, 1280, 768, 390 and 320 px** on both P09 studies, Home, `/cv/research/` and `/writing/kosmos/`: no sideways page scroll, and every row's selected tab in view. The studies' wide tables scroll inside themselves on phones, as P08 intends.
- **One capture artefact.** The first technical pair at 768 px showed the approved sample with an empty first row. The page was correct in a visible browser at that width, the row measurements matched on both sides, and two re-captures of all 16 pairs were correct, with every other file identical pixel for pixel. It was a one-off fault of the off-screen capture, not of the site; the screenshot was replaced. No issue record was opened.
- **Recordings** of the folder transition before and after Part A, slowed five times: `/cv/` to `/writing/` at 1440 px and `/cv/` to `/cv/research/` at 390 px.
- **Not checked:** Firefox, Safari, real phones and tablets, and colour on a calibrated or a low-quality display.

### Validation (final)

- `npm run verify`: passes. `astro check` 0 errors, warnings and hints in 48 files; 41 pages; 260 contrast pairings; 22 navigation, 10 folder, 9 route, 11 preview, 8 responsive, 4 transition, 8 Bearnard and 6 environment checks; `dist/` 47 files, 1,197,525 bytes (site 651,442, studies 304,063, illustrations 242,020).
- `npm run test:browser`: 12 of 12 preview, 17 of 17 responsive and 12 of 12 navigation-continuity checks in headless Chrome 157.
- `shasum -a 256 -c assets/bearnard/SHA256SUMS`: 352 of 352 match. `brand/bearnard/` is still ignored.
- `git diff --check`: clean. The pre-commit hooks ran on each commit.
- The `astro dev` server on port 4321 that was running before P09 was left running.
- **Commit:** `b76f3b0 feat(design): explore section environment palettes [P09]`.
- **Noticed in the final repository check:** `origin/main` is at `e28d43a`, two commits ahead of local `main` (`6036137`). The reflog shows a fetch at 08:22 on 2026-11-11, before P08 and not run by Claude Code; the commits merge pull request 125 and add seven files under `__frag8/`, unrelated to the site, like the `__bak9/` files in P02. `development/current-state.md` had still said both were at `6036137`; it is corrected in the records commit that follows `b76f3b0`. Nothing was fetched, merged or pushed.

## P08 — Responsive Physical-Folder Navigation & Adaptive Layout — 2026-11-11

**Agent:** Claude Code. **Branch:** `development`. **Result:** completed. The owner approved the small-screen layout after reviewing the screenshots (G-P08-20, D-070, recorded after the P08 commit). Real-device checks (G-P08-21) are still pending. Nothing was pushed or deployed.

### Starting state (verified)

- **HEAD:** `development` at `28392b0` (P07 and its approval record). Working tree clean apart from the untracked `clean` file, which was left alone.
- **Baseline:** `npm run verify` passed (0 errors, warnings and hints) and `npm run test:browser` passed 12 of 12, before any change. P07 previews, P06 Overview selection and P05 geometry were intact.
- **Other activity:** only this session's preview server on port 4322; no other repository file changed.

### Measurements before any change (Chromium)

- No page scrolled sideways at any width, and Chromium already opened every row at its selected tab (`scroll-initial-target`). Without that property, as in other browsers, rows would open at their start and hide Bearnard's Area, CV › Research or Writing › Kosmos on a phone.
- **Defect:** the gutter kept growing above 1440 px inside the fixed 80rem page, so the shell narrowed (1200 px at 1920) and the global row overflowed by 3 px with an edge fade.
- **Weakness:** folder chrome took 36% of a 320 px screen with three levels (a 206 px reading column; 222 px for two levels).
- Chromium's focus scrolling ignores scroll padding: a focused tab could stop under an edge fade, or 2 px past the row's edge.

### Changes

- **Tokens** (D-065): `--space-gutter` stops at 1.9rem (its 1440 px value); `--space-shell-padding` and `--folder-nest-inset` take the smaller of P05's curve and a steeper one meeting it at 1024 px, down to 0.25rem.
- **Folders** (`folders.css`; D-066–D-068): row `scroll-padding-inline` of a fade plus a focus ring; nested tabs at level-1 height under a coarse pointer; the paper wraps long words and scrolls sideways as a last resort.
- **Global** (`global.css`): the `.gl-scroll-x` region.
- **Script** (D-066): new `src/scripts/folder-rows.ts`, bundled with the preview module by `FolderStack`: opens rows at their selected tab where `scroll-initial-target` is missing, and keeps keyboard focus clear of the fades.
- **Study:** case I, wide content in three synthetic levels, and updated notes.
- **Tests** (D-069): new `tests/browser-harness.mjs` (extracted from the P07 browser tests, with a switch that removes `scroll-initial-target`), `tests/responsive.mjs` (8 checks, in `npm test`) and `tests/responsive-browser.mjs` (17 checks, in `npm run test:browser`). PREV-011's sweep now waits out the switch delay; `tests/design-tokens.mjs` scans the new script.
- **Records:** planning (design system section 9 and question 22, information architecture section 16, architecture), decisions D-064–D-069 and D-047's status, acceptance matrix, current state, roadmap, known limitations KL-20, KL-21, KL-30 and KL-31–KL-33, `README.md` and `AGENTS.md`.

### Visual review

Screenshots of the built site in headless Chrome 157 at device scale 3 for phones, 2 for tablets and desktop, each at its real viewport size (in the scratchpad, sent to the owner): Home at 390 and 320; CV Overview at 390; CV › Research at 360 and with touch at 390; Bearnard's Area › Powerlifting at 390, as opened and after scrolling both rows back by hand; the synthetic three levels at 320; wide content in three levels at 390; Lecture Notes and Writing at 768; keyboard focus on an off-screen tab at 390; Writing's preview at 1024; CV › Research at 1440; CV at 1920. The desktop app's browser showed the same at its 375 px mobile preset. At 1440 px the page matches its P07 screenshot inside the shell to within 1/255 on 727 pixels.

### Commands run

| Command | Result |
| --- | --- |
| `npm run verify` | Exit 0: `astro check` 0 errors, warnings and hints; 39 pages; every suite, including previews 11/11 and responsive 8/8 |
| `npm run test:browser` | 12 of 12 preview and 17 of 17 responsive checks in headless Chrome 157 |
| Negative checks (ten source mutations, rebuilt and reverted) | Each failed its test (acceptance matrix) |
| `npx prettier --check` on the changed code | Clean |
| `git diff --check` | Clean |

### Problems encountered

- **A wrong first diagnosis.** PREV-011 failed at 390 px after the inset change, and I first took it for stale hit-testing after a script scroll. A pointer-event log showed the real cause: the test's two-step pointer path now crossed Lecture Notes, whose preview opened first, and Writing's took over only after P07's 90 ms switch delay, longer than the test waited. The behaviour was right; the test now waits out the delay.
- **Simulating a browser without `scroll-initial-target`.** Injecting a style that switched it off did not stop Chromium's native opening, so the first fallback run proved nothing. The test server now serves the stylesheets without the property, which showed the rows opening at their start without the script and at their selected tab with it.
- **Focus under the fades.** Scroll padding alone did not keep focused tabs clear, because Chromium's focus scrolling ignores it; the row script corrects the position after the browser's own scroll (KL-33).
- **Headless focus wraps around.** With no browser toolbar, Tab goes from the last tab back to Home, so the keyboard test first counted the global row twice; it now stops at the first repeat.
- **A blind test.** Removing the paper's word wrapping passed at first, because P03's rules already wrap headings, paragraphs and list items. Study case I gained a definition term, which only the paper's rule wraps, and the test now catches it.

### Not done

- **Real devices:** no phone or tablet, Safari, Firefox or screen reader was tested; touch, coarse pointers, zoom and large text were emulated in Chromium (G-P08-21, KL-32).
- **Deferred:** typography consolidation (D-042), stronger environment palettes (D-056) and ornamental refinements.
- **Not started:** P09.

## P07 — Immediate-Child Hover Previews & Keyboard-Accessible Folder Discovery — 2026-11-11

**Agent:** Claude Code. **Branch:** `development`. **Result:** completed. The owner approved the folder previews after reviewing the screenshots (G-P07-19, D-063, recorded after the P07 commit). Nothing was pushed or deployed.

### Starting state (verified)

- **HEAD:** `development` at `f8eead2` (P06 and its approval record). The working tree was clean apart from the untracked `clean` file, which was left alone. `npm run verify` and `git diff --check` had passed on this HEAD minutes earlier, for the approval commit; P07 did not run them again before its first change, but re-ran every suite after it.
- **P06 behaviour:** `/cv/research/` opened with CV and Research selected, and parent pages with Overview selected (NAV tests and the browser).
- **Other activity:** no preview or dev server was running, and no other repository file had changed since the approval commit.
- **Bearnard:** not touched; 352 of 352 checksums match (smoke test).

### Changes

- **Navigation model** (`src/navigation/`; D-058):
  - `TabRow.previews`: one `TabPreview` (`folder`, `tabs`) per unselected folder tab with children, reusing the frozen display-tab row that opens on the folder's own page;
  - the unused `TabInteraction` type removed: preview state is the page script's, not the model's.
- **Components** (D-059):
  - new `FolderPreview.astro`: a `popover="manual"` index card with a hidden-from-AT title and a named list of links (spans in studies);
  - `FolderTab` draws it after its link and marks the tab `data-preview`;
  - `FolderTabStrip` passes each tab's preview;
  - `FolderStack` validates previews (only unselected folders, only their Overview and children, in order) and imports the script.
- **Script** (D-060): new `src/scripts/folder-previews.ts`, the site's only client-side code: pointer, focus, Escape, one at a time, delays, placement in the top layer, `pagehide`.
- **Styles** (D-061): `folders.css` section 5, the preview card and the previewed tab's hover color.
- **Contract:** four contrast pairings for the card (260 pairings, 245 enforced).
- **Study:** case H (a second-level preview, synthetic) and updated notes; every case previews on hover.
- **Tests:**
  - new `tests/previews.mjs` (11 checks, in `npm test`) and `tests/previews-browser.mjs` (12 browser checks, `npm run test:browser`; D-062);
  - updated: NAV-030 and FOLD-007 accept a preview after an unopened parent's link, NAV-031 allows only the preview module and checks no script changes the URL, the smoke test allows that module on pages with folders, and `tests/design-tokens.mjs` scans the new files.
- **Records:** planning (information architecture section 15, design system, architecture), decisions D-058–D-062 with notes on D-051 and D-054, acceptance matrix, current state, roadmap, known limitations KL-25 and KL-27–KL-30, `README.md` and `AGENTS.md`. The P06 entry of this log, which had been appended below the sticker task's notes, was moved up under this one, so the log is newest-first again.

### Visual review

Screenshots of the built site in headless Chrome 157 (in the scratchpad, sent to the owner): Writing's preview over CV › Research (1440), CV's full preview with its long labels (1440), the nested synthetic preview in study case H (1440 and 390), Bearnard's Area at the end of a scrolled row (768 and 390), the same page with the preview dismissed, keyboard focus in Lab's preview, and previews in the technical (1024), personal (390) and literary (1440) environments. Every width in the brief was checked by the browser tests: 1440, 1280, 1024, 768 and 390. A dismissed page matches its P06 screenshot inside the folder shell to within 1/255 on 727 pixels; the flannel outside differs as much between two captures of the same page. The desktop app's browser showed the same preview when hovering Writing on `/cv/research/`.

### Commands run

| Command | Result |
| --- | --- |
| `npm run verify` | Exit 0: `astro check` 0 errors, 0 warnings, 0 hints (36 files); 39 pages; tokens; contrast 260 pairings (245 enforced); NAV 22/22; smoke; FOLD 10/10; routes 9/9; previews 11/11 |
| `npm run test:browser` | 12 of 12 in headless Chrome 157, and stable across three further runs |
| Negative checks (ten source mutations, rebuilt and reverted) | Each failed its test; two more failed the build in `FolderStack` (acceptance matrix) |
| `npx prettier --check` on the changed code | Clean |
| `git diff --check` | Clean |

### Problems encountered

- **`open` clashed with `window.open`.** The script had no import or export, so TypeScript read it as a global script. It is now a module (`export {}`) and the variable is `shown`.
- **A test pointer left over the previous page.** After navigation, Chrome hovered whatever lay under the old pointer position, which opened Lab's preview; a hover on CV then waited, correctly, for the 90 ms switch delay. The test now parks the pointer on the flannel before each navigation. The script was right; the test was not.
- **Two screenshots without the card.** At device scale 2, two captures were taken before the card's first frame was painted; the card was open, with the right geometry. A 400 ms wait before each capture fixed it.
- **`astro check` hints.** `process` was an implicit global in the browser test; it is imported from `node:process`, so the check is back to 0 hints.

### Not done

- **Browsers:** Chromium only; touch was emulated; Safari, Firefox, real touch devices, `forced-colors` and screen readers were not tested (KL-28).
- **Left to P08:** the responsive strategy, including what a selected folder's tab should do if its row is ever hidden.
- **Not started:** P08.

## P06 — Route-Driven Physical Folder Navigation & Overview Tabs — 2026-11-11

**Agent:** Claude Code. **Branch:** `development`. **Result:** completed. The owner approved the navigation and Overview tabs after reviewing the screenshots (G-P06-20, D-057, recorded after the P06 commit). Nothing was pushed or deployed.

### Starting state (verified)

- **HEAD:** `development` at `40083ce` (the P05 approval records), with P04 and P05 complete. `npm run verify` passed on that state.
- **Other task's edits, before starting:** `development/current-state.md` and `development/implementation-log.md` held notes appended at 05:14 by a separate Bearnard sticker task (Prompt 2/3). As the owner chose for the same case in P05, they were committed unchanged on their own: `fa522dc`. **P06 started from `fa522dc`**, with only the untracked `clean` file left alone.
- **Other task's edits, during P06:** at 05:30 the same task (Prompt 3/3) appended notes to the same two files, while P06 was in progress.
  - Before touching those files, P06 checked for activity: no other repository file had changed in the previous 15 minutes, no build of that task was running, and its notes describe a finished final prompt.
  - The notes were then committed unchanged on their own: `aaa32a7`, limited to those two paths, so none of P06's work went in.
  - P06's records were written after that.
- **Other sessions:** the listed Claude sessions were idle. An `astro dev` server started by someone else 1.5 hours earlier was running on port 4321; it was left alone.
- **Bearnard:** 352 of 352 checksums matched.

### Changes

- **Navigation model** (`src/navigation/`; D-050–D-053):
  - display tabs (`NodeTab`, `OverviewTab`, `DisplayTab`);
  - every row now has a selected tab, and a child row starts with its parent's Overview;
  - `state.currentTabId`;
  - `OVERVIEW_LABEL`, `overviewTabId()`, `ROUTE_PARAMS` and `folderStaticPaths(level)`.
  - The registry itself is unchanged.
- **Folder components** (D-054):
  - `FolderStack` takes the whole state, takes a `links` option, and validates the new rules;
  - `FolderLayer` lost the unselected branch;
  - `FolderTabStrip` draws a labelled `nav`;
  - `FolderTab` draws a link with `aria-current="page"` or `"true"`, and "Overview of ‹parent›".
- **Styles:**
  - `folders.css`: the link reset, a stretched click target, and hover fills;
  - `tokens.css`: two hover aliases;
  - `contract.mjs`: two contrast pairings.
- **Pages** (D-053, D-055):
  - `src/layouts/FolderPage.astro` and `src/components/scaffold/ScaffoldContent.astro`;
  - route files `src/pages/index.astro` (Home), `[section]/index.astro`, `[section]/[folder]/index.astro` and `[section]/[folder]/[subfolder]/index.astro`;
  - the P03 specimen moved with `git mv` to `src/pages/[design]/tokens.astro`. Because Home reuses `src/pages/index.astro`, Git records it as a 98% copy rather than a rename (D-055);
  - `BaseLayout` gained a `main` prop.
- **Folder study:** stacks drawn from the state, without links; case F rewritten (Overview selected); case G added (the synthetic third-level Overview); case D labelled a stress test.
- **Tests:**
  - `tests/navigation.mjs`: NAV-015 to NAV-021 and NAV-025; NAV-003 and NAV-006 updated;
  - new `tests/routes.mjs`: NAV-022, NAV-023 and NAV-026 to NAV-032;
  - new `tests/html-tree.mjs`, the HTML reader, moved out of `tests/folders.mjs`;
  - `tests/smoke-test.mjs`: every destination must have a page, every page gets the document checks, the specimen checks moved to `/_design/tokens/`, and the size ceiling is now 1 MB;
  - `tests/folders.mjs`: the new specimen path, Overview tabs and case G;
  - `tests/design-tokens.mjs`: the new files;
  - `npm test` runs the route tests.
- **Records:**
  - `planning/information-architecture.md`: sections 5, 7, 12, 13 and new section 14;
  - `planning/architecture.md` and `planning/design-system.md`: status, section 8 and section 9, questions 18–20;
  - `development/` records and D-050 to D-056;
  - `debugging/known-limitations.md`: KL-20 updated, KL-23 to KL-26 added;
  - `README.md` and `AGENTS.md`.
- **Not changed:**
  - the registry's folders, labels, order and slugs;
  - palette primitives, environments and typography;
  - the folder geometry tokens and the tab silhouette;
  - `astro.config.mjs`;
  - dependencies and the lockfile;
  - `_backup/`, `brand/` and `.github/`.

### Problems met

- **Astro and frozen objects.** The first build failed with "Cannot add property keyed, object is not extensible": Astro annotates the objects `getStaticPaths()` returns, and `folderStaticPaths()` had frozen them. It now returns fresh objects on every call.
- **Overview missing from a child row.** A first version put Overview only in the row of the folder whose own page was open. On `/cv/research/`, CV's row then had no Overview. The brief's example B shows Overview leading the row whichever child is selected, so every child row now starts with it (NAV-018, NAV-021).
- **Breadcrumbs.** A planned overline repeating the open folders ("CV · Research") above the page heading would have been a breadcrumb. The temporary content uses a neutral "Development scaffolding" overline instead.
- **Rounding.** The lowest hovered-label contrast truncates to 5.73:1, not 5.74:1 as first written; the records were corrected (ratios are truncated, never rounded up).

### Browser review

Served by `astro-preview` (port 4322). Checked in the Claude desktop app's browser and in headless Chrome 157 (scratch scripts outside the repository), at 1440, 1280, 768 and 390 px:

- **Scenarios:** every scenario of the brief passed, with the selection read from the page after each step.
  - Home; CV opens with Overview selected; Research is selected; back to CV with Overview selected again.
  - Direct loads of Lab › Research Areas, Lecture Notes › The Greenhouse and Writing › Kosmos Series.
  - About (a leaf: one row).
  - Back and Forward twice.
  - A reload of `/bearnards-area/powerlifting/` (navigation type `reload`; Cmd+R in the pane did not reload, so `location.reload()` was used).
  - Unknown URLs: `/cv/this-page-does-not-exist/`, `/cv/overview/`, `/cv/research/projects/` and `/lecture-notes/berries/some-article/` answer 404. `/CV/` answers 200 locally because macOS ignores case (KL-23).
  - The synthetic three-level cases C and G in the study.
- **Measurements:**
  - Every selected tab reaches exactly 2 px into its body on every page measured, at all four widths, and at all 21 open levels of the study.
  - No row scrolls vertically, and the page never scrolls sideways.
  - CV's row, now 1,299 px wide, scrolls inside its strip (KL-20).
  - The reading column at 390 px is 285 px.
- **Hover and focus:** a hovered inactive tab lightens, with no other change. Tabbing to Teaching shows the navy ring around its label, unclipped. Chrome's accessibility tree names the Overview link "Overview of CV" and the rows "Sections" and "CV folders".
- **Specimen:** a pixel comparison of `/_design/tokens/` with P05's `/` at 1440 and 390 px differs only in the contrast sentence (215 → 225).
- **Screenshots:** 20 PNGs, sent to the owner for review (not in the repository).

### Commands run

- **Inspect:**
  - `git status`, `git diff`, `git log`, `stat`, `ps`, `find -newermt`, `ListAgents`;
  - `git check-ignore -v` on every new path;
  - `shasum -a 256 -c assets/bearnard/SHA256SUMS` (352 OK).
- **Records commits:** `fa522dc` and `aaa32a7`, the other task's notes.
- **Build and test:**
  - `npm run verify` (exit 0), `npx astro check`, `npx astro build` and `node tests/*.mjs`;
  - negative runs of the route tests on broken copies of `dist/`, outside the repository;
  - three build failures of `FolderStack` on deliberately impossible states, in a scratch copy of `src/`.
- **Visual:**
  - `preview_start astro-preview` and the in-app browser;
  - headless Chrome over the DevTools protocol;
  - Python PIL for the pixel comparison, with the P05 build served by `python3 -m http.server` on 127.0.0.1.

### Validation

| Check | Result |
| --- | --- |
| `npm run check` | 0 errors, 0 warnings, 0 hints (32 files) |
| `npm run build` | 39 pages |
| Tokens / contrast | Pass / 225 of 225 enforced |
| Navigation (model) | 22 of 22 |
| Smoke | Pass: 37 of 37 destinations built, 2 studies, no other page, no JavaScript |
| Folders | 10 of 10 |
| Routes | 9 of 9 |
| NAV-024 (browser) | Pass in Chromium |
| `git diff --check` | Clean |
| Bearnard checksums | 352 of 352 |

### Not done

- **Browsers:** Safari, Firefox, touch devices, `forced-colors` and screen readers were not tested (KL-26).
- **Left to later prompts:**
  - a designed 404 page (KL-24);
  - a skip link (KL-25);
  - hover previews and keyboard discovery (P07);
  - the responsive strategy (P08);
  - real content (P10–P17).
- **Deferred:** palette differentiation (D-056) and typography consolidation (D-042).
- **Not started:** P07.

## P05 — Physical Folder Geometry & Connected Tab System — 2026-11-10

**Agent:** Claude Code. **Branch:** `development`. **Result:** completed. The owner approved the folder appearance after reviewing the screenshots (D-049, recorded after the P05 commit). Nothing was pushed or deployed.

### Starting state (verified)

- **HEAD:** `development` at `ef5f78a` (P04). `npm run verify` passed, and every P04 deliverable was present.
- **Other task's edits:** `development/current-state.md` and `development/implementation-log.md` had uncommitted edits, made at 19:40 by a separate Bearnard WhatsApp task (its Prompt 1/3 notes).
  - The brief says to stop on unexplained changes, so the owner was asked. They chose to commit the notes on their own first: `cda026e`, unchanged, with no P-number because it is not a roadmap prompt.
  - P05 then started from a clean tree, apart from the untracked `clean` file, which is still left alone.
- **Other sessions:** none was active. The listed Claude sessions were idle, and no repository file had changed in the previous 20 minutes.
- **Bearnard:** 352 of 352 checksums matched before work began. The WhatsApp task's derivatives sit in the gitignored `brand/bearnard/expressions2/`, untouched by P05.

### Changes

- **Folder components** (D-043):
  - `src/components/folders/FolderStack.astro`
  - `FolderLayer.astro`, which recurses with `Astro.self`
  - `FolderTabStrip.astro`
  - `FolderTab.astro`
- **Folder stylesheet:** `src/styles/folders.css` (D-044, D-047).
- **Tokens** (`src/styles/tokens.css`; D-045, D-046):
  - revised folder geometry values;
  - new seam, headroom, scroll-hint, line-height and indicator-stroke tokens;
  - stacking order: inactive 1, body 2, active 3, scroll hint 4;
  - new aliases `--color-folder-deep`, `--color-folder-tab-inactive-nested` and `--color-folder-tab-inactive-deep`.
  - No primitive changed, and the environment contract is unchanged.
- **Contract:** twelve new contrast pairings in `src/design/contract.mjs`.
- **Study page:** `src/pages/[design]/folders.astro`, built at `/_design/folders/` (D-048). Its cases:
  - A: the twelve sections, Home open;
  - B: CV › Research;
  - C: three levels, with a synthetic third level;
  - D: the long labels;
  - E: the scientific, technical, literary and personal environments;
  - F: `/cv/`, an open parent with nothing selected.
- **Tests:**
  - new `tests/folders.mjs` (FOLD-001 to FOLD-010);
  - `tests/smoke-test.mjs` expects the study, allows `/_design/` studies outside the registry, and checks that the study has no script or link;
  - `tests/design-tokens.mjs` also checks the component files;
  - `npm test` runs the folder tests.
- **Records:**
  - `planning/design-system.md`: new section 9 and questions 13–17;
  - `planning/information-architecture.md`: new section 13;
  - `planning/architecture.md`, `README.md`, `AGENTS.md`;
  - the development records and `debugging/known-limitations.md` (KL-20 to KL-22).
- **Not changed:**
  - the P03 specimen's source, BaseLayout, `environments.css`, `global.css`, the navigation module and `astro.config.mjs`;
  - dependencies and the lockfile;
  - `_backup/`, `brand/` and `.github/`.

### Visual review and the problems it found

The study was inspected in the Claude desktop app's browser (Chromium 152) and in headless Chrome 157, with screenshots taken at 2× and magnified crops at 6–8×. It was checked at 1440, 1280, 1024, 768 and 390 px. Three defects were found and fixed:

1. **A faint diagonal line through the selected tab.** The tab's highlight was an inset shadow, which outlined the hidden inner edge where the two halves overlap. It is now a 1 px top border.
2. **A 2 px dark seam between the selected tab and its body**, appearing once rows opened at their selected tab.
   - Cause: inactive tabs were lowered with `translate`, which made the row scroll vertically by 4 px. `scroll-initial-target` then scrolled it, lifting every selected tab.
   - Fix: inactive tabs are now lowered with layout (a top margin and a shorter minimum height). Every row has `scrollTop` 0, and every selected tab reaches exactly 2 px into its body, at all 17 open levels in the study.
3. **Tab feet peeking past the folder's rounded corners when a row scrolled (390 px).** The strip is now inset by the corner radius.

Two refinements were also made during the review:

- `scroll-initial-target` first aligned the selected tab to the start of the row, which scrolled rows unnecessarily. It now uses `scroll-snap-align: none center`.
- Tab padding (0.75 → 0.625rem) and the scroll-hint width (1.5 → 1.25rem) were reduced, so the twelve top-level tabs fit at 1280 and 1440 px. Before that they overflowed by 11 px.

### Commands run

- **Inspect:**
  - `git status`, `git diff`, `stat`;
  - a search for files changed since P04;
  - `ListAgents`;
  - `shasum -a 256 -c assets/bearnard/SHA256SUMS`.
- **Records commit:** `git commit` of the other task's two notes (`cda026e`).
- **Build and test:** `npm run verify`, `npm run build`, `npx astro check` and `node tests/*.mjs`.
- **Visual:**
  - preview server `astro-preview` (port 4322);
  - the in-app browser at 1440 and 1280 px, using JavaScript to read layout measurements;
  - a scratch headless-Chrome script, outside the repository, for screenshots at 1440, 1280, 1024, 768 and 390 px;
  - a pixel comparison of the specimen against the saved P04 build (Python PIL; the old build served by `python3 -m http.server` on 127.0.0.1).
- **Focus:** in the browser and in headless Chrome, a tab label was turned into a link in the live page only, then focused with the keyboard. The ring shows and is not clipped.
- **Negative tests:** five broken copies of the build in the scratch folder (see the acceptance matrix). Each made `tests/folders.mjs` exit 1.
- **Format:** `npx prettier --write` on the changed `.mjs` and `.css` files only.

Every Astro command ran with `ASTRO_TELEMETRY_DISABLED=1`.

### Validation

| Check | Result |
| --- | --- |
| `npm run check` | 0 errors, 0 warnings, 0 hints (24 files) |
| `npm run build` | 2 pages: `/` (P03 specimen) and `/_design/folders/` |
| Token checks | Pass: 24 primitives, 192 tokens; component files use semantic tokens only |
| Contrast | 215 of 215 enforced pairings pass (43 per environment); 15 informational |
| `tests/navigation.mjs` | 14 of 14 pass |
| Smoke test | Pass; 5 files in `dist/`, no JavaScript |
| `tests/folders.mjs` | 10 of 10 pass |
| Page-wide horizontal overflow | None at 1440, 1280, 1024, 768 or 390 px |
| P03 specimen | Pixel-identical to the P04 build at 1440 and 390 px except its contrast count (165 → 215); its CSS is now split into two files because two pages share it |
| Bearnard | 352 of 352 checksums match |

### Not done, by design

- Tabs are not links: P06 adds route-driven navigation.
- No hover previews: P07.
- No responsive navigation redesign: P08.
- No section pages, deployment, push, or change to `main`.

## P04 — Navigation Data Model, Hierarchy & Route Configuration — 2026-11-10

**Agent:** Claude Code. **Branch:** `development`, created from `851fdbb` (the P03 commit). **Result:** completed. Nothing was pushed or deployed, and nothing visual changed.

### Starting state (verified)

- HEAD was `feat/gusmaolab-design-system-p03` at `851fdbb`. `npm run verify` passed.
- No `development` branch existed locally or on `origin`. `git ls-remote --heads origin development` returned nothing; it is a read-only query.
- One untracked file had appeared since the P03 commit: `clean`, at 18:01:41, byte-identical to the tracked `clean.sh`. No process held it open and nothing else had changed. The brief says to stop on unexplained changes, so the owner was asked and chose to proceed with the file left untouched. It was not run, edited or committed.
- No dev server running; one worktree; no stashes.

### Changes

- Branch policy (D-035): created `development` from `851fdbb`; the milestone branches stay.
- New navigation module (D-036–D-039):
  - `src/navigation/types.ts`
  - `src/navigation/registry.ts`: 12 top-level and 25 second-level folders, no third level
  - `src/navigation/navigation.ts`
  - `src/navigation/index.ts`
- Tests (D-040):
  - new `tests/navigation.mjs` (NAV-001 to NAV-014);
  - `tests/smoke-test.mjs` now fails if a built page is not a registered destination;
  - `npm test` runs the navigation tests;
  - `tsconfig.json` adds `erasableSyntaxOnly`.
- Records:
  - `planning/information-architecture.md` rewritten;
  - updated `planning/architecture.md`, `planning/design-system.md` (approval and the deferred typography refinement), `README.md`, `AGENTS.md`, `CLAUDE.md` and the development records.
- Not changed: the specimen, the styles, `astro.config.mjs`, dependencies, `_backup/` and `brand/`.

### Commands run

- Inspect: `git status`, `git reflog`, `git branch -vv`, `git ls-remote --heads origin development`, `cmp clean clean.sh`, then `git switch -c development 851fdbb`.
- Probe: a scratch check that Node 26 imports `.ts` from `.mjs` with no warning (`process.features.typescript` is `strip`).
- Test: `node tests/navigation.mjs`. A negative run on a scratch copy with two top-level sections swapped failed NAV-001 and exited 1, as intended.
- Format: `npx prettier --check` and `--write` on the new TypeScript and test files only.
- Validate: `npm run verify`, `git diff --check`, `cmp` of the output against the P03 build, and `shasum -a 256 -c assets/bearnard/SHA256SUMS`.

Every Astro command ran with `ASTRO_TELEMETRY_DISABLED=1`.

### Validation

| Check | Result |
| --- | --- |
| `npm run check` | 0 errors, 0 warnings, 0 hints (18 files) |
| `npm run build` | 1 page; `index.html` and the stylesheet byte-identical to the P03 build |
| `tests/navigation.mjs` | 14 of 14 pass |
| Token and contrast tests | Pass, unchanged |
| Smoke test | Pass; the only built page, `/`, is registered; 1 of 37 destinations has a page |
| JavaScript in the output | None: no `<script>` and no `.js` files |
| Bearnard | 352 of 352 checksums match |
| `_backup/` | Unchanged |

### Problems encountered

- The suggested `src/lib/navigation.ts` would have been silently ignored: `git check-ignore` matched the root `.gitignore`'s `lib/` (KL-11). The module went to `src/navigation/` instead.
- None of the tests failed during development.

## P03 — Design Tokens, Palette Architecture & Visual Foundations — 2026-11-10

**Agent:** Claude Code. **Branch:** `feat/gusmaolab-design-system-p03`, from `5fab52c` (end of P02). **Result:** technically completed; the visual design awaits the owner's review. Nothing was pushed or deployed.

### Starting state (verified)

- HEAD was `main` at `6036137`. The reflog shows the owner checked out `main` from the P02 branch at 16:35, fast-forwarded it to `757c95d`, then committed `6036137`, which removes the three `__bak9/` files. The tree at `6036137` is identical to the checkpoint `6eedf02`, and `origin/main` is also at `6036137`. P03 did not merge or restore anything from `main`.
- The P02 branch was intact at `5fab52c`. The only untracked content was the Flex submodule's working tree under `_backup/`, which that checkout could not remove; switching to the P03 branch restored it as the submodule, at `bbf8768`. One worktree, no stashes.
- Every file written in the previous 90 minutes was explained by that checkout or by Finder. No dev server was running. The Codex app was open, but nothing showed it writing to the repository.
- Baseline: Node v26.12.0, npm 11.20.0, Astro 7.4.8, TypeScript 6.0.3, `@astrojs/check` 0.9.12, Prettier 3.6.2. `npm run verify` passed. 352 of 352 Bearnard checksums matched.

### Visual references (read-only)

- No bear-pride flag file exists in the repository; `brand/kit/gusmaolab-brand-kit.zip` and `brand/gusmaolab-logo.svg` are empty placeholders. The seven-stripe family was used qualitatively.
- The brand prompts describe Bearnard: midnight-navy fur, cream eye markings, vivid green eyes, amber tortoiseshell glasses, a plaid flannel and a white linen DNA shirt.
- The v1.3 master was viewed and its colors sampled in memory with `sharp`, writing nothing. Its checksum was unchanged afterwards. Samples: `planning/design-system.md` section 2.
- The legacy tokens in `_backup/` are a generic blue-and-white set and were not adopted. The owner's 2025 welcome post supplied the specimen's vocabulary.
- Candidate display faces and flannel recipes were compared in scratch renders outside the repository before choosing.

### Changes

- New stylesheets: `src/styles/tokens.css`, `src/styles/environments.css` and `src/styles/global.css` (D-026–D-031).
- New design modules: `src/design/contract.mjs` and `src/design/css-tokens.mjs` (D-032).
- `src/layouts/BaseLayout.astro`: imports the stylesheets, takes an optional `environment` prop and gives `<body>` the flannel lining.
- `src/pages/index.astro`: the temporary design specimen (D-033), with sections A–E (palette, typography, materials, environments, interaction).
- Tests: new `tests/design-tokens.mjs` and `tests/contrast.mjs`; `tests/smoke-test.mjs` rewritten around structural invariants. `npm test` runs all three.
- New `.claude/launch.json` (D-034).
- Records: `planning/design-system.md` rewritten; `planning/architecture.md`, `README.md`, `AGENTS.md`, `CLAUDE.md` and the `development/` and `debugging/` records updated.
- No dependencies were added or changed.

### Commands run

- Inspect: `git status`, `git reflog`, `git diff --stat 6eedf02 6036137`, `git switch -c feat/gusmaolab-design-system-p03 chore/gusmaolab-astro-foundation-p02`, `shasum -a 256 -c assets/bearnard/SHA256SUMS`.
- Build and test: `npm run verify`, `npm run build`, `node tests/contrast.mjs --markdown`.
- Format: `npx prettier --check` and `--write` on the new CSS and JavaScript files only.
- Visual review: the desktop app's built-in browser (Chromium 152) on `astro preview`, emulating 1440, 1280, 768 and 390 px. Full-page screenshots were taken with headless Google Chrome 157 into the session scratchpad, not the repository.

Every Astro command ran with `ASTRO_TELEMETRY_DISABLED=1`.

### Validation

| Check | Result |
| --- | --- |
| `npm run check` | 0 errors, 0 warnings, 0 hints |
| `npm run build` | 1 page; `dist/` holds `index.html` and one stylesheet |
| `tests/design-tokens.mjs` | PASS: 24 primitives, 182 tokens, 4 environments × 33 contract tokens |
| `tests/contrast.mjs` | PASS: 165 of 165 enforced pairings; closest margin 4.70:1 (literary inactive-tab label) |
| `tests/smoke-test.mjs` | PASS: no JavaScript, images, fonts or private paths; no file matches a Bearnard checksum |
| Overflow at 1440, 1280, 768, 390 px | None. Code and the roles table scroll inside their frames. |
| Keyboard and hover | Focus ring visible on a link, a button and a link on the shell; hover changes link color and underline |
| Bearnard | 352 of 352 checksums match |
| `_backup/` | Unchanged |

### Problems encountered

- `astro check` rejected the contrast-pair list, whose mixed arrays left the threshold typed `string | number | null`. A JSDoc `@type` on the export fixed it.
- At 390 px the page overflowed by 23 px. A MathML formula was wider than its card, and the single-column grids grew to fit it. Fixes: `minmax(0, 1fr)` columns, a scrolling wrapper for wide content, and a global `overflow-x: auto` default for block MathML.
- Stretchy MathML parentheses grew to the height of the summation; they are now `stretchy="false"`.
- Astro's HTML compression dropped the space where a line ended just before an inline element, gluing words together. Those lines were joined or given `{" "}` (KL-18).
- Tooling only: headless Chrome would not render narrower than about 500 px, so the 390 px screenshot was taken through a 390 px iframe. `sips` treats a crop offset of 0 as "centered", so crops started at 1.

## P02 — Astro Foundation, Development Environment & Reproducible Static Build — 2026-11-10

**Agent:** Claude Code. **Branch:** `chore/gusmaolab-astro-foundation-p02`, from `4096691` (end of P01). **Result:** completed. Nothing was pushed or deployed.

### Starting state (verified)

- The P01 branch was clean at `4096691`, and the tag `pre-astro-checkpoint` pointed to `6eedf02`. One worktree. Bearnard checksums and the external backup were unchanged.
- No agent process was working in the repository; Codex and the other Claude sessions were idle.
- `origin/main` had moved to `757c95d` through a fetch at 14:38: two commits adding three files under `__bak9/`, unrelated to P01 or P02.

### Version research

- nodejs.org release index: Node.js 26 entered LTS ("Lithium") with v26.13.0 on 2026-10-28. v26.12.1 (2026-10-21) was a security release. The local v26.12.0 (2026-10-14) predates both.
- npm registry: `astro` `latest` is 7.4.8, published 2026-11-09 and not deprecated, with engines node `>=22.23.4` and npm `>=9.6.5`.
- `@astrojs/check` 0.9.12 requires TypeScript `^5 || ^6`. The latest TypeScript is 7.0.2, so the latest 6.x release, 6.0.3, was chosen.
- Astro 7.4.8's official `examples/minimal` was the reference for `package.json`, `astro.config.mjs` and `tsconfig.json`.

### Changes

1. Commit `d94f170`: removed two recruiter-era files with `git rm`, after confirming byte-identical backup copies, and opened ISSUE-0003.
2. The Astro foundation commit:
   - `package.json`: `private`, `type: module`, `engines`, scripts and dependencies. Removed the obsolete `main` field and the placeholder `test` script that always failed. The license field now reads `SEE LICENSE IN LICENSE`. `allowScripts` denies fsevents' build script.
   - `package-lock.json` is now committed; `.gitignore` no longer ignores it and now ignores `.astro/` and `.env.production`.
   - New files: `.node-version`, `astro.config.mjs`, `tsconfig.json`, `src/layouts/BaseLayout.astro`, `src/pages/index.astro` and `tests/smoke-test.mjs`.
   - `.prettierignore` replaces its obsolete Pelican paths with `_backup/`, `brand/`, the private folders and generated files. `.editorconfig` uses 2-space indentation for web source files, matching Prettier.
   - Updated the records, `README.md`, `AGENTS.md` and `CLAUDE.md`.

### Dependencies

`astro` 7.4.8; dev dependencies `@astrojs/check` 0.9.12, `typescript` 6.0.3 and `prettier` 3.6.2. The lockfile has 338 entries. It includes `sharp` 0.35.5, an optional dependency of Astro that nothing uses yet, and `fsevents` 2.3.3, which only installs on macOS.

### Commands run

- Install: `npm install`, then `npm install --save-dev prettier@3.6.2` and `npm install-scripts deny fsevents`.
- Validate: `npm run check`, `npm run build` and `npm test`. `astro dev` and `astro preview` were smoke-tested with `curl`, then stopped.
- Format: `npx prettier --check` and `--write`, on the new files only.
- Reproduce: `npm ci` and `npm run verify` in an empty scratch copy, then `npm audit`.

Every Astro command ran with `ASTRO_TELEMETRY_DISABLED=1`.

### Validation

| Check | Result |
| --- | --- |
| `npm audit` | 0 vulnerabilities |
| `npm run check` | 0 errors, 0 warnings, 0 hints |
| `npm run build` | 1 page. `dist/` holds only `index.html` (437 bytes). |
| `npm test` | PASS. A negative run with a wrong title and a leaked file failed as intended. |
| `npm ci` in a clean copy | 266 packages, 0 vulnerabilities, no warnings. `npm run verify` passed and rebuilt an identical `index.html`. |
| Dev server | `GET /` returned 200 with the foundation text |
| Preview server | `GET /` returned 200, byte-identical to `dist/index.html`. `/_backup/…` and `/brand/bearnard/…` returned 404. |
| TypeScript program | No files from `_backup/`, `brand/` or the private folders |
| Bearnard | 352 of 352 checksums match; no file changed since the backup |
| `_backup/` | Only the two authorized deletions |
| Workflows | None active |
| `git diff --check` | No whitespace errors |

### Problems encountered

- `npm install` upgraded Prettier from the previously installed 3.6.2 to 3.9.10, within `^3.6.2`. It was pinned back with `npm install --save-dev prettier@3.6.2`; `package.json` kept `^3.6.2` and the lockfile now records 3.6.2.
- npm 11.20 held back fsevents' implicit build script pending approval. The prebuilt binary loads, so the script was denied explicitly (D-022).
- `astro dev` and `astro preview` hand off to a detached child process, so stopping the launcher left both servers running. They were then stopped through the PIDs listening on their ports, and the ports were confirmed free.
- Prettier re-wrapped long lines in `tsconfig.json` and `tests/smoke-test.mjs`.

## P01 — Workspace Audit, Preservation & Astro Preparation — 2026-11-10

**Agent:** Claude Code. **Branch:** `chore/gusmaolab-foundation-p01`, from `main` at `6eedf02`. **Result:** completed. Nothing was pushed.

### Inspection

- The repository root, `~/projects/GusmaoLab`, is the Git top level. `main` was clean and level with `origin/main` at `6eedf02`. One worktree, one submodule (the Flex theme), and no tags, stashes or Git operations in progress.
- `brand/bearnard/` and the private workspace folders are gitignored.
- Codex generated Bearnard expression sheets in `brand/bearnard/expressions2/` until 13:12. Its manifest reports `execution_status: COMPLETE` (204 of 204 images). Nothing in the repository was written after that, and no Codex process had a working directory or open files inside it, so the run was treated as finished.
- CI: only `.github/workflows/deploy.yml` was active (a Pelican build, then a force-push to `eduardogade/eduardogade.github.io`). The other eight workflows are entirely commented out.
- An installed pre-commit hook runs six active hooks (ISSUE-0001).

### Backup verification

- `~/projects/GusmaoLab-pre-astro-backup.zip` is 1,172,441,521 bytes. It was created at 13:24, after the last Codex write and the 13:22 commit.
- `unzip -t` found no errors. There are no absolute paths, `..` components or encrypted entries; one symlink (`node_modules/.bin/prettier`); and 9,639 `__MACOSX/` entries.
- Coverage: the ZIP holds 9,304 of the 9,305 files on disk, including `.git/`, `brand/bearnard/` and the private folders, all with identical size and CRC-32. The missing file is `brand/bearnard/.DS_Store`, written after the backup. One file differed: `.git/config`, which the inspection had modified (ISSUE-0002, fixed).
- All 352 Bearnard images are byte-identical in the backup (SHA-256).

### Changes

1. Created the annotated tag `pre-astro-checkpoint` → `6eedf02` and the branch `chore/gusmaolab-foundation-p01`.
2. Commit `e33e333` archived the Pelican site into `_backup/pelican-legacy/` with `git mv`: 183 renames, all 100% similar, including the Flex submodule (its `.gitmodules` path was updated) and `deploy.yml`. It also removed the empty `themes/` folder left behind, added `_backup/README.md`, and added `exclude: ^_backup/` to `.pre-commit-config.yaml`.
3. The records commit adds `planning/` (6 files), `development/` (6), `debugging/` (4, plus 2 investigation records), `AGENTS.md`, `CLAUDE.md`, a new root `README.md`, and `assets/bearnard/` (`README.md`, `inventory.csv`, `SHA256SUMS`).
4. Local only, not committed: removed the `[lfs]` section the inspection had added to `.git/config` (ISSUE-0002).

Not done, by design: no Astro installation, no dependencies, no masters copied (D-011), no push.

### Retained in place

`brand/`, `docs/`, `cv/`, `publications/`, `scripts/`, `data/` and `hyperglam/` (D-010); the eight placeholder workflows; repository tooling, `LICENSE`, `.python-version`, `clean.sh` and `treecloc.sh`; the private workspace folders; and the empty placeholder folders.

### Validation (before the records commit)

| Check | Result |
| --- | --- |
| Expected files and folders | All present |
| Bearnard checksums (`shasum -a 256 -c`, 352 images) | All match; none of the 370 files in `brand/bearnard/` changed after the backup, apart from `.DS_Store` |
| Backup ZIP | Size and modification time unchanged |
| `git fsck --no-dangling` | No errors (exit code 0) |
| Submodule | Flex at `bbf8768`, working from its new path |
| Workflows | No active workflow in `.github/workflows/` |
| Push | The branch has no upstream; `origin/main` is still `6eedf02` |
| New files ignored by `.gitignore` | None |
| `git diff --cached --check` | No whitespace errors |
| Pelican or Astro build | Not run; neither is required in P01 |

The pre-commit hooks also run when the records commit is made.

## P12 and P12-A01 — Editorial reading layouts (2026-11-14)

P12 was interrupted by a usage limit with the shell, the logic, the layouts and the styles written and checked (`astro check`, build) but no study, tests, browser check, records or commit. P12-A01 resumed from the uncommitted tree.

- **Recovered:** schemas (six optional fields), `reading.ts`, the shell, the eight layouts, the eight indexes, the overview, `editorial.css`, tokens, `FolderPage`'s `path`, the three route files. All present and connected; `astro check` 0 errors on resume.
- **Added:** `layouts.ts` (one map, so the study and the routes cannot differ), the synthetic fixture and ten Markdown bodies, `EditorialStudyBanner`, the three study route files, "Archived" marks in every index, centred chapter header lines, the study's pages in the smoke, route, build, records and CV tests (`studyPaths()`), a 1,000,000-byte ceiling for studies in the smoke test (was 600,000), `editorial.css` imported by `FolderPage` (RESP-013 compares stylesheet sets).
- **Test changes:** the P10 index assertions read the new markup (`ed-index…`); the "pages built" counts exclude the study where they meant the site's 40 pages (CV-015, CV-017); REC-025 skips the study's own fixture; CONT-012 ignores the article's own `<nav>`s; CONT-014 reads the index's links by prefix; REC-022 adds the study's pages.
- **Defects found by running it:** the Back button skipped entries made by a script click (Chrome's history intervention), so EDIT-017B uses real pointer clicks; the last contents heading cannot reach the top of the page (EDIT-012B only asks that it be visible); the Kosmos chapter's overline and metadata were not centred.
- **Looked at in the browser pane:** the study overview, Blog, Trail, Berries, Timber Logs, Months' Original, Kosmos and Book Club pages at 1440 px, the Greenhouse with contents at 1440 px, and the Kosmos chapter and Greenhouse code at 390 px.
- **Checks:** `npm run verify`, `npm run test:browser`, `git diff --check`: pass (see the completion report in the conversation for the counts).
- **Not touched:** `cv/`, the palettes, the registry, the folders, Bearnard, the deployment files. Nothing pushed.

## P13 — Quarto integration and scientific publishing (2026-11-14)

- **Toolchain found:** Quarto 1.10.19 (Pandoc 3.10.0, Deno, Dart Sass, Typst, TinyTeX), Python 3.12.2 without numpy or Jupyter in the default interpreter; a conda environment (`egg`) with Python 3.12.13, ipykernel, nbclient, numpy and matplotlib. Nothing was installed; the demonstration uses only the standard library and `SCIENCE_PYTHON` points at the existing environment.
- **Prototype:** one document rendered to HTML and GFM (planning/architecture.md has the comparison). HTML with MathML kept every scientific structure and needs no runtime; GFM lost the figure and table semantics. `minimal: true` dropped the callout structure and was not used. One network request was made while prototyping, to fetch a citation style that was then not used.
- **Built:** the tool and the HTML cleaner, the Quarto project, the synthetic specimen (computed figure and table, citations, footnote, callouts), the manifest, `src/science/index.ts`, the `EditorialEntry` change, the scientific rules in `editorial.css`, the two study pages, a generated test fixture, three test files, `science/README.md`.
- **Found by running it:** `[@key]` after a cross-reference is read as the reference's supplement, so a citation was lost; Quarto writes random identifiers into figure captions, so the output is normalised; Pandoc puts section ids on `<section>`, so they are moved to headings for the contents list; a lazily loaded figure moved the page after an anchor jump, so lazy loading is off; the test server sent SVG without a type; `astro check` read Quarto's JavaScript, so `science/_build` is excluded; `render` needed no Python at all, which became the proof that nothing runs.
- **Existing tests changed:** smoke (figures named by the manifest, the studies ceiling stays at 1,000,000 bytes (raised in P12)), routes (two route files), bearnard (a figure is not an illustration), records (one more development dependency), cv, editorial-layouts (importers, a regex that matched `overscroll-behavior`), browser-harness (image types).
- **Not touched:** `cv/`, the palettes, the registry, the folders, P12's layouts and indexes, Bearnard, the deployment files. Nothing pushed.

## P13-A01 — Environment stabilization and visible demonstrations (2026-11-15)

- **Audit first:** Node 26.13.1, npm 11.20.0, Astro 7.4.8 (locked), Quarto 1.11.9 at `/Applications/quarto` (1.10.19 at P13), Homebrew `micromamba` 2.10.0 beside a 2.3.0 one earlier on the PATH, no `uv`, Python 3.12.2 (pyenv, no Jupyter), the conda environment `egg`. No reliable before/after record existed except the P13 notes (Quarto 1.10.19, Python 3.12.13), so a new baseline was recorded. `npm run verify`, `npm run test:browser` and `astro check` passed before any change.
- **Environment:** `gusmaolab-science` created from `environments/science/environment.yml` (Python 3.12 and uv only); `requirements.in` locked with `uv pip compile --universal --generate-hashes`; installed with `uv pip install --require-hashes` after a dry run showed `uv pip sync` would remove `pip`, `setuptools` and `wheel`. `quarto check jupyter` runs against it. The P13 specimen, re-executed with Quarto 1.11.9 and Python 3.12.16, came out byte-identical.
- **Built:** `scripts/science-env.mjs`; the `demo` document directory; `src/editorial/demo.ts` and the `greenhouseDemos` collection; the demonstrations section, the notice and the figure route; `scripts/public-build.mjs`, `scripts/demo-check.mjs`, `scripts/demo.mjs`; three demonstrations; the tests and documents listed in `development/current-state.md`.
- **Found by running it:** `quarto-required` takes a space-separated range (`">=1.10.19 <2"`), not a comma; Quarto writes `<col style>` for wide tables (the cleaner now drops `colgroup`); `NODE_ENV=development` left in a shell switched `import.meta.env.DEV` on in a production build, and a `MODE` variable overrides `--mode`, so demonstrations are gated by Astro's mode and the release build cleans its environment and searches its output; the frozen results differ between `execute` and a later `render` only in Quarto's list of supporting files, so the determinism test compares the published files byte for byte and the freeze without that list; Astro refuses a second dev server, so the dev-server test reuses a running one; a link that wraps over two lines has to be clicked inside its first box; the first figure labels collided with the noise and the text was too small on a phone (fixed and re-executed).
- **Existing tests changed:** QTO-001 (`demo` added), QTO-023 and QTO-024 (they list the only lines that may have gone since P12), routes (the figure route), smoke and bearnard (only figures under `public/` are public), the browser harness (a folder or an external origin to serve).
- **Not touched:** `cv/`, the palettes, the registry, the folders, P10's routing rules, P11, Bearnard, the deployment files. Nothing pushed. The other agent's CV-01 sections were left out of the commit.

## P14 — Authoring workflow, publication validation and editorial developer experience (2026-11-15)

Started on `development` at `1b12f6d` with only the other agent's CV-01 notes uncommitted (kept out of the commit) and the untracked `clean`.

**Inspected first.** P10's schemas, routes and draft rule (a draft is routed only by the dev server), P12's layouts and reading context, P13's `science.mjs` (render never computes; a source without a rendering fails the build), P13-A01's demonstrations and their release guard, the test harness and the P13-A01 browser test.

**Built.** `src/editorial/authoring.ts` (formats, per-collection fields, templates, the command list, the 21 checks, the lifecycle text; erasable TypeScript), `scripts/content-lib.mjs` (workspace reader, `analyze`, create, publish, archive, preview), `scripts/content.mjs` (the five commands, `node:util` argument parsing), five `content:*` scripts, the Publishing Workbench (three pages, a banner, a module, a draft body, a committed transcript), the Greenhouse Overview link, release-guard markers, `development/authoring-guide.md`, and the documentation. Decisions D-107 to D-111.

**Found by doing it.**
- A Quarto draft must be registered when it is created, or `npm run build` fails (P13's fail-closed rule): `content:new --format qmd` renders it without computing, and removes the file again if that fails.
- A stale Quarto article is an error even for a draft, for the same reason; it is the one check that does not soften for drafts.
- `astro dev` listens on `localhost`, which here is the IPv6 loopback only: the first version of `content:preview` probed `127.0.0.1`, reported the server as not running while it ran, and printed an address that would not open. It now tries `localhost`, `127.0.0.1` and `[::1]`, and prints the one that answered.
- An unquoted `--slug -a` is read as an option by the argument parser (KL-84).
- `.DS_Store` files that macOS made in `src/content/`, `src/demos/` and `src/` failed CONT-001 and P13A-011 (KL-86); they were deleted. P13A-013 and P13A-030 had to allow the workbench link inside the demonstrations section.
- `tests/routes.mjs` lists the route files exactly; the three workbench routes were added.

**Verified.** `npm run verify`, `npm run test:browser`, `git diff --check`: see the acceptance matrix and the report. A real throwaway draft was created in the running dev server, previewed (HTTP 200, "Draft preview" notice, absent from the index) and its one file removed.

**Not done, by design.** A web editor, a database, authentication, server-side writes, deletion, redirects, a slug-rename command, `updatedAt` automation, committing, pushing, deploying. P15 not started.

## Bearnard WhatsApp preparation — Prompt 1/3 (2026-11-10)

Local derivatives are complete in `brand/bearnard/expressions2/_all/`: 204 static transparent 512 × 512 WebPs, each ≤100,000 bytes (79,210–99,996 bytes; total 18,872,908 bytes). All exports pass decode, static-frame, dimensions, alpha, margin and size checks. All 210 protected source/reference/prompt files retain their hashes. Nine existing side-edge contacts are documented and preserved. Every sticker received overview QA; 18 representative/edge cases received larger previews. Ready for emotional categorization; no packs or app were created. Script, manifest, preparation report and QA previews are local ignored assets.

Executed `python3 tools/prepare_whatsapp_stickers.py --workers 4` and `python3 tools/sticker_qa_previews.py` from the expressions2 project. Export audit: 204 passed, 0 missing/failed/unresolved. Restart reused 204 files with identical hashes and modification times; deterministic encoding and missing/unmanaged-file checks passed. No dependencies were installed. Site-wide build checks were not run for these local image derivatives.


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


## P15 — Homepage composition (2026-11-16)

**Git preflight.** Started on `development` at `6332901` ("Adding self publishing articles", the owner's commit after P14: two draft articles, the earlier CV-01 notes in the two development records, and a `clean` file). Working tree clean, nothing staged, no stash, one worktree, no other local branch ahead; `origin` has only `main` (`1e1c52b`), so `development` is local only. Nothing was merged, rebased or cherry-picked, so P15 continued on `development`. The owner's two draft articles are not published and do not affect the page; the `clean` file was left alone.

**Built.** `src/home/` (archive selection, clock configuration, recent-update selector); `src/components/home/` (`HomePage`, `HomeWelcome`, `ArchiveExplorer`, `NucleusStage`, `WorldClocks`, `RecentUpdates`); `src/pages/index.astro` now draws the homepage; `homeRecentUpdates()` added to `src/editorial/site.ts`; the specimen `/_design/home/` with `src/design/home-fixture.ts` and `src/design/home/HomeSpecimenBanner.astro`; release-guard markers in `scripts/demo-check.mjs`; `tests/home.mjs`, `tests/home-browser.mjs`; the route allowlist in `tests/routes.mjs`; `package.json` scripts. Decisions D-112 to D-117.

**Styles.** The homepage's CSS is one global file, `src/styles/home.css`, imported by `BaseLayout.astro` with the other global styles (one added line). Component-scoped styles were tried first and failed RESP-013, which requires every page to load the same stylesheet set.

**Two stale checks relaxed.** The owner's two draft articles (`src/content/greenhouse/pyspark-exercises.md`, `src/content/berries/pyspark-exercies-berries.md`, commit `6332901`) made two earlier tests fail that had assumed the collections were empty: EDIT-019 (no synthetic fixture in `src/content/`) now forbids fixtures by slug instead of forbidding every entry, and QTO-001 (nothing converted to Quarto) now requires the generated marker only of entries that have a `.qmd` beside them. Their purposes are unchanged. `tests/routes.mjs` also accepts Home's heading "GusmaoLab" (NAV-023).

**Verified.** See `development/current-state.md` ("Homepage (P15)") and the P15 gates in `development/acceptance-matrix.md`. The nucleus frame was made flatter from a 34rem paper after the tablet screenshot showed a 4:3 frame taller than the text above it.

**Not done, by design.** Clock mechanics (P16), the interactive nucleus, assigning Bearnard to `home-welcome`, any new content, push or deploy.


## P16 — World clocks (2026-11-16)

**Git preflight.** Started on `development` at `72cd983` (P15), working tree clean, one worktree, no stash; `origin` has no `development` branch (its `main` is `1e1c52b`). Nothing was reset, rebased or cherry-picked.

**Built.** `src/home/clock-time.ts` (the pure reading), `src/home/clock-loop.ts` (the one loop, with injectable clock and timers), `src/scripts/world-clocks.ts` (the DOM binding), `WorldClocks.astro` rewritten (placeholders, `<noscript>`, an `instant` prop for the specimen), the clocks' part of `src/styles/home.css`, the specimen `/_design/world-clocks/` (`src/pages/[design]/world-clocks/index.astro`, `src/design/clocks-scenarios.ts`, `src/design/home/ClocksSpecimenBanner.astro`), release-guard markers in `scripts/demo-check.mjs`, a dev-note link on the homepage, `tests/clocks.mjs` (37 checks), `tests/clocks-browser.mjs` (15 checks) and `tests/fixtures/clocks/reference.json`. Decisions D-118 to D-121. The clock list (`src/home/clocks.ts`) was not changed.

**Independent reference.** `tests/fixtures/clocks/reference.json` holds the expected local date-times of all eight zones at 18 UTC instants (the transitions of Anchorage and Auckland, New Year, mid-month), computed with Python's `zoneinfo`, not with the code under test. A first Node smoke run matched all 144 values, also under `TZ=Pacific/Kiritimati`. Two mutations were tried to see the tests fail (hour cycle `h12`: nine failures; Mexico City on `America/Chicago`: CLOCK-001, 004, 005 and 007 fail) and reverted.

**Existing tests changed, and why.** Three checks counted scripts: the smoke test, NAV-031 and TRANS-B04 now allow exactly one more module script, the clocks', on the page that has them (they still forbid any other, any router and any inline handler). NAV-032's route allowlist names the new specimen route. HOME-012 allows the clocks' script, HOME-016 asserts the new honest built state (loading, no `<time>`, no digit, placeholders hidden from assistive technology) in place of the P15 "preview" state, and the git regression helper of `tests/home.mjs` treats the file as P15-in-progress only while it is untracked. The homepage composition, the other four regions, the palettes and the folders were not touched (CLOCK-029, 035 to 039).

**Found while testing.** CLOCK-034B showed the placeholder was a smaller size than a live reading (a 4 px shift at 1440 px); the placeholder now has the live size and only a quieter colour. The intro sentence lost the space before the note when the note moved into an expression; restored. The note's text is the same before and after the script runs, so it cannot reflow.

**Verified.** `npm run verify` exit 0 (379 PASS lines), `npm run test:browser` exit 0 in Chrome 157 (the new suite: 15 checks), `git diff --check`. Looked at: the homepage at seven widths (automated) and screenshots at 1440, 768, 390 and 320 px, plus the specimen at 1440 px, kept outside the repository. The live reading on the dev server agreed with the UTC time (Accra) and the offsets of the other seven.

**Not done, by design or not possible here.** Chrome on Android and any real device, Safari, Firefox, a real hidden tab or suspended phone (hiding is simulated with the page's own events), a screen reader, the owner's review; relative-day labels; any nucleus or Bearnard work; P17.

## P17 — Complete site navigation and content states (2026-11-16)

**Git preflight.** Started on `development` at `e37e5ef` (P16). The only difference in the working tree was the owner's own edit of `cv/cv.md`, which P17 never touched, staged or committed. Nothing was reset, rebased or pushed; `origin` still has no `development` branch.

**Route audit.** The registry has 36 folders (11 sections, 25 children), exactly the approved reference, in the approved order and categories. Before P17 only the eight editorial collections and Home had real pages; the other 27 folders showed the P06 scaffolding ("development scaffolding, temporary page"). Generated routes: the 36 folders, the entry pages of the collections, the permanent design studies and, in development, the specimens. `/external/` has no page and no route file (D-076): it is an unknown URL and was left so. There is no catch-all route. No orphaned or duplicate route was found.

**Built.** The state model and its derivation (`src/site/`), five components (`src/components/states/`), `states.css`, the development site map and the page-states specimen, the internal-link checker (`scripts/links.mjs`), `editorialCounts()` in `src/editorial/site.ts`, and 49 new checks (SITE-001 to SITE-047). `ScaffoldContent` was removed.

**Found while building.** A first design put the state on `<main>` through a new `FolderPage` prop; P13A-027 and QTO-028 guard `FolderPage` against any change, so the attribute moved to a `div` inside `<main>` and `FolderPage` is untouched. The notice's flex basis (16rem) overflowed a 390 px viewport at 200% text size; it is now `min(100%, 16rem)` (SITE-047). Bearnard's figure first wrapped under the notice; the notice's width is now capped so he sits beside it.

**Existing tests changed, and why.** NAV-032 lists the two new route files. P13A-027 and QTO-028 guarded all of `src/scripts` against P13 and P12 and now fail on P16's clock script, so they guard the two folder scripts. REC-021 and REC-022 allow the page-states specimen as a second development-only user of the records fixture. CV-019 allows `/cv/` to differ inside `<main>` when a snapshot exists (the folders and the homepage stay identical). The design-token test lists the new files. See D-125.

**Verified.** `npm run check` 0 errors; `npm run build` exit 0 and its output holds no development page; every test script of `npm test` passes except EDIT-021, QTO-026 and P13A-025, which fail only because the owner's working-tree edit of `cv/cv.md` makes `git status` on `cv/` non-empty (they guard against an agent touching the CV; the edit is the owner's and was left alone); `tests/site.mjs` 40 checks and `tests/site-browser.mjs` 9 checks pass. Mutation check: a notice made a live region fails SITE-020; a synthetic site with a missing page, a bad fragment and a slashless link is reported by the checker.

**Not done, by design or not possible here.** The records pages cannot be seen with real data (the owner has supplied none; the specimen shows them with the synthetic fixture). Safari, Firefox, Chrome on Android, a screen reader and the owner's review. Final error pages, the fuller Contact and Downloads are P18.

## P18 — Contact, downloads and the 404 page (2026-11-17)

**Git preflight.** Started on `development` at `409657a` (P17 and the owner's `add cv.md`, then the P13A-025 baseline), working tree clean. `origin/development` is at `e74bbac` (the owner's push), one commit behind; `origin/main` has an unrelated study merge. Nothing was reset, rebased or pushed; no deployment workflow is active (every file in `.github/workflows/` is a commented placeholder).

**Audit.** No public contact channel is approved anywhere I may use: the Person records are empty, and the CV, whose contact details and references are private, was not read. So the Contact page lists none and says so. No download is approved either; the only candidate, the CV, is an unfinished private source. There was no existing 404 page, no `public/downloads/` and no download mechanism. The site has no `base`; `site` is `https://www.gusmaolab.org`.

**Built.** `src/contact/` and `src/data/contact.ts` (the channel model, its gate and the empty approved list), `ContactChannels.astro`, a `contact` source in the P17 coverage so Contact is `ready` once a channel is approved; `src/downloads/` and `src/data/downloads.ts` (registry, rules, file reads), `DownloadList.astro`, `scripts/downloads.mjs` wired into `scripts/public-build.mjs`, the CV page's download section; `src/pages/404.astro` and `src/layouts/ErrorPage.astro`; the downloads and contact specimens, the synthetic fixtures and their route; `tests/util.mjs` (47 checks) and `tests/util-browser.mjs` (9 checks); `development/downloads-guide.md`.

**Found while building.** The root `.gitignore`'s `downloads/` rule (the Python template's) ignored every new downloads folder and would have ignored `public/downloads/`, so an approved file would never have been committed; fixed by un-ignoring those paths (D-127, UTIL-050). `src/downloads/files.ts` found the repository from `import.meta.url`, which is wrong inside a build's bundle, so the demonstration build could not find the fixtures; it now walks up to the folder holding `src/data/downloads.ts` and falls back to the working directory. `astro check` has no Node types, so `src/node-downloads.d.ts` declares the few functions used (same arrangement as `node-fs.d.ts`).

**Existing tests changed, and why.** They counted pages or route files and now allow the 404 page, the two specimens and the fixture route: NAV-026, NAV-031, NAV-032, the smoke test (404 has no script), CONT-008, REC-022, CV-015, CV-017, P13A-011 (D-129). A guard for the two new fixture files in `src/demos/` was widened for `downloads/*.txt|csv`.

**Verified.** `npm run check` 0 errors; `npm run build` exit 0 (it now also runs the download checks); `tests/util.mjs` 47 checks and `tests/util-browser.mjs` 9 checks in Chrome 157. Mutation checks: an approved contact channel without an approval date fails the build, and an approved download whose file is missing fails the build, each with a sentence naming the problem. An unknown address returns 404 with the custom document from the Pages-style test server and from `astro preview`; the dev server also returns 404. A real browser download of both fixtures saved the right names and bytes.

**Not done, by design or not possible here.** No email was sent or delivered, and a `mailto:` link was not opened in a mail client. GitHub Pages itself was not tested (nothing is deployed). Safari, Firefox, Chrome on Android and a screen reader are untested. No contact channel or download is published, because the owner has approved none. The CV download, its generation and any contact form are later steps.

## P19 — Scientific 3D Nucleus & Chromatin: Standalone Prototype (2026-11-21)

**Scope.** A standalone, interactive three-dimensional model of an interphase nucleus and its folded chromatin with one yellow region that deforms modestly toward a simulated navigation target, as a development specimen. Not integrated into Home (P20). Started on `development` at `0bc6b89` with a clean tree; `origin/development` was at `e74bbac`, two commits behind, and nothing was pushed.

**Built.** `src/visualization/nucleus/`: a deterministic model (twelve confined, persistent random-walk polymers in chromosome territories, peripheral compaction, an organic envelope), tube geometry with in-place updates, a critically damped continuous deformation state with `sin²` weights anchored at both ends, a view module that maps a page position to a response, a lifecycle that draws only on demand and handles visibility, `pageshow`, resize, context loss and disposal, a passive `observeTargets`, a still SVG fallback from the same model, and a Three.js renderer (merged opaque chromatin, one dynamic strand, a two-layer translucent envelope). `NucleusFigure.astro`, the specimen `/_design/nucleus/` and its script (guarded so a release build holds none of it), links from the development note and the site map, and `development/nucleus-guide.md`. D-130 to D-136.

**Iteration of the look (seen in Chrome).** First render: chromatin too thick and bunched, nucleus small in its frame. Changes: 150 control points per strand with radii 0.0075 to 0.0125, territories wider, camera tighter, a looser highlighted region and a longer one (25 % to 75 % of its strand), gentle steering from territory edges so the strands curve rather than reverse, three smoothing passes. A reach of 0.27 was raised to 0.32 so the opening is perceptible and still modest.

**Found by the tests, and fixed.** Showing the diagnostics panel widened the page's grid column to 778 px at a 390 px viewport (a grid of auto-fill columns inside an auto-sized grid track); the column is now `minmax(0, 1fr)`. A first release build contained the specimen's script chunk and the graphics engine (the page's script is bundled although the page is not routed); the script is now a guard on the mode and the release build is searched for `WebGLRenderer` and the specimen's markers. The settling thresholds had kept the loop alive 3.4 s after a response (about 208 frames); they are now 0.002 and 0.005 (2.3 s).

**Existing tests changed, and why** (D-136): NAV-031 and NAV-032 (the page and its script), QTO-029, HOME-012, SITE-041, REC-024 and UTIL-047 (two new dependencies and nothing else), P13A-023 (a second reader of the mode, the guard) and P13A-024 (it had failed on the committed P18 tree because of the two registry files; KL-111). The browser harness took an optional `chromeArgs`.

**Verified.** `npm run check` 0 errors; `npm run build` exit 0 (73 pages; no script, no Three.js); `npm test` exit 0; `tests/nucleus.mjs` 42 checks; `tests/nucleus-browser.mjs` 19 checks in Chrome 157. Measured on an Apple M1 Max, headless Chrome with Metal: 60 fps while responding at 896 × 672 px, 0 frames while still; software WebGL about 15 fps.

**Not done, by design or not possible here.** P20 (integration); an approved fallback capture; a camera inspection control (optional, not built); Safari, Firefox, Android Chrome, a real phone and a screen reader were not tested; nothing was pushed or deployed.

## P20 — Homepage Nucleus Integration (2026-11-21)

**Scope.** Mount the P19 nucleus in Home's stage and drive it from the real folder tabs, through stable navigation IDs and a chromatin-domain abstraction, without rebuilding the model and without claiming more than one domain. Started on `development` at `64a3ce8` (P19), a clean tree; nothing pushed.

**Built.** `domains.ts` (the one domain, `resolveDomain`, the empty frozen mapping); the controller's `activate` / `clear` and `NucleusNavigationTarget`; `observeNavigation` with the precedence policy and scroll/resize re-sampling (`observeTargets` now wraps it); `localTarget` (a bounded target that keeps the direction); `mountNucleus`'s `onStatus` and `allowKeyboard`; `NucleusFrame.astro` split out of `NucleusFigure.astro`; `NucleusStage.astro` and `home.css` (P15's footprint, no placeholder border); `src/home/nucleus-navigation.ts` and `src/scripts/home-nucleus.ts` (lazy, intersection-gated, one mount); the specimen's NUC-04 mapping inspector; `planning/nucleus-multidomain.md`; `tests/nucleus-integration.mjs`, `tests/nucleus-integration-browser.mjs` and `tests/nucleus-fakes.mjs` (the fakes moved out of `tests/nucleus.mjs`).

**Found by looking, and decided.** The stage is about 1,300 px below the tabs, so at an ordinary window height the response happens off screen (D-143); recorded, not fixed, because P15's composition is approved. A first version clamped the target per axis, which turned every far tab into a 45-degree direction; it now limits the distance and keeps the direction.

**Found by the tests, and fixed.** The release build failed the demo check, because the graphics engine is no longer a trace of a demonstration: the engine was removed from its list and the specimen's own markers added. The test helper waited 25 s for a stage that does not exist on other pages, and for one that is lazily not loaded at a short window height. Several browser checks first measured the preview's approach across other tabs as flicker; they now start once the pointer is inside the tab.

**Existing checks changed, and why** (D-139): smoke test (three allowed script files, their own size ceiling, the stage's external script), NAV-031, TRANS-B04, QTO-029, HOME-011 and HOME-012 (the placeholder became a picture; one more script), UTIL-047 (one more script file), NUC-036, NUC-037, NUC-044, NUC-048 and NUC-049, and the demo check. No test was loosened to pass: each now names what is allowed exactly.

**Owner decision after the report (D-144).** The owner chose to keep the tab row on screen. `src/styles/home-tabs.css` makes the global row sticky on Home only, for hovering fine pointers, with a shell-coloured band while stuck and a scroll-driven z-index raise. Found in the browser: the first version put the row under the paper (z-index below the body); a second raised it but a minifier folded the animation longhands into a shorthand that Chromium rejects, so the rule vanished until the name went behind a variable. Cost: a 1 px line across the selected tab's foot at rest (measured), one z-index animation. NUCINT-055 and -055B.

**Verified.** See the completion report; `npm run verify` and `npm run test:browser` were run on the committed tree.

**Not done, by design or not possible here.** Several chromatin domains; any change to P15's composition; a real touch device, Android GPU, Safari, Firefox or screen reader; deployment; P21.

## P21 — Scheduling integration

**What was built.** The Schedule page's integration with an external provider (Cal.com) and nothing else: `src/data/scheduling.ts` (switched off), `src/scheduling/` (`config.ts` validation and the public view; `availability.ts` the future-file boundary; `time.ts` IANA time zones; `embed.ts` the loader; `copy.ts` and `messages.ts` the words), `src/scripts/schedule-embed.ts`, `src/components/schedule/` (`ScheduleBooking`, `ScheduleEmbed`, `RequestLifecycle`, `RequestStatus`), a `scheduling` destination source (P17), `scripts/scheduling.mjs` (`npm run scheduling:check`), the development specimen `/_design/scheduling/` (`src/design/scheduling-fixture.ts`, `src/design/scheduling/SyntheticCalendar.astro`, `src/scripts/scheduling-specimen.ts`), styles in `states.css`, `tests/scheduling.mjs`, `tests/scheduling-browser.mjs`, `tests/scheduling-ready-build.mjs`, `development/scheduling-guide.md`, D-145 to D-150, and G-P21-01 to -17.

**Decisions made along the way.** The booking calendar loads on a button press, not on page view, so a page view contacts nothing and needs no consent banner (D-147). Enabling needs the owner's dated attestation of three provider settings; the build refuses less (D-145). The page's script is its own component so every other page ships none. With scripts off, the button is not drawn.

**Found in testing.** `Intl.DateTimeFormat` accepts `-03:00` as a time zone, so `isValidTimeZone` also requires an IANA-shaped name (SCH-012). The page's script first imported all the page copy, which put the specimen's "Meeting confirmed" text into the real page's bundle; the two sentences it needs moved to `messages.ts` (SCH-049). A grid with one auto column let the zone chooser's longest option widen the page at 320 px (SCH-045). The harness's first focus check used a programmatic `focus()`, which is not `:focus-visible`; it now reaches each control by Tab (SCH-047).

**Existing checks changed, and why.** `tests/routes.mjs`: NAV-031 names the two new components that contain a script, and NAV-032 the new specimen route; nothing was loosened. The demo check searches the specimen's markers in a release. `src/site/destinations.ts`: Schedule's source changed from `planned` to `scheduling`, and its notice now says requests will be reviewed before confirmation.

**Verified.** See the completion report. The provider was never contacted.

**Not done, by design or not possible here.** A Cal.com account, event type, calendar, real availability, any operational test (SCH-013B, 014, 015B, 021 to 035, 042), the availability adapter and any synchronisation, a Content-Security-Policy, deployment, P22.

**Observed, not caused by P21.** In the full browser run, NUC-031 (P19, keyboard focus on the nucleus specimen) failed twice with an activation of exactly 20 where it expects more than 20 after 700 ms. The same test passed on an unmodified checkout of HEAD, and passed twice on the P21 tree on rerun: its threshold depends on frame timing under load. It was not changed.
