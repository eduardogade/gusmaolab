/**
 * Passive observation of navigation (P19, D-133; P20, D-138): the one way a page tells the nucleus
 * where the visitor's attention is. Given a controller and some items, each a stable navigation ID
 * and the element that stands for it (the real folder tabs on Home, the specimen's simulated ones),
 * it watches pointer and focus events on them and turns each into `activate` or `clear`.
 *
 * It never interferes with the elements. Its listeners are passive, none calls `preventDefault` or
 * `stopPropagation`, it adds nothing to the element, and a click, a keypress and a scroll are
 * untouched. Touch pointers are ignored: touch devices get the static nucleus (D-134), not a hover
 * that does not exist. Disposing removes every listener it added and clears the response.
 *
 * Precedence (D-138). The nucleus answers the most recent input: a pointer entering an item, or
 * keyboard focus arriving on one (`:focus-visible`: a mouse click that focuses a link is not
 * attention), sets the target. An input ends the response only if it is the one that set it: the
 * pointer leaving the item it entered, focus leaving the item it came to (moving focus to another
 * observed item is a hand-over, not a release). Ending one input never brings back an older one, so
 * a focus left behind on a tab cannot pull the chromatin back after the pointer has gone.
 *
 * While a target is held, scrolling or resizing the page re-samples its position (once per frame,
 * and only when it has moved a few pixels), so the response follows the layout without any loop of
 * its own and without jitter from sub-pixel movement.
 */
import type { NucleusController, NucleusNavigationTarget, TargetPoint } from "./types.ts"

/** A navigation entry: the registry's ID, the element that stands for it, and optionally a domain. */
export interface NavigationItem {
  readonly id: string
  readonly element: Element
  readonly chromatinDomainId?: string
}

/** The page's scroll and resize, for re-sampling: `browserLayout()` (lifecycle.ts) on a page, a stand-in in tests. Without one, a held target is not re-sampled. */
export interface LayoutSource {
  readonly target: EventTarget
  requestFrame(callback: () => void): number
  cancelFrame(id: number): void
}

export interface NavigationObserverOptions {
  /** Where an item's attention point is, in client coordinates. Default: the centre of its box. */
  readonly sample?: (item: NavigationItem) => TargetPoint
  /** Called with the item that became the target, or null when the response was released. */
  readonly onChange?: (item: NavigationItem | null) => void
  readonly layout?: LayoutSource
}

/** Pixels the sampled point must move before the response is told again. */
const RESAMPLE_THRESHOLD = 3

const centerOfBox = (element: Element): TargetPoint => {
  const r = element.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

/** Keyboard focus, as opposed to a click that happens to focus: `:focus-visible`, where it can be asked. */
function isKeyboardFocus(event: Event): boolean {
  const target = event.target as { matches?: (selector: string) => boolean } | null
  if (typeof target?.matches !== "function") return true
  try {
    return target.matches(":focus-visible")
  } catch {
    return true
  }
}

const contains = (outer: Element, inner: unknown): boolean =>
  inner === outer ||
  (typeof outer.contains === "function" && typeof (inner as { nodeType?: unknown } | null)?.nodeType === "number" && outer.contains(inner as Node))

export function observeNavigation(
  controller: Pick<NucleusController, "activate" | "clear">,
  items: Iterable<NavigationItem>,
  options: NavigationObserverOptions = {},
): () => void {
  const list = Array.from(items)
  const sample = options.sample ?? ((item: NavigationItem) => centerOfBox(item.element))
  const layout = options.layout
  const removers: Array<() => void> = []
  let active: NavigationItem | null = null
  let source: "pointer" | "focus" | null = null
  let sent: TargetPoint | null = null
  let stopWatching: (() => void) | null = null

  const send = (item: NavigationItem): void => {
    sent = sample(item)
    const target: NucleusNavigationTarget =
      item.chromatinDomainId === undefined
        ? { navigationId: item.id, position: sent }
        : { navigationId: item.id, position: sent, chromatinDomainId: item.chromatinDomainId }
    controller.activate(target)
  }

  /** While a target is held: re-sample after the page scrolls or resizes, at most once per frame. */
  const watch = (): void => {
    if (stopWatching !== null || layout === undefined) return
    let pending: number | null = null
    const onLayout = (): void => {
      if (pending !== null) return
      pending = layout.requestFrame(() => {
        pending = null
        if (active === null || sent === null) return
        const now = sample(active)
        if (Math.hypot(now.x - sent.x, now.y - sent.y) >= RESAMPLE_THRESHOLD) send(active)
      })
    }
    layout.target.addEventListener("scroll", onLayout, { capture: true, passive: true })
    layout.target.addEventListener("resize", onLayout, { passive: true })
    stopWatching = () => {
      layout.target.removeEventListener("scroll", onLayout, true)
      layout.target.removeEventListener("resize", onLayout)
      if (pending !== null) layout.cancelFrame(pending)
      stopWatching = null
    }
  }

  const activate = (item: NavigationItem, by: "pointer" | "focus"): void => {
    active = item
    source = by
    send(item)
    watch()
    options.onChange?.(item)
  }
  const deactivate = (item: NavigationItem, by: "pointer" | "focus"): void => {
    if (active !== item || source !== by) return
    active = null
    source = null
    sent = null
    stopWatching?.()
    controller.clear()
    options.onChange?.(null)
  }

  for (const item of list) {
    const el = item.element
    const listen = <K extends keyof HTMLElementEventMap>(type: K, handler: (event: HTMLElementEventMap[K]) => void): void => {
      el.addEventListener(type, handler as EventListener, { passive: true })
      removers.push(() => el.removeEventListener(type, handler as EventListener))
    }
    listen("pointerenter", (e) => {
      if (e.pointerType !== "touch") activate(item, "pointer")
    })
    listen("pointerleave", (e) => {
      if (e.pointerType !== "touch") deactivate(item, "pointer")
    })
    listen("focusin", (e) => {
      if (isKeyboardFocus(e)) activate(item, "focus")
    })
    listen("focusout", (e) => {
      const next = e.relatedTarget
      // Focus moving inside the item, or to another observed item, is a hand-over, not a release.
      if (next !== null && next !== undefined && list.some((other) => contains(other.element, next))) return
      deactivate(item, "focus")
    })
  }

  return () => {
    for (const remove of removers) remove()
    removers.length = 0
    stopWatching?.()
    if (active !== null) controller.clear()
    active = null
    source = null
    sent = null
  }
}

// --- The P19 form -------------------------------------------------------------------------------------

export interface TargetObserverOptions {
  /** Reads where an element's centre is, in client coordinates. Defaults to its bounding box. */
  readonly centerOf?: (element: Element) => TargetPoint
  /** Called with the element that became (or stopped being) the target, for a page's own display. */
  readonly onChange?: (element: Element | null) => void
  readonly layout?: LayoutSource
}

/**
 * The P19 interface, kept for the specimen and for pages that drive the controller by position alone:
 * elements without navigation IDs, a controller with `setTarget` and `release`. It is `observeNavigation`
 * with each element's `data-nucleus-target` (or its index) as the ID.
 */
export function observeTargets(
  controller: Pick<NucleusController, "setTarget" | "release">,
  elements: Iterable<Element>,
  options: TargetObserverOptions = {},
): () => void {
  const centerOf = options.centerOf ?? centerOfBox
  const items: NavigationItem[] = Array.from(elements).map((element, i) => ({
    id: element.getAttribute?.("data-nucleus-target") ?? String(i),
    element,
  }))
  return observeNavigation(
    { activate: (t) => controller.setTarget(t.position), clear: () => controller.release() },
    items,
    {
      sample: (item) => centerOf(item.element),
      onChange: (item) => options.onChange?.(item?.element ?? null),
      ...(options.layout === undefined ? {} : { layout: options.layout }),
    },
  )
}
