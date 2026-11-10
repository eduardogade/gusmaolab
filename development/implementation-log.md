# Implementation log

Newest entry first.

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
