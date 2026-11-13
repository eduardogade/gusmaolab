// Folder-preview tests (P07) that need no browser: the previews in the navigation model
// (PREV-001 to PREV-007) and in the built pages (the markup side of PREV-004, PREV-006,
// PREV-013 and PREV-014, and PREV-015). Run `npm run build` first, or `npm run verify`.
//
// Pointer, keyboard, touch and positioning behaviour cannot be proved here. Those tests
// (PREV-005 and PREV-008 to PREV-014) drive a real browser in
// tests/previews-browser.mjs: `npm run test:browser`.
//
// The third level used below is a SYNTHETIC FIXTURE, labelled as such. It tests what the
// model supports and is not approved site content.
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import {
  OVERVIEW_LABEL,
  createNavigation,
  overviewTabId,
} from "../src/navigation/navigation.ts"
import { CONTENT_ROUTES, SECTIONS } from "../src/navigation/registry.ts"
import { childrenOf, classes, elements, hasClass, parse, textOf } from "./html-tree.mjs"

const site = createNavigation(SECTIONS, CONTENT_ROUTES)

// --- Synthetic fixture: three folders under CV › Research --------------------------------

const SYNTHETIC = ["projects", "themes", "datasets"].map((name) => ({
  id: `synthetic-${name}`,
  label: `Synthetic: ${name}`,
  slug: `synthetic-${name}`,
}))
const fixture = createNavigation(
  SECTIONS.map((section) =>
    section.id !== "cv"
      ? section
      : {
          ...section,
          children: section.children.map((child) =>
            child.id === "cv-research" ? { ...child, children: SYNTHETIC } : child,
          ),
        },
  ),
)

// --- Built pages ---------------------------------------------------------------------------

const dist = fileURLToPath(new URL("../dist/", import.meta.url))
const read = (path) =>
  readFile(`${dist}${path.slice(1)}index.html`, "utf8").catch(() => "")
const pages = new Map()
for (const path of site.pagePaths()) {
  const html = await read(path)
  if (html === "") {
    console.error(`FAIL: ${path} is not built. Run \`npm run build\` first.`)
    process.exit(1)
  }
  pages.set(path, { html, tree: parse(html), state: site.resolve(path).state })
}
const studyTree = parse(await read("/_design/folders/"))
const css = (
  await Promise.all(
    [...(pages.get("/").html.matchAll(/href="\/(_astro\/[^"]+\.css)"/g) ?? [])].map(
      ([, f]) => readFile(`${dist}${f}`, "utf8"),
    ),
  )
).join("\n")

// --- Harness ------------------------------------------------------------------------------

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
const ids = (tabs) => tabs.map((tab) => tab.id)
const json = (value) => JSON.stringify(value)
// Every state of a navigation: one per registered page.
const statesOf = (nav) => nav.pagePaths().map((path) => nav.resolve(path).state)
const previewsOf = (state) =>
  state.rows.flatMap((row) =>
    [...row.previews].map(([id, preview]) => ({ row, id, preview })),
  )
const panelsIn = (tree) => elements(tree).filter(hasClass("gl-folder-preview"))
const tabOf = (el) => {
  for (let n = el.parent; n; n = n.parent) if (hasClass("gl-folder-tab")(n)) return n
  return null
}

// --- Model --------------------------------------------------------------------------------

test("PREV-001", "Immediate descendants", (check) => {
  for (const nav of [site, fixture]) {
    for (const state of statesOf(nav)) {
      for (const { id, preview } of previewsOf(state)) {
        const items = preview.tabs.slice(1)
        check(
          json(items.map((tab) => tab.node?.id)) === json(ids(nav.preview(id))),
          `${state.path}: ${id}'s preview is not its immediate children`,
        )
        check(
          items.every((tab) => tab.node?.parentId === id),
          `${state.path}: ${id}'s preview lists a folder that is not its child`,
        )
      }
    }
  }
  // CV's preview, seen from Writing, holds Research but nothing inside Research.
  const cv = fixture.resolve("/writing/").state.rows[0].previews.get("cv")
  check(ids(cv?.tabs ?? []).includes("cv-research"), "CV's preview lacks Research")
  check(
    !ids(cv?.tabs ?? []).some((id) => id.startsWith("synthetic-")),
    "CV's preview shows Research's own folders (synthetic fixture)",
  )
  const lab = site.resolve("/cv/research/").state.rows[0].previews.get("lab")
  check(
    json(ids(lab?.tabs ?? []).slice(1)) ===
      json([
        "lab-people",
        "lab-join-us",
        "lab-research-areas",
        "lab-facilities",
        "lab-partners",
        "lab-resources",
      ]),
    "Lab's preview is not its six folders",
  )
})

test("PREV-002", "Overview destination", (check) => {
  for (const nav of [site, fixture]) {
    for (const state of statesOf(nav)) {
      for (const { id, preview } of previewsOf(state)) {
        const [overview] = preview.tabs
        const folder = nav.node(id)
        check(
          overview?.kind === "overview" &&
            overview.id === overviewTabId(id) &&
            overview.label === OVERVIEW_LABEL &&
            overview.href === folder.path &&
            overview.parent === folder,
          `${state.path}: ${id}'s preview does not start with its Overview of ${folder.path}`,
        )
        for (const tab of preview.tabs) {
          check(
            !/\/overview\/$/.test(tab.href),
            `${state.path}: ${tab.id} links to ${tab.href}`,
          )
          check(
            nav.resolve(tab.href).found,
            `${state.path}: ${tab.id} links to an unknown ${tab.href}`,
          )
        }
      }
    }
  }
  // No preview adds a node, a path or a page: the registry is unchanged.
  check(
    site.nodes.size === 36 && site.pagePaths().length === 36,
    "the registry changed size",
  )
})

test("PREV-003", "Leaf behavior", (check) => {
  for (const nav of [site, fixture]) {
    for (const state of statesOf(nav)) {
      for (const row of state.rows) {
        for (const tab of row.tabs) {
          const hasChildren = tab.kind === "folder" && tab.node.children.length > 0
          if (!hasChildren) {
            check(
              !row.previews.has(tab.id),
              `${state.path}: ${tab.id} has a preview but nothing inside`,
            )
          }
        }
      }
    }
  }
  const top = site.resolve("/cv/research/").state.rows[0]
  for (const leaf of ["home", "about", "blog", "portfolio", "contact", "schedule"]) {
    check(!top.previews.has(leaf), `${leaf} has a preview`)
  }
})

test("PREV-004", "Active folder behavior", (check) => {
  for (const nav of [site, fixture]) {
    for (const state of statesOf(nav)) {
      for (const row of state.rows) {
        check(
          !row.previews.has(row.selectedId),
          `${state.path}: the open ${row.selectedId} has a preview`,
        )
        // Every other folder with children has one: hover can always look inside it.
        for (const tab of row.tabs) {
          const eligible =
            tab.kind === "folder" &&
            tab.id !== row.selectedId &&
            tab.node.children.length > 0
          check(
            row.previews.has(tab.id) === eligible,
            `${state.path}: ${tab.id} ${eligible ? "lacks" : "has"} a preview`,
          )
        }
      }
    }
  }
  const cv = site.resolve("/cv/").state
  check(!cv.rows[0].previews.has("cv"), "CV, open on /cv/, has a preview")
  check(
    cv.rows[1].previews.size === 0,
    "CV's own row has previews, but its folders are leaves",
  )
  // Synthetic: on /cv/, Research is unopened and has folders, so it has a preview.
  check(
    fixture.resolve("/cv/").state.rows[1].previews.has("cv-research"),
    "Research has no preview",
  )
  check(
    !fixture.resolve("/cv/research/").state.rows[1].previews.has("cv-research"),
    "Research, open, still has a preview",
  )
})

test("PREV-005", "Previews never change the resolved page (model)", (check) => {
  // Selection is a function of the URL alone. A preview is data built beside it: it adds
  // no row, selects nothing, and its tabs are the ones the folder's own page shows.
  for (const nav of [site, fixture]) {
    for (const state of statesOf(nav)) {
      const again = nav.resolve(state.path).state
      check(
        json(again.rows.map((row) => row.selectedId)) ===
          json(state.rows.map((row) => row.selectedId)) &&
          again.currentTabId === state.currentTabId,
        `${state.path} resolves differently twice`,
      )
      check(
        json(state.selection.map((node) => node.id)) ===
          json(ids(nav.lineage(state.folder.id))),
        `${state.path}: the selection is not the folder's lineage`,
      )
    }
  }
})

test("PREV-006", "No recursive previews", (check) => {
  for (const nav of [site, fixture]) {
    for (const state of statesOf(nav)) {
      for (const { id, preview } of previewsOf(state)) {
        check(
          preview.tabs.length === 1 + nav.node(id).children.length,
          `${state.path}: ${id}'s preview has ${preview.tabs.length} items`,
        )
        // Its items are display tabs only: they carry no previews of their own.
        check(
          preview.tabs.every((tab) => !("previews" in tab) && !("tabs" in tab)),
          `${state.path}: an item in ${id}'s preview nests further items`,
        )
      }
    }
  }
  for (const [where, tree] of [
    ...[...pages].map(([p, { tree }]) => [p, tree]),
    ["study", studyTree],
  ]) {
    for (const panel of panelsIn(tree)) {
      check(
        !elements(panel).some(hasClass("gl-folder-preview")) &&
          !elements(panel).some(hasClass("gl-folder-tab")),
        `${where}: a preview holds another preview or a tab`,
      )
    }
  }
})

test("PREV-007", "Correct ordering", (check) => {
  for (const nav of [site, fixture]) {
    for (const state of statesOf(nav)) {
      for (const { id, preview } of previewsOf(state)) {
        const folder = nav.node(id)
        check(
          json(ids(preview.tabs)) ===
            json([overviewTabId(id), ...ids(folder.children)]),
          `${state.path}: ${id}'s preview is out of order`,
        )
        // The same tabs, in the same order, as the row that opens on the folder's own page.
        const own = nav.resolve(folder.path).state.rows.at(-1)
        check(
          own.tabs === preview.tabs,
          `${state.path}: ${id}'s preview differs from its own row`,
        )
      }
    }
  }
  const writing = site.resolve("/cv/research/").state.rows[0].previews.get("writing")
  check(
    json(writing?.tabs.map((tab) => tab.label)) ===
      json(["Overview", "Months' Original", "Kosmos Series", "Book Club"]),
    "Writing's preview is not Overview, Months' Original, Kosmos Series, Book Club",
  )
})

// --- Built pages --------------------------------------------------------------------------

test("PREV-004", "Active folder behavior (built pages)", (check) => {
  for (const [path, { tree, state }] of pages) {
    const drawn = panelsIn(tree).map((panel) => tabOf(panel)?.attrs["data-tab-id"])
    const expected = previewsOf(state).map(({ id }) => id)
    check(json(drawn) === json(expected), `${path} draws previews for ${json(drawn)}`)
    for (const panel of panelsIn(tree)) {
      const tab = tabOf(panel)
      check(
        !("data-selected" in (tab?.attrs ?? {})),
        `${path}: an open folder has a preview`,
      )
      check(
        "data-preview" in (tab?.attrs ?? {}),
        `${path}: a preview's tab is not marked`,
      )
    }
  }
})

test("PREV-013", "Navigation without JavaScript (markup)", (check) => {
  for (const [path, { tree, state }] of pages) {
    for (const panel of panelsIn(tree)) {
      const of = panel.attrs["data-preview-of"]
      const preview = previewsOf(state).find(({ id }) => id === of)?.preview
      check(
        panel.attrs.popover === "manual",
        `${path}: ${of}'s preview is not a manual popover`,
      )
      const links = elements(panel).filter((el) => el.tag === "a")
      check(
        json(links.map((a) => a.attrs.href)) ===
          json(preview?.tabs.map((tab) => tab.href)),
        `${path}: ${of}'s preview links ${json(links.map((a) => a.attrs.href))}`,
      )
      for (const a of links) {
        check(
          pages.has(a.attrs.href),
          `${path}: ${of}'s preview links to ${a.attrs.href}, which has no page`,
        )
        check(
          Object.keys(a.attrs).every((name) => ["class", "href"].includes(name)),
          `${path}: a preview link carries ${json(Object.keys(a.attrs))}`,
        )
      }
      // Every destination in a preview is also a tab on that folder's own page.
      const own = pages.get(preview?.folder.path ?? "")
      const ownTabs = own
        ? elements(own.tree)
            .filter(hasClass("gl-folder-tab__label"))
            .map((el) => el.attrs.href)
        : []
      check(
        links.every((a) => ownTabs.includes(a.attrs.href)),
        `${path}: ${of}'s preview reaches a page its own folder does not link`,
      )
    }
  }
  // Hidden unless a script opens it: the stylesheet hides it even without the Popover API.
  check(
    /\.gl-folder-preview\{[^}]*display:none/.test(css),
    "previews are not hidden by default",
  )
  check(
    /\.gl-folder-preview:popover-open\{display:block\}/.test(css),
    "an open preview is not shown",
  )
})

test("PREV-014", "The V belongs to open folders only (markup)", (check) => {
  for (const [where, tree] of [
    ...[...pages].map(([p, { tree }]) => [p, tree]),
    ["study", studyTree],
  ]) {
    for (const panel of panelsIn(tree)) {
      check(
        !elements(panel).some(
          (el) =>
            hasClass("gl-folder-tab__indicator")(el) ||
            "aria-current" in el.attrs ||
            "data-selected" in el.attrs,
        ),
        `${where}: a preview carries a V, a selection or aria-current`,
      )
    }
  }
})

test("PREV-015", "Semantic integrity", (check) => {
  const appRoles =
    /^(tab|tablist|tabpanel|menu|menubar|menuitem|dialog|alertdialog|listbox|tree)$/
  for (const [where, tree, linked] of [
    ...[...pages].map(([p, { tree }]) => [p, tree, true]),
    ["study", studyTree, false],
  ]) {
    const all = elements(tree)
    for (const el of all) {
      if (el.tag === "a" || el.tag === "button") {
        const inner = elements(el).filter((n) =>
          ["a", "button", "input", "select", "textarea"].includes(n.tag),
        )
        check(inner.length === 0, `${where}: an interactive element inside a ${el.tag}`)
      }
      check(!appRoles.test(el.attrs.role ?? ""), `${where}: role="${el.attrs.role}"`)
      check(
        !(Number(el.attrs.tabindex) > 0),
        `${where}: tabindex="${el.attrs.tabindex}"`,
      )
      check(
        !(
          "aria-expanded" in el.attrs ||
          "aria-haspopup" in el.attrs ||
          "aria-controls" in el.attrs
        ),
        `${where}: ${el.tag} carries menu ARIA`,
      )
    }
    const idsSeen = all.map((el) => el.attrs.id).filter(Boolean)
    check(new Set(idsSeen).size === idsSeen.length, `${where}: duplicate id`)
    for (const panel of panelsIn(tree)) {
      const tab = tabOf(panel)
      const parts = childrenOf(tab, () => true).map((el) => classes(el)[0])
      // After the tab's link, never inside it.
      check(
        json(parts) ===
          json(["gl-folder-tab__shape", "gl-folder-tab__label", "gl-folder-preview"]),
        `${where}: a preview sits in its tab as ${json(parts)}`,
      )
      const [title, list] = childrenOf(panel, () => true)
      const label = tab.attrs["data-tab-id"]
      check(
        hasClass("gl-folder-preview__title")(title) &&
          title.attrs["aria-hidden"] === "true",
        `${where}: ${label}'s preview title is announced twice`,
      )
      const folderLabel = textOf(title).trim()
      check(
        list?.tag === "ul" &&
          list.attrs.role === "list" &&
          list.attrs["aria-label"] === `${folderLabel} folders`,
        `${where}: ${label}'s preview list is not named "${folderLabel} folders"`,
      )
      const items = elements(list).filter(hasClass("gl-folder-preview__link"))
      check(
        items.every((item) => item.tag === (linked ? "a" : "span")),
        `${where}: ${label}'s preview items are not ${linked ? "links" : "labels"}`,
      )
      const overview = items.find(
        (item) => item.parent.attrs["data-tab-kind"] === "overview",
      )
      check(
        textOf(overview ?? { tag: "#text", text: "" }).trim() ===
          `Overview of ${folderLabel}`,
        `${where}: ${label}'s Overview is not "Overview of ${folderLabel}"`,
      )
    }
  }
  // The study's case H previews Research's synthetic folders, as labels.
  const caseH = elements(studyTree).find((el) => el.attrs["data-study-case"] === "h")
  const research =
    caseH && panelsIn(caseH).find((p) => p.attrs["data-preview-of"] === "cv-research")
  check(
    json(
      research
        ? elements(research)
            .filter(hasClass("gl-folder-preview__item"))
            .map((el) => el.attrs["data-tab-id"])
        : [],
    ) ===
      json([
        "overview:cv-research",
        "synthetic-projects",
        "synthetic-themes",
        "synthetic-datasets",
      ]),
    "study case H does not preview Research's synthetic folders",
  )
})

// --- Report -------------------------------------------------------------------------------

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
  `PASS: ${results.length} preview checks without a browser; ${pages.size} folder pages`,
)
