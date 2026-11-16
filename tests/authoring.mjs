// The authoring workflow (P14, D-107 to D-111): AUTH-001 to AUTH-030, AUTH-033, AUTH-034 and the
// regression checks AUTH-036 to AUTH-043. They run the real commands (scripts/content.mjs) on
// throwaway project folders in the system's temporary directory, and look at exit codes and at the
// files that were, or were not, written. The real src/content/ and science/ are never written.
//
// AUTH-024, AUTH-025, AUTH-026, AUTH-035 and AUTH-044 are built pages: tests/authoring-build.mjs.
// AUTH-031 and AUTH-032 are tests/authoring-browser.mjs. AUTH-040's other half, "no CV file is
// changed", is a git comparison here.
//
// Checks that need Quarto (AUTH-003, 015, 020, 028, 029 in part) are reported SKIPPED without it,
// never passed. Nothing here needs Python: a Quarto source without code is rendered with no
// execution, and one with code is only checked, never run.
//
// What these show: the commands behave as specified on synthetic articles, and refuse as
// specified. What they do not show: that an article is scientifically right, or that the owner
// finds the workflow comfortable (that is the owner's review).
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { parse } from "yaml"
import {
  COLLECTIONS,
  COLLECTION_IDS,
  collectionById,
  collectionPrefix,
} from "../src/editorial/collections.ts"
import {
  COLLECTION_FIELDS,
  COMMANDS,
  FORMATS,
  PREFLIGHT_CHECKS,
  QUARTO_COLLECTIONS,
  formatsOf,
  isCheckId,
  slugFromTitle,
} from "../src/editorial/authoring.ts"
import { contentRoutes, routableRecords } from "../src/editorial/model.ts"
import { schemaFor } from "../src/editorial/schema.ts"
import { createNavigation, siteNavigation } from "../src/navigation/index.ts"
import { SECTIONS } from "../src/navigation/registry.ts"
import { DIRECTORIES, toolchain, verify } from "../scripts/science.mjs"
import { OPTIONS } from "../scripts/content.mjs"
import {
  analyze,
  findEntry,
  loadWorkspace,
  previewInfo,
  publishArticle,
} from "../scripts/content-lib.mjs"
import { runScenario, TRANSCRIPT } from "./fixtures/authoring/scenario.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const script = join(repo, "scripts/content.mjs")
const BASE = "1b12f6d" // the commit P14 started from: what the regression checks compare to
const results = []
const cleanup = []
async function test(id, title, body) {
  const failures = []
  try {
    await body((ok, message) => ok || failures.push(message))
  } catch (error) {
    failures.push(error.stack ?? error.message)
  }
  results.push({ id, title, failures })
}
const skipped = []
const skip = (id, why) => {
  skipped.push(id)
  console.log(`SKIPPED ${id} (${why})`)
}

// --- Helpers -------------------------------------------------------------------------------------

/** A fresh project folder: just what the tool needs, in the temporary directory. */
async function workspace() {
  const root = await mkdtemp(join(tmpdir(), "gusmaolab-content-"))
  cleanup.push(root)
  await mkdir(join(root, "science"), { recursive: true })
  await cp(join(repo, "science/_quarto.yml"), join(root, "science/_quarto.yml"))
  return root
}
/** Runs one command of the real CLI. */
function cli(root, command, ...args) {
  return cliWith({}, root, command, ...args)
}
function cliWith(env, root, command, ...args) {
  const run = spawnSync(process.execPath, [script, command, "--root", root, ...args], {
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0", ...env },
  })
  return { code: run.status, out: run.stdout, err: run.stderr, text: run.stdout + run.stderr }
}
const sha = (data) => createHash("sha256").update(data).digest("hex")
/** Every file of a folder and its hash, for "nothing changed". Quarto's scratch folders are left out. */
async function tree(root) {
  const out = {}
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== "_build" && entry.name !== ".quarto") await walk(path)
      } else out[relative(root, path)] = sha(await readFile(path))
    }
  }
  await walk(root)
  return out
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const read = (root, path) => readFile(join(root, path), "utf8")
const write = (root, path, text) =>
  mkdir(join(root, path, ".."), { recursive: true }).then(() =>
    writeFile(join(root, path), text),
  )
const json = (value) => JSON.stringify(value)
const git = (...args) => spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" })
const gitAvailable = git("rev-parse", "--git-dir").status === 0 && git("cat-file", "-e", BASE).status === 0
// What P14 itself touched: the files of the commits whose subject ends [P14], and, while P14 is
// being written (this test file is not committed yet), the working tree. Later prompts change
// other files without failing these checks; P14 changing a protected one does.
const lines = (r) => r.stdout.split("\n").filter(Boolean)
const p14Commits = () => (gitAvailable ? lines(git("log", "--format=%H", `${BASE}..HEAD`, "--grep=\\[P14\\]")) : [])
const p14InProgress = () => gitAvailable && git("status", "--porcelain", "--", "tests/authoring.mjs").stdout.trim() !== ""
function p14Files(paths) {
  const files = new Set()
  for (const commit of p14Commits())
    for (const f of lines(git("diff-tree", "--no-commit-id", "--name-only", "-r", commit, "--", ...paths))) files.add(f)
  if (p14InProgress()) {
    for (const f of lines(git("diff", "HEAD", "--name-only", "--", ...paths))) files.add(f)
    for (const f of lines(git("ls-files", "--others", "--exclude-standard", "--", ...paths))) files.add(f)
  }
  return [...files].sort()
}
function p14Patch(path) {
  const parts = p14Commits().map((c) => git("show", "--format=", "-U0", c, "--", path).stdout)
  if (p14InProgress()) parts.push(git("diff", "HEAD", "-U0", "--", path).stdout)
  return parts.join("\n")
}

/** The extra arguments a collection needs, and a sample of every field it has. */
const REQUIRED = {
  timberLogs: ["--period", "2026-10"],
  monthsOriginal: ["--period", "2026-10"],
  kosmos: ["--work", "the-work"],
  bookClub: ["--book", "A Book"],
}
const SAMPLE = {
  string: "sample",
  number: "2",
  boolean: true,
}
function allFields(collection) {
  const args = []
  for (const option of COLLECTION_FIELDS[collection]) {
    let value = SAMPLE[option.type]
    if (option.type === "enum") value = option.values[0]
    if (option.key === "period") value = "2026-10"
    if (option.key === "sessionDate") value = "2026-10-05"
    if (["seriesId", "workId"].includes(option.key)) value = "a-slug"
    args.push(`--${option.flag}`)
    if (option.type !== "boolean") args.push(String(value))
  }
  return args
}
const frontOf = (text) => /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? ""
const quarto = toolchain().quarto !== null
const needsQuarto = (id) => {
  if (quarto) return false
  skip(id, "Quarto is not installed")
  return true
}

/** Makes a draft and gives it what publishing needs: a description, and no placeholder. */
async function readyDraft(root, collection, title, extra = []) {
  const made = cli(root, "new", "--collection", collection, "--title", title, ...(REQUIRED[collection] ?? []), ...extra)
  if (made.code !== 0) throw new Error(`could not create ${title}: ${made.text}`)
  const slug = /^Slug:\s+(\S+)/m.exec(made.out)[1]
  const file = /^Source:\s+(\S+)/m.exec(made.out)[1]
  let text = await read(root, file)
  text = text.replace(/^# description:.*$/m, 'description: "A synthetic description."')
  text = text.replace(/^<!-- TODO.*-->\n\n?/m, "")
  await write(root, file, text)
  return { slug, file }
}

// --- Creation ------------------------------------------------------------------------------------

await test("AUTH-001", "Every approved collection is recognized", async (check) => {
  const expected = ["blog", "trail", "greenhouse", "berries", "timberLogs", "monthsOriginal", "kosmos", "bookClub"]
  check(same([...COLLECTION_IDS].sort(), [...expected].sort()), `collections: ${json(COLLECTION_IDS)}`)
  check(
    same(Object.keys(COLLECTION_FIELDS).sort(), [...expected].sort()),
    "the authoring fields do not cover exactly the collections",
  )
  for (const id of COLLECTION_IDS) {
    const root = await workspace()
    const made = cli(root, "new", "--collection", id, "--title", `Sample ${id}`, ...(REQUIRED[id] ?? []))
    check(made.code === 0, `${id}: ${made.text}`)
    const file = join(collectionById(id).directory, `sample-${id.toLowerCase()}.md`)
    const files = existsSync(join(root, "src/content", collectionById(id).directory))
      ? await readdir(join(root, "src/content", collectionById(id).directory))
      : []
    check(files.length === 1, `${id}: files ${json(files)} (${file})`)
    const text = await read(root, `src/content/${collectionById(id).directory}/${files[0]}`)
    const parsed = schemaFor(id).safeParse(parse(frontOf(text)))
    check(parsed.success, `${id}: the template is not valid for its schema: ${parsed.error?.message}`)
    // Every optional field the collection offers is a key its schema knows.
    const rich = await workspace()
    const all = cli(rich, "new", "--collection", id, "--title", "Rich", ...(REQUIRED[id] ? [] : []), ...allFields(id))
    check(all.code === 0, `${id} with every field: ${all.text}`)
    const richFile = (await readdir(join(rich, "src/content", collectionById(id).directory)))[0]
    const validated = cli(rich, "validate", "--all", "--json")
    check(
      !JSON.parse(validated.out).findings.some((f) => f.level === "error"),
      `${id}: ${richFile} with every field has errors: ${validated.out}`,
    )
  }
  const root = await workspace()
  const unknown = cli(root, "new", "--collection", "podcast", "--title", "X")
  check(unknown.code === 1 && /not a collection/.test(unknown.text) && /bookClub/.test(unknown.text), `unknown: ${unknown.text}`)
  const missing = cli(root, "new", "--collection", "timberLogs", "--title", "X")
  check(missing.code === 1 && /--period/.test(missing.text), `a required field was not asked for: ${missing.text}`)
  const foreign = cli(root, "new", "--collection", "berries", "--title", "X", "--period", "2026-10")
  check(foreign.code === 1 && /no --period/.test(foreign.text), `a flag of another collection: ${foreign.text}`)
})

await test("AUTH-002", "A Markdown draft can be created", async (check) => {
  const root = await workspace()
  const made = cli(root, "new", "--collection", "greenhouse", "--title", "Eigenvalues, Gently")
  check(made.code === 0, made.text)
  check(/^Source:\s+src\/content\/greenhouse\/eigenvalues-gently\.md$/m.test(made.out), `output: ${made.out}`)
  check(/Address when published: \/lecture-notes\/greenhouse\/eigenvalues-gently\//.test(made.out), "the address is not reported")
  const text = await read(root, "src/content/greenhouse/eigenvalues-gently.md")
  check(text.startsWith('---\ntitle: "Eigenvalues, Gently"\n'), "the title is not quoted as YAML")
  check(/^status: draft$/m.test(text) && /^slug: eigenvalues-gently$/m.test(text), "status or slug missing")
  check(text.split("\n").length < 30, "the template is not minimal")
  const after = cli(root, "validate", "--all")
  check(after.code === 0, `a new draft does not validate: ${after.text}`)
})

await test("AUTH-003", "A Quarto draft can be created in a supported collection", async (check) => {
  if (needsQuarto("AUTH-003")) return
  for (const collection of QUARTO_COLLECTIONS) {
    const root = await workspace()
    const made = cli(root, "new", "--collection", collection, "--format", "qmd", "--title", "A Tutorial")
    check(made.code === 0, `${collection}: ${made.text}`)
    const dir = collectionById(collection).directory
    check(existsSync(join(root, `science/${dir}/a-tutorial.qmd`)), `${collection}: no .qmd`)
    const stub = await read(root, `src/content/${dir}/a-tutorial.md`)
    check(stub.includes("GENERATED from science/"), `${collection}: the registration is not marked generated`)
    check(/^status: "draft"$/m.test(stub), `${collection}: the registration is not a draft`)
    check((await verify(root)).length === 0, `${collection}: ${json(await verify(root))}`)
    check(existsSync(join(root, `src/science/${dir}/a-tutorial.html`)), `${collection}: no generated article`)
    const ws = await loadWorkspace(root)
    check(ws.entries.length === 1 && ws.entries[0].format === "qmd", `${collection}: the entry is not the .qmd source`)
    check(cli(root, "validate", "--all").code === 0, `${collection}: does not validate`)
  }
})

await test("AUTH-004", "Unsupported format and collection combinations are rejected", async (check) => {
  const others = COLLECTION_IDS.filter((id) => !QUARTO_COLLECTIONS.includes(id))
  check(others.length === 6, `${others.length} collections without Quarto`)
  for (const id of others) {
    const root = await workspace()
    const before = await tree(root)
    const made = cli(root, "new", "--collection", id, "--format", "qmd", "--title", "T", ...(REQUIRED[id] ?? []))
    check(made.code === 1 && /Markdown only/.test(made.text) && /greenhouse/.test(made.text), `${id}: ${made.text}`)
    check(same(before, await tree(root)), `${id}: files were written`)
  }
  const root = await workspace()
  const odd = cli(root, "new", "--collection", "blog", "--format", "docx", "--title", "T")
  check(odd.code === 1 && /Markdown only|not a format/.test(odd.text), `docx: ${odd.text}`)
  check(same(formatsOf("greenhouse"), ["md", "qmd"]) && same(FORMATS, ["md", "qmd"]), "formats table")
  // The list of Quarto collections is the tool's own.
  check(
    same(
      DIRECTORIES.filter((d) => d !== "design" && d !== "demo").sort(),
      QUARTO_COLLECTIONS.map((c) => collectionById(c).directory).sort(),
    ),
    "the Quarto collections are not the ones scripts/science.mjs integrates",
  )
})

await test("AUTH-005", "New articles default to draft, with no invented date", async (check) => {
  for (const id of COLLECTION_IDS) {
    const root = await workspace()
    cli(root, "new", "--collection", id, "--title", "T", ...(REQUIRED[id] ?? []))
    const dir = join(root, "src/content", collectionById(id).directory)
    const text = await read(root, `src/content/${collectionById(id).directory}/${(await readdir(dir))[0]}`)
    check(/^status: draft$/m.test(text), `${id}: not a draft`)
    check(!/^publishedAt:/m.test(text) && !/^updatedAt:/m.test(text), `${id}: a date was invented`)
  }
  const root = await workspace()
  cli(root, "new", "--collection", "blog", "--title", "T", "--date", "2026-12-01")
  check(/^publishedAt: 2026-12-01$/m.test(await read(root, "src/content/blog/t.md")), "an explicit --date is not written")
  const bad = cli(root, "new", "--collection", "blog", "--title", "U", "--date", "2026-02-30")
  check(bad.code === 1 && /calendar date/.test(bad.text), `bad date: ${bad.text}`)
})

await test("AUTH-006", "Slugs are generated predictably", async (check) => {
  const cases = [
    ["My Article", "my-article"],
    ["  Hello,   World!  ", "hello-world"],
    ["Café Münchën", "cafe-munchen"],
    ["100% R&D: Part 2", "100-r-d-part-2"],
    ["Already-hyphenated title", "already-hyphenated-title"],
    ["!!!", ""],
  ]
  for (const [title, slug] of cases) check(slugFromTitle(title) === slug, `${json(title)} gave ${json(slugFromTitle(title))}`)
  const long = "word ".repeat(40)
  const cut = slugFromTitle(long)
  check(cut.length <= 80 && !cut.endsWith("-") && cut === slugFromTitle(long), `long title: ${cut.length}`)
  const root = await workspace()
  const none = cli(root, "new", "--collection", "blog", "--title", "!!!")
  check(none.code === 1 && /--slug/.test(none.text), `no usable slug: ${none.text}`)
  const chosen = cli(root, "new", "--collection", "blog", "--title", "Something Else", "--slug", "my-own-slug")
  check(chosen.code === 0 && existsSync(join(root, "src/content/blog/my-own-slug.md")), `explicit slug: ${chosen.text}`)
})

await test("AUTH-007", "Duplicate slugs and paths are rejected", async (check) => {
  const root = await workspace()
  check(cli(root, "new", "--collection", "greenhouse", "--title", "Same").code === 0, "first")
  const again = cli(root, "new", "--collection", "greenhouse", "--title", "Same")
  check(again.code === 1 && /already exists/.test(again.text), `same title: ${again.text}`)
  const other = cli(root, "new", "--collection", "greenhouse", "--title", "Different", "--slug", "same")
  check(other.code === 1 && /already/.test(other.text), `same slug: ${other.text}`)
  if (quarto) {
    const q = cli(root, "new", "--collection", "greenhouse", "--format", "qmd", "--title", "Same")
    check(q.code === 1 && /already/.test(q.text), `the same slug as a Quarto source: ${q.text}`)
    check(!existsSync(join(root, "science/greenhouse/same.qmd")), "a Quarto source was left behind")
  }
  // The same slug in another collection is a different address.
  check(cli(root, "new", "--collection", "berries", "--title", "Same").code === 0, "another collection")
  // A file with the slug that nobody registered (hand-written, other name) is found by its slug.
  await write(root, "src/content/blog/odd-file-name.md", '---\ntitle: "A"\nstatus: draft\nslug: taken\n---\n')
  const taken = cli(root, "new", "--collection", "blog", "--title", "B", "--slug", "taken")
  check(taken.code === 1 && /already has an article with the slug "taken"/.test(taken.text), `slug of another file: ${taken.text}`)
})

await test("AUTH-008", "Existing files cannot be silently overwritten", async (check) => {
  const root = await workspace()
  const mine = "---\ntitle: \"Mine\"\nstatus: draft\nslug: mine\n---\nPrecious text.\n"
  await write(root, "src/content/blog/mine.md", mine)
  const before = await tree(root)
  const made = cli(root, "new", "--collection", "blog", "--title", "Mine")
  check(made.code === 1, `exit ${made.code}`)
  check(same(before, await tree(root)), "a file changed")
  check((await read(root, "src/content/blog/mine.md")) === mine, "the existing file was altered")
  // A race: two creations of the same article at once leave exactly one, intact.
  const { createArticle } = await import("../scripts/content-lib.mjs")
  const attempts = await Promise.allSettled([
    createArticle(root, { collection: "berries", title: "Race" }),
    createArticle(root, { collection: "berries", title: "Race" }),
  ])
  check(attempts.filter((a) => a.status === "fulfilled").length === 1, `outcomes: ${attempts.map((a) => a.status)}`)
  check(attempts.some((a) => a.status === "rejected" && a.reason.name === "AuthoringError"), "the loser did not refuse cleanly")
  check((await readdir(join(root, "src/content/berries"))).length === 1, "more than one file")
})

await test("AUTH-009", "Unsafe filesystem paths are rejected", async (check) => {
  const root = await workspace()
  const before = await tree(root)
  const unsafe = ["../escape", "..", "a/b", "/etc/passwd", "a\\b", "Upper", "a--b", "-a", "a-", "", "x".repeat(81), "a b", "a.md", "%2e%2e"]
  for (const slug of unsafe) {
    const made = cli(root, "new", "--collection", "blog", "--title", "Title", `--slug=${slug}`)
    check(made.code === 1 && /not a slug|--slug|Give/.test(made.text), `${json(slug)}: exit ${made.code} ${made.text.slice(0, 80)}`)
  }
  check(same(before, await tree(root)), "something was written")
  check(!existsSync(join(tmpdir(), "escape.md")) && !existsSync(join(root, "..", "escape.md")), "a file escaped the project")
  const title = cli(root, "new", "--collection", "blog", "--title", "Two\nlines")
  check(title.code === 1, `a multi-line title: ${title.text}`)
})

// --- Validation ----------------------------------------------------------------------------------

const validateJson = (root, ...extra) => {
  const run = cli(root, "validate", "--json", ...extra)
  return { code: run.code, ...JSON.parse(run.out) }
}

await test("AUTH-010", "Missing or invalid frontmatter produces actionable diagnostics", async (check) => {
  const root = await workspace()
  await write(root, "src/content/blog/no-front.md", "Just text.\n")
  await write(root, "src/content/blog/no-title.md", "---\nstatus: draft\nslug: no-title\n---\nText.\n")
  await write(root, "src/content/blog/bad-status.md", '---\ntitle: "A"\nstatus: live\nslug: bad-status\n---\nText.\n')
  await write(root, "src/content/blog/bad-date.md", '---\ntitle: "A"\nstatus: draft\nslug: bad-date\npublishedAt: 2026-02-30\n---\nText.\n')
  await write(root, "src/content/blog/typo.md", '---\ntitle: "A"\nstatus: draft\nslug: typo\ndesription: "x"\n---\nText.\n')
  const result = validateJson(root, "--all")
  check(result.code === 1, `exit ${result.code}`)
  const of = (file) => result.findings.filter((f) => f.file.endsWith(file))
  check(of("no-front.md").some((f) => f.check === "metadata.syntax" && f.action), "no front matter: not reported with an action")
  const title = of("no-title.md").find((f) => f.field === "title")
  check(title?.level === "error" && /Missing required field/.test(title.message) && /add title/.test(title.action), `title: ${json(title)}`)
  check(of("bad-status.md").some((f) => f.field === "status"), "bad status")
  check(of("bad-date.md").some((f) => /not a calendar date/.test(f.message)), "bad date")
  check(of("typo.md").some((f) => /Unrecognized key/.test(f.message) && /desription/.test(f.message) && f.action), "typo")
  for (const f of result.findings) {
    check(isCheckId(f.check), `${f.check} is not in the list of checks`)
    check(f.file && f.message.length > 10, `a finding without a file or words: ${json(f)}`)
  }
  const text = cli(root, "validate", "--all")
  check(/^Publication validation failed/.test(text.out) && /No files were modified\./.test(text.out), "the report's shape")
  check(/Source: src\/content\/blog\/typo\.md/.test(text.out) && /Collection: blog/.test(text.out), "the report names the source and collection")
  check(same(validateJson(root, "--all").findings, result.findings), "results are not deterministic")
})

await test("AUTH-011", "Invalid publication metadata blocks publication", async (check) => {
  const root = await workspace()
  const made = cli(root, "new", "--collection", "greenhouse", "--title", "Needs Work")
  check(made.code === 0, made.text)
  const file = "src/content/greenhouse/needs-work.md"
  const before = await read(root, file)
  const target = ["--collection", "greenhouse", "--slug", "needs-work"]
  const noDate = cli(root, "publish", ...target)
  check(noDate.code === 1 && /No date is invented/.test(noDate.text), `no date: ${noDate.text}`)
  const noDesc = cli(root, "publish", ...target, "--date", "2026-11-20", "--yes")
  check(noDesc.code === 1 && /description/.test(noDesc.text) && /TODO/.test(noDesc.text), `blocked: ${noDesc.text}`)
  check((await read(root, file)) === before, "a blocked publication changed the file")
  const badDate = cli(root, "publish", ...target, "--date", "2026-02-30", "--yes")
  check(badDate.code === 1 && /calendar date/.test(badDate.text), `bad date: ${badDate.text}`)
  // An update that precedes the publication.
  let text = before.replace(/^# description:.*$/m, 'description: "d"').replace(/^<!-- TODO.*-->\n\n/m, "")
  await write(root, file, text.replace("slug: needs-work", "slug: needs-work\nupdatedAt: 2020-01-01"))
  const early = cli(root, "publish", ...target, "--date", "2026-11-20", "--yes")
  check(early.code === 1 && /before the publication/.test(early.text), `updatedAt: ${early.text}`)
  // A date that is already there is not rewritten.
  await write(root, file, text.replace("slug: needs-work", "slug: needs-work\npublishedAt: 2026-11-01"))
  const rewrite = cli(root, "publish", ...target, "--date", "2026-11-20", "--yes")
  check(rewrite.code === 1 && /never rewritten/.test(rewrite.text), `rewrite: ${rewrite.text}`)
  const keep = cli(root, "publish", ...target, "--yes")
  check(keep.code === 0 && /^publishedAt: 2026-11-01$/m.test(await read(root, file)), `keep the existing date: ${keep.text}`)
})

await test("AUTH-012", "Related-entry references are validated", async (check) => {
  const root = await workspace()
  const a = await readyDraft(root, "greenhouse", "Alpha")
  const b = await readyDraft(root, "greenhouse", "Beta")
  const set = async (file, extra) => write(root, file, (await read(root, file)).replace("\n---\n", `\n${extra}\n---\n`))
  await set(a.file, "related:\n  - greenhouse/nowhere")
  let r = validateJson(root, "--all")
  check(r.findings.some((f) => f.check === "relationships.entries" && /does not exist/.test(f.message) && f.level === "error"), `missing: ${json(r.findings)}`)
  await write(root, a.file, (await read(root, a.file)).replace("greenhouse/nowhere", "greenhouse/alpha"))
  r = validateJson(root, "--all")
  check(r.findings.some((f) => /relates to itself/.test(f.message)), "itself")
  await write(root, a.file, (await read(root, a.file)).replace("greenhouse/alpha", "greenhouse/beta"))
  r = validateJson(root, "--all")
  check(!r.findings.some((f) => f.level === "error"), `a draft may relate to a draft: ${json(r.findings)}`)
  // But it cannot be published while its related entry is a draft.
  const blocked = cli(root, "publish", "--collection", "greenhouse", "--slug", "alpha", "--date", "2026-11-20", "--yes")
  check(blocked.code === 1 && /relationships\.public|still a draft/.test(blocked.text), `a public entry recommending a draft: ${blocked.text}`)
  const after = await read(root, a.file)
  check(/^status: draft$/m.test(after), "the blocked entry changed")
  // Publish the related one first, then it passes.
  check(cli(root, "publish", "--collection", "greenhouse", "--slug", b.slug, "--date", "2026-11-20", "--yes").code === 0, "publish the related entry")
  const ok = cli(root, "publish", "--collection", "greenhouse", "--slug", "alpha", "--date", "2026-11-21", "--yes")
  check(ok.code === 0, `after the related entry is public: ${ok.text}`)
  await write(root, a.file, (await read(root, a.file)).replace("\n---\n", "\nrelatedRecords:\n  - project-nothing\n---\n"))
  r = validateJson(root, "--all")
  check(r.findings.some((f) => f.check === "relationships.records"), "an unknown record")
})

await test("AUTH-013", "Public route and identity collisions are detected", async (check) => {
  const root = await workspace()
  const same2 = '---\ntitle: "T"\nstatus: draft\nslug: shared\n---\nText.\n'
  await write(root, "src/content/blog/one.md", same2)
  await write(root, "src/content/blog/two.md", same2)
  let r = validateJson(root, "--all")
  check(r.findings.some((f) => f.check === "identity.slug" && /share the slug "shared"/.test(f.message) && f.level === "error"), `slug: ${json(r.findings)}`)
  const k1 = '---\ntitle: "K"\nstatus: draft\nslug: k-one\nworkId: w\nchapterNumber: 1\n---\nText.\n'
  await write(root, "src/content/kosmos/k1.md", k1)
  await write(root, "src/content/kosmos/k2.md", k1.replace("k-one", "k-two"))
  r = validateJson(root, "--all")
  check(r.findings.some((f) => /chapter 1 of work "w"/.test(f.message)), "the same chapter twice")
  await write(root, "src/content/trail/t1.md", '---\ntitle: "T"\nstatus: draft\nslug: t-one\nseriesId: s\nposition: 1\n---\n')
  await write(root, "src/content/trail/t2.md", '---\ntitle: "T"\nstatus: draft\nslug: t-two\nseriesId: s\nposition: 1\n---\n')
  r = validateJson(root, "--all")
  check(r.findings.some((f) => /position 1 in series "s"/.test(f.message)), "the same lesson position twice")
  // A single target reports only its own problems.
  const one = cli(root, "validate", "--collection", "blog", "--slug", "shared")
  check(one.code === 1 && /2 entries of blog have the slug "shared"/.test(one.text), `an ambiguous slug: ${one.text}`)
  // The address collision with a folder is checked by the same navigation validation the build uses.
  const route = contentRoutes([{ collection: "blog", id: "x", data: { slug: "x", status: "draft", title: "x" } }], { drafts: true })
  check(createNavigation(SECTIONS, route) !== null, "a plain route does not validate")
  let refused = false
  try {
    createNavigation(SECTIONS, [{ path: "/blog/x/", owner: "blog" }, { path: "/blog/x/", owner: "blog" }])
  } catch {
    refused = true
  }
  check(refused, "the navigation accepts two pages at one address")
})

await test("AUTH-014", "Unknown internal links are reported where validation supports them", async (check) => {
  const root = await workspace()
  const draft = await readyDraft(root, "greenhouse", "Linker")
  await readyDraft(root, "greenhouse", "Hidden")
  await write(root, "public/files/notes.pdf", "x")
  const body = [
    "[folder](/lecture-notes/greenhouse/)",
    "[nowhere](/not-a-page/)",
    "[draft](/lecture-notes/greenhouse/hidden/)",
    "[file](/files/notes.pdf)",
    "[missing file](/files/missing.pdf)",
    "![alt](/images/none.png)",
    "[relative](../elsewhere/)",
    "[dev](/_design/publishing/)",
    "[outside](https://example.org/)",
    "`[inline](/in-code/)`",
    "```",
    "[fenced](/in-fence/)",
    "```",
  ].join("\n\n")
  await write(root, draft.file, (await read(root, draft.file)) + "\n" + body + "\n")
  const result = validateJson(root, "--collection", "greenhouse", "--slug", "linker")
  const messages = result.findings.filter((f) => /^markdown\./.test(f.check)).map((f) => f.message)
  const has = (needle) => messages.some((m) => m.includes(needle))
  check(has("/not-a-page/"), "an unknown page")
  check(has("/lecture-notes/greenhouse/hidden/") && /draft/.test(messages.find((m) => m.includes("hidden"))), "a link to a draft")
  check(has("/files/missing.pdf") && has("/images/none.png"), "missing files")
  check(has("../elsewhere/") && /relative/.test(messages.find((m) => m.includes("elsewhere"))), "a relative link")
  check(has("/_design/publishing/"), "a development page")
  check(!has("/files/notes.pdf") && !has("/lecture-notes/greenhouse/)") && !has("example.org"), "a good link was reported")
  check(!has("/in-code/") && !has("/in-fence/"), "code was read as links")
  check(result.findings.filter((f) => /^markdown\./.test(f.check)).every((f) => f.level === "warning"), "a draft's link problems should warn, not block")
  // Published, the same problems block.
  await write(root, draft.file, (await read(root, draft.file)).replace(/^status: draft/m, "status: published").replace("slug: linker", "slug: linker\npublishedAt: 2026-11-20"))
  const published = validateJson(root, "--collection", "greenhouse", "--slug", "linker")
  check(published.findings.some((f) => f.check === "markdown.links" && f.level === "error"), "a published entry's bad link should be an error")
})

await test("AUTH-016", "Unresolved publication-critical placeholders are detected", async (check) => {
  const root = await workspace()
  const made = await readyDraft(root, "berries", "Holes")
  const add = async (text) => write(root, made.file, (await read(root, made.file)) + "\n" + text + "\n")
  await add("Some text. TODO: fill in.\n\nFIXME later, TBD, XXX and Lorem ipsum.\n")
  await add("See /Users/someone/project/file.py and file:///tmp/x and http://localhost:4321/ and C:\\Users\\me.")
  await add("```\nTODO inside code is an example\nlocalhost:1234 in code\n```\n\n`TODO` inline.")
  const result = validateJson(root, "--collection", "berries", "--slug", "holes")
  const by = (check2) => result.findings.filter((f) => f.check === check2)
  check(by("safety.placeholders").length === 5, `placeholders: ${json(by("safety.placeholders").map((f) => f.message))}`)
  check(by("safety.local").length === 4, `local: ${json(by("safety.local").map((f) => f.message))}`)
  check(!by("safety.placeholders").some((f) => /inside code/.test(f.message)), "code was read as text")
  check(by("safety.placeholders").every((f) => f.level === "warning"), "a draft's placeholders only warn")
  const blocked = cli(root, "publish", "--collection", "berries", "--slug", "holes", "--date", "2026-11-20", "--yes")
  check(blocked.code === 1 && /"TODO"/.test(blocked.text) && /local path/.test(blocked.text), `publish: ${blocked.text}`)
  // A real entry is not a demonstration.
  await write(root, made.file, (await read(root, made.file)).replace("\n---\n", "\nsynthetic: true\n---\n"))
  check(validateJson(root, "--collection", "berries", "--slug", "holes").findings.some((f) => f.check === "safety.synthetic" && f.level === "error"), "synthetic metadata in a real entry")
  check(PREFLIGHT_CHECKS.every((c) => isCheckId(c.id)) && new Set(PREFLIGHT_CHECKS.map((c) => c.id)).size === PREFLIGHT_CHECKS.length, "the list of checks")
})

// --- Quarto --------------------------------------------------------------------------------------

await test("AUTH-015", "Quarto citation, reference and artifact checks integrate", async (check) => {
  if (needsQuarto("AUTH-015")) return
  const root = await workspace()
  const made = cli(root, "new", "--collection", "greenhouse", "--format", "qmd", "--title", "Refs")
  check(made.code === 0, made.text)
  const qmd = join(root, "science/greenhouse/refs.qmd")
  // Edited after rendering: stale, and said so with the command that fixes it.
  await writeFile(qmd, (await readFile(qmd, "utf8")) + "\nMore text.\n")
  let r = validateJson(root, "--all")
  const stale = r.findings.find((f) => f.check === "quarto.freshness")
  check(stale?.level === "error" && /changed since it was rendered/.test(stale.message) && /science:render -- greenhouse\/refs/.test(stale.action), `stale: ${json(stale)}`)
  check(r.code === 1, "a stale article should fail validation")
  // Re-rendering fixes it, without any computation.
  const preview = cli(root, "preview", "--collection", "greenhouse", "--slug", "refs", "--refresh")
  check(/generated article current/.test(preview.out) && /nothing computed/.test(preview.out), `refresh: ${preview.text}`)
  check(validateJson(root, "--all").code === 0, "still failing after the refresh")
  // A reference to a label that does not exist is refused when rendering: P13's own check.
  await writeFile(qmd, (await readFile(qmd, "utf8")) + "\nSee @eq-nothing-here.\n")
  const refused = cli(root, "preview", "--collection", "greenhouse", "--slug", "refs", "--refresh")
  check(/not refreshed/.test(refused.out) || refused.code === 1, `an unresolved reference was accepted: ${refused.text}`)
  r = validateJson(root, "--all")
  check(r.code === 1 && r.findings.some((f) => f.check === "quarto.freshness"), "the broken source still looks current")
  // The registration is not the source: editing it is reported, not accepted.
  await writeFile(qmd, (await readFile(qmd, "utf8")).replace("\nSee @eq-nothing-here.\n", ""))
  cli(root, "preview", "--collection", "greenhouse", "--slug", "refs", "--refresh")
  const stubPath = join(root, "src/content/greenhouse/refs.md")
  await writeFile(stubPath, (await readFile(stubPath, "utf8")).replace('"draft"', '"published"'))
  r = validateJson(root, "--all")
  check(r.findings.some((f) => f.check === "identity.source" && /edited by hand/.test(f.message)), `a hand-edited registration: ${json(r.findings)}`)
})

await test("AUTH-020", "Preview, validation and publication never execute scientific code", async (check) => {
  const root = await workspace()
  const sentinel = join(root, "EXECUTED")
  const qmd = [
    "---",
    'title: "Has Code"',
    "status: draft",
    "slug: has-code",
    "engine: jupyter",
    "---",
    "",
    "```{python}",
    `open(${json(sentinel)}, "w").write("ran")`,
    "```",
    "",
  ].join("\n")
  await write(root, "science/greenhouse/has-code.qmd", qmd)
  const target = ["--collection", "greenhouse", "--slug", "has-code"]
  const runs = [
    cli(root, "validate", "--all"),
    cli(root, "validate", ...target),
    cli(root, "preview", ...target),
    cli(root, "preview", ...target, "--refresh"),
    cli(root, "publish", ...target, "--date", "2026-11-20"),
    cli(root, "publish", ...target, "--date", "2026-11-20", "--yes"),
    cli(root, "archive", ...target, "--yes"),
  ]
  check(!existsSync(sentinel), "the code ran")
  const validated = runs[0]
  check(validated.code === 1 && /never executed|science:render|no rendering/.test(validated.out + validated.err), `a document with unexecuted code: ${validated.text}`)
  check(/science:execute|computation required|never executed|science:render/.test(runs[2].out), `preview: ${runs[2].out}`)
  check(runs[5].code === 1, "a document whose code was never executed was published")
  check(await readFile(join(root, "science/greenhouse/has-code.qmd"), "utf8") === qmd, "the source was changed")
  // The tool never asks Quarto to execute, and the explicit command is the only one that does.
  for (const file of ["scripts/content-lib.mjs", "scripts/content.mjs", "src/editorial/authoring.ts"]) {
    const text = await read(repo, file)
    check(!/execute\s*:\s*true|--execute|science:execute"|jupyter/.test(text.replace(/`npm run science:execute[^`]*`/g, "").replace(/npm run science:execute[^"'`\n]*/g, "")), `${file} can execute code`)
  }
  const pkg = JSON.parse(await read(repo, "package.json"))
  check(!/execute/.test(pkg.scripts.build) && !/quarto/.test(pkg.scripts.build), "the build runs Quarto or executes")
  for (const id of COMMANDS.map((c) => `content:${c.id}`)) check(!/execute|quarto/.test(pkg.scripts[id]), `${id}`)
})

// --- Preview -------------------------------------------------------------------------------------

await test("AUTH-017", "Draft articles can be previewed locally", async (check) => {
  const root = await workspace()
  const made = await readyDraft(root, "berries", "Preview Me")
  const info = await previewInfo(root, { collection: "berries", slug: made.slug, port: 1 })
  check(info.usable && info.entry.data.status === "draft", "a valid draft is not previewable")
  check(info.url === `http://localhost:1${collectionPrefix(collectionById("berries"))}preview-me/`, `url: ${info.url}`)
  // The dev server routes drafts; a build never does (src/editorial/model.ts).
  const record = { collection: "berries", id: made.slug, data: info.entry.data }
  check(routableRecords([record], { drafts: true }).length === 1, "the dev server would not route the draft")
  check(routableRecords([record], {}).length === 0, "a build would route the draft")
  const closed = cli(root, "preview", "--collection", "berries", "--slug", made.slug, "--port", "1")
  check(closed.code === 0 && /Dev server: not running/.test(closed.out) && /npm run dev/.test(closed.out), `server not running: ${closed.out}`)
  check(!/Dev server: running/.test(closed.out), "a server was claimed that is not running")
  // An invalid article gets no address to open.
  await write(root, made.file, (await read(root, made.file)).replace("slug: preview-me", "slug: Preview Me"))
  const bad = cli(root, "preview", "--collection", "berries", "--slug", "Preview Me", "--port", "1")
  check(bad.code === 1 && !/http:\/\//.test(bad.out), `an unusable article offered a URL: ${bad.text}`)
})

await test("AUTH-018", "Preview addresses resolve to the correct owning folder", async (check) => {
  for (const collection of COLLECTIONS) {
    const root = await workspace()
    const made = await readyDraft(root, collection.id, "Where Am I")
    const info = await previewInfo(root, { collection: collection.id, slug: made.slug, port: 1 })
    const path = info.path
    check(path === `${collectionPrefix(collection)}where-am-i/`, `${collection.id}: ${path}`)
    const nav = createNavigation(
      SECTIONS,
      contentRoutes([{ collection: collection.id, id: made.slug, data: info.entry.data }], { drafts: true }),
    )
    const resolved = nav.resolve(path)
    check(resolved.found && resolved.state.page.kind === "content", `${collection.id}: not resolved`)
    check(resolved.state.page.route.owner === collection.owner, `${collection.id}: owner ${resolved.state.page.route.owner}`)
    // No fourth folder level: the page sits inside its owner's body.
    check(resolved.state.rows.length <= 3, `${collection.id}: ${resolved.state.rows.length} rows`)
  }
  check(siteNavigation.resolve("/lecture-notes/greenhouse/where-am-i/").found === false, "the site navigation knows a draft")
})

await test("AUTH-019", "Preview does not change publication status or any file", async (check) => {
  const root = await workspace()
  const made = await readyDraft(root, "greenhouse", "Stays A Draft")
  const before = await tree(root)
  const view = cli(root, "preview", "--collection", "greenhouse", "--slug", made.slug, "--port", "1")
  check(view.code === 0, view.text)
  check(same(before, await tree(root)), "preview changed a file")
  check(/^status: draft$/m.test(await read(root, made.file)), "the status changed")
  const validate = cli(root, "validate", "--all")
  check(validate.code === 0 && same(before, await tree(root)), "validate changed a file")
  const dry = cli(root, "publish", "--collection", "greenhouse", "--slug", made.slug, "--date", "2026-11-20")
  check(dry.code === 0 && /Dry run/.test(dry.out) && same(before, await tree(root)), `a dry run changed a file: ${dry.text}`)
})

// --- Lifecycle -----------------------------------------------------------------------------------

await test("AUTH-021", "Publishing requires an intentional operation", async (check) => {
  const root = await workspace()
  const made = await readyDraft(root, "blog", "Careful")
  const originalText = await read(root, made.file)
  const before = await tree(root)
  const dry = cli(root, "publish", "--collection", "blog", "--slug", made.slug, "--date", "2026-11-20")
  check(dry.code === 0 && /Add --yes/.test(dry.out) && /status: draft {2}->  status: published/.test(dry.out), `dry run: ${dry.out}`)
  check(same(before, await tree(root)), "publishing happened without --yes")
  const preview = cli(root, "preview", "--collection", "blog", "--slug", made.slug, "--port", "1")
  check(same(before, await tree(root)) && preview.code === 0, "a preview published")
  const today = cli(root, "publish", "--collection", "blog", "--slug", made.slug, "--today")
  check(today.code === 0 && same(before, await tree(root)), "--today without --yes changed a file")
  const yes = cli(root, "publish", "--collection", "blog", "--slug", made.slug, "--date", "2026-11-20", "--yes")
  check(yes.code === 0 && /Status now: published/.test(yes.out) && /Public address: \/blog\/careful\//.test(yes.out), `publish: ${yes.text}`)
  check(/did not commit, push or deploy/.test(yes.out), "it does not say it did not deploy")
  const text = await read(root, made.file)
  check(/^status: published$/m.test(text) && /^publishedAt: 2026-11-20$/m.test(text), `file: ${text}`)
  check(/already published/.test(cli(root, "publish", "--collection", "blog", "--slug", made.slug, "--date", "2026-11-20", "--yes").out), "publishing twice")
  // Only the status and the date changed: every other line is as the author left it.
  const was = originalText.split("\n")
  const kept = text.split("\n").filter((line) => !/^(?:status|publishedAt):/.test(line))
  check(same(kept, was.filter((line) => !/^status:/.test(line))), "something besides the status and the date changed")
})

await test("AUTH-022", "Publication preflight runs before the source is modified", async (check) => {
  const root = await workspace()
  const made = await readyDraft(root, "blog", "Order")
  await write(root, made.file, (await read(root, made.file)) + "\nA TODO is left.\n")
  const original = await read(root, made.file)
  const ws = await loadWorkspace(root)
  const entry = findEntry(ws, "blog", "order")
  const result = await publishArticle(root, { collection: "blog", slug: "order", date: "2026-11-20", apply: true })
  check(result.blocked === true && result.applied === false, "the failed preflight still applied")
  check((await read(root, made.file)) === original, "the source changed before the preflight finished")
  check(entry.text === original, "the workspace is not the file")
  const text = cli(root, "publish", "--collection", "blog", "--slug", "order", "--date", "2026-11-20")
  check(/preflight failed/.test(text.out) && !/Change:/.test(text.out), `a failed preflight showed a change: ${text.out}`)
  check(/preflight passed/.test(cli(root, "publish", "--collection", "blog", "--slug", "order", "--date", "2026-11-20").out) === false, "the placeholder passed")
})

await test("AUTH-023", "A failed publish preflight leaves the source unchanged", async (check) => {
  const root = await workspace()
  const made = await readyDraft(root, "blog", "Unchanged")
  await write(root, made.file, (await read(root, made.file)).replace("slug: unchanged", "slug: unchanged\nrelated:\n  - blog/ghost"))
  const before = await tree(root)
  const run = cli(root, "publish", "--collection", "blog", "--slug", "unchanged", "--date", "2026-11-20", "--yes")
  check(run.code === 1 && /No files were modified/.test(run.out), run.text)
  check(same(before, await tree(root)), "the tree changed")
  const archive = cli(root, "archive", "--collection", "blog", "--slug", "unchanged", "--yes")
  check(archive.code === 1 && /draft/.test(archive.text) && same(before, await tree(root)), `archiving a draft: ${archive.text}`)
})

await test("AUTH-026", "Archiving preserves the canonical URL and the dates", async (check) => {
  const root = await workspace()
  const made = await readyDraft(root, "greenhouse", "Old News")
  const target = ["--collection", "greenhouse", "--slug", made.slug]
  const pub = cli(root, "publish", ...target, "--date", "2026-03-04", "--yes")
  check(pub.code === 0, pub.text)
  const before = await read(root, made.file)
  const dry = cli(root, "archive", ...target)
  check(dry.code === 0 && /Dry run/.test(dry.out) && (await read(root, made.file)) === before, "an archive dry run")
  const done = cli(root, "archive", ...target, "--yes")
  check(done.code === 0 && /Status now: archived/.test(done.out), done.text)
  const after = await read(root, made.file)
  const was = before.split("\n")
  const now = after.split("\n")
  const changed = now.filter((l, i) => l !== was[i])
  check(same(changed, ["status: archived"]), `more than the status changed: ${json(changed)}`)
  check(/Public address: \/lecture-notes\/greenhouse\/old-news\//.test(done.out), "the address is not preserved")
  const ws = await loadWorkspace(root)
  const entry = findEntry(ws, "greenhouse", "old-news")
  check(entry.data.status === "archived" && entry.data.publishedAt === "2026-03-04" && entry.data.slug === "old-news", "identity changed")
  check(contentRoutes([{ collection: "greenhouse", id: made.slug, data: entry.data }], {}).length === 1, "an archived entry has no route")
  check(existsSync(join(root, made.file)), "the source was removed")
  check(/already archived/.test(cli(root, "archive", ...target, "--yes").out), "archiving twice")
  // There is no delete command.
  check(!COMMANDS.some((c) => /delete|remove/.test(c.id)), "a destructive command exists")
})

await test("AUTH-027", "Updating a title does not change the stable slug", async (check) => {
  const root = await workspace()
  const made = await readyDraft(root, "blog", "First Title")
  const target = ["--collection", "blog", "--slug", made.slug]
  check(cli(root, "publish", ...target, "--date", "2026-11-20", "--yes").code === 0, "publish")
  await write(root, made.file, (await read(root, made.file)).replace('title: "First Title"', 'title: "A Better Title"'))
  const ws = await loadWorkspace(root)
  const entry = findEntry(ws, "blog", made.slug)
  check(entry.data.title === "A Better Title" && entry.data.slug === "first-title", "the title change moved the slug")
  check(cli(root, "validate", "--all").code === 0, "a retitled article does not validate")
  // A new `new` with the new title is a different article, not a rename.
  const other = cli(root, "new", "--collection", "blog", "--title", "A Better Title")
  check(other.code === 0 && existsSync(join(root, "src/content/blog/a-better-title.md")), "a new title makes a new article")
  // Changing a public slug is refused while it differs from the last commit.
  const committed = { slug: "first-title", status: "published" }
  const moved = (await read(root, made.file)).replace("slug: first-title", "slug: renamed")
  await write(root, made.file, moved)
  const findings = await analyze(await loadWorkspace(root), { previous: () => committed })
  const stable = findings.find((f) => f.check === "identity.stable")
  check(stable?.level === "error" && /would stop working/.test(stable.message), `slug moved: ${json(findings)}`)
  const same2 = await analyze(await loadWorkspace(root), { previous: () => ({ slug: "renamed", status: "published" }) })
  check(!same2.some((f) => f.check === "identity.stable"), "a slug equal to the committed one was reported")
  const draftMove = await analyze(await loadWorkspace(root), { previous: () => ({ slug: "first-title", status: "draft" }) })
  check(!draftMove.some((f) => f.check === "identity.stable"), "a draft's slug may still change")
})

await test("AUTH-028", "Generated registration files are not treated as editable source", async (check) => {
  if (needsQuarto("AUTH-028")) return
  const root = await workspace()
  cli(root, "new", "--collection", "greenhouse", "--format", "qmd", "--title", "Derived")
  const ws = await loadWorkspace(root)
  check(ws.entries.length === 1 && ws.entries[0].file === "science/greenhouse/derived.qmd", `entries: ${json(ws.entries.map((e) => e.file))}`)
  const stub = "src/content/greenhouse/derived.md"
  const stubBefore = await read(root, stub)
  const created = cli(root, "new", "--collection", "greenhouse", "--title", "Derived")
  check(created.code === 1, "a Markdown file was created over a generated registration")
  const text = cli(root, "validate", "--collection", "greenhouse", "--slug", "derived")
  check(/Source: science\/greenhouse\/derived\.qmd/.test(text.out), `the source reported: ${text.out}`)
  check((await read(root, stub)) === stubBefore, "the registration was touched")
  // A hand-written Markdown entry beside a Quarto source is two sources of one entry.
  await write(root, "src/content/greenhouse/hand.md", '---\ntitle: "Hand"\nstatus: draft\nslug: hand\n---\n')
  await write(root, "science/greenhouse/hand.qmd", '---\ntitle: "Hand"\nstatus: draft\nslug: hand\n---\n')
  const both = validateJson(root, "--all")
  check(both.findings.some((f) => f.check === "identity.source" && /Both/.test(f.message)), `two sources: ${json(both.findings)}`)
  // The docs say so too.
  check(/never edit/i.test(await read(repo, "development/authoring-guide.md")), "the guide does not say the registration is never edited")
})

await test("AUTH-029", "Stale Quarto output blocks public publication", async (check) => {
  if (needsQuarto("AUTH-029")) return
  const root = await workspace()
  cli(root, "new", "--collection", "greenhouse", "--format", "qmd", "--title", "Stale")
  const qmd = join(root, "science/greenhouse/stale.qmd")
  let text = await readFile(qmd, "utf8")
  text = text.replace(/^# description:.*$/m, 'description: "d"').replace(/^<!-- TODO.*-->\n\n?/m, "")
  await writeFile(qmd, text)
  const before = await tree(root)
  const blocked = cli(root, "publish", "--collection", "greenhouse", "--slug", "stale", "--date", "2026-11-20", "--yes")
  check(blocked.code === 1 && /changed since it was rendered/.test(blocked.text) && /science:render/.test(blocked.text), `stale: ${blocked.text}`)
  check(same(before, await tree(root)), "a stale document changed files while being refused")
  const fresh = cli(root, "preview", "--collection", "greenhouse", "--slug", "stale", "--refresh")
  check(/current/.test(fresh.out), fresh.text)
  const ok = cli(root, "publish", "--collection", "greenhouse", "--slug", "stale", "--date", "2026-11-20", "--yes")
  check(ok.code === 0 && /re-registered/.test(ok.out), `publish: ${ok.text}`)
  const stub = await read(root, "src/content/greenhouse/stale.md")
  check(/^status: "published"$/m.test(stub) && /publishedAt: "2026-11-20"/.test(stub), "the registration does not follow the source")
  check((await verify(root)).length === 0, `not current after publishing: ${json(await verify(root))}`)
  check(/^status: published$/m.test(await readFile(qmd, "utf8")), "the source does not say published")
  // A failed re-registration puts the source back.
  const q2 = await workspace()
  cli(q2, "new", "--collection", "greenhouse", "--format", "qmd", "--title", "Rollback")
  const path = join(q2, "science/greenhouse/rollback.qmd")
  let t2 = (await readFile(path, "utf8")).replace(/^# description:.*$/m, 'description: "d"').replace(/^<!-- TODO.*-->\n\n?/m, "")
  await writeFile(path, t2)
  cli(q2, "preview", "--collection", "greenhouse", "--slug", "rollback", "--refresh")
  const good = await readFile(path, "utf8")
  // Quarto is not reachable: the checks pass (they are offline), the re-registration fails.
  const broken = cliWith({ PATH: "/nonexistent" }, q2, "publish", "--collection", "greenhouse", "--slug", "rollback", "--date", "2026-11-20", "--yes")
  check(broken.code === 1 && /put back/.test(broken.text) && (await readFile(path, "utf8")) === good, `rollback: ${broken.text}`)
})

await test("AUTH-030", "Ordinary builds do not execute scientific computations", async (check) => {
  const pkg = JSON.parse(await read(repo, "package.json"))
  check(pkg.scripts.build === "node scripts/science.mjs verify && node scripts/public-build.mjs", `build: ${pkg.scripts.build}`)
  for (const name of ["build", "check", "test", "verify", "dev", "demo:build"])
    check(!/science:execute|--execute/.test(pkg.scripts[name] ?? ""), `${name} executes`)
  const executing = Object.entries(pkg.scripts).filter(([, v]) => /science.mjs execute|science:execute/.test(v))
  check(executing.length === 1 && executing[0][0] === "science:execute", `commands that execute: ${json(executing.map(([k]) => k))}`)
  // The offline check refuses a document with unexecuted code rather than running it.
  const root = await workspace()
  const sentinel = join(root, "RAN")
  await write(root, "science/greenhouse/computes.qmd", `---\ntitle: "C"\nstatus: draft\nslug: computes\n---\n\n\`\`\`{python}\nopen(${json(sentinel)}, "w").write("x")\n\`\`\`\n`)
  const issues = await verify(root)
  check(issues.some((i) => /never executed|no rendering/.test(i)) && !existsSync(sentinel), `verify: ${json(issues)}`)
})

// --- Workbench and demonstrations ----------------------------------------------------------------

await test("AUTH-033", "The workbench commands match the actual CLI", async (check) => {
  const pkg = JSON.parse(await read(repo, "package.json"))
  const scripts = Object.keys(pkg.scripts).filter((s) => s.startsWith("content:")).sort()
  check(same(scripts, COMMANDS.map((c) => c.script).sort()), `package.json: ${json(scripts)}`)
  for (const command of COMMANDS) {
    check(pkg.scripts[command.script] === `node scripts/content.mjs ${command.id}`, `${command.script}: ${pkg.scripts[command.script]}`)
    check(command.examples.length > 0 && command.examples.every((e) => e.startsWith(`npm run ${command.script} -- `)), `${command.id}: an example does not run this command`)
    for (const example of command.examples)
      for (const flag of example.match(/(?<= )--[a-z-]+/g) ?? []) {
        if (flag === "--") continue
        check(flag.slice(2) in OPTIONS, `${command.id}: ${flag} is not an option of the CLI`)
      }
  }
  // Every example is valid on a real project: the first words and the flags run, in a copy.
  const root = await workspace()
  const flat = (s) => s.replace(/"([^"]*)"/g, (_, t) => t.replace(/ /g, "\u0000")).split(" ").slice(4).map((a) => a.replace(/\u0000/g, " "))
  for (const example of COMMANDS.flatMap((c) => c.examples)) {
    const [, id] = /content:(\w+)/.exec(example)
    const run = cli(root, id, ...flat(example).filter((a) => a !== "--"))
    check(run.code !== 2, `${example}: the CLI did not accept its own example: ${run.text}`)
  }
  // The guide and the README quote every command.
  for (const doc of ["development/authoring-guide.md", "README.md"]) {
    const text = await read(repo, doc)
    for (const command of COMMANDS) check(text.includes(command.script), `${doc} does not mention ${command.script}`)
  }
  // The workbench draws them from the same list (not its own copy).
  const page = await read(repo, "src/pages/[design]/publishing/index.astro")
  check(/COMMANDS/.test(page) && /checklist\(\)/.test(page) && /collectionCards\(\)/.test(page), "the workbench does not read the shared lists")
})

await test("AUTH-034", "The synthetic workflow examples are isolated", async (check) => {
  // The transcript on the workbench is what the commands print, from a throwaway project.
  const { transcript, codes, final } = await runScenario()
  const committed = await read(repo, TRANSCRIPT)
  check(transcript === committed, "the workflow transcript on the workbench no longer matches what the commands print: run  node tests/fixtures/authoring/scenario.mjs --write")
  check(same(codes, [0, 0, 1, 0, 0, 0, 0]), `exit codes ${json(codes)}`)
  check(/^status: archived$/m.test(final) && /^publishedAt: 2026-11-20$/m.test(final), "the scenario's final state")
  check(!/\/Users\/|\/tmp\/|\/var\/folders/.test(committed), "the transcript names a local path")
  // Nothing of it is in the site's content or the public folder.
  for (const collection of COLLECTIONS) {
    const dir = join(repo, "src/content", collection.directory)
    for (const file of existsSync(dir) ? await readdir(dir) : [])
      check(!/a-small-example|an-example-of-the-publishing-workflow/.test(await readFile(join(dir, file), "utf8")), `${file} holds the synthetic example`)
  }
  for (const path of ["public", "src/content", "src/data"]) {
    const grep = spawnSync("grep", ["-rIl", "-e", "a-small-example", "-e", "an-example-of-the-publishing-workflow", join(repo, path)], { encoding: "utf8" })
    check(grep.stdout.trim() === "", `${path} mentions the synthetic example: ${grep.stdout}`)
  }
  // The workbench's pages exist only behind the development gate.
  for (const page of ["index", "workflow/index", "draft-example/index"]) {
    const text = await read(repo, `src/pages/[design]/publishing/${page}.astro`)
    check(/demosEnabled\(\) \? \[\{ params: \{ design: "_design" \} \}\] : \[\]/.test(text), `${page}.astro is not gated`)
  }
})

// --- Regression ----------------------------------------------------------------------------------

/** Paths that must be exactly what they were when P14 began. */
function unchanged(id, title, paths, note = "") {
  return test(id, title, async (check) => {
    if (!gitAvailable) return skip(id, `git or ${BASE} is not available`)
    const touched = p14Files(paths)
    check(touched.length === 0, `P14 changed protected files${note}: ${json(touched)}`)
  })
}

await test("AUTH-036", "All eight editorial collections remain valid", async (check) => {
  check(COLLECTIONS.length === 8 && COLLECTIONS.map((c) => c.id).join() === "blog,trail,greenhouse,berries,timberLogs,monthsOriginal,kosmos,bookClub", "the collections changed")
  if (!gitAvailable) return skip("AUTH-036 (git part)", "git is not available")
  const touched = p14Files(["src/editorial/collections.ts", "src/editorial/schema.ts", "src/content.config.ts"])
  check(touched.length === 0, `the collection definitions changed: ${json(touched)}`)
})

await unchanged("AUTH-037", "P12 reading layouts remain unchanged", [
  "src/layouts/editorial",
  "src/components/editorial/indexes",
  "src/components/editorial/EditorialArticle.astro",
  "src/components/editorial/EditorialEntry.astro",
  "src/components/editorial/CollectionIndex.astro",
  "src/styles/editorial.css",
  "src/editorial/reading.ts",
  "src/editorial/model.ts",
])

await test("AUTH-037B", "The Greenhouse Overview changed only by the workbench link", async (check) => {
  if (!gitAvailable) return skip("AUTH-037B", "git is not available")
  const diff = p14Patch("src/components/editorial/CollectionOverview.astro")
  const removed = diff.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---"))
  const added = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"))
  check(removed.length === 0, `lines were removed: ${json(removed)}`)
  check(added.join("\n").includes("Publishing Workbench") && added.length <= 8, `added: ${json(added)}`)
})

await test("AUTH-038", "P13 scientific publishing remains functional", async (check) => {
  check((await verify(repo)).length === 0, `the committed articles are not current: ${json(await verify(repo))}`)
  if (!gitAvailable) return skip("AUTH-038 (git part)", "git is not available")
  const touched = p14Files(["scripts/science.mjs", "scripts/science-html.mjs", "scripts/science-env.mjs", "science", "src/science", "src/demos"])
  check(touched.length === 0, `P13's files changed: ${json(touched)}`)
})

await unchanged("AUTH-039", "P11 canonical records remain intact", ["src/records", "src/data"])

await test("AUTH-040", "The unfinished versioned CV YAML remains untouched", async (check) => {
  if (!gitAvailable) return skip("AUTH-040", "git is not available")
  const touched = p14Files(["cv"])
  check(touched.length === 0, `P14 changed the CV: ${json(touched)}`)
  // No P14 file opens a CV file or imports the CV modules.
  for (const file of ["scripts/content-lib.mjs", "scripts/content.mjs", "src/editorial/authoring.ts"]) {
    const text = await read(repo, file)
    check(!/\bcv\/|cv\/source|cv\/adapter|from "yaml"|CV\.proposta/.test(text), `${file} reaches the CV`)
  }
})

await unchanged("AUTH-041", "The five Chromatic Archive palettes remain unchanged", ["src/styles/categories.css", "src/styles/tokens.css", "src/styles/environments.css", "src/design/contract.mjs"])

await test("AUTH-042", "The eleven global folder tabs remain unchanged", async (check) => {
  check(SECTIONS.length === 11, `${SECTIONS.length} top-level folders`)
  if (!gitAvailable) return skip("AUTH-042 (git part)", "git is not available")
  const touched = p14Files(["src/navigation"])
  check(touched.length === 0, `the navigation changed: ${json(touched)}`)
})

await unchanged("AUTH-043", "The physical-folder implementation remains unchanged", [
  "src/components/folders",
  "src/styles/folders.css",
  "src/scripts",
  "src/layouts",
  "src/styles/view-transitions.css",
  "brand",
])

// --- Report --------------------------------------------------------------------------------------

for (const root of cleanup) await rm(root, { recursive: true, force: true })
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
  `PASS: ${results.length} authoring checks${skipped.length > 0 ? `; SKIPPED (not passed): ${skipped.join(", ")}` : ""}`,
)
