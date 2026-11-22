/**
 * The life of a mounted nucleus (P19, D-133): when it draws, when it stops, and how it ends. It
 * owns the render loop and every listener and timer, and knows nothing of WebGL: it is given a
 * `Surface` (renderer.ts) and an `Environment` (the browser's document, window and timers), so it
 * is tested in Node.js with stand-ins for both.
 *
 * - On demand. The first frame draws the resting nucleus; further frames are requested only while
 *   the response is moving, and the loop stops the moment it settles. A still nucleus costs the
 *   GPU nothing (NUC-021 to NUC-023).
 * - Hidden pages pause the loop and draw once when shown again; `pageshow` does the same for a
 *   page restored from the history cache.
 * - A lost WebGL context stops drawing, waits briefly for restoration, and otherwise gives way to
 *   the static fallback; a restored one draws again.
 * - `dispose` releases the surface, the observer, the listeners, the frame request and the timer,
 *   and is safe to call twice (NUC-027).
 */
import { RENDER } from "./config.ts"
import { createState, isSettled, phaseOf, releaseState, respondTo, settle, step } from "./deformation.ts"
import type { Surface } from "./renderer.ts"
import type { LayoutSource } from "./interaction.ts"
import { domainsOf, resolveDomain } from "./domains.ts"
import type { ResolvedDomain } from "./domains.ts"
import { localTarget, project, rotate, targetResponse } from "./view.ts"
import type { NucleusController, NucleusDiagnostics, NucleusMode, NucleusModel, NucleusNavigationTarget, NucleusStatus, TargetPoint } from "./types.ts"

/** The slice of the browser the lifecycle uses. `defaultEnvironment()` is the real one. */
export interface Environment {
  readonly document: EventTarget & { readonly hidden: boolean }
  readonly window: EventTarget & { readonly devicePixelRatio: number }
  now(): number
  requestFrame(callback: (time: number) => void): number
  cancelFrame(id: number): void
  setTimer(callback: () => void, ms: number): number
  clearTimer(id: number): void
  observeSize(element: Element, callback: () => void): () => void
}

export function defaultEnvironment(): Environment {
  return {
    document,
    window,
    now: () => performance.now(),
    requestFrame: (cb) => requestAnimationFrame(cb),
    cancelFrame: (id) => cancelAnimationFrame(id),
    setTimer: (cb, ms) => window.setTimeout(cb, ms),
    clearTimer: (id) => window.clearTimeout(id),
    observeSize(element, callback) {
      const observer = new ResizeObserver(callback)
      observer.observe(element)
      return () => observer.disconnect()
    },
  }
}

/** The page's own scroll and resize, as the observers' re-sampling source (interaction.ts). */
export function browserLayout(): LayoutSource {
  return {
    target: window,
    requestFrame: (cb) => requestAnimationFrame(cb),
    cancelFrame: (id) => cancelAnimationFrame(id),
  }
}

export interface LifecycleOptions {
  readonly surface: Surface
  readonly model: NucleusModel
  /** The element the canvas fills; its box is the frame targets are measured against. */
  readonly host: Element
  readonly mode: NucleusMode
  readonly modeReason: string
  readonly pixelRatioCap: number
  readonly environment: Environment
  /** Whether reduced motion is requested now, for the diagnostics. Default: no. */
  readonly reducedMotion?: () => boolean
  /** Called when the status changes (the mount marks the host). */
  readonly onStatus?: (status: NucleusStatus, reason: string) => void
}

export interface Lifecycle extends NucleusController {
  /** Switch between interactive and static (reduced motion changing, say). */
  setMode(mode: NucleusMode, reason: string): void
  /** What `allowKeyboard` does; the mount supplies it, because only it knows why the mode is static. */
  allowKeyboard(): void
}

export function createLifecycle(options: LifecycleOptions): Lifecycle {
  const { surface, model, host, environment: env } = options
  const canvas = surface.canvas
  const state = createState()
  let mode = options.mode
  let reason = options.modeReason
  let status: NucleusStatus = "loading"
  let frame: number | null = null
  let last: number | null = null
  let restoreTimer: number | null = null
  let framesDrawn = 0
  let lastFrameMs = 0
  let width = 0
  let height = 0
  let pixelRatio = 1
  let stopObserving: (() => void) | null = null
  let lost = false
  let disposed = false
  /** What holds the response now: the navigation ID, the domain that answers it and the clamped target. */
  let active: { id: string | null; resolved: ResolvedDomain; target: { x: number; y: number } } | null = null
  const domains = domainsOf(model)

  const setStatus = (next: NucleusStatus, why: string): void => {
    status = next
    reason = why
    options.onStatus?.(next, why)
  }

  const restLimit = (): number => Math.min(env.window.devicePixelRatio || 1, options.pixelRatioCap)

  /** Draw the state now, once. Nothing is drawn while hidden, lost or without a size. */
  const drawNow = (): void => {
    if (disposed || lost || width === 0 || height === 0) return
    const started = env.now()
    surface.draw(state)
    lastFrameMs = env.now() - started
    framesDrawn++
  }

  const onFrame = (time: number): void => {
    frame = null
    if (disposed || lost || env.document.hidden) {
      last = null
      return
    }
    // The first frame after a pause steps a nominal 1/60 s, not the time spent idle; no step exceeds maxStep.
    const dt = last === null ? 1 / 60 : Math.min(RENDER.maxStep, Math.max(0, (time - last) / 1000))
    last = time
    step(state, dt)
    const done = isSettled(state)
    if (done) settle(state)
    drawNow()
    if (done) last = null
    else frame = env.requestFrame(onFrame)
  }

  const schedule = (): void => {
    if (disposed || lost || mode === "static" || frame !== null || env.document.hidden) return
    if (!isSettled(state)) frame = env.requestFrame(onFrame)
  }

  const cancel = (): void => {
    if (frame !== null) env.cancelFrame(frame)
    frame = null
    last = null
  }

  /** Follow the host's size and the screen's pixel ratio; draws, and says so, only if either changed. */
  const measure = (): boolean => {
    const rect = host.getBoundingClientRect()
    const w = Math.max(0, Math.round(rect.width))
    const h = Math.max(0, Math.round(rect.height))
    const ratio = restLimit()
    if (w === width && h === height && ratio === pixelRatio) return false
    width = w
    height = h
    pixelRatio = ratio
    if (w === 0 || h === 0) return false
    surface.resize(w, h, ratio)
    drawNow()
    return true
  }
  /** Draw the current state once: after a resize if there was one, else now. */
  const redraw = (): void => {
    if (!measure()) drawNow()
  }

  const onVisibility = (): void => {
    if (env.document.hidden) {
      cancel()
      return
    }
    redraw()
    schedule()
  }
  const onPageShow = (): void => {
    redraw()
    schedule()
  }
  const onContextLost = (event: Event): void => {
    event.preventDefault()
    lost = true
    cancel()
    if (restoreTimer !== null) env.clearTimer(restoreTimer)
    restoreTimer = env.setTimer(() => {
      restoreTimer = null
      if (lost && !disposed) setStatus("fallback", "The graphics context was lost and did not come back.")
    }, RENDER.contextRestoreTimeout)
  }
  const onContextRestored = (): void => {
    lost = false
    if (restoreTimer !== null) env.clearTimer(restoreTimer)
    restoreTimer = null
    if (status === "fallback") setStatus(mode === "static" ? "static" : "ready", reason)
    // After a restore everything on the GPU is new; draw the current state once, then carry on.
    pixelRatio = 0
    redraw()
    schedule()
  }

  env.document.addEventListener("visibilitychange", onVisibility)
  env.window.addEventListener("pageshow", onPageShow)
  canvas.addEventListener("webglcontextlost", onContextLost)
  canvas.addEventListener("webglcontextrestored", onContextRestored)
  stopObserving = env.observeSize(host, measure)

  measure()
  setStatus(mode === "static" ? "static" : "ready", reason)

  const regionAt = (domain: { readonly center: readonly [number, number, number] }, aspect: number): readonly [number, number] =>
    project(rotate(domain.center), aspect)

  const respond = (id: string | null, position: TargetPoint, domainId: string | undefined): void => {
    if (disposed || mode === "static") return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const resolved = resolveDomain(domains, { navigationId: id ?? undefined, chromatinDomainId: domainId })
    const [fx, fy] = localTarget(position, rect)
    const [vx, vy] = targetResponse([fx, fy], regionAt(resolved.domain, rect.width / rect.height))
    active = { id, resolved, target: { x: fx, y: fy } }
    respondTo(state, vx, vy)
    schedule()
  }
  const rest = (): void => {
    if (disposed || mode === "static") return
    active = null
    releaseState(state)
    schedule()
  }

  const controller: Lifecycle = {
    get status() {
      return status
    },
    get mode() {
      return mode
    },
    activate(target: NucleusNavigationTarget) {
      respond(target.navigationId, target.position, target.chromatinDomainId)
    },
    clear() {
      rest()
    },
    setTarget(point: TargetPoint) {
      respond(null, point, undefined)
    },
    release() {
      rest()
    },
    allowKeyboard() {
      // Replaced by the mount; a bare lifecycle has no touch mode to lift.
    },
    refresh() {
      if (disposed) return
      pixelRatio = 0
      redraw()
      schedule()
    },
    setMode(next, why) {
      if (disposed || (next === mode && why === reason)) return
      mode = next
      if (next === "static") {
        // A still image of the resting nucleus: no animation is finished off, none is shown.
        cancel()
        active = null
        releaseState(state)
        settle(state)
        state.s = 0
        state.vx = 0
        state.vy = 0
        drawNow()
        setStatus("static", why)
      } else setStatus("ready", why)
    },
    diagnostics(): NucleusDiagnostics {
      const stats = surface.stats()
      const resting = phaseOf(state) === "resting"
      return {
        activeNavigationId: resting ? null : (active?.id ?? null),
        activeDomainId: resting || active === null ? null : active.resolved.domain.id,
        resolution: resting || active === null ? null : active.resolved.resolution,
        target: resting || active === null ? null : active.target,
        domains: domains.map((d) => d.id),
        reducedMotion: options.reducedMotion?.() ?? false,
        status,
        mode,
        reason,
        phase: phaseOf(state),
        activation: state.s,
        framesDrawn,
        loopRunning: frame !== null,
        lastFrameMs,
        canvasWidth: width,
        canvasHeight: height,
        pixelRatio,
        triangles: stats.triangles,
        geometries: stats.geometries,
        materials: stats.materials,
        drawCalls: stats.drawCalls,
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      cancel()
      if (restoreTimer !== null) env.clearTimer(restoreTimer)
      restoreTimer = null
      env.document.removeEventListener("visibilitychange", onVisibility)
      env.window.removeEventListener("pageshow", onPageShow)
      canvas.removeEventListener("webglcontextlost", onContextLost)
      canvas.removeEventListener("webglcontextrestored", onContextRestored)
      stopObserving?.()
      stopObserving = null
      surface.dispose()
      canvas.remove()
      setStatus("disposed", "Disposed.")
    },
  }
  return controller
}
