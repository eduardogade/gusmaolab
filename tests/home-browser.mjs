// The homepage in a real, headless Chromium (P15, D-112 to D-117): HOME-009 to HOME-026 as a reader
// sees them, and HOME-022B, the populated specimen. It serves dist-demo/ (`npm run demo:build`, run
// first by `npm run test:browser`) because the specimen exists only there; its real Home is the
// release homepage plus one development link, and the Blog is as empty as the release's.
//
// What it shows: at seven widths the homepage and its specimen do not scroll sideways, keep Bearnard's
// aspect ratio and the regions apart, wrap long titles, can be reached and read by keyboard, and
// have no motion. What it does not show: Safari, Firefox, a real phone, a screen reader, or whether
// the owner likes it. Without a browser or dist-demo/ every check is reported NOT RUN (exit 2).
import { json, startBrowser } from "./browser-harness.mjs"

const IDS = ["HOME-009B", "HOME-010B", "HOME-022B", "HOME-023", "HOME-024", "HOME-025", "HOME-026"]
const { js, send, press, setViewport, goto, test, finish } = await startBrowser({
  ids: IDS,
  timeout: 300_000,
  root: "dist-demo",
})
const WIDTHS = [320, 390, 430, 768, 1024, 1280, 1440]
const PAGES = ["/", "/_design/home/"]
const overflow = () => js(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)
const rect = (selector) =>
  js(`(() => { const e = document.querySelector(${json(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top + scrollY, bottom: r.bottom + scrollY, width: r.width, height: r.height }; })()`)

await test("HOME-009B", "Bearnard keeps his aspect ratio and is never clipped", async (check) => {
  for (const width of WIDTHS) {
    await setViewport(width, 900, width < 768)
    for (const path of PAGES) {
      await goto(path)
      await js(`new Promise((r) => { const i = document.querySelector("[data-illustration]"); i.complete ? r() : i.addEventListener("load", r); })`)
      const image = await js(`(() => {
        const i = document.querySelector("[data-illustration]"), r = i.getBoundingClientRect(), paper = document.querySelector(".gl-folder__paper").getBoundingClientRect();
        return { w: r.width, h: r.height, left: r.left, right: r.right, paper: [paper.left, paper.right], ratio: i.width / i.height, objectFit: getComputedStyle(i).objectFit, natural: [i.naturalWidth, i.naturalHeight] };
      })()`)
      check(Math.abs(image.w / image.h - image.ratio) < 0.01, `${width}px ${path}: drawn ${image.w}×${image.h}, attributes ratio ${image.ratio}`)
      check(image.left >= image.paper[0] - 1 && image.right <= image.paper[1] + 1, `${width}px ${path}: the image leaves the paper ${json(image)}`)
      check(image.natural[0] > 0, `${width}px ${path}: the image did not load`)
      check(image.h <= 520, `${width}px ${path}: Bearnard is ${Math.round(image.h)}px tall`)
    }
  }
})

await test("HOME-010B", "The nucleus stage keeps one footprint and sits apart from its neighbours", async (check) => {
  for (const width of WIDTHS) {
    await setViewport(width, 900, width < 768)
    await goto("/")
    const stage = await js(`(() => {
      const f = document.querySelector("[data-stage-frame]"), r = f.getBoundingClientRect(), s = document.querySelector("[data-home-region=stage]").getBoundingClientRect();
      return { w: r.width, h: r.height, inside: r.left >= s.left - 1 && r.right <= s.right + 1, overflow: f.scrollWidth > f.clientWidth + 1 || f.scrollHeight > f.clientHeight + 1 };
    })()`)
    const ratio = stage.w / stage.h
    check(Math.abs(ratio - 4 / 3) < 0.02 || Math.abs(ratio - 16 / 10) < 0.02, `${width}px: frame ratio ${ratio}`)
    check(stage.inside && !stage.overflow, `${width}px: the frame overflows ${json(stage)}`)
  }
  // Stable: the frame does not change size when the text or the page is re-laid out.
  await setViewport(1280, 900)
  await goto("/")
  const before = await rect("[data-stage-frame]")
  await js(`document.fonts.ready.then(() => 0)`)
  const after = await rect("[data-stage-frame]")
  check(json(before) === json(after), `the frame moved: ${json(before)} → ${json(after)}`)
})

await test("HOME-023", "The homepage does not overflow and keeps its regions apart", async (check) => {
  for (const width of WIDTHS) {
    await setViewport(width, 900, width < 768)
    for (const path of PAGES) {
      await goto(path)
      check((await overflow()) <= 0, `${width}px ${path}: scrolls sideways by ${await overflow()}px`)
      const layout = await js(`(() => {
        const regions = [...document.querySelectorAll("[data-home-region]")].map((e) => { const r = e.getBoundingClientRect(); return { name: e.dataset.homeRegion, top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right }; });
        const paper = document.querySelector(".gl-folder__paper").getBoundingClientRect();
        const overlap = [];
        for (let i = 0; i < regions.length; i += 1) for (let j = i + 1; j < regions.length; j += 1) {
          const a = regions[i], b = regions[j];
          if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlap.push([a.name, b.name]);
        }
        const clocks = [...document.querySelectorAll("[data-clock-id]")].map((e) => ({ id: e.dataset.clockId, fits: e.scrollWidth <= e.clientWidth + 1, city: (() => { const c = e.querySelector(".clock__city"); return c.scrollWidth <= c.clientWidth + 1; })() }));
        const out = regions.filter((r) => r.left < paper.left - 1 || r.right > paper.right + 1).map((r) => r.name);
        const h1 = document.querySelectorAll("h1").length;
        const rows = document.querySelectorAll(".gl-folder__strip").length;
        const order = regions.map((r) => r.name).join();
        return { overlap, clocks, out, h1, rows, order, n: regions.length };
      })()`)
      check(json(layout.overlap) === "[]", `${width}px ${path}: regions overlap ${json(layout.overlap)}`)
      check(layout.out.length === 0, `${width}px ${path}: ${json(layout.out)} leave the paper`)
      check(layout.clocks.length === 8 && layout.clocks.every((c) => c.fits && c.city), `${width}px ${path}: clocks do not fit ${json(layout.clocks.filter((c) => !c.fits || !c.city))}`)
      check(layout.h1 === 1 && layout.rows === 1, `${width}px ${path}: ${layout.h1} <h1>, ${layout.rows} rows of tabs`)
      check(layout.order === "welcome,explore,stage,updates,clocks", `${width}px ${path}: order ${layout.order}`)
    }
    // The global row stays reachable: its selected tab is in view or the row scrolls to it.
    const row = await js(`(() => { const s = document.querySelector(".gl-folder__strip"), t = s.querySelector("[data-selected]"), a = s.getBoundingClientRect(), b = t.getBoundingClientRect(); return { selectedInView: b.left >= a.left - 1 && b.right <= a.right + 1, tabs: s.querySelectorAll(".gl-folder-tab").length }; })()`)
    check(row.tabs === 11 && row.selectedInView, `${width}px: the global row ${json(row)}`)
  }
})

await test("HOME-022B", "The specimen shows three synthetic posts, drawn by the real components", async (check) => {
  await setViewport(1280, 900)
  await goto("/_design/home/")
  const page = await js(`(() => {
    const items = [...document.querySelectorAll("[data-update-path]")].map((e) => ({ title: e.querySelector(".update__title").textContent.trim(), summary: !!e.querySelector(".update__summary"), time: e.querySelector("time")?.getAttribute("datetime") }));
    return { items, banner: !!document.querySelector("[data-home-specimen]"), empty: !!document.querySelector("[data-updates-empty]"), all: [...document.querySelectorAll(".updates__all a")].map((a) => a.getAttribute("href")), title: document.title };
  })()`)
  check(page.banner, "no specimen banner")
  check(!page.empty && page.items.length === 3, `${page.items.length} posts listed`)
  check(json(page.items.map((i) => i.time)) === json(["2026-11-14", "2026-10-30", "2026-10-02"]), `dates ${json(page.items.map((i) => i.time))}`)
  check(page.items.some((i) => i.title.length > 100) && page.items.some((i) => !i.summary), "the specimen lacks the long-title and no-summary cases")
  check(!page.items.some((i) => /draft|archived|Berry|fourth/i.test(i.title)), `an ineligible post is listed ${json(page.items)}`)
  check(json(page.all) === json(["/blog/"]), "the link to the Blog is wrong")
  // The real home links to it, by clicking from the page itself.
  await goto("/")
  const link = await js(`document.querySelector("[data-home-specimen-link] a")?.getAttribute("href")`)
  check(link === "/_design/home/", `the real homepage links ${link}`)
  const real = await js(`({ empty: !!document.querySelector("[data-updates-empty]"), list: !!document.querySelector("[data-updates-list]") })`)
  check(real.empty && !real.list, `the real homepage is not honest about the empty Blog ${json(real)}`)
})

await test("HOME-024", "Every homepage link is reachable by keyboard, with a visible focus", async (check) => {
  for (const width of [390, 1280]) {
    await setViewport(width, 900, width < 768)
    await goto("/_design/home/")
    const targets = await js(`[...document.querySelectorAll("[data-home] a")].map((a) => a.getAttribute("href"))`)
    await js(`document.activeElement.blur(); window.scrollTo(0, 0); 0`)
    const visited = new Set()
    const bad = []
    for (let i = 0; i < 120 && visited.size < targets.length; i += 1) {
      await press("Tab")
      const focus = await js(`(() => { const a = document.activeElement; if (!a || a.tagName !== "A" || !a.closest("[data-home]")) return null; const s = getComputedStyle(a); const r = a.getBoundingClientRect(); return { href: a.getAttribute("href"), outline: s.outlineStyle, width: parseFloat(s.outlineWidth), h: r.height, route: !!a.closest(".explore__route") && a.closest(".explore__route").getBoundingClientRect().height }; })()`)
      if (focus) {
        visited.add(focus.href + (focus.route ? "" : ""))
        if (focus.outline === "none" || focus.width < 2) bad.push(focus.href)
      }
    }
    check(visited.size === new Set(targets).size, `${width}px: reached ${visited.size} of ${new Set(targets).size} links`)
    check(bad.length === 0, `${width}px: no visible focus on ${json(bad)}`)
    // Touch targets: a route's row, the actions and the Blog links are at least 44px tall.
    const small = await js(`[...document.querySelectorAll(".explore__route, .welcome__actions a, .update")].filter((e) => e.getBoundingClientRect().height < 44).map((e) => e.className)`)
    check(small.length === 0, `${width}px: small touch targets ${json(small)}`)
  }
  // The row links work: opening "About me" arrives at About.
  await setViewport(1280, 900)
  await goto("/")
  await js(`document.querySelector(".welcome__primary").click()`)
  await new Promise((r) => setTimeout(r, 400))
  check((await js(`location.pathname`)) === "/about/", `About me led to ${await js(`location.pathname`)}`)
})

await test("HOME-025", "Content reflows at twice the text size", async (check) => {
  await setViewport(1280, 900)
  for (const path of PAGES) {
    await goto(path)
    await js(`document.documentElement.style.fontSize = "200%"; 0`)
    const state = await js(`(() => { const h = document.querySelector("[data-home]"); return { sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth, clipped: [...h.querySelectorAll("a, h1, h2, h3, li")].filter((e) => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== "visible").length }; })()`)
    check(state.sideways <= 0 && state.clipped === 0, `${path} at 200% text: ${json(state)}`)
  }
  // Long words and titles wrap on the narrowest phone.
  await setViewport(320, 700, true)
  await goto("/_design/home/")
  const wrap = await js(`[...document.querySelectorAll(".update__title, .update__summary")].filter((e) => e.scrollWidth > e.clientWidth + 1).length`)
  check(wrap === 0, `${wrap} update texts overflow at 320px`)
})

await test("HOME-026", "The homepage has no motion, with or without a reduced-motion preference", async (check) => {
  await setViewport(1280, 900)
  for (const reduce of [false, true]) {
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reduce ? "reduce" : "no-preference" }] })
    for (const path of PAGES) {
      await goto(path)
      const motion = await js(`(() => {
        const nodes = [...document.querySelectorAll("[data-home], [data-home] *")];
        const animated = nodes.filter((e) => getComputedStyle(e).animationName !== "none").length;
        const transitions = nodes.filter((e) => parseFloat(getComputedStyle(e).transitionDuration) > 0).length;
        const smooth = getComputedStyle(document.documentElement).scrollBehavior;
        // The one exception (P20, D-144): a scroll-driven z-index raise on the stuck tab row. Nothing moves or
        // changes colour; it only decides whether the row is above the paper. Any other animation still fails.
        const running = document.getAnimations().filter((a) => !a.effect?.pseudoElement?.startsWith("::view-transition") && a.animationName !== "gl-home-tabs-raise").length;
        return { animated, transitions, smooth, running };
      })()`)
      check(motion.animated === 0 && motion.transitions === 0 && motion.smooth === "auto" && motion.running === 0, `${path} reduce=${reduce}: ${json(motion)}`)
    }
  }
  await send("Emulation.setEmulatedMedia", { features: [] })
})

await finish()
