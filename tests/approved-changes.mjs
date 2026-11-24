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

/**
 * D-162 (P23 close-out, 2026-11-24): the skip link's target takes focus. Firefox 159 leaves focus on the skip link when the target of a
 * same-page link cannot take focus, so the next Tab returned to the first folder tab and the link skipped nothing (Chrome moves its
 * starting point and did not show it). `<main id="content">` gains `tabindex="-1"` in the three places that draw it: `BaseLayout.astro`
 * and `global.css` (already D-161's) and the two layouts below, which are the only files this decision adds. The change to each is one
 * attribute: `skipTargetOnly()` states exactly that, and QA-PRESERVE-05 holds the two files to it.
 */
export const D162_FILES = ["src/layouts/FolderPage.astro", "src/layouts/ErrorPage.astro"]

/**
 * D-163 (P24, 2026-11-24, the owner's release prompt): release metadata. Every page gains the owner's favicon and Open Graph tags, and a
 * release build states each public page's canonical address (`BaseLayout.astro`, already D-161's, with the rules in
 * `src/release/metadata.ts`); the build writes robots.txt and a public sitemap. The two endpoints are the only files this decision adds
 * under a guarded path. No page's content, layout, style or script changes.
 */
export const D163_FILES = ["src/pages/sitemap.xml.ts", "src/pages/robots.txt.ts"]

/**
 * D-164 (P24, 2026-11-24): the owner gave nine public profiles for the Contact page in the P24 prompt; they are entries in the one list
 * of public channels (P18), which exists for this. No email address and no telephone number is added.
 */
export const D164_FILES = ["src/data/contact.ts"]

/**
 * D-168 (P24A, 2026-11-24, the owner's release instruction): the owner's favicon source back at `brand/favicon.ico` (its
 * derivative is `public/favicon.ico`, made by scripts/favicon.mjs); the 404 page with Bearnard, through the registry's
 * `not-found` role, which the owner asked for; and the owner's full-size Bearnard image recorded in the inventory. No master
 * is changed, no derivative is remade, and the folders, palettes and homepage are untouched.
 */
export const D168_FILES = ["brand/favicon.ico", "src/illustrations/bearnard.ts", "src/pages/404.astro", "assets/bearnard/inventory.csv", "assets/bearnard/SHA256SUMS", "assets/bearnard/README.md"]

/** Every file an owner-approved or owner-requested decision allowed to change since an older guard's base. */
export const APPROVED_FILES = [...new Set([...D158_FILES, ...D161_FILES, ...D162_FILES, ...D163_FILES, ...D164_FILES, ...D168_FILES])]

/** `git status --porcelain` lines, without the files a recorded decision allowed to change (a rename counts by its new path). */
export const statusWithoutApproved = (status, approved = APPROVED_FILES) =>
  status.split("\n").filter(Boolean).filter((line) => !approved.includes(line.slice(3).split(" -> ").pop()))

/** `files` without the ones a recorded decision allowed to change. */
export const withoutApproved = (files, approved = APPROVED_FILES) => files.filter((f) => !approved.includes(f))

/** The lines of a browser test that name the one accepted animation of the sticky tabs (D-144): they must never move. */
export const exemptionLines = (text) => text.split("\n").filter((l) => /gl-home-tabs-raise|Except the scroll-driven z-index raise/.test(l))

/** home.css without the narrow-screen title rule of D-161, so a guard can compare the rest with an older version of the file. */
export const withoutNarrowTitleRule = (css) => css.replace(/\n  \/\*\n   \* The site's name is one word[\s\S]*?\n  @media \(max-width: 21rem\) \{[\s\S]*?\n  \}\n/, "")

/**
 * Whether a `git diff` of FolderPage.astro or ErrorPage.astro holds only D-162's change: one line removed and the same line added with
 * `tabindex="-1"` as its last attribute. An unchanged file (an empty diff) is also fine. Anything else is a change D-162 does not approve.
 */
export function skipTargetOnly(diff) {
  const lines = diff.split("\n").filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l))
  if (lines.length === 0) return true
  const removed = lines.filter((l) => l.startsWith("-")).map((l) => l.slice(1))
  const added = lines.filter((l) => l.startsWith("+")).map((l) => l.slice(1))
  return removed.length === 1 && added.length === 1 && /<main id="content"/.test(removed[0]) && added[0] === removed[0].replace(/>$/, ' tabindex="-1">')
}
