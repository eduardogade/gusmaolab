// WCAG 2.2 contrast check for the principal opaque text and indicator pairings, in every
// archive category (P09-A01): colour is the category's, and no environment changes it.
// It reads the real values from src/styles/. Passing it does not make the site
// accessible: text over the flannel, translucent layers and real content still need
// inspection.
//
//   node tests/contrast.mjs             summary, exits 1 on any failure
//   node tests/contrast.mjs --markdown  full tables for planning/design-system.md
import { readFile } from "node:fs/promises"
import { CATEGORIES, CONTRAST_PAIRS } from "../src/design/contract.mjs"
import { contrastRatio, readTokens } from "../src/design/css-tokens.mjs"

const styles = new URL("../src/styles/", import.meta.url)
const tokens = readTokens(
  await readFile(new URL("tokens.css", styles), "utf8"),
  await readFile(new URL("categories.css", styles), "utf8"),
  await readFile(new URL("environments.css", styles), "utf8"),
)

// Truncate rather than round, so a ratio is never reported higher than it is.
const show = (ratio) => (Math.floor(ratio * 100) / 100).toFixed(2)

const scopes = CATEGORIES
const results = []
const failures = []
for (const scope of scopes) {
  for (const pair of CONTRAST_PAIRS) {
    const fg = tokens.color(pair.foreground, scope.id)
    const bg = tokens.color(pair.background, scope.id)
    if (!fg.opaque || !bg.opaque) {
      failures.push(`${scope.name}: ${pair.label} uses a translucent colour`)
      continue
    }
    const ratio = contrastRatio(fg.rgba, bg.rgba)
    const pass = pair.min === null || ratio >= pair.min
    results.push({ scope: scope.name, pair, fg: fg.hex, bg: bg.hex, ratio, pass })
    if (!pass) {
      failures.push(
        `${scope.name}: ${pair.label}: ${fg.hex} on ${bg.hex} is ${show(ratio)}:1, needs ${pair.min}:1`,
      )
    }
  }
}

if (process.argv.includes("--markdown")) {
  for (const scope of scopes) {
    console.log(`\n#### ${scope.name}\n`)
    console.log("| Pairing | Foreground | Background | Ratio | Minimum | Result |")
    console.log("| --- | --- | --- | ---: | ---: | --- |")
    for (const r of results.filter((r) => r.scope === scope.name)) {
      const min = r.pair.min === null ? "—" : `${r.pair.min}:1`
      const result = r.pair.min === null ? "Info" : r.pass ? "Pass" : "**Fail**"
      console.log(
        `| ${r.pair.label} | \`${r.fg}\` | \`${r.bg}\` | ${show(r.ratio)}:1 | ${min} | ${result} |`,
      )
    }
  }
} else {
  for (const scope of scopes) {
    const checked = results.filter((r) => r.scope === scope.name && r.pair.min !== null)
    const lowest = checked.reduce((low, r) =>
      r.ratio / r.pair.min < low.ratio / low.pair.min ? r : low,
    )
    console.log(
      `${scope.name.padEnd(12)} ${checked.filter((r) => r.pass).length}/${checked.length} pass; ` +
        `closest to its minimum: ${lowest.pair.label} ${show(lowest.ratio)}:1 (min ${lowest.pair.min}:1)`,
    )
  }
}

if (failures.length > 0) {
  for (const message of failures) console.error(`FAIL: ${message}`)
  process.exit(1)
}
console.log(`PASS: ${results.length} contrast pairings in ${scopes.length} categories`)
