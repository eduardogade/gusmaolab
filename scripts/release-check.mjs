// The release artifact check (P24, D-165): what a release build must hold before it is published, read from the built files
// themselves, never from the source. It runs in the release workflow twice: on `dist/` after `npm run build`, and on the Pages
// repository's tree just before the push (`--deployment`: CNAME and .nojekyll too). tests/release.mjs runs it on every
// verification. It needs no dependency, so the publish job can run it without `npm ci`.
//
//   node scripts/release-check.mjs [dir] [--deployment]
//
// `npm run build` (scripts/public-build.mjs) already refuses a demonstration or an unapproved download; this adds the release
// metadata (canonical addresses, Open Graph, favicon, robots.txt, sitemap) and the public/private boundary of the files.
import { readdir, readFile, stat } from "node:fs/promises"
import { join, relative, sep } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { canonicalUrl, robotsTxt } from "../src/release/metadata.ts"

export const ROOT = fileURLToPath(new URL("..", import.meta.url))

/** The canonical origin, read from astro.config.mjs (importing it would need Astro installed). */
export async function siteOrigin() {
  const config = await readFile(join(ROOT, "astro.config.mjs"), "utf8")
  const site = /^\s*site:\s*"([^"]+)"/m.exec(config)?.[1]
  if (site === undefined) throw new Error("astro.config.mjs has no `site`")
  return new URL(site)
}

/** Paths that must never be published: development pages, demonstrations, reports, caches, private sources. */
const FORBIDDEN_PATH = /(^|\/)(_design|demo-assets|demo-downloads|qa-report|dist-demo|\.astro|\.quarto|_build|_backup|_books|_papers|_references|_reports|codex-yaml|brand|node_modules|src|tests|cv-source)(\/|$)/
/** File types a release never contains: sources, notebooks, private documents, configuration, source maps. */
const FORBIDDEN_EXT = /\.(map|ya?ml|docx?|qmd|ipynb|tex|py|ts|mjs|env|key|pem|sqlite|db|csv|tsv)$/i
/** Credentials that must never be in a public file. */
const SECRET = /ghp_[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|xox[abpr]-[A-Za-z0-9-]{10,}|sk_live_[A-Za-z0-9]{10,}|cal_live_[A-Za-z0-9]{10,}/
const TEXT = /\.(html|css|js|xml|txt|json|svg|webmanifest)$/i

async function walk(dir, base = dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === ".git") continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full, base)))
    else out.push(relative(base, full).split(sep).join("/"))
  }
  return out.sort()
}

const attrs = (html, tag, attr) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gi"))].map((m) => m[0]).filter((t) => attr.test(t))
const valueOf = (tagText, name) => new RegExp(`\\b${name}="([^"]*)"`, "i").exec(tagText)?.[1]

/** Every problem with a release tree, as sentences. Empty means it may be published. */
export async function releaseIssues(dir, { deployment = false } = {}) {
  const issues = []
  const site = await siteOrigin()
  const files = await walk(dir)
  const has = new Set(files)

  // 1. The public/private boundary.
  for (const file of files) {
    if (FORBIDDEN_PATH.test(file)) issues.push(`${file}: a path that is never published`)
    if (FORBIDDEN_EXT.test(file)) issues.push(`${file}: a file type that is never published`)
  }
  for (const file of files.filter((f) => TEXT.test(f))) {
    const text = await readFile(join(dir, file), "utf8")
    if (SECRET.test(text)) issues.push(`${file}: something that looks like a credential`)
    if (/(?:href|src|content)="https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])/i.test(text)) issues.push(`${file}: a local address`)
  }

  // 2. Every page: one canonical address that is its own, Open Graph, the favicon. The 404 page states no canonical address.
  const pages = files.filter((f) => f.endsWith(".html"))
  for (const file of pages) {
    const html = await readFile(join(dir, file), "utf8")
    const path = file === "404.html" ? "/404.html" : `/${file.replace(/index\.html$/, "")}`
    const expected = canonicalUrl(path, site, true)
    const canonicals = attrs(html, "link", /rel="canonical"/i).map((t) => valueOf(t, "href"))
    const ogUrl = attrs(html, "meta", /property="og:url"/i).map((t) => valueOf(t, "content"))
    if (expected === undefined) {
      if (canonicals.length > 0 || ogUrl.length > 0) issues.push(`${file}: states a canonical address, which this page must not`)
    } else {
      if (canonicals.length !== 1 || canonicals[0] !== expected) issues.push(`${file}: canonical ${JSON.stringify(canonicals)} is not ["${expected}"]`)
      if (ogUrl.length !== 1 || ogUrl[0] !== expected) issues.push(`${file}: og:url ${JSON.stringify(ogUrl)} is not ["${expected}"]`)
    }
    if (attrs(html, "meta", /property="og:title"/i).length !== 1) issues.push(`${file}: not exactly one og:title`)
    if (attrs(html, "meta", /property="og:site_name"/i).length !== 1) issues.push(`${file}: not exactly one og:site_name`)
    if (!attrs(html, "link", /rel="icon"/i).some((t) => valueOf(t, "href") === "/favicon.ico")) issues.push(`${file}: does not name /favicon.ico`)
    if (/<meta name="robots"[^>]*noindex/i.test(html)) issues.push(`${file}: asks not to be indexed`)
  }

  // 3. The favicon, robots.txt and the sitemap.
  if (!has.has("favicon.ico")) issues.push("favicon.ico is missing")
  else {
    const head = (await readFile(join(dir, "favicon.ico"))).subarray(0, 4)
    if (!(head[0] === 0 && head[1] === 0 && head[2] === 1 && head[3] === 0)) issues.push("favicon.ico is not an icon file")
  }
  if (!has.has("robots.txt")) issues.push("robots.txt is missing")
  else if ((await readFile(join(dir, "robots.txt"), "utf8")) !== robotsTxt(site)) issues.push("robots.txt is not the one src/release/metadata.ts writes")
  if (!has.has("sitemap.xml")) issues.push("sitemap.xml is missing")
  else {
    const xml = await readFile(join(dir, "sitemap.xml"), "utf8")
    if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>') || !/<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/.test(xml)) issues.push("sitemap.xml is not a sitemap")
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    if (locs.length === 0) issues.push("sitemap.xml lists nothing")
    for (const loc of locs) {
      const url = new URL(loc)
      if (url.origin !== site.origin) issues.push(`sitemap.xml: ${loc} is not on ${site.origin}`)
      const file = `${url.pathname.slice(1)}index.html`
      if (!has.has(file)) issues.push(`sitemap.xml: ${loc} has no page`)
      if (/\/_design\/|demo-|fixture/.test(url.pathname)) issues.push(`sitemap.xml: ${loc} is a development or synthetic page`)
    }
    if (!locs.includes(new URL("/", site).href)) issues.push("sitemap.xml does not list Home")
  }

  // 4. What only the Pages repository's tree has: the custom domain and no Jekyll (Jekyll would drop _astro/).
  if (deployment) {
    if (!has.has("CNAME")) issues.push("CNAME is missing")
    else if ((await readFile(join(dir, "CNAME"), "utf8")).trim() !== site.hostname) issues.push(`CNAME does not say ${site.hostname}`)
    if (!has.has(".nojekyll")) issues.push(".nojekyll is missing (GitHub Pages would drop the _astro/ folder)")
  } else {
    for (const file of ["CNAME", ".nojekyll"]) if (has.has(file)) issues.push(`${file}: belongs to the Pages repository, not to the build`)
  }
  return issues
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2)
  const dir = args.find((a) => !a.startsWith("--")) ?? join(ROOT, "dist")
  if (!(await stat(dir).catch(() => null))?.isDirectory()) {
    console.error(`FAIL: ${dir} is not a directory`)
    process.exit(1)
  }
  const issues = await releaseIssues(dir, { deployment: args.includes("--deployment") })
  if (issues.length > 0) {
    console.error(`FAIL: the release tree has ${issues.length} problem(s):`)
    for (const issue of issues.slice(0, 40)) console.error(`  - ${issue}`)
    process.exit(1)
  }
  console.log(`PASS: the release tree ${dir} can be published (${args.includes("--deployment") ? "deployment" : "build"} checks)`)
}
