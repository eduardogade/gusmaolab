# The 3D nucleus (P19)

An interactive three-dimensional model of an interphase cell nucleus and its folded chromatin, with one yellow chromatin region that opens and reaches modestly toward a navigation target. It lives in `src/visualization/nucleus/`. Since P20 it is on the real homepage (Home's region B), where the folder tabs move it; the standalone prototype is still at `/_design/nucleus/` (development only), for scientific and visual inspection. Decisions: D-130 to D-136 (P19), D-137 to D-143 (P20). Multiple chromatin domains are **not implemented**: the model has exactly one domain; the brief for several is `planning/nucleus-multidomain.md`.

## What it shows, and what it does not

It is an artistic model of how interphase chromatin is organised, in the spirit of regulatory genomics: a translucent nuclear envelope; chromatin as continuous folded polymers, one per chromosome *territory*, each looping on itself inside its own region; more compact chromatin near the envelope (peripheral heterochromatin) and more open chromatin inside; and one highlighted stretch of one polymer that opens when a target is active.

It is **not** a reconstruction of a cell, a measured genome, a molecular-dynamics simulation or a calibrated polymer model. The twelve territories are not the 46 human chromosomes, the envelope is stylised, and no pores, histones, nucleolus or organelles are drawn. Do not describe it as more than an illustration. Interphase, not metaphase: there are no condensed X-shaped chromosomes.

## Where things are

| Module | Job | Touches Three.js or the DOM? |
| --- | --- | --- |
| `config.ts` | Every tunable number: seed, size, counts, colours, deformation, camera, budgets | no |
| `types.ts` | Shared types, the `NucleusNavigationTarget` and the `NucleusController` contract | no |
| `domains.ts` | The chromatin-domain abstraction (P20): `domainsOf`, `resolveDomain`, the empty `NAVIGATION_DOMAINS` | no |
| `model.ts` | Deterministic geometry: envelope irregularity, territory centres, polymer walks, colours, radii, the highlighted region | no |
| `tube.ts` | Catmull-Rom centreline, ring vertices with transported frames, indices; in-place `update()` | no |
| `deformation.ts` | The continuous state, the critically damped step, the displacement of the region | no |
| `view.ts` | Display rotation, projection, camera distance, page point → bounded frame target (`localTarget`) → response | no |
| `materials.ts`, `renderer.ts` | Scene, camera, lights, meshes, the three materials, disposal | Three.js only |
| `lifecycle.ts` | The draw loop, resize, visibility, context loss, disposal; takes a `Surface` and an `Environment` | the browser only through `defaultEnvironment()` |
| `interaction.ts` | `observeNavigation` (P20): passive pointer and focus observation of items with stable IDs, with the precedence policy; `observeTargets`, the P19 form, wraps it | no |
| `fallback.ts` | The still SVG picture, projected from the same model | no |
| `index.ts` | `mountNucleus` and the public types | loads `renderer.ts` on demand |

The pure modules run in Node.js, which is how most of `tests/nucleus.mjs` works. Use erasable TypeScript and `.ts` import extensions (D-040).

## The geometric model

- **Seed and determinism.** `buildModel(seed)` uses a mulberry32 generator seeded with `SEED` (20260119). The same seed and configuration give byte-identical arrays (NUC-001).
- **Envelope.** An ellipsoid with semi-axes (1.0, 0.8, 0.72) scaled by `envelopeScale()`: four low-frequency sine waves over the direction with seeded phases, amplitude 3.5 %. The envelope mesh is a 72 × 48 sphere pushed to that shape with welded normals.
- **Territories.** Twelve centres: the first is fixed (so the yellow region sits upper-right and toward the viewer), the others are spread by rejection sampling inside 74 % of the nucleus with a minimum spacing that relaxes if it cannot be met.
- **Polymers.** Each territory is one strand of 150 control points: a persistent random walk (persistence 0.72, step 0.05, 0.64 inside the highlighted region so it is looser), steered gently back from the territory's edge, reflected and clamped at it, clamped inside 90 % of the nucleus, then smoothed three times (ends fixed). Spacing between control points never exceeds 0.075 (NUC-004).
- **Compaction.** A slow variation along the chain plus a peripheral term (`smoothstep(0.55, 0.9, norm)`) gives a 0–1 compaction per point; it sets the tube radius (0.0075 open to 0.0125 compact) and leans the colour toward a darker tone.
- **The yellow region.** Control points 37 to 111 (25 % to 75 % of the strand) of `territory-00` are yellow at rest (`#F4C426`) with radius 0.0165; the colour and radius blend into the strand's own tone over five points at each end, so it is part of the strand, not a separate ribbon. Both ends are anchored.

## Rendering

- **One draw call per kind:** the eleven resting polymers are merged into one static mesh; the highlighted strand is its own mesh (its positions change); the envelope is drawn twice (inside faces, outside faces). Four draw calls, three materials, three geometries. About 128,000 triangles at full detail and 78,000 at `light` (touch devices).
- **Chromatin material.** One `MeshStandardMaterial` with vertex colours, opaque, lit by a hemisphere light and one directional light, with a pale linear fog toward the back. Because it is opaque, strands never sort against each other; depth reads through lighting and fog.
- **Envelope material.** A small `ShaderMaterial` with a fresnel rim and a faint fill, translucent and never writing depth, drawn after the chromatin (`renderOrder` 1 and 2). The strands therefore always show through, and no sorting error can hide one.
- **Camera.** A perspective camera, 30° field of view, looking straight at the origin; the nucleus is turned inside a group by `DISPLAY_ROTATION` (x 0.42, y −0.52 rad) so depth reads. The camera distance is computed from the frame's aspect so the bounding sphere fits both axes (`cameraDistance`), which is why the nucleus is never clipped in a narrow frame. No camera movement, orbit or controls.
- **Pixel ratio.** Capped at 2 (1.5 on touch-oriented devices). At that size the cost grows faster than the look improves.
- **Colours** are the object's own (`config.ts`), not site tokens, and never reach `src/styles/` (D-131, D-076).

## The deformation

One continuous state (`DeformationState`): an activation `s` (0 rest, 1 full) and a direction-and-reach `(vx, vy)` in view space, each with its own velocity and target. Three scalars, critically damped with the exact step

```
e' = (e + (v + ω e) dt) · exp(−ω dt),   v' = (v − ω (v + ω e) dt) · exp(−ω dt)
```

(ω = 3.8 rad/s, so about 1 s to 90 % and 2.3 s to settle). It never overshoots and is stable for any `dt`, which is clamped to 1/20 s anyway. Pointing, retargeting and releasing only change what the three values head for; the state is never reset, so the shape always moves on from where it is (NUC-014). Releasing keeps the direction, so the region withdraws the way it came.

The displacement of control point *i* of the region is `w(i) · s · ( unfold · (opened(i) − base(i)) + move )`:

- `w(i) = sin²(π t)`, `t` the position in the region: zero, with zero slope, at both ends, so the path stays continuous and smooth where it meets the strand. Points outside the region never move (NUC-017).
- `opened(i)` is the rest point pushed away from the average of its nine neighbours by 1.1 times: the region's own loops extend. `unfold` is 0.85.
- `move` is `unrotate(vx · 0.32, vy · 0.32, |v| · 0.08)`: up to 0.32 model units toward the target on screen, a little toward the viewer.
- A Lipschitz scale-back keeps every point inside 93.5 % of the envelope's measure, so the clamp never makes a jump.

Every frame, only this one strand is recomputed (`tube.update(points)`, no allocation) and its position and normal buffers are re-uploaded. No geometry is created, replaced or hidden; colours are never touched (NUC-006, NUC-007).

### Target mapping

`setTarget({x, y})` takes **page client coordinates**. They become half-frame units about the canvas's centre (`clientToFrame`: the frame's half-height is 1, up is positive). The response direction runs from where the region's rest centre appears on screen (`project(rotate(center))`) to the target; its reach is `tanh(distance / 1.1)`, so far targets ask for no more than near ones. Mapping is isotropic, so a wide or narrow frame does not skew it. A left target pulls the region left and up, a right one right and up (measured in a browser: NUC-016B).

## Lifecycle and cost

- The first frame draws the resting composition. A frame is requested only while the response is moving; the loop stops when it settles (distance < 0.002, speed < 0.005) and the state snaps exactly onto its target. A still nucleus costs the GPU nothing (NUC-021, NUC-023, measured: 0 frames in 2 s idle).
- The page hidden pauses the loop and cancels the frame; showing it draws once and resumes. `pageshow` draws once. A `ResizeObserver` on the frame resizes the surface and draws once.
- WebGL context loss: `webglcontextlost` is cancelled so a restore can happen, drawing stops, and a restore redraws. If it does not return within 2.5 s the status becomes `fallback`.
- `dispose()` cancels the frame and timer, removes the document, window and canvas listeners, disconnects the observer, disposes geometries and materials and the renderer, forces the context loss and removes the canvas. It is safe twice. Mounting again on the same element disposes the old mount first: never two canvases (NUC-027, NUC-028).

## Touch, reduced motion, fallback

- **Interactive** when the pointer can hover and no reduced motion is requested. **Static** on `(hover: none), (pointer: coarse)` and under `prefers-reduced-motion: reduce`: a real 3D render of the resting nucleus, drawn once, never animating, ignoring targets, not listening for touch, taking no pointer events (`pointer-events: none`, `touch-action: auto`), so scrolling and links are untouched. A reduced-motion preference that changes while the page is open is followed without a reload.
- **Fallback.** `fallback.ts` projects the same model to about 13 SVG paths (one per strand, plus the yellow region) and the envelope's silhouette. It is drawn by `NucleusFrame.astro` (the homepage stage and the specimen's figure) with no script, keeps the frame's aspect ratio, and is hidden only once a canvas is live. If WebGL is unavailable the picture simply stays. It is a *provisional* capture: flat, without lighting or translucency, to be replaced by an approved capture.

## Browser support

Chrome 157 on macOS (Apple M1 Max, Metal) and headless Chrome with software WebGL (SwiftShader) were tested. WebGL 2 is required (Three.js 0.187). Safari, Firefox and Chrome on Android were **not** tested.

## The interface

```ts
import { browserLayout, mountNucleus, observeNavigation } from "../visualization/nucleus/index.ts"

const nucleus = await mountNucleus(frameElement)                 // fills it with a canvas; picks interactive or static
const stop = observeNavigation(nucleus, items, { sample, layout: browserLayout() })   // items: { id, element }[]
// or directly: nucleus.activate({ navigationId: "cv", position: { x, y } }); nucleus.clear()
// later: stop(); nucleus.dispose()
```

- **Mount point:** the element the canvas fills (`NucleusFrame.astro`'s `[data-nucleus-frame]`). It must have a size; its box is the coordinate frame.
- **The target:** `{ navigationId, position, chromatinDomainId? }`. The ID is the registry's (stable, not the label or the position); `position` is the viewport client coordinates of the visitor's attention, measured when the event happens; the domain ID is optional. The nucleus measures its canvas fresh at each activation, converts to half-frames, limits the distance to 3 (scaling, so the direction stays true), and turns it into a direction and a saturating reach. `setTarget(point)` / `release()` are the same without an ID.
- **Activation and release.** `pointerenter` (mouse and pen) and keyboard `focusin` (`:focus-visible`); `pointerleave` and `focusout` (not when focus moves to another observed item). Precedence: the most recent input wins, an input ends the response only if it set it, and ending one never revives an older one (D-138). Listeners are passive and never cancel or stop an event; no timer is used.
- **Re-sampling.** While a target is held, page scroll and resize re-sample it once per frame, if it moved 3 px or more.
- **Touch, reduced motion, keyboard.** Automatic; `controller.mode` says which. Touch and reduced motion are still; `controller.allowKeyboard()` lets keyboard focus lift the stillness on a touch device, never under reduced motion (D-141). Force with `mountNucleus(el, { mode: "static" })`.
- **Status.** `mountNucleus(el, { onStatus })` is told `loading`, `ready`, `static`, `fallback` or `disposed`; the host also carries `data-nucleus-state`.
- **Cleanup:** the page calls `stop()` and `dispose()`. `mountNucleus` loads `renderer.ts` (and Three.js, about 537 KB, 132 KB gzip, one chunk) on demand.
- **Diagnostics:** `controller.diagnostics()` returns the status, mode, phase, the active navigation ID, the domain that answered and how it was chosen, the clamped target, frame counts, canvas size, pixel ratio, renderer statistics and whether reduced motion is requested. The specimen shows them; no public page does.

## Navigation, domains and the homepage (P20)

On Home, `src/scripts/home-nucleus.ts` waits until the stage is near the viewport, loads the nucleus, mounts it in the stage's frame (which holds the still picture until then), and observes the eleven top-level tabs (`src/home/nucleus-navigation.ts`: `.gl-folder-tab[data-tab-kind='folder']` in the "Sections" row, each with its `data-tab-id`). A response is drawn only while the stage is on screen. The stage's state (`data-stage-state`: picture, loading, ready, static, fallback) and the held tab (`data-stage-target`) are visible in the DOM. The nucleus does not carry across pages: leaving Home ends it.

**Domains.** `domainsOf(model)` lists what can respond: **exactly one domain**, `highlighted-region`. `resolveDomain` answers a target by an explicit `chromatinDomainId`, then `NAVIGATION_DOMAINS[navigationId]` (empty), then the default; an unknown ID resolves to the default and is reported as `unknown-domain`. So all eleven tabs open the same region. Nothing claims otherwise: not the page, the specimen's mapping table, nor these documents. For several regions see `planning/nucleus-multidomain.md` (a brief, not a decision).

**The layout fact (D-143).** The stage is about 1,300 px below the tabs at 1440 px wide, so the two are on screen together only in a very tall window or a zoomed-out page. The response is correct but unseen otherwise.

## Budgets (held by tests)

At most 140,000 triangles, 16 strands, 2,000 control points and 6 draw calls (NUC-008); the light detail is under 60 % of the full one. No second renderer, canvas, loop or listener after mounting again (NUC-028).

## Changing it

- Look: `config.ts` (colours, radii, counts, rotation, camera). A new look is a new decision for the owner; the Chromatic Archive palettes never change.
- Deformation strength: `DEFORMATION.reach`, `unfold`, `openFactor`, `omega`. The tests bound the result (reach < 0.4).
- Change `SEED` or any generation constant and the nucleus changes everywhere, including the fallback picture: re-run `tests/nucleus.mjs` and look at it.
