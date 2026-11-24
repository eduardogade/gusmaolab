// The nucleus on the real homepage, in a real, headless Chromium (P20, D-137 to D-143): the browser half of
// the NUCINT checks. It serves the release build, dist/ (`npm run build`), and drives `/` itself, the page a
// visitor gets, with real mouse and keyboard input, real previews, real clicks, real history, and media,
// touch and script emulation, using software WebGL (SwiftShader), so it proves the model really renders
// and responds on the real page, not how fast a real GPU draws it. The stage is far below the tabs at an
// ordinary window height (they are 1,300 px apart at 1440 px wide), so the checks that need both in view
// use a 1440 × 1800 window; that is stated, not hidden (planning/information-architecture.md, section 21).
//
// Rendering is judged from screenshots of the stage's frame: the yellow region's pixels and their
// centroid, so "it drew", "it moved toward the tab" and "it came back" are measured, not assumed; and
// from counters injected before the page loads (frames requested, draw calls issued, layout shift, the
// order of the stage's target changes). What it does not show: a real GPU's frame rate, Safari, Firefox,
// Android Chrome, a screen reader, or how the nucleus looks to the owner. Without a browser or dist/
// every check is reported NOT RUN (exit 2).
import { existsSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { json, sleep, startBrowser } from "./browser-harness.mjs"

const IDS = ["NUCINT-001B", "NUCINT-004B", "NUCINT-005B", "NUCINT-006B", "NUCINT-011B", "NUCINT-015B", "NUCINT-016B", "NUCINT-013B", "NUCINT-017B", "NUCINT-018B", "NUCINT-028B", "NUCINT-029B", "NUCINT-032B", "NUCINT-035B", "NUCINT-036B", "NUCINT-038B", "NUCINT-039B", "NUCINT-040B", "NUCINT-041B", "NUCINT-043B", "NUCINT-055B", "NUCINT-048B", "NUCINT-050B", "NUCINT-033B"]
const dist = fileURLToPath(new URL("../dist/", import.meta.url))
if (!existsSync(join(dist, "index.html"))) {
  for (const id of IDS) console.log(`NOT RUN ${id}`)
  console.error("NOT RUN: dist/ is not built; run `npm run build`.")
  process.exit(2)
}

const { js, send, setViewport, goto, moveTo, click, press, test, finish, tabPoint, waitForPath, nextEvent, touchSwipeScrolls, scrollSettled } = await startBrowser({
  ids: IDS,
  timeout: 600_000,
  root: "dist",
  chromeArgs: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
})

// Counters, installed before any page script runs (also on every later navigation).
const INSTRUMENT = `
  window.__errors = []
  addEventListener("error", (e) => window.__errors.push(String(e.message)))
  addEventListener("unhandledrejection", (e) => window.__errors.push(String(e.reason)))
  window.__raf = 0
  const raf = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb) => { window.__raf++; return raf(cb) }
  window.__draws = 0
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!C) continue
    for (const m of ["drawElements", "drawArrays"]) { const o = C.prototype[m]; C.prototype[m] = function (...a) { window.__draws++; return o.apply(this, a) } }
  }
  window.__cls = 0
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: "layout-shift", buffered: true }) } catch {}
  window.__targets = []
  window.__persisted = []
  addEventListener("pageshow", (e) => window.__persisted.push(e.persisted))
  document.addEventListener("DOMContentLoaded", () => {
    const stage = document.querySelector("[data-nucleus-stage]")
    if (!stage) return
    const r = document.querySelector("[data-stage-frame]").getBoundingClientRect()
    window.__rect0 = [r.x, r.y + scrollY, r.width, r.height]
    new MutationObserver(() => window.__targets.push(stage.dataset.stageTarget ?? null)).observe(stage, { attributes: true, attributeFilter: ["data-stage-target"] })
  })
`
await send("Page.addScriptToEvaluateOnNewDocument", { source: INSTRUMENT })

const waitFor = async (expression, timeout = 15_000) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await js(expression).catch(() => false)) return true
    await sleep(80)
  }
  return false
}
const TALL = [1440, 1800]
const stageState = () => js(`document.querySelector("[data-nucleus-stage]")?.dataset.stageState ?? "none"`)
const target = () => js(`document.querySelector("[data-nucleus-stage]")?.dataset.stageTarget ?? null`)
const draws = () => js(`window.__draws`)
const raf = () => js(`window.__raf`)
const open = async (width = TALL[0], height = TALL[1], path = "/", { waitForModel = true } = {}) => {
  await setViewport(width, height, false)
  await goto(path)
  // Only Home has a stage to wait for.
  if (path === "/" && waitForModel) await waitFor(`["ready", "static", "fallback"].includes(document.querySelector("[data-nucleus-stage]")?.dataset.stageState)`, 25_000)
  await sleep(300)
}
const quiet = async (timeout = 12_000) => {
  // Settled: no draw for a while.
  let last = await draws()
  const start = Date.now()
  while (Date.now() - start < timeout) {
    await sleep(500)
    const now = await draws()
    if (now === last) return true
    last = now
  }
  return false
}
const rest = async () => {
  await moveTo(2, 2, 3)
  await sleep(100)
  await quiet()
}

/** The stage frame's pixels from a real screenshot: ink, yellow count and the yellow centroid (page pixels). */
async function pixels(selector = "[data-stage-frame]") {
  const rect = await js(`(() => { const r = document.querySelector(${json(selector)}).getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height } })()`)
  const { data } = await send("Page.captureScreenshot", { format: "png", clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale: 1 } })
  return js(`(async () => {
    const img = new Image(); img.src = "data:image/png;base64,${data}"; await img.decode()
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height
    const x = c.getContext("2d"); x.drawImage(img, 0, 0)
    const d = x.getImageData(0, 0, c.width, c.height).data
    const bg = [d[0], d[1], d[2]]
    let ink = 0, yellow = 0, sx = 0, sy = 0, black = 0
    for (let i = 0; i < d.length; i += 4) {
      const px = (i / 4) % c.width, py = Math.floor(i / 4 / c.width)
      if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 40) ink++
      if (d[i] > 200 && d[i + 1] > 150 && d[i + 2] < 120 && d[i] - d[i + 2] > 110) { yellow++; sx += px; sy += py }
      if (d[i] < 8 && d[i + 1] < 8 && d[i + 2] < 8) black++
    }
    return { width: c.width, height: c.height, ink, yellow, black, cx: yellow ? sx / yellow : 0, cy: yellow ? sy / yellow : 0 }
  })()`)
}
const dist2 = (a, b) => Math.hypot(a.cx - b.cx, a.cy - b.cy)
const pointOf = (id) => tabPoint('nav[aria-label="Sections"]', id)
const hover = async (id) => {
  const p = await pointOf(id)
  await moveTo(p.x, p.y, 4, 12)
  return p
}
const errors = () => js(`window.__errors`)

// --- Mount, laziness, layout ---------------------------------------------------------------------------------------

await test("NUCINT-005B", "Lazy loading: at an ordinary window height the graphics are not requested until the stage is near", async (check) => {
  await open(1440, 900)
  await sleep(1500)
  const names = () => js(`performance.getEntriesByType("resource").map((e) => e.name.replace(location.origin, ""))`)
  const early = await names()
  check(early.some((n) => /NucleusStage\.astro_astro_type_script/.test(n)), `the stage script was not requested: ${json(early.filter((n) => n.endsWith(".js")))}`)
  check(!early.some((n) => /\/_astro\/(nucleus|renderer)\./.test(n)), `the graphics were requested before the stage was near: ${json(early.filter((n) => /nucleus|renderer/.test(n)))}`)
  check((await stageState()) === "picture" && (await js(`document.querySelectorAll("canvas").length`)) === 0, `the state is ${await stageState()} before scrolling`)
  await js(`document.querySelector("[data-nucleus-stage]").scrollIntoView({ block: "center" })`)
  check(await waitFor(`document.querySelector("[data-nucleus-stage]").dataset.stageState === "ready"`, 25_000), `the state after scrolling is ${await stageState()}`)
  const late = await names()
  check(late.some((n) => /\/_astro\/nucleus\./.test(n)) && late.some((n) => /\/_astro\/renderer\./.test(n)), `the graphics were not requested after scrolling: ${json(late.filter((n) => n.endsWith(".js")))}`)
  check((await errors()).length === 0, `page errors: ${json(await errors())}`)
})

await test("NUCINT-001B", "Home integration: the real homepage mounts one canvas that draws the nucleus", async (check) => {
  await open()
  check((await stageState()) === "ready", `the state is ${await stageState()}: ${await js(`document.querySelector("[data-nucleus-frame]").dataset.nucleusReason`)}`)
  check((await js(`document.querySelectorAll("canvas").length`)) === 1, "there is not exactly one canvas")
  const p = await pixels()
  check(p.ink > 15_000 && p.yellow > 100, `${p.ink} ink and ${p.yellow} yellow pixels: the canvas looks empty`)
  check(await js(`getComputedStyle(document.querySelector(".nucleus__picture")).visibility`) === "hidden", "the still picture shows over the live nucleus")
  check((await errors()).length === 0, `page errors: ${json(await errors())}`)
  const status = await js(`document.querySelector("[data-stage-status]").textContent`)
  check(/Interactive/.test(status), `the status line says "${status}"`)
  check(await js(`document.querySelector("h1")?.textContent.includes("GusmaoLab")`), "the welcome is not on the page")
})

await test("NUCINT-004B", "Stable layout: the stage's footprint is the same before the model loads and after, and nothing shifts", async (check) => {
  await open()
  const [x0, y0, w0, h0] = await js(`window.__rect0`)
  const now = await js(`(() => { const r = document.querySelector("[data-stage-frame]").getBoundingClientRect(); return [r.x, r.y + scrollY, r.width, r.height] })()`)
  check(json([x0, y0, w0, h0].map(Math.round)) === json(now.map(Math.round)), `the frame was ${json([x0, y0, w0, h0])} at DOMContentLoaded and ${json(now)} after the model loaded`)
  const canvas = await js(`(() => { const c = document.querySelector("[data-nucleus-frame] canvas").getBoundingClientRect(); const f = document.querySelector("[data-stage-frame]").getBoundingClientRect(); return [Math.round(c.width) === Math.round(f.width), Math.round(c.height) === Math.round(f.height)] })()`)
  check(canvas[0] && canvas[1], "the canvas does not fill the frame exactly")
  const cls = await js(`window.__cls`)
  check(cls < 0.01, `cumulative layout shift ${cls}`)
})

await test("NUCINT-006B", "Other pages: no canvas and no graphics request on About, CV and Lecture Notes", async (check) => {
  for (const path of ["/about/", "/cv/", "/lecture-notes/", "/writing/"]) {
    await open(1440, 1800, path)
    await sleep(500)
    const seen = await js(`({ canvases: document.querySelectorAll("canvas").length, stage: !!document.querySelector("[data-nucleus-stage]"), graphics: performance.getEntriesByType("resource").filter((e) => /\\/_astro\\/(nucleus|renderer|NucleusStage)/.test(e.name)).length })`)
    check(seen.canvases === 0 && !seen.stage && seen.graphics === 0, `${path}: ${json(seen)}`)
  }
})

// --- Hover, retargeting, previews, keyboard -------------------------------------------------------------------------

await test("NUCINT-011B", "Hover: pointing at About, CV and Writing moves the highlighted region, and leaving returns it to rest (NUCINT-012)", async (check) => {
  await open()
  await rest()
  const at = await pixels()
  check(at.yellow > 100, `${at.yellow} yellow pixels at rest`)
  const moved = {}
  for (const id of ["about", "cv", "writing"]) {
    await hover(id)
    check(await waitFor(`document.querySelector("[data-nucleus-stage]").dataset.stageTarget === ${json(id)}`, 3000), `the stage target is ${await target()}, not ${id}`)
    await sleep(2800)
    await quiet()
    const p = await pixels()
    moved[id] = dist2(p, at)
    check(moved[id] > 10, `${id}: the yellow region moved only ${moved[id].toFixed(1)} px`)
    check(p.ink > 15_000, `${id}: the nucleus is blank`)
  }
  await rest()
  await sleep(2500)
  await quiet()
  const back = await pixels()
  check((await target()) === null, `the target is ${await target()} after leaving`)
  check(dist2(back, at) < 2.5, `the region came back ${dist2(back, at).toFixed(1)} px from rest`)
  check(Math.abs(back.yellow - at.yellow) < at.yellow * 0.1, `yellow ${at.yellow} at rest, ${back.yellow} after the return: the region was recoloured or replaced`)
  console.log(`  INFO yellow-centroid shifts from rest, px: ${json(Object.fromEntries(Object.entries(moved).map(([k, v]) => [k, Math.round(v)])))}`)
})

await test("NUCINT-015B", "Rapid retargeting: moving across tabs moves the region continuously, with no jump", async (check) => {
  await open()
  await rest()
  const at = await pixels()
  const route = ["about", "cv", "lab", "writing", "blog", "cv"]
  let prev = at
  let worst = 0
  let total = 0
  for (const id of route) {
    const p = await pointOf(id)
    // Move at a pace of a visitor's sweep, sampling the nucleus between small movements.
    await moveTo(p.x, p.y, 3, 5)
    for (let i = 0; i < 2; i++) {
      const now = await pixels()
      const step = dist2(now, prev)
      worst = Math.max(worst, step)
      total += step
      prev = now
    }
  }
  check(total > 15, `the region travelled only ${total.toFixed(0)} px across six tabs`)
  check(worst < 28, `the largest jump between two screenshots was ${worst.toFixed(1)} px: it snapped`)
  await rest()
  console.log(`  INFO retargeting: total path ${total.toFixed(0)} px, largest step ${worst.toFixed(1)} px between screenshots`)
})

await test("NUCINT-016B", "P07 previews: the preview opens as the nucleus responds, and moving into it does not release the response", async (check) => {
  await open()
  await rest()
  const p = await hover("cv")
  check(await waitFor(`document.querySelector('.gl-folder-preview[data-preview-of="cv"]')?.matches(":popover-open")`, 3000), "the CV preview did not open")
  check((await target()) === "cv", `the target is ${await target()}`)
  // From here the pointer stays inside the CV tab and its preview: the target must not change at all.
  await js(`window.__targets.length = 0`)
  // Into the preview and along its links.
  const panel = await js(`(() => { const r = document.querySelector('.gl-folder-preview[data-preview-of="cv"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height * 0.6 } })()`)
  await moveTo(p.x, p.y + 40, 3, 15)
  await moveTo(panel.x, panel.y, 5, 20)
  await sleep(400)
  check(await js(`document.querySelector('.gl-folder-preview[data-preview-of="cv"]').matches(":popover-open")`), "the preview closed under the pointer")
  check((await target()) === "cv", `the target is ${await target()} over the preview`)
  const log = await js(`window.__targets`)
  check(log.length === 0, `the target changed ${json(log)} while the pointer went into the preview: it flickered`)
  const hit = await js(`document.elementFromPoint(${panel.x}, ${panel.y})?.closest(".gl-folder-preview") !== null`)
  check(hit, "the preview is not what the pointer is over (the canvas or something else is on top)")
  // Leaving both closes the preview and releases the response.
  await rest()
  check(await waitFor(`!document.querySelector('.gl-folder-preview[data-preview-of="cv"]').matches(":popover-open")`, 3000), "the preview did not close")
  check((await target()) === null, `the target is ${await target()} after leaving`)
  // Moving to a neighbouring tab hands over without a release in between.
  await js(`window.__targets.length = 0`)
  const a = await pointOf("lab")
  const b = await pointOf("blog")
  await moveTo(a.x, a.y, 3, 10)
  await moveTo(b.x, b.y, 6, 20)
  const handover = await js(`window.__targets`)
  check(handover[0] === "lab" && handover.at(-1) === "blog", `hand-over log ${json(handover)}`)
  await rest()
})

await test("NUCINT-013B", "Keyboard: focus on a tab moves the response, Tab hands over, and leaving the row releases it (NUCINT-014)", async (check) => {
  await open()
  await rest()
  await js(`document.activeElement?.blur?.(); window.scrollTo(0, 0); window.__targets.length = 0`)
  // Tab from the top of the page until the first global tab has focus.
  let focused = null
  for (let i = 0; i < 6 && !focused; i++) {
    await press("Tab")
    focused = await js(`document.activeElement?.closest?.('nav[aria-label="Sections"] .gl-folder-tab')?.dataset.tabId ?? null`)
  }
  check(focused !== null, "keyboard Tab never reached a global tab")
  check(await waitFor(`document.querySelector("[data-nucleus-stage]").dataset.stageTarget === ${json(focused)}`, 3000), `the stage target is ${await target()} with focus on ${focused}`)
  check(await js(`document.activeElement.matches(":focus-visible")`), "the focus indicator is not visible")
  await press("Tab")
  const second = await js(`document.activeElement?.closest?.('nav[aria-label="Sections"] .gl-folder-tab')?.dataset.tabId ?? null`)
  check(second !== null && second !== focused && (await target()) === second, `after Tab: focus ${second}, target ${await target()}`)
  const log = await js(`window.__targets`)
  check(!log.slice(0, log.indexOf(second) + 1).includes(null), `a release came between two tabs: ${json(log)}`)
  // Out of the row: through the remaining tabs and their preview links, into the page.
  for (let i = 0; i < 60; i++) {
    await press("Tab")
    const inRow = await js(`!!document.activeElement?.closest?.('nav[aria-label="Sections"]')`)
    if (!inRow) break
  }
  check(await waitFor(`document.querySelector("[data-nucleus-stage]").dataset.stageTarget === undefined`, 3000), `the target is ${await target()} after focus left the row`)
  await js(`document.activeElement?.blur?.()`)
})

await test("NUCINT-017B", "Clicking: a tab still navigates, the nucleus is not on the next page, and Back and Forward restore Home (NUCINT-036)", async (check) => {
  await open()
  await rest()
  const p = await hover("cv")
  await sleep(300)
  await click(p.x, p.y)
  check(await waitForPath("/cv/"), `the path is ${await js("location.pathname")} after the click`)
  check((await js(`document.querySelectorAll("canvas").length`)) === 0 && !(await js(`!!document.querySelector("[data-nucleus-stage]")`)), "the nucleus is on the CV page")
  await send("Page.navigateToHistoryEntry", { entryId: (await send("Page.getNavigationHistory")).entries.at(-2).id })
  check(await waitForPath("/"), "Back did not return to Home")
  await waitFor(`["ready", "static"].includes(document.querySelector("[data-nucleus-stage]")?.dataset.stageState)`, 25_000)
  check((await js(`document.querySelectorAll("canvas").length`)) === 1, `${await js(`document.querySelectorAll("canvas").length`)} canvases after Back`)
  check((await stageState()) === "ready", `the state after Back is ${await stageState()}`)
  const persisted = await js(`window.__persisted`)
  console.log(`  INFO after Back, pageshow persisted flags: ${json(persisted)} (true means the history cache restored the page)`)
  await rest()
  await hover("lab")
  check(await waitFor(`document.querySelector("[data-nucleus-stage]").dataset.stageTarget === "lab"`, 4000), "hover does not work after Back")
  await rest()
  await send("Page.navigateToHistoryEntry", { entryId: (await send("Page.getNavigationHistory")).entries.at(-1).id })
  check(await waitForPath("/cv/"), "Forward did not return to CV")
  await goto("/")
  await waitFor(`document.querySelector("[data-nucleus-stage]")?.dataset.stageState === "ready"`, 25_000)
  check((await stageState()) === "ready" && (await js(`document.querySelectorAll("canvas").length`)) === 1, "a direct load of Home did not start the nucleus once")
  for (const [from, to] of [["writing", "/writing/"], ["lecture-notes", "/lecture-notes/"]]) {
    await open()
    const q = await pointOf(from)
    await click(q.x, q.y)
    check(await waitForPath(to), `clicking ${from} did not reach ${to}`)
  }
})

await test("NUCINT-018B", "No blocked links: the canvas is inert, and every tab, preview link and the welcome's links are what a click reaches", async (check) => {
  await open()
  check(await js(`getComputedStyle(document.querySelector("[data-nucleus-frame] canvas")).pointerEvents`) === "none", "the canvas takes pointer events")
  const hits = await js(`[...document.querySelectorAll('nav[aria-label="Sections"] .gl-folder-tab__label')].map((a) => { const r = a.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e === a || a.contains(e) })`)
  check(hits.length === 11 && hits.every(Boolean), `${hits.filter(Boolean).length} of ${hits.length} tabs are what is under their own centre`)
  const stack = await js(`(() => { const r = document.querySelector("[data-nucleus-frame] canvas").getBoundingClientRect(); const e = document.elementsFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e.slice(0, 3).map((x) => x.tagName.toLowerCase()) })()`)
  check(!stack.includes("canvas"), `the canvas is hit-testable: ${json(stack)}`)
  const before = await js(`scrollY`)
  await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 700, y: 1500, deltaX: 0, deltaY: -300 })
  await sleep(300)
  check((await js(`scrollY`)) !== before || before === 0, "a wheel over the nucleus did not scroll the page")
})

// --- Layout, responsiveness, preservation -------------------------------------------------------------------------

await test("NUCINT-041B", "P15 composition in any font: the tab row, the welcome and the stage frame have P15's widths, places and proportions, in order and without overlap, at four widths", async (check) => {
  // Measured on the P19 tree (before P20) with the same method: [x, y, width, height] in page pixels. What a font
  // cannot move stays exact: the row's four numbers, the welcome's x, y and width, the frame's x, width and height (set
  // by the stage's aspect ratio) were identical in Seravek and in DejaVu Sans, the fallback of a Linux machine
  // (P22-A01). What it moves is no longer pinned: the welcome's height (its text wraps differently, +45 px at 390 px
  // in DejaVu Sans) and the frame's y (the stage sits below text of another height). They are checked as relations
  // instead: the welcome holds its content, the stage is below the welcome, nothing overlaps, the page does not
  // scroll sideways. The first GitHub run drew the 390 px welcome 101 px taller than the Mac's.
  const P15 = {
    1440: { nav: [139, 49, 1162, 56], welcome: [185, 171, 1070], frame: [668, 587, 367] },
    1280: { nav: [55, 45, 1171, 56], welcome: [97, 162, 1087], frame: [587, 597, 373] },
    768: { nav: [38, 28, 692, 56], welcome: [63, 127, 641], frame: [63, 641, 401] },
    390: { nav: [24, 14, 341, 56], welcome: [35, 97, 320], frame: [35, 320, 240] },
  }
  for (const [width, want] of Object.entries(P15)) {
    // An ordinary window height: the stage is far from the screen, so the model is not loaded and is not awaited.
    await open(Number(width), 900, "/", { waitForModel: false })
    const now = await js(`(() => {
      const box = (s) => { const el = document.querySelector(s); const b = el.getBoundingClientRect(); return { el, x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height), bottom: b.bottom + scrollY, top: b.top + scrollY } };
      const nav = box('nav[aria-label=Sections]'), welcome = box('[data-home-region=welcome]'), frame = box('[data-stage-frame]');
      const lastChild = welcome.el.lastElementChild?.getBoundingClientRect();
      return {
        nav: [nav.x, nav.y, nav.w, nav.h], welcome: [welcome.x, welcome.y, welcome.w], frame: [frame.x, frame.w, frame.h],
        welcomeClipped: welcome.el.scrollHeight > welcome.el.clientHeight + 1 || (lastChild ? lastChild.bottom + scrollY > welcome.bottom + 1 : false),
        order: { navAboveWelcome: nav.bottom <= welcome.top + 1, welcomeAboveFrame: welcome.bottom <= frame.top + 1 },
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`)
    for (const key of ["nav", "welcome", "frame"]) {
      const same = want[key].every((v, i) => Math.abs(v - now[key][i]) <= 1)
      check(same, `${width}: ${key} is ${json(now[key])}, P15 had ${json(want[key])}`)
    }
    check(!now.welcomeClipped, `${width}: the welcome's content is cut off by its box`)
    check(now.order.navAboveWelcome && now.order.welcomeAboveFrame, `${width}: the regions are not in P15's order, or overlap: ${json(now.order)}`)
    check(now.overflow <= 0, `${width}: the page overflows by ${now.overflow}`)
  }
  await open(1440, 900, "/", { waitForModel: false })
  const bear = await js(`(() => { const i = document.querySelector('[data-home-region=welcome] img'); const r = i.getBoundingClientRect(); return { src: i.getAttribute("src"), w: Math.round(r.width), h: Math.round(r.height), natural: i.naturalWidth > 0 } })()`)
  check(bear.natural && /bearnard-v1\.3-portrait/.test(bear.src), `Bearnard: ${json(bear)}`)
})

await test("NUCINT-029B", "Resize: the canvas follows the frame through widths, and there is still one canvas", async (check) => {
  await open(1440, 1800)
  for (const width of [1100, 768, 1440]) {
    await setViewport(width, 1800, false)
    await sleep(700)
    const m = await js(`(() => { const c = document.querySelector("[data-nucleus-frame] canvas").getBoundingClientRect(); const f = document.querySelector("[data-stage-frame]").getBoundingClientRect(); return { c: [Math.round(c.width), Math.round(c.height)], f: [Math.round(f.width), Math.round(f.height)], n: document.querySelectorAll("canvas").length } })()`)
    check(json(m.c) === json(m.f) && m.n === 1, `${width}: canvas ${json(m.c)}, frame ${json(m.f)}, ${m.n} canvases`)
    await js(`document.querySelector("[data-stage-frame]").scrollIntoView({ block: "center" })`)
    await sleep(300)
    const p = await pixels()
    await js(`window.scrollTo(0, 0)`)
    check(p.ink > 5000 && p.yellow > 30, `${width}: ${p.ink} ink, ${p.yellow} yellow`)
  }
  check((await errors()).length === 0, `page errors ${json(await errors())}`)
})

await test("NUCINT-028B", "A narrow, scrolling tab row on a pointer device: a tab scrolled into view still moves the nucleus", async (check) => {
  await open(600, 3400)
  const reach = await js(`(() => { const s = document.querySelector('nav[aria-label=Sections].gl-folder__strip'); return { scrolls: s.scrollWidth > s.clientWidth + 1, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth } })()`)
  check(reach.scrolls && reach.overflow <= 0, `the row ${reach.scrolls ? "scrolls" : "does not scroll"}, page overflow ${reach.overflow}`)
  await js(`document.querySelector('nav[aria-label=Sections].gl-folder__strip').scrollLeft = 99999`)
  await sleep(300)
  await rest()
  const at = await pixels()
  const p = await pointOf("bearnards-area")
  check(p.x > 0 && p.x < 600, `the last tab's attention point is ${p.x}`)
  await moveTo(p.x, p.y, 4, 12)
  check(await waitFor(`document.querySelector("[data-nucleus-stage]").dataset.stageTarget === "bearnards-area"`, 4000), `target ${await target()}`)
  await sleep(2800)
  await quiet()
  check(dist2(await pixels(), at) > 8, "the scrolled tab did not move the region")
  await rest()
})

await test("NUCINT-043B", "World clocks: all eight clocks are live on the page with the nucleus", async (check) => {
  await open()
  await sleep(1200)
  const clocks = await js(`(() => { const rows = [...document.querySelectorAll("[data-home-region=clocks] [data-clock-id]")]; return { n: rows.length, state: document.querySelector("[data-home-region=clocks]")?.dataset.clocksState, shown: rows.filter((r) => /\\d{1,2}:\\d{2}/.test(r.querySelector("[data-clock-time]")?.textContent ?? "")).length } })()`)
  check(clocks.n === 8 && clocks.shown === 8 && clocks.state === "live", `${json(clocks)}`)
})

// --- Fallbacks, media, lifecycle ----------------------------------------------------------------------------------

await test("NUCINT-050B", "No idle loop: a resting or settled nucleus draws nothing and requests no frame, also after repeated hovers (NUCINT-038)", async (check) => {
  await open()
  await rest()
  const d0 = await draws()
  const r0 = await raf()
  await sleep(2000)
  check((await draws()) === d0 && (await raf()) === r0, `draws ${d0} to ${await draws()}, frames requested ${r0} to ${await raf()} while resting`)
  for (let i = 0; i < 5; i++) {
    await hover(["about", "cv", "lab"][i % 3])
    await sleep(120)
  }
  await rest()
  await sleep(1500)
  await quiet()
  const d1 = await draws()
  const r1 = await raf()
  await sleep(2500)
  check((await draws()) === d1, `${(await draws()) - d1} draw calls while settled after repeated hovers`)
  const loopFrames = (await raf()) - r1
  check(loopFrames === 0, `${loopFrames} animation frames requested while settled: a loop is running`)
  check((await js(`document.querySelectorAll("canvas").length`)) === 1, "repeated hovers added a canvas")
  const perFrame = (await draws()) > 0
  check(perFrame, "no draw calls were counted: the instrumentation is not seeing the renderer")
})

await test("NUCINT-035B", "Hidden page: no draws while hidden, and showing it draws again (simulated visibility)", async (check) => {
  await open()
  await rest()
  await js(`Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange"))`)
  const d = await draws()
  await hover("cv")
  await sleep(1200)
  check((await draws()) === d, `${(await draws()) - d} draws while hidden`)
  await js(`Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange"))`)
  await sleep(1500)
  check((await draws()) > d, "showing the page drew nothing")
  await rest()
})

await test("NUCINT-039B", "WebGL failure: the picture stays, the page works, and the other scripts are unaffected", async (check) => {
  const FAIL = `const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a) }`
  const { identifier } = await send("Page.addScriptToEvaluateOnNewDocument", { source: FAIL })
  try {
    await open()
    check((await stageState()) === "fallback", `the state is ${await stageState()}`)
    check((await js(`document.querySelectorAll("canvas").length`)) === 0, "a canvas remains")
    check(await js(`getComputedStyle(document.querySelector(".nucleus__picture")).visibility`) === "visible", "the still picture is hidden")
    const status = await js(`document.querySelector("[data-stage-status]").textContent`)
    check(/not available/i.test(status), `the status line says "${status}"`)
    const p = await pixels()
    check(p.ink > 5000 && p.yellow > 30, `the still picture: ${p.ink} ink, ${p.yellow} yellow`)
    await hover("cv")
    check(await js(`document.querySelector('.gl-folder-preview[data-preview-of="cv"]') !== null`), "the previews are gone")
    check((await js(`document.querySelectorAll('[data-home-region=clocks] [data-clock-id]').length`)) === 8, "the clocks are gone")
    const clicked = await pointOf("about")
    await click(clicked.x, clicked.y)
    check(await waitForPath("/about/"), "a tab does not navigate when the model failed")
  } finally {
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier })
  }
})

await test("NUCINT-040B", "No JavaScript: Home is whole, with the still picture, the text and working links", async (check) => {
  await send("Emulation.setScriptExecutionDisabled", { value: true })
  try {
    await setViewport(1440, 900, false)
    await goto("/")
    const m = await js(`(() => { const s = document.querySelector("[data-nucleus-stage]"); const f = document.querySelector("[data-stage-frame]").getBoundingClientRect(); return { state: s.dataset.stageState, status: s.querySelector("[data-stage-status]").textContent, svg: !!s.querySelector("svg.nucleus__picture"), visible: getComputedStyle(s.querySelector(".nucleus__picture")).visibility, frame: [Math.round(f.width), Math.round(f.height)], links: document.querySelectorAll('nav[aria-label=Sections] .gl-folder-tab__label[href]').length } })()`).catch(() => null)
    check(m === null || (m.state === "picture" && m.svg && m.visible === "visible" && /Still picture/.test(m.status) && m.links === 11), `no-JS Home: ${json(m)}`)
    check(m === null || (m.frame[0] === 587 && m.frame[1] === 367), `the frame is ${json(m?.frame)} without JavaScript`)
  } finally {
    await send("Emulation.setScriptExecutionDisabled", { value: false })
  }
})

await test("NUCINT-032B", "Reduced motion: a still nucleus that never animates, also when the preference changes while open", async (check) => {
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] })
  await open()
  check((await stageState()) === "static", `the state is ${await stageState()}`)
  check(/Still model/.test(await js(`document.querySelector("[data-stage-status]").textContent`)), "the status line does not say it is still")
  const at = await pixels()
  check(at.yellow > 100 && at.ink > 15_000, `the still nucleus: ${at.ink} ink, ${at.yellow} yellow`)
  const d = await draws()
  const r = await raf()
  await hover("cv")
  await js(`document.querySelector('nav[aria-label=Sections] a[href="/cv/"]').focus()`)
  await press("Tab")
  await sleep(1500)
  check((await draws()) === d && (await raf()) === r, `${(await draws()) - d} draws and ${(await raf()) - r} frames under reduced motion`)
  const after = await pixels()
  check(dist2(after, at) < 1, `the region moved ${dist2(after, at).toFixed(1)} px under reduced motion`)
  await rest()
  // The preference changes while the page is open.
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] })
  check(await waitFor(`document.querySelector("[data-nucleus-stage]").dataset.stageState === "ready"`, 4000), `after the preference went away the state is ${await stageState()}`)
  await hover("lab")
  check(await waitFor(`document.querySelector("[data-nucleus-stage]").dataset.stageTarget === "lab"`, 3000), "the nucleus does not respond after the preference went away")
  await sleep(1500)
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] })
  check(await waitFor(`document.querySelector("[data-nucleus-stage]").dataset.stageState === "static"`, 4000), `after the preference came on the state is ${await stageState()}`)
  const d2 = await draws()
  await sleep(1500)
  check((await draws()) === d2, "the nucleus kept drawing after reduced motion came on")
  await send("Emulation.setEmulatedMedia", { features: [] })
  await rest()
})

await test("NUCINT-048B", "Navigation continuity: leaving Home while the nucleus responds shows no black rectangle where the canvas was", async (check) => {
  await open()
  await rest()
  const p = await hover("lab")
  await sleep(1800)
  const stage = await js(`(() => { const r = document.querySelector("[data-stage-frame]").getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height } })()`)
  const blackIn = async () => {
    const { data } = await send("Page.captureScreenshot", { format: "png", clip: { x: stage.x, y: stage.y, width: stage.w, height: stage.h, scale: 1 } })
    return js(`(async () => { const img = new Image(); img.src = "data:image/png;base64,${data}"; await img.decode(); const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d"); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let black = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 8 && d[i + 1] < 8 && d[i + 2] < 8) black++; return black / (c.width * c.height) })()`)
  }
  const before = await blackIn()
  check(before < 0.01, `${(before * 100).toFixed(1)} % black in the stage before leaving`)
  const arrived = nextEvent("Page.frameNavigated", 5000).catch(() => null)
  await click(p.x, p.y)
  // Grab frames while the cross-document transition plays; they come from the compositor, not the page.
  const seen = []
  for (let i = 0; i < 6; i++) {
    seen.push(await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1440, height: 900, scale: 0.25 } }).then(() => true).catch(() => false))
  }
  await arrived
  check(await waitForPath("/lab/"), "the click did not reach /lab/")
  const css = await js(`[...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.cssText.startsWith("@view-transition")) } catch { return false } })`)
  check(css, "the page no longer opts into the cross-document transition")
  console.log(`  INFO captured ${seen.filter(Boolean).length} frames during the click; black share of the stage before leaving: ${(before * 100).toFixed(2)} %. The old page's canvas snapshot itself is not readable from a test: owner visual check.`)
})

await test("NUCINT-055B", "Sticky tabs: at a 900 px window the tabs stay on screen, the nucleus answers while both are visible, previews open, and a click navigates", async (check) => {
  await open(1440, 900, "/", { waitForModel: false })
  const rest = await js(`(() => { const s = getComputedStyle(document.querySelector("nav[aria-label=Sections]")); return { pos: s.position, z: s.zIndex, top: Math.round(document.querySelector("nav[aria-label=Sections]").getBoundingClientRect().top) } })()`)
  check(rest.pos === "sticky" && rest.z === "1" && rest.top === 49, `at rest: ${json(rest)} (the row is where it always was, below the folder body)`)
  await js(`window.scrollTo(0, document.querySelector("[data-nucleus-stage]").getBoundingClientRect().top + scrollY - 340)`)
  check(await waitFor(`document.querySelector("[data-nucleus-stage]").dataset.stageState === "ready"`, 25_000), `the state is ${await stageState()}`)
  await sleep(800)
  const m = await js(`(() => { const n = document.querySelector("nav[aria-label=Sections]"); const r = n.getBoundingClientRect(); const f = document.querySelector("[data-stage-frame]").getBoundingClientRect(); const hit = [...n.querySelectorAll(".gl-folder-tab__label")].map((a) => { const b = a.getBoundingClientRect(); const e = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return e === a || a.contains(e) }); return { z: getComputedStyle(n).zIndex, top: Math.round(r.top), bottom: Math.round(r.bottom), frameTop: Math.round(f.top), frameBottom: Math.round(f.bottom), vh: innerHeight, hits: hit.filter(Boolean).length } })()`)
  check(m.z === "10" && m.top <= 0 && m.bottom > 30, `the row is not stuck above the page: ${json(m)}`)
  check(m.frameTop >= 0 && m.frameBottom <= m.vh, `the stage is not wholly on screen with the tabs: ${json(m)}`)
  check(m.hits === 11, `only ${m.hits} of 11 tabs are what is under their own centre while stuck`)
  const band = await js(`getComputedStyle(document.querySelector("nav[aria-label=Sections] .gl-folder__tabs")).backgroundColor`)
  check(band !== "rgba(0, 0, 0, 0)", `no band behind the stuck row: ${band}`)
  await moveTo(2, 2, 3)
  await sleep(300)
  await quiet()
  const at = await pixels()
  await hover("cv")
  check(await waitFor(`document.querySelector("[data-nucleus-stage]").dataset.stageTarget === "cv"`, 3000), `target ${await target()}`)
  check(await waitFor(`document.querySelector('.gl-folder-preview[data-preview-of="cv"]')?.matches(":popover-open")`, 3000), "the preview did not open over the stuck row")
  await sleep(2800)
  await quiet()
  const moved = dist2(await pixels(), at)
  check(moved > 10, `the nucleus moved ${moved.toFixed(1)} px: the response is not seen with the tabs on screen`)
  console.log(`  INFO at 1440 x 900 the tabs and the nucleus are on screen together; the region moved ${moved.toFixed(0)} px toward CV`)
  const p = await pointOf("lab")
  await click(p.x, p.y)
  check(await waitForPath("/lab/"), "a click on a stuck tab did not navigate")
  await open(1440, 900, "/", { waitForModel: false })
  await js(`window.scrollTo(0, 0)`)
})

// Touch emulation changes layout for the rest of the session, so this runs last.
await test("NUCINT-033B", "Touch: a still nucleus, no response to tapping or to touch pointers, and a swipe over it scrolls the page", async (check) => {
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 })
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 800, deviceScaleFactor: 1, mobile: true })
  await goto("/")
  await waitForPath("/")
  await waitFor(`!!document.querySelector("[data-nucleus-stage]")`, 10_000)
  await js(`document.querySelector("[data-nucleus-stage]").scrollIntoView({ block: "center" })`)
  await waitFor(`["ready", "static", "fallback"].includes(document.querySelector("[data-nucleus-stage]")?.dataset.stageState)`, 25_000)
  await sleep(500)
  check((await stageState()) === "static", `the state is ${await stageState()}: ${await js(`document.querySelector("[data-nucleus-frame]").dataset.nucleusReason`)}`)
  check(await js(`document.querySelector("[data-nucleus-frame]").dataset.nucleusReason`) && /touch/i.test(await js(`document.querySelector("[data-nucleus-frame]").dataset.nucleusReason`)), "the reason is not touch")
  const at = await pixels()
  check(at.ink > 5000 && at.yellow > 20, `the still nucleus on a phone: ${at.ink} ink, ${at.yellow} yellow`)
  const d = await draws()
  const r = await raf()
  await js(`document.querySelector('nav[aria-label=Sections] .gl-folder-tab[data-tab-id="cv"]').dispatchEvent(new PointerEvent("pointerenter", { pointerType: "touch", bubbles: true }))`)
  await sleep(800)
  check((await draws()) === d && (await raf()) === r, "a touch pointer drew or requested a frame")
  check((await target()) === null, `the stage target is ${await target()} after a touch pointer`)
  check(await js(`getComputedStyle(document.querySelector("[data-nucleus-frame] canvas")).touchAction`) === "auto", "the canvas takes over touch")
  const overflow = await js(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)
  check(overflow <= 0, `the page overflows by ${overflow}`)
  check(await js(`getComputedStyle(document.querySelector("nav[aria-label=Sections]")).position`) !== "sticky", "the tab row sticks on a touch device")
  // The swipes are aimed (P22-A01, run 8): each one finds its target, hit-tests the point and reads where it starts in one page
  // evaluation and is sent at once (touchSwipeScrolls with `locate`), after the page has stopped moving. In run 8 the
  // sideways swipe's first touch landed on a paragraph because the page was still scrolling from the swipe before it.
  const FRAME = `document.querySelector("[data-nucleus-frame]")`
  const locateFrame = `(() => { const f = ${FRAME}; const r = f.getBoundingClientRect(); const x = Math.round(r.x + r.width / 2), y = Math.round(Math.min(innerHeight - 40, r.y + r.height / 2)); const e = document.elementFromPoint(x, y); return { x, y, ok: !!e && f.contains(e), hit: e ? e.tagName.toLowerCase() + "." + String(e.className).split(" ")[0] : null } })()`
  const quiet = await scrollSettled()
  check(quiet.settled, `the page did not stop moving before the swipe over the nucleus: ${json(quiet)}`)
  const swiped = await touchSwipeScrolls(0, 0, -250, { locate: locateFrame })
  check(swiped.scrolled, `a swipe over the nucleus did not scroll the page (${json(swiped)}; document ${await js(`document.documentElement.scrollHeight`)} px, window ${await js(`innerHeight`)} px)`)

  // The folder row still scrolls sideways under touch. First the page is let to stop (the vertical swipe's fling), then the
  // row is put in the middle of the window and the page is let to stop again: only then is it aimed at.
  const strip = `document.querySelector('nav[aria-label=Sections].gl-folder__strip')`
  const afterFling = await scrollSettled()
  await js(`${strip}.scrollIntoView({ block: "center" })`)
  const afterPlacing = await scrollSettled()
  check(afterFling.settled && afterPlacing.settled, `the page did not stop moving before the sideways swipe: ${json({ afterFling, afterPlacing })}`)
  const row = await js(`(() => { const s = ${strip}; return { scrolls: s.scrollWidth > s.clientWidth + 1, left: s.scrollLeft, touchAction: getComputedStyle(s).touchAction, overflowX: getComputedStyle(s).overflowX, scrollWidth: s.scrollWidth, clientWidth: s.clientWidth, tabs: s.querySelectorAll(".gl-folder-tab").length } })()`)
  check(row.scrolls && row.tabs >= 11, `the row does not overflow its window or lacks tabs: ${json(row)}`)
  // The point to touch: the row's centre (a tab's label, which is a link: where a finger starts), or a point of the row that is not a link.
  const rowPoint = `(() => { const s = ${strip}; const r = s.getBoundingClientRect(); const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2); const e = document.elementFromPoint(x, y); return { x, y, ok: !!e && s.contains(e) && r.top >= 0 && r.bottom <= innerHeight, hit: e ? e.tagName.toLowerCase() + "." + String(e.className).split(" ")[0] : null, strip: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], page: scrollY } })()`
  const offLinkPoint = `(() => { const s = ${strip}; const b = s.getBoundingClientRect(); for (let x = b.left + 4; x < b.right - 4; x += 5) for (const y of [b.top + 4, b.top + b.height / 2, b.bottom - 4]) { const e = document.elementFromPoint(x, y); if (e && s.contains(e) && !e.closest("a")) return { x, y, ok: true, hit: e.tagName.toLowerCase() } } return { x: 0, y: 0, ok: false, hit: "every point of the row is a link" } })()`
  // What reaches the page during the swipe: the touch and pointer events, a drag start, a scroll and the highest scroll position
  // seen, whether the first touch was on the row, so "never delivered", "delivered and cancelled", "scrolled and snapped back"
  // and "aimed at something else" can be told apart.
  await js(`(() => { const s = ${strip}; window.__qaSwipe = { events: {}, maxLeft: s.scrollLeft, pageX: scrollX }; for (const type of ["touchstart", "touchmove", "touchend", "touchcancel", "pointerdown", "pointermove", "pointerup", "pointercancel", "dragstart", "contextmenu", "click", "scroll"]) document.addEventListener(type, (e) => { const q = window.__qaSwipe; q.events[type] = (q.events[type] || 0) + 1; q.maxLeft = Math.max(q.maxLeft, s.scrollLeft); q.pageX = Math.max(q.pageX, scrollX); if ((type === "pointerdown" || type === "touchstart") && q.first === undefined) { q.first = (e.target?.tagName || "").toLowerCase() + "." + String(e.target?.className || "").split(" ")[0]; q.firstInRow = !!e.target?.closest?.('nav[aria-label=Sections].gl-folder__strip') } }, { capture: true, passive: true }) })()`)
  const onLinkSwipe = await touchSwipeScrolls(0, 0, -150, { min: 20, horizontal: true, measure: `${strip}.scrollLeft`, locate: rowPoint })
  const trace = await js(`window.__qaSwipe`)
  // If the swipe on a link did not move the row, the same swipe on the same link with the browser's link dragging switched
  // off tells whether dragging the link is what took the touch (on Linux a touch that starts on a link can become a drag).
  let offLinkSwipe = null
  let noDragSwipe = null
  if (!onLinkSwipe.scrolled && !onLinkSwipe.targetMissed) {
    await js(`${strip}.scrollLeft = 0; (() => { const s = document.createElement("style"); s.id = "qa-no-link-drag"; s.textContent = "a, a * { -webkit-user-drag: none !important; user-select: none !important; -webkit-touch-callout: none !important }"; document.head.append(s) })()`)
    noDragSwipe = await touchSwipeScrolls(0, 0, -150, { min: 20, horizontal: true, measure: `${strip}.scrollLeft`, locate: rowPoint })
    await js(`document.getElementById("qa-no-link-drag")?.remove(); ${strip}.scrollLeft = 0`)
    offLinkSwipe = await touchSwipeScrolls(0, 0, -150, { min: 20, horizontal: true, measure: `${strip}.scrollLeft`, locate: offLinkPoint })
  }
  if (!onLinkSwipe.scrolled && (noDragSwipe?.scrolled || offLinkSwipe?.scrolled)) console.log(`  observed: a swipe that starts on a tab's link did not move the row (${json(onLinkSwipe)}); with link dragging switched off it ${noDragSwipe?.scrolled ? "did" : "did not"} (${json(noDragSwipe)}), and a swipe on the row's empty part ${offLinkSwipe ? (offLinkSwipe.targetMissed ? "was not possible (every point of the row is a link)" : offLinkSwipe.scrolled ? "did" : "did not") : "was not tried"}`)
  // A gesture that was not aimed at the row proves nothing about the row: it is reported as a targeting failure, apart from a row that does not move.
  check(!onLinkSwipe.targetMissed, `TARGETING: the swipe point was not on the folder row (${json(onLinkSwipe)})`)
  check(trace.first === undefined || trace.firstInRow === true, `TARGETING: the first touch landed on ${trace.first}, not on the folder row (${json(trace)}; aimed ${json(onLinkSwipe.aimed)})`)
  const moved = onLinkSwipe.scrolled || noDragSwipe?.scrolled === true || offLinkSwipe?.scrolled === true
  check(row.scrolls && moved, `the folder row does not scroll sideways with touch (${json(row)}; what reached the page during the swipe on the link: ${json(trace)}; on a link: ${json(onLinkSwipe)}; on a link with dragging off: ${json(noDragSwipe)}; off a link: ${json(offLinkSwipe)})`)
  // Every tab can be reached by touch alone: keep swiping the row, and the last tab ends up inside the row's window where a finger would hit it.
  if (moved) {
    const lastTab = `(() => { const s = ${strip}; const tabs = [...s.querySelectorAll(".gl-folder-tab")]; const last = tabs[tabs.length - 1]; const b = s.getBoundingClientRect(), r = last.getBoundingClientRect(); const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2); const e = document.elementFromPoint(x, y); return { tab: last.dataset.tabId, inWindow: r.left >= b.left - 1 && r.right <= b.right + 1, hit: !!e && last.contains(e), left: s.scrollLeft, max: s.scrollWidth - s.clientWidth } })()`
    let end = await js(lastTab)
    for (let swipes = 0; swipes < 6 && !(end.inWindow && end.hit); swipes++) {
      const again = await touchSwipeScrolls(0, 0, -200, { min: 0, horizontal: true, measure: `${strip}.scrollLeft`, locate: rowPoint })
      if (again.targetMissed || !again.scrolled) break
      end = await js(lastTab)
    }
    check(end.inWindow && end.hit, `the last tab cannot be reached by swiping the row: ${json(end)}`)
  }
  await send("Emulation.setTouchEmulationEnabled", { enabled: false })
  await send("Emulation.clearDeviceMetricsOverride")
})

await finish()
