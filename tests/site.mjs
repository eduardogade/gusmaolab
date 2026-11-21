// Site-wide navigation coverage and content states (P17, D-122 to D-125): SITE-001 to SITE-011,
// SITE-013 to SITE-034, SITE-039 to SITE-044 (the registry, the built pages, the states and what P17
// must not have changed). Run `npm run build` first: they read dist/, the release build. The browser
// half (SITE-010, SITE-012, SITE-035 to SITE-038, layout, keyboard) is tests/site-browser.mjs, which reads
// the demonstration build.
//
// What they show: every registered folder has a page that says what it is for and what state it is in,
// the states are derived from real data and cannot be invented, no link in the build points nowhere,
// and P17 left the protected systems alone. What they do not show: that the pages look right (the
// browser test and the owner's review), or that the copy is the words the owner would choose.
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { checkLinks } from "../scripts/links.mjs"
import { publicBuildIssues } from "../scripts/demo-check.mjs"
import { COLLECTIONS } from "../src/editorial/collections.ts"
import { contentRoutes, routableRecords } from "../src/editorial/model.ts"
import { CLOCK_LOCATIONS } from "../src/home/clocks.ts"
import { ILLUSTRATIONS, ILLUSTRATION_ROLES } from "../src/illustrations/bearnard.ts"
import { CATEGORY_IDS, isCanonicalPath, siteNavigation } from "../src/navigation/index.ts"
import { SYNTHETIC_PERSON, SYNTHETIC_RECORDS } from "../src/design/records-fixture.ts"
import { PRODUCTION_RECORDS } from "../src/data/records/index.ts"
import { CV_SNAPSHOT } from "../src/data/cv/snapshot.ts"
import { createRecords, validateRecords } from "../src/records/index.ts"
import { DESTINATIONS } from "../src/site/destinations.ts"
import { coverage, destinationIssues, summarize } from "../src/site/coverage.ts"
import { pageFacts, recordViews, recordCounts, siteRecordViews } from "../src/site/facts.ts"
import { PAGE_STATES, STATE_HEADINGS } from "../src/site/state.ts"
import { DEV_PAGES, SITE_MAP } from "../src/design/site-map.ts"
import { elements, labelOf, layersOf, parse, selectedOf, tabsOf, textOf } from "./html-tree.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const dist = join(repo, "dist")
const BASE = "e37e5ef" // the head P17 began from
const json = (value) => JSON.stringify(value)
const read = (path) => readFile(join(repo, path), "utf8")
const results = []
async function test(id, title, body) {
  const failures = []
  try {
    await body((ok, message) => ok || failures.push(message))
  } catch (error) {
    failures.push(error.stack ?? error.message)
  }
  results.push({ id, title, failures })
}

if (!existsSync(join(dist, "index.html"))) {
  console.error("FAIL: dist/index.html is missing. Run `npm run build` first.")
  process.exit(1)
}

// --- The built pages, parsed once ------------------------------------------------------------------
const nodes = [...siteNavigation.nodes.values()]
const pages = new Map()
for (const node of nodes) {
  const file = join(dist, node.path.slice(1), "index.html")
  const html = existsSync(file) ? await readFile(file, "utf8") : ""
  const tree = parse(html)
  const all = elements(tree)
  const main = all.find((el) => el.tag === "main")
  pages.set(node.id, { node, html, tree, all, main, inMain: main ? elements(main) : [] })
}
const rows = coverage(siteNavigation, pageFacts({}, siteRecordViews()))
const bySource = (source) => rows.filter((row) => row.source === source)
const page = (id) => pages.get(id)

// --- Git: what P17 itself touched --------------------------------------------------------------------
const git = (...args) => spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" })
const gitAvailable = git("rev-parse", "--git-dir").status === 0 && git("cat-file", "-e", BASE).status === 0
const lines = (r) => r.stdout.split("\n").filter(Boolean)
// The owner's own working-tree edit of cv/cv.md is theirs and is never P17's.
const OWNER_FILES = [":(exclude)cv/cv.md"]
function changedSinceBase(paths) {
  if (!gitAvailable) return []
  const files = new Set()
  for (const commit of lines(git("log", "--format=%H", `${BASE}..HEAD`, "--grep=\\[P17\\]")))
    for (const f of lines(git("diff-tree", "--no-commit-id", "--name-only", "-r", commit, "--", ...paths))) files.add(f)
  // While this file is not yet committed, the working tree is P17 in progress.
  if (git("status", "--porcelain", "--", "tests/site.mjs").stdout.startsWith("??")) {
    for (const f of lines(git("diff", "HEAD", "--name-only", "--", ...paths, ...OWNER_FILES))) files.add(f)
    for (const f of lines(git("ls-files", "--others", "--exclude-standard", "--", ...paths, ...OWNER_FILES))) files.add(f)
  }
  return [...files].sort()
}

// --- Navigation -----------------------------------------------------------------------------------------

const APPROVED_SECTIONS = [
  ["home", "Home", "core"],
  ["about", "About", "core"],
  ["contact", "Contact", "core"],
  ["schedule", "Schedule", "core"],
  ["portfolio", "Portfolio", "research"],
  ["cv", "CV", "research"],
  ["lab", "Lab", "research"],
  ["blog", "Blog", "blog-notes"],
  ["lecture-notes", "Lecture Notes", "blog-notes"],
  ["writing", "Writing", "writing"],
  ["bearnards-area", "Bearnard's Area", "bearnard"],
]
// The brief's acceptance reference (P17, section 4): not a second registry, a check against one.
const APPROVED_CHILDREN = {
  cv: ["Teaching", "Research", "Publications", "Talks / Presentations", "Mentoring / Supervision", "Awards & Honors", "Service", "Outreach / Public Engagement"],
  lab: ["People", "Join Us", "Research Areas", "Facilities", "Partners", "Resources"],
  "lecture-notes": ["Bearnard's Trail", "The Greenhouse", "Berries", "Timber Logs"],
  writing: ["Months' Original", "Kosmos Series", "Book Club"],
  "bearnards-area": ["Photos", "Videos", "Powerlifting", "Bear Life"],
}

await test("SITE-001", "Exactly eleven approved top-level entries exist, in the approved order", async (check) => {
  check(siteNavigation.sections.length === 11, `${siteNavigation.sections.length} sections`)
  check(json(siteNavigation.sections.map((s) => [s.id, s.label])) === json(APPROVED_SECTIONS.map(([id, label]) => [id, label])), "the labels or the order changed")
  check(!siteNavigation.nodes.has("external"), "External is back in the registry")
})

await test("SITE-002", "The five category groups stay contiguous", async (check) => {
  const seq = siteNavigation.sections.map((s) => s.category)
  check(json(seq) === json(APPROVED_SECTIONS.map(([, , category]) => category)), `the categories are ${json(seq)}`)
  const runs = seq.filter((c, i) => i === 0 || c !== seq[i - 1])
  check(runs.length === CATEGORY_IDS.length && new Set(runs).size === runs.length, `a category returns: ${json(runs)}`)
})

await test("SITE-003", "All twenty-five approved child folders exist, in order", async (check) => {
  let total = 0
  for (const [parent, labels] of Object.entries(APPROVED_CHILDREN)) {
    const children = siteNavigation.node(parent).children.map((c) => c.label)
    check(json(children) === json(labels), `${parent}: ${json(children)}`)
    total += children.length
  }
  check(total === 25, `${total} children`)
  check(nodes.length === 36, `${nodes.length} registered folders, not 36`)
  const withKids = nodes.filter((n) => n.children.length > 0).map((n) => n.id).sort()
  check(json(withKids) === json(Object.keys(APPROVED_CHILDREN).sort()), `parents: ${json(withKids)}`)
})

await test("SITE-004", "Every registered destination has a valid, unique canonical URL", async (check) => {
  const seen = new Set()
  for (const node of nodes) {
    check(isCanonicalPath(node.path), `${node.id}: ${node.path} is not canonical`)
    check(!seen.has(node.path), `${node.path} is claimed twice`)
    seen.add(node.path)
    if (node.parentId !== null) check(node.path.startsWith(siteNavigation.node(node.parentId).path), `${node.id} is outside its parent`)
  }
})

await test("SITE-005", "Every registered destination has a generated page", async (check) => {
  for (const node of nodes) check(page(node.id).html.length > 0, `${node.path} has no built page`)
  const built = (await readdir(join(dist, "cv"), { withFileTypes: true })).filter((e) => e.isDirectory()).length
  check(built === 8, `dist/cv has ${built} folders`)
})

await test("SITE-006", "No two destinations claim the same route", async (check) => {
  const paths = [...siteNavigation.pagePaths()]
  check(new Set(paths).size === paths.length, "pagePaths() repeats a path")
  const folders = nodes.map((n) => n.path)
  check(new Set(folders).size === folders.length, "two folders share a path")
  const gen = await readFile(join(repo, "src/site/page.ts"), "utf8")
  check(gen.includes("duplicates"), "the route audit does not look for duplicates")
})

await test("SITE-007", "Overview resolves to its parent's canonical URL and has no URL of its own", async (check) => {
  for (const node of nodes.filter((n) => n.children.length > 0)) {
    const { layers } = layersOf(page(node.id).tree)
    const row = layers.find((layer) => tabsOf(layer).some((tab) => tab.attrs["data-tab-kind"] === "overview"))
    check(row !== undefined, `${node.path} has no Overview tab`)
    if (row === undefined) continue
    const overview = tabsOf(row).find((tab) => tab.attrs["data-tab-kind"] === "overview")
    const link = elements(overview).find((el) => el.tag === "a")
    check(link?.attrs.href === node.path, `${node.id}: Overview links to ${link?.attrs.href}`)
    check(labelOf(overview) === "Overview", `${node.id}: the tab says ${labelOf(overview)}`)
  }
  check(!nodes.some((n) => /overview/i.test(n.path) || /overview/i.test(n.id)), "an Overview has a registry entry or URL")
})

await test("SITE-008", "Leaf destinations draw no empty child row", async (check) => {
  for (const node of nodes) {
    const { layers } = layersOf(page(node.id).tree)
    const state = siteNavigation.resolve(node.path).state
    const expected = node.children.length > 0 ? state.selection.length + 1 : state.selection.length
    check(layers.length === expected, `${node.path}: ${layers.length} rows, expected ${expected}`)
    for (const layer of layers) check(tabsOf(layer).length > 0, `${node.path} has an empty row`)
  }
})

await test("SITE-009", "No fourth visible folder-tab level exists", async (check) => {
  check(nodes.every((n) => n.level <= 3), "a registered folder is deeper than level 3")
  check(!nodes.some((n) => n.level === 3), "a third-level folder is registered without approval")
  for (const [, p] of pages) check(layersOf(p.tree).layers.length <= 3, `${p.node.path} has more than three rows`)
})

// --- Direct navigation ----------------------------------------------------------------------------------

await test("SITE-010", "Every registered route opens directly as a page", async (check) => {
  for (const node of nodes) {
    const p = page(node.id)
    check(p.main !== undefined && p.main.attrs.id === "content", `${node.path} has no <main id="content">`)
    const h1s = p.all.filter((el) => el.tag === "h1")
    check(h1s.length === 1, `${node.path} has ${h1s.length} h1`)
    check(p.html.includes("<!DOCTYPE html>") || p.html.toLowerCase().includes("<!doctype html>"), `${node.path} is not a full document`)
  }
})

await test("SITE-011", "The active selection is derived from the URL", async (check) => {
  for (const node of nodes) {
    const { layers } = layersOf(page(node.id).tree)
    const state = siteNavigation.resolve(node.path).state
    const selected = layers.map((layer) => selectedOf(layer).map((tab) => labelOf(tab)))
    const expected = state.rows.map((row) => state.selection.find((s) => s.id === row.selectedId)?.label ?? "Overview")
    check(selected.every((s) => s.length === 1), `${node.path}: a row has ${json(selected)} selected`)
    check(json(selected.map((s) => s[0])) === json(expected), `${node.path}: selected ${json(selected)}, expected ${json(expected)}`)
  }
})

await test("SITE-013", "Every internal link of the build resolves", async (check) => {
  const { stats, issues } = await checkLinks(dist)
  check(stats.pages >= 60 && stats.internal > 1000, `the check saw only ${json(stats)}`)
  check(issues.length === 0, `${issues.length} broken: ${json(issues.slice(0, 5))}`)
  // The check can fail: a synthetic site with a missing page, a bad fragment, a slashless page link.
  const tmp = await mkdtemp(join(tmpdir(), "gl-links-"))
  try {
    await mkdir(join(tmp, "a"), { recursive: true })
    await mkdir(join(tmp, "b"), { recursive: true })
    await writeFile(join(tmp, "index.html"), '<h1 id="top">x</h1><a href="/a/">ok</a><a href="/b/#nope">bad fragment</a><a href="/missing/">gone</a><a href="/a">slashless</a><a href="mailto:x@example.org">mail</a><a href="https://example.org/">ext</a><a href="/a/#here">frag</a>')
    await writeFile(join(tmp, "a", "index.html"), '<p id="here">a</p>')
    await writeFile(join(tmp, "b", "index.html"), "<p>b</p>")
    const result = await checkLinks(tmp)
    const bad = result.issues.map((i) => i.href).sort()
    check(json(bad) === json(["/a", "/b/#nope", "/missing/"]), `the check reported ${json(bad)}`)
    check(result.stats.external === 1 && result.stats.other === 1, `external/other counted ${json(result.stats)}`)
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
})

await test("SITE-014", "Unknown routes stay unknown instead of becoming Home", async (check) => {
  for (const path of ["/external/", "/does-not-exist/", "/cv/unknown/", "/overview/", "/cv/overview/"]) {
    check(!siteNavigation.resolve(path).found, `${path} resolves`)
    check(!existsSync(join(dist, path.slice(1), "index.html")), `${path} has a built page`)
  }
  const pageFiles = await readdir(join(repo, "src/pages"), { recursive: true })
  check(!pageFiles.some((f) => /\[\.\.\./.test(f)), "a catch-all route exists")
  check(!existsSync(join(repo, "src/pages/external")), "src/pages/external exists")
})

// --- Content states -------------------------------------------------------------------------------------

const stateOf = (id) => page(id).inMain.find((el) => el.attrs["data-page-state"] !== undefined)?.attrs["data-page-state"]

await test("SITE-015", "A ready page renders meaningful approved content", async (check) => {
  const ready = rows.filter((row) => row.state === "ready")
  check(ready.length > 0, "no page is ready")
  for (const row of ready) {
    const p = page(row.id)
    check(stateOf(row.id) === "ready", `${row.path}: the page says ${stateOf(row.id)}`)
    if (row.id === "home") {
      check(p.inMain.some((el) => el.attrs["data-home-region"] === "clocks"), "Home lost its regions")
      continue
    }
    if (row.source === "overview") {
      const items = p.inMain.filter((el) => el.attrs["data-guide-item"] !== undefined)
      check(items.length === siteNavigation.node(row.id).children.length, `${row.path}: ${items.length} guide items`)
      for (const item of items) {
        const link = elements(item).find((el) => el.tag === "a")
        check(link !== undefined && siteNavigation.resolve(link.attrs.href).found, `${row.path}: a guide link leads nowhere`)
      }
    }
  }
  // A records page is ready exactly when verified records stand behind it (the synthetic fixture proves it).
  const views = recordViews(createRecords(SYNTHETIC_RECORDS, { allowSynthetic: true }), SYNTHETIC_PERSON)
  const counts = recordCounts(views)
  check(counts.portfolio > 0 && counts["cv-publications"] > 0 && counts["lab-people"] > 0, `the fixture gives ${json(counts)}`)
  const fixtureRows = coverage(siteNavigation, pageFacts({}, views))
  check(fixtureRows.find((r) => r.id === "portfolio").state === "ready", "a Portfolio with records is not ready")
  check(fixtureRows.find((r) => r.id === "cv").state === "ready", "a CV with records is not ready")
})

await test("SITE-016", "An empty collection shows its own empty state", async (check) => {
  const collections = bySource("collection")
  check(collections.length === 8, `${collections.length} collection folders`)
  for (const row of collections) {
    const p = page(row.id)
    const empty = p.inMain.some((el) => "data-editorial-empty" in el.attrs)
    check(stateOf(row.id) === row.state, `${row.path}: the page says ${stateOf(row.id)}, the data say ${row.state}`)
    check(empty === (row.state === "empty"), `${row.path}: empty marker ${empty}, state ${row.state}`)
    check(row.state === "ready" || row.state === "empty", `${row.path}: a collection is ${row.state}`)
    const notices = p.inMain.filter((el) => "data-state-notice" in el.attrs)
    check(notices.length === 0, `${row.path}: a collection draws a generic notice besides its own`)
  }
})

await test("SITE-017", "A planned page shows a plain preparation state", async (check) => {
  const planned = bySource("planned")
  check(planned.length >= 8, `${planned.length} planned pages`)
  for (const row of planned) {
    const p = page(row.id)
    check(row.state === "preparation" && stateOf(row.id) === "preparation", `${row.path}: ${stateOf(row.id)}`)
    const notice = p.inMain.find((el) => "data-state-notice" in el.attrs)
    check(notice !== undefined, `${row.path}: no notice`)
    if (notice === undefined) continue
    check(textOf(notice).includes(DESTINATIONS[row.id].whileMissing), `${row.path}: the notice lost its text`)
    check(textOf(elements(notice).find((el) => el.tag === "h2")) === STATE_HEADINGS.preparation, `${row.path}: the heading is wrong`)
  }
  for (const id of ["contact", "schedule"]) {
    const p = page(id)
    check(!p.inMain.some((el) => ["form", "button", "input", "textarea", "select", "iframe"].includes(el.tag)), `${id}: a control or form is present`)
    check(!/<button|<form|<iframe/.test(p.html), `${id}: a control is in the HTML`)
  }
})

await test("SITE-018", "Missing content never produces a blank or anonymous page", async (check) => {
  check(destinationIssues(siteNavigation).length === 0, `destinations: ${json(destinationIssues(siteNavigation))}`)
  for (const row of rows) {
    const p = page(row.id)
    const h1 = p.all.find((el) => el.tag === "h1")
    const title = row.id === "home" ? "GusmaoLab" : row.label
    check(textOf(h1).trim() === title, `${row.path}: h1 is "${textOf(h1).trim()}", expected "${title}"`)
    check(textOf(p.main).replace(/\s+/g, " ").trim().length > 90, `${row.path}: the page says almost nothing`)
    check(stateOf(row.id) !== undefined, `${row.path}: no page state`)
    check(PAGE_STATES.includes(stateOf(row.id)), `${row.path}: unknown state`)
    check(!/lorem ipsum|coming soon|under construction/i.test(textOf(p.main)), `${row.path}: placeholder wording`)
  }
  check(!existsSync(join(repo, "src/components/scaffold")), "the P06 scaffolding is still present")
  for (const [id, text] of Object.entries(DESTINATIONS)) {
    if (text.whileMissing) check(text.whileMissing.length > 40 && text.whileMissing.length < 360, `${id}: the missing-material text has an odd length`)
  }
})

await test("SITE-019", "Empty and preparation states expose no synthetic record", async (check) => {
  const counts = recordCounts(siteRecordViews())
  check(Object.values(counts).every((n) => n === 0), `the production records show ${json(counts)}`)
  for (const [, p] of pages) {
    const text = textOf(p.main)
    check(!/synthetic|\(fixture\)|fixture/i.test(text), `${p.node.path}: synthetic wording on a public page`)
    check(!p.inMain.some((el) => "data-record-id" in el.attrs), `${p.node.path}: a record is drawn although none is verified`)
  }
  check(!/Synthetic Lead|Synthetic Collaborator|10\.5555/.test(await readdirText(dist)), "a fixture name or DOI reached dist/")
})

await test("SITE-020", "The state components are accessible plain text", async (check) => {
  for (const [, p] of pages) {
    const ids = new Set()
    for (const el of p.all) {
      if (el.attrs.id === undefined) continue
      check(!ids.has(el.attrs.id), `${p.node.path}: duplicate id ${el.attrs.id}`)
      ids.add(el.attrs.id)
    }
    for (const el of p.inMain.filter((e) => "data-state-notice" in e.attrs || "data-guide" in e.attrs || "data-related" in e.attrs)) {
      check(el.tag === "section" && ids.has(el.attrs["aria-labelledby"]), `${p.node.path}: a ${el.tag} is not labelled by an existing heading`)
      const heading = p.all.find((h) => h.attrs.id === el.attrs["aria-labelledby"])
      check(heading?.tag === "h2", `${p.node.path}: the labelling heading is not an h2`)
      check(!("role" in el.attrs) && !("aria-live" in el.attrs) && !("tabindex" in el.attrs), `${p.node.path}: a notice is a live region or focus target`)
      check(!elements(el).some((x) => ["button", "input", "select", "textarea"].includes(x.tag) || "disabled" in x.attrs || x.attrs.role === "button"), `${p.node.path}: a notice holds a control`)
      check(!elements(el).some((x) => x.tag === "a" && (x.attrs.href ?? "#") === "#"), `${p.node.path}: a link goes nowhere`)
    }
  }
  const css = (await read("src/styles/states.css")).replace(/\/\*[\s\S]*?\*\//g, "")
  check(!/transition|animation|@keyframes|scroll-behavior/.test(css), "states.css adds motion")
  check(!/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/.test(css), "states.css uses a raw colour")
  check(!/--palette-/.test(css), "states.css uses a palette primitive")
})
/** The text of every built file below `dir`, except the permanent design studies (`_design/`), which show fixtures by design. */
async function readdirText(dir, { studies = false } = {}) {
  let all = ""
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.(html|js|css|json|xml|txt)$/.test(entry.name)) continue
    if (!studies && entry.parentPath.includes("/_design")) continue
    all += await readFile(join(entry.parentPath, entry.name), "utf8")
  }
  return all
}

// --- Editorial regression ------------------------------------------------------------------------------------

await test("SITE-021", "All eight editorial collections remain functional", async (check) => {
  check(COLLECTIONS.length === 8, `${COLLECTIONS.length} collections`)
  for (const collection of COLLECTIONS) {
    const p = page(collection.owner)
    const root = p.inMain.find((el) => el.attrs["data-editorial-overview"] === collection.id)
    check(root !== undefined, `${collection.label}: its overview is gone`)
    check(textOf(elements(root).find((el) => el.tag === "h1")) === collection.label, `${collection.label}: wrong heading`)
    check(p.inMain.some((el) => el.attrs["data-editorial-index-collection"] === collection.id), `${collection.label}: no index`)
  }
})

const draft = (slug, status) => ({
  collection: "blog",
  id: slug,
  data: { slug, title: slug, description: "d", status, publishedAt: "2026-01-01", updatedAt: "2026-01-01", tags: [] },
})

await test("SITE-022", "Drafts remain excluded from public routes", async (check) => {
  const records = [draft("a-draft", "draft"), draft("a-published", "published")]
  const slugs = routableRecords(records, { drafts: false }).map((r) => r.id)
  check(json(slugs) === json(["a-published"]), `routable: ${json(slugs)}`)
  check(!contentRoutes(records, { drafts: false }).some((r) => r.path?.includes("a-draft")), "a draft has a content route")
  for (const dir of await readdir(join(repo, "src/content"))) {
    for (const file of (await readdir(join(repo, "src/content", dir))).filter((f) => f.endsWith(".md"))) {
      if (/^status:\s*draft\s*$/m.test(await read(`src/content/${dir}/${file}`))) {
        const slug = /^slug:\s*(.+)$/m.exec(await read(`src/content/${dir}/${file}`))?.[1]?.trim()
        check(slug === undefined || !existsSync(join(dist, dir, slug)), `a draft ${dir}/${file} has a built page`)
      }
    }
  }
})

await test("SITE-023", "Archived editorial entries keep their valid URLs", async (check) => {
  const records = [draft("an-archived", "archived")]
  check(routableRecords(records, { drafts: false }).length === 1, "an archived entry lost its route")
  const route = contentRoutes(records, { drafts: false })[0]
  check(route !== undefined && siteNavigation.node("blog").path === "/blog/" && String(route.path ?? "").startsWith("/blog/an-archived"), `the archived route is ${json(route)}`)
})

await test("SITE-024", "Quarto-generated entries keep their folder ownership", async (check) => {
  const dirs = existsSync(join(repo, "science")) ? await readdir(join(repo, "science"), { withFileTypes: true }) : []
  // Tool folders (.quarto, _freeze) and the development sources (demo, design) are not published articles.
  const published = dirs.filter((d) => d.isDirectory() && !/^[._]/.test(d.name) && !["demo", "design"].includes(d.name))
  for (const dir of published) {
    check(["greenhouse", "trail"].includes(dir.name), `science/${dir.name} is not a Greenhouse or Trail directory`)
    for (const file of (await readdir(join(repo, "science", dir.name))).filter((f) => f.endsWith(".qmd"))) {
      check(existsSync(join(repo, "src/content", dir.name, file.replace(/\.qmd$/, ".md"))), `science/${dir.name}/${file} has no registration`)
    }
  }
  const build = JSON.parse(await read("package.json")).scripts.build
  check(build.includes("science.mjs verify") && !/execute|render/.test(build), `the build script is ${build}`)
})

await test("SITE-025", "Development examples stay out of the public indexes and pages", async (check) => {
  const issues = await publicBuildIssues(dist)
  check(issues.length === 0, `demonstration traces: ${json(issues.slice(0, 5))}`)
  check(!page("lecture-notes-greenhouse").html.includes("data-demo-section"), "the Greenhouse index lists demonstrations")
  check(!existsSync(join(dist, "demo-assets")), "demo-assets is in dist/")
})

// --- Canonical records ---------------------------------------------------------------------------------------

await test("SITE-026", "The CV pages never expose the unfinished proposal", async (check) => {
  check(CV_SNAPSHOT === null || typeof CV_SNAPSHOT.approvedOn === "string", "the snapshot is neither null nor approved")
  for (const id of ["cv", ...siteNavigation.node("cv").children.map((c) => c.id)]) {
    const p = page(id)
    check(!/proposta|CV\.proposta|codex-yaml/i.test(p.html), `${p.node.path} mentions the proposal`)
    if (CV_SNAPSHOT === null) check(stateOf(id) === "preparation", `${p.node.path} is ${stateOf(id)} without an approved CV`)
  }
  const src = await Promise.all(["src/components/states/RecordsContent.astro", "src/components/states/DestinationPage.astro", "src/site/facts.ts", "src/site/coverage.ts", "src/site/destinations.ts", "src/site/page.ts"].map(read))
  check(!src.some((s) => /cv\/source|cv\/adapter|from "yaml"|codex-yaml|CV\.proposta|node:fs/.test(s)), "a P17 module opens or imports a CV source")
})

await test("SITE-027", "The Portfolio uses canonical records, never a copy", async (check) => {
  check(DESTINATIONS.portfolio.records === "portfolio", "the Portfolio is not a records page")
  check(stateOf("portfolio") === (siteRecordViews().portfolio.length > 0 ? "ready" : "preparation"), "the Portfolio state is not derived from the records")
  const sources = await Promise.all(["src/components/states/RecordsContent.astro", "src/components/states/DestinationPage.astro"].map(read))
  check(sources.every((s) => !/data\/records|INDEPENDENT_RECORDS|PRODUCTION_RECORDS/.test(s)), "a component reads a record family directly")
  const synthetic = coverage(siteNavigation, pageFacts({}, recordViews(createRecords(SYNTHETIC_RECORDS, { allowSynthetic: true }), SYNTHETIC_PERSON)))
  check(synthetic.find((r) => r.id === "portfolio").state === "ready", "records do not make the Portfolio ready")
})

await test("SITE-028", "Lab person and organization references remain valid", async (check) => {
  check(validateRecords(PRODUCTION_RECORDS, {}).length === 0, "the production records are invalid")
  check(validateRecords(SYNTHETIC_RECORDS, { allowSynthetic: true }).length === 0, "the fixture is invalid")
  const lab = recordViews(createRecords(SYNTHETIC_RECORDS, { allowSynthetic: true }), SYNTHETIC_PERSON).lab
  check(lab.people.length > 0 && lab.areas.length > 0, "the fixture shows no Lab people or areas")
  check(validateRecords(SYNTHETIC_RECORDS, {}).length > 0, "synthetic records pass in the production store")
})

await test("SITE-029", "No fabricated professional or research record enters production", async (check) => {
  for (const [family, list] of Object.entries(PRODUCTION_RECORDS)) {
    for (const record of list) check(record.provenance?.status === "verified", `${family}/${record.id} is ${record.provenance?.status}`)
  }
  check(siteRecordViews().portfolio.length === 0 || siteRecordViews().portfolio.every((p) => p.id), "a project has no id")
  const emptyPeople = Object.values(PRODUCTION_RECORDS).flat().filter((r) => /synthetic/.test(r.id ?? "")).length
  check(emptyPeople === 0, "a synthetic ID is in the production records")
})

// --- What P17 must not have changed -----------------------------------------------------------------------------

for (const [id, title, paths] of [
  ["SITE-030", "The locked palettes and tokens are unchanged", ["src/styles/categories.css", "src/styles/tokens.css", "src/styles/environments.css", "src/design/contract.mjs"]],
  ["SITE-031", "The P15 homepage is unchanged", ["src/components/home/HomePage.astro", "src/components/home/HomeWelcome.astro", "src/components/home/ArchiveExplorer.astro", "src/components/home/NucleusStage.astro", "src/components/home/RecentUpdates.astro", "src/home/archive.ts", "src/home/updates.ts", "src/styles/home.css"]],
  ["SITE-032", "The P16 clocks are unchanged", ["src/components/home/WorldClocks.astro", "src/home/clocks.ts", "src/home/clock-time.ts", "src/home/clock-loop.ts", "src/scripts/world-clocks.ts"]],
  ["SITE-033", "Bearnard's masters, derivatives and registry are unchanged", ["brand", "public/illustrations", "src/illustrations", "src/components/bearnard", "assets/bearnard", "scripts/bearnard_derivatives.py"]],
  ["SITE-044", "The folders, previews and browser navigation are unchanged", ["src/navigation", "src/components/folders", "src/styles/folders.css", "src/scripts/folder-previews.ts", "src/scripts/folder-rows.ts", "src/styles/view-transitions.css"]],
  ["SITE-040", "Publishing, records and the CV workflow are unchanged", ["src/editorial/authoring.ts", "src/editorial/collections.ts", "src/editorial/model.ts", "src/editorial/reading.ts", "src/editorial/schema.ts", "src/editorial/demo.ts", "src/content", "src/content.config.ts", "src/records", "src/data", "src/cv", "cv/manifest.json", "cv/identities.json", "cv/README.md", "cv/template.tex", "scripts/content.mjs", "scripts/content-lib.mjs", "scripts/science.mjs", "science", "src/science", "src/demos"]],
]) {
  await test(id, title, async (check) => {
    const touched = changedSinceBase(paths)
    check(touched.length === 0, `P17 changed protected files: ${json(touched)}`)
  })
}

await test("SITE-031B", "The homepage keeps its regions and its eight clocks", async (check) => {
  const home = page("home")
  const regions = home.inMain.map((el) => el.attrs["data-home-region"]).filter(Boolean)
  check(json(regions) === json(["welcome", "nucleus", "archive", "clocks", "updates"]) || regions.length >= 5, `regions: ${json(regions)}`)
  const clocks = home.inMain.filter((el) => el.attrs["data-clock-id"] !== undefined).map((el) => el.attrs["data-clock-id"])
  check(json(clocks) === json(CLOCK_LOCATIONS.map((c) => c.id)), `clocks: ${json(clocks)}`)
  check(stateOf("home") === "ready", "Home is not ready")
})

await test("SITE-034", "Missing character-image roles never break a page", async (check) => {
  const unassigned = ILLUSTRATION_ROLES.filter((role) => !ILLUSTRATIONS.some((i) => i.roles.includes(role)))
  check(unassigned.includes("under-construction"), "the under-construction role is assigned: the test no longer proves an absent role")
  for (const id of ["bearnards-area-photos", "bearnards-area-videos", "bearnards-area-powerlifting", "bearnards-area-bear-life"]) {
    const p = page(id)
    check(stateOf(id) === "preparation", `${id} is not in preparation`)
    check(!p.inMain.some((el) => el.tag === "img"), `${id}: draws an image although no role is approved`)
    check(!/undefined|null|\.webp|\.png/.test(textOf(p.main)), `${id}: a filename or undefined is on the page`)
  }
  const overview = page("bearnards-area")
  const images = overview.inMain.filter((el) => el.tag === "img")
  check(images.length === 1 && images[0].attrs.alt.length > 20 && /bearnard-v1\.3-portrait/.test(images[0].attrs.src ?? ""), "Bearnard's own overview does not show the approved illustration once, with alt text")
  const src = await read("src/components/states/DestinationPage.astro")
  check(!/variant="(?!bearnard-v1\.3-portrait)/.test(src), "an unapproved illustration ID is requested")
})

// --- Development tools stay out of the release ------------------------------------------------------------------------

await test("SITE-039", "The site map and its specimen are excluded from the release build", async (check) => {
  check(!existsSync(join(dist, "_design/site-map")) && !existsSync(join(dist, "_design/page-states")), "a development page is in dist/")
  const issues = await publicBuildIssues(dist)
  check(issues.length === 0, `traces: ${json(issues.slice(0, 5))}`)
  const everything = await readdirText(dist)
  check(!/Site Map &amp; Page Coverage|Site Map & Page Coverage|data-site-map|route generated|Route conflicts/.test(everything), "the inspector's words are in dist/")
  check(!/\/Users\/|src\/(site|design|components|pages)\/[\w./\[\]-]+\.(ts|astro|mjs)/.test(everything), "a development file path is in client-visible output")
  check(!everything.includes(SITE_MAP), "the release build links to the site map")
  check(DEV_PAGES.some((d) => d.href === SITE_MAP), "the site map is not in its own list")
})

await test("SITE-041", "No dependency was added", async (check) => {
  const before = git("show", `${BASE}:package.json`)
  if (before.status !== 0) return
  const now = JSON.parse(await read("package.json"))
  const then = JSON.parse(before.stdout)
  // P19 (D-130) added Three.js and its types and nothing else; tests/nucleus.mjs (NUC-047) holds that
  // and that the lockfile records both.
  const withoutThree = (d) => json(Object.fromEntries(Object.entries(d).filter(([k]) => k !== "three" && k !== "@types/three")))
  check(withoutThree(now.dependencies) === withoutThree(then.dependencies), "dependencies changed")
  check(json(now.devDependencies) === json(then.devDependencies), "devDependencies changed")
})

await test("SITE-042", "A production build runs no Quarto computation", async (check) => {
  const scripts = JSON.parse(await read("package.json")).scripts
  check(scripts.build === "node scripts/science.mjs verify && node scripts/public-build.mjs", `build: ${scripts.build}`)
  const pb = await read("scripts/public-build.mjs")
  check(!/quarto|science:execute|execute/.test(pb.replace(/\/\/.*$/gm, "")), "public-build.mjs runs Quarto or executes code")
  check(!/science:execute/.test(scripts.test + scripts.verify), "the tests or verify execute notebooks")
})

await test("SITE-043", "No private content enters the generated public files", async (check) => {
  const names = (await readdir(dist, { recursive: true })).map(String)
  check(!names.some((n) => /(^|\/)(_references|_books|_papers|_reports|brand)(\/|$)/.test(n)), "a private folder is in dist/")
  check(!names.some((n) => /CV\.proposta|cv\.md|identities\.json|manifest\.json$/.test(n)), "a CV file is in dist/")
  const staged = lines(git("diff", "--cached", "--name-only"))
  check(!staged.some((f) => /^(_references|_books|_papers|_reports|cv\/|brand\/)/.test(f)), `staged private files: ${json(staged)}`)
  const everything = await readdirText(dist)
  check(!/(^|[\/"'\s])(_references|_papers|_books|_reports)([\/"'\s]|$)|codex-yaml/.test(everything), "a private folder name is in dist/")
})

// --- Report ------------------------------------------------------------------------------------------------------------

// A line the report can quote: the derived states of the real site.
console.log(`Derived states: ${json(summarize(rows))}`)

let failed = 0
for (const { id, title, failures } of results) {
  if (failures.length === 0) console.log(`PASS ${id} ${title}`)
  else {
    failed++
    console.log(`FAIL ${id} ${title}`)
    for (const message of failures) console.log(`  - ${message}`)
  }
}
console.log(failed === 0 ? `\n${results.length} checks passed.` : `\n${failed} of ${results.length} checks failed.`)
process.exit(failed === 0 ? 0 : 1)
