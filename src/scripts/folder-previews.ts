/**
 * Folder previews (P07): the only client-side script of the physical folders, and a
 * progressive enhancement. Navigation never depends on it.
 *
 * Each unopened folder tab with children already holds a hidden preview of its contents,
 * built with the page (FolderPreview.astro). This module only shows and hides those
 * previews. It never changes the URL, the history, the selected tabs or the V, which come
 * from the page's own URL at build time. Its state (which preview is open, and why) lives
 * in this module and disappears with the page: nothing is stored anywhere.
 *
 * - Pointer: a mouse or pen over a tab opens its preview at once. Moving to another tab
 *   switches after SWITCH_DELAY, so a pointer crossing a neighbour on its way into the
 *   preview does not switch. Leaving both the tab and its preview closes it after
 *   CLOSE_DELAY, so the seam between them never makes it flicker. The preview is inside
 *   the tab in the document, so the pointer over the preview is still over the tab.
 * - Touch: ignored. A tap follows the tab's link, exactly as without this script.
 * - Keyboard: keyboard focus on a tab (`:focus-visible`) opens its preview without moving
 *   focus. Tab then reaches the preview's links, which follow the tab in the document,
 *   and leaving the tab and its preview closes it. A click focuses without opening.
 * - Escape closes the open preview. If focus was inside it, focus returns to its tab. The
 *   preview stays closed until both the pointer and focus have left the tab.
 * - One preview at a time. Opening another closes the first.
 *
 * Previews are popovers (`popover="manual"`), shown in the top layer, so no scrolling row,
 * folder or stacking context can clip or cover them. The script places each one under its
 * tab when it opens, and again on scroll and resize while it is open. Browsers without the
 * Popover API get no previews: the tabs work as plain links.
 */

/** Delay before a preview closes once the pointer has left its tab and itself, in ms. */
const CLOSE_DELAY = 120
/** Delay before another tab's preview replaces the open one, in ms. */
const SWITCH_DELAY = 90
/** Room kept between a preview and the edges of the viewport, in CSS pixels. */
const EDGE = 8

interface Entry {
  /** The tab: `li.gl-folder-tab`, which holds the label and the preview. */
  readonly tab: HTMLElement
  /** The tab's link (a span in design studies). */
  readonly label: HTMLElement
  readonly panel: HTMLElement
  /** The pointer is over the tab or its preview. */
  pointer: boolean
  /** Keyboard focus is on the tab's link or in its preview. */
  focus: boolean
  /** Closed with Escape, or replaced by another preview, while pointer or focus stayed. */
  dismissed: boolean
}

const entries: Entry[] = []
let shown: Entry | null = null
let closeTimer: ReturnType<typeof setTimeout> | undefined
let switchTimer: ReturnType<typeof setTimeout> | undefined
let switchTo: Entry | null = null
let frame = 0

const isTouch = (event: PointerEvent): boolean => event.pointerType === "touch"

/** Clears a dismissal once nothing holds the tab any more. */
function settle(entry: Entry): void {
  if (!entry.pointer && !entry.focus) entry.dismissed = false
}

function cancelSwitch(): void {
  clearTimeout(switchTimer)
  switchTo = null
}

function show(entry: Entry): void {
  clearTimeout(closeTimer)
  cancelSwitch()
  if (shown === entry) return
  if (shown !== null) close(shown)
  try {
    entry.panel.showPopover()
  } catch {
    return
  }
  shown = entry
  place(entry)
  addEventListener("scroll", reposition, { capture: true, passive: true })
  addEventListener("resize", reposition, { passive: true })
}

function hide(entry: Entry): void {
  if (shown !== entry) return
  clearTimeout(closeTimer)
  cancelAnimationFrame(frame)
  shown = null
  removeEventListener("scroll", reposition, { capture: true })
  removeEventListener("resize", reposition)
  try {
    entry.panel.hidePopover()
  } catch {
    // Already hidden.
  }
}

/**
 * Closes a preview on purpose (Escape, or another preview taking over). While the pointer
 * or focus is still on its tab it stays dismissed, so it does not reopen at once. Focus
 * inside it moves back to its tab first, so it is never lost to the page.
 */
function close(entry: Entry): void {
  // Set before focus moves, so the focus that returns to the tab cannot reopen it.
  entry.dismissed = entry.pointer || entry.focus
  if (entry.panel.contains(document.activeElement)) entry.label.focus()
  hide(entry)
}

/** Places a preview under its tab, inside the viewport. Measures only while it is open. */
function place(entry: Entry): void {
  const { tab, panel } = entry
  const box = tab.getBoundingClientRect()
  const row = tab.closest(".gl-folder__strip")?.getBoundingClientRect() ?? box
  // The part of the tab that its scrolling row lets through.
  const left = Math.max(box.left, row.left)
  const right = Math.min(box.right, row.right)
  const viewWidth = document.documentElement.clientWidth
  const viewHeight = document.documentElement.clientHeight
  const outOfSight = right - left < 1 || box.bottom < 0 || box.top > viewHeight
  if (outOfSight && !panel.contains(document.activeElement)) {
    hide(entry)
    return
  }
  const style = panel.style
  style.setProperty("--_min-inline-size", `${Math.max(0, Math.round(right - left))}px`)
  style.setProperty("--_max-inline-size", `${viewWidth - 2 * EDGE}px`)
  style.removeProperty("--_max-block-size")
  const width = panel.offsetWidth
  const height = panel.offsetHeight
  const below = viewHeight - EDGE - box.bottom
  const above = box.top - EDGE
  // Below the tab, hanging from its foot, unless it fits only above.
  const downwards = height <= below || below >= above
  const x = Math.max(EDGE, Math.min(left, viewWidth - EDGE - width))
  const y = downwards ? box.bottom : Math.max(EDGE, box.top - height)
  style.setProperty("--_x", `${Math.round(x)}px`)
  style.setProperty("--_y", `${Math.round(y)}px`)
  style.setProperty(
    "--_max-block-size",
    `${Math.max(0, Math.floor(downwards ? below : above))}px`,
  )
  panel.dataset.placement = downwards ? "below" : "above"
}

function reposition(): void {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    if (shown !== null) place(shown)
  })
}

function watch(entry: Entry): void {
  const { tab } = entry

  tab.addEventListener("pointerenter", (event) => {
    if (isTouch(event)) return
    entry.pointer = true
    if (shown === entry) {
      clearTimeout(closeTimer)
      return
    }
    if (entry.dismissed) return
    if (shown === null) {
      show(entry)
      return
    }
    cancelSwitch()
    switchTo = entry
    switchTimer = setTimeout(() => {
      if (switchTo === entry && entry.pointer && !entry.dismissed) show(entry)
    }, SWITCH_DELAY)
  })

  tab.addEventListener("pointerleave", (event) => {
    if (isTouch(event)) return
    entry.pointer = false
    if (switchTo === entry) cancelSwitch()
    if (shown === entry && !entry.focus) {
      clearTimeout(closeTimer)
      closeTimer = setTimeout(() => hide(entry), CLOSE_DELAY)
    }
    settle(entry)
  })

  tab.addEventListener("focusin", (event) => {
    // A click or tap focuses a link too, but only keyboard focus opens a preview.
    if (!(event.target instanceof Element) || !event.target.matches(":focus-visible"))
      return
    entry.focus = true
    if (!entry.dismissed) show(entry)
  })

  tab.addEventListener("focusout", (event) => {
    if (event.relatedTarget instanceof Node && tab.contains(event.relatedTarget)) return
    entry.focus = false
    if (shown === entry && !entry.pointer) hide(entry)
    settle(entry)
  })
}

function start(): void {
  if (typeof HTMLElement.prototype.showPopover !== "function") return
  for (const tab of document.querySelectorAll<HTMLElement>(
    ".gl-folder-tab[data-preview]",
  )) {
    const label = tab.querySelector<HTMLElement>(":scope > .gl-folder-tab__label")
    const panel = tab.querySelector<HTMLElement>(":scope > .gl-folder-preview")
    if (label === null || panel === null) continue
    const entry: Entry = {
      tab,
      label,
      panel,
      pointer: false,
      focus: false,
      dismissed: false,
    }
    entries.push(entry)
    watch(entry)
  }
  if (entries.length === 0) return

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && shown !== null) close(shown)
  })
  // Leaving the page closes the preview, so a page restored by Back starts closed.
  addEventListener("pagehide", () => {
    cancelSwitch()
    if (shown !== null) hide(shown)
    for (const entry of entries) {
      entry.pointer = false
      entry.focus = false
      entry.dismissed = false
    }
  })
}

start()

// A module, so its names stay private to it.
export {}
