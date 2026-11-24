// The 3D nucleus in a real, headless Chromium (P19, D-130 to D-136): the browser half of the NUC checks.
// It serves dist-demo/ (`npm run demo:build`, run first by `npm run test:browser`) and drives the
// specimen at /_design/nucleus/ through real mouse, keyboard, touch and media emulation, with
// software WebGL (SwiftShader), so it proves the model really renders and responds, not how fast a
// real GPU draws it. Rendering is judged from screenshots of the frame: the yellow region's pixels
// and their centroid, so "it drew", "it moved toward the target" and "it came back" are measured, not
// assumed. What it does not show: a real GPU's frame rate, Safari, Firefox, Android Chrome, a
// screen reader, or how the nucleus looks to the owner. Without a browser or dist-demo/ every check
// is reported NOT RUN (exit 2).
import { existsSync } from "node:fs"
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import { arch, cpus, platform, release } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { json, sleep, startBrowser } from "./browser-harness.mjs"
import { NUCLEUS_PAGE } from "../src/design/site-map.ts"

const IDS = ["NUC-016B", "NUC-018B", "NUC-019", "NUC-021B", "NUC-022B", "NUC-023B", "NUC-024B", "NUC-025B", "NUC-026B", "NUC-028B", "NUC-029B", "NUC-030B", "NUC-031", "NUC-032", "NUC-033", "NUC-033B", "NUC-034", "NUC-035", "NUC-036B", "NUC-045", "NUC-050"]
const dist = fileURLToPath(new URL("../dist-demo/", import.meta.url))
if (!existsSync(join(dist, "_design/nucleus/index.html"))) {
  for (const id of IDS) console.log(`NOT RUN ${id}`)
  console.error("NOT RUN: dist-demo/ is not built; run `npm run demo:build`.")
  process.exit(2)
}

const { js, send, setViewport, goto, moveTo, press, test, finish, touchSwipeScrolls } = await startBrowser({
  ids: IDS,
  timeout: 420_000,
  root: "dist-demo",
  chromeArgs: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
})
await send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__errors = []; addEventListener("error", (e) => window.__errors.push(String(e.message))); addEventListener("unhandledrejection", (e) => window.__errors.push(String(e.reason)))` })

const waitFor = async (expression, timeout = 10_000) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await js(expression).catch(() => false)) return true
    await sleep(80)
  }
  return false
}
const diag = () =>
  js(`(() => { const g = (n) => document.querySelector('[data-diag="' + n + '"]')?.textContent ?? ""; return { status: g("status"), mode: g("mode"), reason: g("reason"), frames: Number(g("framesDrawn")), loop: g("loopRunning") === "true", canvas: g("canvas"), ratio: Number(g("pixelRatio")), triangles: Number(g("triangles")), resources: g("resources"), calls: Number(g("drawCalls")), lastMs: Number(g("lastFrameMs")) } })()`)
const readout = () => js(`({ phase: document.querySelector('[data-readout="phase"]')?.textContent, activation: Number(document.querySelector('[data-readout="activation"]')?.textContent), target: document.querySelector('[data-readout="target"]')?.textContent })`)
const open = async (width = 1440, height = 900) => {
  // Plain viewport sizes, not mobile emulation: a screenshot's clip is then in the page's own pixels.
  await setViewport(width, height, false)
  await goto(NUCLEUS_PAGE)
  await waitFor(`document.querySelector('[data-nucleus-frame]')?.dataset.nucleusState === "ready" || document.querySelector('[data-nucleus-frame]')?.dataset.nucleusState === "static" || document.querySelector('[data-nucleus-frame]')?.dataset.nucleusState === "fallback"`, 20_000)
  await js(`(() => { const t = document.querySelector("[data-nucleus-diagnostics-toggle]"); if (t && !t.checked) t.click(); document.querySelector("[data-nucleus-frame]").scrollIntoView({ block: "center" }) })()`)
  await sleep(400)
  const iw = await js(`innerWidth`)
  if (iw !== width) throw new Error(`the viewport is ${iw} px wide, not ${width}`)
}
const state = () => js(`document.querySelector('[data-nucleus-frame]').dataset.nucleusState`)
const settleLoop = async (timeout = 8000) => waitFor(`document.querySelector('[data-diag="loopRunning"]')?.textContent === "false"`, timeout)

/** The frame's pixels from a real screenshot: ink, yellow count and the yellow centroid. */
async function pixels() {
  const rect = await js(`(() => { const r = document.querySelector("[data-nucleus-frame]").getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height } })()`)
  const { data } = await send("Page.captureScreenshot", { format: "png", clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale: 1 } })
  return js(`(async () => {
    const img = new Image(); img.src = "data:image/png;base64,${data}"; await img.decode()
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height
    const x = c.getContext("2d"); x.drawImage(img, 0, 0)
    const d = x.getImageData(0, 0, c.width, c.height).data
    const bg = [d[0], d[1], d[2]]
    let ink = 0, yellow = 0, sx = 0, sy = 0
    for (let i = 0; i < d.length; i += 4) {
      const px = (i / 4) % c.width, py = Math.floor(i / 4 / c.width)
      if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 40) ink++
      if (d[i] > 200 && d[i + 1] > 150 && d[i + 2] < 120 && d[i] - d[i + 2] > 110) { yellow++; sx += px; sy += py }
    }
    return { width: c.width, height: c.height, ink, yellow, cx: yellow ? sx / yellow : 0, cy: yellow ? sy / yellow : 0 }
  })()`)
}
const targetPoint = (label) => js(`(() => { const r = document.querySelector('[data-nucleus-target="${label}"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
const park = async () => {
  await moveTo(5, 400, 2)
  await sleep(100)
}

await test("NUC-019", "A supported browser creates one renderer and draws the nucleus", async (check) => {
  await open()
  const s = await state()
  check(s === "ready", `the nucleus is ${s}: ${await js(`document.querySelector('[data-nucleus-frame]').dataset.nucleusReason`)}`)
  const d = await diag()
  check(await js(`document.querySelectorAll("canvas").length`) === 1, "there is not exactly one canvas")
  check(d.frames >= 1 && d.triangles > 10_000 && d.calls <= 6, `diagnostics ${json(d)}`)
  const p = await pixels()
  check(p.ink > 20_000, `only ${p.ink} pixels differ from the paper: the canvas looks empty`)
  check(p.yellow > 150, `only ${p.yellow} yellow pixels: the highlighted region did not render`)
  check((await js(`window.__errors.length`)) === 0, `page errors: ${json(await js(`window.__errors`))}`)
  check(await js(`getComputedStyle(document.querySelector('.nucleus__picture')).visibility`) === "hidden", "the still picture is still showing over the live nucleus")
})

await test("NUC-021B", "Static idle: a resting nucleus draws nothing further", async (check) => {
  await open()
  const a = await diag()
  await sleep(1500)
  const b = await diag()
  check(b.frames === a.frames && !b.loop, `frames went from ${a.frames} to ${b.frames} while idle (loop ${b.loop})`)
})

await test("NUC-022B", "Hovering a target draws frames, and the readout follows (mouse)", async (check) => {
  await open()
  await park()
  const before = await diag()
  const p = await targetPoint("Lab")
  await moveTo(p.x, p.y, 4, 20)
  // Software WebGL draws a frame in tens of milliseconds and the readout refreshes four times a second.
  await waitFor(`Number(document.querySelector('[data-diag="framesDrawn"]').textContent) > ${before.frames + 2}`, 6000)
  const mid = await diag()
  check(mid.loop && mid.frames > before.frames + 2, `frames ${before.frames} to ${mid.frames}, loop ${mid.loop}`)
  const r = await readout()
  check(r.target === "Lab" && r.phase === "responding", `readout ${json(r)}`)
  check(await js(`document.querySelector('[data-nucleus-target="Lab"]').getAttribute("aria-pressed")`) === "true", "the active target is not marked")
})

await test("NUC-023B", "The loop stops after the response settles, and again after the return", async (check) => {
  await settleLoop(12_000)
  const a = await diag()
  check(!a.loop, "the loop is still running")
  await sleep(1000)
  check((await diag()).frames === a.frames, "frames were drawn after settling")
  const r = await readout()
  check(r.activation >= 99, `settled at ${r.activation}%`)
  await park()
  await waitFor(`Number(document.querySelector('[data-readout="activation"]').textContent) === 0`, 12_000)
  await settleLoop(12_000)
  const b = await diag()
  const r2 = await readout()
  check(!b.loop && r2.phase === "resting" && r2.activation === 0, `after release: ${json(r2)}, loop ${b.loop}`)
  check((await js(`document.querySelector('[data-nucleus-target="Lab"]').getAttribute("aria-pressed")`)) === "false", "the target stayed marked")
})

await test("NUC-016B", "The yellow region reaches toward the target: left tab left, right tab right, and it comes back", async (check) => {
  await open()
  const rest = await pixels()
  check(rest.yellow > 150, "no yellow at rest")
  const moved = {}
  for (const label of ["Home", "Writing", "Lab"]) {
    const p = await targetPoint(label)
    await moveTo(p.x, p.y, 4, 20)
    await waitFor(`Number(document.querySelector('[data-readout="activation"]').textContent) >= 99`, 12_000)
    await settleLoop(8000)
    moved[label] = await pixels()
    await park()
    await waitFor(`Number(document.querySelector('[data-readout="activation"]').textContent) === 0`, 12_000)
    await settleLoop(8000)
  }
  check(moved.Home.cx < rest.cx - 2, `Home: the centroid moved ${(moved.Home.cx - rest.cx).toFixed(1)} px in x (expected left)`)
  check(moved.Writing.cx > rest.cx + 2, `Writing: the centroid moved ${(moved.Writing.cx - rest.cx).toFixed(1)} px in x (expected right)`)
  check(moved.Lab.cy < rest.cy - 2, `Lab: the centroid moved ${(moved.Lab.cy - rest.cy).toFixed(1)} px in y (expected up)`)
  for (const label of Object.keys(moved)) check(moved[label].yellow > rest.yellow * 0.5 && moved[label].yellow < rest.yellow * 2, `${label}: the yellow area changed from ${rest.yellow} to ${moved[label].yellow} px`)
  const back = await pixels()
  check(Math.abs(back.cx - rest.cx) < 1.5 && Math.abs(back.cy - rest.cy) < 1.5 && Math.abs(back.yellow - rest.yellow) < rest.yellow * 0.03, `after the return: centroid off by ${(back.cx - rest.cx).toFixed(1)}, ${(back.cy - rest.cy).toFixed(1)} px`)
  console.log(`  observed centroid shifts (px): Home ${(moved.Home.cx - rest.cx).toFixed(1)}, ${(moved.Home.cy - rest.cy).toFixed(1)}; Lab ${(moved.Lab.cx - rest.cx).toFixed(1)}, ${(moved.Lab.cy - rest.cy).toFixed(1)}; Writing ${(moved.Writing.cx - rest.cx).toFixed(1)}, ${(moved.Writing.cy - rest.cy).toFixed(1)}`)
})

await test("NUC-030B", "Rapid retargeting: moving between tabs never snaps back to rest", async (check) => {
  await open()
  await park()
  await js(`window.__samples = []; (function sample() { window.__samples.push(Number(document.querySelector('[data-readout="activation"]').textContent)); window.__raf = setTimeout(sample, 60) })()`)
  const tabs = ["Home", "CV", "Lab", "Lecture Notes", "Writing"]
  for (const label of tabs) {
    const p = await targetPoint(label)
    await moveTo(p.x, p.y, 3, 10)
    await sleep(250)
  }
  await park()
  await sleep(400)
  const p = await targetPoint("Lab")
  await moveTo(p.x, p.y, 3, 10)
  await sleep(1500)
  const samples = await js(`clearTimeout(window.__raf); window.__samples`)
  // The readout is rounded to whole percent and sampled every 60 ms: a snap to rest would be a big drop.
  let worstDrop = 0
  for (let i = 1; i < samples.length; i++) worstDrop = Math.max(worstDrop, samples[i - 1] - samples[i])
  check(samples.some((v) => v > 30), `the response never reached 30%: ${json(samples.slice(0, 20))}`)
  check(worstDrop < 25, `the activation dropped by ${worstDrop} points in one 60 ms sample (a snap)`)
})

await test("NUC-031", "Keyboard focus triggers the response, hands over between tabs, and releases (NUC-032)", async (check) => {
  await open()
  await park()
  // P22 (ISSUE-0005): the response is model time, and the model steps at most RENDER.maxStep (50 ms) per frame so that a slow
  // machine never jumps. The specimen draws with software WebGL here, so how far the response has come after a fixed wait
  // depends on the machine's load: the same code gave 45-53 % at 700 ms when idle and 2-6 % under CPU contention. The
  // standard is unchanged (the response reaches the focused target and passes 20 %); the wait is now for that state.
  const answered = (target) => `(() => { const g = (n) => document.querySelector('[data-readout="' + n + '"]')?.textContent; return g("target") === ${json(target)} && Number(g("activation")) > 20 })()`
  await js(`document.querySelector('[data-nucleus-target="Home"]').focus()`)
  check(await waitFor(answered("Home"), 20_000), `focus on Home: ${json(await readout())}`)
  await press("Tab")
  check(await waitFor(answered("CV"), 20_000), `Tab to CV: ${json(await readout())} (a handover is not a release)`)
  check(await js(`document.activeElement?.dataset.nucleusTarget`) === "CV", "focus is not on the CV tab")
  // Focus exit: tabbing past the last simulated tab, and blur, release.
  await js(`document.activeElement.blur()`)
  await waitFor(`Number(document.querySelector('[data-readout="activation"]').textContent) === 0`, 12_000)
  await settleLoop(8000)
  const after = await readout()
  check(after.phase === "resting" && after.target === "none" && after.activation === 0, `after blur: ${json(after)}`)
})

await test("NUC-018B", "Reduced motion: a still nucleus that never animates, also when it changes while open", async (check) => {
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] })
  await open()
  check((await state()) === "static", `the state is ${await state()}`)
  const d = await diag()
  check(d.mode === "static" && !d.loop && d.frames === 1, `diagnostics ${json(d)}`)
  const p = await pixels()
  check(p.yellow > 150 && p.ink > 20_000, `the still nucleus is empty: ${p.ink} ink, ${p.yellow} yellow`)
  const t = await targetPoint("Lab")
  await moveTo(t.x, t.y, 3, 10)
  await js(`document.querySelector('[data-nucleus-target="Lab"]').dispatchEvent(new FocusEvent("focusin", { bubbles: true }))`)
  await sleep(600)
  const after = await diag()
  check(after.frames === 1 && !after.loop && (await readout()).activation === 0, `a hover animated the still nucleus: ${json(after)}`)
  check(await js(`[...document.querySelectorAll("[data-nucleus-target]")].every((b) => b.disabled)`), "the simulated tabs are not disabled in the still mode")
  // The preference changes while the page is open: it follows, with no reload.
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] })
  await open()
  const live = await state()
  check(live === "ready", `without the preference: ${live}`)
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] })
  await waitFor(`document.querySelector('[data-nucleus-frame]').dataset.nucleusState === "static"`, 4000)
  check((await state()) === "static", `after the preference changed: ${await state()}`)
  await send("Emulation.setEmulatedMedia", { features: [] })
})

await test("NUC-034", "The nucleus stays whole and recognisable at seven widths, with no page overflow (NUC-035)", async (check) => {
  for (const width of [320, 390, 430, 768, 1024, 1280, 1440]) {
    await open(width, 900)
    const m = await js(`({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, state: document.querySelector("[data-nucleus-frame]").dataset.nucleusState, frame: (() => { const r = document.querySelector("[data-nucleus-frame]").getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] })(), canvas: (() => { const c = document.querySelector("[data-nucleus-frame] canvas"); const r = c.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), c.width, c.height] })() })`)
    check(m.overflow <= 0, `${width}: the page overflows by ${m.overflow}`)
    check(m.canvas[0] === m.frame[0] && m.canvas[1] === m.frame[1], `${width}: the canvas ${json(m.canvas)} does not fill the frame ${json(m.frame)}`)
    const d = await diag()
    check(m.canvas[2] === Math.round(m.frame[0] * d.ratio) || Math.abs(m.canvas[2] - m.frame[0] * d.ratio) <= 1, `${width}: the canvas is ${m.canvas[2]} px for ${m.frame[0]} css px at ratio ${d.ratio}`)
    const p = await pixels()
    check(p.yellow > 40 && p.ink > 5000, `${width}: ${p.ink} ink and ${p.yellow} yellow pixels`)
  }
  await open(1440, 900)
})

await test("NUC-024B", "Resizing the frame resizes the canvas and redraws, with no second canvas", async (check) => {
  await open(1440, 900)
  const before = await diag()
  await js(`document.querySelector('[data-nucleus-set-width="390"]').click()`)
  await sleep(600)
  const small = await js(`(() => { const r = document.querySelector("[data-nucleus-frame] canvas").getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] })()`)
  const after = await diag()
  check(small[0] === 390 && after.canvas.startsWith("390 ×"), `the canvas is ${json(small)} (${after.canvas})`)
  check(after.frames > before.frames && !after.loop, `frames ${before.frames} to ${after.frames}`)
  check(await js(`document.querySelectorAll("canvas").length`) === 1, "a second canvas appeared")
  await js(`document.querySelector('[data-nucleus-set-width="full"]').click()`)
  await sleep(500)
  check((await diag()).canvas.startsWith("700") || Number((await diag()).canvas.split(" ")[0]) > 600, `the canvas did not grow back: ${(await diag()).canvas}`)
})

await test("NUC-025B", "Hidden page pauses the loop; shown again it draws and carries on (simulated visibility)", async (check) => {
  await open()
  await park()
  await js(`Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange"))`)
  const p = await targetPoint("Lab")
  await moveTo(p.x, p.y, 3, 10)
  await sleep(600)
  const hidden = await diag()
  const frames = hidden.frames
  await sleep(500)
  check((await diag()).frames === frames && !(await diag()).loop, "frames were drawn while the page was hidden")
  await js(`Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange"))`)
  await sleep(700)
  check((await diag()).frames > frames, "showing the page again drew nothing")
  await park()
  await settleLoop(12_000)
})

await test("NUC-026B", "A page restored from the cache draws again (pageshow)", async (check) => {
  await open()
  const a = await diag()
  await js(`window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }))`)
  // P22: wait for the redraw itself, not for 500 ms (the restoring frame is a requestAnimationFrame, which a loaded machine delays).
  await waitFor(`Number(document.querySelector('[data-diag="framesDrawn"]')?.textContent) > ${a.frames}`, 15_000)
  await sleep(150)
  const b = await diag()
  check(b.frames === a.frames + 1 && !b.loop, `frames ${a.frames} to ${b.frames}`)
  check((await pixels()).yellow > 150, "the restored nucleus is blank")
})

await test("NUC-029B", "A lost WebGL context is restored and redrawn; one that never returns shows the still picture", async (check) => {
  await open()
  await js(`window.__lose = document.querySelector("[data-nucleus-frame] canvas").getContext("webgl2").getExtension("WEBGL_lose_context"); window.__lose.loseContext()`)
  await sleep(500)
  const lost = await diag()
  check(!lost.loop, "a loop runs on a lost context")
  await js(`window.__lose.restoreContext()`)
  await waitFor(`document.querySelector('[data-diag="framesDrawn"]').textContent !== "${lost.frames}"`, 6000)
  await sleep(300)
  check((await state()) === "ready" && (await pixels()).yellow > 150, `after the restore: ${await state()}, ${(await pixels()).yellow} yellow`)
  // Never restored: the status becomes fallback and the page keeps its still picture.
  await js(`window.__lose.loseContext()`)
  await waitFor(`document.querySelector('[data-nucleus-frame]').dataset.nucleusState === "fallback"`, 6000)
  check((await state()) === "fallback", `the state is ${await state()}`)
  check(await js(`getComputedStyle(document.querySelector('.nucleus__picture')).visibility`) === "visible", "the still picture is not shown")
  check((await js(`window.__errors.length`)) === 0, `page errors: ${json(await js(`window.__errors`))}`)
})

await test("NUC-028B", "Mounting again and again leaves one canvas and a steady resource count", async (check) => {
  await open()
  const base = (await diag()).resources
  for (let i = 0; i < 6; i++) {
    await js(`document.querySelector("[data-nucleus-static]").click()`)
    await sleep(500)
    await js(`document.querySelector("[data-nucleus-static]").click()`)
    await sleep(500)
  }
  await waitFor(`document.querySelector('[data-nucleus-frame]').dataset.nucleusState === "ready"`, 10_000)
  await sleep(500)
  const n = await js(`({ canvases: document.querySelectorAll("canvas").length, state: document.querySelector("[data-nucleus-frame]").dataset.nucleusState })`)
  check(n.canvases === 1 && n.state === "ready", `${n.canvases} canvases, ${n.state}`)
  check((await diag()).resources === base, `resources ${base} became ${(await diag()).resources}`)
  check((await pixels()).yellow > 150, "the nucleus is blank after remounting")
})

await test("NUC-036B", "The canvas takes no pointer events: it can be clicked through and scrolled over", async (check) => {
  await open()
  const hit = await js(`(() => { const r = document.querySelector("[data-nucleus-frame] canvas").getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e?.tagName })()`)
  check(hit !== "CANVAS", `the canvas is the hit target (${hit})`)
  const top = await js(`document.documentElement.scrollTop`)
  const r = await js(`(() => { const r = document.querySelector("[data-nucleus-frame] canvas").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
  await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: r.x, y: r.y, deltaX: 0, deltaY: 200 })
  await sleep(600)
  check((await js(`document.documentElement.scrollTop`)) > top + 50, "the wheel over the nucleus did not scroll the page")
  // A control next to the frame still works: the width presets are real buttons.
  await js(`document.querySelector('[data-nucleus-set-width="430"]').click()`)
  check((await js(`document.querySelector("[data-nucleus-width]").style.maxInlineSize`)) === "430px", "a control beside the nucleus did not work")
  await js(`document.querySelector('[data-nucleus-set-width="full"]').click()`)
})

await test("NUC-045", "Three.js loads only on the nucleus page, and never on the others", async (check) => {
  const files = (await readdir(join(dist, "_astro"))).filter((f) => f.endsWith(".js"))
  const chunks = []
  for (const f of files) if (/WebGLRenderer/.test(await readFile(join(dist, "_astro", f), "utf8"))) chunks.push(f)
  check(chunks.length >= 1, "the demonstration build has no graphics chunk")
  const pages = ["/", "/contact/", "/cv/", "/_design/home/", "/_design/site-map/"]
  for (const page of pages) {
    await setViewport(1280, 900)
    await goto(page)
    await sleep(500)
    const loaded = await js(`performance.getEntriesByType("resource").map((r) => r.name)`)
    check(!loaded.some((n) => chunks.some((c) => n.includes(c))), `${page} loaded the graphics engine`)
    check(!(await js(`document.querySelector("canvas")`)), `${page} has a canvas`)
  }
  await open()
  const specimen = await js(`performance.getEntriesByType("resource").map((r) => r.name)`)
  check(chunks.some((c) => specimen.some((n) => n.includes(c))), "the nucleus page did not load the engine")
  const html = await readFile(join(dist, "_design/nucleus/index.html"), "utf8")
  check(!chunks.some((c) => html.includes(c)), "the specimen's HTML preloads the engine instead of loading it on demand")
  console.log(`  graphics chunk(s): ${chunks.length} file, ${(await Promise.all(chunks.map((c) => readFile(join(dist, "_astro", c))))).map((b) => `${(b.length / 1024).toFixed(0)} KB`).join(", ")} uncompressed`)
})

// --- NUC-050: frame time, under an environment-aware policy (P22-A01, D-159) ---------------------------------------
// One threshold could not serve both an Apple M1 Max and a shared four-core runner, because the check measures the
// machine and the software renderer together. development/qa-budgets.json holds two, with what each one means:
// "reference" (100 ms, local runs, the standard the nucleus was accepted against) and "ci-smoke" (200 ms, GitHub's
// runner: a smoke ceiling that catches a renderer gone much slower, never an acceptable frame time). The distribution
// of every run, with its environment, goes to qa-report/nucleus-frames.json and is kept with the CI report.
const FRAME_POLICY = JSON.parse(await readFile(fileURLToPath(new URL("../development/qa-budgets.json", import.meta.url)), "utf8")).nucleusFrame
const FRAME_PROFILE = process.env.QA_PERF_PROFILE ?? (process.env.GITHUB_ACTIONS === "true" ? "ci-smoke" : "reference")
/** The same quantiles the check always used: the upper median, and the 95th percentile by rank. */
const spread = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
  return { frames: sorted.length, min: sorted[0], median: at(0.5), p95: at(0.95), max: sorted[sorted.length - 1] }
}
const round = (value, places = 1) => (value === undefined || value === null ? value : Number(value.toFixed(places)))
const roundSpread = (v) => ({ frames: v.frames, minMs: round(v.min), medianMs: round(v.median), p95Ms: round(v.p95), maxMs: round(v.max) })
/**
 * A reference workload for the same machine and renderer, drawn with raw WebGL and no site code: a lit sphere of about the
 * nucleus's triangle count in one draw call, on a canvas of the nucleus's pixel size. It is RECORDED beside the nucleus's
 * frame time and asserts nothing: whether the ratio of the two is steady from machine to machine (which would make a
 * machine-relative budget better than a ceiling) is a question the CI reports answer.
 */
const REFERENCE_WORKLOAD = `(async (triangles, width, height, frames) => {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.style.cssText = "position:fixed;left:0;top:0;width:" + width + "px;height:" + height + "px;pointer-events:none;opacity:0.01";
  document.body.append(canvas);
  const gl = canvas.getContext("webgl", { antialias: true, depth: true });
  if (!gl) { canvas.remove(); return null; }
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  const rings = Math.min(180, Math.max(8, Math.round(Math.sqrt(triangles / 4)))), around = rings * 2;
  const positions = [], indices = [];
  for (let i = 0; i <= rings; i++) for (let j = 0; j <= around; j++) { const phi = (i / rings) * Math.PI, theta = (j / around) * Math.PI * 2; positions.push(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)); }
  for (let i = 0; i < rings; i++) for (let j = 0; j < around; j++) { const a = i * (around + 1) + j, b = a + around + 1; indices.push(a, b, a + 1, b, b + 1, a + 1); }
  const shader = (type, source) => { const o = gl.createShader(type); gl.shaderSource(o, source); gl.compileShader(o); return o; };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, "attribute vec3 p; uniform float a; varying float l; void main() { float c = cos(a), s = sin(a); vec3 q = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); l = 0.35 + 0.65 * max(dot(q, normalize(vec3(0.4, 0.6, 0.7))), 0.0); gl_Position = vec4(q.x * 0.9, q.y * 0.9, q.z * 0.5, 1.0); }"));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, "precision mediump float; varying float l; void main() { gl_FragColor = vec4(l, l * 0.9, l * 0.7, 1.0); }"));
  gl.linkProgram(program); gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  const at = gl.getAttribLocation(program, "p"); gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  gl.enable(gl.DEPTH_TEST); gl.viewport(0, 0, width, height);
  const angle = gl.getUniformLocation(program, "a");
  const intervals = []; let last = performance.now(), turn = 0;
  await new Promise((resolve) => { const tick = (t) => { intervals.push(t - last); last = t; turn += 0.02; gl.uniform1f(angle, turn); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0); if (intervals.length > frames) resolve(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  canvas.remove(); gl.getExtension("WEBGL_lose_context")?.loseContext();
  return { renderer, triangles: indices.length / 3, width, height, intervals: intervals.slice(4) };
})`

await test("NUC-050", "Performance observed in this browser (software WebGL): frame times while responding, several samples, against the policy of this environment; and a resting nucleus", async (check) => {
  const policy = FRAME_POLICY.profiles[FRAME_PROFILE]
  check(policy !== undefined, `unknown performance profile "${FRAME_PROFILE}" (QA_PERF_PROFILE): the budgets file has ${Object.keys(FRAME_POLICY.profiles).join(", ")}`)
  if (policy === undefined) return
  await open(1440, 900)
  // Each sample starts from a nucleus at rest and gives it the same response: park, wait until the loop has stopped, then record the page's frame intervals while the pointer goes to a target.
  const samples = []
  for (let i = 0; i < FRAME_POLICY.samples; i++) {
    await park()
    await settleLoop(12_000)
    await js(`(() => { window.__frames = []; let last = performance.now(); (function tick(t) { window.__frames.push(t - last); last = t; window.__rafId = requestAnimationFrame(tick) })(last) })()`)
    const p = await targetPoint("Lab")
    await moveTo(p.x, p.y, 3, 10)
    await sleep(FRAME_POLICY.sampleMs)
    // The first two entries are the recorder's own start (an interval of zero, then one measured from before the first frame began).
    const frames = await js(`window.__frames.slice(2)`)
    await js(`cancelAnimationFrame(window.__rafId)`)
    samples.push({ intervals: frames, ...spread(frames.length ? frames : [0]) })
  }
  const d = await diag()
  // Back at rest, nothing further is drawn: the idle guard that belongs with the measurement.
  await park()
  await settleLoop(12_000)
  const rest = await diag()
  await sleep(1500)
  const stillRest = await diag()
  // The same machine and renderer on a plain workload (recorded, not asserted).
  const canvasSize = await js(`(() => { const c = document.querySelector("[data-nucleus-frame] canvas"); return { w: c.width, h: c.height }; })()`)
  const reference = await js(`${REFERENCE_WORKLOAD}(${d.triangles}, ${canvasSize.w}, ${canvasSize.h}, 70)`).catch(() => null)
  const referenceSpread = reference?.intervals?.length ? spread(reference.intervals) : null

  const medians = samples.map((x) => x.median).sort((a, b) => a - b)
  const medianOfMedians = medians[Math.floor(medians.length / 2)]
  const pooled = spread(samples.flatMap((x) => x.intervals))
  const verdict = medianOfMedians < policy.medianFrameMs && samples.every((x) => x.frames >= FRAME_POLICY.minFramesPerSample) ? "within" : "above"
  const agent = await js(`({ userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency, devicePixelRatio: devicePixelRatio })`)
  const record = {
    schema: "gusmaolab-nucleus-frames/1",
    generatedAt: new Date().toISOString(),
    check: "NUC-050",
    profile: FRAME_PROFILE,
    ceilingMs: policy.medianFrameMs,
    referenceMs: FRAME_POLICY.profiles.reference.medianFrameMs,
    ciSmokeMs: FRAME_POLICY.profiles["ci-smoke"].medianFrameMs,
    verdict,
    meaning: policy.meaning,
    environment: { ci: process.env.GITHUB_ACTIONS === "true", platform: platform(), arch: arch(), osRelease: release(), cpu: cpus()[0]?.model ?? "unknown", logicalCores: cpus().length, browser: agent.userAgent, hardwareConcurrency: agent.hardwareConcurrency, devicePixelRatio: agent.devicePixelRatio, renderer: reference?.renderer ?? "unknown", canvasPx: `${canvasSize.w} x ${canvasSize.h}`, viewport: "1440 x 900" },
    scene: { triangles: d.triangles, drawCalls: d.calls, resources: d.resources },
    samples: samples.map(({ intervals, ...rest }, i) => ({ sample: i + 1, ...roundSpread(rest), intervalsMs: intervals.map((v) => round(v)) })),
    summary: { medianOfSampleMediansMs: round(medianOfMedians), pooled: roundSpread(pooled) },
    referenceWorkload: referenceSpread ? { what: "a lit sphere of about the nucleus's triangle count, one draw call, the nucleus's canvas size, raw WebGL: the same machine and renderer without the site's code", triangles: reference.triangles, canvasPx: `${reference.width} x ${reference.height}`, ...roundSpread(referenceSpread), nucleusToWorkloadMedianRatio: round(medianOfMedians / referenceSpread.median, 2) } : null,
    note: "The CI smoke ceiling is not a target for the site and is not evidence that the frame time is acceptable to visitors. Software WebGL is the test browser's, not a visitor's GPU.",
  }
  const reportDir = process.env.QA_REPORT_DIR ?? fileURLToPath(new URL("../qa-report/", import.meta.url))
  await mkdir(reportDir, { recursive: true })
  await writeFile(join(reportDir, "nucleus-frames.json"), JSON.stringify(record, null, 2))
  console.log(`  observed (${FRAME_PROFILE} profile, ceiling ${policy.medianFrameMs} ms; software WebGL, ${canvasSize.w} x ${canvasSize.h} px canvas; ${record.environment.cpu}, ${record.environment.logicalCores} cores): rAF interval median of ${samples.length} samples ${medianOfMedians.toFixed(1)} ms (sample medians ${medians.map((v) => v.toFixed(1)).join(", ")}); pooled p95 ${pooled.p95.toFixed(1)} ms, max ${pooled.max.toFixed(1)} ms over ${pooled.frames} frames; ${d.triangles} triangles, ${d.resources} geometries/materials, ${d.calls} draw calls${referenceSpread ? `; plain sphere workload median ${referenceSpread.median.toFixed(1)} ms (ratio ${(medianOfMedians / referenceSpread.median).toFixed(2)})` : ""}`)

  check(samples.every((x) => x.frames >= FRAME_POLICY.minFramesPerSample), `too few animation frames in a sample: ${json(samples.map((x) => x.frames))} (at least ${FRAME_POLICY.minFramesPerSample} each)`)
  check(medianOfMedians < policy.medianFrameMs, `the median of the sample medians was ${medianOfMedians.toFixed(1)} ms, over the ${FRAME_PROFILE} ceiling of ${policy.medianFrameMs} ms (samples ${json(medians.map((v) => round(v)))}; pooled p95 ${pooled.p95.toFixed(1)} ms; see nucleus-frames.json)`)
  check(d.calls <= 6 && d.triangles < 140_000, `the draw calls or triangles exceed the budget: ${d.calls} calls, ${d.triangles} triangles`)
  check(!rest.loop && stillRest.frames === rest.frames, `a resting nucleus kept drawing: loop ${stillRest.loop}, frames ${rest.frames} to ${stillRest.frames}`)
})

await test("NUC-033", "A touch-oriented device (hover: none, pointer: coarse) gets the still nucleus", async (check) => {
  // Touch emulation is what makes the browser report a coarse, non-hovering pointer. It also
  // changes page layout for the rest of the session, so this and its swipe test run last.
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 })
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 800, deviceScaleFactor: 1, mobile: true })
  await goto(NUCLEUS_PAGE)
  await waitFor(`document.querySelector('[data-nucleus-frame]')?.dataset.nucleusState === "static" || document.querySelector('[data-nucleus-frame]')?.dataset.nucleusState === "ready"`, 20_000)
  await js(`(() => { const t = document.querySelector("[data-nucleus-diagnostics-toggle]"); if (t && !t.checked) t.click(); document.querySelector("[data-nucleus-frame]").scrollIntoView({ block: "center" }) })()`)
  await sleep(500)
  check((await state()) === "static", `the state is ${await state()}`)
  const d = await diag()
  check(d.mode === "static" && !d.loop && d.frames === 1 && d.ratio <= 1.5, `diagnostics ${json(d)}`)
  const p = await pixels()
  check(p.ink > 5000 && p.yellow > 0, `the still nucleus on a phone: ${p.ink} ink, ${p.yellow} yellow`)
  await js(`document.querySelector('[data-nucleus-target="Lab"]').dispatchEvent(new PointerEvent("pointerenter", { pointerType: "touch", bubbles: true }))`)
  await sleep(500)
  check((await diag()).frames === 1, "a touch pointer drew a frame")
  check(await js(`getComputedStyle(document.querySelector('[data-nucleus-frame] canvas')).touchAction`) === "auto", "the canvas takes over touch")
})

await test("NUC-033B", "With touch emulation on, a swipe over the nucleus scrolls the page (it is a still image)", async (check) => {
  check((await state()) === "static", `the state is ${await state()}`)
  const where = await js(`(() => { const r = document.querySelector("[data-nucleus-frame]").getBoundingClientRect(); return { x: r.x + r.width / 2, y: Math.min(innerHeight - 40, r.y + r.height / 2) } })()`)
  const top = await js(`document.documentElement.scrollTop`)
  const swiped = await touchSwipeScrolls(Math.round(where.x), Math.round(where.y), -250)
  check(swiped.scrolled, `a swipe over the nucleus did not scroll the page (${json(swiped)}; document ${await js(`document.documentElement.scrollHeight`)} px, window ${await js(`innerHeight`)} px, gesture at ${json(where)})`)
  await send("Emulation.setTouchEmulationEnabled", { enabled: false })
  await send("Emulation.clearDeviceMetricsOverride")
})

await finish()
