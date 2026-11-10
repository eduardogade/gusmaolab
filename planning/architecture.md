# Architecture

Status: approved direction recorded in P01 (2026-11-10). Astro is **not installed yet**. P02 initializes it.

## Approved direction

- Astro static site, with static generation by default.
- TypeScript where appropriate.
- Semantic HTML and CSS.
- Minimal, isolated client-side JavaScript, only where a feature needs it.
- Markdown-first authoring.
- Python and Quarto for scientific workflows when appropriate.
- A separate external service for booking where necessary. Booking credentials never go in the repository.
- Deployment to GitHub Pages.

## Repository layout after P01

| Path | Role |
| --- | --- |
| `planning/` | Requirements and specifications |
| `development/` | Roadmap, current state, decisions, logs, acceptance gates, releases |
| `debugging/` | Issues, regressions, known limitations, investigations |
| `assets/bearnard/` | Bearnard inventory and checksums. The images stay in `brand/bearnard/`, which is gitignored. |
| `_backup/pelican-legacy/` | Archived Pelican site. Not a build input. |
| `brand/` | Brand assets |
| `docs/` | Pelican-era planning notes; several are empty placeholders |
| `cv/`, `publications/`, `scripts/`, `data/`, `hyperglam/` | Retained from the old plan; every tracked file in them is empty |
| `.github/workflows/` | Eight placeholder workflows, all commented out. No active workflow. |
| `package.json`, `.pre-commit-config.yaml`, `.editorconfig`, `.prettierrc` | Repository tooling (Prettier, pre-commit) |
| `_books/`, `_papers/`, `_references/`, `_reports/` | Private workspace, gitignored. Never commit. |
| `backup/`, `releases/`, `resources/`, `viz/`, `_logo/` | Empty, untracked placeholder folders |

Astro's own files (`src/`, `public/`, configuration and lockfile) are added in P02.

## Deployment

- **Legacy:** `_backup/pelican-legacy/.github/workflows/deploy.yml` built Pelican on every push to `main` and force-pushed the output to `eduardogade/eduardogade.github.io` using the `PAGES_DEPLOY_TOKEN` secret. The custom domain came from `content/extra/CNAME` (`www.gusmaolab.org`). The workflow is archived and inactive, so merging this work will not trigger a deployment.
- **New:** **To be decided**, in P02 or later: target repository, workflow, and whether the CNAME and token carry over.

## Local tooling (checked 2026-11-10)

| Tool | Found |
| --- | --- |
| Node.js | v26.12.0 (Homebrew), not an LTS release |
| npm | 11.20.0. pnpm, yarn and bun are not installed. |
| Git | 2.56.0 |
| Python | 3.12.2 via pyenv (`.python-version` says 3.12) |
| Quarto | 1.10.19 |
| conda | 25.11.1. The pre-commit hook runs from the micromamba environment `web`, defined by the archived `environment.yml`. |

On 2026-11-10 the npm registry listed `astro@7.4.8` as the latest release, requiring Node `>=22.23.4` and npm `>=9.6.5`. `create-astro` was at 5.3.1. The local versions meet those ranges. P02 chooses and pins the versions to use, for example an LTS Node line for CI.
