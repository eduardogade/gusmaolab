# Current state

Last updated: P10, 2026-11-13. Verified facts only.

## Framework

- **Astro 7.4.8**, static output. The repository root is the Astro project.
- **39 pages:**
  - **36 folder pages**, one for every registered folder, generated from the navigation registry (P06). Each shows the physical folders with working tab links, folder previews (P07) and **temporary development content only**.
  - **3 temporary design studies**, not part of the website:
    - the **P03 tokens specimen** at `/_design/tokens/` (`src/pages/[design]/tokens.astro`; it was `/` until P06);
    - the **P05 folder study** at `/_design/folders/` (`src/pages/[design]/folders.astro`);
    - the **P09 Bearnard study** at `/_design/bearnard/` (`src/pages/[design]/bearnard.astro`).
  - The P09 environments study (`/_design/environments-v2/`) was removed in P09-A01 (D-076).
- **Editorial entries (P10):** none. The eight collections exist and are empty, so every build page is a folder page or a study; an entry would add one page below its owning folder (see "Editorial collections").
- **Not implemented:** real section content, the homepage composition, Bearnard on any site page (the foundation exists, below) and a designed 404 page.
- The archived Pelican site in `_backup/pelican-legacy/` is not built.
- Nothing has been deployed, and no deployment workflow is active.

## Design foundation (P03)

The owner approved the visual direction and overall appearance (D-041). Tokens are in `src/styles/`, the contract in `src/design/`, and the description in `planning/design-system.md`. Colour has been the Chromatic Archive since P09-A01 (below, D-076); fonts, sizes, spacing and geometry are P03's. Typography consolidation is a deferred refinement (D-042).

## Navigation model (P04)

| Item | Where |
| --- | --- |
| Types | `src/navigation/types.ts` |
| Registry: 11 top-level and 25 second-level folders, no third level yet; each section declares its category and environment; the global row is grouped by category (P10) | `src/navigation/registry.ts` |
| Helpers: normalization, validation, resolution, previews | `src/navigation/navigation.ts` |
| Compiled site navigation (`siteNavigation`) | `src/navigation/index.ts` |
| Rules and site map | `planning/information-architecture.md` |

Every one of the 36 registered destinations has a page (P06; 37 until External was removed in P09-A01). The content-route list is empty until content collections exist.

## Physical folders (P05)

| Item | Where |
| --- | --- |
| Components: `FolderStack`, `FolderLayer`, `FolderTabStrip`, `FolderTab`, and `FolderPreview` since P07 | `src/components/folders/` |
| Styles: tab silhouette, seam, fillets, V, materials, scrolling rows | `src/styles/folders.css` |
| Description and open visual questions | `planning/design-system.md` sections 9 and 10 |
| Study page: cases A–I (case F updated and case G added in P06; case H, a second-level preview, added in P07; case I, wide content in three levels, added in P08) | `/_design/folders/` |

Built: one to three nested folder levels drawn from P04's `state.rows`. Each level has:

- a selected tab joined to its open body, with a V;
- recessed inactive tabs;
- the page on the category's reading paper in the deepest folder;
- the same structure in every category and environment.

A row that is too wide scrolls inside its own strip. All of this renders statically.

Tabs became links in P06, previews arrived in P07, and P08 made the folders work on every screen size (below).

**Visual approval:** the owner approved the folder appearance (G-P05-17, D-049). The questions in `planning/design-system.md` section 10 remain refinements.

## Folder navigation (P06)

| Item | Where |
| --- | --- |
| Overview display tabs, `currentTabId`, `folderStaticPaths()` | `src/navigation/types.ts`, `navigation.ts` |
| Page layout: resolves the URL, sets the category and environment, draws the folders, `<main>` in the deepest folder | `src/layouts/FolderPage.astro` |
| Route files, one per tab level | `src/pages/index.astro`, `src/pages/[section]/…` |
| Temporary page content | `src/components/scaffold/ScaffoldContent.astro` |
| Rules | `planning/information-architecture.md` sections 12 and 14; D-050–D-056 |

Built:

- Every tab is a link.
- An open folder with children always shows its row with a selected tab: its **Overview** on its own page.
- The page's own tab carries `aria-current="page"`, and the open folders above it `aria-current="true"`.
- Each row is a labelled `nav`.
- Each section's category (colour) and environment (typography) are applied.
- Inactive tabs give hover feedback.
- Navigation needs no JavaScript; links, Back, Forward and reload work as on any static site (checked in Chromium). P07's preview script is the only script.
- Unknown URLs have no page.
- Case F of the folder study now shows Overview selected, and case G shows a third-level Overview (synthetic fixture).

**Visual approval of P06:** the owner approved the navigation and Overview tabs (G-P06-20, D-057). Questions 18 and 20 in `planning/design-system.md` section 10 remain refinements.

## Folder previews (P07)

| Item | Where |
| --- | --- |
| Preview data: `TabRow.previews`, built from the P06 display tabs | `src/navigation/types.ts`, `navigation.ts` |
| Preview markup: an index card after each eligible tab's link, a `popover="manual"` | `src/components/folders/FolderPreview.astro`, `FolderTab.astro` |
| The only client-side script: shows, hides and places previews (2.75 KB, inlined) | `src/scripts/folder-previews.ts` |
| Styles | `src/styles/folders.css` section 5 |
| Rules | `planning/information-architecture.md` section 15; `planning/design-system.md` section 9; D-058–D-062 |

Built:

- Hovering (mouse or pen) or keyboard-focusing an unopened folder with children shows its Overview and immediate children on a card of its own Level 2 cardstock, hanging from its tab. Open folders, leaves and Overview tabs show none.
- Preview links are real destinations. Hovering changes no URL, history, selection, V, category or environment.
- One preview at a time; 120 ms close delay and 90 ms switch delay against flicker; Escape closes and returns focus; touch is ignored, so a tap navigates.
- Cards live in the top layer: never clipped by a scrolling row, kept 8 px inside the viewport, scrolling inside themselves when long.
- Without JavaScript or the Popover API, no previews and the same plain links.

**Visual approval of P07:** the owner approved the folder previews (G-P07-19, D-063). Question 21 in `planning/design-system.md` section 10 remains a refinement.

## Small screens (P08)

| Item | Where |
| --- | --- |
| Spacing curves: the gutter stops at 1440 px; shell padding and nest insets shrink below 1024 px | `src/styles/tokens.css` |
| Rows: scroll padding clear of the fades; nested tabs 44 px under a coarse pointer; the paper contains wide content | `src/styles/folders.css` |
| `.gl-scroll-x` regions for wide tables and figures | `src/styles/global.css` |
| Rows open at their selected tab where the browser cannot; focus kept clear of the fades | `src/scripts/folder-rows.ts` |
| Rules | `planning/design-system.md` section 9; `planning/information-architecture.md` section 16; D-064–D-069 |

Built:

- The folders stay physical folders at every width from 320 to 2560 px; rows scroll sideways inside their folders and the page never does.
- Each row opens with its selected tab in view (Chromium natively; other browsers through the script), and keyboard focus stays clear of the edge fades.
- From 1024 px up the layout is pixel-identical to P07; above 1440 px the shell no longer narrows, so the global row fits.
- Phones: 4 px shell padding and nest insets; three levels at 320 px leave a 238 px reading column.
- Touch: swipes scroll a row, taps open a page, previews never open, every tab at least 44 px tall.
- Wide content scrolls inside itself; study case I shows it.

**Visual approval of P08:** the owner approved the small-screen layout (G-P08-20, D-070). Question 22 in `planning/design-system.md` section 10 remains a refinement. Real phones and tablets are still untested (G-P08-21, KL-32).

## Navigation continuity (P09)

| Item | Where |
| --- | --- |
| A 140 ms cross-document fade between folder pages; off under reduced motion | `src/styles/view-transitions.css`, imported by `src/layouts/FolderPage.astro` |
| Hover previews wait for real pointer movement after a page appears | `src/scripts/folder-previews.ts` |
| Diagnosis and status | `debugging/investigations/ISSUE-0004.md` (open: awaiting the owner's retest); D-071, D-072 |

Navigation is still ordinary: real pages, real URLs, no client router. The reported blink was a one-frame hard cut, not a blank frame; the fade replaces it where the browser supports cross-document view transitions (Chromium; Safari 18.2+).

## Bearnard illustrations (P09)

| Item | Where |
| --- | --- |
| Registry: one illustration (`bearnard-v1.3-portrait`), nine roles, none assigned | `src/illustrations/bearnard.ts` |
| Component: by role or by ID; fallback slot; responsive, lazy, sized | `src/components/bearnard/BearnardIllustration.astro` |
| Web derivatives of the v1.3 master: WebP, 320 × 632 (54,626 bytes) and 640 × 1265 (187,394 bytes) | `public/illustrations/bearnard/` |
| Provenance: source checksum, settings, output checksums | `assets/bearnard/derivatives.json` |
| Generator, run by hand (Python with Pillow); never part of the build | `scripts/bearnard_derivatives.py` |
| Study page | `/_design/bearnard/` |
| Rules | `planning/design-system.md` section 11; `planning/architecture.md`, "Bearnard illustrations"; D-073, D-074 |

No site page shows Bearnard yet, and no role has an illustration: assigning one is the owner's decision (G-P09-B7). The build does not need the masters: a copy of the repository without `brand/bearnard/` passes `npm run verify`, with BEAR-004 reported as skipped. Only the canonical master is registered; the 2 approved-derived, 5 historical, 310 experimental, 31 unclassified and 3 working-copy images in the inventory are not.

## Chromatic Archive (P09-A01)

**Approved and locked by the owner (D-076).** Colour belongs to five categories; the four environments set typography and texture only.

| Item | Where |
| --- | --- |
| The five palettes, 25 locked colours, five tokens per `[data-category]`: the only source | `src/styles/categories.css` |
| Shared colours (shell `#29282C`, links and accent `#275B52`, V `#26313B`), text inks, focus rings, and the aliases | `src/styles/tokens.css` |
| Environments: ten typography and texture tokens each, no colour | `src/styles/environments.css` |
| Each section's `category` and `environment`; `ArchiveCategory` | `src/navigation/registry.ts`, `types.ts` |
| Contract: `CATEGORIES`, `CATEGORY_TOKENS`, `ENVIRONMENT_TOKENS`, contrast pairings | `src/design/contract.mjs` |
| Markup: `data-category` on `<html>`, on the folder stack and on every top-level tab | `BaseLayout.astro`, `FolderPage.astro`, `FolderStack.astro`, `FolderTab.astro` |
| Checks | `tests/categories.mjs` (CAT-001 to CAT-010), `tests/categories-browser.mjs` (CAT-011 to CAT-017), `tests/contrast.mjs` |
| Values, derived colours and contrast | `planning/design-system.md` sections 7 and 8; `planning/architecture.md`, "Colour architecture" |

| Category | Sections | Environment (typography) |
| --- | --- | --- |
| Core | Home, About, Contact, Schedule | Core |
| Research | Portfolio, CV, Lab | Scientific |
| Blog & Notes | Blog, Lecture Notes | Core (Blog), Technical (Lecture Notes) |
| Writing | Writing | Literary |
| Bearnard | Bearnard's Area | Personal |

Built:

- Every top-level tab is painted in its own category's Level 1 cardstock on every page, slightly dimmed while inactive; all five colours share the global row.
- The selected tab and its open folder are one colour; second-level tabs and bodies use Level 2; the page is on the category's reading paper; the flannel's ground and line are the page's category; the shell is Deep Charcoal everywhere.
- Links and the accent are Forest Teal and the V is Midnight Ink on every page. Links on the dark shell use the eye green, because Forest Teal reaches only 1.88:1 there (KL-38).
- A preview card is the hovered folder's own Level 2 cardstock, whatever page it opens from.
- External is no longer in the navigation; `/external/` is not built. It held only the development placeholder.
- Removed: the P09 environment candidates (`src/styles/environment-candidates.css`, `/_design/environments-v2/`, `tests/environments.mjs`; D-075 superseded), and nine primitives that only the old environment colours used.
- Folder geometry, Overview tabs, previews, small-screen behaviour, the cross-fade, fonts and type values are unchanged.

**Not owner-reviewed yet:** the colours as they look on the running site and on real screens (G-A01-23, KL-39). The palette itself is the owner's and is not in question.

## Global row order (P10)

The eleven top-level tabs are grouped by category, in this order (D-077): **Core** Home, About, Contact, Schedule; **Research** Portfolio, CV, Lab; **Blog & Notes** Blog, Lecture Notes; **Writing** Writing; **Bearnard** Bearnard's Area. Only the order changed: labels, IDs, URLs, categories, environments, children, geometry, previews, small-screen scrolling and the locked palettes are as before. `validateNavigation()` rejects a registry that splits a category; NAV-001, NAV-033 and CAT-001 check the row, and CAT-018 navigates the five pairs the brief names in headless Chrome. Blog, a leaf, now follows Lab, so keyboard Tab from Lab's preview reaches Blog before Lecture Notes (PREV-008).

## Editorial collections (P10)

| Item | Where |
| --- | --- |
| Eight collections (Blog, Bearnard's Trail, The Greenhouse, Berries, Timber Logs, Months' Original, Kosmos Series, Book Club): ID, directory, owning folder | `src/editorial/collections.ts`; `src/content/<directory>/` (empty; `.gitkeep` only) |
| Astro configuration: Content Layer `glob()` loaders, schemas, date guard | `src/content.config.ts` |
| Metadata schemas (Zod through `astro/zod`) | `src/editorial/schema.ts` |
| Routing, ordering, index and clash rules; pure | `src/editorial/model.ts`, `raw-dates.ts` |
| Astro side: loading, navigation with entry routes, static paths, indexes | `src/editorial/site.ts` |
| Rendering: one entry; one collection index | `src/components/editorial/EditorialEntry.astro`, `CollectionIndex.astro` |
| Route files: folders and entries at each depth | `src/pages/[section]/…` (`pageStaticPaths`) |
| Rules, schemas, frontmatter examples, workflow | `planning/content-model.md`; D-078 to D-081 |
| Checks | `tests/content.mjs` (CONT-001 to CONT-015, 017, 019), `tests/editorial-build.mjs` (CONT-004 to CONT-016, CONT-018, built), fixtures in `tests/fixtures/editorial/` |

Built:

- Entries are Markdown files, one per entry, validated at load time; a bad file fails the build and is named. Status (`draft`, `published`, `archived`) decides route generation: drafts have no page in a build, published and archived entries get one at the owner's path plus an explicit slug. `astro dev` alone previews drafts.
- Entries are content routes owned by their collection's folder: no tab, no registry node, at most three rows. They render inside the folder on the category's reading paper; unknown slugs have no page.
- A collection's index appears on its folder's own page, or says "This collection has no published entries yet." The Berries, Timber Logs and Greenhouse pages show it now, and so do the others.
- Verified with synthetic fixtures built in throwaway copies of the project (never in `src/content/`): 46 pages in the good scenario (36 folders, 3 studies, 7 entries), drafts and ignored files absent, three invalid scenarios and a slug clash failing the build.
- No content was written, migrated or published; the Pelican archive was not read; no dependency was added.

Not built, on purpose: the differentiated reading layouts (P12), Quarto and MDX (P13), authoring helpers (P14), feeds, search, related content, deeper Kosmos work and chapter URLs, and any Bearnard illustration on an entry.

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

`dev`, `build`, `preview`, `check`, `test`, `test:browser`, `verify` (`check`, then `build`, then `test`), `astro` and `format`. `npm test` runs `tests/design-tokens.mjs`, `tests/contrast.mjs`, `tests/navigation.mjs`, `tests/smoke-test.mjs`, `tests/folders.mjs`, `tests/routes.mjs`, `tests/previews.mjs`, `tests/responsive.mjs`, `tests/transitions.mjs`, `tests/bearnard.mjs`, `tests/categories.mjs`, `tests/content.mjs` and `tests/editorial-build.mjs`. `npm run test:browser` runs `tests/previews-browser.mjs`, `tests/responsive-browser.mjs`, `tests/transitions-browser.mjs` and `tests/categories-browser.mjs` in a local headless Chrome, through `tests/browser-harness.mjs`, separately from `verify` (D-062, D-069).

## Build status

`npm run verify` passes:

- `astro check`: 0 errors, 0 warnings, 0 hints across 48 files.
- Build: 39 pages. `dist/` holds 44 files, 1,154,869 bytes in all: the site's pages and stylesheets (702,612 bytes), the design studies (210,237) and the two Bearnard derivatives (242,020), each under its own ceiling (D-074, KL-30, KL-42). No script file: the 37 pages with folders each inline one module (4.1 KB: previews and rows; at Vite's inlining limit, KL-36); the P03 specimen and the Bearnard study have no script.
- Token checks pass (43 primitives, 213 tokens; 5 categories with 5 colour tokens each, 4 environments with 10 typography and texture tokens each). Contrast checks pass: 245 of 245 enforced pairings, 260 in all, across the five categories.
- Navigation: 23 of 23 model tests pass (NAV-001 to NAV-021, NAV-025, NAV-033), for 11 sections and 36 folders.
- Smoke test passes. The built pages are exactly the 36 registered destinations and the 3 declared `/_design/` studies, and the only other files are stylesheets and the registered derivatives.
- Folders: 10 of 10 tests pass (FOLD-001 to FOLD-010).
- Routes: 9 of 9 tests pass (NAV-022, NAV-023, NAV-026 to NAV-032). NAV-024 passed in the browser.
- Previews: 11 of 11 checks pass without a browser (PREV-001 to PREV-007, and the markup of PREV-004, PREV-013, PREV-014 and PREV-015).
- Responsive: 8 of 8 checks pass without a browser (RESP-006 to RESP-008 and RESP-013 to RESP-017).
- Transitions: 4 of 4 checks pass without a browser (TRANS-B01 to TRANS-B04).
- Bearnard: 8 of 8 checks pass (BEAR-001 to BEAR-008); BEAR-004 is skipped in a checkout without the masters.
- Chromatic Archive: 10 of 10 checks pass (CAT-001 to CAT-010), for 5 categories, 11 tabs and 36 pages.
- Editorial model: 17 of 17 checks pass (CONT-001 to CONT-015, CONT-017, CONT-019), for 8 collections.
- Editorial builds: 13 of 13 checks pass (CONT-004 to CONT-016 and CONT-018, built), in 5 throwaway builds.

`npm run test:browser` passes separately in headless Chrome 157: 12 of 12 preview checks (PREV-005, PREV-008 to PREV-014), 17 of 17 responsive checks (RESP-001 to RESP-017), 12 of 12 navigation-continuity checks (TRANS-001 to TRANS-012) and 8 of 8 colour and navigation checks (CAT-011 to CAT-018).

## Repository

| Item | Value |
| --- | --- |
| Working branch | `development` (D-035), local only. P04 at `ef5f78a`; P05 at `4771127` and `40083ce`; the Bearnard sticker task's notes at `cda026e`, `fa522dc` and `aaa32a7`; P06 at `39bc564` and its approval record `f8eead2`; P07 at `750e98f` and its approval record `28392b0`; P08 at `5a906f1` and its approval record `ca0dc82`; P09 at `93d3af0` (navigation continuity), `6ddf084` (Bearnard foundations), `b76f3b0` (environment candidates, since superseded) and `ceec322` (records); P09-A01, the Chromatic Archive, at `4f1e68f` and `10b3223`; P10 at `2748020` (global row grouping) and the editorial commit recorded below |
| Milestone branches | `chore/gusmaolab-foundation-p01` (`4096691`), `chore/gusmaolab-astro-foundation-p02` (`5fab52c`), `feat/gusmaolab-design-system-p03` (`851fdbb`), all kept |
| Recovery tag | `pre-astro-checkpoint` → `6eedf02`, local only |
| `main` | `6036137`, the same tree as the checkpoint |
| `origin/main` | `e28d43a`, two commits ahead of local `main`: a fetch at 08:22 on 2026-11-11, not run by Claude Code, brought in a merge (pull request 125) that adds seven files under `__frag8/`, unrelated to this work. Noticed at the end of P09; nothing was fetched, merged or pushed in response. No `development` branch exists on `origin`. |
| Remote | `origin` = `git@github.com:eduardogade/GusmaoLab.git`, public. Nothing was pushed in P01–P10: P10's decision is recorded in D-082. `origin/main` was still `e28d43a` and `origin` still had no `development` branch when checked on 2026-11-13 with `git ls-remote`. |
| Untracked | `clean`, a byte-identical copy of `clean.sh` that appeared at 18:01 on 2026-11-10. Claude Code did not create it, and left it alone at the owner's instruction. Also untracked: `cv/codex-yaml/`, another agent's CV task (CV-01), which Claude Code did not create, stage or change. |

## Assets

- The 352 Bearnard images in `brand/bearnard/` are unchanged and gitignored; every checksum in `assets/bearnard/SHA256SUMS` matches.
- `public/` and `dist/` hold two Bearnard images, both registered WebP derivatives of the v1.3 master (D-073). No master, and no other image, is in either.

## Legacy archive

Unchanged since P03; P05 to P09-A01 did not touch it. ISSUE-0003 stays open: the recruiter-era files in the public history, and a possible third file.

## Completed prompts

P01 to P10, including P09's Addendum 01 (the Chromatic Archive). P08's real-device checks are pending. P09 is technically completed; two owner reviews are pending (G-P09-A6, G-P09-B7); the third, G-P09-C7, was closed by D-076. P10 is completed (D-077 to D-082); P11 has not started.

## Blockers

None.

## Waiting for the owner

- **Retest folder navigation** on a real desktop and Android phone in Chrome, and say whether the blink has meaningfully improved (G-P09-A6, ISSUE-0004).
- If possible, try the site on a real phone and tablet (G-P08-21, KL-32).
- **Look at the Chromatic Archive on the running site** and on real screens (G-A01-23, KL-39). Two points for the owner's eye, neither changed because the values are locked: Core's and Research's cardstocks are the closest pair on the global row (question 25), and Forest Teal cannot be a link colour on the shell or directly on the three darker Level 1 cardstocks (question 26, KL-38).
- Optional refinements to the folders, the Overview tab, the previews and small screens, if wanted: `planning/design-system.md` section 10, questions 13, 14, 16, 18 and 20–22.
- A concurrent task: another agent (CV-01) appended a section to the working copies of this file and of the implementation log, and created the folder `cv/codex-yaml/`. P09-A01 left all three unchanged and out of its commit; the owner decides when they are committed.
- **Editorial decisions** (P10): whether to write the first entries; the Kosmos structure, including the order of the works and any work and chapter URLs (KL-44); whether `heroImage`, `mascot`, `related` and `featured` are wanted (`planning/content-model.md`); whether a push of `development` is wanted as a backup (D-082).
- **Assign Bearnard illustrations to roles**, or leave them empty for now (G-P09-B7; question 23).
- Typography consolidation (D-042), still deferred.
- `origin/main` holds two commits that local `main` lacks, adding `__frag8/` (see Repository). Decide whether they belong there before `development` is ever merged into `main` (D-082 lists the steps).
- The third-level folders, when content work reaches them (`planning/information-architecture.md` section 3).
- Whether the second-level slugs are final before first publication (D-037).
- Update the local Node.js to the latest 26.x LTS release (KL-06).
- Decide what to do about ISSUE-0003, including the possible third file.
- The deployment design: target repository, CNAME and token (D-005).
- How to store Bearnard masters (D-011).
- **Bearnard roles:** whether the v1.3 portrait should stand in for any role, and which other illustrations to approve (G-P09-B7; `planning/design-system.md` section 10, question 23).
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
