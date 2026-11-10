# Current state

Last updated: P03, 2026-11-10. Verified facts only.

## Framework

- **Astro 7.4.8**, static output. The repository root is the Astro project.
- The only page is a **temporary design specimen** (`src/pages/index.astro`), not the homepage. **The physical-folder interface, navigation and Bearnard rendering are not implemented.**
- The archived Pelican site in `_backup/pelican-legacy/` is not built.
- Nothing has been deployed, and no deployment workflow is active.

## Design foundation (P03 candidate, awaiting the owner's visual review)

| Item | Where |
| --- | --- |
| Tokens: 24 primitives, semantic tokens, aliases | `src/styles/tokens.css` |
| Four section environments (scientific, technical, literary, personal) | `src/styles/environments.css`, selected with `data-environment` |
| Reset, base typography, focus, content styles, flannel lining | `src/styles/global.css` |
| Environment contract, required tokens, contrast pairings | `src/design/contract.mjs` |
| CSS token reader and WCAG contrast maths | `src/design/css-tokens.mjs` |
| Description, values and open questions | `planning/design-system.md` |

BaseLayout imports the three stylesheets and takes an optional `environment` prop. The build ships one HTML page and one CSS file, with no JavaScript, images or fonts. The design is **not visually approved**.

## Toolchain

| Item | Value |
| --- | --- |
| Node.js policy | The 26 LTS line: `.node-version` says `26`; `package.json` engines `>=26.12.0 <27` |
| Local Node.js | v26.12.0. Compatible, but it predates the first 26 LTS release (v26.13.0) and lacks the v26.12.1 security release. |
| Package manager | npm 11.20.0. `package-lock.json` is committed; install with `npm ci`. |
| Dependencies | `astro` 7.4.8. P03 added none. |
| Dev dependencies | `@astrojs/check` 0.9.12, `typescript` 6.0.3, `prettier` 3.6.2 (range `^3.6.2`) |
| Astro config | `site: "https://www.gusmaolab.org"`, `output: "static"`, no `base`, no adapter |
| Local preview | `.claude/launch.json`: `astro-preview` (built site, port 4322) and `astro-dev` (port 4321) |

## npm scripts

`dev`, `build`, `preview`, `check`, `test`, `verify` (`check`, then `build`, then `test`), `astro` and `format`. `npm test` runs `tests/design-tokens.mjs`, `tests/contrast.mjs` and `tests/smoke-test.mjs`.

## Build status

`npm run verify` passes:

- `astro check`: 0 errors, 0 warnings, 0 hints.
- Build: 1 page. `dist/` holds `index.html` and one stylesheet under `_astro/`, about 86 KB together.
- Token checks pass: 24 primitives; 4 environments each define all 33 contract tokens.
- Contrast: 165 of 165 enforced pairings pass in the core and all four environments.
- Smoke test passes.

The specimen was inspected in a browser at 1440, 1280, 768 and 390 px wide, with no horizontal overflow.

## Repository

| Item | Value |
| --- | --- |
| P03 branch | `feat/gusmaolab-design-system-p03`, local only, branched from `5fab52c` (end of P02) |
| P02 branch | `chore/gusmaolab-astro-foundation-p02` at `5fab52c` |
| P01 branch | `chore/gusmaolab-foundation-p01` at `4096691` |
| Recovery tag | `pre-astro-checkpoint` → `6eedf02`, local only |
| `main` and `origin/main` | `6036137`. The owner added and then removed three files under `__bak9/`; the tree at `6036137` is identical to the checkpoint `6eedf02`. |
| Remote | `origin` = `git@github.com:eduardogade/GusmaoLab.git`, public. Nothing was pushed in P01–P03. |

## Assets

- The 352 Bearnard images in `brand/bearnard/` are unchanged and gitignored; every checksum in `assets/bearnard/SHA256SUMS` matches. P03 read the v1.3 master once, read-only, to sample colors.
- No Bearnard image is in `public/` or `dist/`.

## Legacy archive

Unchanged in P03. The two recruiter-era files removed in P02 remain in the public history (ISSUE-0003, open). P03 noticed a third candidate, `content/pages/questionnaire.md`, recorded in ISSUE-0003 and not opened.

## Completed prompts

P01, P02 and P03. P03 is technically complete; its visual design awaits the owner's review.

## Blockers

None for P04.

## Waiting for the owner

- Visual review of the P03 specimen, and answers to the open questions in `planning/design-system.md` section 10.
- Update the local Node.js to the latest 26.x LTS release (KL-06).
- Decide what to do about the recruiter-era files in the public history, including the third candidate (ISSUE-0003).
- The deployment design: target repository, CNAME and token (D-005).
- How to store Bearnard masters (D-011).
- Approval of the 204 Codex expression candidates.
