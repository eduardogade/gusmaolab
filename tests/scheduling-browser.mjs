// Scheduling in a real, headless Chromium (P21, D-145 to D-150): the browser half of the SCH checks.
// It serves two things on two local origins: dist-demo/ (`npm run demo:build`, run first by
// `npm run test:browser`), which holds the development specimen and the real, unconfigured Schedule
// page; and a throwaway release build with scheduling ENABLED on a SYNTHETIC link
// (tests/scheduling-ready-build.mjs), which holds the ready page.
//
// The provider is never contacted. The ready page's provider requests are intercepted by the browser
// itself (DevTools `Fetch`): in one run they fail, as with a content blocker or an outage, and in
// another a small STAND-IN script answers (it speaks the same queue protocol and draws a labelled
// placeholder). The stand-in proves the page's own wiring (the button, the loading and ready states,
// the reserved frame, the fallback link) and is NOT the provider: that the real calendar loads, shows
// real availability, verifies email, or notifies anyone is BLOCKED until the owner has an account.
//
// What they do not show: Safari, Firefox, Chrome on Android, a screen reader, a real phone, or any
// provider behaviour. Without a browser or dist-demo/ every check is reported NOT RUN (exit 2).
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"
import { json, sleep, startBrowser } from "./browser-harness.mjs"
import { buildWith, SYNTHETIC_LINK } from "./scheduling-ready-build.mjs"
import { SCHEDULING_PAGE, SITE_MAP } from "../src/design/site-map.ts"
import { COPY } from "../src/scheduling/copy.ts"

const IDS = ["SCH-014S", "SCH-017B", "SCH-018B", "SCH-020B", "SCH-044", "SCH-045", "SCH-046", "SCH-047", "SCH-048", "SCH-050", "SCH-071"]
const demoDist = fileURLToPath(new URL("../dist-demo/", import.meta.url))
if (!existsSync(join(demoDist, "index.html"))) {
  for (const id of IDS) console.log(`NOT RUN ${id}`)
  console.error("NOT RUN: dist-demo/ is not built; run `npm run demo:build`.")
  process.exit(2)
}
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png" }
const serveFolder = async (folder) => {
  const server = createServer(async (request, response) => {
    let path = decodeURIComponent(new URL(request.url, "http://localhost").pathname)
    if (path.endsWith("/")) path += "index.html"
    const file = normalize(join(folder, path))
    try {
      if (!file.startsWith(folder)) throw new Error("outside")
      const body = await readFile(file)
      response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }).end(body)
    } catch {
      response.writeHead(404, { "content-type": "text/plain" }).end("Not found")
    }
  })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  return { server, origin: `http://127.0.0.1:${server.address().port}` }
}
const demo = await serveFolder(demoDist)
const ready = await buildWith()
if (!ready.ok) {
  console.error(`FAIL: the throwaway ready build failed:\n${ready.output.slice(-600)}`)
  process.exit(1)
}
const readyServer = await serveFolder(ready.dist)

const { send, on, js, setViewport, goto, waitForPath, press, test, finish } = await startBrowser({ ids: IDS, timeout: 400_000, root: "dist-demo", external: demo.origin })

// --- Helpers ---------------------------------------------------------------------------------------------------

const WIDTHS = [320, 390, 430, 768, 1024, 1280, 1440]
const STAND_IN = `(function () {
  var q = window.Cal && window.Cal.q ? window.Cal.q : [];
  for (var i = 0; i < q.length; i++) {
    var call = q[i];
    if (call[0] === "inline") {
      call[1].elementOrSelector.innerHTML = '<div data-stand-in-provider style="padding:1rem">STAND-IN calendar (not the provider): ' + call[1].calLink + ', layout ' + call[1].config.layout + '</div>';
    }
  }
  for (var j = 0; j < q.length; j++) if (q[j][0] === "on" && q[j][1].action === "linkReady") q[j][1].callback();
})();`
let providerMode = "block" // "block" | "stand-in"
const providerRequests = []
await send("Fetch.enable", { patterns: [{ urlPattern: "https://app.cal.com/*" }, { urlPattern: "https://cal.com/*" }] })
on("Fetch.requestPaused", (e) => {
  providerRequests.push(e.request.url)
  if (providerMode === "stand-in" && /\/embed\/embed\.js$/.test(e.request.url))
    send("Fetch.fulfillRequest", { requestId: e.requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/javascript" }], body: Buffer.from(STAND_IN).toString("base64") })
  else send("Fetch.failRequest", { requestId: e.requestId, errorReason: "BlockedByClient" })
})

const gotoReady = async (path) => {
  const loaded = new Promise((resolve) => {
    const off = on("Page.loadEventFired", () => {
      off()
      resolve()
    })
  })
  await send("Page.navigate", { url: `${readyServer.origin}${path}` })
  await loaded
  await sleep(80)
}
const metrics = () =>
  js(`({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    h1: document.querySelectorAll("main h1").length,
    wide: [...document.querySelectorAll("main *")].filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && !el.closest(".gl-folder__strip, [data-schedule-frame]")).length,
    rows: document.querySelectorAll(".gl-folder__strip").length,
  })`)
let lastClick = null
const clickAt = async (selector) => {
  // `hit` is what the click will reach, for a failure to explain itself (the first GitHub run, P22-A01).
  const point = await js(`(() => { const el = document.querySelector(${json(selector)}); if (!el) return null; el.scrollIntoView({ block: "center", inline: "center" }); const r = el.getClientRects()[0]; const x = r.x + r.width / 2, y = r.y + r.height / 2; const hit = document.elementFromPoint(x, y); return { x, y, hit: hit ? hit.tagName.toLowerCase() + (hit.getAttribute("href") ? "[" + hit.getAttribute("href") + "]" : "") : null, boxes: el.getClientRects().length } })()`)
  if (point === null) throw new Error(`nothing matches ${selector}`)
  lastClick = { selector, ...point }
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: point.x, y: point.y, button: "left", clickCount: 1 })
  await sleep(60)
}
const waitFor = async (expression, ms = 4000) => {
  for (let t = 0; t < ms; t += 50) {
    if (await js(expression)) return true
    await sleep(50)
  }
  return false
}
const sim = (selector) => `document.querySelector('[data-sim] ${selector}')`

await goto("/")

// --- Specimen and navigation path --------------------------------------------------------------------------------

await test("SCH-071", "The specimen is reached by clicking from the local homepage, and leads back to the real page", async (check) => {
  await setViewport(1440, 900)
  await goto("/")
  await clickAt(`a[href="${SITE_MAP}"]`)
  check(await waitForPath(SITE_MAP), `did not arrive at ${SITE_MAP}`)
  check(await js(`!!document.querySelector('a[href="${SCHEDULING_PAGE}"]')`), "the site map does not list the Scheduling Integration specimen")
  check((await js(`document.querySelector('a[href="${SCHEDULING_PAGE}"]').textContent.trim()`)) === "Scheduling Integration", "the link does not say Scheduling Integration")
  await clickAt(`a[href="${SCHEDULING_PAGE}"]`)
  check(await waitForPath(SCHEDULING_PAGE), `did not arrive at ${SCHEDULING_PAGE}`)
  check(await js(`!!document.querySelector("[data-scheduling-specimen]")`), "no specimen banner")
  check((await js(`document.querySelectorAll(".gl-folder-tab").length`)) >= 11, "the folder tabs are missing")
  await clickAt('[data-scheduling-specimen] a[href="/schedule/"]')
  check(await waitForPath("/schedule/"), `the real Schedule page is not one click away (the click: ${json(lastClick)})`)
  check(await js(`document.querySelector("[data-schedule]") === null && !!document.querySelector('[data-state-notice="preparation"]')`), "the real, unconfigured page is not the honest notice")
})

await test("SCH-050", "Every simulated element is visibly labelled, and the specimen collects nothing", async (check) => {
  await setViewport(1280, 900)
  await goto(SCHEDULING_PAGE)
  const page = await js(`({
    label: document.querySelector("[data-schedule-simulation-label]")?.textContent.replace(/\\s+/g, " ").trim(),
    banner: document.querySelector("[data-scheduling-specimen]")?.textContent.replace(/\\s+/g, " "),
    labelBottom: document.querySelector("[data-schedule-simulation-label]")?.getBoundingClientRect().bottom,
    firstDay: document.querySelector("[data-sim-day]")?.getBoundingClientRect().top,
    fields: document.querySelectorAll("main input, main textarea, main form").length,
    links: [...document.querySelectorAll("main a")].filter((a) => /cal\\.com/.test(a.href)).length,
    real: document.querySelector("[data-scheduling-real-state]")?.textContent,
  })`)
  check(/Development demonstration: no real booking will be created/.test(page.label), page.label)
  check(/no real booking will be created/.test(page.banner) && /synthetic/i.test(page.banner), page.banner)
  check(page.labelBottom <= page.firstDay, "the label comes after the calendar it labels")
  check(page.fields === 0 && page.links === 0, `fields ${page.fields}, provider links ${page.links}`)
  check(page.real === "unconfigured", `the specimen reports the real page as ${page.real}`)
  check(!providerRequests.some((u) => /cal\.com/.test(u)), `the specimen contacted the provider: ${json(providerRequests)}`)
})

await test("SCH-046", "The specimen works by keyboard alone: date, time, request, verify, decide", async (check) => {
  await setViewport(1280, 900)
  await goto(SCHEDULING_PAGE)
  const focusNext = async (predicate, limit = 80) => {
    for (let i = 0; i < limit; i++) {
      await press("Tab")
      if (await js(`(${predicate})(document.activeElement)`)) return true
    }
    return false
  }
  check(await focusNext(`(el) => el.matches("[data-sim-zone]")`), "the zone chooser is not reachable by Tab")
  check(await focusNext(`(el) => el.matches("[data-sim-day][data-day-status='past']")`), "the calendar's days are not reachable by Tab")
  await press("Enter")
  check((await js(`${sim('[data-day-status="past"][aria-pressed="true"]')} === null`)), "Enter selected an unavailable day")
  check(await focusNext(`(el) => el.matches("[data-sim-day][data-day-status='available']")`, 30), "no available day takes focus")
  await press("Enter")
  check(await waitFor(`document.querySelectorAll("[data-sim-slot]").length === 3`), "Enter on an available day showed no three slots")
  check(await focusNext(`(el) => el.matches("[data-sim-slot]")`, 40), "a slot is not reachable by Tab")
  await press("Enter")
  check(await waitFor(`!document.querySelector("[data-sim-request]").hidden`), "choosing a slot did not offer the request")
  check(await focusNext(`(el) => el.matches("[data-sim-request]")`, 10), "the request control is not reachable")
  await press("Enter")
  check(await waitFor(`!document.querySelector('[data-sim-output="verification"]').hidden`), "no verification step")
  check(await focusNext(`(el) => el.matches("[data-sim-verify]")`, 10), "the verify control is not reachable")
  await press("Enter")
  check(await waitFor(`!document.querySelector('[data-sim-output="pending"]').hidden`), "no pending state")
  check(await focusNext(`(el) => el.matches('[data-sim-decide="accept"]')`, 10), "the accept control is not reachable")
  await press("Enter")
  check(await waitFor(`!document.querySelector('[data-sim-output="confirmed"]').hidden`), "no confirmed state")
})

await test("SCH-047", "Focus indicators stay visible on every control", async (check) => {
  await setViewport(1280, 900)
  const indicator = `(() => { const el = document.activeElement; const s = getComputedStyle(el); return el.matches(":focus-visible") && ((s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none") })()`
  // Reach each control the way a keyboard user does: by Tab.
  const reach = async (selector) => {
    for (let i = 0; i < 120; i++) {
      await press("Tab")
      if (await js(`document.activeElement.matches(${json(selector)})`)) return js(indicator)
    }
    return null
  }
  await goto(SCHEDULING_PAGE)
  for (const selector of ["[data-scheduling-specimen] a", "[data-sim-zone]", "[data-sim-day][data-day-status='available']", "[data-sim-unavailable]", "[data-sim-reset]"]) {
    const shown = await reach(selector)
    check(shown === true, `${selector}: ${shown === null ? "not reachable by Tab" : "shows no focus indicator"}`)
  }
  providerMode = "stand-in"
  await gotoReady("/schedule/")
  for (const selector of ["[data-schedule-load]", "[data-schedule-fallback] a"]) {
    const shown = await reach(selector)
    check(shown === true, `${selector} (ready page): ${shown === null ? "not reachable by Tab" : "shows no focus indicator"}`)
  }
})

await test("SCH-050B", "The specimen's request states read as simulations, in order, with the page's own words", async (check) => {
  await setViewport(1280, 900)
  await goto(SCHEDULING_PAGE)
  await clickAt('[data-sim-day][data-day-status="available"]')
  await js(`document.querySelector("[data-sim-zone]").value = "Pacific/Auckland"; document.querySelector("[data-sim-zone]").dispatchEvent(new Event("change", { bubbles: true }))`)
  const first = await js(`document.querySelector("[data-sim-slot]").textContent`)
  check(/2027-01-07, 01:00/.test(first) && /Pacific\/Auckland/.test(first), `a slot reads "${first}" (expected the next day in Auckland)`)
  await js(`document.querySelector("[data-sim-zone]").value = "America/Recife"; document.querySelector("[data-sim-zone]").dispatchEvent(new Event("change", { bubbles: true }))`)
  const home = await js(`document.querySelector("[data-sim-slot]").textContent`)
  check(/2027-01-06, 09:00/.test(home) && /America\/Recife/.test(home), `a slot reads "${home}"`)
  await clickAt("[data-sim-slot]")
  await clickAt("[data-sim-request]")
  const verification = await js(`document.querySelector('[data-sim-output="verification"]').textContent.replace(/\\s+/g, " ")`)
  check(verification.includes(COPY.status.verification.text), verification)
  await clickAt("[data-sim-verify]")
  const pending = await js(`document.querySelector('[data-sim-output="pending"]').textContent.replace(/\\s+/g, " ")`)
  check(pending.includes("awaiting confirmation") && pending.includes("not a confirmed meeting") && !/Meeting confirmed/.test(pending), pending)
  await clickAt('[data-sim-decide="reject"]')
  check((await js(`document.querySelector('[data-sim-output="declined"]').textContent`)).includes("No meeting is scheduled"), "no declined state")
  await clickAt("[data-sim-reset]")
  check(await js(`document.querySelector("[data-sim]").dataset.simState === "idle"`), "Start over did not reset")
  await clickAt("[data-sim-unavailable]")
  check(!(await js(`document.querySelector('[data-sim-output="unavailable"]').hidden`)), "no provider-unavailable state")
  check(await js(`!!document.querySelector('[data-sim-live]') && document.querySelector('[data-sim-live]').getAttribute("role") === "status"`), "the request states are not announced")
})

// --- The ready page, against a blocked and a stand-in provider ------------------------------------------------------------

await test("SCH-017B", "A blocked provider shows an understandable failure beside the hosted booking page", async (check) => {
  providerMode = "block"
  providerRequests.length = 0
  await setViewport(1280, 900)
  await gotoReady("/schedule/")
  check(providerRequests.length === 0, `the provider was contacted before the button was pressed: ${json(providerRequests)}`)
  check(await js(`document.querySelector("[data-booking-status]").dataset.bookingStatus === "idle" && !document.querySelector("[data-schedule-load-row]").hidden`), "the page is not idle with its button shown")
  await clickAt("[data-schedule-load]")
  check(await waitFor(`document.querySelector("[data-booking-status]").dataset.bookingStatus === "failed"`, 8000), "the blocked provider did not produce the failed state")
  const state = await js(`({
    text: document.querySelector("[data-schedule-status]").textContent,
    hidden: document.querySelector("[data-schedule-status]").hidden,
    frame: document.querySelector("[data-schedule-frame]").hidden,
    fallback: document.querySelector("[data-schedule-fallback] a")?.href,
    fallbackShown: document.querySelector("[data-schedule-fallback] a")?.getBoundingClientRect().height > 0,
    button: document.querySelector("[data-schedule-load-row]").hidden,
  })`)
  check(state.text === COPY.failed && !state.hidden, state.text)
  check(state.frame === true && state.button === true, "an empty frame or a spent button is still on screen")
  check(state.fallback === SYNTHETIC_LINK && state.fallbackShown, `fallback ${state.fallback}`)
  check(providerRequests.every((u) => /^https:\/\/app\.cal\.com\//.test(u)), `requests went to ${json(providerRequests)}`)
})

await test("SCH-048", "The provider error state is announced and readable", async (check) => {
  const a11y = await js(`(() => {
    const s = document.querySelector("[data-schedule-status]");
    const r = s.getBoundingClientRect();
    const st = getComputedStyle(s);
    return { role: s.getAttribute("role"), text: s.textContent.length, visible: r.width > 100 && r.height > 20, color: st.color, bg: st.backgroundColor, fontSize: parseFloat(st.fontSize) }
  })()`)
  check(a11y.role === "status" && a11y.text > 80 && a11y.visible && a11y.fontSize >= 14, json(a11y))
})

await test("SCH-018B", "The failure leaves the folder navigation working", async (check) => {
  const tabs = await js(`[...document.querySelectorAll(".gl-folder__strip .gl-folder-tab")].length`)
  check(tabs === 11, `${tabs} tabs after the failure`)
  await clickAt('.gl-folder__strip a[href="/contact/"]')
  const reached = await waitFor(`location.pathname === "/contact/"`, 5000)
  check(reached, "the Contact tab did not navigate after the provider failed")
  check(await js(`document.querySelector('.gl-folder-tab[data-selected]')?.dataset.tabId === "contact"`), "the selected tab is not Contact")
})

await test("SCH-014S", "With a stand-in provider the page loads the monthly calendar into its reserved frame (wiring, not the provider)", async (check) => {
  providerMode = "stand-in"
  providerRequests.length = 0
  await setViewport(1280, 900)
  await gotoReady("/schedule/")
  await clickAt("[data-schedule-load]")
  check(await waitFor(`document.querySelector("[data-booking-status]").dataset.bookingStatus === "ready"`, 8000), "the stand-in provider did not produce the ready state")
  const frame = await js(`(() => { const f = document.querySelector("[data-schedule-frame]"); const r = f.getBoundingClientRect(); return { hidden: f.hidden, height: r.height, width: r.width, inner: f.querySelector("[data-stand-in-provider]")?.textContent, status: document.querySelector("[data-schedule-status]").hidden } })()`)
  check(!frame.hidden && frame.height >= 600 && frame.width > 200, json(frame))
  check(/synthetic-test-user\/synthetic-meeting/.test(frame.inner) && /layout month_view/.test(frame.inner), frame.inner)
  check(frame.status === true, "a status message stays on screen once the calendar is ready")
  check(providerRequests.length === 1 && /embed\/embed\.js$/.test(providerRequests[0]), `provider requests: ${json(providerRequests)}`)
  check(!(await js(`!!document.querySelector("[data-schedule-fallback] a") === false`)), "the hosted booking page link vanished")
})

await test("SCH-020B", "Without scripts the ready page is readable, shows no dead button, and keeps the hosted link", async (check) => {
  await setViewport(1280, 900)
  await send("Emulation.setScriptExecutionDisabled", { value: true })
  try {
    providerRequests.length = 0
    await gotoReady("/schedule/")
    const page = await js(`({
      text: document.querySelector("main").innerText,
      row: document.querySelector("[data-schedule-load-row]").hidden,
      visibleButton: [...document.querySelectorAll("main button")].filter((b) => b.getBoundingClientRect().height > 0).length,
      link: document.querySelector("[data-schedule-fallback] a")?.getBoundingClientRect().height > 0,
    })`)
    check(/Requests are reviewed before confirmation/.test(page.text) && /How a request works/.test(page.text) && /Open the booking page/.test(page.text), "the page lost its words without scripts")
    check(page.row === true && page.visibleButton === 0, "a button that cannot work is visible without scripts")
    check(page.link === true, "the hosted booking link is not shown without scripts")
    check(providerRequests.length === 0, "the provider was contacted without a script and without a press")
  } finally {
    await send("Emulation.setScriptExecutionDisabled", { value: false })
  }
})

// --- Layout at seven widths ----------------------------------------------------------------------------------------------

await test("SCH-044", "Desktop: the Schedule page, ready and unconfigured, and the specimen are readable at 1280 and 1440", async (check) => {
  for (const width of [1280, 1440]) {
    await setViewport(width, 900)
    providerMode = "stand-in"
    for (const [name, open] of [
      ["real unconfigured", () => goto("/schedule/")],
      ["ready", () => gotoReady("/schedule/")],
      ["specimen", () => goto(SCHEDULING_PAGE)],
    ]) {
      await open()
      const m = await metrics()
      check(m.overflow <= 0 && m.wide === 0 && m.h1 === 1 && m.rows <= 3, `${name} at ${width}: ${json(m)}`)
      const read = await js(`(() => { const p = document.querySelector("main p, main .dest__lede"); return parseFloat(getComputedStyle(p).fontSize) })()`)
      check(read >= 14, `${name} at ${width}: text is ${read}px`)
    }
    // The month grid keeps seven columns with tap-sized days.
    await goto(SCHEDULING_PAGE)
    const grid = await js(`(() => { const d = [...document.querySelectorAll("[data-sim-day]")].map((b) => b.getBoundingClientRect()); return { min: Math.min(...d.map((r) => r.width)), tall: Math.min(...d.map((r) => r.height)), cols: new Set(d.map((r) => Math.round(r.left))).size } })()`)
    check(grid.cols === 7 && grid.min >= 28 && grid.tall >= 40, `${width}: ${json(grid)}`)
  }
})

await test("SCH-045", "Mobile: the calendar, the controls and the failure state fit at 320, 390, 430 and 768", async (check) => {
  for (const width of [320, 390, 430, 768]) {
    await setViewport(width, 900, width < 768)
    providerMode = "stand-in"
    await goto(SCHEDULING_PAGE)
    let m = await metrics()
    check(m.overflow <= 0 && m.wide === 0, `specimen at ${width}: ${json(m)}`)
    const days = await js(`[...document.querySelectorAll("[data-sim-day]")].map((b) => { const r = b.getBoundingClientRect(); return r.width >= 24 && r.height >= 40 && r.right <= document.documentElement.clientWidth + 1 })`)
    check(days.every(Boolean), `at ${width}: a day is cut off or too small`)
    await clickAt('[data-sim-day][data-day-status="available"]')
    await clickAt("[data-sim-slot]")
    await clickAt("[data-sim-request]")
    await clickAt("[data-sim-verify]")
    m = await metrics()
    check(m.overflow <= 0 && m.wide === 0, `specimen (after a request) at ${width}: ${json(m)}`)
    for (const [name, mode] of [["stand-in", "stand-in"], ["blocked", "block"]]) {
      providerMode = mode
      await gotoReady("/schedule/")
      await clickAt("[data-schedule-load]")
      await waitFor(`["ready","failed"].includes(document.querySelector("[data-booking-status]").dataset.bookingStatus)`, 8000)
      m = await metrics()
      check(m.overflow <= 0 && m.wide === 0, `ready page (${name}) at ${width}: ${json(m)}`)
      const link = await js(`(() => { const r = document.querySelector("[data-schedule-fallback] a").getBoundingClientRect(); return r.height >= 16 && r.right <= document.documentElement.clientWidth + 1 })()`)
      check(link, `ready page (${name}) at ${width}: the hosted link is cut off`)
    }
    await goto("/schedule/")
    m = await metrics()
    check(m.overflow <= 0 && m.wide === 0, `real unconfigured page at ${width}: ${json(m)}`)
  }
  await setViewport(1440, 900)
})

readyServer.server.close()
demo.server.close()
await ready.cleanup()
await send("Fetch.disable")
await finish()
