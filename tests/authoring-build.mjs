// What the authoring workflow produces in real builds (P14, D-107 to D-111): AUTH-024, AUTH-025,
// AUTH-026, AUTH-035 and AUTH-044, and the built half of AUTH-032 and AUTH-033.
//
// The unit of work is a build of a throwaway copy of the project (as tests/editorial-build.mjs does):
// the real src/content/ and science/ hold no articles and are never written. In the copy, the real
// commands (scripts/content.mjs) create synthetic articles and move them through the lifecycle:
//
//   a published berry, an archived blog post, a published Quarto article        -> pages
//   a draft Greenhouse article, a draft Quarto lesson (each with a marker text)  -> no trace
//
// Two builds of that copy: the release build (`astro build --mode production`, the environment
// `npm run build` uses), which must hold the three pages, none of the drafts, and no workbench; and
// a demonstration build (`--mode demo`), which must hold the Publishing Workbench, linked from the
// Greenhouse Overview, quoting every command. Quarto is needed for the Quarto articles; without it
// those parts are SKIPPED, not passed.
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { cp, mkdtemp, readFile, readdir, realpath, rm, symlink, unlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { COMMANDS } from "../src/editorial/authoring.ts"
import { MARKERS, publicBuildIssues, releaseEnvironment } from "../scripts/demo-check.mjs"
import { toolchain } from "../scripts/science.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const script = join(repo, "scripts/content.mjs")
const quarto = toolchain().quarto !== null
const json = (v) => JSON.stringify(v)
const DRAFT_MARKER = "UNPUBLISHED-DRAFT-TEXT-7731"
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

async function listFiles(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await listFiles(path)))
    else out.push(path)
  }
  return out
}
async function snapshot(dir) {
  const files = new Map()
  for (const file of (await listFiles(dir)).sort())
    files.set(relative(dir, file), await readFile(file))
  return files
}

const cli = (root, command, ...args) => {
  const run = spawnSync(process.execPath, [script, command, "--root", root, ...args], {
    encoding: "utf8",
  })
  if (run.status !== 0) throw new Error(`content:${command} ${args.join(" ")} failed:\n${run.stdout}${run.stderr}`)
  return run.stdout
}

/** Makes the throwaway project and the synthetic articles, with the real commands. */
async function makeProject() {
  const root = await mkdtemp(join(await realpath(tmpdir()), "gusmaolab-authoring-build-"))
  for (const item of ["src", "public", "science", "astro.config.mjs", "tsconfig.json", "package.json"])
    await cp(join(repo, item), join(root, item), {
      recursive: true,
      filter: (path) => !/science\/(_build|\.quarto)/.test(path),
    })
  await symlink(join(repo, "node_modules"), join(root, "node_modules"), "dir")
  const ready = async (collection, title, extra = [], marker = "") => {
    const out = cli(root, "new", "--collection", collection, "--title", title, ...extra)
    const file = /^Source:\s+(\S+)/m.exec(out)[1]
    const slug = /^Slug:\s+(\S+)/m.exec(out)[1]
    let text = await readFile(join(root, file), "utf8")
    text = text.replace(/^# description:.*$/m, `description: "A synthetic ${collection} description."`)
    text = text.replace(/^<!-- TODO.*-->\n\n?/m, "")
    await writeFile(join(root, file), text + (marker ? `\n${marker}\n` : ""))
    return { slug, file }
  }
  const made = {}
  made.berry = await ready("berries", "Published Berry")
  cli(root, "publish", "--collection", "berries", "--slug", made.berry.slug, "--date", "2026-11-10", "--yes")
  made.post = await ready("blog", "Archived Post")
  cli(root, "publish", "--collection", "blog", "--slug", made.post.slug, "--date", "2026-10-01", "--yes")
  cli(root, "archive", "--collection", "blog", "--slug", made.post.slug, "--yes")
  made.draft = await ready("greenhouse", "A Draft Article", [], DRAFT_MARKER)
  if (quarto) {
    made.quarto = await ready("greenhouse", "Published Quarto", ["--format", "qmd"])
    cli(root, "preview", "--collection", "greenhouse", "--slug", made.quarto.slug, "--refresh", "--port", "1")
    cli(root, "publish", "--collection", "greenhouse", "--slug", made.quarto.slug, "--date", "2026-11-12", "--yes")
    made.lesson = await ready("trail", "Draft Lesson", ["--format", "qmd"], DRAFT_MARKER)
    cli(root, "preview", "--collection", "trail", "--slug", made.lesson.slug, "--refresh", "--port", "1")
  }
  return { root, made }
}

/** An Astro build of the project, in a mode, to a folder inside it; its pages are read back. */
async function build(root, mode, outDir) {
  const env = mode === "production" ? releaseEnvironment(process.env) : { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" }
  const run = spawnSync(
    process.execPath,
    [join(repo, "node_modules/astro/bin/astro.mjs"), "build", "--root", root, "--mode", mode, "--outDir", outDir],
    { cwd: root, encoding: "utf8", env: { ...env, FORCE_COLOR: "0" } },
  )
  const dist = join(root, outDir)
  const files = existsSync(dist) ? (await listFiles(dist)).map((f) => relative(dist, f)).sort() : []
  return { ok: run.status === 0, output: `${run.stdout}\n${run.stderr}`, files, dist }
}

const { root, made } = await makeProject()
let release
let demo
try {
  release = await build(root, "production", "dist")
  demo = await build(root, "demo", "dist-demo")
  const page = (build2, path) => build2.files.includes(`${path}index.html`.replace(/^\//, ""))
  const text = (build2, path) => readFile(join(build2.dist, path.replace(/^\//, ""), "index.html"), "utf8")
  const allText = async (build2) => {
    let all = ""
    for (const file of build2.files.filter((f) => /\.(html|xml|json|txt|js|css|svg|map)$/.test(f)))
      all += `\n=== ${file}\n${await readFile(join(build2.dist, file), "utf8")}`
    return all
  }
  const PATHS = {
    berry: "/lecture-notes/berries/published-berry/",
    post: "/blog/archived-post/",
    draft: "/lecture-notes/greenhouse/a-draft-article/",
    quarto: "/lecture-notes/greenhouse/published-quarto/",
    lesson: "/lecture-notes/bearnards-trail/draft-lesson/",
  }

  await test("AUTH-024", "Published entries generate public routes (built)", async (check) => {
    check(release.ok, `the release build failed:\n${release.output.slice(-1500)}`)
    check(page(release, PATHS.berry), "the published berry has no page")
    check(/<h1[^>]*>Published Berry<\/h1>/.test(await text(release, PATHS.berry)), "the berry's page is not its article")
    const index = await text(release, "/lecture-notes/berries/")
    check(index.includes(PATHS.berry) && index.includes("Published Berry"), "the Berries index does not list it")
    if (!quarto) return console.log("SKIPPED AUTH-024 (Quarto part): Quarto is not installed")
    check(page(release, PATHS.quarto), "the published Quarto article has no page")
    const html = await text(release, PATHS.quarto)
    check(/Published Quarto/.test(html) && /data-editorial-status="published"/.test(html), "the Quarto article's page")
    check(/<math/.test(html), "the Quarto article was not built from its source's body")
  })

  await test("AUTH-025", "Drafts remain excluded from production routes (built)", async (check) => {
    check(!page(release, PATHS.draft), "a draft has a page in the release build")
    check(!release.files.some((f) => f.includes("a-draft-article") || f.includes("draft-lesson")), "a built path names a draft")
    const all = await allText(release)
    check(!all.includes(DRAFT_MARKER), "a draft's text is in the release build")
    check(!/A Draft Article|Draft Lesson/.test(all), "a draft's title is in the release build (an index, a link, a feed)")
    const index = await text(release, "/lecture-notes/greenhouse/")
    check(!index.includes("a-draft-article"), "a draft is in the Greenhouse index")
    check(!/Draft preview/.test(all), "the draft notice is in the release build")
    check(!release.files.some((f) => /rss|atom|feed/i.test(f)), "a feed exists, which must be checked for drafts")
    // P24 (D-163): the public sitemap exists, and it is checked here: it names no draft, and lists the published fixture.
    check(release.files.includes("sitemap.xml"), "the release build has no sitemap")
    const sitemap = release.files.includes("sitemap.xml") ? await readFile(join(release.dist, "sitemap.xml"), "utf8") : ""
    check(!/a-draft-article|draft-lesson/.test(sitemap), "the sitemap lists a draft")
    // The demonstration build is not a draft preview either: only the dev server routes drafts.
    check(!demo.files.some((f) => f.includes("a-draft-article") || f.includes("draft-lesson")), "a draft has a page in the demonstration build")
  })

  await test("AUTH-026", "An archived entry keeps its public route (built)", async (check) => {
    check(page(release, PATHS.post), "the archived post lost its page")
    const html = await text(release, PATHS.post)
    check(/data-editorial-status="archived"/.test(html) && /Archived: this entry is kept for the record/.test(html), "the archived page is not marked historical")
    check(/1 October 2026|2026-10-01/.test(html), "the publication date changed")
    check((await text(release, "/blog/")).includes(PATHS.post), "an archived post is not listed")
  })

  await test("AUTH-035", "The production build excludes the workbench and demonstrations", async (check) => {
    check(!release.files.some((f) => f.startsWith("_design/publishing") || f.startsWith("demo-assets")), "workbench or demonstration paths in the release build")
    check(!release.files.some((f) => f.includes("demo-")), `demonstration paths: ${release.files.filter((f) => f.includes("demo-")).join(", ")}`)
    for (const marker of [...MARKERS, "Publishing Workbench", "an-example-of-the-publishing-workflow", "a-small-example"]) {
      for (const file of release.files.filter((f) => /\.(html|json|xml|txt|js|svg)$/.test(f)))
        if ((await readFile(join(release.dist, file), "utf8")).includes(marker)) check(false, `${file} contains "${marker}"`)
    }
    // A hostile environment cannot bring the workbench back: the tool cleans it.
    const hostile = spawnSync(
      process.execPath,
      [join(repo, "node_modules/astro/bin/astro.mjs"), "build", "--root", root, "--mode", "production", "--outDir", "dist-hostile"],
      { cwd: root, encoding: "utf8", env: { ...releaseEnvironment({ ...process.env, NODE_ENV: "development" }), FORCE_COLOR: "0" } },
    )
    check(hostile.status === 0, "the production-mode build failed")
    const leaked = existsSync(join(root, "dist-hostile/_design/publishing"))
    check(!leaked, "a production-mode build routed the workbench")
  })

  await test("AUTH-044", "No synthetic content leaks into public output", async (check) => {
    // The same guard the release build runs on itself (demonstration slugs, titles and markers),
    // on the throwaway release build and on the real dist/ that `npm run build` made.
    check((await publicBuildIssues(release.dist)).length === 0, `${json(await publicBuildIssues(release.dist))}`)
    if (existsSync(join(repo, "dist"))) {
      const issues = await publicBuildIssues(join(repo, "dist"))
      check(issues.length === 0, `the real dist/ holds traces: ${json(issues)}`)
      const needles = ["a-small-example", "an-example-of-the-publishing-workflow", "Throwaway", "workflow-transcript", "UNPUBLISHED-DRAFT"]
      for (const file of (await listFiles(join(repo, "dist"))).filter((f) => /\.(html|json|xml|txt|js|css|svg)$/.test(f)))
        for (const needle of needles)
          if ((await readFile(file, "utf8")).includes(needle)) check(false, `${relative(repo, file)} contains "${needle}"`)
    } else console.log("SKIPPED AUTH-044 (real dist/ part): run npm run build first")
  })

  await test("AUTH-032B", "The demonstration build has the workbench, linked from the Greenhouse Overview", async (check) => {
    check(demo.ok, `the demonstration build failed:\n${demo.output.slice(-1500)}`)
    for (const path of ["/_design/publishing/", "/_design/publishing/workflow/", "/_design/publishing/draft-example/"])
      check(page(demo, path), `no page ${path}`)
    const overview = await text(demo, "/lecture-notes/greenhouse/")
    check(/data-workbench-link/.test(overview) && /href="\/_design\/publishing\/"[^>]*>Publishing Workbench</.test(overview), "the Overview does not link to the workbench")
    check(/data-demo-section/.test(overview), "the link is outside the demonstration section")
    const workbench = await text(demo, "/_design/publishing/")
    check(/<h1[^>]*>Publishing Workbench<\/h1>/.test(workbench), "the workbench's heading")
    check((workbench.match(/data-collection-card=/g) ?? []).length === 8, "the eight collections are not all shown")
    check(/data-state="draft"/.test(workbench) && /data-state="published"/.test(workbench) && /data-state="archived"/.test(workbench), "the lifecycle")
    const checks = (workbench.match(/data-check="/g) ?? []).length
    check(checks >= 15, `${checks} checks in the checklist`)
    const workflow = await text(demo, "/_design/publishing/workflow/")
    check(/content:new/.test(workflow) && /Dry run: no files were modified/.test(workflow) && /exit 1/.test(workflow), "the workflow example is not the commands' output")
    const draft = await text(demo, "/_design/publishing/draft-example/")
    check(/data-editorial-status="draft"/.test(draft) && /Draft preview: this entry is not published/.test(draft) && /data-demo-notice/.test(draft), "the draft preview")
    check(/data-editorial-layout="greenhouse"/.test(draft), "the draft is not drawn by the Greenhouse layout")
  })

  await test("AUTH-033B", "The built workbench quotes every command exactly", async (check) => {
    const workbench = (await text(demo, "/_design/publishing/")).replace(/&#34;|&quot;/g, '"')
    for (const command of COMMANDS)
      for (const example of command.examples)
        check(workbench.includes(example), `the workbench does not show: ${example}`)
  })
} finally {
  await unlink(join(root, "node_modules")).catch(() => {})
  await rm(root, { recursive: true, force: true })
}

let failed = 0
for (const { id, title, failures } of results) {
  if (failures.length === 0) console.log(`PASS ${id} ${title}`)
  else {
    failed++
    console.error(`FAIL ${id} ${title}`)
    for (const message of failures.slice(0, 10)) console.error(`  - ${message}`)
  }
}
if (failed > 0) process.exit(1)
console.log(
  `PASS: ${results.length} built-page checks (${release.files.length} files in the release build, ${demo.files.length} in the demonstration build)${quarto ? "" : "; Quarto parts SKIPPED"}`,
)
