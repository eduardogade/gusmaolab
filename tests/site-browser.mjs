// The site map, page states and navigation in a real, headless Chromium (P17, D-122 to D-125): the
// browser half of the SITE checks. It serves dist-demo/ (`npm run demo:build`, run first by
// `npm run test:browser`) because the site map and the page-states specimen exist only there; every
// other page in it is the release page.
//
// What it shows: every registered route opens directly and over HTTP-like loading, Back and Forward
// keep the selected tabs, the site map lists every registered folder with the state the real page says,
// each of its links opens a page, it is reachable by clicking from the local homepage, and the pages
// fit at seven widths with one heading, working keyboard focus and no extra tab row. What it does not
// show: Safari, Firefox, Chrome on Android or a real device, a screen reader, or whether the copy is
// what the owner would write. Without a browser or dist-demo/ every check is reported NOT RUN (exit 2).
import { readdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { json, sleep, startBrowser } from "./browser-harness.mjs"
import { coverage, summarize } from "../src/site/coverage.ts"
import { pageFacts, siteRecordViews } from "../src/site/facts.ts"
import { siteNavigation } from "../src/navigation/index.ts"
import { DEV_PAGES, SITE_MAP, SITE_MAP_LABEL } from "../src/design/site-map.ts"

const IDS = ["SITE-010B", "SITE-012", "SITE-035", "SITE-036", "SITE-037", "SITE-038", "SITE-045", "SITE-046", "SITE-047"]
const { js, send, setViewport, goto, waitForPath, test, finish } = await startBrowser({
  ids: IDS,
  timeout: 300_000,
  root: "dist-demo",
})
const WIDTHS = [320, 390, 430, 768, 1024, 1280, 1440]
const nodes = [...siteNavigation.nodes.values()]
const expectedRows = coverage(siteNavigation, pageFacts({}, siteRecordViews()))

/** Fetch a path from the page's own origin and say what came back. */
const fetched = (path) =>
  js(`fetch(${json(path)}).then(async (r) => ({ ok: r.ok, status: r.status, text: await r.text() }))`)
const stateOfHtml = (text) => /data-page-state="([a-z]+)"/.exec(text)?.[1]

await goto("/")

await test("SITE-010B", "Every registered route opens, with the page state its data say", async (check) => {
  for (const node of nodes) {
    const response = await fetched(node.path)
    check(response.ok, `${node.path} answered ${response.status}`)
    const wanted = expectedRows.find((row) => row.id === node.id)
    check(response.ok && stateOfHtml(response.text) !== undefined, `${node.path} has no page state`)
    // Editorial states depend on the build's content; the dist-demo build has no published entry either.
    check(stateOfHtml(response.text) === wanted.state, `${node.path}: page says ${stateOfHtml(response.text)}, data say ${wanted.state}`)
  }
  const unknown = await fetched("/external/")
  check(!unknown.ok, "/external/ answers")
})

await test("SITE-012", "Back and Forward keep the folders selected", async (check) => {
  await setViewport(1440, 900)
  const selected = () => js(`[...document.querySelectorAll(".gl-folder-tab[data-selected]")].map((t) => t.dataset.tabId)`)
  const path = () => js(`location.pathname`)
  await goto("/cv/")
  check(json(await selected()) === json(["cv", "overview:cv"]), `/cv/ selected ${json(await selected())}`)
  // Open CV > Research and then Lab with real clicks on the tabs' links.
  const clickLink = async (href) => {
    const point = await js(`(() => { const a = document.querySelector('.gl-folder-tab__label[href="${href}"]'); a.scrollIntoView({ inline: "center" }); const r = a.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y })
    for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: point.x, y: point.y, button: "left", clickCount: 1 })
    await waitForPath(href)
  }
  await clickLink("/cv/research/")
  check(json(await selected()) === json(["cv", "cv-research"]), `after click: ${json(await selected())}`)
  await clickLink("/lab/")
  check((await path()) === "/lab/" && json(await selected()) === json(["lab", "overview:lab"]), `Lab: ${await path()} ${json(await selected())}`)
  for (const [direction, wantPath, wantSelected] of [["back", "/cv/research/", ["cv", "cv-research"]], ["back", "/cv/", ["cv", "overview:cv"]], ["forward", "/cv/research/", ["cv", "cv-research"]]]) {
    const history = await send("Page.getNavigationHistory")
    const target = history.entries[history.currentIndex + (direction === "back" ? -1 : 1)]
    await send("Page.navigateToHistoryEntry", { entryId: target.id })
    await waitForPath(wantPath)
    check(json(await selected()) === json(wantSelected), `${direction} to ${wantPath}: ${json(await selected())}`)
  }
})

await test("SITE-035", "The site map covers every registered destination, with computed counts", async (check) => {
  await goto(SITE_MAP)
  const page = await js(`({
    rows: [...document.querySelectorAll("[data-site-map-row]")].map((li) => ({ id: li.dataset.siteMapRow, state: li.dataset.state, href: li.querySelector("a").getAttribute("href") })),
    counts: Object.fromEntries([...document.querySelectorAll("[data-count]")].map((el) => [el.dataset.count, Number(el.querySelector("dd").textContent)])),
    groups: [...document.querySelectorAll("[data-site-map-category]")].map((s) => [s.dataset.siteMapCategory, s.querySelectorAll("[data-site-map-row]").length]),
    h1: document.querySelectorAll("h1").length,
  })`)
  check(page.rows.length === nodes.length, `${page.rows.length} rows for ${nodes.length} folders`)
  check(json(page.rows.map((r) => r.id)) === json(expectedRows.map((r) => r.id)), "the rows are not in registry order")
  const wantGroups = ["core", "research", "blog-notes", "writing", "bearnard"].map((c) => [c, expectedRows.filter((r) => r.category === c).length])
  check(json(page.groups) === json(wantGroups), `groups ${json(page.groups)}, expected ${json(wantGroups)}`)
  const summary = summarize(expectedRows)
  check(page.counts.registered === nodes.length && page.counts.resolved === nodes.length, `registered/resolved ${json(page.counts)}`)
  check(page.counts.ready === summary.ready && page.counts.empty === summary.empty && page.counts.preparation === summary.preparation && page.counts.unavailable === summary.unavailable, `state counts ${json(page.counts)} vs ${json(summary)}`)
  check(page.counts.missing === 0 && page.counts.conflicts === 0, `missing/conflicts ${json(page.counts)}`)
  check(page.h1 === 1, `${page.h1} h1`)
})

await test("SITE-036", "Every link of the site map opens a page, and the map is reachable again", async (check) => {
  await goto(SITE_MAP)
  const hrefs = await js(`[...document.querySelectorAll("main a[href]:not([data-expect-missing])")].map((a) => a.getAttribute("href"))`)
  check(hrefs.length >= nodes.length + DEV_PAGES.length - 1, `${hrefs.length} links`)
  for (const href of new Set(hrefs)) {
    const response = await fetched(href)
    check(response.ok, `${href} answered ${response.status}`)
  }
  for (const page of DEV_PAGES) check(hrefs.includes(page.href) || page.href === SITE_MAP, `the development page ${page.href} is not linked`)
  // The list of development pages and the built ones agree: none is hidden, none is listed twice.
  const built = (await readdir(fileURLToPath(new URL("../dist-demo/_design/", import.meta.url)), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => `/_design/${entry.name}/`)
    .sort()
  const listed = DEV_PAGES.map((page) => page.href).sort()
  check(json(built) === json(listed), `built development pages ${json(built)} vs listed ${json(listed)}`)
  // Open one destination, then come back to the inspector.
  await goto("/lab/people/")
  await js("history.back()")
  await waitForPath(SITE_MAP)
  check((await js(`location.pathname`)) === SITE_MAP, "Back did not return to the site map")
})

await test("SITE-037", "Every row's state matches the page it links to", async (check) => {
  await goto(SITE_MAP)
  const rows = await js(`[...document.querySelectorAll("[data-site-map-row]")].map((li) => [li.querySelector("a").getAttribute("href"), li.dataset.state])`)
  for (const [href, state] of rows) {
    const response = await fetched(href)
    check(stateOfHtml(response.text) === state, `${href}: the map says ${state}, the page says ${stateOfHtml(response.text)}`)
  }
})

await test("SITE-038", "The site map is reached by clicking from the local homepage", async (check) => {
  await setViewport(1440, 900)
  await goto("/")
  const link = await js(`(() => { const a = [...document.querySelectorAll("[data-home-specimen-link] a")].find((x) => x.textContent.trim() === ${json(SITE_MAP_LABEL)}); if (!a) return null; a.scrollIntoView({ block: "center" }); const r = a.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
  check(link !== null, "the homepage has no Site Map link")
  if (link === null) return
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: link.x, y: link.y, button: "left", clickCount: 1 })
  await waitForPath(SITE_MAP)
  check((await js(`location.pathname`)) === SITE_MAP, "the click did not open the site map")
  const banner = await js(`!!document.querySelector("[data-site-map-banner]")`)
  check(banner, "the site map has no development banner")
  // The Publishing Workbench links to it as well.
  await goto("/_design/publishing/")
  check(await js(`[...document.querySelectorAll("[data-publishing-workbench] a")].some((a) => a.getAttribute("href") === ${json(SITE_MAP)})`), "the workbench does not link to the site map")
})

const SAMPLE = ["/", "/about/", "/contact/", "/schedule/", "/portfolio/", "/cv/", "/cv/publications/", "/lab/", "/lab/people/", "/blog/", "/lecture-notes/", "/lecture-notes/greenhouse/", "/writing/", "/writing/kosmos/", "/bearnards-area/", "/bearnards-area/photos/", SITE_MAP, "/_design/page-states/"]

await test("SITE-045", "Representative pages fit at seven widths with one heading and no extra row", async (check) => {
  for (const width of WIDTHS) {
    await setViewport(width, 900, width < 768)
    for (const path of SAMPLE) {
      await goto(path)
      const m = await js(`({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        h1: document.querySelectorAll("main h1").length,
        mains: document.querySelectorAll("main").length,
        rows: document.querySelectorAll(".gl-folder__strip").length,
        wide: [...document.querySelectorAll("main *")].filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && !el.closest("[data-scroll]")).length,
        img: [...document.querySelectorAll("main img")].map((i) => i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().right <= document.documentElement.clientWidth + 1),
      })`)
      check(m.overflow <= 0, `${path} at ${width}: the page scrolls sideways by ${m.overflow}`)
      check(m.h1 === 1 && m.mains === 1, `${path} at ${width}: ${m.h1} h1, ${m.mains} main`)
      check(m.rows <= 3, `${path} at ${width}: ${m.rows} rows of tabs`)
      check(m.wide === 0, `${path} at ${width}: ${m.wide} elements run past the viewport`)
      check(m.img.every(Boolean), `${path} at ${width}: an image is broken or clipped`)
    }
  }
  await setViewport(1440, 900)
})

await test("SITE-046", "Links in a state page are reachable and visibly focused from the keyboard", async (check) => {
  await setViewport(1280, 900)
  for (const path of ["/lecture-notes/", "/cv/", "/bearnards-area/"]) {
    await goto(path)
    // Tab through the page until a link inside <main> takes focus.
    let reached = false
    for (let i = 0; i < 80 && !reached; i++) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 })
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 })
      reached = await js(`document.activeElement?.closest("main") !== null && document.activeElement?.tagName === "A"`)
    }
    check(reached, `${path}: no link in the page body takes keyboard focus`)
    const focus = await js(`(() => { const el = document.activeElement; const s = getComputedStyle(el); return { visible: el.matches(":focus-visible"), outline: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 || s.boxShadow !== "none" } })()`)
    check(focus.visible && focus.outline, `${path}: the focused link shows no focus indicator ${json(focus)}`)
    const tabbables = await js(`[...document.querySelectorAll("main [tabindex]")].length`)
    check(tabbables === 0, `${path}: ${tabbables} extra tabindex in the page body`)
  }
})

await test("SITE-047", "Reduced motion, scaling text and the states hold up", async (check) => {
  await setViewport(390, 800, true)
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] })
  await goto("/bearnards-area/photos/")
  const anim = await js(`[...document.querySelectorAll("main *")].filter((el) => { const s = getComputedStyle(el); return (s.transitionDuration !== "0s" && s.transitionProperty !== "none") || s.animationName !== "none" }).length`)
  check(anim === 0, `${anim} elements in the page body animate or transition`)
  // Text enlarged to 200%: no sideways scrolling and the notice stays inside the page.
  await js(`document.documentElement.style.fontSize = "200%"`)
  await sleep(100)
  const big = await js(`({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, notice: document.querySelector("[data-state-notice]").getBoundingClientRect().right <= document.documentElement.clientWidth + 1 })`)
  check(big.overflow <= 0 && big.notice, `at 200% text: ${json(big)}`)
  await send("Emulation.setEmulatedMedia", { features: [] })
  await setViewport(1440, 900)
})

await finish()
