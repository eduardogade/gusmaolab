# ISSUE-0004 — Navigation flash during physical-folder transitions

| Field | Value |
| --- | --- |
| Issue ID | ISSUE-0004 |
| Related prompt | Reported by the owner after P08; investigated in P09 |
| Status | **Open: fix implemented, awaiting the owner's retest** on a real desktop and Android phone |
| Severity | Medium: an unpleasant blink on every folder change, desktop and mobile, in Chrome |
| Affected component | Navigation between folder pages (every link between pages built by `FolderPage`) |

## Observed symptoms

The owner reported that moving between folder tabs causes an increasingly noticeable, unpleasant blink or flash in Chrome, on a desktop and on an Android phone.

## Expected behavior

Changing folders feels like one continuous archive: the flannel and shell stay steady, the selected folder changes without a harsh flash, and nothing shows a false selection or a blank screen.

## Reproduction steps

1. Build and preview the site (`npm run build`, `npm run preview`), or use `npm run dev`.
2. In Chrome, click from Home to CV, from CV to Writing, or (on a phone) from CV to Research.
3. Watch the whole viewport at the moment the new page appears.

## Diagnosis (P09)

Measured frame by frame with Chrome's own recorders: a performance trace with a screenshot of every compositor frame, and a screencast, before any change. Each navigation was run against the production preview (`astro preview`, port 4322) and the dev server (`astro dev`, port 4321), in headless Chrome 157 and in a visible Chrome 157 window, at 1440 px and at 390 px with phone emulation. Scenarios: Home → CV, CV → Research, CV → Writing, Writing → Kosmos Series, Lecture Notes → The Greenhouse, Back and Forward, and direct loads.

What was found:

- **No blank, white or unstyled frame**, in production or dev, headless or visible. Chrome holds the old page on screen until the new one is ready ("paint holding"). The stylesheets are render-blocking links in production and inline styles in dev, and no web font is loaded, so the new page's first frame is already complete.
- **The whole viewport changes in one frame.** Every navigation recorded exactly three frames: the old page, the complete new page, and an identical later frame. Measured as the mean colour change between consecutive frames:

  | Navigation | Change in one frame |
  | --- | ---: |
  | Home → CV (core → scientific), 1440 px | 26.5 |
  | CV → Writing (scientific → literary), 1440 px | 27.6 |
  | CV → Research (same section), 390 px phone | 17.1 |

- **Cross-section changes swap every colour at once.** Each section's environment colours the flannel, shell and folders, so Home → CV turns the whole screen from the core's brown plaid to the scientific navy in a single frame.
- **On a phone the rows jump.** Each page opens its scrolling rows centred on its own selected tab (P08), so every row of tabs moves sideways in the same frame as the content changes.
- **Dev and production behave the same** for the visible result. Dev also loads Vite's client, the Astro toolbar and its stylesheets again as modules after the first frame, but this produced no visible change in the recordings.

**Cause:** not a blank frame, but a hard cut. Every folder link replaces the whole document, and the new page differs from the old across most of the viewport (environment colours, row positions, content), so the change lands in one frame. The more sections and scrolling rows the site gained (P06–P08), the larger that one-frame change became.

**Not verified:** a physical Android phone (none was available to the agent). The owner's report from Android matches the same mechanism, but a device-specific cause cannot be ruled out.

## Fix applied

The browser's own **cross-document view transitions** (`@view-transition { navigation: auto }`) in `src/styles/view-transitions.css`, loaded only by `FolderPage`:

- The old page cross-fades into the new one over 140 ms (the root's group, old and new images all at 140 ms, ease-out). Nothing slides, zooms or persists.
- Regions identical on both pages (the flannel within a section, the shell, the folder frame) stay visually still; only what differs fades.
- Links stay ordinary links; there is no client router, no `ClientRouter` and no new script. Browsers without cross-document view transitions keep the plain navigation.
- `prefers-reduced-motion: reduce` turns the transition off (`navigation: none`): those visitors get the plain, instant navigation.
- The design studies do not opt in, so links to and from them never animate.

A side effect fixed with it: after Back restored a page from the back-forward cache, Chrome replayed a pointer event at the old cursor position once the transition ended, and the folder under that stale position opened its preview by itself. `src/scripts/folder-previews.ts` now opens hover previews only after the pointer has really moved since the page appeared (D-072).

## Validation

- **Visible Chrome window:** the same navigations now take about 18 frames at 60 frames per second. The largest change between two frames is 4.1–4.8 for Home → CV and CV → Writing (was 26.5–27.6) and 2.5 for CV → Research on a phone (was 17.1). No white frame in 52 runs (dev and production, 390 and 1440 px).
- **Headless Chrome:** the same smooth fades, but in about 1 run in 4 to 10 the old page was captured as a blank white snapshot, which then faded out. This did not happen once in the 52 runs in a visible window, so it looks like a headless capture defect (KL-35). The owner's retest on real screens is the deciding check.
- **Reduced motion:** three frames, as before; no transition.
- Automated checks: `tests/transitions.mjs` (TRANS-B01 to TRANS-B04) and `tests/transitions-browser.mjs` (TRANS-001 to TRANS-012). The earlier browser suites still pass.
- Before and after recordings (slowed five times) were sent to the owner with the P09 report.

## Remaining limitations

- While the 140 ms fade plays, the browser does not pass clicks to the page; a click in that moment is ignored (KL-34).
- Safari 18.2 and later support these transitions; Firefox and others were not tested. Where unsupported, navigation is plain.
- If the owner still sees a flash on a real device, the next steps are a recording from that device (`chrome://inspect` remote debugging) and, only with the owner's approval, a different architecture (ADR needed: Astro's `ClientRouter` changes navigation and script lifecycles).

## Relevant commits

- The P09 navigation-continuity commit (see `development/implementation-log.md`).
