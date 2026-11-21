/**
 * The Three.js side of the nucleus (P19, D-131): scene, camera, lights, one static mesh for the
 * eleven resting polymers, one dynamic mesh for the highlighted strand, and the envelope. It is the
 * only module here that touches WebGL, and it is loaded on demand (lifecycle.ts), so no page that
 * does not mount a nucleus carries Three.js.
 *
 * The highlighted strand is one mesh for the life of the object. A frame that changes the
 * deformation rewrites that mesh's positions and normals in place (tube.ts) and uploads them; no
 * geometry is created, replaced or hidden, and colours never change (D-132).
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  NoToneMapping,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
} from "three"
import { AXES, CAMERA, DETAIL, DISPLAY_ROTATION, FOG_COLOR } from "./config.ts"
import type { DetailLevel } from "./config.ts"
import { applyDeformation } from "./deformation.ts"
import { chromatinMaterial, envelopeBack, envelopeFront } from "./materials.ts"
import { buildModel, envelopeScale } from "./model.ts"
import { createTubeBuilder, mergeTubes } from "./tube.ts"
import { cameraDistance } from "./view.ts"
import type { DeformationState } from "./types.ts"

export interface SurfaceOptions {
  readonly detail: DetailLevel
}

export interface SurfaceStats {
  readonly triangles: number
  readonly geometries: number
  readonly materials: number
  readonly drawCalls: number
}

/** What lifecycle.ts needs from a renderer, so it can be tested with a stand-in. */
export interface Surface {
  readonly canvas: HTMLCanvasElement
  resize(width: number, height: number, pixelRatio: number): void
  draw(state: DeformationState): void
  stats(): SurfaceStats
  dispose(): void
}

function attribute(array: Float32Array, dynamic = false): BufferAttribute {
  const a = new BufferAttribute(array, 3)
  if (dynamic) a.setUsage(DynamicDrawUsage)
  return a
}

/** Colours are stored in sRGB; the shader works in linear light. */
function toLinear(colors: Float32Array): Float32Array {
  const out = new Float32Array(colors.length)
  const c = new Color()
  for (let i = 0; i < colors.length; i += 3) {
    c.setRGB(colors[i]!, colors[i + 1]!, colors[i + 2]!, SRGBColorSpace)
    out[i] = c.r
    out[i + 1] = c.g
    out[i + 2] = c.b
  }
  return out
}

function tubeGeometry(positions: Float32Array, normals: Float32Array, colors: Float32Array, indices: Uint32Array, dynamic: boolean): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute("position", attribute(positions, dynamic))
  g.setAttribute("normal", attribute(normals, dynamic))
  g.setAttribute("color", attribute(toLinear(colors)))
  g.setIndex(new BufferAttribute(indices, 1))
  return g
}

/** The envelope: a sphere pushed to the ellipsoid and the organic outline, with welded normals. */
function envelopeGeometry(seed: number): BufferGeometry {
  const g = new SphereGeometry(1, 72, 48)
  const p = g.attributes.position as BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const s = envelopeScale(seed, x, y, z)
    p.setXYZ(i, x * AXES[0] * s, y * AXES[1] * s, z * AXES[2] * s)
  }
  g.computeVertexNormals()
  // The sphere repeats its seam and poles; give coincident vertices one shared normal.
  const n = g.attributes.normal as BufferAttribute
  const sums = new Map<string, [number, number, number]>()
  const key = (i: number): string => `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`
  for (let i = 0; i < p.count; i++) {
    const k = key(i)
    const s = sums.get(k) ?? [0, 0, 0]
    s[0] += n.getX(i)
    s[1] += n.getY(i)
    s[2] += n.getZ(i)
    sums.set(k, s)
  }
  for (let i = 0; i < p.count; i++) {
    const s = sums.get(key(i))!
    const l = Math.hypot(s[0], s[1], s[2]) || 1
    n.setXYZ(i, s[0] / l, s[1] / l, s[2] / l)
  }
  return g
}

export function createSurface(options: SurfaceOptions): Surface {
  const canvas = document.createElement("canvas")
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "default" })
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = NoToneMapping
  renderer.outputColorSpace = SRGBColorSpace

  const model = buildModel()
  const detail = DETAIL[options.detail]
  const highlighted = createTubeBuilder(model.strands[0]!, detail)
  const resting = mergeTubes(model.strands.slice(1).map((s) => createTubeBuilder(s, detail)))

  const chromatin = chromatinMaterial()
  const back = envelopeBack()
  const front = envelopeFront()
  const staticGeometry = tubeGeometry(resting.positions, resting.normals, resting.colors, resting.indices, false)
  const dynamicGeometry = tubeGeometry(highlighted.positions, highlighted.normals, highlighted.colors, highlighted.indices, true)
  const shellGeometry = envelopeGeometry(model.seed)

  const group = new Group()
  group.rotation.set(DISPLAY_ROTATION.x, DISPLAY_ROTATION.y, 0)
  const restingMesh = new Mesh(staticGeometry, chromatin)
  const highlightMesh = new Mesh(dynamicGeometry, chromatin)
  const backMesh = new Mesh(shellGeometry, back)
  const frontMesh = new Mesh(shellGeometry, front)
  backMesh.renderOrder = 1
  frontMesh.renderOrder = 2
  for (const m of [restingMesh, highlightMesh, backMesh, frontMesh]) m.frustumCulled = false
  group.add(restingMesh, highlightMesh, backMesh, frontMesh)

  const scene = new Scene()
  const fogColor = new Color().setRGB(FOG_COLOR[0], FOG_COLOR[1], FOG_COLOR[2], SRGBColorSpace)
  scene.fog = new Fog(fogColor, 1, 10)
  scene.add(group)
  scene.add(new HemisphereLight(0xffffff, 0xcfd6e8, 1.9))
  const sun = new DirectionalLight(0xffffff, 1.5)
  sun.position.set(-1.2, 1.6, 2.2)
  scene.add(sun)

  const camera = new PerspectiveCamera(CAMERA.fov, 1, 0.1, 50)
  const scratch = new Float32Array(model.strands[0]!.points)
  const base = model.strands[0]!.points
  const drawn = { s: Number.NaN, vx: Number.NaN, vy: Number.NaN }
  let disposed = false

  return {
    canvas,
    resize(width, height, pixelRatio) {
      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(width, height, false)
      const aspect = width / Math.max(1, height)
      const distance = cameraDistance(aspect)
      camera.aspect = aspect
      camera.position.set(0, 0, distance)
      camera.lookAt(0, 0, 0)
      camera.updateProjectionMatrix()
      const fog = scene.fog as Fog
      fog.near = distance - 0.95
      fog.far = distance + 1.45
    },
    draw(state) {
      if (disposed) return
      if (state.s !== drawn.s || state.vx !== drawn.vx || state.vy !== drawn.vy) {
        applyDeformation(model, base, state, scratch)
        highlighted.update(scratch)
        ;(dynamicGeometry.attributes.position as BufferAttribute).needsUpdate = true
        ;(dynamicGeometry.attributes.normal as BufferAttribute).needsUpdate = true
        drawn.s = state.s
        drawn.vx = state.vx
        drawn.vy = state.vy
      }
      renderer.render(scene, camera)
    },
    stats() {
      return {
        triangles: resting.triangles + highlighted.triangles + 2 * (shellGeometry.index?.count ?? 0) / 3,
        geometries: renderer.info.memory.geometries,
        materials: 3,
        drawCalls: renderer.info.render.calls,
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      staticGeometry.dispose()
      dynamicGeometry.dispose()
      shellGeometry.dispose()
      chromatin.dispose()
      back.dispose()
      front.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
