/**
 * The deformation of the highlighted chromatin (P19, D-132): a continuous state, a critically
 * damped response, and the displacement it applies to the control points of one region. Pure maths,
 * no Three.js and no allocation per frame, so it is tested in Node.js and cheap in the browser.
 *
 * One state for the life of a nucleus. Pointing at a target, pointing at another, and letting go
 * only move what the state is heading for; the state itself is never reset, so the shape always
 * moves on from where it is (NUC-014).
 */
import { AXES, CONFINEMENT_LIMIT, DEFORMATION, ENVELOPE_IRREGULARITY } from "./config.ts"
import { unrotate } from "./view.ts"
import type { DeformationState, HighlightRegion, NucleusModel, NucleusPhase } from "./types.ts"

export function createState(): DeformationState {
  return { s: 0, vx: 0, vy: 0, ds: 0, dvx: 0, dvy: 0, targetS: 0, targetVx: 0, targetVy: 0 }
}

/** Head for a response (a direction and reach in view space). */
export function respondTo(state: DeformationState, vx: number, vy: number): void {
  state.targetS = 1
  state.targetVx = vx
  state.targetVy = vy
}

/** Head back to rest. The direction is kept, so the region withdraws the way it came. */
export function releaseState(state: DeformationState): void {
  state.targetS = 0
}

/**
 * One critically damped step, exact for any dt (no overshoot, no instability). For
 * x'' = -2w x' - w^2 (x - target): with e = x - target and v = x', after dt
 * e' = (e + (v + w e) dt) exp(-w dt) and v' = (v - w (v + w e) dt) exp(-w dt).
 */
function damp(x: number, v: number, target: number, omega: number, dt: number): readonly [number, number] {
  const e = x - target
  const decay = Math.exp(-omega * dt)
  const tmp = v + omega * e
  return [target + (e + tmp * dt) * decay, (v - omega * tmp * dt) * decay]
}

export function step(state: DeformationState, dt: number): void {
  const w = DEFORMATION.omega
  ;[state.s, state.ds] = damp(state.s, state.ds, state.targetS, w, dt)
  ;[state.vx, state.dvx] = damp(state.vx, state.dvx, state.targetVx, w, dt)
  ;[state.vy, state.dvy] = damp(state.vy, state.dvy, state.targetVy, w, dt)
}

export function isSettled(state: DeformationState): boolean {
  const near =
    Math.abs(state.s - state.targetS) < DEFORMATION.settleDistance &&
    Math.abs(state.vx - state.targetVx) < DEFORMATION.settleDistance &&
    Math.abs(state.vy - state.targetVy) < DEFORMATION.settleDistance
  const slow =
    Math.abs(state.ds) < DEFORMATION.settleSpeed &&
    Math.abs(state.dvx) < DEFORMATION.settleSpeed &&
    Math.abs(state.dvy) < DEFORMATION.settleSpeed
  return near && slow
}

/** Land exactly on the targets (the last, imperceptible step of a settling response). */
export function settle(state: DeformationState): void {
  state.s = state.targetS
  state.vx = state.targetVx
  state.vy = state.targetVy
  state.ds = state.dvx = state.dvy = 0
}

export function phaseOf(state: DeformationState): NucleusPhase {
  if (state.targetS === 1) return "responding"
  return state.s < DEFORMATION.settleDistance ? "resting" : "returning"
}

/** Sine-squared bump over the region: 0 at both ends with zero slope, 1 in the middle. */
export function weightAt(region: HighlightRegion, index: number): number {
  const t = (index - region.start) / (region.end - region.start)
  if (t <= 0 || t >= 1) return 0
  const s = Math.sin(Math.PI * t)
  return s * s
}

const LIMIT = CONFINEMENT_LIMIT * (1 - ENVELOPE_IRREGULARITY)

/**
 * Write one strand's control points, displaced by the state, into `out` (same length as the
 * strand's points; reused, never reallocated). Points outside the region are copied unchanged, and
 * the region's ends have weight zero with zero slope, so the path stays continuous and smooth.
 */
export function applyDeformation(
  model: NucleusModel,
  base: Float32Array,
  state: DeformationState,
  out: Float32Array,
): void {
  out.set(base)
  const region = model.highlight
  if (state.s === 0 && state.vx === 0 && state.vy === 0) return
  const reach = Math.hypot(state.vx, state.vy)
  const move = unrotate([state.vx * DEFORMATION.reach, state.vy * DEFORMATION.reach, reach * DEFORMATION.depth])
  const [ax, ay, az] = AXES
  for (let i = region.start; i <= region.end; i++) {
    const w = weightAt(region, i) * state.s
    if (w === 0) continue
    const k = (i - region.start) * 3
    const o = i * 3
    const unfold = DEFORMATION.unfold * w
    let x = base[o]! + unfold * (region.opened[k]! - base[o]!) + w * move[0]
    let y = base[o + 1]! + unfold * (region.opened[k + 1]! - base[o + 1]!) + w * move[1]
    let z = base[o + 2]! + unfold * (region.opened[k + 2]! - base[o + 2]!) + w * move[2]
    // Stay inside the envelope: a Lipschitz scale-back, so the clamp never makes a jump.
    const n = Math.sqrt((x / ax) ** 2 + (y / ay) ** 2 + (z / az) ** 2)
    if (n > LIMIT) {
      const f = LIMIT / n
      x *= f
      y *= f
      z *= f
    }
    out[o] = x
    out[o + 1] = y
    out[o + 2] = z
  }
}
