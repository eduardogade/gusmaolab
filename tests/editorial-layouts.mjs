// Editorial reading layouts (P12, D-094 to D-097): EDIT-001 to EDIT-022 that need no browser.
// They check the pure reading logic (src/editorial/reading.ts) on the synthetic fixture
// (src/design/editorial-fixture.ts), the source of the layouts, and the built pages in
// dist/ (the real collection pages and the editorial study). Run `npm run build` first.
//
// Real browser behaviour (overflow, widths, anchors, focus) is tests/editorial-browser.mjs.
// A throwaway build of real entries and of broken ones is in tests/editorial-build.mjs
// (EDIT-003B, EDIT-016B, EDIT-018B).
import { execFileSync } from "node:child_process"
import { readFile, readdir } from "node:fs/promises"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import {
  COLLECTIONS,
  COLLECTION_IDS,
  collectionById,
  collectionPrefix,
} from "../src/editorial/collections.ts"
import {
  indexItems,
  isPublic,
  publicPath,
  sortRecords,
} from "../src/editorial/model.ts"
import {
  PRESENTATIONS,
  TOC_MINIMUM,
  entryReference,
  entryReferenceIssues,
  groupIndex,
  readingContext,
  tableOfContents,
} from "../src/editorial/reading.ts"
import { schemaFor } from "../src/editorial/schema.ts"
import {
  SYNTHETIC_ENTRIES,
  STUDY_ROOT,
  studyPath,
  studyPaths,
} from "../src/design/editorial-fixture.ts"
import { siteNavigation } from "../src/navigation/index.ts"
import { demoBuild } from "./demo-dist.mjs"
import { elements, labelOf, layersOf, parse, selectedOf } from "./html-tree.mjs"

const repo = new URL("../", import.meta.url)
const root = fileURLToPath(repo)
const dist = join(root, "dist")
const json = (value) => JSON.stringify(value)
const read = (path) => readFile(join(root, path), "utf8")
// The editorial study is a development page (P22, D-157): it is read from a throwaway demonstration build; the real
// collection pages are read from the release.
const demo = await demoBuild()
const fileOf = (path) => join(path.startsWith("/_design/") ? demo.dir : dist, `${path.slice(1)}index.html`)
const html = (path) => readFile(fileOf(path), "utf8")

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
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? listFiles(join(dir, e.name)) : [join(dir, e.name)],
      ),
    )
  ).flat()
}

const published = SYNTHETIC_ENTRIES.filter((e) => isPublic(e.data.status))
const bySlug = (slug) => SYNTHETIC_ENTRIES.find((e) => e.data.slug === slug)
const ctx = (slug) => readingContext(bySlug(slug), SYNTHETIC_ENTRIES)
const titleOf = (link) => link?.title
const LAYOUT_FILES = {
  blog: "BlogLayout",
  trail: "TrailLayout",
  greenhouse: "GreenhouseLayout",
  berries: "BerriesLayout",
  timberLogs: "TimberLogLayout",
  monthsOriginal: "MonthsOriginalLayout",
  kosmos: "KosmosLayout",
  bookClub: "BookClubLayout",
}
const layoutSource = async (id) =>
  read(`src/layouts/editorial/${LAYOUT_FILES[id]}.astro`)

// The study's built pages, and the real collection pages.
const studyArticles = published.map((e) => studyPath(e.collection, e.data.slug))
const realIndexes = COLLECTIONS.map((c) => collectionPrefix(c))
const stat = await readdir(dist).catch(() => [])
if (stat.length === 0) {
  console.error("NOT RUN: dist/ is not built; run `npm run build`")
  process.exit(2)
}

await test("EDIT-001", "Eight collections, eight reading layouts", async (check) => {
  check(
    json(Object.keys(PRESENTATIONS)) === json([...COLLECTION_IDS]),
    "the presentation table does not list the eight collections in order",
  )
  check(COLLECTION_IDS.length === 8, "there are not eight collections")
  for (const id of COLLECTION_IDS) {
    check(
      PRESENTATIONS[id].layout === id,
      `${id} has layout ${PRESENTATIONS[id].layout}`,
    )
    check(Boolean(PRESENTATIONS[id].emptyText), `${id} has no empty text`)
  }
  const map = await read("src/layouts/editorial/layouts.ts")
  for (const id of COLLECTION_IDS) {
    check(
      new RegExp(`\\b${id}: ${LAYOUT_FILES[id]}\\b`).test(map),
      `layouts.ts does not map ${id} to ${LAYOUT_FILES[id]}`,
    )
    check(
      map.includes(`./${LAYOUT_FILES[id]}.astro`),
      `layouts.ts does not import ${LAYOUT_FILES[id]}`,
    )
  }
  check(
    (map.match(/^\s+\w+: \w+Layout,$/gm) ?? []).length === 8,
    "layouts.ts maps a number of layouts other than eight",
  )
  const entry = await read("src/components/editorial/EditorialEntry.astro")
  check(
    entry.includes("EDITORIAL_LAYOUTS[collection]"),
    "EditorialEntry does not use the layout map",
  )
})

await test("EDIT-002", "The layouts share one article shell", async (check) => {
  for (const id of COLLECTION_IDS) {
    const source = await layoutSource(id)
    check(source.includes("<EditorialArticle"), `${id}: no shared article shell`)
    check(!source.includes("<article"), `${id}: draws its own <article>`)
    check(!/<h1/.test(source), `${id}: draws its own <h1>`)
    check(!/toLocale|Intl\.|new Date/.test(source), `${id}: formats a date itself`)
    for (const other of COLLECTION_IDS)
      if (other !== id)
        check(
          !source.includes(LAYOUT_FILES[other]),
          `${id} imports the ${other} layout`,
        )
  }
  const shell = (await read("src/components/editorial/EditorialArticle.astro")).replace(
    /\/\*\*[\s\S]*?\*\//g,
    "",
  )
  for (const part of [
    "EditorialMetadata",
    "EditorialPagination",
    "EditorialRelated",
    "EditorialToc",
  ])
    check(shell.includes(`<${part}`), `the shell does not use ${part}`)
  check((shell.match(/<h1/g) ?? []).length === 1, "the shell has not exactly one <h1>")
  check(
    (shell.match(/<article/g) ?? []).length === 1,
    "the shell has not exactly one <article>",
  )
  check(!/<main/.test(shell), "the shell draws a <main>")
})

await test(
  "EDIT-003",
  "Each study article uses its own collection's layout",
  async (check) => {
    for (const entry of published) {
      const path = studyPath(entry.collection, entry.data.slug)
      const page = await html(path)
      const dir = collectionById(entry.collection).directory
      check(
        page.includes(`data-editorial-layout="${entry.collection}"`),
        `${path}: wrong layout`,
      )
      check(
        page.includes(`data-editorial-collection="${entry.collection}"`),
        `${path}: wrong collection`,
      )
      check(
        new RegExp(`class="ed ed--${dir}"`).test(page),
        `${path}: no ed--${dir} class`,
      )
      check(
        page.includes(`data-measure="${PRESENTATIONS[entry.collection].measure}"`),
        `${path}: wrong measure`,
      )
    }
    // The eight look different: each has a feature of its own.
    const features = [
      ["/greenhouse/synthetic-long-tutorial/", "data-toc"],
      ["/trail/synthetic-lesson-two/", "ed__sequence"],
      ["/timber-logs/synthetic-log-2026-01/", "ed__period"],
      ["/months-original/synthetic-essay/", "ed__epigraph"],
      ["/kosmos/synthetic-chapter-one/", "ed__chapter-label"],
      ["/book-club/synthetic-discussion/", "ed__plate"],
      ["/berries/synthetic-berry/", "ed--berries"],
      ["/blog/synthetic-announcement/", "ed--blog"],
    ]
    for (const [path, marker] of features)
      check(
        (await html(STUDY_ROOT.slice(0, -1) + path)).includes(marker),
        `${path} lacks ${marker}`,
      )
  },
)

await test("EDIT-004", "Articles stay inside their owning folder", async (check) => {
  for (const entry of published) {
    const path = studyPath(entry.collection, entry.data.slug)
    const owner = siteNavigation.node(collectionById(entry.collection).owner)
    const { layers } = layersOf(parse(await html(path)))
    const selected = layers.map((layer) => selectedOf(layer).map(labelOf)[0])
    check(
      selected.at(-1) === owner.label,
      `${path}: deepest folder is ${selected.at(-1)}, not ${owner.label}`,
    )
  }
  for (const path of realIndexes) {
    const owner = COLLECTIONS.find((c) => collectionPrefix(c) === path)
    const { layers } = layersOf(parse(await html(path)))
    check(
      selectedOf(layers.at(-1)).map(labelOf)[0] ===
        siteNavigation.node(owner.owner).label,
      `${path}: wrong folder selected`,
    )
  }
})

await test("EDIT-005", "An article adds no row of folder tabs", async (check) => {
  for (const path of [
    ...studyArticles,
    ...COLLECTIONS.map((c) => studyPath(c.id)),
    ...realIndexes,
  ]) {
    const page = await html(path)
    const { layers } = layersOf(parse(page))
    check(layers.length <= 3, `${path}: ${layers.length} rows of tabs`)
    check(
      (page.match(/<nav (?![^>]*class="ed__)/g) ?? []).length === layers.length,
      `${path}: a navigation landmark is not a row`,
    )
  }
})

await test("EDIT-006", "Drafts have no page and are never listed", async (check) => {
  const drafts = SYNTHETIC_ENTRIES.filter((e) => e.data.status === "draft")
  check(drafts.length >= 2, "the fixture has too few drafts")
  const files = (await listFiles(join(demo.dir, "_design", "editorial"))).filter((f) =>
    f.endsWith(".html"),
  )
  for (const draft of drafts) {
    check(
      !studyPaths().includes(studyPath(draft.collection, draft.data.slug)),
      `${draft.id} has a study path`,
    )
    for (const file of files) {
      const page = await readFile(file, "utf8")
      check(
        !page.includes(draft.data.title),
        `${relative(demo.dir, file)} shows the draft "${draft.data.title}"`,
      )
      check(
        !page.includes(draft.data.slug),
        `${relative(demo.dir, file)} links the draft ${draft.data.slug}`,
      )
    }
  }
  for (const collection of COLLECTION_IDS)
    check(
      indexItems(collection, SYNTHETIC_ENTRIES).every(
        (i) => !drafts.some((d) => d.data.title === i.title),
      ),
      `${collection}'s index lists a draft`,
    )
})

await test("EDIT-007", "Empty collections say so", async (check) => {
  for (const c of COLLECTIONS) {
    const path = collectionPrefix(c)
    const page = await html(path)
    check(page.includes("data-editorial-empty"), `${path} has no empty state`)
    check(
      page.includes(PRESENTATIONS[c.id].emptyText.replace(/'/g, "&#39;")) ||
        page.includes(PRESENTATIONS[c.id].emptyText),
      `${path} does not say what is missing`,
    )
    check(!page.includes("ed-index__list"), `${path} lists entries`)
    check((page.match(/<h1[ >]/g) ?? []).length === 1, `${path} has not one <h1>`)
    check(
      page.includes(`<h1>${c.label.replace(/'/g, "&#39;")}</h1>`) ||
        page.includes(`<h1>${c.label}</h1>`),
      `${path}'s heading is not ${c.label}`,
    )
  }
  for (const id of COLLECTION_IDS)
    check(json(groupIndex(id, [])) === "[]", `${id}: an empty index has groups`)
})

await test(
  "EDIT-008",
  "Blog entries are newest first, deterministically",
  async (check) => {
    const order = (input) => indexItems("blog", input).map((i) => i.title)
    check(
      json(order(SYNTHETIC_ENTRIES)) ===
        json([
          "Synthetic announcement: a page was added",
          "Synthetic note: a paragraph was corrected",
        ]),
      `blog order ${json(order(SYNTHETIC_ENTRIES))}`,
    )
    check(
      json(order([...SYNTHETIC_ENTRIES].reverse())) === json(order(SYNTHETIC_ENTRIES)),
      "the order depends on the input order",
    )
    // Two posts on one day: the slug breaks the tie, the same way every time.
    const twin = (slug) => ({
      collection: "blog",
      id: slug,
      data: { ...bySlug("synthetic-announcement").data, slug },
    })
    const tied = [twin("b-post"), twin("a-post")]
    check(
      json(sortRecords("blog", tied).map((r) => r.data.slug)) ===
        json(["a-post", "b-post"]),
      "a tie is not broken by slug",
    )
  },
)

await test(
  "EDIT-009",
  "Trail lessons follow explicit series and position",
  async (check) => {
    const items = indexItems("trail", SYNTHETIC_ENTRIES)
    check(
      json(items.map((i) => i.details.position ?? null)) === json([1, 2, 3, null]),
      `positions ${json(items.map((i) => i.details.position ?? null))}`,
    )
    const groups = groupIndex("trail", items)
    check(
      json(groups.map((g) => g.id)) ===
        json(["series-synthetic-sequence", "standalone"]),
      `groups ${json(groups.map((g) => g.id))}`,
    )
    check(
      groups[0].heading === "A synthetic sequence on counting",
      "the series title is not the heading",
    )
    check(groups[1].heading === "Standalone lessons", "standalone lessons are not last")
    // Position, not publication date, decides: swap the dates.
    const swapped = SYNTHETIC_ENTRIES.map((e) =>
      e.data.slug === "synthetic-lesson-one"
        ? { ...e, data: { ...e.data, publishedAt: "2030-01-01" } }
        : e,
    )
    check(
      indexItems("trail", swapped)[0].details.position === 1,
      "a date moved a lesson",
    )
    const two = ctx("synthetic-lesson-two")
    check(
      titleOf(two.previous) === "Synthetic lesson one: what is a unit" &&
        titleOf(two.next) === "Synthetic lesson three: comparing two counts",
      "lesson two's neighbours are wrong",
    )
    check(
      two.sequence.number === 2 && two.sequence.count === 3 && two.sequence.complete,
      `sequence ${json(two.sequence)}`,
    )
    check(
      ctx("synthetic-lesson-three").next === undefined,
      "lesson three links the unpublished lesson four",
    )
    check(
      ctx("synthetic-lesson-one").previous === undefined,
      "lesson one has a previous lesson",
    )
    const alone = ctx("synthetic-standalone-lesson")
    check(
      alone.previous === undefined &&
        alone.next === undefined &&
        alone.sequence === undefined,
      "a standalone lesson has a sequence",
    )
  },
)

await test(
  "EDIT-010",
  "Timber Logs group by year and month from the period",
  async (check) => {
    const items = indexItems("timberLogs", SYNTHETIC_ENTRIES)
    check(
      json(items.map((i) => i.when)) === json(["2026-03", "2026-01", "2025-11"]),
      `periods ${json(items.map((i) => i.when))}`,
    )
    const groups = groupIndex("timberLogs", items)
    check(
      json(groups.map((g) => g.heading)) === json(["2026", "2025"]),
      `years ${json(groups.map((g) => g.heading))}`,
    )
    check(
      groups[0].items.length === 2 && groups[1].items.length === 1,
      "entries are in the wrong year",
    )
    const page = await html(studyPath("timberLogs"))
    check(!page.includes("February"), "an empty month appears")
    for (const month of ["March", "January", "November"])
      check(page.includes(month), `${month} is missing`)
    check(
      page.indexOf("March") < page.indexOf("January") &&
        page.indexOf("January") < page.indexOf("November"),
      "months are not newest first",
    )
    check(
      ctx("synthetic-log-2026-01").previous.title === "Synthetic log, November" &&
        ctx("synthetic-log-2026-01").next.title === "Synthetic log, March",
      "a gap month breaks the neighbours",
    )
  },
)

await test(
  "EDIT-011",
  "Kosmos chapters follow the work's declared order",
  async (check) => {
    const items = indexItems("kosmos", SYNTHETIC_ENTRIES)
    check(
      json(items.map((i) => i.title)) ===
        json(["A Synthetic Work", "The first synthetic chapter", "An interlude"]),
      `order ${json(items.map((i) => i.title))}`,
    )
    const [group] = groupIndex("kosmos", items)
    check(
      group.lead?.title === "A Synthetic Work" && group.items.length === 2,
      "the work does not lead its chapters",
    )
    const one = ctx("synthetic-chapter-one")
    check(
      one.previous === undefined && one.next?.title === "An interlude",
      "chapter one's neighbours are wrong",
    )
    check(
      one.sequence.title === "A Synthetic Work" && one.sequence.kind === "work",
      "the chapter does not name its work",
    )
    check(
      ctx("synthetic-chapter-two").next === undefined,
      "the last chapter has a next",
    )
    const work = ctx("synthetic-work")
    check(
      work.chapters.length === 2 &&
        work.chapters[0].mark === "I" &&
        work.chapters[1].mark === "Interlude",
      `chapter marks ${json(work.chapters)}`,
    )
    check(
      work.next.title === "The first synthetic chapter" && work.previous === undefined,
      "the work's own page has wrong neighbours",
    )
    // The author's marks are shown as written.
    const page = await html(studyPath("kosmos", "synthetic-chapter-one"))
    check(
      page.includes(">I</p>") || page.includes('data-chapter-mark="I"'),
      "the chapter's own label is not shown",
    )
    check(
      page.includes("§ 2") && page.includes("∴"),
      "the author's section marks were changed",
    )
  },
)

await test(
  "EDIT-012",
  "The Greenhouse contents come from the real headings",
  async (check) => {
    const page = await html(studyPath("greenhouse", "synthetic-long-tutorial"))
    const tree = parse(page)
    const headings = elements(tree)
      .filter((el) => /^h[1-4]$/.test(el.tag))
      .map((el) => ({ depth: Number(el.tag[1]), id: el.attrs?.id }))
    const nav = elements(tree).find(
      (el) => el.tag === "nav" && "data-toc" in (el.attrs ?? {}),
    )
    check(nav !== undefined, "no contents navigation")
    const links = elements(nav)
      .filter((el) => el.tag === "a")
      .map((el) => el.attrs.href)
    const ids = new Set(headings.map((h) => h.id).filter(Boolean))
    check(links.length >= TOC_MINIMUM, `only ${links.length} links`)
    for (const href of links)
      check(
        href.startsWith("#") && ids.has(href.slice(1)),
        `${href} does not point at a heading`,
      )
    const body = elements(tree).find(
      (el) => el.attrs?.["data-editorial-body"] !== undefined,
    )
    const bodyIds = elements(body)
      .filter((el) => /^h[23]$/.test(el.tag))
      .map((el) => el.attrs.id)
    const expected = [...bodyIds, "references"]
    check(
      json(links.map((l) => l.slice(1))) === json(expected),
      `links ${json(links)} do not follow the headings ${json(expected)}`,
    )
    check(headings.filter((h) => h.depth === 1).length === 1, "not exactly one <h1>")
    check(
      !links.includes(`#${headings.find((h) => h.depth === 1)?.id}`),
      "the title is in the contents",
    )
    check(page.includes('id="references"'), "no references section")
    // Pure function.
    const items = tableOfContents([
      { depth: 1, slug: "t", text: "Title" },
      { depth: 2, slug: "a", text: "A" },
      { depth: 3, slug: "b", text: "B" },
      { depth: 4, slug: "c", text: "C" },
      { depth: 2, slug: "d", text: "D" },
    ])
    check(
      json(items.map((i) => i.slug)) === json(["a", "b", "d"]),
      `toc ${json(items)}`,
    )
  },
)

await test("EDIT-013", "A short article shows no contents", async (check) => {
  check(
    json(
      tableOfContents([
        { depth: 2, slug: "a", text: "A" },
        { depth: 2, slug: "b", text: "B" },
      ]),
    ) === "[]",
    "two headings made a contents list",
  )
  check(json(tableOfContents([])) === "[]", "no headings made a contents list")
  check(
    json(
      tableOfContents([
        { depth: 2, slug: "", text: "x" },
        { depth: 2, slug: "a", text: " " },
        { depth: 2, slug: "b", text: "B" },
      ]),
    ) === "[]",
    "empty headings counted",
  )
  for (const slug of ["synthetic-short-article"]) {
    const page = await html(studyPath("greenhouse", slug))
    check(
      !page.includes("data-toc") && !page.includes("On this page"),
      `${slug} shows a contents list`,
    )
  }
  for (const id of COLLECTION_IDS.filter((id) => id !== "greenhouse"))
    check(!PRESENTATIONS[id].contents, `${id} may offer a contents list`)
  for (const entry of published.filter(
    (e) => e.collection !== "greenhouse" || e.data.slug !== "synthetic-long-tutorial",
  ))
    check(
      !(await html(studyPath(entry.collection, entry.data.slug))).includes("data-toc"),
      `${entry.data.slug} has a contents list`,
    )
})

await test(
  "EDIT-016",
  "One <h1> per page and no skipped heading levels",
  async (check) => {
    const paths = [
      ...studyArticles,
      ...COLLECTIONS.map((c) => studyPath(c.id)),
      ...realIndexes,
    ]
    for (const path of paths) {
      const page = await html(path)
      const levels = [...page.matchAll(/<h([1-6])[ >]/g)].map((m) => Number(m[1]))
      check(
        levels.filter((l) => l === 1).length === 1,
        `${path}: ${levels.filter((l) => l === 1).length} <h1>`,
      )
      levels.forEach((level, i) => {
        if (i > 0)
          check(
            level <= levels[i - 1] + 1,
            `${path}: h${levels[i - 1]} is followed by h${level}`,
          )
      })
      check(
        (page.match(/<main[ >]/g) ?? []).length === 1,
        `${path}: not exactly one <main>`,
      )
    }
    for (const path of studyArticles)
      check(
        (await html(path)).match(/<article[ >]/g)?.length === 1,
        `${path}: not one <article>`,
      )
    const entry = await read("src/components/editorial/EditorialEntry.astro")
    check(
      /depth === 1/.test(entry) && /level-1 heading/.test(entry),
      "EditorialEntry does not refuse a level-1 heading",
    )
    for (const file of await listFiles(join(root, "src/design/editorial")))
      check(
        !/^# /m.test((await readFile(file, "utf8")).replace(/```[\s\S]*?```/g, "")),
        `${relative(root, file)} has a level-1 heading`,
      )
  },
)

await test(
  "EDIT-017",
  "Previous and next lead to published entries, by each collection's order",
  async (check) => {
    const built = new Set(studyPaths())
    for (const entry of published) {
      const page = await html(studyPath(entry.collection, entry.data.slug))
      for (const m of page.matchAll(
        /<a [^>]*rel="(?:prev|next)"[^>]*>|<a [^>]*href="([^"]+)"[^>]*rel="(?:prev|next)"/g,
      )) {
        const href = /href="([^"]+)"/.exec(m[0])[1]
        check(
          built.has(href),
          `${entry.data.slug}: ${href} is not a published study page`,
        )
        check(
          href !== studyPath(entry.collection, entry.data.slug),
          `${entry.data.slug} links itself`,
        )
      }
      const c = readingContext(entry, SYNTHETIC_ENTRIES)
      for (const l of [c.previous, c.next].filter(Boolean)) {
        const target = published.find((e) => publicPath(e) === l.path)
        check(target !== undefined, `${entry.data.slug}: a neighbour is not published`)
        check(
          target?.collection === entry.collection,
          `${entry.data.slug}: a neighbour is in another collection`,
        )
      }
    }
    const blog = ctx("synthetic-announcement")
    check(
      blog.previous?.title.includes("corrected") && blog.next === undefined,
      "blog: older is the previous, nothing is newer",
    )
    const book = ctx("synthetic-discussion")
    check(
      book.previous?.title === "Synthetic first session" && book.next === undefined,
      "book club: neighbours are not the same book's",
    )
    check(
      ctx("synthetic-other-book").previous === undefined &&
        ctx("synthetic-other-book").next === undefined,
      "book club: another book is connected",
    )
    for (const slug of ["synthetic-long-tutorial", "synthetic-berry"]) {
      const c = ctx(slug)
      check(
        c.previous === undefined && c.next === undefined,
        `${slug}: has a neighbour, though its collection has no sequence`,
      )
    }
    const essay = ctx("synthetic-essay")
    check(
      essay.previous?.title === "A synthetic earlier essay" && essay.next === undefined,
      "months: the earlier month is not the previous",
    )
  },
)

await test(
  "EDIT-018",
  "Related entries resolve, and drafts are never linked",
  async (check) => {
    const tutorial = "greenhouse/synthetic-long-tutorial"
    check(
      entryReference(bySlug("synthetic-long-tutorial")) === tutorial,
      "an entry's reference is not directory/slug",
    )
    check(
      json(entryReferenceIssues(SYNTHETIC_ENTRIES)) === "[]",
      `fixture issues ${json(entryReferenceIssues(SYNTHETIC_ENTRIES))}`,
    )
    check(
      json(ctx("synthetic-berry").related.map((r) => r.title)) ===
        json(["Synthetic tutorial: counting characters is harder than it looks"]),
      "the berry does not list its tutorial",
    )
    check(
      ctx("synthetic-berry").related[0].collection === "The Greenhouse",
      "a related link does not name its collection",
    )
    const make = (related) =>
      SYNTHETIC_ENTRIES.map((e) =>
        e.data.slug === "synthetic-berry" ? { ...e, data: { ...e.data, related } } : e,
      )
    check(
      entryReferenceIssues(make(["greenhouse/nope"])).some((m) =>
        m.includes("greenhouse/nope, which does not exist"),
      ),
      "a missing entry is not reported",
    )
    check(
      entryReferenceIssues(make(["berries/synthetic-berry"])).some((m) =>
        m.includes("relates to itself"),
      ),
      "a self reference is not reported",
    )
    check(
      entryReferenceIssues(make(["nowhere/x"])).some((m) =>
        m.includes('no collection "nowhere"'),
      ),
      "an unknown collection is not reported",
    )
    // A reference to a draft is resolved but never linked.
    const draft = "blog/synthetic-draft-post"
    check(
      entryReferenceIssues(make([draft])).length === 0,
      "a draft reference is an error",
    )
    const withDraft = make([draft])
    check(
      readingContext(
        withDraft.find((e) => e.data.slug === "synthetic-berry"),
        withDraft,
      ).related.length === 0,
      "a draft is linked",
    )
    const schema = schemaFor("berries")
    const parse1 = (related) =>
      schema.safeParse({ title: "t", status: "draft", slug: "s", related })
    check(parse1(["greenhouse/ok-slug"]).success, "a valid reference is rejected")
    for (const bad of ["greenhouse", "Greenhouse/Slug", "a/b/c", "greenhouse/"])
      check(!parse1([bad]).success, `"${bad}" is accepted`)
    check(!parse1(["greenhouse/a", "greenhouse/a"]).success, "a duplicate is accepted")
    const page = await html(studyPath("trail", "synthetic-lesson-two"))
    check(
      page.includes('href="/_design/editorial/greenhouse/synthetic-long-tutorial/"'),
      "related link is not on the study page",
    )
  },
)

await test(
  "EDIT-019",
  "Synthetic fixtures are never published entries",
  async (check) => {
    for (const id of COLLECTION_IDS) {
      const dir = join(root, "src/content", collectionById(id).directory)
      const files = await readdir(dir).catch(() => [])
      // The collections may hold the owner's real entries (drafts or published); they may never hold a
      // synthetic fixture, whose slug is one of the fixtures' own (P15 relaxed "holds no entry at all").
      for (const f of files.filter((f) => f.endsWith(".md") && !f.startsWith("_"))) {
        const text = await readFile(join(dir, f), "utf8")
        const slug = /^slug:\s*["']?([^"'\n]+)/m.exec(text)?.[1]?.trim() ?? ""
        check(
          !/^(synthetic|specimen|demo)-/.test(slug) &&
            !SYNTHETIC_ENTRIES.some((e) => e.data.slug === slug),
          `src/content/${collectionById(id).directory}/${f} is a synthetic fixture`,
        )
      }
    }
    // Only the study's own pages import the fixture.
    const importers = []
    for (const file of await listFiles(join(root, "src")))
      if (
        /\.(astro|ts|mjs)$/.test(file) &&
        (await readFile(file, "utf8")).includes("editorial-fixture")
      )
        importers.push(relative(root, file))
    for (const file of importers)
      check(
        file.startsWith("src/design/") ||
          file.startsWith("src/pages/[design]/editorial/") ||
          file.startsWith("src/pages/[design]/quarto/"),
        `${file} imports the study fixture`,
      )
    // The real collection pages and the home page carry none of it.
    for (const path of [...realIndexes, "/"]) {
      const page = await html(path)
      check(
        !/synthetic|_design\/editorial/i.test(page.replace(/Design studies?/gi, "")) ||
          path === "/",
        `${path} carries study content`,
      )
    }
    check(
      !(await html("/")).includes("synthetic-"),
      "the home page carries study content",
    )
    // The study says what it is, on every page.
    for (const path of studyPaths())
      check(
        (await html(path)).includes("data-editorial-study"),
        `${path} does not say it is a study`,
      )
    for (const file of await listFiles(join(root, "src/design/editorial")))
      check(
        /synthetic/i.test(await readFile(file, "utf8")),
        `${relative(root, file)} is not labelled synthetic`,
      )
    // No generated feed or sitemap lists study pages.
    const all = (await listFiles(dist)).map((f) => relative(dist, f))
    check(
      !all.some((f) => /sitemap|feed|rss|atom/i.test(f)),
      "a sitemap or feed was generated",
    )
  },
)

await test("EDIT-020", "The locked palettes are untouched", async (check) => {
  const changed = execFileSync(
    "git",
    [
      "diff",
      "--name-only",
      "HEAD",
      "--",
      "src/styles/categories.css",
      "src/styles/environments.css",
      "src/design/contract.mjs",
    ],
    { cwd: root, encoding: "utf8" },
  ).trim()
  check(changed === "", `locked files changed: ${changed}`)
  const sheet = (await read("src/styles/editorial.css")).replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  )
  check(
    !/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(sheet),
    "editorial.css has a raw colour",
  )
  check(!/--palette-/.test(sheet), "editorial.css uses a palette primitive")
  check(!/font-family:(?!\s*var\()/.test(sheet), "editorial.css names a font family")
  check(
    !/\[data-category|\[data-environment/.test(sheet),
    "editorial.css targets a category or an environment",
  )
  check(
    !/transition|animation|(?<!over)scroll-behavior/.test(sheet),
    "editorial.css adds motion",
  )
  check(!/@font-face/.test(sheet), "editorial.css loads a font")
  for (const id of COLLECTION_IDS) {
    const source = await layoutSource(id)
    check(
      !/#[0-9a-f]{3,8}\b|style="/i.test(source),
      `${id}: a raw colour or inline style`,
    )
  }
})

await test("EDIT-021", "The CV never reaches editorial output", async (check) => {
  const cvWords = /CV\.proposta|codex-yaml|CV-v\d|cv\/manifest|cv\/identities/
  for (const file of [
    ...(await listFiles(join(root, "src/editorial"))),
    ...(await listFiles(join(root, "src/design"))),
    ...(await listFiles(join(root, "src/components/editorial"))),
    ...(await listFiles(join(root, "src/layouts/editorial"))),
  ]) {
    const text = await readFile(file, "utf8")
    check(!cvWords.test(text), `${relative(root, file)} names a CV file`)
    check(
      !/from "(\.\.\/)+cv\/|src\/cv\//.test(text),
      `${relative(root, file)} imports the CV integration`,
    )
  }
  for (const file of (await listFiles(dist)).filter((f) =>
    /\.(html|css|js|json)$/.test(f),
  ))
    check(
      !cvWords.test(await readFile(file, "utf8")),
      `${relative(dist, file)} names a CV file`,
    )
  const tracked = execFileSync("git", ["status", "--short", "--", "cv"], {
    cwd: root,
    encoding: "utf8",
  })
  check(tracked.trim() === "", `cv/ has changes: ${tracked}`)
})

await test(
  "EDIT-022",
  "The folders still work as P06 to P09 left them",
  async (check) => {
    const labels = siteNavigation.sections.map((n) => `${n.label}:${n.category}`)
    check(labels.length === 11, `${labels.length} global tabs`)
    check(
      json(labels) ===
        json([
          "Home:core",
          "About:core",
          "Contact:core",
          "Schedule:core",
          "Portfolio:research",
          "CV:research",
          "Lab:research",
          "Blog:blog-notes",
          "Lecture Notes:blog-notes",
          "Writing:writing",
          "Bearnard's Area:bearnard",
        ]),
      `tabs ${json(labels)}`,
    )
    const page = await html("/lecture-notes/greenhouse/")
    const { layers } = layersOf(parse(page))
    check(layers.length === 2, `${layers.length} rows`)
    check(
      json(selectedOf(layers[1]).map(labelOf)) === json(["The Greenhouse"]),
      "the open folder is not selected",
    )
    const study = await html(studyPath("greenhouse", "synthetic-long-tutorial"))
    check(
      study.includes('data-page-path="/lecture-notes/greenhouse/"'),
      "the study does not draw the real folder",
    )
    check(
      !siteNavigation.resolve(STUDY_ROOT).found,
      "a study address resolves to a folder",
    )
    check(
      !siteNavigation.resolve("/lecture-notes/greenhouse/synthetic-long-tutorial/")
        .found,
      "a fixture entry has a site route",
    )
    const nav = await read("src/navigation/registry.ts")
    check(!nav.includes("editorial"), "the registry mentions the study")
  },
)

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
  `PASS: ${results.length} editorial layout checks; ${studyPaths().length} study pages, ${COLLECTION_IDS.length} collections`,
)
