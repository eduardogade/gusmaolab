// Navigation-continuity checks that need no browser (P09): how the cross-fade between
// folder pages is declared, and where. Run `npm run build` first, or `npm run verify`.
//
// Whether a navigation actually looks continuous can only be seen in a browser:
// tests/transitions-browser.mjs (`npm run test:browser`) checks what headless Chrome can
// measure, and the owner judges the rest on real screens (ISSUE-0004).
import { readFile, readdir } from "node:fs/promises"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { siteNavigation } from "../src/navigation/index.ts"

const repo = new URL("../", import.meta.url)
const dist = fileURLToPath(new URL("dist/", repo))
const src = fileURLToPath(new URL("src/", repo))
const read = (path) => readFile(new URL(path, repo), "utf8")
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "")

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((e) =>
      e.isDirectory() ? listFiles(join(dir, e.name)) : [join(dir, e.name)],
    ),
  )
  return nested.flat()
}

const css = stripComments(await read("src/styles/view-transitions.css"))
const layout = await read("src/layouts/FolderPage.astro")
const sources = await Promise.all(
  (await listFiles(src)).map(async (file) => [
    relative(src, file),
    await readFile(file, "utf8"),
  ]),
)
// Everything a built page asks the browser to apply: inline styles and linked sheets.
const sheetCache = new Map()
async function stylesOf(path) {
  const html = await readFile(join(dist, `${path.slice(1)}index.html`), "utf8").catch(
    () => "",
  )
  const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
  const linked = []
  for (const [, href] of html.matchAll(
    /<link[^>]+rel="stylesheet"[^>]+href="\/([^"]+)"/g,
  )) {
    if (!sheetCache.has(href))
      sheetCache.set(href, await readFile(join(dist, href), "utf8"))
    linked.push(sheetCache.get(href))
  }
  return { html, styles: [...inline, ...linked].join("\n") }
}

const results = []
function test(id, title, body) {
  const failures = []
  try {
    body((ok, message) => ok || failures.push(message))
  } catch (error) {
    failures.push(error.message)
  }
  results.push({ id, title, failures })
}

// --- Tests --------------------------------------------------------------------------------

const optIn = /@view-transition\s*\{\s*navigation:\s*auto;?\s*\}/

test(
  "TRANS-B01",
  "The cross-fade is declared once, short, and only on the root",
  (check) => {
    check(
      optIn.test(css),
      "view-transitions.css does not opt in to cross-document transitions",
    )
    // Animation properties only on the root's view-transition pseudo-elements.
    for (const [, selector, body] of css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
      if (/animation/.test(body)) {
        check(
          selector
            .split(",")
            .every((s) => /^\s*::view-transition-(group|old|new)\(root\)\s*$/.test(s)),
          `animation set on ${selector.trim()}`,
        )
      }
    }
    const duration = css.match(/animation-duration:\s*(\d+)ms/)
    check(
      duration && Number(duration[1]) <= 200,
      `the cross-fade lasts ${duration?.[1]} ms`,
    )
    check(
      !/view-transition-name/.test(css),
      "a shared element is named: only the root may fade",
    )
    for (const [file, text] of sources) {
      if (file === "styles/view-transitions.css") continue
      check(
        !/@view-transition|::view-transition|view-transition-name/.test(
          stripComments(text),
        ),
        `src/${file} declares a view transition`,
      )
    }
    check(
      /import "\.\.\/styles\/view-transitions\.css"/.test(layout),
      "FolderPage does not load the cross-fade",
    )
  },
)

test("TRANS-B02", "Reduced motion turns the transition off", (check) => {
  const reduced = css.match(
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*)\}\s*$/,
  )
  check(
    reduced !== null,
    "there is no reduced-motion block at the end of view-transitions.css",
  )
  check(
    reduced && /@view-transition\s*\{\s*navigation:\s*none;?\s*\}/.test(reduced[1]),
    "reduced motion does not set navigation: none",
  )
})

const pages = siteNavigation.pagePaths()
const built = new Map()
for (const path of [...pages, "/_design/tokens/", "/_design/folders/"])
  built.set(path, await stylesOf(path))

test("TRANS-B03", "Every folder page opts in; the design studies do not", (check) => {
  for (const path of pages) {
    const { html, styles } = built.get(path)
    check(html !== "", `${path} is not built`)
    check(/@view-transition\{navigation:auto\}/.test(styles), `${path} does not opt in`)
    check(
      /@media \(prefers-reduced-motion:reduce\)\{@view-transition\{navigation:none\}\}/.test(
        styles,
      ),
      `${path} lacks the reduced-motion opt-out`,
    )
  }
  for (const path of ["/_design/tokens/", "/_design/folders/"]) {
    check(
      !/@view-transition/.test(built.get(path).styles),
      `${path} opts in to page transitions`,
    )
  }
})

test("TRANS-B04", "Navigation stays ordinary: no router, no new script", (check) => {
  for (const [file, text] of sources) {
    check(
      !/ClientRouter|astro:transitions|navigation\.navigate|history\.pushState/.test(
        text,
      ),
      `src/${file} routes on the client`,
    )
  }
  for (const path of pages) {
    const scripts = built.get(path).html.match(/<script\b/g) ?? []
    check(scripts.length === 1, `${path} has ${scripts.length} scripts`)
  }
})

// --- Report -------------------------------------------------------------------------------

let failed = 0
for (const { id, title, failures } of results) {
  if (failures.length === 0) {
    console.log(`PASS ${id} ${title}`)
  } else {
    failed++
    console.error(`FAIL ${id} ${title}`)
    for (const message of failures.slice(0, 12)) console.error(`  - ${message}`)
  }
}
if (failed > 0) process.exit(1)
console.log(
  `PASS: ${results.length} transition checks without a browser; ${pages.length} folder pages`,
)
