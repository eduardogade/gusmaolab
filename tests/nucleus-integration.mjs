// The nucleus on the real homepage (P20, D-137 to D-143): the checks that need no browser. They run the
// real mapping, observer, coordinate and mount code in Node.js with stand-ins for the browser
// (tests/nucleus-fakes.mjs), and they read the sources and the release build (run `npm run build` first,
// or `npm run verify`). The browser half (the real homepage, real WebGL, real hover, focus, previews,
// clicks, touch and reduced-motion emulation, back/forward, layout) is tests/nucleus-integration-browser.mjs.
//
// NUCINT-001..054 are the P20 prompt's own list; a check that needs a browser says so and is in the
// other file. Every check here is a fact about code or the build, never about how it looks.
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { SECTIONS } from "../src/navigation/registry.ts"
import { DEFORMATION, RENDER } from "../src/visualization/nucleus/config.ts"
import { createState, respondTo, releaseState, step } from "../src/visualization/nucleus/deformation.ts"
import { DEFAULT_DOMAIN_ID, NAVIGATION_DOMAINS, domainsOf, resolveDomain } from "../src/visualization/nucleus/domains.ts"
import { observeNavigation } from "../src/visualization/nucleus/interaction.ts"
import { createLifecycle } from "../src/visualization/nucleus/lifecycle.ts"
import { mountNucleus } from "../src/visualization/nucleus/index.ts"
import { buildModel } from "../src/visualization/nucleus/model.ts"
import { localTarget, project, rotate, targetResponse } from "../src/visualization/nucleus/view.ts"
import { attentionPoint, navigationItems, sampleTab } from "../src/home/nucleus-navigation.ts"
import { fakeBrowser, fakeHost, listeners } from "./nucleus-fakes.mjs"
import { elements, parse, textOf } from "./html-tree.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const dist = join(repo, "dist")
const BASE = "64a3ce8" // P19's commit: what P20 began from
const P19_START = "0bc6b89"
const json = (v) => JSON.stringify(v)
const read = (path) => readFile(join(repo, path), "utf8")
const git = (...args) => spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" })
const gitAvailable = git("cat-file", "-e", BASE).status === 0
const lines = (r) => r.stdout.split("\n").filter(Boolean)
function changed(paths, since = BASE) {
  if (!gitAvailable) return []
  return [...new Set([...lines(git("diff", "--name-only", since, "--", ...paths)), ...lines(git("ls-files", "--others", "--exclude-standard", "--", ...paths))])].sort()
}
const results = []
async function test(id, title, body) {
  const failures = []
  let skipped = null
  try {
    await body((ok, message) => ok || failures.push(message), (why) => (skipped = why))
  } catch (error) {
    failures.push(error.stack ?? error.message)
  }
  results.push({ id, title, failures, skipped })
}
const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")

const homeHtml = existsSync(join(dist, "index.html")) ? await readFile(join(dist, "index.html"), "utf8") : ""
const homeTree = parse(homeHtml)
const homeEls = elements(homeTree)
const model = buildModel()
const domains = domainsOf(model)
const TOP_LEVEL = SECTIONS.map((s) => s.id)

/** A fake tab: an element with listeners, a box and a data-tab-id. */
function fakeTab(id, left, label = id) {
  const l = listeners()
  return Object.assign(l, {
    id,
    label,
    dataset: { tabId: id, tabKind: "folder" },
    getAttribute: () => null,
    getBoundingClientRect: () => ({ left, right: left + 60, top: 10, bottom: 50, width: 60, height: 40 }),
    closest: () => null,
  })
}
function recorder() {
  const calls = []
  return { calls, activate: (t) => calls.push(["activate", t]), clear: () => calls.push(["clear"]) }
}
const layoutSource = () => {
  const target = listeners()
  const frames = []
  return { target, frames, requestFrame: (cb) => frames.push(cb) && frames.length, cancelFrame: () => {}, run: () => frames.splice(0).forEach((cb) => cb()) }
}

// --- Home integration ---------------------------------------------------------------------------------------------

await test("NUCINT-001", "Home integration: the real Home carries the stage, its frame and its one script", async (check) => {
  check(homeHtml !== "", "dist/index.html is not built")
  const stage = homeEls.find((el) => "data-nucleus-stage" in el.attrs)
  check(stage?.attrs["data-home-region"] === "stage" && stage.attrs["data-stage-state"] === "picture", "the stage is not Home's region B in its static state")
  check(homeEls.filter((el) => "data-nucleus-frame" in el.attrs).length === 1, "Home has not exactly one nucleus frame")
  const script = homeEls.find((el) => el.tag === "script" && /NucleusStage/.test(el.attrs.src ?? ""))
  check(script !== undefined, "the stage's script is not on Home")
  const source = await read("src/scripts/home-nucleus.ts")
  check(/mountNucleus\(host/.test(source) && /observeNavigation\(/.test(source) && /navigationItems\(\)/.test(source), "the script does not mount the nucleus and observe the folder tabs")
})

await test("NUCINT-002", "Shared implementation: Home reuses the P19 model and renderer through the public interface", async (check) => {
  const source = await read("src/scripts/home-nucleus.ts")
  check(/import\("\.\.\/visualization\/nucleus\/index\.ts"\)/.test(source), "Home does not import the nucleus module the specimen uses")
  const specimen = await read("src/design/nucleus/specimen.ts")
  check(/from "\.\.\/\.\.\/visualization\/nucleus\/index\.ts"/.test(specimen), "the specimen does not use the same module")
  for (const f of ["model.ts", "tube.ts", "deformation.ts", "renderer.ts"]) check(existsSync(join(repo, "src/visualization/nucleus", f)), `${f} is missing`)
  check(changed(["src/visualization/nucleus/model.ts", "src/visualization/nucleus/tube.ts", "src/visualization/nucleus/deformation.ts", "src/visualization/nucleus/renderer.ts", "src/visualization/nucleus/materials.ts", "src/visualization/nucleus/fallback.ts"]).length === 0, `P19's geometry, deformation or renderer changed: ${json(changed(["src/visualization/nucleus/model.ts", "src/visualization/nucleus/tube.ts", "src/visualization/nucleus/deformation.ts", "src/visualization/nucleus/renderer.ts", "src/visualization/nucleus/materials.ts", "src/visualization/nucleus/fallback.ts"]))}`)
})

await test("NUCINT-003", "No duplicate implementation: one geometry generator, nothing of it outside src/visualization/nucleus", async (check) => {
  const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])))).flat()
  const files = (await walk(join(repo, "src"))).filter((f) => /\.(ts|astro|mjs)$/.test(f))
  const defining = []
  for (const file of files) {
    const text = strip(await readFile(file, "utf8"))
    if (/export function (buildModel|createTubeBuilder|mergeTubes|createRandom)\b|function mulberry32/.test(text)) defining.push(file.replace(`${repo}src/`, ""))
    // The specimen page only reads the model's domain list for its mapping table; it generates nothing.
    const reader = file.endsWith("pages/[design]/nucleus/index.astro") || file.endsWith("components/scientific/NucleusFrame.astro")
    if (!file.includes("visualization/nucleus")) check(!/from\s+["']three["']|BufferGeometry|TubeGeometry|WebGLRenderer/.test(text) && (reader || !/\bbuildModel\b|\bcreateTubeBuilder\b/.test(text)), `${file.replace(repo, "")} builds or draws chromatin itself`)
  }
  check(json(defining.sort()) === json(["visualization/nucleus/model.ts", "visualization/nucleus/tube.ts"]), `generators: ${json(defining)}`)
  check(!existsSync(join(repo, "src/components/home/Nucleus.astro")) && !existsSync(join(repo, "src/home/nucleus.ts")), "a homepage copy of the nucleus exists")
})

await test("NUCINT-004", "Stable layout: the stage's footprint is the frame's aspect ratio, and the canvas fills it without resizing it", async (check) => {
  const css = await read("src/styles/home.css")
  check(/\.stage__frame\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3/.test(css) && /@container home[\s\S]*\.stage__frame\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*10/.test(css), "P15's frame ratios changed")
  const frame = await read("src/components/scientific/NucleusFrame.astro")
  check(/\.nucleus__frame\[data-fill\]\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/.test(frame), "the fill frame is not absolute inside the footprint")
  check(/\.nucleus__frame > canvas\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/.test(frame), "the canvas is not absolute: it could change the frame's size")
  const stageFrame = homeEls.find((el) => "data-stage-frame" in el.attrs)
  const inner = stageFrame && elements(stageFrame).find((el) => "data-nucleus-frame" in el.attrs)
  check(inner !== undefined && "data-fill" in inner.attrs && !/aspect-ratio/.test(inner.attrs.style ?? ""), "the inner frame is not the filling one")
  check(changed(["src/styles/folders.css", "src/components/folders"]).length === 0, "the folders changed")
})

await test("NUCINT-005", "Lazy loading: Home's script is small and imports the nucleus dynamically; the renderer loads from the nucleus", async (check) => {
  const assets = (await readdir(join(dist, "_astro"))).filter((f) => f.endsWith(".js"))
  const stage = assets.find((f) => f.startsWith("NucleusStage"))
  const nucleus = assets.find((f) => f.startsWith("nucleus."))
  const renderer = assets.find((f) => f.startsWith("renderer."))
  check(stage && nucleus && renderer && assets.length === 3, `the scripts are ${json(assets)}`)
  const [stageText, nucleusText, rendererText] = await Promise.all([stage, nucleus, renderer].map((f) => readFile(join(dist, "_astro", f), "utf8")))
  check(stageText.length < 8000 && !/WebGLRenderer/.test(stageText), "the stage script carries the engine")
  check(new RegExp(`import\\(["'./]*${nucleus.replace(/\./g, "\\.")}`).test(stageText) || stageText.includes(nucleus), "the stage script does not load the nucleus chunk")
  check(!/^\s*import[^;]*renderer\./m.test(nucleusText), "the nucleus chunk imports the renderer statically")
  check(nucleusText.includes(renderer), "the nucleus chunk does not load the renderer on demand")
  check(/WebGLRenderer/.test(rendererText) && rendererText.length > 300_000, "the renderer chunk is not the engine")
  check(!/<link[^>]+modulepreload[^>]*(nucleus|renderer)/.test(homeHtml), "Home preloads the nucleus or the renderer")
  const source = await read("src/scripts/home-nucleus.ts")
  check(/IntersectionObserver/.test(source) && /rootMargin/.test(source), "nothing waits for the stage to be near")
})

await test("NUCINT-006", "Other pages: no page but Home mounts or references the nucleus", async (check) => {
  const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])))).flat()
  const pages = (await walk(dist)).filter((f) => f.endsWith(".html"))
  const withNucleus = []
  for (const file of pages) if (/data-nucleus|NucleusStage|<canvas/.test(await readFile(file, "utf8"))) withNucleus.push(file.replace(`${dist}/`, ""))
  check(json(withNucleus) === json(["index.html"]), `pages with the nucleus: ${json(withNucleus)}`)
  check(pages.length >= 37, `only ${pages.length} pages were read`)
  const components = await readdir(join(repo, "src/components/home"))
  const users = []
  for (const dir of ["src/pages", "src/layouts", "src/components"])
    for (const f of await walk(join(repo, dir))) if (/NucleusStage|home-nucleus/.test(await readFile(f, "utf8"))) users.push(f.replace(`${repo}`, ""))
  check(json(users.sort()) === json(["src/components/home/HomePage.astro", "src/components/home/NucleusStage.astro"]), `the stage is used by ${json(users)}`)
  check(components.includes("NucleusStage.astro"), "the stage component is gone")
})

await test("NUCINT-007", "Fallback: a still picture of the model is in the static HTML, and the script returns to it on failure", async (check) => {
  const picture = homeEls.filter((el) => el.tag === "svg" && el.attrs.class === "nucleus__picture")
  check(picture.length === 1, "Home has not one still picture")
  const paths = elements(picture[0]).filter((el) => el.tag === "path")
  check(paths.length >= 13 && paths.some((p) => p.attrs.stroke === "#f4c426"), `the picture has ${paths.length} paths and ${paths.some((p) => p.attrs.stroke === "#f4c426") ? "" : "no "}yellow region`)
  const source = await read("src/scripts/home-nucleus.ts")
  check(/fallback:\s*"/.test(source) && /catch\s*\{[\s\S]*show\("fallback"/.test(source), "a failed load does not leave the picture")
  check(/status === "fallback"\) return/.test(source), "a failed mount still observes the tabs")
  const css = await read("src/components/scientific/NucleusFrame.astro")
  check(/data-nucleus-state="ready"\] \.nucleus__picture/.test(css) && /data-nucleus-state="static"\] \.nucleus__picture/.test(css) && !/"fallback"\] \.nucleus__picture/.test(css), "the picture does not stay for the fallback")
  check(homeHtml.length < 90_000, `Home's HTML is ${homeHtml.length} bytes`)
})

await test("NUCINT-008", "No duplicate canvas: the script mounts once, and a second mount replaces the first", async (check) => {
  const source = strip(await read("src/scripts/home-nucleus.ts"))
  check((source.match(/mountNucleus\(/g) ?? []).length === 1 && /if \(started\) return/.test(source), "the script can mount twice")
  const host = fakeHost()
  const made = []
  const create = () => (made.push(fakeBrowser().surface), made.at(-1))
  await mountNucleus(host, { createSurface: create, environment: fakeBrowser().env, mode: "interactive" })
  await mountNucleus(host, { createSurface: create, environment: fakeBrowser().env, mode: "interactive" })
  check(made[0].calls.dispose === 1 && made[1].calls.dispose === 0, "the first renderer was not disposed")
  check(host.canvases.filter((c) => !c.removed).length === 1 || host.querySelectorAll("canvas").length === 1, "there is more than one live canvas")
})

// --- Navigation mapping ---------------------------------------------------------------------------------------------

const globalTabs = () => {
  const row = homeEls.find((el) => el.tag === "nav" && el.attrs["aria-label"] === "Sections")
  return elements(row).filter((el) => el.tag === "li" && (el.attrs.class ?? "").split(" ").includes("gl-folder-tab") && el.attrs["data-tab-kind"] === "folder")
}

await test("NUCINT-009", "Eleven destinations: the global row's tabs carry exactly the registry's eleven top-level IDs", async (check) => {
  const ids = globalTabs().map((t) => t.attrs["data-tab-id"])
  check(ids.length === 11 && json(ids) === json(TOP_LEVEL), `ids ${json(ids)}, registry ${json(TOP_LEVEL)}`)
  const cats = globalTabs().map((t) => t.attrs["data-category"])
  check(cats.every(Boolean) && json(cats) === json(SECTIONS.map((s) => s.category)), "the tabs' categories differ from the registry's")
  const registry = await read("src/navigation/registry.ts")
  for (const id of ids) check(registry.includes(`id: "${id}"`), `${id} is not in the registry`)
})

await test("NUCINT-010", "Stable IDs: identity is data-tab-id, not the label, the URL or the position", async (check) => {
  const source = strip(await read("src/home/nucleus-navigation.ts"))
  check(/dataset\.tabId/.test(source), "the helper does not read data-tab-id")
  check(/navigationItems\(\)/.test(await read("src/scripts/home-nucleus.ts")), "the script does not take its items from the helper")
  check(!/textContent|innerText|innerHTML|\.href\b|nth-child|nth-of-type|children\[|childNodes|\.label\b|indexOf\(|\[\s*\d+\s*\]/.test(source.replace(/\.dataset\.tabId/g, "")), "identity is derived from text, a URL or a position")
  // Reordered DOM, swapped labels: the IDs travel with the elements.
  const els = [fakeTab("writing", 0, "Home"), fakeTab("home", 100, "Writing"), fakeTab("cv", 200, "")]
  const root = { querySelectorAll: () => els }
  const items = navigationItems(root)
  check(json(items.map((i) => i.id)) === json(["writing", "home", "cv"]) && items.every((i, n) => i.element === els[n]), `items ${json(items.map((i) => i.id))}`)
  const missing = navigationItems({ querySelectorAll: () => [Object.assign(listeners(), { dataset: {} })] })
  check(missing.length === 0, "a tab without an ID became a target")
})

await test("NUCINT-011", "Pointer activation: entering a tab activates with its ID and attention point; touch is ignored", async (check) => {
  const tabs = [fakeTab("about", 0), fakeTab("cv", 100)]
  const r = recorder()
  const stop = observeNavigation(r, tabs.map((t) => ({ id: t.id, element: t })), { sample: (i) => ({ x: i.element.getBoundingClientRect().left + 30, y: 30 }) })
  tabs[1].fire("pointerenter", { pointerType: "mouse" })
  check(json(r.calls) === json([["activate", { navigationId: "cv", position: { x: 130, y: 30 } }]]), `calls ${json(r.calls)}`)
  tabs[0].fire("pointerenter", { pointerType: "touch" })
  check(r.calls.length === 1, "a touch pointer activated")
  stop()
})

await test("NUCINT-012", "Pointer exit: leaving the tab clears, and only the tab that set the response can clear it", async (check) => {
  const tabs = [fakeTab("about", 0), fakeTab("cv", 100)]
  const r = recorder()
  observeNavigation(r, tabs.map((t) => ({ id: t.id, element: t })))
  tabs[1].fire("pointerenter", { pointerType: "mouse" })
  tabs[0].fire("pointerleave", { pointerType: "mouse" })
  check(r.calls.length === 1, "leaving another tab cleared the response")
  tabs[1].fire("pointerleave", { pointerType: "mouse" })
  check(json(r.calls.map((c) => c[0])) === json(["activate", "clear"]), `calls ${json(r.calls.map((c) => c[0]))}`)
  tabs[1].fire("pointerleave", { pointerType: "mouse" })
  check(r.calls.length === 2, "a second leave cleared twice")
})

await test("NUCINT-013", "Keyboard activation: keyboard focus on a tab activates; a click-focus does not", async (check) => {
  const tab = fakeTab("lab", 0)
  const r = recorder()
  observeNavigation(r, [{ id: "lab", element: tab }])
  tab.fire("focusin", { target: { matches: () => false } })
  check(r.calls.length === 0, "a focus that is not :focus-visible activated")
  tab.fire("focusin", { target: { matches: (q) => q === ":focus-visible" } })
  check(r.calls.length === 1 && r.calls[0][1].navigationId === "lab", `calls ${json(r.calls)}`)
})

await test("NUCINT-014", "Keyboard exit and precedence: focus hands over, leaves, and an ended input never revives an older one", async (check) => {
  const tabs = [fakeTab("about", 0), fakeTab("cv", 100), fakeTab("lab", 200)]
  const r = recorder()
  observeNavigation(r, tabs.map((t) => ({ id: t.id, element: t })))
  const kbd = { target: { matches: () => true } }
  tabs[0].fire("focusin", kbd)
  tabs[0].fire("focusout", { relatedTarget: tabs[1] })
  tabs[1].fire("focusin", kbd)
  check(json(r.calls.map((c) => c[0] + (c[1]?.navigationId ?? ""))) === json(["activateabout", "activatecv"]), `hand-over: ${json(r.calls.map((c) => c[0] + (c[1]?.navigationId ?? "")))}`)
  tabs[1].fire("focusout", { relatedTarget: undefined })
  check(r.calls.at(-1)[0] === "clear", "focus leaving the row did not clear")
  // Precedence: the most recent input wins, and ending it does not bring back the older focus.
  r.calls.length = 0
  tabs[0].fire("focusin", kbd)
  tabs[2].fire("pointerenter", { pointerType: "mouse" })
  tabs[2].fire("pointerleave", { pointerType: "mouse" })
  check(json(r.calls.map((c) => c[0] + (c[1]?.navigationId ?? ""))) === json(["activateabout", "activatelab", "clear"]), `precedence: ${json(r.calls.map((c) => c[0] + (c[1]?.navigationId ?? "")))}`)
  // A focus that ends while a pointer holds the response does not clear it.
  r.calls.length = 0
  tabs[1].fire("pointerenter", { pointerType: "mouse" })
  tabs[1].fire("focusout", { relatedTarget: undefined })
  check(r.calls.length === 1, "an old focus ending cleared a pointer's response")
})

await test("NUCINT-015", "Rapid retargeting: moving between tabs, and releasing mid-way, never jumps the response", async (check) => {
  const state = createState()
  const route = [[0.9, 0.1], [-0.8, 0.3], [0.2, -0.9], [0.9, 0.5]]
  let prev = null
  let worst = 0
  for (let frame = 0; frame < 60 * 6; frame++) {
    if (frame % 17 === 0 && frame < 60 * 4) {
      const [vx, vy] = route[(frame / 17) % route.length | 0]
      respondTo(state, vx, vy)
    }
    if (frame === 60 * 4) releaseState(state)
    step(state, 1 / 60)
    const now = [state.s, state.vx, state.vy]
    if (prev) worst = Math.max(worst, ...now.map((v, i) => Math.abs(v - prev[i])))
    prev = now
  }
  check(worst < 0.06, `the largest one-frame change is ${worst.toFixed(4)}`)
})

await test("NUCINT-016", "P07 compatibility: the boundary is the tab itself, which holds its preview, and nothing is delayed or stopped", async (check) => {
  const source = strip(await read("src/visualization/nucleus/interaction.ts"))
  check(!/preventDefault\s*\(|stopPropagation\s*\(|stopImmediatePropagation\s*\(/.test(source), "the observer cancels or stops events")
  check(!/setTimeout|setInterval/.test(source + strip(await read("src/home/nucleus-navigation.ts"))), "a delay hides repeated state changes")
  const tabSource = await read("src/components/folders/FolderTab.astro")
  check(/<FolderPreview/.test(tabSource) && /<li[\s\S]*class="gl-folder-tab"/.test(tabSource), "the preview is not inside the tab's own element")
  const nav = await read("src/home/nucleus-navigation.ts")
  check(/\.gl-folder-tab\[data-tab-kind='folder'\]/.test(nav), "the observed element is not the tab (the preview's boundary)")
  check(changed(["src/scripts/folder-previews.ts", "src/components/folders/FolderPreview.astro", "src/components/folders/FolderTab.astro"]).length === 0, "the previews or the tab changed")
})

await test("NUCINT-017", "Click behaviour: tabs stay plain anchors and no click, keydown or navigation code was added", async (check) => {
  const sources = strip((await read("src/scripts/home-nucleus.ts")) + (await read("src/visualization/nucleus/interaction.ts")) + (await read("src/home/nucleus-navigation.ts")))
  check(!/["'](click|keydown|keyup|auxclick|mousedown|mouseup|pointerdown|pointerup|submit)["']/.test(sources), "a click, key or pointer-down listener was added")
  check(!/location\.|history\.|navigation\.navigate|\.click\(\)/.test(sources), "the nucleus code navigates")
  const anchors = globalTabs().flatMap((t) => elements(t).filter((e) => e.tag === "a" && (e.attrs.class ?? "").includes("gl-folder-tab__label")))
  check(anchors.length === 11 && anchors.every((a) => /^\/[a-z-]*\/?$/.test(a.attrs.href ?? "")), "the global tabs are not eleven plain links")
})

await test("NUCINT-018", "No blocked links: the canvas ignores pointer events, sits inside the frame, and no overlay exists", async (check) => {
  const frame = await read("src/components/scientific/NucleusFrame.astro")
  check(/\.nucleus__frame > canvas\s*\{[^}]*pointer-events:\s*none/.test(frame), "the canvas takes pointer events")
  const css = (await read("src/styles/home.css")) + frame
  check(!/z-index|position:\s*fixed/.test(css.replace(/\/\*[\s\S]*?\*\//g, "")), "the stage uses a z-index or fixed positioning")
  check(!/tabindex/.test(frame) && !homeEls.some((el) => el.tag === "canvas"), "the canvas can take focus")
  const stage = homeEls.find((el) => "data-nucleus-stage" in el.attrs)
  check(!elements(stage).some((el) => el.tag === "a" || el.tag === "button"), "the stage holds a second set of links")
})

// --- Domain abstraction --------------------------------------------------------------------------------------------

await test("NUCINT-019", "Domain-aware contract: a target carries a navigation ID, a position and an optional domain ID", async (check) => {
  const b = fakeBrowser()
  const n = createLifecycle({ surface: b.surface, model, host: b.host, mode: "interactive", modeReason: "t", pixelRatioCap: 2, environment: b.env })
  n.activate({ navigationId: "cv", position: { x: 300, y: 80 } })
  check(n.diagnostics().activeNavigationId === "cv" && n.diagnostics().activeDomainId === DEFAULT_DOMAIN_ID, `diagnostics ${json(n.diagnostics())}`)
  n.activate({ navigationId: "cv", position: { x: 300, y: 80 }, chromatinDomainId: DEFAULT_DOMAIN_ID })
  check(n.diagnostics().resolution === "requested", `resolution ${n.diagnostics().resolution}`)
  n.clear()
  b.runUntilIdle()
  check(n.diagnostics().activeNavigationId === null && n.diagnostics().phase === "resting", "clear did not return to rest")
  for (const method of ["activate", "clear", "setTarget", "release", "allowKeyboard", "refresh", "diagnostics", "dispose"]) check(typeof n[method] === "function", `controller.${method} is missing`)
  const types = await read("src/visualization/nucleus/types.ts")
  check(/interface NucleusNavigationTarget[\s\S]*navigationId: string[\s\S]*position: TargetPoint[\s\S]*chromatinDomainId\?: string/.test(types), "the target type is not as specified")
  n.dispose()
})

await test("NUCINT-020", "The existing highlighted region still responds, by the same deformation as in P19", async (check) => {
  check(domains.length === 1 && domains[0].id === DEFAULT_DOMAIN_ID && domains[0].strandId === model.highlight.strandId, `domains ${json(domains.map((d) => d.id))}`)
  check(domains[0].start === model.highlight.start && domains[0].end === model.highlight.end, "the domain is not the highlighted stretch")
  const b = fakeBrowser()
  const n = createLifecycle({ surface: b.surface, model, host: b.host, mode: "interactive", modeReason: "t", pixelRatioCap: 2, environment: b.env })
  n.activate({ navigationId: "lab", position: { x: 600, y: 50 } })
  b.runUntilIdle()
  check(n.diagnostics().phase === "responding" && n.diagnostics().activation > 0.99, `phase ${n.diagnostics().phase}, activation ${n.diagnostics().activation}`)
  check(changed(["src/visualization/nucleus/model.ts", "src/visualization/nucleus/deformation.ts"]).length === 0, "P19's model or deformation changed")
  n.dispose()
})

await test("NUCINT-021", "Fallback mapping: an ID with no distinct domain resolves to the documented default", async (check) => {
  check(Object.keys(NAVIGATION_DOMAINS).length === 0, "the production mapping is not empty: it would claim distinct domains")
  for (const id of TOP_LEVEL) {
    const r = resolveDomain(domains, { navigationId: id })
    check(r.domain.id === DEFAULT_DOMAIN_ID && r.resolution === "default", `${id} -> ${r.domain.id} (${r.resolution})`)
  }
  check(resolveDomain(domains, {}).resolution === "default", "no ID did not give the default")
  check(Object.isFrozen(NAVIGATION_DOMAINS), "the mapping can be changed at run time")
})

await test("NUCINT-022", "Missing domain: unknown IDs fall back, are reported, and never throw", async (check) => {
  const unknown = resolveDomain(domains, { navigationId: "cv", chromatinDomainId: "no-such" })
  check(unknown.domain.id === DEFAULT_DOMAIN_ID && unknown.resolution === "unknown-domain" && unknown.unknownId === "no-such", json(unknown))
  const staleMap = resolveDomain(domains, { navigationId: "cv" }, { cv: "removed-domain" })
  check(staleMap.resolution === "unknown-domain" && staleMap.unknownId === "removed-domain", json(staleMap))
  check(resolveDomain(domains, { navigationId: "__proto__" }).resolution === "default" && resolveDomain(domains, { navigationId: "constructor" }).resolution === "default", "an inherited property name was taken as a mapping")
  let threw = false
  try {
    resolveDomain([], {})
  } catch {
    threw = true
  }
  check(threw, "a model without a domain is not reported")
  const b = fakeBrowser()
  const n = createLifecycle({ surface: b.surface, model, host: b.host, mode: "interactive", modeReason: "t", pixelRatioCap: 2, environment: b.env })
  n.activate({ navigationId: "cv", position: { x: 300, y: 80 }, chromatinDomainId: "no-such" })
  check(n.diagnostics().activeDomainId === DEFAULT_DOMAIN_ID && n.diagnostics().resolution === "unknown-domain" && n.diagnostics().phase === "responding", "the controller did not fall back")
  n.dispose()
})

await test("NUCINT-023", "Geometry ownership: the navigation layer touches no mesh, vertex, colour or formula", async (check) => {
  const layer = strip((await read("src/home/nucleus-navigation.ts")) + (await read("src/scripts/home-nucleus.ts")))
  check(!/three|Mesh|geometry|vertex|vertices|BufferAttribute|Float32Array|color|colour|material|deform|applyDeformation|strand|highlight|yellow/i.test(layer.replace(/\/\/.*$/gm, "").replace(/"[^"\n]*"/g, '""')), "the navigation layer names geometry, colour or deformation")
  const imports = [...layer.matchAll(/from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1] ?? m[2])
  check(imports.every((i) => /visualization\/nucleus\/index\.ts$|home\/nucleus-navigation\.ts$/.test(i)), `imports ${json(imports)}`)
  const home = await read("src/components/home/NucleusStage.astro")
  check(!/yellow-chromatin|F4C426|#f4c426/i.test(layer + home.replace(/\/\*[\s\S]*?\*\//g, "").replace(/highlighted in yellow/g, "")), "the page hardcodes the yellow chromatin")
})

await test("NUCINT-024", "No false multi-domain claims: one domain, an empty mapping, and every document says so", async (check) => {
  check(domains.length === 1, "the model reports more than one domain")
  const guide = await read("development/nucleus-guide.md")
  const brief = await read("planning/nucleus-multidomain.md")
  check(/one (implemented )?(chromatin )?domain|exactly one domain|single domain/i.test(guide) && /not implemented|does not exist|not yet/i.test(brief), "the guide or the brief does not state the single-domain fact")
  check(!/\b(eleven|11) (distinct|different|independent) (chromatin|domains|regions)\b.*\b(are|is) (implemented|built|shown)/i.test(guide + brief), "a document claims eleven domains are built")
  check(/How many independently identifiable chromatin domains are currently present\?/i.test(brief) && /one/i.test(brief.split("How many independently")[1].slice(0, 700)), "the brief does not answer question 1 with one")
  const specimen = await read("src/pages/[design]/nucleus/index.astro")
  check(/not implemented/i.test(specimen), "the specimen does not say distinct regions are not implemented")
})

await test("NUCINT-025", "Future extensibility: two synthetic domains resolve through the same API, with no change to it", async (check) => {
  const synthetic = [...domains, { id: "synthetic-b", strandId: "territory-05", start: 10, end: 60, center: [0.2, -0.3, 0.1] }]
  const map = { cv: "synthetic-b", lab: DEFAULT_DOMAIN_ID }
  const a = resolveDomain(synthetic, { navigationId: "cv" }, map)
  const b = resolveDomain(synthetic, { navigationId: "lab" }, map)
  check(a.domain.id === "synthetic-b" && a.resolution === "mapped" && b.domain.id === DEFAULT_DOMAIN_ID && b.resolution === "mapped", `${json(a)} ${json(b)}`)
  check(resolveDomain(synthetic, { navigationId: "cv", chromatinDomainId: DEFAULT_DOMAIN_ID }, map).domain.id === DEFAULT_DOMAIN_ID, "an explicit domain did not beat the mapping")
  check(resolveDomain(synthetic, { navigationId: "about" }, map).domain.id === DEFAULT_DOMAIN_ID, "an unmapped ID did not take the default")
  check(resolveDomain(synthetic, { chromatinDomainId: "synthetic-b" }).resolution === "requested", "a requested synthetic domain was not honoured")
  // The observer carries a domain ID through without knowing what it means.
  const tab = fakeTab("cv", 0)
  const r = recorder()
  observeNavigation(r, [{ id: "cv", element: tab, chromatinDomainId: "synthetic-b" }])
  tab.fire("pointerenter", { pointerType: "mouse" })
  check(r.calls[0][1].chromatinDomainId === "synthetic-b", "the observer dropped the domain ID")
})

// --- Coordinates and responsiveness --------------------------------------------------------------------------------

await test("NUCINT-026", "Local coordinates: a viewport position becomes half-frame units from the frame's centre", async (check) => {
  const rect = { left: 100, top: 200, width: 800, height: 400 }
  const [cx, cy] = localTarget({ x: 500, y: 400 }, rect)
  check(Math.abs(cx) < 1e-12 && Math.abs(cy) < 1e-12, `the centre is ${cx}, ${cy}`)
  const [rx, ry] = localTarget({ x: 700, y: 200 }, rect)
  check(Math.abs(rx - 1) < 1e-12 && Math.abs(ry - 1) < 1e-12, `right and up give ${rx}, ${ry}`)
  // The unit is the half-height on both axes, so the frame's left edge is two units out.
  const [lx, ly] = localTarget({ x: 100, y: 600 }, rect)
  check(Math.abs(lx + 2) < 1e-12 && Math.abs(ly + 1) < 1e-12, `left and down give ${lx}, ${ly}`)
  const b = fakeBrowser({ width: 700, height: 525 })
  const n = createLifecycle({ surface: b.surface, model, host: b.host, mode: "interactive", modeReason: "t", pixelRatioCap: 2, environment: b.env })
  n.activate({ navigationId: "cv", position: { x: b.rect.left + 350 + 262.5, y: b.rect.top + 262.5 - 262.5 } })
  const t = n.diagnostics().target
  check(Math.abs(t.x - 1) < 1e-9 && Math.abs(t.y - 1) < 1e-9, `the lifecycle measured ${json(t)}`)
  n.dispose()
})

await test("NUCINT-027", "Bounded targets: no position, however far or broken, asks for more than the limit or a non-finite value", async (check) => {
  const rect = { left: 0, top: 0, width: 600, height: 400 }
  for (const p of [{ x: 1e9, y: -1e9 }, { x: -50000, y: 50000 }, { x: NaN, y: Infinity }, { x: 0, y: 0 }]) {
    const [x, y] = localTarget(p, rect)
    check(Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= DEFORMATION.targetLimit && Math.abs(y) <= DEFORMATION.targetLimit, `${json(p)} -> ${x}, ${y}`)
  }
  const region = project(rotate(model.highlight.center), 1.5)
  let worst = 0
  for (const p of [{ x: 1e9, y: 0 }, { x: 0, y: -1e9 }, { x: -9999, y: 9999 }, { x: 300, y: -40 }]) {
    const [vx, vy] = targetResponse(localTarget(p, rect), region)
    worst = Math.max(worst, Math.hypot(vx, vy))
  }
  check(worst <= 1 + 1e-9, `the reach is ${worst}`)
  check(DEFORMATION.targetLimit > 0, "no limit")
  // The limit scales, so a far tab keeps its true direction (up and to the left stays up and to the left).
  const [fx, fy] = localTarget({ x: 300 - 2000, y: 200 - 7000 }, { left: 0, top: 0, width: 600, height: 400 })
  const trueAngle = Math.atan2(7000, -2000)
  check(Math.abs(Math.atan2(fy, fx) - trueAngle) < 1e-9 && Math.abs(Math.hypot(fx, fy) - DEFORMATION.targetLimit) < 1e-9, `direction ${Math.atan2(fy, fx)} vs ${trueAngle}, length ${Math.hypot(fx, fy)}`)
})

await test("NUCINT-028", "Horizontal scrolling: a tab half hidden by its row aims at the part that shows", async (check) => {
  const row = { left: 100, right: 500, top: 0, bottom: 60 }
  const whole = attentionPoint({ left: 200, right: 280, top: 10, bottom: 50 }, row)
  check(whole.x === 240 && whole.y === 30, json(whole))
  const clippedLeft = attentionPoint({ left: 60, right: 180, top: 10, bottom: 50 }, row)
  check(clippedLeft.x === 140, `clipped on the left: ${clippedLeft.x}`)
  const clippedRight = attentionPoint({ left: 450, right: 600, top: 10, bottom: 50 }, row)
  check(clippedRight.x === 475, `clipped on the right: ${clippedRight.x}`)
  const gone = attentionPoint({ left: 520, right: 600, top: 10, bottom: 50 }, row)
  check(gone.x === 560, "a tab outside its row did not fall back to its own centre")
  check(attentionPoint({ left: 0, right: 10, top: 0, bottom: 10 }, null).x === 5, "a tab without a row has no centre")
  const tab = Object.assign(listeners(), { getBoundingClientRect: () => ({ left: 60, right: 180, top: 10, bottom: 50 }), closest: () => ({ getBoundingClientRect: () => row }) })
  check(sampleTab({ id: "x", element: tab }).x === 140, "sampleTab does not clip to the closest strip")
})

await test("NUCINT-029", "Window resize: the target is measured against the frame as it is now, and a resize re-samples a held target", async (check) => {
  const b = fakeBrowser({ width: 700, height: 525 })
  const n = createLifecycle({ surface: b.surface, model, host: b.host, mode: "interactive", modeReason: "t", pixelRatioCap: 2, environment: b.env })
  const point = { x: 900, y: 150 }
  n.activate({ navigationId: "cv", position: point })
  const wide = n.diagnostics().target
  Object.assign(b.rect, { width: 350, height: 262.5 })
  n.activate({ navigationId: "cv", position: point })
  const narrow = n.diagnostics().target
  check(Math.abs(wide.x - narrow.x) > 0.1, `the target did not follow the frame: ${json(wide)} ${json(narrow)}`)
  check(Math.abs(narrow.x) <= DEFORMATION.targetLimit && Math.abs(narrow.y) <= DEFORMATION.targetLimit, "the resized target is out of range")
  n.dispose()
  const layout = layoutSource()
  const tab = fakeTab("cv", 0)
  let left = 0
  tab.getBoundingClientRect = () => ({ left, right: left + 60, top: 10, bottom: 50, width: 60, height: 40 })
  const r = recorder()
  observeNavigation(r, [{ id: "cv", element: tab }], { layout })
  tab.fire("pointerenter", { pointerType: "mouse" })
  left = 80
  layout.target.fire("resize")
  layout.run()
  check(r.calls.length === 2 && r.calls[1][1].position.x === 110, `a resize did not re-sample: ${json(r.calls)}`)
})

await test("NUCINT-030", "Page scroll: a held target follows the page's scroll, once per frame, and stops listening when released", async (check) => {
  const layout = layoutSource()
  const tab = fakeTab("lab", 0)
  let top = 10
  tab.getBoundingClientRect = () => ({ left: 0, right: 60, top, bottom: top + 40, width: 60, height: 40 })
  const r = recorder()
  observeNavigation(r, [{ id: "lab", element: tab }], { layout })
  tab.fire("pointerenter", { pointerType: "mouse" })
  check(layout.target.live() === 2, `${layout.target.live()} layout listeners while held`)
  top = -300
  layout.target.fire("scroll")
  layout.target.fire("scroll")
  layout.target.fire("scroll")
  check(layout.frames.length === 1, `${layout.frames.length} frames requested for three scroll events`)
  layout.run()
  check(r.calls.at(-1)[1].position.y === -280, `the position after scrolling is ${json(r.calls.at(-1))}`)
  tab.fire("pointerleave", { pointerType: "mouse" })
  check(layout.target.live() === 0, "the layout listeners remain after the release")
  const source = strip(await read("src/visualization/nucleus/interaction.ts"))
  check(/capture: true, passive: true/.test(source), "the scroll listener is not passive")
})

await test("NUCINT-031", "Stable response: sub-pixel and few-pixel layout movement does not re-send the target", async (check) => {
  const layout = layoutSource()
  const tab = fakeTab("blog", 0)
  let left = 0
  tab.getBoundingClientRect = () => ({ left, right: left + 60, top: 10, bottom: 50, width: 60, height: 40 })
  const r = recorder()
  observeNavigation(r, [{ id: "blog", element: tab }], { layout })
  tab.fire("pointerenter", { pointerType: "mouse" })
  for (const jitter of [0.3, -0.4, 1, 2.2, -2.9]) {
    left = jitter
    layout.target.fire("scroll")
    layout.run()
  }
  check(r.calls.length === 1, `${r.calls.length} calls for movements under 3 px`)
  left = 5
  layout.target.fire("scroll")
  layout.run()
  check(r.calls.length === 2, "a real movement was not followed")
})

// --- Accessibility and lifecycle -----------------------------------------------------------------------------------

/** matchMedia stand-in: queries answered from `flags`, with change listeners. */
async function withMedia(flags, body) {
  const listenersByQuery = new Map()
  const previous = globalThis.matchMedia
  globalThis.matchMedia = (q) => {
    const reduced = q.includes("prefers-reduced-motion")
    const touch = q.includes("hover: none") || q.includes("pointer: coarse")
    const list = listenersByQuery.get(q) ?? new Set()
    listenersByQuery.set(q, list)
    return {
      get matches() { return reduced ? flags.reduced : touch ? flags.touch : false },
      addEventListener: (_t, fn) => list.add(fn),
      removeEventListener: (_t, fn) => list.delete(fn),
    }
  }
  try {
    return await body({ change: () => listenersByQuery.forEach((s) => s.forEach((fn) => fn())) })
  } finally {
    globalThis.matchMedia = previous
  }
}

await test("NUCINT-032", "Reduced motion: still, never animating, live changes followed, keyboard cannot lift it", async (check) => {
  const flags = { reduced: true, touch: false }
  await withMedia(flags, async ({ change }) => {
    const b = fakeBrowser()
    const host = fakeHost()
    const n = await mountNucleus(host, { createSurface: () => b.surface, environment: b.env })
    check(n.mode === "static" && n.status === "static" && n.diagnostics().reducedMotion === true, `mode ${n.mode}, status ${n.status}`)
    n.activate({ navigationId: "cv", position: { x: 300, y: 80 } })
    n.allowKeyboard()
    n.activate({ navigationId: "cv", position: { x: 300, y: 80 } })
    check(n.mode === "static" && b.pending() === 0 && n.diagnostics().phase === "resting", "reduced motion was lifted or animated")
    flags.reduced = false
    change()
    check(n.mode === "interactive", `after the preference went away the mode is ${n.mode}`)
    n.activate({ navigationId: "cv", position: { x: 300, y: 80 } })
    check(b.pending() === 1, "no animation after the preference was lifted")
    flags.reduced = true
    change()
    check(n.mode === "static" && b.pending() === 0, "the loop kept running after reduced motion came on")
    n.dispose()
  })
})

await test("NUCINT-033", "Touch: still by default, from capability not width, keyboard focus lifts it, no touch listener exists", async (check) => {
  await withMedia({ reduced: false, touch: true }, async () => {
    const b = fakeBrowser()
    const n = await mountNucleus(fakeHost(), { createSurface: () => b.surface, environment: b.env })
    check(n.mode === "static" && /touch/i.test(n.diagnostics().reason), `mode ${n.mode}: ${n.diagnostics().reason}`)
    n.activate({ navigationId: "cv", position: { x: 300, y: 80 } })
    check(b.pending() === 0, "a touch device animated")
    n.allowKeyboard()
    check(n.mode === "interactive" && /keyboard/i.test(n.diagnostics().reason), `after the keyboard: ${n.mode}`)
    n.activate({ navigationId: "cv", position: { x: 300, y: 80 } })
    check(b.pending() === 1, "keyboard focus did not move the nucleus on a touch device")
    n.dispose()
  })
  await withMedia({ reduced: false, touch: false }, async () => {
    const n = await mountNucleus(fakeHost(), { createSurface: () => fakeBrowser().surface, environment: fakeBrowser().env })
    check(n.mode === "interactive", "a hover-capable device was made still")
    n.dispose()
  })
  const sources = strip((await read("src/scripts/home-nucleus.ts")) + (await read("src/visualization/nucleus/interaction.ts")) + (await read("src/visualization/nucleus/index.ts")) + (await read("src/visualization/nucleus/lifecycle.ts")))
  check(!/touchstart|touchmove|touchend|["']wheel["']|innerWidth|matchMedia\(["'`][^"'`]*(width|max-)/.test(sources), "touch events, wheel or viewport width are used")
  const frame = await read("src/components/scientific/NucleusFrame.astro")
  check(/touch-action:\s*auto/.test(frame), "the canvas changes touch handling")
})

await test("NUCINT-034", "Keyboard navigation: the global tabs are anchors in document order, and the stage adds no tab stop", async (check) => {
  const anchors = globalTabs().flatMap((t) => elements(t).filter((e) => e.tag === "a" && (e.attrs.class ?? "").includes("gl-folder-tab__label")))
  check(anchors.length === 11 && anchors.every((a) => !("tabindex" in a.attrs)), `${anchors.length} global tab anchors, or one has a tabindex`)
  const stage = homeEls.find((el) => "data-nucleus-stage" in el.attrs)
  check(!elements(stage).some((el) => "tabindex" in el.attrs || ["a", "button", "input"].includes(el.tag)), "the stage adds a tab stop")
  const source = await read("src/scripts/home-nucleus.ts")
  check(!/\.focus\(|tabIndex|tabindex/.test(source), "the script moves focus or adds a tab stop")
})

await test("NUCINT-035", "Hidden page: a hidden document pauses the loop, and showing it draws once and resumes", async (check) => {
  const b = fakeBrowser()
  const n = createLifecycle({ surface: b.surface, model, host: b.host, mode: "interactive", modeReason: "t", pixelRatioCap: 2, environment: b.env })
  n.activate({ navigationId: "cv", position: { x: 300, y: 80 } })
  b.doc.hidden = true
  b.doc.fire("visibilitychange")
  check(b.pending() === 0, "a frame stays requested on a hidden page")
  const drawn = b.surface.calls.draw
  b.doc.hidden = false
  b.doc.fire("visibilitychange")
  check(b.surface.calls.draw === drawn + 1 && b.pending() === 1, "showing the page did not draw once and resume")
  n.dispose()
})

await test("NUCINT-036", "Page restoration: pageshow redraws without a second renderer; pagehide keeps a page the history may restore", async (check) => {
  const b = fakeBrowser()
  const n = createLifecycle({ surface: b.surface, model, host: b.host, mode: "interactive", modeReason: "t", pixelRatioCap: 2, environment: b.env })
  const drawn = b.surface.calls.draw
  b.win.fire("pageshow", { persisted: true })
  check(b.surface.calls.draw === drawn + 1 && b.surface.calls.dispose === 0, "pageshow did not redraw, or disposed")
  const source = strip(await read("src/scripts/home-nucleus.ts"))
  check(/addEventListener\("pagehide"[\s\S]*event\.persisted\) return[\s\S]*dispose\(\)/.test(source), "pagehide does not keep a restorable page and dispose an unrestorable one")
  check(!/pageshow/.test(source), "the script mounts again on pageshow")
  n.dispose()
})

await test("NUCINT-037", "Cleanup: dispose releases the renderer, observers, listeners and timers; the observer removes every listener", async (check) => {
  const b = fakeBrowser()
  const host = fakeHost()
  const n = await mountNucleus(host, { createSurface: () => b.surface, environment: b.env, mode: "interactive" })
  const tabs = [fakeTab("about", 0), fakeTab("cv", 100)]
  const layout = layoutSource()
  const stop = observeNavigation(n, tabs.map((t) => ({ id: t.id, element: t })), { layout })
  tabs[0].fire("pointerenter", { pointerType: "mouse" })
  stop()
  check(tabs.every((t) => t.live() === 0 && t.adds() === t.removes() && t.adds() === 4) && layout.target.live() === 0, "the observer left a listener")
  n.dispose()
  check(b.surface.calls.dispose === 1 && b.doc.live() === 0 && b.win.live() === 0 && b.canvas.live() === 0 && b.observing() === 0 && b.timers.size === 0 && b.pending() === 0, "the nucleus left a renderer, listener, observer, timer or frame")
  n.dispose()
  check(b.surface.calls.dispose === 1, "a second dispose released twice")
})

await test("NUCINT-038", "No duplicate loops: repeated activation, retargeting and clearing keep one pending frame at most", async (check) => {
  const b = fakeBrowser()
  const n = createLifecycle({ surface: b.surface, model, host: b.host, mode: "interactive", modeReason: "t", pixelRatioCap: 2, environment: b.env })
  for (let i = 0; i < 50; i++) {
    n.activate({ navigationId: i % 2 ? "cv" : "lab", position: { x: 100 + i * 10, y: 50 } })
    if (i % 7 === 0) n.clear()
    check(b.pending() <= 1, `${b.pending()} frames pending after ${i + 1} events`)
  }
  b.runUntilIdle()
  check(b.pending() === 0 && !n.diagnostics().loopRunning, "the loop did not stop")
  n.dispose()
})

await test("NUCINT-039", "WebGL failure: a failed renderer leaves the picture, with harmless calls, and the page's other scripts do not depend on it", async (check) => {
  const host = fakeHost()
  const states = []
  const n = await mountNucleus(host, { createSurface: () => { throw new Error("no WebGL") }, environment: fakeBrowser().env, onStatus: (s) => states.push(s) })
  check(n.status === "fallback" && host.dataset.nucleusState === "fallback" && states.includes("fallback"), `status ${n.status}, states ${json(states)}`)
  n.activate({ navigationId: "cv", position: { x: 1, y: 1 } })
  n.clear()
  n.allowKeyboard()
  n.dispose()
  const source = await read("src/scripts/home-nucleus.ts")
  check(/try \{[\s\S]*await import[\s\S]*\} catch/.test(source), "the load is not guarded")
  const others = (await Promise.all(["src/scripts/world-clocks.ts", "src/scripts/folder-previews.ts", "src/scripts/folder-rows.ts"].map(read))).join("\n")
  check(!/nucleus/i.test(others), "another script depends on the nucleus")
})

await test("NUCINT-040", "Static HTML: Home is understandable without JavaScript, and the picture and text are honest", async (check) => {
  const stage = homeEls.find((el) => "data-nucleus-stage" in el.attrs)
  const text = textOf(stage).replace(/\s+/g, " ")
  check(/Inside the nucleus/.test(text) && /illustration/.test(text) && /not a measured genome or a simulation/.test(text), "the text is not honest about what the picture is")
  check(/Still picture of the model/.test(text), "the status line does not say it is a still picture")
  const picture = elements(stage).find((e) => e.attrs.role === "img")
  check(/interphase/.test(picture?.attrs["aria-label"] ?? ""), "the picture has no description")
  check(!/loading|spinner/i.test(text), "the static page shows a loading message")
})

// --- Preservation and production ----------------------------------------------------------------------------------

await test("NUCINT-041", "P15 composition: the regions, their order and the stage's ratios are unchanged", async (check) => {
  const order = homeEls.filter((el) => "data-home-region" in el.attrs).map((el) => el.attrs["data-home-region"])
  check(json(order) === json(["welcome", "explore", "stage", "updates", "clocks"]), `order ${json(order)}`)
  const touched = changed(["src/components/home", "src/home", "src/styles/home.css"])
  check(touched.every((f) => ["src/components/home/NucleusStage.astro", "src/home/nucleus-navigation.ts", "src/styles/home.css"].includes(f)), `Home sources: ${json(touched)}`)
  // Only the stage's section of home.css changed: everything before it and after it is byte-identical.
  if (gitAvailable) {
    const then = git("show", `${BASE}:src/styles/home.css`).stdout
    const now = await read("src/styles/home.css")
    const cut = (t) => [t.slice(0, t.indexOf("/* 3. The nucleus stage")), t.slice(t.indexOf("/* 4. World clocks"))]
    check(json(cut(then)) === json(cut(now)), "home.css changed outside the nucleus stage's section")
  }
})

await test("NUCINT-042", "Bearnard: assets, registry and component are untouched, and the nucleus code never names him", async (check) => {
  const touched = changed(["src/illustrations", "public/illustrations", "assets/bearnard", "scripts/bearnard_derivatives.py", "src/components/bearnard", "src/components/home/HomeWelcome.astro"], P19_START)
  check(touched.length === 0, `Bearnard files changed: ${json(touched)}`)
  check(git("status", "--porcelain", "--", "brand").stdout.trim() === "", "something under brand/ changed")
  check(!/bearnard/i.test(strip((await read("src/scripts/home-nucleus.ts")) + (await read("src/home/nucleus-navigation.ts")))), "the glue names Bearnard")
})

await test("NUCINT-043", "World clocks: the clocks' files are untouched, and the eight clocks are on the page", async (check) => {
  check(changed(["src/home/clock-loop.ts", "src/home/clock-time.ts", "src/home/clocks.ts", "src/scripts/world-clocks.ts", "src/components/home/WorldClocks.astro"], P19_START).length === 0, "the clocks changed")
  check(homeEls.filter((el) => "data-clock" in el.attrs || "data-clock-id" in el.attrs).length >= 8 || (homeHtml.match(/data-clock/g) ?? []).length >= 8, "fewer than eight clocks are on Home")
})

await test("NUCINT-044", "Folder geometry: components, styles, navigation and layouts are untouched", async (check) => {
  check(changed(["src/components/folders", "src/styles/folders.css", "src/navigation", "src/layouts/FolderPage.astro", "src/scripts/folder-rows.ts", "src/styles/view-transitions.css"], P19_START).length === 0, "the folders or navigation changed")
})

await test("NUCINT-045", "Five palettes: the stylesheets, tokens and contract are untouched, and no site token was added for the nucleus", async (check) => {
  const touched = changed(["src/styles/categories.css", "src/styles/tokens.css", "src/styles/environments.css", "src/styles/global.css", "src/design/contract.mjs", "src/design/css-tokens.mjs"], P19_START)
  check(touched.length === 0, `a palette or token file changed: ${json(touched)}`)
  const css = await read("src/styles/home.css")
  check(!/#[0-9a-f]{3,8}\b/i.test(css.slice(css.indexOf("3. The nucleus stage"), css.indexOf("4. World clocks"))), "the stage uses a raw colour")
  check(!/--palette-|--color-category/.test(await read("src/components/home/NucleusStage.astro")), "the stage uses a primitive palette colour")
})

await test("NUCINT-046", "P07 previews: the preview script and its markup are untouched", async (check) => {
  check(changed(["src/scripts/folder-previews.ts", "src/components/folders/FolderPreview.astro", "tests/previews.mjs", "tests/previews-browser.mjs"], P19_START).length === 0, "the previews or their tests changed")
})

await test("NUCINT-047", "P08 responsive tabs: the row scrolling script and its test are untouched", async (check) => {
  check(changed(["src/scripts/folder-rows.ts", "tests/responsive.mjs", "tests/responsive-browser.mjs"], P19_START).length === 0, "the rows' script or tests changed")
})

await test("NUCINT-048", "P09 transitions: no router, and the transition stylesheet is untouched", async (check) => {
  check(changed(["src/styles/view-transitions.css"], P19_START).length === 0, "the transition stylesheet changed")
  const sources = strip((await read("src/scripts/home-nucleus.ts")) + (await read("src/components/home/NucleusStage.astro")))
  check(!/ClientRouter|astro:transitions|startViewTransition|navigation\.navigate|history\.pushState|pagereveal|pageswap/.test(sources), "the stage routes or manages transitions")
  check(!/"astro:|ClientRouter/.test(await read("src/layouts/BaseLayout.astro")), "BaseLayout has a router")
})

await test("NUCINT-049", "No unrelated GPU load: no other page references the nucleus scripts, and Three.js is imported only by the renderer", async (check) => {
  const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])))).flat()
  const pages = (await walk(dist)).filter((f) => f.endsWith(".html") && f !== join(dist, "index.html"))
  for (const file of pages) check(!/_astro\/(NucleusStage|nucleus|renderer)\./.test(await readFile(file, "utf8")), `${file.replace(dist, "")} references the nucleus scripts`)
  const importers = []
  for (const f of await walk(join(repo, "src"))) if (/\.(ts|astro|mjs)$/.test(f) && /from\s+["']three["']/.test(await readFile(f, "utf8"))) importers.push(f.replace(`${repo}src/`, ""))
  check(json(importers.sort()) === json(["visualization/nucleus/materials.ts", "visualization/nucleus/renderer.ts"]), `three is imported by ${json(importers)}`)
  const lifecycle = strip(await read("src/visualization/nucleus/index.ts"))
  check(/await import\("\.\/renderer\.ts"\)/.test(lifecycle) && !/^import (?!type)[^\n]*renderer\.ts/m.test(lifecycle), "the renderer is not loaded on demand")
})

await test("NUCINT-050", "No idle loop: a settled nucleus requests no frame, a still one never does, and the loop ends by itself", async (check) => {
  const b = fakeBrowser()
  const n = createLifecycle({ surface: b.surface, model, host: b.host, mode: "interactive", modeReason: "t", pixelRatioCap: 2, environment: b.env })
  check(b.pending() === 0, "a resting nucleus requested a frame")
  n.activate({ navigationId: "cv", position: { x: 300, y: 80 } })
  const frames = b.runUntilIdle()
  check(frames > 20 && frames < 400 && b.pending() === 0, `${frames} frames to settle`)
  const drawn = b.surface.calls.draw
  b.win.fire("scroll")
  check(b.pending() === 0 && b.surface.calls.draw === drawn, "a scroll woke a settled nucleus")
  n.clear()
  check(b.runUntilIdle() < 400 && b.pending() === 0, "the return did not end")
  const source = strip((await read("src/visualization/nucleus/lifecycle.ts")) + (await read("src/scripts/home-nucleus.ts")))
  check(!/setInterval/.test(source), "a repeating timer exists")
  check(RENDER.maxStep > 0, "no step bound")
  n.dispose()
})

await test("NUCINT-051", "Public build: no diagnostics, no specimen and no simulated tab in the release output", async (check) => {
  check(!/data-diag|data-nucleus-diagnostics|data-nucleus-lab|data-nucleus-specimen|nucleus-play|data-nucleus-unknown|data-nucleus-map|no-such-domain/.test(homeHtml), "Home carries a diagnostic")
  const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])))).flat()
  for (const f of await walk(dist)) {
    if (!/\.(html|js|css)$/.test(f)) continue
    const text = await readFile(f, "utf8")
    check(!/data-diag=|data-nucleus-diagnostics|data-nucleus-unknown|data-nucleus-map|window\.__nucleus|__NUCLEUS/.test(text), `${f.replace(dist, "")} carries a diagnostic`)
  }
  check(!existsSync(join(dist, "_design")) || !existsSync(join(dist, "_design/nucleus")), "the specimen is in the release")
  const source = await read("src/scripts/home-nucleus.ts")
  check(!/window\.[a-zA-Z_]+\s*=|globalThis\.[a-zA-Z_]+\s*=|console\./.test(strip(source)), "the script publishes a global or logs")
})

await test("NUCINT-052", "Publishing regression: the editorial, Quarto and authoring code is untouched since P19", async (check) => {
  const touched = changed(["src/editorial", "src/content.config.ts", "src/content", "scripts/content.mjs", "scripts/science.mjs", "science", "src/science", "src/records", "src/data/records", "src/demos/greenhouse"], P19_START)
  check(touched.length === 0, `publishing files changed: ${json(touched)}`)
})

await test("NUCINT-053", "Utility regression: contact, downloads, the 404 page and the site coverage are untouched", async (check) => {
  const touched = changed(["src/data/contact.ts", "src/data/downloads.ts", "src/pages/404.astro", "src/site", "src/components/states", "public/downloads", "scripts/downloads.mjs"], P19_START)
  check(touched.length === 0, `utility files changed: ${json(touched)}`)
  check(existsSync(join(dist, "404.html")) && existsSync(join(dist, "contact/index.html")), "the 404 or Contact page is not built")
})

await test("NUCINT-054", "CV preservation: no CV file changed, staged or modified in the working tree", async (check) => {
  check(changed(["cv", "src/cv", "src/data/cv"], P19_START).length === 0, "CV files changed")
  check(git("status", "--porcelain", "--", "cv").stdout.trim() === "", "the working tree has a CV change")
  check(!lines(git("diff", "--cached", "--name-only")).some((f) => /^(cv\/|_references|_books|_papers|_reports|brand\/)/.test(f)), "a private or CV file is staged")
})

await test("NUCINT-055", "The tab row stays on screen on Home only, on pointer devices, without touching the folders (D-144)", async (check) => {
  const css = await read("src/styles/home-tabs.css")
  const code = css.replace(/\/\*[\s\S]*?\*\//g, "")
  check(/@media \(hover: hover\) and \(pointer: fine\)/.test(code) && /@supports \(container-type: scroll-state\)/.test(code), "the rule is not limited to hovering, fine pointers and browsers that can do it")
  check(/\.page\[data-page-path="\/"\] \.gl-folder\[data-level="1"\] > \.gl-folder__strip\s*\{[^}]*position:\s*sticky/.test(code), "the global row on Home is not made sticky")
  check(!/(^|\n)\s*\.gl-folder/.test(code.replace(/\.page\[data-page-path="\/"\][^{]*\{/g, "")), "a rule reaches the folders of other pages")
  check(/animation-timeline:\s*scroll\(root\)/.test(code) && /animation-name:\s*var\(--_raise\)/.test(code) && !/(^|[\s;{])animation:/.test(code), "the raise is not written as longhands with a variable (a minifier would fold it into a shorthand Chromium drops)")
  check(/stuck: top/.test(code) && /background-color:\s*var\(--color-shell\)/.test(code) && !/#[0-9a-f]{3,8}\b/i.test(code), "the stuck band is not the shell token")
  check(changed(["src/styles/folders.css", "src/components/folders", "src/scripts/folder-rows.ts", "src/scripts/folder-previews.ts"], P19_START).length === 0, "the folders changed")
  const stage = await read("src/components/home/NucleusStage.astro")
  check(/import "\.\.\/\.\.\/styles\/home-tabs\.css"/.test(stage), "the stage does not import the stylesheet")
  const users = []
  for (const dir of ["src/pages", "src/layouts", "src/components"]) {
    const walk = async (d) => (await Promise.all((await readdir(d, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)])))).flat()
    for (const f of await walk(join(repo, dir))) if (/home-tabs\.css/.test(await readFile(f, "utf8"))) users.push(f.replace(repo, ""))
  }
  check(json(users) === json(["src/components/home/NucleusStage.astro"]), `imported by ${json(users)}`)
  const pages = (await readdir(dist, { recursive: true })).filter((f) => f.endsWith(".html"))
  const withRule = []
  for (const f of pages) if (/scroll-state/.test(await readFile(join(dist, f), "utf8"))) withRule.push(f)
  const sheets = (await readdir(join(dist, "_astro"))).filter((f) => f.endsWith(".css"))
  for (const f of sheets) if (/scroll-state/.test(await readFile(join(dist, "_astro", f), "utf8"))) withRule.push(`_astro/${f}`)
  check(json(withRule) === json(["index.html"]), `the sticky rule is in ${json(withRule)}`)
  check(/@keyframes gl-home-tabs-raise/.test(homeHtml) && /animation-name:var\(--_raise\)/.test(homeHtml), "the built rule lost its animation")
})

let failed = 0
for (const { id, title, failures, skipped } of results) {
  if (skipped) console.log(`SKIP ${id} ${title} (${skipped})`)
  else if (failures.length === 0) console.log(`PASS ${id} ${title}`)
  else {
    failed++
    console.log(`FAIL ${id} ${title}`)
    for (const message of failures.slice(0, 8)) console.log(`  - ${message}`)
  }
}
console.log(failed === 0 ? `\n${results.length} checks passed.` : `\n${failed} of ${results.length} checks failed.`)
process.exit(failed === 0 ? 0 : 1)
