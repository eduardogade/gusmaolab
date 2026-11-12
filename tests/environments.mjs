// Environment checks (P09): ENV-001 to ENV-006, for the approved section environments
// (src/styles/environments.css) and the proposed candidates
// (src/styles/environment-candidates.css, shown only at /_design/environments-v2/).
// Run `npm run build` first, or `npm run verify`.
//
// Contrast numbers prove legibility, not taste: whether a candidate is better is the
// owner's decision.
import { createHash } from "node:crypto"
import { readFile, readdir } from "node:fs/promises"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import {
  CONTRAST_PAIRS,
  ENVIRONMENTS,
  ENVIRONMENT_TOKENS,
} from "../src/design/contract.mjs"
import {
  contrastRatio,
  parseRules,
  readTokens,
  stripComments,
} from "../src/design/css-tokens.mjs"
import { siteNavigation } from "../src/navigation/index.ts"
import { elements, layersOf, parse, tabsOf } from "./html-tree.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const read = (path) => readFile(join(repo, path), "utf8")
const tokensCss = await read("src/styles/tokens.css")
const environmentsCss = await read("src/styles/environments.css")
const candidatesCss = await read("src/styles/environment-candidates.css")
const tokens = readTokens(tokensCss, environmentsCss, candidatesCss)
const json = (value) => JSON.stringify(value)

const APPROVED = ENVIRONMENTS.map((e) => e.id)
const PROPOSED = APPROVED.map((id) => `proposed-${id}`)
const ratio = (a, b, env) =>
  contrastRatio(tokens.color(a, env).rgba, tokens.color(b, env).rgba)

const dist = join(repo, "dist")
async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((e) =>
      e.isDirectory() ? listFiles(join(dir, e.name)) : [join(dir, e.name)],
    ),
  )
  return nested.flat()
}
const distFiles = (await listFiles(dist)).map((f) => relative(dist, f))
const specimenHtml = await readFile(
  join(dist, "_design/environments-v2/index.html"),
  "utf8",
).catch(() => "")

const results = []
async function test(id, title, body) {
  const failures = []
  try {
    await body((ok, message) => ok || failures.push(message))
  } catch (error) {
    failures.push(error.message)
  }
  results.push({ id, title, failures })
}

// --- Tests --------------------------------------------------------------------------------

await test(
  "ENV-001",
  "Every environment, approved or proposed, is a complete token set",
  (check) => {
    for (const env of [...APPROVED, ...PROPOSED]) {
      const scope = tokens.environments.get(env)
      check(scope !== undefined, `${env} is not defined`)
      if (!scope) continue
      const names = [...scope.keys()]
      const missing = ENVIRONMENT_TOKENS.filter((n) => !scope.has(n))
      const extra = names.filter((n) => !ENVIRONMENT_TOKENS.includes(n))
      check(missing.length === 0, `${env} lacks ${missing.join(", ")}`)
      check(extra.length === 0, `${env} also sets ${extra.join(", ")}`)
      for (const name of ENVIRONMENT_TOKENS) tokens.resolve(name, env)
    }
  },
)

await test(
  "ENV-002",
  "Text and indicators stay legible in every proposed environment",
  (check) => {
    for (const env of PROPOSED) {
      for (const pair of CONTRAST_PAIRS) {
        if (pair.min === null) continue
        const r = ratio(pair.foreground, pair.background, env)
        check(
          r >= pair.min,
          `${env}: ${pair.label} is ${r.toFixed(2)}:1, needs ${pair.min}:1`,
        )
      }
    }
  },
)

await test(
  "ENV-003",
  "Active and inactive tabs stay as distinct as in the approved environments",
  (check) => {
    const levels = [
      ["--color-folder-tab-inactive", "--color-folder-parent"],
      ["--color-folder-tab-inactive-nested", "--color-folder-nested"],
      ["--color-folder-tab-inactive-deep", "--color-folder-deep"],
    ]
    for (const [inactive, active] of levels) {
      const floor = Math.min(
        ...[undefined, ...APPROVED].map((env) => ratio(inactive, active, env)),
      )
      for (const env of PROPOSED) {
        const r = ratio(inactive, active, env)
        check(
          r >= floor - 0.005,
          `${env}: ${inactive} against ${active} is ${r.toFixed(2)}:1; the approved environments reach at least ${floor.toFixed(2)}:1`,
        )
      }
    }
  },
)

await test(
  "ENV-004",
  "Candidates change colours only, never folder geometry",
  (check) => {
    // The candidate file holds candidate hues on :root and environment blocks; nothing else.
    for (const { selectors, declarations } of parseRules(
      stripComments(candidatesCss),
    )) {
      for (const selector of selectors) {
        check(
          selector === ":root" ||
            /^\[data-environment="proposed-[a-z]+"\]$/.test(selector),
          `unexpected selector ${selector}`,
        )
      }
      for (const name of declarations.keys()) {
        check(
          selectors.includes(":root")
            ? /^--palette-proposed-[a-z-]+$/.test(name)
            : ENVIRONMENT_TOKENS.includes(name),
          `${selectors.join(", ")} sets ${name}`,
        )
      }
    }
    // On the specimen, each pair's two sides draw the same folders: same rows, same tabs.
    const tree = parse(specimenHtml)
    const pairs = elements(tree).filter((el) => "data-env-pair" in el.attrs)
    check(pairs.length === APPROVED.length, `the specimen shows ${pairs.length} pairs`)
    for (const pair of pairs) {
      const sides = elements(pair).filter((el) => "data-variant" in el.attrs)
      const shapes = sides.map((side) =>
        json(
          layersOf(side).layers.map((layer) => [
            layer.attrs["data-level"],
            tabsOf(layer).map((t) => t.attrs["data-tab-id"]),
          ]),
        ),
      )
      check(
        sides.length === 2 && shapes[0] === shapes[1],
        `${pair.attrs["data-env-pair"]}: the two sides differ in structure`,
      )
      check(
        json(sides.map((s) => s.attrs["data-environment"])) ===
          json([
            pair.attrs["data-env-pair"],
            `proposed-${pair.attrs["data-env-pair"]}`,
          ]),
        `${pair.attrs["data-env-pair"]}: wrong environments`,
      )
    }
  },
)

await test("ENV-005", "Candidate styling reaches no other page", async (check) => {
  check(!/proposed/.test(environmentsCss), "environments.css mentions a proposal")
  for (const file of distFiles.filter((f) => f.endsWith(".html"))) {
    if (file === "_design/environments-v2/index.html") continue
    const html = await readFile(join(dist, file), "utf8")
    check(!/proposed-/.test(html), `dist/${file} contains candidate styling`)
    for (const [, href] of html.matchAll(
      /<link[^>]+rel="stylesheet"[^>]+href="\/([^"]+)"/g,
    )) {
      const css = await readFile(join(dist, href), "utf8")
      check(
        !/proposed-/.test(css),
        `dist/${file} loads ${href}, which contains candidate styling`,
      )
    }
  }
  for (const path of siteNavigation.pagePaths()) {
    const html = await readFile(join(dist, `${path.slice(1)}index.html`), "utf8")
    const env = /<html[^>]*data-environment="([^"]+)"/.exec(html)?.[1] ?? "core"
    check(!env.startsWith("proposed"), `${path} uses a proposed environment`)
  }
})

await test("ENV-006", "The approved palette is unchanged and still shown", (check) => {
  // A fingerprint of every approved environment token, as resolved: change it only with a
  // recorded decision that adopts a candidate (then update this value).
  const APPROVED_FINGERPRINT =
    "7a58c818a69e088ca80bc73ff8a48802d0e9342808f6f85aa11396e242024ad1"
  const hash = createHash("sha256")
  for (const env of [undefined, ...APPROVED]) {
    for (const name of ENVIRONMENT_TOKENS) {
      const value = tokens.resolve(name, env)
      hash.update(`${env}|${name}|${value.kind === "color" ? value.hex : value.text}\n`)
    }
  }
  check(
    hash.digest("hex") === APPROVED_FINGERPRINT,
    "the approved environments changed",
  )
  const tree = parse(specimenHtml)
  const current = elements(tree).filter((el) => el.attrs["data-variant"] === "current")
  check(
    json(current.map((el) => el.attrs["data-environment"])) === json(APPROVED),
    "the specimen does not show every approved environment",
  )
  check(
    /pending the owner(&#39;|')s approval/.test(specimenHtml),
    "the proposals are not marked as pending",
  )
})

// --- Report -------------------------------------------------------------------------------

let failed = 0
for (const { id, title, failures } of results) {
  if (failures.length === 0) console.log(`PASS ${id} ${title}`)
  else {
    failed++
    console.error(`FAIL ${id} ${title}`)
    for (const message of failures.slice(0, 12)) console.error(`  - ${message}`)
  }
}
if (failed > 0) process.exit(1)
console.log(
  `PASS: ${results.length} environment checks; ${APPROVED.length} approved and ${PROPOSED.length} proposed environments`,
)
