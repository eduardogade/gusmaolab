// The download check (P18, D-127): `node scripts/downloads.mjs [source|dist]`, run by the release build
// (scripts/public-build.mjs) before and after `astro build`, and by `npm test` through tests/util.mjs.
//
//   source   the registry against the repository: every approved download has its file in
//            public/downloads/, with an allowed type and a matching media type, and nothing else is
//            in public/downloads/ or looks like a private source anywhere in public/.
//   dist     the same registry against the built folder: every approved download is in dist/ under
//            its public path, byte for byte the file in public/downloads/, and nothing registered
//            only for demonstrations (/demo-downloads/) or any CV source is in dist/.
//
// It reads and writes nothing else, fetches nothing, and prints actionable sentences. Exit code 1
// on any problem. A build with an approved download whose file is missing fails here, not in a
// visitor's browser.
import { existsSync } from "node:fs"
import { readFile, readdir } from "node:fs/promises"
import { join, relative } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { DOWNLOADS, PLANNED_DOWNLOADS } from "../src/data/downloads.ts"
import { factsOf } from "../src/downloads/files.ts"
import { DOWNLOAD_ROOTS, validateDownloads } from "../src/downloads/registry.ts"

export const ROOT = fileURLToPath(new URL("../", import.meta.url))
/** Names that mean a private or unfinished source, wherever they are in a public folder. */
const PRIVATE_NAME = /proposta|(^|[\\/])cv[-.][^\\/]*\.ya?ml$|\.ya?ml$|identities\.json$|manifest\.json$|(^|[\\/])\.env/i

async function walk(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(path)))
    else out.push(path)
  }
  return out.sort()
}

/** Problems with the registry and the files in the repository. `registry` lets a test pass its own. */
export async function sourceIssues({ root = ROOT, approved = DOWNLOADS, planned = PLANNED_DOWNLOADS } = {}) {
  const issues = validateDownloads(approved, planned, factsOf(approved, "release", root))
  const folder = join(root, DOWNLOAD_ROOTS.release.directory)
  const registered = new Set(approved.map((r) => r.fileName))
  for (const file of await walk(folder)) {
    const name = relative(folder, file)
    if (!registered.has(name)) issues.push(`public/downloads/${name} is not in the registry (src/data/downloads.ts): a file is published only when it is registered and approved; remove it or register it`)
  }
  for (const file of await walk(join(root, "public"))) {
    const rel = relative(join(root, "public"), file)
    if (PRIVATE_NAME.test(rel)) issues.push(`public/${rel} looks like a private or unfinished source and would be copied into every build`)
  }
  return issues
}

/** Problems with a built folder: every approved download is there, identical, and nothing it must not hold. */
export async function distIssues(dist, { root = ROOT, approved = DOWNLOADS } = {}) {
  const issues = []
  if (!existsSync(dist)) return [`${relative(root, dist) || dist} does not exist: nothing was built`]
  for (const resource of approved) {
    const built = join(dist, resource.publicPath.slice(1))
    const source = join(root, DOWNLOAD_ROOTS.release.directory, resource.fileName)
    if (!existsSync(built)) issues.push(`download "${resource.id}": ${resource.publicPath} is not in the build`)
    else if (existsSync(source) && !(await readFile(built)).equals(await readFile(source)))
      issues.push(`download "${resource.id}": the built ${resource.publicPath} differs from public/downloads/${resource.fileName}`)
  }
  for (const file of await walk(dist)) {
    const rel = relative(dist, file)
    if (rel.startsWith("demo-downloads")) issues.push(`${rel}: a demonstration download is in the release build`)
    if (PRIVATE_NAME.test(rel)) issues.push(`${rel}: looks like a private or unfinished source in the build`)
    if (rel.startsWith("downloads/") && !approved.some((r) => r.publicPath === `/${rel}`)) issues.push(`${rel}: a file in dist/downloads/ that is not a registered download`)
  }
  return issues
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] ?? "source"
  const issues = mode === "dist" ? await distIssues(join(ROOT, process.argv[3] ?? "dist")) : await sourceIssues()
  for (const issue of issues) console.error(`  - ${issue}`)
  if (issues.length > 0) {
    console.error(`FAIL: ${issues.length} download problem(s) (${mode}).`)
    process.exit(1)
  }
  console.log(`PASS: ${DOWNLOADS.length} approved and ${PLANNED_DOWNLOADS.length} planned download(s) check out (${mode}).`)
}
