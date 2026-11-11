# Architecture

Status: approved direction recorded in P01. The Astro foundation was set up in P02, the design-token foundation in P03, the navigation data model in P04 and the physical folder components in P05 (2026-11-10). P06 (2026-11-11) connected them: every registered folder has a generated page inside the folders, with temporary content. The owner approved the folder appearance (D-049) and the P06 navigation (D-057).

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
| Folder components | `src/components/folders/` and `src/styles/folders.css`: static Astro components that draw a navigation state as linked folder tabs, with no client-side JavaScript (D-043–D-047, D-054) |
| Pages | One route file per tab level, generated from the registry; `FolderPage` layout (D-053) |
| Tests | `npm test` runs `tests/design-tokens.mjs`, `tests/contrast.mjs`, `tests/navigation.mjs`, `tests/smoke-test.mjs`, `tests/folders.mjs` and `tests/routes.mjs` (D-032, D-040) |

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
4. There is no catch-all route, no server rendering, no client-side router and no hydration: tabs are plain links, and Back, Forward and reload work as on any static site.
5. Temporary design studies live under `/_design/` (D-048, D-055). Whether they are excluded from a published build is part of the deployment decision (D-005).

## Repository layout after P06

| Path | Role |
| --- | --- |
| `src/pages/` | Route files: Home (`index.astro`) and one generated route per tab level (`[section]/…`, D-053); the two temporary design studies in `[design]/` (`tokens.astro` at `/_design/tokens/`, `folders.astro` at `/_design/folders/`; D-048, D-055) |
| `src/layouts/` | `BaseLayout` (document, styles, environment) and `FolderPage` (a page inside the folders; D-053, D-054) |
| `src/components/folders/` | `FolderStack`, `FolderLayer`, `FolderTabStrip` and `FolderTab` (D-043) |
| `src/components/scaffold/` | `ScaffoldContent`: the temporary development content of the folder pages until the content prompts |
| `src/styles/` | `tokens.css`, `environments.css` and `global.css`, loaded by BaseLayout; `folders.css`, loaded only by `FolderStack` |
| `src/design/` | The token contract and the CSS token reader, shared by the specimen and the tests |
| `src/navigation/` | Navigation types, registry and helpers; `index.ts` exports the compiled `siteNavigation`. Not `src/lib/`, which the root `.gitignore` would hide (KL-11). |
| `tests/` | Token, contrast, navigation, build-output, folder-component and route checks; `html-tree.mjs` is their shared HTML reader |
| `.claude/launch.json` | Local preview servers for the Claude desktop app (D-034) |
| `astro.config.mjs`, `tsconfig.json` | Astro and TypeScript configuration |
| `package.json`, `package-lock.json`, `.node-version` | npm project, lockfile and Node.js version policy |
| `planning/` | Requirements and specifications |
| `development/` | Roadmap, current state, decisions, logs, acceptance gates, releases |
| `debugging/` | Issues, regressions, known limitations, investigations |
| `assets/bearnard/` | Bearnard inventory and checksums. The images stay in `brand/bearnard/`, which is gitignored. |
| `_backup/pelican-legacy/` | Archived Pelican site. Not a build input. |
| `brand/` | Brand assets |
| `docs/` | Pelican-era planning notes; several are empty placeholders |
| `cv/`, `publications/`, `scripts/`, `data/`, `hyperglam/` | Retained from the old plan; every tracked file in them is empty |
| `.github/workflows/` | Eight placeholder workflows, all commented out. No active workflow. |
| `.pre-commit-config.yaml`, `.editorconfig`, `.prettierrc`, `.prettierignore` | Formatting and commit-hook configuration |
| `_books/`, `_papers/`, `_references/`, `_reports/` | Private workspace, gitignored. Never commit. |
| `backup/`, `releases/`, `resources/`, `viz/`, `_logo/` | Empty, untracked placeholder folders |

`public/` does not exist yet (D-019); `src/components/` was created in P05. The site ships no JavaScript, images or font files. P06 built 39 pages: 37 folder pages and 2 design studies.

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
