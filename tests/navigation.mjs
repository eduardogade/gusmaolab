// Navigation model tests: NAV-001 to NAV-014 (P04), and the model's share of the P06 tests,
// NAV-015 to NAV-021 and NAV-025. Pure functions only; no build needed. The P06 tests of
// the built pages are in tests/routes.mjs. Node.js 26 imports the TypeScript modules
// directly (native type stripping). P09-A01 (D-076) removed External (eleven sections,
// 36 folders) and gave every section an archive category; tests/categories.mjs checks the
// locked assignment and colours.
//
// Third-level folders and content routes below are SYNTHETIC FIXTURES, labeled as such.
// They test what the model supports; they are not approved site content.
import assert from "node:assert/strict"
import { CATEGORIES, ENVIRONMENTS } from "../src/design/contract.mjs"
import {
  CATEGORY_IDS,
  ENVIRONMENT_IDS,
  MAX_TAB_LEVELS,
  NavigationConfigError,
  OVERVIEW_LABEL,
  ROUTE_PARAMS,
  createNavigation,
  normalizePath,
  overviewTabId,
  validateNavigation,
} from "../src/navigation/navigation.ts"
import { CONTENT_ROUTES, SECTIONS } from "../src/navigation/registry.ts"

const site = createNavigation(SECTIONS, CONTENT_ROUTES)

// --- Synthetic fixtures ------------------------------------------------------------------

/** A copy of `entries` with `change` applied to the entry with `id`. The registry is not modified. */
const edit = (entries, id, change) =>
  entries.map((entry) => {
    const copy = entry.id === id ? change(entry) : entry
    return copy.children ? { ...copy, children: edit(copy.children, id, change) } : copy
  })
const addChild = (entries, parentId, child) =>
  edit(entries, parentId, (entry) => ({
    ...entry,
    children: [...(entry.children ?? []), child],
  }))

const SYNTHETIC_THIRD_LEVEL = {
  id: "synthetic-projects",
  label: "Synthetic: Projects",
  slug: "synthetic-projects",
}
const fixtureSections = addChild(SECTIONS, "cv-research", SYNTHETIC_THIRD_LEVEL)
const fixtureRoutes = [
  { path: "/lecture-notes/berries/synthetic-article/", owner: "lecture-notes-berries" },
  { path: "/lecture-notes/synthetic-note/", owner: "lecture-notes" },
  { path: "/blog/2026/11/10/synthetic-post/", owner: "blog" },
  {
    path: "/cv/research/synthetic-projects/synthetic-paper/",
    owner: "synthetic-projects",
  },
]
const fixture = createNavigation(fixtureSections, fixtureRoutes)

// --- Harness ------------------------------------------------------------------------------

const results = []
const test = (id, name, fn) => {
  try {
    fn()
    results.push({ id, name, ok: true })
  } catch (error) {
    results.push({ id, name, ok: false, error })
  }
}
const ids = (nodes) => nodes.map((node) => node.id)
const stateOf = (navigation, path) => {
  const result = navigation.resolve(path)
  assert.equal(result.found, true, `${path} should resolve`)
  return result.state
}

// --- Tests --------------------------------------------------------------------------------

test("NAV-001", "Top-level order", () => {
  const expected = [
    ["Home", "/"],
    ["About", "/about/"],
    ["Blog", "/blog/"],
    ["Portfolio", "/portfolio/"],
    ["Contact", "/contact/"],
    ["Schedule", "/schedule/"],
    ["CV", "/cv/"],
    ["Lab", "/lab/"],
    ["Lecture Notes", "/lecture-notes/"],
    ["Writing", "/writing/"],
    ["Bearnard's Area", "/bearnards-area/"],
  ]
  assert.deepEqual(
    site.sections.map((node) => [node.label, node.path]),
    expected,
  )
  for (const node of site.sections) assert.equal(node.level, 1)
})

test("NAV-002", "Unique identity", () => {
  assert.deepEqual(validateNavigation(SECTIONS, CONTENT_ROUTES), [])
  const nodes = [...site.nodes.values()]
  assert.equal(new Set(nodes.map((n) => n.id)).size, nodes.length, "duplicate IDs")
  assert.equal(new Set(nodes.map((n) => n.path)).size, nodes.length, "duplicate paths")
  assert.equal(
    new Set(site.pagePaths()).size,
    site.pagePaths().length,
    "duplicate page paths",
  )
})

test("NAV-003", "Parent destinations", () => {
  const parents = [...site.nodes.values()].filter((node) => node.children.length > 0)
  assert.ok(parents.length > 0)
  for (const parent of parents) {
    const state = stateOf(site, parent.path)
    assert.equal(state.page.kind, "folder")
    assert.equal(
      state.page.node.id,
      parent.id,
      `${parent.path} opens ${parent.id} itself`,
    )
  }
  // CV opens its own page: its row of children opens, led by its selected Overview (P06).
  const cv = stateOf(site, "/cv/")
  assert.equal(cv.page.node.id, "cv")
  assert.equal(cv.rows.length, 2)
  assert.equal(cv.rows[1].selectedId, overviewTabId("cv"))
  assert.deepEqual(ids(cv.rows[1].tabs.slice(1)), ids(site.preview("cv")))
})

test("NAV-004", "Home selection", () => {
  const home = stateOf(site, "/")
  assert.equal(home.page.node.id, "home")
  assert.deepEqual(ids(home.selection), ["home"])
  assert.equal(home.rows.length, 1, "only the global row")
  assert.equal(home.rows[0].selectedId, "home")
  assert.equal(home.environment, "core")
})

test("NAV-005", "Two-level selection", () => {
  const state = stateOf(site, "/cv/research/")
  assert.deepEqual(ids(state.selection), ["cv", "cv-research"])
  assert.equal(state.page.node.id, "cv-research", "Research has its own page")
  assert.deepEqual(
    state.rows.map((row) => [row.level, row.parent?.id ?? null, row.selectedId]),
    [
      [1, null, "cv"],
      [2, "cv", "cv-research"],
    ],
  )
})

test("NAV-006", "Three-level selection (synthetic fixture)", () => {
  const state = stateOf(fixture, "/cv/research/synthetic-projects/")
  assert.deepEqual(ids(state.selection), ["cv", "cv-research", "synthetic-projects"])
  assert.equal(state.page.node.id, "synthetic-projects")
  assert.equal(state.rows.length, MAX_TAB_LEVELS)
  assert.deepEqual(
    state.rows.map((row) => [row.level, row.selectedId]),
    [
      [1, "cv"],
      [2, "cv-research"],
      [3, "synthetic-projects"],
    ],
  )
  // Opening Research shows its third-level row, with its Overview selected (P06).
  const research = stateOf(fixture, "/cv/research/")
  assert.equal(research.rows.length, 3)
  assert.equal(research.rows[2].selectedId, overviewTabId("cv-research"))
})

test("NAV-007", "Immediate children", () => {
  assert.deepEqual(ids(site.preview("cv")), [
    "cv-teaching",
    "cv-research",
    "cv-publications",
    "cv-talks",
    "cv-mentoring",
    "cv-awards",
    "cv-service",
    "cv-outreach",
  ])
  // A grandchild never appears in its grandparent's preview.
  assert.ok(!ids(fixture.preview("cv")).includes("synthetic-projects"))
  assert.deepEqual(ids(fixture.preview("cv-research")), ["synthetic-projects"])
  for (const child of site.preview("lab")) assert.equal(child.parentId, "lab")
})

test("NAV-008", "Leaf behavior", () => {
  assert.deepEqual(site.preview("home"), [])
  assert.deepEqual(site.preview("blog"), [])
  assert.deepEqual(site.preview("cv-teaching"), [])
  assert.deepEqual(fixture.preview("synthetic-projects"), [])
})

test("NAV-009", "Deep content ownership (synthetic fixture)", () => {
  const article = stateOf(fixture, "/lecture-notes/berries/synthetic-article/")
  assert.equal(article.page.kind, "content")
  assert.equal(article.folder.id, "lecture-notes-berries")
  assert.deepEqual(ids(article.selection), ["lecture-notes", "lecture-notes-berries"])
  assert.equal(article.rows.length, 2, "no tab for the article itself")
  assert.equal(article.environment, "technical")

  const deep = stateOf(fixture, "/cv/research/synthetic-projects/synthetic-paper/")
  assert.equal(deep.folder.id, "synthetic-projects")
  assert.equal(deep.rows.length, 3, "never a fourth row")

  // Content depth is not limited to three segments.
  const post = stateOf(fixture, "/blog/2026/11/10/synthetic-post/")
  assert.equal(post.page.kind, "content")
  assert.deepEqual(ids(post.selection), ["blog"])
  assert.equal(post.rows.length, 1)
})

test("NAV-010", "Unknown route", () => {
  const unknown = site.resolve("/cv/this-page-does-not-exist/")
  assert.equal(unknown.found, false)
  assert.equal(unknown.context?.id, "cv", "context for a future 404 page only")
  // A registered article does not make its siblings valid.
  assert.equal(fixture.resolve("/lecture-notes/berries/not-registered/").found, false)
  assert.equal(site.resolve("/lecture-notes/berries/synthetic-article/").found, false)
  assert.equal(site.resolve("/does-not-exist/").found, false)
})

test("NAV-011", "URL normalization", () => {
  const cases = [
    ["/cv/research", "/cv/research/"],
    ["/cv/research/?tab=talks#top", "/cv/research/"],
    ["/cv//research///", "/cv/research/"],
    ["//cv/", "/cv/"],
    ["cv/research", "/cv/research/"],
    ["/cv/index.html", "/cv/"],
    ["/cv/./research/../research/", "/cv/research/"],
    ["https://www.gusmaolab.org/lab/people?x=1", "/lab/people/"],
    ["", "/"],
    ["/", "/"],
    ["/?q=1#x", "/"],
  ]
  for (const [input, expected] of cases)
    assert.equal(normalizePath(input), expected, input)
  for (const variant of [
    "/cv/research",
    "/cv/research/?x=1",
    "/cv/research#y",
    "/cv//research/",
  ]) {
    assert.deepEqual(
      ids(stateOf(site, variant).selection),
      ["cv", "cv-research"],
      variant,
    )
  }
  // Paths are case-sensitive, like the static host: /CV/ is not a known page.
  assert.equal(site.resolve("/CV/").found, false)
})

test("NAV-012", "Environment and category inheritance", () => {
  const expected = {
    home: "core",
    about: "core",
    blog: "core",
    contact: "core",
    schedule: "core",
    portfolio: "scientific",
    cv: "scientific",
    "cv-research": "scientific",
    "lab-people": "scientific",
    "lecture-notes-berries": "technical",
    "writing-book-club": "literary",
    "bearnards-area-photos": "personal",
  }
  for (const [id, environment] of Object.entries(expected)) {
    assert.equal(site.node(id).environment, environment, id)
  }
  assert.equal(fixture.node("synthetic-projects").environment, "scientific")
  // An override applies to the node and is inherited below it.
  const overridden = createNavigation(
    addChild(
      edit(SECTIONS, "cv-research", (e) => ({ ...e, environment: "literary" })),
      "cv-research",
      {
        id: "synthetic-essay",
        label: "Synthetic: Essay",
        slug: "synthetic-essay",
      },
    ),
  )
  assert.equal(overridden.node("cv-research").environment, "literary")
  assert.equal(overridden.node("synthetic-essay").environment, "literary")
  assert.equal(overridden.node("cv-teaching").environment, "scientific")
  // The environment names match the CSS environments, plus the core default.
  assert.deepEqual(ENVIRONMENT_IDS, ["core", ...ENVIRONMENTS.map((env) => env.id)])

  // A category belongs to the section, and every folder below inherits it (P09-A01).
  // It is independent of the environment: overriding one never changes the other.
  assert.deepEqual(
    CATEGORY_IDS,
    CATEGORIES.map((category) => category.id),
  )
  const categories = {
    home: "core",
    schedule: "core",
    blog: "blog-notes",
    "lecture-notes-berries": "blog-notes",
    cv: "research",
    "cv-research": "research",
    "lab-people": "research",
    "writing-book-club": "writing",
    "bearnards-area-photos": "bearnard",
  }
  for (const [id, category] of Object.entries(categories)) {
    assert.equal(site.node(id).category, category, id)
  }
  assert.equal(fixture.node("synthetic-projects").category, "research")
  assert.equal(overridden.node("cv-research").category, "research")
  assert.equal(overridden.node("synthetic-essay").category, "research")
  assert.equal(stateOf(site, "/cv/research/").category, "research")
  assert.equal(stateOf(site, "/lecture-notes/berries/").category, "blog-notes")
  assert.equal(stateOf(site, "/lecture-notes/berries/").environment, "technical")
  assert.equal(stateOf(site, "/blog/").category, "blog-notes")
  assert.equal(stateOf(site, "/blog/").environment, "core")
})

test("NAV-013", "Invalid configuration", () => {
  const rejects = (sections, routes, pattern, why) => {
    const issues = validateNavigation(sections, routes)
    assert.ok(
      issues.some((issue) => pattern.test(issue)),
      `${why}: expected ${pattern}, got ${JSON.stringify(issues)}`,
    )
  }
  const tab = (id, slug, extra = {}) => ({
    id,
    label: `Synthetic ${id}`,
    slug,
    ...extra,
  })
  // A top-level section: it must name its category.
  const top = (id, slug, extra = {}) => tab(id, slug, { category: "core", ...extra })
  rejects([], [], /non-empty/, "empty registry")
  rejects([tab("a", "a")], [], /needs a category/, "section without a category")
  rejects(
    [top("a", "a", { category: "scientific" })],
    [],
    /unknown category "scientific"/,
    "bad category",
  )
  rejects(
    [top("a", "a", { children: [tab("b", "b", { category: "writing" })] })],
    [],
    /declares a category/,
    "category below a section",
  )
  assert.deepEqual(
    validateNavigation([top("a", "a", { children: [tab("b", "b")] })]),
    [],
    "a valid synthetic registry has no issues",
  )
  rejects(
    [top("a", "a"), top("a", "b")],
    [],
    /id "a" is used more than once/,
    "duplicate ID",
  )
  rejects(
    [top("a", "same"), top("b", "same")],
    [],
    /path \/same\/ is used/,
    "duplicate path",
  )
  rejects(
    [{ id: "a", label: " ", slug: "a", category: "core" }],
    [],
    /needs a label/,
    "missing label",
  )
  rejects([top("a", "Not Kebab")], [], /lowercase kebab-case segment/, "invalid slug")
  rejects(
    [top("a", "a/b")],
    [],
    /lowercase kebab-case segment/,
    "slug escaping its parent",
  )
  rejects([top("A b", "a")], [], /needs an id/, "invalid ID")
  rejects(
    [top("a", "a", { environment: "scientifc" })],
    [],
    /unknown environment/,
    "bad environment",
  )
  rejects(
    [top("a", "a", { enviroment: "core" })],
    [],
    /unknown field "enviroment"/,
    "typo in a field",
  )
  rejects(
    [top("a", "a", { children: [tab("b", "")] })],
    [],
    /empty slug/,
    "child with an empty slug",
  )
  rejects(
    [
      top("a", "a", {
        children: [
          tab("b", "b", { children: [tab("c", "c", { children: [tab("d", "d")] })] }),
        ],
      }),
    ],
    [],
    /tab level 4/,
    "fourth tab level",
  )
  const loop = top("loop", "loop")
  loop.children = [loop]
  rejects([loop], [], /cycle/, "cycle")
  const shared = tab("shared", "shared")
  rejects(
    [top("a", "a", { children: [shared] }), top("b", "b", { children: [shared] })],
    [],
    /more than one place/,
    "reused entry",
  )

  const sections = [
    top("home", ""),
    top("notes", "notes", { children: [tab("berries", "berries")] }),
  ]
  rejects(
    sections,
    [{ path: "/notes/x/", owner: "missing" }],
    /unknown owner/,
    "unknown owner",
  )
  rejects(
    sections,
    [{ path: "/elsewhere/x/", owner: "berries" }],
    /outside its owner/,
    "route outside its owner",
  )
  rejects(
    sections,
    [{ path: "/notes/berries/x/", owner: "notes" }],
    /lies inside "berries"/,
    "owner is not the deepest folder",
  )
  rejects(
    sections,
    [{ path: "/notes/berries/", owner: "notes" }],
    /duplicates the folder/,
    "route duplicating a folder",
  )
  rejects(
    sections,
    [{ path: "/notes/x", owner: "notes" }],
    /not a canonical path/,
    "non-canonical route path",
  )
  rejects(
    sections,
    [
      { path: "/notes/x/", owner: "notes" },
      { path: "/notes/x/", owner: "notes" },
    ],
    /more than once/,
    "duplicate route",
  )

  assert.throws(
    () => createNavigation([top("a", "a"), top("a", "a")]),
    NavigationConfigError,
  )
})

test("NAV-014", "Content independence", () => {
  const relabeled = createNavigation(
    edit(SECTIONS, "cv", (e) => ({ ...e, label: "Curriculum Vitae" })),
  )
  assert.equal(relabeled.node("cv").label, "Curriculum Vitae")
  assert.equal(relabeled.node("cv").path, "/cv/")
  assert.deepEqual(ids(stateOf(relabeled, "/cv/").selection), ["cv"])
  // Reordering sections changes display order only, never identities or URLs.
  const reordered = createNavigation([...SECTIONS].reverse())
  assert.equal(reordered.sections[0].id, "bearnards-area")
  for (const node of site.nodes.values())
    assert.equal(reordered.node(node.id).path, node.path)
})

// --- P06: Overview tabs and route-driven selection -----------------------------------------

const selectedIds = (state) => state.rows.map((row) => row.selectedId)
const statesOf = (navigation) =>
  navigation.pagePaths().map((path) => [path, stateOf(navigation, path)])
const parents = [...site.nodes.values()].filter((node) => node.children.length > 0)

test("NAV-015", "Parent Overview", () => {
  const cv = stateOf(site, "/cv/")
  assert.deepEqual(ids(cv.selection), ["cv"], "the registry selection stays CV")
  assert.deepEqual(selectedIds(cv), ["cv", "overview:cv"])
  const [overview] = cv.rows[1].tabs
  assert.equal(overview.kind, "overview")
  assert.equal(overview.label, OVERVIEW_LABEL)
  assert.equal(OVERVIEW_LABEL, "Overview")
  assert.equal(overview.parent.id, "cv")
  assert.equal(cv.currentTabId, "overview:cv", "Overview stands for the CV page")
  // The same for every parent, in every environment.
  for (const parent of parents) {
    const state = stateOf(site, parent.path)
    const last = state.rows.at(-1)
    assert.equal(last.parent?.id, parent.id, parent.path)
    assert.equal(last.selectedId, overviewTabId(parent.id), parent.path)
    assert.equal(
      last.tabs[0].id,
      overviewTabId(parent.id),
      `${parent.path}: Overview first`,
    )
    assert.deepEqual(ids(last.tabs.slice(1)), ids(parent.children), "children in order")
    assert.equal(state.currentTabId, overviewTabId(parent.id))
  }
})

test("NAV-016", "Overview URL identity", () => {
  for (const [path, state] of [...statesOf(site), ...statesOf(fixture)]) {
    for (const tab of state.rows.flatMap((row) => row.tabs)) {
      if (tab.kind !== "overview") continue
      assert.equal(tab.href, tab.parent.path, `${path}: ${tab.id} links to its parent`)
      assert.ok(!tab.href.includes("overview"), `${path}: ${tab.href}`)
    }
  }
  assert.equal(stateOf(site, "/cv/").rows[1].tabs[0].href, "/cv/")
  assert.equal(site.resolve("/cv/overview/").found, false, "no /overview/ page")
  assert.ok(!site.pagePaths().some((path) => path.includes("overview")))
})

test("NAV-017", "No duplicate registry nodes", () => {
  assert.deepEqual(validateNavigation(SECTIONS, CONTENT_ROUTES), [])
  assert.equal(site.nodes.size, 36, "11 sections + 25 folders (P09-A01)")
  assert.equal(site.pagePaths().length, 36)
  assert.equal(new Set(site.pagePaths()).size, 36, "no duplicate page paths")
  for (const node of site.nodes.values()) assert.ok(!node.id.startsWith("overview"))
  // An Overview ID can never be a node ID: the registry rejects it.
  assert.ok(
    validateNavigation([{ id: overviewTabId("cv"), label: "x", slug: "x" }]).some(
      (issue) => /needs an id/.test(issue),
    ),
  )
  // Every tab drawn on any page links to a registered folder page; Overview adds none.
  const hrefs = new Set()
  const overviews = new Set()
  for (const [, state] of statesOf(site)) {
    for (const tab of state.rows.flatMap((row) => row.tabs)) {
      hrefs.add(tab.href)
      if (tab.kind === "overview") overviews.add(tab.id)
      else assert.equal(tab.node, site.node(tab.id))
    }
  }
  for (const href of hrefs) assert.ok(site.pagePaths().includes(href), href)
  assert.equal(overviews.size, parents.length, "one Overview per parent")
})

test("NAV-018", "Child selection", () => {
  const state = stateOf(site, "/cv/research/")
  assert.deepEqual(selectedIds(state), ["cv", "cv-research"])
  assert.equal(state.rows[1].tabs[0].id, "overview:cv", "Overview leads CV's row")
  assert.equal(state.currentTabId, "cv-research")
  assert.equal(state.rows.length, 2, "Research has no folders: no third row")
})

test("NAV-019", "Parent with third-level children (synthetic fixture)", () => {
  const research = stateOf(fixture, "/cv/research/")
  assert.deepEqual(selectedIds(research), ["cv", "cv-research", "overview:cv-research"])
  assert.deepEqual(ids(research.rows[2].tabs), [
    "overview:cv-research",
    "synthetic-projects",
  ])
  assert.equal(research.currentTabId, "overview:cv-research")
  const projects = stateOf(fixture, "/cv/research/synthetic-projects/")
  assert.deepEqual(selectedIds(projects), ["cv", "cv-research", "synthetic-projects"])
  assert.equal(projects.rows[2].tabs[0].id, "overview:cv-research")
  assert.equal(projects.currentTabId, "synthetic-projects")
})

test("NAV-020", "No unnecessary child layer", () => {
  for (const navigation of [site, fixture]) {
    for (const node of navigation.nodes.values()) {
      if (node.children.length > 0) continue
      const state = stateOf(navigation, node.path)
      assert.equal(state.rows.length, node.level, `${node.path}: no Overview-only row`)
      assert.equal(state.currentTabId, node.id, `${node.path} is its own tab`)
      assert.ok(state.rows.every((row) => row.parent?.id !== node.id))
    }
  }
  assert.equal(stateOf(site, "/about/").rows.length, 1)
  assert.equal(stateOf(site, "/").rows.length, 1)
})

test("NAV-021", "No unselected subfolder rows", () => {
  for (const [path, state] of [...statesOf(site), ...statesOf(fixture)]) {
    state.rows.forEach((row, i) => {
      const chosen = row.tabs.filter((tab) => tab.id === row.selectedId)
      assert.equal(chosen.length, 1, `${path} row ${i + 1} has one selected tab`)
      if (i > 0) {
        assert.equal(
          row.tabs[0].id,
          overviewTabId(row.parent.id),
          `${path} row ${i + 1}`,
        )
        assert.equal(row.parent.id, state.rows[i - 1].selectedId)
      }
    })
    assert.equal(
      state.currentTabId === null,
      state.page.kind === "content",
      `${path}: only a content page has no tab of its own`,
    )
  }
})

test("NAV-025", "Maximum depth (synthetic fixture)", () => {
  for (const [path, state] of statesOf(fixture)) {
    assert.ok(
      state.rows.length <= MAX_TAB_LEVELS,
      `${path} has ${state.rows.length} rows`,
    )
  }
  const deep = stateOf(fixture, "/cv/research/synthetic-projects/synthetic-paper/")
  assert.deepEqual(selectedIds(deep), ["cv", "cv-research", "synthetic-projects"])
  assert.equal(deep.currentTabId, null, "the article is not a tab")
  // A page owned by a parent with folders opens in the parent's Overview, as its ancestor.
  const note = stateOf(fixture, "/lecture-notes/synthetic-note/")
  assert.deepEqual(selectedIds(note), ["lecture-notes", "overview:lecture-notes"])
  assert.equal(note.currentTabId, null)
  // Each tab level has its own route parameters, and there are only three.
  assert.deepEqual(ROUTE_PARAMS, ["section", "folder", "subfolder"])
  assert.equal(ROUTE_PARAMS.length, MAX_TAB_LEVELS)
})

// --- Report -------------------------------------------------------------------------------

for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"} ${r.id} ${r.name}`)
  if (!r.ok) console.error(`     ${r.error.message.split("\n").join("\n     ")}`)
}
const failed = results.filter((r) => !r.ok).length
if (failed > 0) {
  console.error(`FAIL: ${failed} of ${results.length} navigation tests`)
  process.exit(1)
}
console.log(
  `PASS: ${results.length} navigation tests; ${site.sections.length} sections, ${site.nodes.size} folders`,
)
