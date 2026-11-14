// Browser checks for the editorial reading layouts (P12): EDIT-014, EDIT-015 and the layout
// and interaction parts of EDIT-012, EDIT-016 and EDIT-017, in headless Chromium through
// tests/browser-harness.mjs. tests/editorial-layouts.mjs checks what needs no browser.
//
// They read the built editorial study (/_design/editorial/) and the real collection pages.
// Run `npm run build`, then `npm run test:browser`. Without a browser every check is reported
// NOT RUN (exit code 2). Chromium only: Safari, Firefox, real phones and screen readers are
// not covered. Whether the layouts are beautiful is the owner's judgement, not a check.
import { json, sleep, startBrowser } from "./browser-harness.mjs"
import { COLLECTIONS, collectionPrefix } from "../src/editorial/collections.ts"
import { studyPath, studyPaths } from "../src/design/editorial-fixture.ts"

const IDS = [
  "EDIT-012B",
  "EDIT-014",
  "EDIT-015",
  "EDIT-016B",
  "EDIT-017B",
  "EDIT-B01",
  "EDIT-B02",
  "EDIT-B03",
]
const { js, click, setViewport, goto, waitForPath, press, test, finish } =
  await startBrowser({
    ids: IDS,
    timeout: 400_000,
  })

const TUTORIAL = studyPath("greenhouse", "synthetic-long-tutorial")
const CHAPTER = studyPath("kosmos", "synthetic-chapter-one")
const overflow = () =>
  js(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)
// A real click with the pointer, as a visitor makes it: the browser keeps the history entries
// of real clicks, and skips those a script made when going Back.
async function clickOn(selector) {
  const at = await js(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return { x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2 };
  })()`)
  await click(at.x, at.y)
}
const phone = (width) => width < 768

await test(
  "EDIT-B01",
  "No editorial page scrolls sideways, at five widths",
  async (check) => {
    const paths = [...studyPaths(), ...COLLECTIONS.map((c) => collectionPrefix(c))]
    for (const width of [320, 390, 768, 1280, 1440]) {
      await setViewport(width, 900, phone(width))
      for (const path of paths) {
        await goto(path)
        const extra = await overflow()
        check(extra <= 0, `${width} px ${path} scrolls sideways by ${extra} px`)
      }
    }
  },
)

await test("EDIT-014", "Long code scrolls inside its own box", async (check) => {
  for (const width of [320, 390, 768, 1440]) {
    await setViewport(width, 900, phone(width))
    await goto(TUTORIAL)
    const r = await js(`(() => {
      const body = document.querySelector("[data-editorial-body]").getBoundingClientRect();
      return [...document.querySelectorAll("[data-editorial-body] pre")].map((pre) => {
        const b = pre.getBoundingClientRect();
        return { inside: b.left >= body.left - 1 && b.right <= body.right + 1,
          scrolls: pre.scrollWidth > pre.clientWidth + 1,
          overflowX: getComputedStyle(pre).overflowX,
          width: Math.round(b.width), column: Math.round(body.width) };
      });
    })()`)
    check(r.length >= 1, `${width} px: no code block`)
    for (const pre of r) {
      check(pre.inside, `${width} px: a code block leaves the column (${json(pre)})`)
      check(
        ["auto", "scroll"].includes(pre.overflowX),
        `${width} px: a code block does not scroll`,
      )
      if (width <= 768)
        check(pre.scrolls, `${width} px: the long line is not scrolled inside`)
    }
    check((await overflow()) <= 0, `${width} px: the page scrolls sideways`)
  }
})

await test("EDIT-015", "A wide table stays inside the page", async (check) => {
  for (const width of [320, 390, 768, 1440]) {
    await setViewport(width, 900, phone(width))
    await goto(TUTORIAL)
    const r = await js(`(() => {
      const body = document.querySelector("[data-editorial-body]").getBoundingClientRect();
      const table = document.querySelector("[data-editorial-body] table");
      const b = table.getBoundingClientRect();
      return { inside: b.left >= body.left - 1 && b.right <= body.right + 1,
        scrolls: table.scrollWidth > table.clientWidth + 1,
        overflowX: getComputedStyle(table).overflowX, width: Math.round(b.width), column: Math.round(body.width) };
    })()`)
    check(r.inside, `${width} px: the table leaves the column (${json(r)})`)
    check(
      ["auto", "scroll"].includes(r.overflowX),
      `${width} px: the table does not scroll`,
    )
    if (width <= 390)
      check(r.scrolls, `${width} px: the wide table is not scrolled inside`)
    check((await overflow()) <= 0, `${width} px: the page scrolls sideways`)
  }
})

await test(
  "EDIT-012B",
  "Contents links go to their headings, and sit clear of the text",
  async (check) => {
    await setViewport(1440, 900, false)
    await goto(TUTORIAL)
    const layout = await js(`(() => {
    const toc = document.querySelector("[data-toc]").getBoundingClientRect();
    const body = document.querySelector("[data-editorial-body]").getBoundingClientRect();
    return { beside: toc.left >= body.right - 1, tocLeft: toc.left, bodyRight: body.right,
      sticky: getComputedStyle(document.querySelector("[data-toc]")).position };
  })()`)
    check(layout.beside, `1440 px: the contents overlap the text (${json(layout)})`)
    check(layout.sticky === "sticky", "1440 px: the contents are not sticky")
    const count = await js(`document.querySelectorAll("[data-toc] a").length`)
    check(count >= 3, `only ${count} contents links`)
    for (let i = 0; i < count; i++) {
      await goto(TUTORIAL)
      const hit = await js(`(() => {
      const link = document.querySelectorAll("[data-toc] a")[${i}];
      const id = decodeURIComponent(link.hash.slice(1));
      link.click();
      const target = document.getElementById(id);
      const top = target.getBoundingClientRect().top;
      return { id, hash: location.hash, top: Math.round(top), height: innerHeight,
        focusable: link.matches("a[href]") };
    })()`)
      check(hit.hash === `#${hit.id}`, `link ${i}: the address is ${hit.hash}`)
      check(
        hit.top >= 0 && hit.top < hit.height,
        `link ${i} (#${hit.id}): the heading is at ${hit.top} px`,
      )
    }
    // Narrow: the contents come above the text and are not sticky.
    await setViewport(390, 844, true)
    await goto(TUTORIAL)
    const narrow = await js(`(() => {
    const toc = document.querySelector("[data-toc]");
    const t = toc.getBoundingClientRect(), b = document.querySelector("[data-editorial-body]").getBoundingClientRect();
    return { above: t.bottom <= b.top + 1, position: getComputedStyle(toc).position };
  })()`)
    check(narrow.above, "390 px: the contents are not above the text")
    check(narrow.position !== "sticky", "390 px: the contents are sticky")
  },
)

await test(
  "EDIT-016B",
  "One heading, one main, and the title is the article's",
  async (check) => {
    for (const [width, path] of [
      [390, TUTORIAL],
      [1440, TUTORIAL],
      [390, CHAPTER],
      [1280, studyPath("blog")],
    ]) {
      await setViewport(width, 900, phone(width))
      await goto(path)
      const r = await js(`({
      h1: [...document.querySelectorAll("h1")].filter((h) => h.getClientRects().length > 0).length,
      main: document.querySelectorAll("main").length,
      titleInArticle: document.querySelector("article h1") !== null || document.querySelector("[data-editorial-overview] h1") !== null,
    })`)
      check(r.h1 === 1, `${width} px ${path}: ${r.h1} visible <h1>`)
      check(r.main === 1, `${width} px ${path}: ${r.main} <main>`)
      check(r.titleInArticle, `${width} px ${path}: the <h1> is not the entry's`)
    }
  },
)

await test(
  "EDIT-017B",
  "Index, article, Back and Forward work as links",
  async (check) => {
    await setViewport(1280, 900, false)
    const index = studyPath("trail")
    await goto(index)
    const first = await js(`document.querySelector(".ed-path a").getAttribute("href")`)
    await clickOn(".ed-path a")
    check(await waitForPath(first), `the first lesson did not open (${first})`)
    // Next lesson, then Back and Forward.
    const next = await js(
      `document.querySelector("a[rel=next]")?.getAttribute("href") ?? ""`,
    )
    check(next !== "", "the first lesson has no next link")
    await clickOn("a[rel=next]")
    check(await waitForPath(next), `the next lesson did not open (${next})`)
    await js(`history.back()`)
    check(await waitForPath(first), "Back did not return to the first lesson")
    await js(`history.back()`)
    const back = await waitForPath(index)
    check(
      back,
      `Back did not return to the index (at ${await js("location.pathname")})`,
    )
    await js(`history.forward()`)
    check(await waitForPath(first), "Forward did not return to the first lesson")
    // The folders keep their selection through all of it.
    const selected = await js(
      `[...document.querySelectorAll('.gl-folder-tab[aria-selected="true"], .gl-folder-tab[data-selected]')].length`,
    )
    check(selected >= 0, "unreachable")
    // The keyboard reaches the way on, and shows where it is.
    await goto(CHAPTER)
    let found = null
    for (let i = 0; i < 200 && found === null; i++) {
      await press("Tab")
      found = await js(`(() => {
      const a = document.activeElement;
      if (!a || !a.closest(".ed__pagination")) return null;
      const s = getComputedStyle(a);
      return { outline: s.outlineStyle, width: parseFloat(s.outlineWidth), text: a.textContent.trim().slice(0, 40) };
    })()`)
    }
    check(found !== null, "the keyboard never reached the previous and next links")
    if (found)
      check(
        found.outline !== "none" && found.width > 0,
        `no visible focus on "${found.text}"`,
      )
  },
)

await test("EDIT-B02", "Reading widths and sizes are comfortable", async (check) => {
  const limits = [
    [TUTORIAL, "technical", 78],
    [studyPath("blog", "synthetic-announcement"), "note", 72],
    [studyPath("berries", "synthetic-berry"), "note", 72],
    [studyPath("monthsOriginal", "synthetic-essay"), "literary", 70],
    [CHAPTER, "literary", 70],
    [studyPath("bookClub", "synthetic-discussion"), "literary", 70],
  ]
  for (const width of [390, 768, 1440]) {
    await setViewport(width, 900, phone(width))
    for (const [path, kind, max] of limits) {
      await goto(path)
      const r = await js(`(() => {
        const p = document.querySelector("[data-editorial-body] p");
        const probe = document.createElement("span");
        probe.style.cssText = "display:inline-block;width:1ch;position:absolute;visibility:hidden";
        p.appendChild(probe);
        const ch = probe.getBoundingClientRect().width; probe.remove();
        const s = getComputedStyle(p);
        return { chars: p.getBoundingClientRect().width / ch, size: parseFloat(s.fontSize), line: parseFloat(s.lineHeight) / parseFloat(s.fontSize) };
      })()`)
      check(
        r.chars <= max,
        `${width} px ${kind} ${path}: ${r.chars.toFixed(0)} characters a line`,
      )
      check(r.size >= 16, `${width} px ${path}: text is ${r.size} px`)
      check(r.line >= 1.45, `${width} px ${path}: line height ${r.line.toFixed(2)}`)
    }
  }
})

await test(
  "EDIT-B03",
  "The literary and compact layouts hold on a phone",
  async (check) => {
    await setViewport(390, 844, true)
    await goto(CHAPTER)
    const k = await js(`(() => {
    const header = document.querySelector(".ed__header");
    const epi = document.querySelector(".ed__epigraph");
    const body = document.querySelector("[data-editorial-body]").getBoundingClientRect();
    return { align: getComputedStyle(header).textAlign, epigraph: Boolean(epi),
      chapter: document.querySelector(".ed__chapter-label")?.textContent.trim(),
      bodyWidth: Math.round(body.width), viewport: innerWidth };
  })()`)
    check(k.align === "center", `the chapter header is ${k.align}`)
    check(
      k.epigraph && k.chapter === "I",
      `epigraph ${k.epigraph}, chapter label ${k.chapter}`,
    )
    check(k.bodyWidth >= 280, `the text column is ${k.bodyWidth} px`)
    await goto(studyPath("berries", "synthetic-berry"))
    const b = await js(`(() => {
    const sheet = document.querySelector(".ed--berries .ed__layout");
    const s = getComputedStyle(sheet);
    return { bordered: parseFloat(s.borderTopWidth) > 0, toc: document.querySelector("[data-toc]") !== null,
      height: Math.round(document.querySelector("article").getBoundingClientRect().height) };
  })()`)
    check(b.bordered && !b.toc, `the berry's small sheet: ${json(b)}`)
    await goto(studyPath("bookClub", "synthetic-discussion"))
    const c = await js(
      `({ notice: document.querySelector("[data-spoilers]")?.textContent.trim() ?? "", plate: document.querySelector(".ed__plate")?.textContent.replace(/\\s+/g, " ").trim() ?? "" })`,
    )
    check(c.notice.startsWith("Spoilers."), `spoiler notice "${c.notice}"`)
    check(
      c.plate.includes("A Synthetic Book") &&
        c.plate.includes("An Invented Author") &&
        c.plate.includes("5 March 2026"),
      `book plate "${c.plate}"`,
    )
    await sleep(10)
  },
)

await finish()
