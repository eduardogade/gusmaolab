// Chromatic Archive checks (P09-A01, D-076): CAT-001 to CAT-010. The owner locked five
// category palettes, four shared colours, the category of every section and a global row
// of eleven tabs. This file holds its own copy of those values, on purpose: it fails if
// the stylesheets, the registry or the built pages drift from what was approved.
// Run `npm run build` first, or `npm run verify`.
//
// Change a value below only with a recorded decision of the owner's.
import { readFile, readdir } from "node:fs/promises"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import {
  CATEGORIES,
  CATEGORY_TOKENS,
  ENVIRONMENTS,
  ENVIRONMENT_TOKENS,
} from "../src/design/contract.mjs"
import { parseRules, readTokens, stripComments } from "../src/design/css-tokens.mjs"
import { CATEGORY_IDS, siteNavigation } from "../src/navigation/index.ts"
import { elements, hasClass, labelOf, layersOf, parse, tabsOf } from "./html-tree.mjs"

// --- The locked values --------------------------------------------------------------------

/** The five palettes: flannel ground, flannel line, level 1, level 2, reading paper. */
const LOCKED_PALETTES = {
  core: ["#303134", "#74716e", "#a09a91", "#cbc5b9", "#f4f2ec"],
  research: ["#47403b", "#947d65", "#bbaa8c", "#ded0b7", "#fcf4e6"],
  "blog-notes": ["#5d3a35", "#ad6f5e", "#d1ab92", "#e9c3aa", "#fff3e9"],
  writing: ["#68502f", "#c6a05c", "#e7c46b", "#f2dea3", "#fffae5"],
  bearnard: ["#344656", "#819daa", "#d5e0e6", "#eaf0f1", "#fafcfd"],
}
const PALETTE_ROWS = [
  "--color-backdrop",
  "--color-flannel-line",
  "--color-folder-parent",
  "--color-folder-nested",
  "--color-folder-active",
]

/** The shared colours: the same in every category, never set per category. */
const LOCKED_GLOBALS = {
  "--color-shell": "#29282c",
  "--color-text-link": "#275b52",
  "--color-accent": "#275b52",
  "--color-indicator-selected": "#26313b",
}

/** The global row, in order, with each tab's category. */
const LOCKED_TABS = [
  ["Home", "core"],
  ["About", "core"],
  ["Contact", "core"],
  ["Schedule", "core"],
  ["Portfolio", "research"],
  ["CV", "research"],
  ["Lab", "research"],
  ["Blog", "blog-notes"],
  ["Lecture Notes", "blog-notes"],
  ["Writing", "writing"],
  ["Bearnard's Area", "bearnard"],
]

// --- Sources ------------------------------------------------------------------------------

const repo = fileURLToPath(new URL("../", import.meta.url))
const read = (path) => readFile(join(repo, path), "utf8")
const tokensCss = await read("src/styles/tokens.css")
const categoriesCss = await read("src/styles/categories.css")
const environmentsCss = await read("src/styles/environments.css")
const foldersCss = stripComments(await read("src/styles/folders.css"))
const tokens = readTokens(tokensCss, categoriesCss, environmentsCss)
const json = (value) => JSON.stringify(value)

const environmentIds = ENVIRONMENTS.map((e) => e.id)
/** Every element a page can be: each category, in no environment and in each one. */
const scopes = CATEGORY_IDS.flatMap((category) =>
  [undefined, ...environmentIds].map((environment) => ({ category, environment })),
)
const where = (scope) => `${scope.category}/${scope.environment ?? "core environment"}`

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((e) =>
      e.isDirectory() ? listFiles(join(dir, e.name)) : [join(dir, e.name)],
    ),
  )
  return nested.flat()
}
const dist = join(repo, "dist")
const distFiles = (await listFiles(dist)).map((f) => relative(dist, f))
const src = join(repo, "src")
const srcFiles = (await listFiles(src)).map((f) => relative(repo, f))

const pages = []
for (const path of siteNavigation.pagePaths()) {
  const html = await readFile(join(dist, `${path.slice(1)}index.html`), "utf8")
  const resolution = siteNavigation.resolve(path)
  if (!resolution.found) throw new Error(`${path} is a page path that does not resolve`)
  pages.push({ path, html, tree: parse(html), state: resolution.state })
}

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
  "CAT-001",
  "The global row has exactly the eleven approved tabs",
  (check) => {
    const labels = siteNavigation.sections.map((s) => s.label)
    check(
      labels.length === 11,
      `the registry has ${labels.length} sections, expected 11`,
    )
    check(
      json(labels) === json(LOCKED_TABS.map(([label]) => label)),
      `the sections are ${json(labels)}`,
    )
    for (const node of siteNavigation.nodes.values()) {
      check(
        !/external/i.test(`${node.id} ${node.label} ${node.path}`),
        `${node.id} remains`,
      )
    }
    check(!siteNavigation.resolve("/external/").found, "/external/ still resolves")
    check(
      !distFiles.some((f) => f.startsWith("external/")),
      "dist/ still has a page under /external/",
    )
    for (const { path, tree } of pages) {
      const row = tabsOf(layersOf(tree).layers[0]).map(labelOf)
      check(
        json(row) === json(LOCKED_TABS.map(([label]) => label)),
        `${path} shows the global row ${json(row)}`,
      )
    }
  },
)

await test("CAT-002", "Every section has its approved category", (check) => {
  check(
    json(CATEGORY_IDS) === json(Object.keys(LOCKED_PALETTES)),
    `the categories are ${json(CATEGORY_IDS)}`,
  )
  check(
    json(siteNavigation.sections.map((s) => [s.label, s.category])) ===
      json(LOCKED_TABS),
    "the registry's categories differ from the approved assignment",
  )
  // The contract's lists, which the specimen and the records use, say the same.
  for (const { id, sections } of CATEGORIES) {
    const expected = LOCKED_TABS.filter(([, c]) => c === id).map(([label]) => label)
    check(
      json([...sections].sort()) === json([...expected].sort()),
      `the contract lists ${json(sections)} under ${id}`,
    )
  }
  // A folder always has its section's category, and so does the page that opens it.
  for (const node of siteNavigation.nodes.values()) {
    const section = siteNavigation.lineage(node.id)[0]
    check(
      node.category === section.category,
      `${node.id} is ${node.category}, but its section is ${section.category}`,
    )
    const resolution = siteNavigation.resolve(node.path)
    check(
      resolution.found && resolution.state.category === section.category,
      `${node.path} resolves to the category ${resolution.state?.category}`,
    )
  }
})

await test("CAT-003", "The five palettes are the locked colours", (check) => {
  for (const scope of scopes) {
    PALETTE_ROWS.forEach((name, row) => {
      const hex = tokens.color(name, scope).hex
      const locked = LOCKED_PALETTES[scope.category][row]
      check(hex === locked, `${where(scope)}: ${name} is ${hex}, locked as ${locked}`)
    })
  }
  check(
    json(CATEGORY_TOKENS) === json(PALETTE_ROWS),
    "the category contract is not the palette's five rows",
  )
  // The bare root, with no attribute at all, is Core.
  PALETTE_ROWS.forEach((name, row) => {
    check(
      tokens.color(name).hex === LOCKED_PALETTES.core[row],
      `the default ${name} is not Core's`,
    )
  })
})

await test("CAT-004", "The shell, links, accent and V never change", (check) => {
  for (const scope of [undefined, ...scopes]) {
    for (const [name, locked] of Object.entries(LOCKED_GLOBALS)) {
      const hex = tokens.color(name, scope).hex
      check(
        hex === locked,
        `${scope ? where(scope) : "root"}: ${name} is ${hex}, locked as ${locked}`,
      )
    }
  }
  for (const name of Object.keys(LOCKED_GLOBALS)) {
    check(tokens.root.has(name), `${name} is not a global token on :root`)
    for (const [id, block] of [...tokens.categories, ...tokens.environments]) {
      check(!block.has(name), `${id} sets ${name}`)
    }
  }
})

await test(
  "CAT-005",
  "A selected tab and its folder body are one material, level by level",
  (check) => {
    for (const scope of scopes) {
      const [, , level1, level2, paper] = LOCKED_PALETTES[scope.category]
      for (const [name, locked] of [
        ["--color-folder-tab-active", level1],
        ["--color-folder-parent", level1],
        ["--color-folder-nested", level2],
        ["--color-folder-deep", paper],
        ["--color-folder-active", paper],
      ]) {
        const hex = tokens.color(name, scope).hex
        check(hex === locked, `${where(scope)}: ${name} is ${hex}, expected ${locked}`)
      }
    }
    // The stylesheet draws each level's selected tab and body from one custom property.
    const rule = (selector) =>
      parseRules(foldersCss).find(
        (r) => r.selectors.length === 1 && r.selectors[0] === selector,
      )?.declarations
    for (const [selector, token] of [
      [".gl-folder", "--color-folder-parent"],
      ['.gl-folder[data-level="2"]', "--color-folder-nested"],
      ['.gl-folder[data-level="3"]', "--color-folder-deep"],
      [".gl-folder-tab[data-category]", "--color-folder-parent"],
    ]) {
      check(
        rule(selector)?.get("--_material") === `var(${token})`,
        `${selector} does not take its material from ${token}`,
      )
    }
    check(
      /\.gl-folder-tab\[data-selected\]\s*\{[^}]*--_fill:\s*var\(--_material\)/.test(
        foldersCss,
      ),
      "a selected tab is not filled with its level's material",
    )
    check(
      /\.gl-folder__body\s*\{[^}]*background-color:\s*var\(--_material\)/.test(
        foldersCss,
      ),
      "a folder body is not filled with its level's material",
    )
    check(
      /\.gl-folder__paper\s*\{[^}]*background-color:\s*var\(--color-folder-active\)/.test(
        foldersCss,
      ),
      "the page is not on the category's reading paper",
    )
  },
)

await test(
  "CAT-006",
  "Inactive and hovered top-level tabs are their own cardstock, evenly dimmed",
  (check) => {
    const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
    const shell = tokens.color("--color-shell").rgba
    for (const [state, amount] of [
      ["--color-folder-tab-inactive", "--folder-tab-inactive-mix"],
      ["--color-folder-tab-hover", "--folder-tab-hover-mix"],
    ]) {
      // The dimming is one global amount, not a per-category choice.
      check(tokens.root.has(amount), `${amount} is not a global token`)
      const share = Number.parseFloat(tokens.resolve(amount).text) / 100
      check(share > 0.5 && share < 1, `${amount} is ${tokens.resolve(amount).text}`)
      const seen = new Map()
      for (const category of CATEGORY_IDS) {
        const colour = tokens.color(state, category)
        const own = tokens.color("--color-folder-parent", category)
        check(colour.opaque, `${category}: ${state} is translucent`)
        check(colour.hex !== own.hex, `${category}: ${state} is the selected colour`)
        // Its own cardstock, sunk towards the shell by that amount, and nothing else:
        // no other category's colour and no environment takes part.
        const expected = own.rgba
          .slice(0, 3)
          .map((c, i) => c * share + shell[i] * (1 - share))
        check(
          distance(colour.rgba, expected) < 1.5,
          `${category}: ${state} (${colour.hex}) is not its cardstock dimmed by ${amount}`,
        )
        // Mostly its own colour, and told apart from every other tab in the same state.
        check(
          distance(colour.rgba, own.rgba) < distance(colour.rgba, shell),
          `${category}: ${state} (${colour.hex}) is nearer to the shell than to its cardstock`,
        )
        for (const [other, theirs] of seen) {
          check(
            distance(colour.rgba, theirs) >= 12,
            `${category} and ${other} are hard to tell apart as ${state}`,
          )
        }
        seen.set(category, colour.rgba)
      }
    }
  },
)

await test("CAT-007", "No environment can recolour anything", (check) => {
  check(
    !/--color-|--palette-/.test(stripComments(environmentsCss)),
    "environments.css mentions a colour token",
  )
  check(
    !ENVIRONMENT_TOKENS.some((name) => /colou?r|palette/.test(name)),
    "the environment contract has a colour token",
  )
  const colourTokens = [...tokens.names()].filter((name) => name.startsWith("--color-"))
  for (const category of CATEGORY_IDS) {
    for (const environment of environmentIds) {
      for (const name of colourTokens) {
        const plain = tokens.resolve(name, { category }).text
        const inside = tokens.resolve(name, { category, environment }).text
        check(
          plain === inside,
          `${name} is ${plain} in ${category} but ${inside} inside ${environment}`,
        )
      }
    }
  }
})

await test(
  "CAT-008",
  "Every built page gives each top-level tab its own category",
  (check) => {
    for (const { path, tree, state } of pages) {
      const html = elements(tree).find((el) => el.tag === "html")
      check(
        html?.attrs["data-category"] === state.category,
        `${path}: <html> has the category ${html?.attrs["data-category"]}, expected ${state.category}`,
      )
      const { stack, layers } = layersOf(tree)
      check(
        stack.attrs["data-category"] === state.category,
        `${path}: the folders have the category ${stack.attrs["data-category"]}`,
      )
      const row = tabsOf(layers[0]).map((tab) => [
        labelOf(tab),
        tab.attrs["data-category"],
      ])
      check(json(row) === json(LOCKED_TABS), `${path}: the global row is ${json(row)}`)
      // The selected tab's category is the page's: one colour for tab and body.
      const selected = tabsOf(layers[0]).filter((tab) => "data-selected" in tab.attrs)
      check(
        selected.length === 1 && selected[0].attrs["data-category"] === state.category,
        `${path}: the selected tab is not of the page's category`,
      )
      // Only the top-level tabs choose a category; everything inside inherits one.
      const carriers = elements(stack).filter((el) => "data-category" in el.attrs)
      const allowed = new Set([stack, ...tabsOf(layers[0])])
      check(
        carriers.every((el) => allowed.has(el)),
        `${path}: an element below the global row sets a category`,
      )
      // A preview sits inside its tab, so it takes that tab's category.
      for (const preview of elements(stack).filter(hasClass("gl-folder-preview"))) {
        let tab = preview.parent
        while (tab && !hasClass("gl-folder-tab")(tab)) tab = tab.parent
        check(
          tab !== null && tab !== undefined,
          `${path}: a preview is outside its tab`,
        )
      }
    }
  },
)

await test("CAT-009", "The palettes have one source of truth", (check) => {
  // The category tokens are declared in categories.css and nowhere else.
  for (const [file, css] of [
    ["tokens.css", tokensCss],
    ["environments.css", environmentsCss],
  ]) {
    for (const { declarations } of parseRules(css)) {
      for (const name of CATEGORY_TOKENS) {
        check(!declarations.has(name), `${file} declares the category token ${name}`)
      }
    }
  }
  // No locked palette colour is written anywhere else in src/, and the shared ones only
  // in tokens.css.
  const palette = Object.values(LOCKED_PALETTES).flat()
  const shared = [...new Set(Object.values(LOCKED_GLOBALS))]
  return Promise.all(
    srcFiles
      .filter((file) => /\.(css|astro|ts|mjs|js|json|md|html)$/.test(file))
      .map(async (file) => {
        const text = (await read(file)).toLowerCase()
        if (file !== "src/styles/categories.css") {
          for (const hex of palette) {
            check(!text.includes(hex), `${file} repeats the palette colour ${hex}`)
          }
        }
        if (file !== "src/styles/tokens.css") {
          for (const hex of shared) {
            check(!text.includes(hex), `${file} repeats the shared colour ${hex}`)
          }
        }
      }),
  )
})

await test("CAT-010", "The superseded palette candidates are gone", async (check) => {
  for (const file of srcFiles) {
    check(!/environment-candidates|environments-v2/.test(file), `${file} remains`)
  }
  for (const file of distFiles.filter((f) => /\.(html|css)$/.test(f))) {
    const text = await readFile(join(dist, file), "utf8")
    check(!/proposed-/.test(text), `dist/${file} contains candidate styling`)
  }
  check(
    !distFiles.some((f) => f.startsWith("_design/environments-v2/")),
    "the candidates' study is still built",
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
  `PASS: ${results.length} archive checks; ${CATEGORY_IDS.length} categories, ` +
    `${LOCKED_TABS.length} tabs, ${pages.length} pages`,
)
