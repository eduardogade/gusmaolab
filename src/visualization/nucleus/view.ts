/**
 * The nucleus's view: how model space is turned for display, how a point is projected, and how a
 * target position on the page becomes a direction for the chromatin (P19, D-132). Pure maths, shared
 * by the renderer, the static fallback and the tests, so all three agree on where things are.
 *
 * Screen quantities are in "half-frame" units: the frame's centre is (0, 0) and its half-height is 1,
 * x to the right, y up. The same unit on both axes, so a direction is not squashed by the frame's
 * shape.
 */
import { CAMERA, DEFORMATION, DISPLAY_ROTATION } from "./config.ts"
import type { TargetPoint, Vec3 } from "./types.ts"

const COS_X = Math.cos(DISPLAY_ROTATION.x)
const SIN_X = Math.sin(DISPLAY_ROTATION.x)
const COS_Y = Math.cos(DISPLAY_ROTATION.y)
const SIN_Y = Math.sin(DISPLAY_ROTATION.y)

/** Model space to view space: turn about y, then about x. */
export function rotate(v: Vec3): Vec3 {
  const x1 = COS_Y * v[0] + SIN_Y * v[2]
  const z1 = -SIN_Y * v[0] + COS_Y * v[2]
  return [x1, COS_X * v[1] - SIN_X * z1, SIN_X * v[1] + COS_X * z1]
}

/** View space to model space: the exact inverse of `rotate`. */
export function unrotate(v: Vec3): Vec3 {
  const y1 = COS_X * v[1] + SIN_X * v[2]
  const z1 = -SIN_X * v[1] + COS_X * v[2]
  return [COS_Y * v[0] - SIN_Y * z1, y1, SIN_Y * v[0] + COS_Y * z1]
}

const TAN_HALF_FOV = Math.tan((CAMERA.fov * Math.PI) / 360)

/** Distance from the camera to the nucleus's centre so the bounding sphere fits a frame of this aspect. */
export function cameraDistance(aspect: number): number {
  const horizontal = 2 * Math.atan(TAN_HALF_FOV * aspect)
  const fit = Math.min((CAMERA.fov * Math.PI) / 180, horizontal)
  return CAMERA.boundingRadius / Math.sin(fit / 2)
}

/** A point of view space (the camera looks along -z from +z) to half-frame units. */
export function project(v: Vec3, aspect: number): readonly [number, number] {
  const depth = cameraDistance(aspect) - v[2]
  return [v[0] / depth / TAN_HALF_FOV, v[1] / depth / TAN_HALF_FOV]
}

/** A page position inside a frame, in half-frame units. `rect` is the frame's bounding box. */
export function clientToFrame(
  point: TargetPoint,
  rect: { left: number; top: number; width: number; height: number },
): readonly [number, number] {
  const half = rect.height / 2
  return [(point.x - (rect.left + rect.width / 2)) / half, -(point.y - (rect.top + rect.height / 2)) / half]
}

/**
 * A viewport position as a bounded target in the frame's own units (P20): `clientToFrame`, with its
 * distance from the frame's centre limited to `DEFORMATION.targetLimit` half-frames. The limit scales
 * the vector, so the direction to a far tab stays the true one (a tab far up and a little to the left
 * stays up and a little to the left); it depends only on where the frame is now (measured fresh each
 * time, never on a stale page coordinate); a non-finite position gives the centre, which asks for
 * nothing.
 */
export function localTarget(
  point: TargetPoint,
  rect: { left: number; top: number; width: number; height: number },
): readonly [number, number] {
  const [x, y] = clientToFrame(point, rect)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [0, 0]
  const limit = DEFORMATION.targetLimit
  const distance = Math.hypot(x, y)
  if (distance <= limit) return [x, y]
  const scale = limit / distance
  return [x * scale, y * scale]
}

/**
 * The response to a target: a direction in view space (right, up) and a reach from 0 to 1. The
 * direction runs from where the highlighted region appears to where the target is; the reach grows
 * with the distance and saturates, so a faraway target asks for no more than a nearby one.
 */
export function targetResponse(
  target: readonly [number, number],
  region: readonly [number, number],
): readonly [number, number] {
  const dx = target[0] - region[0]
  const dy = target[1] - region[1]
  const distance = Math.hypot(dx, dy)
  if (distance < 1e-9) return [0, 0]
  const reach = Math.tanh(distance / DEFORMATION.reachScale)
  return [(dx / distance) * reach, (dy / distance) * reach]
}
