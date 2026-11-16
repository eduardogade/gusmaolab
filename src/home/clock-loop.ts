/**
 * The one update loop of the world clocks (P16, D-119). It knows nothing of the DOM, the page or
 * the clocks: it is given what to do on a tick, a way to read the current time, a way to set and
 * cancel a timer, and a way to ask whether the page is hidden. That makes it testable with a
 * controlled clock and fake timers, and it is the same code the page runs.
 *
 * - One timer at a time. Every scheduling call cancels the pending one first, so repeated
 *   lifecycle events can never stack loops.
 * - Aligned to the minute. The next tick is set for just after the next minute begins; on every
 *   tick the loop reads the time again and recomputes the delay, so a late or early timer is
 *   corrected rather than accumulated. It never counts ticks and never assumes a timer was exact.
 * - Quiet while hidden. When the page is hidden there is no pending timer at all, so the page does
 *   not wake the browser. When it is visible again (or restored from the history cache) the loop
 *   shows the current time at once and schedules the next minute.
 * - Idempotent. `start` on a running loop only refreshes; `stop` on a stopped one does nothing.
 *
 * Erasable TypeScript only (D-040).
 */
import { msToNextMinute } from "./clock-time.ts"

/** A little past the boundary, so a timer that fires a hair early still lands in the new minute. */
export const BOUNDARY_MARGIN_MS = 50

export interface ClockLoopEnvironment<Handle> {
  /** Called with the current instant (ms since the epoch) to draw every clock from. */
  readonly tick: (instant: number) => void
  /** The current instant. The page passes `Date.now`; a test passes its own clock. */
  readonly now: () => number
  readonly setTimer: (callback: () => void, delay: number) => Handle
  readonly clearTimer: (handle: Handle) => void
  /** True while the page cannot be seen. */
  readonly hidden: () => boolean
}

export interface ClockLoop {
  /** Draw now and, if the page is visible, keep the minute schedule. Safe to call repeatedly. */
  readonly start: () => void
  /** Cancel the pending timer. */
  readonly stop: () => void
  /** The page became visible, or was restored: draw now and re-aim at the next minute. */
  readonly resume: () => void
  /** The page was hidden or is being left: drop the timer. */
  readonly pause: () => void
  /** Whether a timer is pending: for the tests. */
  readonly active: () => boolean
}

export function createClockLoop<Handle>(env: ClockLoopEnvironment<Handle>): ClockLoop {
  let pending: { handle: Handle } | undefined

  function cancel(): void {
    if (pending !== undefined) env.clearTimer(pending.handle)
    pending = undefined
  }

  function schedule(): void {
    cancel()
    if (env.hidden()) return
    const delay = msToNextMinute(env.now()) + BOUNDARY_MARGIN_MS
    pending = { handle: env.setTimer(onTimer, delay) }
  }

  function onTimer(): void {
    pending = undefined
    env.tick(env.now())
    schedule()
  }

  function resume(): void {
    // Draw even if the page reports itself hidden: the first draw, and a page restored while its
    // visibility is still settling, should never be left blank. The timer, not the draw, is
    // what a hidden page must not keep.
    env.tick(env.now())
    schedule()
  }

  return {
    start: resume,
    resume,
    stop: cancel,
    pause: cancel,
    active: () => pending !== undefined,
  }
}
