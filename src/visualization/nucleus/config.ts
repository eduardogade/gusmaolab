/**
 * Every number of the nucleus that a person might want to change, in one place (P19, D-130).
 * Geometry is generated from `seed` and these values alone, so the same configuration always
 * builds the same nucleus (NUC-001). Nothing here is measured from a real cell: it is an
 * artistic model of interphase chromatin organisation (D-130).
 */
import type { Rgb, Vec3 } from "./types.ts"

export const SEED = 20260119

/** Semi-axes of the envelope's base ellipsoid. An organic, slightly flattened nucleus. */
export const AXES: Vec3 = [1.0, 0.8, 0.72]

/** Low-amplitude irregularity of the envelope (a fraction of the radius). */
export const ENVELOPE_IRREGULARITY = 0.035

/** How many chromosome territories, and the number of control points of a polymer. */
export const TERRITORIES = 12
export const POINTS_PER_STRAND = 150

/**
 * Chromatin stays inside this fraction of the envelope's radius at rest and while deformed. The
 * margin keeps the tube (radius up to ~0.02) and the envelope's irregularity apart.
 */
export const CONFINEMENT_REST = 0.9
export const CONFINEMENT_LIMIT = 0.935

/** Rotation that turns the nucleus a little toward the viewer so depth reads (radians). */
export const DISPLAY_ROTATION = { x: 0.42, y: -0.52 } as const

/** Tube radii at control points (model units): open chromatin to compact chromatin. */
export const RADIUS_OPEN = 0.0075
export const RADIUS_COMPACT = 0.0125
export const RADIUS_HIGHLIGHT = 0.0165

/** Tube sampling. `light` is for small or touch devices, `full` for the rest. */
export const DETAIL = {
  full: { samplesPerSegment: 4, radialSegments: 8 },
  light: { samplesPerSegment: 3, radialSegments: 6 },
} as const
export type DetailLevel = keyof typeof DETAIL

/** Budgets the tests hold the model to (NUC-008). */
export const BUDGET = {
  maxTriangles: 140_000,
  maxStrands: 16,
  maxControlPoints: 2_000,
  /** Draw calls: static chromatin, highlighted strand, two envelope layers. */
  maxDrawCalls: 6,
} as const

/** The palette of the object: its own, scientific, never a site token (D-131). */
export const TERRITORY_COLORS: readonly Rgb[] = [
  [0.690, 0.745, 0.910], // periwinkle
  [0.765, 0.710, 0.890], // lavender
  [0.665, 0.830, 0.810], // sage
  [0.890, 0.745, 0.790], // blush
]
/** Compact chromatin leans toward this; open chromatin toward the tint above. */
export const COMPACT_TONE: Rgb = [0.470, 0.520, 0.690]
export const HIGHLIGHT_COLOR: Rgb = [0.955, 0.770, 0.150]
export const ENVELOPE_RIM: Rgb = [0.700, 0.780, 0.880]
export const ENVELOPE_FILL: Rgb = [0.900, 0.940, 0.985]
export const FOG_COLOR: Rgb = [0.930, 0.950, 0.975]

/** The highlighted region: where it sits (in view space, before the display rotation) and its size. */
export const HIGHLIGHT = {
  /** Centre of the highlighted territory, in view space. */
  territoryCenter: [0.34, 0.24, 0.40] as Vec3,
  territoryRadius: 0.38,
  /** Fraction of the strand's control points, and where along it the region starts. */
  length: 0.5,
  start: 0.25,
  /** Control points over which the yellow fades into the strand's own tone, each end. */
  blend: 5,
} as const

/**
 * The deformation (D-132). The highlighted region opens (its own loops extend: `openFactor` builds
 * the opened shape from the rest shape) and reaches a little toward the target, both weighted by a
 * bump that is zero, with zero slope, at both anchored ends.
 */
export const DEFORMATION = {
  /** How far a point of the region moves from the local average of its neighbours when open. */
  openFactor: 1.1,
  /** Control points of the moving average that defines "local" (odd). */
  averageWindow: 9,
  /** Fraction of the way from the rest shape to the opened shape at full activation. */
  unfold: 0.85,
  /** Greatest reach toward a target, in model units. */
  reach: 0.32,
  /** A little toward the viewer so the region opens rather than slides. */
  depth: 0.08,
  /** Reach saturates with distance: tanh(distance / this), distance in half-frame units. */
  reachScale: 1.1,
  /** Natural frequency (rad/s) of the critically damped response; reaching 90% takes ~1 s and settling ~2.3 s. */
  omega: 3.8,
  /**
   * Below this distance (a fraction of the full response, about a fifth of a pixel at the largest
   * size) and speed, the response is settled and the loop stops.
   */
  settleDistance: 2e-3,
  settleSpeed: 5e-3,
} as const

export const CAMERA = {
  fov: 30,
  /** Bounding radius the camera frames (model units), with a small margin for the envelope. */
  boundingRadius: 1.0,
} as const

export const RENDER = {
  /** Largest pixel ratio drawn, whatever the screen's. Above ~2 the cost grows and the look does not. */
  maxPixelRatio: 2,
  /** On touch-oriented devices, lower. */
  maxPixelRatioTouch: 1.5,
  /** A frame cannot step the response by more than this (s): a stalled tab does not jump. */
  maxStep: 1 / 20,
  /** Time to wait for a lost WebGL context to come back before showing the fallback (ms). */
  contextRestoreTimeout: 2500,
} as const
