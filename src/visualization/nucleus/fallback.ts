/**
 * The still picture of the nucleus (P19, D-135): the same model, projected flat and written as
 * SVG paths, so it needs no JavaScript and no WebGL. It is what a visitor sees until the 3D nucleus
 * is ready, and for good if 3D is unavailable or fails. It is derived from the very geometry the
 * renderer uses, in the same view, not drawn by hand and not a different illustration; it is
 * flatter (no lighting, no translucency) and is marked as a provisional capture until the owner
 * approves a final one.
 */
import { CAMERA, ENVELOPE_RIM, HIGHLIGHT_COLOR } from "./config.ts"
import { buildModel } from "./model.ts"
import { project, rotate } from "./view.ts"
import type { NucleusModel, Rgb, Strand, Vec3 } from "./types.ts"

export interface FallbackPath {
  readonly d: string
  readonly stroke: string
  readonly width: number
  readonly opacity: number
}

export interface FallbackPicture {
  readonly viewBox: string
  readonly width: number
  readonly height: number
  /** The envelope's outline and its fill. */
  readonly envelope: string
  readonly paths: readonly FallbackPath[]
}

const hex = (c: Rgb): string => "#" + c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("")
const fixed = (v: number): string => (Math.round(v * 10) / 10).toString()

/** The convex hull of 2D points (monotone chain): the envelope's silhouette. */
function hull(points: Array<readonly [number, number]>): Array<readonly [number, number]> {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: readonly [number, number], a: readonly [number, number], b: readonly [number, number]): number =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Array<readonly [number, number]> = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop()
    lower.push(q)
  }
  const upper: Array<readonly [number, number]> = []
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop()
    upper.push(q)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

export function buildFallback(model: NucleusModel = buildModel(), size = 400): FallbackPicture {
  // One reference aspect (4:3): the picture is scaled by its own viewBox, whatever frame holds it.
  const aspect = 4 / 3
  const height = size
  const width = Math.round(size * aspect)
  const scale = height / 2
  const toPage = (v: Vec3): [number, number, number] => {
    const r = rotate(v)
    const [x, y] = project(r, aspect)
    return [width / 2 + x * scale, height / 2 - y * scale, r[2]]
  }
  const pxPerUnit = scale / (Math.tan((CAMERA.fov * Math.PI) / 360) * 4.2)

  // The envelope: silhouette of its sampled surface.
  const rim: Array<readonly [number, number]> = []
  for (let i = 0; i < 24; i++)
    for (let j = 0; j < 48; j++) {
      const a = (i / 23) * Math.PI
      const b = (j / 48) * Math.PI * 2
      const dir: Vec3 = [Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)]
      const p = toPage([dir[0] * model.axes[0], dir[1] * model.axes[1], dir[2] * model.axes[2]])
      rim.push([p[0], p[1]])
    }
  const outline = hull(rim)
  const envelope = "M" + outline.map((p) => `${fixed(p[0])} ${fixed(p[1])}`).join("L") + "Z"

  const draw = (strand: Strand, from: number, to: number, color: Rgb, widthScale: number): { path: FallbackPath; depth: number } => {
    const pts: Array<[number, number, number]> = []
    for (let i = from; i <= to; i++) pts.push(toPage([strand.points[i * 3]!, strand.points[i * 3 + 1]!, strand.points[i * 3 + 2]!]))
    const depth = pts.reduce((s, p) => s + p[2], 0) / pts.length
    // A smooth curve: each control point steers a quadratic piece between the midpoints around it.
    const mid = (a: number[], b: number[]): string => `${fixed((a[0]! + b[0]!) / 2)} ${fixed((a[1]! + b[1]!) / 2)}`
    let d = `M${mid(pts[0]!, pts[1]!)}`
    for (let i = 1; i < pts.length - 1; i++) d += `Q${fixed(pts[i]![0])} ${fixed(pts[i]![1])} ${mid(pts[i]!, pts[i + 1]!)}`
    const radius = strand.radii[Math.floor((from + to) / 2)]!
    return {
      path: {
        d,
        stroke: hex(color),
        width: Math.max(1, Math.round(radius * 2 * pxPerUnit * 10) / 10 * widthScale),
        opacity: Math.round((0.62 + 0.38 * Math.min(1, Math.max(0, (depth + 0.8) / 1.6))) * 100) / 100,
      },
      depth,
    }
  }

  const layers: Array<{ path: FallbackPath; depth: number }> = []
  const last = (model.strands[0]!.points.length / 3) - 1
  for (const strand of model.strands) {
    const id = strand.id
    const mean: Rgb = [0, 1, 2].map((c) => {
      let s = 0
      const n = strand.colors.length / 3
      for (let i = 0; i < n; i++) s += strand.colors[i * 3 + c]!
      return s / n
    }) as unknown as Rgb
    layers.push(draw(strand, 0, last, mean, 1))
    if (id === model.highlight.strandId) layers.push(draw(strand, model.highlight.start, model.highlight.end, HIGHLIGHT_COLOR, 1.15))
  }
  // Far strands first; the highlighted region is drawn after its own strand, with the same depth.
  layers.sort((a, b) => a.depth - b.depth)
  void ENVELOPE_RIM
  return { viewBox: `0 0 ${width} ${height}`, width, height, envelope, paths: layers.map((l) => l.path) }
}
