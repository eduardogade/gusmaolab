// Editorial pipeline checks in real builds (P10, D-078 to D-081): CONT-016, CONT-018 and
// the built versions of CONT-004, 005, 007 to 013 and 015. The unit of work is a build of
// a throwaway copy of the project, because the production content directories hold no
// entries and must stay that way (CONT-019).
//
// Each build:
//  1. copies src/, public/ and the configuration to a fresh temporary directory, leaving
//     out brand/, assets/, _backup/ and everything private;
//  2. links node_modules, so nothing is installed;
//  3. copies one scenario's synthetic entries from tests/fixtures/editorial/ into the
//     copy's src/content/;
//  4. runs `astro build` there and reads the copy's dist/.
// The real src/content/ and the real dist/ are never touched, and the temporary directory
// is removed afterwards.
//
// Every entry is a SYNTHETIC FIXTURE (tests/fixtures/editorial/README.md).
import { spawnSync } from "node:child_process"
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  unlink,
  access,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { siteNavigation } from "../src/navigation/index.ts"
import {
  elements,
  hasClass,
  labelOf,
  layersOf,
  parse,
  selectedOf,
  tabsOf,
} from "./html-tree.mjs"

const json = (value) => JSON.stringify(value)
const repo = fileURLToPath(new URL("../", import.meta.url))
const fixtures = join(repo, "tests/fixtures/editorial")
const designStudies = [
  "/_design/tokens/",
  "/_design/folders/",
  "/_design/bearnard/",
  "/_design/records/",
]

const results = []
async function test(id, title, body) {
  const failures = []
  try {
    await body((ok, message) => ok || failures.push(message))
  } catch (error) {
    failures.push(error.stack ?? error.message)
  }
  results.push({ id, title, failures })
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name)
      return entry.isDirectory() ? listFiles(path) : [path]
    }),
  )
  return nested.flat()
}

/** Builds a throwaway copy of the project with one scenario's entries. */
async function buildScenario(scenario) {
  // The real path: on macOS /var is a link to /private/var, and Vite then sees two names.
  const dir = await mkdtemp(join(await realpath(tmpdir()), "gusmaolab-editorial-"))
  try {
    for (const item of [
      "src",
      "public",
      "astro.config.mjs",
      "tsconfig.json",
      "package.json",
    ])
      await cp(join(repo, item), join(dir, item), { recursive: true })
    await symlink(join(repo, "node_modules"), join(dir, "node_modules"), "dir")
    await cp(join(fixtures, scenario), join(dir, "src/content"), { recursive: true })
    const run = spawnSync(
      process.execPath,
      [join(repo, "node_modules/astro/bin/astro.mjs"), "build", "--root", dir],
      {
        cwd: dir,
        encoding: "utf8",
        env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", FORCE_COLOR: "0" },
      },
    )
    const dist = join(dir, "dist")
    let files = []
    try {
      files = (await listFiles(dist)).map((f) => relative(dist, f)).sort()
    } catch {}
    // Read every page now: the directory is removed below.
    const pages = new Map()
    for (const file of files.filter((f) => f.endsWith(".html")))
      pages.set(file, await readFile(join(dist, file), "utf8"))
    const read = async (file) => {
      if (!pages.has(file)) throw new Error(`no built page ${file}`)
      return pages.get(file)
    }
    const hasBrand = await access(join(dir, "brand")).then(
      () => true,
      () => false,
    )
    return {
      ok: run.status === 0,
      output: `${run.stdout}\n${run.stderr}`,
      files,
      read,
      hasBrand,
    }
  } finally {
    // Remove the link first, so that nothing below it can be followed.
    await unlink(join(dir, "node_modules")).catch(() => {})
    await rm(dir, { recursive: true, force: true })
  }
}

const good = await buildScenario("good")

const FIXTURE_PAGES = {
  published: "/lecture-notes/berries/fixture-published/",
  archived: "/lecture-notes/berries/fixture-archived/",
  draft: "/lecture-notes/berries/fixture-draft/",
  post: "/blog/fixture-post/",
  olderPost: "/blog/fixture-older-post/",
  work: "/writing/kosmos/fixture-work/",
  chapter: "/writing/kosmos/fixture-chapter-one/",
  log: "/lecture-notes/timber-logs/fixture-log/",
}
const fileOf = (path) => `${path.slice(1)}index.html`
const treeOf = async (path) => parse(await good.read(fileOf(path)))
const htmlOf = (path) => good.read(fileOf(path))
const attr = (html, name) =>
  new RegExp(`<html[^>]*\\s${name}="([^"]*)"`).exec(html)?.[1]

await test(
  "CONT-018",
  "The content pipeline builds without the local Bearnard masters",
  async (check) => {
    check(good.ok, `the build failed:\n${good.output.slice(-1500)}`)
    check(!good.hasBrand, "the build copy contains brand/")
    check(good.files.length > 0, "the build produced no files")
  },
)

await test("CONT-007", "A draft has no page in a build (built)", async (check) => {
  check(!good.files.includes(fileOf(FIXTURE_PAGES.draft)), "the draft's page was built")
  check(
    !good.files.some(
      (f) => f.includes("fixture-draft") || f.includes("fixture-only-draft"),
    ),
    "a built path names a draft",
  )
  for (const file of good.files.filter((f) => f.endsWith(".html"))) {
    const html = await good.read(file)
    check(
      !/a draft berry|collection with only a draft/.test(html),
      `${file} shows a draft`,
    )
    check(
      !/Files starting with an underscore/.test(html),
      `${file} shows an ignored file`,
    )
  }
})

await test(
  "CONT-008",
  "Published and archived entries are built, and only those (built)",
  async (check) => {
    const expected = new Set(
      [
        ...siteNavigation.pagePaths(),
        ...designStudies,
        FIXTURE_PAGES.published,
        FIXTURE_PAGES.archived,
        FIXTURE_PAGES.post,
        FIXTURE_PAGES.olderPost,
        FIXTURE_PAGES.work,
        FIXTURE_PAGES.chapter,
        FIXTURE_PAGES.log,
      ].map(fileOf),
    )
    const pages = good.files.filter((f) => f.endsWith(".html"))
    for (const file of expected) check(pages.includes(file), `missing page: ${file}`)
    const extra = pages.filter((f) => !expected.has(f))
    check(extra.length === 0, `unexpected pages: ${extra.join(", ")}`)
    check(!pages.some((f) => f.startsWith("external/")), "an External page was built")
    check(pages.length === 36 + 4 + 7, `${pages.length} pages, expected 47`)
    // One route per entry: no page is generated twice under another name.
    check(
      !good.files.some((f) => /fixture-published\/.+\//.test(f)),
      "an entry has a second page",
    )
  },
)

await test(
  "CONT-009",
  "An archived entry is built and marked historical (built)",
  async (check) => {
    const html = await htmlOf(FIXTURE_PAGES.archived)
    check(
      /data-editorial-status="archived"/.test(html),
      "the page does not say it is archived",
    )
    check(
      /Archived: this entry is kept for the record/.test(html),
      "no archived notice",
    )
    check(
      /Updated <time datetime="2026-02-01"[^>]*>1 February 2026/.test(html),
      "no update date",
    )
    const index = await htmlOf("/lecture-notes/berries/")
    check(
      /fixture-archived\/"/.test(index) && /· archived/.test(index),
      "the index omits the archived entry or its mark",
    )
  },
)

await test(
  "CONT-010",
  "Entries render inside their owning folders (built)",
  async (check) => {
    const cases = [
      [FIXTURE_PAGES.published, ["Lecture Notes", "Berries"]],
      [FIXTURE_PAGES.archived, ["Lecture Notes", "Berries"]],
      [FIXTURE_PAGES.log, ["Lecture Notes", "Timber Logs"]],
      [FIXTURE_PAGES.chapter, ["Writing", "Kosmos Series"]],
      [FIXTURE_PAGES.post, ["Blog"]],
    ]
    for (const [path, selected] of cases) {
      const tree = await treeOf(path)
      const { layers } = layersOf(tree)
      check(
        layers.length === selected.length,
        `${path}: ${layers.length} rows, expected ${selected.length}`,
      )
      selected.forEach((label, level) => {
        const marked = selectedOf(layers[level]).map(labelOf)
        check(
          json(marked) === json([label]),
          `${path}: level ${level + 1} selects ${json(marked)}, expected ${label}`,
        )
      })
      // The entry is the folder's content, in <main> after every row; no tab stands for it.
      const main = elements(tree).filter((el) => el.tag === "main")
      check(main.length === 1, `${path}: ${main.length} main elements`)
      const current = elements(tree).filter(
        (el) => el.attrs?.["aria-current"] === "page",
      )
      check(current.length === 0, `${path}: a tab is marked as the current page`)
      const articles = elements(tree).filter((el) => el.tag === "article")
      check(articles.length === 1, `${path}: ${articles.length} articles`)
    }
  },
)

await test(
  "CONT-011",
  "Entries take their section's category, and every tab keeps its own (built)",
  async (check) => {
    const expected = [
      [FIXTURE_PAGES.published, "blog-notes", "technical"],
      [FIXTURE_PAGES.post, "blog-notes", undefined],
      [FIXTURE_PAGES.chapter, "writing", "literary"],
      [FIXTURE_PAGES.log, "blog-notes", "technical"],
    ]
    for (const [path, category, environment] of expected) {
      const html = await htmlOf(path)
      check(
        attr(html, "data-category") === category,
        `${path}: category ${attr(html, "data-category")}, expected ${category}`,
      )
      check(
        attr(html, "data-environment") === environment,
        `${path}: environment ${attr(html, "data-environment")}, expected ${environment}`,
      )
      const { layers } = layersOf(parse(html))
      const tabs = tabsOf(layers[0])
      const wanted = siteNavigation.sections.map((n) => [n.label, n.category])
      check(
        json(tabs.map((t) => [labelOf(t), t.attrs["data-category"]])) === json(wanted),
        `${path}: the global tabs changed their categories`,
      )
    }
  },
)

await test("CONT-012", "An entry builds no fourth row (built)", async (check) => {
  for (const path of Object.values(FIXTURE_PAGES).filter(
    (p) => p !== FIXTURE_PAGES.draft,
  )) {
    const html = await htmlOf(path)
    const layers = layersOf(parse(html)).layers
    check(layers.length <= 3, `${path}: ${layers.length} rows`)
    check(
      (html.match(/<nav /g) ?? []).length === layers.length,
      `${path}: a navigation landmark is not a row`,
    )
  }
})

await test("CONT-013", "Unregistered URLs have no page (built)", async (check) => {
  for (const path of [
    "/lecture-notes/berries/unknown/",
    "/lecture-notes/greenhouse/fixture-published/",
    "/blog/fixture-published/",
    "/writing/kosmos/fixture-published/",
    "/lecture-notes/berries/fixture-published/extra/",
  ])
    check(!good.files.includes(fileOf(path)), `${path} was built`)
})

await test(
  "CONT-015",
  "Empty collections show an intentional message (built)",
  async (check) => {
    const message = "This collection has no published entries yet."
    const has = async (path, className) =>
      elements(await treeOf(path)).some(hasClass(className))
    for (const path of [
      "/lecture-notes/bearnards-trail/",
      "/lecture-notes/greenhouse/",
      "/writing/months-original/",
      "/writing/book-club/",
    ]) {
      check((await htmlOf(path)).includes(message), `${path} has no empty message`)
      check(await has(path, "gl-index"), `${path} has no index section`)
      check(!(await has(path, "gl-index__list")), `${path} lists entries`)
    }
    check(
      !(await htmlOf("/lecture-notes/berries/")).includes(message),
      "a collection with entries shows the empty message",
    )
    check(
      await has("/lecture-notes/berries/", "gl-index__list"),
      "berries lists nothing",
    )
    // Folders without a collection show no index.
    check(!(await has("/cv/", "gl-index")), "/cv/ shows an index")
    check(!(await has("/lecture-notes/", "gl-index")), "/lecture-notes/ shows an index")
  },
)

await test(
  "CONT-014",
  "Built indexes list entries in the collection's order (built)",
  async (check) => {
    const links = async (path) =>
      [...(await htmlOf(path)).matchAll(/<li[^>]*><a href="([^"]+)"/g)].map((m) => m[1])
    check(
      json(await links("/blog/")) ===
        json([FIXTURE_PAGES.post, FIXTURE_PAGES.olderPost]),
      `blog lists ${json(await links("/blog/"))}`,
    )
    check(
      json(await links("/lecture-notes/berries/")) ===
        json([FIXTURE_PAGES.published, FIXTURE_PAGES.archived]),
      `berries lists ${json(await links("/lecture-notes/berries/"))}`,
    )
    check(
      json(await links("/writing/kosmos/")) ===
        json([FIXTURE_PAGES.work, FIXTURE_PAGES.chapter]),
      `kosmos lists ${json(await links("/writing/kosmos/"))}`,
    )
  },
)

await test(
  "CONT-016",
  "Markdown renders in the standard page shell (built)",
  async (check) => {
    const html = await htmlOf(FIXTURE_PAGES.published)
    const tree = parse(html)
    const has = (tag) => elements(tree).some((el) => el.tag === tag)
    for (const tag of [
      "h1",
      "h2",
      "ul",
      "ol",
      "table",
      "thead",
      "pre",
      "code",
      "a",
      "img",
      "time",
      "header",
      "article",
    ])
      check(has(tag), `no <${tag}> in the rendered entry`)
    check(
      /<h1[^>]*>SYNTHETIC FIXTURE: a published berry<\/h1>/.test(html),
      "the title is not the h1",
    )
    check(
      /A synthetic published entry used only by the build tests\./.test(html),
      "the description is missing",
    )
    check(
      /<time datetime="2026-03-02"[^>]*>2 March 2026<\/time>/.test(html),
      "the publication date is missing",
    )
    check(
      /<a href="https:\/\/example\.org\/fixture"/.test(html),
      "the ordinary link is changed",
    )
    check(
      /<img[^>]*src="\/fixture\.png"[^>]*alt="A synthetic image"|<img[^>]*alt="A synthetic image"[^>]*src="\/fixture\.png"/.test(
        html,
      ),
      "the image is changed",
    )
    check(
      /<code[^>]*>[^<]*<span|<code[^>]*>print/.test(html),
      "the code block is missing",
    )
    check(
      /<title>SYNTHETIC FIXTURE: a published berry · GusmaoLab<\/title>/.test(html),
      "the document title is wrong",
    )
    check(
      /<meta name="description" content="A synthetic published entry/.test(html),
      "the page's description is wrong",
    )
    // The standard shell: the folders, one <main>, the global stylesheet, no client router.
    check(elements(tree).some(hasClass("gl-folders")), "no folders")
    check(/<main id="content"/.test(html), "no main landmark")
    check(/rel="stylesheet"/.test(html), "no stylesheet")
    check(
      !/astro-route-announcer|astro-view-transitions|ClientRouter/.test(html),
      "a client router is present",
    )
    // Plain links: every tab and every index link is an <a href>.
    check(
      tabsOf(layersOf(tree).layers[0]).every((tab) =>
        elements(tab).some((el) => el.tag === "a" && el.attrs.href),
      ),
      "a tab is not a link",
    )
  },
)

await test(
  "CONT-004",
  "Invalid metadata fails the build, naming the problem (built)",
  async (check) => {
    const cases = [
      ["bad-date", "not a calendar date", "date.md"],
      ["bad-missing-field", "needs a description", "missing.md"],
      ["bad-unknown-field", "statuss", "unknown.md"],
    ]
    for (const [scenario, fragment, file] of cases) {
      const bad = await buildScenario(scenario)
      check(!bad.ok, `${scenario}: the build succeeded`)
      check(
        bad.output.includes(fragment),
        `${scenario}: no mention of "${fragment}" in:\n${bad.output.slice(-900)}`,
      )
      check(bad.output.includes(file), `${scenario}: the file ${file} is not named`)
      check(
        !bad.files.some((f) => f.includes("fixture-")),
        `${scenario}: pages were produced`,
      )
    }
  },
)

await test(
  "CONT-005",
  "Two entries with one slug fail the build (built)",
  async (check) => {
    const bad = await buildScenario("bad-duplicate-slug")
    check(!bad.ok, "the build succeeded")
    check(
      bad.output.includes('share the slug "fixture-same"'),
      `no clash reported in:\n${bad.output.slice(-900)}`,
    )
    check(
      !bad.files.some((f) => f.includes("fixture-same")),
      "a page was built for the clash",
    )
  },
)

await test(
  "CONT-020",
  "An entry that names a record the site lacks fails the build (built)",
  async (check) => {
    // P11: entries may reference canonical records by ID. The site's records are empty,
    // so this reference is to nothing, even on a draft.
    const bad = await buildScenario("bad-related-record")
    check(!bad.ok, "the build succeeded")
    check(
      bad.output.includes(
        "names the record project-fixture-does-not-exist, which does not exist",
      ),
      `no broken reference reported in:\n${bad.output.slice(-900)}`,
    )
    check(!bad.files.some((f) => f.includes("fixture-")), "pages were produced")
  },
)

// --- Report -------------------------------------------------------------------------------

let failed = 0
for (const { id, title, failures } of results) {
  if (failures.length === 0) console.log(`PASS ${id} ${title}`)
  else {
    failed++
    console.error(`FAIL ${id} ${title}`)
    for (const message of failures.slice(0, 12)) console.error(`  - ${message}`)
  }
}
if (failed > 0) process.exit(1)
console.log(
  `PASS: ${results.length} editorial build checks; 6 builds, ${good.files.length} files in the good one`,
)
