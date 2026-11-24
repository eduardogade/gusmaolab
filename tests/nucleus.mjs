// The 3D nucleus (P19, D-130 to D-136): the checks that need no browser. They run the real model,
// deformation, tube geometry, lifecycle and mount code in Node.js, with stand-ins for the renderer
// and the browser's document, timers and frames (the lifecycle is written against an `Environment`
// for exactly this), and they read git and the release build (run `npm run build` first, or
// `npm run verify`). The browser half (real WebGL, resize, pointer and keyboard, touch, reduced
// motion, lazy loading) is tests/nucleus-browser.mjs.
//
// What they show: the model is deterministic, finite, confined and continuous; the highlighted
// region is one anchored stretch of one strand that deforms by a bounded, continuous, reversible
// amount toward the target without any change of colour or mesh; the loop draws only while the
// response moves; every listener, timer and renderer is released; nothing of the real homepage,
// clocks, folders, palettes, Bearnard, editorial code, CV or the contact, downloads and 404 pages
// was changed; and the release build holds no trace of the prototype or Three.js. What they do not
// show: how it looks (the screenshots and the owner), or WebGL itself (the browser test).
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { publicBuildIssues } from "../scripts/demo-check.mjs"
import { AXES, BUDGET, CONFINEMENT_LIMIT, CONFINEMENT_REST, DEFORMATION, DETAIL, HIGHLIGHT_COLOR, POINTS_PER_STRAND, RENDER, SEED, TERRITORIES } from "../src/visualization/nucleus/config.ts"
import { applyDeformation, createState, isSettled, phaseOf, releaseState, respondTo, settle, step, weightAt } from "../src/visualization/nucleus/deformation.ts"
import { buildFallback } from "../src/visualization/nucleus/fallback.ts"
import { observeTargets } from "../src/visualization/nucleus/interaction.ts"
import { createLifecycle } from "../src/visualization/nucleus/lifecycle.ts"
import { mountNucleus } from "../src/visualization/nucleus/index.ts"
import { buildModel, ellipsoidNorm, envelopeScale } from "../src/visualization/nucleus/model.ts"
import { createTubeBuilder, mergeTubes } from "../src/visualization/nucleus/tube.ts"
import { cameraDistance, clientToFrame, project, rotate, targetResponse, unrotate } from "../src/visualization/nucleus/view.ts"
import { DEV_PAGES, NUCLEUS_PAGE } from "../src/design/site-map.ts"
import { fakeBrowser, fakeHost, listeners } from "./nucleus-fakes.mjs"
import { withoutApproved } from "./approved-changes.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const dist = join(repo, "dist")
const BASE = "0bc6b89" // the head P19 began from
const json = (v) => JSON.stringify(v)
const read = (path) => readFile(join(repo, path), "utf8")
const results = []
async function test(id, title, body) {
  const failures = []
  let skipped = null
  try {
    await body((ok, message) => ok || failures.push(message), (why) => (skipped = why))
  } catch (error) {
    failures.push(error.stack ?? error.message)
  }
  results.push({ id, title, failures, skipped })
}
const git = (...args) => spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" })
const gitAvailable = git("rev-parse", "--git-dir").status === 0 && git("cat-file", "-e", BASE).status === 0
const lines = (r) => r.stdout.split("\n").filter(Boolean)
/** Files under `paths` changed since P19 began: its commits and the working tree. */
function changedSinceBase(paths) {
  if (!gitAvailable) return []
  const files = new Set([...lines(git("diff", "--name-only", BASE, "--", ...paths)), ...lines(git("ls-files", "--others", "--exclude-standard", "--", ...paths))])
  return [...files].sort()
}

const model = buildModel()
const base = model.strands[0].points
const close = (a, b, tolerance = 1e-9) => Math.abs(a - b) <= tolerance
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
const dist3 = (a, i, b, j) => Math.hypot(a[i * 3] - b[j * 3], a[i * 3 + 1] - b[j * 3 + 1], a[i * 3 + 2] - b[j * 3 + 2])

/** Integrate a state for `seconds` at 60 Hz, giving each frame's displaced control points. */
function run(state, seconds, onFrame) {
  const out = new Float32Array(base.length)
  for (let t = 0; t < Math.round(seconds * 60); t++) {
    step(state, 1 / 60)
    applyDeformation(model, base, state, out)
    onFrame?.(out, t)
  }
  return out
}
const maxMove = (a, b) => {
  let m = 0
  for (let i = 0; i < a.length / 3; i++) m = Math.max(m, dist3(a, i, b, i))
  return m
}

// --- Scientific structure --------------------------------------------------------------------------------------

await test("NUC-001", "Deterministic construction: the same seed gives the same nucleus", async (check) => {
  const again = buildModel(SEED)
  check(again.strands.length === model.strands.length, "the strand count differs")
  check(model.strands.every((s, i) => same(s.points, again.strands[i].points) && same(s.colors, again.strands[i].colors) && same(s.radii, again.strands[i].radii)), "a strand differs")
  check(same(model.highlight.opened, again.highlight.opened) && model.highlight.start === again.highlight.start, "the highlighted region differs")
  check(!same(model.strands[3].points, buildModel(SEED + 1).strands[3].points), "a different seed gives the same strand")
  check(envelopeScale(SEED, 0.3, 0.5, 0.8) === envelopeScale(SEED, 0.3, 0.5, 0.8), "the envelope is not deterministic")
})

await test("NUC-002", "Geometry validity: every coordinate, colour and radius is finite and in range", async (check) => {
  check(model.strands.length === TERRITORIES && model.strands.every((s) => s.points.length === POINTS_PER_STRAND * 3), "the strands are not as configured")
  for (const s of model.strands) {
    check([...s.points, ...s.compaction, ...s.colors, ...s.radii].every(Number.isFinite), `${s.id}: a non-finite value`)
    check([...s.colors].every((v) => v >= 0 && v <= 1) && [...s.compaction].every((v) => v >= 0 && v <= 1), `${s.id}: a colour or compaction outside 0 to 1`)
    check([...s.radii].every((r) => r > 0.004 && r < 0.03), `${s.id}: a radius outside the intended range`)
  }
  for (const level of Object.values(DETAIL)) {
    const t = createTubeBuilder(model.strands[0], level)
    check([...t.positions, ...t.normals, ...t.colors].every(Number.isFinite), "a tube has a non-finite value")
    check([...t.indices].every((i) => i < t.positions.length / 3), "an index is out of range")
    let unit = true
    for (let i = 0; i < t.normals.length; i += 3 * 7) unit &&= close(Math.hypot(t.normals[i], t.normals[i + 1], t.normals[i + 2]), 1, 1e-3)
    check(unit, "a normal is not a unit vector")
  }
})

await test("NUC-003", "Nuclear confinement: chromatin stays inside the envelope, with its tube", async (check) => {
  for (const s of model.strands)
    for (let i = 0; i < POINTS_PER_STRAND; i++)
      if (ellipsoidNorm(s.points[i * 3], s.points[i * 3 + 1], s.points[i * 3 + 2]) > CONFINEMENT_REST + 1e-6) {
        check(false, `${s.id} point ${i} is outside the resting limit`)
        break
      }
  // Every tube vertex is inside the envelope's own (irregular) surface.
  let outside = 0
  for (const s of model.strands) {
    const t = createTubeBuilder(s, DETAIL.full)
    for (let i = 0; i < t.positions.length; i += 3) {
      const [x, y, z] = [t.positions[i], t.positions[i + 1], t.positions[i + 2]]
      const n = ellipsoidNorm(x, y, z)
      const l = Math.hypot(x / AXES[0], y / AXES[1], z / AXES[2]) || 1
      if (n >= envelopeScale(SEED, x / AXES[0] / l, y / AXES[1] / l, z / AXES[2] / l) * 0.985) outside++
    }
  }
  check(outside === 0, `${outside} tube vertices reach the envelope`)
  check(CONFINEMENT_REST < CONFINEMENT_LIMIT && CONFINEMENT_LIMIT < 0.97, "the confinement limits are not ordered inside the envelope")
})

await test("NUC-004", "Polymer continuity: control paths and tube centrelines have no gaps or kinks", async (check) => {
  for (const s of model.strands) {
    let longest = 0
    let kink = 0
    for (let i = 1; i < POINTS_PER_STRAND; i++) longest = Math.max(longest, dist3(s.points, i, s.points, i - 1))
    for (let i = 1; i < POINTS_PER_STRAND - 1; i++) {
      const a = [0, 1, 2].map((c) => s.points[i * 3 + c] - s.points[(i - 1) * 3 + c])
      const b = [0, 1, 2].map((c) => s.points[(i + 1) * 3 + c] - s.points[i * 3 + c])
      // A turn between segments shorter than a tube's width is not a visible kink.
      if (Math.min(Math.hypot(...a), Math.hypot(...b)) < 0.02) continue
      const cos = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b) || 1)
      kink = Math.min(kink, cos)
    }
    check(longest < 0.075, `${s.id}: a gap of ${longest.toFixed(3)} between control points`)
    check(kink > -0.45, `${s.id}: a hairpin turn (cos ${kink.toFixed(2)})`)
  }
  // The tube is one connected surface: consecutive rings are close.
  const t = createTubeBuilder(model.strands[2], DETAIL.full)
  const ring = DETAIL.full.radialSegments
  let widest = 0
  for (let r = 1; r < t.positions.length / 3 / ring; r++) widest = Math.max(widest, dist3(t.positions, r * ring, t.positions, (r - 1) * ring))
  check(widest < 0.05, `a tube ring is ${widest.toFixed(3)} from the last`)
  // Outward winding: every triangle faces the same way as the normals of its vertices.
  let inward = 0
  for (let k = 0; k < t.indices.length; k += 3 * 5) {
    const [a, b, c] = [t.indices[k], t.indices[k + 1], t.indices[k + 2]]
    const u = [0, 1, 2].map((i) => t.positions[b * 3 + i] - t.positions[a * 3 + i])
    const v = [0, 1, 2].map((i) => t.positions[c * 3 + i] - t.positions[a * 3 + i])
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    // Degenerate triangles (a tube's tip, a tight fold) have no direction to check.
    if (Math.hypot(...n) > 1e-4 && n[0] * t.normals[a * 3] + n[1] * t.normals[a * 3 + 1] + n[2] * t.normals[a * 3 + 2] < 0) inward++
  }
  check(inward === 0, `${inward} triangles face inward`)
})

await test("NUC-005", "The yellow region exists at rest, in one strand, and is clearly yellow", async (check) => {
  const h = model.highlight
  const strand = model.strands.find((s) => s.id === h.strandId)
  check(strand !== undefined && h.start > 10 && h.end < POINTS_PER_STRAND - 10 && h.end - h.start > 30, "the region is not an interior stretch of a strand")
  const mid = Math.floor((h.start + h.end) / 2)
  const c = [0, 1, 2].map((i) => strand.colors[mid * 3 + i])
  check(c.every((v, i) => close(v, HIGHLIGHT_COLOR[i], 1e-6)), `the middle of the region is ${json(c)}, not the yellow`)
  check(c[0] > 0.9 && c[1] > 0.7 && c[2] < 0.25, "the region is not yellow")
  const pale = [0, 1, 2].map((i) => strand.colors[i])
  check(!(pale[0] > 0.9 && pale[1] > 0.7 && pale[2] < 0.25), "the strand is yellow outside the region")
  // Other territories are not yellow.
  check(model.strands.slice(1).every((s) => ![...Array(POINTS_PER_STRAND).keys()].some((i) => s.colors[i * 3] > 0.9 && s.colors[i * 3 + 2] < 0.3)), "another strand has yellow")
  // The yellow fades in over the strand's own tone: no step between neighbouring control points.
  let step2 = 0
  for (let i = 1; i < POINTS_PER_STRAND; i++) step2 = Math.max(step2, ...[0, 1, 2].map((k) => Math.abs(strand.colors[i * 3 + k] - strand.colors[(i - 1) * 3 + k])))
  check(step2 < 0.25, `the colour changes by ${step2.toFixed(2)} between neighbouring points`)
})

await test("NUC-006", "Stable identity: deformation rewrites one strand's positions and replaces nothing", async (check) => {
  const before = new Float32Array(base)
  const owner = model.strands[0]
  const builder = createTubeBuilder(owner, DETAIL.full)
  const [positions, indices, colors] = [builder.positions, builder.indices, builder.colors]
  const state = createState()
  respondTo(state, 0.6, 0.5)
  const out = run(state, 2, (points) => builder.update(points))
  check(same(base, before), "deformation changed the strand's rest points")
  check(builder.positions === positions && builder.indices === indices && builder.colors === colors, "the builder replaced a buffer")
  check(model.highlight.strandId === owner.id && model.strands[0] === owner, "the highlighted strand changed")
  check(out.length === base.length && builder.positions.length === positions.length, "the point count changed")
})

await test("NUC-007", "No sudden recolouring: colours are fixed and a target never touches them", async (check) => {
  const builder = createTubeBuilder(model.strands[0], DETAIL.full)
  const colors = new Float32Array(builder.colors)
  const pointColors = new Float32Array(model.strands[0].colors)
  const state = createState()
  for (const [vx, vy] of [[0.5, 0.5], [-0.6, 0.4], [0, 0.8]]) {
    respondTo(state, vx, vy)
    run(state, 1, (p) => builder.update(p))
  }
  releaseState(state)
  run(state, 3, (p) => builder.update(p))
  check(same(colors, builder.colors) && same(pointColors, model.strands[0].colors), "a colour changed during interaction")
  const sources = (await Promise.all(["deformation", "lifecycle", "interaction", "index"].map((f) => read(`src/visualization/nucleus/${f}.ts`)))).join("\n")
  check(!/\.color|setRGB|opacity|setHex|\.visible\s*=/.test(sources), "interaction code touches colour, opacity or visibility")
})

await test("NUC-008", "Model complexity stays within the budget", async (check) => {
  for (const [name, detail] of Object.entries(DETAIL)) {
    const all = model.strands.map((s) => createTubeBuilder(s, detail))
    const triangles = mergeTubes(all).triangles
    check(triangles <= BUDGET.maxTriangles, `${name}: ${triangles} triangles exceed ${BUDGET.maxTriangles}`)
    if (name === "light") check(triangles < mergeTubes(model.strands.map((s) => createTubeBuilder(s, DETAIL.full))).triangles * 0.6, "the light detail is not lighter")
  }
  check(model.strands.length <= BUDGET.maxStrands && model.strands.length * POINTS_PER_STRAND <= BUDGET.maxControlPoints, "too many strands or control points")
  check(BUDGET.maxDrawCalls <= 6, "the draw-call budget grew")
})

// --- Deformation -----------------------------------------------------------------------------------------------

await test("NUC-009", "Resting state: no activation gives exactly the rest geometry", async (check) => {
  const out = new Float32Array(base.length)
  applyDeformation(model, base, createState(), out)
  check(same(out, base), "the resting output differs from the base")
  const state = createState()
  check(isSettled(state) && phaseOf(state) === "resting" && state.s === 0, "a new state is not resting and settled")
})

await test("NUC-010", "An interaction target produces a measurable, bounded deformation", async (check) => {
  const state = createState()
  respondTo(state, 0.7, 0.6)
  const out = run(state, 4)
  const moved = maxMove(base, out)
  check(moved > 0.04, `the region moved only ${moved.toFixed(3)}`)
  check(moved < DEFORMATION.reach * 1.25 + 0.15, `the region moved ${moved.toFixed(3)}`)
  check(phaseOf(state) === "responding", "the phase is not responding")
  check(state.s > 0.999, "the response did not reach full activation")
})

await test("NUC-011", "Modest extension: strongest reach, outside points and anchors never move too far", async (check) => {
  let worst = 0
  let worstOutside = 0
  const h = model.highlight
  for (const [vx, vy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7]]) {
    const state = createState()
    respondTo(state, vx * 0.76, vy * 0.76) // tanh saturates near 0.76 for a faraway target
    const out = run(state, 4)
    worst = Math.max(worst, maxMove(base, out))
    for (let i = 0; i < POINTS_PER_STRAND; i++) if (i <= h.start || i >= h.end) worstOutside = Math.max(worstOutside, dist3(base, i, out, i))
    for (let i = h.start; i <= h.end; i++) if (ellipsoidNorm(out[i * 3], out[i * 3 + 1], out[i * 3 + 2]) > CONFINEMENT_LIMIT * 1.0001) worst = Infinity
  }
  check(worst < 0.4, `the strongest displacement is ${worst.toFixed(3)} (limit 0.4, a third of the nucleus's radius)`)
  check(worstOutside === 0, "a point outside the region or at its ends moved")
  check(targetResponse([40, 40], [0, 0]).every((v) => Math.abs(v) <= 1) && Math.hypot(...targetResponse([40, 40], [0, 0])) < 1.0001, "the reach is not bounded by 1")
})

await test("NUC-012", "Continuity: each 60 Hz frame moves every point by a small step, with no jump", async (check) => {
  const state = createState()
  respondTo(state, 0.6, 0.55)
  let previous = new Float32Array(base)
  let biggest = 0
  run(state, 4, (out) => {
    biggest = Math.max(biggest, maxMove(previous, out))
    previous = new Float32Array(out)
  })
  check(biggest < 0.012, `a frame moved a point by ${biggest.toFixed(4)}`)
  // The response starts and ends gently: the first frames move far less than the fastest.
  const early = createState()
  respondTo(early, 0.6, 0.55)
  let first = 0
  run(early, 1 / 60, (out) => (first = maxMove(base, out)))
  check(first < biggest * 0.4, "the response starts abruptly")
})

await test("NUC-013", "Return: releasing brings the same geometry back to rest", async (check) => {
  const state = createState()
  respondTo(state, 0.7, 0.5)
  run(state, 3)
  releaseState(state)
  const phases = new Set()
  const out = run(state, 6, () => phases.add(phaseOf(state)))
  check(phases.has("returning"), "no returning phase")
  check(maxMove(base, out) < 1e-3, `the geometry is ${maxMove(base, out).toExponential(2)} from rest`)
  // The loop's own last step lands exactly on rest.
  if (isSettled(state)) settle(state)
  const exact = new Float32Array(base.length)
  applyDeformation(model, base, state, exact)
  check(same(exact, base), "the settled state is not exactly the rest geometry")
})

await test("NUC-014", "Retargeting: changing or releasing mid-response moves on from the current shape", async (check) => {
  const state = createState()
  respondTo(state, 0.7, 0.4)
  let previous = new Float32Array(base)
  run(state, 0.5, (out) => (previous = new Float32Array(out)))
  const shape = new Float32Array(previous)
  const s0 = state.s
  // Another target, then a release, then the first again: every step starts from where the last ended.
  let biggest = 0
  for (const act of [() => respondTo(state, -0.7, 0.3), () => releaseState(state), () => respondTo(state, 0.2, 0.7)]) {
    act()
    run(state, 0.4, (out) => {
      biggest = Math.max(biggest, maxMove(previous, out))
      previous = new Float32Array(out)
    })
  }
  check(biggest < 0.012, `a retarget moved a point by ${biggest.toFixed(4)} in one frame`)
  const probe = createState()
  Object.assign(probe, state)
  respondTo(probe, -0.7, 0.3)
  const out = new Float32Array(base.length)
  applyDeformation(model, base, probe, out)
  check(Math.abs(probe.s - state.s) < 1e-12 && s0 > 0.3 && s0 < 0.97, "the state is not continuous across the change of target")
  check(maxMove(shape, base) > 0.02, "the mid-response shape was not deformed")
})

await test("NUC-015", "No detached segments: the deformed path stays continuous and anchored", async (check) => {
  const h = model.highlight
  for (const [vx, vy] of [[0.7, 0.6], [-0.7, 0.2], [0, -0.7]]) {
    const state = createState()
    respondTo(state, vx, vy)
    const out = run(state, 4)
    let longest = 0
    for (let i = 1; i < POINTS_PER_STRAND; i++) longest = Math.max(longest, dist3(out, i, out, i - 1))
    check(longest < 0.1, `a gap of ${longest.toFixed(3)} opened between control points`)
    check(dist3(out, h.start, base, h.start) === 0 && dist3(out, h.end, base, h.end) === 0, "an end of the region moved")
    check(weightAt(h, h.start) === 0 && weightAt(h, h.end) === 0 && weightAt(h, Math.floor((h.start + h.end) / 2)) > 0.99, "the weight is not 0 at the ends and 1 in the middle")
    const t = createTubeBuilder(model.strands[0], DETAIL.full)
    t.update(out)
    let widest = 0
    for (let r = 1; r < t.positions.length / 3 / DETAIL.full.radialSegments; r++) widest = Math.max(widest, dist3(t.positions, r * 8, t.positions, (r - 1) * 8))
    check(widest < 0.07, `the tube tears: rings ${widest.toFixed(3)} apart`)
  }
  // The weight has zero slope at the ends (smooth hand-over to the strand).
  const e = 1e-3
  const w = (t) => weightAt(h, h.start + t * (h.end - h.start))
  check(w(e) < 1e-4 && w(1 - e) < 1e-4, "the weight does not leave its ends smoothly")
})

await test("NUC-016", "Target direction: the response moves toward the target on screen", async (check) => {
  const aspect = 4 / 3
  const region = project(rotate(model.highlight.center), aspect)
  const cases = { right: [1.5, region[1]], left: [-1.5, region[1]], up: [region[0], 1.4], down: [region[0], -1.2] }
  for (const [name, target] of Object.entries(cases)) {
    const [vx, vy] = targetResponse(target, region)
    const state = createState()
    respondTo(state, vx, vy)
    const out = run(state, 4)
    // The centre of the region moves on screen the way the target lies.
    const h = model.highlight
    let sx = 0
    let sy = 0
    for (let i = h.start; i <= h.end; i++) {
      const a = rotate([base[i * 3], base[i * 3 + 1], base[i * 3 + 2]])
      const b = rotate([out[i * 3], out[i * 3 + 1], out[i * 3 + 2]])
      sx += b[0] - a[0]
      sy += b[1] - a[1]
    }
    const dx = target[0] - region[0]
    const dy = target[1] - region[1]
    check(sx * dx + sy * dy > 0, `${name}: the region moved away from the target`)
    check(Math.abs(Math.atan2(sy, sx) - Math.atan2(dy, dx)) < 0.9 || Math.abs(Math.abs(Math.atan2(sy, sx) - Math.atan2(dy, dx)) - 2 * Math.PI) < 0.9, `${name}: the direction is off by more than 0.9 rad`)
  }
  check(close(unrotate(rotate([0.3, -0.4, 0.5]))[0], 0.3, 1e-12) && close(unrotate(rotate([0.3, -0.4, 0.5]))[2], 0.5, 1e-12), "rotate and unrotate are not inverses")
  const frame = clientToFrame({ x: 150, y: 50 }, { left: 0, top: 0, width: 200, height: 100 })
  check(close(frame[0], 1) && close(frame[1], 0), `a page point maps to ${json(frame)} not (1, 0)`)
  check(cameraDistance(0.5) > cameraDistance(1.33), "a narrower frame does not move the camera back")
  for (const a of [0.5, 1, 4 / 3, 2]) {
    const [x, y] = project([1, 0, 0], a)
    const [x2, y2] = project([0, 1, 0], a)
    check(Math.abs(x) <= 1.0001 * a + 1e-9 && Math.abs(y2) <= 1.0001, `a unit sphere does not fit a frame of aspect ${a}: ${x.toFixed(2)}, ${y2.toFixed(2)}`)
    void y
    void x2
  }
})

await test("NUC-017", "Stable anchor: every target moves the same region, with the same fixed ends", async (check) => {
  const h = model.highlight
  const touched = new Set()
  for (const target of [[0.7, 0.5], [-0.7, 0.5], [0.1, 0.8], [0.6, -0.4]]) {
    const state = createState()
    respondTo(state, target[0], target[1])
    const out = run(state, 3)
    for (let i = 0; i < POINTS_PER_STRAND; i++) if (dist3(base, i, out, i) > 0) touched.add(i)
  }
  check(Math.min(...touched) > h.start && Math.max(...touched) < h.end, "a target moved a point outside the region")
  check(touched.size === h.end - h.start - 1, `${touched.size} points move, the region has ${h.end - h.start - 1} interior points`)
  check(model.highlight.strandId === "territory-00" && h.start === Math.floor(0.25 * POINTS_PER_STRAND), "the anchored region is not the configured one")
})

// --- Lifecycle, with stand-ins ---------------------------------------------------------------------------------

const make = (b, mode = "interactive") => createLifecycle({ surface: b.surface, model, host: b.host, mode, modeReason: "test", pixelRatioCap: RENDER.maxPixelRatio, environment: b.env })

await test("NUC-018", "Reduced motion and touch: the static mode never animates and ignores targets", async (check) => {
  const b = fakeBrowser()
  const n = make(b, "static")
  const drawn = b.surface.calls.draw
  n.setTarget({ x: 300, y: 20 })
  n.release()
  check(b.pending() === 0 && b.surface.calls.draw === drawn, "a static nucleus scheduled or drew a frame for a target")
  check(n.status === "static" && n.mode === "static" && n.diagnostics().activation === 0, "the static nucleus is not still")
  // Switching to static while a response is under way goes straight to rest, with no animation.
  const c = fakeBrowser()
  const live = make(c)
  live.setTarget({ x: 300, y: 20 })
  c.tick()
  c.tick()
  check(live.diagnostics().activation > 0, "the interactive nucleus did not respond")
  live.setMode("static", "reduced motion")
  check(live.diagnostics().activation === 0 && c.pending() === 0 && live.status === "static", "going static left motion behind")
})

await test("NUC-021", "Static idle: a still nucleus draws once and schedules nothing", async (check) => {
  const b = fakeBrowser()
  const n = make(b)
  check(b.surface.calls.draw === 1, `the first composition drew ${b.surface.calls.draw} times`)
  check(b.pending() === 0 && n.diagnostics().loopRunning === false, "a frame is pending with nothing to animate")
  for (let i = 0; i < 100; i++) b.tick()
  check(b.surface.calls.draw === 1, "frames were drawn while nothing moved")
  check(b.timers.size === 0, "an idle timer is running")
})

await test("NUC-022", "Active animation: a target schedules frames, and each draws", async (check) => {
  const b = fakeBrowser()
  const n = make(b)
  n.setTarget({ x: 450, y: 60 })
  check(b.pending() === 1 && n.diagnostics().loopRunning, "no frame was scheduled for a target")
  const drawn = b.surface.calls.draw
  for (let i = 0; i < 30; i++) b.tick()
  check(b.surface.calls.draw === drawn + 30 && b.pending() === 1, "frames were not drawn in turn while moving")
  check(n.diagnostics().phase === "responding" && n.diagnostics().activation > 0.5, "the response did not progress")
})

await test("NUC-023", "Settled animation: the loop stops by itself, and again after release", async (check) => {
  const b = fakeBrowser()
  const n = make(b)
  n.setTarget({ x: 450, y: 60 })
  const frames = b.runUntilIdle()
  check(frames > 60 && frames < 600, `the response took ${frames} frames to settle`)
  check(b.pending() === 0 && !n.diagnostics().loopRunning && n.diagnostics().activation === 1, "the loop kept running or did not land on full")
  const after = b.surface.calls.draw
  for (let i = 0; i < 20; i++) b.tick()
  check(b.surface.calls.draw === after, "frames were drawn after settling")
  n.release()
  b.runUntilIdle()
  check(b.pending() === 0 && n.diagnostics().activation === 0 && n.diagnostics().phase === "resting", "the return did not end at rest")
  check(b.surface.calls.draw > after + 30, "the return drew no frames")
})

await test("NUC-024", "Resize: a changed frame resizes the surface with a capped pixel ratio", async (check) => {
  const b = fakeBrowser({ width: 700, height: 525, dpr: 3 })
  const n = make(b)
  check(json(b.surface.calls.resize[0]) === json([700, 525, RENDER.maxPixelRatio]), `first size ${json(b.surface.calls.resize[0])}`)
  b.rect.width = 320
  b.rect.height = 240
  b.resizeCallback()()
  const last = b.surface.calls.resize.at(-1)
  check(json(last) === json([320, 240, RENDER.maxPixelRatio]), `after resize ${json(last)}`)
  check(b.surface.calls.draw >= 2, "a resize did not redraw")
  b.win.devicePixelRatio = 1
  n.refresh()
  check(b.surface.calls.resize.at(-1)[2] === 1, "a lower pixel ratio was not followed")
  b.rect.width = 0
  b.resizeCallback()()
  const drawn = b.surface.calls.draw
  b.resizeCallback()()
  check(b.surface.calls.draw === drawn, "a zero-sized frame was drawn")
})

await test("NUC-025", "Visibility: a hidden page pauses the loop; showing it draws and resumes", async (check) => {
  const b = fakeBrowser()
  const n = make(b)
  n.setTarget({ x: 450, y: 60 })
  check(b.pending() === 1, "no frame pending")
  b.doc.hidden = true
  b.doc.fire("visibilitychange")
  check(b.pending() === 0 && !n.diagnostics().loopRunning, "a hidden page keeps a frame pending")
  n.setTarget({ x: 100, y: 60 })
  check(b.pending() === 0, "a hidden page schedules a frame")
  b.doc.hidden = false
  const drawn = b.surface.calls.draw
  b.doc.fire("visibilitychange")
  check(b.surface.calls.draw === drawn + 1 && b.pending() === 1, "showing the page did not draw and resume")
})

await test("NUC-026", "Restoration: pageshow redraws the current state", async (check) => {
  const b = fakeBrowser()
  make(b)
  const drawn = b.surface.calls.draw
  b.win.fire("pageshow", { persisted: true })
  check(b.surface.calls.draw === drawn + 1, "a restored page was not redrawn")
  check(b.pending() === 0, "a restored, settled page started a loop")
})

await test("NUC-027", "Cleanup: dispose releases the surface, observer, listeners, frame and timer, twice safely", async (check) => {
  const b = fakeBrowser()
  const n = make(b)
  n.setTarget({ x: 450, y: 60 })
  b.canvas.fire("webglcontextlost")
  n.dispose()
  n.dispose()
  check(b.surface.calls.dispose === 1, `the surface was disposed ${b.surface.calls.dispose} times`)
  check(b.pending() === 0 && b.timers.size === 0, "a frame or timer survived")
  check(b.observing() === 0 && b.released() === 1, "the size observer was not released once")
  for (const [name, l] of [["document", b.doc], ["window", b.win], ["canvas", b.canvas]]) check(l.live() === 0 && l.adds() === l.removes(), `${name}: ${l.live()} listeners remain (${l.adds()} added, ${l.removes()} removed)`)
  check(b.canvas.removed && n.status === "disposed", "the canvas stayed or the status is not disposed")
  const drawn = b.surface.calls.draw
  n.setTarget({ x: 1, y: 1 })
  n.release()
  n.refresh()
  check(b.pending() === 0 && b.surface.calls.draw === drawn, "a disposed nucleus drew or scheduled")
})

await test("NUC-028", "No duplicate renderer: mounting again replaces the nucleus, never doubling it", async (check) => {
  const host = fakeHost()
  const made = []
  const create = () => {
    const b = fakeBrowser()
    made.push(b)
    return b.surface
  }
  const env = fakeBrowser().env
  const first = await mountNucleus(host, { createSurface: create, environment: env, mode: "interactive" })
  const second = await mountNucleus(host, { createSurface: create, environment: env, mode: "interactive" })
  check(made[0].surface.calls.dispose === 1 && made[1].surface.calls.dispose === 0, "the first mount was not disposed by the second")
  check(first.status === "disposed" && second.status === "ready", `statuses ${first.status} / ${second.status}`)
  check(host.dataset.nucleusState === "ready", `the host is marked ${host.dataset.nucleusState}`)
  second.dispose()
  check(made[1].surface.calls.dispose === 1 && host.dataset.nucleusState === "disposed", "dispose did not release the second")
  const third = await mountNucleus(host, { createSurface: create, environment: env, mode: "static" })
  check(third.status === "static" && third.mode === "static", "a forced static mount is not static")
  third.dispose()
})

await test("NUC-020", "Unsupported renderer: a controlled fallback, with no thrown error", async (check) => {
  const host = fakeHost()
  const none = await mountNucleus(host, { createSurface: () => { throw new Error("no WebGL") }, environment: fakeBrowser().env })
  check(none.status === "fallback" && host.dataset.nucleusState === "fallback", "the status is not fallback")
  check(host.canvases.length === 0, "a canvas was added")
  none.setTarget({ x: 1, y: 1 })
  none.release()
  none.refresh()
  none.dispose()
  const late = await mountNucleus(host, { createSurface: async () => { throw new Error("rejected") }, environment: fakeBrowser().env })
  check(late.status === "fallback" && late.diagnostics().framesDrawn === 0, "a rejected renderer did not fall back")
  const picture = buildFallback()
  check(picture.paths.length >= TERRITORIES && picture.envelope.startsWith("M") && picture.viewBox === "0 0 533 400", "the still picture is incomplete")
  check(picture.paths.some((p) => p.stroke === "#f4c426"), "the still picture has no yellow region")
  check(json(buildFallback()) === json(picture), "the still picture is not deterministic")
})

await test("NUC-029", "Context failure: drawing stops, a restore resumes, a lost one falls back", async (check) => {
  const b = fakeBrowser()
  const statuses = []
  const n = createLifecycle({ surface: b.surface, model, host: b.host, mode: "interactive", modeReason: "t", pixelRatioCap: 2, environment: b.env, onStatus: (s) => statuses.push(s) })
  n.setTarget({ x: 450, y: 60 })
  let prevented = false
  b.canvas.fire("webglcontextlost", { preventDefault: () => (prevented = true) })
  check(prevented, "the lost event was not cancelled, so a restore cannot happen")
  const drawn = b.surface.calls.draw
  n.setTarget({ x: 100, y: 60 })
  b.tick()
  check(b.surface.calls.draw === drawn && b.pending() === 0, "frames were drawn on a lost context")
  b.canvas.fire("webglcontextrestored")
  check(b.surface.calls.draw === drawn + 1 && b.timers.size === 0, "a restore did not redraw or clear its timer")
  // A context that never returns.
  b.canvas.fire("webglcontextlost")
  const [timer] = [...b.timers.values()]
  check(timer?.ms === RENDER.contextRestoreTimeout, "no restore timer")
  timer.cb()
  check(n.status === "fallback" && statuses.at(-1) === "fallback", `the status is ${n.status}`)
  n.dispose()
})

await test("NUC-030", "Mouse hover: observed targets drive the controller and never touch the elements", async (check) => {
  const calls = []
  const controller = { setTarget: (p) => calls.push(["target", p]), release: () => calls.push(["release"]) }
  const els = [0, 1, 2].map((i) => {
    const l = listeners()
    return Object.assign(l, { i, getBoundingClientRect: () => ({ left: 100 * i, top: 0, width: 50, height: 20 }) })
  })
  const seen = []
  const stop = observeTargets(controller, els, { onChange: (e) => seen.push(e?.i ?? null) })
  els[1].fire("pointerenter", { pointerType: "mouse" })
  check(json(calls.at(-1)) === json(["target", { x: 125, y: 10 }]), `the target was ${json(calls.at(-1))}`)
  els[1].fire("pointerleave", { pointerType: "mouse" })
  check(calls.at(-1)[0] === "release" && json(seen) === json([1, null]), "leaving did not release")
  els[0].fire("pointerenter", { pointerType: "touch" })
  els[0].fire("pointerleave", { pointerType: "touch" })
  check(calls.length === 2, "a touch pointer drove the response")
  // Keyboard: focus moves between observed elements without a release, and leaves with one.
  els[0].fire("focusin")
  els[0].fire("focusout", { relatedTarget: undefined })
  check(json(calls.slice(2)) === json([["target", { x: 25, y: 10 }], ["release"]]), `keyboard calls ${json(calls.slice(2))}`)
  stop()
  check(els.every((e) => e.live() === 0 && e.adds() === e.removes()), "a listener remains")
  check(els.every((e) => e.adds() === 4), "an element has the wrong number of listeners")
  const source = await read("src/visualization/nucleus/interaction.ts")
  check(!/preventDefault\s*\(|stopPropagation\s*\(|stopImmediatePropagation\s*\(/.test(source.replace(/\/\*[\s\S]*?\*\//g, "")), "the observer cancels or stops events")
  check(/passive: true/.test(source), "its listeners are not passive")
})

// --- Specimen, isolation and preservation ----------------------------------------------------------------------

await test("NUC-036", "No blocked navigation: the canvas takes no pointer events, and the module adds no handler to links", async (check) => {
  const component = await read("src/components/scientific/NucleusFrame.astro")
  check(/pointer-events:\s*none/.test(component), "the canvas does not ignore pointer events")
  check(!/touch-action:\s*(none|pan|manipulation)/.test(component) && /touch-action:\s*auto/.test(component), "the canvas changes touch handling")
  const sources = (await Promise.all(["index", "lifecycle", "renderer"].map((f) => read(`src/visualization/nucleus/${f}.ts`)))).join("\n")
  check(!/addEventListener\(\s*["'](click|touchstart|touchmove|wheel|keydown|pointerdown)/.test(sources), "the nucleus listens for a click, touch, wheel or key")
})

await test("NUC-037", "Homepage preservation: P15's regions are unchanged; P20 changed the stage, its style and one helper", async (check, skip) => {
  if (!gitAvailable) return skip("git is not available")
  // P19 left Home alone; P20 (D-139) mounts the nucleus in the stage. Everything else of P15 stays as it was.
  // The world clocks' short date (D-158, owner-approved in P22-A01) is the one change since to the clocks' files; tests/approved-changes.mjs names them.
  const touched = withoutApproved(changedSinceBase(["src/components/home", "src/home", "src/styles/home.css", "src/components/states", "src/site", "src/layouts"]))
  // P21 (D-149) added a `scheduling` destination source, which touched these four page-state files and nothing of Home.
  const allowed = ["src/components/home/NucleusStage.astro", "src/home/nucleus-navigation.ts", "src/styles/home.css", "src/components/states/DestinationPage.astro", "src/site/coverage.ts", "src/site/destinations.ts", "src/site/facts.ts"]
  check(touched.every((f) => allowed.includes(f)), `Home sources changed beyond the stage: ${json(touched.filter((f) => !allowed.includes(f)))}`)
  const diff = git("diff", BASE, "--", "src/pages/index.astro").stdout
  const changed = diff.split("\n").filter((l) => /^[+-][^+-]/.test(l))
  check(changed.every((l) => /NUCLEUS|demosEnabled|specimen|SITE_MAP|import \{ CONTACT_PAGE/.test(l)), `src/pages/index.astro changed beyond the development note: ${json(changed.filter((l) => !/NUCLEUS|SITE_MAP|import \{ CONTACT_PAGE/.test(l)))}`)
  const home = await readFile(join(dist, "index.html"), "utf8")
  check(!/3D Nucleus Prototype|_design\/nucleus|data-nucleus-lab|data-nucleus-specimen/.test(home), "the release Home carries the prototype")
  check(/data-stage-state="picture"/.test(home) && /data-nucleus-stage/.test(home) && !/<canvas/.test(home), "the Home stage is not the still picture in the static HTML")
  const stage = await read("src/components/home/NucleusStage.astro")
  check(!/visualization\/nucleus|from "three"|<canvas/.test(stage), "the stage imports the engine or draws a canvas itself")
})

await test("NUC-038", "P16 clocks are unchanged", async (check, skip) => {
  if (!gitAvailable) return skip("git is not available")
  // Except the owner-approved short date (D-158): the places (clocks.ts) and the loop (clock-loop.ts) stay exactly as they were.
  const touched = withoutApproved(changedSinceBase(["src/home/clock-loop.ts", "src/home/clock-time.ts", "src/home/clocks.ts", "src/scripts/world-clocks.ts", "src/components/home/WorldClocks.astro"]))
  check(touched.length === 0, `the clocks changed: ${json(touched)}`)
})

await test("NUC-039", "Physical folders and navigation are unchanged", async (check, skip) => {
  if (!gitAvailable) return skip("git is not available")
  const touched = changedSinceBase(["src/components/folders", "src/styles/folders.css", "src/navigation", "src/layouts/FolderPage.astro", "src/scripts/folder-previews.ts", "src/scripts/folder-rows.ts", "src/styles/view-transitions.css"])
  check(touched.length === 0, `the folders or navigation changed: ${json(touched)}`)
})

await test("NUC-040", "The five locked palettes are unchanged, and the nucleus adds no site token", async (check, skip) => {
  if (!gitAvailable) return skip("git is not available")
  const touched = changedSinceBase(["src/styles/categories.css", "src/styles/tokens.css", "src/styles/environments.css", "src/styles/global.css", "src/design/contract.mjs", "src/design/css-tokens.mjs"])
  check(touched.length === 0, `a style or palette file changed: ${json(touched)}`)
  const styles = (await Promise.all((await readdir(join(repo, "src/styles"))).map((f) => read(`src/styles/${f}`)))).join("\n")
  check(!/visualization\/nucleus|nucleus__|data-nucleus|\.nucleus\b/.test(styles), "a global stylesheet styles the nucleus figure")
})

await test("NUC-041", "Bearnard is untouched and not involved", async (check, skip) => {
  if (!gitAvailable) return skip("git is not available")
  const touched = changedSinceBase(["src/illustrations", "public/illustrations", "assets/bearnard", "scripts/bearnard_derivatives.py", "src/components/bearnard"])
  check(touched.length === 0, `Bearnard files changed: ${json(touched)}`)
  const sources = (await Promise.all((await readdir(join(repo, "src/visualization/nucleus"))).map((f) => read(`src/visualization/nucleus/${f}`)))).join("\n")
  check(!/bearnard/i.test(sources.replace(/Bearnard[^\n]*\n/g, "")), "the nucleus code mentions Bearnard")
  const status = git("status", "--porcelain", "--", "brand").stdout.trim()
  check(status === "", "something under brand/ changed")
})

await test("NUC-042", "P10 to P14 publishing is unchanged", async (check, skip) => {
  if (!gitAvailable) return skip("git is not available")
  const touched = changedSinceBase(["src/editorial", "src/content.config.ts", "src/content", "scripts/content.mjs", "scripts/science.mjs", "science", "src/science", "src/demos/greenhouse", "src/records", "src/data/records"])
  // P22 (D-157) moved the Quarto study's one figure out of public/ (scripts/science.mjs: one path; the manifest: the same path); nothing else of publishing changed.
  const moved = touched.filter((f) => !["scripts/science.mjs", "src/science/manifest.json"].includes(f))
  check(moved.length === 0, `publishing files changed: ${json(moved)}`)
})

await test("NUC-043", "The CV files are untouched", async (check, skip) => {
  if (!gitAvailable) return skip("git is not available")
  const touched = changedSinceBase(["cv", "src/cv", "src/data/cv"])
  check(touched.length === 0, `CV files changed: ${json(touched)}`)
  check(git("status", "--porcelain", "--", "cv").stdout.trim() === "", "the working tree has a CV change")
})

await test("NUC-046", "Contact, downloads, the 404 page and the site map keep working", async (check, skip) => {
  if (!gitAvailable) return skip("git is not available")
  const touched = changedSinceBase(["src/contact", "src/data/contact.ts", "src/downloads", "src/data/downloads.ts", "src/pages/404.astro", "src/layouts/ErrorPage.astro", "src/components/contact", "src/components/downloads", "scripts/downloads.mjs", "src/site", "scripts/links.mjs"])
  // P21 (D-149): Schedule became a `scheduling` destination; these three files carry that and nothing about Contact, downloads or the 404 page.
  const P21 = ["src/site/coverage.ts", "src/site/destinations.ts", "src/site/facts.ts"]
  check(touched.filter((f) => !P21.includes(f)).length === 0, `P17/P18 files changed: ${json(touched.filter((f) => !P21.includes(f)))}`)
  const diff = git("diff", BASE, "--", "src/design/site-map.ts").stdout.split("\n").filter((l) => /^[+-][^+-]/.test(l))
  check(diff.every((l) => l.startsWith("+") && /NUCLEUS|nucleus|3D|Nucleus|SCHEDULING|Scheduling|QUALITY|Quality/.test(l.replace(/^\+\/\*\*.*$/, "nucleus"))), `the site map's list lost something: ${json(diff)}`)
  check(DEV_PAGES.some((p) => p.href === NUCLEUS_PAGE && p.label === "3D Nucleus Prototype"), "the nucleus is not in the development list")
  check(existsSync(join(dist, "contact/index.html")) && existsSync(join(dist, "404.html")), "a page of P18 is missing from the build")
})

await test("NUC-044", "Production isolation: the release holds no prototype page, and the engine only where Home loads it", async (check) => {
  check(existsSync(join(dist, "index.html")), "dist/ is not built")
  for (const path of ["_design/nucleus/index.html", "_design/nucleus"]) check(!existsSync(join(dist, path)), `dist/${path} exists`)
  const issues = await publicBuildIssues(dist)
  check(issues.length === 0, `traces: ${json(issues.slice(0, 5))}`)
  const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])))).flat()
  const files = await walk(dist)
  // P20 (D-139): the engine is in exactly one file, the renderer chunk, and the specimen's own markers are in none.
  const engine = []
  for (const file of files.filter((f) => /\.(js|mjs)$/.test(f))) {
    const text = await readFile(file, "utf8")
    if (/WebGLRenderer|WebGL2RenderingContext/.test(text)) engine.push(file.replace(`${dist}/`, ""))
    check(!/data-nucleus-lab|data-nucleus-specimen|data-nucleus-diagnostics|data-nucleus-set-width/.test(text), `${file.replace(dist, "")} carries the specimen`)
  }
  check(engine.length === 1 && /^_astro\/renderer\.[\w-]+\.js$/.test(engine[0]), `the engine is in ${json(engine)}`)
  const pages = files.filter((f) => f.endsWith(".html"))
  const withNucleus = []
  for (const file of pages) if (/<canvas|data-nucleus|renderer\.[\w-]+\.js|nucleus\.[\w-]+\.js/.test(await readFile(file, "utf8"))) withNucleus.push(file.replace(`${dist}/`, ""))
  check(json(withNucleus) === json(["index.html"]), `pages with the nucleus: ${json(withNucleus)}`)
})

await test("NUC-047", "Dependencies: Three.js and its types are the only addition, pinned exactly", async (check, skip) => {
  const now = JSON.parse(await read("package.json"))
  check(now.dependencies.three === "0.187.0" && now.dependencies["@types/three"] === "0.187.0", `three is ${now.dependencies.three}, types ${now.dependencies["@types/three"]}`)
  if (!gitAvailable) return skip("git is not available")
  const then = JSON.parse(git("show", `${BASE}:package.json`).stdout)
  const strip = (d) => Object.fromEntries(Object.entries(d).filter(([k]) => k !== "three" && k !== "@types/three"))
  // P22 (D-154) added axe-core, a test-only dependency, pinned exactly, and nothing else.
  const withoutAxe = (d) => json(Object.fromEntries(Object.entries(d).filter(([k]) => k !== "axe-core")))
  check(json(strip(now.dependencies)) === json(then.dependencies) && withoutAxe(now.devDependencies) === withoutAxe(then.devDependencies), "another dependency changed")
  const lock = JSON.parse(await read("package-lock.json"))
  check(lock.packages["node_modules/three"]?.version === "0.187.0" && lock.packages["node_modules/@types/three"]?.version === "0.187.0", "the lockfile does not hold both")
  const importers = (await Promise.all((await readdir(join(repo, "src"), { recursive: true })).filter((f) => /\.(ts|astro|mjs)$/.test(f)).map(async (f) => [f, await read(join("src", f))]))).filter(([, t]) => /from\s+["']three["']/.test(t)).map(([f]) => f).sort()
  check(json(importers) === json(["visualization/nucleus/materials.ts", "visualization/nucleus/renderer.ts"].sort().map((f) => f.replace(/\//g, "/"))), `these files import three: ${json(importers)}`)
})

await test("NUC-048", "The modules are small and separate, and the pure ones import no engine", async (check) => {
  const dir = join(repo, "src/visualization/nucleus")
  const files = (await readdir(dir)).sort()
  check(json(files) === json(["config.ts", "deformation.ts", "domains.ts", "fallback.ts", "index.ts", "interaction.ts", "lifecycle.ts", "materials.ts", "model.ts", "renderer.ts", "tube.ts", "types.ts", "view.ts"]), `modules: ${json(files)}`)
  for (const f of files) {
    const text = await readFile(join(dir, f), "utf8")
    check(text.split("\n").length < 340, `${f} is ${text.split("\n").length} lines`)
    if (!["materials.ts", "renderer.ts", "lifecycle.ts"].includes(f)) check(!/from\s+["']three["']|document\.|window\.|requestAnimationFrame/.test(text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/env\.(document|window)\./g, "")) || f === "index.ts", `${f} touches the engine or the DOM`)
    check(!/\bimport\s+[^"']*from\s+["']\.\/[^"']*(?<!\.ts)["']/.test(text), `${f} imports without a .ts extension`)
    check(!/\benum\b|constructor\s*\([^)]*(public|private|readonly)\s/.test(text), `${f} uses non-erasable TypeScript`)
  }
})

await test("NUC-049", "The specimen and the figure: labelled, keyboard operable, still-picture fallback present", async (check) => {
  const page = await read("src/pages/[design]/nucleus/index.astro")
  const figure = await read("src/components/scientific/NucleusFrame.astro")
  check(/demosEnabled\(\)/.test(page) && /getStaticPaths/.test(page), "the specimen is not gated to development and demonstration builds")
  check(/development only, not part of the website/i.test(await read("src/design/nucleus/NucleusBanner.astro")), "the banner does not say it is development only")
  check(/<button type="button" class="nuc__target"/.test(page) && !/<a [^>]*nuc__target/.test(page), "the simulated tabs are not buttons")
  check(/role="img"/.test(figure) && /aria-label/.test(figure) && /<svg/.test(figure) && /aria-hidden="true"/.test(figure), "the figure is not a labelled image with a still picture")
  check(/aspect-ratio/.test(figure), "the frame has no fixed aspect ratio, so the canvas would shift the layout")
  for (const label of ["NUC-01", "NUC-02", "NUC-03"]) check(page.includes(label), `${label} is not on the specimen`)
  check(/Frame width/.test(page) && /still nucleus/i.test(page) && /Show diagnostics/.test(page), "a specimen control is missing")
})

let failed = 0
for (const { id, title, failures, skipped } of results) {
  if (skipped) console.log(`SKIP ${id} ${title} (${skipped})`)
  else if (failures.length === 0) console.log(`PASS ${id} ${title}`)
  else {
    failed++
    console.log(`FAIL ${id} ${title}`)
    for (const message of failures.slice(0, 8)) console.log(`  - ${message}`)
  }
}
console.log(failed === 0 ? `\n${results.length} checks passed.` : `\n${failed} of ${results.length} checks failed.`)
process.exit(failed === 0 ? 0 : 1)
