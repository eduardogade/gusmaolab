/**
 * What the homepage tells the nucleus about the folders (P20, D-137, D-140): the page's side of the
 * navigation contract. It knows the physical tabs and nothing of the nucleus's geometry; the nucleus
 * (src/visualization/nucleus/) knows nothing of the tabs, only the stable IDs and positions that come
 * through here.
 *
 * - Identity is the registry's: every tab is rendered with `data-tab-id` (FolderTab.astro), the ID
 *   declared in src/navigation/registry.ts. Never the label, the URL or the tab's place in the row.
 * - The eligible tabs are the global row's folders: the eleven top-level sections.
 * - A tab's attention point is the middle of the part of it that is on screen. A row that scrolls
 *   sideways can hide half a tab, and its centre then lies under the edge of the folder, so the point
 *   is taken from the box clipped to its row (the same clipping the previews use, folder-previews.ts).
 */
import type { NavigationItem } from "../visualization/nucleus/index.ts"

/** The global row, and its tabs that are folders (an Overview tab is another kind). */
export const GLOBAL_ROW = 'nav[aria-label="Sections"]'
export const TOP_LEVEL_TAB = ".gl-folder-tab[data-tab-kind='folder']"

export interface Box {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

/** The middle of the tab's visible part: its box clipped to its row's horizontally, or its own centre. */
export function attentionPoint(tab: Box, row: Box | null): { x: number; y: number } {
  const left = row === null ? tab.left : Math.max(tab.left, row.left)
  const right = row === null ? tab.right : Math.min(tab.right, row.right)
  const x = right > left ? (left + right) / 2 : (tab.left + tab.right) / 2
  return { x, y: (tab.top + tab.bottom) / 2 }
}

/** The page's eligible tabs as navigation items, in document order; tabs without an ID are skipped. */
export function navigationItems(root: ParentNode = document): NavigationItem[] {
  const items: NavigationItem[] = []
  for (const element of root.querySelectorAll<HTMLElement>(`${GLOBAL_ROW} ${TOP_LEVEL_TAB}`)) {
    const id = element.dataset.tabId
    if (id !== undefined && id !== "") items.push({ id, element })
  }
  return items
}

/** Where the visitor's attention is on a tab, measured now, in client coordinates. */
export function sampleTab(item: NavigationItem): { x: number; y: number } {
  const row = item.element.closest(".gl-folder__strip")
  return attentionPoint(item.element.getBoundingClientRect(), row === null ? null : row.getBoundingClientRect())
}
