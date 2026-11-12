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

Checked by `tests/environments.mjs` (in `npm run verify`) and by screenshots of `/_design/environments-v2/` at 1440, 1280, 768 and 390 px. The tests prove structure and legibility; preference is the owner's.

| ID | Gate | Status | Evidence |
| --- | --- | --- | --- |
| G-P09-C1 | A visual comparison exists for the four environments | Passed | `/_design/environments-v2/`: four pairs, same folders and text on both sides (ENV-004); 16 screenshots |
| G-P09-C2 | The approved palette remains available and unchanged | Passed | ENV-006 (fingerprint of every approved environment token; all four shown as "Current · approved"); `environments.css` and `tokens.css` have no diff |
| G-P09-C3 | Candidates are marked pending the owner's approval | Passed | Every proposed sample is captioned "Proposed · pending the owner's approval" (ENV-006); D-075; the candidate stylesheet's header |
| G-P09-C4 | Candidates reach no site page | Passed | ENV-005: no page but the study contains or loads `proposed-` styling; all 37 folder pages keep an approved environment |
| G-P09-C5 | Candidates stay legible | Passed | ENV-001 (complete token sets), ENV-002 (49 enforced pairings in each of the 4 candidates, 0 failures), ENV-003 (tab distinction) |
| G-P09-C6 | Folder geometry and behaviour are untouched | Passed | ENV-004; FOLD, PREV, RESP and TRANS suites unchanged and passing; RESP-001 covers the study at ten widths |
| G-P09-C7 | The owner decides which candidates to adopt | **Untested** | Pending the owner's review (D-075; design-system question 24). Not marked on the owner's behalf. |

### Environment tests (P09)

| Test | Where | Result |
| --- | --- | --- |
| ENV-001 Every environment, approved or proposed, is a complete token set | `tests/environments.mjs` | Pass |
| ENV-002 Text and indicators stay legible in every proposed environment | `tests/environments.mjs` | Pass |
| ENV-003 Active and inactive tabs stay as distinct as in the approved environments | `tests/environments.mjs` | Pass |
| ENV-004 Candidates change colours only, never folder geometry | `tests/environments.mjs` | Pass |
| ENV-005 Candidate styling reaches no other page | `tests/environments.mjs` | Pass |
| ENV-006 The approved palette is unchanged and still shown; proposals marked pending | `tests/environments.mjs` | Pass |

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
| G-13 | Eight international clocks | R-09 | Untested |
| G-14 | Real booking works through the chosen provider; no credentials in the repository | R-10 | Untested |
| G-15 | Site deploys to GitHub Pages | R-11 | Untested |
