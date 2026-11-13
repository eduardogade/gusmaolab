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
| `src/editorial/` | The editorial model: collection registry, schemas, routing rules, date guard (pure), and `site.ts` (Astro) |
| `src/components/editorial/` | `EditorialEntry` and `CollectionIndex` |
| `src/pages/` | Route files: Home (`index.astro`) and one generated route per tab level (`[section]/…`, D-053; folders and entries since P10); the temporary design studies in `[design]/` (`tokens.astro` at `/_design/tokens/`, `folders.astro` at `/_design/folders/`, and since P09 `bearnard.astro` at `/_design/bearnard/`; D-048, D-055, D-073) |
| `src/layouts/` | `BaseLayout` (document, styles, category, environment) and `FolderPage` (a page inside the folders; D-053, D-054) |
| `src/components/folders/` | `FolderStack`, `FolderLayer`, `FolderTabStrip`, `FolderTab` and `FolderPreview` (D-043, D-059) |
| `src/components/bearnard/` | `BearnardIllustration`: one approved Bearnard illustration, by role or ID (D-073) |
| `src/illustrations/` | `bearnard.ts`: the Bearnard illustration registry (D-073) |
| `public/illustrations/bearnard/` | Committed web derivatives of approved Bearnard masters; the only files in `public/` (D-073, D-074) |
| `scripts/bearnard_derivatives.py` | Generates those derivatives and their provenance, by hand; needs Pillow |
| `src/scripts/` | `folder-previews.ts` (D-060) and `folder-rows.ts` (D-066): the folders' client-side modules. Not `src/lib/`, which the root `.gitignore` would hide. |
| `src/components/scaffold/` | `ScaffoldContent`: the temporary development content of the folder pages until the content prompts |
| `src/styles/` | `tokens.css` (global tokens and aliases), `categories.css` (the five locked category palettes, and the only place that declares them; D-076), `environments.css` (typography and texture) and `global.css`, loaded by BaseLayout; `folders.css`, loaded only by `FolderStack` |
| `src/design/` | The token contract and the CSS token reader, shared by the specimen and the tests |
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

`public/` was created in P09 for the Bearnard derivatives (D-019, D-073); `src/components/` was created in P05. The site ships two images (the Bearnard portrait at two widths, used only by a design study so far), no font files, and one inlined script (P07, extended in P08). It builds 39 pages: 36 folder pages and 3 design studies.

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
