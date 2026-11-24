// Changes the owner approved, or asked for, AFTER an older guard's base commit (P22-A01, P23). The preservation guards of P16 to P22 compare
// the working tree with the commit their prompt began from and fail on any change to what they protect; a change the
// owner has approved in a recorded decision is not a regression, so the guards subtract exactly the files of that
// decision and nothing else. Every file listed here must be named by its decision in development/decisions.md (tests/clocks.mjs
// CLOCK-043 checks that), so an approval cannot be widened by editing this list alone.

/**
 * D-158: the world clocks show a short date beside the city (the full date stays for assistive technology), and the
 * reading column is sized by the widest short date so filling it moves nothing. Owner-approved on 2026-11-23.
 */
export const D158_FILES = ["src/home/clock-time.ts", "src/components/home/WorldClocks.astro", "src/scripts/world-clocks.ts", "src/styles/home.css"]

/**
 * D-161 (P23, 2026-11-24): the review of the whole site in real browsers found and repaired four things, each with the smallest change:
 * a skip link that bypasses the forty folder links before every page's content (`BaseLayout.astro`, `global.css`), the site's name
 * breaking at 320 px (`home.css`), a world clock whose reading drops beneath its place when the text is enlarged past what the row
 * holds (`WorldClocks.astro`, `home.css`; KL-132), and display equations that scroll sideways and can be reached by keyboard
 * (`EditorialEntry.astro`, `editorial.css`). The palettes, the tokens, the folders' geometry and the homepage's composition are not changed.
 */
export const D161_FILES = ["src/layouts/BaseLayout.astro", "src/styles/global.css", "src/styles/home.css", "src/components/home/WorldClocks.astro", "src/components/editorial/EditorialEntry.astro", "src/styles/editorial.css"]

/** Every file an owner-approved or owner-requested decision allowed to change since an older guard's base. */
export const APPROVED_FILES = [...new Set([...D158_FILES, ...D161_FILES])]

/** `files` without the ones a recorded decision allowed to change. */
export const withoutApproved = (files, approved = APPROVED_FILES) => files.filter((f) => !approved.includes(f))

/** The lines of a browser test that name the one accepted animation of the sticky tabs (D-144): they must never move. */
export const exemptionLines = (text) => text.split("\n").filter((l) => /gl-home-tabs-raise|Except the scroll-driven z-index raise/.test(l))

/** home.css without the narrow-screen title rule of D-161, so a guard can compare the rest with an older version of the file. */
export const withoutNarrowTitleRule = (css) => css.replace(/\n  \/\*\n   \* The site's name is one word[\s\S]*?\n  @media \(max-width: 21rem\) \{[\s\S]*?\n  \}\n/, "")
