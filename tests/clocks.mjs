// The world clocks (P16, D-118 to D-121): CLOCK-001 to CLOCK-027 and CLOCK-029, 032 to 040, the parts
// that need no browser. Run `npm run build` first: the static-output checks read dist/, the release
// build. The browser half (CLOCK-019 to CLOCK-025 and CLOCK-028 to CLOCK-033 in a real Chrome) is
// tests/clocks-browser.mjs.
//
// How the time is checked: every expected local time here comes from tests/fixtures/clocks/
// reference.json, computed with Python's zoneinfo (the operating system's tz database), never from
// the code under test, and from a few offsets written below as an independent table. Every test
// gives the formatter an explicit UTC instant; none reads the current time or depends on the
// machine's own zone (CLOCK-017 runs the formatter under three other zones to prove it).
//
// What they show: the formatting, the update loop's scheduling rules and the built page obey their
// contracts. What they do not show: that the page looks right or that the DOM script works in a
// browser (clocks-browser.mjs), or that a visitor's device clock is correct (it is not checked).
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { publicBuildIssues } from "../scripts/demo-check.mjs"
import { createClockLoop, BOUNDARY_MARGIN_MS } from "../src/home/clock-loop.ts"
import { msToNextMinute, readClock, tryReadClock } from "../src/home/clock-time.ts"
import { CLOCK_LOCATIONS, isValidTimeZone } from "../src/home/clocks.ts"
import { CLOCK_SCENARIOS } from "../src/design/clocks-scenarios.ts"
import { elements, parse, textOf } from "./html-tree.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const BASE = "72cd983" // the head P16 began from
const json = (value) => JSON.stringify(value)
const read = (path) => readFile(join(repo, path), "utf8")
const strip = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
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

const REFERENCE = JSON.parse(await read("tests/fixtures/clocks/reference.json")).instants
const IDS = CLOCK_LOCATIONS.map((p) => p.id)
const zoneOf = Object.fromEntries(CLOCK_LOCATIONS.map((p) => [p.id, p.timeZone]))
const at = (iso) => Date.parse(iso)
/** The standard-time offsets, in minutes, of the eight places in January and July 2026 (independent table). */
const OFFSETS = {
  january: { anchorage: -540, "mexico-city": -360, brasilia: -180, accra: 0, moscow: 180, dhaka: 360, koror: 540, auckland: 780 },
  july: { anchorage: -480, "mexico-city": -360, brasilia: -180, accra: 0, moscow: 180, dhaka: 360, koror: 540, auckland: 720 },
}
const JANUARY = "2026-01-15T12:00:00Z"
const JULY = "2026-07-01T12:00:00Z"
/** The UTC instant a civil "YYYY-MM-DDTHH:mm" means at an offset in minutes. */
const instantOf = (civil, offsetMinutes) => Date.parse(`${civil}:00Z`) - offsetMinutes * 60_000
const weekdayOf = (isoDate) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(`${isoDate}T00:00:00Z`).getUTCDay()]

// --- Configuration -------------------------------------------------------------------------------

const APPROVED = [
  ["anchorage", "Anchorage", "Alaska, United States", "America/Anchorage"],
  ["mexico-city", "Mexico City", "Mexico", "America/Mexico_City"],
  ["brasilia", "Brasília", "Brazil", "America/Sao_Paulo"],
  ["accra", "Accra", "Ghana", "Africa/Accra"],
  ["moscow", "Moscow", "Russia", "Europe/Moscow"],
  ["dhaka", "Dhaka", "Bangladesh", "Asia/Dhaka"],
  ["koror", "Koror", "Palau", "Pacific/Palau"],
  ["auckland", "Auckland", "New Zealand", "Pacific/Auckland"],
]

await test("CLOCK-001", "Exactly the eight approved locations exist", async (check) => {
  check(CLOCK_LOCATIONS.length === 8, `${CLOCK_LOCATIONS.length} locations`)
  check(json(CLOCK_LOCATIONS.map((p) => [p.id, p.city, p.place, p.timeZone])) === json(APPROVED), "a location, label or zone differs from the approved set")
  check(new Set(CLOCK_LOCATIONS.map((p) => p.id)).size === 8, "an identifier repeats")
  check(new Set(CLOCK_LOCATIONS.map((p) => p.city)).size === 8, "a city repeats")
  check(new Set(CLOCK_LOCATIONS.map((p) => p.timeZone)).size === 8, "a zone repeats")
  check(CLOCK_LOCATIONS.find((p) => p.id === "brasilia")?.city === "Brasília", "Brasília is not named Brasília")
})

await test("CLOCK-002", "Every configured IANA identifier is accepted by the runtime", async (check) => {
  for (const place of CLOCK_LOCATIONS) {
    check(isValidTimeZone(place.timeZone), `${place.timeZone} is not known to this runtime`)
    check(tryReadClock(at(JANUARY), place.timeZone) !== null, `${place.timeZone} cannot be formatted`)
  }
  const source = strip(await read("src/home/clocks.ts"))
  check(!/utcOffset|offset\s*:|UTC[+-]|GMT[+-]/.test(source), "the configuration holds a UTC offset")
  const everywhere = [await read("src/home/clock-time.ts"), await read("src/home/clock-loop.ts"), await read("src/scripts/world-clocks.ts"), await read("src/components/home/WorldClocks.astro"), await read("src/styles/home.css")]
  for (const text of everywhere) check(!/America\/|Africa\/|Europe\/|Asia\/|Pacific\//.test(strip(text)), "a module other than the configuration names a zone")
})

await test("CLOCK-003", "Locations stay in the approved order, on the page and in the data", async (check) => {
  check(json(IDS) === json(APPROVED.map((a) => a[0])), `order: ${json(IDS)}`)
  if (existsSync(join(repo, "dist/index.html"))) {
    const page = elements(parse(await read("dist/index.html"))).filter((el) => "data-clock-id" in el.attrs)
    check(json(page.map((el) => el.attrs["data-clock-id"])) === json(IDS), "the built page's order differs")
    check(json(page.map((el) => el.attrs["data-time-zone"])) === json(APPROVED.map((a) => a[3])), "the built page's zones differ")
  }
})

// --- Formatting ----------------------------------------------------------------------------------

await test("CLOCK-004", "Every clock shows the same instant", async (check) => {
  for (const [label, iso] of [["January", JANUARY], ["July", JULY]]) {
    const instant = at(iso)
    for (const place of CLOCK_LOCATIONS) {
      const reading = readClock(instant, place.timeZone)
      const back = instantOf(reading.isoDateTime, OFFSETS[label.toLowerCase()][place.id])
      check(back === instant, `${label} ${place.id}: ${reading.isoDateTime} is not ${iso}`)
    }
  }
  // The page formats one instant for all eight and never reads the clock per place.
  const script = strip(await read("src/scripts/world-clocks.ts"))
  const draw = script.slice(script.indexOf("function draw("), script.indexOf("function start("))
  check(!/Date\.now|new Date/.test(draw), "the drawing reads the time itself instead of taking the instant")
  check((script.match(/Date\.now\(\)/g) ?? []).length === 1, "the script reads Date.now() in more than one place")
  check(!/Date\.now|new Date/.test(strip(await read("src/home/clock-time.ts"))), "the formatter reads the current time")
})

await test("CLOCK-005", "Times are 24-hour, HH:mm, with no AM/PM and no seconds", async (check) => {
  for (const [iso, expected] of Object.entries(REFERENCE))
    for (const id of IDS) {
      const reading = readClock(at(iso), zoneOf[id])
      check(/^([01]\d|2[0-3]):[0-5]\d$/.test(reading.time), `${iso} ${id}: "${reading.time}"`)
      check(reading.time === expected[id].slice(11), `${iso} ${id}: ${reading.time}, expected ${expected[id].slice(11)}`)
    }
  check(readClock(at("2026-11-16T09:00:00Z"), "America/Anchorage").time === "00:00", "midnight is not 00:00 (an engine's 24:00?)")
  check(!/[ap]m/i.test(readClock(at("2026-11-16T21:07:00Z"), "Africa/Accra").time), "a 12-hour marker")
})

await test("CLOCK-006", "Hours and minutes keep their leading zeros", async (check) => {
  check(readClock(at("2026-01-15T08:05:00Z"), "Africa/Accra").time === "08:05", "08:05")
  check(readClock(at("2026-01-15T00:00:00Z"), "Africa/Accra").time === "00:00", "00:00")
  check(readClock(at("2026-01-15T23:59:00Z"), "Africa/Accra").time === "23:59", "23:59")
  check(readClock(at("2026-01-05T03:09:00Z"), "Africa/Accra").isoDate === "2026-01-05", "a one-digit month and day lose their zero in the ISO date")
  check(readClock(at("2026-01-05T03:09:00Z"), "Africa/Accra").date === "Monday, 5 January", "the reader's date pads its day")
})

await test("CLOCK-007", "Each city shows its own calendar date and weekday", async (check) => {
  for (const [iso, expected] of Object.entries(REFERENCE))
    for (const id of IDS) {
      const reading = readClock(at(iso), zoneOf[id])
      check(reading.isoDateTime === expected[id], `${iso} ${id}: ${reading.isoDateTime}, expected ${expected[id]}`)
      check(reading.isoDate === expected[id].slice(0, 10), `${iso} ${id}: date ${reading.isoDate}`)
      check(reading.weekday === weekdayOf(expected[id].slice(0, 10)), `${iso} ${id}: weekday ${reading.weekday}`)
      check(reading.date.startsWith(`${reading.weekday}, `), `${iso} ${id}: "${reading.date}"`)
    }
  const accra = readClock(at("2026-11-16T12:14:00Z"), "Africa/Accra")
  check(accra.date === "Monday, 16 November", `"${accra.date}"`)
  const dates = new Set(IDS.map((id) => readClock(at("2026-12-31T23:30:00Z"), zoneOf[id]).isoDate))
  check(dates.size === 2, `the eight places show ${dates.size} dates at New Year, expected 2`)
})

await test("CLOCK-008", "A city can be on the previous calendar day", async (check) => {
  const instant = at("2027-01-01T00:00:00Z")
  check(readClock(instant, "Africa/Accra").isoDate === "2027-01-01", "Accra")
  check(readClock(instant, "America/Anchorage").isoDate === "2026-12-31", "Anchorage should still be on 31 December")
  check(readClock(instant, "America/Anchorage").weekday === "Thursday", "Anchorage's weekday")
  check(readClock(instant, "America/Sao_Paulo").isoDate === "2026-12-31", "Brasília")
})

await test("CLOCK-009", "A city can be on the next calendar day", async (check) => {
  const instant = at(JULY)
  check(readClock(instant, "Africa/Accra").isoDate === "2026-07-01", "Accra")
  check(readClock(instant, "Pacific/Auckland").isoDate === "2026-07-02", "Auckland should already be on 2 July")
  check(readClock(instant, "Pacific/Auckland").weekday === "Thursday", "Auckland's weekday")
  check(readClock(at("2026-11-16T12:14:00Z"), "Pacific/Auckland").date === "Tuesday, 17 November", "Auckland on 16 November 12:14 UTC")
})

await test("CLOCK-010", "Dates are correct across 31 December and 1 January", async (check) => {
  const instant = at("2026-12-31T23:30:00Z")
  const ahead = IDS.filter((id) => readClock(instant, zoneOf[id]).isoDate === "2027-01-01")
  check(json(ahead) === json(["moscow", "dhaka", "koror", "auckland"]), `places already in 2027: ${json(ahead)}`)
  check(readClock(instant, "Pacific/Auckland").date === "Friday, 1 January", `"${readClock(instant, "Pacific/Auckland").date}"`)
  check(readClock(instant, "America/Anchorage").date === "Thursday, 31 December", `"${readClock(instant, "America/Anchorage").date}"`)
  check(readClock(at("2027-01-01T00:00:00Z"), "Asia/Dhaka").isoDate === "2027-01-01", "Dhaka")
  check(readClock(at("2026-06-30T23:59:00Z"), "Europe/Moscow").isoDate === "2026-07-01", "end of June")
})

await test("CLOCK-011", "Anchorage on standard time", async (check) => {
  check(readClock(at(JANUARY), "America/Anchorage").isoDateTime === "2026-01-15T03:00", "UTC-9 in January")
  check(readClock(at("2026-11-01T10:00:00Z"), "America/Anchorage").isoDateTime === "2026-11-01T01:00", "the repeated hour ends on standard time")
  check(readClock(at("2026-03-08T10:59:00Z"), "America/Anchorage").isoDateTime === "2026-03-08T01:59", "the last standard minute")
})

await test("CLOCK-012", "Anchorage on daylight time", async (check) => {
  check(readClock(at(JULY), "America/Anchorage").isoDateTime === "2026-07-01T04:00", "UTC-8 in July")
  check(readClock(at("2026-03-08T11:00:00Z"), "America/Anchorage").isoDateTime === "2026-03-08T03:00", "the wall clock jumps from 01:59 to 03:00")
  check(readClock(at("2026-11-01T09:59:00Z"), "America/Anchorage").isoDateTime === "2026-11-01T01:59", "the last daylight minute")
})

await test("CLOCK-013", "Auckland on standard time", async (check) => {
  check(readClock(at(JULY), "Pacific/Auckland").isoDateTime === "2026-07-02T00:00", "UTC+12 in July")
  check(readClock(at("2026-04-04T14:00:00Z"), "Pacific/Auckland").isoDateTime === "2026-04-05T02:00", "the hour repeats: 02:59 daylight, then 02:00 standard")
  check(readClock(at("2026-09-26T13:59:00Z"), "Pacific/Auckland").isoDateTime === "2026-09-27T01:59", "the last standard minute before spring")
})

await test("CLOCK-014", "Auckland on daylight time", async (check) => {
  check(readClock(at(JANUARY), "Pacific/Auckland").isoDateTime === "2026-01-16T01:00", "UTC+13 in January")
  check(readClock(at("2026-09-26T14:00:00Z"), "Pacific/Auckland").isoDateTime === "2026-09-27T03:00", "the wall clock jumps from 01:59 to 03:00")
  check(readClock(at("2026-04-04T13:59:00Z"), "Pacific/Auckland").isoDateTime === "2026-04-05T02:59", "the last daylight minute")
})

await test("CLOCK-015", "Mexico City does not apply United States daylight saving", async (check) => {
  for (const [label, iso] of [["January", JANUARY], ["July", JULY], ["March", "2026-03-08T11:00:00Z"], ["April", "2026-04-04T14:00:00Z"], ["November", "2026-11-01T10:00:00Z"]]) {
    const reading = readClock(at(iso), "America/Mexico_City")
    check(instantOf(reading.isoDateTime, -360) === at(iso), `${label}: ${reading.isoDateTime} is not UTC-6`)
  }
  check(readClock(at(JULY), "America/Mexico_City").time === "06:00", "07:00 would be United States daylight time")
  // The same instant in a zone that does observe daylight saving differs, so the test can tell.
  check(readClock(at(JULY), "America/Chicago").time === "07:00", "the control zone, Chicago, should be on daylight time")
})

await test("CLOCK-016", "America/Sao_Paulo gives Brasília's time, under the name Brasília", async (check) => {
  for (const iso of [JANUARY, JULY, "2026-12-31T23:30:00Z"]) {
    const reading = readClock(at(iso), "America/Sao_Paulo")
    check(instantOf(reading.isoDateTime, -180) === at(iso), `${iso}: ${reading.isoDateTime} is not UTC-3`)
  }
  check(CLOCK_LOCATIONS[2].city === "Brasília" && CLOCK_LOCATIONS[2].timeZone === "America/Sao_Paulo", "the third clock is not Brasília on America/Sao_Paulo")
  if (existsSync(join(repo, "dist/index.html"))) check(textOf(parse(await read("dist/index.html"))).includes("Brasília") && !/São Paulo/.test(textOf(parse(await read("dist/index.html")))), "the page names São Paulo or omits Brasília")
})

await test("CLOCK-017", "Formatting does not depend on the machine's own time zone", async (check) => {
  const program = `
    import { readClock } from ${json(join(repo, "src/home/clock-time.ts"))}
    import { CLOCK_LOCATIONS } from ${json(join(repo, "src/home/clocks.ts"))}
    const out = {}
    for (const iso of ${json(Object.keys(REFERENCE))}) out[iso] = Object.fromEntries(CLOCK_LOCATIONS.map((p) => [p.id, readClock(Date.parse(iso), p.timeZone).isoDateTime]))
    console.log(JSON.stringify(out))
  `
  for (const tz of ["Pacific/Kiritimati", "America/Los_Angeles", "Etc/UTC"]) {
    const run = spawnSync(process.execPath, ["--input-type=module", "-e", program], { encoding: "utf8", env: { ...process.env, TZ: tz } })
    check(run.status === 0, `TZ=${tz}: ${run.stderr.slice(0, 300)}`)
    check(run.stdout.trim() === json(Object.fromEntries(Object.entries(REFERENCE).map(([k, v]) => [k, v]))), `TZ=${tz} changed a reading`)
  }
})

await test("CLOCK-018", "An invalid time zone is a controlled failure, never a guess", async (check) => {
  for (const bad of ["UTC+3", "Mars/Olympus", "", "america/nowhere"]) {
    let error
    try {
      readClock(at(JANUARY), bad)
    } catch (e) {
      error = e
    }
    check(error instanceof RangeError, `"${bad}" did not throw a RangeError`)
    check(tryReadClock(at(JANUARY), bad) === null, `"${bad}" did not become an unavailable clock`)
  }
  check(tryReadClock(NaN, "Africa/Accra") === null && tryReadClock(new Date("nope"), "Africa/Accra") === null, "an invalid instant was formatted")
  check(tryReadClock(at(JANUARY), "Africa/Accra")?.time === "12:00", "a failure poisoned the cache of a good zone")
  check(msToNextMinute(at("2026-01-15T12:00:00Z")) === 60_000 && msToNextMinute(at("2026-01-15T12:00:59.999Z")) === 1 && msToNextMinute(at("2026-01-15T12:00:30Z")) === 30_000, "msToNextMinute")
})

// --- The update loop, with a controlled clock and fake timers ---------------------------------------

/** A clock and timers the test moves by hand. */
function fakeWorld(startIso, { hidden = false } = {}) {
  const world = {
    time: at(startIso),
    hidden,
    timers: new Map(),
    next: 1,
    ticks: [],
    created: 0,
    advance(ms) {
      const target = world.time + ms
      for (;;) {
        const due = [...world.timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
        if (due === undefined) break
        world.timers.delete(due[0])
        world.time = Math.max(world.time, due[1].at)
        due[1].callback()
      }
      world.time = target
    },
  }
  world.loop = createClockLoop({
    tick: (instant) => world.ticks.push(instant),
    now: () => world.time,
    setTimer: (callback, delay) => {
      const handle = world.next++
      world.created++
      world.timers.set(handle, { at: world.time + delay, callback })
      return handle
    },
    clearTimer: (handle) => world.timers.delete(handle),
    hidden: () => world.hidden,
  })
  return world
}
const shown = (instant, id = "anchorage") => readClock(instant, zoneOf[id]).time

await test("CLOCK-019", "The clocks are drawn at once when the loop starts", async (check) => {
  const world = fakeWorld("2026-11-16T09:59:12Z")
  check(world.ticks.length === 0, "drew before start")
  world.loop.start()
  check(world.ticks.length === 1 && world.ticks[0] === at("2026-11-16T09:59:12Z"), `ticks: ${json(world.ticks)}`)
  check(shown(world.ticks[0]) === "00:59", "the first drawing is not the current time")
})

await test("CLOCK-020", "The display advances when the minute changes, and corrects a late timer", async (check) => {
  const world = fakeWorld("2026-11-16T09:59:30Z")
  world.loop.start()
  world.advance(29_000)
  check(world.ticks.length === 1, "ticked before the minute")
  world.advance(1_000 + BOUNDARY_MARGIN_MS)
  check(world.ticks.length === 2, `ticks after the boundary: ${world.ticks.length}`)
  check(shown(world.ticks.at(-1)) === "01:00" && shown(world.ticks.at(-1), "auckland") === "23:00", `drew ${shown(world.ticks.at(-1))}`)
  // A timer that fires 7 s late: the next drawing is still the real time, and the loop re-aims.
  world.timers.forEach((timer) => (timer.at += 7_000))
  world.advance(60_000 + 7_000)
  check(shown(world.ticks.at(-1)) === "01:01", `after a late timer drew ${shown(world.ticks.at(-1))}`)
  const [timer] = [...world.timers.values()]
  check(timer.at % 60_000 === BOUNDARY_MARGIN_MS, `the next timer is not aimed at a minute boundary (${timer.at % 60_000})`)
  // The timer fired early (a browser rounding it down): the tick shows the old minute, then re-aims a few ms away.
  const early = fakeWorld("2026-11-16T09:59:30Z")
  early.loop.start()
  early.timers.forEach((t) => (t.at -= 200))
  early.advance(29_850)
  check(early.ticks.length === 2 && shown(early.ticks.at(-1)) === "00:59", "an early timer did not draw")
  early.advance(250)
  check(shown(early.ticks.at(-1)) === "01:00", "the loop did not recover from an early timer")
})

await test("CLOCK-021", "One loop and one timer serve all eight clocks", async (check) => {
  const world = fakeWorld("2026-11-16T10:00:10Z")
  for (let i = 0; i < 5; i++) world.loop.start()
  check(world.timers.size === 1, `${world.timers.size} timers after five starts`)
  world.advance(10 * 60_000)
  check(world.timers.size === 1, `${world.timers.size} timers after ten minutes`)
  const script = strip(await read("src/scripts/world-clocks.ts"))
  check((script.match(/createClockLoop</g) ?? []).length === 1, "the script makes more than one loop")
  check(!/setInterval/.test(script + strip(await read("src/home/clock-loop.ts"))), "a setInterval")
  check((script.match(/setTimeout/g) ?? []).length === 1, "more than one place sets a timer")
})

await test("CLOCK-022", "A hidden page keeps no timer", async (check) => {
  const world = fakeWorld("2026-11-16T10:00:10Z")
  world.loop.start()
  check(world.loop.active(), "no timer while visible")
  world.hidden = true
  world.loop.pause()
  check(world.timers.size === 0 && !world.loop.active(), "a timer survives hiding")
  const ticks = world.ticks.length
  world.advance(30 * 60_000)
  check(world.ticks.length === ticks, "the loop ticked while hidden")
  const born = fakeWorld("2026-11-16T10:00:10Z", { hidden: true })
  born.loop.start()
  check(born.ticks.length === 1 && born.timers.size === 0, "a page that starts hidden is drawn once and keeps no timer")
})

await test("CLOCK-023", "A page shown again redraws at once with the current time", async (check) => {
  const world = fakeWorld("2026-11-16T10:00:10Z")
  world.loop.start()
  world.hidden = true
  world.loop.pause()
  world.advance(47 * 60_000 + 20_000)
  world.hidden = false
  world.loop.resume()
  check(shown(world.ticks.at(-1)) === "01:47", `drew ${shown(world.ticks.at(-1))} after 47 minutes hidden`)
  check(world.timers.size === 1, "no timer after resuming")
  world.advance(60_000)
  check(shown(world.ticks.at(-1)) === "01:48", "the schedule did not carry on")
})

await test("CLOCK-024", "A page restored from history is redrawn, not left stale", async (check) => {
  const world = fakeWorld("2026-11-16T10:00:10Z")
  world.loop.start()
  world.loop.pause() // pagehide
  world.advance(3 * 60 * 60_000)
  world.loop.resume() // pageshow, persisted
  check(shown(world.ticks.at(-1)) === "04:00", `drew ${shown(world.ticks.at(-1))}`)
  const script = strip(await read("src/scripts/world-clocks.ts"))
  check(/addEventListener\("pageshow"[\s\S]*persisted[\s\S]*loop\.resume/.test(script), "pageshow with persisted does not resume the loop")
  check(/addEventListener\("pagehide"[\s\S]*loop\.pause/.test(script), "pagehide does not drop the timer")
  check(/addEventListener\("visibilitychange"/.test(script), "no visibilitychange handler")
})

await test("CLOCK-025", "Repeated lifecycle events never create a second loop", async (check) => {
  const world = fakeWorld("2026-11-16T10:00:10Z")
  world.loop.start()
  for (let i = 0; i < 50; i++) {
    world.loop.pause()
    world.loop.resume()
    world.loop.resume()
    world.loop.start()
  }
  check(world.timers.size === 1, `${world.timers.size} timers after 200 events`)
  const before = world.ticks.length
  world.advance(60_000)
  check(world.ticks.length === before + 1, `one minute produced ${world.ticks.length - before} drawings`)
  world.loop.stop()
  world.loop.stop()
  check(world.timers.size === 0, "stop left a timer")
  const script = strip(await read("src/scripts/world-clocks.ts"))
  check((script.match(/addEventListener\("visibilitychange"/g) ?? []).length === 1, "the script adds the visibility listener more than once")
})

// --- The built page ----------------------------------------------------------------------------------

const builtPath = join(repo, "dist/index.html")
const built = existsSync(builtPath) ? await readFile(builtPath, "utf8") : undefined
if (built === undefined) {
  console.error("FAIL: dist/index.html is missing. Run `npm run build` first.")
  process.exit(1)
}
const page = parse(built)
const clocks = elements(page).find((el) => el.attrs["data-home-region"] === "clocks")
const items = elements(clocks).filter((el) => "data-clock-id" in el.attrs)

await test("CLOCK-026", "Without JavaScript the clocks say so and show no time", async (check) => {
  check(/<noscript>[\s\S]*Live times need JavaScript/.test(built.slice(built.indexOf('data-home-region="clocks"'))), "no <noscript> explanation")
  const css = await read("src/styles/home.css")
  check(/@media \(scripting: none\)\s*\{\s*\.clocks__note\[data-clocks-note\]\s*\{\s*display: none/.test(css), "the loading note is not hidden when scripting is off")
  check(items.length === 8 && items.every((li) => li.attrs["data-clock-state"] === "pending"), "a clock is not pending in the markup")
  for (const li of items) {
    const reading = elements(li).find((el) => "data-clock-reading" in el.attrs)
    check(reading.attrs["aria-hidden"] === "true", `${li.attrs["data-clock-id"]}: a placeholder is read aloud`)
    check(textOf(reading).replace(/\s+/g, "") === "--:--", `${li.attrs["data-clock-id"]}: placeholder "${textOf(reading)}"`)
  }
})

await test("CLOCK-027", "The static output holds no time that could be stale", async (check) => {
  const region = built.slice(built.indexOf('data-home-region="clocks"'), built.indexOf("</section>", built.indexOf('data-home-region="clocks"')))
  check(!/\d{1,2}:\d{2}/.test(region.replace(/<[^>]*>/g, " ")), "a time of day is in the clocks' markup")
  check(!/datetime=|<time/.test(region), "a <time> or datetime is in the clocks' markup")
  check(!/\b(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day,/.test(region) && !/\b20\d\d-\d\d-\d\d\b/.test(region), "a date is in the clocks' markup")
  check(clocks.attrs["data-clocks-state"] === "loading" && !("data-clocks-simulated" in clocks.attrs), "the release homepage is not in the loading state")
  const source = strip(await read("src/components/home/WorldClocks.astro"))
  check(!/Date\.now|new Date/.test(source), "the component reads the build-time clock")
})

await test("CLOCK-029", "The approved homepage composition is unchanged", async (check) => {
  const touched = changedSinceBase(["src/components/home/HomePage.astro", "src/components/home/HomeWelcome.astro", "src/components/home/ArchiveExplorer.astro", "src/components/home/RecentUpdates.astro", "src/home/archive.ts", "src/home/updates.ts"])
  check(touched.length === 0, `P16 changed other regions: ${json(touched)}`)
  const order = elements(page).filter((el) => "data-home-region" in el.attrs).map((el) => el.attrs["data-home-region"])
  check(json(order) === json(["welcome", "explore", "stage", "updates", "clocks"]), `region order ${json(order)}`)
})

await test("CLOCK-032", "Each time is tied to its own city, and its zone is on the row", async (check) => {
  for (const li of items) {
    const id = li.attrs["data-clock-id"]
    const place = CLOCK_LOCATIONS.find((p) => p.id === id)
    check(elements(li).some((el) => el.attrs.class === "clock__city" && textOf(el) === place.city), `${id}: the row does not name ${place.city}`)
    check(li.attrs["data-time-zone"] === place.timeZone, `${id}: zone`)
    check(elements(li).filter((el) => "data-clock-time" in el.attrs).length === 1, `${id}: not exactly one time`)
  }
  const script = strip(await read("src/scripts/world-clocks.ts"))
  check(/closest\("\[data-clock-id\]"\)/.test(script) && /querySelector<HTMLElement>\("\[data-clock-time\]"\)/.test(script), "the script does not fill a time inside its own row")
  check(/datetime/.test(script) && /isoDateTime/.test(script) && /isoDate\b/.test(script), "the script does not set valid datetime attributes")
})

await test("CLOCK-033", "A minute change makes no announcement", async (check) => {
  const markup = built.slice(built.indexOf('data-home-region="clocks"'), built.indexOf("</section>", built.indexOf('data-home-region="clocks"')))
  check(!/aria-live|aria-atomic|aria-relevant|role="(status|timer|log|alert|marquee)"/.test(markup), "the clocks are a live region")
  const script = strip(await read("src/scripts/world-clocks.ts"))
  check(!/aria-live|role["',\s]/.test(script) && !/\.focus\(|alert|announce/i.test(script), "the script announces or moves focus")
  check(!items.some((li) => "tabindex" in li.attrs) && !elements(clocks).some((el) => el.tag === "a" || el.tag === "button"), "a clock is focusable or looks clickable")
})

await test("CLOCK-034", "No per-second work, animation or animation loop", async (check) => {
  const sources = [strip(await read("src/scripts/world-clocks.ts")), strip(await read("src/home/clock-loop.ts")), strip(await read("src/home/clock-time.ts")), strip(await read("src/components/home/WorldClocks.astro"))]
  for (const source of sources) check(!/requestAnimationFrame|setInterval|animate\(|MutationObserver|ResizeObserver/.test(source), "a loop, observer or animation")
  const css = await read("src/styles/home.css")
  const clockPart = css.slice(css.indexOf("/* 4. World clocks"), css.indexOf("/* 5. Recent Blog"))
  check(!/transition|animation|@keyframes|scroll-behavior/.test(clockPart), "the clocks' styles animate")
  check(!/seconds|second:|"2-digit",\s*second/.test(sources[2]), "seconds are formatted")
})

function changedSinceBase(paths) {
  const run = (...args) => spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" })
  if (run("cat-file", "-e", BASE).status !== 0) return []
  const files = new Set()
  const commits = run("log", "--format=%H", `${BASE}..HEAD`, "--grep=\\[P16\\]").stdout.split("\n").filter(Boolean)
  for (const commit of commits) for (const f of run("diff-tree", "--no-commit-id", "--name-only", "-r", commit, "--", ...paths).stdout.split("\n").filter(Boolean)) files.add(f)
  // While this file is not yet committed, the working tree is P16 in progress.
  if (run("status", "--porcelain", "--", "tests/clocks.mjs").stdout.startsWith("??")) {
    for (const f of run("diff", "HEAD", "--name-only", "--", ...paths).stdout.split("\n").filter(Boolean)) files.add(f)
    for (const f of run("ls-files", "--others", "--exclude-standard", "--", ...paths).stdout.split("\n").filter(Boolean)) files.add(f)
  }
  return [...files].sort()
}

for (const [id, title, paths] of [
  ["CLOCK-035", "The locked palettes and tokens are unchanged", ["src/styles/categories.css", "src/styles/tokens.css", "src/styles/environments.css", "src/design/contract.mjs"]],
  ["CLOCK-036", "The physical folders and navigation are unchanged", ["src/navigation", "src/components/folders", "src/styles/folders.css", "src/scripts/folder-previews.ts", "src/scripts/folder-rows.ts", "src/styles/view-transitions.css", "src/layouts"]],
  ["CLOCK-037", "Bearnard's assets and his component are unchanged", ["brand", "public/illustrations", "src/illustrations", "src/components/BearnardIllustration.astro", "assets/bearnard"]],
  ["CLOCK-038", "The nucleus stage is unchanged", ["src/components/home/NucleusStage.astro"]],
  ["CLOCK-039", "Publishing (P10–P14), records and the CV are unchanged", ["src/editorial", "src/content", "src/content.config.ts", "src/records", "src/data", "src/cv", "cv", "scripts/content.mjs", "scripts/science.mjs", "science", "src/science", "src/demos"]],
]) {
  await test(id, title, async (check) => {
    const touched = changedSinceBase(paths)
    check(touched.length === 0, `P16 changed protected files: ${json(touched)}`)
  })
}

await test("CLOCK-040", "No development specimen or scenario reaches the release output", async (check) => {
  const issues = await publicBuildIssues(join(repo, "dist"))
  check(issues.length === 0, `the release build has demonstration traces: ${json(issues.slice(0, 5))}`)
  check(!existsSync(join(repo, "dist/_design/world-clocks")), "dist/_design/world-clocks exists")
  const everything = built
  check(!/Simulated instant|data-clocks-specimen|data-clocks-simulated|data-clocks-scenario/.test(everything), "a specimen marker is on the homepage")
  check(!CLOCK_SCENARIOS.some((s) => built.includes(s.instant)), "a scenario instant is in the release homepage")
  for (const scenario of CLOCK_SCENARIOS) check(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(scenario.instant) && isValidInstant(scenario.instant), `scenario ${scenario.id} has no valid instant`)
})
function isValidInstant(iso) {
  return Number.isFinite(Date.parse(iso))
}

// --- Report --------------------------------------------------------------------------------------------

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
