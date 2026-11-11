# Implementation log

Newest entry first.

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

## Bearnard WhatsApp preparation — Prompt 1/3 (2026-11-10)

Local derivatives are complete in `brand/bearnard/expressions2/_all/`: 204 static transparent 512 × 512 WebPs, each ≤100,000 bytes (79,210–99,996 bytes; total 18,872,908 bytes). All exports pass decode, static-frame, dimensions, alpha, margin and size checks. All 210 protected source/reference/prompt files retain their hashes. Nine existing side-edge contacts are documented and preserved. Every sticker received overview QA; 18 representative/edge cases received larger previews. Ready for emotional categorization; no packs or app were created. Script, manifest, preparation report and QA previews are local ignored assets.

Executed `python3 tools/prepare_whatsapp_stickers.py --workers 4` and `python3 tools/sticker_qa_previews.py` from the expressions2 project. Export audit: 204 passed, 0 missing/failed/unresolved. Restart reused 204 files with identical hashes and modification times; deterministic encoding and missing/unmanaged-file checks passed. No dependencies were installed. Site-wide build checks were not run for these local image derivatives.
