// The Publishing Workbench through the real dev server, in headless Chrome (P14, D-110):
// AUTH-031 (the owner's journey, by real clicks, no typed URL), AUTH-032 (the Greenhouse Overview
// link) and AUTH-045 (the workbench at five widths, no sideways scroll, commands that can be
// copied). It starts `astro dev` the way `npm run dev` does, or uses the one that is running.
// Chromium only; no screen reader. The built half of these checks is tests/authoring-build.mjs.
import { spawn, spawnSync } from "node:child_process"
import { createServer } from "node:net"
import process from "node:process"
import { json, sleep, startBrowser } from "./browser-harness.mjs"

const IDS = ["AUTH-031", "AUTH-032", "AUTH-045"]
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
    const x = (left + right) / 2, y = r.top + r.height / 2;
    // What the click will hit, for a failure to explain itself (first GitHub run, P22-A01).
    const hit = document.elementFromPoint(x, y);
    const what = hit ? hit.tagName.toLowerCase() + (hit.className ? "." + String(hit.className).split(" ")[0] : "") + (hit.closest("[data-tab-id]") ? "[" + hit.closest("[data-tab-id]").dataset.tabId + "]" : "") : null;
    return { x, y, tab: [Math.round(r.left), Math.round(r.right)], strip: [Math.round(s.left), Math.round(s.right)], hit: what };
  })()`)
  if (point === null) throw new Error(`no tab ${id} on ${await path()}`)
  lastClick = { id, ...point }
  await click(point.x, point.y)
  return waitForPath(expectedPath, 15_000)
}
let lastClick = null
const inView = (selector) =>
  js(
    `(() => { const el = document.querySelector(${json(selector)}); if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.top < innerHeight && r.bottom > 0; })()`,
  )

await setViewport(1440, 900)

const WORKBENCH = "/_design/publishing/"
const folders = () =>
  js(`[...document.querySelectorAll(".gl-folder-tab[data-selected]")].map((t) => t.dataset.tabId)`)

await test("AUTH-031", "The workbench is reachable from Home by clicking, and its pages work", async (check) => {
  await goto("/")
  check(await clickTab("lecture-notes", "/lecture-notes/"), `Lecture Notes led to ${await path()}`)
  check(await clickTab("lecture-notes-greenhouse", GREENHOUSE), `The Greenhouse led to ${await path()}`)
  // AUTH-032, inside the journey: the link is on the real Overview, in the demonstration section.
  const link = await js(`(() => {
    const a = document.querySelector("[data-demo-section] [data-workbench-link] a");
    return a && { text: a.textContent.trim(), path: new URL(a.href).pathname };
  })()`)
  check(link?.text === "Publishing Workbench" && link.path === WORKBENCH, `the Overview link: ${json(link)}`)
  await clickOn("[data-workbench-link] a", "Publishing Workbench")
  check(await waitForPath(WORKBENCH, 15_000), `the workbench: ${await path()}`)
  const overview = await js(`({
    title: document.title,
    h1: [...document.querySelectorAll("h1")].map((h) => h.textContent),
    banner: !!document.querySelector("[data-publishing-workbench]"),
    cards: document.querySelectorAll("[data-collection-card]").length,
    commands: [...document.querySelectorAll("[data-command]")].map((c) => c.dataset.command),
    checks: document.querySelectorAll("[data-check]").length,
    states: [...document.querySelectorAll("[data-state]")].map((s) => s.dataset.state),
    rows: document.querySelectorAll(".gl-folder__strip").length,
  })`)
  check(overview.title === "Publishing Workbench · GusmaoLab", `title: ${overview.title}`)
  check(json(overview.h1) === json(["Publishing Workbench"]), `h1: ${json(overview.h1)}`)
  check(overview.banner && overview.cards === 8 && overview.checks >= 15, `content: ${json(overview)}`)
  check(json(overview.commands) === json(["new", "validate", "preview", "publish", "archive"]), `commands: ${json(overview.commands)}`)
  check(json(overview.states) === json(["draft", "published", "archived"]), `lifecycle: ${json(overview.states)}`)
  check(overview.rows <= 3, `${overview.rows} rows of tabs: a fourth level appeared`)
  check(json(await folders()) === json(["lecture-notes", "lecture-notes-greenhouse"]), `folders: ${json(await folders())}`)
  // Commands can be copied: real text in a focusable block that is not unselectable.
  const copyable = await js(`(() => {
    const pre = document.querySelector('[data-command="publish"] pre');
    const style = getComputedStyle(pre.querySelector("code"));
    return { text: pre.textContent.trim(), focusable: pre.tabIndex === 0, select: style.userSelect };
  })()`)
  check(/^npm run content:publish -- --collection greenhouse --slug my-article --date /.test(copyable.text) && copyable.focusable && copyable.select !== "none", `copyable: ${json(copyable)}`)

  // The workflow example.
  await clickOn("[data-publishing-workbench] a", "Workflow example")
  check(await waitForPath(`${WORKBENCH}workflow/`, 15_000), `workflow: ${await path()}`)
  const workflow = await js(`({
    h1: document.querySelector("h1")?.textContent,
    blocks: document.querySelectorAll("[data-workbench-transcript] pre").length,
    text: document.querySelector("[data-workbench-transcript]")?.textContent ?? "",
    current: document.querySelector('[data-publishing-workbench] [aria-current="page"]')?.textContent,
  })`)
  check(workflow.h1 === "An Example of the GusmaoLab Publishing Workflow", `h1: ${workflow.h1}`)
  check(workflow.blocks >= 10 && /Publication validation failed/.test(workflow.text) && /Dry run: no files were modified/.test(workflow.text) && /Status now: archived/.test(workflow.text), `transcript: ${workflow.blocks} blocks`)
  check(workflow.current === "Workflow example", `current page marker: ${workflow.current}`)
  check(json(await folders()) === json(["lecture-notes", "lecture-notes-greenhouse"]), `workflow folders: ${json(await folders())}`)

  // The draft preview, drawn by the real layout.
  await clickOn("[data-publishing-workbench] a", "Draft preview")
  check(await waitForPath(`${WORKBENCH}draft-example/`, 15_000), `draft: ${await path()}`)
  const draft = await js(`({
    status: document.querySelector("article")?.dataset.editorialStatus,
    layout: document.querySelector("article")?.dataset.editorialLayout,
    notice: [...document.querySelectorAll(".ed__notice")].map((n) => n.textContent.replace(/\\s+/g, " ").trim().slice(0, 60)),
    h1: document.querySelector("h1")?.textContent,
    indexed: !!document.querySelector("[data-editorial-index]"),
  })`)
  check(draft.status === "draft" && draft.layout === "greenhouse", `draft: ${json(draft)}`)
  check(draft.notice.some((n) => /^Draft preview: this entry is not published/.test(n)) && draft.notice.some((n) => /^Development demonstration/.test(n)), `notices: ${json(draft.notice)}`)

  // Back to the workbench, then the two demonstration articles, then back.
  await clickOn("[data-publishing-workbench] a", "Publishing Workbench")
  check(await waitForPath(WORKBENCH, 15_000), `back to the workbench: ${await path()}`)
  await clickOn('[data-workbench-section="examples"] a', "A Small Guide")
  check(await waitForPath(`${GREENHOUSE}demo-scientific-markdown/`, 15_000), `Markdown demonstration: ${await path()}`)
  await js(`history.back()`)
  check(await waitForPath(WORKBENCH, 15_000), `Back: ${await path()}`)
  await clickOn('[data-workbench-section="examples"] a', "From Synthetic Signals")
  check(await waitForPath(`${GREENHOUSE}demo-synthetic-signals/`, 15_000), `Quarto demonstration: ${await path()}`)
  await js(`history.back()`)
  check(await waitForPath(WORKBENCH, 15_000), "Back to the workbench")
  await js(`history.forward()`)
  check(await waitForPath(`${GREENHOUSE}demo-synthetic-signals/`, 15_000), "Forward to the Quarto demonstration")
  // Home: the Greenhouse folder tab returns to the Overview, whose link is still there.
  check(await clickTab("lecture-notes-greenhouse", GREENHOUSE), `the Greenhouse tab did not return to the Overview (on ${await path()}; the click: ${json(lastClick)})`)
  check(await inView("[data-workbench-link]") || (await js(`!!document.querySelector("[data-workbench-link]")`)), "the link is gone from the Overview")
  // And the workbench's own way back.
  await clickOn("[data-workbench-link] a", "Publishing Workbench")
  await waitForPath(WORKBENCH, 15_000)
  await clickOn('[data-workbench-section="examples"] a', "Back to The Greenhouse")
  check(await waitForPath(GREENHOUSE, 15_000), `Back to The Greenhouse: ${await path()}`)
})

await test("AUTH-032", "The Greenhouse Overview is unchanged apart from the workbench link", async (check) => {
  await goto(GREENHOUSE)
  const page = await js(`({
    h1: document.querySelector("h1")?.textContent,
    empty: !!document.querySelector("[data-editorial-empty]"),
    sections: [...document.querySelectorAll("[data-demo-section] h2")].map((h) => h.textContent),
    demos: document.querySelectorAll("[data-demo-section] .ed-index__list > li").length,
    links: document.querySelectorAll("[data-workbench-link]").length,
    rows: document.querySelectorAll(".gl-folder__strip").length,
    tabs: [...document.querySelectorAll(".gl-folder__strip")[0].querySelectorAll(".gl-folder-tab")].length,
  })`)
  check(page.h1 === "The Greenhouse" && page.empty === true, `the real Overview: ${json(page)}`)
  check(json(page.sections) === json(["Development Demonstrations"]) && page.demos === 3 && page.links === 1, `the demonstrations section: ${json(page)}`)
  check(page.tabs === 11, `${page.tabs} global tabs`)
})

await test("AUTH-045", "The workbench at 320, 390, 768, 1280 and 1440 px: no sideways scroll", async (check) => {
  for (const [width, mobile] of [[320, true], [390, true], [768, false], [1280, false], [1440, false]]) {
    await setViewport(width, 900, mobile)
    for (const page of [WORKBENCH, `${WORKBENCH}workflow/`, `${WORKBENCH}draft-example/`]) {
      await goto(page)
      await sleep(150)
      check((await overflow()) <= 0, `${width} px ${page} scrolls sideways by ${await overflow()} px`)
      const fit = await js(`(() => {
        const wide = [...document.querySelectorAll("main *, [data-editorial-body] *")].filter((e) => {
          const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && !e.closest("pre") && !e.closest(".gl-folder__strip");
        });
        return wide.slice(0, 3).map((e) => e.tagName + "." + e.className);
      })()`)
      check(fit.length === 0, `${width} px ${page}: elements past the screen's edge: ${json(fit)}`)
    }
    await goto(WORKBENCH)
    // A code block that is wider than the screen scrolls inside itself.
    const pre = await js(`(() => { const p = document.querySelector('[data-command="new"] pre:nth-of-type(2)'); return { client: p.clientWidth, scroll: p.scrollWidth, overflowX: getComputedStyle(p).overflowX, max: innerWidth }; })()`)
    check(pre.client <= pre.max && (pre.scroll <= pre.client || pre.overflowX === "auto"), `${width} px: a command block: ${json(pre)}`)
    const cards = await js(`[...document.querySelectorAll("[data-collection-card]")].map((c) => Math.round(c.getBoundingClientRect().width))`)
    check(cards.length === 8 && cards.every((w) => w >= 160), `${width} px: card widths ${json(cards)}`)
    check((await js(`[...document.querySelectorAll(".gl-folder__strip")].length`)) <= 3, `${width} px: more than three rows of tabs`)
  }
})

await finish()
