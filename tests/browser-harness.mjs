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
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { extname, join, normalize } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const SERVED_TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".txt": "text/plain; charset=utf-8", ".json": "application/json" }
/**
 * A second static server for a built folder (P21, P22): for the tests that read two builds at once (the
 * release and the demonstration build, or a throwaway build). Returns `{ server, origin }`; the caller
 * closes `server`. A missing file answers 404, as the harness's own server does.
 */
export async function serveFolder(folder) {
  const root = normalize(folder.endsWith("/") ? folder : `${folder}/`)
  const server = createServer(async (request, response) => {
    let path = decodeURIComponent(new URL(request.url, "http://localhost").pathname)
    if (path.endsWith("/")) path += "index.html"
    const file = normalize(join(root, path))
    try {
      if (!file.startsWith(root)) throw new Error("outside")
      const body = await readFile(file)
      response.writeHead(200, { "content-type": SERVED_TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }).end(body)
    } catch {
      response.writeHead(404, { "content-type": "text/plain" }).end("Not found")
    }
  })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  return { server, origin: `http://127.0.0.1:${server.address().port}` }
}
export const json = (value) => JSON.stringify(value)

/**
 * Render the way a Linux runner does (P22-A01). The site's font stacks name fonts that only a Mac has (Seravek first,
 * Iowan Old Style for headings); on a GitHub runner Chrome falls through to DejaVu Sans and Liberation Serif, which are
 * wider, and the layout follows. With QA_LINUX_FONTS_DIR set to a folder holding DejaVuSans.ttf, DejaVuSans-Bold.ttf,
 * DejaVuSans-Oblique.ttf and DejaVuSans-BoldOblique.ttf (matplotlib ships them), every page of the run is drawn with
 * DejaVu Sans where it would use Seravek and with Times New Roman (metrically Liberation Serif) where it would use Iowan
 * Old Style, so a layout check can be tried on any machine in the font that broke it on the runner. Off by default and
 * never part of the site: it only changes what the test browser draws. The fonts are served from a second local server.
 */
async function startFontServer(dir) {
  const server = createServer(async (request, response) => {
    try {
      const name = decodeURIComponent(new URL(request.url, "http://localhost").pathname).replace(/^\/+/, "")
      if (!/^[\w-]+\.ttf$/.test(name)) throw new Error("not a font")
      const body = await readFile(join(dir, name))
      response.writeHead(200, { "content-type": "font/ttf", "access-control-allow-origin": "*", "cache-control": "max-age=3600" }).end(body)
    } catch {
      response.writeHead(404).end()
    }
  })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  return { server, base: `http://127.0.0.1:${server.address().port}` }
}
const linuxFontsCss = (base) => {
  const face = (family, style, weight, src) => `@font-face{font-family:${JSON.stringify(family)};font-style:${style};font-weight:${weight};src:${src}}`
  const sans = (file) => `url(${base}/${file})`
  const times = (...names) => names.map((n) => `local(${JSON.stringify(n)})`).join(",")
  return [
    face("Seravek", "normal", "100 599", sans("DejaVuSans.ttf")), face("Seravek", "normal", "600 900", sans("DejaVuSans-Bold.ttf")),
    face("Seravek", "italic", "100 599", sans("DejaVuSans-Oblique.ttf")), face("Seravek", "italic", "600 900", sans("DejaVuSans-BoldOblique.ttf")),
    face("Iowan Old Style", "normal", "100 599", times("Times New Roman", "TimesNewRomanPSMT")), face("Iowan Old Style", "normal", "600 900", times("Times New Roman Bold", "TimesNewRomanPS-BoldMT")),
    face("Iowan Old Style", "italic", "100 599", times("Times New Roman Italic", "TimesNewRomanPS-ItalicMT")), face("Iowan Old Style", "italic", "600 900", times("Times New Roman Bold Italic", "TimesNewRomanPS-BoldItalicMT")),
  ].join(" ")
}
// Weights 600 and up take the bold face, as a real font setup does with a regular and a bold (the tabs are semibold).
// For a server the harness does not serve (the dev server): a script puts the style in the page. The harness's own
// server puts it in the HTML instead, which also works with scripts switched off (the tests that look at the page as
// the build wrote it).
const linuxFontsScript = (css) => `(() => {
  const style = document.createElement("style");
  style.setAttribute("data-qa-linux-fonts", "");
  style.textContent = ${JSON.stringify(css)};
  // The script runs before the document has an element to hold the style.
  const put = () => (document.documentElement ? (document.documentElement.appendChild(style), true) : false);
  if (!put()) { const watch = new MutationObserver(() => { if (put()) watch.disconnect(); }); watch.observe(document, { childList: true }); }
})();`

/**
 * Starts the server and the browser, and returns the helpers the tests use. `ids` are the
 * test IDs reported NOT RUN when no browser can start. `root` is the built folder to serve
 * (dist/ by default; the demonstration build is dist-demo/, P13-A01). `chromeArgs` are extra Chrome flags (P19: software WebGL). `external` is the origin of a
 * server the caller runs itself (the dev server): nothing is served, and `root` is not read.
 */
export async function startBrowser({
  ids,
  timeout = 180_000,
  root = "dist",
  external,
  chromeArgs = [],
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
  let fontServer = null // QA_LINUX_FONTS_DIR (above)
  let fontsCss = "" // the style the harness's own server puts in every page, once the fonts are served
  const serve = { withoutInitialTarget: false }
  const server = external ? null : createServer(async (request, response) => {
    let path = decodeURIComponent(new URL(request.url, "http://localhost").pathname)
    if (path.endsWith("/")) path += "index.html"
    const file = normalize(join(dist, path))
    if (!file.startsWith(dist)) return response.writeHead(403).end()
    try {
      let body = await readFile(file)
      if (fontsCss && extname(file) === ".html")
        body = Buffer.from(body.toString("utf8").replace("</head>", `<style data-qa-linux-fonts>${fontsCss}</style></head>`))
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
      // A desktop with a mouse, stated and not inherited (P22-A01). The pages read the pointer and hover
      // capabilities (the nucleus treats `(hover: none), (pointer: coarse)` as touch and stays still; Home's sticky
      // tab row needs `(hover: hover) and (pointer: fine)`). A CI runner has no pointing device: Chrome then reports
      // pointer: none and hover: none, the pages rightly behave as for a touch visitor, and every check written
      // for a mouse fails (the first GitHub run lost thirteen that way). This changes nothing on a machine with a
      // mouse, and the touch tests are unaffected: touch emulation overrides it (checked).
      "--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=2,availableHoverTypes=2",
      ...chromeArgs,
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
    fontServer?.server.close()
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
  // Chrome's first start on a cold machine can take longer than a warm one: wait for its port file, not for a time
  // (the second GitHub run's first suite could not start it within 10 s and the retry did).
  for (let i = 0; i < 600 && !port; i++) {
    const text = await readFile(join(profile, "DevToolsActivePort"), "utf8").catch(
      () => "",
    )
    port = Number(text.split("\n")[0]) || undefined
    if (!port) await sleep(100)
  }
  let target
  for (let i = 0; port && i < 300 && !target; i++) {
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
  // A command Chrome never answers used to wait for ever, and the suite with it (the authoring suite stalled for the
  // orchestrator's 900 s on the second GitHub run, P22-A01, with nothing to show where). It now fails, naming the command.
  const ANSWER_WITHIN_MS = 120_000
  // In a QA run (the command sets QA_EVIDENCE_DIR), say once a minute what was last asked of Chrome and whether it has
  // answered. The authoring suite stalled for 900 s on three of the four GitHub runs with nothing in its log; if this
  // line stops appearing the event loop itself is blocked, and if it keeps appearing the last command shows where.
  let lastCommand = { method: "(none yet)", at: Date.now(), answered: true, expression: "" }
  let sent = 0
  // The helper the suite is in (goto, waitForPath, click, ...): a stall with no unanswered command is a wait that is not
  // a command, and this says which. Set by `trace`, printed with the heartbeat.
  const doing = { label: "(starting)", at: Date.now() }
  const trace = (label) => {
    doing.label = label
    doing.at = Date.now()
  }
  if (process.env.QA_EVIDENCE_DIR)
    setInterval(() => {
      const waited = Math.round((Date.now() - lastCommand.at) / 1000)
      const inHelper = Math.round((Date.now() - doing.at) / 1000)
      console.error(
        `[heartbeat ${new Date().toISOString()}] ${sent} commands so far; last to Chrome: ${lastCommand.method}${lastCommand.expression ? ` ${JSON.stringify(lastCommand.expression)}` : ""}, ${lastCommand.answered ? "answered" : `NOT answered for ${waited} s`}, ${Math.round((Date.now() - lastCommand.at) / 1000)} s ago; in ${doing.label} for ${inHelper} s`,
      )
    }, 60_000).unref()
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId
      sent += 1
      lastCommand = { method, at: Date.now(), answered: false, expression: method === "Runtime.evaluate" ? String(params.expression ?? "").replace(/\s+/g, " ").slice(0, 120) : "" }
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`Chrome did not answer ${method} within ${ANSWER_WITHIN_MS / 1000} s`))
      }, ANSWER_WITHIN_MS)
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer)
          if (lastCommand.method === method) lastCommand.answered = true
          resolve(value)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      })
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
  if (process.env.QA_LINUX_FONTS_DIR) {
    fontServer = await startFontServer(process.env.QA_LINUX_FONTS_DIR)
    const css = linuxFontsCss(fontServer.base)
    if (external) await send("Page.addScriptToEvaluateOnNewDocument", { source: linuxFontsScript(css) })
    else fontsCss = css
  }
  // With the emulated fonts the page measures with the fallback until they have loaded: wait for them.
  const fontsReady = () => (fontServer ? js(`document.fonts.ready.then(() => true)`).catch(() => false) : undefined)

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
    trace(`moveTo(${Math.round(x)}, ${Math.round(y)})`)
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
    trace(`click(${Math.round(x)}, ${Math.round(y)})`)
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
    trace(`press(${name})`)
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
    trace(`goto(${path})`)
    await moveTo(2, 2)
    const loaded = nextEvent("Page.loadEventFired")
    await send("Page.navigate", { url: `${origin}${path}` })
    await loaded
    await fontsReady()
    await sleep(60)
  }
  /**
   * Waits until no view transition is running. A cross-document view transition (P09) takes input away from the page
   * while it runs: a click then reaches the root element, not the link under it. "Running" is the transition object
   * (`document.activeViewTransition`, which exists from the new page's first frame, while the new state is captured)
   * as well as its animations (which exist only afterwards): the first GitHub runs (P22-A01) clicked into the window
   * between the two on a slower machine, and found `html` under every tab. Measured here at 1x, 4x and 8x CPU: the
   * object is there at every arrival and gone within 200 ms, after which a click reaches the link.
   */
  async function viewTransitionOver(timeout = 10_000) {
    trace("viewTransitionOver")
    const start = Date.now()
    while (Date.now() - start < timeout) {
      const active = await js(
        `document.activeViewTransition !== null || document.getAnimations().some((a) => a.effect?.pseudoElement?.startsWith("::view-transition"))`,
      ).catch(() => false)
      if (!active) return true
      await sleep(25)
    }
    return false
  }
  async function waitForPath(path, timeout = 5000) {
    trace(`waitForPath(${path}, ${timeout})`)
    const start = Date.now()
    while (Date.now() - start < timeout) {
      const at = await js(
        `document.readyState === "complete" ? location.pathname : ""`,
      ).catch(() => "")
      if (at === path) {
        // A cross-document view transition (P09) takes input away from the page while it
        // plays, so arrival means the page is shown and its transition, if any, is over.
        await viewTransitionOver()
        await fontsReady()
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
    trace(`test ${id}`)
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
    if (failures.length > 0) await captureEvidence(id)
  }
  /** The fonts Chrome really used for a paragraph, a tab and a heading of the page now shown, by family name. */
  async function platformFonts() {
    const fonts = {}
    try {
      await send("DOM.enable")
      await send("CSS.enable")
      const { root } = await send("DOM.getDocument", { depth: 0 })
      for (const [name, selector] of [["text", "main p"], ["tab", ".gl-folder-tab"], ["heading", "h1"]]) {
        const { nodeId } = await send("DOM.querySelector", { nodeId: root.nodeId, selector })
        if (nodeId) fonts[name] = (await send("CSS.getPlatformFontsForNode", { nodeId })).fonts.map((f) => `${f.familyName}${f.isCustomFont ? " (emulated)" : ""} (${f.glyphCount} glyphs)`)
      }
    } catch {}
    return fonts
  }
  // Failure evidence (P22, D-153): when the QA command sets QA_EVIDENCE_DIR, a failing check leaves a
  // screenshot, the page address and the visible text of the page behind, so a failure that cannot be
  // reproduced can still be looked at. Nothing is written otherwise, and a failure here never hides the test's own.
  async function captureEvidence(id) {
    const dir = process.env.QA_EVIDENCE_DIR
    if (!dir) return
    try {
      await mkdir(dir, { recursive: true })
      const { data } = await send("Page.captureScreenshot", { format: "png" })
      await writeFile(join(dir, `${id}.png`), Buffer.from(data, "base64"))
      // What the page was drawn in (P22-A01): a failure that only happens on another machine is usually the machine.
      // The pointer and hover the page saw, the scroll position, and the fonts Chrome really used (the font stacks
      // name fonts that a Linux runner does not have, and the layout follows the font that was found).
      const note = await js(`(() => { const m = (q) => matchMedia(q).matches; return {
        url: location.pathname + location.search, width: innerWidth, height: innerHeight, devicePixelRatio,
        scroll: { top: Math.round(document.documentElement.scrollTop), height: document.documentElement.scrollHeight },
        media: { hover: m("(hover: hover)"), pointerFine: m("(pointer: fine)"), pointerCoarse: m("(pointer: coarse)"), reducedMotion: m("(prefers-reduced-motion: reduce)") },
        text: document.body.innerText.slice(0, 1500) } })()`)
      note.fonts = await platformFonts()
      await writeFile(join(dir, `${id}.json`), JSON.stringify(note, null, 2))
    } catch {}
  }
  // Park the pointer on the flannel, away from every tab.
  const away = () => moveTo(2, 2, 3)
  /**
   * A touch swipe over (x, y) that moves the content by `distance` px along the page (negative: it scrolls down; with
   * `horizontal`, sideways), and whether what `measure` reads (the page's scroll position unless told otherwise) then
   * changed by more than `min`. Two ways to send the touch: Chrome's synthesized scroll gesture first (the one the touch
   * tests have always used) and, if nothing moved, raw touch events, the lower-level input every platform takes. The
   * first GitHub runner (headless Linux, P22-A01) saw the synthesized gesture do nothing, upwards and sideways alike;
   * the result says which way worked, and a swipe that moves nothing by either is a real failure. It waits for the
   * movement to happen (a fling takes as long as the machine takes), never for a fixed time.
   */
  async function touchSwipeScrolls(x, y, distance, { min = 50, horizontal = false, measure = "document.documentElement.scrollTop" } = {}) {
    trace(`touchSwipeScrolls(${x}, ${y}, ${distance})`)
    const read = () => js(measure)
    const start = await read()
    const moved = async (ms) => {
      for (let t = 0; t < ms; t += 100) {
        if (Math.abs((await read()) - start) > min) return true
        await sleep(100)
      }
      return false
    }
    await send("Input.synthesizeScrollGesture", { x, y, [horizontal ? "xDistance" : "yDistance"]: distance, gestureSourceType: "touch" })
    if (await moved(3000)) return { scrolled: true, by: "synthesized gesture", from: start, to: await read() }
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] })
    for (let i = 1; i <= 10; i++) {
      const along = (distance * i) / 10
      await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: horizontal ? x + along : x, y: horizontal ? y : y + along }] })
      await sleep(16)
    }
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
    const ok = await moved(4000)
    return { scrolled: ok, by: ok ? "raw touch events" : "neither the synthesized gesture nor raw touch events", from: start, to: await read() }
  }

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
    // End the process: a suite that started a dev server (demo-dev-browser, authoring-browser) kept its event loop alive
    // through the server's pipe on the GitHub runner, where `npx astro dev` stays attached instead of handing off as it
    // does on a Mac, and sat for the orchestrator's whole 900 s after every check had passed. A failing run already
    // exits (above); a passing one must too, and the exit handler stops the server.
    process.exit(0)
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
    viewTransitionOver,
    state,
    resetLog,
    away,
    touchSwipeScrolls,
    platformFonts,
    tabPoint,
    panelOf,
    test,
    finish,
  }
}
