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

## Future gates

| ID | Gate | Source | Status |
| --- | --- | --- | --- |
| G-01 | Reproducible static build | P02 | **Passed** in P02: a clean `npm ci` and `npm run verify` in an empty copy rebuilt an identical `index.html` |
| G-02 | At most three visible tab levels | R-02 | Untested |
| G-03 | Clicking a tab opens its destination page | Information architecture | Untested |
| G-04 | Hovering an expandable tab previews only its immediate children | Information architecture | Untested |
| G-05 | Active tab shows a V-shaped indicator; inactive tabs stay visible | Information architecture | Untested |
| G-06 | No persistent sidebar, no breadcrumbs, no file-manager design | Information architecture | Untested |
| G-07 | Content deeper than level three lives in the third-level folder body | Information architecture | Untested |
| G-08 | Shared design system across sections | R-03, R-04 | Untested |
| G-09 | Only Bearnard v1.3 and approved variants appear; no full-resolution masters in the public directory | R-05 | Untested |
| G-10 | Eight independent editorial collections | R-06 | Untested |
| G-11 | Canonical records reused across pages | R-07 | Untested |
| G-12 | Interactive 3D nucleus/chromatin visualization on Home, with isolated client-side JavaScript | R-08 | Untested |
| G-13 | Eight international clocks | R-09 | Untested |
| G-14 | Real booking works through the chosen provider; no credentials in the repository | R-10 | Untested |
| G-15 | Site deploys to GitHub Pages | R-11 | Untested |
