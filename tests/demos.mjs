// The demonstrations (P13-A01, D-105): P13A-010 to P13A-015, P13A-017 to P13A-024, P13A-027. They read
// the repository, the release build (dist/) and a throwaway demonstration build (astro build
// --mode demo, into a temporary folder), so dist/ and dist-demo/ are never written. They need no
// Quarto and no Python: the demonstrations' articles are committed, generated files.
// P13A-029 and P13A-030 are tests/demo-browser.mjs; P13A-008 and P13A-016 are tests/demo-execute.mjs.
//
// What they show: three real Greenhouse entries exist, are built by the real editorial components
// under the real folders, carry a visible "synthetic" label, and have no trace in a release build,
// whatever the environment holds. What they do not show: how a reader sees them (browser tests).
//
// Run `npm run build` first (or `npm run verify`).
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises"
import { existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import {
  collectionById,
  collectionPrefix,
  COLLECTION_IDS,
} from "../src/editorial/collections.ts"
import { routableRecords } from "../src/editorial/model.ts"
import { schemaFor } from "../src/editorial/schema.ts"
import { siteNavigation } from "../src/navigation/index.ts"
import {
  demonstrations,
  publicBuildIssues,
  releaseEnvironment,
} from "../scripts/demo-check.mjs"
import {
  elements,
  hasClass,
  layersOf,
  labelOf,
  parse,
  selectedOf,
} from "./html-tree.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const dist = join(repo, "dist")
const read = (path) => readFile(join(repo, path), "utf8")
const json = (value) => JSON.stringify(value)
const P13 = "92fdcdc"
const P12 = "5b127f5"
const PREFIX = collectionPrefix(collectionById("greenhouse"))
const SLUGS = {
  markdown: "demo-scientific-markdown",
  quarto: "demo-synthetic-signals",
  comparison: "demo-markdown-and-quarto",
}
const TITLES = {
  markdown: "A Small Guide to Scientific Markdown",
  quarto: "From Synthetic Signals to Reproducible Results",
  comparison: "One Archive, Two Authoring Formats",
}

if (!existsSync(join(dist, "index.html"))) {
  console.error("NOT RUN: dist/ is not built; run `npm run build`")
  process.exit(2)
}

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
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await listFiles(path)))
    else out.push(path)
  }
  return out.sort()
}
async function treeHash(dir) {
  const hash = createHash("sha256")
  for (const file of await listFiles(dir))
    hash.update(relative(dir, file) + "\0").update(await readFile(file))
  return hash.digest("hex")
}
const git = (...args) => spawnSync("git", args, { cwd: repo, encoding: "utf8" })

function build(mode, outDir, env = {}, whole = false) {
  return spawnSync("npx", ["astro", "build", "--mode", mode, "--outDir", outDir], {
    cwd: repo,
    encoding: "utf8",
    env: whole ? env : { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", ...env },
  })
}

// One throwaway demonstration build, and one release build under a hostile environment.
const holder = await mkdtemp(join(tmpdir(), "gusmaolab-demos-"))
const demoOut = join(holder, "demo")
const hostileOut = join(holder, "hostile")
const distBefore = await treeHash(dist)
const demoBuild = build("demo", demoOut)
// What a shell may leave behind, passed through the cleaning the release build does ...
const HOSTILE = {
  MODE: "demo",
  NODE_ENV: "development",
  ASTRO_MODE: "demo",
  GUSMAOLAB_DEMOS: "1",
}
const hostile = build(
  "production",
  hostileOut,
  releaseEnvironment({ ...process.env, ...HOSTILE }),
  true,
)
// ... NODE_ENV alone, without any cleaning (the mode, not NODE_ENV, decides) ...
const devEnvOut = join(holder, "dev-env")
const devEnv = build("production", devEnvOut, { NODE_ENV: "development" })
// ... and the one variable that does override the mode, without cleaning: the output search must
// catch it, which is its whole purpose.
const leakOut = join(holder, "leak")
const leak = build("production", leakOut, { MODE: "demo" })
const page = async (root, slug) => {
  const file = join(root, PREFIX, slug, "index.html")
  return existsSync(file) ? readFile(file, "utf8") : undefined
}
const overviewOf = (root) => readFile(join(root, PREFIX, "index.html"), "utf8")
const hrefs = (html) => [...html.matchAll(/<a\s[^>]*href="([^"]+)"/g)].map((m) => m[1])
const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))

await test("P13A-010", "The three Greenhouse demonstrations exist", async (check) => {
  check(
    demoBuild.status === 0,
    `the demonstration build failed: ${demoBuild.stderr.slice(-400)}`,
  )
  const found = await demonstrations(repo)
  check(
    json(found.map((d) => d.slug).sort()) === json(Object.values(SLUGS).sort()),
    `demonstrations: ${json(found.map((d) => d.slug))}`,
  )
  for (const [key, slug] of Object.entries(SLUGS)) {
    const demo = found.find((d) => d.slug === slug)
    check(demo?.title === TITLES[key], `${slug}: title is "${demo?.title}"`)
    const html = await page(demoOut, slug)
    check(
      html !== undefined,
      `${PREFIX}${slug}/ has no page in the demonstration build`,
    )
    check(
      html?.includes(`<h1 class="ed__title">${TITLES[key]}</h1>`),
      `${slug}: the title is not the page's h1`,
    )
  }
  // Source formats: Markdown, Quarto, Markdown.
  check(
    existsSync(join(repo, "src/demos/greenhouse/demo-scientific-markdown.md")),
    "no Markdown source for demonstration 1",
  )
  check(
    existsSync(join(repo, "science/demo/demo-synthetic-signals.qmd")),
    "no Quarto source for demonstration 2",
  )
  check(
    existsSync(join(repo, "src/demos/greenhouse/demo-markdown-and-quarto.md")),
    "no source for demonstration 3",
  )
  check(
    (await read("src/demos/greenhouse/demo-synthetic-signals.md")).includes(
      "GENERATED from science/demo/demo-synthetic-signals.qmd",
    ),
    "the Quarto entry is not generated from its source",
  )
  // `synthetic: true` is required in a demonstration, and impossible anywhere else.
  const base = { title: "T", status: "draft", slug: "t" }
  check(
    !schemaFor("greenhouse", { synthetic: true }).safeParse(base).success,
    "a demonstration without `synthetic` was accepted",
  )
  check(
    schemaFor("greenhouse", { synthetic: true }).safeParse({ ...base, synthetic: true })
      .success,
    "a valid demonstration was rejected",
  )
  for (const id of COLLECTION_IDS)
    check(
      !schemaFor(id).safeParse({ ...base, synthetic: true }).success,
      `${id} accepts \`synthetic\`: a real entry could claim to be a demonstration`,
    )
})

await test(
  "P13A-011",
  "The demonstrations use the real editorial components",
  async (check) => {
    for (const slug of Object.values(SLUGS)) {
      const html = (await page(demoOut, slug)) ?? ""
      check(
        /<article class="ed ed--greenhouse"[^>]*data-editorial-layout="greenhouse"/.test(
          html,
        ),
        `${slug}: not the Greenhouse article shell`,
      )
      check(html.includes("data-editorial-body"), `${slug}: no editorial body`)
      check(
        html.includes('data-editorial-status="published"'),
        `${slug}: not an ordinary published entry`,
      )
      check(
        /class="ed__toc|aria-label="Contents"|data-editorial-toc/.test(html),
        `${slug}: no contents list`,
      )
      check(
        layersOf(parse(html)).layers.length >= 2,
        `${slug}: not drawn inside the folders`,
      )
    }
    const sources = (await listFiles(join(repo, "src/demos"))).map((f) =>
      relative(repo, f),
    )
    check(
      sources.every((f) =>
        /^src\/demos\/(?:greenhouse\/[^/]+\.md|greenhouse\/\.gitkeep|science\/[^/]+\.html|assets\/[^/]+\/[^/]+\.svg|downloads\/[^/]+\.(?:txt|csv))$/.test(
          f,
        ),
      ),
      `src/demos holds something other than entries, fragments, figures and the P18 download fixtures: ${json(sources)}`,
    )
    const pages = (await listFiles(join(repo, "src/pages"))).map((f) =>
      relative(repo, f),
    )
    check(
      pages.filter((f) => /demo/i.test(f)).join() ===
        // The figures' route, and P18's route for the synthetic download fixtures (D-127).
        "src/pages/demo-assets/[name]/[file].svg.ts,src/pages/demo-downloads/[file].ts",
      `a page of its own for a demonstration: ${json(pages.filter((f) => /demo/i.test(f)))}`,
    )
    const site = await read("src/editorial/site.ts")
    check(
      /getCollection\("greenhouseDemos"\)/.test(site),
      "the demonstrations are not loaded as a collection",
    )
  },
)

await test("P13A-012", "They have canonical Greenhouse ownership", async (check) => {
  const greenhouse = siteNavigation.node("lecture-notes-greenhouse")
  check(
    PREFIX === greenhouse.path,
    `prefix ${PREFIX} is not the Greenhouse's ${greenhouse.path}`,
  )
  for (const slug of Object.values(SLUGS)) {
    const html = (await page(demoOut, slug)) ?? ""
    const { layers } = layersOf(parse(html))
    check(layers.length <= 3, `${slug}: ${layers.length} rows of tabs`)
    check(
      json(selectedOf(layers[0]).map(labelOf)) === json(["Lecture Notes"]),
      `${slug}: top row ${json(selectedOf(layers[0]).map(labelOf))}`,
    )
    check(
      json(selectedOf(layers[1]).map(labelOf)) === json(["The Greenhouse"]),
      `${slug}: second row ${json(selectedOf(layers[1]).map(labelOf))}`,
    )
    check(
      /data-category="research"|data-category="[a-z-]+"/.test(html),
      `${slug}: no category`,
    )
    const overview = await overviewOf(demoOut)
    check(
      /data-category="([a-z-]+)"/.exec(html)?.[1] ===
        /data-category="([a-z-]+)"/.exec(overview)?.[1],
      `${slug}: its category is not the Greenhouse's`,
    )
  }
  check(
    !existsSync(join(demoOut, "demo-synthetic-signals")),
    "a demonstration was built outside its folder",
  )
})

await test(
  "P13A-013",
  "The Greenhouse Overview links to all three demonstrations",
  async (check) => {
    const overview = await overviewOf(demoOut)
    const section =
      /<div data-demo-section[^>]*>([\s\S]*?)<\/section>(?:<p[^>]*data-workbench-link[^>]*>[\s\S]*?<\/p>)?<\/div>/.exec(
        overview,
      )?.[1] ??
      ""
    check(
      section.includes("Development Demonstrations"),
      "no Development Demonstrations heading",
    )
    check(
      section.includes("synthetic and not part of the public research archive"),
      "the explanation is missing",
    )
    for (const slug of Object.values(SLUGS))
      check(
        hrefs(section).includes(`${PREFIX}${slug}/`),
        `the Overview section does not link to ${slug}`,
      )
    check(
      hrefs(section).filter((h) => h.startsWith(PREFIX)).length === 3,
      "the section links to something besides the three",
    )
    // The real list is untouched: still an honest empty state, above the demonstrations.
    check(
      overview.indexOf("data-editorial-empty") !== -1 &&
        overview.indexOf("data-editorial-empty") <
          overview.indexOf("data-demo-section"),
      "the real, empty list is not shown above the demonstrations",
    )
    const ids = [...overview.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
    check(new Set(ids).size === ids.length, "duplicate IDs on the Overview")
    check(
      ids.includes("ed-index-label-demo"),
      "the demonstrations heading has no ID of its own",
    )
  },
)

await test(
  "P13A-014",
  "The Quarto demonstration's figure, table and equation references work",
  async (check) => {
    const html = (await page(demoOut, SLUGS.quarto)) ?? ""
    const ids = idsOf(html)
    const xrefs = [...html.matchAll(/<a\s[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => /class="[^"]*quarto-xref/.test(tag))
      .map((tag) => /href="#([^"]+)"/.exec(tag)?.[1])
      .filter(Boolean)
    check(xrefs.length >= 8, `${xrefs.length} cross-references`)
    for (const target of new Set(xrefs))
      check(ids.has(target), `the reference #${target} has no target`)
    for (const needed of ["eq-model", "eq-snr", "fig-signals", "tbl-stats"])
      check(
        xrefs.includes(needed) && ids.has(needed),
        `no working reference to ${needed}`,
      )
    check(
      /Figure(?:\s|&nbsp;)+1\b/.test(html) && /Table(?:\s|&nbsp;)+1\b/.test(html),
      "the figure and the table are not numbered",
    )
    check(
      /\(1\)/.test(html) && /\(2\)/.test(html),
      "the equations are not numbered (1) and (2)",
    )
    const source = await read("science/demo/demo-synthetic-signals.qmd")
    check(
      !/\b(?:Figure|Table|Equation)\s+\d/.test(source),
      "the source types a figure, table or equation number by hand",
    )
    const img = /<img[^>]*\ssrc="(\/demo-assets\/[^"]+)"[^>]*>/.exec(html)
    check(img !== null, "no figure")
    check(
      img !== null && existsSync(join(demoOut, img[1])),
      `the figure ${img?.[1]} is not in the build`,
    )
    check(/<img[^>]*\salt="[^"]{20,}"/.test(html), "the figure has no real alt text")
    check(html.includes("<math"), "no mathematics")
    check(
      html.includes("callout-warning") &&
        html.includes("callout-note") &&
        html.includes("callout-tip"),
      "callouts are missing",
    )
    check(/<pre[^>]*>[\s\S]*SEED/.test(html), "no code is shown")
    check(/class="cell-output|cell-output/.test(html), "no executed output is shown")
    check(/footnotes/.test(html) && /fnref1|fn1/.test(html), "no footnote")
    const tableAt = /<table/.exec(html)?.index ?? -1
    check(tableAt > -1, "no table")
  },
)

await test("P13A-015", "The demonstration's citations resolve", async (check) => {
  const html = (await page(demoOut, SLUGS.quarto)) ?? ""
  const ids = idsOf(html)
  const cites = [...html.matchAll(/href="#(ref-[^"]+)"/g)].map((m) => m[1])
  check(cites.length >= 2, `${cites.length} citations`)
  for (const target of cites)
    check(ids.has(target), `the citation #${target} has no entry in the bibliography`)
  const entries = html.match(/class="csl-entry"/g) ?? []
  check(entries.length === 2, `${entries.length} bibliography entries`)
  const plain = html.replace(/<[^>]+>/g, "")
  check(
    /Reproducible research in computational science/i.test(plain) &&
      /Ten simple rules for reproducible computational research/i.test(plain),
    "the bibliography does not list the two works",
  )
  check(
    !/\?@|\[\?\]|@peng2011|@sandve2013/.test(html),
    "an unresolved citation key is visible",
  )
  const bib = await read("science/demo/demo-synthetic-signals.bib")
  check(
    bib.includes("peng2011") && bib.includes("sandve2013"),
    "the bibliography fixture lost its entries",
  )
})

await test("P13A-017", "Each demonstration says it is synthetic", async (check) => {
  for (const slug of Object.values(SLUGS)) {
    const html = (await page(demoOut, slug)) ?? ""
    const notice = /<p[^>]*data-demo-notice[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? ""
    check(
      notice.includes("Development demonstration — synthetic content"),
      `${slug}: notice is "${notice.slice(0, 60)}"`,
    )
    check(/role="note"/.test(html), `${slug}: the notice has no role`)
  }
  const css =
    (await readFile(join(repo, "src/styles/editorial.css"), "utf8")) +
    (await read("src/styles/tokens.css"))
  check(
    !/#[0-9a-fA-F]{3,8}\b/.test(
      /\.ed-index__intro[\s\S]*?\.ed-index__list/.exec(css)?.[0] ?? "",
    ),
    "the demonstration styles use a raw colour",
  )
  const article = await read("src/components/editorial/EditorialArticle.astro")
  check(
    /data\.synthetic === true/.test(article),
    "the notice does not depend on the entry's own `synthetic` field",
  )
})

await test("P13A-018", "A release build holds no demonstration", async (check) => {
  check(!existsSync(join(dist, "demo-assets")), "dist/demo-assets exists")
  for (const slug of Object.values(SLUGS))
    check(!existsSync(join(dist, PREFIX, slug)), `dist${PREFIX}${slug}/ exists`)
  const issues = await publicBuildIssues(dist, repo)
  check(issues.length === 0, `traces in dist/: ${issues.slice(0, 6).join("; ")}`)
  // A release made in the environment a shell may leave behind is clean too, once cleaned the way
  // `npm run build` cleans it; NODE_ENV=development alone is not enough to switch demonstrations on.
  check(hostile.status === 0, `the hostile build failed: ${hostile.stderr.slice(-300)}`)
  const again = await publicBuildIssues(hostileOut, repo)
  check(
    again.length === 0,
    `a stale environment switched demonstrations on: ${again.slice(0, 4).join("; ")}`,
  )
  check(devEnv.status === 0, `the NODE_ENV build failed: ${devEnv.stderr.slice(-300)}`)
  const devIssues = await publicBuildIssues(devEnvOut, repo)
  check(
    devIssues.length === 0,
    `NODE_ENV=development switched demonstrations on: ${devIssues.slice(0, 4).join("; ")}`,
  )
  // The variable that does override the mode is the proof that the output search is needed: an
  // uncleaned build with it leaks, and the search says so.
  check(leak.status === 0, "the leak build failed")
  check(
    (await publicBuildIssues(leakOut, repo)).length > 0,
    "a leaking release build was not detected",
  )
  const cleaned = releaseEnvironment({
    MODE: "demo",
    ASTRO_MODE: "demo",
    NODE_ENV: "development",
  })
  check(
    cleaned.MODE === undefined &&
      cleaned.ASTRO_MODE === undefined &&
      cleaned.NODE_ENV === "production",
    "releaseEnvironment does not clean the environment",
  )
  const script = JSON.parse(await read("package.json")).scripts.build
  check(
    script === "node scripts/science.mjs verify && node scripts/public-build.mjs",
    `build is "${script}"`,
  )
  const guard = await read("scripts/public-build.mjs")
  check(
    /"--mode", "production"/.test(guard) && /publicBuildIssues/.test(guard),
    "the release build does not pass its mode or check its output",
  )
  // The checker really finds a trace: one planted in a copy is reported, not ignored.
  const planted = join(holder, "planted")
  const copy = await mkdtemp(planted)
  await rm(copy, { recursive: true, force: true })
  const fake = join(holder, "fake")
  spawnSync("cp", ["-R", dist, fake])
  await rm(join(fake, "index.html"), { force: true }).catch(() => {})
  spawnSync("sh", [
    "-c",
    `printf '<p data-demo-notice>${SLUGS.quarto}</p>' > "${fake}/index.html"`,
  ])
  check(
    (await publicBuildIssues(fake, repo)).length >= 2,
    "a planted demonstration marker was not reported",
  )
})

await test(
  "P13A-019",
  "The public indexes exclude the demonstrations",
  async (check) => {
    const overview = await readFile(join(dist, PREFIX, "index.html"), "utf8")
    check(
      overview.includes("data-editorial-empty"),
      "the real Greenhouse list is not the empty state",
    )
    check(
      !overview.includes("data-demo-section") &&
        !overview.includes("Development Demonstrations"),
      "the Overview has a demonstrations section",
    )
    const tree = parse(overview)
    const links = elements(tree)
      .filter((el) => el.tag === "a")
      .map((el) => el.attrs.href)
    for (const slug of Object.values(SLUGS))
      check(
        !links.some((h) => h.includes(slug)),
        `a link to ${slug} in the public Overview`,
      )
    // The folders' previews list a folder's children: no demonstration among them.
    for (const file of await listFiles(dist))
      if (file.endsWith(".html")) {
        const html = await readFile(file, "utf8")
        for (const title of Object.values(TITLES))
          if (html.includes(title))
            check(false, `${relative(dist, file)} names "${title}"`)
      }
    // Reading context: the demonstrations are never offered after a real entry (and the reverse).
    const site = await read("src/editorial/site.ts")
    check(
      /all\.filter\(\(candidate\) => candidate\.demo === demo\)/.test(site),
      "reading context mixes demonstrations and real entries",
    )
    check(
      /all\.filter\(\(record\) => !record\.demo\)/.test(site),
      "the public index is not filtered of demonstrations",
    )
  },
)

await test(
  "P13A-020",
  "No sitemap, feed, search index or JSON names a demonstration",
  async (check) => {
    const files = (await listFiles(dist)).filter((f) =>
      /\.(xml|json|txt|rss|atom|webmanifest|js)$/.test(f),
    )
    const demoFiles = (await listFiles(demoOut)).filter((f) =>
      /\.(xml|json|txt|rss|atom|webmanifest)$/.test(f),
    )
    // Whatever machine-readable files the release has, none names a demonstration. (None exists yet
    // for a sitemap or a feed; the scan is what will catch one when it does.)
    for (const file of files) {
      const text = await readFile(file, "utf8")
      for (const needle of [
        ...Object.values(SLUGS),
        ...Object.values(TITLES),
        "synthetic content",
      ])
        check(!text.includes(needle), `${relative(dist, file)} contains "${needle}"`)
    }
    check(
      demoFiles.length >= files.filter((f) => !f.endsWith(".js")).length,
      "the demonstration build lost a machine-readable file",
    )
    const manifest = JSON.parse(await read("src/science/manifest.json"))
    check(
      Object.keys(manifest.documents).includes("demo/demo-synthetic-signals"),
      "the manifest lost the demonstration",
    )
    const asset = join(dist, "assets/scientific")
    check(
      !existsSync(asset) || !(await listFiles(asset)).some((f) => f.includes("demo-")),
      "a demonstration's figure is in public assets",
    )
    check(
      !(await listFiles(join(repo, "public"))).some((f) => /demo-/.test(f)),
      "a demonstration's file is in public/",
    )
  },
)

await test(
  "P13A-021",
  "A demonstration build does not touch the release",
  async (check) => {
    check(
      (await treeHash(dist)) === distBefore,
      "building the demonstrations changed dist/",
    )
    const demoScript = await read("scripts/demo.mjs")
    check(
      /--outDir", DEMO_OUT/.test(demoScript) && /--mode", "demo"/.test(demoScript),
      "demo:build does not pass its own mode and folder",
    )
    const checker = await read("scripts/demo-check.mjs")
    check(
      /DEMO_OUT = "dist-demo"/.test(checker),
      "the demonstration folder is not dist-demo",
    )
    check(
      !/DEMO_OUT\s*=\s*"dist"/.test(checker),
      "the demonstration folder is the release folder",
    )
    const pkg = JSON.parse(await read("package.json")).scripts
    for (const name of ["demo:build", "demo:preview", "demo:verify"])
      check(typeof pkg[name] === "string", `no ${name} script`)
    check(
      !/dist-demo|demo/.test(pkg.build),
      "the release build mentions demonstrations",
    )
    check(
      (await read(".gitignore")).includes("/dist-demo/"),
      "dist-demo/ may be committed",
    )
    check(
      demoBuild.status === 0 && (await publicBuildIssues(demoOut, repo)).length > 0,
      "the demonstration build is indistinguishable from a release",
    )
    const verify = spawnSync(process.execPath, [join(repo, "scripts/demo-check.mjs")], {
      encoding: "utf8",
    })
    check(verify.status === 0, "demo-check.mjs does not load")
  },
)

await test("P13A-022", "The P12 editorial layouts are intact", async (check) => {
  const names = [
    "BerriesLayout",
    "BlogLayout",
    "BookClubLayout",
    "GreenhouseLayout",
    "KosmosLayout",
    "MonthsOriginalLayout",
    "TimberLogLayout",
    "TrailLayout",
  ].map((n) => `src/layouts/editorial/${n}.astro`)
  for (const file of [
    ...names,
    "src/layouts/editorial/layouts.ts",
    "src/editorial/reading.ts",
  ]) {
    const diff = git("diff", P12, "--", file).stdout
    check(diff.trim() === "", `${file} differs from the approved P12 commit`)
  }
  check(
    !/demo/i.test(await read("src/layouts/editorial/GreenhouseLayout.astro")),
    "the Greenhouse layout knows about demonstrations",
  )
})

await test("P13A-023", "P10 publication filtering is intact", async (check) => {
  const records = ["draft", "published", "archived"].map((status, i) => ({
    collection: "greenhouse",
    id: `x${i}`,
    data: { status, slug: `x${i}`, title: "t", tags: [] },
  }))
  check(
    json(routableRecords(records).map((r) => r.id)) === json(["x1", "x2"]),
    "a draft is routed in a build",
  )
  check(
    json(routableRecords(records, { drafts: true }).map((r) => r.id)) ===
      json(["x0", "x1", "x2"]),
    "drafts are not previewed",
  )
  const site = await read("src/editorial/site.ts")
  check(/drafts: import\.meta\.env\.DEV/.test(site), "drafts are no longer dev-only")
  const diff = git(
    "diff",
    P13,
    "--",
    "src/editorial/model.ts",
    "src/editorial/collections.ts",
  ).stdout
  check(diff.trim() === "", "the P10 routing rules or collection definitions changed")
  const demo = await read("src/editorial/demo.ts")
  check(
    /import\.meta\.env\.MODE === "development" \|\| import\.meta\.env\.MODE === "demo"/.test(
      demo,
    ),
    "demosEnabled is not exactly development or demo mode",
  )
  const readers = (await listFiles(join(repo, "src"))).filter(
    (f) =>
      /\.(ts|astro)$/.test(f) && /import\.meta\.env\.MODE/.test(readFileSyncSafe(f)),
  )
  // P19 (D-136): the nucleus specimen's client entry repeats the same condition, because a bundler
  // folds a comparison of constants but not a function call, and a release must not bundle the
  // specimen or the graphics engine. It is the only other reader.
  check(
    readers.map((f) => relative(repo, f)).join() ===
      "src/editorial/demo.ts,src/scripts/nucleus-specimen.ts",
    `another file reads the mode: ${json(readers.map((f) => relative(repo, f)))}`,
  )
  const guard = await read("src/scripts/nucleus-specimen.ts")
  check(
    /import\.meta\.env\.MODE === "development" \|\| import\.meta\.env\.MODE === "demo"/.test(guard),
    "the nucleus specimen's guard is not exactly development or demo mode",
  )
})

await test("P13A-024", "The P11 canonical records are intact", async (check) => {
  // P17 and P18 added two registries beside the records (the contact channels and the downloads,
  // D-126, D-127); they are not records, and everything else is as P13 left it. (Before they were
  // committed this diff ignored them, as untracked files; a committed tree shows them.)
  const diff = git(
    "diff",
    P13,
    "--",
    "src/data",
    "src/records",
    "src/cv",
    ":(exclude)src/data/contact.ts",
    ":(exclude)src/data/downloads.ts",
    // P21 (D-145) added a third registry beside the records, the scheduling configuration. P21 missed this
    // guard because its files were untracked while it ran (a diff ignores them); P22's baseline found it.
    ":(exclude)src/data/scheduling.ts",
  ).stdout
  check(diff.trim() === "", "records, the record model or the CV adapter changed")
  check(
    !/demo/i.test(await read("src/records/index.ts")),
    "records know about demonstrations",
  )
})

await test("P13A-027", "The physical folders are intact", async (check) => {
  const diff = git(
    "diff",
    P13,
    "--",
    "src/components/folders",
    "src/styles/folders.css",
    "src/layouts/FolderPage.astro",
    "src/navigation",
    "src/styles/view-transitions.css",
    // The two folder scripts, not the folder: P16 added the world clocks' script beside them (D-118).
    "src/scripts/folder-previews.ts",
    "src/scripts/folder-rows.ts",
  ).stdout
  check(diff.trim() === "", "the folders, their styles, navigation or scripts changed")
  const registry = await read("src/navigation/registry.ts")
  check(!/demo/i.test(registry), "the navigation registry names a demonstration")
  const overview = await overviewOf(demoOut)
  const { layers } = layersOf(parse(overview))
  check(
    layers.length === 2 || layers.length === 3,
    `${layers.length} rows on the Overview`,
  )
  check(
    json(selectedOf(layers[1]).map(labelOf)) === json(["The Greenhouse"]),
    "the open folder is not the Greenhouse",
  )
  // No demonstration became a tab, and the tab rows hold the same tabs as without demonstrations.
  const tabs = (html) =>
    elements(parse(html))
      .filter(hasClass("gl-folder-tab"))
      .map((t) => t.attrs["data-tab-id"])
      .join()
  const release = await readFile(join(dist, PREFIX, "index.html"), "utf8")
  check(tabs(overview) === tabs(release), "the demonstrations changed the tabs")
})

function readFileSyncSafe(path) {
  try {
    return spawnSync("cat", [path], { encoding: "utf8" }).stdout
  } catch {
    return ""
  }
}

await rm(holder, { recursive: true, force: true })

// --- Report -----------------------------------------------------------------------------------------

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
  `PASS: ${results.length} demonstration checks; 4 throwaway builds (demonstration, cleaned hostile release, NODE_ENV release, leaking release)`,
)
