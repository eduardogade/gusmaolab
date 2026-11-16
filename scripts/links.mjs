// The internal-link check (P17, D-125): reads a built folder and reports every internal link that
// points nowhere. `node scripts/links.mjs [folder]` checks `dist/` by default; `npm run links`.
//
// It parses each page with a real HTML parser (ultrahtml, already a development dependency), not
// with a pattern, and distinguishes:
//   - internal: a root-relative or relative path to a page or a file of the build;
//   - fragment: `#id`, alone or after an internal path, which must name an `id` on that page;
//   - external: `http(s):` and `//` URLs, counted and never fetched;
//   - other schemes: `mailto:` and `tel:` are legitimate; `javascript:` and `data:` in a link
//     are reported, because nothing on this site should need them.
// A page is found by its canonical URL (`/cv/research/` is `cv/research/index.html`); a link
// to a page without its trailing slash is reported with the fix, since the site's URLs are
// canonical with it (planning/information-architecture.md, section 6).
//
// It writes nothing, fetches nothing and rewrites no content. Exit code 1 if there is any problem.
import { existsSync } from "node:fs"
import { readdir, readFile, stat } from "node:fs/promises"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { ELEMENT_NODE, parse } from "ultrahtml"

/** Attributes that hold a URL, by tag. */
const URL_ATTRIBUTES = { a: ["href"], link: ["href"], img: ["src"], script: ["src"], source: ["src"], area: ["href"] }
const FORGIVEN_SCHEMES = new Set(["mailto:", "tel:"])
const FORBIDDEN_SCHEMES = new Set(["javascript:", "data:"])

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(path)))
    else out.push(path)
  }
  return out.sort()
}

/** The `[tag, attribute, value]` of every URL in a page, and every `id`. */
export function readPage(html) {
  const urls = []
  const ids = new Set()
  const visit = (node) => {
    if (node.type === ELEMENT_NODE) {
      if (typeof node.attributes?.id === "string") ids.add(node.attributes.id)
      if (typeof node.attributes?.name === "string" && node.name === "a") ids.add(node.attributes.name)
      for (const attribute of URL_ATTRIBUTES[node.name] ?? []) {
        const value = node.attributes?.[attribute]
        if (typeof value === "string") urls.push([node.name, attribute, value])
      }
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(parse(html))
  return { urls, ids }
}

/** The page URL of a built file: `cv/research/index.html` is `/cv/research/`. */
export const urlOfFile = (file) => `/${file.replace(/(^|\/)index\.html$/, "$1")}`

/**
 * Checks every page of a built folder. Returns the counts and the problems; each problem names the
 * page, the link and what is wrong, so it can be fixed without searching.
 */
export async function checkLinks(dist) {
  const files = (await walk(dist)).map((path) => relative(dist, path))
  const pages = files.filter((file) => file.endsWith(".html"))
  const known = new Set(files)
  const parsed = new Map()
  for (const file of pages) parsed.set(file, readPage(await readFile(join(dist, file), "utf8")))
  const stats = { pages: pages.length, links: 0, internal: 0, fragments: 0, external: 0, other: 0 }
  const issues = []
  const problem = (file, href, message) => issues.push({ page: urlOfFile(file), href, message })

  for (const file of pages) {
    const here = urlOfFile(file)
    for (const [tag, attribute, raw] of parsed.get(file).urls) {
      const href = raw.trim()
      if (href === "") continue
      stats.links += 1
      const scheme = /^([a-z][a-z0-9+.-]*:)/i.exec(href)?.[1]?.toLowerCase()
      if (scheme === "http:" || scheme === "https:" || href.startsWith("//")) {
        stats.external += 1
        continue
      }
      if (scheme !== undefined) {
        stats.other += 1
        if (FORBIDDEN_SCHEMES.has(scheme)) problem(file, href, `a ${scheme} URL in ${tag}[${attribute}]`)
        else if (!FORGIVEN_SCHEMES.has(scheme)) problem(file, href, `an unrecognized ${scheme} URL`)
        continue
      }
      // Internal. Resolve against the page's own URL, dropping the query and the fragment.
      const url = new URL(href, `http://site.invalid${here}`)
      const path = url.pathname
      const fragment = decodeURIComponent(url.hash.slice(1))
      stats.internal += 1
      let target
      if (known.has(path.slice(1)) && !path.endsWith("/")) target = path.slice(1) // a file of the build
      else if (path.endsWith("/") && known.has(`${path.slice(1)}index.html`)) target = `${path.slice(1)}index.html`
      else if (!path.endsWith("/") && known.has(`${path.slice(1)}/index.html`)) {
        problem(file, href, `${path} is a page; the canonical URL ends with a slash: ${path}/`)
        continue
      } else {
        problem(file, href, `no page or file at ${path}`)
        continue
      }
      if (fragment !== "") {
        stats.fragments += 1
        const page = parsed.get(target)
        if (page !== undefined && !page.ids.has(fragment))
          problem(file, href, `${path} has no element with id "${fragment}"`)
      }
    }
  }
  return { stats, issues }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = fileURLToPath(new URL(`../${process.argv[2] ?? "dist"}/`, import.meta.url))
  if (!existsSync(dist) || !(await stat(dist)).isDirectory()) {
    console.error(`FAIL: ${dist} does not exist. Run \`npm run build\` first.`)
    process.exit(1)
  }
  const { stats, issues } = await checkLinks(dist)
  console.log(
    `${stats.pages} pages, ${stats.links} links: ${stats.internal} internal (${stats.fragments} with a fragment), ${stats.external} external (not fetched), ${stats.other} mailto, tel or other.`,
  )
  for (const issue of issues) console.log(`BROKEN ${issue.page}  ${issue.href}  ${issue.message}`)
  console.log(issues.length === 0 ? "No broken internal links." : `${issues.length} broken internal link(s).`)
  process.exit(issues.length === 0 ? 0 : 1)
}
