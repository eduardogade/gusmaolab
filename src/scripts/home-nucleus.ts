/**
 * The homepage's nucleus (P20, D-139 to D-143): the only client script that loads the 3D nucleus, and
 * itself small. It runs on Home only (NucleusStage.astro) and does four things:
 *
 *   1. Waits until the stage is near the screen, then loads the graphics code (a dynamic import: no
 *      other page, and no visitor who never scrolls there, downloads Three.js).
 *   2. Mounts the shared nucleus (src/visualization/nucleus/) in the stage's frame, which the static
 *      picture already fills. It starts interactive, or still on touch devices and under reduced motion.
 *   3. Lets the real folder tabs drive it: pointer and keyboard focus on a top-level tab become
 *      `activate({ navigationId, position })`; leaving becomes `clear()`. It listens passively and
 *      never touches a link, a click or the previews.
 *   4. Lets go of it cleanly: the response clears when the page is left, and the renderer is disposed
 *      unless the page may come back from the history cache (then it is kept, and redraws on pageshow).
 *
 * A response is shown only while the stage is on screen: a tab hovered while the nucleus is out of
 * view moves nothing, and costs nothing. Nothing here may stop the rest of the page: every failure
 * leaves the still picture, and the other scripts never depend on this one.
 */
import { navigationItems, sampleTab } from "../home/nucleus-navigation.ts"
import type { NucleusController } from "../visualization/nucleus/index.ts"

const stage = document.querySelector<HTMLElement>("[data-nucleus-stage]")
const frame = stage?.querySelector<HTMLElement>("[data-nucleus-frame]") ?? null
const status = stage?.querySelector<HTMLElement>("[data-stage-status]") ?? null

const CAPTION: Record<string, string> = {
  picture: "Still picture of the model",
  loading: "Loading the model",
  ready: "Interactive: the folder tabs move it",
  static: "Still model",
  fallback: "Still picture of the model (3D is not available here)",
}

if (stage !== null && frame !== null) {
  const root = stage
  const host = frame
  /** Load when the stage is within this distance of the viewport. */
  const NEAR = "300px"

  let controller: NucleusController | null = null
  let stopObserving: (() => void) | null = null
  let started = false
  let inView = typeof IntersectionObserver === "undefined"

  const show = (state: string, target?: string | null): void => {
    root.dataset.stageState = state
    if (status !== null && CAPTION[state] !== undefined && status.textContent !== CAPTION[state]) status.textContent = CAPTION[state]
    if (target !== undefined) {
      if (target === null) delete root.dataset.stageTarget
      else root.dataset.stageTarget = target
    }
  }

  const start = async (): Promise<void> => {
    if (started) return
    started = true
    show("loading")
    try {
      performance.mark("nucleus:load")
      const nucleus = await import("../visualization/nucleus/index.ts")
      const mounted = await nucleus.mountNucleus(host, { onStatus: (s) => show(s === "disposed" ? "picture" : s) })
      controller = mounted
      performance.mark("nucleus:mounted")
      if (mounted.status === "fallback") return
      // The gate: a response only while the stage is on screen, and only while the mode allows one.
      // On a touch device a keyboard focus lifts the stillness (allowKeyboard); reduced motion never.
      const gated = {
        activate: (target: Parameters<NucleusController["activate"]>[0]): void => {
          if (!inView) return
          if (mounted.mode === "static") mounted.allowKeyboard()
          mounted.activate(target)
        },
        clear: (): void => mounted.clear(),
      }
      stopObserving = nucleus.observeNavigation(gated, navigationItems(), {
        sample: sampleTab,
        layout: nucleus.browserLayout(),
        onChange: (item) => show(root.dataset.stageState ?? "ready", item?.id ?? null),
      })
    } catch {
      show("fallback", null)
    }
  }

  // Gate on the stage being visible; load when it is near.
  if (typeof IntersectionObserver === "function") {
    new IntersectionObserver((entries) => {
      for (const entry of entries) inView = entry.isIntersecting
    }).observe(root)
    const near = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      near.disconnect()
      void start()
    }, { rootMargin: NEAR })
    near.observe(root)
  } else {
    (window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200)))(() => void start())
  }

  addEventListener("pagehide", (event) => {
    controller?.clear()
    if (event.persisted) return
    stopObserving?.()
    stopObserving = null
    controller?.dispose()
    controller = null
  })
}

export {}
