// Release checks (P24, D-163 to D-165): REL-001 to REL-056, the ones that can be decided before the production cutover. They read
// the workflows, the release build in dist/ and git, so run `npm run build` first (or `npm run verify`).
//
// Not here, on purpose: REL-013 and REL-014 (a contact address that receives mail: no address is approved yet) and REL-029 to
// REL-039 (hosting, HTTPS, the live 404, the deployment identity, rollback). Those need the real public site after an
// owner-authorized release; scripts/smoke.mjs checks them then, and development/p24-release.md lists them as PENDING LIVE
// VERIFICATION. Passing here is never a claim about the live site. REL-043 to REL-051 and REL-054 are held by the suites that
// own them (home, clocks, nucleus, a11y, content, science, util, QA); this file does not repeat them.
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { cp, mkdtemp, readdir, readFile, rm, unlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { parse as parseYaml } from "yaml"
import { publicBuildIssues } from "../scripts/demo-check.mjs"
import { distIssues } from "../scripts/downloads.mjs"
import { DEFERRALS } from "../scripts/qa-lib.mjs"
import { deriveIcon, readIcon } from "../scripts/favicon.mjs"
import { releaseIssues } from "../scripts/release-check.mjs"
import { validateChannels } from "../src/contact/channels.ts"
import { CONTACT_CHANNELS } from "../src/data/contact.ts"
import { illustrationById, NOT_FOUND_SLOTS } from "../src/illustrations/bearnard.ts"
import { SCHEDULING_CONFIG } from "../src/data/scheduling.ts"
import { siteNavigation } from "../src/navigation/index.ts"

const repo = fileURLToPath(new URL("../", import.meta.url))
const dist = join(repo, "dist")
const P23_BASE = "183b5a4" // the head P23 began from; the palettes and tokens are compared with it
const json = (value) => JSON.stringify(value)
const read = (path) => readFile(join(repo, path), "utf8")
const git = (...args) => spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" })
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

const releaseText = await read(".github/workflows/release.yml")
const release = parseYaml(releaseText)
const qualityText = await read(".github/workflows/quality.yml")
const code = (text) => text.replace(/^\s*#.*$/gm, "")
const workflows = (await readdir(join(repo, ".github/workflows"))).sort()
async function listFiles(dir, base = dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await listFiles(full, base)))
    else out.push(full.slice(base.length + 1))
  }
  return out
}
const files = await listFiles(dist)
const pages = files.filter((f) => f.endsWith(".html"))

// --- Release configuration ----------------------------------------------------------------------------------------

const jobs = release.jobs
const steps = (job) => jobs[job]?.steps ?? []
const allSteps = Object.values(jobs).flatMap((j) => j.steps ?? [])

await test("REL-001", "The production source commit is explicit: a required full SHA, checked, and the only ref any job checks out", async (check) => {
  check(json(Object.keys(release.on)) === json(["workflow_dispatch"]), `triggers: ${json(Object.keys(release.on))}`)
  check(release.on.workflow_dispatch.inputs.commit?.required === true, "the commit input is not required")
  check(/\^\[0-9a-f\]\{40\}\$/.test(releaseText), "the commit is not checked to be a full SHA")
  const checkouts = allSteps.filter((s) => s.uses?.startsWith("actions/checkout"))
  check(checkouts.length === 2 && checkouts.every((s) => s.with?.ref === "${{ inputs.commit }}"), "a job checks out something other than the named commit")
})
await test("REL-002", "History is preserved: main was reconciled by a merge (D-166), and nothing in the release can force-push or rewrite", async (check) => {
  check(!/push\s+(-f|--force)|force_orphan|reset --hard|rebase\b|git push/.test(code(releaseText)), "the release workflow pushes or rewrites history")
  const decisions = await read("development/decisions.md")
  check(/\*\*D-166\.\*\*/.test(decisions) && /58fcc3b/.test(decisions), "the reconciliation of main is not recorded")
  if (git("cat-file", "-e", "58fcc3b").status === 0) check(git("merge-base", "--is-ancestor", "58fcc3b", "HEAD").status === 0, "the reconciliation merge is not in this branch's history")
})
await test("REL-003", "An unexpected divergence blocks the release: the commit must be on main and on development", async (check) => {
  check(/merge-base --is-ancestor "\$COMMIT" origin\/main/.test(releaseText), "no check that the commit is on main")
  check(/merge-base --is-ancestor "\$COMMIT" origin\/development/.test(releaseText), "no check that the commit is on development")
  check(steps("build").find((s) => s.uses?.startsWith("actions/checkout"))?.with?.["fetch-depth"] === 0, "the build checkout has no history to compare")
})
await test("REL-004", "The release publishes the approved source: built and checked from the named commit after its QA passed, deployed as that artifact", async (check) => {
  check(/gh run list[^\n]*--workflow quality\.yml --commit "\$COMMIT"/.test(releaseText), "no check that Quality Assurance passed on the commit")
  const order = steps("build").map((s) => s.run ?? s.uses?.split("@")[0])
  const at = (x) => order.indexOf(x)
  check(at("npm run build") > -1 && at("node scripts/release-check.mjs dist") > at("npm run build") && at("actions/upload-pages-artifact") > at("node scripts/release-check.mjs dist"), `the build job does not build, check, then upload: ${json(order)}`)
  check(steps("build").find((s) => s.uses?.startsWith("actions/upload-pages-artifact"))?.with?.path === "dist/", "the Pages artifact is not dist/")
  check(json(jobs.deploy?.needs) === json("build") && json(jobs.verify?.needs) === json("deploy"), "the jobs are not build, then deploy, then verify")
  check(steps("deploy").length === 1 && steps("deploy")[0].uses?.startsWith("actions/deploy-pages"), "the deploy job does more than deploy the artifact")
  check(!allSteps.some((s) => /npm (ci|run build)|astro build/.test(s.run ?? "") && !steps("build").includes(s)), "a job other than build builds the site")
})
await test("REL-005", "The QA workflow stays independent and non-deploying", async (check) => {
  check(!/deploy|pages:|gh-pages|upload-pages-artifact|publish|release|git push|environment:|secrets\./i.test(code(qualityText)), "quality.yml deploys or uses a secret")
  check(!("push" in release.on) && !("pull_request" in release.on) && !("schedule" in release.on), "the release workflow runs on its own")
})
await test("REL-006", "Production deployment needs explicit authorization: manual dispatch, a typed confirmation, and the github-pages environment", async (check) => {
  check(release.on.workflow_dispatch.inputs.confirm?.required === true && /\$CONFIRM" = "www\.gusmaolab\.org"/.test(releaseText), "no typed confirmation of the destination")
  check(jobs.deploy?.environment?.name === "github-pages", "the deploy job is not in the github-pages environment")
  check(jobs.build?.environment === undefined && jobs.verify?.environment === undefined, "a job other than deploy holds the environment")
})
await test("REL-007", "One repository, one deployment: GitHub Pages' own, and nothing of the legacy pipeline", async (check) => {
  check(json(workflows) === json(["quality.yml", "release.yml"]), `workflows: ${json(workflows)}`)
  for (const file of workflows) check(!/pelican|peaceiris|force_orphan|external_repository|eduardogade\.github\.io|PAGES_DEPLOY_(TOKEN|KEY)|ssh-keyscan|deploy key/i.test(code(await read(`.github/workflows/${file}`))), `${file} names the legacy deployment`)
  check(!existsSync(join(repo, "_backup")) && !existsSync(join(repo, ".gitmodules")), "the Pelican archive or its submodule is still in the tree (D-168)")
})
await test("REL-008", "Workflow permissions are minimal, and no secret is used", async (check) => {
  check(json(release.permissions) === json({ contents: "read" }), `release permissions: ${json(release.permissions)}`)
  check(json(jobs.build?.permissions) === json({ contents: "read", actions: "read" }), "the build job widens its permissions beyond reading runs")
  check(json(jobs.deploy?.permissions) === json({ pages: "write", "id-token": "write" }), `deploy permissions: ${json(jobs.deploy?.permissions)}`)
  check(json(jobs.verify?.permissions) === json({ contents: "read" }), `verify permissions: ${json(jobs.verify?.permissions)}`)
  for (const step of allSteps.filter((s) => s.uses?.startsWith("actions/checkout"))) check(step.with?.["persist-credentials"] === false, "a checkout keeps its credentials")
  check(!/secrets\./.test(code(releaseText)), "the release workflow reads a secret")
})
await test("REL-009", "Every action in every workflow is pinned to a full commit SHA, with its version in a comment", async (check) => {
  for (const file of workflows) {
    const lines = (await read(`.github/workflows/${file}`)).split("\n").filter((l) => /^\s*-?\s*uses:/.test(l))
    check(lines.length > 0, `${file} uses no action`)
    for (const line of lines) check(/uses: actions\/(checkout|setup-node|upload-artifact|download-artifact|upload-pages-artifact|deploy-pages)@[0-9a-f]{40} # v\d+\.\d+\.\d+$/.test(line), `${file}: ${line.trim()}`)
  }
})
await test("REL-010", "No secret, private file or development page is in the release build", async (check) => {
  const issues = [...(await releaseIssues(dist)), ...(await publicBuildIssues(dist)), ...(await distIssues(dist))]
  check(issues.length === 0, json(issues.slice(0, 5)))
})

// --- Contact and branding -----------------------------------------------------------------------------------------

/** The nine profiles the owner approved for the first release (D-164); P24A confirms they are the whole of Contact. */
const PROFILES = ["linkedin", "orcid", "google-scholar", "researchgate", "github", "dev-to", "medium", "instagram", "facebook"]

await test("REL-011", "The contact configuration is valid", async (check) => {
  check(validateChannels(CONTACT_CHANNELS).length === 0, json(validateChannels(CONTACT_CHANNELS)))
})
await test("REL-012", "Contact is exactly the nine approved profiles: no email, no telephone, no invented channel (D-164, P24A)", async (check) => {
  check(json(CONTACT_CHANNELS.map((c) => c.id).sort()) === json([...PROFILES].sort()), `channels: ${json(CONTACT_CHANNELS.map((c) => c.id))}`)
  check(CONTACT_CHANNELS.every((c) => c.kind === "profile" && /^\d{4}-\d{2}-\d{2}$/.test(c.approvedOn)), "a channel is not an approved profile")
  check(!CONTACT_CHANNELS.some((c) => /mailto:|@[a-z0-9-]+\.[a-z]|whatsapp|wa\.me|\+\d{2}/i.test(c.destination) && !/medium\.com\/@/.test(c.destination)), "an email address, a telephone number or WhatsApp is published")
})
await test("REL-013", "The Contact page shows all nine as working external links, without a script", async (check) => {
  const html = await readFile(join(dist, "contact/index.html"), "utf8")
  for (const channel of CONTACT_CHANNELS) {
    const href = channel.destination.replace(/&/g, "&amp;")
    check(html.includes(`href="${href}"`) && new RegExp(`data-channel="${channel.id}"`).test(html), `${channel.id} is not a link on the page`)
  }
  check((html.match(/Opens an external site\./g) ?? []).length === CONTACT_CHANNELS.length, "an external link does not say it leaves the site")
  check(!/mailto:|<form\b/.test(html), "the Contact page advertises an email address or has a form")
})
await test("REL-015", "Schedule's fallback reaches Contact", async (check) => {
  const html = await readFile(join(dist, "schedule/index.html"), "utf8")
  check(/href="\/contact\/"/.test(html), "the Schedule page does not link to Contact")
})
await test("REL-016", "The favicon's one source is the owner's brand/favicon.ico, and the site serves its exact 16/32/48 px derivative", async (check) => {
  const source = await readFile(join(repo, "brand/favicon.ico"))
  const hash = createHash("sha256").update(source).digest("hex")
  check(hash === "0070d90ee229ff394dea8bdf7e02db99e0e4f1a3d90754c855e6c3c1a5b57eaf", `brand/favicon.ico is not the owner's file (sha256 ${hash})`)
  const derived = deriveIcon(source)
  check((await readFile(join(repo, "public/favicon.ico"))).equals(derived), "public/favicon.ico is not the derivative of brand/favicon.ico (run `npm run favicon`)")
  check(files.includes("favicon.ico") && (await readFile(join(dist, "favicon.ico"))).equals(derived), "the build does not serve the derivative")
  const sourceImages = new Map(readIcon(source).map((i) => [i.width, i.data]))
  check(readIcon(derived).every((i) => sourceImages.get(i.width)?.equals(i.data)), "an image of the derivative differs from the owner's")
})
await test("REL-017", "Every page names the favicon, and nothing names another icon", async (check) => {
  for (const file of pages) {
    const html = await readFile(join(dist, file), "utf8")
    const icons = [...html.matchAll(/<link rel="(?:icon|shortcut icon|apple-touch-icon)"[^>]*>/g)].map((m) => m[0])
    check(icons.length === 1 && /href="\/favicon\.ico"/.test(icons[0]) && /sizes="16x16 32x32 48x48"/.test(icons[0]), `${file}: ${json(icons)}`)
  }
})
await test("REL-018", "The 404 page says plainly what happened, shows Bearnard from one of the registry's three 404 slots, and links back", async (check) => {
  const html = await readFile(join(dist, "404.html"), "utf8")
  check(/<h1[^>]*>This page isn&#39;t in the archive\.<\/h1>|<h1[^>]*>This page isn't in the archive\.<\/h1>/.test(html), "the heading does not say the page is not in the archive")
  check(/Bearnard checked every folder/.test(html), "the 404 page has no Bearnard line")
  // D-169: three slots, each an inert <template> holding one approved illustration, and a <noscript> showing the first.
  check(NOT_FOUND_SLOTS.length === 3 && NOT_FOUND_SLOTS.every((id) => illustrationById(id) !== undefined), `the slots are not three approved illustrations: ${json(NOT_FOUND_SLOTS)}`)
  const slots = [...html.matchAll(/<template data-not-found-slot="(\d)"[^>]*>([\s\S]*?)<\/template>/g)]
  check(json(slots.map((m) => m[1])) === json(["0", "1", "2"]), `the page holds the slots ${json(slots.map((m) => m[1]))}`)
  const fallback = /<noscript>([\s\S]*?)<\/noscript>/.exec(html)?.[1]
  const shown = [...slots.map((m) => m[2]), fallback ?? ""].map((part) => /<img\b[^>]*class="gl-bearnard[^"]*"[^>]*>/.exec(part)?.[0])
  check(shown.every((img, i) => img !== undefined && img.includes(`data-illustration="${NOT_FOUND_SLOTS[i] ?? NOT_FOUND_SLOTS[0]}"`)), "a slot or the fallback does not show its registered illustration")
  for (const img of shown.filter(Boolean)) {
    // An empty alt (decorative: the text names Bearnard) is written as a bare `alt`, which HTML reads as alt="".
    check(/\salt(?:="")?(?=[\s>])/.test(img) && /class="gl-bearnard decorative"/.test(img), `not a decorative Bearnard illustration: ${img.slice(0, 80)}`)
    const src = /src="([^"]+)"/.exec(img)?.[1]
    check(src !== undefined && files.includes(src.slice(1)), `the illustration ${src} is not in the build`)
  }
  check(/href="\/"/.test(html) && /Start again from Home/.test(html), "no way back to Home")
  // The one script is the inline choice of a slot: no file, no request, no storage, no timer, no handler.
  const scripts = [...html.replace(/<script type="application\/ld\+json"[\s\S]*?<\/script>/g, "").matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  check(scripts.length === 1 && scripts[0][1] === "" && /Math\.random\(\)/.test(scripts[0][2]) && /replaceChildren/.test(scripts[0][2]), `the 404 page's scripts: ${json(scripts.map((m) => m[0].slice(0, 60)))}`)
  check(scripts.every((m) => !/fetch|XMLHttpRequest|Storage|cookie|setTimeout|setInterval|requestAnimationFrame|import|history|location/.test(m[2])), "the 404 script does more than choose a slot")
})
await test("REL-019", "Only approved brand imagery is published: the favicon and the committed Bearnard derivatives", async (check) => {
  const images = files.filter((f) => /\.(png|jpe?g|webp|avif|gif|ico)$/i.test(f))
  for (const image of images) check(image === "favicon.ico" || (image.startsWith("illustrations/bearnard/") && git("ls-files", "--error-unmatch", `public/${image}`).status === 0), `${image} is not an approved image`)
})

// --- Metadata and discoverability ---------------------------------------------------------------------------------

await test("REL-020", "Public canonical URLs are valid, and one host states them all", async (check) => {
  const hosts = new Set()
  for (const file of pages.filter((f) => f !== "404.html")) {
    const canonical = /<link rel="canonical" href="([^"]+)">/.exec(await readFile(join(dist, file), "utf8"))?.[1]
    check(canonical !== undefined, `${file}: no canonical`)
    if (canonical !== undefined) hosts.add(new URL(canonical).origin)
  }
  check(json([...hosts]) === json(["https://www.gusmaolab.org"]), `canonical origins: ${json([...hosts])}`)
  check(!/<link rel="canonical"/.test(await readFile(join(dist, "404.html"), "utf8")), "the 404 page states a canonical address")
})
await test("REL-023", "The sitemap lists Home and the ready pages only, all built, and the robots file names it", async (check) => {
  const xml = await readFile(join(dist, "sitemap.xml"), "utf8")
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
  check(locs.includes("/") && locs.every((p) => files.includes(`${p.slice(1)}index.html`)), `sitemap: ${json(locs)}`)
  for (const p of locs.filter((p) => p !== "/")) {
    const html = await readFile(join(dist, `${p.slice(1)}index.html`), "utf8")
    const state = /data-page-state="([a-z]+)"/.exec(html)?.[1]
    check(state === "ready" || /data-editorial-status="(published|archived)"/.test(html), `${p} is in the sitemap but is ${state ?? "not a page with a state"}`)
  }
  check(/^Sitemap: https:\/\/www\.gusmaolab\.org\/sitemap\.xml$/m.test(await readFile(join(dist, "robots.txt"), "utf8")), "robots.txt does not name the sitemap")
})
await test("REL-024", "The release checks catch what they claim to (controlled defects in a throwaway copy of the build)", async (check) => {
  const copy = await mkdtemp(join(tmpdir(), "gusmaolab-release-"))
  try {
    await cp(dist, copy, { recursive: true })
    check((await releaseIssues(copy)).length === 0, "the unmodified copy fails")
    const defects = [
      ["a wrong canonical", "about/index.html", (t) => t.replace(/(<link rel="canonical" href=")[^"]+/, "$1https://gusmaolab.org/about/")],
      ["a credential", "index.html", (t) => t.replace("</body>", `<!-- ghp_${"a".repeat(36)} --></body>`)],
      ["a development page in the sitemap", "sitemap.xml", (t) => t.replace("</urlset>", "  <url><loc>https://www.gusmaolab.org/_design/</loc></url>\n</urlset>")],
      ["a local address", "contact/index.html", (t) => t.replace("</body>", '<a href="http://localhost:4321/">x</a></body>')],
    ]
    for (const [name, file, edit] of defects) {
      const original = await readFile(join(copy, file), "utf8")
      await writeFile(join(copy, file), edit(original))
      check((await releaseIssues(copy)).length > 0, `${name} is not detected`)
      await writeFile(join(copy, file), original)
    }
    await writeFile(join(copy, "_astro/x.js.map"), "{}")
    check((await releaseIssues(copy)).some((i) => i.includes("x.js.map")), "a source map is not detected")
    await unlink(join(copy, "_astro/x.js.map"))
    const icon = await readFile(join(copy, "favicon.ico"))
    await unlink(join(copy, "favicon.ico"))
    check((await releaseIssues(copy)).some((i) => i.includes("favicon")), "a missing favicon is not detected")
    await writeFile(join(copy, "favicon.ico"), icon)
    await writeFile(join(copy, "CNAME"), "www.gusmaolab.org\n")
    check((await releaseIssues(copy)).some((i) => i.includes("CNAME")), "a leftover CNAME file is not detected")
    await unlink(join(copy, "CNAME"))
    check((await releaseIssues(copy)).length === 0, "restoring the copy does not restore a clean result")
  } finally {
    await rm(copy, { recursive: true, force: true })
  }
})

// --- Functional preservation --------------------------------------------------------------------------------------

await test("REL-040", "Eleven top-level tabs remain (Home and ten sections)", async (check) => {
  check(siteNavigation.folderStaticPaths(1).length === 10 && siteNavigation.nodes.size === 36, `${siteNavigation.folderStaticPaths(1).length} sections, ${siteNavigation.nodes.size} nodes`)
})
await test("REL-041", "Twenty-five child destinations remain", async (check) => {
  check(siteNavigation.folderStaticPaths(2).length === 25 && siteNavigation.folderStaticPaths(3).length === 0, `${siteNavigation.folderStaticPaths(2).length} children`)
})
await test("REL-042", "The five palettes and the tokens are unchanged since P23 began", async (check) => {
  if (git("cat-file", "-e", P23_BASE).status !== 0) return
  const changed = git("diff", "--name-only", P23_BASE, "--", "src/styles/categories.css", "src/styles/tokens.css", "src/styles/environments.css", "src/design/contract.mjs").stdout.trim()
  check(changed === "", `changed: ${changed}`)
})
await test("REL-048", "The skip link and its focusable target (D-162) are in every page", async (check) => {
  for (const file of pages) {
    const html = await readFile(join(dist, file), "utf8")
    check(/<a class="gl-skip-link" href="#content">/.test(html) && /<main id="content"[^>]*tabindex="-1"/.test(html), `${file}: no skip link or target`)
  }
})
await test("REL-052", "Cal.com stays disabled, and no page loads it", async (check) => {
  check(SCHEDULING_CONFIG.enabled === false, "scheduling is enabled")
  for (const file of pages) check(!/cal\.com\/embed|app\.cal\.com/.test(await readFile(join(dist, file), "utf8")), `${file} loads the provider`)
})
await test("REL-053", "The nineteen scheduling checks remain deferred by the owner's decision", async (check) => {
  check(Object.keys(DEFERRALS).length === 19 && Object.keys(DEFERRALS).every((id) => id.startsWith("SCH-")), `${Object.keys(DEFERRALS).length} deferrals`)
})
await test("REL-055", "The Bearnard masters stay private: ignored, untracked, never in the build", async (check) => {
  check(git("check-ignore", "-q", "brand/bearnard/bearnard_v1.3.png").status === 0, "brand/bearnard/ is not ignored")
  check(git("ls-files", "brand/bearnard").stdout.trim() === "", "a master is tracked")
  check(!files.some((f) => /bearnard_v\d|bearnard-favicon-full|brand\//.test(f)), "a master is in the build")
  // P24A (D-168): the owner's full-size image sits with the masters, ignored, and the inventory lists it.
  check(git("check-ignore", "-q", "brand/bearnard/bearnard-favicon-full.png").status === 0, "the full-size Bearnard image is not with the ignored masters")
  check(/^brand\/bearnard\/bearnard-favicon-full\.png,.*,unclassified,/m.test(await read("assets/bearnard/inventory.csv")), "the inventory does not list the full-size Bearnard image")
  check(git("status", "--porcelain", "--", "brand").stdout.trim() === "" || git("status", "--porcelain", "--", "brand").stdout.trim().split("\n").every((l) => / brand\/favicon\.ico$/.test(l)), "something untracked or changed is under brand/")
})
await test("REL-056", "The private CV sources stay private: ignored, untracked on this branch, never in the build", async (check) => {
  check(git("check-ignore", "-q", "cv/codex-yaml/CV.proposta.yaml").status === 0, "cv/codex-yaml/ is not ignored")
  check(git("ls-files", "cv/codex-yaml").stdout.trim() === "", "a private CV file is tracked on this branch")
  check(!files.some((f) => /\.(ya?ml|docx?)$|codex-yaml|CV\./i.test(f)), "a CV source is in the build")
})

// --- Report -------------------------------------------------------------------------------------------------------

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
