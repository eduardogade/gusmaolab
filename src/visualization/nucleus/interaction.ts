/**
 * Passive observation of targets (P19, D-133): the one way a page tells the nucleus where the
 * visitor's attention is. Given a controller and some elements (the development specimen's
 * simulated tabs now, the real folder tabs in P20), it watches pointer and focus events on them and
 * turns each into `setTarget` or `release`.
 *
 * It never interferes with the elements. Its listeners are passive, none calls `preventDefault` or
 * `stopPropagation`, it adds nothing to the element, and a click, a keypress and a scroll are
 * untouched. Touch pointers are ignored: touch devices get the static nucleus (D-134), not a
 * hover that does not exist. Disposing removes every listener it added.
 */
import type { NucleusController, TargetPoint } from "./types.ts"

export interface TargetObserverOptions {
  /** Reads where an element's centre is, in client coordinates. Defaults to its bounding box. */
  readonly centerOf?: (element: Element) => TargetPoint
  /** Called with the element that became (or stopped being) the target, for a page's own display. */
  readonly onChange?: (element: Element | null) => void
}

const centerOfBox = (element: Element): TargetPoint => {
  const r = element.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

export function observeTargets(
  controller: Pick<NucleusController, "setTarget" | "release">,
  elements: Iterable<Element>,
  options: TargetObserverOptions = {},
): () => void {
  const items = Array.from(elements)
  const centerOf = options.centerOf ?? centerOfBox
  const removers: Array<() => void> = []
  let active: Element | null = null
  const activate = (el: Element): void => {
    active = el
    controller.setTarget(centerOf(el))
    options.onChange?.(el)
  }
  const deactivate = (el: Element): void => {
    if (active !== el) return
    active = null
    controller.release()
    options.onChange?.(null)
  }
  for (const el of items) {
    const listen = <K extends keyof HTMLElementEventMap>(type: K, handler: (event: HTMLElementEventMap[K]) => void): void => {
      el.addEventListener(type, handler as EventListener, { passive: true })
      removers.push(() => el.removeEventListener(type, handler as EventListener))
    }
    listen("pointerenter", (e) => {
      if (e.pointerType !== "touch") activate(el)
    })
    listen("pointerleave", (e) => {
      if (e.pointerType !== "touch") deactivate(el)
    })
    listen("focusin", () => activate(el))
    listen("focusout", (e) => {
      // Focus moving to another observed element hands the target over; it is not a release.
      if (e.relatedTarget !== null && items.includes(e.relatedTarget as Element)) return
      deactivate(el)
    })
  }
  return () => {
    for (const remove of removers) remove()
    removers.length = 0
    if (active !== null) controller.release()
    active = null
  }
}
