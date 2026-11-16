// The demonstration pages at five widths (P13-A01): P13A-029B, in headless Chromium against the
// demonstration build (dist-demo/, `npm run demo:build`). tests/demo-dev-browser.mjs walks the same
// pages through the dev server by clicking; this file checks what a reader sees: no page scrolls
// sideways at 320, 390, 768, 1280 and 1440 px, equations, figures, tables and code stay in their
// box, the contents list sits beside the text on a wide paper and above it on a narrow one, the
// physical folders keep their geometry, and the demonstration links can be tapped.
//
// Chromium only; no Safari, Firefox, Android Chrome itself or screen reader; MathML is drawn by
// Chromium's own engine. Without a browser or dist-demo/ every check is reported NOT RUN (exit 2).
import { json, startBrowser } from "./browser-harness.mjs"

const IDS = ["P13A-029B"]
const { js, setViewport, goto, test, finish } = await startBrowser({
  ids: IDS,
  timeout: 300_000,
  root: "dist-demo",
})
const GREENHOUSE = "/lecture-notes/greenhouse/"
const PAGES = [
  "demo-scientific-markdown",
  "demo-synthetic-signals",
  "demo-markdown-and-quarto",
].map((s) => `${GREENHOUSE}${s}/`)
// An ordinary paragraph of the text: not one inside a callout, list, figure, table or quotation.
const PLAIN = `const plain = () => [...document.querySelectorAll("[data-editorial-body] p")].find((p) => !p.closest(".callout, li, figure, table, blockquote, .footnotes"));`
const overflow = () =>
  js(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)

await test(
  "P13A-029B",
  "The demonstration pages fit and behave at 320, 390, 768, 1280 and 1440 px",
  async (check) => {
    for (const width of [320, 390, 768, 1280, 1440]) {
      await setViewport(width, 900, width < 768)
      for (const path of [GREENHOUSE, ...PAGES]) {
        await goto(path)
        check(
          (await overflow()) <= 0,
          `${width} px ${path} scrolls sideways by ${await overflow()} px`,
        )
        const folders = await js(`(() => {
        const rows = [...document.querySelectorAll(".gl-folder__strip")];
        return { rows: rows.length, strips: rows.every((s) => s.getBoundingClientRect().right <= innerWidth + 1 || getComputedStyle(s).overflowX !== "visible") };
      })()`)
        check(
          folders.rows >= 2 && folders.rows <= 3 && folders.strips,
          `${width} px ${path}: folders ${json(folders)}`,
        )
      }
      // The Overview.
      await goto(GREENHOUSE)
      const overview = await js(`(() => {
      // The Publishing Workbench link (P14) shares the section: it must also fit and be tappable,
      // but it is not one of the three demonstrations.
      const links = [...document.querySelectorAll("[data-demo-section] a")];
      const demos = links.filter((a) => !a.closest("[data-workbench-link]"));
      const section = document.querySelector("[data-demo-section]").getBoundingClientRect();
      return { n: demos.length, all: links.length, tappable: links.every((a) => { const r = a.getBoundingClientRect(); return r.height >= 20 && r.width >= 44; }), inside: links.every((a) => { const r = a.getBoundingClientRect(); return r.left >= section.left - 1 && r.right <= section.right + 1; }) };
    })()`)
      check(
        overview.n === 3 && overview.all === 4 && overview.tappable && overview.inside,
        `${width} px Overview links: ${json(overview)}`,
      )

      // The Quarto article.
      await goto(PAGES[1])
      const q = await js(`(() => {
      ${PLAIN}
      const body = document.querySelector("[data-editorial-body]").getBoundingClientRect();
      const inside = (el) => { const b = el.getBoundingClientRect(); return b.left >= body.left - 1 && b.right <= body.right + 1; };
      const blockMath = document.querySelector('math[display="block"]');
      const eq = document.querySelector('span[id^="eq-"]');
      const fig = document.querySelector("#fig-signals img");
      const table = document.querySelector("table");
      const toc = document.querySelector("[data-toc]").getBoundingClientRect();
      const text = plain().getBoundingClientRect();
      const bib = [...document.querySelectorAll(".csl-entry")];
      return {
        equation: inside(eq), equationBox: ["auto", "scroll"].includes(getComputedStyle(eq).overflowX),
        mathDrawn: blockMath.getBoundingClientRect().width > 20,
        figure: inside(fig), figureLoaded: fig.complete && fig.naturalWidth > 0,
        figureRatio: Math.abs(fig.clientWidth / fig.clientHeight - fig.naturalWidth / fig.naturalHeight) < 0.05,
        caption: document.querySelector("#fig-signals-caption").getBoundingClientRect().width > 120,
        tableBox: inside(table) && ["auto", "scroll"].includes(getComputedStyle(table).overflowX),
        code: [...document.querySelectorAll("pre")].every((p) => inside(p) && ["auto", "scroll"].includes(getComputedStyle(p).overflowX)),
        bibliography: bib.length === 2 && bib.every(inside),
        headings: [...document.querySelectorAll("[data-editorial-body] h2")].every(inside),
        // Wide: the contents beside the text. Narrow: above it.
        tocBeside: toc.right <= text.left + 2 || toc.left >= text.right - 2,
        tocAbove: toc.bottom <= text.top + 2,
        paragraphWidth: Math.round(text.width),
      };
    })()`)
      for (const key of [
        "equation",
        "equationBox",
        "mathDrawn",
        "figure",
        "figureLoaded",
        "figureRatio",
        "caption",
        "tableBox",
        "code",
        "bibliography",
        "headings",
      ])
        check(
          q[key] === true,
          `${width} px Quarto article: ${key} is wrong (${json(q)})`,
        )
      check(
        width >= 1280 ? q.tocBeside : q.tocAbove,
        `${width} px: the contents list is in the wrong place (${json(q)})`,
      )
      check(
        q.paragraphWidth >= Math.min(width - 80, 300),
        `${width} px: the text is squeezed to ${q.paragraphWidth} px`,
      )

      // The Markdown article and the comparison keep the same type and measure as the Quarto one.
      const measures = []
      for (const path of PAGES) {
        await goto(path)
        measures.push(
          await js(
            `(() => { ${PLAIN} const p = plain(); const s = getComputedStyle(p); return [s.fontFamily, s.fontSize, Math.round(p.getBoundingClientRect().width)].join("|"); })()`,
          ),
        )
      }
      check(
        new Set(measures).size === 1,
        `${width} px: the three articles do not share type and measure: ${json(measures)}`,
      )
    }
  },
)

await finish()
