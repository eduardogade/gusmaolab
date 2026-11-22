// Measured performance in a real, headless Chromium (P22, D-155): cold loads of six representative pages,
// several runs each, with the environment recorded. The numbers are what the browser reported on this machine
// against a local static server; nothing is copied from an earlier run and nothing is invented.
//
// What is measured, per run (cache off, a fresh navigation): first and largest contentful paint, cumulative layout
// shift, an approximation of total blocking time (long tasks after first paint, each counted beyond 50 ms; this is
// NOT Lighthouse's simulated TBT), the number of requests, the bytes transferred by type (a local server does not
// compress, so these are raw bytes: the gzip budgets of the static audit are the compressed truth), the main-thread
// task and script time the browser reports, and, on Home, how many animation frames the page asks for in three
// idle seconds. Interaction responsiveness (INP) is not a lab metric and is not claimed: the nucleus suites
// measure the hover and focus response.
//
// What is asserted: the thresholds in development/qa-budgets.json, taken from a measured baseline with headroom,
// applied to the MEDIAN of the runs (a single slow run is variation, recorded as the range). The deterministic
// payload budgets are in the static audit; these are the ones that need a browser. No Lighthouse score is
// required, and nothing here lowers the site's functionality to improve a number.
//
// Without a browser or a build, every check is reported NOT RUN (exit 2). Writes qa-report/performance.json.
import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { cpus, platform, arch } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { json, serveFolder, sleep, startBrowser } from "./browser-harness.mjs"

const IDS = ["PERF-ENV", "PERF-001", "PERF-LCP", "PERF-CLS", "PERF-TBT", "PERF-REQ", "PERF-IDLE", "PERF-ISOLATION"]
const repo = fileURLToPath(new URL("../", import.meta.url))
const releaseDir = join(repo, "dist")
const demoDir = join(repo, "dist-demo")
if (!existsSync(join(releaseDir, "index.html")) || !existsSync(join(demoDir, "index.html"))) {
  for (const id of IDS) console.log(`NOT RUN ${id}`)
  console.error("NOT RUN: needs dist/ (npm run build) and dist-demo/ (npm run demo:build).")
  process.exit(2)
}
const budgets = JSON.parse(await readFile(join(repo, "development/qa-budgets.json"), "utf8"))
const RUNS = Math.max(1, Number(process.env.QA_PERF_RUNS ?? 5))

const release = await serveFolder(releaseDir)
const demo = await serveFolder(demoDir)
const origins = { release: release.origin, demo: demo.origin }
const { send, on, js, setViewport, test, finish } = await startBrowser({ ids: IDS, timeout: 900_000, root: "dist", external: release.origin, chromeArgs: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] })

const PAGES = [
  { name: "Home", cls: "home", source: "release", path: "/" },
  { name: "Home (tall window: the nucleus stage is in view and loads)", cls: "home-nucleus", source: "release", path: "/", viewport: [1440, 3400] },
  { name: "Contact", cls: "folder", source: "release", path: "/contact/" },
  { name: "Schedule (scheduling disabled)", cls: "folder", source: "release", path: "/schedule/" },
  { name: "Portfolio (Research)", cls: "folder", source: "release", path: "/portfolio/" },
  { name: "Editorial article (synthetic, demonstration build)", cls: "article", source: "demo", path: "/lecture-notes/greenhouse/demo-scientific-markdown/" },
  { name: "Quarto article (synthetic, isolated demonstration build)", cls: "article", source: "demo", path: "/lecture-notes/greenhouse/demo-synthetic-signals/" },
]

await send("Network.enable")
await send("Performance.enable")
await send("Network.setCacheDisabled", { cacheDisabled: true })
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `window.__perf = { lcp: 0, cls: 0, long: [], raf: 0 };
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime }).observe({ type: "largest-contentful-paint", buffered: true }) } catch {}
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value }).observe({ type: "layout-shift", buffered: true }) } catch {}
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.long.push([e.startTime, e.duration]) }).observe({ type: "longtask", buffered: true }) } catch {}
    const raf = window.requestAnimationFrame; window.requestAnimationFrame = function (cb) { window.__perf.raf++; return raf.call(window, cb) };`,
})
const requests = new Map()
on("Network.requestWillBeSent", (e) => requests.set(e.requestId, { url: e.request.url, type: e.type, bytes: 0 }))
on("Network.loadingFinished", (e) => {
  const r = requests.get(e.requestId)
  if (r) r.bytes = e.encodedDataLength
})

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const round = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d
const kb = (b) => round(b / 1024, 1)

async function once(source, path, { idle = false } = {}) {
  requests.clear()
  const blank = new Promise((resolve) => {
    const off = on("Page.loadEventFired", () => {
      off()
      resolve()
    })
  })
  await send("Page.navigate", { url: "about:blank" })
  await blank
  const baseline = await send("Performance.getMetrics")
  const loaded = new Promise((resolve) => {
    const off = on("Page.loadEventFired", () => {
      off()
      resolve()
    })
  })
  await send("Page.navigate", { url: `${origins[source]}${path}` })
  await loaded
  for (let t = 0; t < 4000; t += 100) {
    if ((await js(`window.__perf?.lcp > 0`).catch(() => false)) === true) break
    await sleep(100)
  }
  await sleep(1500) // the lazy nucleus and the clocks settle
  if (idle) {
    await js(`window.__perf.raf = 0`)
    await sleep(3000)
  }
  const page = await js(`(() => { const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0; const p = window.__perf; const tbt = p.long.filter(([s]) => s >= fcp).reduce((n, [, d]) => n + Math.max(0, d - 50), 0); return { fcp, lcp: p.lcp, cls: p.cls, tbt, raf: p.raf, long: p.long.length } })()`)
  const metrics = Object.fromEntries((await send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]))
  const base = Object.fromEntries(baseline.metrics.map((m) => [m.name, m.value]))
  const by = (types) => [...requests.values()].filter((r) => types.includes(r.type) && !r.url.startsWith("data:")).reduce((n, r) => n + r.bytes, 0)
  const all = [...requests.values()].filter((r) => !r.url.startsWith("data:"))
  return {
    ...page,
    requests: all.length,
    js: by(["Script"]),
    css: by(["Stylesheet"]),
    images: by(["Image"]),
    fonts: by(["Font"]),
    doc: by(["Document"]),
    mainThreadMs: round(((metrics.TaskDuration ?? 0) - (base.TaskDuration ?? 0)) * 1000),
    scriptMs: round(((metrics.ScriptDuration ?? 0) - (base.ScriptDuration ?? 0)) * 1000),
    urls: all.map((r) => r.url.replace(/^https?:\/\/[^/]+/, "")),
  }
}

const measured = []
async function measurePage(spec, setup) {
  const runs = []
  for (let i = 0; i < RUNS; i++) runs.push(await once(spec.source, spec.path, { idle: spec.cls === "home-nucleus" && i === 0 }))
  const col = (k) => runs.map((r) => r[k])
  const stat = (k, d = 0) => ({ median: round(median(col(k)), d), min: round(Math.min(...col(k)), d), max: round(Math.max(...col(k)), d) })
  const entry = {
    name: spec.name,
    cls: spec.cls,
    path: spec.path,
    source: spec.source,
    runs: RUNS,
    setup,
    median: { fcp: stat("fcp").median, lcp: stat("lcp").median, cls: stat("cls", 3).median, tbt: stat("tbt").median, requests: stat("requests").median, jsKB: kb(median(col("js"))), cssKB: kb(median(col("css"))), imagesKB: kb(median(col("images"))), fontsKB: kb(median(col("fonts"))), htmlKB: kb(median(col("doc"))), mainThreadMs: stat("mainThreadMs").median, scriptMs: stat("scriptMs").median },
    min: { lcp: stat("lcp").min, cls: stat("cls", 3).min },
    max: { lcp: stat("lcp").max, cls: stat("cls", 3).max },
    idleFrames: spec.cls === "home-nucleus" ? runs[0].raf : null,
    requestList: runs[0].urls,
  }
  measured.push(entry)
  return entry
}

await setViewport(1440, 900)
const version = (await send("Browser.getVersion")).product
const environment = {
  browser: version,
  machine: `${arch()} ${platform()}, ${cpus()[0]?.model ?? "unknown CPU"} (${cpus().length} logical cores)`,
  viewport: "1440 x 900, device pixel ratio 1, desktop",
  network: "local static server on 127.0.0.1, no throttling (bytes are raw: the server does not compress)",
  cpuThrottle: "none, except the labelled mobile row (4x, a simulation, not a phone)",
  webgl: "software (SwiftShader), so Home's nucleus is drawn without a GPU",
  runs: RUNS,
  cache: "disabled; a fresh navigation each run",
  measuredAt: new Date().toISOString(),
}
environment.summary = `${environment.browser}, ${environment.machine}; ${environment.viewport}; ${environment.network}; ${environment.runs} cold run(s) per page.`

for (const spec of PAGES) {
  const [w, h] = spec.viewport ?? [1440, 900]
  await setViewport(w, h)
  await measurePage(spec, `desktop ${w} x ${h}`)
}
await setViewport(1440, 900)
// Home as a small phone would load it, as an extra row: simulated, and said so.
await setViewport(390, 844, true)
await send("Emulation.setCPUThrottlingRate", { rate: 4 })
await measurePage({ name: "Home (390 px, 4x CPU throttle: simulated phone)", cls: "home-mobile", source: "release", path: "/" }, "390 px, mobile emulation, 4x CPU throttle")
await send("Emulation.setCPUThrottlingRate", { rate: 1 })
await setViewport(1440, 900)

const get = (cls) => measured.filter((m) => m.cls === cls)
const rows = (pred) => measured.filter(pred)

await test("PERF-ENV", "Performance results record the environment they were measured in", async (check) => {
  for (const key of ["browser", "machine", "viewport", "network", "cpuThrottle", "runs", "cache"]) check(Boolean(environment[key]), `the environment lacks ${key}`)
  check(measured.length === PAGES.length + 1 && measured.every((m) => m.runs === RUNS), `${measured.length} pages measured`)
})
await test("PERF-001", "JavaScript, CSS and image transfer stay within the measured route budgets (raw bytes, local server)", async (check) => {
  for (const m of rows((m) => budgets.measured[m.cls])) {
    const b = budgets.measured[m.cls]
    for (const [key, limit] of Object.entries({ jsKB: b.jsKB, cssKB: b.cssKB, imagesKB: b.imagesKB, htmlKB: b.htmlKB })) check(m.median[key] <= limit, `${m.name}: ${key} is ${m.median[key]}, over the budget of ${limit}`)
  }
  // The lazy load, in both directions: a short window never loads the graphics, a window that shows the stage does.
  const home = get("home")[0]
  const stage = get("home-nucleus")[0]
  check(home && !home.requestList.some((u) => /renderer\.|nucleus\./.test(u)), "Home loaded the graphics although the stage was not near the window")
  check(stage && stage.requestList.some((u) => /renderer\./.test(u)) && stage.requestList.some((u) => /nucleus\./.test(u)), "Home did not load the nucleus when its stage was in view")
  for (const m of rows((m) => !m.cls.startsWith("home"))) check(!m.requestList.some((u) => /renderer\.|nucleus\./.test(u)), `${m.name}: loaded the nucleus graphics`)
})
await test("PERF-LCP", "Largest contentful paint is within budget (median of the runs; the range is recorded)", async (check) => {
  for (const m of measured) check(m.median.lcp <= (budgets.metrics[m.cls]?.lcpMs ?? budgets.metrics.default.lcpMs), `${m.name}: LCP median ${m.median.lcp} ms (range ${m.min.lcp}-${m.max.lcp})`)
})
await test("PERF-CLS", "No page shifts its layout beyond the budget (cumulative layout shift, median)", async (check) => {
  for (const m of measured) check(m.median.cls <= budgets.metrics.default.cls, `${m.name}: CLS median ${m.median.cls} (range ${m.min.cls}-${m.max.cls}) over ${budgets.metrics.default.cls}`)
})
await test("PERF-TBT", "Blocking time after first paint is within budget (approximated from long tasks)", async (check) => {
  for (const m of measured) check(m.median.tbt <= (budgets.metrics[m.cls]?.tbtMs ?? budgets.metrics.default.tbtMs), `${m.name}: blocking time median ${m.median.tbt} ms`)
})
await test("PERF-REQ", "The number of requests stays within the route budget", async (check) => {
  for (const m of measured) check(m.median.requests <= (budgets.metrics[m.cls]?.requests ?? budgets.metrics.default.requests), `${m.name}: ${m.median.requests} requests`)
})
await test("PERF-IDLE", "Home asks for no animation frames while idle (the nucleus draws on demand)", async (check) => {
  const home = get("home-nucleus")[0]
  check(home.idleFrames !== null && home.idleFrames <= budgets.metrics.idleFrames, `${home.idleFrames} animation frames requested in 3 idle seconds with the nucleus loaded (budget ${budgets.metrics.idleFrames})`)
})
await test("PERF-ISOLATION", "The Quarto article's own assets are in its page only, and ordinary pages load no scientific runtime", async (check) => {
  for (const m of rows((m) => m.cls === "folder" || m.cls === "home")) check(!m.requestList.some((u) => /(^|\/)(katex|mathjax|plotly|quarto|bootstrap)/i.test(u)), `${m.name}: loads a scientific-article asset`)
})

try {
  const reportDir = process.env.QA_REPORT_DIR ?? join(repo, "qa-report")
  await mkdir(reportDir, { recursive: true })
  await writeFile(join(reportDir, "performance.json"), JSON.stringify({ environment, pages: measured.map(({ requestList, ...m }) => ({ ...m, requestCount: requestList.length })), notes: ["TBT is approximated from long tasks after first paint and is not Lighthouse's simulated TBT.", "Bytes are raw (a local server does not compress); the static audit's gzip budgets are the compressed truth.", "INP is not measured: it is a field metric; interaction cost is measured by the nucleus suites."] }, null, 2))
} catch {}

release.server.close()
demo.server.close()
await finish()
