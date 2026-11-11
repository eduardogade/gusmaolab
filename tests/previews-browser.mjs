// Browser tests for the folder previews (P07): PREV-005 and PREV-008 to PREV-014, which
// cover the brief's interaction cases A to I. The markup and model tests in
// tests/previews.mjs cannot show that pointer, keyboard and touch behave; these drive a
// real, headless Chromium.
//
// No dependency: Node's http module serves dist/, and Node's WebSocket speaks the Chrome
// DevTools protocol. Run `npm run build`, then `npm run test:browser`. Set CHROME_PATH if
// Chrome or Chromium is not in its usual place. If no browser starts, every test is
// reported NOT RUN and the exit code is 2: an untested check is never reported as passed.
//
// Chromium only. Safari, Firefox, real touch devices and screen readers are not covered.
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { extname, join, normalize } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const CLOSE_WAIT = 260 // ms: longer than the script's 120 ms close delay
const SWITCH_WAIT = 200 // ms: longer than its 90 ms switch delay
const EDGE = 8 // px: the room the script keeps from the viewport's edges
const IDS = [
  "PREV-005",
  "PREV-008",
  "PREV-009",
  "PREV-010",
  "PREV-011",
  "PREV-012",
  "PREV-013",
  "PREV-014",
]

function notRun(reason) {
  for (const id of IDS) console.log(`NOT RUN ${id}`)
  console.error(
    `NOT RUN: ${reason}. These checks need manual verification in a browser.`,
  )
  process.exit(2)
}

// --- A static server for dist/ -------------------------------------------------------------

const dist = fileURLToPath(new URL("../dist/", import.meta.url))
if (!existsSync(join(dist, "index.html")))
  notRun("dist/ is not built; run `npm run build`")
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
}
const server = createServer(async (request, response) => {
  let path = decodeURIComponent(new URL(request.url, "http://localhost").pathname)
  if (path.endsWith("/")) path += "index.html"
  const file = normalize(join(dist, path))
  if (!file.startsWith(dist)) return response.writeHead(403).end()
  try {
    const body = await readFile(file)
    response.writeHead(200, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    })
    response.end(body)
  } catch {
    response.writeHead(404, { "content-type": "text/plain" }).end("Not found")
  }
})
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
const origin = `http://127.0.0.1:${server.address().port}`

// --- Headless Chrome over the DevTools protocol -------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const chromePath = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((path) => path && existsSync(path))
if (!chromePath) {
  server.close()
  notRun("no Chrome or Chromium found; set CHROME_PATH")
}
const profile = await mkdtemp(join(tmpdir(), "gusmaolab-chrome-"))
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--hide-scrollbars",
    "about:blank",
  ],
  { stdio: "ignore" },
)

async function shutdown() {
  try {
    socket?.close()
  } catch {}
  chrome.kill()
  server.close()
  await sleep(200)
  // Only the temporary profile this run created.
  await rm(profile, { recursive: true, force: true }).catch(() => {})
}
const deadline = setTimeout(async () => {
  console.error("FAIL: the browser tests took longer than 180 s")
  await shutdown()
  process.exit(1)
}, 180_000)

let socket
let port
for (let i = 0; i < 100 && !port; i++) {
  const text = await readFile(join(profile, "DevToolsActivePort"), "utf8").catch(
    () => "",
  )
  port = Number(text.split("\n")[0]) || undefined
  if (!port) await sleep(100)
}
let target
for (let i = 0; port && i < 50 && !target; i++) {
  const list = await fetch(`http://127.0.0.1:${port}/json/list`)
    .then((r) => r.json())
    .catch(() => [])
  target = list.find((t) => t.type === "page")
  if (!target) await sleep(100)
}
if (!target) {
  await shutdown()
  notRun(`Chrome at ${chromePath} did not start`)
}

socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true })
  socket.addEventListener("error", reject, { once: true })
})
let nextId = 0
const pending = new Map()
const listeners = new Map()
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data)
  if (message.id !== undefined && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) reject(new Error(`${message.error.message}`))
    else resolve(message.result)
  } else if (message.method) {
    for (const listener of listeners.get(message.method) ?? []) listener(message.params)
  }
})
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
const nextEvent = (method, timeout = 10_000) =>
  new Promise((resolve, reject) => {
    const set = listeners.get(method) ?? new Set()
    listeners.set(method, set)
    const done = (params) => {
      set.delete(done)
      clearTimeout(timer)
      resolve(params)
    }
    const timer = setTimeout(() => {
      set.delete(done)
      reject(new Error(`no ${method} within ${timeout} ms`))
    }, timeout)
    set.add(done)
  })

// Every page records each preview opening and closing, synchronously, in order.
const PROBE = `
  window.__probe = { log: [] };
  document.addEventListener("beforetoggle", (event) => {
    const el = event.target;
    if (el instanceof Element && el.classList.contains("gl-folder-preview")) {
      window.__probe.log.push({ of: el.dataset.previewOf, state: event.newState });
    }
  }, true);
`
await send("Page.enable")
await send("Runtime.enable")
await send("Page.addScriptToEvaluateOnNewDocument", { source: PROBE })

async function js(expression) {
  const { result, exceptionDetails } = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text)
  }
  return result.value
}

let viewport = { width: 1440, height: 900 }
async function setViewport(width, height = 900, mobile = false) {
  viewport = { width, height }
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  })
}

let mouse = { x: 2, y: 2 }
async function moveTo(x, y, steps = 1, pause = 0) {
  const from = mouse
  for (let i = 1; i <= steps; i++) {
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: from.x + ((x - from.x) * i) / steps,
      y: from.y + ((y - from.y) * i) / steps,
    })
    if (pause) await sleep(pause)
  }
  mouse = { x, y }
}
async function click(x, y) {
  await moveTo(x, y)
  for (const type of ["mousePressed", "mouseReleased"]) {
    await send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: "left",
      clickCount: 1,
    })
  }
}
const KEYS = {
  Tab: { windowsVirtualKeyCode: 9, code: "Tab", key: "Tab" },
  Escape: { windowsVirtualKeyCode: 27, code: "Escape", key: "Escape" },
  Enter: { windowsVirtualKeyCode: 13, code: "Enter", key: "Enter", text: "\r" },
}
async function press(name, { shift = false } = {}) {
  const key = KEYS[name]
  const modifiers = shift ? 8 : 0
  await send("Input.dispatchKeyEvent", {
    type: key.text ? "keyDown" : "rawKeyDown",
    modifiers,
    ...key,
  })
  await send("Input.dispatchKeyEvent", { type: "keyUp", modifiers, ...key })
  await sleep(40)
}

// Park the pointer on the flannel first, so the new page never loads under a hover.
async function goto(path) {
  await moveTo(2, 2)
  const loaded = nextEvent("Page.loadEventFired")
  await send("Page.navigate", { url: `${origin}${path}` })
  await loaded
  await sleep(60)
}
async function waitForPath(path, timeout = 5000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const at = await js(
      `document.readyState === "complete" ? location.pathname : ""`,
    ).catch(() => "")
    if (at === path) {
      await sleep(80)
      return true
    }
    await sleep(50)
  }
  return false
}

// The page's folder state, as a visitor would see it.
const STATE = `(() => {
  const active = document.activeElement;
  const panel = active?.closest?.(".gl-folder-preview");
  const tab = active?.closest?.(".gl-folder-tab");
  return {
    path: location.pathname + location.search + location.hash,
    history: history.length,
    environment: document.documentElement.dataset.environment ?? "core",
    selected: [...document.querySelectorAll(".gl-folder-tab[data-selected]")].map((t) => t.dataset.tabId),
    current: [...document.querySelectorAll('[aria-current="page"]')].map((a) => a.closest(".gl-folder-tab")?.dataset.tabId),
    vs: [...document.querySelectorAll(".gl-folder-tab__indicator")].map((v) => {
      const r = v.getBoundingClientRect();
      return [v.closest(".gl-folder-tab").dataset.tabId, Math.round(r.x), Math.round(r.y), Math.round(r.width)];
    }),
    scroll: [Math.round(scrollX), Math.round(scrollY)],
    open: [...document.querySelectorAll(".gl-folder-preview")].filter((p) => p.matches(":popover-open")).map((p) => p.dataset.previewOf),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    active: panel ? "preview:" + panel.dataset.previewOf + ":" + active.textContent.trim() : tab ? "tab:" + tab.dataset.tabId : active?.tagName ?? "",
    focusVisible: active?.matches?.(":focus-visible") ?? false,
    log: window.__probe?.log ?? [],
  };
})()`
const state = () => js(STATE)
const resetLog = () => js(`window.__probe.log = []`)

// Where to point at a tab: the middle of the part its scrolling row lets through.
const tabPoint = (scope, id) =>
  js(`(() => {
    const tab = document.querySelector(${JSON.stringify(`${scope} .gl-folder-tab[data-tab-id="${id}"]`)});
    if (!tab) return null;
    const r = tab.getBoundingClientRect();
    const s = tab.closest(".gl-folder__strip").getBoundingClientRect();
    const left = Math.max(r.left, s.left), right = Math.min(r.right, s.right);
    return { x: (left + right) / 2, y: r.top + r.height / 2, top: r.top, bottom: r.bottom, left, right };
  })()`)
const panelOf = (scope, id) =>
  js(`(() => {
    const panel = document.querySelector(${JSON.stringify(`${scope} .gl-folder-preview[data-preview-of="${id}"]`)});
    if (!panel || !panel.matches(":popover-open")) return null;
    const r = panel.getBoundingClientRect();
    const links = [...panel.querySelectorAll(".gl-folder-preview__link")];
    const hits = links.map((link) => {
      const b = link.getBoundingClientRect();
      const x = b.left + b.width / 2, y = b.top + b.height / 2;
      const inView = y > r.top && y < r.bottom;
      return !inView || panel.contains(document.elementFromPoint(x, y));
    });
    return {
      left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height,
      placement: panel.dataset.placement,
      scrolls: panel.scrollHeight > panel.clientHeight + 1,
      overflowY: getComputedStyle(panel).overflowY,
      items: links.map((link) => [link.textContent.trim(), link.getAttribute("href")]),
      ids: links.map((link) => link.parentElement.dataset.tabId),
      wholeLabels: links.every((link) => link.scrollWidth <= link.clientWidth + 1),
      visible: hits.every(Boolean),
      covered: links.map((link) => {
        const b = link.getBoundingClientRect();
        return Math.round(b.bottom);
      }),
    };
  })()`)

// --- Harness ------------------------------------------------------------------------------

const results = []
async function test(id, title, body) {
  const failures = []
  const check = (ok, message) => ok || failures.push(message)
  try {
    await body(check)
  } catch (error) {
    failures.push(error.stack ?? error.message)
  }
  results.push({ id, title, failures })
  console.log(`${failures.length === 0 ? "PASS" : "FAIL"} ${id} ${title}`)
  for (const message of failures.slice(0, 10)) console.log(`  - ${message}`)
}
const json = (value) => JSON.stringify(value)
const PAGE = ".gl-folders"
const away = () => moveTo(2, 2, 3)
const opened = (log) => log.filter((e) => e.state === "open").map((e) => e.of)
const maxOpen = (log) => {
  let open = 0
  let most = 0
  for (const entry of log) {
    open += entry.state === "open" ? 1 : -1
    most = Math.max(most, open)
  }
  return most
}
// What a preview must never change: the URL, history, environment, selection and the V.
const sameFolders = (a, b) =>
  json([a.path, a.history, a.environment, a.selected, a.current, a.vs, a.scroll]) ===
  json([b.path, b.history, b.environment, b.selected, b.current, b.vs, b.scroll])

// --- Tests --------------------------------------------------------------------------------

await test("PREV-005", "Hover never changes the page (case A)", async (check) => {
  await setViewport(1440)
  await goto("/cv/research/")
  await away()
  await resetLog()
  const before = await state()
  check(
    json(before.selected) === json(["cv", "cv-research"]),
    `starts at ${json(before.selected)}`,
  )
  const writing = await tabPoint(PAGE, "writing")
  await moveTo(writing.x, writing.y, 4)
  await sleep(60)
  const during = await state()
  check(
    json(during.open) === json(["writing"]),
    `open while hovering: ${json(during.open)}`,
  )
  const panel = await panelOf(PAGE, "writing")
  check(
    json(panel?.items) ===
      json([
        ["Overview of Writing", "/writing/"],
        ["Months' Original", "/writing/months-original/"],
        ["Kosmos Series", "/writing/kosmos/"],
        ["Book Club", "/writing/book-club/"],
      ]),
    `Writing's preview lists ${json(panel?.items)}`,
  )
  check(sameFolders(before, during), `hover changed the page: ${json(during)}`)
  check(during.environment === "scientific", "the environment changed")
  await away()
  await sleep(CLOSE_WAIT)
  const after = await state()
  check(
    json(after.open) === "[]",
    `still open after the pointer left: ${json(after.open)}`,
  )
  check(sameFolders(before, after), "the page changed after the preview closed")
  check(
    json(after.log) ===
      json([
        { of: "writing", state: "open" },
        { of: "writing", state: "closed" },
      ]),
    `preview log ${json(after.log)}`,
  )
})

await test("PREV-005", "A preview item opens its page (case B)", async (check) => {
  await setViewport(1440)
  await goto("/cv/research/")
  await away()
  const before = await state()
  const writing = await tabPoint(PAGE, "writing")
  await moveTo(writing.x, writing.y, 4)
  await sleep(60)
  const target = await js(`(() => {
    const b = document.querySelector('.gl-folder-preview[data-preview-of="writing"] [data-tab-id="writing-kosmos"] a').getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  })()`)
  await moveTo(target.x, target.y, 10)
  const loaded = nextEvent("Page.loadEventFired")
  await click(target.x, target.y)
  await loaded
  check(
    await waitForPath("/writing/kosmos/"),
    "the click did not open /writing/kosmos/",
  )
  const after = await state()
  check(
    json(after.selected) === json(["writing", "writing-kosmos"]) &&
      json(after.current) === json(["writing-kosmos"]),
    `selected ${json(after.selected)}, current ${json(after.current)}`,
  )
  check(after.environment === "literary", `environment ${after.environment}`)
  check(after.history === before.history + 1, "the click did not add one history entry")
  check(
    json(after.open) === "[]",
    `a preview is open on the new page: ${json(after.open)}`,
  )
  // Back returns to Research with nothing open, even from the back-forward cache.
  await away()
  await js(`history.back()`)
  check(await waitForPath("/cv/research/"), "Back did not return to /cv/research/")
  const back = await state()
  check(
    json(back.selected) === json(["cv", "cv-research"]),
    `Back shows ${json(back.selected)}`,
  )
  check(json(back.open) === "[]", `Back restored an open preview: ${json(back.open)}`)
  await js(`history.forward()`)
  check(
    await waitForPath("/writing/kosmos/"),
    "Forward did not return to /writing/kosmos/",
  )
})

await test(
  "PREV-011",
  "CV's long preview stays whole and in view (case C)",
  async (check) => {
    const expected = [
      "Overview of CV",
      "Teaching",
      "Research",
      "Publications",
      "Talks / Presentations",
      "Mentoring / Supervision",
      "Awards & Honors",
      "Service",
      "Outreach / Public Engagement",
    ]
    for (const [width, height] of [
      [1440, 900],
      [1024, 768],
      [1280, 520],
    ]) {
      await setViewport(width, height)
      await goto("/writing/")
      await away()
      const cv = await tabPoint(PAGE, "cv")
      await moveTo(cv.x, cv.y, 4)
      await sleep(60)
      const panel = await panelOf(PAGE, "cv")
      const where = `${width}×${height}`
      check(
        panel !== null,
        `${where}: CV's preview did not open (${json((await state()).log)})`,
      )
      if (!panel) continue
      check(
        json(panel.items.map(([label]) => label)) === json(expected),
        `${where}: ${json(panel.items)}`,
      )
      check(panel.wholeLabels, `${where}: a label is cut`)
      check(
        panel.left >= EDGE - 1 &&
          panel.right <= width - EDGE + 1 &&
          panel.top >= 0 &&
          panel.bottom <= height,
        `${where}: the preview leaves the viewport ${json(panel)}`,
      )
      check(
        (panel.width * panel.height) / (width * height) < 0.35,
        `${where}: the preview covers ${Math.round((100 * panel.width * panel.height) / (width * height))}% of the viewport`,
      )
      // When the viewport is short, the list scrolls inside the card instead of being cut.
      check(
        !panel.scrolls || panel.overflowY === "auto",
        `${where}: a long list is cut`,
      )
      if (panel.scrolls) {
        await js(
          `document.querySelector('.gl-folder-preview[data-preview-of="cv"]').scrollTop = 1e6`,
        )
        const last = await js(`(() => {
        const panel = document.querySelector('.gl-folder-preview[data-preview-of="cv"]');
        const r = panel.getBoundingClientRect();
        const b = panel.querySelector('[data-tab-id="cv-outreach"] a').getBoundingClientRect();
        return b.bottom <= r.bottom + 1 && b.top >= r.top - 1;
      })()`)
        check(last, `${where}: the last item cannot be scrolled into view`)
      }
    }
  },
)

await test(
  "PREV-011",
  "Leaves and open folders show no preview (cases D, E)",
  async (check) => {
    await setViewport(1440)
    await goto("/cv/research/")
    for (const id of ["contact", "home", "about"]) {
      await away()
      await resetLog()
      const point = await tabPoint(PAGE, id)
      await moveTo(point.x, point.y, 3)
      await sleep(150)
      const now = await state()
      check(
        now.log.length === 0 && json(now.open) === "[]",
        `hovering ${id} opened ${json(now.log)}`,
      )
    }
    await goto("/cv/")
    for (const id of ["cv", "overview:cv", "cv-teaching"]) {
      await away()
      await resetLog()
      const point = await tabPoint(PAGE, id)
      await moveTo(point.x, point.y, 3)
      await sleep(150)
      const now = await state()
      check(
        now.log.length === 0 && json(now.open) === "[]",
        `hovering ${id} on /cv/ opened ${json(now.log)}`,
      )
    }
    const row = await js(
      `document.querySelectorAll('.gl-folder[data-level="2"] > .gl-folder__strip .gl-folder-tab').length`,
    )
    check(row === 9, `CV's own row shows ${row} tabs`)
  },
)

await test(
  "PREV-011",
  "A second-level preview shows one level only (case F, synthetic)",
  async (check) => {
    await setViewport(1440)
    await goto("/_design/folders/")
    await js(
      `document.querySelector('[data-study-case="h"] .gl-folders').scrollIntoView({ block: "center" })`,
    )
    await sleep(60)
    await away()
    await resetLog()
    const scope = '[data-study-case="h"]'
    const before = await js(
      `[...document.querySelectorAll('${scope} .gl-folder-tab[data-selected]')].map((t) => t.dataset.tabId)`,
    )
    const research = await tabPoint(scope, "cv-research")
    await moveTo(research.x, research.y, 4)
    await sleep(60)
    const panel = await panelOf(scope, "cv-research")
    check(
      json(panel?.ids) ===
        json([
          "overview:cv-research",
          "synthetic-projects",
          "synthetic-themes",
          "synthetic-datasets",
        ]),
      `Research's preview holds ${json(panel?.ids)}`,
    )
    const now = await state()
    check(json(now.open) === json(["cv-research"]), `open: ${json(now.open)}`)
    const after = await js(
      `[...document.querySelectorAll('${scope} .gl-folder-tab[data-selected]')].map((t) => t.dataset.tabId)`,
    )
    check(
      json(after) === json(before) && json(after) === json(["cv", "overview:cv"]),
      `case H selects ${json(after)}`,
    )
    await away()
    await sleep(CLOSE_WAIT)
    const cv = await tabPoint(scope, "cv")
    await resetLog()
    await moveTo(cv.x, cv.y, 3)
    await sleep(150)
    check((await state()).log.length === 0, "the open CV folder showed a preview")
  },
)

await test(
  "PREV-008",
  "Keyboard: discover, traverse, dismiss, activate (case G)",
  async (check) => {
    await setViewport(1440)
    await goto("/cv/research/")
    await away()
    let now = await state()
    for (let i = 0; i < 20 && now.active !== "tab:lab"; i++) {
      await press("Tab")
      now = await state()
    }
    check(now.active === "tab:lab", `Tab never reached Lab (at ${now.active})`)
    check(json(now.open) === json(["lab"]), `focus on Lab opened ${json(now.open)}`)
    check(now.focusVisible, "Lab's focus is not visible")
    await press("Tab")
    now = await state()
    check(
      now.active === "preview:lab:Overview of Lab",
      `Tab after Lab reached ${now.active}`,
    )
    check(json(now.open) === json(["lab"]), "the preview closed when focus entered it")
    const ring = await js(`(() => {
    const a = document.activeElement, s = getComputedStyle(a);
    const panel = a.closest(".gl-folder-preview").getBoundingClientRect(), b = a.getBoundingClientRect();
    const room = parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset);
    return { style: s.outlineStyle, width: s.outlineWidth, fits: b.left - room >= panel.left && b.right + room <= panel.right };
  })()`)
    check(
      ring.style === "solid" && ring.width === "3px",
      `the focus ring is ${json(ring)}`,
    )
    check(ring.fits, "the focus ring is clipped by the preview's edge")
    for (let i = 0; i < 6; i++) await press("Tab")
    now = await state()
    check(now.active === "preview:lab:Resources", `the last item is ${now.active}`)
    await press("Tab")
    now = await state()
    check(
      now.active === "tab:lecture-notes",
      `Tab out of the preview reached ${now.active}`,
    )
    check(
      json(now.open) === json(["lecture-notes"]),
      `one preview at a time: ${json(now.open)}`,
    )
    await press("Tab", { shift: true })
    now = await state()
    check(
      now.active === "tab:lab" && json(now.open) === json(["lab"]),
      `Shift+Tab: ${now.active}, ${json(now.open)}`,
    )
    await press("Tab")
    await press("Escape")
    now = await state()
    check(json(now.open) === "[]", `Escape left ${json(now.open)} open`)
    check(now.active === "tab:lab", `after Escape, focus is on ${now.active}`)
    check(now.path === "/cv/research/", "Escape navigated")
    await sleep(CLOSE_WAIT)
    check(
      json((await state()).open) === "[]",
      "the preview reopened by itself after Escape",
    )
    await press("Tab")
    now = await state()
    check(
      now.active === "tab:lecture-notes",
      `after Escape, Tab skips the closed preview: ${now.active}`,
    )
    await press("Escape")
    now = await state()
    check(
      json(now.open) === "[]" && now.active === "tab:lecture-notes",
      "Escape on a tab",
    )
    await press("Tab")
    await press("Tab", { shift: true })
    now = await state()
    check(
      now.active === "tab:lecture-notes" && json(now.open) === json(["lecture-notes"]),
      `focus returning after Escape: ${now.active}, ${json(now.open)}`,
    )
    await press("Tab", { shift: true })
    await press("Tab")
    await press("Tab")
    now = await state()
    check(now.active === "preview:lab:People", `before Enter: ${now.active}`)
    const loaded = nextEvent("Page.loadEventFired")
    await press("Enter")
    await loaded
    check(
      await waitForPath("/lab/people/"),
      "Enter on People did not open /lab/people/",
    )
    now = await state()
    check(
      json(now.selected) === json(["lab", "lab-people"]),
      `People selects ${json(now.selected)}`,
    )
    check(json(now.open) === "[]", "a preview is open after keyboard navigation")
  },
)

await test(
  "PREV-009",
  "Pointer moves into the preview without flicker",
  async (check) => {
    await setViewport(1440)
    await goto("/cv/research/")
    await away()
    await resetLog()
    const writing = await tabPoint(PAGE, "writing")
    await moveTo(writing.x, writing.y, 4)
    await sleep(40)
    const item = await js(`(() => {
    const p = document.querySelector('.gl-folder-preview[data-preview-of="writing"]').getBoundingClientRect();
    const b = document.querySelector('.gl-folder-preview[data-preview-of="writing"] [data-tab-id="writing-book-club"] a').getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, right: p.right, top: p.top };
  })()`)
    // Straight down from the tab into the card, one pixel at a time.
    await moveTo(writing.x, item.y, Math.ceil(item.y - writing.y))
    await moveTo(item.x, item.y, 10)
    let now = await state()
    check(
      json(now.log) === json([{ of: "writing", state: "open" }]),
      `moving in: ${json(now.log)}`,
    )
    // A pointer that slips off the card for a moment does not close it.
    await moveTo(item.right + 24, item.y)
    await sleep(50)
    await moveTo(item.x, item.y)
    await sleep(CLOSE_WAIT)
    now = await state()
    check(
      json(now.open) === json(["writing"]),
      `a brief slip closed the preview: ${json(now.log)}`,
    )
    // Crossing a neighbouring tab on the way into the card does not switch previews.
    await moveTo(writing.x, writing.y, 3)
    const neighbour = await tabPoint(PAGE, "bearnards-area")
    await moveTo(neighbour.x, neighbour.y)
    await sleep(30)
    await moveTo(item.x, item.y)
    await sleep(SWITCH_WAIT)
    now = await state()
    check(
      json(now.open) === json(["writing"]) &&
        !opened(now.log).includes("bearnards-area"),
      `crossing a neighbour switched: ${json(now.log)}`,
    )
    await away()
    await sleep(CLOSE_WAIT)
    now = await state()
    check(json(now.open) === "[]", "the preview stayed open after the pointer left")
    check(
      json(now.log) ===
        json([
          { of: "writing", state: "open" },
          { of: "writing", state: "closed" },
        ]),
      `the preview flickered: ${json(now.log)}`,
    )
  },
)

await test(
  "PREV-010",
  "Hovering another folder switches the preview",
  async (check) => {
    await setViewport(1440)
    await goto("/cv/research/")
    await away()
    await resetLog()
    const before = await state()
    for (const id of ["lab", "writing", "lecture-notes", "bearnards-area"]) {
      const point = await tabPoint(PAGE, id)
      await moveTo(point.x, point.y, 2)
      await sleep(SWITCH_WAIT)
      const now = await state()
      check(json(now.open) === json([id]), `hovering ${id}: ${json(now.open)} open`)
      check(sameFolders(before, now), `hovering ${id} changed the page`)
    }
    await away()
    await sleep(CLOSE_WAIT)
    const after = await state()
    check(maxOpen(after.log) === 1, `${maxOpen(after.log)} previews were open at once`)
    check(
      json(opened(after.log)) ===
        json(["lab", "writing", "lecture-notes", "bearnards-area"]),
      `opened ${json(opened(after.log))}`,
    )
    check(json(after.open) === "[]", "a preview stayed open")
  },
)

await test(
  "PREV-011",
  "Previews stay anchored and in view at every width (case I)",
  async (check) => {
    for (const width of [1440, 1280, 1024, 768, 390]) {
      await setViewport(width)
      for (const path of ["/cv/research/", "/", "/writing/kosmos/"]) {
        await goto(path)
        const ids = await js(
          `[...document.querySelectorAll('.gl-folder[data-level="1"] > .gl-folder__strip .gl-folder-tab[data-preview]')].map((t) => t.dataset.tabId)`,
        )
        for (const id of ids) {
          await away()
          await sleep(CLOSE_WAIT)
          // Bring the tab into its row's view, as a visitor scrolling the row would.
          await js(`(() => {
          const tab = document.querySelector('.gl-folder[data-level="1"] .gl-folder-tab[data-tab-id="${id}"]');
          const strip = tab.closest(".gl-folder__strip");
          const t = tab.getBoundingClientRect(), s = strip.getBoundingClientRect();
          strip.scrollLeft += t.left < s.left + 24 ? t.left - s.left - 24 : t.right > s.right - 24 ? t.right - s.right + 24 : 0;
          window.scrollTo(0, 0);
        })()`)
          await sleep(40)
          const before = await state()
          const tab = await tabPoint(PAGE, id)
          await moveTo(tab.x, tab.y, 2)
          await sleep(60)
          const panel = await panelOf(PAGE, id)
          const now = await state()
          const where = `${width} px ${path} ${id}`
          check(panel !== null && json(now.open) === json([id]), `${where}: no preview`)
          if (!panel) continue
          check(
            panel.left >= EDGE - 1 && panel.right <= width - EDGE + 1,
            `${where}: off the side ${json([panel.left, panel.right])}`,
          )
          check(
            panel.top >= 0 && panel.bottom <= viewport.height,
            `${where}: off the top or bottom`,
          )
          check(
            panel.placement !== "below" || Math.abs(panel.top - tab.bottom) <= 1,
            `${where}: not hanging from its tab (${panel.top} vs ${tab.bottom})`,
          )
          check(
            panel.top >= tab.top + (tab.bottom - tab.top) - 1 ||
              panel.placement === "above",
            `${where}: covers its tab`,
          )
          check(
            panel.left <= tab.right && panel.right >= tab.left,
            `${where}: not under its tab`,
          )
          check(panel.visible, `${where}: an item is hidden or clipped`)
          check(panel.wholeLabels, `${where}: a label is cut`)
          check(
            now.overflow <= 0,
            `${where}: the page scrolls sideways by ${now.overflow}px`,
          )
          check(json(now.vs) === json(before.vs), `${where}: the V moved`)
        }
      }
    }
    // Case I: the last tab of a scrolling row, near the viewport's right edge.
    await setViewport(768)
    await goto("/cv/research/")
    await away()
    const scrolls = await js(`(() => {
    const strip = document.querySelector('.gl-folder[data-level="1"] > .gl-folder__strip');
    const scrolls = strip.scrollWidth > strip.clientWidth;
    strip.scrollLeft = strip.scrollWidth;
    return scrolls;
  })()`)
    check(scrolls, "at 768 px the global row does not scroll; case I needs it to")
    await sleep(40)
    const last = await tabPoint(PAGE, "bearnards-area")
    await moveTo(last.x, last.y, 2)
    await sleep(60)
    const panel = await panelOf(PAGE, "bearnards-area")
    check(
      panel !== null,
      "Bearnard's Area, at the end of the scrolled row, shows no preview",
    )
    if (panel) {
      check(
        panel.right <= 768 - EDGE + 1 && panel.visible,
        `the preview is clipped: ${json(panel)}`,
      )
      check(
        panel.left <= last.right && panel.right >= last.left,
        "the preview is not under its tab",
      )
    }
  },
)

await test(
  "PREV-012",
  "Touch: one tap follows the tab's link (case H)",
  async (check) => {
    await setViewport(390, 844, true)
    await send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 5,
    })
    try {
      await goto("/cv/research/")
      const tap = async (point) => {
        await send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: point.x, y: point.y }],
        })
        await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
      }
      const bring = (id) =>
        js(
          `document.querySelector('.gl-folder[data-level="1"] .gl-folder-tab[data-tab-id="${id}"]').scrollIntoView({ block: "nearest", inline: "center" })`,
        )
      await bring("writing")
      await sleep(60)
      // First tap, with navigation held back to look at what the tap did.
      await js(`document.addEventListener("click", (event) => {
      window.__probe.click = event.target.closest("a")?.getAttribute("href") ?? null;
      event.preventDefault();
    }, { capture: true, once: true })`)
      await resetLog()
      await tap(await tabPoint(PAGE, "writing"))
      await sleep(300)
      const first = await js(
        `({ click: window.__probe.click, log: window.__probe.log })`,
      )
      check(
        first.click === "/writing/",
        `the first tap did not click Writing's link (${json(first.click)})`,
      )
      check(
        opened(first.log).length === 0,
        `a tap opened a preview: ${json(first.log)}`,
      )
      // A real tap now: one tap, one navigation.
      const loaded = nextEvent("Page.loadEventFired")
      await tap(await tabPoint(PAGE, "writing"))
      await loaded
      check(await waitForPath("/writing/"), "one tap on Writing did not open /writing/")
      const now = await state()
      check(
        json(now.selected) === json(["writing", "overview:writing"]),
        `Writing selects ${json(now.selected)}`,
      )
      // Deeper folders are reached through the visible row, with no preview needed.
      const loaded2 = nextEvent("Page.loadEventFired")
      await tap(await tabPoint(PAGE, "writing-kosmos"))
      await loaded2
      check(
        await waitForPath("/writing/kosmos/"),
        "a tap on Kosmos Series in the row did not open it",
      )
    } finally {
      await send("Emulation.setTouchEmulationEnabled", { enabled: false })
      await setViewport(1440)
    }
  },
)

await test(
  "PREV-013",
  "Without JavaScript the folders still navigate",
  async (check) => {
    await send("Emulation.setScriptExecutionDisabled", { value: true })
    try {
      await setViewport(1440)
      await goto("/cv/research/")
      const hidden = await js(
        `[...document.querySelectorAll(".gl-folder-preview")].every((p) => getComputedStyle(p).display === "none")`,
      )
      check(hidden, "a preview shows without JavaScript")
      const writing = await tabPoint(PAGE, "writing")
      await moveTo(writing.x, writing.y, 3)
      await sleep(150)
      const still = await js(
        `[...document.querySelectorAll(".gl-folder-preview")].every((p) => getComputedStyle(p).display === "none")`,
      )
      check(still, "hovering shows a preview without JavaScript")
      let loaded = nextEvent("Page.loadEventFired")
      await click(writing.x, writing.y)
      await loaded
      check(
        await waitForPath("/writing/"),
        "the Writing tab does not navigate without JavaScript",
      )
      const kosmos = await tabPoint(PAGE, "writing-kosmos")
      loaded = nextEvent("Page.loadEventFired")
      await click(kosmos.x, kosmos.y)
      await loaded
      check(
        await waitForPath("/writing/kosmos/"),
        "Kosmos Series does not navigate without JavaScript",
      )
      const now = await state()
      check(
        json(now.selected) === json(["writing", "writing-kosmos"]),
        `selected ${json(now.selected)}`,
      )
      await js(`history.back()`)
      check(await waitForPath("/writing/"), "Back does not work without JavaScript")
    } finally {
      await send("Emulation.setScriptExecutionDisabled", { value: false })
    }
  },
)

await test(
  "PREV-014",
  "The V never moves or multiplies while previewing",
  async (check) => {
    for (const width of [1440, 768]) {
      await setViewport(width)
      await goto("/cv/research/")
      await away()
      const before = await state()
      for (const id of ["lab", "writing"]) {
        await js(
          `document.querySelector('.gl-folder[data-level="1"] .gl-folder-tab[data-tab-id="${id}"]').scrollIntoView({ block: "nearest", inline: "nearest" })`,
        )
        const reference = await state()
        const point = await tabPoint(PAGE, id)
        await moveTo(point.x, point.y, 2)
        await sleep(SWITCH_WAIT)
        const now = await state()
        check(
          json(now.vs) === json(reference.vs),
          `${width} px: hovering ${id} moved the V`,
        )
        check(
          now.vs.length === before.vs.length,
          `${width} px: hovering ${id} added a V`,
        )
        check(!now.vs.some(([tab]) => tab === id), `${width} px: ${id} gained a V`)
        // The tab's own cue: with the pointer in its preview, off the tab's link, the card
        // keeps its hover colour. Its V stays where it was (above), and none appears.
        const fill = `getComputedStyle(document.querySelector('.gl-folder[data-level="1"] .gl-folder-tab[data-tab-id="${id}"] .gl-folder-tab__shape'), "::before").backgroundColor`
        const inside = await js(`(() => {
        const b = document.querySelector('.gl-folder-preview[data-preview-of="${id}"] .gl-folder-preview__list').getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.bottom - 4 };
      })()`)
        await moveTo(inside.x, inside.y, 6)
        const previewed = await js(fill)
        await away()
        await sleep(CLOSE_WAIT)
        const rest = await js(fill)
        check(
          previewed !== rest,
          `${width} px: ${id} looks the same previewed and at rest (${rest})`,
        )
      }
      await away()
      await sleep(CLOSE_WAIT)
    }
  },
)

// --- Report -------------------------------------------------------------------------------

clearTimeout(deadline)
const { Browser: browser = "Chromium" } = await fetch(
  `http://127.0.0.1:${port}/json/version`,
)
  .then((r) => r.json())
  .catch(() => ({}))
await shutdown()
const failed = results.filter((r) => r.failures.length > 0)
if (failed.length > 0) {
  console.error(`FAIL: ${failed.length} of ${results.length} browser checks failed`)
  process.exit(1)
}
console.log(`PASS: ${results.length} browser checks in ${browser}`)
