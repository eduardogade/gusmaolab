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

Technical completion and visual approval are separate. The technical gates below were checked by tests and by inspecting the rendered study in Chromium at 1440, 1280, 1024, 768 and 390 px. **The owner has not yet reviewed the folder appearance (G-P05-17).**

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
| G-P05-17 | The owner approves the physical-folder appearance | **Untested** | Pending the owner's review of the screenshots. Not marked on the owner's behalf. |

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

## Future gates

| ID | Gate | Source | Status |
| --- | --- | --- | --- |
| G-01 | Reproducible static build | P02 | **Passed** in P02: a clean `npm ci` and `npm run verify` in an empty copy rebuilt an identical `index.html` |
| G-02 | At most three visible tab levels | R-02 | Untested on site pages. The data model (NAV-006, NAV-009, NAV-013) and the folder components (FOLD-003) enforce it. |
| G-03 | Clicking a tab opens its destination page | Information architecture | Untested. Every node has a destination (NAV-003); no tab UI or section pages exist yet. |
| G-04 | Hovering an expandable tab previews only its immediate children | Information architecture | Untested in the UI. The preview data is immediate children only (NAV-007). |
| G-05 | Active tab shows a V-shaped indicator; inactive tabs stay visible | Information architecture | Untested on site pages. Shown in the P05 folder study (FOLD-005, FOLD-006); appearance awaits the owner (G-P05-17). |
| G-06 | No persistent sidebar, no breadcrumbs, no file-manager design | Information architecture | Untested on site pages. The P05 folder components have none. |
| G-07 | Content deeper than level three lives in the third-level folder body | Information architecture | Untested on site pages. The model keeps the owning folder selected (NAV-009), and the components put the page in the deepest folder (FOLD-003, FOLD-009). |
| G-08 | Shared design system across sections | R-03, R-04 | Untested. P03 built the candidate tokens and four environments, but no section page uses them yet and the owner has not reviewed them. |
| G-09 | Only Bearnard v1.3 and approved variants appear; no full-resolution masters in the public directory | R-05 | Untested |
| G-10 | Eight independent editorial collections | R-06 | Untested |
| G-11 | Canonical records reused across pages | R-07 | Untested |
| G-12 | Interactive 3D nucleus/chromatin visualization on Home, with isolated client-side JavaScript | R-08 | Untested |
| G-13 | Eight international clocks | R-09 | Untested |
| G-14 | Real booking works through the chosen provider; no credentials in the repository | R-10 | Untested |
| G-15 | Site deploys to GitHub Pages | R-11 | Untested |
