// Physical-folder component tests (P05): FOLD-001 to FOLD-010. They read the folder study
// (/_design/folders/) and the P03 specimen (/_design/tokens/ since P06) from a throwaway
// demonstration build (tests/demo-dist.mjs: since P22, D-157, a release has no development
// page), so they need no build first. P06 brought the Overview tab:
// every row now has exactly one selected tab. P09-A01 (D-076): eleven sections, and case
// E shows the categories; tests/categories.mjs checks their colours.
//
// They prove structure: levels, nesting, selection, the V, labels, categories and the
// content slot. They cannot prove that the page looks like paper folders; that needs the
// visual review recorded in development/acceptance-matrix.md.
import { readFile } from "node:fs/promises"
import { demoBuild } from "./demo-dist.mjs"
import { MAX_TAB_LEVELS, siteNavigation } from "../src/navigation/index.ts"
import {
  childrenOf,
  classes,
  elements,
  hasClass,
  labelOf,
  layersOf,
  parse,
  selectedOf,
  tabsOf,
  textOf,
} from "./html-tree.mjs"

const repo = new URL("../", import.meta.url)
const read = (path) => readFile(new URL(path, repo), "utf8")

let studyHtml, specimenHtml, demo
try {
  demo = await demoBuild()
  studyHtml = await demo.read("_design/folders/index.html")
  specimenHtml = await demo.read("_design/tokens/index.html")
} catch (error) {
  console.error(`FAIL: the demonstration build's pages are missing: ${error.message}`)
  process.exit(1)
}
const foldersCss = await read("src/styles/folders.css")
const specimenSheets = [
  ...specimenHtml.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\/([^"]+)"/g),
].map((m) => m[1])
const specimenCss = (
  await Promise.all(specimenSheets.map((href) => demo.read(href)))
).join("\n")

const study = parse(studyHtml)
const all = elements(study)
const cases = new Map(
  all
    .filter((el) => "data-study-case" in el.attrs)
    .map((el) => [el.attrs["data-study-case"], el]),
)

// The navigation state each real-registry case was built from.
const expectedUrls = {
  a: "/",
  b: "/cv/research/",
  d: "/cv/outreach/",
  f: "/cv/",
  "e-research": "/lab/research-areas/",
  "e-blog-notes": "/lecture-notes/greenhouse/",
  "e-writing": "/writing/kosmos/",
  "e-bearnard": "/bearnards-area/powerlifting/",
}
const stateOf = (id) => {
  const result = siteNavigation.resolve(expectedUrls[id])
  if (!result.found) throw new Error(`${expectedUrls[id]} is not registered`)
  return result.state
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

test("FOLD-001", "Single-level rendering", (check) => {
  const { stack, layers } = layersOf(cases.get("a"))
  check(
    stack.attrs["data-folder-depth"] === "1",
    "case A's stack is not one level deep",
  )
  check(layers.length === 1, `case A renders ${layers.length} levels, expected 1`)
  const [layer] = layers
  check(layer.attrs["data-level"] === "1", "case A's level is not level 1")
  const labels = tabsOf(layer).map(labelOf)
  const expected = siteNavigation.sections.map((node) => node.label)
  check(
    JSON.stringify(labels) === JSON.stringify(expected),
    `case A shows [${labels.join(", ")}], expected the eleven sections in order`,
  )
  const body = childrenOf(layer, hasClass("gl-folder__body"))
  check(body.length === 1, "case A's folder has no open body")
  check(
    body.length === 1 && childrenOf(body[0], hasClass("gl-folder__paper")).length === 1,
    "case A's body does not hold the page's paper",
  )
})

test("FOLD-002", "Two-level rendering", (check) => {
  const { layers } = layersOf(cases.get("b"))
  check(layers.length === 2, `case B renders ${layers.length} levels, expected 2`)
  const [outer, inner] = layers
  const outerBody = childrenOf(outer, hasClass("gl-folder__body"))[0]
  check(inner.parent === outerBody, "level 2 is not inside level 1's body")
  check(inner.attrs["data-level"] === "2", "the nested folder is not level 2")
  check(
    tabsOf(outer).length === 11,
    "the global row is not fully visible above level 2",
  )
  const cvChildren = siteNavigation.node("cv").children.map((node) => node.label)
  check(
    JSON.stringify(tabsOf(inner).map(labelOf)) ===
      JSON.stringify(["Overview", ...cvChildren]),
    "level 2 does not show CV's Overview and folders in order",
  )
})

test("FOLD-003", "Three-level rendering, never a fourth", (check) => {
  const caseC = cases.get("c")
  const { stack, layers } = layersOf(caseC)
  check(layers.length === 3, `case C renders ${layers.length} levels, expected 3`)
  check(
    stack.attrs["data-folder-depth"] === "3",
    "case C's stack is not three levels deep",
  )
  layers.forEach((layer, i) => {
    check(
      layer.attrs["data-level"] === String(i + 1),
      `case C's level ${i + 1} is mislabelled`,
    )
    if (i > 0) {
      const body = childrenOf(layers[i - 1], hasClass("gl-folder__body"))[0]
      check(layer.parent === body, `level ${i + 1} is not inside level ${i}'s body`)
    }
  })
  const deepest = childrenOf(layers[2], hasClass("gl-folder__body"))[0]
  check(
    deepest !== undefined &&
      childrenOf(deepest, hasClass("gl-folder__paper")).length === 1,
    "the page's paper is not inside the third folder",
  )
  const levels = new Set(
    all.filter(hasClass("gl-folder")).map((el) => el.attrs["data-level"]),
  )
  check(
    [...levels].every((level) => Number(level) >= 1 && Number(level) <= MAX_TAB_LEVELS),
    `the study renders levels [${[...levels].join(", ")}]; at most ${MAX_TAB_LEVELS} exist`,
  )
  const depths = all
    .filter(hasClass("gl-folders"))
    .map((el) => Number(el.attrs["data-folder-depth"]))
  check(Math.max(...depths) <= MAX_TAB_LEVELS, "a stack is deeper than three levels")
  // Research's Overview, then the synthetic folders.
  const [first, ...rest] = tabsOf(layers[2]).map((tab) => tab.attrs["data-tab-id"])
  check(
    first === "overview:cv-research" && rest.every((id) => id.startsWith("synthetic-")),
    "case C's third level is not the synthetic fixture",
  )
  check(
    /synthetic fixture/i.test(textOf(caseC)),
    "case C does not say its third level is synthetic",
  )
})

test("FOLD-004", "Exactly one selected tab per level", (check) => {
  for (const [id, caseElement] of cases) {
    if (!elements(caseElement).some(hasClass("gl-folders"))) continue
    const { layers } = layersOf(caseElement)
    for (const layer of layers) {
      const selected = selectedOf(layer)
      check(
        selected.length === 1,
        `case ${id} level ${layer.attrs["data-level"]} has ${selected.length} selected tabs`,
      )
    }
    if (id in expectedUrls) {
      const ids = layers.flatMap((layer) =>
        selectedOf(layer).map((tab) => tab.attrs["data-tab-id"]),
      )
      const expected = stateOf(id).rows.map((row) => row.selectedId)
      check(
        JSON.stringify(ids) === JSON.stringify(expected),
        `case ${id} selects [${ids.join(", ")}], the registry resolves [${expected.join(", ")}]`,
      )
    }
  }
  const selectedIn = (id) =>
    layersOf(cases.get(id)).layers.flatMap((layer) =>
      selectedOf(layer).map((tab) => tab.attrs["data-tab-id"]),
    )
  for (const [id, expected] of [
    ["c", ["cv", "cv-research", "synthetic-projects"]],
    ["g", ["cv", "cv-research", "overview:cv-research"]],
  ]) {
    check(
      JSON.stringify(selectedIn(id)) === JSON.stringify(expected),
      `case ${id} selects [${selectedIn(id).join(", ")}]`,
    )
  }
  // The study's tabs are labels, not links: each selected label is marked "true", and
  // none claims to be this page.
  const current = all.filter((el) => "aria-current" in el.attrs)
  const selected = all.filter((el) => "data-selected" in el.attrs)
  check(
    current.length === selected.length,
    "aria-current does not match the selected tabs",
  )
  check(
    current.every(
      (el) =>
        hasClass("gl-folder-tab__label")(el) &&
        el.attrs["aria-current"] === "true" &&
        "data-selected" in el.parent.attrs,
    ),
    "aria-current is on something other than a selected tab's label, or says page",
  )
  check(
    !/role="(tab|tablist|tabpanel)"/.test(studyHtml),
    "the study uses ARIA tab roles",
  )
})

test("FOLD-005", "The V indicator", (check) => {
  const tabs = all.filter(hasClass("gl-folder-tab"))
  for (const tab of tabs) {
    const marks = elements(tab).filter(hasClass("gl-folder-tab__indicator"))
    const label = `${tab.attrs["data-tab-id"]}`
    if ("data-selected" in tab.attrs) {
      check(
        marks.length === 1,
        `selected tab ${label} has ${marks.length} V indicators`,
      )
      check(
        marks.every((m) => m.tag === "svg" && m.attrs["aria-hidden"] === "true"),
        `the V on ${label} is not a decorative SVG`,
      )
    } else {
      check(marks.length === 0, `inactive tab ${label} has a V indicator`)
    }
  }
})

test("FOLD-006", "Inactive tabs stay present and labelled", (check) => {
  const labels = new Map(
    [...siteNavigation.nodes.values()].map((node) => [node.id, node.label]),
  )
  let inactive = 0
  for (const tab of all.filter(hasClass("gl-folder-tab"))) {
    const id = tab.attrs["data-tab-id"]
    const label = labelOf(tab)
    check(label.length > 0, `tab ${id} has no label`)
    if (labels.has(id)) check(label === labels.get(id), `tab ${id} reads "${label}"`)
    if ("data-selected" in tab.attrs) continue
    inactive++
    check(
      !("aria-disabled" in tab.attrs) && !("disabled" in tab.attrs),
      `tab ${id} looks disabled`,
    )
  }
  for (const [id, caseElement] of cases) {
    if (!elements(caseElement).some(hasClass("gl-folders"))) continue
    if (!(id in expectedUrls)) continue
    const { layers } = layersOf(caseElement)
    stateOf(id).rows.forEach((row, i) => {
      check(
        tabsOf(layers[i]).length === row.tabs.length,
        `case ${id} level ${i + 1} hides some of its ${row.tabs.length} tabs`,
      )
    })
  }
  check(inactive > 0, "no inactive tabs were rendered")
})

test(
  "FOLD-007",
  "One component structure in every category and environment",
  (check) => {
    // The folder skeleton of a case, ignoring how many tabs each row has.
    const skeleton = [
      "gl-folder",
      "gl-folder__strip",
      "gl-folder__tabs",
      "gl-folder__body",
      "gl-folder__paper",
    ]
    const shapeOf = (caseElement) =>
      elements(layersOf(caseElement).stack)
        .map((el) => {
          const name = classes(el).find((c) => skeleton.includes(c))
          return (
            name &&
            `${name}${el.attrs["data-level"] ? `[${el.attrs["data-level"]}]` : ""}`
          )
        })
        .filter(Boolean)
        .join(" ")
    // Every tab on the page is built the same way: the card, the label, and the V if
    // selected, or the preview of its contents (P07) if it is an unopened parent.
    const tabShapes = new Set(
      all.filter(hasClass("gl-folder-tab")).map((tab) =>
        childrenOf(tab, () => true)
          .map((el) =>
            classes(el).find(
              (c) => c.startsWith("gl-folder-tab__") || c === "gl-folder-preview",
            ),
          )
          .join(" ")
          .replace(/ gl-folder-(tab__indicator|preview)$/, ""),
      ),
    )
    check(tabShapes.size === 1, `tabs are built in ${tabShapes.size} different ways`)
    // Case E: one stack for each category that has nested folders. A stack names its own
    // category, so it has its cardstock on a page of any other colour (P09-A01); the
    // section around it names the environment, which is typography and texture.
    const categories = ["research", "blog-notes", "writing", "bearnard"]
    const shapes = categories.map((category) => {
      const caseElement = cases.get(`e-${category}`)
      check(caseElement !== undefined, `the study has no ${category} case`)
      if (caseElement === undefined) return undefined
      const state = stateOf(`e-${category}`)
      check(
        state.category === category,
        `the ${category} case's folder is ${state.category} in the registry`,
      )
      const { stack, layers } = layersOf(caseElement)
      check(
        stack.attrs["data-category"] === category,
        `the ${category} case's folders have the category ${stack.attrs["data-category"]}`,
      )
      check(
        caseElement.attrs["data-environment"] ===
          (state.environment === "core" ? undefined : state.environment),
        `the ${category} case is not in its section's environment`,
      )
      // Every top-level tab keeps its own section's category, in every case.
      const row = tabsOf(layers[0]).map((tab) => tab.attrs["data-category"])
      check(
        JSON.stringify(row) ===
          JSON.stringify(siteNavigation.sections.map((node) => node.category)),
        `the ${category} case's global row has the categories [${row.join(", ")}]`,
      )
      return shapeOf(caseElement)
    })
    check(
      new Set(shapes).size === 1,
      "the category cases do not share one folder structure",
    )
    check(
      !/\[data-environment/.test(foldersCss),
      "folders.css has environment-specific rules",
    )
    check(
      !/\[data-category\s*[~|^$*]?=/.test(foldersCss),
      "folders.css has rules for one particular category",
    )
    check(!/--palette-/.test(foldersCss), "folders.css uses palette primitives")
  },
)

test("FOLD-008", "Long labels keep their full text", (check) => {
  const caseD = cases.get("d")
  const { layers } = layersOf(caseD)
  const labels = tabsOf(layers[1]).map(labelOf)
  for (const long of [
    "Talks / Presentations",
    "Mentoring / Supervision",
    "Awards & Honors",
    "Outreach / Public Engagement",
  ]) {
    check(labels.includes(long), `case D does not show "${long}" in full`)
  }
  const global = tabsOf(layers[0]).map(labelOf)
  for (const long of ["Lecture Notes", "Bearnard's Area"]) {
    check(global.includes(long), `the global row does not show "${long}" in full`)
  }
  check(
    labelOf(selectedOf(layers[1])[0]) === "Outreach / Public Engagement",
    "case D does not select the longest label",
  )
  check(!/…/.test(labels.join("")), "a label is truncated with an ellipsis")
  check(!/text-overflow\s*:/.test(foldersCss), "folders.css truncates labels")
  check(
    /max-inline-size:\s*var\(--folder-tab-max-inline-size\)/.test(foldersCss),
    "tabs have no maximum width",
  )
  check(/text-wrap:\s*balance/.test(foldersCss), "an over-long label cannot wrap")
})

test("FOLD-009", "Folder bodies show arbitrary content", (check) => {
  for (const [id, caseElement] of cases) {
    if (!elements(caseElement).some(hasClass("gl-folders"))) continue
    const papers = elements(caseElement).filter(hasClass("gl-folder__paper"))
    check(
      papers.length === 1,
      `case ${id} has ${papers.length} sheets of paper, expected 1`,
    )
    const content = elements(papers[0] ?? { children: [] })
    check(
      content.some((el) => el.tag === "h3"),
      `case ${id}'s paper has no heading`,
    )
    check(
      content.some((el) => el.tag === "p"),
      `case ${id}'s paper has no paragraph`,
    )
  }
  const tagsIn = (id) =>
    elements(elements(cases.get(id)).find(hasClass("gl-folder__paper"))).map(
      (el) => el.tag,
    )
  check(tagsIn("b").includes("table"), "case B's content does not include its table")
  check(
    tagsIn("c").includes("pre") && tagsIn("c").includes("ul"),
    "case C's content is incomplete",
  )
})

test("FOLD-010", "The P03 specimen is untouched", (check) => {
  check(/data-specimen="p03"/.test(specimenHtml), "the P03 specimen marker is missing")
  check(
    /<title>GusmaoLab — design study \(P03, temporary\)<\/title>/.test(specimenHtml),
    "the P03 specimen's title changed",
  )
  check(!/gl-folder/.test(specimenHtml), "the P03 specimen contains folder markup")
  check(specimenSheets.length > 0, "the P03 specimen links no stylesheet")
  check(!specimenCss.includes(".gl-folder"), "folder styles reach the P03 specimen")
  check(
    specimenCss.includes("--color-folder-tab-inactive"),
    "the specimen lost its tokens",
  )
})

let failed = 0
for (const { id, title, failures } of results) {
  if (failures.length === 0) {
    console.log(`PASS ${id} ${title}`)
  } else {
    failed++
    console.error(`FAIL ${id} ${title}`)
    for (const message of failures) console.error(`  - ${message}`)
  }
}
if (failed > 0) process.exit(1)
console.log(`PASS: ${results.length} folder tests; ${cases.size} study cases`)
