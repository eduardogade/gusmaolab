/**
 * Shared types of the 3D nucleus (P19, D-130 to D-133). Pure data: nothing here imports Three.js,
 * so the model, the deformation and the lifecycle run, and are tested, in Node.js (erasable
 * TypeScript only, D-040).
 */

/** A point or vector in model space (the nucleus's own frame, before the display rotation). */
export type Vec3 = readonly [number, number, number]

/** An RGB colour in sRGB, each channel 0 to 1. */
export type Rgb = readonly [number, number, number]

/** One chromatin polymer: an ordered path of control points, drawn as a smooth tube. */
export interface Strand {
  readonly id: string
  /** `x, y, z` per control point, in model space. Never reallocated after construction. */
  readonly points: Float32Array
  /** Local compaction at each control point, 0 (open) to 1 (compact). Drives radius and tone. */
  readonly compaction: Float32Array
  /** sRGB colour at each control point (`r, g, b` triples). */
  readonly colors: Float32Array
  /** Tube radius at each control point, in model units. */
  readonly radii: Float32Array
}

/** The highlighted region: a stretch of one strand, by control-point index. */
export interface HighlightRegion {
  readonly strandId: string
  /** First and last control point of the region, inclusive. Both ends are anchored. */
  readonly start: number
  readonly end: number
  /**
   * The region's opened shape, `x, y, z` per control point from `start` to `end`: each rest point
   * pushed away from the local average of its neighbours, so its own loops extend.
   */
  readonly opened: Float32Array
  /** The region's rest-state centre, in model space. */
  readonly center: Vec3
}

export interface NucleusModel {
  readonly seed: number
  /** Semi-axes of the envelope's base ellipsoid, in model space. */
  readonly axes: Vec3
  readonly strands: readonly Strand[]
  readonly highlight: HighlightRegion
}

/** What the visitor's pointer, focus or a script asks of the chromatin. Page client coordinates. */
export interface TargetPoint {
  readonly x: number
  readonly y: number
}

/**
 * What the navigation layer tells the nucleus (P20, D-137). The navigation ID is the registry's,
 * stable and independent of the label or the tab's position; `position` is where the visitor's
 * attention is, in viewport client coordinates, sampled when the target is set. The optional
 * `chromatinDomainId` asks for a particular domain; without it the nucleus maps the navigation ID
 * itself (domains.ts). The page never sees a mesh, a vertex or a colour.
 */
export interface NucleusNavigationTarget {
  readonly navigationId: string
  readonly position: TargetPoint
  readonly chromatinDomainId?: string
}

/** The continuous state of the deformation. One instance for the life of a nucleus. */
export interface DeformationState {
  /** Activation, 0 (resting) to 1 (fully responding). */
  s: number
  /** Direction and reach of the response in view space (right, up), each about -1 to 1. */
  vx: number
  vy: number
  /** Rates of change of the three values above. */
  ds: number
  dvx: number
  dvy: number
  /** What the three values are heading for. */
  targetS: number
  targetVx: number
  targetVy: number
}

export type NucleusPhase = "resting" | "responding" | "returning"

/** How a mounted nucleus behaves. */
export type NucleusMode = "interactive" | "static"

/** What a mount reports. `static` is a deliberate still image; `fallback` means 3D was not possible. */
export type NucleusStatus = "loading" | "ready" | "static" | "fallback" | "disposed"

export interface NucleusDiagnostics {
  /** The navigation ID that holds the response, or null when resting or driven by a bare point. */
  readonly activeNavigationId: string | null
  /** The domain that is answering (see domains.ts), or null at rest. */
  readonly activeDomainId: string | null
  /** How that domain was chosen: requested, mapped, default or unknown-domain; null at rest. */
  readonly resolution: string | null
  /** The target in half-frame units after clamping, or null at rest. */
  readonly target: { readonly x: number; readonly y: number } | null
  /** The domains the model can deform: today exactly one. */
  readonly domains: readonly string[]
  /** Reduced motion is requested now. */
  readonly reducedMotion: boolean
  readonly status: NucleusStatus
  readonly mode: NucleusMode
  /** Why the mode is static or the status is fallback, in words. */
  readonly reason: string
  readonly phase: NucleusPhase
  readonly activation: number
  readonly framesDrawn: number
  readonly loopRunning: boolean
  readonly lastFrameMs: number
  readonly canvasWidth: number
  readonly canvasHeight: number
  readonly pixelRatio: number
  readonly triangles: number
  readonly geometries: number
  readonly materials: number
  readonly drawCalls: number
}

/**
 * The integration contract (P20). `mountNucleus` returns one of these. Nothing on it needs the
 * development specimen page.
 */
export interface NucleusController {
  readonly status: NucleusStatus
  readonly mode: NucleusMode
  /** Respond to a navigation target: its stable ID, its position, and optionally a domain. Ignored when static. */
  activate(target: NucleusNavigationTarget): void
  /** Let the chromatin return to rest, from wherever it is. */
  clear(): void
  /** Respond toward a bare page position (client coordinates): `activate` without a navigation ID. */
  setTarget(point: TargetPoint): void
  /** Same as `clear`. */
  release(): void
  /**
   * A keyboard is in use. On a touch device the nucleus is still (D-134); keyboard focus is the one
   * exception (P20), so this lets focus move the chromatin there too, unless reduced motion is requested.
   */
  allowKeyboard(): void
  /** Draw again (after a layout change the observers cannot see). */
  refresh(): void
  diagnostics(): NucleusDiagnostics
  /** Free the renderer, geometry, materials, listeners and timers. Safe to call twice. */
  dispose(): void
}
