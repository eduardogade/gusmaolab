// Contact, downloads and the 404 page (P18, D-126 to D-128): the UTIL checks that need no browser. They
// read the release build in dist/ (run `npm run build` first, or `npm run verify`), make one throwaway
// demonstration build, start real local HTTP servers, and run the real validation code on good and
// bad input. The browser half (UTIL-003B, 009, 019B, 021B, 022, 025B, 029B, 032 and the keyboard and
// focus checks) is tests/util-browser.mjs.
//
// What they show: a contact channel or a download is published only when it is approved and valid, a
// missing approved file fails the build, the unfinished CV cannot be a download, nothing private or
// synthetic is in the release, and an unknown address gets the custom 404 document with a 404 status
// from a server that serves it the way GitHub Pages is documented to. What they do not show: that
// GitHub Pages itself behaves so (nothing is deployed from here), how the pages look (the browser
// test and the owner's review), or that any email was delivered.
import { spawn, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { extname, join, normalize } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { distIssues, sourceIssues } from "../scripts/downloads.mjs"
import { publicBuildIssues } from "../scripts/demo-check.mjs"
import { checkLinks } from "../scripts/links.mjs"
import { CONTACT_CHANNELS } from "../src/data/contact.ts"
import { CV_SNAPSHOT } from "../src/data/cv/snapshot.ts"
import { DOWNLOADS, PLANNED_DOWNLOADS } from "../src/data/downloads.ts"
import { DEMO_DOWNLOADS, DEMO_PLANNED } from "../src/design/downloads-fixture.ts"
import { CLOCK_LOCATIONS } from "../src/home/clocks.ts"
import { ILLUSTRATIONS } from "../src/illustrations/bearnard.ts"
import { siteNavigation } from "../src/navigation/index.ts"
import { groupByUse, mailtoHref, profileHost, validateChannels } from "../src/contact/channels.ts"
import { checksumOf, factsOf, fileOf, sizeOf } from "../src/downloads/files.ts"
import { DOWNLOAD_ROOTS, FILE_TYPES, formatSize, validateDownloads } from "../src/downloads/registry.ts"
import { coverage, summarize } from "../src/site/coverage.ts"
import { pageFacts, siteRecordViews } from "../src/site/facts.ts"
import { DEV_PAGES, DOWNLOADS_PAGE, CONTACT_PAGE, MISSING_PAGE } from "../src/design/site-map.ts"
import { siteRecords } from "../src/records/index.ts"
import { elements, labelOf, layersOf, parse, selectedOf, tabsOf, textOf } from "./html-tree.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const dist = join(repo, "dist")
const BASE = "409657a" // the head P18 began from
const json = (value) => JSON.stringify(value)
const read = (path) => readFile(join(repo, path), "utf8")
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

if (!existsSync(join(dist, "index.html"))) {
  console.error("FAIL: dist/index.html is missing. Run `npm run build` first.")
  process.exit(1)
}

// --- Shared: built pages, text of the build, a throwaway demonstration build, git -------------------------
async function listFiles(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await listFiles(path)))
    else out.push(path)
  }
  return out
}
const readHtml = async (path) => (existsSync(path) ? await readFile(path, "utf8") : "")
const contactHtml = await readHtml(join(dist, "contact/index.html"))
const contact = parse(contactHtml)
const contactMain = elements(contact).find((el) => el.tag === "main")
const inContact = contactMain ? elements(contactMain) : []
const notFoundHtml = await readHtml(join(dist, "404.html"))
const notFound = parse(notFoundHtml)
const inNotFound = elements(notFound)

const holder = await mkdtemp(join(tmpdir(), "gusmaolab-util-"))
const demoOut = join(holder, "demo")
const demoBuild = spawnSync("npx", ["astro", "build", "--mode", "demo", "--outDir", demoOut], {
  cwd: repo,
  encoding: "utf8",
  env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
})
const demoBuilt = demoBuild.status === 0

const git = (...args) => spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" })
const gitAvailable = git("rev-parse", "--git-dir").status === 0 && git("cat-file", "-e", BASE).status === 0
const lines = (r) => r.stdout.split("\n").filter(Boolean)
function changedSinceBase(paths) {
  if (!gitAvailable) return []
  const files = new Set()
  for (const commit of lines(git("log", "--format=%H", `${BASE}..HEAD`, "--grep=\\[P18\\]")))
    for (const f of lines(git("diff-tree", "--no-commit-id", "--name-only", "-r", commit, "--", ...paths))) files.add(f)
  // While this file is not yet committed, the working tree is P18 in progress.
  if (git("status", "--porcelain", "--", "tests/util.mjs").stdout.startsWith("??")) {
    for (const f of lines(git("diff", "HEAD", "--name-only", "--", ...paths))) files.add(f)
    for (const f of lines(git("ls-files", "--others", "--exclude-standard", "--", ...paths))) files.add(f)
  }
  return [...files].sort()
}

// --- A static server that answers the way GitHub Pages is documented to ---------------------------------------
// GitHub Pages serves `<path>/index.html` for a directory, the file for a file, and, for anything else, the
// site's root `404.html` with status 404. This is that rule and no more; it is NOT GitHub.
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".csv": "text/csv; charset=utf-8", ".webp": "image/webp", ".svg": "image/svg+xml" }
function pagesLikeServer(root) {
  return createServer(async (request, response) => {
    let path = decodeURIComponent(new URL(request.url, "http://localhost").pathname)
    if (path.endsWith("/")) path += "index.html"
    const file = normalize(join(root, path))
    const found = file.startsWith(root) && existsSync(file) ? file : undefined
    const target = found ?? join(root, "404.html")
    const body = await readFile(target)
    response.writeHead(found ? 200 : 404, { "Content-Type": TYPES[extname(target)] ?? "application/octet-stream" }).end(body)
  })
}
const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)))
const fetchOf = async (port, path) => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, { redirect: "manual" })
  return { status: response.status, text: await response.text(), type: response.headers.get("content-type") ?? "" }
}
const hosting = pagesLikeServer(dist)
const hostingPort = await listen(hosting)

// --- Contact ----------------------------------------------------------------------------------------------------

const GOOD = { id: "email-general", kind: "email", label: "Email", destination: "a.person@university.edu", description: "General questions.", use: "general", approvedOn: "2026-11-17" }

await test("UTIL-001", "The Contact route exists as a real page", async (check) => {
  check(siteNavigation.node("contact").path === "/contact/", "the registry's Contact path changed")
  check(contactHtml.length > 0 && contactMain?.attrs.id === "content", "/contact/ has no built page with <main id=\"content\">")
  check(elements(contact).filter((el) => el.tag === "h1").length === 1, "Contact needs exactly one h1")
  check(textOf(elements(contact).find((el) => el.tag === "h1")).trim() === "Contact", "the heading is not Contact")
  const home = await fetchOf(hostingPort, "/contact/")
  check(home.status === 200 && home.text.includes("<h1"), "the hosted /contact/ is not a 200 page")
})

await test("UTIL-002", "Contact belongs to Core and shows its own tab selected", async (check) => {
  check(siteNavigation.node("contact").category === "core", "Contact is not in the Core category")
  check(/<html[^>]*data-category="core"/.test(contactHtml), "the page does not carry the core category")
  const { layers } = layersOf(contact)
  check(layers.length === 1, `${layers.length} rows of tabs`)
  check(json(selectedOf(layers[0]).map(labelOf)) === json(["Contact"]), "Contact is not the one selected tab")
  check(tabsOf(layers[0]).length === 11, "the global row does not have eleven tabs")
})

await test("UTIL-003", "Approved contact methods render, grouped by use, as real links", async (check) => {
  const rendered = inContact.filter((el) => el.attrs["data-channel"] !== undefined)
  check(rendered.length === CONTACT_CHANNELS.length, `${rendered.length} channels rendered for ${CONTACT_CHANNELS.length} approved`)
  for (const channel of CONTACT_CHANNELS) {
    const item = rendered.find((el) => el.attrs["data-channel"] === channel.id)
    const link = item && elements(item).find((el) => el.tag === "a")
    check(link !== undefined, `the channel ${channel.id} is not a link`)
    // The parser keeps entities as written: a profile URL with a query (P24's Google Scholar) has `&amp;` in the HTML.
    const href = link?.attrs.href?.replace(/&amp;/g, "&")
    check(href === (channel.kind === "email" ? mailtoHref(channel.destination) : channel.destination), `${channel.id}: wrong link ${link?.attrs.href}`)
  }
  // The grouping helper: the page's order, empty uses omitted.
  const groups = groupByUse([GOOD, { ...GOOD, id: "email-collab", destination: "b.person@university.edu", use: "collaboration" }])
  check(json(groups.map((g) => g.use)) === json(["general", "collaboration"]), `groups ${json(groups.map((g) => g.use))}`)
  // With no approved channel the page says so instead of drawing an empty list.
  if (CONTACT_CHANNELS.length === 0) {
    check(inContact.some((el) => el.attrs["data-state-notice"] === "preparation"), "no preparation notice although no channel is approved")
    check(!inContact.some((el) => el.attrs["data-contact-channels"] !== undefined), "an empty channel list is drawn")
  }
})

await test("UTIL-004", "Unapproved or malformed channels are refused, and none is published by default", async (check) => {
  check(validateChannels(CONTACT_CHANNELS).length === 0, `the site's channels are invalid: ${json(validateChannels(CONTACT_CHANNELS))}`)
  check(validateChannels([GOOD]).length === 0, `a valid channel was refused: ${json(validateChannels([GOOD]))}`)
  const { approvedOn: _a, ...unapproved } = GOOD
  check(validateChannels([{ ...unapproved }]).some((m) => /approval date/.test(m)), "a channel without an approval date is accepted")
  check(validateChannels([{ ...GOOD, approvedOn: "someday" }]).some((m) => /approval date/.test(m)), "a bad approval date is accepted")
  check(validateChannels([GOOD, GOOD]).some((m) => /used twice/.test(m)), "a repeated ID is accepted")
  check(validateChannels([{ ...GOOD, destination: "x@example.org" }]).some((m) => /placeholder/.test(m)), "an example-domain address is accepted outside a fixture")
  check(validateChannels([{ ...GOOD, destination: "x@example.org" }], { allowExampleDomains: true }).length === 0, "a fixture address is refused in a fixture")
  // Nothing in the repository is approval: the contact file imports no record, CV or private source.
  const source = await read("src/data/contact.ts")
  check(!/from\s+["'][^"']*(cv|records|yaml)/.test(source) && !/CV\.proposta|codex-yaml/.test(source.replace(/\/\*[\s\S]*?\*\//g, "")), "the contact file reads a CV or record")
  const loader = await read("src/contact/index.ts")
  check(/throw new ContactConfigError/.test(loader), "an invalid channel does not fail the build")
})

await test("UTIL-005", "Email links are valid mailto links and nothing else", async (check) => {
  check(mailtoHref("a.person@university.edu") === "mailto:a.person@university.edu", mailtoHref("a.person@university.edu"))
  check(mailtoHref("a+b@university.edu") === "mailto:a%2Bb@university.edu", mailtoHref("a+b@university.edu"))
  for (const bad of ["mailto:a@b.edu", "A Person <a@b.edu>", "a@b", "a b@c.edu", "a@@b.edu", "javascript:alert(1)@b.edu"])
    check(validateChannels([{ ...GOOD, destination: bad }]).length > 0, `${bad} was accepted as an address`)
  check(!/subject=|body=|\?/.test(mailtoHref("a.person@university.edu")), "the mailto carries a subject or body")
  for (const link of inContact.filter((el) => el.tag === "a" && el.attrs.href?.startsWith("mailto:")))
    check(/^mailto:[^?\s]+@[^?\s]+$/.test(link.attrs.href), `${link.attrs.href} is not a plain mailto`)
  const component = await read("src/components/contact/ContactChannels.astro")
  check(/Opens your email application/.test(component), "the page does not say a mailto opens an email application")
  check(!/<script|clipboard|navigator\./.test(component), "the contact component uses a script or the clipboard")
})

await test("UTIL-006", "External profile links must be https, on a public host, without credentials", async (check) => {
  const profile = { ...GOOD, id: "profile", kind: "profile", label: "Profile", destination: "https://scholar.example.edu/a" }
  check(validateChannels([{ ...profile, destination: "https://github.com/a-person" }]).length === 0, "a good profile link was refused")
  for (const bad of ["http://github.com/a", "javascript:alert(1)", "https://user:pass@github.com/a", "github.com/a", "https://localhost/a", "https://intranet/a", "ftp://github.com/a"])
    check(validateChannels([{ ...profile, destination: bad }]).length > 0, `${bad} was accepted as a profile`)
  check(profileHost("https://www.github.com/a") === "github.com", "the host label is wrong")
  for (const link of inContact.filter((el) => el.tag === "a" && /^https?:/.test(el.attrs.href ?? ""))) {
    check(link.attrs.href.startsWith("https://"), `${link.attrs.href} is not https`)
    check(!("target" in link.attrs), "an external link forces a new tab")
    check(/noopener/.test(link.attrs.rel ?? ""), "an external link lacks rel=noopener")
  }
})

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g
await test("UTIL-007", "No private CV reference or contact detail is exposed anywhere in the release", async (check) => {
  const approved = new Set(CONTACT_CHANNELS.filter((c) => c.kind === "email").map((c) => c.destination.toLowerCase()))
  const offenders = []
  for (const file of await listFiles(dist)) {
    if (!/\.(html|js|css|json|xml|txt|webmanifest)$/.test(file)) continue
    if (file.includes("/_design/")) continue // the permanent design studies hold fixtures, never real details
    const text = await readFile(file, "utf8")
    for (const match of text.matchAll(EMAIL))
      if (!approved.has(match[0].toLowerCase()) && !/\.(png|webp|jpe?g|svg|woff2?|css|js)$/i.test(match[0])) offenders.push(`${file.replace(dist, "")}: ${match[0]}`)
    for (const marker of ["CV.proposta", "codex-yaml", "referencias", "email_historico", "telefone"]) if (text.includes(marker)) offenders.push(`${file.replace(dist, "")}: ${marker}`)
  }
  check(offenders.length === 0, `addresses or CV markers in the release: ${json(offenders.slice(0, 6))}`)
  check(CV_SNAPSHOT === null || !CONTACT_CHANNELS.some((c) => c.destination.length === 0), "a channel is empty")
})

await test("UTIL-008", "Contact has no form, no fake submission and no external form service", async (check) => {
  check(!/<(form|button|input|textarea|select|iframe)\b/i.test(contactHtml), "a form control or iframe is on the Contact page")
  check(!/\bonsubmit\b|\baction=|formspree|netlify|getform|web3forms|emailjs|typeform|google\.com\/forms/i.test(contactHtml), "a form service or submission is referenced")
  const src = (await Promise.all(["src/components/contact/ContactChannels.astro", "src/components/states/DestinationPage.astro", "src/contact/channels.ts"].map(read))).join("\n")
  check(!/<form|<button|fetch\(|XMLHttpRequest|sendBeacon|FormData/.test(src), "a contact module submits or fetches")
  const scripts = [...contactHtml.matchAll(/<script\b[^>]*>/gi)].map((m) => m[0])
  check(scripts.every((s) => s === '<script type="module">'), `contact scripts: ${json(scripts)}`)
  check(!/src="https?:/.test(contactHtml), "the Contact page loads an external script")
})

// --- Downloads ------------------------------------------------------------------------------------------------

const resource = (over = {}) => ({
  id: "test-file", title: "Test file", description: "A test file.", category: "reference",
  publicPath: "/downloads/test-file.pdf", fileName: "test-file.pdf", mediaType: "application/pdf", approvedOn: "2026-11-17", ...over,
})
const present = (r, size = 10) => new Map([[r.publicPath, { exists: true, size }]])

await test("UTIL-010", "The download registry is valid, and invalid ones are refused", async (check) => {
  check(validateDownloads(DOWNLOADS, PLANNED_DOWNLOADS, factsOf(DOWNLOADS)).length === 0, "the site's downloads are invalid")
  check(validateDownloads(DEMO_DOWNLOADS, DEMO_PLANNED, factsOf(DEMO_DOWNLOADS, "demo"), { root: "demo" }).length === 0, `the demonstration downloads are invalid: ${json(validateDownloads(DEMO_DOWNLOADS, DEMO_PLANNED, factsOf(DEMO_DOWNLOADS, "demo"), { root: "demo" }))}`)
  check(validateDownloads([resource()], [], present(resource())).length === 0, "a valid download was refused")
  check(validateDownloads([resource({ approvedOn: "" })], []).some((m) => /approval date/.test(m)), "a download without approval is accepted")
  check(validateDownloads([resource({ version: "final" })], []).some((m) => /version/.test(m)), "an invented version label is accepted")
  check(validateDownloads([resource({ title: " " })], []).some((m) => /no title/.test(m)), "an untitled download is accepted")
  check(validateDownloads([resource({ category: "misc" })], []).some((m) => /category/.test(m)), "an unknown category is accepted")
  check(validateDownloads([], [{ id: "p", title: "P", description: "d", category: "cv", waitingFor: "x", publicPath: "/downloads/p.pdf" }]).some((m) => /no path/.test(m)), "a planned download with a path is accepted")
})

await test("UTIL-011", "Resource identifiers are unique across approved and planned downloads", async (check) => {
  check(validateDownloads([resource(), resource({ publicPath: "/downloads/other.pdf", fileName: "other.pdf" })], []).some((m) => /ID is used twice/.test(m)), "a repeated ID is accepted")
  check(validateDownloads([resource(), resource({ id: "other" })], []).some((m) => /another download's path/.test(m)), "a repeated path is accepted")
  check(validateDownloads([resource()], [{ id: "test-file", title: "T", description: "d", category: "cv", waitingFor: "w" }]).some((m) => /also an approved/.test(m)), "a planned ID may repeat an approved one")
  const ids = [...DOWNLOADS, ...PLANNED_DOWNLOADS, ...DEMO_DOWNLOADS, ...DEMO_PLANNED].map((r) => r.id)
  check(new Set(ids).size === ids.length, `an ID repeats across the lists: ${json(ids)}`)
})

await test("UTIL-012", "Every public download target exists, in the source and in the build", async (check) => {
  check((await sourceIssues()).length === 0, `source: ${json(await sourceIssues())}`)
  check((await distIssues(dist)).length === 0, `dist: ${json(await distIssues(dist))}`)
  for (const r of DOWNLOADS) check(existsSync(join(dist, r.publicPath.slice(1))), `${r.publicPath} is not in dist/`)
  for (const r of DEMO_DOWNLOADS) check(existsSync(fileOf(r, "demo")), `the fixture ${r.fileName} is missing`)
  if (demoBuilt) for (const r of DEMO_DOWNLOADS) check(existsSync(join(demoOut, r.publicPath.slice(1))), `${r.publicPath} is not in the demonstration build`)
  else check(false, `the throwaway demonstration build failed: ${demoBuild.stderr.slice(-300)}`)
})

await test("UTIL-013", "Public resource paths stay inside the allowed folders", async (check) => {
  for (const publicPath of ["/etc/passwd", "/downloads/../src/data/downloads.ts", "/downloads/sub/file.pdf", "/other/file.pdf", "downloads/file.pdf", "/downloads//file.pdf", "/downloads/file.pdf?x=1", "/downloads/a b.pdf", "/demo-downloads/file.pdf"]) {
    const r = resource({ publicPath, fileName: publicPath.split("/").at(-1) })
    check(validateDownloads([r], []).length > 0, `${publicPath} was accepted`)
  }
  check(DOWNLOAD_ROOTS.release.directory === "public/downloads" && DOWNLOAD_ROOTS.release.urlPrefix === "/downloads/", "the release root changed")
  check(fileOf(resource({ publicPath: "/downloads/../x.pdf" })) === undefined, "fileOf resolves a path with ..")
  check(fileOf(resource({ publicPath: "/elsewhere/x.pdf" })) === undefined, "fileOf resolves a path outside the root")
  const config = await read("astro.config.mjs")
  check(!/\bbase\s*:/.test(config), "a base path is configured; download paths are root-absolute")
})

await test("UTIL-014", "Metadata matches the actual asset: size, type and checksum", async (check) => {
  for (const r of DEMO_DOWNLOADS) {
    const bytes = await readFile(fileOf(r, "demo"))
    check(sizeOf(r, "demo") === bytes.length, `${r.fileName}: size ${sizeOf(r, "demo")} vs ${bytes.length}`)
    check(checksumOf(r, "demo") === createHash("sha256").update(bytes).digest("hex"), `${r.fileName}: wrong checksum`)
    const independent = spawnSync("shasum", ["-a", "256", fileOf(r, "demo")], { encoding: "utf8" })
    if (independent.status === 0) check(independent.stdout.startsWith(checksumOf(r, "demo")), `${r.fileName}: shasum disagrees`)
    check(FILE_TYPES[r.fileName.split(".").pop()].mediaType === r.mediaType, `${r.fileName}: type mismatch`)
  }
  check(formatSize(0) === "0 B" && formatSize(1023) === "1023 B" && formatSize(1024) === "1.0 KB" && formatSize(1536) === "1.5 KB" && formatSize(1048576) === "1.0 MB", "formatSize is wrong")
  check(validateDownloads([resource({ mediaType: "text/plain" })], []).some((m) => /media type/.test(m)), "a mismatched media type is accepted")
  check(validateDownloads([resource({ fileName: "test-file.exe", publicPath: "/downloads/test-file.exe", mediaType: "application/octet-stream" })], []).some((m) => /not an allowed download type/.test(m)), "an executable is allowed")
  check(validateDownloads([resource()], [], present(resource(), 0)).some((m) => /empty/.test(m)), "an empty file is accepted")
})

await test("UTIL-015", "A missing approved file fails validation clearly, in the registry and in the build", async (check) => {
  const r = resource()
  const messages = validateDownloads([r], [], new Map([[r.publicPath, { exists: false }]]))
  check(messages.length === 1 && /its file is missing; put it at public\/downloads\/test-file\.pdf or remove the entry/.test(messages[0]), `message: ${json(messages)}`)
  const tmp = await mkdtemp(join(tmpdir(), "gusmaolab-dl-"))
  try {
    await mkdir(join(tmp, "public/downloads"), { recursive: true })
    const missing = await sourceIssues({ root: tmp, approved: [r], planned: [] })
    check(missing.some((m) => /its file is missing/.test(m)), `sourceIssues: ${json(missing)}`)
    await writeFile(join(tmp, "public/downloads/test-file.pdf"), "x")
    await writeFile(join(tmp, "public/downloads/stray.pdf"), "x")
    const stray = await sourceIssues({ root: tmp, approved: [r], planned: [] })
    check(stray.length === 1 && /stray\.pdf is not in the registry/.test(stray[0]), `a stray file: ${json(stray)}`)
    const fakeDist = join(tmp, "dist")
    await mkdir(fakeDist)
    check((await distIssues(fakeDist, { root: tmp, approved: [r] })).some((m) => /is not in the build/.test(m)), "an approved file absent from the build passes")
    await mkdir(join(fakeDist, "downloads"))
    await writeFile(join(fakeDist, "downloads/test-file.pdf"), "different")
    check((await distIssues(fakeDist, { root: tmp, approved: [r] })).some((m) => /differs/.test(m)), "a built file that differs from its source passes")
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
  // The module the pages import throws on an invalid registry: the build fails, not a visitor's click.
  check(/throw new DownloadsConfigError/.test(await read("src/downloads/index.ts")), "an invalid registry does not fail the build")
  check(/sourceIssues\(\)/.test(await read("scripts/public-build.mjs")) && /distIssues/.test(await read("scripts/public-build.mjs")), "the release build does not run the download checks")
})

const cvHtml = await readHtml(join(dist, "cv/index.html"))
const cvInMain = elements(parse(cvHtml)).filter((el) => el.tag !== undefined)

await test("UTIL-016", "Planned downloads render no fake link", async (check) => {
  const planned = cvInMain.filter((el) => el.attrs["data-download-state"] === "planned")
  check(planned.length === PLANNED_DOWNLOADS.filter((p) => p.category === "cv").length && planned.length > 0, `${planned.length} planned items on the CV page`)
  for (const item of planned) {
    check(!elements(item).some((el) => ["a", "button", "input"].includes(el.tag) || "download" in el.attrs || "href" in el.attrs), "a planned download has a link or control")
    check(/Not yet available/.test(textOf(item)), "a planned download does not say it is unavailable")
  }
  check(!cvInMain.some((el) => el.attrs["data-download-state"] === "available"), "a CV download is available although none is approved")
  check(!/<a[^>]+href="[^"]*\.pdf"/i.test(cvHtml), "the CV page links to a PDF")
})

await test("UTIL-017", "The unfinished CV source is not downloadable", async (check) => {
  for (const name of ["cv.proposta.yaml", "CV.proposta.yaml", "CV-v1.2.yaml", "cv.yaml", "cv.md", "curriculum.yml"]) {
    const r = resource({ fileName: name, publicPath: `/downloads/${name}`, mediaType: "application/x-yaml" })
    check(validateDownloads([r], []).length > 0, `${name} was accepted as a download`)
  }
  check(!DOWNLOADS.some((r) => /cv|curriculum/i.test(r.fileName) && !/\.pdf$/i.test(r.fileName)), "a non-PDF CV file is a registered download")
  check(!FILE_TYPES.yaml && !FILE_TYPES.yml && !FILE_TYPES.json, "a source format is an allowed download type")
  check(CV_SNAPSHOT === null ? DOWNLOADS.every((r) => r.category !== "cv") : true, "a CV download is registered without an approved CV version")
  const names = (await readdir(dist, { recursive: true })).map(String)
  check(!names.some((n) => /CV[-.]|proposta|\.ya?ml$/i.test(n.split("/").at(-1))), "a CV source file is in dist/")
})

await test("UTIL-018", "Sensitive source files are absent from the public folder and the build", async (check) => {
  check((await sourceIssues()).filter((m) => /private or unfinished/.test(m)).length === 0, "public/ holds a private-looking file")
  const tmp = await mkdtemp(join(tmpdir(), "gusmaolab-dl-"))
  try {
    await mkdir(join(tmp, "public/downloads"), { recursive: true })
    await writeFile(join(tmp, "public/cv.proposta.yaml"), "x")
    await writeFile(join(tmp, "public/downloads/CV-v1.0.yaml"), "x")
    const found = await sourceIssues({ root: tmp, approved: [], planned: [] })
    check(found.filter((m) => /private or unfinished/.test(m)).length >= 2, `the check missed a private file: ${json(found)}`)
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
  const publicNames = (await readdir(join(repo, "public"), { recursive: true })).map(String)
  check(!publicNames.some((n) => /proposta|\.ya?ml$|cv/i.test(n.split("/").at(-1))), `public/ holds ${json(publicNames.filter((n) => /proposta|\.ya?ml$|cv/i.test(n)))}`)
  check(!(await readdir(dist)).some((n) => ["_references", "_books", "_papers", "_reports", "brand", "cv"].includes(n) && n !== "cv"), "a private folder is in dist/")
})

await test("UTIL-019", "The development specimen offers files that really download", async (check) => {
  check(demoBuilt, "the throwaway demonstration build failed")
  if (!demoBuilt) return
  const server = pagesLikeServer(demoOut)
  const port = await listen(server)
  try {
    const page = await fetchOf(port, DOWNLOADS_PAGE)
    check(page.status === 200 && /data-downloads-specimen/.test(page.text), "the specimen page is not served")
    for (const r of DEMO_DOWNLOADS) {
      check(page.text.includes(`href="${r.publicPath}"`) && page.text.includes(`download="${r.fileName}"`), `${r.fileName}: no download link on the specimen`)
      const response = await fetch(`http://127.0.0.1:${port}${r.publicPath}`)
      const bytes = Buffer.from(await response.arrayBuffer())
      check(response.status === 200, `${r.publicPath} answered ${response.status}`)
      check(bytes.equals(await readFile(fileOf(r, "demo"))), `${r.publicPath}: the retrieved bytes differ from the fixture`)
      check(bytes.length === sizeOf(r, "demo") && page.text.includes(formatSize(bytes.length)), `${r.fileName}: the page does not show the real size ${formatSize(bytes.length)}`)
    }
    check(!/<a[^>]*href="[^"]*demo-planned-cv[^"]*"/.test(page.text), "the planned example has a link")
    check(/Synthetic/.test(page.text) && /not a page of the website/i.test(page.text), "the specimen is not labelled synthetic")
  } finally {
    server.close()
  }
})

await test("UTIL-020", "A production build excludes the synthetic downloads and their specimen", async (check) => {
  const issues = await publicBuildIssues(dist)
  check(issues.length === 0, `traces: ${json(issues.slice(0, 5))}`)
  check(!existsSync(join(dist, "demo-downloads")) && !existsSync(join(dist, "_design/downloads")) && !existsSync(join(dist, "_design/contact")), "a development path is in dist/")
  const all = (await Promise.all((await listFiles(dist)).filter((f) => /\.(html|js|css|txt|csv|json)$/.test(f)).map((f) => readFile(f, "utf8")))).join("\n")
  check(!/synthetic-sample|demo-downloads|data-downloads-specimen|data-contact-specimen/.test(all), "a synthetic download or specimen marker is in dist/")
  check(!(await listFiles(dist)).some((f) => /synthetic-sample/.test(f)), "a synthetic file is in dist/")
  check(demoBuilt && existsSync(join(demoOut, "demo-downloads/synthetic-sample-notes.txt")), "the demonstration build lacks the fixtures, so the exclusion proves nothing")
})

await test("UTIL-021", "Download links follow the configured public URL conventions", async (check) => {
  const config = await read("astro.config.mjs")
  check(/site:\s*"https:\/\/www\.gusmaolab\.org"/.test(config) && !/\bbase\s*:/.test(config), "the site is not configured for the domain root")
  for (const r of [...DOWNLOADS, ...DEMO_DOWNLOADS]) check(/^\/(?:demo-)?downloads\/[a-z0-9._-]+$/.test(r.publicPath), `${r.publicPath} is not a root-absolute path`)
  check(demoBuilt, "no demonstration build")
  if (!demoBuilt) return
  const { issues } = await checkLinks(demoOut)
  // The P15 homepage specimen links to synthetic posts that have no pages, by design (D-117).
  const unexpected = issues.filter((i) => i.page !== "/_design/home/")
  check(unexpected.length === 0, `broken links in the demonstration build: ${json(unexpected.slice(0, 5))}`)
  const { stats, issues: release } = await checkLinks(dist)
  check(release.length === 0 && stats.pages >= 37, `the release has ${release.length} broken links`)
})

// --- Error pages -------------------------------------------------------------------------------------------------

await test("UTIL-023", "The custom Astro 404 page exists as a static page, not a catch-all or a server route", async (check) => {
  check(existsSync(join(repo, "src/pages/404.astro")), "src/pages/404.astro is missing")
  const pageFiles = (await readdir(join(repo, "src/pages"), { recursive: true })).map(String)
  check(!pageFiles.some((f) => /\[\.\.\./.test(f)), "a catch-all route exists")
  check(!pageFiles.some((f) => /^500/.test(f)), "a 500 page exists although the site is static")
  const config = await read("astro.config.mjs")
  check(/output:\s*"static"/.test(config) && !/adapter|server/i.test(config), "the site is not static")
  const source = await read("src/pages/404.astro")
  check(!/getStaticPaths|Astro\.redirect|redirect\(/.test(source), "the 404 page is a route or a redirect")
})

await test("UTIL-024", "A suitable 404.html is generated at the root of the build", async (check) => {
  check(existsSync(join(dist, "404.html")), "dist/404.html is missing")
  check(/^<!doctype html>/i.test(notFoundHtml) && /<html lang="en"/.test(notFoundHtml), "404.html is not a full document")
  check(/<title>Page not found · GusmaoLab<\/title>/.test(notFoundHtml), "the title is wrong")
  check(inNotFound.filter((el) => el.tag === "h1").length === 1 && /isn't in the archive|isn&#39;t in the archive/.test(notFoundHtml), "the heading is not the archive's missing-folder line")
  check(!existsSync(join(dist, "404/index.html")), "a /404/ route was also generated")
  check(notFoundHtml.includes('href="/_astro/'), "the stylesheet is not root-absolute, so it would fail at a deep missing URL")
  check(!/href="\.\.?\//.test(notFoundHtml) && !/src="\.\.?\//.test(notFoundHtml), "404.html uses a relative asset URL")
})

await test("UTIL-025", "Unknown routes receive the intended error document from a Pages-style server", async (check) => {
  const unknown = ["/nope/", "/cv/nope/", "/external/", "/a/b/c/d/e/", "/blog/not-a-post/", "/missing.pdf", "/downloads/anything.pdf", MISSING_PAGE]
  const expected = (await readFile(join(dist, "404.html"), "utf8"))
  for (const path of unknown) {
    const r = await fetchOf(hostingPort, path)
    check(r.text === expected && /text\/html/.test(r.type), `${path}: not the 404.html document (status ${r.status})`)
  }
})

await test("UTIL-026", "The HTTP status is 404 for unknown addresses, from a Pages-style server and from astro preview", async (check) => {
  for (const path of ["/nope/", "/cv/nope/", "/external/", MISSING_PAGE]) {
    const r = await fetchOf(hostingPort, path)
    check(r.status === 404, `${path}: status ${r.status} from the Pages-style server`)
  }
  // The real `astro preview` server, on the real build: a second, independent answer.
  const port = 4399
  const preview = spawn("npx", ["astro", "preview", "--port", String(port), "--host", "127.0.0.1", "--outDir", "dist"], { cwd: repo, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" }, stdio: "ignore", detached: true })
  try {
    let up = false
    for (let i = 0; i < 80 && !up; i++) {
      await new Promise((resolve) => setTimeout(resolve, 150))
      up = await fetch(`http://127.0.0.1:${port}/`).then((r) => r.ok, () => false)
    }
    check(up, "astro preview did not start")
    if (up) {
      for (const path of ["/nope/", "/cv/nope/", MISSING_PAGE]) {
        const r = await fetchOf(port, path)
        check(r.status === 404 && /isn't in the archive|isn&#39;t in the archive/.test(r.text), `${path}: astro preview answered ${r.status}`)
      }
      check((await fetchOf(port, "/cv/")).status === 200, "astro preview does not serve /cv/")
    }
  } finally {
    try { process.kill(-preview.pid) } catch { preview.kill() }
    const stale = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" }).stdout.trim()
    if (stale) for (const pid of stale.split("\n")) try { process.kill(Number(pid)) } catch { /* already gone */ }
  }
})

await test("UTIL-027", "Valid routes never resolve to the 404 page", async (check) => {
  const paths = [...siteNavigation.pagePaths()] // Home is the first of the 36
  for (const path of paths) {
    const r = await fetchOf(hostingPort, path)
    check(r.status === 200 && !/data-not-found/.test(r.text), `${path}: status ${r.status}`)
  }
  check(paths.length === 36 && paths[0] === "/", `${paths.length} paths checked`)
  for (const path of ["/_astro/", "/illustrations/"]) check((await fetchOf(hostingPort, path)).status === 404, `${path} lists a directory`)
})

await test("UTIL-028", "The error page selects no folder, row or tab", async (check) => {
  check(!inNotFound.some((el) => (el.attrs.class ?? "").split(/\s+/).includes("gl-folder-tab")), "the 404 page draws a tab")
  check(!inNotFound.some((el) => "data-selected" in el.attrs || el.attrs["aria-current"] !== undefined), "the 404 page marks something selected or current")
  check(!inNotFound.some((el) => el.tag === "nav" && /Sections|folders/.test(el.attrs["aria-label"] ?? "")), "the 404 page has a tab-row landmark")
  const levels = inNotFound.filter((el) => (el.attrs.class ?? "").split(/\s+/).includes("gl-folder")).map((el) => el.attrs["data-level"])
  check(json(levels) === json(["1"]), `folder levels ${json(levels)}`)
  check(!inNotFound.some((el) => el.attrs["data-page-path"] !== undefined), "the 404 page claims a page path")
  check(/<html[^>]*data-category="core"/.test(notFoundHtml), "the 404 page is not in the Core atmosphere")
  const layout = await read("src/layouts/ErrorPage.astro")
  check(!/FolderStack|resolve\(|FolderPage|siteNavigation/.test(layout.replace(/\/\*[\s\S]*?\*\//g, "")), "the error layout resolves a folder state")
})

await test("UTIL-029", "Recovery links lead to valid canonical destinations", async (check) => {
  const main = inNotFound.find((el) => el.tag === "main")
  const links = elements(main).filter((el) => el.tag === "a")
  check(links.length >= 4 && links[0].attrs.href === "/", `${links.length} recovery links, first ${links[0]?.attrs.href}`)
  for (const link of links) {
    const href = link.attrs.href
    check(siteNavigation.resolve(href).found, `${href} is not a registered destination`)
    check(href === "/" || (href.startsWith("/") && href.endsWith("/")), `${href} is not canonical`)
    const r = await fetchOf(hostingPort, href)
    check(r.status === 200, `${href} answered ${r.status}`)
  }
  check(links.some((l) => l.attrs.href === "/contact/"), "the 404 page does not offer Contact")
})

await test("UTIL-030", "The error page uses approved visual tokens only", async (check) => {
  const sources = (await Promise.all(["src/pages/404.astro", "src/layouts/ErrorPage.astro"].map(read))).join("\n")
  const css = [...sources.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n")
  check(css.length > 0, "no styles found")
  check(!/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|--palette-/.test(css), "a raw colour or palette primitive is used")
  check(!/transition|animation|@keyframes|scroll-behavior/.test(css), "the error page adds motion")
  check(!/font-family\s*:\s*(?!var\()[^\s]/.test(css), "an unrelated font family is declared")
  check(!/categories\.css|tokens\.css|environments\.css/.test(sources), "the error page imports a palette file itself")
})

await test("UTIL-031", "Empty collections and pages in preparation are real pages, never the 404", async (check) => {
  for (const id of ["blog", "lecture-notes-greenhouse", "writing-kosmos", "writing-months-original", "contact", "cv-teaching", "lab-facilities", "bearnards-area-photos"]) {
    const path = siteNavigation.node(id).path
    const r = await fetchOf(hostingPort, path)
    check(r.status === 200 && !/data-not-found/.test(r.text), `${path}: status ${r.status}`)
  }
  const rows = coverage(siteNavigation, pageFacts({}, siteRecordViews(), 0))
  const byId = (id) => rows.find((r) => r.id === id).state
  check(byId("contact") === "preparation" && byId("blog") === "empty", `states: contact ${byId("contact")}, blog ${byId("blog")}`)
  check(coverage(siteNavigation, pageFacts({}, siteRecordViews(), 2)).find((r) => r.id === "contact").state === "ready", "approved channels do not make Contact ready")
  check(!/This folder isn't in the archive|isn&#39;t in the archive/.test(contactHtml), "the Contact page says it is not in the archive")
})

await test("UTIL-033", "The 404 page works without JavaScript", async (check) => {
  check(![...notFoundHtml.matchAll(/<script\b/gi)].length, "the 404 page ships a script")
  check(!/\son[a-z]+=/i.test(notFoundHtml), "the 404 page has an inline event handler")
  const main = inNotFound.find((el) => el.tag === "main")
  check(elements(main).filter((el) => el.tag === "a").every((a) => a.attrs.href?.startsWith("/")), "a recovery link is not a plain anchor")
  check(textOf(main).includes("Start again from Home"), "the way back is missing from the HTML")
})

// --- Regression and security ---------------------------------------------------------------------------------------

await test("UTIL-034", "All eleven top-level tabs remain intact", async (check) => {
  check(json(siteNavigation.sections.map((s) => s.label)) === json(["Home", "About", "Contact", "Schedule", "Portfolio", "CV", "Lab", "Blog", "Lecture Notes", "Writing", "Bearnard's Area"]), "the tabs or their order changed")
  check(!siteNavigation.nodes.has("downloads") && !siteNavigation.nodes.has("404") && !siteNavigation.nodes.has("external"), "a new or removed tab is in the registry")
})

await test("UTIL-035", "All twenty-five child destinations remain intact", async (check) => {
  const counts = Object.fromEntries(["cv", "lab", "lecture-notes", "writing", "bearnards-area"].map((id) => [id, siteNavigation.node(id).children.length]))
  check(json(counts) === json({ cv: 8, lab: 6, "lecture-notes": 4, writing: 3, "bearnards-area": 4 }), json(counts))
  check(siteNavigation.nodes.size === 36, `${siteNavigation.nodes.size} folders`)
})

await test("UTIL-036", "P17 content states remain functional", async (check) => {
  const rows = coverage(siteNavigation, pageFacts({}, siteRecordViews()))
  const counts = summarize(rows)
  check(counts.total === 36 && counts.ready + counts.empty + counts.preparation + counts.unavailable === 36, json(counts))
  check(rows.find((r) => r.id === "contact").source === "contact", "Contact is not a contact-source page")
  const stated = await Promise.all(rows.map(async (r) => /data-page-state="/.test(await readHtml(join(dist, r.path.slice(1), "index.html")))))
  check(stated.every(Boolean), "a registered page lost its data-page-state")
})

await test("UTIL-037", "The P15 homepage is unchanged", async (check) => {
  const touched = changedSinceBase(["src/components/home/HomePage.astro", "src/components/home/HomeWelcome.astro", "src/components/home/ArchiveExplorer.astro", "src/components/home/NucleusStage.astro", "src/components/home/RecentUpdates.astro", "src/home/archive.ts", "src/home/updates.ts", "src/styles/home.css"])
  check(touched.length === 0, `P18 changed the homepage: ${json(touched)}`)
})

await test("UTIL-038", "The P16 world clocks remain functional", async (check) => {
  const touched = changedSinceBase(["src/components/home/WorldClocks.astro", "src/home/clocks.ts", "src/home/clock-time.ts", "src/home/clock-loop.ts", "src/scripts/world-clocks.ts"])
  check(touched.length === 0, `P18 changed the clocks: ${json(touched)}`)
  const home = await readHtml(join(dist, "index.html"))
  const ids = [...home.matchAll(/data-clock-id="([^"]+)"/g)].map((m) => m[1])
  check(json(ids) === json(CLOCK_LOCATIONS.map((c) => c.id)), `clocks: ${json(ids)}`)
})

for (const [id, title, paths] of [
  ["UTIL-039", "The P14 authoring workflow is intact", ["src/editorial/authoring.ts", "scripts/content.mjs", "scripts/content-lib.mjs", "src/design/publishing/workbench.ts", "src/design/publishing/draft-example.md", "src/design/publishing/workflow-transcript.txt"]],
  ["UTIL-040", "The P13 Quarto integration is intact", ["scripts/science.mjs", "scripts/science-html.mjs", "science", "src/science", "src/demos/greenhouse", "src/demos/science", "src/demos/assets"]],
  ["UTIL-041", "The P12 editorial layouts are intact", ["src/components/editorial", "src/styles/editorial.css", "src/editorial/reading.ts", "src/editorial/model.ts", "src/editorial/collections.ts", "src/editorial/schema.ts", "src/content", "src/content.config.ts"]],
  ["UTIL-042", "The P11 canonical records are intact", ["src/records", "src/data/records", "src/data/cv"]],
  ["UTIL-043", "The versioned CV source files are untouched", ["cv"]],
  ["UTIL-044", "The Bearnard masters and registry are unchanged", ["brand", "public/illustrations", "src/illustrations", "src/components/bearnard", "assets/bearnard", "scripts/bearnard_derivatives.py"]],
  ["UTIL-045", "The five Chromatic Archive palettes are unchanged", ["src/styles/categories.css", "src/styles/tokens.css", "src/styles/environments.css", "src/design/contract.mjs"]],
  ["UTIL-049", "The physical folders, navigation and FolderPage are unchanged", ["src/navigation", "src/components/folders", "src/styles/folders.css", "src/scripts/folder-previews.ts", "src/scripts/folder-rows.ts", "src/styles/view-transitions.css", "src/layouts/FolderPage.astro", "src/layouts/BaseLayout.astro"]],
]) {
  await test(id, title, async (check) => {
    const touched = changedSinceBase(paths)
    check(touched.length === 0, `P18 changed protected files: ${json(touched)}`)
  })
}

await test("UTIL-046", "Development diagnostics are absent from the public output", async (check) => {
  for (const path of ["_design/site-map", "_design/page-states", "_design/downloads", "_design/contact", "_design/publishing", "_design/home", "_design/world-clocks", "demo-assets", "demo-downloads"])
    check(!existsSync(join(dist, path)), `dist/${path} exists`)
  const issues = await publicBuildIssues(dist)
  check(issues.length === 0, `traces: ${json(issues.slice(0, 5))}`)
  const all = (await Promise.all((await listFiles(dist)).filter((f) => f.endsWith(".html") && !f.includes("/_design/")).map((f) => readFile(f, "utf8")))).join("\n")
  check(!/Site Map &amp; Page Coverage|data-site-map|route generated|specimen|a missing URL to see/i.test(all), "a development note is in the public pages")
  check(!/\/Users\/|src\/[a-z-]+\/[\w.[\]-]+\.(ts|astro|mjs)/.test(all), "a development file path is in the public pages")
  check(DEV_PAGES.some((p) => p.href === DOWNLOADS_PAGE) && DEV_PAGES.some((p) => p.href === CONTACT_PAGE), "a specimen is not in the development list")
})

await test("UTIL-047", "No unexpected script, dependency or external form dependency was introduced", async (check) => {
  const files = await listFiles(dist)
  const pages = files.filter((f) => f.endsWith(".html") && !f.includes("/_design/"))
  for (const file of pages) {
    const html = await readFile(file, "utf8")
    // A canonical address (P24, D-163) names the page itself and loads nothing; every other absolute <link> still fails.
    const loaded = html.replace(/<link rel="canonical" href="https:\/\/www\.gusmaolab\.org\/[^"]*">/g, "")
    check(!/<form\b|<iframe\b|<script[^>]+src="https?:|<link[^>]+href="https?:/i.test(loaded), `${file.replace(dist, "")}: a form, frame or external script/stylesheet`)
  }
  if (gitAvailable) {
    const before = git("show", `${BASE}:package.json`).stdout
    const now = JSON.parse(await read("package.json"))
    const then = JSON.parse(before)
    // P19 (D-130) added Three.js and its types, and nothing else; tests/nucleus.mjs (NUC-047) holds that.
    const withoutThree = (d) => json(Object.fromEntries(Object.entries(d).filter(([k]) => k !== "three" && k !== "@types/three")))
    // P22 (D-154) added axe-core, a test-only dependency, pinned exactly, and nothing else.
    const withoutAxe = (d) => json(Object.fromEntries(Object.entries(d).filter(([k]) => k !== "axe-core")))
    check(withoutThree(now.dependencies) === withoutThree(then.dependencies) && withoutAxe(now.devDependencies) === withoutAxe(then.devDependencies), "a dependency changed")
  }
  const clientSources = (await Promise.all(["src/scripts/world-clocks.ts", "src/scripts/folder-previews.ts", "src/scripts/folder-rows.ts"].map(read))).join("\n")
  check(!/downloads|contact/i.test(clientSources), "a client script handles downloads or contact")
  const scriptsAdded = (await readdir(join(repo, "src/scripts"))).sort()
  // P19 added the development specimen's own script (D-136): no page of the release loads it. P20 added
  // the homepage nucleus's (D-139): Home only. P21 added the Schedule page's (loaded only when scheduling
  // is ready, D-147) and the scheduling specimen's (development only, D-150).
  check(json(scriptsAdded) === json(["folder-previews.ts", "folder-rows.ts", "home-nucleus.ts", "nucleus-specimen.ts", "schedule-embed.ts", "scheduling-specimen.ts", "world-clocks.ts"]), `src/scripts holds ${json(scriptsAdded)}`)
})

await test("UTIL-048", "The build succeeds without any approved downloadable CV", async (check) => {
  check(CV_SNAPSHOT === null && DOWNLOADS.length === 0, "the test needs a build with no CV and no approved download")
  check((await distIssues(dist)).length === 0 && existsSync(join(dist, "cv/index.html")) && existsSync(join(dist, "404.html")), "the build lacks its pages")
  check(/Curriculum vitae \(PDF\)/.test(cvHtml) && /Not yet available/.test(cvHtml), "the CV page does not say the CV document is not yet available")
  check(siteRecords !== undefined, "the records failed to load")
})

await test("UTIL-050", "The new folders are tracked by git, and an approved download would be too", async (check) => {
  // The Python template's `downloads/` rule in .gitignore would hide every folder of that name: a file in
  // public/downloads/ would never be committed, built on a clean checkout or deployed.
  for (const path of ["src/downloads/registry.ts", "src/components/downloads/DownloadList.astro", "src/pages/[design]/downloads/index.astro", "src/demos/downloads/synthetic-sample-notes.txt", "public/downloads/an-approved-file.pdf"])
    check(git("check-ignore", "-q", path).status === 1, `${path} is ignored by git`)
  check(git("check-ignore", "-q", "build/x").status === 0, "the template's other rules were removed")
})

// --- Cleanup and report ---------------------------------------------------------------------------------------------

hosting.close()
await rm(holder, { recursive: true, force: true })

let failed = 0
for (const { id, title, failures } of results) {
  if (failures.length === 0) console.log(`PASS ${id} ${title}`)
  else {
    failed++
    console.log(`FAIL ${id} ${title}`)
    for (const message of failures.slice(0, 8)) console.log(`  - ${message}`)
  }
}
console.log(failed === 0 ? `\n${results.length} checks passed.` : `\n${failed} of ${results.length} checks failed.`)
process.exit(failed === 0 ? 0 : 1)
