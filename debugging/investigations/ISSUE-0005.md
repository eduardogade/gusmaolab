# ISSUE-0005 — NUC-031 failed intermittently

Status: **root cause established; test repaired; one load-sensitive check remains by design.** Investigated in P22 (2026-11-22).

## Symptom

In P21, the full `npm run test:browser` stopped at `tests/nucleus-browser.mjs`, check **NUC-031** ("Keyboard focus triggers the response, hands over between tabs, and releases"), with `focus on Home: {"phase":"responding","activation":20,"target":"Home"}` where the test expects the activation to be greater than 20 after the focus. The same check passed on an unmodified checkout, on the P21 tree when rerun, and in a separate worktree; it passed in the P22 baseline (Node 26.13.1, a quiet machine).

## What the test did

Focus the specimen's Home target, `sleep(700)`, assert `target === "Home" && activation > 20`; press Tab, `sleep(500)`, assert `target === "CV" && activation > 20`. The activation is the response's model state in percent.

## Root cause (established with evidence)

The response is **model time, not wall-clock time**. The lifecycle steps the model by the real time between frames but never more than `RENDER.maxStep` (1/20 s) per frame (`src/visualization/nucleus/config.ts`, `lifecycle.ts`): the first frame after a pause steps a nominal 1/60 s, and a slow frame cannot make the chromatin jump (D-132). The specimen draws with software WebGL (SwiftShader) in headless Chrome, so frames are slow, and how many frames fit in a fixed wait depends on the machine's load. At the response's rate (critically damped, 3.8 rad/s), 20 % corresponds to about 0.2 s of model time: four frames at the clamp. The test asserted a model-time quantity after a fixed wall-clock wait.

It is a **test synchronization defect, not an application defect**: a slow machine should lag, not jump.

## Evidence

Reproduction script (a copy of the test's steps that records the activation every 100 ms, the frames the page drew, the longest gaps between frames, and the page's visibility and focus):

- **Idle machine**, 12 runs: the activation at about 700 ms was 45 to 53 % every time (0 of 12 at or below 20); about 27 frames in 1.4 s, gaps up to 290 ms at the start; the page was `visible` and focused.
- **12 CPU-bound processes running**, 10 runs: the activation at 700 ms was 2 to 6 % in 9 of 10 runs (min 2, max 27); 5 to 8 frames in 1.4 s, gaps of 500 to 900 ms between frames; the page was still `visible` and focused.

So visibility, focus and stale page state are ruled out for this symptom; the frame rate is what moved, and the lag follows from the 50 ms clamp. The P21 failure (exactly 20) is consistent with a moderate load at the time: the browser suite had run for many minutes just before, and the immediate rerun happened while processes from it were still winding down. That last sentence is an inference; the mechanism above is measured.

## Repair

`tests/nucleus-browser.mjs`, NUC-031: the two fixed sleeps became `waitFor` the observable state (`target` is the focused target and `activation > 20`, up to 20 s). The behavioural standard is unchanged. With the repaired test the nucleus suite was run under 6 busy processes (a lighter load than the 12 of the reproduction): NUC-031 passed. Before the repair the reproduction of its steps gave a low activation in 9 of 10 runs under 12 busy processes.

## Other fixed waits found by the same stress run

Running the nucleus browser suite with 6 busy processes failed two more checks:

- **NUC-026B** (pageshow redraw): waited 500 ms for one redraw frame. Repaired the same way (wait for the frame counter to advance).
- **NUC-050**: *measures* the median frame time with software WebGL and asserts a ceiling (117 ms under load). It is a machine-speed observation by design; it is load-sensitive and is left unchanged. A failure of NUC-050 on a loaded machine means "the machine is slow", and a QA run should be repeated on a quiet one.

## Remaining

- Other suites in `tests/nucleus-integration-browser.mjs` and the clocks suites use fixed `sleep` waits (34 in the integration suite). They passed in the P22 baseline and were not stress-tested; if a load-related failure appears, apply the same rule: wait for the state. `npm run qa:deep` (three runs of every browser suite) is the tool for finding them.
- The QA command retries a failed browser suite once and reports a rescued failure as **FLAKY**, so an instability like this one is visible even when it does not fail the run twice.
