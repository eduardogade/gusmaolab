/**
 * The world clocks of the homepage (P16, D-118 to D-121): draws each place's local time and date
 * into the markup WorldClocks.astro sends, from the current instant, and keeps it right. A
 * progressive enhancement: the page is complete without it (the clocks then say they need
 * JavaScript and show no time), and it touches nothing but the clocks' own text.
 *
 * - One instant per drawing. `Date.now()` is read once and every place is formatted from it with
 *   its IANA zone (src/home/clock-time.ts), so all eight show the same moment.
 * - One loop for all eight (src/home/clock-loop.ts): a single timer aimed at the next minute,
 *   recomputed from the real time on every tick, with no timer while the page is hidden.
 * - Page lifecycle: `visibilitychange` pauses the loop when the page is hidden and redraws when it
 *   is shown again; `pageshow` with `persisted` redraws a page restored from the history cache;
 *   `pagehide` drops the timer. The listeners are added once, on the document and window, which
 *   a cross-document navigation discards with the page.
 * - Only a region whose `data-clocks-state` is "loading" is taken over. A region drawn for a fixed,
 *   simulated instant (the development specimen) says so in that attribute and is left alone.
 * - A zone the browser cannot format leaves its city visible and says "Unavailable"; the visitor's
 *   own time is never substituted. A development console says so once for that zone.
 *
 * The time is the device's clock and nothing else: there is no network call, geolocation, cookie
 * or storage, and the clocks are only as accurate as the device's clock is set.
 */
import { createClockLoop } from "../home/clock-loop.ts"
import { tryReadClock } from "../home/clock-time.ts"
import type { ClockReading } from "../home/clock-time.ts"

interface Face {
  readonly zone: string
  readonly id: string
  readonly reading: HTMLElement
  time: HTMLElement
  date: HTMLElement
  /** What is drawn now, so an unchanged minute writes nothing. */
  shown: string
}

/** A `<time>` replaces the placeholder span once there is a real value to give it (valid HTML). */
function asTime(el: HTMLElement): HTMLElement {
  if (el.localName === "time") return el
  const time = document.createElement("time")
  for (const { name, value } of Array.from(el.attributes)) time.setAttribute(name, value)
  time.textContent = el.textContent
  el.replaceWith(time)
  return time
}

const warned = new Set<string>()

function draw(faces: readonly Face[], regions: readonly HTMLElement[], instant: number): void {
  for (const face of faces) {
    const reading: ClockReading | null = tryReadClock(instant, face.zone)
    if (reading === null) {
      if (face.shown !== "unavailable") {
        face.shown = "unavailable"
        face.reading.removeAttribute("aria-hidden")
        face.time.textContent = "Unavailable"
        face.date.textContent = ""
        face.reading.closest("[data-clock-id]")?.setAttribute("data-clock-state", "unavailable")
      }
      if (import.meta.env.DEV && !warned.has(face.zone)) {
        warned.add(face.zone)
        console.warn(`World clocks: this browser cannot format the time zone "${face.zone}" (${face.id}).`)
      }
      continue
    }
    if (face.shown === reading.isoDateTime) continue
    face.shown = reading.isoDateTime
    face.time = asTime(face.time)
    face.date = asTime(face.date)
    face.time.textContent = reading.time
    face.time.setAttribute("datetime", reading.isoDateTime)
    face.date.textContent = reading.date
    face.date.setAttribute("datetime", reading.isoDate)
    face.reading.removeAttribute("aria-hidden")
    face.reading.closest("[data-clock-id]")?.setAttribute("data-clock-state", "live")
  }
  for (const region of regions) region.dataset.clocksState = "live"
}

function start(): void {
  const regions = Array.from(document.querySelectorAll<HTMLElement>('[data-clocks-state="loading"]'))
  if (regions.length === 0) return
  const faces: Face[] = []
  for (const region of regions) {
    for (const item of Array.from(region.querySelectorAll<HTMLElement>("[data-clock-id][data-time-zone]"))) {
      const reading = item.querySelector<HTMLElement>("[data-clock-reading]")
      const time = item.querySelector<HTMLElement>("[data-clock-time]")
      const date = item.querySelector<HTMLElement>("[data-clock-date]")
      if (!reading || !time || !date) continue
      faces.push({ zone: item.dataset.timeZone ?? "", id: item.dataset.clockId ?? "", reading, time, date, shown: "" })
    }
  }
  const loop = createClockLoop<number>({
    tick: (instant) => draw(faces, regions, instant),
    now: () => Date.now(),
    setTimer: (callback, delay) => window.setTimeout(callback, delay),
    clearTimer: (handle) => window.clearTimeout(handle),
    hidden: () => document.visibilityState === "hidden",
  })
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") loop.pause()
    else loop.resume()
  })
  window.addEventListener("pageshow", (event) => {
    // A page restored from the history cache keeps its old text and has no running timer.
    if (event.persisted) loop.resume()
  })
  window.addEventListener("pagehide", () => loop.pause())
  loop.start()
}

start()
