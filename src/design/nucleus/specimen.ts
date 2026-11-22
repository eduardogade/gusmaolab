/**
 * The logic of the 3D nucleus specimen (P19, D-136), loaded by src/scripts/nucleus-specimen.ts only in development and demonstration builds. It mounts the nucleus through the public
 * interface (src/visualization/nucleus/index.ts), attaches the simulated tabs with `observeTargets`,
 * and drives the page's own readout, play button, width presets, still-nucleus preview and
 * diagnostics. Nothing here is part of the nucleus: the homepage has its own, shorter, version
 * (src/scripts/home-nucleus.ts), which uses the real folder tabs instead of simulated ones.
 */
import { browserLayout, mountNucleus, observeNavigation } from "../../visualization/nucleus/index.ts"
import type { NavigationItem, NucleusController } from "../../visualization/nucleus/index.ts"

const lab = document.querySelector<HTMLElement>("[data-nucleus-lab]")
const frame = lab?.querySelector<HTMLElement>("[data-nucleus-frame]") ?? null
const stage = lab?.querySelector<HTMLElement>("[data-nucleus-width]") ?? null

if (lab && frame && stage) {
  const targets = Array.from(lab.querySelectorAll<HTMLElement>("[data-nucleus-target]"))
  const text = (name: string): HTMLElement | null => lab.querySelector(`[data-readout="${name}"]`)
  const diag = (name: string): HTMLElement | null => lab.querySelector(`[data-diag="${name}"]`)
  const set = (el: HTMLElement | null, value: string): void => {
    if (el && el.textContent !== value) el.textContent = value
  }

  let controller: NucleusController | null = null
  let stopObserving: (() => void) | null = null
  let playTimer: number | null = null
  let generation = 0

  const markTarget = (item: NavigationItem | null): void => {
    for (const t of targets) t.setAttribute("aria-pressed", String(t === item?.element))
    set(text("target"), item?.element.getAttribute("data-nucleus-target") ?? "none")
  }
  const items: NavigationItem[] = targets.map((element) => ({ id: element.getAttribute("data-nav-id") ?? "", element }))

  const start = async (still: boolean): Promise<void> => {
    const mine = ++generation
    stopObserving?.()
    controller?.dispose()
    controller = null
    markTarget(null)
    const next = await mountNucleus(frame, still ? { mode: "static" } : {})
    if (mine !== generation) {
      next.dispose()
      return
    }
    controller = next
    stopObserving = observeNavigation(next, items, { onChange: markTarget, layout: browserLayout() })
  }

  const refresh = (): void => {
    const d = controller?.diagnostics()
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    const touch = matchMedia("(hover: none), (pointer: coarse)").matches
    set(
      lab.querySelector<HTMLElement>("[data-nucleus-device]"),
      `This device: ${touch ? "touch-oriented pointer" : "hover-capable pointer"}; reduced motion ${reduced ? "requested" : "not requested"}. ${
        touch || reduced ? "It gets the still nucleus." : "It gets the interactive nucleus."
      }`,
    )
    if (!d) return
    const label = { loading: "Loading the model", ready: "Interactive", static: "Still nucleus", fallback: "Still picture (3D unavailable)", disposed: "Stopped" }[d.status]
    set(text("state"), label)
    set(text("phase"), d.phase)
    set(text("activation"), String(Math.round(d.activation * 100)))
    set(text("navigation"), d.activeNavigationId ?? "none")
    set(text("domain"), d.activeDomainId ?? "none")
    set(text("resolution"), d.resolution ?? "none")
    set(text("coords"), d.target === null ? "none" : `${d.target.x.toFixed(2)}, ${d.target.y.toFixed(2)}`)
    set(diag("status"), d.status)
    set(diag("mode"), d.mode)
    set(diag("reason"), d.reason)
    set(diag("framesDrawn"), String(d.framesDrawn))
    set(diag("loopRunning"), String(d.loopRunning))
    set(diag("lastFrameMs"), d.lastFrameMs.toFixed(2))
    set(diag("canvas"), `${d.canvasWidth} × ${d.canvasHeight}`)
    set(diag("pixelRatio"), d.pixelRatio.toFixed(2))
    set(diag("triangles"), String(Math.round(d.triangles)))
    set(diag("resources"), `${d.geometries} / ${d.materials}`)
    set(diag("drawCalls"), String(d.drawCalls))
    for (const t of targets) t.toggleAttribute("disabled", d.mode === "static")
  }
  window.setInterval(refresh, 250)

  lab.querySelector<HTMLInputElement>("[data-nucleus-static]")?.addEventListener("change", (event) => {
    void start((event.target as HTMLInputElement).checked)
  })

  lab.querySelector<HTMLInputElement>("[data-nucleus-diagnostics-toggle]")?.addEventListener("change", (event) => {
    const panel = lab.querySelector<HTMLElement>("[data-nucleus-diagnostics]")
    if (panel) panel.hidden = !(event.target as HTMLInputElement).checked
  })

  for (const button of lab.querySelectorAll<HTMLElement>("[data-nucleus-set-width]")) {
    button.addEventListener("click", () => {
      const value = button.getAttribute("data-nucleus-set-width")
      stage.style.maxInlineSize = value === "full" ? "" : `${value}px`
    })
  }

  // NUC-02's scripted demonstration: hover "Lab", hold, release. It goes through the same
  // controller the real tabs will, so what it shows is what hovering does.
  lab.querySelector<HTMLElement>("[data-nucleus-play]")?.addEventListener("click", () => {
    const lab3 = targets.find((t) => t.getAttribute("data-nucleus-target") === "Lab")
    if (!controller || !lab3 || controller.mode === "static") return
    if (playTimer !== null) window.clearTimeout(playTimer)
    const r = lab3.getBoundingClientRect()
    controller.activate({ navigationId: "lab", position: { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
    markTarget({ id: "lab", element: lab3 })
    playTimer = window.setTimeout(() => {
      controller?.clear()
      markTarget(null)
      playTimer = null
    }, 2600)
  })

  // NUC-04: a request for a domain the model does not have: it must fall back, never throw.
  lab.querySelector<HTMLElement>("[data-nucleus-unknown]")?.addEventListener("click", () => {
    const first = targets[1] ?? targets[0]
    if (!controller || !first || controller.mode === "static") return
    const r = first.getBoundingClientRect()
    controller.activate({ navigationId: first.getAttribute("data-nav-id") ?? "", position: { x: r.left + r.width / 2, y: r.top + r.height / 2 }, chromatinDomainId: "no-such-domain" })
    if (playTimer !== null) window.clearTimeout(playTimer)
    playTimer = window.setTimeout(() => {
      controller?.clear()
      playTimer = null
    }, 2600)
  })

  window.addEventListener("pagehide", () => {
    stopObserving?.()
    controller?.dispose()
  })

  void start(false).then(refresh)
}
