# Architecture

Status: approved direction recorded in P01. The Astro foundation was set up in P02, the design-token foundation in P03, the navigation data model in P04 and the physical folder components in P05 (2026-11-10). P06 (2026-11-11) connected them: every registered folder has a generated page inside the folders, with temporary content. The owner approved the folder appearance (D-049) and the P06 navigation (D-057). P07 (2026-11-11) added previews of an unopened folder's contents, the site's first client-side script (D-058–D-062), which the owner approved (D-063). P08 (2026-11-11) made the folders work on every screen size, with CSS and a second small module (D-064–D-069), which the owner approved (D-070).

## Approved direction

- Astro static site, with static generation by default.
- TypeScript where appropriate.
- Semantic HTML and CSS.
- Minimal, isolated client-side JavaScript, only where a feature needs it.
- Markdown-first authoring.
- Python and Quarto for scientific workflows when appropriate.
- A separate external service for booking where necessary. Booking credentials never go in the repository.
- Deployment to GitHub Pages.

## Astro configuration

| Setting | Value |
| --- | --- |
| Astro | 7.4.8, pinned exactly |
| Output | `static`, with no adapter and no server rendering |
| `site` | `https://www.gusmaolab.org` |
| `base` | None: the site is served from the domain root |
| Build output | `dist/` (gitignored) |
| TypeScript | Extends `astro/tsconfigs/strict` with `erasableSyntaxOnly` (D-040); excludes `dist`, `_backup`, `brand` and the private folders |
| Diagnostics | `astro check`, using `@astrojs/check` 0.9.12 and TypeScript 6.0.3 |
| Styles | Native CSS custom properties in `src/styles/`, imported by `BaseLayout` (D-026). No CSS framework or preprocessor. |
| Categories (colour) | `data-category` on `<html>` via BaseLayout's `category` prop, and on every top-level tab; the five palettes live only in `src/styles/categories.css` (D-076) |
| Environments (typography and texture) | `data-environment` on `<html>` via BaseLayout's `environment` prop, or on any element (D-027, D-076) |
| Navigation | A typed, declarative registry in `src/navigation/` (D-036–D-039), with Overview display tabs (D-050–D-052) |
| Folder components | `src/components/folders/` and `src/styles/folders.css`: static Astro components that draw a navigation state as linked folder tabs (D-043–D-047, D-054), with server-rendered folder previews (D-058, D-059) |
| Client-side script | Two small modules, bundled and inlined by Astro as one `<script type="module">` per page with folders (4.1 KB since P09; KL-36): `src/scripts/folder-previews.ts` shows and hides the previews (D-060); `src/scripts/folder-rows.ts` opens rows at their selected tab where the browser cannot and keeps keyboard focus clear of the row edges (D-066) |
| Pages | One route file per tab level, generated from the registry; `FolderPage` layout (D-053) |
| Tests | `npm test` runs `tests/design-tokens.mjs`, `tests/contrast.mjs`, `tests/navigation.mjs`, `tests/smoke-test.mjs`, `tests/folders.mjs`, `tests/routes.mjs` and `tests/previews.mjs` (D-032, D-040). `npm run test:browser` runs `tests/previews-browser.mjs` and `tests/responsive-browser.mjs` in a local headless Chrome, through `tests/browser-harness.mjs` (D-062, D-069). `tests/responsive.mjs` is part of `npm test`. |

## Navigation and Astro routes

Two systems, kept separate, and one layout that joins them:

- **Navigation** (`src/navigation/`) decides which folder tabs exist, their order, URLs, categories and environments, and what each URL shows: which tabs are selected in which rows, where the Overview tabs are, and which tab stands for the page. It is pure data and functions, evaluated at build time, with no client-side router and no server.
- **Routing** stays Astro's: files in `src/pages/` and, since P10, the editorial content collections produce the pages. The registry creates no pages by itself; the route files ask it which pages to build.
- **Folders** (`src/components/folders/`, P05) draw one resolved navigation state. They hold no navigation data of their own.
- **`FolderPage`** (`src/layouts/FolderPage.astro`, P06) is the join. It resolves the page's own URL (`Astro.url.pathname`), passes the page's category and environment to `BaseLayout`, and draws `FolderStack` with the page's content in `<main>` inside the deepest folder. A page provides only its content.

```text
registry.ts ──► createNavigation() ──► siteNavigation
                                        │  folderStaticPaths(level)   resolve(url)
                                        ▼                              ▼
src/pages/ route file per level ──► FolderPage ──► BaseLayout (category, environment)
          (which pages exist)          │
                                        └► FolderStack ► FolderLayer ► FolderTabStrip ► FolderTab
                                               └ page content (slot) in <main> on the deepest folder's paper
```

The contract (`information-architecture.md`, sections 12 and 14):

1. Folder pages are generated from the registry by `src/pages/index.astro`, `[section]/index.astro`, `[section]/[folder]/index.astro` and `[section]/[folder]/[subfolder]/index.astro`, each listing `siteNavigation.folderStaticPaths(level)` (D-053). They are never maintained by hand per section.
2. Content routes are built from the editorial collections (P10, below), registered with an owning folder, and generate their pages from the same route files. They live under static segments, which outrank the dynamic folder routes, and render through `FolderPage`, so their content opens in the owner's body.
3. The smoke test fails if a built page is not a registered destination or declared study, or if a destination has no page.
4. There is no catch-all route, no server rendering, no client-side router and no hydration: tabs are plain links, and Back, Forward and reload work as on any static site. Navigation needs no JavaScript; the one script only shows the folder previews (below).
5. Temporary design studies live under `/_design/` (D-048, D-055). Whether they are excluded from a published build is part of the deployment decision (D-005).

## Client-side enhancement: folder previews (P07)

Navigation is static. The folder previews are a progressive enhancement on top of it (D-058–D-060):

```text
build time (Astro)                                   in the browser (one module)
──────────────────                                   ───────────────────────────
resolve(url) ─► rows, selectedId, currentTabId ─► tabs, V, aria-current    (never touched)
            └─► row.previews ─► FolderPreview: <div popover="manual"> after each eligible tab's link
                                       ▲
src/scripts/folder-previews.ts ────────┘ showPopover() / hidePopover(), and its position
```

- **Server-rendered content.** Each preview's links are in the HTML, built from the same display tabs as the folder's own row. The script holds no navigation data and fetches nothing; there is one representation of the tree.
- **State separation.** The URL decides what is open, at build time. Which preview is showing, and why (pointer, focus, Escape), lives in the module's variables and disappears with the page: never in the URL, history, storage or the navigation model.
- **No-JavaScript fallback.** Without the script, or without the Popover API, the previews stay hidden (`display: none` in the stylesheet as well as the browser's popover rule), every tab is still a link, and every destination in a preview is a tab on its folder's own page.
- **Positioning and clipping.** Rows scroll sideways inside `overflow-x: auto` strips, and each folder level is an isolated stacking context. A popover is drawn in the top layer, outside both, so the script only sets its position: under its tab's visible part, inside the viewport, scrolling internally when long. It measures only when a preview opens and on scroll or resize while one is open.
- **Size.** 2.75 KB minified (3.8 KB with P08's row module, 4.1 KB after P09), inlined by Astro as one `<script type="module">` per page with folders, so it needs no request of its own. The P03 specimen has none.
- **Tests.** `tests/previews.mjs` checks the model and the built markup; `tests/previews-browser.mjs` checks pointer, keyboard, touch, no-JavaScript and positioning in headless Chrome (`npm run test:browser`).

## Navigation continuity (P09)

Folder links are still ordinary links between real pages: every navigation loads a new document, with its own URL, history entry and scripts, generated by Astro. P09 only changes how the browser swaps them (D-071, ISSUE-0004).

- **Diagnosis.** The reported blink was not a blank frame. Chrome holds the old page until the new one is complete (stylesheets are render-blocking, and there are no web fonts), then replaces the whole viewport in one frame. Between sections that one frame swaps every environment colour; on phones the rows also jump to their selected tabs. Dev and production behave the same.
- **Correction.** `src/styles/view-transitions.css`, imported by `FolderPage` only, opts folder pages in to the browser's own cross-document view transitions: a 140 ms cross-fade of the whole page. There is no `view-transition-name` anywhere, so nothing morphs or persists; snapshots of the two documents simply cross-fade.
- **Why not a client router.** Astro's `ClientRouter` would fetch pages with JavaScript and swap them into the current document, changing every script's lifecycle (the previews, the row script and future clocks and nucleus) and the no-JavaScript guarantee. It was not needed and was not used. Adopting it would need the owner's approval.
- **Fallback.** Browsers without cross-document view transitions, and visitors with reduced motion, get the plain navigation. The design studies do not opt in.
- **Interaction with the scripts.** Each page still runs its own scripts once. While the fade plays, the browser routes input to the page root, so clicks are ignored for those 140 ms (KL-34). After a restore from the back-forward cache the browser replays a stale pointer position, so previews now wait for real pointer movement (D-072).

## Bearnard illustrations (P09)

How Bearnard reaches a page (D-073, D-074). No site page shows him yet; `/_design/bearnard/` is a temporary study.

```text
brand/bearnard/ (masters: gitignored, immutable, never read by the build)
   │  scripts/bearnard_derivatives.py   run by hand; checks the inventory and checksums first
   ▼
public/illustrations/bearnard/*.webp   committed web derivatives
assets/bearnard/derivatives.json       committed provenance: source, settings, sizes, checksums
   │
src/illustrations/bearnard.ts          registry: ID, master, category, roles, alt text, files
   │
src/components/bearnard/BearnardIllustration.astro   <img srcset …>, or the fallback slot
```

- **Derivative pipeline.** The generator is the only code that opens a master, and it only reads. It refuses a master that the inventory does not list as `canonical-master` or `approved-derived`, or whose SHA-256 differs from the inventory or `SHA256SUMS`, and it refuses to write inside `brand/bearnard/`. Output: WebP, quality 80, Lanczos, aspect ratio and transparency kept, no cropping. Run `python3 -I scripts/bearnard_derivatives.py` (needs Pillow with WebP) only when the owner approves another illustration or an approved master changes on purpose; then commit the new files and `derivatives.json`, and add the illustration to the registry.
- **Build reproducibility.** The build reads only `public/` and `src/`: nothing imports or reads from `brand/` (BEAR-007). A clean checkout, which has no masters, builds the same pages and images; there BEAR-004 (masters unchanged) reports SKIPPED, never PASS, and every other check runs. Pillow is not a project dependency.
- **Registry and component.** The registry is plain data in erasable TypeScript, so the tests import it directly in Node.js, like `src/navigation/`. Pages ask the component for a role (`<BearnardIllustration role="not-found" />`) or a specific illustration (`variant="bearnard-v1.3-portrait"`). A role nobody has approved an illustration for renders the fallback slot or nothing, so pages can be written before the artwork exists. The choice is fixed at build time and is the same on every visit.
- **Output rules.** `dist/` may hold only the registered derivatives, each matching its recorded checksum and under 250,000 bytes; no PNG, JPEG, TIFF or PSD, no file named like a master, no local path in any page or stylesheet (BEAR-006, BEAR-008, smoke test).

## Responsive layout and the row script (P08)

The folders adapt with CSS: fluid spacing tokens, rows that scroll inside their folders, a coarse-pointer media query, and containment of wide content (D-064–D-068). JavaScript only helps with scrolling, and nothing depends on it:

- **Route state stays in the HTML.** Which tab is selected is decided by the URL at build time and written into the page (`data-selected`). `folder-rows.ts` reads that attribute; it never reads the URL, computes a selection, navigates or touches history.
- **Scroll position is not state.** Revealing the selected tab sets a row's `scrollLeft` once, as the page opens, and only in browsers without `scroll-initial-target` (Chromium does it natively, before the first paint). Keeping focus clear of the edges nudges a row after the browser's own focus scroll. Nothing is stored, and the page itself never scrolls.
- **Previews in scrolling rows.** P07's popovers live in the top layer, outside every row's `overflow-x: auto`. While one is open, a scroll listener (capture phase, so it hears the rows) repositions it in the next frame, and it closes if its tab scrolls out of sight (D-059). P08 tested this and changed nothing in it.
- **Fallback.** Without JavaScript, rows still scroll natively and every tab is a link; Chromium still opens rows at their selected tab, other browsers at their start.

## Editorial content (P10)

Eight Markdown collections, validated at load time, published as static pages inside the existing physical folders. The rules are in `planning/content-model.md`; this is how the parts join.

```text
src/content/<collection>/*.md ──► glob loader + Zod schema ──► Astro content store
 (one file per entry)             (src/content.config.ts,        (build fails on invalid
                                   src/editorial/schema.ts)       metadata, naming the file)
                                              │
 src/editorial/site.ts:  getCollection() × 8 ─┘
   ├─ collectionIssues()  duplicate slugs and sequence places   ► build fails
   ├─ contentRoutes()     published + archived entries only     ► ContentRoute { path, owner, title }
   │                       (+ drafts in `astro dev` only)
   ├─ getSiteNavigation() createNavigation(SECTIONS, routes)    ► FolderPage resolves entry URLs
   └─ pageStaticPaths(n)  folders at depth n + entries at depth n ► the three route files
```

- **Content Layer.** `src/content.config.ts` declares the eight collections with the stable `glob()` loader, each over its own directory below `src/content/`, with an explicit `generateId` (the file path), so the entry ID never mixes with the public slug. One guard wraps the loader: the raw date text is checked before the YAML parser can correct an impossible date silently (`src/editorial/raw-dates.ts`). Nothing else is installed: no MDX, no CMS, no database, no new dependency.
- **Pure rules, separate from Astro.** `src/editorial/collections.ts`, `schema.ts`, `model.ts` and `raw-dates.ts` need nothing from Astro except the Zod build it re-exports, so the tests run them in plain Node.js (erasable TypeScript, as in `src/navigation/`, D-040). Only `site.ts` and the components import `astro:content`.
- **Ownership is declared.** Each collection names its owning folder by ID. The public prefix and the category are read from that folder in the registry, never from a URL prefix. A content route whose path lies outside its owner, or equals a folder's path, fails validation (`validateNavigation`).
- **Entries are routes, not tabs.** They never enter `SECTIONS`; the folder count stays 36. An entry's page selects the owner's tabs exactly as the folder's own page does, adds no row, and has no tab of its own: at most three rows, whatever the URL length.
- **Route generation.** The three existing route files list `pageStaticPaths(1 | 2 | 3)`: the registered folders at that depth, then the entries at that depth (`/blog/<slug>/` is level 2, `/lecture-notes/berries/<slug>/` is level 3). They render an entry or a folder's scaffold page from the page's props. There is no catch-all route: an unregistered URL has no page, and a draft's page does not exist in a build.
- **`FolderPage` resolves through `getSiteNavigation()`**, which adds the entries' routes to the folders; `siteNavigation` (the folders alone) stays for the code and tests that need only folders. A build loads the content once; the dev server reloads it per request, so an edited file shows on reload.
- **Static generation and no client router.** Entry pages are ordinary static HTML with ordinary links, with the P09 cross-fade and the folders' two scripts. Nothing hydrates.
- **Output accounting.** The smoke test accepts a page beyond the registered ones only if it declares itself an editorial entry (`data-editorial-*`) that is published or archived, with a URL equal to its collection's prefix plus its slug.
- **Tests.** `tests/content.mjs` tests the model on synthetic records. `tests/editorial-build.mjs` builds throwaway copies of the project with synthetic fixtures from `tests/fixtures/editorial/`, without `brand/` or any private folder, and checks the output; the real `src/content/` stays empty of entries and the real `dist/` is never touched.

## Canonical records (P11)

One authoritative record, many contextual presentations. The rules and fields are in `planning/content-model.md`; this is how the parts join.

```text
src/data/records/*.ts ──► createRecords() ──► siteRecords (frozen store, by family and by ID)
 (typed lists, one per     (src/records/registry.ts)        │
  family; all empty)        1. each record against its       │
                               Zod schema (schema.ts)        ▼
src/design/                 2. records against each     selectors.ts      derived relationships,
 records-fixture.ts ──►        other: IDs, references,   │                orders, what may be shown
 (synthetic; study and         hierarchy, provenance     ├─► citation.ts   one citation per output
  tests only)                                            └─► projections.ts
                                                              cvProjection · portfolioProjection · labProjection
                                                                        │
                                                          future pages (CV, Portfolio, Lab) render these
```

- **Typed static data, not a database and not a collection.** The site's records are TypeScript modules in `src/data/records/`, validated by Zod when `src/records/index.ts` loads; an invalid dataset throws and fails the build. Records do not use Astro's Content Layer: the eight editorial collections stay eight, and `src/content.config.ts` knows nothing of records (D-083).
- **Pure code.** Everything in `src/records/` runs in plain Node.js (erasable TypeScript, D-040), imports only `astro/zod`, reads no file and no network, and knows nothing of navigation, editorial code or Astro. The tests run it directly.
- **Referential integrity at load.** IDs are unique and carry their family in their prefix; every reference must name an existing record of the right family; the one declared hierarchy (an organization's parent) may not loop. All problems are listed together; nothing half-loads.
- **One side stores, the other is derived.** Reverse relationships (a project's outputs, a person's collaborators) are selectors, never data.
- **Projections are view models.** The CV, Portfolio and Lab projections reshape records for a kind of page and hold no facts; every output is cited through `citationOf`, so it reads the same everywhere.
- **Visibility is a rendering rule.** Selectors return only records that are `public` and `verified`; `synthetic` records load only in a store created with `allowSynthetic` (the fixture), never in `siteRecords`. This hides nothing from the public repository, and is documented as such.
- **No routes.** A record creates no page; no route file reads the store except the design study at `/_design/records/`, which shows the synthetic fixture. Entity pages, when approved, will be content routes owned by a folder.
- **Editorial entries may point at records** (`relatedRecords`). The editorial loader asks the store whether each ID exists (`recordReferenceIssues`); the dependency runs one way, editorial → records, so there is no import cycle.
- **Build time only.** Nothing about records runs in the browser: no fetching, no client-side store, no script.
- **Two sources since P11-A01.** `PRODUCTION_RECORDS` is the hand-written records joined with those derived from the CV snapshot (see "The author's CV as a source").
- **Tests.** `tests/records.mjs` (REC-001 to REC-026): schemas, references, projections, immutability, and that neither synthetic nor hidden records reach a page.

## The author's CV as a source (P11-A01)

The owner's professional history is written once, in the author's versioned CV YAML, and the P11 records are derived from it (D-089 to D-093). Fields, states and the mapping are in `planning/content-model.md`, "The author's CV"; this is how the parts join.

```text
ON THE AUTHOR'S MACHINE ONLY (private, ignored by Git)          IN THE REPOSITORY (public)
cv/codex-yaml/CV.proposta.yaml   working proposal
cv/CV-vX.Y.yaml                  explicit versions              cv/manifest.json     which file, which approval
        │                                                       cv/identities.json   source ID → record ID
        ▼  npm run cv:check / cv:snapshot  (scripts/cv.mjs: the only code that opens a CV file)
  src/cv/source.ts     parse YAML; layer A: can it be understood? placeholders allowed
  src/cv/manifest.ts   is a version approved? (switch, version file, fingerprint, version, date)
  src/cv/adapter.ts    layer B: the allowlist; CV sections → P11 record shapes, text kept as written
        │
        ▼  only with an approval
  src/data/cv/snapshot.ts ───────► mergeRecords() ──► PRODUCTION_RECORDS ──► createRecords() ──► siteRecords
  (generated; null today)          (src/cv/snapshot.ts)   ▲                                         │
                                                          │                                         ▼
  src/data/records/independent.ts ────────────────────────┘                      selectors · citation · projections
  (hand-written: projects, areas, organizations, other people)                   (unchanged from P11)
```

- **One direction, read-only.** Nothing writes to a CV file: the tool's single write is the snapshot module (CV-003).
- **Two sides.** `src/cv/source.ts` and `adapter.ts` run only in the tool and the tests; they alone load the YAML parser. The site imports `src/cv/snapshot.ts` and `site.ts`, which have no parser and read no file (CV-018). `yaml` 2.9.1 is a development dependency for that reason; it was already installed through Astro.
- **A build never needs the CV.** GitHub Actions has no CV file and needs none: it reads the committed snapshot, or nothing (CV-015, CV-017). The tool is not part of `build`, `dev` or `verify`.
- **Publication is explicit.** `publicationDecision` reads `cv/manifest.json` and the approved file's fingerprint and version. It reads nothing the CV says about itself.
- **An allowlist, checked twice.** The adapter reads only the fields its builders name; the site re-checks the snapshot on load (`snapshotIssues`).
- **One source per fact.** `mergeRecords` refuses an ID on both sides and a hand-written fact of the owner's CV. The CV never creates a project record: it relates outputs to projects the site describes.
- **P11 is unchanged in kind.** Schemas, registry, selectors, projections and the citation still do the work. P11-A01 extended the schemas so that a record may keep a source's text as written (D-091).
- **Tests.** `tests/cv.mjs` (CV-001 to CV-020), on a synthetic fixture in `tests/fixtures/cv/`, with one throwaway build.

## Editorial reading layouts (P12)

- **One shell, eight thin layouts (D-094).** `EditorialArticle` draws the article; `src/layouts/editorial/<Name>Layout.astro` supplies what is particular (slots `before`, `header`, body, `after`). `layouts.ts` maps collection to layout once, for the routes and for the study. Index components for each collection are in `src/components/editorial/indexes/`, chosen by `CollectionIndex`.
- **Reading logic (D-096)** is pure, in `src/editorial/reading.ts`, and runs in Node, so the build and the tests share it. `site.ts` supplies the real entries (`readingContextFor`, `collectionIndexFor`).
- **Markdown** is rendered by Astro (`render(entry)`); its heading list builds the contents. There is no second parser. A level-1 heading fails the build.
- **Static rendering:** every page is a static file; the only client script is still the folder previews. Contents, previous and next, spoiler notes and chapter lists are plain HTML.
- **Folder integration:** the three route files render `EditorialEntry` for an entry and `CollectionOverview` for a folder that owns a collection; `FolderPage` resolves an entry's URL to its owner folder, so an article adds no row of tabs (CONT-012, EDIT-005).
- **CSS:** `src/styles/editorial.css`, imported by `FolderPage`, so all pages share one stylesheet set; tokens at the end of the space section of `tokens.css`.
- **Fixtures (D-097):** the synthetic fixture is `src/design/editorial-fixture.ts` and `src/design/editorial/*.md`, imported only by the study pages under `src/pages/[design]/editorial/`. `import.meta.glob` renders the fixture's Markdown with Astro's own pipeline. The study is excluded from nothing today; it lives under `dist/_design/`, which the deployment decision (D-005) may leave out whole.
- **Layers kept apart:** no editorial file imports `src/cv/` or names a CV file (EDIT-021).

## Quarto and Astro (P13)

**Astro owns the website; Quarto prepares scientific documents for it (D-098).** Quarto owns no URL, no navigation, no page shell, no stylesheet and no deployment. A Quarto source becomes an ordinary P10 entry, with one address, one publication state and one metadata record.

### Strategy chosen, and the alternatives tried (D-099)

The same small document (equations, a figure, a table, a citation, a footnote, a callout, code) was rendered both ways.

| | Quarto to HTML, the body taken | Quarto to GFM Markdown |
| --- | --- | --- |
| Equations | MathML, numbered, anchored (`<span id="eq-…">`) | `$$` text; needs a Markdown math plugin and a math runtime |
| Figures and tables | `<figure>` with `<figcaption>`, numbered, anchored | a `<div>` with the caption as a paragraph; no figure semantics |
| Cross-references and citations | links to anchors; `#ref-…` entries | links survive as raw HTML; citations as plain text |
| Callouts | structured `div.callout` | GitHub alerts, which Astro does not render |
| Footnotes | `doc-endnotes` section with backlinks | Markdown footnotes (kept) |
| Code output | cells with output blocks | fenced blocks, output lost |

**Selected: Quarto to HTML**, the article body extracted with a real HTML parser. GFM lost the scientific semantics the task needs. `minimal: true` was tried and rejected: it turns callouts into bare blockquotes and drops the page structure, so the default HTML is rendered and cleaned instead. Native MathML means there is **no math library at all** (no MathJax, no KaTeX, no CDN, no script), so pages without mathematics cost nothing and pages with it cost nothing extra.

### The pipeline

```
science/<dir>/<name>.qmd  ──(explicit, trusted)──►  quarto render  ──►  science/_build/…html (ignored)
        │                                                                     │
        │  science:execute runs the code once and freezes the results         │ science-html.mjs: parse, allowlist,
        │  into science/_freeze/ (committed); science:render never computes   │ drop chrome, move ids, check links
        ▼                                                                     ▼
 front matter (the one place metadata is written)         src/science/<dir>/<name>.html   the article (committed)
        └──► validated with the collection's schema ──►   src/content/<dir>/<name>.md     the entry (metadata only)
                                                          public/assets/scientific/…      figures (committed)
                                                          src/science/manifest.json       fingerprints (committed)
```

- **Build stages:** `npm run build` = `science:verify` (offline: hashes, no Quarto, no Python) then `astro build`. Astro then loads the entry as it loads any entry, finds the manifest's document for it (`src/science/index.ts`) and gives the layout the fragment instead of rendered Markdown (`EditorialEntry.astro`). There is no cycle: Quarto never runs inside Astro, and Astro never reads a source.
- **Missing or outdated derivative:** `verify` fails the build and names the command to run. Missing Quarto affects only `render` and `execute`; editing Markdown needs nothing.
- **Execution policy (D-102):** code runs only through `npm run science:execute -- <dir>/<name>`, one named document, in the owner's environment. `render` passes `--use-freezer` (or `--no-execute` for a document without code) and succeeds with no Python at all (tested). Quarto's `freeze` is not relied on as a barrier; the tool's own gate refuses to render a document whose code changed since it was executed. Processes start with an argument list, never a shell string, and a document is named `<dir>/<name>` with a fixed pattern.
- **Artifact policy (D-103):** sources, bibliographies and `_quarto.yml` are authoritative; `_freeze/` (results) and the generated article, entry, figures and manifest are committed, so CI builds without the toolchain; `_build/` and `.quarto/` are ignored. The manifest holds SHA-256 fingerprints of the inputs, of the code cells, of the frozen results and of every output, plus the Quarto and Python versions of the last execution; it holds no timestamp. Staleness is a changed fingerprint, never a clock.
- **Reproducibility:** the demonstration is seeded standard-library Python. Two independent executions in clean directories give byte-identical articles, entries and figures, and match the committed fixture (QTO-017, QTO-018). That shows the pipeline is deterministic for this code on this toolchain; it does not show that any real analysis is reproducible.

### Trust boundary (D-100)

Sources are the owner's, rendered on the owner's machine. `scripts/science-html.mjs` still treats Quarto's output as untrusted: it keeps an allowlist of tags, attributes and MathML, drops scripts, styles, buttons and Quarto's page chrome (the title block, the copy button, anchor scripts), removes `style` attributes (a table column's alignment becomes a class), allows only `#fragment`, `http(s)` and `mailto` links, and only a figure file inside the document's own build folder as an image source (no external image, no `..`, no absolute path, a size cap, no script or external reference inside an SVG). Inline SVG, iframes and objects are refused. Anything else in the page fails the render with the reason. `verify` runs the same checks again on the stored article, and the stored article must come back unchanged, so markup added later is caught.

### Assets and ids

Figures go to `public/assets/scientific/<dir>/<name>/` (a namespace per document, so names never collide) and the article refers to them by that absolute path. Pandoc's section ids move to their headings, so the ids that P12's contents list links to are on the headings; Quarto's random figure-caption identifiers are removed so the output is the same every time; duplicate ids, links without a target and unresolved cross-references or citations fail the render. The article's ids may not use the ones the page owns.

### Dependencies

One development dependency, `ultrahtml` 1.7.0, pinned exactly: the HTML parser Astro itself uses, already installed (D-100). It is imported by the tool and its tests only; no page does. Quarto and Python are not dependencies of the repository.


## Scientific environment and demonstrations (P13-A01)

Three toolchains, one owner each (D-104):

```text
GusmaoLab
├── npm            Astro, TypeScript, CSS, tests          package.json + lockfile
├── Quarto         document rendering (separate install)  science/_quarto.yml: quarto-required
└── micromamba     environment gusmaolab-science          environments/science/environment.yml
    └── uv         every Python package                   requirements.in -> requirements.txt (hashes)
```

`scripts/science-env.mjs` resolves the interpreter (SCIENCE_PYTHON, QUARTO_PYTHON, then the named micromamba environment, never the PATH's `python3`), checks it against the lock in both directions, and runs Quarto with `QUARTO_PYTHON` and the environment's own kernel directory. Building the site needs none of it (`science:verify` is offline). The full guide, versions and Homebrew notes are `development/scientific-environment.md`.

Demonstrations (D-105, D-106) are synthetic Greenhouse entries in `src/demos/`, loaded as the Astro collection `greenhouseDemos` (the Greenhouse schema plus `synthetic: true`). They enter the site's entries only when Astro's mode is `development` or `demo` (`src/editorial/demo.ts`); with them in, everything else is the ordinary pipeline (`EditorialEntry`, the Greenhouse layout, routes under the Greenhouse folder). Demonstrations are read among themselves, never as the neighbours of a real entry, and the Greenhouse Overview lists them under "Development Demonstrations", below its real list. Figures of a Quarto demonstration are served by `src/pages/demo-assets/[name]/[file].svg.ts`, not copied from `public/`. Release: `scripts/public-build.mjs` (`npm run build`) builds in production mode in a cleaned environment and searches its output for any trace; demonstration build: `scripts/demo.mjs` (`npm run demo:build`) writes `dist-demo/`.

## Colour architecture (P09-A01)

Colour is the Chromatic Archive: five locked category palettes and four shared colours (D-076; `planning/design-system.md`, section 7).

```text
registry.ts            each top-level section: category (colour), environment (typography)
      │                descendants inherit both
      ▼
siteNavigation.resolve(url) ──► state.category, state.environment, and each tab's own category
      │
      ├─► BaseLayout   <html data-category data-environment>   flannel, shell, paper, type
      └─► FolderStack  <div class="gl-folders" data-category>  open bodies, levels 2 and 3
              └─► FolderTab  <li data-category>  (top level)   the tab's own permanent cardstock

tokens.css        global tokens on :root (shell, links, accent, V, text inks, focus)
                  and the aliases, recomputed on :root, [data-environment], [data-category]
categories.css    the 25 locked colours and five tokens per [data-category]: the only source
environments.css  ten typography and texture tokens per [data-environment]; no colour
```

1. **One source of truth.** The five palettes are declared in `src/styles/categories.css` and nowhere else; `CATEGORIES` and `CATEGORY_TOKENS` in `src/design/contract.mjs` name them for the tests. Which section has which category is declared in the registry and nowhere else.
2. **Global and category tokens are separate.** The shell, links, the accent and the V are global tokens on `:root`; no category or environment can set them (CAT-004, CAT-007).
3. **A tab's colour never depends on the page.** Every top-level tab carries its own `data-category`, and the aliases recompute there, so no page-level attribute can recolour it (CAT-008, CAT-011). The route decides only the active category: the open body, the paper and the flannel.
4. **Components stay generic.** `folders.css` names no category and no environment; the tests reject both kinds of selector.
5. **No script and no router.** The colours are static markup and CSS. Moving between categories is an ordinary page load, with the existing cross-fade (D-071).
6. **Checks.** `tests/categories.mjs` (CAT-001 to CAT-010, in `npm test`) fixes the eleven tabs, the category of every section and every locked colour; `tests/categories-browser.mjs` (CAT-011 to CAT-017, in `npm run test:browser`) checks the painted colours in headless Chrome; `tests/contrast.mjs` checks 260 pairings.

## Repository layout after P09

| Path | Role |
| --- | --- |
| `src/content/` | The editorial collections: one directory per collection, one Markdown file per entry (D-078). Empty of entries since P10. |
| `src/content.config.ts` | Astro's content configuration: the eight collections, their loaders and schemas |
| `src/data/records/` | The hand-written (independent) canonical records: one typed list per family (D-083), joined with the CV snapshot in `index.ts` (D-089). Empty since P11. |
| `src/data/cv/` | `snapshot.ts`: the generated public CV snapshot (D-092); `null` until the owner approves a version |
| `src/cv/` | The CV integration: `source.ts` and `adapter.ts` (tool side: YAML, authoring validation, the allowlist), `manifest.ts`, `versions.ts`, `snapshot.ts` and `site.ts` (site side); pure |
| `scripts/cv.mjs` | The CV tool: `check` and `snapshot`. The only code that opens a CV file; never part of a build |
| `cv/` | `manifest.json`, `identities.json`, `README.md` (tracked); the author's CV files (ignored by Git, D-093) |
| `src/records/` | The record model: schemas, dates, registry, selectors, projections, citation; pure. Not `src/lib/`, which the root `.gitignore` would hide. |
| `src/editorial/` | The editorial model: collection registry, schemas, routing rules, date guard (pure), and `site.ts` (Astro) |
| `src/components/editorial/` | `EditorialEntry` and `CollectionIndex` |
| `src/pages/` | Route files: Home (`index.astro`) and one generated route per tab level (`[section]/…`, D-053; folders and entries since P10); the temporary design studies in `[design]/` (`tokens.astro` at `/_design/tokens/`, `folders.astro` at `/_design/folders/`, since P09 `bearnard.astro` at `/_design/bearnard/`, and since P11 `records.astro` at `/_design/records/`; D-048, D-055, D-073, D-087) |
| `src/layouts/` | `BaseLayout` (document, styles, category, environment) and `FolderPage` (a page inside the folders; D-053, D-054) |
| `src/components/folders/` | `FolderStack`, `FolderLayer`, `FolderTabStrip`, `FolderTab` and `FolderPreview` (D-043, D-059) |
| `src/components/bearnard/` | `BearnardIllustration`: one approved Bearnard illustration, by role or ID (D-073) |
| `src/illustrations/` | `bearnard.ts`: the Bearnard illustration registry (D-073) |
| `public/illustrations/bearnard/` | Committed web derivatives of approved Bearnard masters; the only files in `public/` (D-073, D-074) |
| `scripts/bearnard_derivatives.py` | Generates those derivatives and their provenance, by hand; needs Pillow |
| `src/scripts/` | `folder-previews.ts` (D-060) and `folder-rows.ts` (D-066): the folders' client-side modules. Not `src/lib/`, which the root `.gitignore` would hide. |
| `src/components/scaffold/` | `ScaffoldContent`: the temporary development content of the folder pages until the content prompts |
| `src/styles/` | `tokens.css` (global tokens and aliases), `categories.css` (the five locked category palettes, and the only place that declares them; D-076), `environments.css` (typography and texture) and `global.css`, loaded by BaseLayout; `folders.css`, loaded only by `FolderStack` |
| `src/design/` | The token contract and the CSS token reader, shared by the specimen and the tests; and the synthetic record fixture, shared by the records study and the tests |
| `src/navigation/` | Navigation types, registry and helpers; `index.ts` exports the compiled `siteNavigation`. Not `src/lib/`, which the root `.gitignore` would hide (KL-11). |
| `tests/` | Token, contrast, navigation, build-output, folder-component, route and preview checks; `html-tree.mjs` is their shared HTML reader; `browser-harness.mjs` drives headless Chrome for `previews-browser.mjs`, `responsive-browser.mjs` and `transitions-browser.mjs`; `bearnard.mjs` checks the illustrations (P09) |
| `.claude/launch.json` | Local preview servers for the Claude desktop app (D-034) |
| `astro.config.mjs`, `tsconfig.json` | Astro and TypeScript configuration |
| `package.json`, `package-lock.json`, `.node-version` | npm project, lockfile and Node.js version policy |
| `planning/` | Requirements and specifications |
| `development/` | Roadmap, current state, decisions, logs, acceptance gates, releases |
| `debugging/` | Issues, regressions, known limitations, investigations |
| `assets/bearnard/` | Bearnard inventory and checksums, and since P09 `derivatives.json`, the provenance of the web derivatives. The masters stay in `brand/bearnard/`, which is gitignored. |
| `_backup/pelican-legacy/` | Archived Pelican site. Not a build input. |
| `brand/` | Brand assets |
| `docs/` | Pelican-era planning notes; several are empty placeholders |
| `cv/`, `publications/`, `scripts/`, `data/`, `hyperglam/` | Retained from the old plan; every tracked file in them is empty, except `scripts/bearnard_derivatives.py` (above) |
| `.github/workflows/` | Eight placeholder workflows, all commented out. No active workflow. |
| `.pre-commit-config.yaml`, `.editorconfig`, `.prettierrc`, `.prettierignore` | Formatting and commit-hook configuration |
| `_books/`, `_papers/`, `_references/`, `_reports/` | Private workspace, gitignored. Never commit. |
| `backup/`, `releases/`, `resources/`, `viz/`, `_logo/` | Empty, untracked placeholder folders |

`public/` was created in P09 for the Bearnard derivatives (D-019, D-073); `src/components/` was created in P05. The site ships two images (the Bearnard portrait at two widths, used only by a design study so far), no font files, and one inlined script (P07, extended in P08). It builds 40 pages: 36 folder pages and 4 design studies.

## Deployment

- **Legacy:** `_backup/pelican-legacy/.github/workflows/deploy.yml` built Pelican on every push to `main` and force-pushed the output to `eduardogade/eduardogade.github.io` using the `PAGES_DEPLOY_TOKEN` secret. The custom domain came from `content/extra/CNAME` (`www.gusmaolab.org`). The workflow is archived and inactive.
- **New:** **To be decided**: target repository, workflow, and whether the CNAME and token carry over (D-005). P02 and P03 changed nothing related to deployment.

## Local tooling (checked 2026-11-10)

| Tool | Found |
| --- | --- |
| Node.js | v26.12.0 (Homebrew). The 26 line has been LTS since v26.13.0 (2026-10-28); this build predates that and lacks the v26.12.1 security release. |
| npm | 11.20.0. pnpm, yarn and bun are not installed. |
| Git | 2.56.0 |
| Python | 3.12.2 via pyenv (`.python-version` says 3.12) |
| Quarto | 1.10.19 |
| conda | 25.11.1. The pre-commit hook runs from the micromamba environment `web`, defined by the archived `environment.yml`. |

## Authoring workflow (P14)

How an article is written and published, kept apart from how it is built (D-107 to D-111; `development/authoring-guide.md`).

```text
author edits one file ─ npm run content:validate ─ content:preview ─ content:publish --yes ─ git commit ─ (later, deliberately) deploy
        │                         │                       │                   │
   .md or .qmd              analyze()               dev server         edits status/publishedAt only
```

| Layer | Where | Role |
| --- | --- | --- |
| Definitions | `src/editorial/authoring.ts` | Formats per collection, per-collection fields, templates, the command list, the check list, the lifecycle text. Data and pure functions; runs in Node and in Astro pages |
| Engine | `scripts/content-lib.mjs` | Reads the workspace, `analyze()` (the one preflight), `createArticle`, `publishArticle`, `archiveArticle`, `previewInfo`. No output of its own; every function takes the project root |
| Commands | `scripts/content.mjs` | `new`, `validate`, `preview`, `publish`, `archive`, exposed as `npm run content:<command>`. Explicit arguments, no prompts, exit 0/1 (2 for a bad command line) |
| Reused, not copied | `schema.ts`, `model.ts`, `reading.ts`, `src/navigation`, `src/records`, `scripts/science.mjs` | The same functions the build uses decide validity, identity, references, addresses and Quarto freshness |
| Workbench | `src/pages/[design]/publishing/`, `src/design/publishing/` | A read-only, development-only view of the same lists, with a verified real-output transcript |

- **Source of truth.** Markdown: `src/content/<dir>/<slug>.md`. Quarto: `science/<dir>/<slug>.qmd`; the generated registration, fragment and figures are derived (D-098). A draft and its Quarto article are checked together: stale, missing, hand-edited or unexecuted output is an error, and only `science:render` and `science:execute` repair it.
- **Atomicity.** Every refusal is decided before a byte is written. Creation opens the file exclusively (a race cannot overwrite). Publication and archiving change two lines at most; for Quarto they re-register the article afterwards and restore the source if that fails.
- **Execution.** No content command executes code: `buildDocument` is only ever called with `execute: false`, and a test searches the tool for any way to execute. `npm run build` is unchanged: offline `science:verify`, then the release build.
- **Drafts.** The dev server routes drafts (`routeOptions`, P10); a build never does. The tool does not change this; it makes a draft easy to create and to see.
- **Not part of the site.** The tool is development tooling: no page imports `scripts/`, and `src/editorial/authoring.ts` is imported only by the workbench.
- **Not done:** a web editor, a database, authentication, server-side writes, deletion, redirects, slug renaming, automatic commits or deployment.

## Homepage (P15)

The homepage is composed, not generated: `src/pages/index.astro` fetches the recent Blog entries and hands them to `src/components/home/HomePage.astro`, which orders five region components. Data stays out of the components and out of the page: `src/home/archive.ts` (registry-derived links), `src/home/clocks.ts` (eight locations, IANA zones), `src/home/updates.ts` (the selector, over `src/editorial/model.ts`'s `indexItems`). All three are erasable TypeScript so that Node tests run them (D-040).

- **Navigation source.** Labels and URLs come from `siteNavigation.node(id)`; the page writes no URL.
- **Blog source.** `homeRecentUpdates()` in `src/editorial/site.ts` passes the loaded entries, without demonstrations, to `recentUpdates()`. The Blog's index and the homepage therefore agree on eligibility and order.
- **Bearnard.** `<BearnardIllustration variant="bearnard-v1.3-portrait">`, through the registry (D-073). The `home-welcome` role stays unassigned.
- **Nucleus integration point.** The `visual` slot and the `state` prop of `NucleusStage`; nothing else on the page knows of it.
- **Clock integration point.** `[data-clock-id][data-time-zone]` rows with a `[data-clock-reading]` area. P16 fills them (below).
- **Specimen.** `src/pages/[design]/home/index.astro` (development and demonstration builds only, D-117) draws `HomePage` with `src/design/home-fixture.ts`. The release guard `scripts/demo-check.mjs` searches `dist/` for it.
- **Styles.** `src/styles/home.css`, global, imported by `BaseLayout.astro`: every page loads one stylesheet set (RESP-013), so the components carry no scoped style.
- **No new dependency, script or client-side code.**

## World clocks (P16)

Four small parts, all erasable TypeScript (D-040), none importing a library (D-118 to D-121):

- `src/home/clocks.ts`, the one list of eight places and zones (P15).
- `src/home/clock-time.ts`, pure: `readClock(instant, zone)` returns the 24-hour time, weekday, date and machine-readable date and date-time from `Intl.DateTimeFormat`'s `formatToParts`; `tryReadClock` returns `null` for a zone it cannot format; `msToNextMinute`. No `Date.now`, no DOM.
- `src/home/clock-loop.ts`: `createClockLoop(env)`, one timer aimed at the next minute, recomputed from the real time on every tick, none while hidden; given its clock and timers so tests drive it.
- `src/scripts/world-clocks.ts`: the DOM binding, bundled and inlined by Astro from `WorldClocks.astro`; it takes over only `[data-clocks-state="loading"]` regions, writes `<time datetime>` elements, and listens to `visibilitychange`, `pageshow` (persisted) and `pagehide`.

Lifecycle: the page is static; the clocks start when the script runs, draw from one `Date.now()`, and stop with the page. There is no time server: the device clock is the source. The development specimen `/_design/world-clocks/` renders `WorldClocks` with an `instant` at build time and marks it `simulated`, which the script ignores. Runtime cost: one timer, eight formatter lookups per minute, a handful of text writes only when the minute changes; no animation, observer or interval.
