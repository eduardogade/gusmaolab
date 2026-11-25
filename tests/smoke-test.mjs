// Smoke test for the static build. Run `npm run build` first, or `npm run verify`.
// It checks structural invariants of the output, not exact bytes.
import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { CATEGORIES, ENVIRONMENTS } from "../src/design/contract.mjs"
import { readTokens } from "../src/design/css-tokens.mjs"
import { collectionById, collectionPrefix } from "../src/editorial/collections.ts"
import { siteNavigation } from "../src/navigation/index.ts"
import { studyPaths } from "../src/design/editorial-fixture.ts"
import { demoBuild } from "./demo-dist.mjs"

// Temporary design studies. They live under /_design/, which no registry path can reach
// (slugs never start with "_"): the P03 specimen (moved from / in P06) and the P05 folder study, and the others.
// Since P22 (D-157) they are routed only in development and demonstration builds, so the RELEASE has none of them:
// `designStudies` is what a release may hold (nothing), and `legacyStudies` is what the demonstration build holds,
// which this test reads from a throwaway demonstration build for the checks that are about the studies themselves.
const designStudies = []
const legacyStudies = [
  "/_design/tokens/",
  "/_design/folders/",
  "/_design/bearnard/",
  "/_design/records/",
  ...studyPaths(),
]
const fileOf = (path) => `${path.slice(1)}index.html`
// Pages the build must produce (P06): every registered destination, and the studies.
const expectedPages = [...siteNavigation.pagePaths(), ...designStudies].map(fileOf)
// Astro's bundled assets. The site ships no images or fonts yet, so only stylesheets are
// expected. Its one script, the folder previews (P07), is inlined in the pages that show
// folders, so it is no file of its own.
const expectedAsset = /^_astro\/[\w.-]+\.css$/
// P20 (D-139): the homepage's nucleus is the one thing that ships JavaScript files. The stage's small
// script, the nucleus's own code and the graphics renderer (the only chunk with Three.js), in these
// three files and no other; only Home references them (tests/nucleus-integration.mjs).
const nucleusAsset = /^_astro\/(NucleusStage\.astro_astro_type_script_index_0_lang|nucleus|renderer)\.[\w-]+\.js$/
// The only images: the registered Bearnard web derivatives (P09), with their provenance.
const derivatives = JSON.parse(
  await readFile(
    new URL("../assets/bearnard/derivatives.json", import.meta.url),
    "utf8",
  ),
).derivatives.flatMap((d) => d.outputs)
const expectedImages = new Map(derivatives.map((o) => [o.url.slice(1), o]))
// The scientific articles' figures (P13): exactly the files the manifest names, nothing else.
const scientific = JSON.parse(
  await readFile(new URL("../src/science/manifest.json", import.meta.url), "utf8"),
).documents
// Only figures under public/ are copied into a build. A demonstration's figures (P13-A01) are in
// src/demos/ and are served by a route that a release build does not generate; tests/demos.mjs checks both.
const expectedFigures = new Set(
  Object.values(scientific)
    .filter((d) => d.output.assetDir.startsWith("public/"))
    .flatMap((d) =>
      d.output.assets.map(
        (name) => `${d.output.assetDir.replace(/^public\//, "")}/${name}`,
      ),
    ),
)
const specimenFile = fileOf("/_design/tokens/")
const studyFile = fileOf("/_design/folders/")
const demo = await demoBuild()

const repo = new URL("../", import.meta.url)
const dist = fileURLToPath(new URL("dist/", repo))

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

let files
try {
  files = (await listFiles(dist)).map((path) => relative(dist, path)).sort()
} catch {
  console.error("FAIL: dist/ not found. Run `npm run build` first.")
  process.exit(1)
}

const failures = []
const check = (ok, message) => ok || failures.push(message)

// 1a. Editorial entries (P10): the entries' pages are generated from content, which this
// test cannot list without Astro, so it accepts a page beyond the registered ones only if
// the page itself declares what it is (EditorialEntry.astro) and the declaration is
// consistent: a known collection, a published or archived status (never a draft), and a
// URL equal to the collection's prefix plus the declared slug. Anything else stays
// unexpected. tests/content.mjs and tests/editorial-build.mjs test the generation itself.
const editorialPages = []
for (const file of files.filter((f) => f.endsWith("/index.html"))) {
  if (expectedPages.includes(file)) continue
  const html = await readFile(join(dist, file), "utf8")
  const mark = (name) => new RegExp(`data-editorial-${name}="([^"]*)"`).exec(html)?.[1]
  const [collection, status, slug] = [mark("collection"), mark("status"), mark("slug")]
  let prefix
  try {
    prefix = collectionPrefix(collectionById(collection))
  } catch {
    continue
  }
  const path = `/${file.slice(0, -"index.html".length)}`
  if (
    (status === "published" || status === "archived") &&
    slug !== undefined &&
    path === `${prefix}${slug}/`
  )
    editorialPages.push(file)
}
expectedPages.push(...editorialPages)
// P18 (D-128): the custom 404 page, the one file a static host serves for an address that matches no page.
expectedPages.push("404.html")
// P24 (D-163): the owner's favicon, robots.txt and the public sitemap, at the root where browsers and crawlers look.
expectedPages.push("favicon.ico", "robots.txt", "sitemap.xml")

// 1. Only the expected pages and stylesheets, and nothing private.
const unexpected = files.filter(
  (file) =>
    !expectedPages.includes(file) &&
    !expectedAsset.test(file) &&
    !nucleusAsset.test(file) &&
    !expectedImages.has(file) &&
    !expectedFigures.has(file),
)
check(unexpected.length === 0, `unexpected files in dist/: ${unexpected.join(", ")}`)
for (const page of expectedPages) check(files.includes(page), `missing page: ${page}`)
const privatePath =
  /(^|\/)(_backup|brand|bearnard|_books|_papers|_references|_reports|planning|development|debugging|node_modules|\.git)(\/|$)/
check(
  // Declared pages and registered derivatives may say "bearnard" in their paths (P09):
  // the study /_design/bearnard/ and illustrations/bearnard/, both checked elsewhere.
  !files.some(
    (file) =>
      privatePath.test(file) &&
      !expectedImages.has(file) &&
      !expectedPages.includes(file),
  ),
  "private or archived paths in dist/",
)

// 2. No Bearnard image under any name: compare every output file with the master checksums.
const sums = await readFile(new URL("assets/bearnard/SHA256SUMS", repo), "utf8")
const bearnard = new Set(sums.split("\n").map((line) => line.trim().split(/\s+/)[0]))
let totalBytes = 0
let siteBytes = 0
let studyBytes = 0
let imageBytes = 0
let nucleusBytes = 0
for (const file of files) {
  const bytes = await readFile(join(dist, file))
  const hash = createHash("sha256").update(bytes).digest("hex")
  check(
    !bearnard.has(hash),
    `${file} is a Bearnard image listed in assets/bearnard/SHA256SUMS`,
  )
  totalBytes += bytes.length
  const derivative = expectedImages.get(file)
  if (derivative) {
    imageBytes += bytes.length
    check(hash === derivative.sha256, `${file} differs from its recorded derivative`)
    check(
      bytes.length <= 250_000,
      `${file} is ${bytes.length} bytes, too large for the web`,
    )
  } else if (nucleusAsset.test(file)) nucleusBytes += bytes.length
  else siteBytes += bytes.length
}
// The studies' own size, in the demonstration build (the release holds none: checked below).
for (const file of demo.files.filter((f) => f.startsWith("_design/") && legacyStudies.some((p) => `${p.slice(1)}index.html` === f || f.startsWith("_design/quarto/assets")))) studyBytes += (await readFile(join(demo.dir, file))).length
// Generous ceilings, not exact sizes: they catch accidental artwork or bundles. Since P09
// the site (pages, styles, script), the temporary design studies and the registered
// illustrations each have their own.
check(
  siteBytes < 1_000_000,
  `the site's files total ${siteBytes} bytes, more than expected`,
)
// P12: the editorial study adds 30 pages (D-097); the ceiling is for the whole of /_design/.
check(studyBytes < 1_000_000, `the design studies total ${studyBytes} bytes`)
check(!files.some((f) => f.startsWith("_design/")), "the release holds a development page under _design/ (D-157)")
for (const path of legacyStudies) check(demo.files.includes(fileOf(path)), `the demonstration build lacks the study ${path}`)
// P20: the nucleus's JavaScript has its own ceiling (measured 556 KB, 137 KB gzipped, in P20).
check(nucleusBytes < 700_000, `the nucleus's scripts total ${nucleusBytes} bytes`)
check(imageBytes < 600_000, `the illustrations total ${imageBytes} bytes`)
for (const file of expectedImages.keys()) check(files.includes(file), `missing ${file}`)
for (const file of expectedFigures)
  check(files.includes(file), `missing figure ${file}`)

// 3. Every page: document basics, and no script except the folder previews (P07), once,
//    on pages with folders, and the world clocks' (P16), once, on the page that has them. Then the temporary P03 specimen.
const htmlFiles = files.filter((file) => file.endsWith(".html"))
const studyPages = legacyStudies.map(fileOf)
for (const [root, file] of [...htmlFiles.map((f) => [dist, f]), ...studyPages.map((f) => [demo.dir, f])]) {
  const page = await readFile(join(root, file), "utf8")
  check(/^<!doctype html>/i.test(page), `${file} does not start with a doctype`)
  check(/<html lang="en"[\s>]/.test(page), `${file} lacks <html lang="en">`)
  check(
    /<meta charset="utf-8"\s*\/?>/i.test(page),
    `${file} lacks a charset declaration`,
  )
  check(
    /<meta name="viewport" content="width=device-width, initial-scale=1"\s*\/?>/.test(
      page,
    ),
    `${file} lacks a viewport declaration`,
  )
  check(
    /<title>[^<]*GusmaoLab[^<]*<\/title>/.test(page),
    `${file}'s title does not name GusmaoLab`,
  )
  check((page.match(/<main[\s>]/g) ?? []).length === 1, `${file} needs one <main>`)
  const scripts = page.match(/<script\b[^>]*>/gi) ?? []
  const folders = /class="gl-folders"/.test(page)
  // The world clocks (P16, D-118) add one more module script, on the page that has them: the homepage.
  const clocks = /data-home-region="clocks"/.test(page) ? 1 : 0
  // The custom 404 page (P18) draws the folder styles but no tabs; its one script is the inline choice of Bearnard's slot (D-169).
  // The nucleus stage (P20, D-139) adds the small external script that loads the graphics on demand.
  const stage = /data-nucleus-stage/.test(page) ? 1 : 0
  const expectedScripts = file === "404.html" ? 1 : (folders ? 1 : 0) + clocks + stage
  check(
    scripts.length === expectedScripts && scripts.every((script) => (file === "404.html" ? script === "<script>" : script === '<script type="module">') || (stage === 1 && /^<script type="module" src="\/_astro\/NucleusStage\.astro_astro_type_script_index_0_lang\.[\w-]+\.js">$/.test(script))),
    `${file} has ${scripts.length} <script> element(s); expected ${expectedScripts}`,
  )
}
const html = demo.files.includes(specimenFile)
  ? await readFile(join(demo.dir, specimenFile), "utf8")
  : ""
check(/data-specimen="p03"/.test(html), "missing the P03 specimen marker")
check(/temporary design study/i.test(html), "missing the temporary design study notice")
for (const id of [
  "palette",
  "typography",
  "materials",
  "environments",
  "interaction",
]) {
  check(
    new RegExp(`<section[^>]*\\bid="${id}"`).test(html),
    `missing specimen section #${id}`,
  )
}
for (const { id } of ENVIRONMENTS) {
  check(
    html.includes(`data-environment="${id}"`),
    `missing the ${id} environment panel`,
  )
}

// 4. The palette specimen shows every primitive with its current value.
const tokens = readTokens(
  await readFile(new URL("src/styles/tokens.css", repo), "utf8"),
  await readFile(new URL("src/styles/categories.css", repo), "utf8"),
  await readFile(new URL("src/styles/environments.css", repo), "utf8"),
)
for (const name of tokens.root.keys()) {
  if (!name.startsWith("--palette-")) continue
  check(html.includes(name), `the palette specimen does not show ${name}`)
  const value = tokens.color(name).hex.toUpperCase()
  check(
    html.includes(value),
    `the palette specimen does not show ${name}'s value ${value}`,
  )
}

// 5. The stylesheet is built, linked, and carries the token layers.
const linked = [
  ...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\/([^"]+)"/g),
].map((m) => m[1])
for (const href of linked)
  check(files.includes(href), `linked stylesheet ${href} is not in dist/`)
const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
  .map((m) => m[1])
  .join("\n")
const css =
  (
    await Promise.all(
      linked
        .filter((href) => files.includes(href))
        .map((href) => readFile(join(dist, href), "utf8")),
    )
  ).join("\n") + inline
check(css.length > 0, "no CSS reaches the page")
for (const marker of [
  "--palette-espresso",
  "--color-text-primary",
  "--color-folder-tab-inactive",
  ".gl-flannel",
  ":focus-visible",
]) {
  check(css.includes(marker), `the built CSS lacks ${marker}`)
}
for (const { id } of ENVIRONMENTS) {
  check(
    new RegExp(`\\[data-environment=["']?${id}["']?\\]`).test(css),
    `the built CSS lacks the ${id} environment`,
  )
}
for (const { id } of CATEGORIES) {
  check(
    new RegExp(`\\[data-category=["']?${id}["']?\\]`).test(css),
    `the built CSS lacks the ${id} category`,
  )
  check(
    html.includes(`data-category="${id}"`),
    `the specimen does not show the ${id} category`,
  )
}

// 6. Route contract (P04, P06): the built pages are exactly the registered destinations
//    plus the declared design studies. No page exists outside the folder system, and
//    every destination has its page.
const pagePaths = htmlFiles.map(
  (file) => `/${file.replace(/(^|\/)index\.html$/, "$1")}`,
)
for (const path of pagePaths) {
  if (designStudies.includes(path) || path === "/404.html") continue
  check(
    siteNavigation.resolve(path).found,
    `built page ${path} is not in the navigation registry`,
  )
}
for (const path of siteNavigation.pagePaths()) {
  check(pagePaths.includes(path), `registered destination ${path} has no built page`)
}
for (const path of legacyStudies) {
  check(path.startsWith("/_design/"), `design study ${path} is not under /_design/`)
  check(
    !siteNavigation.resolve(path).found,
    `design study ${path} collides with a registered destination`,
  )
}

// 7. The P05 folder study: a temporary page with no links. Its only script is the folder
//    previews (P07), checked above.
const study = demo.files.includes(studyFile)
  ? await readFile(join(demo.dir, studyFile), "utf8")
  : ""
check(/data-study="p05-folders"/.test(study), "missing the P05 folder study marker")
check(
  /temporary design study/i.test(study),
  "the folder study lacks its temporary notice",
)
// The skip link (P23, D-161) is the one link every page has first; the study has no other.
check(!/<a\s/i.test(study.replace(/<a class="gl-skip-link"[^>]*>[^<]*<\/a>/, "")), "the folder study contains a link")
const destinations = siteNavigation.pagePaths()
const built = destinations.filter((path) => pagePaths.includes(path)).length

if (failures.length > 0) {
  for (const message of failures) console.error(`FAIL: ${message}`)
  process.exit(1)
}
console.log(
  `PASS: dist/ holds ${files.length} file(s), ${totalBytes} bytes (site ${siteBytes}, studies ${studyBytes}, illustrations ${imageBytes}): ${files.join(", ")}`,
)
console.log(
  `INFO: ${built} of ${destinations.length} registered destinations have a built page`,
)
