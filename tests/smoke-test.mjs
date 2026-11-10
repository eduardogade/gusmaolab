// Smoke test for the static build. Run `npm run build` first, or `npm run verify`.
// It checks structural invariants of the output, not exact bytes.
import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { ENVIRONMENTS } from "../src/design/contract.mjs"
import { readTokens } from "../src/design/css-tokens.mjs"
import { siteNavigation } from "../src/navigation/index.ts"

// Pages the build is expected to produce. Extend this list as pages are added.
const expectedPages = ["index.html"]
// Astro's bundled assets. The site ships no JavaScript, images or fonts yet, so only
// stylesheets are expected.
const expectedAsset = /^_astro\/[\w.-]+\.css$/

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

// 1. Only the expected pages and stylesheets, and nothing private.
const unexpected = files.filter(
  (file) => !expectedPages.includes(file) && !expectedAsset.test(file),
)
check(unexpected.length === 0, `unexpected files in dist/: ${unexpected.join(", ")}`)
for (const page of expectedPages) check(files.includes(page), `missing page: ${page}`)
const privatePath =
  /(^|\/)(_backup|brand|bearnard|_books|_papers|_references|_reports|planning|development|debugging|node_modules|\.git)(\/|$)/
check(
  !files.some((file) => privatePath.test(file)),
  "private or archived paths in dist/",
)

// 2. No Bearnard image under any name: compare every output file with the master checksums.
const sums = await readFile(new URL("assets/bearnard/SHA256SUMS", repo), "utf8")
const bearnard = new Set(sums.split("\n").map((line) => line.trim().split(/\s+/)[0]))
let totalBytes = 0
for (const file of files) {
  const bytes = await readFile(join(dist, file))
  totalBytes += bytes.length
  const hash = createHash("sha256").update(bytes).digest("hex")
  check(
    !bearnard.has(hash),
    `${file} is a Bearnard image listed in assets/bearnard/SHA256SUMS`,
  )
}
// A generous ceiling, not an exact size: it catches accidental artwork or bundles.
check(totalBytes < 400_000, `dist/ holds ${totalBytes} bytes, more than expected`)

// 3. The page: document basics, no JavaScript, and the temporary specimen.
const html = files.includes("index.html")
  ? await readFile(join(dist, "index.html"), "utf8")
  : ""
check(/^<!doctype html>/i.test(html), "index.html does not start with a doctype")
check(/<html lang="en"[\s>]/.test(html), 'missing <html lang="en">')
check(/<meta charset="utf-8"\s*\/?>/i.test(html), "missing charset declaration")
check(
  /<meta name="viewport" content="width=device-width, initial-scale=1"\s*\/?>/.test(
    html,
  ),
  "missing viewport declaration",
)
check(
  /<title>[^<]*GusmaoLab[^<]*<\/title>/.test(html),
  "page title does not name GusmaoLab",
)
check(/<main[\s>][\s\S]*<\/main>/.test(html), "missing <main> element")
check(!/<script\b/i.test(html), "index.html contains a <script> element")
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

// 6. Route contract (P04): every built page is a registered navigation destination, so
//    no page can exist outside the folder system. The reverse, every destination having a
//    page, becomes a requirement once section pages are generated.
const pagePaths = files
  .filter((file) => file.endsWith(".html"))
  .map((file) => `/${file.replace(/(^|\/)index\.html$/, "$1")}`)
for (const path of pagePaths) {
  check(
    siteNavigation.resolve(path).found,
    `built page ${path} is not in the navigation registry`,
  )
}
const destinations = siteNavigation.pagePaths()
const built = destinations.filter((path) => pagePaths.includes(path)).length

if (failures.length > 0) {
  for (const message of failures) console.error(`FAIL: ${message}`)
  process.exit(1)
}
console.log(
  `PASS: dist/ holds ${files.length} file(s), ${totalBytes} bytes: ${files.join(", ")}`,
)
console.log(
  `INFO: ${built} of ${destinations.length} registered destinations have a built page so far`,
)
