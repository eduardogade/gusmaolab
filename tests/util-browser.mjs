// Contact, downloads and the 404 page in a real, headless Chromium (P18, D-126 to D-128): the browser half of
// the UTIL checks. It serves dist-demo/ (`npm run demo:build`, run first by `npm run test:browser`)
// through a small server that answers the way GitHub Pages is documented to: a file or a directory's
// index.html when there is one, and otherwise the root 404.html with status 404. That is the one
// thing the harness's own server does not do. The real hosting is not involved.
//
// What it shows: the specimens render with real links, a download really saves the file with its name
// and content, an unknown address shows the 404 page with a 404 status and loads its stylesheet at any
// depth, the recovery links lead back into the archive, Back and Forward work, and the pages fit at seven
// widths with visible keyboard focus. What it does not show: that a mailto link opens a mail client or that
// any mail is delivered, GitHub Pages itself, Safari, Firefox, Chrome on Android, a screen reader. Without
// a browser or dist-demo/ every check is reported NOT RUN (exit 2).
import { existsSync } from "node:fs"
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { extname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"
import { json, sleep, startBrowser } from "./browser-harness.mjs"
import { DEMO_DOWNLOADS } from "../src/design/downloads-fixture.ts"
import { fileOf } from "../src/downloads/files.ts"
import { siteNavigation } from "../src/navigation/index.ts"
import { CONTACT_PAGE, DOWNLOADS_PAGE, MISSING_PAGE } from "../src/design/site-map.ts"

const IDS = ["UTIL-003B", "UTIL-009", "UTIL-019B", "UTIL-021B", "UTIL-022", "UTIL-025B", "UTIL-029B", "UTIL-032", "UTIL-051"]
const dist = fileURLToPath(new URL("../dist-demo/", import.meta.url))
if (!existsSync(join(dist, "404.html"))) {
  for (const id of IDS) console.log(`NOT RUN ${id}`)
  console.error("NOT RUN: dist-demo/ is not built; run `npm run demo:build`.")
  process.exit(2)
}
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".csv": "text/csv; charset=utf-8", ".webp": "image/webp", ".svg": "image/svg+xml" }
const server = createServer(async (request, response) => {
  let path = decodeURIComponent(new URL(request.url, "http://localhost").pathname)
  if (path.endsWith("/")) path += "index.html"
  const file = normalize(join(dist, path))
  const found = file.startsWith(dist) && existsSync(file) ? file : undefined
  const target = found ?? join(dist, "404.html")
  response.writeHead(found ? 200 : 404, { "Content-Type": TYPES[extname(target)] ?? "application/octet-stream" }).end(await readFile(target))
})
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
const origin = `http://127.0.0.1:${server.address().port}`

const { js, send, setViewport, goto, waitForPath, test, finish } = await startBrowser({ ids: IDS, timeout: 300_000, root: "dist-demo", external: origin })
const WIDTHS = [320, 390, 430, 768, 1024, 1280, 1440]
const metrics = () =>
  js(`({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    h1: document.querySelectorAll("main h1").length,
    wide: [...document.querySelectorAll("main *")].filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1).length,
    rows: document.querySelectorAll(".gl-folder__strip").length,
  })`)
const clickAt = async (selector) => {
  const point = await js(`(() => { const el = document.querySelector(${json(selector)}); if (!el) return null; el.scrollIntoView({ block: "center", inline: "center" }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
  if (point === null) throw new Error(`nothing matches ${selector}`)
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: point.x, y: point.y, button: "left", clickCount: 1 })
}
const navigationStatus = () => js(`performance.getEntriesByType("navigation")[0].responseStatus`)

await goto("/")

await test("UTIL-003B", "The contact specimen shows grouped, real email and profile links", async (check) => {
  await setViewport(1280, 900)
  await goto(CONTACT_PAGE)
  const page = await js(`({
    groups: [...document.querySelectorAll("[data-contact-use]")].map((s) => s.dataset.contactUse),
    mail: [...document.querySelectorAll('[data-channel-kind="email"] a')].map((a) => [a.getAttribute("href"), a.textContent.trim()]),
    profile: [...document.querySelectorAll('[data-channel-kind="profile"] a')].map((a) => [a.getAttribute("href"), a.getAttribute("rel"), a.hasAttribute("target")]),
    hints: [...document.querySelectorAll(".contact__about")].map((p) => p.textContent),
    controls: document.querySelectorAll("main form, main button, main input, main textarea").length,
    banner: !!document.querySelector("[data-contact-specimen]"),
  })`)
  check(json(page.groups) === json(["general", "collaboration", "professional", "technical"]), `groups ${json(page.groups)}`)
  check(page.mail.length === 3 && page.mail.every(([href, text]) => /^mailto:[^?\s]+@[^?\s]+$/.test(href) && text.includes(href.slice(7))), `mail ${json(page.mail)}`)
  check(page.profile.length === 1 && page.profile[0][0].startsWith("https://") && /noopener/.test(page.profile[0][1]) && page.profile[0][2] === false, `profile ${json(page.profile)}`)
  check(page.hints.some((h) => /Opens your email application/.test(h)) && page.hints.some((h) => /Opens an external site/.test(h)), "the links do not say where they go")
  check(page.controls === 0 && page.banner, `controls ${page.controls}, banner ${page.banner}`)
  // Activating a mailto link must not navigate the page away (the browser hands it to a mail application).
  const before = await js(`location.href`)
  await clickAt('[data-channel-kind="email"] a')
  await sleep(300)
  check((await js(`location.href`)) === before, "a mailto link navigated the page")
})

await test("UTIL-009", "Contact (real and specimen) fits at seven widths, with long addresses wrapping", async (check) => {
  for (const width of WIDTHS) {
    await setViewport(width, 900, width < 768)
    for (const path of ["/contact/", CONTACT_PAGE]) {
      await goto(path)
      const m = await metrics()
      check(m.overflow <= 0 && m.wide === 0, `${path} at ${width}: overflow ${m.overflow}, ${m.wide} elements past the viewport`)
      check(m.h1 === 1 && m.rows <= 3, `${path} at ${width}: ${m.h1} h1, ${m.rows} rows`)
    }
    await goto(CONTACT_PAGE)
    const links = await js(`[...document.querySelectorAll(".contact__link")].map((a) => { const r = a.getBoundingClientRect(); return r.right <= document.documentElement.clientWidth + 1 && r.height >= 16 })`)
    check(links.every(Boolean), `at ${width}: a contact link is cut off`)
  }
  await setViewport(1440, 900)
})

await test("UTIL-019B", "A download link really saves the file, with its name and content", async (check) => {
  const folder = await mkdtemp(join(tmpdir(), "gusmaolab-dl-browser-"))
  try {
    await setViewport(1280, 900)
    await goto(DOWNLOADS_PAGE)
    await send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: folder })
    for (const resource of DEMO_DOWNLOADS) {
      await clickAt(`[data-download="${resource.id}"] a`)
      let saved = false
      for (let i = 0; i < 60 && !saved; i++) {
        await sleep(100)
        saved = (await readdir(folder)).includes(resource.fileName)
      }
      check(saved, `${resource.fileName} was not saved (folder holds ${json(await readdir(folder))})`)
      if (saved) {
        const bytes = await readFile(join(folder, resource.fileName))
        check(bytes.equals(await readFile(fileOf(resource, "demo"))), `${resource.fileName}: the saved bytes differ from the fixture`)
      }
    }
    const names = await readdir(folder)
    check(!names.some((n) => n.endsWith(".crdownload")), `an unfinished download: ${json(names)}`)
    check((await js(`location.pathname`)) === DOWNLOADS_PAGE, "a download navigated the page away")
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
})

await test("UTIL-021B", "Download links resolve under the served URL, with the right type, and the planned item has none", async (check) => {
  await goto(DOWNLOADS_PAGE)
  const links = await js(`[...document.querySelectorAll('[data-download-state="available"] a')].map((a) => ({ href: a.getAttribute("href"), name: a.getAttribute("download"), abs: a.href }))`)
  check(links.length === DEMO_DOWNLOADS.length, `${links.length} links`)
  for (const link of links) {
    const r = await js(`fetch(${json(link.href)}).then(async (x) => ({ status: x.status, type: x.headers.get("content-type"), len: (await x.text()).length }))`)
    check(r.status === 200 && r.len > 20, `${link.href}: ${json(r)}`)
    check(link.abs === `${origin}${link.href}` && link.href.startsWith("/demo-downloads/"), `${link.href} does not resolve under the origin`)
  }
  check((await js(`[...document.querySelectorAll('[data-download-state="planned"] a, [data-download-state="planned"] [download]')].length`)) === 0, "a planned item has a link")
  const meta = await js(`[...document.querySelectorAll('[data-download-state="available"] .dl__meta')].map((p) => p.textContent.replace(/\\s+/g, " ").trim())`)
  check(meta.every((m) => /\d+ B|KB/.test(m)) && meta.some((m) => /Text/.test(m)) && meta.some((m) => /CSV/.test(m)), `metadata ${json(meta)}`)
})

await test("UTIL-022", "The download list fits at seven widths with legible metadata", async (check) => {
  for (const width of WIDTHS) {
    await setViewport(width, 900, width < 768)
    await goto(DOWNLOADS_PAGE)
    const m = await metrics()
    check(m.overflow <= 0 && m.wide === 0 && m.h1 === 1, `at ${width}: ${json(m)}`)
    const overlap = await js(`[...document.querySelectorAll(".dl__item")].some((item) => {
      const boxes = [...item.querySelectorAll(".dl__name a, .dl__name, .dl__about, .dl__meta span")].map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0);
      const lines = [...item.querySelectorAll(".dl__about, .dl__meta")].map((el) => el.getBoundingClientRect());
      return lines.some((a, i) => lines.some((b, j) => i < j && a.bottom > b.top + 1 && a.top < b.bottom - 1 && a.right > b.left && a.left < b.right));
    })`)
    check(!overlap, `at ${width}: metadata overlaps the description`)
    const size = await js(`parseFloat(getComputedStyle(document.querySelector(".dl__meta")).fontSize)`)
    check(size >= 13, `at ${width}: the metadata is ${size}px`)
  }
  await setViewport(1440, 900)
})

await test("UTIL-025B", "An unknown address shows the 404 page with a 404 status, at any depth", async (check) => {
  await setViewport(1280, 900)
  for (const path of [MISSING_PAGE, "/cv/nothing-here/", "/a/b/c/d/e/", "/external/", "/missing.pdf"]) {
    await goto(path)
    check((await navigationStatus()) === 404, `${path}: status ${await navigationStatus()}`)
    const page = await js(`({ h1: document.querySelector("h1")?.textContent.trim(), notFound: !!document.querySelector("[data-not-found]"), title: document.title, path: location.pathname,
      font: getComputedStyle(document.querySelector("h1")).fontFamily, bg: getComputedStyle(document.querySelector(".gl-folder__paper")).backgroundColor, tabs: document.querySelectorAll(".gl-folder-tab").length })`)
    check(page.notFound && /isn.t in the archive/.test(page.h1) && page.title === "Page not found · GusmaoLab", `${path}: ${json(page)}`)
    check(page.path === path, `${path}: the address changed to ${page.path}`)
    check(page.tabs === 0 && page.bg !== "rgba(0, 0, 0, 0)", `${path}: styles missing or a tab drawn: ${json(page)}`)
    check(!/^(Times|serif)/i.test(page.font), `${path}: the heading font did not load (${page.font})`)
  }
  // Valid routes are not 404, including an empty collection and a page in preparation.
  for (const path of ["/", "/contact/", "/writing/kosmos/", "/cv/teaching/"]) {
    await goto(path)
    check((await navigationStatus()) === 200, `${path}: status ${await navigationStatus()}`)
  }
})

await test("UTIL-029B", "The 404 page leads back into the archive, and Back and Forward work", async (check) => {
  await setViewport(1280, 900)
  await goto("/")
  await goto(MISSING_PAGE)
  await clickAt(".err__home")
  await waitForPath("/")
  const home = await js(`({ path: location.pathname, selected: [...document.querySelectorAll(".gl-folder-tab[data-selected]")].map((t) => t.dataset.tabId) })`)
  check(home.path === "/" && json(home.selected) === json(["home"]), `Home: ${json(home)}`)
  await js(`history.back()`)
  await waitForPath(MISSING_PAGE)
  check((await js(`!!document.querySelector("[data-not-found]")`)), "Back did not return to the 404 page")
  for (const id of ["portfolio", "lecture-notes", "writing", "contact"]) {
    const href = siteNavigation.node(id).path
    await clickAt(`.err__list a[href="${href}"]`)
    await waitForPath(href)
    const selected = await js(`[...document.querySelectorAll(".gl-folder-tab[data-selected]")].map((t) => t.dataset.tabId)`)
    check(selected.includes(id) && (await navigationStatus()) === 200, `${href}: selected ${json(selected)}`)
    await js(`history.back()`)
    await waitForPath(MISSING_PAGE)
  }
  await js(`history.forward()`)
  await sleep(300)
  check((await js(`location.pathname`)) !== MISSING_PAGE, "Forward did not leave the 404 page")
  // Direct access to Contact, with no history behind it.
  await goto("/contact/")
  check((await js(`document.querySelector("h1").textContent.trim()`)) === "Contact", "direct access to Contact failed")
})

await test("UTIL-032", "The 404 page fits at seven widths, and offers its recovery links at once", async (check) => {
  for (const width of WIDTHS) {
    await setViewport(width, 800, width < 768)
    await goto(MISSING_PAGE)
    const m = await metrics()
    check(m.overflow <= 0 && m.wide === 0 && m.h1 === 1 && m.rows === 0, `at ${width}: ${json(m)}`)
    const links = await js(`[...document.querySelectorAll("main a")].map((a) => { const r = a.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, right: r.right, h: r.height } })`)
    check(links.length >= 5 && links.every((l) => l.right <= width + 1 && l.h >= 16), `at ${width}: a link is cut off ${json(links)}`)
    check(links.slice(0, 2).every((l) => l.bottom < 800 * 2), `at ${width}: the first links are far below the heading`)
    const heading = await js(`(() => { const r = document.querySelector("h1").getBoundingClientRect(); return [r.left, r.right, parseFloat(getComputedStyle(document.querySelector("h1")).fontSize)] })()`)
    check(heading[0] >= 0 && heading[1] <= width + 1 && heading[2] >= 24, `at ${width}: the heading is cut off or small ${json(heading)}`)
  }
  await setViewport(1440, 900)
})

await test("UTIL-051", "Keyboard focus, reduced motion and no-JavaScript behaviour of the utility pages", async (check) => {
  await setViewport(1280, 900)
  for (const path of [MISSING_PAGE, CONTACT_PAGE, DOWNLOADS_PAGE]) {
    await goto(path)
    let reached = false
    for (let i = 0; i < 60 && !reached; i++) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 })
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 })
      reached = await js(`document.activeElement?.tagName === "A" && !!document.activeElement.closest("main")`)
    }
    check(reached, `${path}: no link in the page takes keyboard focus`)
    const focus = await js(`(() => { const el = document.activeElement; const s = getComputedStyle(el); return el.matches(":focus-visible") && ((s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none") })()`)
    check(focus, `${path}: the focused link shows no indicator`)
  }
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] })
  await goto(MISSING_PAGE)
  check((await js(`[...document.querySelectorAll("main *")].filter((el) => { const s = getComputedStyle(el); return (s.transitionDuration !== "0s" && s.transitionProperty !== "none") || s.animationName !== "none" }).length`)) === 0, "the 404 page animates")
  await send("Emulation.setEmulatedMedia", { features: [] })
  // Without JavaScript: the 404 page is plain HTML with no script, so it reads the same with scripts off.
  await send("Emulation.setScriptExecutionDisabled", { value: true })
  try {
    await goto(MISSING_PAGE)
    const text = await js(`document.body.innerText`)
    check(/isn't in the archive/.test(text) && /Start again from Home/.test(text) && /Portfolio/.test(text), `with scripts off the page says ${json(text.slice(0, 120))}`)
  } finally {
    await send("Emulation.setScriptExecutionDisabled", { value: false })
  }
  await setViewport(1440, 900)
})

server.close()
await finish()
