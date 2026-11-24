// Changes the owner approved AFTER an older guard's base commit (P22-A01). The preservation guards of P16 to P22 compare
// the working tree with the commit their prompt began from and fail on any change to what they protect; a change the
// owner has approved in a recorded decision is not a regression, so the guards subtract exactly the files of that
// decision and nothing else. Every file listed here must be named by its decision in development/decisions.md (tests/clocks.mjs
// CLOCK-043 checks that), so an approval cannot be widened by editing this list alone.

/**
 * D-158: the world clocks show a short date beside the city (the full date stays for assistive technology), and the
 * reading column is sized by the widest short date so filling it moves nothing. Owner-approved on 2026-11-23.
 */
export const D158_FILES = ["src/home/clock-time.ts", "src/components/home/WorldClocks.astro", "src/scripts/world-clocks.ts", "src/styles/home.css"]

/** `files` without the ones a recorded owner decision allowed to change. */
export const withoutApproved = (files, approved = D158_FILES) => files.filter((f) => !approved.includes(f))
