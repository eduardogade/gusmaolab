/**
 * The nucleus's public interface (P19, D-133; P20, D-137): `mountNucleus` and the observers,
 * everything a page needs, typed. The specimen at /_design/nucleus/ and the homepage both use exactly
 * this. Mounting loads Three.js on demand, so a page that never calls it never carries the engine.
 *
 *   const nucleus = await mountNucleus(frame)                     // frame: the element the canvas fills
 *   const stop = observeNavigation(nucleus, items)                // pointer and focus on real tabs
 *   nucleus.activate({ navigationId, position, chromatinDomainId? }) / nucleus.clear()   // or directly
 *   stop(); nucleus.dispose()                                     // when the page lets go of it
 *
 * It starts in one of two modes (D-134). Interactive on a device with a hover-capable pointer and
 * no request for reduced motion; static, a still image of the resting nucleus that never animates,
 * on touch-oriented devices and under `prefers-reduced-motion: reduce`. If WebGL cannot be created
 * the status is "fallback" and the page keeps its static picture (fallback.ts).
 */
import { RENDER } from "./config.ts"
import type { DetailLevel } from "./config.ts"
import { createLifecycle, defaultEnvironment } from "./lifecycle.ts"
export { browserLayout } from "./lifecycle.ts"
import type { Environment, Lifecycle } from "./lifecycle.ts"
import { buildModel } from "./model.ts"
import type { Surface, SurfaceOptions } from "./renderer.ts"
import type { NucleusController, NucleusMode, NucleusStatus } from "./types.ts"

export { observeNavigation, observeTargets } from "./interaction.ts"
export type { LayoutSource, NavigationItem, NavigationObserverOptions } from "./interaction.ts"
export { DEFAULT_DOMAIN_ID, NAVIGATION_DOMAINS, domainsOf, resolveDomain } from "./domains.ts"
export type { ChromatinDomain, DomainResolution, ResolvedDomain } from "./domains.ts"
export type { NucleusController, NucleusDiagnostics, NucleusMode, NucleusNavigationTarget, NucleusStatus, TargetPoint } from "./types.ts"

export interface MountOptions {
  /** Force a mode (the specimen's "preview the static nucleus"). Default: decided by the device. */
  readonly mode?: NucleusMode
  /** Tube detail. Default: light on touch-oriented devices, full otherwise. */
  readonly detail?: DetailLevel
  /** Stand-ins for tests. */
  readonly environment?: Environment
  readonly createSurface?: (options: SurfaceOptions) => Promise<Surface> | Surface
  /** Told whenever the status changes (the host is marked too). The homepage keeps its own caption in step. */
  readonly onStatus?: (status: NucleusStatus, reason: string) => void
}

const MOUNTED = new WeakMap<Element, Lifecycle>()

const query = (q: string): MediaQueryList | null => (typeof matchMedia === "function" ? matchMedia(q) : null)

const reducedMotion = (): boolean => query("(prefers-reduced-motion: reduce)")?.matches ?? false

/**
 * How the device decides the mode. Reduced motion always wins. A touch-oriented device (no hover, or a
 * coarse primary pointer: never the viewport's width) gets the still nucleus, except that keyboard
 * focus is allowed to move it once a keyboard has been used (P20).
 */
function deviceMode(keyboard = false): { mode: NucleusMode; reason: string; touch: boolean } {
  const touch = query("(hover: none), (pointer: coarse)")?.matches ?? false
  if (reducedMotion()) return { mode: "static", reason: "Reduced motion is requested: a still nucleus.", touch }
  if (touch && keyboard) return { mode: "interactive", reason: "A touch device with a keyboard in use: focus moves it.", touch }
  if (touch) return { mode: "static", reason: "A touch device: a still nucleus.", touch }
  return { mode: "interactive", reason: "Pointer and keyboard.", touch }
}

function mark(host: HTMLElement, status: NucleusStatus, reason: string): void {
  host.dataset.nucleusState = status
  host.dataset.nucleusReason = reason
}

/** Mount a nucleus in `host`. Mounting where one already is replaces it: never two canvases. */
export async function mountNucleus(host: HTMLElement, options: MountOptions = {}): Promise<NucleusController> {
  MOUNTED.get(host)?.dispose()
  host.querySelectorAll("canvas[data-nucleus-canvas]").forEach((c) => c.remove())
  mark(host, "loading", "Loading the model.")
  options.onStatus?.("loading", "Loading the model.")

  const device = deviceMode()
  const forced = options.mode !== undefined
  let mode = options.mode ?? device.mode
  let reason = forced ? `Mode set to ${mode}.` : device.reason
  const environment = options.environment ?? defaultEnvironment()
  const detail: DetailLevel = options.detail ?? (device.touch ? "light" : "full")

  let surface: Surface
  try {
    const create = options.createSurface ?? (await import("./renderer.ts")).createSurface
    surface = await create({ detail })
  } catch (error) {
    mark(host, "fallback", "3D graphics are not available here.")
    options.onStatus?.("fallback", "3D graphics are not available here.")
    return failed(error instanceof Error ? error.message : "3D graphics are not available here.")
  }

  surface.canvas.setAttribute("data-nucleus-canvas", "")
  surface.canvas.setAttribute("aria-hidden", "true")
  host.append(surface.canvas)

  const lifecycle = createLifecycle({
    surface,
    model: buildModel(),
    host,
    mode,
    modeReason: reason,
    pixelRatioCap: device.touch ? RENDER.maxPixelRatioTouch : RENDER.maxPixelRatio,
    environment,
    reducedMotion,
    onStatus: (status, why) => {
      mark(host, status, why)
      options.onStatus?.(status, why)
    },
  })
  MOUNTED.set(host, lifecycle)

  let keyboard = false
  lifecycle.allowKeyboard = () => {
    if (keyboard || forced) return
    keyboard = true
    const next = deviceMode(true)
    if (next.mode !== lifecycle.mode) lifecycle.setMode(next.mode, next.reason)
  }

  // Reduced motion can change while the page is open; follow it, unless the mode was forced.
  if (!forced) {
    const reduced = query("(prefers-reduced-motion: reduce)")
    const onChange = (): void => {
      const next = deviceMode(keyboard)
      mode = next.mode
      reason = next.reason
      lifecycle.setMode(next.mode, next.reason)
    }
    reduced?.addEventListener("change", onChange)
    const dispose = lifecycle.dispose
    lifecycle.dispose = () => {
      reduced?.removeEventListener("change", onChange)
      MOUNTED.delete(host)
      dispose()
    }
  } else {
    const dispose = lifecycle.dispose
    lifecycle.dispose = () => {
      MOUNTED.delete(host)
      dispose()
    }
  }
  return lifecycle
}

/** A controller for a nucleus that could not start: every call is harmless. */
function failed(why: string): NucleusController {
  const diagnostics = {
    activeNavigationId: null,
    activeDomainId: null,
    resolution: null,
    target: null,
    domains: [],
    reducedMotion: reducedMotion(),
    status: "fallback" as const,
    mode: "static" as const,
    reason: why,
    phase: "resting" as const,
    activation: 0,
    framesDrawn: 0,
    loopRunning: false,
    lastFrameMs: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    pixelRatio: 0,
    triangles: 0,
    geometries: 0,
    materials: 0,
    drawCalls: 0,
  }
  return {
    status: "fallback",
    mode: "static",
    activate() {},
    clear() {},
    setTarget() {},
    release() {},
    allowKeyboard() {},
    refresh() {},
    diagnostics: () => diagnostics,
    dispose() {},
  }
}
