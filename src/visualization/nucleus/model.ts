/**
 * The nucleus's geometry (P19, D-130): an organic envelope and twelve chromatin polymers, one per
 * chromosome territory, generated from a seed and `config.ts` alone. Pure and deterministic, with
 * no Three.js (NUC-001).
 *
 * What it depicts, and does not. Each polymer is a confined, persistent random walk inside its own
 * territory, so it loops and folds on itself and stays in its own region; territories are spread
 * through the nucleus with a minimum spacing, and chromatin near the envelope is more compact, as
 * peripheral heterochromatin is. That is the recognisable shape of interphase organisation. It is
 * an artistic model: no part is measured from a cell, simulated with physics, or calibrated, and
 * the territories are not the 46 human chromosomes (D-130).
 */
import {
  AXES,
  COMPACT_TONE,
  CONFINEMENT_REST,
  DEFORMATION,
  ENVELOPE_IRREGULARITY,
  HIGHLIGHT,
  HIGHLIGHT_COLOR,
  POINTS_PER_STRAND,
  RADIUS_COMPACT,
  RADIUS_HIGHLIGHT,
  RADIUS_OPEN,
  SEED,
  TERRITORIES,
  TERRITORY_COLORS,
} from "./config.ts"
import { unrotate } from "./view.ts"
import type { HighlightRegion, NucleusModel, Rgb, Strand, Vec3 } from "./types.ts"

/** A small, fast, seedable generator (mulberry32). Same seed, same sequence, every platform. */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

function unitVector(random: () => number): Vec3 {
  const z = random() * 2 - 1
  const a = random() * Math.PI * 2
  const r = Math.sqrt(1 - z * z)
  return [r * Math.cos(a), r * Math.sin(a), z]
}

/** The ellipsoid's own measure of a point: 1 on its surface, 0 at its centre. */
export function ellipsoidNorm(x: number, y: number, z: number): number {
  return Math.sqrt((x / AXES[0]) ** 2 + (y / AXES[1]) ** 2 + (z / AXES[2]) ** 2)
}

/**
 * The envelope's irregularity: a few low-frequency waves over the direction, so the outline is
 * organic rather than a perfect ellipsoid. Returns a scale near 1. Phases come from the seed.
 */
export function envelopeScale(seed: number, dx: number, dy: number, dz: number): number {
  const random = createRandom(seed ^ 0x9e3779b9)
  let sum = 0
  for (let k = 1; k <= 4; k++) {
    const [ux, uy, uz] = unitVector(random)
    const phase = random() * Math.PI * 2
    sum += Math.sin((ux * dx + uy * dy + uz * dz) * (1.3 + k * 0.9) + phase) / (k * 0.8 + 0.4)
  }
  return 1 + ENVELOPE_IRREGULARITY * (sum / 2.2)
}

/** Territory centres: the highlighted one fixed in view, the others spread with a minimum spacing. */
function territoryCenters(random: () => number): Vec3[] {
  const centers: Vec3[] = [unrotate(HIGHLIGHT.territoryCenter)]
  let spacing = 0.5
  for (let attempts = 0; centers.length < TERRITORIES; attempts++) {
    if (attempts > 400) {
      spacing *= 0.92
      attempts = 0
    }
    const [ux, uy, uz] = unitVector(random)
    const r = Math.cbrt(random()) * 0.74
    const c: Vec3 = [ux * AXES[0] * r, uy * AXES[1] * r, uz * AXES[2] * r]
    if (centers.every((o) => Math.hypot(o[0] - c[0], o[1] - c[1], o[2] - c[2]) >= spacing)) centers.push(c)
  }
  return centers
}

interface Walk {
  readonly points: Float32Array
}

/** A confined, persistent random walk: loops and folds that stay inside the territory. */
function walk(random: () => number, center: Vec3, radius: number, regionStart: number, regionEnd: number): Walk {
  const n = POINTS_PER_STRAND
  const points = new Float32Array(n * 3)
  const start = unitVector(random)
  let x = center[0] + start[0] * radius * 0.6
  let y = center[1] + start[1] * radius * 0.6
  let z = center[2] + start[2] * radius * 0.6
  let [dx, dy, dz] = unitVector(random)
  for (let i = 0; i < n; i++) {
    const inRegion = i >= regionStart && i <= regionEnd
    const persistence = inRegion ? 0.64 : 0.72
    const [rx, ry, rz] = unitVector(random)
    dx = persistence * dx + (1 - persistence) * rx * 1.6
    dy = persistence * dy + (1 - persistence) * ry * 1.6
    dz = persistence * dz + (1 - persistence) * rz * 1.6
    // Steer gently back from the territory's edge before the hard limit below is needed.
    const edge = Math.hypot(x - center[0], y - center[1], z - center[2]) / radius
    if (edge > 0.7) {
      const pull = (edge - 0.7) * 2.2
      dx -= ((x - center[0]) / (edge * radius)) * pull
      dy -= ((y - center[1]) / (edge * radius)) * pull
      dz -= ((z - center[2]) / (edge * radius)) * pull
    }
    const len = Math.hypot(dx, dy, dz) || 1
    dx /= len
    dy /= len
    dz /= len
    const stepLength = inRegion ? 0.05 : 0.05
    x += dx * stepLength
    y += dy * stepLength
    z += dz * stepLength
    // Stay in the territory: reflect the heading and pull the point back inside.
    const ox = x - center[0]
    const oy = y - center[1]
    const oz = z - center[2]
    const r = Math.hypot(ox, oy, oz) / radius
    if (r > 1) {
      const nx = ox / (r * radius)
      const ny = oy / (r * radius)
      const nz = oz / (r * radius)
      const d = dx * nx + dy * ny + dz * nz
      if (d > 0) {
        dx -= 2 * d * nx
        dy -= 2 * d * ny
        dz -= 2 * d * nz
      }
      x = center[0] + nx * radius * 0.985
      y = center[1] + ny * radius * 0.985
      z = center[2] + nz * radius * 0.985
    }
    // Stay inside the nucleus, with a margin for the tube and the envelope's irregularity.
    const nuc = ellipsoidNorm(x, y, z)
    if (nuc > CONFINEMENT_REST) {
      const f = CONFINEMENT_REST / nuc
      x *= f
      y *= f
      z *= f
    }
    points[i * 3] = x
    points[i * 3 + 1] = y
    points[i * 3 + 2] = z
  }
  // Three light smoothing passes remove sharp kinks while keeping the loops (ends stay put).
  const copy = new Float32Array(points)
  for (let pass = 0; pass < 3; pass++) {
    copy.set(points)
    for (let i = 1; i < n - 1; i++)
      for (let c = 0; c < 3; c++)
        points[i * 3 + c] = (copy[(i - 1) * 3 + c]! + 2 * copy[i * 3 + c]! + copy[(i + 1) * 3 + c]!) / 4
  }
  return { points }
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

/** Compaction along a polymer: slow variation along the chain, plus more near the envelope. */
function compactionAt(index: number, x: number, y: number, z: number, phaseA: number, phaseB: number): number {
  const slow = 0.5 + 0.5 * Math.sin(index * 0.17 + phaseA) * Math.cos(index * 0.071 + phaseB)
  const peripheral = smoothstep(0.55, 0.9, ellipsoidNorm(x, y, z))
  return Math.min(1, Math.max(0, 0.55 * slow + 0.55 * peripheral))
}

export function buildModel(seed: number = SEED): NucleusModel {
  const random = createRandom(seed)
  const centers = territoryCenters(random)
  const n = POINTS_PER_STRAND
  const regionStart = Math.floor(HIGHLIGHT.start * n)
  const regionEnd = regionStart + Math.floor(HIGHLIGHT.length * n) - 1
  const strands: Strand[] = []

  for (let t = 0; t < centers.length; t++) {
    const highlighted = t === 0
    const radius = highlighted ? HIGHLIGHT.territoryRadius : 0.29 + random() * 0.07
    const { points } = walk(random, centers[t]!, radius, highlighted ? regionStart : -1, highlighted ? regionEnd : -2)
    const tint = TERRITORY_COLORS[t % TERRITORY_COLORS.length]!
    const phaseA = random() * Math.PI * 2
    const phaseB = random() * Math.PI * 2
    const compaction = new Float32Array(n)
    const colors = new Float32Array(n * 3)
    const radii = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const c = compactionAt(i, points[i * 3]!, points[i * 3 + 1]!, points[i * 3 + 2]!, phaseA, phaseB)
      compaction[i] = c
      let color = mix(tint, COMPACT_TONE, 0.55 * c)
      let r = lerp(RADIUS_OPEN, RADIUS_COMPACT, c)
      if (highlighted) {
        // Yellow inside the region, fading into the strand's own tone over `blend` points at each end.
        const into = smoothstep(regionStart - HIGHLIGHT.blend, regionStart, i)
        const out = 1 - smoothstep(regionEnd, regionEnd + HIGHLIGHT.blend, i)
        const y = Math.min(into, out)
        color = mix(color, HIGHLIGHT_COLOR, y)
        r = lerp(r, RADIUS_HIGHLIGHT, y)
      }
      colors.set(color, i * 3)
      radii[i] = r
    }
    strands.push({ id: `territory-${String(t).padStart(2, "0")}`, points, compaction, colors, radii })
  }

  return { seed, axes: AXES, strands, highlight: buildHighlight(strands[0]!, regionStart, regionEnd) }
}

/** The region's opened shape and centre. */
function buildHighlight(strand: Strand, start: number, end: number): HighlightRegion {
  const n = strand.points.length / 3
  const half = (DEFORMATION.averageWindow - 1) / 2
  const opened = new Float32Array((end - start + 1) * 3)
  let cx = 0
  let cy = 0
  let cz = 0
  for (let i = start; i <= end; i++) {
    const avg = [0, 0, 0]
    let count = 0
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++, count++)
      for (let c = 0; c < 3; c++) avg[c]! += strand.points[j * 3 + c]!
    for (let c = 0; c < 3; c++) {
      const p = strand.points[i * 3 + c]!
      opened[(i - start) * 3 + c] = p + DEFORMATION.openFactor * (p - avg[c]! / count)
    }
    cx += strand.points[i * 3]!
    cy += strand.points[i * 3 + 1]!
    cz += strand.points[i * 3 + 2]!
  }
  const m = end - start + 1
  return { strandId: strand.id, start, end, opened, center: [cx / m, cy / m, cz / m] }
}
