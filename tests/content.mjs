// Editorial collection checks (P10, D-078 to D-081): CONT-001 to CONT-015, CONT-017 and
// CONT-019. They test the model: the collection registry, the metadata schemas, the
// routing rules and their fit with the navigation, on synthetic records. Pure functions
// only; no build needed. tests/editorial-build.mjs checks the same behaviour in real
// builds (CONT-016, CONT-018 and the built versions of the others).
//
// Every record below is a SYNTHETIC FIXTURE.
import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  COLLECTIONS,
  COLLECTION_IDS,
  collectionCategory,
  collectionOwnedBy,
  collectionPrefix,
} from "../src/editorial/collections.ts"
import {
  collectionIssues,
  contentRoutes,
  formatWhen,
  indexItems,
  publicPath,
  sortRecords,
} from "../src/editorial/model.ts"
import { isCalendarDate, schemaFor } from "../src/editorial/schema.ts"
import { SECTIONS } from "../src/navigation/registry.ts"
import {
  NavigationConfigError,
  createNavigation,
  siteNavigation,
} from "../src/navigation/index.ts"

const repo = fileURLToPath(new URL("../", import.meta.url))
const json = (value) => JSON.stringify(value)

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

/** A synthetic record; `data` holds only what a test cares about. */
const record = (collection, id, data) => ({
  collection,
  id,
  data: { title: `Fixture ${id}`, tags: [], status: "published", slug: id, ...data },
})
const parses = (collection, data) => schemaFor(collection).safeParse(data)
const messages = (result) =>
  result.success
    ? []
    : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
const published = {
  status: "published",
  description: "A synthetic description.",
  publishedAt: "2026-03-02",
}

/** The approved public prefixes (P10 brief, section 8). */
const PREFIXES = {
  blog: "/blog/",
  trail: "/lecture-notes/bearnards-trail/",
  greenhouse: "/lecture-notes/greenhouse/",
  berries: "/lecture-notes/berries/",
  timberLogs: "/lecture-notes/timber-logs/",
  monthsOriginal: "/writing/months-original/",
  kosmos: "/writing/kosmos/",
  bookClub: "/writing/book-club/",
}
const DIRECTORIES = {
  blog: "blog",
  trail: "trail",
  greenhouse: "greenhouse",
  berries: "berries",
  timberLogs: "timber-logs",
  monthsOriginal: "months-original",
  kosmos: "kosmos",
  bookClub: "book-club",
}
/** What each collection needs beyond the common fields, to be a valid published entry. */
const REQUIRED_EXTRA = {
  timberLogs: { period: "2026-04" },
  monthsOriginal: { period: "2026-04" },
  kosmos: { workId: "a-work" },
  bookClub: { bookTitle: "A Synthetic Book" },
}
const sample = (collection, overrides = {}) => ({
  title: "A synthetic entry",
  ...published,
  slug: "a-synthetic-entry",
  ...REQUIRED_EXTRA[collection],
  ...overrides,
})

// --- Tests --------------------------------------------------------------------------------

await test(
  "CONT-001",
  "Exactly eight editorial collections are registered",
  async (check) => {
    check(COLLECTIONS.length === 8, `${COLLECTIONS.length} collections, expected 8`)
    check(
      json(COLLECTION_IDS) === json(Object.keys(PREFIXES)),
      `ids are ${json(COLLECTION_IDS)}`,
    )
    check(
      json(COLLECTIONS.map((c) => c.id)) === json(COLLECTION_IDS),
      "the definitions and the ids differ",
    )
    const owners = new Set()
    for (const collection of COLLECTIONS) {
      check(!owners.has(collection.owner), `${collection.id}'s owner is shared`)
      owners.add(collection.owner)
      check(
        siteNavigation.nodes.has(collection.owner),
        `${collection.id} is owned by ${collection.owner}, which is not a folder`,
      )
      check(
        collection.directory === DIRECTORIES[collection.id],
        `${collection.id} reads ${collection.directory}`,
      )
      check(
        collectionPrefix(collection) === PREFIXES[collection.id],
        `${collection.id} has the prefix ${collectionPrefix(collection)}`,
      )
      check(
        collectionOwnedBy(collection.owner) === collection,
        `${collection.id} is not found by its owner`,
      )
    }
    // The Astro configuration declares exactly these collections, each from its directory.
    const config = await readFile(join(repo, "src/content.config.ts"), "utf8")
    const declared = [...config.matchAll(/^\s{2}(\w+): collection\("(\w+)"\),?$/gm)]
    check(
      json(declared.map((m) => m[1])) === json(COLLECTION_IDS) &&
        declared.every((m) => m[1] === m[2]),
      `content.config.ts declares ${json(declared.map((m) => m[1]))}`,
    )
    const directories = await readdir(join(repo, "src/content"))
    check(
      json([...directories].sort()) === json(Object.values(DIRECTORIES).sort()),
      `src/content holds ${json(directories)}`,
    )
  },
)

await test("CONT-002", "The shared metadata contract", async (check) => {
  for (const collection of COLLECTION_IDS) {
    // The smallest valid draft: title, status and slug.
    const draft = parses(collection, {
      title: "T",
      status: "draft",
      slug: "t",
      ...REQUIRED_EXTRA[collection],
    })
    check(
      draft.success,
      `${collection}: a minimal draft is rejected: ${messages(draft)}`,
    )
    if (draft.success)
      check(json(draft.data.tags) === "[]", `${collection}: tags default to none`)
    const full = parses(
      collection,
      sample(collection, { updatedAt: "2026-04-01", tags: ["a", "b-c"] }),
    )
    check(full.success, `${collection}: a full entry is rejected: ${messages(full)}`)
    for (const field of ["title", "status", "slug"]) {
      const { [field]: _omitted, ...rest } = sample(collection)
      check(!parses(collection, rest).success, `${collection}: ${field} is optional`)
    }
    check(
      !parses(collection, sample(collection, { statuss: "published" })).success,
      `${collection}: an unknown key is accepted`,
    )
  }
  const day = (value) => parses("berries", sample("berries", { publishedAt: value }))
  check(
    day("2026-11-13").data?.publishedAt === "2026-11-13",
    "a YYYY-MM-DD string is changed",
  )
  check(
    day(new Date("2026-11-13")).data?.publishedAt === "2026-11-13",
    "a YAML date (midnight UTC) is not read back as YYYY-MM-DD",
  )
  check(
    json(parses("berries", sample("berries", { tags: ["x", "x"] })).success) ===
      "false",
    "a repeated tag is accepted",
  )
})

await test("CONT-003", "Collection-specific fields", async (check) => {
  const ok = (collection, extra, message) =>
    check(
      parses(collection, sample(collection, extra)).success,
      `${message}: ${messages(parses(collection, sample(collection, extra)))}`,
    )
  const bad = (collection, extra, message) =>
    check(!parses(collection, sample(collection, extra)).success, message)
  for (const kind of ["announcement", "update", "news", "microblog", "post"])
    ok("blog", { kind }, `blog kind ${kind}`)
  bad("blog", { kind: "essay" }, "a blog kind outside the set is accepted")
  check(
    parses("blog", sample("blog")).data?.kind === "post",
    "a blog entry's kind does not default to post",
  )
  ok(
    "trail",
    { seriesId: "intro", position: 2, prerequisites: ["Linear algebra"] },
    "a trail entry in a series",
  )
  ok("trail", {}, "a trail entry outside any series")
  bad("trail", { position: 2 }, "a position without a series is accepted")
  bad("trail", { seriesId: "intro", position: 0 }, "position 0 is accepted")
  bad(
    "trail",
    { seriesId: "intro", position: 1.5 },
    "a fractional position is accepted",
  )
  ok(
    "greenhouse",
    { difficulty: "advanced", prerequisites: ["x"], references: ["Author (2020)"] },
    "a greenhouse entry",
  )
  bad("greenhouse", { difficulty: "expert" }, "an unknown difficulty is accepted")
  ok("berries", {}, "a berry")
  bad("berries", { period: "2026-04" }, "a berry accepts a period")
  for (const collection of ["timberLogs", "monthsOriginal"]) {
    ok(collection, { period: "2026-12" }, `${collection} period`)
    for (const period of ["2026-13", "2026-00", "2026-4", "April 2026", "2026-04-01"])
      bad(collection, { period }, `${collection} accepts the period ${period}`)
    const { period: _omitted, ...without } = sample(collection)
    check(!parses(collection, without).success, `${collection} accepts no period`)
  }
  ok(
    "kosmos",
    { workId: "pikokosmos", chapterNumber: 3, position: 7 },
    "a kosmos chapter",
  )
  bad("kosmos", { chapterNumber: 0 }, "chapter 0 is accepted")
  bad("kosmos", { workId: "Not A Slug" }, "a work ID that is not a slug is accepted")
  const { workId: _omitted, ...noWork } = sample("kosmos")
  check(!parses("kosmos", noWork).success, "a kosmos entry without a work is accepted")
  ok(
    "bookClub",
    { bookAuthor: "A. Author", sessionDate: "2026-04-18" },
    "a book club entry",
  )
  bad(
    "bookClub",
    { sessionDate: "2026-04-31" },
    "an impossible session date is accepted",
  )
  const { bookTitle: _title, ...noBook } = sample("bookClub")
  check(
    !parses("bookClub", noBook).success,
    "a book club entry without a book is accepted",
  )
})

await test("CONT-004", "Invalid metadata is rejected", async (check) => {
  const rejects = (collection, data, fragment) => {
    const result = parses(collection, data)
    check(!result.success, `accepted: ${json(data)}`)
    check(
      messages(result).some((m) => m.includes(fragment)),
      `${json(data)} gave ${json(messages(result))}, expected "${fragment}"`,
    )
  }
  rejects("berries", sample("berries", { title: "" }), "title")
  rejects("berries", sample("berries", { title: "   " }), "title")
  rejects(
    "berries",
    sample("berries", { description: undefined }),
    "needs a description",
  )
  rejects(
    "berries",
    sample("berries", { publishedAt: undefined }),
    "needs a publication date",
  )
  rejects(
    "berries",
    sample("berries", { status: "archived", description: undefined }),
    "archived entry needs a description",
  )
  for (const publishedAt of [
    "2026-02-30",
    "2026-13-01",
    "13/11/2026",
    "2026-1-5",
    "yesterday",
    "",
    new Date("2026-11-13T10:30:00Z"),
    new Date("invalid"),
  ])
    rejects("berries", sample("berries", { publishedAt }), "publishedAt")
  rejects(
    "berries",
    sample("berries", { updatedAt: "2026-01-01" }),
    "cannot come before",
  )
  for (const slug of [
    "Has Capitals",
    "has space",
    "under_score",
    "-lead",
    "trail-",
    "double--hyphen",
    "",
    "x".repeat(81),
    "café",
  ])
    rejects("berries", sample("berries", { slug }), "slug")
  rejects("berries", sample("berries", { status: "unpublished" }), "status")
  rejects("berries", sample("berries", { tags: ["Not A Tag"] }), "tags")
  check(
    isCalendarDate("2028-02-29") && !isCalendarDate("2026-02-29"),
    "leap days are wrong",
  )
})

await test("CONT-005", "Two entries cannot share a public URL", async (check) => {
  check(collectionIssues([]).length === 0, "no records reported problems")
  const clash = collectionIssues([
    record("berries", "one", { slug: "same" }),
    record("berries", "two", { slug: "same", status: "draft" }),
  ])
  check(
    clash.length === 1 && clash[0].includes('share the slug "same"'),
    `a shared slug gave ${json(clash)}`,
  )
  // Drafts count: publishing a draft must never create a clash.
  check(
    collectionIssues([
      record("berries", "a", { slug: "a" }),
      record("berries", "b", { slug: "b" }),
      record("greenhouse", "a", { slug: "a" }),
    ]).length === 0,
    "the same slug in two collections is reported (their prefixes differ)",
  )
  const sequence = collectionIssues([
    record("kosmos", "one", { workId: "w", chapterNumber: 1 }),
    record("kosmos", "two", { workId: "w", chapterNumber: 1 }),
    record("kosmos", "three", { workId: "w", position: 4 }),
    record("kosmos", "four", { workId: "w", position: 4 }),
    record("kosmos", "five", { workId: "other", chapterNumber: 1 }),
    record("trail", "t1", { seriesId: "s", position: 1 }),
    record("trail", "t2", { seriesId: "s", position: 1 }),
  ])
  check(sequence.length === 3, `places gave ${json(sequence)}`)
  // Every collection's routes are distinct paths.
  const routes = contentRoutes(COLLECTION_IDS.map((c) => record(c, "x", { slug: "x" })))
  check(
    new Set(routes.map((r) => r.path)).size === 8,
    "eight collections gave fewer than eight paths",
  )
})

await test(
  "CONT-006",
  "Public routes do not depend on titles or file names",
  async (check) => {
    const base = record("berries", "chromatin-architecture", { slug: "chromatin" })
    check(
      publicPath(base) === "/lecture-notes/berries/chromatin/",
      `path ${publicPath(base)}`,
    )
    const retitled = {
      ...base,
      data: { ...base.data, title: "A completely different title" },
    }
    const renamed = { ...base, id: "renamed-file" }
    check(
      publicPath(retitled) === publicPath(base),
      "changing the title moved the page",
    )
    check(
      publicPath(renamed) === publicPath(base),
      "changing the file name moved the page",
    )
    const reslugged = { ...base, data: { ...base.data, slug: "chromatin-2" } }
    check(
      publicPath(reslugged) === "/lecture-notes/berries/chromatin-2/",
      "the slug does not decide the path",
    )
    const drafted = { ...base, data: { ...base.data, status: "draft" } }
    check(publicPath(drafted) === publicPath(base), "the status changes the address")
  },
)

await test("CONT-007", "Draft entries have no page", async (check) => {
  const records = [
    record("berries", "d", { slug: "d", status: "draft" }),
    record("blog", "d", { slug: "d", status: "draft" }),
  ]
  check(contentRoutes(records).length === 0, "a production build routes a draft")
  check(json(contentRoutes(records, {})) === "[]", "default options route a draft")
  check(
    contentRoutes(records, { drafts: false }).length === 0,
    "drafts: false routes a draft",
  )
  check(indexItems("berries", records).length === 0, "an index lists a draft")
  // Only the local dev server previews drafts, and still never lists them.
  const preview = contentRoutes(records, { drafts: true })
  check(
    preview.length === 2,
    `the dev preview routes ${preview.length} drafts, expected 2`,
  )
  check(indexItems("berries", records).length === 0, "an index lists a previewed draft")
  const mixed = [
    record("berries", "p", { slug: "p" }),
    record("berries", "d", { slug: "d", status: "draft" }),
  ]
  check(
    json(contentRoutes(mixed).map((r) => r.path)) ===
      json(["/lecture-notes/berries/p/"]),
    "a draft is routed beside a published entry",
  )
})

await test("CONT-008", "Published entries declare their routes", async (check) => {
  const routes = contentRoutes([
    record("berries", "p", { slug: "p", title: "Title P" }),
  ])
  check(
    json(routes) ===
      json([
        {
          path: "/lecture-notes/berries/p/",
          owner: "lecture-notes-berries",
          title: "Title P",
        },
      ]),
    `routes are ${json(routes)}`,
  )
  const many = contentRoutes([
    record("kosmos", "z", { slug: "z" }),
    record("blog", "a", { slug: "a" }),
    record("berries", "m", { slug: "m" }),
  ])
  check(
    json(many.map((r) => r.path)) ===
      json(["/blog/a/", "/lecture-notes/berries/m/", "/writing/kosmos/z/"]),
    "routes are not in path order",
  )
  check(
    !createNavigation(SECTIONS, many).contentRoutes.has("/blog/b/"),
    "an unregistered route resolves",
  )
  check(
    createNavigation(SECTIONS, many).contentRoutes.size === 3,
    "the navigation lost a route",
  )
})

await test("CONT-009", "Archived entries keep their routes", async (check) => {
  const records = [record("berries", "old", { slug: "old", status: "archived" })]
  check(
    json(contentRoutes(records).map((r) => r.path)) ===
      json(["/lecture-notes/berries/old/"]),
    "an archived entry has no route",
  )
  const items = indexItems("berries", records)
  check(
    items.length === 1 && items[0].status === "archived",
    "an archived entry is not listed, marked archived",
  )
  check(
    items[0].path === "/lecture-notes/berries/old/",
    "its index link is not its route",
  )
})

await test(
  "CONT-010",
  "Every entry belongs to the folder that owns its collection",
  async (check) => {
    for (const collection of COLLECTIONS) {
      const entry = record(collection.id, "e", { slug: "e" })
      const routes = contentRoutes([entry])
      const navigation = createNavigation(SECTIONS, routes)
      const resolved = navigation.resolve(routes[0].path)
      check(resolved.found, `${routes[0].path} does not resolve`)
      if (!resolved.found) continue
      const { state } = resolved
      check(
        routes[0].owner === collection.owner,
        `${collection.id}'s route is owned by ${routes[0].owner}`,
      )
      check(
        state.page.kind === "content",
        `${collection.id}: the page is a ${state.page.kind} page`,
      )
      check(
        state.folder.id === collection.owner,
        `${collection.id} opens ${state.folder.id}`,
      )
      check(
        json(state.selection.map((n) => n.id)) ===
          json(navigation.lineage(collection.owner).map((n) => n.id)),
        `${collection.id}: the selected folders are ${json(state.selection.map((n) => n.id))}`,
      )
      check(state.currentTabId === null, `${collection.id}: a tab stands for an entry`)
    }
    // Ownership is declared, never inferred from the URL: a route whose owner is another
    // folder is refused.
    let refused = false
    try {
      createNavigation(SECTIONS, [
        { path: "/lecture-notes/berries/x/", owner: "lecture-notes-greenhouse" },
      ])
    } catch (error) {
      refused = error instanceof NavigationConfigError
    }
    check(refused, "a route owned by a folder that does not contain it is accepted")
  },
)

await test(
  "CONT-011",
  "Entries inherit their section's archive category",
  async (check) => {
    const expected = {
      blog: ["blog-notes", "core"],
      trail: ["blog-notes", "technical"],
      greenhouse: ["blog-notes", "technical"],
      berries: ["blog-notes", "technical"],
      timberLogs: ["blog-notes", "technical"],
      monthsOriginal: ["writing", "literary"],
      kosmos: ["writing", "literary"],
      bookClub: ["writing", "literary"],
    }
    for (const collection of COLLECTIONS) {
      const routes = contentRoutes([record(collection.id, "e", { slug: "e" })])
      const state = createNavigation(SECTIONS, routes).resolve(routes[0].path).state
      const [category, environment] = expected[collection.id]
      check(
        state.category === category,
        `${collection.id}: category ${state.category}, expected ${category}`,
      )
      check(
        state.environment === environment,
        `${collection.id}: environment ${state.environment}, expected ${environment}`,
      )
      check(
        collectionCategory(collection) === category,
        `${collection.id}'s category is ${collectionCategory(collection)}`,
      )
    }
    for (const collection of COLLECTIONS)
      check(
        !["core", "research", "bearnard"].includes(collectionCategory(collection)),
        `${collection.id} is in ${collectionCategory(collection)}`,
      )
  },
)

await test("CONT-012", "An entry adds no fourth row of tabs", async (check) => {
  for (const collection of COLLECTIONS) {
    const routes = contentRoutes([record(collection.id, "e", { slug: "e" })])
    const { state } = createNavigation(SECTIONS, routes).resolve(routes[0].path)
    const owner = siteNavigation.node(collection.owner)
    check(state.rows.length <= 3, `${collection.id}: ${state.rows.length} rows`)
    check(
      state.rows.length === owner.level,
      `${collection.id}: ${state.rows.length} rows for a level-${owner.level} folder`,
    )
    check(
      state.rows.every((row) =>
        row.tabs.every(
          (tab) => tab.kind === "overview" || siteNavigation.nodes.has(tab.id),
        ),
      ),
      `${collection.id}: a row holds a tab that is no folder`,
    )
  }
  // The entry registers as a route, never as a node: the folder count does not move.
  const routes = contentRoutes([record("berries", "e", { slug: "e" })])
  check(
    createNavigation(SECTIONS, routes).nodes.size === siteNavigation.nodes.size,
    "an entry became a folder",
  )
})

await test("CONT-013", "Unregistered paths are not pages", async (check) => {
  const records = [
    record("berries", "p", { slug: "p" }),
    record("berries", "d", { slug: "d", status: "draft" }),
  ]
  const navigation = createNavigation(SECTIONS, contentRoutes(records))
  for (const path of [
    "/lecture-notes/berries/unknown/",
    "/lecture-notes/berries/d/",
    "/lecture-notes/greenhouse/p/",
    "/blog/p/",
    "/lecture-notes/berries/p/extra/",
    "/lecture-notes/berries/P/",
    "/external/",
  ])
    check(!navigation.resolve(path).found, `${path} resolves`)
  check(
    navigation.resolve("/lecture-notes/berries/p/").found,
    "the published entry does not resolve",
  )
  check(
    navigation.resolve("/lecture-notes/berries/").found,
    "the folder's own page does not resolve",
  )
})

await test("CONT-014", "Indexes list in a stable order", async (check) => {
  const permutations = (items) => [
    items,
    [...items].reverse(),
    [...items.slice(2), ...items.slice(0, 2)],
  ]
  const order = (collection, records) =>
    sortRecords(collection, records).map((r) => r.id)
  const stable = (collection, records, expected) => {
    for (const input of permutations(records))
      check(
        json(order(collection, input)) === json(expected),
        `${collection}: ${json(order(collection, input))}, expected ${json(expected)}`,
      )
  }
  stable(
    "blog",
    [
      record("blog", "old", { slug: "old", publishedAt: "2026-01-01" }),
      record("blog", "new-b", { slug: "b", publishedAt: "2026-03-01" }),
      record("blog", "new-a", { slug: "a", publishedAt: "2026-03-01" }),
      record("blog", "mid", { slug: "mid", publishedAt: "2026-02-01" }),
    ],
    ["new-a", "new-b", "mid", "old"],
  )
  stable(
    "timberLogs",
    [
      record("timberLogs", "march", {
        slug: "march",
        period: "2026-03",
        publishedAt: "2026-04-02",
      }),
      record("timberLogs", "april", {
        slug: "april",
        period: "2026-04",
        publishedAt: "2026-05-01",
      }),
      record("timberLogs", "march-late", {
        slug: "march-late",
        period: "2026-03",
        publishedAt: "2026-04-09",
      }),
      record("timberLogs", "jan", {
        slug: "jan",
        period: "2026-01",
        publishedAt: "2026-02-01",
      }),
    ],
    ["april", "march-late", "march", "jan"],
  )
  stable(
    "trail",
    [
      record("trail", "loose", { slug: "loose", publishedAt: "2026-06-01" }),
      record("trail", "s2-2", { slug: "s2-2", seriesId: "beta", position: 2 }),
      record("trail", "s1-2", { slug: "s1-2", seriesId: "alpha", position: 2 }),
      record("trail", "s1-1", { slug: "s1-1", seriesId: "alpha", position: 1 }),
    ],
    ["s1-1", "s1-2", "s2-2", "loose"],
  )
  stable(
    "kosmos",
    [
      record("kosmos", "w2-c1", { slug: "w2-c1", workId: "bw", chapterNumber: 1 }),
      record("kosmos", "w1-c2", { slug: "w1-c2", workId: "aw", chapterNumber: 2 }),
      record("kosmos", "w1", { slug: "w1", workId: "aw" }),
      record("kosmos", "w1-c1", { slug: "w1-c1", workId: "aw", chapterNumber: 1 }),
    ],
    ["w1", "w1-c1", "w1-c2", "w2-c1"],
  )
  stable(
    "bookClub",
    [
      record("bookClub", "march", {
        slug: "march",
        bookTitle: "B",
        sessionDate: "2026-03-14",
      }),
      record("bookClub", "april", {
        slug: "april",
        bookTitle: "B",
        sessionDate: "2026-04-11",
      }),
      record("bookClub", "undated", {
        slug: "undated",
        bookTitle: "B",
        publishedAt: "2026-01-01",
      }),
      record("bookClub", "february", {
        slug: "february",
        bookTitle: "B",
        sessionDate: "2026-02-08",
      }),
    ],
    ["april", "march", "february", "undated"],
  )
  // Ordering depends on no time zone and no locale.
  check(
    formatWhen("2026-11-03") === "3 November 2026",
    `date ${formatWhen("2026-11-03")}`,
  )
  check(formatWhen("2026-12") === "December 2026", `period ${formatWhen("2026-12")}`)
  // An index lists the same entries, in the same order, whatever the loading order.
  const items = [
    record("greenhouse", "x", { slug: "x", publishedAt: "2026-02-01" }),
    record("greenhouse", "y", { slug: "y", publishedAt: "2026-03-01" }),
    record("greenhouse", "z", {
      slug: "z",
      publishedAt: "2026-01-01",
      status: "draft",
    }),
  ]
  check(
    json(indexItems("greenhouse", items).map((i) => i.id)) === json(["y", "x"]),
    "index order or drafts",
  )
  check(
    json(indexItems("greenhouse", [...items].reverse())) ===
      json(indexItems("greenhouse", items)),
    "index depends on input order",
  )
  check(
    json(
      indexItems("greenhouse", [
        record("greenhouse", "b", { slug: "b" }),
        record("berries", "a", { slug: "a" }),
      ]).map((i) => i.id),
    ) === json(["b"]),
    "an index lists another collection's entry",
  )
})

await test("CONT-015", "Empty collections are fine", async (check) => {
  check(contentRoutes([]).length === 0, "no routes expected")
  check(collectionIssues([]).length === 0, "no issues expected")
  for (const id of COLLECTION_IDS) {
    check(
      json(indexItems(id, [])) === "[]",
      `${id}: an empty index is ${json(indexItems(id, []))}`,
    )
    check(json(sortRecords(id, [])) === "[]", `${id}: empty sort`)
  }
  const navigation = createNavigation(SECTIONS, contentRoutes([]))
  check(navigation.contentRoutes.size === 0, "the navigation has routes from nothing")
  check(
    navigation.nodes.size === siteNavigation.nodes.size,
    "an empty site lost folders",
  )
})

await test(
  "CONT-017",
  "Entry routes never collide with folder routes",
  async (check) => {
    // Real registry: a slug cannot be empty, so no route reaches an owner's own path.
    check(
      !parses("berries", sample("berries", { slug: "" })).success,
      "an empty slug is accepted",
    )
    for (const collection of COLLECTIONS) {
      const path = publicPath(record(collection.id, "e", { slug: "e" }))
      check(
        path !== collectionPrefix(collection),
        `${collection.id}'s entry reaches its folder's path`,
      )
      check(
        ![...siteNavigation.nodes.values()].some((n) => n.path === path),
        `${path} is a folder`,
      )
    }
    // A folder that is registered later wins: the build fails instead of picking one.
    const withFolder = SECTIONS.map((section) =>
      section.id !== "lecture-notes"
        ? section
        : {
            ...section,
            children: section.children.map((child) =>
              child.id !== "lecture-notes-berries"
                ? child
                : {
                    ...child,
                    children: [
                      {
                        id: "berries-chromatin",
                        label: "Chromatin",
                        slug: "chromatin",
                      },
                    ],
                  },
            ),
          },
    )
    let message = ""
    try {
      createNavigation(
        withFolder,
        contentRoutes([record("berries", "c", { slug: "chromatin" })]),
      )
    } catch (error) {
      message = error instanceof NavigationConfigError ? error.message : String(error)
    }
    check(
      message.includes("duplicates the folder"),
      `a collision gave: ${message || "no error"}`,
    )
  },
)

await test(
  "CONT-019",
  "Synthetic fixtures never enter the content directories",
  async (check) => {
    for (const directory of Object.values(DIRECTORIES)) {
      const files = await readdir(join(repo, "src/content", directory), {
        recursive: true,
      })
      for (const file of files.filter((f) => f.endsWith(".md"))) {
        const text = await readFile(join(repo, "src/content", directory, file), "utf8")
        check(
          !/SYNTHETIC FIXTURE/.test(text),
          `src/content/${directory}/${file} is a fixture`,
        )
      }
    }
    const fixtures = await readdir(join(repo, "tests/fixtures/editorial"))
    check(fixtures.includes("good"), "the fixtures are missing")
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
  `PASS: ${results.length} editorial model checks; ${COLLECTIONS.length} collections`,
)
