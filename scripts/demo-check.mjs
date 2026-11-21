// What separates a demonstration build from the release build (P13-A01, D-105).
//
// A demonstration (src/demos/) is a synthetic Greenhouse article that exercises the real
// components so the owner can see a feature working. It is never public content, so two
// facts are checked on built output rather than assumed:
//
//   publicBuildIssues(dist)  the release build holds no trace of any demonstration
//   demoBuildIssues(dist)    the demonstration build holds every demonstration, labelled
//
// Both read what the build wrote, not what the code means to do. `npm run build` runs the first
// on its own output (scripts/public-build.mjs); `npm run demo:verify` runs the second.
import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { parseDocument } from "yaml"
import { collectionById } from "../src/editorial/collections.ts"
import { collectionPrefix } from "../src/editorial/collections.ts"

export const ROOT = fileURLToPath(new URL("../", import.meta.url))
export const DEMO_DIR = "src/demos/greenhouse"
export const DEMO_OUT = "dist-demo"
const TEXT = /\.(html|xml|json|txt|js|mjs|css|svg|map|webmanifest|rss|atom)$/
/** Words only a demonstration page carries. */
export const MARKERS = [
  "data-demo-notice",
  "data-demo-section",
  "Development demonstration",
  "Development Demonstrations",
  "demo-assets",
  // The Publishing Workbench (P14, D-110) is part of the same development-only set.
  "data-publishing-workbench",
  "data-workbench-link",
  "Publishing Workbench",
  // The homepage specimen (P15, D-117): the real homepage with synthetic Blog posts.
  "data-home-specimen",
  "Development specimen",
  // The world-clocks specimen (P16, D-121): the real clocks drawn for simulated instants.
  "data-clocks-specimen",
  "data-clocks-simulated",
  "data-clocks-scenario",
  "Simulated instant",
  // The development site map (P17, D-124): every folder and its state, with route diagnostics.
  "data-site-map",
  "Page Coverage",
  // The downloads and contact specimens (P18, D-126, D-127) and their synthetic files.
  "data-downloads-specimen",
  "data-contact-specimen",
  "demo-downloads",
  "synthetic-sample",
  "Synthetic sample",
  // The 3D nucleus prototype (P19, D-136) and the graphics engine it alone loads: a release build
  // contains neither (P20 integrates the approved nucleus and revises this list on purpose).
  "data-nucleus-specimen",
  "data-nucleus-lab",
  "data-nucleus-figure",
  "3D Nucleus Prototype",
  "WebGLRenderer",
]

/** The demonstrations the repository has: their file, slug and title, from their own front matter. */
export async function demonstrations(root = ROOT) {
  const folder = join(root, DEMO_DIR)
  const found = []
  for (const file of existsSync(folder) ? (await readdir(folder)).sort() : []) {
    if (!file.endsWith(".md")) continue
    const text = await readFile(join(folder, file), "utf8")
    const match = /^---\n([\s\S]*?)\n---/.exec(text)
    const data = match ? (parseDocument(match[1]).toJS() ?? {}) : {}
    found.push({ file, slug: String(data.slug ?? ""), title: String(data.title ?? "") })
  }
  return found
}

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(path)))
    else out.push(path)
  }
  return out.sort()
}

const greenhousePath = () => collectionPrefix(collectionById("greenhouse"))

/** Every trace of a demonstration in a built folder. Empty means the folder is clean. */
export async function publicBuildIssues(dist, root = ROOT) {
  if (!existsSync(dist))
    return [`${relative(root, dist)} does not exist: nothing was built`]
  const demos = await demonstrations(root)
  const issues = []
  const files = await walk(dist)
  if (files.length === 0) return [`${relative(root, dist)} is empty: nothing was built`]
  for (const file of files) {
    const rel = relative(dist, file)
    for (const demo of demos)
      if (demo.slug && rel.split("/").includes(demo.slug))
        issues.push(`${rel}: a path of the demonstration ${demo.slug}`)
    if (rel.startsWith("demo-assets")) issues.push(`${rel}: a demonstration's figure`)
    if (rel.startsWith("_design/publishing")) issues.push(`${rel}: a Publishing Workbench page`)
    if (rel.startsWith("_design/home")) issues.push(`${rel}: the homepage specimen`)
    if (rel.startsWith("_design/site-map")) issues.push(`${rel}: the development site map`)
    if (rel.startsWith("_design/downloads")) issues.push(`${rel}: the downloads specimen`)
    if (rel.startsWith("_design/contact")) issues.push(`${rel}: the contact specimen`)
    if (rel.startsWith("demo-downloads")) issues.push(`${rel}: a demonstration download`)
    if (rel.startsWith("_design/nucleus")) issues.push(`${rel}: the 3D nucleus prototype`)
    if (rel.startsWith("_design/page-states")) issues.push(`${rel}: the page-states specimen`)
    if (!TEXT.test(file)) continue
    const text = await readFile(file, "utf8")
    // A stylesheet may style the demonstration markup (the rule is shared), so markers are not
    // searched in CSS; a demonstration's own slug or title would be, wherever it appears.
    for (const needle of [
      ...(file.endsWith(".css") ? [] : MARKERS),
      ...demos.flatMap((d) => [d.slug, d.title].filter((v) => v !== "")),
    ])
      if (text.includes(needle)) issues.push(`${rel}: contains "${needle}"`)
  }
  return issues
}

/** What a demonstration build must hold: every demonstration, as a labelled page, and its figures. */
export async function demoBuildIssues(dist, root = ROOT) {
  if (!existsSync(dist))
    return [`${relative(root, dist)} does not exist: run npm run demo:build`]
  const demos = await demonstrations(root)
  const issues = []
  if (demos.length === 0)
    return ["there are no demonstrations in src/demos/greenhouse/"]
  const prefix = greenhousePath()
  const overview = join(dist, prefix, "index.html")
  const overviewText = existsSync(overview) ? await readFile(overview, "utf8") : ""
  if (!overviewText.includes("data-demo-section"))
    issues.push(`${prefix}: the Greenhouse Overview has no demonstrations section`)
  for (const demo of demos) {
    const page = join(dist, prefix, demo.slug, "index.html")
    if (!existsSync(page)) {
      issues.push(`${prefix}${demo.slug}/: no page`)
      continue
    }
    const text = await readFile(page, "utf8")
    if (!text.includes("data-demo-notice"))
      issues.push(`${prefix}${demo.slug}/: no "synthetic content" notice`)
    if (!overviewText.includes(`${prefix}${demo.slug}/`))
      issues.push(`the Overview does not link to ${prefix}${demo.slug}/`)
    for (const [, src] of text.matchAll(/<img[^>]*\ssrc="([^"]+)"/g))
      if (src.startsWith("/demo-assets/") && !existsSync(join(dist, src)))
        issues.push(`${prefix}${demo.slug}/: the figure ${src} is not in the build`)
  }
  return issues
}

/**
 * The environment a release build runs in: production, and none of the variables that can switch
 * Astro's mode from outside (a stale `MODE` in a shell overrides `--mode`; NODE_ENV=development is
 * what a dev session leaves behind). The demonstrations also require Astro's mode itself to be
 * "development" or "demo" (src/editorial/demo.ts), so this is the second of three guards; the
 * third is the search of the output (publicBuildIssues).
 */
export function releaseEnvironment(base) {
  const env = { ...base, NODE_ENV: "production", ASTRO_TELEMETRY_DISABLED: "1" }
  for (const key of ["MODE", "ASTRO_MODE", "VITE_MODE"]) delete env[key]
  return env
}
