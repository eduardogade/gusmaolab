# Current state

Last updated: P06, 2026-11-11. Verified facts only.

## Framework

- **Astro 7.4.8**, static output. The repository root is the Astro project.
- **39 pages:**
  - **37 folder pages**, one for every registered folder, generated from the navigation registry (P06). Each shows the physical folders with working tab links and **temporary development content only**.
  - **2 temporary design studies**, not part of the website:
    - the **P03 tokens specimen** at `/_design/tokens/` (`src/pages/[design]/tokens.astro`; it was `/` until P06);
    - the **P05 folder study** at `/_design/folders/` (`src/pages/[design]/folders.astro`).
- **Not implemented:** real section content, hover previews, keyboard folder discovery, the responsive navigation strategy, the homepage composition, Bearnard rendering and a designed 404 page.
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

Every one of the 37 registered destinations has a page (P06). The content-route list is empty until content collections exist.

## Physical folders (P05)

| Item | Where |
| --- | --- |
| Components: `FolderStack`, `FolderLayer`, `FolderTabStrip`, `FolderTab` | `src/components/folders/` |
| Styles: tab silhouette, seam, fillets, V, materials, scrolling rows | `src/styles/folders.css` |
| Description and open visual questions | `planning/design-system.md` sections 9 and 10 |
| Study page: cases A–G (case F updated and case G added in P06) | `/_design/folders/` |

Built: one to three nested folder levels drawn from P04's `state.rows`. Each level has:

- a selected tab joined to its open body, with a V;
- recessed inactive tabs;
- the page on ivory paper in the deepest folder;
- the same structure in every environment.

A row that is too wide scrolls inside its own strip. All of this renders statically, with no client-side JavaScript.

Tabs became links in P06 (below). **Still to come:** hover previews and keyboard discovery (P07), and the responsive navigation strategy (P08).

**Visual approval:** the owner approved the folder appearance (G-P05-17, D-049). The questions in `planning/design-system.md` section 10 remain refinements.

## Folder navigation (P06)

| Item | Where |
| --- | --- |
| Overview display tabs, `currentTabId`, `folderStaticPaths()` | `src/navigation/types.ts`, `navigation.ts` |
| Page layout: resolves the URL, sets the environment, draws the folders, `<main>` in the deepest folder | `src/layouts/FolderPage.astro` |
| Route files, one per tab level | `src/pages/index.astro`, `src/pages/[section]/…` |
| Temporary page content | `src/components/scaffold/ScaffoldContent.astro` |
| Rules | `planning/information-architecture.md` sections 12 and 14; D-050–D-056 |

Built:

- Every tab is a link.
- An open folder with children always shows its row with a selected tab: its **Overview** on its own page.
- The page's own tab carries `aria-current="page"`, and the open folders above it `aria-current="true"`.
- Each row is a labelled `nav`.
- Each section's environment is applied.
- Inactive tabs give hover feedback.
- No client-side JavaScript; links, Back, Forward and reload work as on any static site (checked in Chromium).
- Unknown URLs have no page.
- Case F of the folder study now shows Overview selected, and case G shows a third-level Overview (synthetic fixture).

**Visual approval of P06:** not yet given (G-P06-20).



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

`dev`, `build`, `preview`, `check`, `test`, `verify` (`check`, then `build`, then `test`), `astro` and `format`. `npm test` runs `tests/design-tokens.mjs`, `tests/contrast.mjs`, `tests/navigation.mjs`, `tests/smoke-test.mjs`, `tests/folders.mjs` and `tests/routes.mjs`.

## Build status

`npm run verify` passes:

- `astro check`: 0 errors, 0 warnings, 0 hints across 32 files.
- Build: 39 pages. `dist/` holds them and three stylesheets, 381,438 bytes in all; no JavaScript.
- Token checks and contrast checks pass (225 of 225 enforced pairings).
- Navigation: 22 of 22 model tests pass (NAV-001 to NAV-021, NAV-025).
- Smoke test passes. The built pages are exactly the 37 registered destinations and the 2 declared `/_design/` studies.
- Folders: 10 of 10 tests pass (FOLD-001 to FOLD-010).
- Routes: 9 of 9 tests pass (NAV-022, NAV-023, NAV-026 to NAV-032). NAV-024 passed in the browser.

## Repository

| Item | Value |
| --- | --- |
| Working branch | `development` (D-035), local only. P04 at `ef5f78a`; P05 at `4771127` and `40083ce`; the Bearnard sticker task's notes at `cda026e`, `fa522dc` and `aaa32a7`; then the P06 commit |
| Milestone branches | `chore/gusmaolab-foundation-p01` (`4096691`), `chore/gusmaolab-astro-foundation-p02` (`5fab52c`), `feat/gusmaolab-design-system-p03` (`851fdbb`), all kept |
| Recovery tag | `pre-astro-checkpoint` → `6eedf02`, local only |
| `main` and `origin/main` | `6036137`, the same tree as the checkpoint. No `development` branch exists on `origin`. |
| Remote | `origin` = `git@github.com:eduardogade/GusmaoLab.git`, public. Nothing was pushed in P01–P06. |
| Untracked | `clean`, a byte-identical copy of `clean.sh` that appeared at 18:01 on 2026-11-10. Claude Code did not create it, and left it alone at the owner's instruction. |

## Assets

- The 352 Bearnard images in `brand/bearnard/` are unchanged and gitignored; every checksum in `assets/bearnard/SHA256SUMS` matches.
- No Bearnard image is in `public/` or `dist/`.

## Legacy archive

Unchanged since P03; P05 and P06 did not touch it. ISSUE-0003 stays open: the recruiter-era files in the public history, and a possible third file.

## Completed prompts

P01, P02, P03, P04, P05 and P06.

## Blockers

None for P07.

## Waiting for the owner

- Review of the P06 navigation and Overview tabs (G-P06-20), and the refinements in `planning/design-system.md` section 10, questions 13–20.
- Stronger palette differences between environments (D-056) and typography consolidation (D-042), both deferred.
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
