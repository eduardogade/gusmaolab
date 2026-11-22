/**
 * Loading the provider's booking calendar (P21, D-147): the one piece of client logic that touches
 * the provider, kept free of the page so Node can test it with a stand-in browser (tests/
 * scheduling.mjs). It does only what the provider's own embed snippet does, with three differences
 * made for privacy and honesty:
 *
 *   - Nothing is loaded until it is called, and the page calls it only when the visitor presses
 *     the button. No provider script, frame or cookie is touched when a page is merely viewed.
 *   - Only one script and one origin are ever used: EMBED_SCRIPT and EMBED_ORIGIN (config.ts). A
 *     configuration naming anything else is refused here too, not only at build time.
 *   - It tells the page what happened (`loading`, `ready`, `failed`) from the provider's own
 *     events and an error or a timeout, so a blocked script, an outage or a refused frame shows
 *     an understandable message and the hosted booking link, never an empty box.
 *
 * Protocol (verified against the provider's published embed.js, 2026-11-22; not against a
 * configured account): the loader defines `window.Cal` with a call queue `Cal.q` and namespaces
 * `Cal.ns`, appends the script, and the script drains the queue. `init`, `inline`, `ui` and `on`
 * are the calls used; `linkReady` and `linkFailed` are the events used.
 *
 * What it does not do: it prefills nothing (no name, no email), reads nothing from the provider
 * and keeps no state about bookings. A booking request, its verification and its approval live
 * entirely in the provider.
 */
import { EMBED_LAYOUT, EMBED_ORIGIN, EMBED_SCRIPT } from "./config.ts"
import type { PublicScheduling } from "./config.ts"

export type BookingStatus = "idle" | "loading" | "ready" | "failed"

/** What the loader needs from a browser. A page gives it the real one; a test, a stand-in. */
export interface BookingHost {
  /** The window, where `Cal` is defined. */
  readonly win: { Cal?: unknown }
  /** The element the calendar is drawn into. */
  readonly container: unknown
  /** Appends a script that loads `src`, calling back when it loads or fails. */
  loadScript(src: string, onLoad: () => void, onError: () => void): void
  setTimer(callback: () => void, ms: number): unknown
  clearTimer(handle: unknown): void
}

/** Milliseconds to wait for the provider's calendar before saying it is unavailable. */
export const BOOKING_TIMEOUT_MS = 20000

type CalQueue = { (...args: unknown[]): void; q: unknown[]; ns: Record<string, unknown>; loaded?: boolean }

/** Whether the public view names exactly the provider's one allowed script and origin. */
export function embedIsAllowed(view: PublicScheduling): boolean {
  const e = view.embed
  return (
    view.state === "ready" &&
    e !== undefined &&
    e.script === EMBED_SCRIPT &&
    e.origin === EMBED_ORIGIN &&
    e.layout === EMBED_LAYOUT &&
    /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)?$/.test(e.calLink)
  )
}

/**
 * Starts loading the booking calendar. Calls `onStatus` with `loading` at once and then `ready` or
 * `failed`, once. Returns a function that stops waiting (it cannot unload a script that has begun).
 */
export function startBooking(
  host: BookingHost,
  view: PublicScheduling,
  onStatus: (status: BookingStatus) => void,
  timeoutMs: number = BOOKING_TIMEOUT_MS,
): () => void {
  let done = false
  let timer: unknown
  const finish = (status: BookingStatus): void => {
    if (done) return
    done = true
    if (timer !== undefined) host.clearTimer(timer)
    onStatus(status)
  }
  if (!embedIsAllowed(view) || view.embed === undefined) {
    finish("failed")
    return () => {}
  }
  const { origin, script, calLink, layout } = view.embed
  onStatus("loading")

  // The provider's own queue loader, minus its script append (done below, with error handling).
  const existing = host.win.Cal as CalQueue | undefined
  let cal: CalQueue
  if (existing !== undefined && Array.isArray(existing.q)) cal = existing
  else {
    cal = function () {
      // eslint-disable-next-line prefer-rest-params
      cal.q.push(arguments)
    } as CalQueue
    cal.q = []
    cal.ns = {}
    cal.loaded = true
    host.win.Cal = cal
  }
  cal("init", { origin })
  cal("on", { action: "linkReady", callback: () => finish("ready") })
  cal("on", { action: "linkFailed", callback: () => finish("failed") })
  cal("inline", { elementOrSelector: host.container, calLink, config: { layout } })
  cal("ui", { hideEventTypeDetails: false, layout })

  timer = host.setTimer(() => finish("failed"), timeoutMs)
  host.loadScript(script, () => {}, () => finish("failed"))
  return () => {
    done = true
    if (timer !== undefined) host.clearTimer(timer)
  }
}
