/**
 * The Schedule page's one script (P21, D-147). It binds the real browser to `startBooking`
 * (src/scheduling/embed.ts) when the visitor presses "Show the booking calendar", and reflects the
 * outcome in the page: a loading message, the calendar, or a plain failure message beside the
 * provider's hosted booking link, which is always on the page as ordinary HTML.
 *
 * The page renders this script only when scheduling is `ready` (ScheduleEmbed.astro), so Home, the
 * Blog, the CV and every other page, and Schedule itself while unconfigured, load no scheduling
 * code at all. The configuration it reads is the public view (no path, no setting, no secret).
 */
import { startBooking } from "../scheduling/embed.ts"
import type { BookingStatus } from "../scheduling/embed.ts"
import type { PublicScheduling } from "../scheduling/config.ts"
import { FAILED_MESSAGE, LOADING_MESSAGE } from "../scheduling/messages.ts"

const MESSAGES: Record<BookingStatus, string> = { idle: "", loading: LOADING_MESSAGE, ready: "", failed: FAILED_MESSAGE }

function bind(root: HTMLElement): void {
  const button = root.querySelector<HTMLButtonElement>("[data-schedule-load]")
  const row = root.querySelector<HTMLElement>("[data-schedule-load-row]")
  const frame = root.querySelector<HTMLElement>("[data-schedule-frame]")
  const status = root.querySelector<HTMLElement>("[data-schedule-status]")
  const raw = root.getAttribute("data-schedule-config")
  if (button === null || row === null || frame === null || status === null || raw === null) return
  let view: PublicScheduling
  try {
    view = JSON.parse(raw) as PublicScheduling
  } catch {
    return
  }
  const set = (value: BookingStatus): void => {
    root.setAttribute("data-booking-status", value)
    status.textContent = MESSAGES[value]
    status.hidden = MESSAGES[value] === ""
    frame.hidden = value === "idle" || value === "failed"
    row.hidden = value !== "idle"
  }
  // The row is hidden in the HTML: with scripts off there is no button that cannot work.
  row.hidden = false
  button.addEventListener("click", () => {
    button.disabled = true
    startBooking(
      {
        win: window as unknown as { Cal?: unknown },
        container: frame,
        loadScript(src, onLoad, onError) {
          const script = document.createElement("script")
          script.async = true
          script.src = src
          script.addEventListener("load", onLoad)
          script.addEventListener("error", onError)
          document.head.appendChild(script)
        },
        setTimer: (callback, ms) => window.setTimeout(callback, ms),
        clearTimer: (handle) => window.clearTimeout(handle as number),
      },
      view,
      set,
    )
  })
}

for (const root of document.querySelectorAll<HTMLElement>("[data-schedule]")) bind(root)
