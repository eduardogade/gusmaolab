// Automated accessibility in a real, headless Chromium (P22, D-154): axe-core on representative pages, and the
// checks axe cannot make: keyboard reach and visible focus on the folder tabs, reduced motion, the nucleus
// without WebGL, the world clocks' markup, and the development quality page's discoverability.
//
// It reads two builds on two local origins: dist/ (the release: the pages the public gets) and dist-demo/
// (`npm run demo:build`, run first by `npm run test:browser`: the synthetic Greenhouse articles and the
// development specimens), and a throwaway build with scheduling enabled on a SYNTHETIC link, so the page
// the owner will one day publish is scanned too. The provider is never contacted.
//
// What this shows: no axe-core violation on those pages outside the register in
// development/qa-a11y-register.json, and the behaviours above. What it does NOT show: that the site meets WCAG.
// Automated rules find only part of the problems (axe's own estimate is about a third); reading order, link
// purpose in context, the quality of alt text and of headings, focus management in the real flow, screen reader
// output, magnification, and cognitive load need a person. Those are listed for P23 in
// development/quality-assurance.md. Without a browser or either build, every check is reported NOT RUN (exit 2).
import { existsSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { json, serveFolder, sleep, startBrowser } from "./browser-harness.mjs"
import { buildWith } from "./scheduling-ready-build.mjs"

const IDS = ["A11Y-001", "A11Y-002", "A11Y-KEYBOARD", "A11Y-FOCUS", "A11Y-MOTION", "A11Y-NUCLEUS", "A11Y-CLOCKS", "A11Y-SKIP", "A11Y-SCROLL", "QA-INSPECT-01", "QA-INSPECT-02"]
const repo = fileURLToPath(new URL("../", import.meta.url))
const releaseDir = join(repo, "dist")
const demoDir = join(repo, "dist-demo")
const axePath = join(repo, "node_modules/axe-core/axe.min.js")
if (!existsSync(join(releaseDir, "index.html")) || !existsSync(join(demoDir, "index.html")) || !existsSync(axePath)) {
  for (const id of IDS) console.log(`NOT RUN ${id}`)
  console.error("NOT RUN: needs dist/ (npm run build), dist-demo/ (npm run demo:build) and axe-core (npm ci).")
  process.exit(2)
}
const axeSource = await readFile(axePath, "utf8")
const axeVersion = JSON.parse(await readFile(join(repo, "node_modules/axe-core/package.json"), "utf8")).version
const register = JSON.parse(await readFile(join(repo, "development/qa-a11y-register.json"), "utf8"))

const release = await serveFolder(releaseDir)
const demo = await serveFolder(demoDir)
const ready = await buildWith()
if (!ready.ok) {
  console.error(`FAIL: the throwaway ready build failed:\n${ready.output.slice(-500)}`)
  process.exit(1)
}
const readyServer = await serveFolder(ready.dist)
const origins = { release: release.origin, demo: demo.origin, ready: readyServer.origin }

const { send, on, js, setViewport, press, test, finish, viewTransitionOver } = await startBrowser({ ids: IDS, timeout: 600_000, root: "dist", external: release.origin, chromeArgs: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] })
// Everything the page does is on record: a provider request would be a defect, and is blocked anyway.
await send("Fetch.enable", { patterns: [{ urlPattern: "https://*" }] })
const external = []
on("Fetch.requestPaused", (e) => {
  external.push(e.request.url)
  send("Fetch.failRequest", { requestId: e.requestId, errorReason: "BlockedByClient" })
})
const goto = async (source, path) => {
  const loaded = new Promise((resolve) => {
    const off = on("Page.loadEventFired", () => {
      off()
      resolve()
    })
  })
  await send("Page.navigate", { url: `${origins[source]}${path}` })
  await loaded
  await sleep(250)
}
const waitFor = async (expression, ms = 8000) => {
  for (let t = 0; t < ms; t += 80) {
    if (await js(expression).catch(() => false)) return true
    await sleep(80)
  }
  return false
}

const PAGES = [
  ["home", "release", "/"],
  ["about", "release", "/about/"],
  ["contact", "release", "/contact/"],
  ["schedule", "release", "/schedule/"],
  ["portfolio", "release", "/portfolio/"],
  ["cv", "release", "/cv/"],
  ["cv-research", "release", "/cv/research/"],
  ["lab", "release", "/lab/"],
  ["blog", "release", "/blog/"],
  ["lecture-notes", "release", "/lecture-notes/"],
  ["greenhouse", "release", "/lecture-notes/greenhouse/"],
  ["writing", "release", "/writing/"],
  ["bearnards-area", "release", "/bearnards-area/"],
  ["not-found", "release", "/404.html"],
  ["schedule-ready-synthetic", "ready", "/schedule/"],
  ["greenhouse-article-demo", "demo", "/lecture-notes/greenhouse/demo-scientific-markdown/"],
  ["quarto-article-demo", "demo", "/lecture-notes/greenhouse/demo-synthetic-signals/"],
  ["scheduling-specimen", "demo", "/_design/scheduling/"],
  ["nucleus-specimen", "demo", "/_design/nucleus/"],
  ["quality-overview", "demo", "/_design/quality/"],
]
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]
const registered = (rule, name) => register.entries.some((e) => e.rule === rule && (e.pages.includes("*") || e.pages.includes(name)))

const scanned = []
await setViewport(1280, 900)
await test("A11Y-001", "axe-core finds no violation outside the register on the representative pages", async (check) => {
  for (const [name, source, path] of PAGES) {
    await goto(source, path)
    if (name === "home") await waitFor(`["ready", "static", "fallback"].includes(document.querySelector("[data-nucleus-frame]")?.dataset.nucleusState)`, 15000)
    await js(axeSource)
    const result = await send("Runtime.evaluate", { expression: `axe.run(document, { runOnly: { type: "tag", values: ${json(TAGS)} }, resultTypes: ["violations", "incomplete"] }).then((r) => ({ violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })), incomplete: r.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.length })), passes: r.passes.length }))`, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) {
      check(false, `${name}: axe failed: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`)
      continue
    }
    const r = result.result.value
    const outside = r.violations.filter((v) => !registered(v.id, name))
    const known = r.violations.filter((v) => registered(v.id, name))
    scanned.push({ name, source, path, violations: outside, registered: known, incomplete: r.incomplete, passes: r.passes })
    for (const v of outside) check(false, `${name} (${path}): ${v.id} [${v.impact}] ${v.help}: ${v.nodes} node(s), e.g. ${v.targets.join(" | ")}`)
  }
  check(scanned.length === PAGES.length, `${scanned.length} of ${PAGES.length} pages were scanned`)
  check(external.length === 0, `a page requested an external resource: ${json(external.slice(0, 3))}`)
})

await test("A11Y-002", "Everything axe reports as 'needs review' is recorded for the manual review (P23)", async (check) => {
  const incomplete = {}
  for (const p of scanned) for (const i of p.incomplete) (incomplete[i.id] ??= new Set()).add(p.name)
  const summary = Object.fromEntries(Object.entries(incomplete).map(([id, set]) => [id, [...set]]))
  check(scanned.length > 0, "nothing was scanned")
  console.log(`  INFO axe 'needs review' (not violations): ${json(summary)}`)
})

await test("A11Y-KEYBOARD", "Every top-level tab is reachable by keyboard on Home, in order, with a visible focus indicator", async (check) => {
  await goto("release", "/")
  await js(`document.activeElement?.blur(); window.scrollTo(0, 0)`)
  const reached = []
  const noRing = []
  for (let i = 0; i < 80 && reached.length < 11; i++) {
    await press("Tab")
    const at = await js(`(() => { const el = document.activeElement; const tab = el?.closest?.(".gl-folder-tab"); if (!tab || tab.closest('[data-level="1"]') === null && !tab.closest(".gl-folders")) return null; const s = getComputedStyle(el); return { id: tab.dataset.tabId, href: el.getAttribute("href"), ring: el.matches(":focus-visible") && ((s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none") } })()`)
    if (at && at.href && !reached.some((r) => r.id === at.id)) {
      reached.push(at)
      if (!at.ring) noRing.push(at.id)
    }
  }
  const ids = reached.map((r) => r.id)
  check(ids.length >= 11, `only ${ids.length} tabs reached by Tab: ${json(ids)}`)
  check(json(ids.slice(0, 11)) === json(["home", "about", "contact", "schedule", "portfolio", "cv", "lab", "blog", "lecture-notes", "writing", "bearnards-area"]), `the tab order is ${json(ids)}`)
  check(noRing.length === 0, `no focus indicator on: ${json(noRing)}`)
})

// P23 (D-161, WCAG 2.4.1): the folder rows hold about forty links before any content, because every folder's preview lists its
// children and those links are in the tab order. The first Tab stop is a link that skips them.
await test("A11Y-SKIP", "A skip link is the first Tab stop on every kind of page, is drawn only while focused, and puts the next Tab in the content", async (check) => {
  const luminance = (rgb) => {
    const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map((v) => { const c = Number(v) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  for (const [source, path] of [["release", "/"], ["release", "/lab/"], ["release", "/cv/teaching/"], ["release", "/404.html"], ["demo", "/lecture-notes/greenhouse/demo-synthetic-signals/"]]) {
    await goto(source, path)
    await js(`document.activeElement?.blur(); window.scrollTo(0, 0)`)
    const hidden = await js(`(() => { const e = document.querySelector(".gl-skip-link"); const r = e.getBoundingClientRect(); return { width: r.width, height: r.height, first: document.querySelector("body > a, body a") === e } })()`)
    check(hidden.first && hidden.width <= 2 && hidden.height <= 2, `${path}: the skip link is the page's first link and is drawn when it has no focus: ${json(hidden)}`)
    await press("Tab")
    const at = await js(`(() => { const e = document.activeElement; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { cls: e.className, text: e.textContent.trim(), href: e.getAttribute("href"), drawn: r.width > 100 && r.height > 20 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, color: cs.color, background: cs.backgroundColor, ring: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0, target: !!document.querySelector("main#content") } })()`)
    check(at.cls === "gl-skip-link" && at.href === "#content" && /skip/i.test(at.text), `${path}: the first Tab stop is ${json(at)}`)
    check(at.drawn && at.ring, `${path}: the focused skip link is not drawn on screen with a focus ring: ${json(at)}`)
    const [a, b] = [luminance(at.color), luminance(at.background)]
    check((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, `${path}: the skip link's text has less than 4.5:1 against its card (${at.color} on ${at.background})`)
    check(at.target, `${path}: there is no main#content for it to go to`)
    await press("Enter")
    check((await js(`location.hash`)) === "#content", `${path}: Enter did not follow the link (hash ${await js(`location.hash`)})`)
    await press("Tab")
    // A page whose content has nothing to focus (a page in preparation) has nowhere to land: the Tab then leaves the page's
    // links, and must not return to the folder rows the skip link skipped.
    const content = await js(`({ focusable: !!document.querySelector("main a[href], main button, main [tabindex='0']"), inMain: !!document.activeElement?.closest("main"), inRows: !!document.activeElement?.closest(".gl-folder__strip"), at: document.activeElement?.tagName + " " + (document.activeElement?.textContent || "").trim().slice(0, 30) })`)
    check(content.focusable ? content.inMain : !content.inRows, `${path}: after the skip link the next Tab went to ${json(content)}`)
  }
})

// P23 (D-161): a region that scrolls sideways must be reachable by keyboard (WCAG 2.1.1). Chrome and Firefox scroll a wide display
// equation inside the <math> itself; code blocks and tables are D-160's. Checked on the articles, on a phone, with the text enlarged
// and on a laptop, whatever the fonts: every region that has something to scroll can take focus. The folder rows scroll by design
// (P08) and are reached by their own links.
await test("A11Y-SCROLL", "Every region of an article that scrolls sideways can take keyboard focus, on a phone, with enlarged text and on a laptop", async (check) => {
  const scrollers = `[...document.querySelectorAll("main *")].filter((e) => { const cs = getComputedStyle(e); return (cs.overflowX === "auto" || cs.overflowX === "scroll") && e.scrollWidth > e.clientWidth + 1 && e.getBoundingClientRect().width > 0 && !e.closest(".gl-folder__strip") }).map((e) => ({ el: e.tagName.toLowerCase() + (e.id ? "#" + e.id.slice(0, 16) : "") + "." + String(e.className).split(" ")[0].slice(0, 20), focusable: e.tabIndex >= 0 }))`
  let seen = 0
  let equations = 0
  for (const [width, scale] of [[320, 1], [390, 1], [390, 2], [768, 2], [1280, 1]]) {
    await setViewport(width, 900)
    for (const path of ["/lecture-notes/greenhouse/demo-synthetic-signals/", "/lecture-notes/greenhouse/demo-scientific-markdown/", "/lecture-notes/greenhouse/demo-markdown-and-quarto/"]) {
      await goto("demo", path)
      if (scale !== 1) await js(`(() => { const s = document.createElement("style"); s.textContent = "html { font-size: ${scale * 100}% !important }"; document.head.append(s) })()`)
      await sleep(200)
      const found = await js(scrollers)
      seen += found.length
      const loose = found.filter((f) => !f.focusable)
      check(loose.length === 0, `${path} at ${width} px${scale === 1 ? "" : `, text ${scale * 100}%`}: a scrolling region cannot take keyboard focus: ${json(loose)}`)
      if (path.includes("synthetic-signals")) equations += await js(`document.querySelectorAll("main math[display=block][tabindex='0']").length`)
    }
  }
  await setViewport(1280, 900)
  check(seen >= 10, `only ${seen} scrolling regions were found across the articles: the check guards too little`)
  check(equations >= 10, `only ${equations} display equations were seen with a tab stop`)
  // Two nested boxes around one equation would be a scroller with nothing to focus (Firefox scrolled both before D-161).
  await goto("demo", "/lecture-notes/greenhouse/demo-synthetic-signals/")
  check((await js(`[...document.querySelectorAll("main span[id^='eq-']")].filter((s) => getComputedStyle(s).overflowX !== "visible").length`)) === 0, "the span that names an equation is a second scrolling box")
})

await test("A11Y-FOCUS", "Links and controls on representative pages show a focus indicator", async (check) => {
  for (const [source, path, selector] of [["release", "/contact/", "main a, a"], ["release", "/portfolio/", "main a, a"], ["demo", "/_design/scheduling/", "main button"], ["ready", "/schedule/", "[data-schedule-fallback] a"]]) {
    await goto(source, path)
    let shown = null
    for (let i = 0; i < 100 && shown === null; i++) {
      await press("Tab")
      if (await js(`document.activeElement?.matches(${json(selector)}) && !!document.activeElement.closest("main")`)) shown = await js(`(() => { const el = document.activeElement; const s = getComputedStyle(el); return el.matches(":focus-visible") && ((s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none") })()`)
    }
    check(shown === true, `${path}: ${shown === null ? "no matching control took keyboard focus" : "the focused control shows no indicator"}`)
  }
})

await test("A11Y-MOTION", "Reduced motion: nothing animates except the one accepted D-144 raise, and the nucleus is still", async (check) => {
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] })
  try {
    for (const path of ["/", "/contact/", "/cv/"]) {
      await goto("release", path)
      const moving = await js(`[...document.querySelectorAll("body *")].filter((el) => { const s = getComputedStyle(el); const names = s.animationName.split(",").map((n) => n.trim()).filter((n) => n !== "none" && n !== "gl-home-tabs-raise"); return names.length > 0 || (s.transitionDuration.split(",").some((d) => parseFloat(d) > 0) && s.transitionProperty !== "none") }).length`)
      check(moving === 0, `${path}: ${moving} elements animate or transition under reduced motion`)
    }
    // A tall window puts the stage within the lazy-load margin (D-143: it is far below the tabs on a short one).
    await setViewport(1440, 3400)
    await goto("release", "/")
    check(await waitFor(`document.querySelector("[data-nucleus-frame]")?.dataset.nucleusState === "static"`, 15000), `the nucleus is "${await js(`document.querySelector("[data-nucleus-frame]")?.dataset.nucleusState`)}", not still, under reduced motion`)
  } finally {
    await send("Emulation.setEmulatedMedia", { features: [] })
    await setViewport(1280, 900)
  }
})

await test("A11Y-NUCLEUS", "Without WebGL the nucleus is a still picture, the tabs still navigate, and the canvas never takes focus or clicks", async (check) => {
  await setViewport(1440, 3400)
  await goto("release", "/")
  await waitFor(`["ready", "static"].includes(document.querySelector("[data-nucleus-frame]")?.dataset.nucleusState)`, 15000)
  const canvas = await js(`(() => { const c = document.querySelector("[data-nucleus-frame] canvas"); if (!c) return null; const s = getComputedStyle(c); return { tabindex: c.getAttribute("tabindex"), pe: s.pointerEvents, focusable: c.tabIndex >= 0 } })()`)
  check(canvas !== null && canvas.pe === "none" && canvas.tabindex === null && canvas.focusable === false, `the canvas is ${json(canvas)}`)
  const script = await send("Page.addScriptToEvaluateOnNewDocument", { source: `HTMLCanvasElement.prototype.getContext = function () { return null }` })
  try {
    await goto("release", "/")
    check(await waitFor(`["fallback", "static", "picture"].includes(document.querySelector("[data-nucleus-frame]")?.dataset.nucleusState)`, 15000), "the stage did not settle without WebGL")
    const state = await js(`({ state: document.querySelector("[data-nucleus-frame]")?.dataset.nucleusState, picture: !!document.querySelector("[data-nucleus-frame] svg"), canvasShown: [...document.querySelectorAll("[data-nucleus-frame] canvas")].some((c) => c.getBoundingClientRect().width > 0 && getComputedStyle(c).visibility !== "hidden" && !c.hidden) })`)
    check(state.state !== "ready" && state.picture, `without WebGL: ${json(state)}`)
    await js(`document.querySelector('.gl-folder-tab[data-tab-id="contact"] a').click()`)
    check(await waitFor(`location.pathname === "/contact/"`, 5000), "the Contact tab did not navigate without WebGL")
  } finally {
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: script.identifier })
    await setViewport(1280, 900)
  }
})

await test("A11Y-CLOCKS", "The eight clocks pair each city with its time, in 24-hour form, and are not a live region", async (check) => {
  await goto("release", "/")
  // The page is static: the clocks read --:-- until the page's own script fills them. Wait for that state, not for
  // a time (the first GitHub run, P22-A01, read them before a slower machine had run the script).
  await waitFor(`(() => { const r = document.querySelector('[data-home-region="clocks"]'); const t = r ? [...r.querySelectorAll("time, [data-clock-time]")] : []; return t.length === 8 && t.every((e) => /\\d\\d:\\d\\d/.test(e.textContent)) })()`, 10000)
  const clocks = await js(`(() => { const r = document.querySelector('[data-home-region="clocks"]'); if (!r) return null; const items = [...r.querySelectorAll("li, [data-clock]")].filter((el) => el.querySelector("time, [data-clock-time]")); return { count: items.length, live: r.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]').length + (r.matches('[aria-live], [role="status"], [role="alert"], [role="log"]') ? 1 : 0), rows: items.map((el) => ({ text: el.innerText.replace(/\\s+/g, " ").trim(), time: (el.querySelector("time, [data-clock-time]")?.textContent ?? "").trim(), datetime: el.querySelector("time")?.getAttribute("datetime") })) } })()`)
  check(clocks !== null && clocks.count === 8, `${clocks?.count} clocks found`)
  if (clocks) {
    check(clocks.live === 0, `${clocks.live} live regions inside the clocks: every update would be announced`)
    for (const row of clocks.rows) check(/\b([01]\d|2[0-3]):[0-5]\d\b/.test(row.time) && row.text.length > row.time.length, `a clock does not pair a city with a 24-hour time: ${json(row)}`)
  }
})

await test("QA-INSPECT-01", "The quality overview is reached by clicking from the local homepage", async (check) => {
  await setViewport(1440, 900)
  await goto("demo", "/")
  const click = async (selector) => {
    const point = await js(`(() => { const el = document.querySelector(${json(selector)}); if (!el) return null; el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
    if (!point) throw new Error(`nothing matches ${selector}`)
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: point.x, y: point.y, button: "left", clickCount: 1 })
  }
  await click('a[href="/_design/site-map/"]')
  check(await waitFor(`location.pathname === "/_design/site-map/"`, 6000), "the site map is not one click from Home")
  await viewTransitionOver() // the next click must not land in the cross-fade (a runner's first run, P22-A01)
  check(await js(`[...document.querySelectorAll("main a")].some((a) => a.getAttribute("href") === "/_design/quality/" && a.textContent.trim() === "Quality Assurance")`), "the site map does not list Quality Assurance")
  await click('a[href="/_design/quality/"]')
  check(await waitFor(`location.pathname === "/_design/quality/"`, 6000), "did not arrive at the quality overview")
  check(await js(`!!document.querySelector("[data-quality-overview]") && document.querySelectorAll(".gl-folder-tab").length >= 11`), "the overview or the folder tabs are missing")
  check(await js(`!!document.querySelector("[data-quality-freshness]") || !!document.querySelector("[data-quality-empty]")`), "the page neither says how current its report is nor explains that there is none")
  check(await js(`document.querySelectorAll("main button, main form, main input").length === 0`), "the read-only overview has a control")
})

await test("QA-INSPECT-02", "The quality overview and its data are not in the release", async (check) => {
  for (const path of ["/_design/quality/", "/_design/quality"]) {
    const r = await fetch(`${release.origin}${path}`)
    check(r.status === 404, `${path} answers ${r.status} on the release build`)
  }
  const home = await (await fetch(`${release.origin}/`)).text()
  check(!/_design\/quality|data-quality-overview|qa-report/.test(home), "the release Home links the overview")
})

// Records for the report and the owner (not committed: qa-report/ is ignored).
const reportDir = process.env.QA_REPORT_DIR ?? join(repo, "qa-report")
try {
  const { mkdir } = await import("node:fs/promises")
  await mkdir(reportDir, { recursive: true })
  await writeFile(join(reportDir, "accessibility.json"), JSON.stringify({ tool: `axe-core ${axeVersion}`, tags: TAGS, viewport: "1280x900", generatedAt: new Date().toISOString(), pages: scanned.map((p) => ({ name: p.name, source: p.source, path: p.path, violations: p.violations.length, registered: p.registered.length, needsReview: p.incomplete.length, rulesPassed: p.passes })), violations: scanned.reduce((n, p) => n + p.violations.length, 0), registered: scanned.reduce((n, p) => n + p.registered.length, 0), registeredIssues: scanned.flatMap((p) => p.registered.map((v) => ({ page: p.name, rule: v.id, impact: v.impact, nodes: v.nodes }))), limitations: "Automated rules find only part of the accessibility problems; manual review remains (P23)." }, null, 2))
} catch {}

release.server.close()
demo.server.close()
readyServer.server.close()
await ready.cleanup()
await send("Fetch.disable")
await finish()
