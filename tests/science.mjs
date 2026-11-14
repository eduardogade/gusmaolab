// Scientific articles (P13, D-098 to D-103): QTO-001 to QTO-016, QTO-019 to QTO-029. They need no
// Quarto and run no code: they read the repository, the built site (dist/) and a throwaway build
// of the site with the synthetic fixture's generated articles in place (tests/fixtures/science/).
// QTO-017, QTO-018 and the Quarto-dependent part of QTO-020 are tests/science-execute.mjs;
// QTO-030 is tests/science-browser.mjs.
//
// Run `npm run build` first.
import { execFileSync, spawnSync } from "node:child_process"
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises"
import { existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { COLLECTION_IDS, COLLECTIONS } from "../src/editorial/collections.ts"
import { tableOfContents } from "../src/editorial/reading.ts"
import { siteNavigation } from "../src/navigation/index.ts"
import {
  DIRECTORIES,
  GENERATED_MARKER,
  ScienceError,
  buildDocument,
  docInfo,
  publicationMetadata,
  splitSource,
  verify,
} from "../scripts/science.mjs"
import { extractFragment, svgIssues } from "../scripts/science-html.mjs"
import { elements, labelOf, layersOf, parse, selectedOf } from "./html-tree.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const dist = join(repo, "dist")
const fixture = join(repo, "tests/fixtures/science")
const json = (value) => JSON.stringify(value)
const read = (path) => readFile(join(repo, path), "utf8")
const P12 = "5b127f5" // the commit the editorial reading layouts were approved at

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
  return out
}

const edit = async (root, file, change) =>
  writeFile(join(root, file), change(await readFile(join(root, file), "utf8")))
const git = (...args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" })
const unchangedSince = (...paths) =>
  git("diff", "--name-only", P12, "--", ...paths).trim() === ""

// --- A throwaway build with the fixture's generated articles in place ------------------------------

async function buildOverlay(mutate = async () => {}) {
  const dir = await mkdtemp(join(await realpath(tmpdir()), "gusmaolab-science-build-"))
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
    const generated = join(fixture, "generated")
    await cp(join(generated, "src/content"), join(dir, "src/content"), {
      recursive: true,
    })
    await cp(join(generated, "src/science"), join(dir, "src/science"), {
      recursive: true,
      filter: (s) => !s.endsWith("manifest.json"),
    })
    await cp(join(generated, "public/assets"), join(dir, "public/assets"), {
      recursive: true,
    })
    const manifest = JSON.parse(
      await readFile(join(dir, "src/science/manifest.json"), "utf8"),
    )
    const extra = JSON.parse(
      await readFile(join(generated, "src/science/manifest.json"), "utf8"),
    )
    manifest.documents = { ...manifest.documents, ...extra.documents }
    await writeFile(
      join(dir, "src/science/manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    )
    await mutate(dir)
    const run = spawnSync(
      process.execPath,
      [join(repo, "node_modules/astro/bin/astro.mjs"), "build", "--root", dir],
      {
        cwd: dir,
        encoding: "utf8",
        env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", FORCE_COLOR: "0" },
      },
    )
    const out = join(dir, "dist")
    const files = (await listFiles(out)).map((f) => relative(out, f)).sort()
    const text = new Map()
    for (const file of files)
      if (/\.(html|css|svg|js|json|xml|txt)$/.test(file))
        text.set(file, await readFile(join(out, file), "utf8"))
    return { ok: run.status === 0, output: `${run.stdout}\n${run.stderr}`, files, text }
  } finally {
    await unlink(join(dir, "node_modules")).catch(() => {})
    await rm(dir, { recursive: true, force: true })
  }
}

const built = await buildOverlay()
const PAGE = "lecture-notes/greenhouse/fixture-quarto/index.html"
const page = built.text.get(PAGE) ?? ""
const idsOf = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
const hrefsOf = (html) =>
  [...html.matchAll(/<a [^>]*href="#([^"]+)"/g)].map((m) => m[1])
const bodyOf = (html) =>
  html.slice(html.indexOf("data-editorial-body"), html.indexOf("</article>"))

// A throwaway root for the offline checks (no Quarto): the fixture's generated tree.
async function withRoot(body) {
  const dir = await mkdtemp(join(await realpath(tmpdir()), "gusmaolab-science-root-"))
  try {
    await cp(join(fixture, "generated"), dir, { recursive: true })
    return await body(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

await test(
  "QTO-001",
  "Ordinary Markdown stays the default; Quarto is for the Greenhouse and the Trail",
  async (check) => {
    check(
      json(DIRECTORIES) === json(["greenhouse", "trail", "design"]),
      `directories ${json(DIRECTORIES)}`,
    )
    for (const dir of [
      "months-original",
      "kosmos",
      "book-club",
      "blog",
      "berries",
      "timber-logs",
    ])
      check(!DIRECTORIES.includes(dir), `${dir} accepts Quarto`)
    for (const bad of [
      "kosmos/x",
      "greenhouse/../x",
      "greenhouse/X",
      "greenhouse",
      "/etc/passwd",
      "greenhouse/a/b",
      "design/a b",
      "",
    ])
      check(
        (() => {
          try {
            docInfo(bad)
            return false
          } catch (e) {
            return e instanceof ScienceError
          }
        })(),
        `"${bad}" is accepted as a document`,
      )
    // Nothing was converted: the repository's collections hold no hand-written entries, and the generated ones say so.
    for (const c of COLLECTIONS) {
      const folder = join(repo, "src/content", c.directory)
      for (const file of existsSync(folder) ? await readdir(folder) : [])
        if (file.endsWith(".md"))
          check(
            (await read(`src/content/${c.directory}/${file}`)).includes(
              GENERATED_MARKER,
            ),
            `${file} is an entry that is not generated`,
          )
    }
    const counterpart = await readFile(
      join(dist, "_design/quarto/markdown/index.html"),
      "utf8",
    )
    check(
      counterpart.includes('data-editorial-layout="greenhouse"'),
      "the Markdown counterpart is not in the Greenhouse layout",
    )
    check(
      !/quarto|callout|csl-entry/.test(bodyOf(counterpart)),
      "Quarto's markers are in the Markdown counterpart",
    )
    const specimen = await readFile(join(dist, "_design/quarto/index.html"), "utf8")
    check(
      specimen.includes('data-editorial-layout="greenhouse"'),
      "the Quarto specimen is not in the Greenhouse layout",
    )
    check(
      /class="ed ed--greenhouse"/.test(specimen) &&
        /class="ed ed--greenhouse"/.test(counterpart),
      "the two do not share one article shell",
    )
  },
)

await test(
  "QTO-002",
  "A Quarto source becomes an ordinary editorial entry",
  async (check) => {
    check(built.ok, `the build failed:\n${built.output.slice(-800)}`)
    check(
      page.includes('data-editorial-collection="greenhouse"') &&
        page.includes('data-editorial-status="published"') &&
        page.includes('data-editorial-slug="fixture-quarto"'),
      "the entry's attributes are wrong",
    )
    check(page.includes("SYNTHETIC FIXTURE: a Quarto article"), "the title is missing")
    check(
      /<h1[^>]*>SYNTHETIC FIXTURE: a Quarto article<\/h1>/.test(page),
      "the title is not the h1",
    )
    check((page.match(/<h1[ >]/g) ?? []).length === 1, "not exactly one h1")
    check(/<time datetime="2026-11-01"/.test(page), "the publication date is missing")
    const index = built.text.get("lecture-notes/greenhouse/index.html") ?? ""
    check(
      index.includes('href="/lecture-notes/greenhouse/fixture-quarto/"'),
      "the Greenhouse index does not list the article",
    )
  },
)

await test("QTO-003", "One source, one public page", async (check) => {
  const pages = built.files.filter(
    (f) => f.endsWith(".html") && f.includes("fixture-quarto"),
  )
  check(json(pages) === json([PAGE]), `pages for the fixture: ${json(pages)}`)
  const index = built.text.get("lecture-notes/greenhouse/index.html") ?? ""
  check(
    (index.match(/href="\/lecture-notes\/greenhouse\/fixture-quarto\/"/g) ?? [])
      .length === 1,
    "the article is listed more than once",
  )
  check(
    !built.files.some((f) => /\.qmd$|_build|_freeze|\.ipynb$/.test(f)),
    "a source or an intermediate is public",
  )
  for (const [file, html] of built.text)
    if (file.endsWith(".html"))
      check(
        !/href="[^"]*(?:_build|\.qmd|\.ipynb)/.test(html),
        `${file} links an intermediate`,
      )
  const manifest = JSON.parse(await read("src/science/manifest.json"))
  const keys = Object.keys(manifest.documents)
  check(new Set(keys).size === keys.length, "a document is registered twice")
})

await test("QTO-004", "The metadata is written once, in the source", async (check) => {
  const source = await readFile(
    join(fixture, "source/greenhouse/fixture-quarto.qmd"),
    "utf8",
  )
  const info = docInfo("greenhouse/fixture-quarto")
  const meta = publicationMetadata(info, splitSource(source).data)
  const stub = await readFile(
    join(fixture, "generated/src/content/greenhouse/fixture-quarto.md"),
    "utf8",
  )
  const front = JSON.parse(
    `{${stub
      .split("\n")
      .slice(1, stub.split("\n").indexOf("---", 1))
      .map((l) => l.replace(/^([\w-]+): /, '"$1": '))
      .join(",")}}`,
  )
  check(
    json(front) === json(meta),
    `the entry's metadata differs from the source's: ${json(front)}`,
  )
  check(stub.includes(GENERATED_MARKER), "the entry does not say it is generated")
  check(
    !Object.keys(front).some((k) =>
      ["bibliography", "engine", "jupyter", "execute", "format"].includes(k),
    ),
    "a Quarto option is in the entry's metadata",
  )
  const manifest = JSON.parse(
    await readFile(join(fixture, "generated/src/science/manifest.json"), "utf8"),
  )
  check(
    json(manifest.documents["greenhouse/fixture-quarto"].metadata) === json(meta),
    "the manifest's copy differs from the source's",
  )
  // Wrong metadata is refused, naming the field.
  for (const [patch, fragment] of [
    [{ status: "published", description: undefined }, "needs a description"],
    [{ titel: "x" }, "titel"],
    [{ publishedAt: "2026-02-30" }, "not a calendar date"],
    [{ references: ["x"] }, "bibliography"],
  ]) {
    try {
      publicationMetadata(info, { ...splitSource(source).data, ...patch })
      check(false, `metadata with ${json(patch)} was accepted`)
    } catch (error) {
      check(
        String(error.message).includes(fragment),
        `no "${fragment}" in: ${error.message}`,
      )
    }
  }
})

await test("QTO-005", "A draft Quarto source has no page", async (check) => {
  check(
    !built.files.some((f) => f.includes("fixture-draft-lesson")),
    "a page was built for the draft",
  )
  for (const [file, html] of built.text)
    if (file.endsWith(".html"))
      check(
        !html.includes("fixture-draft-lesson") && !html.includes("draft Quarto lesson"),
        `${file} mentions the draft`,
      )
  check(
    !built.files.some((f) => f.startsWith("assets/scientific/trail")),
    "the draft's assets were published",
  )
})

await test(
  "QTO-006",
  "A Quarto article lives inside its owning folder",
  async (check) => {
    const { layers } = layersOf(parse(page))
    check(layers.length === 2, `${layers.length} rows`)
    check(
      json(selectedOf(layers[0]).map(labelOf)) === json(["Lecture Notes"]),
      "Lecture Notes is not selected",
    )
    check(
      json(selectedOf(layers[1]).map(labelOf)) === json(["The Greenhouse"]),
      "The Greenhouse is not selected",
    )
    check(
      (page.match(/<nav (?![^>]*class="ed__)/g) ?? []).length === layers.length,
      "a navigation landmark is not a row",
    )
    check(
      page.includes('data-category="blog-notes"') ||
        /<html[^>]*data-category="blog-notes"/.test(page),
      "wrong category",
    )
    check(
      (page.match(/<main[ >]/g) ?? []).length === 1 &&
        (page.match(/<html[ >]/g) ?? []).length === 1 &&
        (page.match(/<body[ >]/g) ?? []).length === 1,
      "the document has nested html, body or main",
    )
    check((page.match(/<article[ >]/g) ?? []).length === 1, "not one article")
  },
)

await test(
  "QTO-007",
  "Mathematics is native MathML, with no runtime",
  async (check) => {
    check(
      /<math display="inline"/.test(page) && /<math display="block"/.test(page),
      "inline or display mathematics is missing",
    )
    check(
      page.includes('encoding="application/x-tex"'),
      "the TeX source is not kept for assistive technology",
    )
    for (const [file, text] of built.text)
      check(!/mathjax|katex/i.test(text), `${file} names a math engine`)
    check(!/<script[^>]+src=/.test(page), "the page loads a script")
    const plain = await readFile(
      join(dist, "lecture-notes/greenhouse/index.html"),
      "utf8",
    )
    check(!plain.includes("<math"), "a page without mathematics carries any")
  },
)

await test("QTO-008", "Equation references resolve", async (check) => {
  const ids = new Set(idsOf(page))
  check(ids.has("eq-sum"), "the equation has no id")
  check(
    /<a href="#eq-sum"[^>]*>Equation&nbsp;1<\/a>/.test(page),
    "no link reads Equation 1",
  )
  check(page.includes("\\qquad(1)"), "the equation is not numbered")
  for (const target of hrefsOf(page)) check(ids.has(target), `#${target} has no target`)
})

await test("QTO-009", "Figure labels and links resolve", async (check) => {
  check(idsOf(page).includes("fig-bar"), "the figure has no id")
  check(
    /<a href="#fig-bar"[^>]*>Figure&nbsp;1<\/a>/.test(page),
    "no link reads Figure 1",
  )
  check(
    /<figcaption[^>]*>\s*Figure&nbsp;1: A synthetic bar/.test(page),
    "the figure has no numbered caption",
  )
  check(
    /<figure[^>]*>[\s\S]*<img [^>]*alt="One filled bar\."/.test(page),
    "the figure has no alt text",
  )
  check(
    !/aria-describedby="[^"]*-[0-9a-f]{8}-[0-9a-f]{4}/.test(page),
    "a random identifier is in the page",
  )
  const describes = /aria-describedby="([^"]+)"/.exec(page)?.[1]
  check(
    describes !== undefined && idsOf(page).includes(describes),
    "the figure's description does not resolve",
  )
})

await test("QTO-010", "Table labels and links resolve", async (check) => {
  check(idsOf(page).includes("tbl-vals"), "the table has no id")
  check(
    /<a href="#tbl-vals"[^>]*>Table&nbsp;1<\/a>/.test(page),
    "no link reads Table 1",
  )
  check(
    /<figcaption[^>]*>\s*Table&nbsp;1: Two synthetic values/.test(page),
    "the table has no numbered caption",
  )
  check(/<th scope="col"/.test(page), "table headers have no scope")
})

await test(
  "QTO-011",
  "Citation keys resolve against the bibliography",
  async (check) => {
    const cites = [...page.matchAll(/data-cites="([^"]+)"/g)].map((m) => m[1])
    check(json(cites) === json(["fixture2020"]), `citations ${json(cites)}`)
    check(
      idsOf(page).includes("ref-fixture2020"),
      "the entry has no id in the reference list",
    )
    check(/<a href="#ref-fixture2020"/.test(page), "the citation is not a link")
    // A missing key is refused by the tool's own checks.
    const bad = await extractFragment(
      '<main id="quarto-document-content"><p><span class="citation" data-cites="nobody"><a href="#ref-nobody">x</a></span></p></main>',
      { assetBase: "/a/" },
    )
    check(
      bad.issues.some((i) => i.includes("nobody")),
      `an unresolved citation is not reported: ${json(bad.issues)}`,
    )
  },
)

await test("QTO-012", "The generated reference list renders", async (check) => {
  check(
    /<h2[^>]*id="references"[^>]*>References<\/h2>/.test(page),
    "no References heading",
  )
  check(/<div id="refs" class="references/.test(page), "no reference list")
  check(/csl-entry[\s\S]*An Invented Reference/i.test(page), "the entry is not printed")
})

await test("QTO-013", "Footnotes and their backlinks work", async (check) => {
  const ids = new Set(idsOf(page))
  check(ids.has("fn1") && ids.has("fnref1"), "the footnote or its reference has no id")
  check(
    /<a href="#fn1"[^>]*footnote-ref/.test(page) ||
      /footnote-ref[^>]*href="#fn1"/.test(page),
    "the note is not linked",
  )
  check(
    /<a href="#fnref1"[^>]*footnote-back/.test(page) ||
      /footnote-back[^>]*href="#fnref1"/.test(page),
    "no backlink",
  )
  check(/role="doc-endnotes"/.test(page), "the notes have no landmark role")
  check(
    (page.match(/id="footnotes"/g) ?? []).length === 1,
    "the footnotes heading id is not unique",
  )
})

await test(
  "QTO-014",
  "Callouts carry no Quarto or Bootstrap stylesheet",
  async (check) => {
    check(
      /class="callout callout-style-default callout-tip/.test(page),
      "the callout is missing",
    )
    check(
      /<span class="screen-reader-only">Tip<\/span>/.test(page),
      "the callout does not name its kind",
    )
    for (const [file, text] of built.text) {
      if (file.endsWith(".css"))
        check(
          !/bootstrap|--bs-|\.d-flex|\.btn\b|tippy|anchorjs/i.test(text),
          `${file} carries Quarto or Bootstrap rules`,
        )
      if (file.endsWith(".html"))
        check(
          !/<link[^>]+(?:bootstrap|quarto)/i.test(text) && !/<style/.test(bodyOf(text)),
          `${file} loads Quarto's styles`,
        )
    }
    const css = (await listFiles(join(dist, "_astro"))).filter((f) =>
      f.endsWith(".css"),
    )
    const sheet = (await Promise.all(css.map((f) => readFile(f, "utf8")))).join("\n")
    check(
      sheet.includes(".ed__body .callout"),
      "the site does not style the callout itself",
    )
    check(
      !/#[0-9a-f]{3,8}\b/i.test(
        (await read("src/styles/editorial.css")).replace(/\/\*[\s\S]*?\*\//g, ""),
      ),
      "editorial.css has a raw colour",
    )
  },
)

await test(
  "QTO-015",
  "The contents list is the article's own headings",
  async (check) => {
    const tree = parse(page)
    const body = elements(tree).find(
      (el) => el.attrs?.["data-editorial-body"] !== undefined,
    )
    const headings = elements(body)
      .filter((el) => /^h[23]$/.test(el.tag))
      .map((el) => ({ depth: Number(el.tag[1]), slug: el.attrs.id, text: "" }))
    const nav = elements(tree).find(
      (el) => el.tag === "nav" && "data-toc" in (el.attrs ?? {}),
    )
    check(nav !== undefined, "no contents navigation")
    const links = elements(nav)
      .filter((el) => el.tag === "a")
      .map((el) => el.attrs.href.slice(1))
    check(
      json(links) === json(headings.map((h) => h.slug)),
      `contents ${json(links)} vs headings ${json(headings.map((h) => h.slug))}`,
    )
    const ids = new Set(idsOf(page))
    for (const slug of links) check(ids.has(slug), `#${slug} does not exist`)
    const manifest = JSON.parse(
      await readFile(join(fixture, "generated/src/science/manifest.json"), "utf8"),
    )
    const stored = manifest.documents["greenhouse/fixture-quarto"].headings
    check(
      json(tableOfContents(stored).map((h) => h.slug)) === json(links),
      "the stored headings and the page disagree",
    )
    check(new Set(idsOf(page)).size === idsOf(page).length, "duplicate ids in the page")
    // The draft, with too few sections of its own, would show none: a short article gets no list.
    check(
      json(tableOfContents([{ depth: 2, slug: "a", text: "A" }])) === "[]",
      "one heading made a list",
    )
  },
)

await test("QTO-016", "Ordinary builds execute nothing", async (check) => {
  const pkg = JSON.parse(await read("package.json"))
  check(
    pkg.scripts.build === "node scripts/science.mjs verify && astro build",
    `build is "${pkg.scripts.build}"`,
  )
  for (const name of ["check", "test", "verify", "dev", "preview"])
    check(
      !/science:(?:render|execute)|quarto|science\.mjs (?:render|execute)/.test(
        pkg.scripts[name] ?? "",
      ),
      `${name} runs the scientific tool`,
    )
  // With no Quarto and no Python on the PATH, the build's first step still passes.
  const env = { ...process.env, PATH: await realpath(tmpdir()) }
  const run = spawnSync(process.execPath, ["scripts/science.mjs", "verify"], {
    cwd: repo,
    encoding: "utf8",
    env,
  })
  check(run.status === 0, `verify needs a toolchain:\n${run.stdout}${run.stderr}`)
  for (const file of await listFiles(join(repo, "src")))
    if (/\.(ts|astro|mjs)$/.test(file)) {
      const text = await readFile(file, "utf8")
      check(
        !/child_process|spawn\(|execSync|quarto render/.test(
          text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ""),
        ),
        `${relative(repo, file)} can run a process`,
      )
    }
  const config = await read("astro.config.mjs")
  check(
    !/quarto|science/i.test(config),
    "astro.config.mjs refers to the scientific tool",
  )
  const source = await read("scripts/science.mjs")
  const verifyBody = source.slice(
    source.indexOf("export async function verify"),
    source.indexOf("// --- Quarto"),
  )
  check(!/\brun\(|spawnSync|toolchain\(/.test(verifyBody), "verify can run a program")
})

await test("QTO-019", "A stale or edited derivative is detected", async (check) => {
  const none = await withRoot((root) => verify(root))
  check(json(none) === "[]", `the fixture is not current: ${json(none)}`)
  const cases = [
    [
      "prose changed",
      (r) =>
        edit(r, "science/greenhouse/fixture-quarto.qmd", (t) =>
          t.replace("Closing words.", "Other words."),
        ),
      "changed since it was rendered",
    ],
    [
      "code changed",
      (r) =>
        edit(r, "science/greenhouse/fixture-quarto.qmd", (t) =>
          t.replace("random.seed(1)", "random.seed(2)"),
        ),
      "code changed since it was executed",
    ],
    [
      "bibliography changed",
      (r) => edit(r, "science/greenhouse/fixture-quarto.bib", (t) => t + "\n"),
      "changed since it was rendered",
    ],
    [
      "frozen results changed",
      (r) =>
        edit(
          r,
          "science/_freeze/greenhouse/fixture-quarto/figure-html/fig-bar-output-1.svg",
          (t) => t + " ",
        ),
      "frozen results changed",
    ],
    [
      "article edited",
      (r) =>
        edit(r, "src/science/greenhouse/fixture-quarto.html", (t) => t + "<p>x</p>"),
      "edited by hand",
    ],
    [
      "entry edited",
      (r) => edit(r, "src/content/greenhouse/fixture-quarto.md", (t) => t + " "),
      "edited by hand",
    ],
    [
      "figure edited",
      (r) =>
        edit(
          r,
          "public/assets/scientific/greenhouse/fixture-quarto/fig-bar-output-1.svg",
          (t) => t + " ",
        ),
      "do not match the rendering",
    ],
    [
      "article deleted",
      (r) => rm(join(r, "src/science/greenhouse/fixture-quarto.html")),
      "is missing",
    ],
    [
      "source added",
      (r) =>
        writeFile(join(r, "science/greenhouse/new-one.qmd"), "---\ntitle: x\n---\n"),
      "has no rendering",
    ],
    [
      "source removed",
      (r) => rm(join(r, "science/trail/fixture-draft-lesson.qmd")),
      "source that is gone",
    ],
    [
      "script in the article",
      (r) =>
        edit(
          r,
          "src/science/greenhouse/fixture-quarto.html",
          (t) => t + "<script>alert(1)</script>",
        ),
      "holds markup",
    ],
  ]
  for (const [name, change, fragment] of cases) {
    const issues = await withRoot(async (root) => {
      await change(root)
      return verify(root)
    })
    check(
      issues.some((i) => i.includes(fragment)),
      `${name}: expected "${fragment}" in ${json(issues)}`,
    )
  }
  const orphan = await withRoot(async (root) => {
    await writeFile(
      join(root, "src/content/greenhouse/orphan.md"),
      `---\ntitle: x\n---\n<!-- ${GENERATED_MARKER}greenhouse/orphan.qmd -->\n`,
    )
    return verify(root)
  })
  check(
    orphan.some((i) => i.includes("whose source is gone")),
    `an orphan entry is not reported: ${json(orphan)}`,
  )
})

await test(
  "QTO-020",
  "Without Quarto, Markdown work goes on and the tool says what is missing",
  async (check) => {
    const env = { ...process.env, PATH: await realpath(tmpdir()), SCIENCE_PYTHON: "" }
    const verifyRun = spawnSync(process.execPath, ["scripts/science.mjs", "verify"], {
      cwd: repo,
      encoding: "utf8",
      env,
    })
    check(verifyRun.status === 0, "verify fails without Quarto")
    const checkRun = spawnSync(process.execPath, ["scripts/science.mjs", "check"], {
      cwd: repo,
      encoding: "utf8",
      env,
    })
    check(
      checkRun.status === 0 && /Quarto:\s+not found/.test(checkRun.stdout),
      `check says: ${checkRun.stdout}`,
    )
    const renderRun = await withRoot(async (root) => {
      const saved = process.env.PATH
      process.env.PATH = await realpath(tmpdir())
      try {
        await buildDocument(root, "trail/fixture-draft-lesson", { execute: false })
        return "no error"
      } catch (error) {
        return error.message
      } finally {
        process.env.PATH = saved
      }
    })
    check(
      /Quarto is not installed/.test(renderRun),
      `render without Quarto says: ${renderRun}`,
    )
    const notExecuted = await withRoot(async (root) => {
      await rm(join(root, "src/science/manifest.json"))
      try {
        await buildDocument(root, "greenhouse/fixture-quarto", { execute: false })
        return "no error"
      } catch (error) {
        return error.message
      }
    })
    check(
      /never computes|not executed/.test(notExecuted),
      `render before execute says: ${notExecuted}`,
    )
    const stderr = spawnSync(
      process.execPath,
      ["scripts/science.mjs", "render", "../etc/passwd"],
      { cwd: repo, encoding: "utf8" },
    )
    check(
      stderr.status === 1 && /not a document/.test(stderr.stderr),
      "an unsafe document name is not refused",
    )
  },
)

await test(
  "QTO-021",
  "Generated figures resolve from the public page",
  async (check) => {
    const srcs = [...page.matchAll(/<img [^>]*src="([^"]+)"/g)].map((m) => m[1])
    check(srcs.length === 1, `${srcs.length} images`)
    for (const src of srcs) {
      check(
        src.startsWith("/assets/scientific/greenhouse/fixture-quarto/"),
        `${src} is outside the document's namespace`,
      )
      check(built.files.includes(src.slice(1)), `${src} is not in the built site`)
      check(
        svgIssues(built.text.get(src.slice(1)) ?? "").length === 0,
        `${src} is not a safe figure`,
      )
    }
    check(
      !/src="(?:\.\.?\/|[\w-]+_files\/)/.test(page),
      "a relative path is left in the page",
    )
    const study = await readFile(join(dist, "_design/quarto/index.html"), "utf8")
    for (const m of study.matchAll(/<img [^>]*src="([^"]+)"/g))
      check(existsSync(join(dist, m[1])), `${m[1]} is not built`)
    // Paths that escape are refused.
    for (const src of [
      "../x.svg",
      "/etc/x.svg",
      "https://example.org/x.svg",
      "data:image/svg+xml,<svg/>",
      "a.exe",
    ]) {
      const r = await extractFragment(
        `<main id="quarto-document-content"><p><img src="${src}" alt="x"></p></main>`,
        { assetBase: "/a/" },
      )
      check(r.issues.length > 0, `the image "${src}" is accepted`)
    }
  },
)

await test(
  "QTO-022",
  "Caches, intermediates and sources do not reach the site",
  async (check) => {
    const ignored = git("check-ignore", "science/_build/x", "science/.quarto/x")
      .split("\n")
      .filter(Boolean)
    check(ignored.length === 2, `_build or .quarto is not ignored: ${json(ignored)}`)
    const kept = spawnSync(
      "git",
      [
        "check-ignore",
        "science/_freeze/x",
        "src/science/manifest.json",
        "src/science/greenhouse/x.html",
        "public/assets/scientific/greenhouse/x/y.svg",
      ],
      { cwd: repo, encoding: "utf8" },
    )
    check(
      kept.status === 1 && kept.stdout.trim() === "",
      `a generated file that is committed is ignored by Git: ${kept.stdout}`,
    )
    for (const files of [
      built.files,
      (await listFiles(dist)).map((f) => relative(dist, f)),
    ])
      check(
        !files.some((f) =>
          /\.(qmd|ipynb|bib|csl|yml|yaml)$|execute-results|_freeze|_build|\.quarto|html\.json$/.test(
            f,
          ),
        ),
        `a source or cache is built: ${files.filter((f) => /\.(qmd|ipynb|bib)$|_freeze|execute-results/.test(f)).join(", ")}`,
      )
    const freeze = await listFiles(join(repo, "science/_freeze"))
    const bytes = (
      await Promise.all(freeze.map(async (f) => (await readFile(f)).length))
    ).reduce((a, b) => a + b, 0)
    check(bytes < 200_000, `the frozen results are ${bytes} bytes`)
    const assets = await listFiles(join(repo, "public/_design/quarto"))
    check(
      assets.every((f) => /\.svg$/.test(f)),
      "a non-figure is among the public assets",
    )
    const tracked = git("ls-files", "--others", "--exclude-standard", "science")
      .split("\n")
      .filter(Boolean)
    check(
      !tracked.some((f) => /_build|\.quarto/.test(f)),
      "an intermediate is not ignored",
    )
  },
)

await test("QTO-023", "The eight editorial collections are intact", async (check) => {
  check(COLLECTION_IDS.length === 8, "not eight collections")
  check(
    unchangedSince(
      "src/editorial/collections.ts",
      "src/editorial/model.ts",
      "src/content.config.ts",
    ),
    "the collections, routing or loaders changed",
  )
  const schema = git("diff", P12, "--", "src/editorial/schema.ts")
  check(schema.trim() === "", "a schema changed")
})

await test("QTO-024", "The P12 layouts and indexes are unchanged", async (check) => {
  check(
    unchangedSince(
      "src/layouts/editorial",
      "src/components/editorial/indexes",
      "src/components/editorial/EditorialArticle.astro",
      "src/components/editorial/CollectionIndex.astro",
      "src/components/editorial/CollectionOverview.astro",
    ),
    "a P12 layout or index changed",
  )
  const entry = git("diff", P12, "--", "src/components/editorial/EditorialEntry.astro")
  check(
    /scientificEntry/.test(entry),
    "EditorialEntry does not read the scientific body",
  )
  check(
    !entry
      .split("\n")
      .some((l) => l.startsWith("-") && /EDITORIAL_LAYOUTS|readingContextFor/.test(l)),
    "EditorialEntry changed how a layout is chosen",
  )
  const css = git("diff", P12, "--", "src/styles/editorial.css")
  check(
    css.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---")).length ===
      0,
    "a P12 rule was removed or changed in editorial.css",
  )
})

await test("QTO-025", "No second inventory of publications", async (check) => {
  check(
    unchangedSince("src/records", "src/data/records"),
    "the canonical records changed",
  )
  const bib = (await listFiles(repo)).filter(
    (f) =>
      f.endsWith(".bib") &&
      !/node_modules|_backup|_references|_papers|_books|_reports|brand|publications|tests\/fixtures/.test(
        f,
      ),
  )
  check(
    bib.every((f) => relative(repo, f).startsWith("science/")),
    `a bibliography is outside science/: ${bib.map((f) => relative(repo, f))}`,
  )
  const source = await read("scripts/science.mjs")
  check(!/src\/records|src\/data\/records/.test(source), "the tool reads the records")
})

await test("QTO-026", "The CV is neither read nor published", async (check) => {
  for (const file of [
    "scripts/science.mjs",
    "scripts/science-html.mjs",
    "src/science/index.ts",
    "src/pages/[design]/quarto/index.astro",
    "src/pages/[design]/quarto/markdown.astro",
  ])
    check(
      !/cv\/|CV\.proposta|codex-yaml|src\/cv/.test(await read(file)),
      `${file} names the CV`,
    )
  for (const [file, text] of built.text)
    check(!/CV\.proposta|codex-yaml/.test(text), `${file} names a CV file`)
  check(git("status", "--short", "--", "cv").trim() === "", "cv/ has changes")
})

await test(
  "QTO-027",
  "The five palettes and the environments are unchanged",
  async (check) => {
    check(
      unchangedSince(
        "src/styles/categories.css",
        "src/styles/environments.css",
        "src/design/contract.mjs",
        "src/design/css-tokens.mjs",
      ),
      "a palette, environment or contract file changed",
    )
  },
)

await test(
  "QTO-028",
  "The folders and the eleven tabs are unchanged",
  async (check) => {
    const labels = siteNavigation.sections.map((n) => `${n.label}:${n.category}`)
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
    check(
      unchangedSince(
        "src/navigation",
        "src/components/folders",
        "src/styles/folders.css",
        "src/scripts",
        "src/styles/view-transitions.css",
      ),
      "the folders or the navigation changed",
    )
    const fp = git("diff", P12, "--", "src/layouts/FolderPage.astro")
    check(
      fp.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---")).length ===
        0,
      "FolderPage lost a line",
    )
    for (const path of [
      "_design/quarto/index.html",
      "_design/quarto/markdown/index.html",
    ]) {
      const { layers } = layersOf(parse(await readFile(join(dist, path), "utf8")))
      check(
        layers.length === 2 &&
          json(selectedOf(layers[1]).map(labelOf)) === json(["The Greenhouse"]),
        `${path}: the Greenhouse is not the open folder`,
      )
    }
  },
)

await test("QTO-029", "No framework and no new runtime", async (check) => {
  const pkg = JSON.parse(await read("package.json"))
  check(
    json(Object.keys(pkg.dependencies)) === json(["astro"]),
    `dependencies ${json(pkg.dependencies)}`,
  )
  check(pkg.devDependencies.ultrahtml === "1.7.0", "ultrahtml is not pinned")
  const dev = Object.keys(pkg.devDependencies).sort()
  check(
    json(dev) ===
      json(["@astrojs/check", "prettier", "typescript", "ultrahtml", "yaml"]),
    `devDependencies ${json(dev)}`,
  )
  for (const [file, text] of built.text) {
    if (!file.endsWith(".html")) continue
    for (const tag of text.match(/<script[^>]*>/g) ?? [])
      check(/^<script type="module">$/.test(tag), `${file} has ${tag}`)
    check(
      !/react|vue|svelte|preact|alpine|jquery/i.test(text.replace(/gl-[\w-]+/g, "")),
      `${file} names a framework`,
    )
  }
  const siteText = (
    await Promise.all(
      (await listFiles(join(repo, "src")))
        .filter((f) => /\.(ts|astro)$/.test(f))
        .map((f) => readFile(f, "utf8")),
    )
  ).join("\n")
  check(!/from "ultrahtml"/.test(siteText), "the site imports the HTML parser")
  const jsFiles = built.files.filter((f) => f.endsWith(".js"))
  check(jsFiles.length === 0, `scripts are shipped: ${json(jsFiles)}`)
})

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
  `PASS: ${results.length} scientific-article checks; 1 throwaway build, 2 synthetic documents`,
)
