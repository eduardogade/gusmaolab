/**
 * The entry script of the 3D nucleus specimen page (P19, D-136). The page's own script element is
 * bundled even where the page is not routed, so this entry is a guard and nothing more: in a release
 * build the mode is the constant "production", the condition below is false at build time, and the
 * specimen's logic (src/design/nucleus/specimen.ts) and with it the graphics engine never enter the
 * bundle. A release build is searched for both (scripts/demo-check.mjs). This is the one place besides
 * src/editorial/demo.ts that reads the mode, and it must say exactly what `demosEnabled()` says: a
 * function call is not folded away by the bundler, a comparison of constants is.
 */
if (import.meta.env.MODE === "development" || import.meta.env.MODE === "demo") void import("../design/nucleus/specimen.ts")
