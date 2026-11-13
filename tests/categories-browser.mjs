// Browser checks for the Chromatic Archive (P09-A01, D-076): CAT-011 to CAT-017, in
// headless Chromium through tests/browser-harness.mjs. tests/categories.mjs checks the
// declarations and the markup; these read the colours the browser actually paints, on
// the real angled tabs, so a rule that overrides a tab's category cannot pass.
//
// The locked values below are this file's own copy, on purpose (as in categories.mjs).
// The derived colours (dimmed and hovered tabs) come from the stylesheets through the
// token reader, so the browser and the contrast tests are held to the same numbers.
//
// Run `npm run build`, then `npm run test:browser`. Without a browser every check is
// reported NOT RUN (exit code 2). Chromium only.
import { readFile } from "node:fs/promises"
import { readTokens } from "../src/design/css-tokens.mjs"
import { siteNavigation } from "../src/navigation/index.ts"
import { json, sleep, startBrowser } from "./browser-harness.mjs"

/** The five palettes: flannel ground, flannel line, level 1, level 2, reading paper. */
const LOCKED = {
  core: ["#303134", "#74716e", "#a09a91", "#cbc5b9", "#f4f2ec"],
  research: ["#47403b", "#947d65", "#bbaa8c", "#ded0b7", "#fcf4e6"],
  "blog-notes": ["#5d3a35", "#ad6f5e", "#d1ab92", "#e9c3aa", "#fff3e9"],
  writing: ["#68502f", "#c6a05c", "#e7c46b", "#f2dea3", "#fffae5"],
  bearnard: ["#344656", "#819daa", "#d5e0e6", "#eaf0f1", "#fafcfd"],
}
const [GROUND, LINE, LEVEL1, LEVEL2, PAPER] = [0, 1, 2, 3, 4]
const SHELL = "#29282c"
const LINK = "#275b52"
const ACCENT = "#275b52"
const V = "#26313b"

/** One page for each category, the two-level pages of the brief, and a deep one. */
const PAGES = [
  "/",
  "/cv/",
  "/blog/",
  "/writing/",
  "/bearnards-area/",
  "/cv/research/",
  "/writing/kosmos/",
  "/lecture-notes/greenhouse/",
  "/bearnards-area/powerlifting/",
]

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")
const tokens = readTokens(
  await read("src/styles/tokens.css"),
  await read("src/styles/categories.css"),
  await read("src/styles/environments.css"),
)
const derived = (name, category) => tokens.color(name, category).hex
const sections = siteNavigation.sections
const categoryOf = (path) => siteNavigation.resolve(path).state.category

const { js, setViewport, moveTo, click, goto, waitForPath, state, away, test, finish } =
  await startBrowser({
    ids: Array.from({ length: 7 }, (_, i) => `CAT-0${11 + i}`),
    timeout: 240_000,
  })

// --- Colours as the browser reports them --------------------------------------------------

/** "rgb(…)", "rgba(…)", "color(srgb …)" or "#rrggbb" → [r, g, b] in 0–255, or null. */
function rgb(text) {
  const value = String(text).trim()
  let m = value.match(/^#([0-9a-f]{6})$/i)
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16))
  m = value.match(/^rgba?\(([^)]+)\)$/)
  if (m) {
    const parts = m[1].split(/[\s,/]+/).map(Number)
    return parts.length > 3 && parts[3] < 1 ? null : parts.slice(0, 3)
  }
  m = value.match(/^color\(srgb ([^)]+)\)$/)
  if (m) {
    const parts = m[1].split(/[\s/]+/).map(Number)
    return parts.length > 3 && parts[3] < 1
      ? null
      : parts.slice(0, 3).map((n) => n * 255)
  }
  return null
}
/** The same colour, to within one step of an 8-bit channel. */
const same = (painted, expected) => {
  const a = rgb(painted)
  const b = rgb(expected)
  return a !== null && b !== null && a.every((n, i) => Math.abs(n - b[i]) <= 1)
}

// What the page paints: the flannel, the shell, each level's tabs and body, the paper, the
// V and a link on the paper (a temporary one where the page has none).
const PAINT = `(() => {
  const css = (el, pseudo) => getComputedStyle(el, pseudo);
  const fill = (tab) => css(tab.querySelector(".gl-folder-tab__shape"), "::before").backgroundColor;
  const levels = [...document.querySelectorAll(".gl-folder")].map((folder) => {
    const strip = folder.querySelector(":scope > .gl-folder__strip");
    const box = strip.getBoundingClientRect();
    return {
      level: folder.dataset.level,
      body: css(folder.querySelector(":scope > .gl-folder__body")).backgroundColor,
      tabs: [...strip.querySelectorAll(".gl-folder-tab")].map((tab) => {
        const r = tab.getBoundingClientRect();
        return {
          id: tab.dataset.tabId,
          category: tab.dataset.category,
          selected: tab.hasAttribute("data-selected"),
          fill: fill(tab),
          visible: r.left >= box.left - 1 && r.right <= box.right + 1,
        };
      }),
    };
  });
  const paper = document.querySelector(".gl-folder__paper");
  let link = paper.querySelector("a[href]");
  const temporary = !link;
  if (temporary) {
    link = document.createElement("a");
    link.href = "/";
    link.textContent = "link";
    paper.append(link);
  }
  const linkColor = css(link).color;
  if (temporary) link.remove();
  const preview = document.querySelector(".gl-folder-preview");
  return {
    category: document.documentElement.dataset.category,
    ground: css(document.body).backgroundColor,
    line: css(document.body).getPropertyValue("--color-flannel-line").trim(),
    shell: css(document.querySelector(".page-shell")).backgroundColor,
    levels,
    paper: css(paper).backgroundColor,
    link: linkColor,
    accent: preview ? css(preview).borderTopColor : null,
    vs: [...document.querySelectorAll(".gl-folder-tab__indicator")].map((v) => css(v).stroke),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
})()`
const paint = () => js(PAINT)
const fillOf = (id) =>
  js(
    `getComputedStyle(document.querySelector('.gl-folder-tab[data-tab-id="${id}"] .gl-folder-tab__shape'), "::before").backgroundColor`,
  )
const previewOf = (id) =>
  js(`(() => {
    const panel = document.querySelector('.gl-folder-preview[data-preview-of="${id}"]');
    return { open: panel.matches(":popover-open"), background: getComputedStyle(panel).backgroundColor };
  })()`)

// --- Tests --------------------------------------------------------------------------------

await test(
  "CAT-011",
  "Every top-level tab is painted in its own cardstock, on every page",
  async (check) => {
    for (const width of [1440, 390]) {
      await setViewport(width, 900, width < 768)
      for (const path of PAGES) {
        await goto(path)
        const page = await paint()
        const [row] = page.levels
        check(
          json(row.tabs.map((tab) => tab.id)) === json(sections.map((node) => node.id)),
          `${width} px ${path}: the global row is [${row.tabs.map((tab) => tab.id)}]`,
        )
        for (const [i, tab] of row.tabs.entries()) {
          const category = sections[i].category
          check(
            tab.category === category,
            `${width} px ${path}: ${tab.id} is marked ${tab.category}, not ${category}`,
          )
          const expected = tab.selected
            ? LOCKED[category][LEVEL1]
            : derived("--color-folder-tab-inactive", category)
          check(
            same(tab.fill, expected),
            `${width} px ${path}: ${tab.id} is painted ${tab.fill}, expected ${expected} (${category})`,
          )
        }
      }
    }
  },
)

await test(
  "CAT-012",
  "The selected tab and its open folder are one material, at both levels",
  async (check) => {
    await setViewport(1440, 900)
    for (const path of PAGES) {
      await goto(path)
      const page = await paint()
      const category = categoryOf(path)
      check(page.levels.length <= 3, `${path} draws ${page.levels.length} folder rows`)
      const [first, second] = page.levels
      const open = first.tabs.find((tab) => tab.selected)
      check(
        same(first.body, LOCKED[category][LEVEL1]) && same(open.fill, first.body),
        `${path}: the ${open.id} tab is ${open.fill} and its folder ${first.body}, expected ${LOCKED[category][LEVEL1]}`,
      )
      if (!second) continue
      const nested = second.tabs.find((tab) => tab.selected)
      check(
        same(second.body, LOCKED[category][LEVEL2]) && same(nested.fill, second.body),
        `${path}: the ${nested.id} tab is ${nested.fill} and its folder ${second.body}, expected ${LOCKED[category][LEVEL2]}`,
      )
      const dimmed = derived("--color-folder-tab-inactive-nested", category)
      for (const tab of second.tabs.filter((tab) => !tab.selected)) {
        check(
          same(tab.fill, dimmed),
          `${path}: the second-level tab ${tab.id} is ${tab.fill}, expected ${dimmed}`,
        )
      }
    }
  },
)

await test(
  "CAT-013",
  "Reading paper and flannel follow the page; the shell never changes",
  async (check) => {
    await setViewport(1440, 900)
    for (const path of PAGES) {
      await goto(path)
      const page = await paint()
      const palette = LOCKED[categoryOf(path)]
      check(page.category === categoryOf(path), `${path} is marked ${page.category}`)
      check(
        same(page.paper, palette[PAPER]),
        `${path}: paper ${page.paper}, expected ${palette[PAPER]}`,
      )
      check(
        same(page.ground, palette[GROUND]),
        `${path}: flannel ground ${page.ground}, expected ${palette[GROUND]}`,
      )
      check(
        same(page.line, palette[LINE]),
        `${path}: flannel line ${page.line}, expected ${palette[LINE]}`,
      )
      check(same(page.shell, SHELL), `${path}: shell ${page.shell}, expected ${SHELL}`)
    }
  },
)

await test(
  "CAT-014",
  "Links, the accent and the V are the same colours on every page",
  async (check) => {
    await setViewport(1440, 900)
    for (const path of PAGES) {
      await goto(path)
      const page = await paint()
      check(same(page.link, LINK), `${path}: a link is ${page.link}, expected ${LINK}`)
      check(
        page.accent === null || same(page.accent, ACCENT),
        `${path}: the accent is ${page.accent}, expected ${ACCENT}`,
      )
      check(page.vs.length > 0, `${path} shows no V`)
      for (const stroke of page.vs)
        check(same(stroke, V), `${path}: a V is ${stroke}, expected ${V}`)
    }
  },
)

await test(
  "CAT-015",
  "A hovered tab keeps its own hue, moves no V, and previews in its own cardstock",
  async (check) => {
    await setViewport(1440, 900)
    await goto("/cv/")
    await away()
    const before = await state()
    for (const [id, category] of [
      ["writing", "writing"],
      ["bearnards-area", "bearnard"],
      ["lecture-notes", "blog-notes"],
      ["lab", "research"],
    ]) {
      const point = await js(`(() => {
        const r = document.querySelector('.gl-folder-tab[data-tab-id="${id}"]').getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`)
      await moveTo(point.x, point.y, 4)
      await sleep(260)
      const hover = derived("--color-folder-tab-hover", category)
      const fill = await fillOf(id)
      check(
        same(fill, hover),
        `hovered ${id} is ${fill}, expected ${hover} (${category})`,
      )
      const during = await state()
      check(
        json([during.path, during.category, during.selected, during.vs]) ===
          json([before.path, before.category, before.selected, before.vs]),
        `hovering ${id} changed the page, the selection or the V`,
      )
      const panel = await previewOf(id)
      check(panel.open, `hovering ${id} did not open its preview`)
      check(
        same(panel.background, LOCKED[category][LEVEL2]),
        `the ${id} preview is ${panel.background}, expected ${LOCKED[category][LEVEL2]} (${category})`,
      )
      // The folder that is open keeps its own material meanwhile.
      const page = await paint()
      check(
        same(page.levels[0].body, LOCKED.research[LEVEL1]) &&
          same(page.paper, LOCKED.research[PAPER]) &&
          same(page.ground, LOCKED.research[GROUND]),
        `hovering ${id} recoloured the open Research folder`,
      )
    }
    await away()
  },
)

await test(
  "CAT-016",
  "CV → Writing: the tabs keep their colours and only the open folder changes",
  async (check) => {
    await setViewport(1440, 900)
    await goto("/cv/")
    await away()
    const from = await paint()
    const point = await js(`(() => {
      const r = document.querySelector('.gl-folder-tab[data-tab-id="writing"] a').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`)
    await moveTo(point.x, point.y, 4)
    await click(point.x, point.y)
    check(await waitForPath("/writing/"), "the click did not open /writing/")
    await sleep(400)
    await away()
    await sleep(300)
    const to = await paint()
    const before = new Map(from.levels[0].tabs.map((tab) => [tab.id, tab]))
    for (const tab of to.levels[0].tabs) {
      const was = before.get(tab.id)
      if (tab.id === "cv" || tab.id === "writing") continue
      check(
        same(tab.fill, was.fill) && tab.category === was.category,
        `${tab.id} changed from ${was.fill} to ${tab.fill}`,
      )
    }
    const tabOf = (page, id) => page.levels[0].tabs.find((tab) => tab.id === id)
    check(
      same(tabOf(from, "cv").fill, LOCKED.research[LEVEL1]) &&
        same(tabOf(to, "cv").fill, derived("--color-folder-tab-inactive", "research")),
      `CV went from ${tabOf(from, "cv").fill} to ${tabOf(to, "cv").fill}`,
    )
    check(
      same(
        tabOf(from, "writing").fill,
        derived("--color-folder-tab-inactive", "writing"),
      ) && same(tabOf(to, "writing").fill, LOCKED.writing[LEVEL1]),
      `Writing went from ${tabOf(from, "writing").fill} to ${tabOf(to, "writing").fill}`,
    )
    check(
      tabOf(to, "writing").selected && !tabOf(to, "cv").selected,
      "the selection did not move to Writing",
    )
    check(
      same(to.levels[0].body, LOCKED.writing[LEVEL1]),
      `the open folder is ${to.levels[0].body}, expected Golden Honey`,
    )
    check(same(to.paper, LOCKED.writing[PAPER]), `the paper is ${to.paper}`)
    check(
      same(to.ground, LOCKED.writing[GROUND]) && same(to.line, LOCKED.writing[LINE]),
      `the flannel is ${to.ground} with ${to.line}`,
    )
    check(same(from.shell, SHELL) && same(to.shell, SHELL), "the shell changed")
    check(
      to.vs.every((stroke) => same(stroke, V)) && same(to.link, LINK),
      "the V or the link colour changed",
    )
  },
)

await test(
  "CAT-017",
  "Small screens: the selected tab is in view, in its own colour, among the others",
  async (check) => {
    for (const width of [390, 320]) {
      await setViewport(width, 844, true)
      for (const path of [
        "/",
        "/writing/",
        "/bearnards-area/powerlifting/",
        "/cv/research/",
      ]) {
        await goto(path)
        await sleep(120)
        const page = await paint()
        const category = categoryOf(path)
        check(page.overflow <= 0, `${width} px ${path} scrolls sideways`)
        for (const [i, level] of page.levels.entries()) {
          const selected = level.tabs.find((tab) => tab.selected)
          check(
            selected?.visible,
            `${width} px ${path}: the selected ${selected?.id} tab is out of view`,
          )
          check(
            same(selected.fill, LOCKED[category][i === 0 ? LEVEL1 : LEVEL2]),
            `${width} px ${path}: the selected ${selected.id} tab is ${selected.fill}`,
          )
        }
        // The row still holds every section, each in its own category's cardstock.
        const colours = new Set(
          page.levels[0].tabs.filter((tab) => !tab.selected).map((tab) => tab.category),
        )
        check(
          page.levels[0].tabs.length === sections.length && colours.size >= 4,
          `${width} px ${path}: the row shows ${page.levels[0].tabs.length} tabs in ${colours.size} categories`,
        )
        for (const [i, tab] of page.levels[0].tabs.entries()) {
          if (tab.selected) continue
          const expected = derived("--color-folder-tab-inactive", sections[i].category)
          check(
            same(tab.fill, expected),
            `${width} px ${path}: ${tab.id} is ${tab.fill}, expected ${expected}`,
          )
        }
      }
    }
  },
)

await finish()
