// The production smoke test (P24, D-165): what the LIVE site serves, checked over HTTP against the build that was released.
// The public address is the final authority; a green deployment is not. It needs only Node (fetch), no browser, so the
// release workflow runs it right after the push, and anyone can run it by hand:
//
//   node scripts/smoke.mjs https://www.gusmaolab.org --dist dist [--wait 900]
//   node scripts/smoke.mjs http://localhost:4322 --dist dist          (a local `astro preview` of the same build)
//
// --wait N  first waits, up to N seconds, until the live homepage is byte-for-byte the built one (a state, not a delay:
//           GitHub Pages takes a moment to build). Without it the site is checked as it is.
//
// It prints PASS or FAIL per check and exits non-zero on any FAIL. Paths that must not exist are checked by generic
// pattern only, so the output names no private file. What it cannot see: a browser's rendering, scripts running, console
// errors, a screen reader. Those are the owner's manual check after a release (development/operations.md).
import { readdir, readFile } from "node:fs/promises"
import { join, relative, sep } from "node:path"
import process from "node:process"
import { siteOrigin } from "./release-check.mjs"

const args = process.argv.slice(2)
const base = new URL(args.find((a) => !a.startsWith("--")) ?? "https://www.gusmaolab.org")
const option = (name) => { const i = args.indexOf(`--${name}`); return i < 0 ? undefined : args[i + 1] }
const dist = option("dist")
const wait = Number(option("wait") ?? 0)
if (dist === undefined) { console.error("FAIL: --dist <the released build> is required"); process.exit(1) }

const site = await siteOrigin()
const production = base.hostname === site.hostname
const results = []
const check = (id, title, problems) => { results.push({ id, title, problems }); console.log(`${problems.length === 0 ? "PASS" : "FAIL"} ${id} ${title}`); for (const p of problems.slice(0, 15)) console.log(`  - ${p}`) }
const get = async (url, init = {}) => {
  try { const res = await fetch(url, { redirect: "follow", ...init, headers: { "user-agent": "GusmaoLab release smoke test" } }); return { res, body: Buffer.from(await res.arrayBuffer()) } }
  catch (error) { return { res: undefined, body: Buffer.alloc(0), error } }
}
const at = (path) => new URL(path, base).href

async function walk(dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(full)))
    else out.push(relative(dist, full).split(sep).join("/"))
  }
  return out
}

// 0. The live site serves this build (waits for that state when asked).
const built = await readFile(join(dist, "index.html"))
let same = false
const until = Date.now() + wait * 1000
for (;;) {
  const { res, body } = await get(at("/"), { cache: "no-store" })
  same = res?.status === 200 && body.equals(built)
  if (same || Date.now() >= until) break
  await new Promise((r) => setTimeout(r, 10_000))
}
check("SMOKE-00", "The live homepage is exactly the released build's", same ? [] : [`${at("/")} does not serve dist/index.html`])

// 1. Every built page answers 200 with HTML, states its own canonical address, and loads its assets.
const files = await walk(dist)
const pages = files.filter((f) => f.endsWith("index.html")).map((f) => `/${f.replace(/index\.html$/, "")}`).sort()
const pageProblems = []
const assetUrls = new Set()
const mixed = []
for (const path of pages) {
  const { res, body, error } = await get(at(path))
  if (res === undefined) { pageProblems.push(`${path}: ${error}`); continue }
  if (res.status !== 200 || !/text\/html/.test(res.headers.get("content-type") ?? "")) { pageProblems.push(`${path}: ${res.status} ${res.headers.get("content-type")}`); continue }
  const html = body.toString("utf8")
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1]
  if (canonical !== new URL(path, site).href) pageProblems.push(`${path}: canonical ${canonical}`)
  for (const m of html.matchAll(/<(?:link|script|img|source)\b[^>]*?\b(?:href|src)="([^"]+)"/gi)) {
    if (/rel="canonical"/.test(m[0])) continue
    const url = new URL(m[1].replace(/&amp;/g, "&"), at(path))
    if (url.protocol === "http:" && base.protocol === "https:") mixed.push(`${path}: ${url.href}`)
    if (url.origin === base.origin) assetUrls.add(url.href)
  }
}
check("SMOKE-01", `Every page of the build answers 200 with its canonical address (${pages.length} pages)`, pageProblems)
const assetProblems = []
for (const url of [...assetUrls].sort()) { const { res } = await get(url); if (res?.status !== 200) assetProblems.push(`${url}: ${res?.status}`) }
check("SMOKE-02", `Every stylesheet, script, image and icon the pages load answers 200 (${assetUrls.size})`, assetProblems)
check("SMOKE-03", "No page loads anything over plain HTTP (mixed content)", mixed)

// 2. The favicon, robots.txt and the sitemap.
const icon = await get(at("/favicon.ico"))
check("SMOKE-04", "The favicon is served", icon.res?.status === 200 && icon.body.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0])) ? [] : [`/favicon.ico: ${icon.res?.status}`])
const robots = await get(at("/robots.txt"))
check("SMOKE-05", "robots.txt is served and names the sitemap", robots.res?.status === 200 && robots.body.toString().includes(`Sitemap: ${new URL("/sitemap.xml", site).href}`) ? [] : [`/robots.txt: ${robots.res?.status}`])
const sitemap = await get(at("/sitemap.xml"))
const locs = [...sitemap.body.toString().matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
const locProblems = sitemap.res?.status === 200 && locs.length > 0 ? [] : [`/sitemap.xml: ${sitemap.res?.status}`]
for (const path of locs) { const { res } = await get(at(path)); if (res?.status !== 200) locProblems.push(`${path}: ${res?.status}`) }
check("SMOKE-06", `The sitemap is served and every address in it answers 200 (${locs.length})`, locProblems)

// 3. An address that matches no page gets the site's own 404 page, with the status 404 (not /404.html loaded directly).
const errorTitle = /<title>([^<]*)<\/title>/.exec(await readFile(join(dist, "404.html"), "utf8"))?.[1]
const missing = await get(at(`/no-such-page-${Date.now().toString(36)}/`))
check("SMOKE-07", "An unknown address answers 404 with the site's 404 page", missing.res?.status === 404 && errorTitle !== undefined && missing.body.toString().includes(`<title>${errorTitle}</title>`) ? [] : [`status ${missing.res?.status}`])

// 4. Development, demonstration and private paths do not exist (generic patterns only).
const absent = ["/_design/", "/_design/site-map/", "/_design/quality/", "/demo-assets/", "/demo-downloads/", "/dist-demo/", "/qa-report/", "/src/", "/cv/codex-yaml/", "/brand/", "/lecture-notes/greenhouse/demo-synthetic-signals/"]
const present = []
for (const path of absent) { const { res } = await get(at(path)); if (res?.status !== 404) present.push(`${path}: ${res?.status}`) }
check("SMOKE-08", `No development, demonstration or private path answers (${absent.length} patterns)`, present)

// 5. Production only: HTTPS, the redirect from HTTP, and the bare domain.
if (production) {
  const plain = await get(`http://${site.hostname}/`, { redirect: "manual" })
  const location = plain.res?.headers.get("location") ?? ""
  check("SMOKE-09", "HTTP redirects to HTTPS", plain.res !== undefined && [301, 308].includes(plain.res.status) && location.startsWith(`https://${site.hostname}/`) ? [] : [`http://${site.hostname}/ answers ${plain.res?.status} ${location}`])
  const apex = await get(`https://${site.hostname.replace(/^www\./, "")}/`, { redirect: "manual" })
  const apexTo = apex.res?.headers.get("location") ?? ""
  check("SMOKE-10", "The bare domain redirects to the canonical host", apex.res !== undefined && [301, 308].includes(apex.res.status) && apexTo.startsWith(`https://${site.hostname}/`) ? [] : [`answers ${apex.res?.status} ${apexTo}`])
}

const failed = results.filter((r) => r.problems.length > 0).length
console.log(`${results.length - failed} of ${results.length} smoke checks passed against ${base.origin}.`)
process.exit(failed > 0 ? 1 : 0)
