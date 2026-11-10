// Smoke test for the static build. Run `npm run build` first, or `npm run verify`.
import { readdir, readFile } from "node:fs/promises"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

// Pages the build is expected to produce. Extend this list as pages are added.
const expectedPages = ["index.html"]

const dist = fileURLToPath(new URL("../dist/", import.meta.url))

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

// Only the expected pages and Astro's own build assets belong in the output.
const unexpected = files.filter(
  (file) => !expectedPages.includes(file) && !file.startsWith("_astro/"),
)
check(unexpected.length === 0, `unexpected files in dist/: ${unexpected.join(", ")}`)
const privatePath =
  /(^|\/)(_backup|brand|bearnard|_books|_papers|_references|_reports|planning|development|debugging|node_modules|\.git)(\/|$)/
check(
  !files.some((file) => privatePath.test(file)),
  "private or archived paths in dist/",
)
for (const page of expectedPages) {
  check(files.includes(page), `missing page: ${page}`)
}

const html = files.includes("index.html")
  ? await readFile(join(dist, "index.html"), "utf8")
  : ""
check(/^<!doctype html>/i.test(html), "index.html does not start with a doctype")
check(html.includes('<html lang="en">'), 'missing <html lang="en">')
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
check(/<main>[\s\S]*<\/main>/.test(html), "missing <main> element")
check(html.includes("temporary foundation page"), "missing foundation-page text")
check(html.includes("not implemented yet"), "missing not-implemented notice")

if (failures.length > 0) {
  for (const message of failures) console.error(`FAIL: ${message}`)
  process.exit(1)
}
console.log(`PASS: dist/ holds ${files.length} file(s): ${files.join(", ")}`)
