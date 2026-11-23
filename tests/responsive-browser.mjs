// Browser checks for the responsive folders (P08): RESP-001 to RESP-017, covering the
// brief's cases A to L in a real, headless Chromium through tests/browser-harness.mjs.
// tests/responsive.mjs checks what can be checked without a browser.
//
// Run `npm run build`, then `npm run test:browser`. If no browser starts, every check is
// reported NOT RUN and the exit code is 2. Chromium only: Safari and Firefox, real phones
// and tablets, and screen readers are not covered (touch is emulated).
import { json, sleep, startBrowser } from "./browser-harness.mjs"
import { siteNavigation } from "../src/navigation/index.ts"

const {
  serve,
  send,
  nextEvent,
  js,
  setViewport,
  moveTo,
  press,
  goto,
  waitForPath,
  state,
  resetLog,
  away,
  tabPoint,
  platformFonts,
  test,
  finish,
} = await startBrowser({
  ids: Array.from({ length: 17 }, (_, i) => `RESP-${String(i + 1).padStart(3, "0")}`),
  timeout: 300_000,
  // P22 (D-157): the design studies are development pages that only the demonstration build routes.
  root: "dist-demo",
})

const PHONES = [320, 360, 390, 430]
const WIDTHS = [...PHONES, 768, 1024, 1280, 1440, 1920, 2560]
const SECTIONS = [
  "/",
  "/about/",
  "/blog/",
  "/portfolio/",
  "/contact/",
  "/schedule/",
  "/cv/",
  "/lab/",
  "/lecture-notes/",
  "/writing/",
  "/bearnards-area/",
]
const SECOND_LEVEL = [
  "/cv/teaching/",
  "/cv/research/",
  "/cv/outreach/",
  "/lab/people/",
  "/lab/resources/",
  "/lecture-notes/bearnards-trail/",
  "/lecture-notes/timber-logs/",
  "/writing/months-original/",
  "/writing/book-club/",
  "/bearnards-area/photos/",
  "/bearnards-area/powerlifting/",
  "/bearnards-area/bear-life/",
]
const CLOSE_WAIT = 260
const SWITCH_WAIT = 200

// Every row of tabs inside `scope`: its selected tab, and whether that tab's label and V
// sit clear of the row's edge fades. (A card wider than the clear middle, such as
// "Outreach / Public Engagement" at 320 px, can only show its label there.)
const FADE = `(row) => parseFloat(getComputedStyle(row.querySelector(".gl-folder__tabs"), "::before").inlineSize) || 0`
const rowsOf = (scope = ".gl-folders") =>
  js(`(() => [...document.querySelectorAll(${JSON.stringify(`${scope} .gl-folder__strip`)})].map((row) => {
    const tab = row.querySelector(".gl-folder-tab[data-selected]");
    const fade = (${FADE})(row);
    const a = row.getBoundingClientRect(), b = tab.querySelector(".gl-folder-tab__label").getBoundingClientRect();
    return {
      level: row.closest(".gl-folder").dataset.level,
      selected: tab.dataset.tabId,
      clear: b.left >= a.left + fade - 1 && b.right <= a.right - fade + 1,
      scrolls: row.scrollWidth > row.clientWidth + 1,
      scrollLeft: Math.round(row.scrollLeft),
    };
  }))()`)
const overflow = () =>
  js(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)
// A browser without scroll-initial-target: the stylesheets lose it and CSS.supports says
// no, so the row script stands in (P08).
const NO_NATIVE = `(() => {
  const native = CSS.supports.bind(CSS);
  CSS.supports = (a, b) => String(a).includes("scroll-initial-target") ? false : b === undefined ? native(a) : native(a, b);
})()`
async function withoutNative(body) {
  serve.withoutInitialTarget = true
  const { identifier } = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: NO_NATIVE,
  })
  try {
    await body()
  } finally {
    serve.withoutInitialTarget = false
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier })
  }
}

// --- Tests --------------------------------------------------------------------------------

await test("RESP-001", "No page scrolls sideways, at ten widths", async (check) => {
  const paths = [
    "/",
    "/cv/",
    "/cv/research/",
    "/cv/outreach/",
    "/bearnards-area/powerlifting/",
    "/lecture-notes/greenhouse/",
    "/writing/kosmos/",
    "/lab/research-areas/",
    "/_design/folders/",
    "/_design/tokens/",
    "/_design/bearnard/",
    "/_design/records/",
  ]
  for (const width of WIDTHS) {
    await setViewport(width, 900, width < 768)
    for (const path of paths) {
      await goto(path)
      const extra = await overflow()
      check(extra <= 0, `${width} px ${path} scrolls sideways by ${extra} px`)
    }
  }
})

await test(
  "RESP-002",
  "Every global tab is reachable in a scrolling row",
  async (check) => {
    // The global row, in the registry's order (grouped by category since P10).
    const labels = siteNavigation.sections.map((node) => node.label)
    for (const width of [320, 390, 768, 1024]) {
      await setViewport(width, 900, width < 768)
      await goto("/cv/research/")
      const result = await js(`(() => {
      const row = document.querySelector('.gl-folder[data-level="1"] > .gl-folder__strip');
      const pad = parseFloat(getComputedStyle(row).scrollPaddingLeft) || 0;
      return [...row.querySelectorAll(".gl-folder-tab")].map((tab) => {
        const label = tab.querySelector(".gl-folder-tab__label");
        // Scroll the row as a visitor would, to bring this tab clear of the fades.
        const a = row.getBoundingClientRect(), b = tab.getBoundingClientRect();
        if (b.left < a.left + pad) row.scrollLeft += b.left - a.left - pad;
        else if (b.right > a.right - pad) row.scrollLeft += b.right - a.right + pad;
        const c = row.getBoundingClientRect(), d = tab.getBoundingClientRect();
        const hit = document.elementFromPoint(d.left + d.width / 2, d.top + d.height / 2);
        return {
          label: label.childNodes[0].textContent,
          inside: d.left >= c.left - 1 && d.right <= c.right + 1,
          hit: tab.contains(hit),
          whole: label.scrollWidth <= label.clientWidth + 1,
        };
      });
    })()`)
      check(
        json(result.map((t) => t.label)) === json(labels),
        `${width} px: the row reads ${json(result.map((t) => t.label))}`,
      )
      for (const tab of result) {
        check(
          tab.inside && tab.hit,
          `${width} px: ${tab.label} cannot be scrolled into reach`,
        )
        check(tab.whole, `${width} px: ${tab.label}'s label is cut`)
      }
    }
  },
)

await test(
  "RESP-003",
  "The selected top-level tab is revealed (case A)",
  async (check) => {
    for (const mode of ["native", "script"]) {
      const run = async () => {
        for (const width of [...PHONES, 768]) {
          await setViewport(width, 844, width < 768)
          for (const path of SECTIONS) {
            await goto(path)
            const [global] = await rowsOf()
            const page = await state()
            check(
              global.clear,
              `${mode}, ${width} px ${path}: ${global.selected} is hidden in its row`,
            )
            check(
              page.scroll[1] === 0,
              `${mode}, ${width} px ${path}: the page scrolled to ${page.scroll[1]}`,
            )
          }
        }
      }
      if (mode === "native") await run()
      else await withoutNative(run)
    }
    // A tab already in view is left alone: no needless jump.
    await withoutNative(async () => {
      await setViewport(1024)
      for (const path of ["/", "/lab/", "/cv/"]) {
        await goto(path)
        const [global] = await rowsOf()
        check(
          global.scrollLeft === 0,
          `script, 1024 px ${path}: a visible tab was scrolled to ${global.scrollLeft}`,
        )
      }
    })
  },
)

await test(
  "RESP-004",
  "The selected second-level tab is revealed (cases B, C, D)",
  async (check) => {
    for (const mode of ["native", "script"]) {
      const run = async () => {
        for (const width of [320, 360, 390]) {
          await setViewport(width, 844, true)
          for (const path of SECOND_LEVEL) {
            await goto(path)
            const rows = await rowsOf()
            check(rows.length === 2, `${width} px ${path} draws ${rows.length} rows`)
            for (const row of rows) {
              check(
                row.clear,
                `${mode}, ${width} px ${path}: level ${row.level}'s ${row.selected} is hidden`,
              )
            }
          }
        }
      }
      if (mode === "native") await run()
      else await withoutNative(run)
    }
    // Case D: Bearnard's Area and Powerlifting, in the Bearnard category, at 390 px.
    await setViewport(390, 844, true)
    await goto("/bearnards-area/powerlifting/")
    const rows = await rowsOf()
    const page = await state()
    check(
      json(rows.map((r) => [r.selected, r.clear])) ===
        json([
          ["bearnards-area", true],
          ["bearnards-area-powerlifting", true],
        ]),
      `case D: ${json(rows)}`,
    )
    check(page.environment === "personal", `case D is ${page.environment}`)
    check(page.category === "bearnard", `case D is ${page.category}`)
  },
)

await test(
  "RESP-005",
  "Three levels stay discoverable on a phone (case E, synthetic)",
  async (check) => {
    for (const mode of ["native", "script"]) {
      const run = async () => {
        for (const width of [320, 390]) {
          await setViewport(width, 844, true)
          await goto("/_design/folders/")
          for (const scope of [
            '[data-study-case="c"]',
            '[data-study-case="g"]',
            '[data-study-case="i"]',
          ]) {
            const rows = await rowsOf(scope)
            check(
              rows.length === 3,
              `${mode}, ${width} px ${scope}: ${rows.length} rows`,
            )
            for (const row of rows) {
              check(
                row.clear,
                `${mode}, ${width} px ${scope}: level ${row.level}'s ${row.selected} is hidden`,
              )
            }
            const reading = await js(`(() => {
            const paper = document.querySelector('${scope} .gl-folder__paper'), s = getComputedStyle(paper);
            return paper.getBoundingClientRect().width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
          })()`)
            check(
              reading >= width * 0.72,
              `${mode}, ${width} px ${scope}: the reading column is ${Math.round(reading)} px`,
            )
          }
        }
      }
      if (mode === "native") await run()
      else await withoutNative(run)
    }
  },
)

await test(
  "RESP-006",
  "Parent pages select Overview on a phone (case B)",
  async (check) => {
    await setViewport(390, 844, true)
    for (const path of [
      "/cv/",
      "/lab/",
      "/lecture-notes/",
      "/writing/",
      "/bearnards-area/",
    ]) {
      await goto(path)
      const rows = await rowsOf()
      check(
        rows.length === 2 &&
          rows[1].selected === `overview:${path.slice(1, -1)}` &&
          rows.every((r) => r.clear),
        `${path}: ${json(rows)}`,
      )
    }
  },
)

await test("RESP-007", "Tabs still open their pages on a phone", async (check) => {
  await setViewport(390, 844, true)
  await goto("/cv/research/")
  for (const [id, path] of [
    ["overview:cv", "/cv/"],
    ["cv-teaching", "/cv/teaching/"],
  ]) {
    await goto("/cv/research/")
    await js(
      `document.querySelector('.gl-folder-tab[data-tab-id="${id}"]').scrollIntoView({ block: "nearest", inline: "center" }); scrollTo(0, 0)`,
    )
    const point = await tabPoint(".gl-folders", id)
    const loaded = nextEvent("Page.loadEventFired")
    await moveTo(point.x, point.y)
    await send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: point.x,
      y: point.y,
      button: "left",
      clickCount: 1,
    })
    await send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: point.x,
      y: point.y,
      button: "left",
      clickCount: 1,
    })
    await loaded
    check(await waitForPath(path), `${id} does not open ${path}`)
  }
})

await test("RESP-008", "Deep pages never add a fourth row", async (check) => {
  for (const width of [320, 1440]) {
    await setViewport(width, 844, width < 768)
    await goto("/_design/folders/")
    const most = await js(
      `Math.max(...[...document.querySelectorAll(".gl-folders")].map((s) => s.querySelectorAll(".gl-folder").length))`,
    )
    check(most === 3, `${width} px: a stack has ${most} levels`)
  }
})

await test(
  "RESP-009",
  "Previews follow their tab when its row scrolls (case F)",
  async (check) => {
    for (const width of [768, 1024]) {
      await setViewport(width, 900)
      await goto("/cv/research/")
      await away()
      // Open Writing's preview with the pointer, rest the pointer in the card, then scroll
      // the row under it.
      await js(
        `(() => { const row = document.querySelector('.gl-folder[data-level="1"] > .gl-folder__strip'); row.scrollLeft = row.scrollWidth })()`,
      )
      await sleep(60)
      const tab = await tabPoint(".gl-folders", "writing")
      await moveTo(tab.x, tab.y, 2)
      await sleep(SWITCH_WAIT)
      const inside = await js(
        `(() => { const b = document.querySelector('.gl-folder-preview[data-preview-of="writing"] .gl-folder-preview__list').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.bottom - 4 } })()`,
      )
      await moveTo(inside.x, inside.y, 6)
      const where = () =>
        js(`(() => {
        const tab = document.querySelector('.gl-folder[data-level="1"] .gl-folder-tab[data-tab-id="writing"]');
        const row = tab.closest(".gl-folder__strip"), card = tab.querySelector(".gl-folder-preview");
        const a = row.getBoundingClientRect(), b = tab.getBoundingClientRect(), c = card.getBoundingClientRect();
        return { open: card.matches(":popover-open"), cardLeft: c.left, anchor: Math.max(b.left, a.left), top: c.top, bottom: b.bottom, right: c.right };
      })()`)
      const before = await where()
      await js(
        `document.querySelector('.gl-folder[data-level="1"] > .gl-folder__strip').scrollLeft -= 60`,
      )
      await sleep(120)
      const after = await where()
      check(
        before.open && after.open,
        `${width} px: the preview closed when its row scrolled a little`,
      )
      check(
        Math.abs(after.cardLeft - after.anchor) <= 1 || after.right >= width - 9,
        `${width} px: the card stayed at ${Math.round(after.cardLeft)} while its tab moved to ${Math.round(after.anchor)}`,
      )
      check(
        Math.abs(after.top - after.bottom) <= 1,
        `${width} px: the card left its tab's foot`,
      )
      // Scrolled right out of sight, it closes rather than float by itself.
      await js(
        `document.querySelector('.gl-folder[data-level="1"] > .gl-folder__strip').scrollLeft = 0`,
      )
      await sleep(120)
      const gone = await js(`(() => {
      const tab = document.querySelector('.gl-folder[data-level="1"] .gl-folder-tab[data-tab-id="writing"]');
      const a = tab.closest(".gl-folder__strip").getBoundingClientRect(), b = tab.getBoundingClientRect();
      return { visible: b.right > a.left && b.left < a.right, open: tab.querySelector(".gl-folder-preview").matches(":popover-open") };
    })()`)
      check(
        gone.visible || !gone.open,
        `${width} px: the card floats after its tab scrolled away`,
      )
      await away()
      await sleep(CLOSE_WAIT)
    }
  },
)

await test(
  "RESP-010",
  "Touch: swipes scroll a row, taps open a page (case J)",
  async (check) => {
    await setViewport(390, 844, true)
    await send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 5,
    })
    await send("Emulation.setEmulatedMedia", {
      features: [
        { name: "pointer", value: "coarse" },
        { name: "hover", value: "none" },
      ],
    })
    try {
      await goto("/cv/research/")
      await resetLog()
      const row = await js(
        `(() => { const r = document.querySelector('.gl-folder[data-level="1"] > .gl-folder__strip'); const b = r.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 + 6, scroll: r.scrollLeft } })()`,
      )
      // A horizontal swipe, right to left, across the global row.
      const points = Array.from({ length: 8 }, (_, i) => ({
        x: row.x + 120 - i * 30,
        y: row.y,
      }))
      await send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [points[0]],
      })
      for (const point of points.slice(1)) {
        await send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [point],
        })
        await sleep(16)
      }
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
      await sleep(400)
      const after = await js(
        `document.querySelector('.gl-folder[data-level="1"] > .gl-folder__strip').scrollLeft`,
      )
      const page = await state()
      check(
        after > row.scroll + 50,
        `the swipe scrolled the row from ${row.scroll} to ${after}`,
      )
      check(page.path === "/cv/research/", `the swipe navigated to ${page.path}`)
      check(page.log.length === 0, `the swipe opened a preview: ${json(page.log)}`)
      check(page.scroll[1] === 0, "the swipe scrolled the page")
      // Touch targets: every tab, inactive ones included, is at least 44 px tall.
      const heights = await js(
        `[...document.querySelectorAll(".gl-folder-tab")].map((t) => Math.round(t.getBoundingClientRect().height))`,
      )
      check(
        Math.min(...heights) >= 44,
        `a tab is ${Math.min(...heights)} px tall under a coarse pointer`,
      )
      // One tap on CV opens /cv/.
      await js(
        `document.querySelector('.gl-folder[data-level="1"] .gl-folder-tab[data-tab-id="cv"]').scrollIntoView({ block: "nearest", inline: "center" }); scrollTo(0, 0)`,
      )
      const cv = await tabPoint(".gl-folders", "cv")
      const loaded = nextEvent("Page.loadEventFired")
      await send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: cv.x, y: cv.y }],
      })
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
      await loaded
      check(await waitForPath("/cv/"), "one tap on CV did not open /cv/")
    } finally {
      await send("Emulation.setEmulatedMedia", { features: [] })
      await send("Emulation.setTouchEmulationEnabled", { enabled: false })
    }
  },
)

await test(
  "RESP-011",
  "Keyboard reaches every tab, clear of the fades (case I)",
  async (check) => {
    for (const width of [320, 390]) {
      await setViewport(width, 844)
      await goto("/cv/research/")
      const seen = []
      for (let i = 0; i < 90; i++) {
        await press("Tab")
        const now = await js(`(() => {
        const a = document.activeElement, tab = a.closest(".gl-folder-tab");
        if (!tab || a.closest(".gl-folder-preview")) return { id: a.closest(".gl-folder-preview") ? "preview" : a.tagName };
        const row = tab.closest(".gl-folder__strip"), s = getComputedStyle(row);
        const r = row.getBoundingClientRect(), b = a.getBoundingClientRect();
        const ring = parseFloat(getComputedStyle(a).outlineWidth) + parseFloat(getComputedStyle(a).outlineOffset);
        return {
          id: tab.dataset.tabId,
          level: row.closest(".gl-folder").dataset.level,
          clear: b.left - ring >= r.left + (${FADE})(row) - 1 && b.right + ring <= r.right - (${FADE})(row) + 1,
          ringInside: b.top - ring >= r.top - 1,
          ring: getComputedStyle(a).outlineStyle + " " + getComputedStyle(a).outlineWidth,
          pageY: scrollY,
        };
      })()`)
        if (now.id === "preview") continue
        // Past the last tab, or back at the first: headless Chrome wraps focus around.
        if (!now.level || seen.some((t) => t.id === now.id)) break
        seen.push(now)
      }
      const global = seen.filter((t) => t.level === "1").map((t) => t.id)
      check(
        global.length === 11,
        `${width} px: Tab reached ${global.length} global tabs`,
      )
      check(
        seen.some((t) => t.id === "cv-outreach"),
        `${width} px: Tab never reached Outreach`,
      )
      for (const tab of seen) {
        check(
          tab.clear,
          `${width} px: focused ${tab.id} sits under an edge fade (RESP-012)`,
        )
        check(
          tab.ringInside,
          `${width} px: ${tab.id}'s focus ring is cut at the top (RESP-012)`,
        )
        check(
          tab.ring === "solid 3px",
          `${width} px: ${tab.id}'s focus ring is ${tab.ring}`,
        )
      }
    }
    // Enter on a tab that started off-screen opens it.
    await setViewport(390, 844)
    await goto("/cv/research/")
    for (let i = 0; i < 60; i++) {
      await press("Tab")
      const id = await js(
        `document.activeElement.closest(".gl-folder-tab:not(.gl-folder-preview *)")?.dataset.tabId ?? ""`,
      )
      if (id === "bearnards-area") break
    }
    const loaded = nextEvent("Page.loadEventFired")
    await press("Enter")
    await loaded
    check(
      await waitForPath("/bearnards-area/"),
      "Enter on Bearnard's Area did not open it",
    )
  },
)

await test(
  "RESP-012",
  "Previews still open and close by keyboard on a phone",
  async (check) => {
    await setViewport(390, 844)
    await goto("/cv/research/")
    let now = await state()
    for (let i = 0; i < 60 && now.active !== "tab:writing"; i++) {
      await press("Tab")
      now = await state()
    }
    check(
      json(now.open) === json(["writing"]),
      `focus on Writing opened ${json(now.open)}`,
    )
    const card = await js(
      `(() => { const c = document.querySelector('.gl-folder-preview[data-preview-of="writing"]').getBoundingClientRect(); return [c.left, c.right, innerWidth] })()`,
    )
    check(
      card[0] >= 7 && card[1] <= card[2] - 7,
      `the card leaves the screen: ${json(card)}`,
    )
    await press("Tab")
    now = await state()
    check(
      now.active === "preview:writing:Overview of Writing",
      `Tab after Writing reached ${now.active}`,
    )
    await press("Escape")
    now = await state()
    check(
      json(now.open) === "[]" && now.active === "tab:writing",
      `Escape: ${json(now.open)}, ${now.active}`,
    )
  },
)

await test(
  "RESP-013",
  "Every category and environment gets the same responsive layout",
  async (check) => {
    for (const width of [320, 768]) {
      await setViewport(width, 844, width < 768)
      const shapes = new Map()
      for (const path of [
        "/cv/",
        "/lab/",
        "/lecture-notes/",
        "/writing/",
        "/bearnards-area/",
        "/blog/",
      ]) {
        await goto(path)
        shapes.set(
          path,
          await js(`(() => {
          const r = (e) => e.getBoundingClientRect();
          const shell = document.querySelector(".page-shell"), folders = [...document.querySelectorAll(".gl-folder")];
          return json = JSON.stringify({
            shell: [Math.round(r(shell).left), Math.round(r(shell).width)],
            insets: folders.map((f) => getComputedStyle(f.querySelector(".gl-folder__body")).paddingLeft),
            strips: folders.map((f) => [getComputedStyle(f.querySelector(".gl-folder__strip")).overflowX, getComputedStyle(f.querySelector(".gl-folder__strip")).scrollPaddingLeft]),
          });
        })()`),
        )
      }
      const twoLevel = [...shapes]
        .filter(([path]) => path !== "/blog/")
        .map(([, shape]) => shape)
      check(
        new Set(twoLevel).size === 1,
        `${width} px: sections differ: ${json([...shapes])}`,
      )
    }
  },
)

await test(
  "RESP-014",
  "Wide content scrolls inside itself, never the page (case K)",
  async (check) => {
    for (const width of [320, 390, 768]) {
      await setViewport(width, 844, width < 768)
      await goto("/_design/folders/")
      const r = await js(`(() => {
      const sample = document.querySelector("[data-overflow-sample]"), paper = sample.closest(".gl-folder__paper");
      const inner = (sel) => { const el = sample.querySelector(sel); return { scrolls: el.scrollWidth > el.clientWidth + 1, fits: el.getBoundingClientRect().right <= paper.getBoundingClientRect().right + 1 } };
      const figure = sample.querySelector("svg").getBoundingClientRect(), p = paper.getBoundingClientRect();
      const words = [...sample.querySelectorAll("h3, li, p, dt")].every((el) => el.scrollWidth <= el.clientWidth + 1);
      return { pre: inner("pre"), table: inner(".gl-scroll-x"), math: inner("math"), figure: figure.width <= p.width && figure.height > 0, words, paperScrolls: paper.scrollWidth > paper.clientWidth + 1 };
    })()`)
      check(r.pre.scrolls && r.pre.fits, `${width} px: the code block ${json(r.pre)}`)
      check(
        r.table.scrolls && r.table.fits,
        `${width} px: the table region ${json(r.table)}`,
      )
      check(r.math.fits, `${width} px: the formula leaves the paper`)
      check(r.figure, `${width} px: the figure does not scale`)
      check(r.words, `${width} px: a long word or address overflows its line`)
      check(!r.paperScrolls, `${width} px: well-formed content made the paper scroll`)
      check((await overflow()) <= 0, `${width} px: the page scrolls sideways`)
      // A careless wide table, with no region around it: the paper scrolls, not the page.
      await js(
        `document.querySelector("[data-overflow-sample]").insertAdjacentHTML("beforeend", "<table><tr>" + "<td>unbreakable-cell-content-for-overflow-testing</td>".repeat(6) + "</tr></table>")`,
      )
      await sleep(40)
      const extra = await overflow()
      const paperScrolls = await js(
        `(() => { const p = document.querySelector("[data-overflow-sample]").closest(".gl-folder__paper"); return p.scrollWidth > p.clientWidth + 1 })()`,
      )
      check(
        extra <= 0 && paperScrolls,
        `${width} px: a bare wide table widened the page by ${extra} px`,
      )
    }
  },
)

await test("RESP-015", "Desktop keeps P07's layout in any font (cases G, H): the shell, the paper and the folders' own spacing as measured, and every tab reachable whatever its width", async (check) => {
  // What P07 measured and a font cannot move (identical in Seravek and in DejaVu Sans, which is what a Linux machine
  // draws; P22-A01): the shell's left edge and width, the paper's width, the h1's distance below the paper's top edge,
  // and the seam between the last row and the paper. They are the folders' own padding and the page's own measure.
  // What the font does move, and this check no longer pins: the height of the rows above the paper (so the h1's page
  // position) and whether eleven tab labels fit in one row. The first used to be compared with P07's numbers, which
  // were measured with the system fonts of a Mac, and the first GitHub run drew the same tree 12 px lower; the second is
  // a question of text width, answered below by what the row does instead: it fits, or it scrolls, and either way
  // every tab can be reached.
  const P07 = {
    "1024 /": { shell: [22, 980], paper: 920, h1Below: 76, seam: 13 },
    "1024 /cv/": { shell: [22, 980], paper: 890, h1Below: 41, seam: 13 },
    "1280 /": { shell: [27, 1226], paper: 1159, h1Below: 83, seam: 14 },
    "1280 /cv/": { shell: [27, 1226], paper: 1127, h1Below: 48, seam: 14 },
    "1440 /": { shell: [110, 1219], paper: 1150, h1Below: 87, seam: 14 },
    "1440 /cv/": { shell: [110, 1219], paper: 1118, h1Below: 52, seam: 14 },
  }
  const ORDER = siteNavigation.sections.map((node) => node.id)
  const rowMetrics = []
  for (const [key, expected] of Object.entries(P07)) {
    const [width, path] = key.split(" ")
    await setViewport(Number(width), 900)
    await goto(path)
    const now = await js(`(() => {
      const r = (el) => el.getBoundingClientRect();
      const shell = document.querySelector(".page-shell"), paper = [...document.querySelectorAll(".gl-folder__paper")].at(-1);
      const strips = [...document.querySelectorAll(".gl-folder__strip")];
      const h1 = document.querySelector("main h1");
      return {
        shell: [Math.round(r(shell).left), Math.round(r(shell).width)],
        paper: Math.round(r(paper).width),
        h1Below: Math.round(r(h1).top - r(paper).top),
        seam: Math.round(r(paper).top - r(strips.at(-1)).bottom),
        // The h1 reads whole: inside the paper, not clipped, and the next thing starts below it.
        h1Inside: r(h1).left >= r(paper).left && r(h1).right <= r(paper).right + 0.5,
        h1Clipped: h1.scrollWidth > h1.clientWidth + 1,
        h1Overlap: (() => { const next = h1.nextElementSibling; return next ? r(next).top < r(h1).bottom - 1 : false })(),
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`)
    const { h1Inside, h1Clipped, h1Overlap, pageOverflow, ...geometry } = now
    check(json(geometry) === json(expected), `${key}: ${json(geometry)}, P07 had ${json(expected)}`)
    check(h1Inside && !h1Clipped && !h1Overlap, `${key}: the h1 does not read whole (inside the paper ${h1Inside}, clipped ${h1Clipped}, overlapped ${h1Overlap})`)
    check(pageOverflow <= 0, `${key}: the page scrolls sideways by ${pageOverflow} px`)

    // Every row: its tabs in order, none clipped, and each one reachable: the row fits, or it scrolls, and scrolling
    // brings a tab inside the row with the tab itself under the pointer.
    const rows = await js(`(() => [...document.querySelectorAll(".gl-folder__strip")].map((strip, index) => {
      const tabs = [...strip.querySelectorAll(".gl-folder-tab")];
      const lefts = tabs.map((t) => t.getBoundingClientRect().left);
      const fits = strip.scrollWidth <= strip.clientWidth + 1;
      // A label lies inside its own tab (the tab has the V and a hidden text besides, so its own scroll width says nothing).
      const clipped = tabs.filter((t) => { const label = t.querySelector(".gl-folder-tab__label"), b = t.getBoundingClientRect(), l = label?.getBoundingClientRect(); return !l || l.left < b.left - 1 || l.right > b.right + 1; }).map((t) => t.dataset.tabId);
      strip.scrollLeft = 0;
      const unreachable = [];
      for (const tab of tabs) {
        tab.scrollIntoView({ block: "nearest", inline: "nearest" });
        const s = strip.getBoundingClientRect(), b = tab.getBoundingClientRect();
        const x = (Math.max(b.left, s.left) + Math.min(b.right, s.right)) / 2, y = b.top + b.height / 2;
        const hit = document.elementFromPoint(x, y)?.closest(".gl-folder-tab");
        if (!(b.left >= s.left - 1 && b.right <= s.right + 1 && hit === tab)) unreachable.push(tab.dataset.tabId);
      }
      strip.scrollLeft = 0;
      return { index, ids: tabs.map((t) => t.dataset.tabId), ordered: lefts.every((l, i) => i === 0 || l > lefts[i - 1]), fits, scrolls: ["auto", "scroll"].includes(getComputedStyle(strip).overflowX), width: strip.clientWidth, scrollWidth: strip.scrollWidth, clipped, unreachable };
    }))()`)
    rows.forEach((row, i) => {
      check(row.ordered && row.ids.length > 0, `${key} row ${i}: the tabs are not in a left-to-right order`)
      check(row.fits || row.scrolls, `${key} row ${i}: the tabs do not fit and the row does not scroll (${row.scrollWidth} px in ${row.width})`)
      check(row.clipped.length === 0, `${key} row ${i}: a tab's label lies outside its tab: ${json(row.clipped)}`)
      check(row.unreachable.length === 0, `${key} row ${i}: a tab cannot be reached by scrolling the row: ${json(row.unreachable)}`)
    })
    check(json(rows[0].ids) === json(ORDER), `${key}: the global row is ${json(rows[0].ids)}, the registry has ${json(ORDER)}`)
    rowMetrics.push({ key, width: Number(width), global: { fits: rows[0].fits, client: rows[0].width, scroll: rows[0].scrollWidth } })
  }
  // Wider than 1440 px the shell keeps its 1440 px width, so what the global row has to work with does not change: the
  // same room, the same tabs, the same overflow (or none), however wide the window.
  const at1440 = rowMetrics.find((m) => m.key === "1440 /cv/").global
  for (const width of [1920, 2560]) {
    await setViewport(width, 900)
    await goto("/cv/")
    const now = await js(`(() => { const s = document.querySelector(".gl-folder__strip"); return { shell: Math.round(document.querySelector(".page-shell").getBoundingClientRect().width), client: s.clientWidth, scroll: s.scrollWidth, fits: s.scrollWidth <= s.clientWidth + 1 } })()`)
    // Two pixels of tolerance: the same layout rounds to a pixel more or less at another window width.
    check(now.shell === 1219 && Math.abs(now.client - at1440.client) <= 2 && Math.abs(now.scroll - at1440.scroll) <= 2 && now.fits === at1440.fits, `${width} px: shell ${now.shell} px, the global row ${json(now)}, at 1440 px it was ${json(at1440)}`)
  }
  // For the record, since it depends on the font: whether the eleven labels fit in one row at the desktop widths.
  const fonts = await platformFonts()
  console.log(`  observed (tabs in ${fonts.tab?.[0] ?? "an unknown font"}): the global row ${rowMetrics.filter((m) => m.width >= 1280).map((m) => `${m.key} ${m.global.fits ? "fits" : "scrolls"}`).join(", ")}`)
})

await test(
  "RESP-016",
  "Without JavaScript every tab is still reachable and opens",
  async (check) => {
    await send("Emulation.setScriptExecutionDisabled", { value: true })
    try {
      for (const mode of ["native", "no native"]) {
        if (mode === "no native") serve.withoutInitialTarget = true
        await setViewport(390, 844)
        await goto("/bearnards-area/powerlifting/")
        const rows = await rowsOf()
        if (mode === "native") {
          check(
            rows.every((r) => r.clear),
            `native, no script: ${json(rows)}`,
          )
        } else {
          // The rows open at their start, as in a browser without the native property.
          check(
            rows.every((r) => r.scrollLeft === 0),
            `no native, no script: ${json(rows)}`,
          )
        }
        // Scrolled by hand, the selected tab comes into reach and still opens its page.
        await js(
          `document.querySelector('.gl-folder[data-level="1"] .gl-folder-tab[data-tab-id="bearnards-area"]').scrollIntoView({ block: "nearest", inline: "center" }); scrollTo(0, 0)`,
        )
        const tab = await tabPoint(".gl-folders", "bearnards-area")
        const loaded = nextEvent("Page.loadEventFired")
        await moveTo(tab.x, tab.y)
        await send("Input.dispatchMouseEvent", {
          type: "mousePressed",
          x: tab.x,
          y: tab.y,
          button: "left",
          clickCount: 1,
        })
        await send("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x: tab.x,
          y: tab.y,
          button: "left",
          clickCount: 1,
        })
        await loaded
        check(
          await waitForPath("/bearnards-area/"),
          `${mode}: Bearnard's Area does not open without JavaScript`,
        )
        serve.withoutInitialTarget = false
      }
    } finally {
      serve.withoutInitialTarget = false
      await send("Emulation.setScriptExecutionDisabled", { value: false })
    }
  },
)

await test(
  "RESP-017",
  "Reduced motion changes nothing, and nothing animates",
  async (check) => {
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    })
    try {
      await setViewport(390, 844)
      await goto("/bearnards-area/powerlifting/")
      const rows = await rowsOf()
      check(
        rows.every((r) => r.clear),
        `reduced motion: ${json(rows)}`,
      )
      const moving = await js(
        `[...document.querySelectorAll("*")].filter((el) => { const s = getComputedStyle(el); return s.transitionDuration.split(",").some((d) => parseFloat(d) > 0) || s.animationName !== "none" || s.scrollBehavior === "smooth" }).map((el) => el.className).slice(0, 5)`,
      )
      check(moving.length === 0, `elements that move: ${json(moving)}`)
    } finally {
      await send("Emulation.setEmulatedMedia", { features: [] })
    }
    // Large text and zoom (case L): 200 % text at 390 px, and 1280 px at 200 % and 400 %
    // zoom (640 and 320 CSS px wide).
    for (const [width, scale] of [
      [390, 2],
      [640, 1],
      [320, 1],
    ]) {
      await setViewport(width, 844, width < 768)
      await goto("/cv/research/")
      if (scale !== 1)
        await js(`document.documentElement.style.fontSize = "${scale * 100}%"`)
      await sleep(60)
      const r = await js(`(() => {
      const labels = [...document.querySelectorAll(".gl-folder-tab__label")];
      const whole = labels.every((l) => l.scrollWidth <= l.clientWidth + 1);
      const rows = [...document.querySelectorAll(".gl-folder__tabs")].map((ul) => [...ul.children].map((li) => li.querySelector(".gl-folder-tab__label").getBoundingClientRect()));
      const overlap = rows.some((rects) => rects.some((a, i) => i > 0 && a.left < rects[i - 1].right - 1));
      return { whole, overlap, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    })()`)
      const where = `${width} px${scale !== 1 ? ` with ${scale * 100}% text` : ""}`
      check(r.overflow <= 0, `${where}: the page scrolls sideways by ${r.overflow} px`)
      check(r.whole, `${where}: a tab label is cut`)
      check(!r.overlap, `${where}: tab labels overlap`)
    }
  },
)

await finish()
