// The homepage (P15, D-112 to D-117): HOME-001 to HOME-022 (the data and the built page), HOME-027 to
// HOME-036 (what P15 must not have changed). Run `npm run build` first: they read dist/, the release
// build. The browser half (HOME-009 to HOME-026 as a reader sees them) is tests/home-browser.mjs.
//
// What they show: the homepage's data, selectors and markup obey their contracts, and P15 left the
// protected systems alone. What they do not show: that it looks right (the browser test and the
// owner's review), or that real time zones will format as P16 wants (P16 owns the clocks).
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { createHash } from "node:crypto"
import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { publicBuildIssues } from "../scripts/demo-check.mjs"
import { indexItems, sortRecords } from "../src/editorial/model.ts"
import { archiveGroups } from "../src/home/archive.ts"
import { CLOCK_LOCATIONS, isValidTimeZone } from "../src/home/clocks.ts"
import { RECENT_UPDATES_LIMIT, recentUpdates } from "../src/home/updates.ts"
import { HOME_SPECIMEN, HOME_SPECIMEN_ENTRIES } from "../src/design/home-fixture.ts"
import { ILLUSTRATIONS, illustrationById } from "../src/illustrations/bearnard.ts"
import { siteNavigation } from "../src/navigation/index.ts"
import { elements, layersOf, labelOf, parse, tabsOf, textOf } from "./html-tree.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const dist = join(repo, "dist")
const BASE = "6332901" // the head P15 began from
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

const home = existsSync(join(dist, "index.html"))
  ? await readFile(join(dist, "index.html"), "utf8")
  : undefined
if (home === undefined) {
  console.error("FAIL: dist/index.html is missing. Run `npm run build` first.")
  process.exit(1)
}
const tree = parse(home)
const all = elements(tree)
const main = all.find((el) => el.tag === "main")
const inMain = elements(main)
const byTag = (tag) => inMain.filter((el) => el.tag === tag)
const region = (name) => inMain.find((el) => el.attrs["data-home-region"] === name)

// --- Git: what P15 itself touched ----------------------------------------------------------------
const git = (...args) => spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" })
const gitAvailable = git("rev-parse", "--git-dir").status === 0 && git("cat-file", "-e", BASE).status === 0
const lines = (r) => r.stdout.split("\n").filter(Boolean)
const p15Commits = () => (gitAvailable ? lines(git("log", "--format=%H", `${BASE}..HEAD`, "--grep=\\[P15\\]")) : [])
// Only while this file is not yet committed (P15's own first run); a later edit of it (P16) is not P15 in progress.
const p15InProgress = () => gitAvailable && git("status", "--porcelain", "--", "tests/home.mjs").stdout.startsWith("??")
function p15Files(paths) {
  const files = new Set()
  for (const commit of p15Commits())
    for (const f of lines(git("diff-tree", "--no-commit-id", "--name-only", "-r", commit, "--", ...paths))) files.add(f)
  if (p15InProgress()) {
    for (const f of lines(git("diff", "HEAD", "--name-only", "--", ...paths))) files.add(f)
    for (const f of lines(git("ls-files", "--others", "--exclude-standard", "--", ...paths))) files.add(f)
  }
  return [...files].sort()
}
const skipped = []
const skip = (id, reason) => skipped.push(`SKIPPED ${id}: ${reason}`)
async function unchanged(id, title, paths) {
  await test(id, title, async (check) => {
    if (!gitAvailable) return skip(id, `git or ${BASE} is not available`)
    const touched = p15Files(paths)
    check(touched.length === 0, `P15 changed protected files: ${json(touched)}`)
  })
}

// --- Navigation and structure ---------------------------------------------------------------------

await test("HOME-001", "The Home route renders successfully", async (check) => {
  check(main !== undefined, "the page has no <main>")
  check(home.includes("data-home"), "the page has no homepage")
  check(all.filter((el) => el.tag === "main").length === 1, "the page has more than one <main>")
  for (const name of ["welcome", "explore", "stage", "updates", "clocks"])
    check(region(name) !== undefined, `region ${name} is missing`)
  check(!home.includes("Development scaffolding"), "the P06 scaffold is still on the page")
  check(!home.includes("/_design/tokens/"), "the temporary study links are still on the page")
})

await test("HOME-002", "Home uses the Core category and environment", async (check) => {
  const html = all.find((el) => el.tag === "html")
  check(html.attrs["data-category"] === "core", `category ${html.attrs["data-category"]}`)
  check(!("data-environment" in html.attrs), "Home sets an environment: Core's is the default")
  const result = siteNavigation.resolve("/")
  check(result.found && result.state.category === "core" && result.state.environment === "core", "the registry's Home is not Core")
})

await test("HOME-003", "All eleven global tabs keep their order and colours", async (check) => {
  const { layers } = layersOf(tree)
  const tabs = tabsOf(layers[0])
  check(
    json(tabs.map(labelOf)) === json(siteNavigation.sections.map((n) => n.label)),
    `labels ${json(tabs.map(labelOf))}`,
  )
  check(tabs.length === 11, `${tabs.length} tabs`)
  check(
    json(tabs.map((t) => t.attrs["data-category"])) === json(siteNavigation.sections.map((n) => n.category)),
    "a tab does not keep its own category",
  )
  check(
    json(tabs.map(labelOf)) === json(["Home", "About", "Contact", "Schedule", "Portfolio", "CV", "Lab", "Blog", "Lecture Notes", "Writing", "Bearnard's Area"]),
    "the approved order changed",
  )
})

await test("HOME-004", "Homepage links resolve to existing canonical routes", async (check) => {
  const known = new Set(siteNavigation.pagePaths())
  const links = byTag("a")
  check(links.length >= 10, `only ${links.length} links`)
  for (const link of links) {
    const href = link.attrs.href
    if (href.startsWith("#")) {
      check(all.some((el) => el.attrs.id === href.slice(1)), `${href} has no target on the page`)
    } else {
      // A Blog entry is a content route that exists only when published (none while the Blog is empty).
      const entry = /^\/blog\/[a-z0-9-]+\/$/.test(href)
      check(known.has(href) || entry, `${href} is not a registered page`)
    }
  }
  // The archive's links come from the registry: label and URL match the node.
  for (const group of archiveGroups())
    for (const route of group.routes) {
      const node = siteNavigation.node(route.id)
      check(route.href === node.path && route.label === node.label, `${route.id} does not follow the registry`)
      check(inMain.some((a) => a.tag === "a" && a.attrs.href === node.path), `${node.path} is not linked`)
    }
  const source = await read("src/home/archive.ts")
  check(!/href:\s*"\//.test(source) && !/path:\s*"\//.test(source), "src/home/archive.ts writes a URL by hand")
})

await test("HOME-005", "The homepage adds no physical-folder level", async (check) => {
  const { layers } = layersOf(tree)
  check(layers.length === 1, `${layers.length} folder levels`)
  check(home.match(/class="gl-folder__strip/g)?.length === 1, "more than one row of tabs")
  check(!home.includes('data-level="2"') && !home.includes('data-level="3"'), "a deeper folder level is on the page")
  check(elements(main).every((el) => !el.attrs.class?.includes("gl-folder")), "a folder is drawn inside the homepage")
})

// --- Welcome ------------------------------------------------------------------------------------------

await test("HOME-006", "Bearnard comes from the approved illustration registry", async (check) => {
  const images = inMain.filter((el) => el.tag === "img")
  check(images.length === 1, `${images.length} images in the homepage`)
  const image = images[0]
  const illustration = illustrationById(image.attrs["data-illustration"])
  check(illustration !== undefined, `${image.attrs["data-illustration"]} is not in the registry`)
  check(["canonical-master", "approved-derived"].includes(illustration.category), "the illustration is not approved")
  check(image.attrs.srcset === illustration.files.map((f) => `${f.src} ${f.width}w`).join(", "), "srcset is not the registry's")
  check(image.attrs.alt === illustration.alt && image.attrs.alt.length > 40, "the alt text is not the registry's description")
  check(image.attrs.src === illustration.files.at(-1).src, "src is not the largest derivative")
  for (const file of illustration.files) check(existsSync(join(dist, file.src)), `${file.src} is not in the build`)
  const welcome = await read("src/components/home/HomeWelcome.astro")
  check(/<BearnardIllustration/.test(welcome) && !/<img/.test(welcome), "Bearnard is not drawn by the registry's component")
  check(!/\.(png|jpe?g|webp|svg)/.test(welcome.replace(/\/\*[\s\S]*?\*\//g, "")), "the welcome names an image file")
})

await test("HOME-007", "Bearnard's canonical masters remain unchanged", async (check) => {
  if (!gitAvailable) return skip("HOME-007", "git is not available")
  const touched = p15Files(["brand", "assets/bearnard", "public/illustrations", "src/illustrations", "scripts/bearnard_derivatives.py", "src/components/bearnard"])
  check(touched.length === 0, `P15 changed Bearnard files: ${json(touched)}`)
  // The registry still assigns no role: the owner has not approved an assignment.
  check(ILLUSTRATIONS.every((i) => i.roles.length === 0), "P15 assigned an illustration to a role")
  // And the derivative on disk is the one provenance records.
  const record = JSON.parse(await read("assets/bearnard/derivatives.json"))
  for (const derivative of record.derivatives)
    for (const output of derivative.outputs) {
      const bytes = await readFile(join(repo, "public", output.path.replace(/^public\//, "")))
      check(createHash("sha256").update(bytes).digest("hex") === output.sha256, `${output.path} differs from its provenance`)
    }
})

await test("HOME-008", "The hero has a valid heading structure", async (check) => {
  const headings = inMain.filter((el) => /^h[1-6]$/.test(el.tag)).map((el) => ({ level: Number(el.tag[1]), text: textOf(el).trim() }))
  check(headings.filter((h) => h.level === 1).length === 1, `${headings.filter((h) => h.level === 1).length} <h1>`)
  check(headings[0].level === 1 && headings[0].text === "GusmaoLab", `the first heading is ${json(headings[0])}`)
  for (let i = 1; i < headings.length; i += 1)
    check(headings[i].level - headings[i - 1].level <= 1, `heading order skips a level at ${json(headings[i])}`)
  for (const name of ["explore", "stage", "updates", "clocks"]) {
    const section = region(name)
    check(section.attrs["aria-labelledby"] !== undefined && all.some((el) => el.attrs.id === section.attrs["aria-labelledby"]), `${name} has no label`)
    check(elements(section).filter((el) => el.tag === "h2").length === 1, `${name} has no single <h2>`)
  }
  check(region("welcome").attrs["aria-labelledby"] === "home-title", "the welcome is not labelled by the <h1>")
})

await test("HOME-009", "Image dimensions reserve the layout", async (check) => {
  const image = inMain.find((el) => el.tag === "img")
  const illustration = illustrationById(image.attrs["data-illustration"])
  const largest = illustration.files.at(-1)
  check(Number(image.attrs.width) === largest.width && Number(image.attrs.height) === largest.height, `${image.attrs.width}×${image.attrs.height}`)
  check(image.attrs.loading === "eager", "the welcome image should not wait to load")
  check(image.attrs.decoding === "async", "no async decoding")
  check(!!image.attrs.sizes, "no sizes attribute")
})

// --- The scientific stage ----------------------------------------------------------------------------

await test("HOME-010", "The nucleus stage keeps a stable layout footprint", async (check) => {
  const source = await read("src/styles/home.css")
  check(/\.stage__frame\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3/.test(source), "the frame has no aspect ratio")
  check(/@container home[\s\S]*\.stage__frame\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*10/.test(source), "the wide frame has no aspect ratio")
  const frame = elements(region("stage")).find((el) => "data-stage-frame" in el.attrs)
  check(frame !== undefined, "no frame")
  const css = (await Promise.all((await readdir(join(dist, "_astro"))).filter((f) => f.endsWith(".css")).map((f) => readFile(join(dist, "_astro", f), "utf8")))).join("\n")
  check(/stage__frame[^}]*aspect-ratio:\s*4\s*\/\s*3/.test(css), "the built CSS has no frame ratio")
})

await test("HOME-011", "The stage holds an honest still picture before the model loads (P15, revised by P20)", async (check) => {
  const stage = region("stage")
  // P20 (D-139): the placeholder is gone. The static HTML is the still picture of the model, which is also
  // all that JavaScript-free and WebGL-less visitors get; the script moves the state on.
  check(stage.attrs["data-stage-state"] === "picture", `the static state is ${stage.attrs["data-stage-state"]}`)
  check("data-nucleus-stage" in stage.attrs, "the stage is not marked for the script")
  const text = textOf(stage).replace(/\s+/g, " ")
  check(!/not built yet|does not exist yet|planned for this space|Reserved/i.test(text), "the stage still speaks as a placeholder")
  check(/illustration/i.test(text) && /not a measured genome/i.test(text), "the stage does not say it is an illustration, not a measured genome")
  const frame = elements(stage).find((el) => "data-stage-frame" in el.attrs)
  check(frame.attrs.role === "group" && frame.attrs["aria-labelledby"] === "stage-title", "the frame is not a labelled group")
  const picture = elements(stage).find((el) => el.attrs.role === "img" && "data-nucleus-frame" in el.attrs)
  check(picture !== undefined && /interphase/.test(picture.attrs["aria-label"] ?? ""), "the picture has no accessible name")
  check(!elements(stage).some((el) => el.tag === "canvas"), "a canvas is in the static HTML")
  check(!elements(stage).some((el) => ["img", "video", "button", "iframe"].includes(el.tag)), "the stage holds a bitmap or a control")
  check(!elements(stage).some((el) => "tabindex" in el.attrs), "the stage is focusable; the canvas never is")
  const source = await read("src/components/home/NucleusStage.astro")
  check(/NucleusFrame/.test(source) && !/<slot name="visual"/.test(source), "the stage does not use the shared frame")
  check(/data-stage-status/.test(text === "" ? "" : home), "no status line")
})

await test("HOME-012", "The homepage loads the 3D nucleus lazily, through one small script (P15, revised by P20)", async (check) => {
  const pkg = JSON.parse(await read("package.json"))
  // P19 (D-130) added Three.js; P20 (D-139) connects it to the homepage. Nothing else 3D.
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((d) => d !== "three" && d !== "@types/three")
  check(!deps.some((d) => /three|babylon|webgl|regl|ogl|d3|cesium|pixi|playcanvas|aframe/i.test(d)), `a 3D or drawing dependency: ${json(deps)}`)
  check(json(Object.keys(pkg.dependencies).sort()) === json(["@types/three", "astro", "three"]), "the runtime dependencies changed")
  check(!home.includes("<canvas") && !/webgl/i.test(home), "the page mentions a canvas or WebGL")
  const scripts = all.filter((el) => el.tag === "script")
  // The folder scripts (P07, P08), the world-clocks script (P16) and the nucleus stage's (P20); nothing else.
  for (const script of scripts) check(/folder-|clock|NucleusStage/i.test(script.attrs.src ?? "") || /folder|clock/i.test(textOf(script)), `a script other than the folder, clock and stage scripts: ${script.attrs.src}`)
  const stageScript = scripts.find((s) => /NucleusStage/.test(s.attrs.src ?? ""))
  check(stageScript !== undefined, "no stage script")
  const code = await readFile(join(dist, stageScript.attrs.src), "utf8")
  check(code.length < 8_000, `the stage script is ${code.length} bytes; it should only load the rest`)
  check(!/WebGLRenderer|from"three"|\bScene\b/.test(code), "the stage script carries the engine instead of importing it")
  const files = [...(await readdir(join(repo, "src/components/home")))].filter((f) => f.endsWith(".astro"))
  for (const file of files) check(["WorldClocks.astro", "NucleusStage.astro"].includes(file) || !/<script/.test(await read(`src/components/home/${file}`)), `${file} ships a script`)
})

// --- World clocks ----------------------------------------------------------------------------------------

const EXPECTED = [
  ["anchorage", "Anchorage", "America/Anchorage"],
  ["mexico-city", "Mexico City", "America/Mexico_City"],
  ["brasilia", "Brasília", "America/Sao_Paulo"],
  ["accra", "Accra", "Africa/Accra"],
  ["moscow", "Moscow", "Europe/Moscow"],
  ["dhaka", "Dhaka", "Asia/Dhaka"],
  ["koror", "Koror", "Pacific/Palau"],
  ["auckland", "Auckland", "Pacific/Auckland"],
]

await test("HOME-013", "Exactly eight clock locations are configured", async (check) => {
  check(CLOCK_LOCATIONS.length === 8, `${CLOCK_LOCATIONS.length} locations`)
  check(elements(region("clocks")).filter((el) => "data-clock-id" in el.attrs).length === 8, "the page does not list eight")
  for (const place of CLOCK_LOCATIONS) check(place.city && place.place && place.timeZone && place.id, `incomplete: ${json(place)}`)
})

await test("HOME-014", "Clock identifiers and order are stable", async (check) => {
  check(json(CLOCK_LOCATIONS.map((p) => [p.id, p.city, p.timeZone])) === json(EXPECTED), `the set or order changed: ${json(CLOCK_LOCATIONS.map((p) => p.id))}`)
  check(new Set(CLOCK_LOCATIONS.map((p) => p.id)).size === 8, "an identifier repeats")
  check(CLOCK_LOCATIONS.every((p) => /^[a-z]+(?:-[a-z]+)*$/.test(p.id)), "an identifier is not kebab-case")
  const listed = elements(region("clocks")).filter((el) => "data-clock-id" in el.attrs)
  check(json(listed.map((el) => el.attrs["data-clock-id"])) === json(EXPECTED.map((e) => e[0])), "the page's order differs")
  check(json(listed.map((el) => el.attrs["data-time-zone"])) === json(EXPECTED.map((e) => e[2])), "the page's zones differ")
})

await test("HOME-015", "Time-zone identifiers are valid IANA zones", async (check) => {
  for (const place of CLOCK_LOCATIONS) {
    check(isValidTimeZone(place.timeZone), `${place.timeZone} is not known to this runtime`)
    check(/^[A-Z][A-Za-z]+\/[A-Z][A-Za-z_]+$/.test(place.timeZone), `${place.timeZone} is not an Area/City identifier`)
    check(new Intl.DateTimeFormat("en", { timeZone: place.timeZone }).resolvedOptions().timeZone.length > 0, `${place.timeZone} did not resolve`)
  }
  check(isValidTimeZone("America/Anchorage") && !isValidTimeZone("UTC+3") && !isValidTimeZone("Mars/Olympus"), "isValidTimeZone does not discriminate")
  const source = await read("src/home/clocks.ts")
  check(!/utcOffset|offset\s*:|UTC[+-]|GMT[+-]/.test(source.replace(/\/\*[\s\S]*?\*\//g, "")), "the configuration holds a UTC offset")
})

await test("HOME-016", "No clock shows a fake live value in the built page", async (check) => {
  // P16 made the clocks live in the browser; the built page itself still carries no time (a static
  // build is read long after it is made), and says honestly what it is. CLOCK-026/027 go further.
  const clocks = region("clocks")
  check(clocks.attrs["data-clocks-state"] === "loading", "the clocks are not marked as loading")
  check(!elements(clocks).some((el) => el.tag === "time"), "a <time> element is drawn at build time")
  const text = textOf(clocks)
  check(!/\d{1,2}:\d{2}/.test(text) && !/\b(am|pm)\b/i.test(text), `a time of day is on the page: ${json(text.match(/\d{1,2}:\d{2}/))}`)
  const readings = elements(clocks).filter((el) => "data-clock-reading" in el.attrs)
  check(readings.length === 8 && readings.every((el) => el.attrs["aria-hidden"] === "true" && !/\d/.test(textOf(el))), "a reading holds a digit or is read aloud")
  const source = await read("src/components/home/WorldClocks.astro")
  check(!/new Date|Date\.now/.test(source.replace(/\/\*[\s\S]*?\*\//g, "")), "the component reads the current time")
})

// --- Recent Blog updates ---------------------------------------------------------------------------------

await test("HOME-017", "Recent updates read from the authoritative Blog collection", async (check) => {
  const site = await read("src/editorial/site.ts")
  check(/homeRecentUpdates[\s\S]*recentUpdates\(\(await entries\(\)\)/.test(site), "the homepage does not read the collection entries")
  const updates = await read("src/home/updates.ts")
  check(/indexItems\(\s*"blog"/.test(updates), "the selector does not reuse the Blog's index")
  const page = await read("src/pages/index.astro")
  check(/homeRecentUpdates\(\)/.test(page), "the Home route does not call the selector")
  const code = page.split("\n").filter((line) => !line.trim().startsWith("//")).join("\n")
  check(!/<li|published|publishedAt/.test(code), "the Home route lists news by hand")
  // The selector and the Blog's index list the same published entries in the same order.
  const indexed = indexItems("blog", HOME_SPECIMEN_ENTRIES).filter((i) => i.status === "published").map((i) => i.path)
  check(json(recentUpdates(HOME_SPECIMEN_ENTRIES, 99).map((i) => i.path)) === json(indexed), "the selector and the Blog index disagree")
  check(RECENT_UPDATES_LIMIT === 3 && recentUpdates(HOME_SPECIMEN_ENTRIES).length === 3, "the limit is not three")
})

await test("HOME-018", "Drafts are excluded", async (check) => {
  const titles = recentUpdates(HOME_SPECIMEN_ENTRIES, 99).map((i) => i.title)
  check(!titles.some((t) => /draft/i.test(t)), `a draft is listed: ${json(titles)}`)
  check(!recentUpdates(HOME_SPECIMEN_ENTRIES, 99).some((i) => i.status !== "published"), "a non-published entry is listed")
  check(!recentUpdates(HOME_SPECIMEN_ENTRIES, 99).some((i) => /archived/i.test(i.title)), "an archived entry is listed")
  check(recentUpdates(HOME_SPECIMEN_ENTRIES.filter((r) => r.data.status !== "published")).length === 0, "an unpublished set lists something")
})

await test("HOME-019", "Synthetic demonstrations never reach the public homepage", async (check) => {
  check(recentUpdates(HOME_SPECIMEN_ENTRIES, 99).every((i) => i.path.startsWith("/blog/")), "an entry outside the Blog is listed")
  const site = await read("src/editorial/site.ts")
  check(/entries\(\)\)\.filter\(\(record\) => !record\.demo\)/.test(site), "the homepage does not exclude demonstrations")
  for (const entry of HOME_SPECIMEN_ENTRIES) check(!home.includes(entry.data.title), `the specimen title "${entry.data.title}" is on the homepage`)
  check(!home.includes("data-home-specimen") && !home.includes("Development only"), "the specimen link is in the release homepage")
  const demos = await readdir(join(repo, "src/demos/greenhouse")).catch(() => [])
  check(demos.length > 0 && !home.includes("demo-"), "a demonstration is linked")
  check(!existsSync(join(dist, "_design/home")), "the specimen page is in the release build")
})

await test("HOME-020", "Updates are ordered deterministically", async (check) => {
  const expected = sortRecords("blog", HOME_SPECIMEN_ENTRIES).filter((r) => r.data.status === "published").map((r) => r.data.slug)
  check(json(recentUpdates(HOME_SPECIMEN_ENTRIES, 99).map((i) => i.id)) === json(expected), "the order is not the Blog's")
  const shuffled = [...HOME_SPECIMEN_ENTRIES].reverse()
  check(json(recentUpdates(shuffled)) === json(recentUpdates(HOME_SPECIMEN_ENTRIES)), "the order depends on the input order")
  const dates = recentUpdates(HOME_SPECIMEN_ENTRIES, 99).map((i) => i.when)
  check(json(dates) === json([...dates].sort().reverse()), `not newest first: ${json(dates)}`)
  // A tie in date is broken by slug, so it is total.
  const tie = ["b", "a"].map((slug) => ({ collection: "blog", id: slug, data: { slug, title: slug, status: "published", publishedAt: "2026-01-01", tags: [], relatedRecords: [] } }))
  check(json(recentUpdates(tie).map((i) => i.id)) === json(["a", "b"]), "a tie is not broken by slug")
})

await test("HOME-021", "The empty Blog state renders", async (check) => {
  const blogFiles = existsSync(join(repo, "src/content/blog")) ? (await readdir(join(repo, "src/content/blog"))).filter((f) => f.endsWith(".md") && !f.startsWith("_")) : []
  let publishedInBlog = 0
  for (const file of blogFiles) if (/^status:\s*published\s*$/m.test(await read(`src/content/blog/${file}`))) publishedInBlog += 1
  const updates = region("updates")
  if (publishedInBlog === 0) {
    check(elements(updates).some((el) => "data-updates-empty" in el.attrs), "the empty state is missing though nothing is published")
    check(!elements(updates).some((el) => "data-updates-list" in el.attrs), "a list is drawn with no entries")
    check(/Nothing has been published/.test(textOf(updates)), "the empty state does not say so")
  } else {
    check(elements(updates).some((el) => "data-updates-list" in el.attrs), "published entries are not listed")
    check(elements(updates).filter((el) => "data-update-path" in el.attrs).length === Math.min(3, publishedInBlog), "wrong number listed")
  }
  check(recentUpdates([]).length === 0, "an empty Blog gives something")
})

await test("HOME-022", "The populated specimen is drawn by the real components", async (check) => {
  const page = await read("src/pages/[design]/home/index.astro")
  check(/HomePage/.test(page) && /recentUpdates\(HOME_SPECIMEN_ENTRIES\)/.test(page), "the specimen does not use HomePage and the selector")
  check(/demosEnabled\(\) \? \[\{ params: \{ design: "_design" \} \}\] : \[\]/.test(page), "the specimen is not gated by demosEnabled")
  check(!/<ol|<li|class="update/.test(page), "the specimen draws its own markup")
  check(HOME_SPECIMEN === "/_design/home/", "the specimen address changed")
  check(HOME_SPECIMEN_ENTRIES.every((e) => e.data.slug.startsWith("specimen-")), "a specimen entry is not marked in its slug")
  check(HOME_SPECIMEN_ENTRIES.filter((e) => e.data.status === "published" && e.collection === "blog").length === 4, "the specimen lacks a fourth entry to prove the limit")
  // The built, populated page is checked in a demonstration build: tests/home-browser.mjs (HOME-022B).
  const dev = (await read("src/pages/index.astro")).includes("demosEnabled()")
  check(dev, "the Home route does not link the specimen in development")
})

// --- Regression ---------------------------------------------------------------------------------------------

await test("HOME-027", "P10 editorial collections remain intact", async (check) => {
  if (!gitAvailable) return skip("HOME-027", "git is not available")
  const touched = p15Files(["src/editorial/collections.ts", "src/editorial/schema.ts", "src/editorial/model.ts", "src/editorial/raw-dates.ts", "src/content.config.ts", "src/content"])
  check(touched.length === 0, `P15 changed the collections: ${json(touched)}`)
  // The one change to src/editorial/site.ts is the homepage's selector, and removes nothing.
  const diff = [
    ...p15Commits().map((c) => git("show", "--format=", "-U0", c, "--", "src/editorial/site.ts").stdout),
    ...(p15InProgress() ? [git("diff", "HEAD", "-U0", "--", "src/editorial/site.ts").stdout] : []),
  ].join("\n")
  check(!diff.split("\n").some((l) => l.startsWith("-") && !l.startsWith("---")), "P15 removed a line of src/editorial/site.ts")
})
await unchanged("HOME-028", "P11 canonical records remain intact", ["src/records", "src/data"])
await test("HOME-029", "The CV integration remains intact and untouched", async (check) => {
  if (!gitAvailable) return skip("HOME-029", "git is not available")
  const touched = p15Files(["cv", "src/cv", "scripts/cv.mjs", "src/data/cv"])
  check(touched.length === 0, `P15 changed the CV: ${json(touched)}`)
})
await unchanged("HOME-030", "P12 editorial layouts remain unchanged", ["src/layouts/editorial", "src/components/editorial", "src/styles/editorial.css", "src/editorial/reading.ts"])
await unchanged("HOME-031", "P13 Quarto integration remains intact", ["scripts/science.mjs", "scripts/science-html.mjs", "scripts/science-env.mjs", "science", "src/science", "src/demos", "environments"])
await unchanged("HOME-032", "P14 authoring workflow remains unchanged", ["scripts/content.mjs", "scripts/content-lib.mjs", "src/editorial/authoring.ts", "src/design/publishing", "src/pages/[design]/publishing", "development/authoring-guide.md"])

await test("HOME-033", "Development demonstrations remain isolated from the release", async (check) => {
  const issues = await publicBuildIssues(dist)
  check(issues.length === 0, `the release build holds traces: ${json(issues.slice(0, 5))}`)
  const check_ = await read("scripts/demo-check.mjs")
  check(check_.includes('"data-home-specimen"') && /_design\/home/.test(check_), "the release guard does not know the homepage specimen")
  check(!home.includes("/_design/home"), "the release homepage links the specimen")
})

await test("HOME-034", "No unfinished CV data is exposed on the homepage", async (check) => {
  check(!/CV\.proposta|pendência|\bTODO\b|\bTBD\b/i.test(home), "a CV or placeholder marker is on the page")
  for (const file of await readdir(join(repo, "src/components/home"))) {
    const text = await read(`src/components/home/${file}`)
    check(!/cv\/|snapshot|from "yaml"|records\//.test(text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "")), `${file} reaches the CV or the records`)
  }
  for (const file of ["src/home/archive.ts", "src/home/clocks.ts", "src/home/updates.ts"]) {
    check(!/snapshot|src\/cv|data\/cv|from "yaml"/.test(await read(file)), `${file} reaches the CV`)
  }
  // Nothing is claimed: no employer, title, award or count in the welcome.
  const welcome = textOf(region("welcome")).replace(/\s+/g, " ")
  check(!/professor|ph\.?d|university|institute|award|prize|publications?\b.*\d|\d+\s+(papers|articles|publications)|currently (at|working)/i.test(welcome), `the welcome claims something: ${welcome}`)
})

await test("HOME-035", "The physical-folder navigation remains intact", async (check) => {
  if (gitAvailable) {
    const touched = p15Files(["src/navigation", "src/components/folders", "src/styles/folders.css", "src/scripts", "src/styles/view-transitions.css", "src/layouts/FolderPage.astro"])
    check(touched.length === 0, `P15 changed the folders or navigation: ${json(touched)}`)
  } else skip("HOME-035 (git part)", "git is not available")
  // BaseLayout changed by one line: the import of the homepage's stylesheet (RESP-013).
  if (gitAvailable) {
    const diff = [
      ...p15Commits().map((c) => git("show", "--format=", "-U0", c, "--", "src/layouts/BaseLayout.astro").stdout),
      ...(p15InProgress() ? [git("diff", "HEAD", "-U0", "--", "src/layouts/BaseLayout.astro").stdout] : []),
    ].join("\n")
    const changed = diff.split("\n").filter((l) => /^[-+]/.test(l) && !/^(---|\+\+\+)/.test(l))
    check(changed.every((l) => l.startsWith("+") && /home\.css|homepage/.test(l)) && changed.length <= 3, `BaseLayout changed by more than the import: ${json(changed)}`)
  }
  const { layers } = layersOf(tree)
  const selected = tabsOf(layers[0]).filter((t) => "data-selected" in t.attrs)
  check(selected.length === 1 && labelOf(selected[0]) === "Home", "Home is not the one selected tab")
  check(siteNavigation.sections.length === 11, "the registry no longer has eleven sections")
})

await unchanged("HOME-036", "The locked five-category palettes remain unchanged", ["src/styles/categories.css", "src/styles/tokens.css", "src/styles/environments.css", "src/styles/global.css", "src/design/contract.mjs"])

for (const note of skipped) console.log(note)
let failed = 0
for (const { id, title, failures } of results) {
  if (failures.length === 0) console.log(`PASS ${id} ${title}`)
  else {
    failed += 1
    console.log(`FAIL ${id} ${title}`)
    for (const failure of failures) console.log(`  - ${failure}`)
  }
}
if (failed > 0) {
  console.error(`\n${failed} of ${results.length} checks failed.`)
  process.exit(1)
}
console.log(`\n${results.length} checks passed${skipped.length ? `, ${skipped.length} skipped` : ""}.`)
