// Responsive checks that need no browser (P08): the built pages, the stylesheets and the
// scripts. Run `npm run build` first, or `npm run verify`.
//
// Layout at real widths, scrolling, touch, keyboard and focus can only be shown in a
// browser: tests/responsive-browser.mjs (`npm run test:browser`). These checks cannot
// prove them.
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { createNavigation, siteNavigation } from "../src/navigation/index.ts"
import { SECTIONS } from "../src/navigation/registry.ts"
import { elements, hasClass, layersOf, parse } from "./html-tree.mjs"

const repo = new URL("../", import.meta.url)
const dist = fileURLToPath(new URL("dist/", repo))
const read = (path) => readFile(new URL(path, repo), "utf8")
const page = (path) =>
  readFile(`${dist}${path.slice(1)}index.html`, "utf8").catch(() => "")

const pages = new Map()
for (const path of siteNavigation.pagePaths()) {
  const html = await page(path)
  if (html === "") {
    console.error(`FAIL: ${path} is not built. Run \`npm run build\` first.`)
    process.exit(1)
  }
  pages.set(path, {
    html,
    tree: parse(html),
    state: siteNavigation.resolve(path).state,
  })
}
const sources = {
  tokens: await read("src/styles/tokens.css"),
  environments: await read("src/styles/environments.css"),
  categories: await read("src/styles/categories.css"),
  global: await read("src/styles/global.css"),
  folders: await read("src/styles/folders.css"),
  rows: await read("src/scripts/folder-rows.ts"),
  previews: await read("src/scripts/folder-previews.ts"),
  page: await read("src/layouts/FolderPage.astro"),
}
const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
const ruleOf = (css, selector) => {
  const at = css.indexOf(`${selector} {`)
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at))
}

const results = []
function test(id, title, body) {
  const failures = []
  try {
    body((ok, message) => ok || failures.push(message))
  } catch (error) {
    failures.push(error.message)
  }
  results.push({ id, title, failures })
}

// --- Tests --------------------------------------------------------------------------------

test("RESP-006", "Parent pages still select Overview (built pages)", (check) => {
  for (const [path, { tree, state }] of pages) {
    const { layers } = layersOf(tree)
    const last = layers.at(-1)
    const selected = elements(last)
      .filter(hasClass("gl-folder-tab"))
      .filter((tab) => "data-selected" in tab.attrs)
      .map((tab) => tab.attrs["data-tab-id"])
    const expected = state.rows.at(-1).selectedId
    check(
      selected.length === 1 && selected[0] === expected,
      `${path} selects ${selected}`,
    )
    if (state.folder.children.length > 0) {
      check(
        expected === `overview:${state.folder.id}`,
        `${path} does not select its Overview`,
      )
    }
  }
})

test("RESP-007", "Every tab keeps a built destination", (check) => {
  let links = 0
  for (const [path, { tree }] of pages) {
    for (const a of elements(tree).filter((el) => el.tag === "a")) {
      const href = a.attrs.href ?? ""
      if (!href.startsWith("/")) continue
      links++
      const study = href === "/_design/tokens/" || href === "/_design/folders/"
      check(pages.has(href) || study, `${path} links to ${href}, which has no page`)
    }
  }
  check(links > 36 * 11, `only ${links} links found`)
})

test("RESP-008", "No fourth row, at any depth (built pages and model)", (check) => {
  for (const [path, { tree }] of pages) {
    const { layers } = layersOf(tree)
    check(layers.length <= 3, `${path} draws ${layers.length} levels`)
  }
  // Synthetic fixture: a content page three folders deep still shows three rows.
  const fixture = createNavigation(
    SECTIONS.map((s) =>
      s.id !== "cv"
        ? s
        : {
            ...s,
            children: s.children.map((c) =>
              c.id === "cv-research"
                ? {
                    ...c,
                    children: [
                      {
                        id: "synthetic-projects",
                        label: "Synthetic",
                        slug: "synthetic-projects",
                      },
                    ],
                  }
                : c,
            ),
          },
    ),
    [
      {
        path: "/cv/research/synthetic-projects/synthetic-paper/",
        owner: "synthetic-projects",
      },
    ],
  )
  const deep = fixture.resolve("/cv/research/synthetic-projects/synthetic-paper/")
  check(
    deep.found && deep.state.rows.length === 3,
    "a deep content page does not show three rows",
  )
})

test(
  "RESP-013",
  "One responsive implementation for every category and environment",
  (check) => {
    const environments = stripComments(sources.environments)
    check(
      !/@media|@container/.test(environments),
      "environments.css has its own responsive rules",
    )
    for (const token of [
      "--space-gutter",
      "--space-shell-padding",
      "--folder-nest-inset",
      "--folder-tab-height",
      "--folder-scroll-hint-size",
    ]) {
      check(!environments.includes(`${token}`), `an environment sets ${token}`)
    }
    check(
      !/\[data-environment/.test(stripComments(sources.folders)),
      "folders.css targets an environment",
    )
    // P09-A01: a category is five colours and nothing else, so it cannot change a layout.
    const categories = stripComments(sources.categories)
    check(
      !/@media|@container/.test(categories),
      "categories.css has its own responsive rules",
    )
    check(
      !/\[data-category\s*[~|^$*]?=/.test(stripComments(sources.folders)),
      "folders.css targets one particular category",
    )
    // No responsive rule anywhere is written for one environment.
    for (const [name, css] of Object.entries({
      folders: sources.folders,
      global: sources.global,
      tokens: sources.tokens,
    })) {
      for (const block of stripComments(css).matchAll(
        /@(media|container)[^{]*\{([^{}]*\{[^{}]*\})*[^{}]*\}/g,
      )) {
        check(
          !block[0].includes("data-environment"),
          `a responsive rule in ${name}.css targets an environment`,
        )
        check(
          !block[0].includes("data-category"),
          `a responsive rule in ${name}.css targets a category`,
        )
      }
    }
    // The built pages of the five categories and five environments share one stylesheet
    // set.
    const sheets = new Set()
    for (const path of [
      "/",
      "/cv/",
      "/blog/",
      "/lecture-notes/",
      "/writing/",
      "/bearnards-area/",
    ]) {
      sheets.add(
        json(
          [...pages.get(path).html.matchAll(/href="(\/_astro\/[^"]+\.css)"/g)].map(
            (m) => m[1],
          ),
        ),
      )
    }
    check(sheets.size === 1, `the pages load ${sheets.size} different stylesheet sets`)
  },
)

test("RESP-014", "Wide content is contained by the stylesheets", (check) => {
  const global = stripComments(sources.global)
  const folders = stripComments(sources.folders)
  check(
    /:where\(pre\)\s*\{[^}]*overflow-x:\s*auto/.test(global),
    "code blocks do not scroll inside themselves",
  )
  check(
    /:where\(math\[display="block"\]\)\s*\{[^}]*overflow-x:\s*auto/.test(global),
    "wide formulas do not scroll inside themselves",
  )
  check(
    /:where\(img, picture, video, canvas\)\s*\{[^}]*max-inline-size:\s*100%/.test(
      global,
    ),
    "images are not limited to their column",
  )
  check(
    /\.gl-scroll-x\s*\{[^}]*overflow-x:\s*auto/.test(global),
    "there is no .gl-scroll-x region",
  )
  const paper = ruleOf(folders, ".gl-folder__paper")
  check(
    /overflow-x:\s*auto/.test(paper),
    "the paper does not contain stray wide content",
  )
  check(
    /overflow-wrap:\s*break-word/.test(paper),
    "long words and addresses do not wrap",
  )
})

test("RESP-016", "Rows scroll natively; scripts only enhance them", (check) => {
  const folders = stripComments(sources.folders)
  const strip = ruleOf(folders, ".gl-folder__strip")
  check(/overflow-x:\s*auto/.test(strip), "rows do not scroll natively")
  check(
    /scroll-padding-inline:\s*calc\(\s*var\(--folder-scroll-hint-size\) \+ var\(--focus-ring-width\) \+ var\(--focus-ring-offset\)\s*\)/.test(
      strip,
    ),
    "focus can stop under the edge fades",
  )
  check(
    /scroll-initial-target:\s*nearest/.test(folders),
    "rows no longer open at their selected tab natively",
  )
  const rows = stripComments(sources.rows)
  check(
    /CSS\.supports\("scroll-initial-target", "nearest"\)/.test(rows),
    "the row script does not defer to native support",
  )
  check(
    !/scrollIntoView|\.focus\(|history\.|location\b|window\.scroll|scrollTo\(|scrollBy\(/.test(
      rows,
    ),
    "the row script scrolls the page, moves focus or navigates",
  )
  // It listens to one thing only: focus arriving in a row.
  const listeners = [...rows.matchAll(/addEventListener\("([a-z]+)"/g)].map((m) => m[1])
  check(
    json(listeners) === json(["focusin"]),
    `the row script listens to ${json(listeners)}`,
  )
  check(
    /row\.scrollLeft\s*\+?=/.test(rows),
    "the row script does not scroll the row itself",
  )
})

test("RESP-017", "Nothing animates", (check) => {
  const motion =
    /\b(?:transition|animation)(?:-[\w-]+)?\s*:|scroll-behavior\s*:\s*smooth/i
  for (const [name, text] of Object.entries(sources)) {
    check(!motion.test(stripComments(text)), `${name} adds motion`)
  }
  for (const name of ["rows", "previews"]) {
    check(
      !/behavior:\s*["']smooth["']|\.animate\(/.test(sources[name]),
      `${name} animates`,
    )
  }
})

test("RESP-015", "Desktop values are P07's from 1024 px up (tokens)", (check) => {
  // The new curves are min()s of P05's own: from 1024 px up, P05's term is the smaller.
  const tokens = stripComments(sources.tokens)
  const value = (name) =>
    tokens
      .match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]
      .replace(/\s+/g, " ")
      .trim()
  check(
    value("--space-gutter") === "clamp(0.5rem, 0.1rem + 2vw, 1.9rem)",
    "the gutter changed",
  )
  check(
    value("--space-shell-padding") ===
      "clamp( 0.25rem, min(0.3rem + 0.9vw, 1.58vw - 0.135rem), 1.125rem )",
    `the shell padding is ${value("--space-shell-padding")}`,
  )
  check(
    value("--folder-nest-inset") ===
      "clamp(0.25rem, min(0.3rem + 1vw, 1.741vw - 0.174rem), 1rem)",
    `the nest inset is ${value("--folder-nest-inset")}`,
  )
  const px = (rem, vw, width) => rem * 16 + (vw / 100) * width
  for (const width of [1024, 1280, 1440]) {
    check(
      px(0.3, 0.9, width) <= px(-0.135, 1.58, width) + 0.05,
      `shell padding departs from P05 at ${width} px`,
    )
    check(
      px(0.3, 1, width) <= px(-0.174, 1.741, width) + 0.05,
      `nest inset departs from P05 at ${width} px`,
    )
  }
  // The gutter stops growing exactly where it was at 1440 px.
  check(
    Math.abs(px(0.1, 2, 1440) - 1.9 * 16) < 0.01,
    "the gutter cap is not its 1440 px value",
  )
})

// --- Report -------------------------------------------------------------------------------

function json(value) {
  return JSON.stringify(value)
}
let failed = 0
for (const { id, title, failures } of results) {
  if (failures.length === 0) {
    console.log(`PASS ${id} ${title}`)
  } else {
    failed++
    console.error(`FAIL ${id} ${title}`)
    for (const message of failures.slice(0, 12)) console.error(`  - ${message}`)
    if (failures.length > 12) console.error(`  … and ${failures.length - 12} more`)
  }
}
if (failed > 0) process.exit(1)
console.log(
  `PASS: ${results.length} responsive checks without a browser; ${pages.size} folder pages`,
)
