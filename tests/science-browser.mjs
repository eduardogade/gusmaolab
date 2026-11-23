// Browser checks for the scientific articles (P13): QTO-030, in headless Chromium through
// tests/browser-harness.mjs. They read the built Quarto specimen (/_design/quarto/), its ordinary
// Markdown counterpart (/_design/quarto/markdown/) and the real Greenhouse page. tests/science.mjs
// checks the markup; this checks what a reader sees and does: widths, overflow, links, history, focus.
//
// Run `npm run build`, then `npm run test:browser`. Without a browser every check is reported NOT
// RUN (exit code 2). Chromium only; screen readers are not covered, and MathML is drawn by
// Chromium's own engine (Safari and Firefox draw it differently).
import { json, startBrowser } from "./browser-harness.mjs"

const IDS = ["QTO-030", "QTO-030B", "QTO-030C", "QTO-030D"]
const { js, click, setViewport, goto, waitForPath, press, test, finish } =
  await startBrowser({
    ids: IDS,
    timeout: 400_000,
    // P22 (D-157): the Quarto study is a development page that only the demonstration build routes.
    root: "dist-demo",
  })
const SPECIMEN = "/_design/quarto/"
const MARKDOWN = "/_design/quarto/markdown/"
const overflow = () =>
  js(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)
const phone = (w) => w < 768
async function clickOn(selector) {
  const at = await js(`(() => {
    const el = document.querySelector(${json(selector)});
    el.scrollIntoView({ block: "center" });
    // A link that wraps has one box per line: the box around all of them has its middle between the lines, in
    // text that is not the link. Click inside the first line's box (found on the first GitHub run, P22-A01,
    // where the runner's wider fallback font wrapped a citation).
    const r = el.getClientRects()[0];
    return { x: r.left + Math.min(r.width / 2, 30), y: r.top + r.height / 2 };
  })()`)
  await click(at.x, at.y)
}

await test(
  "QTO-030",
  "Scientific content fits at 320, 390, 768, 1280 and 1440 px",
  async (check) => {
    for (const width of [320, 390, 768, 1280, 1440]) {
      await setViewport(width, 900, phone(width))
      for (const path of [SPECIMEN, MARKDOWN, "/lecture-notes/greenhouse/"]) {
        await goto(path)
        check(
          (await overflow()) <= 0,
          `${width} px ${path} scrolls sideways by ${await overflow()} px`,
        )
      }
      await goto(SPECIMEN)
      const r = await js(`(() => {
      const body = document.querySelector("[data-editorial-body]").getBoundingClientRect();
      const inside = (el) => { const b = el.getBoundingClientRect(); return b.left >= body.left - 1 && b.right <= body.right + 1; };
      const math = document.querySelector('span[id^="eq-"]');
      const blockMath = document.querySelector('math[display="block"]');
      const fig = document.querySelector(".quarto-float-fig img");
      const table = document.querySelector("table");
      return {
        equation: inside(math), equationScrolls: getComputedStyle(math).overflowX,
        mathFont: getComputedStyle(blockMath).fontFamily,
        figure: inside(fig), figureRatio: fig.naturalWidth > 0 ? Math.abs(fig.clientWidth / fig.clientHeight - fig.naturalWidth / fig.naturalHeight) < 0.05 : false,
        figureLoaded: fig.complete && fig.naturalWidth > 0,
        caption: document.querySelector(".quarto-float-caption").getBoundingClientRect().width > 120,
        table: inside(table), tableScroll: getComputedStyle(table).overflowX,
        refs: [...document.querySelectorAll(".csl-entry")].every(inside),
        code: [...document.querySelectorAll("pre")].every(inside),
        calloutKind: document.querySelector(".callout-title-container .screen-reader-only").getBoundingClientRect().width > 8,
        heading: [...document.querySelectorAll("[data-editorial-body] h2")].every(inside),
      };
    })()`)
      for (const key of [
        "equation",
        "figure",
        "figureRatio",
        "figureLoaded",
        "caption",
        "table",
        "refs",
        "code",
        "calloutKind",
        "heading",
      ])
        check(r[key] === true, `${width} px: ${key} is wrong (${json(r)})`)
      check(
        ["auto", "scroll"].includes(r.equationScrolls),
        `${width} px: the equation does not scroll inside its column`,
      )
      check(
        ["auto", "scroll"].includes(r.tableScroll),
        `${width} px: the table does not scroll inside its box`,
      )
      check(
        /math|STIX|Cambria|Latin Modern/i.test(r.mathFont),
        `${width} px: mathematics is set in ${r.mathFont}`,
      )
    }
  },
)

await test(
  "QTO-030B",
  "Cross-references, citations, footnotes and contents are links that work",
  async (check) => {
    await setViewport(1280, 900, false)
    const visible = (id) =>
      js(
        `(() => { const e = document.getElementById(${json(id)}); if (!e) return "missing"; const r = e.getBoundingClientRect(); return r.top >= -2 && r.top < innerHeight && r.bottom > 0 ? "yes" : "no (" + Math.round(r.top) + ")"; })()`,
      )
    for (const [link, target] of [
      ['a[href="#eq-se"]', "eq-se"],
      ['a[href="#fig-spread"]', "fig-spread"],
      ['a[href="#tbl-spread"]', "tbl-spread"],
      ['a[href="#ref-student1908"]', "ref-student1908"],
      ['a[href="#ref-efron1993"]', "ref-efron1993"],
      ["a.footnote-ref", "fn-halve"],
      ['[data-toc] a[href="#references"]', "references"],
    ]) {
      await goto(SPECIMEN)
      const exists = await js(`document.querySelector(${json(link)}) !== null`)
      check(exists, `no link ${link}`)
      if (!exists) continue
      await clickOn(link)
      const id = await js(`decodeURIComponent(location.hash.slice(1))`)
      check(id !== "", `${link} did not go anywhere`)
      check(
        (await visible(id)) === "yes",
        `${link}: its target ${id} is ${await visible(id)}`,
      )
      if (target !== id) check(id.length > 0, "")
    }
    // The footnote's backlink returns to the reference.
    await goto(SPECIMEN)
    await clickOn("a.footnote-ref")
    const note = await js(`location.hash.slice(1)`)
    await clickOn("a.footnote-back")
    check(
      (await js(`location.hash`)) ===
        `#${await js(`document.querySelector("a.footnote-ref").id`)}`,
      `the backlink went to ${await js("location.hash")}, not the reference (from #${note})`,
    )
    // Back and Forward after real clicks.
    await goto(SPECIMEN)
    await clickOn('a[href="#fig-spread"]')
    const after = await js(`location.hash`)
    await js(`history.back()`)
    await new Promise((r) => setTimeout(r, 200))
    check(
      (await js(`location.hash`)) === "",
      `Back left ${await js("location.hash")} (after ${after})`,
    )
    await js(`history.forward()`)
    await new Promise((r) => setTimeout(r, 200))
    check((await js(`location.hash`)) === after, "Forward did not return to the figure")
    // A direct URL with a fragment opens at the target.
    await goto(MARKDOWN)
    await goto(`${SPECIMEN}#tbl-spread`)
    await new Promise((r) => setTimeout(r, 200))
    check(
      (await visible("tbl-spread")) === "yes",
      `a direct #tbl-spread URL shows the table ${await visible("tbl-spread")}`,
    )
  },
)

await test(
  "QTO-030C",
  "Contents beside the text, focus visible, no motion",
  async (check) => {
    await setViewport(1440, 900, false)
    await goto(SPECIMEN)
    const r = await js(`(() => {
    const toc = document.querySelector("[data-toc]").getBoundingClientRect();
    const body = document.querySelector("[data-editorial-body]").getBoundingClientRect();
    return { beside: toc.left >= body.right - 1, links: document.querySelectorAll("[data-toc] a").length, animations: document.getAnimations().length };
  })()`)
    check(r.beside, "the contents overlap the text")
    check(r.links === 5, `${r.links} contents links`)
    check(r.animations === 0, `${r.animations} animations on the page`)
    let found = null
    for (let i = 0; i < 200 && found === null; i++) {
      await press("Tab")
      found = await js(`(() => {
      const a = document.activeElement;
      if (!a || !a.closest("[data-editorial-body]") || a.tagName !== "A") return null;
      const s = getComputedStyle(a);
      return { outline: s.outlineStyle, width: parseFloat(s.outlineWidth), text: a.textContent.trim().slice(0, 30) };
    })()`)
    }
    check(found !== null, "the keyboard never reached a link in the article")
    if (found)
      check(
        found.outline !== "none" && found.width > 0,
        `no visible focus on "${found.text}"`,
      )
    // Reduced motion changes nothing about the layout.
    await setViewport(1440, 900, false)
  },
)

await test(
  "QTO-030D",
  "The Quarto article and its Markdown counterpart look like one design",
  async (check) => {
    const measure = async (path) => {
      await goto(path)
      return js(`(() => {
      const art = document.querySelector("article");
      const css = (el, p) => getComputedStyle(el)[p];
      const body = document.querySelector("[data-editorial-body]");
      const p = body.querySelector("p");
      return {
        page: document.documentElement.dataset.category + "/" + (document.documentElement.dataset.environment ?? ""),
        h1: [css(art.querySelector("h1"), "fontFamily"), css(art.querySelector("h1"), "fontSize"), css(art.querySelector("h1"), "color")],
        bodyWidth: Math.round(body.getBoundingClientRect().width),
        p: [css(p, "fontFamily"), css(p, "fontSize"), css(p, "lineHeight"), css(p, "color")],
        paper: css(document.querySelector("main"), "backgroundColor"),
        meta: css(art.querySelector(".ed__meta"), "fontSize"),
        rows: document.querySelectorAll(".gl-folder").length,
        toc: document.querySelector("[data-toc]") !== null,
      };
    })()`)
    }
    await setViewport(1440, 900, false)
    const q = await measure(SPECIMEN)
    const m = await measure(MARKDOWN)
    check(json(q.h1) === json(m.h1), `titles differ: ${json(q.h1)} / ${json(m.h1)}`)
    check(json(q.p) === json(m.p), `body text differs: ${json(q.p)} / ${json(m.p)}`)
    check(
      q.bodyWidth === m.bodyWidth,
      `reading widths differ: ${q.bodyWidth} / ${m.bodyWidth}`,
    )
    check(q.paper === m.paper && q.page === m.page, "the paper or the category differs")
    check(q.meta === m.meta && q.rows === m.rows, "the header or the folders differ")
    check(q.toc && m.toc, "one of them has no contents list")
    await goto("/lecture-notes/greenhouse/")
    check(
      await waitForPath("/lecture-notes/greenhouse/"),
      "the real Greenhouse page is not reachable",
    )
  },
)

await finish()
