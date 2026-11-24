# Quality assurance (P22)

How to find out what state the website is in, and what to do when it is not good. Decisions: D-151 to D-156. The one command is `npm run qa`; it runs the tests that already existed, adds the audits that did not, and writes one report.

## 1. Quick verification

```bash
npm run qa:quick
```

Environment check, Astro diagnostics, the production build, every unit suite, the static audits (routes, links, metadata, images, public-output safety, resource budgets) and a reproducibility check. No browser. Use it while working.

## 2. Full verification

```bash
npm run qa
```

Quick, plus the demonstration build, every browser suite (a suite that fails is run once more, and if the retry passes it is reported **FLAKY**, never PASS), axe-core accessibility on twenty pages, and the measured performance run. This is the standard check before a commit that touches pages, styles or scripts. It needs Chrome or Chromium (`CHROME_PATH` if it is not in the usual place).

## 3. Extended checks

```bash
npm run qa:deep
```

Full, but each browser suite runs three times and each page is measured ten times, to look for instability and variation. Slow. Run it before a release, or to investigate a suspected flake. You can run one suite alone as ever (`node tests/nucleus-browser.mjs`) and the performance run alone with `npm run test:perf`.

Needs Node 26 (`.node-version`): the QA command refuses to call a run comparable on another major version. The micromamba `web` environment's Node is for the pre-commit hook; run QA from your normal shell.

## 4. Reading the report

`qa-report/latest.md` (readable) and `qa-report/latest.json` (stable schema `gusmaolab-qa-report/1`, for tools). Both are ignored by git and rewritten by each run; `history.jsonl` keeps one line per run. Open the report in the browser: `npm run dev`, then Home, the development note, **Site Map & Page Coverage**, **Quality Assurance** (`/_design/quality/`). That page runs nothing; it shows the last report, when it was made, which commit it described, and says **stale** if the working tree has changed since.

The six states are never merged:

| State | Means | Fails the run? |
| --- | --- | --- |
| PASS | Executed, no defect detected | no |
| FAIL | Executed, a defect detected | **yes** |
| SKIPPED | Not part of this run (the profile left the stage out), or a tool the check needs is missing (Quarto) | no; the report says "partial" |
| DEFERRED | Intentionally pending an approved external action | no; always listed |
| NOT RUN | Expected and not executed (no browser, a crash, a missing check) | **yes** |
| FLAKY | Passed and failed in the same run (a retry rescued it, or repeats disagreed) | **yes**, unless registered in `KNOWN_FLAKY` (`scripts/qa-lib.mjs`) with an investigation |

The exit code is 1 for any mandatory FAIL, NOT RUN or unregistered FLAKY. There is no `|| true` anywhere in the pipeline. `QA-001` to `QA-082` are the P22 acceptance items; each one's status is derived from the checks it rests on (`scripts/qa-matrix.mjs`), never typed.

**Findings** are not checks. They are recommendations and limitations (no canonical link tag, no robots.txt or sitemap, GitHub Pages cannot send security headers, orphaned assets) and never fail a run. **Exceptions** (`development/qa-exceptions.json`) are bounded, documented states the audits tolerate and shout about; the list is empty (the six legacy design studies were its one entry until D-157 gated them).

## 5. Investigating a failure

1. Read the failure line in the console or in `latest.md` (check ID, route or file, first reason, log path).
2. Open the log: `qa-report/logs/<suite>.attempt<N>.log`, the full output of that run.
3. For a browser check, open `qa-report/evidence/<ID>.png` and `<ID>.json` (a screenshot and the visible text of the page at the moment of failure).
4. Run the one suite alone: `node tests/<suite>.mjs`. If it passes alone and fails in the suite, suspect state shared with an earlier suite or machine load.
5. If it is intermittent, run `npm run qa:deep`, or loop the one suite. Do not raise a timeout or add a retry until you know why: write the cause down in `debugging/investigations/` (see ISSUE-0005 for the pattern) and fix the wait, not the number.

Browser traces: the harness speaks the DevTools protocol directly, so there is no Playwright trace. The screenshot, the page text, the log and (for the nucleus) the readouts are the evidence. To watch a test, run it with a visible Chrome: remove `--headless=new` in `tests/browser-harness.mjs` locally.

## 6. The deferred booking checks

Nineteen provider-dependent scheduling checks (SCH-013B, 014, 015B, 021 to 035, 042) are **DEFERRED — EXTERNAL ACTIVATION PENDING** by owner decision: there is no Cal.com account or booking link yet. They appear on every report, are never PASS, and do not fail the run. Everything else about scheduling is still tested and does fail: the configuration gate (the owner's attestation), the loader against a stand-in provider, the disabled page, the fallback, and the absence of any provider code while scheduling is off (`QA-OUT-08`). Only IDs on the register in `scripts/qa-lib.mjs` can be deferred; any other `BLOCKED` line is NOT RUN. To activate scheduling, follow `development/scheduling-guide.md`; the deferral register then shrinks as each check is actually run.

## 7. In GitHub Actions

`.github/workflows/quality.yml`, **Quality Assurance**, on pull requests to `development` or `main`, pushes to `development`, and manual runs. Two jobs: **static** (`node scripts/qa.mjs --profile quick`) and **browser** (`--profile full --only environment,build,demo-build,browser,performance`; a manual run can choose `deep`). Node comes from `.node-version`, dependencies from `npm ci`, Chrome is the runner's own. Permissions are `contents: read`; checkouts keep no credentials; there is no secret; reports are kept 14 days and logs and screenshots only when a job fails. **It verifies and never deploys**; the placeholder workflows beside it are untouched, and the release workflow is P24's.

Quarto and the scientific Python are not installed in CI: the suites that need them report SKIPPED (the offline checks of committed generated files still run). Third-party actions are pinned to major versions (`@v4`), not commit SHAs; pinning to SHAs is a P24 hardening step.

**It has run on GitHub (P22-A01, 2026-11-23).** What the first runs taught, and where it stands (`debugging/investigations/ISSUE-0007.md` has the evidence):

- Both jobs check out the **full history** (`fetch-depth: 0`). The preservation guards in the unit suites compare the tree with fixed earlier commits; in the default one-commit checkout, five of them failed and 27 were SKIPPED. **QA-ENV-06** now fails a shallow clone, with the fix in its message, wherever QA runs.
- The runner has **no pointing device**, so Chrome reports `pointer: none` and `hover: none`. The harness (`tests/browser-harness.mjs`) states a desktop mouse; touch tests turn touch emulation on, which overrides it.
- The runner's fonts are **DejaVu Sans and Liberation Serif**, because the font stacks name fonts it does not have. Layout follows the font: five checks that compare with geometry measured on the Mac fail there (KL-127). A failing check's evidence (`qa-report/evidence/<ID>.json`) records the pointer and hover, the scroll position and the fonts Chrome actually used, so a failure that only happens on the runner says which machine it was.
- The **static job passes** on the clean runner. Its 13 SKIPPED checks need Quarto, the scientific environment or the gitignored Bearnard masters (`brand/bearnard/` is not in a checkout), and each is named in the report. The 19 Cal.com checks are DEFERRED there exactly as on the Mac. The **browser job takes 14 to 21 minutes** (the faster and the slower of the AMD EPYC and Intel Xeon runners GitHub hands out; frame time and fixed waits differ with them) and passed in run 11, after two flakes found by re-running the same commit were repaired (NUC-024B, a fixed wait; QA-HISTORY-01, a clean-up race of its own throwaway clone; ISSUE-0007). A first green run is not a reliable one: re-run a commit before trusting a repair. A QA run now prints a heartbeat to the log once a minute, naming the last command asked of Chrome, so a stalled suite says where it stalled.
- The two suites that start `astro dev` use `tests/dev-server.mjs` (D-160). It stops the server on exit and on a signal, whichever way `astro dev` behaves (a Mac hands off to a detached child, found by its port; the runner stays attached, found by its process group), checks that the port is closed and the group holds no live process, prints `dev server stopped: port N is closed`, and prints `DEV SERVER LEAK` and fails the suite if anything is left, so the parent's exit cannot hide a leak. QA-DEVSERVER-01 proves it against stand-ins for both behaviours. A SIGKILL cannot be caught.
- Frame time (NUC-050) has two thresholds (D-159, `nucleusFrame` in `development/qa-budgets.json`): 100 ms as the local reference and 200 ms as a CI smoke ceiling (chosen by `GITHUB_ACTIONS=true`, or `QA_PERF_PROFILE=reference|ci-smoke`), from three samples; the ceiling is not an acceptable frame time for the site. The distribution and the environment are in `qa-report/nucleus-frames.json`, in `latest.md` and in the workflow's kept `qa-report-browser` artifact, whatever the verdict.
- Runner numbers are the runner's: its performance run is evaluated against the same budgets and passed, but Home's LCP was 376 ms there against 200 ms on the Mac, and neither replaces the other.
- A push to `development` also starts eight placeholder workflows that fail at once (KL-129). They are not part of QA and deploy nothing.

**Reproducing the runner's fonts on a Mac.** Set `QA_LINUX_FONTS_DIR` to a folder holding `DejaVuSans.ttf`, `DejaVuSans-Bold.ttf`, `DejaVuSans-Oblique.ttf` and `DejaVuSans-BoldOblique.ttf` (matplotlib ships them: `…/matplotlib/mpl-data/fonts/ttf`) and run any browser suite or `npm run qa`: the test browser then draws every page with DejaVu Sans where the site would use Seravek (bold from weight 600, as a real font setup does) and with Times New Roman, metrically Liberation Serif, where it would use Iowan Old Style or Superclarendon (the homepage's city names; the runner's evidence names Liberation Serif for them). It is off unless the variable is set, it never touches the site, and the failure evidence says which fonts were in use. With it, before any repair, the five font-dependent checks failed the way they failed on the runner; it is how they were rewritten and checked without a 40-minute remote run per attempt. It does not make a Mac a Linux machine: the mono font, the system serif and the font rendering are the Mac's.

## 8. Performance budgets

`development/qa-budgets.json`. Two kinds:

- **Static, deterministic** (the audits): per page class (Home, folder page, 404) the gzipped HTML, JS and CSS, the raw bytes of the images a page names, and the number of script files; the largest allowed image; and the rule that the nucleus graphics are a Home-only dependency. They are measured from `dist/`, so they cannot flake.
- **Measured** (`npm run test:perf`): the median of the cold runs for LCP, cumulative layout shift, long-task blocking, requests, and raw transfer, plus the idle animation frames of Home with the nucleus loaded. A threshold is the baseline plus headroom. No Lighthouse score is required and none is measured; the blocking time is approximated from long tasks, not Lighthouse's simulation, and INP (a field metric) is not claimed.

The nucleus's frame time is the third kind: **measured against an environment-aware policy** (NUC-050, D-159). One threshold cannot be right for an Apple M1 Max (66.6 ms) and a shared four-core runner (83.3 to 133.3 ms in software WebGL), so `nucleusFrame` holds a `reference` profile (100 ms, the default and every local run) and a `ci-smoke` profile (200 ms, a smoke ceiling that catches a renderer gone about twice as slow as the slowest measured run and says nothing else), each with what it means. The check asserts the median of three samples' medians; the draw-call, triangle, resource, idle and lifecycle guards stay exact; a failure is a FAIL, never a skip or a deferral. A plain lit-sphere workload of the same triangle count is measured beside it and recorded, not asserted: the nucleus-to-sphere ratio (1.33 on the Mac) becomes a machine-relative budget only if the runner data show it steady from machine to machine.

To change a budget: run `npm run qa`, read the measured number, change the file, and write the reason in the `status` or `baseline` text in the same commit. A budget raised to make a failure disappear needs an explanation in the commit that someone can disagree with.

## 9. Adding a test without duplicating anything

- A check about a page or the build: add it to `scripts/qa-audits.mjs` (it receives the built pages), with an ID `QA-<AREA>-nn`, and add its ID to the matrix item it supports. A defect type worth guarding gets an entry in `tests/qa-fixtures.mjs` `DEFECTS`.
- A check about behaviour: add it to the browser suite of that feature, with the harness helpers (`tests/browser-harness.mjs`); wait for state (`waitFor`), never for time.
- A new test file: put it in `tests/`, add it to `scripts/qa-suites.mjs` and to the `test` or `test:browser` script in `package.json`. `tests/qa.mjs` fails until all three agree.
- A known, accepted accessibility problem: `development/qa-a11y-register.json`, with the reason. A known, accepted audit exception: `development/qa-exceptions.json`. Both are ratchets: they only tolerate what they name.

## 10. What QA does not show, and what is left for P23

Automated checks find defects; they do not establish quality. In particular, **a clean axe-core run is not a claim of WCAG compliance**: automated rules find only part of the accessibility problems. Chromium only (on a Mac and on GitHub's Linux runner): no Safari, Firefox, real phone or screen reader was used.

For P23, by hand: read the pages in a screen reader (VoiceOver, NVDA) for reading order and the meaning of links in context; the colour contrast axe lists as "needs review" on every page (the flannel and the folder paper), at the real colours; keyboard flow through the previews and the Home tab row at 1280 px and on a trackpad; zoom to 200 % and 400 %; Safari and Firefox for navigation and the folder geometry, and a touch device for the still nucleus and the scrolling rows; the nucleus's look and motion at real frame rates (the tests draw with software WebGL); Bearnard images at their delivered sizes; the order, wording and length of every owner-facing page; the Home sticky row costs (D-144, accepted) only if the owner wants to revisit them.

## P23 additions (2026-11-24)

The browser review added two accessibility checks to `tests/a11y-browser.mjs` and widened two others. **A11Y-SKIP:** on Home, a folder page, a nested folder page, the 404 and a Quarto article the first Tab stop is the skip link, it is drawn only while focused (on screen, with a focus ring, 4.5:1), Enter follows it to `main#content`, and the next Tab is in the content. **A11Y-SCROLL:** on the three demonstration articles at 320 px, 390 px, 390 px with the text doubled, 768 px with the text doubled and 1280 px, every region that scrolls sideways can take keyboard focus (code blocks, tables and display equations). **CLOCK-034C** now holds every enlarged-text case to whole words with no overlap, and checks that the reading drops beneath its place where it must and never at the default size. **HOME-027B:** the site's name is one line, in one piece, from 320 px. **QA-PRESERVE-05:** P23 changed only the six files D-161 names and added no colour, palette or token to a stylesheet. Not covered by any automated check: Safari, a physical device, a screen reader (`development/p23-review.md`).
