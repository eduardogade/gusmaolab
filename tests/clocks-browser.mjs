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

const IDS = ["CLOCK-019B", "CLOCK-020B", "CLOCK-021B", "CLOCK-022B", "CLOCK-023B", "CLOCK-024B", "CLOCK-025B", "CLOCK-026B", "CLOCK-028", "CLOCK-030", "CLOCK-031", "CLOCK-032B", "CLOCK-033B", "CLOCK-034B", "CLOCK-034C", "CLOCK-034D", "CLOCK-041"]
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
    return { id: li.dataset.clockId, state: li.dataset.clockState, time: t.textContent, timeAt: t.getAttribute("datetime"), tag: t.localName, date: d.querySelector("[data-clock-date-short]")?.textContent ?? "", dateFull: d.querySelector("[data-clock-date-full]")?.textContent ?? "", dateAt: d.getAttribute("datetime"), hidden: li.querySelector("[data-clock-reading]").getAttribute("aria-hidden") };
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
  // At 09:00 UTC Anchorage (00:00) and Auckland (22:00) are both on Monday 16 November; the short date is what is seen, the full date what is read.
  const dates = Object.fromEntries(clocks.map((c) => [c.id, [c.date, c.dateFull]]))
  check(json(dates.anchorage) === json(["Mon, 16 Nov", "Monday, 16 November"]) && json(dates.auckland) === json(["Mon, 16 Nov", "Monday, 16 November"]), `dates ${json(dates)}`)
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
  const clocksNow = await readClocks()
  const rows = await js(`[...document.querySelectorAll("[data-home-region=clocks] [data-clock-id]")].map((li) => ({ city: li.querySelector(".clock__city").textContent, id: li.dataset.clockId, zone: li.dataset.timeZone, text: li.innerText.replace(/\\n+/g, " | "), times: li.querySelectorAll("time").length }))`)
  const ref = expected("2026-12-31T23:30:00Z")
  check(rows.every((r) => r.times === 2 && r.text.includes(ref[r.id].slice(11))), `a time is in the wrong row: ${json(rows)}`)
  check(rows.find((r) => r.id === "brasilia").city === "Brasília" && rows.find((r) => r.id === "brasilia").zone === "America/Sao_Paulo", "Brasília")
  const dates = Object.fromEntries(clocksNow.map((c) => [c.id, [c.date, c.dateFull]]))
  check(json(dates.auckland) === json(["Fri, 1 Jan", "Friday, 1 January"]) && json(dates.anchorage) === json(["Thu, 31 Dec", "Thursday, 31 December"]), `the New Year dates: ${json(dates)}`)
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

/**
 * What the clocks' boxes are: the list's own size, and for each clock the card, the city, the country and
 * the reading as [left, top, width, height] measured from the list's top-left corner (what lies above
 * the clocks does not matter to them), and how many lines the city and the country take. CSS pixels.
 */
const GEOMETRY = `(() => {
  const list = document.querySelector(".clocks__list"), origin = list.getBoundingClientRect();
  const box = (el) => { const r = el.getBoundingClientRect(); return [r.left - origin.left, r.top - origin.top, r.width, r.height]; };
  const lines = (el) => { const range = document.createRange(); range.selectNodeContents(el); return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size; };
  return { list: [origin.width, origin.height], clocks: [...document.querySelectorAll("[data-clock-id]")].map((li) => {
    const city = li.querySelector(".clock__city"), place = li.querySelector(".clock__place");
    return { id: li.dataset.clockId, card: box(li), city: box(city), place: box(place), reading: box(li.querySelector("[data-clock-reading]")), cityLines: lines(city), placeLines: lines(place) };
  }) };
})()`
const geometry = () => js(GEOMETRY)
/** Two geometries are the same card for card, box for box, to a tolerance of `tolerance` CSS pixels; otherwise, what moved. */
function sameGeometry(a, b, tolerance) {
  if (a.clocks.length !== 8 || b.clocks.length !== 8) return `${a.clocks.length} and ${b.clocks.length} clocks`
  if (Math.abs(a.list[0] - b.list[0]) > tolerance || Math.abs(a.list[1] - b.list[1]) > tolerance) return `the list ${a.list.map((v) => v.toFixed(2))} → ${b.list.map((v) => v.toFixed(2))}`
  for (let i = 0; i < 8; i++) {
    for (const key of ["card", "city", "place", "reading"])
      for (let k = 0; k < 4; k++)
        if (Math.abs(a.clocks[i][key][k] - b.clocks[i][key][k]) > tolerance) return `${a.clocks[i].id} ${key}[${["left", "top", "width", "height"][k]}] ${a.clocks[i][key][k].toFixed(2)} → ${b.clocks[i][key][k].toFixed(2)}`
    if (a.clocks[i].cityLines !== b.clocks[i].cityLines || a.clocks[i].placeLines !== b.clocks[i].placeLines) return `${a.clocks[i].id} lines: city ${a.clocks[i].cityLines} → ${b.clocks[i].cityLines}, country ${a.clocks[i].placeLines} → ${b.clocks[i].placeLines}`
  }
  return null
}
/**
 * The page with the script switched off, as built: the placeholders, no date. It does not depend on
 * the instant, so one measurement per width serves every instant below.
 */
async function geometryAsBuilt(width) {
  await setViewport(width, 900, width < 768)
  await send("Emulation.setScriptExecutionDisabled", { value: true })
  try {
    await goto("/")
    return await geometry()
  } finally {
    await send("Emulation.setScriptExecutionDisabled", { value: false })
  }
}
// The tolerance is sub-pixel rounding only: the placeholder and the live reading are laid out by the same
// engine in the same fonts and the date's column is sized by a line of the widest date, so the boxes are
// the same to a fraction of a pixel (the widest date of the year is up to 0.1 px wider than that line in
// the macOS fonts). A box that moved by a pixel is a moved box.
const SAME_WITHIN = 0.5
// The widest dates of the year for a proportional font ("Wed, 30 May" and the like), the date the owner named
// (30 September 2026: Anchorage is on Wednesday 30 September while Auckland is on Thursday 1 October), a date in
// the middle of the year, and the narrowest (a single digit, "Fri, 1 Jul").
const DATES = [
  ["2026-11-16T09:00:20Z", "a November Monday"],
  ["2026-09-30T20:00:20Z", "Wed, 30 Sep (owner's longest)"],
  ["2026-05-20T12:00:20Z", "Wed, 20 May (widest in a proportional font)"],
  ["2026-07-01T12:00:20Z", "Wed, 1 Jul (narrowest)"],
]

await test("CLOCK-034B", "Filling the clocks does not move the layout, on any date, at any width", async (check) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    const before = await geometryAsBuilt(width)
    check(before.clocks.length === 8, `${width}px: ${before.clocks.length} clocks as built`)
    for (const [instant, label] of DATES) {
      await useClock(instant)
      await goto("/")
      await until(async () => (await readClocks()).every((c) => c.state === "live"))
      const after = await geometry()
      const moved = sameGeometry(before, after, SAME_WITHIN)
      check(moved === null, `${width}px, ${label}: filling the clocks moved ${moved}`)
      // The browser's own layout-shift entries: none from the clocks.
      await sleep(300)
      const shifts = await js(`window.__shifts.filter((s) => s.nodes.includes("clocks")).reduce((sum, s) => sum + s.value, 0)`)
      check(shifts === 0, `${width}px, ${label}: the clocks caused a layout shift of ${shifts}`)
      // A minute change, with other digits, moves nothing either.
      await js(`window.__setNow(Date.parse("2026-11-16T10:08:00Z")); document.dispatchEvent(new Event("visibilitychange"))`)
      await until(async () => (await readClocks()).every((c) => c.time.endsWith(":08")))
      const later = sameGeometry(after, await geometry(), SAME_WITHIN)
      check(later === null, `${width}px, ${label}: the clocks moved when the digits changed: ${later}`)
    }
  }
})

await test("CLOCK-034C", "Cities and countries stay whole words and the date stays on one line, on the longest dates, at any width and text size", async (check) => {
  // A word is split when its own client rectangles sit on more than one line.
  const WORDS = `(() => {
    const broken = [], oneLine = [], overflow = [];
    for (const li of document.querySelectorAll("[data-clock-id]")) {
      for (const el of li.querySelectorAll(".clock__city, .clock__place")) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode())
          for (const match of node.data.matchAll(/\\S+/g)) {
            const range = document.createRange(); range.setStart(node, match.index); range.setEnd(node, match.index + match[0].length);
            const rects = [...range.getClientRects()];
            if (new Set(rects.map((r) => Math.round(r.top))).size > 1) broken.push(li.dataset.clockId + ": " + match[0]);
          }
      }
      const date = li.querySelector("[data-clock-date-short]");
      if (date) { const range = document.createRange(); range.selectNodeContents(date); if (new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size !== 1) oneLine.push(li.dataset.clockId + ": " + date.textContent); }
      if (li.scrollWidth > li.clientWidth + 1) overflow.push(li.dataset.clockId);
    }
    return { broken, oneLine, overflow, page: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  })()`
  await useClock("2026-09-30T20:00:20Z")
  // Text size is a root font size here (Chrome's text-only zoom is the same rem change). The last flag says whether
  // a city must also stay whole: it does wherever the column has room for it (measured, in both font setups, with a
  // margin of 14 px or more); at 390 px with text doubled and at 320 px with text at 150% the reading column and the
  // city's word cannot both fit in a one-column row, the city wraps inside its own column, and what is asserted is that
  // nothing overflows, is clipped or moves a date onto a second line (KL-132 records the geometry).
  for (const [width, scale, whole] of [[320, 1, true], [390, 1, true], [768, 1, true], [1024, 1, true], [1280, 1, true], [1440, 1, true], [1280, 2, true], [768, 2, true], [390, 1.5, true], [390, 2, false], [320, 1.5, false]]) {
    await setViewport(width, 900, width < 768)
    await goto("/")
    await until(async () => (await readClocks()).every((c) => c.state === "live"))
    if (scale !== 1) await js(`(() => { const style = document.createElement("style"); style.textContent = "html { font-size: ${scale * 100}% !important }"; document.head.append(style); })()`)
    await sleep(100)
    const m = await js(WORDS)
    const where = `${width}px${scale === 1 ? "" : `, text ${scale * 100}%`}`
    if (whole) check(m.broken.length === 0, `${where}: a word is split across lines: ${json(m.broken)}`)
    check(m.oneLine.length === 0, `${where}: a date is on more than one line: ${json(m.oneLine)}`)
    check(m.overflow.length === 0 && m.page <= 0, `${where}: overflow ${json(m)}`)
  }
})

await test("CLOCK-034D", "The short date is what is seen and the full date is what is read, from one reading", async (check) => {
  await useClock("2026-09-30T20:00:20Z")
  await setViewport(1280, 900)
  await goto("/")
  await until(async () => (await readClocks()).every((c) => c.state === "live"))
  const parts = await js(`[...document.querySelectorAll("[data-clock-id]")].map((li) => {
    const date = li.querySelector("[data-clock-date]"), short = date.querySelector("[data-clock-date-short]"), full = date.querySelector("[data-clock-date-full]");
    const hidden = getComputedStyle(full), r = full.getBoundingClientRect(), s = short.getBoundingClientRect();
    return { id: li.dataset.clockId, tag: date.localName, at: date.getAttribute("datetime"), short: short.textContent, shortHidden: short.getAttribute("aria-hidden"), shortW: s.width, full: full.textContent, fullClip: hidden.clipPath, fullBox: [r.width, r.height], fullInline: full.getAttribute("aria-hidden"), kids: date.children.length };
  })`)
  const ref = expected("2026-09-30T20:00:00Z")
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  for (const p of parts) {
    const day = new Date(`${ref[p.id].slice(0, 10)}T00:00:00Z`)
    const fullExpected = `${DAYS[day.getUTCDay()]}, ${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]}`
    const shortExpected = `${DAYS[day.getUTCDay()].slice(0, 3)}, ${day.getUTCDate()} ${MONTHS[day.getUTCMonth()].slice(0, 3)}`
    check(p.tag === "time" && p.at === ref[p.id].slice(0, 10) && p.kids === 2, `${p.id}: ${json(p)}`)
    check(p.full === fullExpected && p.short === shortExpected, `${p.id}: "${p.short}" / "${p.full}", expected "${shortExpected}" / "${fullExpected}"`)
    check(p.shortHidden === "true" && p.fullInline === null && p.shortW > 30, `${p.id}: the short date is read aloud or not drawn: ${json(p)}`)
    check(p.fullBox[0] <= 1 && p.fullBox[1] <= 1 && /inset/.test(p.fullClip), `${p.id}: the full date is drawn: ${json(p.fullBox)} ${p.fullClip}`)
  }
  check(parts.find((p) => p.id === "anchorage").short === "Wed, 30 Sep" && parts.find((p) => p.id === "auckland").short === "Thu, 1 Oct", `the owner's date: ${json(parts.map((p) => p.short))}`)
  // What assistive technology is given: Chrome's accessibility tree, without the nodes it ignores.
  await send("Accessibility.enable")
  const tree = (await send("Accessibility.getFullAXTree")).nodes
  await send("Accessibility.disable")
  const named = tree.filter((n) => !n.ignored && n.name?.value).map((n) => n.name.value)
  check(named.includes("Wednesday, 30 September") && named.includes("Thursday, 1 October"), `the full dates are not in the accessibility tree: ${json(named.filter((v) => /\d/.test(v)).slice(0, 12))}`)
  check(!named.some((v) => v === "Wed, 30 Sep" || v === "Thu, 1 Oct"), "a short date is in the accessibility tree")
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
