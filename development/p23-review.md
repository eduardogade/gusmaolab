# P23 — Manual browser review and refinement

Reviewed 2026-11-24 on `development` at `183b5a4` (the head P23 began from), in real browsers, on the owner's Mac (macOS 27.2.1). This file is the owner's review matrix. The screenshots are **evidence kept outside Git** in `qa-report/p23/` (gitignored, not served); the table below names them. Nothing here is an owner acceptance: the owner reviews it.

## 1. What was and was not inspected

| Environment | How | Covered |
| --- | --- | --- |
| **Chrome 158**, headless, macOS | Real rendering through the DevTools protocol (the QA harness), software WebGL; real mouse, keyboard and wheel events | Everything below unless stated |
| **Chrome with touch emulation** (390 × 844 at 2x, hover: none, pointer: coarse) | Real touch gestures through the protocol | Swipe of the tab rows, taps, vertical scroll, still nucleus. **Emulation, not a phone.** |
| **Firefox 159.0.1**, headless, macOS | WebDriver BiDi (no geckodriver), real pointer input | Ten routes, hover preview, click navigation, Back and Forward, clocks, WebGL nucleus, the Home tab row |
| **Safari** (installed) | **NOT TESTED.** Driving it needs "Allow Remote Automation" in Safari's Develop menu, an owner setting that was not changed, and no tab was opened in the owner's own Safari. Feature support was read from the CSS instead (section 6). | none |
| Physical phone or tablet, Android Chrome, iOS Safari | **NOT TESTED** | none |
| VoiceOver, NVDA, any screen reader | **NOT TESTED.** Chrome's accessibility tree was inspected (landmarks, headings, names), which is not a screen-reader test. | none |

Widths: 320, 360, 390, 430, 600, 768, 1024, 1280, 1440, 1920, 2560, phone and tablet landscape, 150, 200 and 300 percent text, 200 and 400 percent browser zoom (a window of 640 and 320 CSS px). Fonts: the Mac's (Seravek, Superclarendon, Iowan Old Style), and the runner's (DejaVu Sans, Liberation Serif) emulated for the checks that changed.

## 2. Findings

| ID | Severity | Class | Where | What a visitor met | Correction | Status |
| --- | --- | --- | --- | --- | --- | --- |
| P23-F01 | **High** | Accessibility (WCAG 2.4.1) | Every page | 41 Tab stops on Home, 45 before an article's contents, before any content, because every folder's preview lists its children and those links are in the tab order; no way past them | A "Skip to main content" link, first Tab stop, drawn only while focused (`BaseLayout.astro`, `global.css`); A11Y-SKIP | **FIXED** |
| P23-F02 | Medium | Accessibility (WCAG 2.1.1) | Quarto articles, display equations | On a phone (320 and 390 px), or with enlarged text, a wide equation scrolls sideways and the keyboard could not reach it | `tabindex="0"` on `<math display="block">`; the `<math>` is the single scroller (`EditorialEntry.astro`, `editorial.css`); A11Y-SCROLL; checked by Tab and arrow keys | **FIXED** |
| P23-F03 | Medium | Accessibility / visual (KL-132) | Home, world clocks | With enlarged text on a narrow screen city names broke inside a word ("Ancho / rage", "Mexic / o City") | A wrapping row: the reading drops beneath the place only when the longest word cannot share the line (`WorldClocks.astro`, `home.css`); CLOCK-034C over 15 cases; ordinary composition identical (0.1 px, 14 widths) | **FIXED** |
| P23-F04 | Low | Visual | Home, 320 px | The site's name broke as "GusmaoLa / b" at the narrowest supported width | Title 2.3rem below 21rem (`home.css`); HOME-027B, 13 widths | **FIXED** |
| P23-F05 | Low | Accepted limitation | Quarto articles | An inline formula wider than the column cannot wrap (no MathML line breaking in these browsers) and is cut at the reading surface at extreme enlargement (390 px, text doubled), where the paper itself can then scroll with nothing to focus | none; authors keep inline formulas short and use display equations | **ACCEPTED** (KL-133) |
| P23-F06 | Low | Accepted limitation | Headings | A one-word heading wraps inside the word where enlarged text is wider than the column: "GusmaoLab" at 150 percent on a 390 px phone, "In preparation", "Bearnard's", "Schedule" at 150 to 200 percent on 320 to 390 px. Nothing clips, overlaps or disappears | none; the alternative is horizontal overflow | **ACCEPTED** (KL-134) |
| P23-F07 | Low | Release (P24) | Every page | `/favicon.ico` answers 404 (a console line in every browser); the site has no icon | none: an icon is a design asset and a P24 metadata task | **DEFERRED to P24** |
| P23-F08 | **Owner decision** | Content dependency | Contact, Schedule | Schedule says "For now, please use Contact"; Contact lists no channel (none is approved, no form exists), so a visitor reaches a dead end. Both pages say so honestly | none: no address is invented. The owner must approve at least one channel (`src/data/contact.ts`) before release | **NEEDS OWNER REVIEW** (P24 prerequisite) |
| P23-F09 | Info | Dev specimens | `/_design/*` | The development specimens (nucleus, scheduling, publishing at 390 px with text doubled; the QA inspector's table) have a scrolling region without a tab stop | none: development-only, never in a release (D-157) | **ACCEPTED** |

Nothing else was found in: the 36 destinations (one `<h1>`, the right category colour, the right selected tab on every row, no sideways page scroll, no console error, no broken image), the physical folders' stacking and previews, Home's composition, the nucleus, the clocks' times and dates, the four navigation journeys with real clicks, Back and Forward, direct entry to deep routes, the 404, Contact, Schedule, Downloads, the eight editorial collections, the empty and in-preparation states.

## 3. Review matrix

Status: PASS, FIXED, ACCEPTED, NEEDS OWNER REVIEW, NOT TESTED, DEFERRED. "Chrome" is Chrome 158 headless; evidence paths are under `qa-report/p23/`.

| Route or interaction | Browser | Viewport, input | Scope | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| All 36 registered destinations | Chrome | 1440 × 900 mouse; 390 × 844 | h1, category, selected tabs per row, overflow, broken images, clipped text, console | **PASS** (the only console line is F07) | `sweep.json`, `desktop/<id>.png`, `mobile/<id>.png` |
| Home, full composition | Chrome | 2560, 1920, 1440, 1280, 1024, 768, 430, 390, 320 | regions, order, overflow, layout shift (0.0000), clocks | **PASS**; F04 **FIXED** | `desktop/home-<width>.png` |
| Home sticky tab row, hover preview, nucleus response, click, wheel | Chrome | 1440 × 900 fine pointer | D-144 behaviour | **PASS**; the row sits 8 px above the viewport edge (the accepted seam) | `desktop/home-sticky-preview-nucleus.png`, `desktop/lab-hover-preview.png` |
| Home in Firefox: row, preview, click, Back, Forward | Firefox 159 | 1440 × 900 pointer | normal navigation | **PASS**; the row is not sticky (Chromium enhancement, accepted) | `misc/firefox-*.png` |
| The nucleus | Chrome, Firefox | 1440 | envelope, depth, yellow region, responds to Lecture Notes, ready in both | **PASS** | `desktop/home-1440.png`, `misc/firefox-home-nucleus.png` |
| World clocks | Chrome, Firefox | all | eight times and short dates, no layout shift, full date in the accessibility tree | **PASS** | `desktop/home-1440.png` |
| Clocks, KL-132 (320 px at 150 %, 390 px at 200 %, 768 px at 200 %) | Chrome | enlarged text | words whole, nothing overlaps | **FIXED** (F03) | before `zoom/clocks-text150-320.png`, `zoom/clocks-text200-390.png`; after `after/clocks-text150-320.png`, `after/clocks-text200-390.png`, `after/clocks-text200-768.png` |
| Touch: swipe the main row to the last tab, tap Bearnard's Area, swipe a nested row, tap Bear Life, scroll Home, still nucleus | Chrome touch emulation | 390 × 844, 2x | gestures | **PASS (emulated)**; real phone **NOT TESTED** | `mobile/touch-*.png` |
| Four navigation journeys with real clicks; Back, Forward; four deep entries; no JavaScript | Chrome | 1440 | category, selected tabs, depth | **PASS** | (console log of the run) |
| Keyboard walkthrough (Home, Lab, article, Downloads specimen, 404, Contact) | Chrome | 1440 | order, rings, traps | F01 **FIXED**; no trap, no hidden stop, rings on every stop | `misc/keyboard-focus-home.png`, `after/skip-link-focused-1440.png`, `after/skip-link-focused-390.png` |
| Equations: Tab, ring, arrow keys | Chrome | 390 | WCAG 2.1.1 | F02 **FIXED** | `after/equation-keyboard-focus-390.png`, before `zoom/equation-390-text200.png` |
| Contrast | Chrome | 1440 | about 1,000 rendered text elements on nine routes in the five palettes, plus the hover preview; 96 tab labels from pixels | **PASS**: every text element meets its threshold (tightest 4.52:1 for small muted text), tabs 4.57:1 or more, preview 10.8:1 | (method in section 5) |
| Enlarged text 150, 200 %; zoom 200, 400 % | Chrome | 320 to 1280 | 12 routes: split words, clipping, overflow | **PASS**, with F05 and F06 **ACCEPTED** | `zoom/`, `after/` |
| Orientation | Chrome | 844 × 390, 1024 × 768, 768 × 1024 | overflow, rows | **PASS** | (console log) |
| Greenhouse articles (Markdown, Quarto) | Chrome | 1440, 390 | equations, code, tables, TOC, figure, sources | **PASS**; F02 **FIXED**; F05 **ACCEPTED** | `desktop/article-*-full-1440.png`, `mobile/article-*-full-390.png` |
| Eight editorial collection layouts | Chrome | 1440, 390 | reading width (644 to 725 px, about 67 to 85 characters), literary against technical identity | **PASS** | `desktop/editorial-*.png`, `mobile/editorial-*.png` |
| Contact, Schedule (disabled), 404 | Chrome, Firefox | 1440, 390 | honest copy, no provider request, recovery links | **PASS**; F08 **NEEDS OWNER REVIEW** | `desktop/contact-full-1440.png`, `schedule-full-1440.png`, `404-full-1440.png` |
| Downloads specimen | Chrome | 1440, 390 | filenames, links | **PASS** (development specimen) | `desktop/downloads-specimen-full-1440.png` |
| Safari, any physical device, any screen reader | — | — | — | **NOT TESTED** | owner walkthrough, section 4 |

## 4. Owner walkthrough for what could not be tested

- **Safari (macOS).** `npm run dev`, open the printed address in Safari. (1) Home, Portfolio, CV, Lab, Lecture Notes, Writing, Bearnard's Area by clicking; Back and Forward after each. (2) Hover a tab: its preview opens; the Home tab row is not sticky in Safari (expected). (3) Home at the bottom: the nucleus is drawn (or a still picture) and the eight clocks show times and short dates. (4) Tab key once on any page: "Skip to main content" appears top left. (5) Safari needs 16.4 or later for the `lh` unit the clocks use; an older one only loses a minimum height.
- **VoiceOver (macOS).** Control-Option-U opens the rotor. Landmarks: a "Sections" navigation, one main, regions named by their headings. Headings: one level 1, then 2 and 3. On Home, the clocks: each city, then its time and its **full** date ("Monday, 23 November"), not the short one. The nucleus is one image with a description. Open the Greenhouse demonstration article and move through a table, a code block and an equation: each should be a stop you can scroll.
- **A phone.** Open the site over the local network. Swipe the main row to Bearnard's Area, tap it, swipe the nested row; scroll an article; at 200 percent text size check the clocks' names are whole. The nucleus must stay still.

## 5. Methods and limits

- Contrast: relative luminance of the computed text colour against the first opaque ancestor background, text over an image excluded (none sits on the flannel by design); tab labels, whose fill is drawn by a separate element, from the most common colour of the rendered pixels of the label's box. Thresholds 4.5:1, 3:1 for 24 px or 18.66 px bold.
- Text scaling is a root font size of 150 or 200 percent (equal to a browser's text-only zoom); browser zoom is emulated by the equivalent CSS-pixel window, so it shows layout, not the browser's own zoom controls.
- The screenshots are of this Mac's fonts; a Linux or Windows visitor sees the fallback fonts (KL-15), and the layout rules were checked with those fonts emulated.
- Headless Chrome and Firefox on one Mac are not a population of browsers and devices.
