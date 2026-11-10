# Architecture

Status: approved direction recorded in P01. The Astro foundation was set up in P02 and the design-token foundation in P03 (2026-11-10). The visual interface is not implemented.

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
| TypeScript | Extends `astro/tsconfigs/strict`; excludes `dist`, `_backup`, `brand` and the private folders |
| Diagnostics | `astro check`, using `@astrojs/check` 0.9.12 and TypeScript 6.0.3 |
| Styles | Native CSS custom properties in `src/styles/`, imported by `BaseLayout` (D-026). No CSS framework or preprocessor. |
| Environments | `data-environment` on `<html>` via BaseLayout's `environment` prop, or on any element (D-027) |
| Tests | `npm test` runs `tests/design-tokens.mjs`, `tests/contrast.mjs` and `tests/smoke-test.mjs` (D-032) |

## Repository layout after P03

| Path | Role |
| --- | --- |
| `src/pages/`, `src/layouts/` | Astro source: the temporary design specimen and one shared layout |
| `src/styles/` | `tokens.css`, `environments.css` and `global.css` |
| `src/design/` | The token contract and the CSS token reader, shared by the specimen and the tests |
| `tests/` | Token, contrast and build-output checks |
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

`src/components/` and `public/` do not exist yet (D-019). The site ships no JavaScript, images or font files.

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
