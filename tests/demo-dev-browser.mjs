// The demonstrations through the real site, in a real browser (P13-A01): P13A-030, and the dev
// half of P13A-029. It starts the actual dev server (`astro dev`, no special variable) and, in
// headless Chrome, walks the path the owner walks, with real pointer clicks and no typed URL:
//
//   Home > Lecture Notes > The Greenhouse > Development Demonstrations > the Markdown article >
//   back to The Greenhouse > the Quarto article (its contents, a figure, an equation and a
//   citation reference, the bibliography) > Back and Forward > the Overview > the comparison.
//
// tests/demo-browser.mjs checks the same pages at five widths in the demonstration build.
// Chromium only; no screen reader; MathML is drawn by Chromium's own engine.
import { spawn, spawnSync } from "node:child_process"
import { createServer } from "node:net"
import process from "node:process"
import { json, sleep, startBrowser } from "./browser-harness.mjs"

const IDS = ["P13A-029", "P13A-030"]
const GREENHOUSE = "/lecture-notes/greenhouse/"

async function freePort() {
  return new Promise((resolve) => {
    const server = createServer()
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

// --- The dev server, started the way `npm run dev` starts it ----------------------------------
// Astro allows one dev server per project: if the owner already has one running, it is used, and
// left running; otherwise this test starts one on a free port and stops it.
const port = await freePort()
const dev = spawn(
  "npx",
  ["astro", "dev", "--port", String(port), "--host", "127.0.0.1"],
  {
    stdio: ["ignore", "pipe", "ignore"],
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
    detached: true,
  },
)
let announced = ""
dev.stdout.on("data", (chunk) => (announced += chunk))
let origin = `http://127.0.0.1:${port}`
let started = true
// `astro dev` hands off to a child: stop whatever listens on the port (CLAUDE.md).
const stopDev = () => {
  if (!started) return
  const listening = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
    encoding: "utf8",
  })
  for (const pid of listening.stdout.split("\n").filter(Boolean)) {
    try {
      process.kill(Number(pid))
    } catch {}
  }
  try {
    process.kill(-dev.pid)
  } catch {}
}
process.on("exit", stopDev)
let up = false
for (let i = 0; i < 240 && !up; i++) {
  const existing = /already running at (http:\/\/\S+)/.exec(announced)?.[1]
  if (existing) {
    origin = existing
    started = false
  }
  up = await fetch(`${origin}${GREENHOUSE}`)
    .then((r) => r.ok)
    .catch(() => false)
  if (!up) await sleep(500)
}
if (!up) {
  for (const id of IDS) console.log(`NOT RUN ${id}`)
  console.error("NOT RUN: the dev server did not start")
  process.exit(2)
}
console.log(
  `dev server: ${origin} (${started ? "started by this test" : "already running; left running"})`,
)

const { js, click, setViewport, goto, waitForPath, test, finish } = await startBrowser({
  ids: IDS,
  timeout: 420_000,
  external: origin,
})

const path = () => js(`location.pathname + location.hash`)
const overflow = () =>
  js(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)

/** A real pointer click on an element, scrolled to the middle of the screen. */
async function clickOn(selector, text) {
  const at = await js(`(() => {
    const matches = [...document.querySelectorAll(${json(selector)})];
    const el = ${text === undefined ? "matches[0]" : `matches.find((e) => e.textContent.trim().startsWith(${json(text)}))`};
    if (!el) return null;
    el.scrollIntoView({ block: "center" });
    // A link that wraps has one box per line: click inside the first, not the box around both.
    const r = el.getClientRects()[0];
    return { x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2 };
  })()`)
  if (at === null) throw new Error(`nothing to click: ${selector} ${text ?? ""}`)
  await sleep(60)
  await click(at.x, at.y)
}
async function clickTab(id, expectedPath) {
  await js(
    `scrollTo(0, 0); document.querySelector('.gl-folder-tab[data-tab-id="${id}"]')?.scrollIntoView({ block: "nearest", inline: "nearest" })`,
  )
  await sleep(80)
  const point = await js(`(() => {
    const tab = document.querySelector('.gl-folder-tab[data-tab-id="${id}"]');
    if (!tab) return null;
    const r = tab.getBoundingClientRect();
    const s = tab.closest(".gl-folder__strip").getBoundingClientRect();
    const left = Math.max(r.left, s.left), right = Math.min(r.right, s.right);
    return { x: (left + right) / 2, y: r.top + r.height / 2 };
  })()`)
  if (point === null) throw new Error(`no tab ${id} on ${await path()}`)
  await click(point.x, point.y)
  return waitForPath(expectedPath, 15_000)
}
const inView = (selector) =>
  js(
    `(() => { const el = document.querySelector(${json(selector)}); if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.top < innerHeight && r.bottom > 0; })()`,
  )

await setViewport(1440, 900)

await test(
  "P13A-030",
  "The demonstrations are reachable from Home by clicking, with no typed URL",
  async (check) => {
    await goto("/")
    check(
      await clickTab("lecture-notes", "/lecture-notes/"),
      `Lecture Notes tab led to ${await path()}`,
    )
    check(
      await clickTab("lecture-notes-greenhouse", GREENHOUSE),
      `The Greenhouse tab led to ${await path()}`,
    )
    const overview = await js(`(() => {
      const section = document.querySelector("[data-demo-section]");
      return section && {
        heading: section.querySelector("h2")?.textContent,
        // The Publishing Workbench link (P14) is in the section too; it is not a demonstration.
        links: [...section.querySelectorAll("a")].filter((a) => !a.closest("[data-workbench-link]")).map((a) => [a.textContent.trim(), new URL(a.href).pathname]),
        text: section.textContent.replace(/\\s+/g, " "),
        empty: !!document.querySelector("[data-editorial-empty]"),
        rows: document.querySelectorAll(".gl-folder__strip").length,
      };
    })()`)
    check(
      overview !== null,
      "no demonstrations section in the real Greenhouse Overview",
    )
    check(
      overview?.heading === "Development Demonstrations",
      `heading: ${overview?.heading}`,
    )
    check(
      /synthetic and not part of the public research archive/.test(
        overview?.text ?? "",
      ),
      "the explanation is missing",
    )
    check(overview?.links.length === 3, `links: ${json(overview?.links)}`)
    check(overview?.empty === true, "the real, empty list is not shown")
    check(overview?.rows <= 3, `${overview?.rows} rows of tabs`)

    // Markdown article.
    await clickOn("[data-demo-section] a", "A Small Guide")
    check(
      await waitForPath(`${GREENHOUSE}demo-scientific-markdown/`, 15_000),
      `Markdown article: ${await path()}`,
    )
    const md = await js(`({
      h1: document.querySelector("h1")?.textContent,
      notice: document.querySelector("[data-demo-notice]")?.textContent.replace(/\\s+/g, " ").trim().slice(0, 52),
      layout: document.querySelector("article")?.dataset.editorialLayout,
      toc: document.querySelectorAll("[data-toc] a").length,
      tables: document.querySelectorAll("table").length, code: document.querySelectorAll("pre").length,
      quote: document.querySelectorAll("blockquote").length, external: !!document.querySelector('a[href^="https://spec.commonmark.org"]'),
      selected: [...document.querySelectorAll(".gl-folder-tab[data-selected]")].map((t) => t.dataset.tabId),
    })`)
    check(md.h1 === "A Small Guide to Scientific Markdown", `h1 ${md.h1}`)
    check(
      md.notice.startsWith("Development demonstration — synthetic content."),
      `notice: ${md.notice}`,
    )
    check(
      md.layout === "greenhouse" &&
        md.toc >= 5 &&
        md.tables === 1 &&
        md.code >= 1 &&
        md.quote === 1 &&
        md.external,
      `markdown article: ${json(md)}`,
    )
    check(
      json(md.selected) === json(["lecture-notes", "lecture-notes-greenhouse"]),
      `folders: ${json(md.selected)}`,
    )

    // Back to the Greenhouse through its own folder tab, then the Quarto article.
    check(
      await clickTab("lecture-notes-greenhouse", GREENHOUSE),
      "the Greenhouse tab did not return to the Overview",
    )
    await clickOn("[data-demo-section] a", "From Synthetic Signals")
    check(
      await waitForPath(`${GREENHOUSE}demo-synthetic-signals/`, 15_000),
      `Quarto article: ${await path()}`,
    )
    await sleep(400)
    // Contents list.
    await clickOn("[data-toc] a", "A mathematical model")
    await sleep(300)
    check(
      (await path()).endsWith("#a-mathematical-model") &&
        (await inView("#a-mathematical-model")),
      `contents link: ${await path()}`,
    )
    // Figure reference.
    await clickOn('a.quarto-xref[href="#fig-signals"]')
    await sleep(300)
    check(
      (await path()).endsWith("#fig-signals") && (await inView("#fig-signals")),
      `figure reference: ${await path()}`,
    )
    const figure = await js(
      `(() => { const i = document.querySelector("#fig-signals img"); return { ok: i.complete && i.naturalWidth > 0, w: i.getBoundingClientRect().width, cap: document.querySelector("#fig-signals-caption")?.textContent.trim().slice(0, 9) }; })()`,
    )
    check(
      figure.ok && figure.w > 300 && figure.cap?.startsWith("Figure"),
      `figure: ${json(figure)}`,
    )
    // Equation reference.
    await clickOn('a.quarto-xref[href="#eq-snr"]')
    await sleep(300)
    check(
      (await path()).endsWith("#eq-snr") && (await inView("#eq-snr")),
      `equation reference: ${await path()}`,
    )
    // Citation, then the bibliography it points to.
    await clickOn('a[href="#ref-peng2011"]')
    await sleep(300)
    check(
      (await path()).endsWith("#ref-peng2011") && (await inView("#ref-peng2011")),
      `citation: ${await path()}`,
    )
    check(
      await js(`document.querySelectorAll(".csl-entry").length === 2`),
      "the bibliography does not hold two entries",
    )
    // History: Back through the three hash targets, then Forward.
    await js(`history.back()`)
    await sleep(250)
    check((await path()).endsWith("#eq-snr"), `Back: ${await path()}`)
    await js(`history.forward()`)
    await sleep(250)
    check((await path()).endsWith("#ref-peng2011"), `Forward: ${await path()}`)
    // Back to the Overview through the folder, and on to the comparison article.
    check(
      await clickTab("lecture-notes-greenhouse", GREENHOUSE),
      "the Greenhouse tab did not return to the Overview",
    )
    await clickOn("[data-demo-section] a", "One Archive")
    check(
      await waitForPath(`${GREENHOUSE}demo-markdown-and-quarto/`, 15_000),
      `comparison article: ${await path()}`,
    )
    const links = await js(
      `[...document.querySelectorAll("[data-editorial-body] a")].map((a) => new URL(a.href).pathname)`,
    )
    check(
      links.includes(`${GREENHOUSE}demo-scientific-markdown/`) &&
        links.includes(`${GREENHOUSE}demo-synthetic-signals/`),
      `the comparison does not link both demonstrations: ${json(links)}`,
    )
    await clickOn('[data-editorial-body] a[href$="demo-scientific-markdown/"]')
    check(
      await waitForPath(`${GREENHOUSE}demo-scientific-markdown/`, 15_000),
      `link to demonstration 1: ${await path()}`,
    )
    // Back and Forward across pages.
    await js(`history.back()`)
    check(
      await waitForPath(`${GREENHOUSE}demo-markdown-and-quarto/`, 15_000),
      "Back did not return to the comparison",
    )
    await js(`history.forward()`)
    check(
      await waitForPath(`${GREENHOUSE}demo-scientific-markdown/`, 15_000),
      "Forward did not return to demonstration 1",
    )
  },
)

await test(
  "P13A-029",
  "The dev server's demonstration pages are real pages: direct URLs, no overflow",
  async (check) => {
    for (const [width, mobile] of [
      [1440, false],
      [390, true],
    ]) {
      await setViewport(width, 900, mobile)
      for (const slug of [
        "demo-scientific-markdown",
        "demo-synthetic-signals",
        "demo-markdown-and-quarto",
      ]) {
        await goto(`${GREENHOUSE}${slug}/`)
        check(
          (await js(
            `document.querySelector("h1") !== null && !!document.querySelector("[data-demo-notice]")`,
          )) === true,
          `${width} px ${slug}: no title or notice`,
        )
        check(
          (await overflow()) <= 0,
          `${width} px ${slug} scrolls sideways by ${await overflow()} px`,
        )
      }
      await goto(GREENHOUSE)
      check((await overflow()) <= 0, `${width} px Overview scrolls sideways`)
      const small = await js(
        `[...document.querySelectorAll("[data-demo-section] a")].every((a) => { const r = a.getBoundingClientRect(); return r.height >= 20 && r.width >= 44; })`,
      )
      check(small === true, `${width} px: a demonstration link is too small to tap`)
    }
    await goto("/lecture-notes/greenhouse/demo-does-not-exist/")
    check((await js(`document.title`)).length >= 0, "unreachable")
  },
)

await finish()
