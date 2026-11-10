# Current state

Last updated: P02, 2026-11-10. Verified facts only.

## Framework

- **Astro 7.4.8** is installed and pinned. The repository root is the Astro project, with static output.
- Only a temporary foundation page exists (`src/pages/index.astro`). **The website's visual interface is not implemented.**
- The archived Pelican site in `_backup/pelican-legacy/` is not built.
- Nothing has been deployed, and no deployment workflow is active.

## Toolchain

| Item | Value |
| --- | --- |
| Node.js policy | The 26 LTS line: `.node-version` says `26`; `package.json` engines `>=26.12.0 <27` |
| Local Node.js | v26.12.0. Compatible, but it predates the first 26 LTS release (v26.13.0) and lacks the v26.12.1 security release. |
| Package manager | npm 11.20.0. `package-lock.json` is committed; install with `npm ci`. |
| Dependencies | `astro` 7.4.8 |
| Dev dependencies | `@astrojs/check` 0.9.12, `typescript` 6.0.3, `prettier` 3.6.2 (range `^3.6.2`) |
| TypeScript | Extends `astro/tsconfigs/strict`; excludes `dist`, `_backup`, `brand` and the private folders |
| Astro config | `site: "https://www.gusmaolab.org"`, `output: "static"`, no `base`, no adapter |

## npm scripts

`dev`, `build`, `preview`, `check`, `test` (smoke test of `dist/`), `verify` (`check`, then `build`, then `test`), `astro` and `format`.

## Build status

`npm run verify` passes: `astro check` reports 0 errors, 0 warnings and 0 hints; `astro build` builds 1 page; the smoke test passes. `dist/` holds only `index.html` (437 bytes). A clean `npm ci` in an empty copy of the committed files reproduces the same `index.html` byte for byte.

## Repository

| Item | Value |
| --- | --- |
| P02 branch | `chore/gusmaolab-astro-foundation-p02`, local only, branched from `4096691` (end of P01) |
| P02 commits | `d94f170` (privacy removal), then the Astro foundation commit |
| P01 branch | `chore/gusmaolab-foundation-p01` at `4096691` |
| Recovery tag | `pre-astro-checkpoint` → `6eedf02`, local only |
| `origin/main` | `757c95d`: two commits after the checkpoint that add three files under `__bak9/`. They do not overlap with P01 or P02 changes; integrate them before merging into `main`. |
| Remote | `origin` = `git@github.com:eduardogade/GusmaoLab.git`, public. Nothing was pushed in P01 or P02. |

## Assets

- The 352 Bearnard images in `brand/bearnard/` are unchanged and gitignored; every checksum in `assets/bearnard/SHA256SUMS` matches.
- The external backup `GusmaoLab-pre-astro-backup.zip` is unchanged.

## Legacy archive

Unchanged since P01, except that P02 removed two recruiter-era files with the owner's authorization. Their exposure in the public history is still open (ISSUE-0003).

## Completed prompts

P01, P02.

## Blockers

None for P03.

## Waiting for the owner

- Update the local Node.js to the latest 26.x LTS release (KL-06).
- Decide what to do about the recruiter-era files in the public history (ISSUE-0003).
- The deployment design: target repository, CNAME and token (D-005).
- How to store Bearnard masters (D-011).
- Approval of the 204 Codex expression candidates.
