# Acceptance matrix

Statuses: **Passed**, **Failed**, **Untested**, **Not applicable**. An untested requirement is Untested, never Passed.

## P01 gates

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-P01-01 | External backup exists and passes integrity checks | Passed | `unzip -t`: no errors; 9,304 of the 9,305 files on disk are in the ZIP (the exception is a Finder `.DS_Store` written later) |
| G-P01-02 | Bearnard originals unchanged | Passed | 352 images hashed with SHA-256 before and after P01, all identical to the backup |
| G-P01-03 | Recovery reference at the original HEAD | Passed | Tag `pre-astro-checkpoint` → `6eedf02` |
| G-P01-04 | Legacy site archived without content changes | Passed | 183 renames, all 100% similar |
| G-P01-05 | Pelican deploy workflow inactive | Passed | No `deploy.yml` in `.github/workflows/`; the remaining eight files have no active lines |
| G-P01-06 | Planning, development and debugging records and agent files exist | Passed | See `development/implementation-log.md` |
| G-P01-07 | Nothing pushed | Passed | No push was run; the P01 branch has no upstream |

## P02 gates

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-P02-01 | Astro installed and pinned | Passed | `astro` 7.4.8 in `package.json` and `package-lock.json` |
| G-P02-02 | Diagnostics pass | Passed | `astro check`: 0 errors, 0 warnings, 0 hints |
| G-P02-03 | Production build succeeds | Passed | `astro build`: 1 page |
| G-P02-04 | Output holds only the foundation page | Passed | `dist/` contains only `index.html` (437 bytes); the smoke test passes; preview returns 404 for `_backup/` and `brand/bearnard/` paths |
| G-P02-05 | Clean, reproducible install | Passed | `npm ci` in an empty copy: 0 vulnerabilities, no warnings |
| G-P02-06 | Bearnard masters unchanged | Passed | 352 of 352 checksums match |
| G-P02-07 | No deployment | Passed | No active workflow; nothing pushed |

## P03 gates

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-P03-01 | Design-token system exists: primitives, semantic tokens, aliases | Passed | `src/styles/tokens.css`; `tests/design-tokens.mjs` |
| G-P03-02 | Warm core palette defined | Passed | 24 primitives; core semantic roles on `:root` |
| G-P03-03 | Four environment variants, each defining the full contract | Passed | `src/styles/environments.css`; 4 × 33 tokens checked |
| G-P03-04 | Typography and spacing foundations | Passed | Font, size, line-height, measure and spacing tokens |
| G-P03-05 | Folder color and geometry tokens (not implemented as components) | Passed | Tab, indicator, nesting and stacking tokens; no tabs built |
| G-P03-06 | Subtle flannel lining with a plain fallback | Passed | `.gl-flannel`, `--texture-flannel-strength`, `--color-backdrop` |
| G-P03-07 | A visually inspectable specimen builds | Passed | `npm run build`; inspected at 1440, 1280, 768 and 390 px |
| G-P03-08 | Essential contrast checks pass | Passed | `tests/contrast.mjs`: 165 of 165 enforced pairings |
| G-P03-09 | Existing verification still passes | Passed | `npm run verify` |
| G-P03-10 | Canonical Bearnard assets untouched, none in the output | Passed | 352 of 352 checksums match; smoke test compares `dist/` with them |
| G-P03-11 | Documentation and records updated | Passed | `planning/design-system.md` and the development and debugging records |
| G-P03-12 | Committed locally, not pushed | Passed | Branch `feat/gusmaolab-design-system-p03` has no upstream |
| G-P03-13 | The owner approves the visual design | Passed | The owner approved the visual direction and overall appearance after reviewing the screenshots (P04 brief, D-041). Refinements remain open. |

## P04 gates

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-P04-01 | Persistent `development` branch established safely | Passed | Created from `851fdbb`; none existed locally or on `origin`; milestone branches kept |
| G-P04-02 | Approved hierarchy represented as validated data | Passed | `registry.ts`: 12 + 25 folders; `validateNavigation()` reports no issues |
| G-P04-03 | Unique identity and destination for every node | Passed | NAV-002, NAV-003 |
| G-P04-04 | State derived deterministically from URLs | Passed | NAV-004, NAV-005, NAV-011 |
| G-P04-05 | Three tab levels supported | Passed | NAV-006 (synthetic fixture) |
| G-P04-06 | Deeper content creates no fourth level | Passed | NAV-009 |
| G-P04-07 | Immediate-child preview data | Passed | NAV-007, NAV-008 |
| G-P04-08 | Core and four section environments, inherited | Passed | NAV-012 |
| G-P04-09 | Invalid configurations detected | Passed | NAV-010, NAV-013 |
| G-P04-10 | Labels independent of identity and URL | Passed | NAV-014 |
| G-P04-11 | P03 specimen unchanged; Astro still builds | Passed | `npm run verify`; output byte-identical to P03 |
| G-P04-12 | Records updated | Passed | `planning/information-architecture.md`, `planning/architecture.md`, `development/` |
| G-P04-13 | Committed locally on `development`, not pushed | Passed | No upstream for `development` |

### Navigation tests (`tests/navigation.mjs`)

| Test | Result |
| --- | --- |
| NAV-001 Top-level order | Pass |
| NAV-002 Unique identity | Pass |
| NAV-003 Parent destinations | Pass |
| NAV-004 Home selection | Pass |
| NAV-005 Two-level selection | Pass |
| NAV-006 Three-level selection (synthetic fixture) | Pass |
| NAV-007 Immediate children | Pass |
| NAV-008 Leaf behavior | Pass |
| NAV-009 Deep content ownership (synthetic fixture) | Pass |
| NAV-010 Unknown route | Pass |
| NAV-011 URL normalization | Pass |
| NAV-012 Environment inheritance | Pass |
| NAV-013 Invalid configuration | Pass |
| NAV-014 Content independence | Pass |

## P05 gates

Technical completion and visual approval are separate. The technical gates below were checked by tests and by inspecting the rendered study in Chromium at 1440, 1280, 1024, 768 and 390 px. **The owner reviewed the screenshots and approved the folder appearance (G-P05-17, D-049).**

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-P05-01 | Reusable Astro physical-folder components exist | Passed | `src/components/folders/` (four components) and `src/styles/folders.css` |
| G-P05-02 | The selected tab is joined to its folder body | Passed (technical) | Every selected tab, at all 17 levels in the study, reaches exactly 2 px into its body, with no row scrolled vertically (measured in the browser). No seam at 4–8× magnification (screenshots 11, 12). |
| G-P05-03 | Inactive tabs are recognizable and subtly recessed | Passed (technical) | FOLD-006; labels at 4.5:1 or more on inactive tabs at every level (`tests/contrast.mjs`) |
| G-P05-04 | The V indicator is visible on the selected tab | Passed | FOLD-005; screenshots |
| G-P05-05 | Nested components support three levels and never a fourth | Passed | FOLD-002, FOLD-003; `FolderStack` rejects more than three rows at build time |
| G-P05-06 | Parent tabs stay visible when a deeper folder is open | Passed | FOLD-002, FOLD-006; cases B, C and D |
| G-P05-07 | The page content sits inside the selected folder | Passed | FOLD-009; case C at 390 px leaves a reading column of about 300 px |
| G-P05-08 | Environments reuse one component system | Passed | FOLD-007; `tests/design-tokens.mjs` rejects environment selectors and primitives in component files |
| G-P05-09 | Long labels do not break the layout | Passed | FOLD-008; case D screenshot |
| G-P05-10 | No page-wide horizontal overflow | Passed | Page `scrollWidth` equals the viewport width at 1440, 1280, 1024, 768 and 390 px. Overflowing rows scroll inside their own strip (D-047). |
| G-P05-11 | The visual study page renders | Passed | `/_design/folders/`; smoke test section 7 |
| G-P05-12 | Automated checks pass | Passed | `npm run verify`; `git diff --check` |
| G-P05-13 | The P03 specimen is intact | Passed | FOLD-010. A pixel comparison with the P04 build at 1440 and 390 px differs only in the contrast count it reads from the contract (165 → 215; D-048). |
| G-P05-14 | Bearnard masters unchanged | Passed | 352 of 352 checksums match |
| G-P05-15 | Documentation updated | Passed | `planning/design-system.md`, `planning/information-architecture.md`, `planning/architecture.md`, `development/`, `debugging/known-limitations.md` |
| G-P05-16 | Committed locally on `development`, not pushed | Passed | No upstream for `development` |
| G-P05-17 | The owner approves the physical-folder appearance | Passed | The owner approved the folders after reviewing the 17 P05 screenshots (D-049). The questions in `planning/design-system.md` section 10 remain refinements. |

### Folder tests (`tests/folders.mjs`)

| Test | Result |
| --- | --- |
| FOLD-001 Single-level rendering | Pass |
| FOLD-002 Two-level rendering | Pass |
| FOLD-003 Three-level rendering, never a fourth | Pass |
| FOLD-004 Exactly one selected tab per open level | Pass |
| FOLD-005 The V indicator | Pass |
| FOLD-006 Inactive tabs stay present and labelled | Pass |
| FOLD-007 One component structure in every environment | Pass |
| FOLD-008 Long labels keep their full text | Pass |
| FOLD-009 Folder bodies show arbitrary content | Pass |
| FOLD-010 The P03 specimen is untouched | Pass |

Each test was also run against a deliberately broken copy of the build: a missing selection, a V on an inactive tab, a fourth level, an environment rule in `folders.css`, and folder styles reaching the specimen. Each copy failed with exit code 1.

## P06 gates

Checked by `npm run verify` and by navigating the built site in Chromium at 1440, 1280, 768 and 390 px (the desktop app's browser and headless Chrome 157). **The owner reviewed the screenshots and approved P06 (G-P06-20, D-057).**

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-P06-01 | Real Astro pages use the P05 folder components | Passed | 37 folder pages built through `FolderPage`; NAV-023, NAV-030 |
| G-P06-02 | Selection is driven by the URL | Passed | NAV-018, NAV-023; direct loads and a reload in the browser |
| G-P06-03 | Every open parent with children has a selected tab in its row | Passed | NAV-021, FOLD-004; `FolderStack` fails the build for an unselected row (checked on a broken copy) |
| G-P06-04 | Overview is the default selection on a parent's page | Passed | NAV-015, NAV-019 (synthetic third level), NAV-029 |
| G-P06-05 | Overview links to the parent's existing URL | Passed | NAV-016, NAV-022: `/cv/`, never `/cv/overview/` |
| G-P06-06 | No duplicate canonical navigation nodes | Passed | NAV-017: 37 nodes, 37 paths, 37 pages |
| G-P06-07 | Parent and child pages navigate correctly | Passed | NAV-022; in the browser: Home → CV → Research → CV, each by clicking a tab |
| G-P06-08 | Open ancestors stay visibly identifiable | Passed (technical) | Every open folder's tab is raised, joined and has a V (screenshots); `aria-current="true"` (NAV-028) |
| G-P06-09 | The V marks every selected tab, and only those | Passed | NAV-028, FOLD-005 |
| G-P06-10 | Never more than three rows of tabs | Passed | NAV-025, NAV-032 (no level-4 route); `FolderStack` rejects a fourth row and a row below an Overview |
| G-P06-11 | Deep content ownership is still supported | Passed (model) | NAV-009, NAV-025. No content route exists yet, so no deep page was built. |
| G-P06-12 | Normal browser navigation works | Passed (Chromium only) | NAV-024 in the browser: links, Back, Forward and reload restore the URL and selection; NAV-031: no JavaScript (KL-26) |
| G-P06-13 | Unknown routes are not accepted | Passed | NAV-026; the preview server answers 404 for `/cv/this-page-does-not-exist/`, `/cv/overview/` and others (`/CV/`: KL-23) |
| G-P06-14 | Environments are preserved | Passed | NAV-027; screenshots of core, scientific, technical, literary and personal pages |
| G-P06-15 | The approved P03 and P05 designs are intact | Passed | The specimen at `/_design/tokens/` differs from P05's `/` only in its contrast count (pixel comparison at 1440 and 390 px). FOLD-001 to FOLD-010 pass. Every selected tab reaches exactly 2 px into its body on the pages measured at all four widths and at all 21 open levels of the study. |
| G-P06-16 | Tests and the production build pass | Passed | `npm run verify`; `git diff --check` |
| G-P06-17 | Documentation updated | Passed | `planning/information-architecture.md`, `architecture.md`, `design-system.md`, `development/`, `debugging/known-limitations.md`, `README.md`, `AGENTS.md` |
| G-P06-18 | Committed locally on `development` | Passed | The P06 commit; `development` has no upstream |
| G-P06-19 | No deployment and no push | Passed | No push or deployment command was run |
| G-P06-20 | The owner approves the P06 navigation and Overview appearance | Passed | The owner approved P06 after reviewing the 20 P06 screenshots (D-057). Questions 18 and 20 in `planning/design-system.md` section 10 remain refinements. |

### Navigation and route tests (P06)

| Test | Where | Result |
| --- | --- | --- |
| NAV-015 Parent Overview | `tests/navigation.mjs` | Pass |
| NAV-016 Overview URL identity | `tests/navigation.mjs` | Pass |
| NAV-017 No duplicate registry nodes | `tests/navigation.mjs` | Pass |
| NAV-018 Child selection | `tests/navigation.mjs` | Pass |
| NAV-019 Parent with third-level children (synthetic fixture) | `tests/navigation.mjs` | Pass |
| NAV-020 No unnecessary child layer | `tests/navigation.mjs` | Pass |
| NAV-021 No unselected subfolder rows | `tests/navigation.mjs` | Pass |
| NAV-022 Parent tabs open their own overview page | `tests/routes.mjs` | Pass |
| NAV-023 Each page's own URL rebuilds its folders | `tests/routes.mjs` | Pass |
| NAV-024 Browser navigation: links, Back, Forward, reload | Browser (manual) | Pass in Chromium only (KL-26) |
| NAV-025 Maximum depth (synthetic fixture) | `tests/navigation.mjs` | Pass |
| NAV-026 Unknown paths have no page | `tests/routes.mjs` | Pass |
| NAV-027 Every page has its section's environment | `tests/routes.mjs` | Pass |
| NAV-028 One current page, labelled rows, content in main | `tests/routes.mjs` | Pass |
| NAV-029 Case F shows Overview selected | `tests/routes.mjs` | Pass |
| NAV-030 Folder pages keep the approved folder construction | `tests/routes.mjs` | Pass |
| NAV-031 Plain links, no client-side JavaScript | `tests/routes.mjs` | Pass |
| NAV-032 Every approved route is a static page | `tests/routes.mjs` | Pass |

NAV-003 and NAV-006 (P04) were updated: they expected an open parent's row to have nothing selected, which D-050 replaced.

**Negative checks.** Each route test was also run against a deliberately broken copy of the build, and each copy failed with exit code 1:

- `aria-current="page"` removed;
- an Overview pointing to `/cv/overview/`;
- an extra `/cv/overview/` page;
- case F's Overview unselected;
- the wrong environment on `/writing/`;
- a missing `/lab/people/` page;
- a `<script>` added to a page;
- a tab missing its card;
- a `[...slug]` route file;
- a second `aria-current="page"` on an ancestor.

`FolderStack` failed the build for an unselected row, an Overview out of place, and a row below an Overview.

## P07 gates

Checked by `npm run verify`, by `npm run test:browser` (headless Chrome 157) and by screenshots of the built site at 1440, 1280, 1024, 768 and 390 px. Chromium only (KL-28). **The owner reviewed the screenshots and approved the previews (G-P07-19, D-063).**

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-P07-01 | Hovering an unopened folder with children reveals its immediate children | Passed | PREV-001; PREV-005 (case A), PREV-010 in the browser |
| G-P07-02 | Overview comes first and links to the parent's canonical URL | Passed | PREV-002, PREV-007; the browser reads `Overview of Writing` → `/writing/` |
| G-P07-03 | Leaves produce no preview | Passed | PREV-003; hovering Contact, Home and About opens nothing (cases D) |
| G-P07-04 | Open folders produce no redundant preview | Passed | PREV-004 (model and pages); hovering CV, Overview and Teaching on `/cv/` opens nothing (case E) |
| G-P07-05 | Only one preview at a time | Passed | PREV-010: at most one open across four switches; PREV-008 by keyboard |
| G-P07-06 | Previews never change the current page | Passed | PREV-005: URL, history length, selection, `aria-current`, V, environment and scroll unchanged during and after a preview |
| G-P07-07 | The V stays on the open folders | Passed | PREV-014 at 1440 and 768 px; no V in any preview (markup) |
| G-P07-08 | Preview links open real destinations | Passed | PREV-013 (markup: every link has a page); case B: Kosmos Series opens `/writing/kosmos/` with Writing › Kosmos Series selected, and Back restores `/cv/research/` with nothing open |
| G-P07-09 | Keyboard users can discover, traverse and dismiss previews | Passed (Chromium) | PREV-008: focus opens without moving focus, Tab reaches the links, Shift+Tab returns, Escape closes and returns focus, Enter navigates, no trap |
| G-P07-10 | Escape works without immediately reopening | Passed (Chromium) | PREV-008: closed after Escape, still closed 260 ms later, reopened only after focus left and returned |
| G-P07-11 | Touch keeps one-tap navigation | Passed (emulated touch) | PREV-012: the first tap clicks Writing's link and opens no preview; one tap navigates; Kosmos Series is one tap away in the row |
| G-P07-12 | Positioning avoids clipping and page overflow | Passed (Chromium) | PREV-011 at five widths on three pages, every eligible tab: inside the viewport, under its tab, every item hit-testable, labels whole, no sideways page scroll; case I (last tab of a scrolled row at 768 px) |
| G-P07-13 | Moving into the preview does not flicker | Passed (Chromium) | PREV-009: one open and one close in the log for a pixel-by-pixel move in, a 50 ms slip off the card, and a neighbour crossed on the way |
| G-P07-14 | Folder styling consistent with P05 and P06 | Passed | NAV-030, FOLD-001 to FOLD-010; a closed page matches its P06 screenshot inside the folder shell to within 1/255 on 727 pixels (rasterisation) |
| G-P07-15 | Core navigation works without JavaScript | Passed | PREV-013 in the browser with scripts disabled: tabs navigate, Back works, no preview shows; NAV-031 |
| G-P07-16 | Automated and browser checks pass | Passed | `npm run verify`; `npm run test:browser` 12 of 12; `git diff --check` |
| G-P07-17 | Documentation and records updated | Passed | `planning/information-architecture.md` (section 15), `design-system.md`, `architecture.md`, `development/`, `debugging/known-limitations.md`, `README.md`, `AGENTS.md` |
| G-P07-18 | Committed locally on `development`, not pushed | Passed | The P07 commit; `development` has no upstream |
| G-P07-19 | The owner approves the preview's appearance | Passed | The owner approved the previews after reviewing the 13 P07 screenshots (D-063). Question 21 in `planning/design-system.md` section 10 remains a refinement. |

### Preview tests (P07)

| Test | Where | Result |
| --- | --- | --- |
| PREV-001 Immediate descendants | `tests/previews.mjs` | Pass |
| PREV-002 Overview destination | `tests/previews.mjs` | Pass |
| PREV-003 Leaf behavior | `tests/previews.mjs` | Pass |
| PREV-004 Active folder behavior | `tests/previews.mjs` (model and built pages); browser, cases D and E | Pass |
| PREV-005 No selection mutation | `tests/previews.mjs` (model); `tests/previews-browser.mjs` (cases A and B) | Pass |
| PREV-006 No recursive previews | `tests/previews.mjs` | Pass |
| PREV-007 Correct ordering | `tests/previews.mjs` | Pass |
| PREV-008 Keyboard accessibility | `tests/previews-browser.mjs` (case G) | Pass in Chromium |
| PREV-009 Pointer transition | `tests/previews-browser.mjs` | Pass in Chromium |
| PREV-010 Switch preview | `tests/previews-browser.mjs` | Pass in Chromium |
| PREV-011 Viewport positioning | `tests/previews-browser.mjs` (cases C, F, I and the five-width sweep) | Pass in Chromium |
| PREV-012 Coarse pointer | `tests/previews-browser.mjs` (case H, emulated touch) | Pass in Chromium |
| PREV-013 No JavaScript navigation | `tests/previews.mjs` (markup); `tests/previews-browser.mjs` (scripts disabled) | Pass |
| PREV-014 Active indicator | `tests/previews.mjs` (markup); `tests/previews-browser.mjs` | Pass |
| PREV-015 Semantic integrity | `tests/previews.mjs` | Pass |

The browser tests are run by `npm run test:browser`, not by `npm run verify` (D-062). Updated P06 tests: NAV-030 and FOLD-007 allow a preview after an unopened parent's link; NAV-031 now proves that navigation needs no JavaScript and that the preview module is the only script; the smoke test allows that one inlined module on pages with folders.

**Negative checks.** Each was applied to the source, rebuilt and tested, then reverted:

- no close and switch delays: PREV-009 and PREV-010 failed;
- no Escape handler: PREV-008 failed;
- previews opening on touch: PREV-012 failed;
- no viewport clamp: PREV-011 failed;
- no focus return on Escape: PREV-008 failed;
- two previews allowed at once: PREV-010 failed;
- the preview inside the tab's link: PREV-015 and NAV-030 failed;
- previews visible without the script: PREV-013 failed;
- `role="menu"` on the list: PREV-015 failed;
- the title announced with the list name: PREV-015 failed.

`FolderStack` failed the build for a preview of an open folder and for a preview out of order.

## P08 gates

Checked by `npm run verify`, by `npm run test:browser` (headless Chrome 157: 12 preview and 17 responsive checks) and by screenshots of the built site at 320, 360, 390, 430, 768, 1024, 1280, 1440 and 1920 px, plus the desktop app's browser at 375 px. Chromium only; touch emulated (KL-32). **The owner reviewed the screenshots and approved the small-screen layout (G-P08-20, D-070); real devices remain untested (G-P08-21).**

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-P08-01 | Physical tabs stay recognizable at every tested width | Passed (Chromium) | Screenshots 320–1920 px; RESP-002 (labels whole), RESP-013 (one layout in every environment) |
| G-P08-02 | Every global tab is reachable on narrow screens | Passed (Chromium) | RESP-002 at 320, 390, 768 and 1024 px: all twelve, in order, hit-testable |
| G-P08-03 | Second- and third-level tabs stay reachable | Passed (Chromium) | RESP-004, RESP-005, RESP-011 (Tab reaches Outreach) |
| G-P08-04 | Selected tabs are revealed | Passed (Chromium) | RESP-003, RESP-004, RESP-005: natively and with the script standing in, at 320–768 px, every section and twelve second-level pages; a tab already in view is not moved; the page never scrolls |
| G-P08-05 | Overview selection works | Passed | RESP-006 (built pages and 390 px) |
| G-P08-06 | The three-level hierarchy is preserved | Passed | RESP-005, RESP-008: three rows on a phone, never a fourth |
| G-P08-07 | The content body stays readable | Passed (Chromium) | RESP-005: the deepest paper keeps at least 72% of the width at 320 and 390 px (238 and 304 px for three levels) |
| G-P08-08 | No unintended page-wide horizontal overflow | Passed (Chromium) | RESP-001: ten widths, ten pages including both studies |
| G-P08-09 | P07 previews still work | Passed (Chromium) | PREV-005 to PREV-014 all pass; RESP-009 (previews follow a scrolling row or close), RESP-012 (keyboard previews at 390 px) |
| G-P08-10 | Touch keeps direct navigation | Passed (emulated touch) | RESP-010: a swipe scrolls the row without navigating or previewing, one tap opens CV, every tab at least 44 px tall; PREV-012 |
| G-P08-11 | Keyboard users reach off-screen tabs | Passed (Chromium) | RESP-011: Tab reaches every tab in order at 320 and 390 px; Enter opens Bearnard's Area from off-screen |
| G-P08-12 | Focus indicators stay visible | Passed (Chromium) | RESP-011: every focused tab and its 3 px ring clear of the fades and the row's top edge |
| G-P08-13 | Wide tables and code are contained | Passed (Chromium) | RESP-014 at 320, 390 and 768 px: code, table region and formula scroll inside themselves, long words wrap, figure scales; a bare wide table scrolls the paper, not the page |
| G-P08-14 | The responsive implementation works across environments | Passed | RESP-013 (built and at 320 and 768 px); RESP-004 case D in the personal environment |
| G-P08-15 | Desktop appearance consistent with the approved design | Passed (Chromium) | RESP-015: shell, paper, heading and row positions at 1024, 1280 and 1440 px identical to P07's; 1440 px screenshot differs from P07's by 1/255 on 727 pixels (rasterisation) |
| G-P08-16 | Automated and browser verification passes | Passed | `npm run verify`; `npm run test:browser` 29 of 29; `git diff --check` |
| G-P08-17 | Documentation and records updated | Passed | `planning/design-system.md`, `information-architecture.md` (section 16), `architecture.md`, `development/`, `debugging/known-limitations.md`, `README.md`, `AGENTS.md` |
| G-P08-18 | Committed locally on `development` | Passed | The P08 commit; `development` has no upstream |
| G-P08-19 | No deployment and no push | Passed | No push or deployment command was run |
| G-P08-20 | The owner approves the responsive appearance | Passed | The owner approved the layout after reviewing the 16 P08 screenshots (D-070). Question 22 in `planning/design-system.md` section 10 remains a refinement. |
| G-P08-21 | Real phones and tablets | **Untested** | Pending the owner's verification on real devices (KL-32) |

### Responsive tests (P08)

| Test | Where | Result |
| --- | --- | --- |
| RESP-001 No page-wide overflow | Browser | Pass in Chromium |
| RESP-002 Global strip overflow | Browser | Pass in Chromium |
| RESP-003 Selected top-level visibility | Browser (native and script) | Pass in Chromium |
| RESP-004 Selected child visibility | Browser (native and script) | Pass in Chromium |
| RESP-005 Third-level visibility (synthetic fixture) | Browser (native and script) | Pass in Chromium |
| RESP-006 Overview preservation | `tests/responsive.mjs`; browser | Pass |
| RESP-007 Link preservation | `tests/responsive.mjs`; browser | Pass |
| RESP-008 No unwanted extra layers | `tests/responsive.mjs`; browser | Pass |
| RESP-009 Preview positioning in scrolling rows | Browser | Pass in Chromium |
| RESP-010 Touch behavior | Browser (emulated touch) | Pass in Chromium |
| RESP-011 Keyboard reachability | Browser | Pass in Chromium |
| RESP-012 Focus visibility | Browser (RESP-011's ring checks; keyboard previews) | Pass in Chromium |
| RESP-013 Environment consistency | `tests/responsive.mjs`; browser | Pass |
| RESP-014 Content overflow containment | `tests/responsive.mjs`; browser | Pass |
| RESP-015 Desktop regression | `tests/responsive.mjs`; browser | Pass |
| RESP-016 No-JavaScript navigation | `tests/responsive.mjs`; browser | Pass |
| RESP-017 Reduced motion, zoom and large text | `tests/responsive.mjs`; browser (200% text at 390 px; 640 and 320 px for 1280 px at 200% and 400% zoom) | Pass in Chromium |

Real-device checks are not part of this table: none were run (G-P08-21). PREV-011's browser test now waits for the switch delay after hovering, because P08's narrower phone insets put another folder on the test pointer's path; the behaviour itself is P07's.

**Negative checks.** Each was applied to the source, rebuilt and tested, then reverted:

- no scroll padding: RESP-003, RESP-004 and RESP-011 failed;
- the gutter growing to 2.5rem again: RESP-015 failed;
- no last-resort paper scrolling: RESP-014 failed;
- no opening reveal in the script: RESP-003, RESP-004 and RESP-005 failed;
- no focus correction: RESP-011 failed;
- P05's nest insets on phones: RESP-005 failed;
- no coarse-pointer tab heights: RESP-010 failed;
- no word wrapping on the paper: RESP-014 failed (once the sample gained a definition term, which P03's rules do not wrap);
- no `.gl-scroll-x` scrolling: RESP-014 failed;
- a shell padding that departs from P05's curve at 1024 px: RESP-015 failed.

## P09 gates

P09 has three separate gates. Navigation continuity (Gate A) is checked by `npm run verify`, `npm run test:browser` and frame-by-frame recordings in headless and visible Chrome 157. Smoothness is the owner's judgement on real screens; ISSUE-0004 stays open until then.

### Gate A — Navigation continuity

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-P09-A1 | The blinking is diagnosed | Passed | ISSUE-0004: no blank frame; a one-frame hard cut of the whole viewport, with environment colours and (on phones) row positions changing at once; production and dev alike |
| G-P09-A2 | A native, nonintrusive remedy is implemented | Passed | D-071: a 140 ms cross-document view transition on folder pages only; largest change between two frames 2.5–4.8 (was 17–28) in a visible window |
| G-P09-A3 | Ordinary link navigation, no client-side router | Passed | TRANS-B04, NAV-031, TRANS-007 (no JavaScript) |
| G-P09-A4 | Reduced motion gets no animation | Passed | TRANS-B02, TRANS-008 |
| G-P09-A5 | P07 previews and P08 rows still work | Passed | PREV and RESP suites pass with the transition on; TRANS-009, TRANS-010 |
| G-P09-A6 | The owner confirms the blink has meaningfully improved on real desktop and mobile browsers | **Untested** | Pending the owner's retest (ISSUE-0004). Not marked on the owner's behalf. |

### Navigation-continuity tests (P09)

| Test | Where | Result |
| --- | --- | --- |
| TRANS-001 No blank frame | Browser, frame by frame, plain navigation | Pass in Chromium; with the transition, 0 white frames in 52 visible-window runs (recorded by hand; KL-35 for headless) |
| TRANS-002 Production behaviour | Browser (production build); dev compared by hand | Pass |
| TRANS-003 Same environment | Browser | Pass |
| TRANS-004 Cross environment | Browser | Pass |
| TRANS-005 Back/Forward | Browser | Pass |
| TRANS-006 Direct URL and reload | Browser | Pass |
| TRANS-007 No JavaScript | Browser | Pass |
| TRANS-008 Reduced motion | `tests/transitions.mjs`; browser | Pass |
| TRANS-009 Previews | Browser; PREV suite | Pass |
| TRANS-010 Responsive selection | Browser; RESP suite | Pass |
| TRANS-011 No route regression | Browser (all 37 pages) | Pass |
| TRANS-012 Stability | Browser | Pass |
| TRANS-B01 to TRANS-B04 Declarations and scope | `tests/transitions.mjs` | Pass |

### Gate B — Bearnard foundations

Checked by `tests/bearnard.mjs` (in `npm run verify`), the smoke test, `shasum -c` over the masters, and a build in a copy of the repository without `brand/bearnard/`.

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-P09-B1 | The illustration registry exists | Passed | `src/illustrations/bearnard.ts`; BEAR-001, BEAR-003 |
| G-P09-B2 | The reusable component exists and fails gracefully | Passed | `BearnardIllustration`; BEAR-005; `/_design/bearnard/` |
| G-P09-B3 | Protected masters remain unchanged | Passed | `shasum -a 256 -c assets/bearnard/SHA256SUMS`: 352 of 352 match after generation; BEAR-004; `brand/bearnard/` still gitignored |
| G-P09-B4 | Every derivative is traceable to an approved original | Passed | `assets/bearnard/derivatives.json`; BEAR-002, BEAR-003; the generator refuses unapproved or altered masters |
| G-P09-B5 | The build is reproducible without the masters | Passed | A copy without `brand/bearnard/`: `npm run verify` passes, BEAR-004 SKIPPED, all others pass; BEAR-007 |
| G-P09-B6 | No full-resolution master in `public/` or `dist/` | Passed | BEAR-006, BEAR-008; the smoke test's checksum comparison against all 352 masters |
| G-P09-B7 | The owner assigns illustrations to roles | **Untested** | No role is assigned (D-073; design-system question 23). Not decided on the owner's behalf. |

### Bearnard tests (P09)

| Test | Where | Result |
| --- | --- | --- |
| BEAR-001 Registry integrity: unique, stable IDs matching the provenance | `tests/bearnard.mjs` | Pass |
| BEAR-002 Asset existence: files in `public/` and `dist/` match their recorded checksums and sizes | `tests/bearnard.mjs` | Pass |
| BEAR-003 Metadata: alt text, known roles, approved master, matching provenance, uncropped | `tests/bearnard.mjs` | Pass |
| BEAR-004 The masters are unchanged | `tests/bearnard.mjs` | Pass with the masters present; SKIPPED in a checkout without them |
| BEAR-005 Missing variant: unassigned roles and unknown IDs fall back | `tests/bearnard.mjs`; the study | Pass |
| BEAR-006 The build holds no master and no oversized image | `tests/bearnard.mjs`; smoke test | Pass |
| BEAR-007 Nothing in the build reads the masters | `tests/bearnard.mjs`; clean copy | Pass |
| BEAR-008 Asset references are site-relative, never local paths | `tests/bearnard.mjs` | Pass |

### Gate C — Environmental refinement

**Superseded by P09-A01 (D-076) on 2026-11-12.** The owner chose the Chromatic Archive; the candidates, their study, their stylesheet and `tests/environments.mjs` were removed, and the gates below are kept as the record of P09 as it stood at `b76f3b0`. They are not current checks.

At the time: checked by `tests/environments.mjs` (in `npm run verify`) and by screenshots of `/_design/environments-v2/` at 1440, 1280, 768 and 390 px. The tests prove structure and legibility; preference is the owner's.

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-P09-C1 | A visual comparison exists for the four environments | Passed | `/_design/environments-v2/`: four pairs, same folders and text on both sides (ENV-004); 16 screenshots |
| G-P09-C2 | The approved palette remains available and unchanged | Passed | ENV-006 (fingerprint of every approved environment token; all four shown as "Current · approved"); `environments.css` and `tokens.css` have no diff |
| G-P09-C3 | Candidates are marked pending the owner's approval | Passed | Every proposed sample is captioned "Proposed · pending the owner's approval" (ENV-006); D-075; the candidate stylesheet's header |
| G-P09-C4 | Candidates reach no site page | Passed | ENV-005: no page but the study contains or loads `proposed-` styling; all 37 folder pages keep an approved environment |
| G-P09-C5 | Candidates stay legible | Passed | ENV-001 (complete token sets), ENV-002 (49 enforced pairings in each of the 4 candidates, 0 failures), ENV-003 (tab distinction) |
| G-P09-C6 | Folder geometry and behaviour are untouched | Passed | ENV-004; FOLD, PREV, RESP and TRANS suites unchanged and passing; RESP-001 covers the study at ten widths |
| G-P09-C7 | The owner decides which candidates to adopt | Closed: superseded | The owner adopted none and approved the Chromatic Archive instead (D-076) |

### Environment tests (P09; removed in P09-A01)

Results at `b76f3b0`. The file no longer exists; CAT-010 checks that the candidates are gone.

| Test | Where | Result |
| --- | --- | --- |
| ENV-001 Every environment, approved or proposed, is a complete token set | `tests/environments.mjs` | Pass |
| ENV-002 Text and indicators stay legible in every proposed environment | `tests/environments.mjs` | Pass |
| ENV-003 Active and inactive tabs stay as distinct as in the approved environments | `tests/environments.mjs` | Pass |
| ENV-004 Candidates change colours only, never folder geometry | `tests/environments.mjs` | Pass |
| ENV-005 Candidate styling reaches no other page | `tests/environments.mjs` | Pass |
| ENV-006 The approved palette is unchanged and still shown; proposals marked pending | `tests/environments.mjs` | Pass |

## P09-A01 gates — Chromatic Archive

Addendum 01 to P09 (D-076). Checked by `tests/categories.mjs` and `tests/contrast.mjs` (in `npm run verify`), by `tests/categories-browser.mjs` (in `npm run test:browser`, headless Chrome 157) and by screenshots.

**Counts since P09-A01.** External left the navigation: the site has **11** top-level tabs, 36 registered folders and 36 folder pages, and 3 design studies. Earlier gates in this file that say twelve tabs, 37 pages, four design studies, or "every environment" for colour record what was true when they passed; the same tests pass today with the new counts.

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-A01-01 | Exactly eleven top-level tabs; External absent | Passed | CAT-001; NAV-001 to NAV-021; `/external/` is not built (NAV-026, smoke test) |
| G-A01-02 | The tabs are in the approved order | Passed | CAT-001 (registry and every built page) |
| G-A01-03 | Every section has its approved category | Passed | CAT-002; NAV-027 (each page's `data-category` and `data-environment`) |
| G-A01-04 | The five palettes are the exact locked values | Passed | CAT-003: 25 values compared with the addendum's table |
| G-A01-05 | Every top-level tab keeps its own colour on every page | Passed (Chromium) | CAT-008 (markup, 36 pages), CAT-011 (painted colour of all 11 tabs on 9 pages, at 1440 and 390 px), CAT-006 |
| G-A01-06 | A selected tab and its folder body are the same colour | Passed (Chromium) | CAT-005 (tokens, three levels), CAT-012 (painted, levels 1 and 2) |
| G-A01-07 | Second-level tabs and bodies use the Level 2 material | Passed (Chromium) | CAT-005, CAT-012 |
| G-A01-08 | The reading paper is the page's category | Passed (Chromium) | CAT-003, CAT-013 |
| G-A01-09 | Flannel ground and line follow the page's category; the weave is unchanged | Passed (Chromium) | CAT-013; `global.css` `.gl-flannel` geometry has no diff |
| G-A01-10 | Shell, links, accent and V are fixed everywhere | Passed (Chromium) | CAT-004 (tokens), CAT-014 (painted on 9 pages) |
| G-A01-11 | No environment override recolours unrelated tabs | Passed | CAT-007: environments declare no colour token; CAT-011 |
| G-A01-12 | Overview tabs still work | Passed | NAV-022, NAV-029, RESP-006; FOLD suite |
| G-A01-13 | Hover previews still work, in the hovered folder's own material | Passed (Chromium) | PREV-001 to PREV-015; CAT-015 |
| G-A01-14 | Small-screen tab scrolling still works | Passed (Chromium) | RESP-001 to RESP-017; CAT-017 |
| G-A01-15 | Browser navigation still works: ordinary pages, no router | Passed (Chromium) | TRANS-001 to TRANS-012; NAV-031; CAT-016 (CV → Writing) |
| G-A01-16 | No fourth folder layer | Passed | RESP-008; NAV-025 |
| G-A01-17 | Contrast checks updated and run for the five categories | Passed | `tests/contrast.mjs`: 260 pairings, 245 enforced, 0 failures; `planning/design-system.md` section 8 |
| G-A01-18 | The locked link colour is legible wherever it is used | Passed, with a recorded limit | Links on paper 6.93–7.54:1 and on Level 2 4.52–6.74:1. Forest Teal is not used on the shell (1.88:1) nor directly on Level 1 cardstock (2.78–5.78:1): KL-38, design-system question 26 |
| G-A01-19 | No font or geometry change | Passed | `git diff` of `folders.css` changes colour tokens only; FOLD-001 to FOLD-010, NAV-030 and RESP-015 pass; environment type values compared in CAT-007 |
| G-A01-20 | One source of truth for the palettes | Passed | CAT-009: category tokens are declared only in `src/styles/categories.css` |
| G-A01-21 | The superseded candidates are gone | Passed | CAT-010 |
| G-A01-22 | Bearnard masters untouched | Passed | BEAR-004; `shasum -a 256 -c assets/bearnard/SHA256SUMS` |
| G-A01-23 | The colours look right on real screens, in Safari and Firefox, and to the owner's eye | **Untested** | Chromium on one display only (KL-39). The owner's review of the screenshots and of the running site is pending. |

### Category tests (P09-A01)

| Test | Where | Result |
| --- | --- | --- |
| CAT-001 The global row has exactly the eleven approved tabs | `tests/categories.mjs` | Pass |
| CAT-002 Every section has its approved category | `tests/categories.mjs` | Pass |
| CAT-003 The five palettes are the locked colours | `tests/categories.mjs` | Pass |
| CAT-004 The shell, links, accent and V never change | `tests/categories.mjs` | Pass |
| CAT-005 A selected tab and its folder body are one material, level by level | `tests/categories.mjs` | Pass |
| CAT-006 Inactive and hovered top-level tabs are their own cardstock, evenly dimmed | `tests/categories.mjs` | Pass |
| CAT-007 No environment can recolour anything | `tests/categories.mjs` | Pass |
| CAT-008 Every built page gives each top-level tab its own category | `tests/categories.mjs` | Pass |
| CAT-009 The palettes have one source of truth | `tests/categories.mjs` | Pass |
| CAT-010 The superseded palette candidates are gone | `tests/categories.mjs` | Pass |
| CAT-011 Every top-level tab is painted in its own cardstock, on every page | Browser | Pass |
| CAT-012 The selected tab and its open folder are one material, at both levels | Browser | Pass |
| CAT-013 Reading paper and flannel follow the page; the shell never changes | Browser | Pass |
| CAT-014 Links, the accent and the V are the same colours on every page | Browser | Pass |
| CAT-015 A hovered tab keeps its own hue, moves no V, and previews in its own cardstock | Browser | Pass |
| CAT-016 CV → Writing: the tabs keep their colours and only the open folder changes | Browser | Pass |
| CAT-017 Small screens: the selected tab is in view, in its own colour, among the others | Browser | Pass |

## P10 gates — Editorial collections and navigation grouping

Checked by `tests/navigation.mjs`, `tests/categories.mjs`, `tests/content.mjs` and `tests/editorial-build.mjs` (all in `npm run verify`), by `tests/categories-browser.mjs` and the other browser suites (`npm run test:browser`, headless Chrome 157), and by screenshots at 1440, 1280 and 390 px. Real devices and other browsers are untested.

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-P10-01 | The eleven tabs are ordered by category and each category is one block | Passed | NAV-001, NAV-033, CAT-001; screenshots of the row at 1440, 1280 and 390 px |
| G-P10-02 | Labels, IDs, URLs, categories, environments and children are unchanged | Passed | NAV-001 to NAV-021, CAT-002, CAT-003; every page of the build |
| G-P10-03 | A registry that splits a category is rejected | Passed | `validateNavigation()`; NAV-033 |
| G-P10-04 | Folder geometry, Overview, previews and small-screen scrolling are unchanged | Passed (Chromium) | FOLD, PREV, RESP and TRANS suites; only the order assumed by PREV-008 and RESP-002 changed (D-077) |
| G-P10-05 | The palettes and the shared colours are unchanged | Passed | CAT-003, CAT-004, `git diff` of `categories.css`, `tokens.css` and `folders.css` is empty |
| G-P10-06 | Exactly eight editorial collections, each with its directory, owner and prefix | Passed | CONT-001 |
| G-P10-07 | Common and collection-specific metadata validate; malformed metadata is rejected | Passed | CONT-002, CONT-003, CONT-004; built: CONT-004 |
| G-P10-08 | Public URLs are unique, stable and independent of titles and file names | Passed | CONT-005, CONT-006; built: CONT-005 |
| G-P10-09 | Drafts have no page; published and archived entries do | Passed | CONT-007 to CONT-009; built: CONT-007 to CONT-009 |
| G-P10-10 | Entries belong to the right folder and category and add no fourth row | Passed (Chromium for the paint) | CONT-010 to CONT-012; built: CONT-010 to CONT-012 |
| G-P10-11 | Unknown slugs are not pages; entry and folder routes do not collide | Passed | CONT-013, CONT-017; built: CONT-013 |
| G-P10-12 | Indexes are deterministic and empty collections work | Passed | CONT-014, CONT-015; built: CONT-014, CONT-015 |
| G-P10-13 | Markdown renders inside the owning folder, with no client router | Passed | built: CONT-016; screenshots of a synthetic berry at 1440 and 390 px |
| G-P10-14 | The pipeline builds without the Bearnard masters and any private folder | Passed | CONT-018 |
| G-P10-15 | No synthetic fixture, draft or private file reaches the real build | Passed | CONT-019; the smoke test; the real `dist/` holds no editorial page |
| G-P10-16 | The five required navigations keep URLs, selection, tab colours, Back and Forward | Passed (Chromium) | CAT-018 at 1440 and 390 px |
| G-P10-17 | Editorial pages work on real devices and in Safari and Firefox | **Untested** | Chromium only (KL-39) |
| G-P10-18 | Draft preview in `astro dev` | Passed (manual) | A throwaway copy served by `astro dev`: draft 200 with its notice, not in the index, unknown slug 404. Not automated. |

### Editorial tests (P10)

| Test | Where | Result |
| --- | --- | --- |
| NAV-033 Each category is one contiguous block in the global row | `tests/navigation.mjs` | Pass |
| CAT-018 The five navigations of P10: ordinary URLs, selection, colours, Back and Forward | Browser | Pass |
| CONT-001 Exactly eight editorial collections are registered | `tests/content.mjs` | Pass |
| CONT-002 The shared metadata contract | `tests/content.mjs` | Pass |
| CONT-003 Collection-specific fields | `tests/content.mjs` | Pass |
| CONT-004 Invalid metadata is rejected | `tests/content.mjs`; `tests/editorial-build.mjs` (built) | Pass |
| CONT-005 Two entries cannot share a public URL | `tests/content.mjs`; `tests/editorial-build.mjs` (built) | Pass |
| CONT-006 Public routes do not depend on titles or file names | `tests/content.mjs` | Pass |
| CONT-007 Draft entries have no page | both (model and built) | Pass |
| CONT-008 Published entries declare their routes | both | Pass |
| CONT-009 Archived entries keep their routes | both | Pass |
| CONT-010 Every entry belongs to the folder that owns its collection | both | Pass |
| CONT-011 Entries inherit their section's archive category | both | Pass |
| CONT-012 An entry adds no fourth row of tabs | both | Pass |
| CONT-013 Unregistered paths are not pages | both | Pass |
| CONT-014 Indexes list in a stable order | both | Pass |
| CONT-015 Empty collections are fine | both | Pass |
| CONT-016 Markdown renders in the standard page shell | `tests/editorial-build.mjs` (built only) | Pass |
| CONT-017 Entry routes never collide with folder routes | `tests/content.mjs` | Pass |
| CONT-018 The content pipeline builds without the local Bearnard masters | `tests/editorial-build.mjs` | Pass |
| CONT-019 Synthetic fixtures never enter the content directories | `tests/content.mjs` | Pass |

## P11 gates — Canonical records

Checked by `tests/records.mjs` (REC-001 to REC-026) and CONT-020 in `tests/editorial-build.mjs`, both in `npm run verify`; the existing suites and `npm run test:browser` (headless Chrome 157) for regressions; and the study `/_design/records/` looked at in a browser. **Every gate is passed with synthetic records only: the site's own records are empty.**

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-P11-01 | P10 is complete before P11 starts | Passed | `npm run verify` at `426712c`: all suites pass; three P10 commits present |
| G-P11-02 | Canonical entity types exist | Passed | Eight families in `src/records/schema.ts`; REC-014 |
| G-P11-03 | Every record has a stable, unique identity | Passed | REC-001, REC-002 |
| G-P11-04 | Records are schema-validated, with useful errors | Passed | REC-003, REC-004, REC-007 |
| G-P11-05 | Dates keep their precision; impossible dates are rejected | Passed | REC-005, REC-006 |
| G-P11-06 | Relationships use stable references, checked | Passed | REC-008 to REC-011, REC-014, REC-015 |
| G-P11-07 | Author order is preserved; external authors need no profile | Passed | REC-012, REC-013 |
| G-P11-08 | Projects and outputs are not duplicated across sections | Passed | REC-017 to REC-019: one record, derived views; no reverse list is stored (REC-011) |
| G-P11-09 | CV, Portfolio, Lab and publication selectors exist and are deterministic | Passed | REC-016 to REC-020 |
| G-P11-10 | Editorial collections can reference records, and stay eight | Passed | REC-023, CONT-001, CONT-020 |
| G-P11-11 | Synthetic fixtures prove the data flow | Passed | 29 synthetic records; `/_design/records/` |
| G-P11-12 | No fabricated professional or academic information is published | Passed | REC-021 (the site's loader refuses synthetic records; the production lists are empty), REC-025 |
| G-P11-13 | Hidden and unverified records do not reach the build | Passed | REC-025: no page, the study included, shows a withheld record |
| G-P11-14 | A record creates no page | Passed | REC-022; the smoke test; 36 folder pages and 4 studies |
| G-P11-15 | The record system builds without private data or the masters | Passed | REC-024; CONT-018 (throwaway builds with no `brand/`, `cv/` or private folder) |
| G-P11-16 | Physical folders, palette and P10 collections are unchanged | Passed (Chromium) | REC-026; NAV, FOLD, PREV, RESP, TRANS, CAT and CONT suites; no diff in `src/styles/` or `src/navigation/` |
| G-P11-17 | The study is clearly development-only and synthetic | Passed | Looked at 1440 and 390 px; no sideways scroll at 1280, 768 and 320 px (measured) |
| G-P11-18 | Real records are correct | **Untested** | There are none. The first real records need the owner's verification (KL-46). |
| G-P11-19 | The projections suit the finished CV, Portfolio and Lab pages | **Untested** | Those pages are later prompts; the projections are shown only in the study. |

### Record tests (P11)

| Test | Result |
| --- | --- |
| REC-001 Every record has a valid, stable ID | Pass |
| REC-002 Duplicate IDs are rejected | Pass |
| REC-003 Missing required fields are reported usefully | Pass |
| REC-004 Incomplete records are valid, and invent nothing | Pass |
| REC-005 Dates keep the precision they were written with | Pass |
| REC-006 Impossible and malformed dates are rejected | Pass |
| REC-007 Malformed URLs, DOIs and ORCID iDs are rejected | Pass |
| REC-008 Unknown person IDs are detected | Pass |
| REC-009 Unknown organization IDs and looping hierarchies are detected | Pass |
| REC-010 Unknown project IDs are detected | Pass |
| REC-011 Outputs reference valid projects, areas and outputs | Pass |
| REC-012 Author order is preserved exactly | Pass |
| REC-013 External authors need no person record | Pass |
| REC-014 A legitimate interconnected graph is valid | Pass |
| REC-015 A broken graph gives actionable diagnostics | Pass |
| REC-016 The CV projection is chronological and consistent | Pass |
| REC-017 The Portfolio projection uses the canonical projects | Pass |
| REC-018 The Lab projection relates areas, projects, outputs and people | Pass |
| REC-019 One output says the same thing in every projection | Pass |
| REC-020 Selectors change nothing | Pass |
| REC-021 Synthetic records cannot become the site's records | Pass |
| REC-022 A record creates no page | Pass |
| REC-023 The eight editorial collections stay independent | Pass |
| REC-024 The record system needs nothing outside `src/` | Pass |
| REC-025 Hidden and synthetic records are not emitted | Pass |
| REC-026 The physical folders are unchanged | Pass |
| CONT-020 An entry that names a record the site lacks fails the build (built) | Pass |

## P11-A01 gates — The CV as the source of the owner's records

Checked by `tests/cv.mjs` (CV-001 to CV-020) in `npm run verify`, on a synthetic fixture (`tests/fixtures/cv/`) and, where it is present, on fingerprints and counts of the real working file; and by the existing suites for regressions.

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-A11-01 | The versioned CV YAML is recognised as authoritative for the owner's professional history | Passed | D-089; `planning/content-model.md`, "The author's CV"; `AGENTS.md` |
| G-A11-02 | P11 is reconciled with that authority | Passed | `PRODUCTION_RECORDS` = independent records + CV snapshot; CV-012 |
| G-A11-03 | No second hand-maintained CV database | Passed | CV-012: a hand-written fact of the owner is refused; the independent lists are empty |
| G-A11-04 | A read-only integration path exists | Passed | `src/cv/`, `scripts/cv.mjs`; CV-002, CV-003 |
| G-A11-05 | The proposal stays editable and unchanged | Passed | SHA-256 `8e402f27…4e49` before and after; CV-003; nothing under `cv/codex-yaml/` written or staged |
| G-A11-06 | Placeholder and review-state handling is explicit | Passed | CV-004, CV-005, CV-006, CV-007 |
| G-A11-07 | Version selection is controlled | Passed | CV-008 |
| G-A11-08 | Publication needs explicit approval | Passed | CV-006 to CV-008; `cv/manifest.json`: nothing approved, publication off |
| G-A11-09 | Private references and unresolved records cannot reach the site | Passed | CV-005, CV-013, CV-014, CV-017, CV-018 |
| G-A11-10 | P10 and P11 infrastructure still works | Passed (Chromium) | All earlier suites; CV-016, CV-019; `dist/` is byte-count identical (1,176,165) |
| G-A11-11 | Automated checks pass | Passed | `npm run verify`; `npm run test:browser` |
| G-A11-12 | Documentation is updated | Passed | The seven documents of the brief, and `cv/README.md`, `AGENTS.md`, `README.md` |
| G-A11-13 | No premature publication of the CV | Passed | `CV_SNAPSHOT` is `null`; CV-007, CV-015, CV-018 |
| G-A11-14 | A real version, approved by the owner, yields a correct public snapshot | **Untested** | No version exists or is approved. Proved on the synthetic fixture only (CV-017). |
| G-A11-15 | The mapping suits the finished CV pages and the CV exports | **Untested** | Those are later prompts. |
| G-A11-16 | The Git ignore rule for the CV files is what the owner wants | Passed | D-093: the owner confirmed it on 2026-11-14 ("Keep ignored") |

### CV tests (P11-A01)

| Test | Result |
| --- | --- |
| CV-001 The proposal YAML parses successfully | Pass (real file and fixture) |
| CV-002 The adapter supports the Portuguese section names | Pass |
| CV-003 Source files remain unchanged after loading | Pass (real file and fixture) |
| CV-004 Authoring validation keeps unresolved placeholders | Pass |
| CV-005 Publication validation excludes unresolved placeholders | Pass |
| CV-006 `fonte_de_verdade: true` does not authorize publication | Pass |
| CV-007 A proposal under author review is not publicly approved | Pass |
| CV-008 Version selection is explicit | Pass |
| CV-009 Source IDs are kept through the identity mapping | Pass |
| CV-010 Author order and co-first-author notes are kept | Pass |
| CV-011 An unknown end is not an ongoing appointment | Pass |
| CV-012 CV-derived records feed the record selectors, once | Pass |
| CV-013 Private references and contact details are not projected | Pass |
| CV-014 Templates and placeholder inventories never become records | Pass |
| CV-015 No approved CV data does not break the build | Pass |
| CV-016 The eight editorial collections stay independent | Pass |
| CV-017 The site builds from an approved snapshot, without the raw CV (built) | Pass (synthetic snapshot) |
| CV-018 No CV source reaches client-side code or public files | Pass (real file and fixture) |
| CV-019 The Chromatic Archive and the folders are unchanged | Pass |
| CV-020 The raw CV is not tracked, formatted or served (added by Claude Code) | Pass |

## P12 gates — Editorial reading layouts

| ID | Gate | Status |
| --- | --- | --- |
| G-P12-01 | Eight distinct reading layouts on one shell | **Passed** (EDIT-001 to EDIT-003, EDIT-003B); looked at in Chromium on the study. Visual approval is the owner's |
| G-P12-02 | Articles stay in their owning folder; no fourth row | **Passed** (EDIT-004, EDIT-005, CONT-012) |
| G-P12-03 | Drafts have no page and are never listed or linked | **Passed** (EDIT-006, EDIT-003B, EDIT-018) |
| G-P12-04 | Empty collections say so | **Passed** (EDIT-007, CONT-015) |
| G-P12-05 | Each collection orders by its own metadata | **Passed** (EDIT-008 to EDIT-011, EDIT-017) |
| G-P12-06 | Contents from real headings; none for a short article | **Passed** (EDIT-012, EDIT-013, EDIT-012B in a browser) |
| G-P12-07 | Code and tables stay inside the page, 320 to 1440 px | **Passed** in headless Chromium (EDIT-014, EDIT-015, EDIT-B01) |
| G-P12-08 | One `<h1>` per page; a level-1 heading in Markdown fails the build | **Passed** (EDIT-016, EDIT-016B, EDIT-016B browser) |
| G-P12-09 | Related entries resolve and exclude drafts | **Passed** (EDIT-018, EDIT-018B) |
| G-P12-10 | Synthetic fixtures are never published entries | **Passed** (EDIT-019) |
| G-P12-11 | Palettes, folders, tabs and transitions unchanged | **Passed** (EDIT-020, EDIT-022, the P06 to P09 suites) |
| G-P12-12 | The CV is untouched and absent from output | **Passed** (EDIT-021, CV-018) |
| G-P12-13 | The owner approves the reading layouts | **Pending**: the owner reviews `/_design/editorial/` |
| G-P12-14 | Screen readers, Safari, Firefox and real phones | **Untested**: Chromium with emulated viewports only |

### Editorial tests (P12)

| Test | Where | Status |
| --- | --- | --- |
| EDIT-001 Eight layouts | `tests/editorial-layouts.mjs` | Pass |
| EDIT-002 Shared components | same | Pass |
| EDIT-003 Layout identity (study) / EDIT-003B (real entries, built) | same / `tests/editorial-build.mjs` | Pass |
| EDIT-004 Folder ownership | `tests/editorial-layouts.mjs` | Pass |
| EDIT-005 No extra folder row | same | Pass |
| EDIT-006 Drafts | same | Pass |
| EDIT-007 Empty collections | same | Pass |
| EDIT-008 Blog ordering | same | Pass |
| EDIT-009 Trail ordering | same | Pass |
| EDIT-010 Timber Logs grouping | same | Pass |
| EDIT-011 Kosmos ordering | same | Pass |
| EDIT-012 Contents from headings / EDIT-012B anchors in a browser | same / `tests/editorial-browser.mjs` | Pass |
| EDIT-013 No empty contents | `tests/editorial-layouts.mjs` | Pass |
| EDIT-014 Code containment | `tests/editorial-browser.mjs` | Pass (headless Chromium) |
| EDIT-015 Table containment | same | Pass (headless Chromium) |
| EDIT-016 Heading semantics / EDIT-016B (built diagnostic; browser) | `tests/editorial-layouts.mjs`, `tests/editorial-build.mjs`, `tests/editorial-browser.mjs` | Pass |
| EDIT-017 Previous and next / EDIT-017B Back and Forward, keyboard focus | `tests/editorial-layouts.mjs`, `tests/editorial-browser.mjs` | Pass |
| EDIT-018 Related entries / EDIT-018B (built) | `tests/editorial-layouts.mjs`, `tests/editorial-build.mjs` | Pass |
| EDIT-019 Fixture isolation | `tests/editorial-layouts.mjs` | Pass |
| EDIT-020 Palettes untouched | same | Pass |
| EDIT-021 No CV in output | same | Pass |
| EDIT-022 Folders and tabs unchanged | same, and the P06 to P09 suites | Pass |
| EDIT-B01 No sideways scroll, 39 pages at 320, 390, 768, 1280, 1440 px | `tests/editorial-browser.mjs` | Pass |
| EDIT-B02 Reading widths and sizes | same | Pass |
| EDIT-B03 Literary and compact layouts on a phone | same | Pass |

## P13 gates — Quarto and scientific publishing

| ID | Gate | Status |
| --- | --- | --- |
| G-P13-01 | Astro stays the only website framework; Markdown stays the default | **Passed** (QTO-001, QTO-029) |
| G-P13-02 | A Quarto source is one ordinary entry with one URL and one metadata location | **Passed** (QTO-002 to QTO-004, throwaway build) |
| G-P13-03 | Drafts and the synthetic fixtures are not published | **Passed** (QTO-005, EDIT-019) |
| G-P13-04 | Equations, figure and table references, citations, bibliography, footnotes, callouts | **Passed** on a synthetic document (QTO-007 to QTO-014, QTO-030B) |
| G-P13-05 | Contents list and anchors follow the P12 Greenhouse | **Passed** (QTO-015, QTO-030C, QTO-030D) |
| G-P13-06 | Builds execute nothing; computation is explicit | **Passed** (QTO-016, QTO-017) |
| G-P13-07 | Reproducibility, as defined: two executions, identical results | **Passed** for the synthetic seeded code (QTO-018). Not shown: real analyses, other machines |
| G-P13-08 | Stale or hand-edited derivatives fail the build | **Passed** (QTO-019) |
| G-P13-09 | Works without Quarto for Markdown work | **Passed** (QTO-020) |
| G-P13-10 | Figures resolve; no caches or sources published | **Passed** (QTO-021, QTO-022) |
| G-P13-11 | P10, P11, P12, the CV, the palettes and the folders unchanged | **Passed** (QTO-023 to QTO-028) |
| G-P13-12 | Scientific content fits at 320 to 1440 px, Chromium | **Passed** (QTO-030) |
| G-P13-13 | The owner reviews the scientific layout | **Pending**: `/_design/quarto/` |
| G-P13-14 | Safari, Firefox, screen readers, MathML in other engines | **Untested** (KL-65) |

### Scientific-article tests (P13)

| Test | Where | Status |
| --- | --- | --- |
| QTO-001 to QTO-016, QTO-019 to QTO-029 | `tests/science.mjs` (27 checks, one throwaway build) | Pass |
| QTO-017 Explicit computation, QTO-018 Reproducibility | `tests/science-execute.mjs` | Pass with Quarto 1.10.19 and Python 3.12.13; reported SKIPPED, never passed, where either is missing |
| QTO-030 Browser validation (30, 30B, 30C, 30D) | `tests/science-browser.mjs` | Pass (headless Chromium) |

## P13-A01 gates — Environment and demonstrations

| ID | Gate | Status |
| --- | --- | --- |
| G-P13A-01 | The tools the site depends on have recorded versions and still pass after the Homebrew upgrades | **Passed** (`development/scientific-environment.md`, P13A-001, P13A-002 by `npm run verify`) |
| G-P13A-02 | An isolated Python environment is specified and restorable | **Passed** on macOS ARM64 (P13A-004, P13A-005, `science:restore-test`: P13A-005B). Not tested: other operating systems |
| G-P13A-03 | Quarto runs the code with that interpreter | **Passed** (P13A-003, P13A-006) |
| G-P13A-04 | Builds execute nothing; recomputation is explicit and deterministic | **Passed** (P13A-007, P13A-008, P13A-009, P13A-016) |
| G-P13A-05 | Three real Greenhouse demonstrations exist and work | **Passed** (P13A-010 to P13A-017) |
| G-P13A-06 | They are reachable by clicking from Home in the dev server | **Passed** (P13A-030) |
| G-P13A-07 | A release holds no trace of them; a demonstration build never touches the release | **Passed** (P13A-018 to P13A-021) |
| G-P13A-08 | P10, P11, P12, the CV, the palettes and the folders unchanged | **Passed** (P13A-022 to P13A-028; QTO-023 and QTO-024 name the additive changes) |
| G-P13A-09 | The pages fit at 320 to 1440 px, Chromium | **Passed** (P13A-029, P13A-029B) |
| G-P13A-10 | The owner reviews the demonstrations at localhost | **Pending** |
| G-P13A-11 | Safari, Firefox, Android Chrome itself, screen readers | **Untested** |

### Environment and demonstration tests (P13-A01)

| Test | Where | Status |
| --- | --- | --- |
| P13A-001, P13A-003 to P13A-007, P13A-009, P13A-025, P13A-026, P13A-028 | `tests/science-env.mjs` | Pass; P13A-003 and P13A-006 are reported SKIPPED where Quarto or the environment is missing |
| P13A-008 Explicit recomputation, P13A-016 Determinism | `tests/demo-execute.mjs` | Pass; SKIPPED without Quarto and Jupyter |
| P13A-010 to P13A-015, P13A-017 to P13A-024, P13A-027 | `tests/demos.mjs` (four throwaway builds) | Pass |
| P13A-005B, P13A-016B Restore from the specification | `tests/science-restore.mjs` (`npm run science:restore-test`; network, about two minutes; not in `npm test`) | Pass |
| P13A-029B Five widths, demonstration build | `tests/demo-browser.mjs` | Pass (headless Chromium) |
| P13A-030 Home to every demonstration by clicking, P13A-029 direct URLs | `tests/demo-dev-browser.mjs` (the real dev server) | Pass |
| P13A-002 The main verification | `npm run verify` | Pass |

## P14 gates — Authoring workflow

| ID | Gate | Status |
| --- | --- | --- |
| G-P14-01 | One small CLI creates drafts in all eight collections, and Markdown or Quarto where supported | **Passed** (AUTH-001 to AUTH-006, AUTH-036). Quarto creation needs Quarto: AUTH-003 is reported SKIPPED without it |
| G-P14-02 | New entries are drafts, slugs are stable, nothing is overwritten, unsafe paths are refused | **Passed** (AUTH-005 to AUTH-009, AUTH-027) |
| G-P14-03 | One preflight validates metadata, identity, relationships, text, Quarto and publication safety, with actionable messages | **Passed** (AUTH-010 to AUTH-016). Not shown: that an article is scientifically right |
| G-P14-04 | Drafts preview locally through the real layout; preview changes nothing and executes nothing | **Passed** (AUTH-017 to AUTH-020; a draft was also opened in the running dev server by hand, then removed) |
| G-P14-05 | Publishing and archiving are explicit, preflighted, atomic and keep the address | **Passed** (AUTH-021 to AUTH-023, AUTH-026; built pages AUTH-024, AUTH-025) |
| G-P14-06 | Quarto articles keep their `.qmd` as the source, and stale output blocks publication | **Passed** (AUTH-015, AUTH-028 to AUTH-030) |
| G-P14-07 | The Publishing Workbench is reachable from Home by clicking, and its commands are the CLI's | **Passed** (AUTH-031, AUTH-032, AUTH-032B, AUTH-033, AUTH-033B) |
| G-P14-08 | The workbench and demonstrations are absent from the release; no synthetic content leaks | **Passed** (AUTH-025, AUTH-035, AUTH-044) |
| G-P14-09 | The workbench fits at 320 to 1440 px, Chromium | **Passed** (AUTH-045) |
| G-P14-10 | P10, P11, P12, P13, the CV, the palettes, the tabs and the folders unchanged | **Passed** (AUTH-036 to AUTH-043) |
| G-P14-11 | The owner uses the workflow and the workbench | **Pending** |
| G-P14-12 | Safari, Firefox, Android Chrome itself, screen readers; other operating systems | **Untested** |

### Authoring tests (P14)

| Test | Where | Status |
| --- | --- | --- |
| AUTH-001 to AUTH-023, AUTH-026 to AUTH-030, AUTH-033, AUTH-034, AUTH-036 to AUTH-043 | `tests/authoring.mjs` (real commands on throwaway project folders) | Pass; the Quarto parts are SKIPPED, never passed, without Quarto |
| AUTH-024, AUTH-025, AUTH-026 (built), AUTH-032B, AUTH-033B, AUTH-035, AUTH-044 | `tests/authoring-build.mjs` (a release build and a demonstration build of a throwaway copy that holds articles made by the commands) | Pass |
| AUTH-031 Home to the workbench and through its pages by clicking, AUTH-032 the Overview, AUTH-045 five widths | `tests/authoring-browser.mjs` (the real dev server) | Pass (headless Chromium) |
| The workflow transcript on the workbench | `tests/authoring.mjs` (AUTH-034) regenerates it with `tests/fixtures/authoring/scenario.mjs` and compares | Pass |

AUTH-040 compares P14's own changes (commits ending `[P14]`, and the working tree while P14 is being written) with the CV, so later prompts are not blamed for their files. P13-A01's tests P13A-013 and P13A-030 were adjusted only to allow the workbench link inside the demonstrations section (`data-workbench-link`); `tests/routes.mjs` lists the three workbench route files.

## Future gates

| ID | Gate | Source | Status |
| --- | --- | --- | --- |
| G-01 | Reproducible static build | P02 | **Passed** in P02: a clean `npm ci` and `npm run verify` in an empty copy rebuilt an identical `index.html` |
| G-02 | At most three visible tab levels | R-02 | **Passed** in P06 on the site's pages (NAV-025, NAV-032; `FolderStack` rejects a fourth row). No third-level folder is registered yet, so site pages show at most two. |
| G-03 | Clicking a tab opens its destination page | Information architecture | **Passed** in P06: NAV-022, and clicking through the pages in the browser |
| G-04 | Hovering an expandable tab previews only its immediate children | Information architecture | **Passed** in P07 in Chromium (PREV-001, PREV-006, PREV-011); keyboard focus does the same (PREV-008). Appearance approved by the owner (G-P07-19). |
| G-05 | Active tab shows a V-shaped indicator; inactive tabs stay visible | Information architecture | **Passed** in P06 on the site's pages (NAV-028, NAV-030); appearance approved in P05 (G-P05-17) and on the P06 pages (G-P06-20) |
| G-06 | No persistent sidebar, no breadcrumbs, no file-manager design | Information architecture | **Passed** in P06 on the site's pages: they hold only rows of folder tabs and the content (NAV-028 counts the landmarks); the temporary content repeats no trail of folders |
| G-07 | Content deeper than level three lives in the third-level folder body | Information architecture | Untested on site pages: no content route exists yet. The model keeps the owning folder selected (NAV-009, NAV-025), and `FolderPage` puts any page in its folder's body. |
| G-08 | Shared design system across sections | R-03, R-04 | **Passed** in P06 (technical): every page uses the shared tokens and its section's environment (NAV-027). Stronger environment differences exist as candidates awaiting the owner (D-056, D-075). |
| G-09 | Only Bearnard v1.3 and approved variants appear; no full-resolution masters in the public directory | R-05 | **Passed** in P09 for what exists: the only images in `public/` and `dist/` are two registered derivatives of the v1.3 master (BEAR-002, BEAR-003, BEAR-006). Untested on site pages: none shows Bearnard yet. |
| G-10 | Eight independent editorial collections | R-06 | Untested |
| G-11 | Canonical records reused across pages | R-07 | Untested |
| G-12 | Interactive 3D nucleus/chromatin visualization on Home, with isolated client-side JavaScript | R-08 | Untested |
| G-13 | Eight international clocks | R-09 | **Passed** (technical) in P16 in headless Chromium and on fixed instants (G-P16-01 to G-P16-09); the owner's review is pending (G-P16-10). Not shown: Android Chrome, Safari, Firefox, a real device |
| G-14 | Real booking works through the chosen provider; no credentials in the repository | R-10 | Untested |
| G-15 | Site deploys to GitHub Pages | R-11 | Untested |

## P15 gates — Homepage

G-12 (the interactive nucleus) and G-13 (the eight clocks) are not closed by P15: it builds the places for them and says so on the page. (P16 closed G-13 technically: see the P16 gates below.)

| ID | Gate | Status |
| --- | --- | --- |
| G-P15-01 | Home is the real homepage on `/`, in the Core category and environment, with the eleven tabs and one row of folders | **Passed** (HOME-001 to HOME-005, HOME-035) |
| G-P15-02 | Welcome with Bearnard from the approved registry; one `<h1>`; reserved image size | **Passed** (HOME-006 to HOME-009, HOME-009B). No illustration was assigned to a role |
| G-P15-03 | A reserved, honest, replaceable nucleus stage with a stable footprint; no 3D runtime | **Passed** (HOME-010 to HOME-012, HOME-010B). The visualization itself is **not built** (G-12 stays open) |
| G-P15-04 | The archive links are valid and come from the registry | **Passed** (HOME-004, HOME-024) |
| G-P15-05 | Eight clock locations with validated IANA zones; no fake live values | **Passed** (HOME-013 to HOME-016). The clocks do not run (P16; G-13 stays open) |
| G-P15-06 | Recent updates are derived from published, real Blog entries in the Blog's order; drafts, archived entries and demonstrations are excluded; an empty Blog is handled | **Passed** (HOME-017 to HOME-021) |
| G-P15-07 | A populated specimen uses the real components and is development-only | **Passed** (HOME-022, HOME-022B, HOME-033) |
| G-P15-08 | No overflow, overlap or clipped Bearnard at 320, 390, 430, 768, 1024, 1280 and 1440 px; keyboard focus; reflow at 200% text; no motion | **Passed** in headless Chromium (HOME-009B, 023 to 026). Not shown: Safari, Firefox, a real phone, a screen reader |
| G-P15-09 | P10 to P14, the CV, the palettes, the folders and the Bearnard masters unchanged | **Passed** (HOME-027 to HOME-036) |
| G-P15-10 | The owner reviews the homepage, its copy and its layout | **Pending** |

## P16 gates — World clocks

| ID | Gate | Status |
| --- | --- | --- |
| G-P16-01 | Eight approved locations, in order, on correct IANA zones; Brasília is named Brasília on `America/Sao_Paulo` | **Passed** (CLOCK-001 to CLOCK-003, CLOCK-016) |
| G-P16-02 | 24-hour `HH:mm` with leading zeros; each city shows its own date and weekday, across previous-day, next-day and year boundaries | **Passed** (CLOCK-004 to CLOCK-010) against an independent `zoneinfo` reference |
| G-P16-03 | Daylight saving right: Anchorage and Auckland change on their transition instants; Mexico City does not; the other five are fixed | **Passed** (CLOCK-011 to CLOCK-015) |
| G-P16-04 | No dependence on the machine's zone; an invalid zone is a controlled failure | **Passed** (CLOCK-017, CLOCK-018) |
| G-P16-05 | One update loop and timer, aimed at the minute, none while hidden, redraw on visible and on restoration, no duplicates | **Passed** with fake timers (CLOCK-019 to CLOCK-025) and in Chromium (CLOCK-019B to CLOCK-025B). Hiding is simulated by visibility events; a real background tab was not exercised |
| G-P16-06 | No stale build-time time; honest without JavaScript; no layout shift when filled | **Passed** (CLOCK-026, 027, 026B, 034B) |
| G-P16-07 | Responsive at 320, 390, 430, 768, 1024, 1280 and 1440 px with no overflow and the approved order; accessible markup, no announcements | **Passed** in headless Chromium (CLOCK-030, 031, 032B, 033B). Not shown: a screen reader, Android Chrome |
| G-P16-08 | Homepage composition, palettes, folders, Bearnard, nucleus stage, publishing, records and the CV unchanged | **Passed** (CLOCK-029, CLOCK-035 to CLOCK-039) |
| G-P16-09 | The simulated specimen is development-only and never leaks into a live clock or a release | **Passed** (CLOCK-040, CLOCK-041) |
| G-P16-10 | The owner reviews the clocks on the real homepage, including on Android Chrome | **Pending** |

## P17 gates — Navigation coverage and content states

| ID | Gate | Status |
| --- | --- | --- |
| G-P17-01 | Eleven top-level and 25 second-level destinations resolve to a generated page, in the approved order and categories; Overview resolves to its parent's URL; no fourth row; no leaf child row | **Passed** (SITE-001 to SITE-011) |
| G-P17-02 | Direct navigation, selection from the URL, Back and Forward; unknown URLs stay unknown | **Passed** (SITE-010B, 011, 012, 014) in headless Chromium |
| G-P17-03 | Every registered page has meaningful content or an explicit, derived state; empty collections are not incomplete pages | **Passed** (SITE-015 to SITE-018) |
| G-P17-04 | No synthetic, invented or confidential record reaches a page; the CV proposal is never exposed; no form or booking control | **Passed** (SITE-017, 019, 026 to 029, 043) |
| G-P17-05 | Content-state components are plain accessible text: labelled sections, no live region, no control, no motion, no raw colour | **Passed** (SITE-020, 046, 047) |
| G-P17-06 | Editorial collections, drafts, archives, Quarto ownership and the development demonstrations unchanged | **Passed** (SITE-021 to SITE-025, 040, 042) |
| G-P17-07 | Palettes, folders, homepage, clocks, Bearnard assets, publishing workflow and dependencies unchanged | **Passed** (SITE-030 to SITE-034, 040, 041, 044) |
| G-P17-08 | Internal-link validator; no broken internal link in the build | **Passed** (SITE-013; 72 pages, 3554 internal links) |
| G-P17-09 | Development site map covers every folder, derives its states, is reachable by clicking, and is absent from the release build | **Passed** (SITE-035 to SITE-039) |
| G-P17-10 | Responsive at 320, 390, 430, 768, 1024, 1280 and 1440 px: no overflow, one heading, no extra row, no broken image | **Passed** (SITE-045) in headless Chromium |
| G-P17-11 | Nothing of the owner's missing material is invented: the real records, CV snapshot, contact and booking are still to be supplied | **Open** (owner material; P18 for Contact) |
| G-P17-12 | The owner reviews the site-wide pages, the wording and the site map | **Pending** |

## P18 gates — Contact, downloads and the 404 page

| ID | Gate | Status |
| --- | --- | --- |
| G-P18-01 | Contact is a real Core page with an honest state; only owner-approved channels can be shown, and an unapproved or malformed one fails the build | **Passed** (UTIL-001 to UTIL-006, 031) |
| G-P18-02 | No contact detail is invented or taken from the CV, a record or another file; no email address in the release except approved channels | **Passed** (UTIL-004, 007) |
| G-P18-03 | No form, button, form service or submission on Contact | **Passed** (UTIL-008) |
| G-P18-04 | A validated download registry; approved and planned never mixed; a missing approved file fails the build clearly | **Passed** (UTIL-010 to UTIL-016) |
| G-P18-05 | The unfinished CV cannot be a download; no private or source file in `public/` or the build; the build works with no approved CV | **Passed** (UTIL-017, 018, 048) |
| G-P18-06 | Synthetic downloads work locally, really download in a browser and never reach the release | **Passed** (UTIL-019, 019B, 020, 021B) |
| G-P18-07 | The new folders are tracked by git, so an approved file would be committed and deployed | **Passed** (UTIL-050) |
| G-P18-08 | A custom static 404 page, generated as `404.html`, with a 404 status, recovery links, no selected folder and no script | **Passed** (UTIL-023 to UTIL-030, 033, 025B, 029B) against a Pages-style server and `astro preview`. **Untested** on GitHub Pages itself |
| G-P18-09 | Empty collections and pages in preparation are not 404s; valid routes are never 404 | **Passed** (UTIL-027, 031) |
| G-P18-10 | Contact, downloads and the 404 page fit at 320, 390, 430, 768, 1024, 1280 and 1440 px; keyboard focus visible; reduced motion | **Passed** in headless Chromium (UTIL-009, 022, 032, 051) |
| G-P18-11 | P10 to P17, the folders, palettes, Bearnard assets, the CV and dependencies unchanged | **Passed** (UTIL-034 to UTIL-049) |
| G-P18-12 | The owner supplies approved contact channels and any downloads | **Open** (owner material) |
| G-P18-13 | The owner reviews Contact, the downloads specimen and the 404 page | **Pending** |

## P19 — 3D nucleus prototype

| ID | Requirement | Status |
| --- | --- | --- |
| G-P19-01 | A recognisable interphase nucleus: translucent envelope, spatially folded continuous chromatin polymers, no metaphase X chromosomes | **Passed** by test (NUC-001 to NUC-005, 008) and drawn in Chrome (screenshots). **Pending** the owner's judgement of how it looks |
| G-P19-02 | A yellow region exists at rest, as part of one strand | **Passed** (NUC-005, NUC-019 counts its pixels in a real render) |
| G-P19-03 | The region deforms modestly, continuously, toward the target, and returns; one state, one mesh, no recolouring | **Passed** (NUC-006, 007, 009 to 017; NUC-016B measures the direction in a browser). **Pending** the owner's judgement of the motion |
| G-P19-04 | Rapid retargeting never snaps | **Passed** (NUC-014 in Node, NUC-030B in a browser) |
| G-P19-05 | Mouse and keyboard focus work in the prototype | **Passed** (NUC-030, 030B, 031, 032) |
| G-P19-06 | Touch devices and reduced motion get a still nucleus that never animates and never takes a gesture | **Passed** (NUC-018, 018B, 033, 033B) in emulation. **Untested** on a real phone |
| G-P19-07 | A static fallback exists and WebGL failure is handled | **Passed** (NUC-020, 029, 029B). The fallback picture is provisional |
| G-P19-08 | Draws on demand: nothing while still, frames while moving, a stop after settling, a pause when hidden | **Passed** (NUC-021 to 026; 0 idle frames measured in 2 s on an M1 Max) |
| G-P19-09 | No leaked renderer, listener, timer or canvas; mounting again leaves one | **Passed** (NUC-027, 028, 028B) |
| G-P19-10 | Responsive at 320, 390, 430, 768, 1024, 1280 and 1440 px, no overflow, no clipping | **Passed** (NUC-034, 035) in headless Chrome |
| G-P19-11 | Performance measured | **Observed**: 60 fps steady (median and 95th percentile 16.7 ms) during a response at 896 × 672 px on an Apple M1 Max, headless Chrome 157, Metal; about 15 fps on software WebGL. Not a guarantee for other devices; **Untested** on a phone |
| G-P19-12 | Reachable by clicking in the local site; a release build holds no page, specimen script or Three.js; Three.js loads on no other page | **Passed** (NUC-044, NUC-045; the homepage's development note and the site map link to it) |
| G-P19-13 | The real homepage, clocks, folders, palettes, Bearnard, publishing, CV, contact, downloads, 404 and site map are unchanged | **Passed** (NUC-037 to NUC-043, NUC-046) |
| G-P19-14 | Two dependencies only, pinned; bundle impact recorded | **Passed** (NUC-047): `three` and `@types/three` 0.187.0; the graphics chunk is 537 KB, 132 KB gzip, on the specimen page only |
| G-P19-15 | The owner reviews the nucleus's biology, elegance, motion, suitability for the homepage and performance (P20 gate) | **Pending** |
