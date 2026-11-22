// Which source state a QA report describes, and whether a displayed report is still current (P22, D-153).
// A report records the commit it was made at and a fingerprint of the working tree; the development quality page
// recomputes both and says "stale" when they differ, so an old report is never labelled current.
//
// Read-only and process-free: it parses `.git/HEAD` and its refs with ordinary file reads (no `git` is run: no
// module under src/ may start a process, QTO-016) and fingerprints the tree by the names, sizes and modification
// times of the files that make the site (a touched file counts as a change: the check errs towards "stale").
// It is plain JavaScript on purpose: no @types/node is installed, and this is development tooling, not site code.
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

export const REPO = fileURLToPath(new URL("../../", import.meta.url))

/** The folder Astro was started in (its project root). A built page's own URL points into the build, not the repository. */
export const projectRoot = () => process.cwd()

/** What belongs to the fingerprint: the site's own folders and files, never generated output or private folders. */
const WATCHED = ["src", "tests", "scripts", "public", "planning", "development", "debugging", "science", "cv", ".github", "package.json", "package-lock.json", "astro.config.mjs", "tsconfig.json", ".node-version", "AGENTS.md", "CLAUDE.md", "README.md"]
const SKIPPED = new Set(["node_modules", "dist", "dist-demo", ".astro", "qa-report", ".git", "_build", ".quarto", "_freeze", "__pycache__"])

function* files(root, relative) {
  const full = join(root, relative)
  let stat
  try { stat = statSync(full) } catch { return }
  if (stat.isFile()) { yield [relative, stat]; return }
  if (!stat.isDirectory()) return
  for (const name of readdirSync(full).sort()) if (!SKIPPED.has(name)) yield* files(root, join(relative, name))
}

/** The commit HEAD points at, read from the git folder; null when it cannot be told. */
export function readHead(root = REPO) {
  try {
    let gitDir = join(root, ".git")
    if (statSync(gitDir).isFile()) gitDir = join(root, readFileSync(gitDir, "utf8").replace(/^gitdir:\s*/, "").trim())
    const head = readFileSync(join(gitDir, "HEAD"), "utf8").trim()
    if (!head.startsWith("ref: ")) return { head, branch: null }
    const ref = head.slice(5)
    const branch = ref.replace(/^refs\/heads\//, "")
    const loose = join(gitDir, ref)
    if (existsSync(loose)) return { head: readFileSync(loose, "utf8").trim(), branch }
    // A worktree keeps its refs in the common directory; a packed ref lives in packed-refs.
    for (const dir of [gitDir, existsSync(join(gitDir, "commondir")) ? join(gitDir, readFileSync(join(gitDir, "commondir"), "utf8").trim()) : null].filter(Boolean)) {
      const file = join(dir, ref)
      if (existsSync(file)) return { head: readFileSync(file, "utf8").trim(), branch }
      const packed = join(dir, "packed-refs")
      if (existsSync(packed)) {
        const line = readFileSync(packed, "utf8").split("\n").find((l) => l.endsWith(` ${ref}`))
        if (line) return { head: line.split(" ")[0], branch }
      }
    }
    return { head: null, branch }
  } catch {
    return { head: null, branch: null }
  }
}

/** `{ head, branch, fingerprint, files, newest }`; a null fingerprint outside a git checkout. */
export function sourceState(root = REPO) {
  const { head, branch } = readHead(root)
  if (head === null) return { head: null, branch, fingerprint: null, files: 0, newest: 0 }
  const hash = createHash("sha256")
  hash.update(head)
  let count = 0
  let newest = 0
  for (const item of WATCHED)
    for (const [relative, stat] of files(root, item)) {
      count += 1
      newest = Math.max(newest, Math.round(stat.mtimeMs))
      hash.update(`${relative}:${stat.size}:${Math.round(stat.mtimeMs)}\n`)
    }
  return { head, branch, fingerprint: hash.digest("hex").slice(0, 16), files: count, newest }
}

/** How a report compares with the tree as it is now. */
export function freshness(report, now = sourceState()) {
  const was = report?.source
  if (!was || was.fingerprint == null || now.fingerprint == null) return { state: "unknown", text: "The source state of this report or of the working tree cannot be determined." }
  if (was.head !== now.head) return { state: "stale", text: `The report describes commit ${was.head.slice(0, 7)}; the working tree is now at ${now.head.slice(0, 7)}.` }
  if (was.fingerprint !== now.fingerprint) return { state: "stale", text: "Files have changed since this report was generated. Run npm run qa again." }
  return { state: "current", text: "No file has changed since this report was generated." }
}

/** The latest report, or `{ report: null, unreadable }`. */
export function readLatestReport(root = REPO) {
  const file = join(root, "qa-report/latest.json")
  if (!existsSync(file)) return { report: null, unreadable: "" }
  try {
    return { report: JSON.parse(readFileSync(file, "utf8")), unreadable: "" }
  } catch (error) {
    return { report: null, unreadable: String(error.message) }
  }
}
