# Current state

Last updated: P05, 2026-11-10. Verified facts only.

## Framework

- **Astro 7.4.8**, static output. The repository root is the Astro project.
- Two temporary pages, neither part of the website:
  - the **P03 design specimen** at `/` (`src/pages/index.astro`);
  - the **P05 folder study** at `/_design/folders/` (`src/pages/[design]/folders.astro`).
- **Section pages, working navigation, hover previews and Bearnard rendering are not implemented.**
- The archived Pelican site in `_backup/pelican-legacy/` is not built.
- Nothing has been deployed, and no deployment workflow is active.

## Design foundation (P03)

The owner approved the visual direction and overall appearance (D-041). Tokens are in `src/styles/`, the contract in `src/design/`, and the description in `planning/design-system.md`. Typography consolidation is a deferred refinement (D-042).

## Navigation model (P04)

| Item | Where |
| --- | --- |
| Types | `src/navigation/types.ts` |
| Registry: 12 top-level and 25 second-level folders, no third level yet | `src/navigation/registry.ts` |
| Helpers: normalization, validation, resolution, previews | `src/navigation/navigation.ts` |
| Compiled site navigation (`siteNavigation`) | `src/navigation/index.ts` |
| Rules and site map | `planning/information-architecture.md` |

The P05 folder components draw its tab rows; no section page uses it yet (P06). Of the 37 registered destinations, only `/` has a page (the specimen). The content-route list is empty until content collections exist.

## Physical folders (P05)

| Item | Where |
| --- | --- |
| Components: `FolderStack`, `FolderLayer`, `FolderTabStrip`, `FolderTab` | `src/components/folders/` |
| Styles: tab silhouette, seam, fillets, V, materials, scrolling rows | `src/styles/folders.css` |
| Description and open visual questions | `planning/design-system.md` sections 9 and 10 |
| Study page: cases A–F | `/_design/folders/` |

Built: one to three nested folder levels drawn from P04's `state.rows`. Each level has:

- a selected tab joined to its open body, with a V;
- recessed inactive tabs;
- the page on ivory paper in the deepest folder;
- the same structure in every environment.

A row that is too wide scrolls inside its own strip. All of this renders statically, with no client-side JavaScript.

**Not built:**

- tabs as links (labels only until P06);
- route-driven section pages (P06);
- hover previews and keyboard discovery (P07);
- the responsive navigation strategy (P08).

**Visual approval:** the owner approved the folder appearance (G-P05-17, D-049). The questions in `planning/design-system.md` section 10 remain refinements.

## Toolchain

| Item | Value |
| --- | --- |
| Node.js policy | The 26 LTS line: `.node-version` says `26`; `package.json` engines `>=26.12.0 <27` |
| Local Node.js | v26.12.0. Compatible, but it predates the first 26 LTS release (v26.13.0) and lacks the v26.12.1 security release. |
| Package manager | npm 11.20.0. `package-lock.json` is committed; install with `npm ci`. |
| Dependencies | `astro` 7.4.8. P03–P05 added none. |
| Dev dependencies | `@astrojs/check` 0.9.12, `typescript` 6.0.3, `prettier` 3.6.2 (range `^3.6.2`) |
| TypeScript | `astro/tsconfigs/strict` with `erasableSyntaxOnly` |
| Astro config | `site: "https://www.gusmaolab.org"`, `output: "static"`, no `base`, no adapter |
| Local preview | `.claude/launch.json`: `astro-preview` (built site, port 4322) and `astro-dev` (port 4321) |

## npm scripts

`dev`, `build`, `preview`, `check`, `test`, `verify` (`check`, then `build`, then `test`), `astro` and `format`. `npm test` runs `tests/design-tokens.mjs`, `tests/contrast.mjs`, `tests/navigation.mjs`, `tests/smoke-test.mjs` and `tests/folders.mjs`.

## Build status

`npm run verify` passes:

- `astro check`: 0 errors, 0 warnings, 0 hints across 24 files.
- Build: 2 pages. `dist/` holds them and three stylesheets; no JavaScript.
- Token checks and contrast checks pass (215 of 215 enforced pairings).
- Navigation: 14 of 14 tests pass (NAV-001 to NAV-014).
- Smoke test passes. Every built page is a registered destination, except the declared `/_design/` study.
- Folders: 10 of 10 tests pass (FOLD-001 to FOLD-010).

## Repository

| Item | Value |
| --- | --- |
| Working branch | `development` (D-035), local only. P04 at `ef5f78a`; the other task's records note at `cda026e`; then the P05 commit |
| Milestone branches | `chore/gusmaolab-foundation-p01` (`4096691`), `chore/gusmaolab-astro-foundation-p02` (`5fab52c`), `feat/gusmaolab-design-system-p03` (`851fdbb`), all kept |
| Recovery tag | `pre-astro-checkpoint` → `6eedf02`, local only |
| `main` and `origin/main` | `6036137`, the same tree as the checkpoint. No `development` branch exists on `origin`. |
| Remote | `origin` = `git@github.com:eduardogade/GusmaoLab.git`, public. Nothing was pushed in P01–P05. |
| Untracked | `clean`, a byte-identical copy of `clean.sh` that appeared at 18:01 on 2026-11-10. Claude Code did not create it, and left it alone at the owner's instruction. |

## Assets

- The 352 Bearnard images in `brand/bearnard/` are unchanged and gitignored; every checksum in `assets/bearnard/SHA256SUMS` matches.
- No Bearnard image is in `public/` or `dist/`.

## Legacy archive

Unchanged since P03; P05 did not touch it. ISSUE-0003 stays open: the recruiter-era files in the public history, and a possible third file.

## Completed prompts

P01, P02, P03, P04 and P05.

## Blockers

None for P06.

## Waiting for the owner

- Optional refinements to the folders, if wanted: `planning/design-system.md` section 10, questions 13–17.
- The third-level folders, when content work reaches them (`planning/information-architecture.md` section 3).
- Whether the second-level slugs are final before first publication (D-037).
- Update the local Node.js to the latest 26.x LTS release (KL-06).
- Decide what to do about ISSUE-0003, including the possible third file.
- The deployment design: target repository, CNAME and token (D-005).
- How to store Bearnard masters (D-011).
- Approval of the 204 Codex expression candidates.
- What to do with the untracked `clean` file.

## Bearnard WhatsApp preparation — Prompt 1/3 (2026-11-10)

Local derivatives are complete in `brand/bearnard/expressions2/_all/`: 204 static transparent 512 × 512 WebPs, each ≤100,000 bytes (79,210–99,996 bytes; total 18,872,908 bytes). All exports pass decode, static-frame, dimensions, alpha, margin and size checks. All 210 protected source/reference/prompt files retain their hashes. Nine existing side-edge contacts are documented and preserved. Every sticker received overview QA; 18 representative/edge cases received larger previews. Ready for emotional categorization; no packs or app were created. Script, manifest, preparation report and QA previews are local ignored assets.


## Bearnard sticker categorization — Prompt 2/3 (2026-11-11)

Completed seven local packs under `brand/bearnard/expressions2/packs/`: Good Vibes & Wins (30), Love & Hugs (30), Let's Talk (30), Awkward Moments (30), Not Today (30), Big Drama (30), and Goofing Around (24). All 204 copied WebPs match `_all/` byte-for-byte. Each has emoji tags, a unique accessibility description and explicit order. Seven transparent 96 × 96 tray icons, per-pack manifests, the consolidated preparation manifest, editable assignments, seven contact sheets, semantic-review evidence and a categorization report are complete.

All 204 stickers received contact-sheet visual review; all seven icons were inspected at native size. Ambiguous editorial choices are documented (52 medium-confidence assignments). `ready_for_prompt3` is true; `user_approved` remains false. No Android application or APK was created. All assets remain local and gitignored; the source library and original PNGs were preserved.

Executed `python3 tools/build_sticker_packs.py` and `python3 tools/build_sticker_packs.py --validate-only`: 7 packs, 204 unique assignments, 0 missing/duplicates/file/metadata/icon failures; 441 protected input hashes unchanged. Repeated execution preserved hashes and modification times for all 204 copies, seven icons, CSV and consolidated manifest (213 files). The builder respects manual CSV edits and marks semantic review stale when reviewed inputs change. No dependency installation or site changes; site build checks were not applicable to this asset-only task.


## Bearnard Stickers Android application — Prompt 3/3 (2026-11-11)

Built `brand/bearnard/expressions2/android/dist/BearnardStickers-debug.apk`: one debug-signed Android app, application ID `org.gusmaolab.bearnard.stickers`, version 1.0.0 (1), 19,577,132 bytes. Seven independently importable packs preserve all 204 curated stickers byte-for-byte. Includes ordered previews, light/dark UI, accessible descriptions, representative launcher icon, official ContentProvider/import protocol, consumer/Business handling and verified-only install status. Upstream WhatsApp revision: `06144a1f6077bbb346e1230032fc4e0bce996d03`; BSD notice retained in source and APK.

Executed asset conversion/validation and 5 Python tests; Gradle `:app:assembleDebug :app:testDebugUnitTest :app:lintDebug` succeeded with 7 Android tests passing and lint reporting no issues. APK inspection via aapt/apksigner and ZIP-byte comparison passed: correct identity, signed package, 7 packs, 204 WebPs, 7 tray icons, no runtime permissions. All 682 protected input files retain their hashes. SDK/build caches/debug signing stay local under android and ignored. README, upstream notes and build report are complete. APK SHA-256: `c4cad5af8b6e368d6409a9c611a1bfb2ab773606abbc7ef33731788ce8e7ff89`.

ADB diagnostic found no devices. No app installation or real WhatsApp import was attempted; real-device confirmation, cross-app permission behavior and Samsung/TalkBack UI review remain pending. This milestone does not claim those tests passed. No site source change or site-wide build was needed; ignored brand artifacts were not force-added, and the unrelated `clean` file was preserved.
