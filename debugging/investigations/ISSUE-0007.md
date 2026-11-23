# ISSUE-0007 — The browser job of the QA workflow is red on GitHub's runner

Status: **open, blocked on three owner decisions.** The static job is green. Found by the first remote run (P22-A01, 2026-11-23); the cause of most of the first red is repaired, the rest is described below. Nothing here is a defect in the website that a visitor can see, except the one repaired in the "Real defect" section.

## Symptom

The first time `.github/workflows/quality.yml` ran on GitHub (run 45194691589, commit `e4665d8`, push to `development`), both jobs failed, although the same tree had passed a full `npm run qa` on the owner's Mac (827 PASS, 19 DEFERRED, 0 FAIL).

| Run | Commit | Static job | Browser job (checks) |
| --- | --- | --- | --- |
| 1 (45194691589) | `e4665d8` | FAIL: 626 PASS, 3 FAIL, 40 SKIPPED, 19 DEFERRED (five checks failed with "bad revision") | FAIL: 145 of 169 pass, 24 FAIL |
| 2 (45207718201) | `fca7c0d` | **PASS**: 647 PASS, 13 SKIPPED, 19 DEFERRED, 0 FAIL, 0 NOT RUN, 0 FLAKY | FAIL: 156 of 169, 10 FAIL, 3 NOT RUN (the authoring suite stalled 900 s) |
| 3 (45219255372) | `610ace6` | **PASS**: same counts | FAIL: 161 of 169, 8 FAIL; the authoring suite stalled again on one attempt; one suite FLAKY |

The runner: ubuntu, linux/x64, 4 logical cores (AMD EPYC), Node 26.13.1, Chrome 157.0.8103.78, no pointing device, no GPU. The Mac: arm64 macOS, Apple M1 Max, Chrome 157.0.8103.80.

## Causes found and repaired (evidence in the run reports and `qa-report-*` artifacts)

1. **A shallow checkout.** `actions/checkout` fetches one commit, and the preservation guards diff against fixed earlier commits: five checks failed ("bad revision") and 27 guards were SKIPPED. Reproduced in a local depth-1 clone. Repaired with `fetch-depth: 0` and a new environment check, **QA-ENV-06**, that fails a shallow clone with the fix in its message (`QA-HISTORY-01` tests it against a real depth-1 clone and its unshallowed twin).
2. **No pointing device.** Chrome on the runner reports `pointer: none` and `hover: none`, so the pages correctly behave as for a touch visitor (still nucleus; Home's sticky tab row needs `(hover: hover) and (pointer: fine)`). Thirteen checks written for a mouse failed. Reproduced locally with the same Chrome setting (the same nucleus checks failed), repaired by stating a desktop mouse in the harness (`--blink-settings`); both nucleus suites then passed locally, and touch emulation still overrides it.
3. **Click geometry.** A link that wraps was clicked at the middle of the box around all its lines (QTO-030B, the scheduling click helper). They click the first line box now.
4. **Fixed waits.** The touch-swipe checks slept 600 ms; the clocks check read `--:--` before the page's script had filled them (A11Y-CLOCKS). They wait for the state.
5. **Clicks into a view transition.** Right after a navigation, the 140 ms cross-fade (D-071) takes hit-testing away from the page: `elementFromPoint` returns `html` over a tab that is exactly where the click goes (evidence: the click records of PREV-013 and AUTH-031). The harness's wait looked only at the transition's animations, which exist after its object (`document.activeViewTransition`) does. Measured locally at 1x, 4x and 8x CPU: the object is present at every arrival and gone within 200 ms, and hit-testing is normal after that in 54 of 54 samples. `viewTransitionOver()` waits for both. Not run on GitHub yet.
6. **Touch gestures.** Chrome's synthesized touch scroll did nothing on the runner, upwards or sideways (the same checks pass on the Mac). The shared helper `touchSwipeScrolls` tries it first and raw touch events second, says which worked, and fails when neither moves anything. The vertical check passed on run 3 with it; the sideways one is repaired the same way and not yet run on GitHub.
7. **Silent stalls.** A Chrome command that is never answered waited for ever. Each now fails after 120 s and names the command.

## Real defect found and repaired

**A scrolling table that the keyboard cannot reach (WCAG 2.1.1).** `.ed__body table` is a scrolling box (`display: block; overflow-x: auto`). On a runner whose wider fallback font made the table in the Quarto demonstration overflow, axe-core reported `scrollable-region-focusable`. It could happen to any reader with a wide font, and was invisible on the Mac only because its font is narrow. Quarto `<table>` elements now get `tabindex="0"` like `<pre>` (`EditorialEntry.astro`), and `QA-A11Y-01` checks the markup of the demonstration article whatever the font. **Not covered:** a table in a plain Markdown entry (no published or demonstration entry has a wide one). Covering it needs a rehype step in the Markdown pipeline, which is not installed; recorded here, not done.

## Not repaired, and why (each needs the owner)

1. **Five checks compare with geometry measured with macOS system fonts.** The font stacks (`tokens.css`: Seravek, "Gill Sans Nova", Ubuntu, Calibri, "DejaVu Sans"…, "Iowan Old Style", "Palatino Linotype"…) name fonts a Linux runner does not have. Chrome there used **DejaVu Sans** for the interface and **Liberation Serif** for headings (recorded by the failure evidence), which are much wider. Consequences, all in the failure evidence:
   - `RESP-015` (desktop keeps P07's layout): headings wrap onto more lines (h1 224 px against P07's 212), and the eleven global tabs no longer fit in one row at 1280 and 1440 px (`rowFits: false`; the row scrolls inside its folder, as designed, D-064).
   - `NUCINT-041B` (P15 proportions at 390 px): the welcome is 861 px tall, P15 had 760.
   - `CLOCK-034B`: the first clock's box changes size when it is filled (64 to 75 in its first measured dimension; the other seven do not). This one is a layout shift that a wide fallback font can cause.
   - `P13A-029` and `P13A-029B`: the demonstration links' boxes are shorter than the 20 px these checks require when the font is DejaVu Sans (an inline box is the font's ascent plus descent, about 18.6 px at 16 px; the checks pass with the Mac's font), so their "tappable" rule fails.
   These are not failures of a threshold that was set wrongly, and no assertion was changed. They are measurements of the site in two fonts. **Decision needed (a):** (i) keep them as macOS-baseline checks that CI reports SKIPPED with the reason, a rule that would be registered and bounded like the other exceptions; (ii) rewrite each as a font-independent invariant (needs the owner to say what each must protect); (iii) give CI the same fonts (not possible: Seravek is Apple's; the stack would have to change, which is the owner's design decision); or (iv) leave the browser job red. Converting a failure to a skip was not done without that decision. **Decision needed (b), the product question behind P13A-029 and CLOCK-034B:** should the layout hold with the fallback fonts of Linux and Windows? That is a P23 question.
2. **`NUC-050` (software-WebGL frame time).** The ceiling is a 100 ms median frame; the runner measured 100 and 133 ms (a 4-core runner with no GPU), the Mac about 20. It measures the machine. **Decision needed (c):** a separate, documented ceiling for CI (with the evidence above), or leave it failing there. The measured performance run (`perf-browser`) passed on the runner with its own budgets; its numbers are runner numbers (Home LCP 376 ms against 200 ms on the Mac; the bytes are identical) and replace nothing.
3. **The authoring suite stalls, intermittently, for the orchestrator's whole 900 s.** Seen once in run 2 (attempt 1) and once in run 3 (attempt 2); the other attempts ran and failed on the view-transition click (cause 5). The stall prints nothing and the harness's own 420 s deadline never fired, so the cause is not known. The 120 s answer timeout (cause 7) did not prevent it, so it is not a Chrome command left unanswered. The authoring suite is the one that starts `astro dev`; a leftover dev server from an earlier attempt or an earlier suite is the first suspect and is not proven. Needs another look with a recurrence in hand.

## What the owner can rely on

The release build is unchanged and deploys nothing from this workflow. The static job, which holds the build, the 31 unit suites, the audits and the reproducibility check, passes on a clean Linux runner with no Quarto, no micromamba and no private folders; its 13 SKIPPED checks are those that need Quarto, the scientific environment or the gitignored Bearnard masters, each named in the report. The 19 Cal.com checks are DEFERRED on the runner exactly as on the Mac.
