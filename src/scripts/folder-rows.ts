/**
 * Folder rows (P08): keep the right tab in view in a row that scrolls sideways. A
 * progressive enhancement, like the previews.
 *
 * A row wider than its folder scrolls sideways (src/styles/folders.css), with a fade at
 * each edge beyond which more tabs lie. The row's `scroll-padding-inline` is the width of
 * a fade plus a focus ring: the room a tab needs to be clearly in view. This module does
 * two things with it, and nothing else:
 *
 * 1. **Opening at the selected tab.** Which tab is selected is already in the HTML,
 *    decided by the page's URL at build time. Chromium opens each row at it natively
 *    (`scroll-initial-target`), with no script and before the first paint. Elsewhere,
 *    once, as the page opens, a row whose selected tab is not clear of its fades jumps
 *    (never animates) so the tab sits in its middle, as Chromium places it. A tab already
 *    in view is left alone.
 * 2. **Keeping keyboard focus clear of the fades.** Browsers scroll a focused link into
 *    the row, but may leave it, or its focus ring, under a fade. After the browser's own
 *    scroll, the row moves the few pixels still needed, and no more.
 *
 * It moves only the rows, never the page; it never moves focus, navigates, reads the URL
 * or works out the selection itself. Without it, rows open at their start (Chromium
 * still opens them at the selected tab) and every tab is reachable by scrolling, swiping
 * or Tab.
 */

/** The horizontal room a tab needs inside its row: the row's scroll padding. */
function clearance(row: HTMLElement): { start: number; end: number } {
  const style = getComputedStyle(row)
  return {
    start: parseFloat(style.scrollPaddingLeft) || 0,
    end: parseFloat(style.scrollPaddingRight) || 0,
  }
}

function revealSelectedTabs(): void {
  if (typeof CSS !== "undefined" && CSS.supports("scroll-initial-target", "nearest"))
    return
  for (const row of document.querySelectorAll<HTMLElement>(".gl-folder__strip")) {
    if (row.scrollWidth <= row.clientWidth) continue
    const tab = row.querySelector<HTMLElement>(".gl-folder-tab[data-selected]")
    if (tab === null) continue
    const { start, end } = clearance(row)
    const box = row.getBoundingClientRect()
    // Already in view if its label, and so its V, is clear of the fades.
    const label = (
      tab.querySelector(".gl-folder-tab__label") ?? tab
    ).getBoundingClientRect()
    if (label.left >= box.left + start && label.right <= box.right - end) continue
    const own = tab.getBoundingClientRect()
    const middle = (box.left + start + box.right - end) / 2
    row.scrollLeft += own.left + own.width / 2 - middle
  }
}

function keepFocusClear(event: FocusEvent): void {
  const link = event.target
  if (
    !(link instanceof HTMLElement) ||
    !link.matches(".gl-folder-tab__label:focus-visible")
  )
    return
  const row = link.closest<HTMLElement>(".gl-folder__strip")
  if (row === null || row.scrollWidth <= row.clientWidth) return
  const { start, end } = clearance(row)
  const box = row.getBoundingClientRect()
  const own = link.getBoundingClientRect()
  // The smallest move that brings the label, with its ring, clear of both fades.
  if (own.left < box.left + start) row.scrollLeft += own.left - box.left - start
  else if (own.right > box.right - end) row.scrollLeft += own.right - box.right + end
}

revealSelectedTabs()
document.addEventListener("focusin", keepFocusClear)

// A module, so its names stay private to it.
export {}
