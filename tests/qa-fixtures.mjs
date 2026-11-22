// Throwaway copies of a build with one controlled defect, for the QA system's own tests (P22, D-153). The
// real dist/ and the real source are never written: a copy is made in the system's temporary folder, a defect is
// introduced into the copy, the QA audits are pointed at it, and the copy is removed. Nothing here touches
// editorial content, a CV file or a master.
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { cp, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

export const repo = fileURLToPath(new URL("../", import.meta.url))

export async function copyBuild(source = join(repo, "dist")) {
  const holder = await mkdtemp(join(await realpath(tmpdir()), "gusmaolab-qa-fixture-"))
  const dist = join(holder, "dist")
  await cp(source, dist, { recursive: true })
  return { holder, dist, reports: join(holder, "report"), cleanup: () => rm(holder, { recursive: true, force: true }) }
}

/** A stable fingerprint of a folder: every file's relative path and content hash. */
export async function fingerprint(dir) {
  const hash = createHash("sha256")
  const walk = async (d, prefix = "") => {
    for (const entry of (await readdir(d, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(d, entry.name)
      if (entry.isDirectory()) await walk(path, `${prefix}${entry.name}/`)
      else hash.update(`${prefix}${entry.name}:${createHash("sha256").update(await readFile(path)).digest("hex")}\n`)
    }
  }
  await walk(dir)
  return hash.digest("hex")
}

/** The defects, each as a change to a copied page and the check that must catch it. */
export const DEFECTS = [
  { name: "a broken internal link", check: "QA-LINK-01", file: "contact/index.html", apply: (html) => html.replace("</main>", '<a href="/this-page-does-not-exist/">broken</a></main>') },
  { name: "a missing title", check: "QA-META-02", file: "contact/index.html", apply: (html) => html.replace(/<title>[\s\S]*?<\/title>/, "") },
  { name: "a missing meta description", check: "QA-META-04", file: "cv/index.html", apply: (html) => html.replace(/<meta name="description"[^>]*>/, "") },
  { name: "a missing image file", check: "QA-IMG-01", file: "bearnards-area/index.html", apply: (html) => html.replace(/(<img[^>]*src=")[^"]+(")/, "$1/illustrations/bearnard/does-not-exist.webp$2") },
  { name: "an unexpected development page", check: "QA-ROUTE-07", file: "_design/qa-fixture/index.html", create: '<!doctype html><html lang="en"><head><title>x</title></head><body><h1>x</h1></body></html>' },
]

/** Runs the QA command's static audits on `dist` into `reports`. Returns the exit status and the report. */
export function runAudits(dist, reports) {
  const run = spawnSync(process.execPath, [join(repo, "scripts/qa.mjs"), "--only", "audits", "--dist", dist, "--report-dir", reports], { cwd: repo, encoding: "utf8" })
  return run
}

export async function readReport(reports) {
  return JSON.parse(await readFile(join(reports, "latest.json"), "utf8"))
}

export { writeFile, readFile }
