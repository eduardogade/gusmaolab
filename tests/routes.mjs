// Route and page tests (P06): NAV-022, NAV-023 and NAV-026 to NAV-032. They read the built
// site in dist/, so run `npm run build` first, or `npm run verify`.
//
// NAV-015 to NAV-021 and NAV-025 test the navigation model in tests/navigation.mjs.
// NAV-024 (link navigation with Back and Forward) needs a real browser; its result is
// recorded in development/acceptance-matrix.md. These tests prove structure and links;
// they cannot prove that the folders still look joined, which the browser review checks.
import { readdir, readFile } from "node:fs/promises"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { studyPaths } from "../src/design/editorial-fixture.ts"
import { ROUTE_PARAMS, overviewTabId, siteNavigation } from "../src/navigation/index.ts"
import {
  childrenOf,
  classes,
  elements,
  hasClass,
  labelElementOf,
  labelOf,
  layersOf,
  parse,
  selectedOf,
  tabsOf,
  textOf,
} from "./html-tree.mjs"

const repo = new URL("../", import.meta.url)
const dist = fileURLToPath(new URL("dist/", repo))
const STUDIES = [
  "/_design/tokens/",
  "/_design/folders/",
  "/_design/bearnard/",
  "/_design/records/",
  ...studyPaths(),
]
// Studies that show folders, and so carry the folders' one script. The editorial study
// (P12) draws every page inside its collection's folders.
const STUDIES_WITH_FOLDERS = ["/_design/folders/", ...studyPaths()]
const fileOf = (path) => join(dist, `${path.slice(1)}index.html`)

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name)
      return entry.isDirectory() ? listFiles(path) : [path]
    }),
  )
  return nested.flat()
}

let files
try {
  files = (await listFiles(dist)).map((path) => relative(dist, path)).sort()
} catch {
  console.error("FAIL: dist/ not found. Run `npm run build` first.")
  process.exit(1)
}
const builtPaths = files
  .filter((file) => file.endsWith(".html"))
  .map((file) => `/${file.replace(/(^|\/)index\.html$/, "$1")}`)

// Every registered destination's built page, parsed once, with the state it should show.
const pages = new Map()
for (const path of siteNavigation.pagePaths()) {
  const html = await readFile(fileOf(path), "utf8").catch(() => "")
  pages.set(path, {
    html,
    tree: parse(html),
    state: siteNavigation.resolve(path).state,
  })
}
const studyHtml = new Map()
for (const path of STUDIES) {
  studyHtml.set(path, await readFile(fileOf(path), "utf8").catch(() => ""))
}
const study = parse(studyHtml.get("/_design/folders/"))

// Source files, to prove what the site does not contain.
const srcDir = fileURLToPath(new URL("src/", repo))
const sourceFiles = (await listFiles(srcDir)).map((path) => relative(srcDir, path))
const sources = await Promise.all(
  sourceFiles.map(async (file) => [file, await readFile(join(srcDir, file), "utf8")]),
)
const routeFiles = sourceFiles
  .filter((file) => file.startsWith("pages/"))
  .map((file) => file.slice("pages/".length))
  .sort()

// The stylesheets a page links.
const cssCache = new Map()
async function cssOf(html) {
  const hrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\/([^"]+)"/g)]
  const parts = []
  for (const [, href] of hrefs) {
    if (!cssCache.has(href)) {
      cssCache.set(href, await readFile(join(dist, href), "utf8").catch(() => ""))
    }
    parts.push(cssCache.get(href))
  }
  return parts.join("\n")
}
const pageCss = new Map()
for (const [path, { html }] of pages) pageCss.set(path, await cssOf(html))

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
const json = (value) => JSON.stringify(value)
const tabIdOf = (tab) => tab.attrs["data-tab-id"]
const linksIn = (tree) =>
  elements(tree).filter((el) => el.tag === "a" && hasClass("gl-folder-tab__label")(el))

// --- Tests --------------------------------------------------------------------------------

test("NAV-022", "Parent tabs open their own overview page", (check) => {
  for (const [path, { tree }] of pages) {
    for (const link of linksIn(tree)) {
      const id = tabIdOf(link.parent)
      const href = link.attrs.href
      const target = pages.get(href)
      check(target?.html, `${path}: ${id} links to ${href}, which has no page`)
      if (!target?.html) continue
      // The page a tab opens is its own: a parent's tab and its Overview both open the
      // parent's page, where the Overview is selected.
      const expected = id.startsWith("overview:")
        ? id
        : siteNavigation.node(id).children.length > 0
          ? overviewTabId(id)
          : id
      check(
        target.state.currentTabId === expected,
        `${path}: ${id} opens ${href}, whose own tab is ${target.state.currentTabId}`,
      )
    }
  }
  const hrefIn = (path, id) =>
    linksIn(pages.get(path).tree).find((link) => tabIdOf(link.parent) === id)?.attrs
      .href
  check(
    hrefIn("/cv/research/", "cv") === "/cv/",
    "from Research, CV does not open /cv/",
  )
  check(
    hrefIn("/cv/research/", "overview:cv") === "/cv/",
    "from Research, Overview does not open /cv/",
  )
  check(hrefIn("/cv/", "cv-research") === "/cv/research/", "CV's Research tab is wrong")
  check(
    hrefIn("/lab/people/", "lab") === "/lab/",
    "from People, Lab does not open /lab/",
  )
})

test("NAV-023", "Each page's own URL rebuilds its folders", (check) => {
  for (const [path, { html, tree, state }] of pages) {
    if (!html) {
      check(false, `${path} has no built page`)
      continue
    }
    const marker = elements(tree).find((el) => "data-page-path" in el.attrs)
    check(marker?.attrs["data-page-path"] === path, `${path} is marked as another page`)
    const { stack, layers } = layersOf(tree)
    check(
      stack.attrs["data-folder-depth"] === String(state.rows.length) &&
        layers.length === state.rows.length,
      `${path} draws ${layers.length} levels, the registry resolves ${state.rows.length}`,
    )
    state.rows.forEach((row, i) => {
      const layer = layers[i]
      if (layer === undefined) return
      const where = `${path} level ${i + 1}`
      check(layer.attrs["data-level"] === String(row.level), `${where} is mislabelled`)
      const drawn = tabsOf(layer).map(tabIdOf)
      check(
        json(drawn) === json(row.tabs.map((tab) => tab.id)),
        `${where} draws ${json(drawn)}`,
      )
      const selected = selectedOf(layer).map(tabIdOf)
      check(
        json(selected) === json([row.selectedId]),
        `${where} selects ${json(selected)}`,
      )
      if (i > 0) {
        const body = childrenOf(layers[i - 1], hasClass("gl-folder__body"))[0]
        check(layer.parent === body, `${where} is not inside level ${i}'s body`)
      }
    })
    const deepest = childrenOf(layers.at(-1), hasClass("gl-folder__body"))[0]
    const paper = deepest && childrenOf(deepest, hasClass("gl-folder__paper"))[0]
    const main = paper && childrenOf(paper, (el) => el.tag === "main")[0]
    check(
      main !== undefined,
      `${path}: the content is not on the deepest folder's paper`,
    )
    const headings = main ? elements(main).filter((el) => el.tag === "h1") : []
    check(
      headings.length === 1 && textOf(headings[0]).trim() === state.folder.label,
      `${path}: the page's heading is not "${state.folder.label}"`,
    )
  }
})

test("NAV-026", "Unknown paths have no page", (check) => {
  const allowed = new Set([...siteNavigation.pagePaths(), ...STUDIES])
  for (const path of builtPaths)
    check(allowed.has(path), `dist/ has an unregistered ${path}`)
  for (const path of [
    "/cv/overview/",
    "/overview/",
    "/cv/this-page-does-not-exist/",
    "/CV/",
    "/cv/research/projects/",
    "/cv/research/synthetic-projects/",
    "/lecture-notes/berries/synthetic-article/",
    "/_design/",
  ]) {
    check(!builtPaths.includes(path), `${path} was built`)
    check(!siteNavigation.resolve(path).found, `${path} resolves as a page`)
  }
  // No catch-all: no rest-parameter route can turn an unknown path into a page.
  check(
    !routeFiles.some((file) => file.includes("[...")),
    "a rest-parameter route exists",
  )
})

test("NAV-027", "Every page has its section's category and environment", (check) => {
  // P09-A01 (D-076): the category is the colour, the environment is the typography and
  // texture. [category, environment] of each page.
  const expected = {
    "/": ["core", "core"],
    "/about/": ["core", "core"],
    "/blog/": ["blog-notes", "core"],
    "/portfolio/": ["research", "scientific"],
    "/contact/": ["core", "core"],
    "/schedule/": ["core", "core"],
    "/cv/": ["research", "scientific"],
    "/cv/research/": ["research", "scientific"],
    "/lab/": ["research", "scientific"],
    "/lab/research-areas/": ["research", "scientific"],
    "/lecture-notes/": ["blog-notes", "technical"],
    "/lecture-notes/greenhouse/": ["blog-notes", "technical"],
    "/writing/": ["writing", "literary"],
    "/writing/kosmos/": ["writing", "literary"],
    "/bearnards-area/": ["bearnard", "personal"],
    "/bearnards-area/powerlifting/": ["bearnard", "personal"],
  }
  for (const [path, [category, environment]] of Object.entries(expected)) {
    check(pages.get(path)?.state.category === category, `${path} is not ${category}`)
    check(
      pages.get(path)?.state.environment === environment,
      `${path} is not ${environment}`,
    )
  }
  check(!pages.has("/external/"), "/external/ is still a page")
  const sectionCategories = json(siteNavigation.sections.map((node) => node.category))
  for (const [path, { tree, state }] of pages) {
    const all = elements(tree)
    const root = all.find((el) => el.tag === "html")
    const attribute = root?.attrs["data-environment"]
    check(
      state.environment === "core"
        ? attribute === undefined
        : attribute === state.environment,
      `${path} has data-environment=${attribute}, expected ${state.environment}`,
    )
    check(
      root?.attrs["data-category"] === state.category,
      `${path} has data-category=${root?.attrs["data-category"]}, expected ${state.category}`,
    )
    // Children inherit; the folders never choose an environment themselves.
    const parent = state.selection.at(-2)
    if (parent) {
      check(state.environment === parent.environment, `${path} differs from its parent`)
      check(
        state.category === siteNavigation.resolve(parent.path).state.category,
        `${path} has another category than its parent`,
      )
    }
    const scoped = all.filter(
      (el) => el.tag !== "html" && "data-environment" in el.attrs,
    )
    check(scoped.length === 0, `${path} sets an environment inside the page`)
    // Inside the page, only the folders and their top-level tabs name a category: the
    // open folder its page's, each top-level tab its own section's, whatever is open.
    const stack = all.find(hasClass("gl-folders"))
    check(
      stack?.attrs["data-category"] === state.category,
      `${path}: the folders have the category ${stack?.attrs["data-category"]}`,
    )
    const { layers } = layersOf(tree)
    const row = tabsOf(layers[0])
    check(
      json(row.map((tab) => tab.attrs["data-category"])) === sectionCategories,
      `${path}: the global row does not keep every section's own category`,
    )
    const named = all.filter((el) => el.tag !== "html" && "data-category" in el.attrs)
    check(
      named.length === row.length + 1,
      `${path}: ${named.length} elements name a category, expected the folders and ${row.length} tabs`,
    )
  }
})

test("NAV-028", "One current page, labelled rows, content in main", (check) => {
  for (const [path, { tree, state }] of pages) {
    const all = elements(tree)
    const current = all.filter((el) => el.attrs["aria-current"] === "page")
    check(current.length === 1, `${path} has ${current.length} aria-current="page"`)
    check(
      current[0]?.tag === "a" && tabIdOf(current[0].parent) === state.currentTabId,
      `${path}: aria-current="page" is not on ${state.currentTabId}`,
    )
    const { layers } = layersOf(tree)
    for (const layer of layers) {
      for (const tab of tabsOf(layer)) {
        const id = tabIdOf(tab)
        const link = labelElementOf(tab)
        const selected = "data-selected" in tab.attrs
        const want = id === state.currentTabId ? "page" : selected ? "true" : undefined
        check(
          link?.attrs["aria-current"] === want,
          `${path}: ${id} has aria-current=${link?.attrs["aria-current"]}, expected ${want}`,
        )
        check(
          link?.tag === "a" && /^\//.test(link.attrs.href ?? ""),
          `${path}: ${id} is not a link`,
        )
        check(labelOf(tab).length > 0, `${path}: ${id} has no visible label`)
        const marks = elements(tab).filter(hasClass("gl-folder-tab__indicator"))
        check(
          marks.length === (selected ? 1 : 0),
          `${path}: ${id} has ${marks.length} V marks`,
        )
        check(
          marks.every((mark) => mark.attrs["aria-hidden"] === "true"),
          `${path}: the V on ${id} is announced`,
        )
        if (id.startsWith("overview:")) {
          const parent = siteNavigation.node(id.slice("overview:".length))
          check(labelOf(tab) === "Overview", `${path}: ${id} does not read Overview`)
          check(
            textOf(link).trim() === `Overview of ${parent.label}`,
            `${path}: ${id} is not announced as "Overview of ${parent.label}"`,
          )
        }
      }
    }
    // Each row is a navigation landmark named after its folder, and <main> follows them.
    const navs = all.filter((el) => el.tag === "nav")
    const names = navs.map((nav) => nav.attrs["aria-label"])
    const expected = state.rows.map((row) =>
      row.parent === null ? "Sections" : `${row.parent.label} folders`,
    )
    check(json(names) === json(expected), `${path} names its rows ${json(names)}`)
    check(
      navs.every((nav) => classes(nav).includes("gl-folder__strip")),
      `${path} has a landmark outside the folders`,
    )
    const mains = all.filter((el) => el.tag === "main")
    check(mains.length === 1, `${path} has ${mains.length} <main> elements`)
    const lastNav = Math.max(...navs.map((nav) => all.indexOf(nav)))
    check(all.indexOf(mains[0]) > lastNav, `${path}: <main> comes before a row of tabs`)
    check(
      !/role="(tab|tablist|tabpanel)"/.test(pages.get(path).html),
      `${path} uses ARIA tab roles`,
    )
  }
})

test("NAV-029", "Case F shows Overview selected", (check) => {
  const caseF = elements(study).find((el) => el.attrs["data-study-case"] === "f")
  for (const [where, container] of [
    ["case F", caseF],
    ["/cv/", pages.get("/cv/").tree],
  ]) {
    const { layers } = layersOf(container)
    check(layers.length === 2, `${where} draws ${layers.length} levels`)
    const tabs = tabsOf(layers[1])
    const [first] = tabs
    check(
      tabIdOf(first) === "overview:cv",
      `${where}: CV's row does not start with Overview`,
    )
    check(
      labelOf(first) === "Overview",
      `${where}: the first tab does not read Overview`,
    )
    check("data-selected" in first.attrs, `${where}: Overview is not selected`)
    check(
      elements(first).some(hasClass("gl-folder-tab__indicator")),
      `${where}: Overview has no V`,
    )
    check(
      selectedOf(layers[1]).length === 1,
      `${where}: CV's row has more than one selection`,
    )
    check(
      json(tabs.slice(1).map(labelOf)) ===
        json(siteNavigation.node("cv").children.map((node) => node.label)),
      `${where}: CV's folders follow Overview out of order`,
    )
  }
  check(
    !/nothing selected/i.test(textOf(caseF)),
    "case F still describes an unselected row",
  )
})

test("NAV-030", "Folder pages keep the approved folder construction", (check) => {
  // The skeleton of a stack: its folders, rows, bodies and paper, ignoring tab counts.
  const skeleton = [
    "gl-folder",
    "gl-folder__strip",
    "gl-folder__tabs",
    "gl-folder__body",
    "gl-folder__paper",
  ]
  const shapeOf = (container) =>
    elements(layersOf(container).stack)
      .map((el) => {
        const name = classes(el).find((c) => skeleton.includes(c))
        return (
          name &&
          `${name}${el.attrs["data-level"] ? `[${el.attrs["data-level"]}]` : ""}`
        )
      })
      .filter(Boolean)
      .join(" ")
  const caseOf = (id) =>
    elements(study).find((el) => el.attrs["data-study-case"] === id)
  for (const [path, id] of [
    ["/", "a"],
    ["/cv/research/", "b"],
    ["/cv/", "f"],
    ["/lab/research-areas/", "e-research"],
    ["/writing/kosmos/", "e-writing"],
  ]) {
    check(
      shapeOf(pages.get(path).tree) === shapeOf(caseOf(id)),
      `${path} is built unlike case ${id}`,
    )
  }
  for (const [path, { tree }] of pages) {
    for (const tab of elements(tree).filter(hasClass("gl-folder-tab"))) {
      const parts = childrenOf(tab, () => true).map((el) =>
        classes(el).find(
          (c) => c.startsWith("gl-folder-tab__") || c === "gl-folder-preview",
        ),
      )
      const want = ["gl-folder-tab__shape", "gl-folder-tab__label"]
      // P07: an unopened folder with children also holds its preview, after its link.
      if ("data-preview" in tab.attrs) want.push("gl-folder-preview")
      if ("data-selected" in tab.attrs) want.push("gl-folder-tab__indicator")
      check(
        json(parts) === json(want),
        `${path}: ${tabIdOf(tab)} is built as ${json(parts)}`,
      )
    }
    const css = pageCss.get(path)
    for (const rule of [
      "margin-block-end:calc(-1 * var(--folder-seam))",
      ".gl-folder-tab[data-selected]:after",
      ".gl-folder__body",
      "--color-folder-tab-inactive-deep",
    ]) {
      check(css.includes(rule), `${path}'s stylesheets lack ${rule}`)
    }
  }
})

// P06 shipped no JavaScript at all. P07 adds one small module, the folder previews
// (D-060): navigation itself still needs none. Every tab is a plain link, and the only
// script on a page is that module, inlined once by Astro from FolderStack.
test("NAV-031", "Plain links; navigation needs no JavaScript", (check) => {
  check(!files.some((file) => /\.(m?js|cjs)$/.test(file)), "dist/ ships a script file")
  for (const path of builtPaths) {
    const html = pages.get(path)?.html ?? studyHtml.get(path) ?? ""
    check(html !== "", `${path} could not be read`)
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    // The P03 specimen has no folders, so no script; every page with folders has one.
    const expected =
      path.startsWith("/_design/") && !STUDIES_WITH_FOLDERS.includes(path) ? 0 : 1
    check(
      scripts.length === expected,
      `${path} has ${scripts.length} <script> elements`,
    )
    check(
      scripts.every(
        ([, attrs, body]) =>
          attrs.trim() === 'type="module"' && /showPopover/.test(body),
      ),
      `${path} has a script other than the folder previews`,
    )
    check(!/\son[a-z]+=/i.test(html), `${path} has an inline event handler`)
  }
  for (const [file, text] of sources) {
    const allowed = file === "components/folders/FolderStack.astro"
    check(
      allowed || !/<script\b/i.test(text),
      `src/${file} contains a <script> element`,
    )
    check(
      !/\b(history\.(push|replace)State|location\.(assign|replace|href\s*=)|navigation\.navigate)\b/.test(
        text,
      ),
      `src/${file} changes the URL from a script`,
    )
    check(
      !/astro:transitions|ClientRouter|ViewTransitions|\bclient:(load|idle|visible|media|only)\b/.test(
        text,
      ),
      `src/${file} uses client-side navigation or hydration`,
    )
  }
  for (const [path, { tree }] of pages) {
    for (const link of linksIn(tree)) {
      check(
        /^\/([a-z0-9-]+\/)*$/.test(link.attrs.href),
        `${path}: link ${link.attrs.href}`,
      )
    }
  }
})

test("NAV-032", "Every approved route is a static page", (check) => {
  for (const path of siteNavigation.pagePaths()) {
    check(
      builtPaths.filter((p) => p === path).length === 1,
      `${path} is not built exactly once`,
    )
  }
  check(
    builtPaths.length === siteNavigation.pagePaths().length + STUDIES.length,
    `dist/ has ${builtPaths.length} pages`,
  )
  const byLevel = [1, 2, 3].map((level) => siteNavigation.folderStaticPaths(level))
  check(
    json(byLevel.map((list) => list.length)) === json([10, 25, 0]),
    "unexpected route counts",
  )
  check(
    byLevel.flat().length + 1 === siteNavigation.nodes.size,
    "a folder has no route",
  )
  byLevel.forEach((list, i) => {
    for (const { params } of list) {
      const path = `/${ROUTE_PARAMS.slice(0, i + 1)
        .map((name) => params[name])
        .join("/")}/`
      const result = siteNavigation.resolve(path)
      check(
        result.found && result.state.folder.level === i + 1,
        `${json(params)} is not a level-${i + 1} folder`,
      )
    }
  })
  check(
    json(routeFiles) ===
      json([
        "[design]/bearnard.astro",
        "[design]/editorial/[collection]/[entry].astro",
        "[design]/editorial/[collection]/index.astro",
        "[design]/editorial/index.astro",
        "[design]/folders.astro",
        "[design]/quarto/index.astro",
        "[design]/quarto/markdown.astro",
        "[design]/records.astro",
        "[design]/tokens.astro",
        "[section]/[folder]/[subfolder]/index.astro",
        "[section]/[folder]/index.astro",
        "[section]/index.astro",
        // P13-A01: the demonstrations' figures; it has static paths only in dev and demo mode.
        "demo-assets/[name]/[file].svg.ts",
        "index.astro",
      ]),
    `unexpected route files: ${json(routeFiles)}`,
  )
  for (const path of STUDIES) check(builtPaths.includes(path), `${path} is not built`)
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
    if (failures.length > 12) console.error(`  … and ${failures.length - 12} more`)
  }
}
if (failed > 0) process.exit(1)
console.log(`PASS: ${results.length} route tests; ${pages.size} folder pages`)
