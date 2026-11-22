// The world clocks in a real, headless Chromium (P16, D-118 to D-121): the live checks of
// CLOCK-019 to CLOCK-034 as a visitor's browser runs them, and the simulated-instant specimen. It
// serves dist-demo/ (`npm run demo:build`, run first by `npm run test:browser`) because the specimen
// exists only there; its real Home is the release homepage plus one development link.
//
// How time is controlled: a script installed before the page's own scripts replaces `Date.now` with
// a clock that starts at a chosen UTC instant and then runs at real speed (and can be moved by
// hand), and wraps `setTimeout` so the tests can count the timers that are pending. The page's real
// scripts, timers and listeners run unchanged. Expected local times come from
// tests/fixtures/clocks/reference.json (Python's zoneinfo), not from the code under test.
//
// What it shows: the clocks fill in, advance at the minute, pause while hidden, recover when shown
// or restored, hold one timer, stay honest without JavaScript, do not shift the layout and fit at
// seven widths. What it does not show: Safari, Firefox, Chrome on Android or a real device, a real
// background tab (hiding is simulated by the page's own visibility events), a screen reader, or
// whether the owner likes it. Without a browser or dist-demo/ every check is reported NOT RUN (exit 2).
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { json, sleep, startBrowser } from "./browser-harness.mjs"

const IDS = ["CLOCK-019B", "CLOCK-020B", "CLOCK-021B", "CLOCK-022B", "CLOCK-023B", "CLOCK-024B", "CLOCK-025B", "CLOCK-026B", "CLOCK-028", "CLOCK-030", "CLOCK-031", "CLOCK-032B", "CLOCK-033B", "CLOCK-034B", "CLOCK-041"]
const { js, send, setViewport, goto, test, finish } = await startBrowser({
  ids: IDS,
  timeout: 300_000,
  root: "dist-demo",
})
const REFERENCE = JSON.parse(await readFile(fileURLToPath(new URL("./fixtures/clocks/reference.json", import.meta.url)), "utf8")).instants
const ORDER = ["anchorage", "mexico-city", "brasilia", "accra", "moscow", "dhaka", "koror", "auckland"]
const WIDTHS = [320, 390, 430, 768, 1024, 1280, 1440]

// --- A page clock the tests can set, and a count of pending timers --------------------------------

let installed
async function useClock(baseIso) {
  if (installed) await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: installed })
  installed = undefined
  if (baseIso === undefined) return
  const source = `
    (() => {
      const real = Date.now.bind(Date);
      const clock = { base: ${Date.parse(baseIso)}, t0: real() };
      Date.now = () => clock.base + (real() - clock.t0);
      window.__setNow = (ms) => { clock.base = ms; clock.t0 = real(); };
      const live = new Map(), set = window.setTimeout.bind(window), clear = window.clearTimeout.bind(window);
      window.setTimeout = (fn, delay, ...rest) => { const id = set(() => { live.delete(id); fn(...rest); }, delay); live.set(id, delay); return id; };
      window.clearTimeout = (id) => { live.delete(id); clear(id); };
      window.__timers = () => [...live.values()];
      window.__shifts = [];
      new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__shifts.push({ value: e.value, nodes: e.sources.map((s) => s.node?.closest?.(".clocks") ? "clocks" : "other") }); }).observe({ type: "layout-shift", buffered: true });
    })();`
  installed = (await send("Page.addScriptToEvaluateOnNewDocument", { source })).identifier
}

/** What the page's clocks show now: per place, the time text, its datetime, the date text and its datetime. */
const readClocks = () =>
  js(`[...document.querySelectorAll("[data-home-region=clocks] [data-clock-id]")].map((li) => {
    const t = li.querySelector("[data-clock-time]"), d = li.querySelector("[data-clock-date]");
    return { id: li.dataset.clockId, state: li.dataset.clockState, time: t.textContent, timeAt: t.getAttribute("datetime"), tag: t.localName, date: d.textContent, dateAt: d.getAttribute("datetime"), hidden: li.querySelector("[data-clock-reading]").getAttribute("aria-hidden") };
  })`)
const expected = (iso) => REFERENCE[iso] ?? (() => { throw new Error(`no reference for ${iso}`) })()
const showsReference = (clocks, iso) =>
  clocks.length === 8 &&
  clocks.every((c, i) => c.id === ORDER[i] && c.time === expected(iso)[c.id].slice(11) && c.timeAt === expected(iso)[c.id] && c.dateAt === expected(iso)[c.id].slice(0, 10) && c.state === "live" && c.hidden === null)
const timers = () => js(`window.__timers().filter((d) => d > 0 && d <= 61000).length`)
async function until(condition, timeout = 5000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await condition()) return true
    await sleep(50)
  }
  return false
}
const setHidden = (hidden) =>
  js(`(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => ${json(hidden ? "hidden" : "visible")} }); document.dispatchEvent(new Event("visibilitychange")); })()`)

// --- Live behaviour -------------------------------------------------------------------------------

await test("CLOCK-019B", "The clocks fill in when the page loads, each with its own time and date", async (check) => {
  await setViewport(1440, 900)
  await useClock("2026-11-16T09:00:20Z")
  await goto("/")
  check(await until(async () => (await readClocks()).every((c) => c.state === "live")), "the clocks never went live")
  const clocks = await readClocks()
  check(showsReference(clocks, "2026-11-16T09:00:00Z"), `readings differ from the reference: ${json(clocks)}`)
  check(clocks.every((c) => c.tag === "time"), "a reading is not a <time> element")
  check(clocks.every((c) => /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(c.timeAt) && /^\d{4}-\d\d-\d\d$/.test(c.dateAt)), "a datetime attribute is malformed")
  check(clocks.find((c) => c.id === "anchorage").date === "Monday, 16 November" && clocks.find((c) => c.id === "auckland").date === "Monday, 16 November", "dates")
  const region = await js(`(() => { const r = document.querySelector("[data-home-region=clocks]"); return { state: r.dataset.clocksState, note: r.querySelector("[data-clocks-note]").textContent }; })()`)
  check(region.state === "live" && /this device’s clock/.test(region.note), `region ${json(region)}`)
})

await test("CLOCK-020B", "The display advances when the minute changes", async (check) => {
  await useClock("2026-11-16T09:59:58Z")
  await goto("/")
  check(await until(async () => showsReference(await readClocks(), "2026-11-16T09:59:00Z")), `before the minute: ${json((await readClocks()).map((c) => c.timeAt))}`)
  // The page's own timer, aimed at the boundary, fires about two seconds later.
  check(await until(async () => showsReference(await readClocks(), "2026-11-16T10:00:00Z"), 6000), `after the minute: ${json((await readClocks()).map((c) => c.timeAt))}`)
  check((await timers()) === 1, `${await timers()} timers pending after the update`)
})

await test("CLOCK-021B", "One timer serves all eight clocks", async (check) => {
  await useClock("2026-11-16T09:00:20Z")
  await goto("/")
  await until(async () => (await readClocks()).every((c) => c.state === "live"))
  check((await timers()) === 1, `${await timers()} timers pending`)
  const delay = await js(`window.__timers().filter((d) => d > 0 && d <= 61000)[0]`)
  check(delay > 30_000 && delay <= 40_100, `the timer is ${delay} ms, aimed at the next minute from :20`)
  check(await js(`document.querySelectorAll("[data-home-region=clocks] script").length`) === 0, "a script inside the clocks")
})

await test("CLOCK-022B", "A hidden page keeps no timer", async (check) => {
  await useClock("2026-11-16T09:00:20Z")
  await goto("/")
  await until(async () => (await readClocks()).every((c) => c.state === "live"))
  await setHidden(true)
  await sleep(100)
  check((await timers()) === 0, `${await timers()} timers pending while hidden`)
  await js(`window.__setNow(Date.parse("2026-11-16T10:30:00Z"))`)
  await sleep(1500)
  check(showsReference(await readClocks(), "2026-11-16T09:00:00Z"), "the clocks changed while the page was hidden")
})

await test("CLOCK-023B", "A page shown again redraws at once", async (check) => {
  await useClock("2026-11-16T09:00:20Z")
  await goto("/")
  await until(async () => (await readClocks()).every((c) => c.state === "live"))
  await setHidden(true)
  await js(`window.__setNow(Date.parse("2026-11-16T10:47:05Z"))`)
  const before = Date.now()
  await setHidden(false)
  check(await until(async () => showsReference(await readClocks(), "2026-11-16T10:47:00Z"), 1000), `not redrawn: ${json((await readClocks()).map((c) => c.timeAt))}`)
  check(Date.now() - before < 1000, "slow to redraw")
  check((await timers()) === 1, `${await timers()} timers pending after showing`)
})

await test("CLOCK-024B", "A page restored from history is redrawn, and Back/Forward leave live clocks", async (check) => {
  await useClock("2026-11-16T09:00:20Z")
  await goto("/")
  await until(async () => (await readClocks()).every((c) => c.state === "live"))
  await js(`window.__setNow(Date.parse("2026-11-16T10:47:05Z")); window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }))`)
  check(await until(async () => showsReference(await readClocks(), "2026-11-16T10:47:00Z"), 1000), "a persisted pageshow did not redraw")
  // A pageshow that is not a restoration changes nothing and starts nothing.
  const timersBefore = await timers()
  await js(`window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: false }))`)
  check((await timers()) === timersBefore, "a plain pageshow changed the timers")
  // Real navigation: away, then Back, then Forward.
  await goto("/about/")
  const back = (await send("Page.getNavigationHistory"))
  await send("Page.navigateToHistoryEntry", { entryId: back.entries[back.currentIndex - 1].id })
  check(await until(async () => (await js(`location.pathname`)) === "/" && (await readClocks()).every((c) => c.state === "live"), 8000), "the clocks are not live after Back")
  const afterBack = await readClocks()
  check(afterBack.every((c, i) => c.id === ORDER[i] && /^([01]\d|2[0-3]):[0-5]\d$/.test(c.time) && /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(c.timeAt)), `after Back: ${json(afterBack)}`)
  check((await timers()) === 1, `${await timers()} timers pending after Back`)
  const forward = await send("Page.getNavigationHistory")
  await send("Page.navigateToHistoryEntry", { entryId: forward.entries[forward.currentIndex + 1].id })
  check(await until(async () => (await js(`location.pathname`)) === "/about/", 8000), "Forward did not reach the next page")
  check((await js(`document.querySelectorAll("[data-clocks-state]").length`)) === 0, "the clocks are on another page")
})

await test("CLOCK-025B", "Repeated lifecycle events leave one timer", async (check) => {
  await useClock("2026-11-16T09:00:20Z")
  await goto("/")
  await until(async () => (await readClocks()).every((c) => c.state === "live"))
  await js(`(() => { for (let i = 0; i < 100; i++) { document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })); } })()`)
  check((await timers()) === 1, `${await timers()} timers after 200 events`)
  await js(`(() => { for (let i = 0; i < 20; i++) { window.dispatchEvent(new PageTransitionEvent("pagehide")); window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })); } })()`)
  check((await timers()) === 1, `${await timers()} timers after hide/show cycles`)
})

await test("CLOCK-026B", "With JavaScript off the page says so and shows no time", async (check) => {
  await useClock()
  await send("Emulation.setScriptExecutionDisabled", { value: true })
  let view
  try {
    await setViewport(1280, 900)
    await goto("/")
    view = await js(`(() => {
      const r = document.querySelector("[data-home-region=clocks]");
      const note = r.querySelector("[data-clocks-note]"), nojs = r.querySelector(".clocks__nojs");
      return { state: r.dataset.clocksState, text: r.innerText, times: r.querySelectorAll("time").length, noteShown: note && getComputedStyle(note).display !== "none", nojsShown: nojs ? getComputedStyle(nojs).display !== "none" && nojs.getBoundingClientRect().height > 0 : false, cities: [...r.querySelectorAll(".clock__city")].map((e) => e.textContent), readings: [...r.querySelectorAll("[data-clock-time]")].map((e) => e.textContent.trim()), hidden: [...r.querySelectorAll("[data-clock-reading]")].every((e) => e.getAttribute("aria-hidden") === "true"), welcome: !!document.querySelector("[data-home-region=welcome] h1"), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    })()`)
  } finally {
    await send("Emulation.setScriptExecutionDisabled", { value: false })
  }
  check(view.state === "loading" && view.times === 0, `state ${view.state}, ${view.times} <time> elements`)
  check(view.nojsShown && /Live times need JavaScript/.test(view.text), "the JavaScript notice is not shown")
  check(!view.noteShown, "the 'times come from this device' note is shown though nothing will fill them")
  check(view.readings.length === 8 && view.readings.every((t) => t === "--:--") && view.hidden && !/\d\d:\d\d/.test(view.text), `readings ${json(view.readings)}`)
  check(view.cities.join() === "Anchorage,Mexico City,Brasília,Accra,Moscow,Dhaka,Koror,Auckland", "the cities are not all there")
  check(view.welcome && view.overflow <= 0, "the rest of the homepage is not intact without JavaScript")
})

// --- Layout -------------------------------------------------------------------------------------------

await test("CLOCK-028", "The clocks are on the real homepage, visible and live", async (check) => {
  await useClock()
  await setViewport(1440, 900)
  await goto("/")
  check(await until(async () => (await readClocks()).every((c) => c.state === "live")), "the clocks never went live")
  const real = await js(`(() => { const r = document.querySelector("[data-home-region=clocks]").getBoundingClientRect(); return { w: r.width, h: r.height, simulated: document.querySelector("[data-clocks-simulated]") !== null, regions: document.querySelectorAll("[data-home-region=clocks]").length }; })()`)
  check(real.w > 200 && real.h > 100 && !real.simulated && real.regions === 1, `region ${json(real)}`)
  const clocks = await readClocks()
  check(clocks.every((c) => /^([01]\d|2[0-3]):[0-5]\d$/.test(c.time)), "a reading is not HH:mm")
  // The live reading is the machine's real time: Accra (UTC+0) matches the UTC time, within a minute.
  const utc = await js(`new Date().toISOString().slice(11, 16)`)
  const accra = clocks.find((c) => c.id === "accra").time
  const minutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))
  check(Math.min(Math.abs(minutes(utc) - minutes(accra)), 1440 - Math.abs(minutes(utc) - minutes(accra))) <= 1, `Accra ${accra} but UTC is ${utc}`)
})

await test("CLOCK-030", "Eight readable clocks in the approved order at every width", async (check) => {
  await useClock("2026-11-16T09:00:20Z")
  for (const width of WIDTHS) {
    await setViewport(width, 900, width < 768)
    await goto("/")
    await until(async () => (await readClocks()).every((c) => c.state === "live"))
    const m = await js(`(() => {
      const items = [...document.querySelectorAll("[data-home-region=clocks] [data-clock-id]")].map((li) => {
        const r = li.getBoundingClientRect(), t = li.querySelector("[data-clock-time]").getBoundingClientRect(), d = li.querySelector("[data-clock-date]"), c = li.querySelector(".clock__city"), p = li.querySelector(".clock__place");
        const rd = li.querySelector("[data-clock-reading]").getBoundingClientRect();
        return { id: li.dataset.clockId, top: r.top + scrollY, left: r.left, right: r.right, fits: li.scrollWidth <= li.clientWidth + 1, readingIn: rd.left >= r.left - 1 && rd.right <= r.right + 1, timeW: t.width, cityOk: c.scrollWidth <= c.clientWidth + 1 || getComputedStyle(c).overflowWrap === "anywhere", dateSize: parseFloat(getComputedStyle(d).fontSize), timeSize: parseFloat(getComputedStyle(li.querySelector("[data-clock-time]")).fontSize), dateH: d.getBoundingClientRect().height, cityRight: c.getBoundingClientRect().right, readingLeft: rd.left, cityBottom: c.getBoundingClientRect().bottom, placeBottom: p.getBoundingClientRect().bottom, readingTop: rd.top };
      });
      const region = document.querySelector("[data-home-region=clocks]").getBoundingClientRect();
      return { items, regionRight: region.right, vw: document.documentElement.clientWidth, over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    })()`)
    check(m.over <= 0, `${width}px: scrolls sideways by ${m.over}px`)
    check(m.items.length === 8 && m.items.every((i, k) => i.id === ORDER[k]), `${width}px: order ${json(m.items.map((i) => i.id))}`)
    // Row-major reading order: a later clock is never above, nor left of and level with, an earlier one.
    for (let k = 1; k < 8; k++) {
      const a = m.items[k - 1], b = m.items[k]
      check(b.top > a.top + 4 || (Math.abs(b.top - a.top) <= 4 && b.left > a.left), `${width}px: ${b.id} is placed before ${a.id}`)
    }
    check(m.items.every((i) => i.fits && i.readingIn && i.right <= m.regionRight + 1), `${width}px: a clock overflows ${json(m.items.filter((i) => !i.fits || !i.readingIn))}`)
    check(m.items.every((i) => i.cityOk), `${width}px: a city is clipped`)
    check(m.items.every((i) => i.timeSize >= 16 && i.dateSize >= 11.5), `${width}px: text too small ${json(m.items[0])}`)
    check(m.items.every((i) => i.cityRight <= i.readingLeft + 1), `${width}px: a city runs into its reading`)
  }
})

await test("CLOCK-031", "The region and the page do not overflow with the longest reading", async (check) => {
  // The widest date in the year: a long weekday and a long month.
  await useClock("2026-09-30T12:00:00Z")
  for (const width of WIDTHS) {
    await setViewport(width, 900, width < 768)
    await goto("/")
    await until(async () => (await readClocks()).every((c) => c.state === "live"))
    const over = await js(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)
    const widest = await js(`Math.max(...[...document.querySelectorAll("[data-clock-date]")].map((e) => e.getBoundingClientRect().width))`)
    check(over <= 0, `${width}px: scrolls sideways by ${over}px`)
    check(widest > 40, `${width}px: dates are not drawn`)
    const clipped = await js(`[...document.querySelectorAll("[data-home-region=clocks] .clock")].filter((li) => li.scrollWidth > li.clientWidth + 1 || li.getBoundingClientRect().right > document.querySelector("[data-home-region=clocks]").getBoundingClientRect().right + 1).length`)
    check(clipped === 0, `${width}px: ${clipped} clocks overflow`)
  }
})

await test("CLOCK-032B", "Each live time sits in its own city's row, with valid time elements", async (check) => {
  await useClock("2026-12-31T23:30:00Z")
  await setViewport(1280, 900)
  await goto("/")
  await until(async () => (await readClocks()).every((c) => c.state === "live"))
  const rows = await js(`[...document.querySelectorAll("[data-home-region=clocks] [data-clock-id]")].map((li) => ({ city: li.querySelector(".clock__city").textContent, id: li.dataset.clockId, zone: li.dataset.timeZone, text: li.innerText.replace(/\\n+/g, " | "), times: li.querySelectorAll("time").length }))`)
  const ref = expected("2026-12-31T23:30:00Z")
  check(rows.every((r) => r.times === 2 && r.text.includes(ref[r.id].slice(11))), `a time is in the wrong row: ${json(rows)}`)
  check(rows.find((r) => r.id === "brasilia").city === "Brasília" && rows.find((r) => r.id === "brasilia").zone === "America/Sao_Paulo", "Brasília")
  check(rows.find((r) => r.id === "auckland").text.includes("Friday, 1 January") && rows.find((r) => r.id === "anchorage").text.includes("Thursday, 31 December"), "the New Year dates")
  const naming = await js(`(() => { const r = document.querySelector("[data-home-region=clocks]"); return { labelled: document.getElementById(r.getAttribute("aria-labelledby"))?.textContent, hiddenReadings: r.querySelectorAll("[data-clock-reading][aria-hidden]").length }; })()`)
  check(naming.labelled === "Around the world" && naming.hiddenReadings === 0, `region name/hidden readings: ${json(naming)}`)
})

await test("CLOCK-033B", "A minute change is not announced", async (check) => {
  await useClock("2026-11-16T09:59:58Z")
  await goto("/")
  await until(async () => (await readClocks()).every((c) => c.state === "live"))
  const live = await js(`document.querySelectorAll("[data-home-region=clocks] [aria-live], [data-home-region=clocks] [role=status], [data-home-region=clocks] [role=alert], [data-home-region=clocks] [role=timer]").length`)
  check(live === 0, `${live} live regions in the clocks`)
  const mutated = await js(`(async () => {
    const region = document.querySelector("[data-home-region=clocks]"); let focusMoved = false;
    document.addEventListener("focusin", () => (focusMoved = true));
    await new Promise((r) => setTimeout(r, 2500));
    return { focusMoved, ariaLive: region.closest("[aria-live]") !== null, tabbable: region.querySelectorAll("a[href], button, [tabindex]").length, active: document.activeElement === document.body };
  })()`)
  check(!mutated.focusMoved && !mutated.ariaLive && mutated.tabbable === 0 && mutated.active, `${json(mutated)}`)
  // Except the scroll-driven z-index raise of Home's stuck tab row (P20, D-144): it moves and recolours nothing.
  check(await js(`document.getAnimations().filter((a) => a.animationName !== "gl-home-tabs-raise").length`) === 0, "the page animates")
})

await test("CLOCK-034B", "Filling the clocks does not move the layout", async (check) => {
  const items = () => js(`[...document.querySelectorAll("[data-clock-id]")].map((li) => { const r = li.getBoundingClientRect(); return [Math.round(r.height), Math.round(r.width), Math.round(r.left)]; })`)
  for (const width of [390, 768, 1440]) {
    await useClock("2026-11-16T09:00:20Z")
    await setViewport(width, 900, width < 768)
    // The clocks as built (script switched off: the placeholders), against the clocks the script has filled.
    await send("Emulation.setScriptExecutionDisabled", { value: true })
    let before
    try {
      await goto("/")
      before = await items()
    } finally {
      await send("Emulation.setScriptExecutionDisabled", { value: false })
    }
    await goto("/")
    await until(async () => (await readClocks()).every((c) => c.state === "live"))
    const after = await items()
    check(before.length === 8 && json(before.map((i) => [i[0], i[1], i[2]])) === json(after.map((i) => [i[0], i[1], i[2]])), `${width}px: a clock changed size when filled: ${json(before)} → ${json(after)}`)
    // The browser's own layout-shift entries: none from the clocks.
    await sleep(500)
    const shifts = await js(`window.__shifts.filter((s) => s.nodes.includes("clocks")).reduce((sum, s) => sum + s.value, 0)`)
    check(shifts === 0, `${width}px: the clocks caused a layout shift of ${shifts}`)
    // A minute change, with the widest digits, moves nothing either.
    await js(`window.__setNow(Date.parse("2026-11-16T10:00:00Z")); document.dispatchEvent(new Event("visibilitychange"))`)
    await sleep(150)
    check(json(await items()) === json(after), `${width}px: the clocks moved when the digits changed`)
  }
})

// --- The simulated specimen ------------------------------------------------------------------------------

await test("CLOCK-041", "The specimen shows fixed instants correctly and never goes live", async (check) => {
  await useClock("2026-05-05T05:05:05Z")
  await setViewport(1280, 900)
  await goto("/_design/world-clocks/")
  const scenarios = await js(`[...document.querySelectorAll("[data-clocks-scenario]")].map((s) => ({ id: s.dataset.clocksScenario, instant: s.querySelector("[data-clocks-simulated]").dataset.clocksSimulated, state: s.querySelector("[data-home-region=clocks]").dataset.clocksState, clocks: [...s.querySelectorAll("[data-clock-id]")].map((li) => [li.dataset.clockId, li.querySelector("[data-clock-time]").getAttribute("datetime"), li.querySelector("[data-clock-time]").textContent]), note: s.querySelector("[data-clocks-note]").textContent }))`)
  check(scenarios.length === 4, `${scenarios.length} scenarios`)
  for (const s of scenarios) {
    check(s.state === "simulated" && /^Simulated instant/.test(s.note), `${s.id}: ${s.state} / ${s.note}`)
    const ref = expected(s.instant)
    check(s.clocks.length === 8 && s.clocks.every(([id, at, text]) => at === ref[id] && text === ref[id].slice(11)), `${s.id}: ${json(s.clocks)} differs from the reference`)
  }
  await sleep(1500)
  const later = await js(`[...document.querySelectorAll("[data-clocks-scenario]")].map((s) => s.querySelector("[data-home-region=clocks]").dataset.clocksState + s.querySelector("[data-clock-time]").textContent).join()`)
  check(/simulated/.test(later) && !/live/.test(later), `a specimen went live: ${later}`)
  check((await js(`window.__timers().length`)) === 0, "the specimen keeps a timer")
  check(await js(`document.cookie === "" && localStorage.length === 0 && sessionStorage.length === 0`), "the specimen stores something")
  // And the real homepage, in the same build, is live and not simulated.
  await goto("/")
  check(await until(async () => (await readClocks()).every((c) => c.state === "live")), "the real homepage is not live")
  check(await js(`document.querySelector("[data-clocks-simulated]") === null && document.querySelector("[data-home-region=clocks]").dataset.clocksState === "live"`), "a simulated instant reached the homepage")
  check(await js(`document.querySelector("[data-home-specimen-link]")?.innerText.includes("world clocks at simulated instants")`), "the homepage's development note does not link the specimen")
})

await finish()
