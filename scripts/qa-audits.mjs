// Static audits of a built folder (P22, D-152): routes, links, page metadata, images, public-output
// safety, resource budgets and build reproducibility. Each audit reads what the build wrote, never
// what the code means to write, and returns checks (`{ id, title, status, reasons, data }`) that the QA
// command folds into its report. They reuse the checkers the project already has (P17's link checker,
// P13-A01's search for demonstrations, P18's download check, P10's collection routing); this file adds
// only what no earlier milestone checked, and it never writes, formats or deletes anything.
//
// A finding is not a check: it is a recommendation or a limitation the owner should know (no canonical
// link element, no robots.txt), reported without failing the run.
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, extname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"
import { ELEMENT_NODE, TEXT_NODE, parse } from "ultrahtml"
import { parseDocument } from "yaml"
import { collectionPrefix } from "../src/editorial/collections.ts"
import { siteNavigation } from "../src/navigation/index.ts"
import { siteScheduling } from "../src/scheduling/index.ts"
import { DESTINATIONS } from "../src/site/destinations.ts"
import { distIssues } from "./downloads.mjs"
import { checkLinks, urlOfFile } from "./links.mjs"
import { publicBuildIssues, releaseEnvironment } from "./demo-check.mjs"

export const ROOT = fileURLToPath(new URL("../", import.meta.url))
export const SITE_ORIGIN = "https://www.gusmaolab.org"
const TEXT = /\.(html|css|js|mjs|json|txt|xml|svg|webmanifest)$/i
const IMAGE = /\.(png|jpe?g|webp|avif|gif|svg|ico)$/i

const check = (id, title, reasons, data) => ({ id, title, status: reasons.length === 0 ? "PASS" : "FAIL", reasons: reasons.slice(0, 25).concat(reasons.length > 25 ? [`… and ${reasons.length - 25} more`] : []), ...(data === undefined ? {} : { data }) })

export async function walk(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(path)))
    else out.push(path)
  }
  return out.sort()
}
/** The registered exceptions (development/qa-exceptions.json): bounded, documented, shown on every report. */
export async function loadExceptions(root = ROOT) {
  try {
    return JSON.parse(await readFile(join(root, "development/qa-exceptions.json"), "utf8")).exceptions ?? []
  } catch {
    return []
  }
}
export const legacyPrefixes = (exceptions) => exceptions.filter((e) => e.kind === "route-prefix").flatMap((e) => e.prefixes)
export const isLegacy = (url, exceptions) => legacyPrefixes(exceptions).some((p) => url.startsWith(p))

const sha = (buffer) => createHash("sha256").update(buffer).digest("hex")
const gz = (buffer) => gzipSync(buffer, { level: 9 }).length

// --- Reading a page -----------------------------------------------------------------------------------

const textOf = (node) => (node.type === TEXT_NODE ? node.value : (node.children ?? []).map(textOf).join(""))

/** What the audits need from one built page. */
export function readFacts(html) {
  const f = { lang: null, title: null, titles: 0, descriptions: [], viewport: 0, canonical: [], og: 0, robots: [], h1: 0, headings: [], imgs: [], scripts: [], styles: [], inlineStyles: [], urls: [], emails: [], ids: new Map(), stripCount: 0, selected: [], pageState: false }
  // An image inside a <template> or a <noscript> is an alternative: the page shows one template's content or, without
  // JavaScript, its <noscript> content, never all of them (the 404 page's Bearnard slots, D-169). `alternative` names the group.
  let groups = 0
  const visit = (node, alternative = null) => {
    if (node.type === ELEMENT_NODE) {
      const a = node.attributes ?? {}
      const cls = (a.class ?? "").split(/\s+/)
      if (typeof a.id === "string") f.ids.set(a.id, (f.ids.get(a.id) ?? 0) + 1)
      switch (node.name) {
        case "html": f.lang = a.lang ?? null; break
        case "title": f.titles += 1; f.title = textOf(node).trim(); break
        case "meta":
          if (a.name === "description") f.descriptions.push(a.content ?? "")
          else if (a.name === "viewport") f.viewport += 1
          else if (a.name === "robots") f.robots.push(a.content ?? "")
          else if (typeof a.property === "string" && a.property.startsWith("og:")) f.og += 1
          break
        case "link":
          if (a.rel === "canonical") f.canonical.push(a.href ?? "")
          if (a.rel === "stylesheet" && a.href) f.styles.push(a.href)
          break
        case "style": f.inlineStyles.push(textOf(node)); break
        case "script": f.scripts.push({ src: a.src ?? null, text: a.src ? "" : textOf(node), type: a.type ?? "" }); break
        case "img": f.imgs.push({ src: a.src ?? null, srcset: a.srcset ?? null, alt: a.alt, width: a.width, height: a.height, loading: a.loading, role: a.role, hidden: a["aria-hidden"], style: a.style ?? "", cls, alternative }); break
        case "h1": f.h1 += 1; f.headings.push(1); break
        case "h2": case "h3": case "h4": case "h5": case "h6": f.headings.push(Number(node.name[1])); break
        default: break
      }
      for (const attr of ["href", "src", "action", "poster"]) if (typeof a[attr] === "string") f.urls.push(a[attr])
      if (typeof a.srcset === "string") for (const part of a.srcset.split(",")) f.urls.push(part.trim().split(/\s+/)[0])
      if (cls.includes("gl-folder__strip")) f.stripCount += 1
      if (cls.includes("gl-folder-tab") && "data-selected" in a && node.parent?.attributes) f.selected.push(a["data-tab-id"])
      if ("data-page-state" in a) f.pageState = true
    } else if (node.type === TEXT_NODE) {
      for (const m of node.value.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g)) f.emails.push(m[0])
    }
    const inner = node.type === ELEMENT_NODE && (node.name === "template" || node.name === "noscript") ? (alternative ?? `${node.name}-${groups++}`) : alternative
    for (const child of node.children ?? []) visit(child, inner)
  }
  visit(parse(html))
  return f
}

/** Every built page and its facts. */
export async function readPages(dist) {
  const pages = new Map()
  for (const file of await walk(dist)) {
    if (!file.endsWith(".html")) continue
    const rel = relative(dist, file)
    pages.set(rel, { file: rel, url: urlOfFile(rel), html: await readFile(file, "utf8") })
  }
  for (const page of pages.values()) page.facts = readFacts(page.html)
  return pages
}

// --- Routes and links ---------------------------------------------------------------------------------

async function draftsAndPublished(root) {
  const base = join(root, "src/content")
  const out = []
  for (const file of await walk(base)) {
    if (!file.endsWith(".md")) continue
    const collection = relative(base, file).split("/")[0]
    const match = /^---\n([\s\S]*?)\n---/.exec(await readFile(file, "utf8"))
    const data = match ? (parseDocument(match[1]).toJS() ?? {}) : {}
    let prefix
    try { prefix = collectionPrefix(collection) } catch { continue }
    out.push({ file: relative(root, file), collection, prefix, slug: String(data.slug ?? basename(file, ".md")), status: String(data.status ?? "draft") })
  }
  return out
}

export async function auditRoutes(dist, pages, { root = ROOT, exceptions = [] } = {}) {
  const checks = []
  const files = new Set([...pages.keys()])
  const registered = new Map([...siteNavigation.nodes.values()].map((n) => [n.path, n]))
  const need = []
  for (const [path] of registered) if (!files.has(`${path.slice(1)}index.html`) && path !== "/") need.push(path)
  if (!files.has("index.html")) need.push("/")
  if (!files.has("404.html")) need.push("/404.html")
  checks.push(check("QA-ROUTE-01", "Every registered folder (the 11 top-level tabs and 25 children) and the 404 page exist", need.map((p) => `missing page ${p}`), { registered: registered.size }))

  const entries = await draftsAndPublished(root)
  const owned = new Set([...registered.values()].filter((n) => DESTINATIONS[n.id]?.source === "collection").map((n) => n.path))
  const unknown = []
  const classes = { folder: 0, content: 0, utility: 0, legacyStudy: 0 }
  const strayDev = []
  for (const { url, file } of pages.values()) {
    if (url.startsWith("/_design/")) {
      if (isLegacy(url, exceptions)) classes.legacyStudy += 1
      else strayDev.push(`${url} is a development page in the build and is not a registered exception (development/qa-exceptions.json)`)
    } else if (registered.has(url)) classes.folder += 1
    else if (file === "404.html") classes.utility += 1
    else if (owned.has(url.replace(/[^/]+\/$/, ""))) classes.content += 1
    else unknown.push(`${url} is neither a registered folder, an approved utility page nor a content route owned by a collection folder`)
  }
  checks.push(check("QA-ROUTE-02", "Every page is a registered folder, a utility page or a published content route; nothing else", unknown, classes))
  checks.push(check("QA-ROUTE-07", "No development page is in the build beyond the registered legacy studies (a new /_design/ page fails)", strayDev, { legacyStudies: classes.legacyStudy }))

  const dupes = []
  for (const file of files) if (file.endsWith(".html") && file !== "404.html" && !file.endsWith("index.html")) dupes.push(`${file} is not a directory index: the canonical form ends with a slash`)
  checks.push(check("QA-ROUTE-03", "Pages use the canonical directory form, with no file-and-directory duplicates", dupes))

  const bad = []
  for (const node of registered.values()) {
    const page = pages.get(node.path === "/" ? "index.html" : `${node.path.slice(1)}index.html`)
    if (!page) continue
    const f = page.facts
    if (f.h1 !== 1) bad.push(`${node.path}: ${f.h1} <h1> elements`)
    if (!f.pageState) bad.push(`${node.path}: no data-page-state`)
    if (f.stripCount > 3) bad.push(`${node.path}: ${f.stripCount} rows of tabs (at most three)`)
  }
  checks.push(check("QA-ROUTE-04", "Each folder page has one heading, a derived page state and at most three rows of tabs", bad))

  const draftLeaks = []
  const missing = []
  for (const e of entries) {
    const route = `${e.prefix.replace(/\/$/, "")}/${e.slug}/`.replace(/^\/?/, "/")
    const present = files.has(`${route.slice(1)}index.html`)
    if (e.status === "draft" && present) draftLeaks.push(`${e.file}: a draft has a page at ${route}`)
    if ((e.status === "published" || e.status === "archived") && !present) missing.push(`${e.file}: ${e.status} but no page at ${route}`)
  }
  checks.push(check("QA-ROUTE-05", "Draft entries have no page; published and archived entries do", [...draftLeaks, ...missing], { entries: entries.length, drafts: entries.filter((e) => e.status === "draft").length }))

  checks.push(check("QA-ROUTE-06", "Approved downloads are in the build, identical to their source, and nothing private or synthetic is", await distIssues(dist, { root })))
  return checks
}

export async function auditLinks(dist) {
  const { stats, issues } = await checkLinks(dist)
  return [check("QA-LINK-01", "Every internal link, file and fragment resolves, and uses the canonical trailing slash", issues.map((i) => `${i.page} → ${i.href}: ${i.message}`), stats)]
}

// --- Metadata -----------------------------------------------------------------------------------------

export function auditMetadata(pages, { allowedHosts = ["www.gusmaolab.org"] } = {}) {
  const checks = []
  const r = (rule) => { const out = []; for (const p of pages.values()) { const m = rule(p.facts, p); if (m) out.push(`${p.url}: ${m}`) } return out }
  checks.push(check("QA-META-01", "Every page declares its language", r((f) => (f.lang ? null : "no lang on <html>"))))
  checks.push(check("QA-META-02", "Every page has one non-empty title of reasonable length", r((f) => (f.titles !== 1 || !f.title ? `${f.titles} <title> elements` : f.title.length > 120 ? `a ${f.title.length}-character title` : null))))
  const byTitle = new Map()
  for (const p of pages.values()) byTitle.set(p.facts.title, [...(byTitle.get(p.facts.title) ?? []), p.url])
  checks.push(check("QA-META-03", "Titles are unique across the site", [...byTitle].filter(([t, urls]) => urls.length > 1).map(([t, urls]) => `"${t}" is the title of ${urls.join(", ")}`)))
  checks.push(check("QA-META-04", "Every page has a meta description of a useful length (the 404 page excepted)", r((f, p) => (p.file === "404.html" ? null : f.descriptions.length !== 1 ? `${f.descriptions.length} meta descriptions` : f.descriptions[0].trim().length < 20 || f.descriptions[0].length > 320 ? `a ${f.descriptions[0].length}-character description` : null))))
  checks.push(check("QA-META-05", "Every page has exactly one <h1>", r((f) => (f.h1 === 1 ? null : `${f.h1} <h1> elements`))))
  checks.push(check("QA-META-06", "Heading levels never skip a level on the way down", r((f) => { let prev = 0; for (const h of f.headings) { if (prev > 0 && h > prev + 1) return `h${prev} is followed by h${h}`; prev = h } return null })))
  checks.push(check("QA-META-07", "Every page has a viewport", r((f) => (f.viewport === 1 ? null : "no viewport meta"))))
  checks.push(check("QA-META-08", "Duplicate element IDs do not occur", r((f) => { const d = [...f.ids].filter(([, n]) => n > 1).map(([id]) => id); return d.length ? `duplicate ids: ${d.slice(0, 5).join(", ")}` : null })))
  // Canonical: the site's strategy is the trailing-slash URL on one host (planning/information-architecture.md, section 6). Since P24
  // (D-163) a release page states it; each canonical element must agree with its page, and no page may name another host variant.
  const canon = []
  for (const p of pages.values()) {
    for (const c of p.facts.canonical) if (c !== `${SITE_ORIGIN}${p.url}`) canon.push(`${p.url}: canonical ${c} is not ${SITE_ORIGIN}${p.url}`)
    if (p.facts.canonical.length > 1) canon.push(`${p.url}: ${p.facts.canonical.length} canonical elements`)
    for (const href of p.facts.urls) {
      let url
      try { url = new URL(href, "http://x.invalid") } catch { continue }
      if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname) || /\.local$/.test(url.hostname)) canon.push(`${p.url}: a local address ${href}`)
      if (/(^|\.)gusmaolab\.org$/i.test(url.hostname) && !allowedHosts.includes(url.hostname.toLowerCase())) canon.push(`${p.url}: the host variant ${url.hostname} (the canonical host is www.gusmaolab.org)`)
    }
  }
  checks.push(check("QA-META-09", "Canonical conventions hold: one host, no local addresses, any canonical element agrees with its page", canon))
  const noindex = []
  for (const p of pages.values()) if (p.facts.robots.some((c) => /noindex/i.test(c))) noindex.push(`${p.url}: robots noindex`)
  checks.push(check("QA-META-10", "No public page asks to be hidden from search by accident", noindex))
  return checks
}

export function findings(pages, dist, exceptions = []) {
  const out = []
  for (const e of exceptions) {
    const n = [...pages.values()].filter((p) => legacyPrefixes([e]).some((x) => p.url.startsWith(x))).length
    if (n > 0) out.push({ id: `F-EXCEPTION:${e.id}`, severity: e.severity, area: "release", text: `${n} page(s) under ${e.prefixes.join(", ")}. ${e.reason} ${e.decision}` })
  }
  const any = (pred) => [...pages.values()].some((p) => pred(p.facts))
  if (!any((f) => f.canonical.length > 0)) out.push({ id: "F-CANONICAL", severity: "recommendation", area: "metadata", text: "No page emits <link rel=\"canonical\">. The convention (one host, trailing-slash paths) is audited, but a tag would state it. Decide at P24 with the deployment host." })
  if (!any((f) => f.og > 0)) out.push({ id: "F-SOCIAL", severity: "recommendation", area: "metadata", text: "No page has social-sharing (Open Graph) metadata. Not implemented; nothing was invented. Decide with the owner." })
  if (!existsSync(join(dist, "robots.txt"))) out.push({ id: "F-ROBOTS", severity: "recommendation", area: "deployment", text: "No robots.txt in the build." })
  if (!existsSync(join(dist, "sitemap.xml")) && !existsSync(join(dist, "sitemap-index.xml"))) out.push({ id: "F-SITEMAP", severity: "recommendation", area: "deployment", text: "No sitemap in the build. A sitemap must list only published pages, never a draft, a development route or a synthetic fixture." })
  out.push({ id: "F-HEADERS", severity: "limitation", area: "security", text: "GitHub Pages is static hosting: the site cannot set Content-Security-Policy, HSTS or other response headers, and no check here pretends otherwise." })
  return out
}

// --- Images -------------------------------------------------------------------------------------------

const FORBIDDEN_FILE = /(^|\/)(\.DS_Store|Thumbs\.db|\.env[^/]*|[^/]*\.(map|tmp|bak|orig|log|psd|xcf|swp|ipynb|qmd|ya?ml))$|(^|\/)(screenshot|Screen Shot|node_modules|\.git)/i

export async function auditImages(dist, pages, budgets) {
  const checks = []
  const files = (await walk(dist)).map((f) => relative(dist, f))
  const known = new Set(files)
  const resolve = (href, from) => {
    if (/^(https?:|\/\/|data:|mailto:|tel:)/i.test(href)) return null
    const path = new URL(href, `http://x.invalid${from}`).pathname
    return decodeURIComponent(path.slice(1))
  }
  const broken = []
  const noAlt = []
  const noSize = []
  const decorativeNoMark = []
  let imgCount = 0
  for (const p of pages.values())
    for (const img of p.facts.imgs) {
      imgCount += 1
      for (const href of [img.src, ...(img.srcset ?? "").split(",").map((s) => s.trim().split(/\s+/)[0])].filter(Boolean)) {
        const target = resolve(href, p.url)
        if (target !== null && !known.has(target)) broken.push(`${p.url}: ${href} does not exist`)
      }
      if (img.alt === undefined) noAlt.push(`${p.url}: <img src="${img.src}"> has no alt attribute`)
      else if (img.alt === "" && !(img.role === "presentation" || img.role === "none" || img.hidden === "true" || img.cls.includes("decorative"))) decorativeNoMark.push(`${p.url}: <img src="${img.src}"> has empty alt but is not marked decorative (role="presentation" or aria-hidden)`)
      const sized = (img.width && img.height) || /aspect-ratio/.test(img.style)
      if (!sized) noSize.push(`${p.url}: <img src="${img.src}"> has no width and height (a layout shift while it loads)`)
    }
  const cssBroken = []
  for (const f of files.filter((f) => f.endsWith(".css"))) {
    const css = await readFile(join(dist, f), "utf8")
    for (const m of css.matchAll(/url\(\s*["']?([^)"']+)["']?\s*\)/g)) {
      const href = m[1]
      if (/^(data:|#|https?:|\/\/)/i.test(href)) continue
      const target = href.startsWith("/") ? href.slice(1) : join(f, "..", href).replace(/^\.\//, "")
      if (!known.has(decodeURIComponent(target.split(/[?#]/)[0]))) cssBroken.push(`${f}: url(${href}) does not exist`)
    }
  }
  checks.push(check("QA-IMG-01", "Every referenced image (img, srcset, stylesheet url()) exists in the build", [...broken, ...cssBroken], { images: imgCount }))
  checks.push(check("QA-IMG-02", "Every <img> has an alt attribute; an empty one is marked decorative", [...noAlt, ...decorativeNoMark]))
  checks.push(check("QA-IMG-03", "Every <img> has intrinsic dimensions, so it cannot shift the layout", noSize))

  const sizes = []
  for (const f of files.filter((f) => IMAGE.test(f))) sizes.push({ file: f, bytes: (await stat(join(dist, f))).size })
  sizes.sort((a, b) => b.bytes - a.bytes)
  const cap = budgets?.image?.maxBytes ?? 400_000
  checks.push(check("QA-IMG-04", `No image file in the build exceeds ${cap} bytes`, sizes.filter((s) => s.bytes > cap).map((s) => `${s.file}: ${s.bytes} bytes`), { largest: sizes.slice(0, 5), count: sizes.length, total: sizes.reduce((n, s) => n + s.bytes, 0) }))

  const bad = files.filter((f) => FORBIDDEN_FILE.test(f)).map((f) => `${f}: a temporary, system, source-map or source file in the public build`)
  const masters = files.filter((f) => /bearnard_v[\d.]+\.(png|jpe?g|tiff?)$/i.test(f)).map((f) => `${f}: looks like a Bearnard master`)
  checks.push(check("QA-IMG-05", "No temporary, screenshot, source-map or master file is in the public build", [...bad, ...masters]))
  return checks
}

/** Orphaned and duplicated assets, as findings: classified, never deleted. */
export async function assetFindings(dist) {
  const files = (await walk(dist)).map((f) => relative(dist, f))
  const text = []
  for (const f of files.filter((f) => TEXT.test(f))) text.push(await readFile(join(dist, f), "utf8"))
  const haystack = text.join("\n")
  const out = []
  const hashes = new Map()
  for (const f of files.filter((f) => IMAGE.test(f))) {
    const buf = await readFile(join(dist, f))
    hashes.set(sha(buf), [...(hashes.get(sha(buf)) ?? []), f])
    if (!haystack.includes(f) && !haystack.includes(encodeURI(f)) && !haystack.includes(`/${basename(f)}`)) out.push({ id: `F-ORPHAN:${f}`, severity: "recommendation", area: "images", text: `${f} is in the build but no page, stylesheet or script names it (it may be reserved for approved future content: classify before deleting).` })
  }
  for (const group of hashes.values()) if (group.length > 1) out.push({ id: `F-DUPLICATE:${group[0]}`, severity: "recommendation", area: "images", text: `Identical files: ${group.join(", ")}.` })
  return out
}

// --- Public-output safety -----------------------------------------------------------------------------

const SECRET = /(AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|cal_(live|test)_[A-Za-z0-9]{6,}|(api[_-]?key|secret|password|passwd|access[_-]?token)["']?\s*[:=]\s*["'][A-Za-z0-9_\-/+=]{12,}["'])/i
const LOCAL_PATH = /(\/Users\/[A-Za-z0-9._-]+|\/home\/[A-Za-z0-9._-]+\/|[A-Z]:\\Users\\|\/private\/var\/|\/var\/folders\/)/
const PRIVATE_NAME = /(CV\.proposta|codex-yaml|identities\.json|cv\/manifest|[^a-z]cv\/source|\.env\b)/i
const ALLOWED_EXTENSIONS = new Set([".html", ".css", ".js", ".svg", ".webp", ".png", ".jpg", ".jpeg", ".avif", ".ico", ".txt", ".xml", ".json", ".webmanifest", ".pdf", ".csv", ".zip", ".woff", ".woff2"])

export async function auditOutput(dist, { root = ROOT } = {}) {
  const checks = []
  const files = (await walk(dist)).map((f) => relative(dist, f))
  const secrets = []
  const paths = []
  const privateNames = []
  const emails = []
  const externals = []
  for (const f of files) {
    if (PRIVATE_NAME.test(f)) privateNames.push(`${f}: a private-looking file name`)
    if (!TEXT.test(f)) continue
    const text = await readFile(join(dist, f), "utf8")
    const secret = SECRET.exec(text)
    if (secret) secrets.push(`${f}: a credential-looking string (${secret[0].slice(0, 6)}…)`)
    const local = LOCAL_PATH.exec(text)
    if (local) paths.push(`${f}: a local filesystem path (${local[0]})`)
    const pn = PRIVATE_NAME.exec(text)
    if (pn && f.endsWith(".html")) privateNames.push(`${f}: mentions ${pn[0]}`)
    if (f.endsWith(".html")) for (const m of text.matchAll(/(?:^|[>"'\s:=])([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g)) if (!/^(\w+)@(\d|\w+\.js)/.test(m[1])) emails.push(`${f}: ${m[1]}`)
  }
  checks.push(check("QA-OUT-01", "No credential-looking string is in the public build", secrets))
  checks.push(check("QA-OUT-02", "No local filesystem path is in the public build", paths))
  checks.push(check("QA-OUT-03", "No private CV source, environment file or identity file is in the public build", privateNames))
  checks.push(check("QA-OUT-04", "No email address is in the public build (Contact lists only approved channels)", emails))
  const types = files.filter((f) => !ALLOWED_EXTENSIONS.has(extname(f).toLowerCase())).map((f) => `${f}: an extension the public build does not expect`)
  checks.push(check("QA-OUT-05", "Every file in the public build has an expected type; no source map", types))

  const pages = [...(await readPages(dist)).values()]
  for (const p of pages) {
    for (const s of p.facts.scripts) if (s.src && /^(https?:)?\/\//.test(s.src)) externals.push(`${p.url}: external script ${s.src}`)
    for (const s of p.facts.styles) if (/^(https?:)?\/\//.test(s)) externals.push(`${p.url}: external stylesheet ${s}`)
    for (const f of p.html.matchAll(/<(iframe|embed|object)\b[^>]*>/gi)) externals.push(`${p.url}: a <${f[1]}> element`)
  }
  checks.push(check("QA-OUT-06", "No page loads an external script, stylesheet or frame", externals))

  const demoIssues = await publicBuildIssues(dist, root)
  checks.push(check("QA-OUT-07", "The release holds no development specimen, demonstration, workbench or synthetic fixture", demoIssues))

  // Scheduling (P21): while it is switched off, no page may carry the provider or a booking widget. If the owner has
  // enabled it, the build is a different state, and the provider must still appear only on Schedule.
  const provider = []
  for (const p of pages) {
    const mentions = /app\.cal\.com|embed\/embed\.js|Cal\("|data-schedule\b|data-schedule-load/.test(p.html)
    if (siteScheduling.state !== "ready" && mentions) provider.push(`${p.url}: provider or booking widget code while scheduling is ${siteScheduling.state}`)
    if (siteScheduling.state === "ready" && mentions && p.url !== "/schedule/") provider.push(`${p.url}: provider code outside Schedule`)
  }
  for (const f of files.filter((f) => f.endsWith(".js"))) {
    const text = await readFile(join(dist, f), "utf8")
    if (siteScheduling.state !== "ready" && /app\.cal\.com/.test(text)) provider.push(`${f}: provider origin in a script while scheduling is ${siteScheduling.state}`)
  }
  checks.push(check("QA-OUT-08", `Scheduling is ${siteScheduling.state}: no provider code, link or origin is where it must not be`, provider, { state: siteScheduling.state }))
  return checks
}

// --- Resource budgets (deterministic) -----------------------------------------------------------------

/** Per-page resource weights from the build itself: what a browser would download for the document. */
export async function pageWeights(dist, pages) {
  const weights = new Map()
  for (const p of pages.values()) {
    const w = { url: p.url, html: gz(Buffer.from(p.html)), htmlRaw: Buffer.byteLength(p.html), js: 0, jsRaw: 0, css: 0, cssRaw: 0, images: 0, scriptFiles: [], styleFiles: [], inlineScripts: 0 }
    const f = p.facts
    for (const s of f.scripts) {
      if (s.src) {
        const rel = new URL(s.src, `http://x.invalid${p.url}`).pathname.slice(1)
        if (!existsSync(join(dist, rel))) continue
        const buf = await readFile(join(dist, rel))
        w.js += gz(buf); w.jsRaw += buf.length; w.scriptFiles.push(rel)
      } else if (s.text) { const buf = Buffer.from(s.text); w.js += gz(buf); w.jsRaw += buf.length; w.inlineScripts += 1 }
    }
    for (const href of f.styles) {
      const rel = new URL(href, `http://x.invalid${p.url}`).pathname.slice(1)
      if (!existsSync(join(dist, rel))) continue
      const buf = await readFile(join(dist, rel))
      w.css += gz(buf); w.cssRaw += buf.length; w.styleFiles.push(rel)
    }
    for (const css of f.inlineStyles) { const buf = Buffer.from(css); w.css += gz(buf); w.cssRaw += buf.length }
    // Images the page always shows, plus the heaviest of its alternatives (D-169): a browser downloads one of them.
    const alternatives = new Map()
    for (const img of f.imgs) {
      if (!img.src || /^(https?:|data:)/.test(img.src)) continue
      const rel = decodeURIComponent(new URL(img.src, `http://x.invalid${p.url}`).pathname.slice(1))
      if (!existsSync(join(dist, rel))) continue
      const size = (await stat(join(dist, rel))).size
      if (img.alternative === null) w.images += size
      else alternatives.set(img.alternative, (alternatives.get(img.alternative) ?? 0) + size)
    }
    w.images += Math.max(0, ...alternatives.values())
    weights.set(p.url, w)
  }
  return weights
}

export const classOf = (url) => (url === "/" ? "home" : url === "/404.html" || url === "/404" ? "notFound" : "folder")

export function auditBudgets(weights, budgets) {
  const checks = []
  if (!budgets) return [check("QA-BUDGET-01", "Resource budgets exist (development/qa-budgets.json)", ["the budgets file is missing"])]
  const over = []
  const per = budgets.pageClasses
  for (const w of weights.values()) {
    const b = per[classOf(w.url)]
    if (!b) continue
    for (const key of ["html", "js", "css", "images"]) if (w[key] > b[key]) over.push(`${w.url}: ${key} is ${w[key]} bytes (gzip; images raw), over the ${classOf(w.url)} budget of ${b[key]}`)
    if (w.scriptFiles.length > b.scriptFiles) over.push(`${w.url}: ${w.scriptFiles.length} script files, over the budget of ${b.scriptFiles}`)
  }
  checks.push(check("QA-BUDGET-01", "Every page is within its class's resource budget (HTML, JS and CSS gzipped; images raw)", over, { classes: Object.keys(per) }))
  const route = []
  for (const w of weights.values()) {
    const heavy = w.scriptFiles.filter((f) => /renderer\.|nucleus\.|NucleusStage/.test(f))
    if (heavy.length > 0 && w.url !== "/") route.push(`${w.url}: loads the nucleus graphics (${heavy.join(", ")}); only Home may`)
  }
  const home = weights.get("/")
  if (home && !home.scriptFiles.some((f) => /renderer\./.test(f)) && !home.scriptFiles.some((f) => /NucleusStage/.test(f))) route.push("/: Home does not reference the nucleus stage script")
  checks.push(check("QA-BUDGET-02", "The nucleus graphics are a Home-only dependency; no other route loads Three.js", route))
  return checks
}

// --- Reproducibility ----------------------------------------------------------------------------------

/** A second production build into a temporary folder, compared with `dist`. Volatility is reported, not hidden. */
export async function auditReproducibility(dist, { root = ROOT } = {}) {
  const holder = await mkdtemp(join(tmpdir(), "gusmaolab-qa-repro-"))
  try {
    const out = join(holder, "dist")
    const run = spawnSync(process.execPath, [join(root, "node_modules/astro/bin/astro.mjs"), "build", "--mode", "production", "--outDir", out], { cwd: root, encoding: "utf8", env: { ...releaseEnvironment(process.env), FORCE_COLOR: "0" } })
    if (run.status !== 0) return [check("QA-REPRO-01", "A second production build from the same inputs succeeds", [`the second build failed: ${run.stderr.slice(-300)}`])]
    const a = new Map((await walk(dist)).map((f) => [relative(dist, f), f]))
    const b = new Map((await walk(out)).map((f) => [relative(out, f), f]))
    const names = [...new Set([...a.keys(), ...b.keys()])].sort()
    const missing = names.filter((n) => !a.has(n) || !b.has(n)).map((n) => `${n} is in only one of the two builds`)
    const changed = []
    for (const n of names) if (a.has(n) && b.has(n) && sha(await readFile(a.get(n))) !== sha(await readFile(b.get(n)))) changed.push(n)
    return [
      check("QA-REPRO-01", "Two production builds from the same inputs produce the same files (names, and asset identities)", missing, { files: a.size }),
      check("QA-REPRO-02", "Two production builds produce byte-identical files; any difference is listed as volatility", changed.map((n) => `${n} differs between builds`), { identical: a.size - changed.length, differing: changed.length }),
    ]
  } finally {
    await rm(holder, { recursive: true, force: true })
  }
}

/** Every static audit that needs only a built folder. */
export async function auditDist(dist, { root = ROOT, budgets } = {}) {
  const exceptions = await loadExceptions(root)
  const pages = await readPages(dist)
  // The registered legacy studies are audited as routes and links, not as public pages: their metadata and images are
  // not what a visitor reads, and the exception is reported on its own.
  const publicPages = new Map([...pages].filter(([, p]) => !isLegacy(p.url, exceptions)))
  const weights = await pageWeights(dist, publicPages)
  const checks = [
    ...(await auditRoutes(dist, pages, { root, exceptions })),
    ...(await auditLinks(dist)),
    ...auditMetadata(publicPages),
    ...(await auditImages(dist, publicPages, budgets)),
    ...(await auditOutput(dist, { root })),
    ...auditBudgets(weights, budgets),
  ]
  return { checks, findings: [...findings(pages, dist, exceptions), ...(await assetFindings(dist))], weights: [...weights.values()] }
}
