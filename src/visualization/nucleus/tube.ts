/**
 * Tube geometry for chromatin polymers (P19, D-131): a Catmull-Rom centreline through a strand's
 * control points, a ring of vertices around it with parallel-transported frames, and index and
 * colour buffers. Pure typed-array code, no Three.js, so the geometry is tested in Node.js.
 *
 * A `TubeBuilder` owns its buffers. `update(points)` rewrites the positions and normals in place
 * from new control points and allocates nothing, which is how the highlighted strand deforms every
 * frame without rebuilding geometry (D-132). Indices and colours never change.
 */
import type { DETAIL } from "./config.ts"
import type { Strand } from "./types.ts"

type Detail = (typeof DETAIL)[keyof typeof DETAIL]

export interface TubeBuilder {
  readonly positions: Float32Array
  readonly normals: Float32Array
  readonly colors: Float32Array
  readonly indices: Uint32Array
  readonly triangles: number
  /** Rewrite positions and normals from new control points (same count as the strand's). */
  update(points: Float32Array): void
}

const smooth = (t: number): number => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

export function createTubeBuilder(strand: Strand, detail: Detail): TubeBuilder {
  const n = strand.points.length / 3
  const segments = n - 1
  const sps = detail.samplesPerSegment
  const radial = detail.radialSegments
  const samples = segments * sps + 1
  const positions = new Float32Array(samples * radial * 3)
  const normals = new Float32Array(samples * radial * 3)
  const colors = new Float32Array(samples * radial * 3)
  const indices = new Uint32Array((samples - 1) * radial * 6)
  const centre = new Float32Array(samples * 3)
  const radius = new Float32Array(samples)

  // Radii and colours are linear between control points and never change.
  for (let k = 0; k < samples; k++) {
    const f = k / sps
    const i = Math.min(segments - 1, Math.floor(f))
    const t = f - i
    const taper = smooth(k / (1.5 * sps)) * smooth((samples - 1 - k) / (1.5 * sps))
    radius[k] = (strand.radii[i]! * (1 - t) + strand.radii[i + 1]! * t) * taper
    for (let j = 0; j < radial; j++)
      for (let c = 0; c < 3; c++)
        colors[(k * radial + j) * 3 + c] = strand.colors[i * 3 + c]! * (1 - t) + strand.colors[(i + 1) * 3 + c]! * t
  }

  // Outward-facing triangles: the winding is checked by a test against the vertex normals.
  let w = 0
  for (let k = 0; k < samples - 1; k++)
    for (let j = 0; j < radial; j++) {
      const a = k * radial + j
      const b = k * radial + ((j + 1) % radial)
      const c = (k + 1) * radial + j
      const d = (k + 1) * radial + ((j + 1) % radial)
      indices[w++] = a
      indices[w++] = b
      indices[w++] = c
      indices[w++] = b
      indices[w++] = d
      indices[w++] = c
    }

  let nx = 0
  let ny = 0
  let nz = 0
  const update = (points: Float32Array): void => {
    // Centreline: uniform Catmull-Rom, with the end tangents reflected.
    for (let i = 0; i < segments; i++) {
      for (let s = 0; s < sps; s++) {
        const t = s / sps
        const t2 = t * t
        const t3 = t2 * t
        const o = (i * sps + s) * 3
        for (let c = 0; c < 3; c++) {
          const p1 = points[i * 3 + c]!
          const p2 = points[(i + 1) * 3 + c]!
          const p0 = i > 0 ? points[(i - 1) * 3 + c]! : 2 * p1 - p2
          const p3 = i < segments - 1 ? points[(i + 2) * 3 + c]! : 2 * p2 - p1
          centre[o + c] =
            0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3)
        }
      }
    }
    for (let c = 0; c < 3; c++) centre[(samples - 1) * 3 + c] = points[(n - 1) * 3 + c]!

    // Rings, with a frame carried along the curve so the tube never twists.
    for (let k = 0; k < samples; k++) {
      const a = Math.max(0, k - 1) * 3
      const b = Math.min(samples - 1, k + 1) * 3
      let tx = centre[b]! - centre[a]!
      let ty = centre[b + 1]! - centre[a + 1]!
      let tz = centre[b + 2]! - centre[a + 2]!
      const tl = Math.hypot(tx, ty, tz) || 1
      tx /= tl
      ty /= tl
      tz /= tl
      if (k === 0) {
        // Any vector not parallel to the tangent starts the frame.
        const ax = Math.abs(tx) < 0.8 ? 1 : 0
        const ay = ax === 1 ? 0 : 1
        nx = ay * tz
        ny = -ax * tz
        nz = ax * ty - ay * tx
      }
      const d = nx * tx + ny * ty + nz * tz
      nx -= d * tx
      ny -= d * ty
      nz -= d * tz
      const nl = Math.hypot(nx, ny, nz) || 1
      nx /= nl
      ny /= nl
      nz /= nl
      const bx = ty * nz - tz * ny
      const by = tz * nx - tx * nz
      const bz = tx * ny - ty * nx
      const r = radius[k]!
      for (let j = 0; j < radial; j++) {
        const angle = (j / radial) * Math.PI * 2
        const ca = Math.cos(angle)
        const sa = Math.sin(angle)
        const ox = ca * nx + sa * bx
        const oy = ca * ny + sa * by
        const oz = ca * nz + sa * bz
        const v = (k * radial + j) * 3
        positions[v] = centre[k * 3]! + r * ox
        positions[v + 1] = centre[k * 3 + 1]! + r * oy
        positions[v + 2] = centre[k * 3 + 2]! + r * oz
        normals[v] = ox
        normals[v + 1] = oy
        normals[v + 2] = oz
      }
    }
  }
  update(strand.points)
  return { positions, normals, colors, indices, triangles: indices.length / 3, update }
}

/** Several tubes in one set of buffers, for one draw call. The result is static. */
export function mergeTubes(tubes: readonly TubeBuilder[]): Omit<TubeBuilder, "update"> {
  const vertices = tubes.reduce((s, t) => s + t.positions.length, 0)
  const positions = new Float32Array(vertices)
  const normals = new Float32Array(vertices)
  const colors = new Float32Array(vertices)
  const indices = new Uint32Array(tubes.reduce((s, t) => s + t.indices.length, 0))
  let v = 0
  let i = 0
  for (const t of tubes) {
    positions.set(t.positions, v)
    normals.set(t.normals, v)
    colors.set(t.colors, v)
    const base = v / 3
    for (let k = 0; k < t.indices.length; k++) indices[i + k] = t.indices[k]! + base
    v += t.positions.length
    i += t.indices.length
  }
  return { positions, normals, colors, indices, triangles: indices.length / 3 }
}
