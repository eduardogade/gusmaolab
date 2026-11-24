// Browser checks for navigation continuity (P09): TRANS-001 to TRANS-012, in headless
// Chromium through tests/browser-harness.mjs. tests/transitions.mjs checks the declarations.
//
// What these can and cannot show (debugging/investigations/ISSUE-0004.md):
// - Plain navigation (reduced motion, or a browser without view transitions) is checked
//   frame by frame: no blank or unstyled frame, only the old page and then the new one.
// - The cross-fade is checked through the browser's own records: it runs, lasts 140 ms,
//   animates only the root, finds the rows already in place, and shifts no layout.
//   Its frames are not counted for whiteness here, because headless Chrome sometimes
//   captures the old page as a blank snapshot, which a visible Chrome window did not do
//   in 40 runs. Whether it feels smooth is the owner's judgement on real screens.
//
// Run `npm run build`, then `npm run test:browser`. Without a browser every check is
// reported NOT RUN (exit code 2).
import { inflateSync } from "node:zlib"
import { json, sleep, startBrowser } from "./browser-harness.mjs"
import { siteNavigation } from "../src/navigation/index.ts"

const {
  send,
  on,
  js,
  setViewport,
  moveTo,
  goto,
  waitForPath,
  state,
  tabPoint,
  away,
  test,
  finish,
} = await startBrowser({
  ids: Array.from({ length: 12 }, (_, i) => `TRANS-${String(i + 1).padStart(3, "0")}`),
  timeout: 300_000,
  // P22 (D-157): this suite opens a design study, a development page that only the demonstration build routes.
  root: "dist-demo",
})

// Each new document records how it was revealed: with a view transition or not, where its
// rows stood at that moment, its transition's animations, and any layout shift.
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `
    window.__nav = { shift: 0 };
    addEventListener("pagereveal", (event) => {
      const vt = event.viewTransition;
      window.__nav.reveal = {
        transition: Boolean(vt),
        rows: [...document.querySelectorAll(".gl-folder__strip")].map((r) => Math.round(r.scrollLeft)),
        environment: document.documentElement.dataset.environment ?? "core",
        category: document.documentElement.dataset.category,
      };
      if (vt) {
        vt.ready.then(() => {
          window.__nav.animations = document.getAnimations()
            .filter((a) => a.effect && a.effect.pseudoElement)
            .map((a) => ({ on: a.effect.pseudoElement, duration: a.effect.getTiming().duration, easing: a.effect.getTiming().easing }));
        }, (error) => { window.__nav.error = String(error) });
        const start = performance.now();
        vt.finished.then(() => { window.__nav.finishedAfter = Math.round(performance.now() - start) });
      }
    });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__nav.shift += entry.value;
    }).observe({ type: "layout-shift", buffered: true });
  `,
})

const REDUCED = [{ name: "prefers-reduced-motion", value: "reduce" }]
const media = (features) => send("Emulation.setEmulatedMedia", { features })
// The record of the page just arrived at. Its `reveal` is written when the browser fires `pagereveal`, after the first render, which
// is after the address has changed: a read made a fixed time after `waitForPath` found no record when the browser was slow (a first
// attempt of TRANS-009, TRANS-010 and TRANS-012 under emulated Linux fonts, P23), so the read waits for the record it asserts on.
const navRecord = async () => {
  for (let waited = 0; waited < 10_000; waited += 50) {
    if (await js(`window.__nav?.reveal !== undefined`)) break
    await sleep(50)
  }
  return js(`JSON.parse(JSON.stringify(window.__nav ?? null))`)
}

/** Clicks a tab of the current page and waits for the new page to settle. */
async function clickTab(id, expectedPath) {
  await js(
    `document.querySelector('.gl-folder-tab[data-tab-id="${id}"]').scrollIntoView({ block: "nearest", inline: "nearest" }); scrollTo(0, 0)`,
  )
  await sleep(60)
  const point = await tabPoint(".gl-folders", id)
  await moveTo(point.x, point.y)
  await sleep(40)
  for (const type of ["mousePressed", "mouseReleased"]) {
    await send("Input.dispatchMouseEvent", {
      type,
      x: point.x,
      y: point.y,
      button: "left",
      clickCount: 1,
    })
  }
  const arrived = await waitForPath(expectedPath)
  await sleep(450)
  return arrived
}

// --- A minimal PNG reader, for screencast frames -------------------------------------------

function decodePng(buffer) {
  let at = 8
  let width = 0,
    height = 0,
    colorType = 0
  const data = []
  while (at < buffer.length) {
    const length = buffer.readUInt32BE(at)
    const type = buffer.toString("latin1", at + 4, at + 8)
    const chunk = buffer.subarray(at + 8, at + 8 + length)
    if (type === "IHDR") {
      width = chunk.readUInt32BE(0)
      height = chunk.readUInt32BE(4)
      colorType = chunk[9]
      if (chunk[8] !== 8 || chunk[12] !== 0) throw new Error("unsupported PNG")
    } else if (type === "IDAT") data.push(chunk)
    else if (type === "IEND") break
    at += 12 + length
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0
  if (channels === 0) throw new Error(`unsupported PNG colour type ${colorType}`)
  const raw = inflateSync(Buffer.concat(data))
  const stride = width * channels
  const pixels = Buffer.alloc(height * stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? pixels[y * stride + x - channels] : 0
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0
      const c = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels] : 0
      const p = a + b - c
      const pa = Math.abs(p - a),
        pb = Math.abs(p - b),
        pc = Math.abs(p - c)
      const predictor = [
        0,
        a,
        b,
        (a + b) >> 1,
        pa <= pb && pa <= pc ? a : pb <= pc ? b : c,
      ][filter]
      pixels[y * stride + x] = (line[x] + predictor) & 255
    }
  }
  return { width, height, channels, pixels }
}

/** The share of near-white pixels, and the mean difference from another frame. */
function measure(frame, against) {
  const { pixels, channels } = frame
  let white = 0,
    diff = 0,
    n = 0
  for (let i = 0; i < pixels.length; i += channels * 16) {
    const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]]
    if (0.2126 * r + 0.7152 * g + 0.0722 * b > 250) white++
    if (against)
      diff +=
        (Math.abs(r - against.pixels[i]) +
          Math.abs(g - against.pixels[i + 1]) +
          Math.abs(b - against.pixels[i + 2])) /
        3
    n++
  }
  return { white: white / n, diff: against ? diff / n : 0 }
}

/** Every frame painted while one tab is clicked, as decoded PNGs. */
async function filmstrip(id, expectedPath) {
  const frames = []
  const stop = on("Page.screencastFrame", (params) => {
    send("Page.screencastFrameAck", { sessionId: params.sessionId }).catch(() => {})
    frames.push(Buffer.from(params.data, "base64"))
  })
  await send("Page.startScreencast", { format: "png", everyNthFrame: 1 })
  await sleep(300)
  frames.length = 0
  const arrived = await clickTab(id, expectedPath)
  await sleep(300)
  await send("Page.stopScreencast")
  stop()
  return { arrived, frames: frames.map(decodePng) }
}

// --- Tests --------------------------------------------------------------------------------

await test(
  "TRANS-001",
  "Plain navigation shows no blank or unstyled frame",
  async (check) => {
    await media(REDUCED)
    try {
      for (const [width, from, id, to] of [
        [1440, "/", "cv", "/cv/"],
        [1440, "/cv/", "writing", "/writing/"],
        [390, "/writing/", "writing-kosmos", "/writing/kosmos/"],
        [390, "/cv/", "cv-research", "/cv/research/"],
      ]) {
        await setViewport(width, 844, width < 768)
        await goto(from)
        await sleep(300)
        const { arrived, frames } = await filmstrip(id, to)
        const where = `${width} px ${from} → ${to}`
        check(arrived, `${where}: did not arrive`)
        check(frames.length >= 1, `${where}: no frames recorded`)
        const last = frames.at(-1)
        for (const [i, frame] of frames.entries()) {
          const { white, diff } = measure(frame, last)
          check(
            white < 0.5,
            `${where}: frame ${i} is ${Math.round(white * 100)}% white`,
          )
          // Before the new page appears the old one stays; once it appears it is complete.
          if (i > 0 && measure(frames[i - 1], last).diff < 1) {
            check(diff < 1, `${where}: frame ${i} changes after the new page appeared`)
          }
        }
      }
    } finally {
      await media([])
    }
  },
)

await test(
  "TRANS-002",
  "The cross-fade runs on the production build",
  async (check) => {
    // The harness serves dist/, the production build; the dev server was compared by hand
    // (ISSUE-0004): the same three-frame hard cut, and no blank frame.
    await setViewport(1440)
    await goto("/cv/")
    check(
      await clickTab("cv-research", "/cv/research/"),
      "CV → Research did not arrive",
    )
    const nav = await navRecord()
    check(nav?.reveal?.transition === true, `no view transition: ${json(nav)}`)
    // Only the root is animated: its group, and the old and new pages' fades.
    const animated = [...new Set((nav?.animations ?? []).map((a) => a.on))].sort()
    check(
      json(animated) ===
        json([
          "::view-transition-group(root)",
          "::view-transition-new(root)",
          "::view-transition-old(root)",
        ]),
      `animated: ${json(animated)}`,
    )
    check(
      (nav?.animations ?? []).every((a) => a.duration === 140),
      `durations: ${json(nav?.animations)}`,
    )
    check(
      nav?.finishedAfter !== undefined && nav.finishedAfter < 400,
      `finished after ${nav?.finishedAfter} ms`,
    )
  },
)

await test("TRANS-003", "Same category: CV → Research", async (check) => {
  await setViewport(1440)
  await goto("/cv/")
  check(await clickTab("cv-research", "/cv/research/"), "did not arrive")
  const nav = await navRecord()
  const page = await state()
  check(nav.reveal.transition, "no cross-fade")
  check(
    json(page.selected) === json(["cv", "cv-research"]),
    `selected ${json(page.selected)}`,
  )
  check(
    page.environment === "scientific" && nav.reveal.environment === "scientific",
    "the environment changed",
  )
  check(
    page.category === "research" && nav.reveal.category === "research",
    "the palette changed",
  )
  check(nav.shift === 0, `layout shifted by ${nav.shift}`)
})

await test("TRANS-004", "Across categories: CV → Writing", async (check) => {
  await setViewport(1440)
  await goto("/cv/")
  check(await clickTab("writing", "/writing/"), "did not arrive")
  const nav = await navRecord()
  const page = await state()
  check(nav.reveal.transition, "no cross-fade")
  // The new page is Writing from its first frame: no intermediate palette.
  check(
    nav.reveal.environment === "literary" && page.environment === "literary",
    `environment ${nav.reveal.environment}`,
  )
  check(
    nav.reveal.category === "writing" && page.category === "writing",
    `category ${nav.reveal.category}`,
  )
  check(
    json(page.selected) === json(["writing", "overview:writing"]),
    `selected ${json(page.selected)}`,
  )
  check(nav.shift === 0, `layout shifted by ${nav.shift}`)
})

await test(
  "TRANS-005",
  "Back and Forward restore the page and its folders",
  async (check) => {
    await setViewport(1440)
    await goto("/cv/")
    await clickTab("cv-research", "/cv/research/")
    await clickTab("writing", "/writing/")
    for (const [step, path, selected] of [
      ["back", "/cv/research/", ["cv", "cv-research"]],
      ["back", "/cv/", ["cv", "overview:cv"]],
      ["forward", "/cv/research/", ["cv", "cv-research"]],
    ]) {
      // Off the tabs, or the restored page would rightly preview the tab under the pointer.
      await away()
      await js(`history.${step}()`)
      check(await waitForPath(path), `${step} did not reach ${path}`)
      await sleep(300)
      const page = await state()
      check(
        json(page.selected) === json(selected),
        `${step} to ${path}: selected ${json(page.selected)}`,
      )
      check(json(page.open) === "[]", `${step} to ${path}: a preview is open`)
    }
  },
)

await test(
  "TRANS-006",
  "Direct links and reloads work, without a transition",
  async (check) => {
    await setViewport(390, 844, true)
    await goto("/bearnards-area/powerlifting/")
    let nav = await navRecord()
    let page = await state()
    check(!nav.reveal.transition, "a direct load cross-faded")
    check(
      json(page.selected) === json(["bearnards-area", "bearnards-area-powerlifting"]),
      `selected ${json(page.selected)}`,
    )
    await send("Page.reload")
    await sleep(600)
    nav = await navRecord()
    page = await state()
    check(!nav.reveal.transition, "a reload cross-faded")
    check(
      json(page.selected) === json(["bearnards-area", "bearnards-area-powerlifting"]),
      `after reload ${json(page.selected)}`,
    )
  },
)

await test("TRANS-007", "Without JavaScript, navigation still works", async (check) => {
  await send("Emulation.setScriptExecutionDisabled", { value: true })
  try {
    await setViewport(1440)
    await goto("/cv/")
    check(await clickTab("writing", "/writing/"), "CV → Writing did not arrive")
    check(
      await clickTab("writing-kosmos", "/writing/kosmos/"),
      "Writing → Kosmos did not arrive",
    )
    const page = await state()
    check(
      json(page.selected) === json(["writing", "writing-kosmos"]),
      `selected ${json(page.selected)}`,
    )
  } finally {
    await send("Emulation.setScriptExecutionDisabled", { value: false })
  }
})

await test("TRANS-008", "Reduced motion gets no transition", async (check) => {
  await media(REDUCED)
  try {
    for (const [width, from, id, to] of [
      [1440, "/cv/", "writing", "/writing/"],
      [390, "/cv/", "cv-research", "/cv/research/"],
    ]) {
      await setViewport(width, 844, width < 768)
      await goto(from)
      check(await clickTab(id, to), `${from} → ${to} did not arrive`)
      const nav = await navRecord()
      check(
        nav.reveal.transition === false,
        `${width} px ${from} → ${to} cross-faded under reduced motion`,
      )
    }
  } finally {
    await media([])
  }
})

await test(
  "TRANS-009",
  "Previews still open, lead to pages, and do not double up",
  async (check) => {
    await setViewport(1440)
    await goto("/cv/research/")
    await away()
    const writing = await tabPoint(".gl-folders", "writing")
    await moveTo(writing.x, writing.y, 3)
    await sleep(200)
    const item = await js(
      `(() => { const b = document.querySelector('.gl-folder-preview[data-preview-of="writing"] [data-tab-id="writing-kosmos"] a').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } })()`,
    )
    await moveTo(item.x, item.y, 8)
    for (const type of ["mousePressed", "mouseReleased"]) {
      await send("Input.dispatchMouseEvent", {
        type,
        x: item.x,
        y: item.y,
        button: "left",
        clickCount: 1,
      })
    }
    check(
      await waitForPath("/writing/kosmos/"),
      "the preview's Kosmos Series did not open its page",
    )
    await sleep(400)
    const nav = await navRecord()
    let page = await state()
    check(nav.reveal.transition, "following a preview link did not cross-fade")
    check(json(page.open) === "[]", "a preview is open on the new page")
    // On the new page, one hover opens exactly one preview, once.
    await away()
    await sleep(300)
    const cv = await tabPoint(".gl-folders", "cv")
    await js(`window.__probe.log = []`)
    await moveTo(cv.x, cv.y, 3)
    await sleep(250)
    page = await state()
    check(
      json(page.log) === json([{ of: "cv", state: "open" }]),
      `hovering CV logged ${json(page.log)}`,
    )
  },
)

await test("TRANS-010", "Rows are in place at the first frame (P08)", async (check) => {
  for (const [from, id, to] of [
    ["/cv/", "cv-research", "/cv/research/"],
    ["/writing/", "writing-kosmos", "/writing/kosmos/"],
    ["/cv/research/", "bearnards-area", "/bearnards-area/"],
  ]) {
    await setViewport(390, 844, true)
    await goto(from)
    check(await clickTab(id, to), `${from} → ${to} did not arrive`)
    const nav = await navRecord()
    const final = await js(
      `[...document.querySelectorAll(".gl-folder__strip")].map((r) => Math.round(r.scrollLeft))`,
    )
    check(
      json(nav.reveal.rows) === json(final),
      `${to}: rows moved after the first frame, ${json(nav.reveal.rows)} → ${json(final)}`,
    )
    check(nav.shift === 0, `${to}: layout shifted by ${nav.shift}`)
  }
})

await test(
  "TRANS-011",
  "Every registered page still loads with its folders",
  async (check) => {
    await setViewport(1440)
    for (const path of siteNavigation.pagePaths()) {
      await goto(path)
      const page = await state()
      const expected = siteNavigation
        .resolve(path)
        .state.rows.map((row) => row.selectedId)
      check(
        page.path === path && json(page.selected) === json(expected),
        `${path}: ${json(page.selected)}`,
      )
    }
  },
)

await test(
  "TRANS-012",
  "No shift, no stolen focus, studies never animate",
  async (check) => {
    await setViewport(1440)
    await goto("/")
    check(
      await clickTab("lecture-notes", "/lecture-notes/"),
      "Home → Lecture Notes did not arrive",
    )
    check(
      await clickTab("lecture-notes-greenhouse", "/lecture-notes/greenhouse/"),
      "→ The Greenhouse did not arrive",
    )
    const nav = await navRecord()
    const page = await js(`({ active: document.activeElement.tagName, y: scrollY })`)
    check(nav.shift === 0, `layout shifted by ${nav.shift}`)
    check(
      page.active === "BODY" && page.y === 0,
      `focus ${page.active}, scroll ${page.y}`,
    )
    // The design studies do not opt in, so a link to one is a plain navigation.
    await goto("/")
    // Home no longer links the studies in a release build (P15), so the test adds the plain link itself.
    await js(
      `(() => { const a = document.createElement("a"); a.href = "/_design/tokens/"; a.textContent = "design tokens"; a.style.cssText = "position:fixed;top:4px;left:4px;z-index:9999;padding:8px;background:#fff"; document.body.append(a); })()`,
    )
    const link = await js(
      `(() => { const a = document.querySelector('a[href="/_design/tokens/"]'); a.scrollIntoView({ block: "center" }); const b = a.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } })()`,
    )
    await moveTo(link.x, link.y)
    for (const type of ["mousePressed", "mouseReleased"]) {
      await send("Input.dispatchMouseEvent", {
        type,
        x: link.x,
        y: link.y,
        button: "left",
        clickCount: 1,
      })
    }
    check(await waitForPath("/_design/tokens/"), "the specimen link did not open")
    await sleep(300)
    check(
      (await navRecord()).reveal.transition === false,
      "the design specimen cross-faded",
    )
  },
)

await finish()
