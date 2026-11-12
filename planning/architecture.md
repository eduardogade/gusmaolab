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
| Environments | `data-environment` on `<html>` via BaseLayout's `environment` prop, or on any element (D-027) |
| Navigation | A typed, declarative registry in `src/navigation/` (D-036–D-039), with Overview display tabs (D-050–D-052) |
| Folder components | `src/components/folders/` and `src/styles/folders.css`: static Astro components that draw a navigation state as linked folder tabs (D-043–D-047, D-054), with server-rendered folder previews (D-058, D-059) |
| Client-side script | Two small modules, bundled and inlined by Astro as one `<script type="module">` per page with folders (4.1 KB since P09; KL-36): `src/scripts/folder-previews.ts` shows and hides the previews (D-060); `src/scripts/folder-rows.ts` opens rows at their selected tab where the browser cannot and keeps keyboard focus clear of the row edges (D-066) |
| Pages | One route file per tab level, generated from the registry; `FolderPage` layout (D-053) |
| Tests | `npm test` runs `tests/design-tokens.mjs`, `tests/contrast.mjs`, `tests/navigation.mjs`, `tests/smoke-test.mjs`, `tests/folders.mjs`, `tests/routes.mjs` and `tests/previews.mjs` (D-032, D-040). `npm run test:browser` runs `tests/previews-browser.mjs` and `tests/responsive-browser.mjs` in a local headless Chrome, through `tests/browser-harness.mjs` (D-062, D-069). `tests/responsive.mjs` is part of `npm test`. |

## Navigation and Astro routes

Two systems, kept separate, and one layout that joins them:

- **Navigation** (`src/navigation/`) decides which folder tabs exist, their order, URLs and environments, and what each URL shows: which tabs are selected in which rows, where the Overview tabs are, and which tab stands for the page. It is pure data and functions, evaluated at build time, with no client-side router and no server.
- **Routing** stays Astro's: files in `src/pages/` and, later, content collections produce the pages. The registry creates no pages by itself; the route files ask it which pages to build.
- **Folders** (`src/components/folders/`, P05) draw one resolved navigation state. They hold no navigation data of their own.
- **`FolderPage`** (`src/layouts/FolderPage.astro`, P06) is the join. It resolves the page's own URL (`Astro.url.pathname`), passes the environment to `BaseLayout`, and draws `FolderStack` with the page's content in `<main>` inside the deepest folder. A page provides only its content.

```text
registry.ts ──► createNavigation() ──► siteNavigation
                                        │  folderStaticPaths(level)   resolve(url)
                                        ▼                              ▼
src/pages/ route file per level ──► FolderPage ──► BaseLayout (environment)
          (which pages exist)          │
                                        └► FolderStack ► FolderLayer ► FolderTabStrip ► FolderTab
                                               └ page content (slot) in <main> on the deepest folder's paper
```

The contract (`information-architecture.md`, sections 12 and 14):

1. Folder pages are generated from the registry by `src/pages/index.astro`, `[section]/index.astro`, `[section]/[folder]/index.astro` and `[section]/[folder]/[subfolder]/index.astro`, each listing `siteNavigation.folderStaticPaths(level)` (D-053). They are never maintained by hand per section.
2. Content routes (Wave III) are built from collections, registered with an owning folder, and generate their pages from the same list. They live under static segments, which outrank the dynamic folder routes, and render through `FolderPage`, so their content opens in the owner's body.
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

## Repository layout after P09

| Path | Role |
| --- | --- |
| `src/pages/` | Route files: Home (`index.astro`) and one generated route per tab level (`[section]/…`, D-053); the temporary design studies in `[design]/` (`tokens.astro` at `/_design/tokens/`, `folders.astro` at `/_design/folders/`, and since P09 `bearnard.astro` at `/_design/bearnard/` and `environments-v2.astro` at `/_design/environments-v2/`; D-048, D-055, D-073, D-075) |
| `src/layouts/` | `BaseLayout` (document, styles, environment) and `FolderPage` (a page inside the folders; D-053, D-054) |
| `src/components/folders/` | `FolderStack`, `FolderLayer`, `FolderTabStrip`, `FolderTab` and `FolderPreview` (D-043, D-059) |
| `src/components/bearnard/` | `BearnardIllustration`: one approved Bearnard illustration, by role or ID (D-073) |
| `src/illustrations/` | `bearnard.ts`: the Bearnard illustration registry (D-073) |
| `public/illustrations/bearnard/` | Committed web derivatives of approved Bearnard masters; the only files in `public/` (D-073, D-074) |
| `scripts/bearnard_derivatives.py` | Generates those derivatives and their provenance, by hand; needs Pillow |
| `src/scripts/` | `folder-previews.ts` (D-060) and `folder-rows.ts` (D-066): the folders' client-side modules. Not `src/lib/`, which the root `.gitignore` would hide. |
| `src/components/scaffold/` | `ScaffoldContent`: the temporary development content of the folder pages until the content prompts |
| `src/styles/` | `tokens.css`, `environments.css` and `global.css`, loaded by BaseLayout; `folders.css`, loaded only by `FolderStack`; `environment-candidates.css`, the proposed environments, loaded only by the environments study and never by a site page (D-075) |
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

`public/` was created in P09 for the Bearnard derivatives (D-019, D-073); `src/components/` was created in P05. The site ships two images (the Bearnard portrait at two widths, used only by a design study so far), no font files, and one inlined script (P07, extended in P08). It builds 41 pages: 37 folder pages and 4 design studies.

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
