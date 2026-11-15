// Shared harness for the browser tests (P07, extracted in P08): tests/previews-browser.mjs
// and tests/responsive-browser.mjs. No dependency: Node's http module serves dist/, and
// Node's WebSocket speaks the Chrome DevTools protocol to a headless Chrome or Chromium.
//
// Set CHROME_PATH if the browser is not in its usual place. If no browser starts, every
// test of the calling file is reported NOT RUN and the process exits with code 2: an
// untested check is never reported as passed. Chromium only: Safari, Firefox, real touch
// devices and screen readers are not covered.
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { extname, join, normalize } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
export const json = (value) => JSON.stringify(value)

/**
 * Starts the server and the browser, and returns the helpers the tests use. `ids` are the
 * test IDs reported NOT RUN when no browser can start. `root` is the built folder to serve
 * (dist/ by default; the demonstration build is dist-demo/, P13-A01). `external` is the origin of a
 * server the caller runs itself (the dev server): nothing is served, and `root` is not read.
 */
export async function startBrowser({
  ids,
  timeout = 180_000,
  root = "dist",
  external,
}) {
  function notRun(reason) {
    for (const id of ids) console.log(`NOT RUN ${id}`)
    console.error(
      `NOT RUN: ${reason}. These checks need manual verification in a browser.`,
    )
    process.exit(2)
  }

  // --- A static server for dist/ -------------------------------------------------------------

  const dist = fileURLToPath(new URL(`../${root}/`, import.meta.url))
  if (!external && !existsSync(join(dist, "index.html")))
    notRun(`${root}/ is not built; run \`npm run ${root === "dist" ? "build" : "demo:build"}\``)
  const TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    // Figures (P13): served with their own type, as GitHub Pages does, or an <img> will not draw them.
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webp": "image/webp",
  }
  // `serve.withoutInitialTarget`: serve the stylesheets without `scroll-initial-target`,
  // as a browser that lacks it reads them, to test the script that stands in for it (P08).
  const serve = { withoutInitialTarget: false }
  const server = external ? null : createServer(async (request, response) => {
    let path = decodeURIComponent(new URL(request.url, "http://localhost").pathname)
    if (path.endsWith("/")) path += "index.html"
    const file = normalize(join(dist, path))
    if (!file.startsWith(dist)) return response.writeHead(403).end()
    try {
      let body = await readFile(file)
      if (serve.withoutInitialTarget && extname(file) === ".css") {
        body = Buffer.from(
          body.toString("utf8").replace(/scroll-initial-target:[^;}]+;?/g, ""),
        )
      }
      response.writeHead(200, {
        "content-type": TYPES[extname(file)] ?? "application/octet-stream",
        "cache-control": "no-store",
      })
      response.end(body)
    } catch {
      response.writeHead(404, { "content-type": "text/plain" }).end("Not found")
    }
  })
  if (server) await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  const origin = external ?? `http://127.0.0.1:${server.address().port}`

  // --- Headless Chrome over the DevTools protocol -------------------------------------------

  const chromePath = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].find((path) => path && existsSync(path))
  if (!chromePath) {
    server?.close()
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
    server?.close()
    await sleep(200)
    // Only the temporary profile this run created.
    await rm(profile, { recursive: true, force: true }).catch(() => {})
  }
  const deadline = setTimeout(async () => {
    console.error(`FAIL: the browser tests took longer than ${timeout / 1000} s`)
    await shutdown()
    process.exit(1)
  }, timeout)

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
      for (const listener of listeners.get(message.method) ?? [])
        listener(message.params)
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId
      pending.set(id, { resolve, reject })
      socket.send(JSON.stringify({ id, method, params }))
    })
  // Every occurrence of a protocol event, until the returned function is called (P09).
  const on = (method, listener) => {
    const set = listeners.get(method) ?? new Set()
    listeners.set(method, set)
    set.add(listener)
    return () => set.delete(listener)
  }
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

  const viewport = { width: 1440, height: 900 }
  async function setViewport(width, height = 900, mobile = false) {
    viewport.width = width
    viewport.height = height
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
        // A cross-document view transition (P09) takes input away from the page while it
        // plays, so arrival means the page is shown and its transition, if any, is over.
        for (let i = 0; i < 40; i++) {
          const playing = await js(
            `document.getAnimations().some((a) => a.effect?.pseudoElement?.startsWith("::view-transition"))`,
          ).catch(() => false)
          if (!playing) break
          await sleep(25)
        }
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
      category: document.documentElement.dataset.category,
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
  // Park the pointer on the flannel, away from every tab.
  const away = () => moveTo(2, 2, 3)

  /** Ends the run: closes the browser and server, prints the summary, sets the exit code. */
  async function finish() {
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
  }

  return {
    serve,
    send,
    on,
    nextEvent,
    js,
    viewport,
    setViewport,
    moveTo,
    click,
    press,
    goto,
    waitForPath,
    state,
    resetLog,
    away,
    tabPoint,
    panelOf,
    test,
    finish,
  }
}
