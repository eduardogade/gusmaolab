// Shared by tests/demo-execute.mjs and tests/science-restore.mjs (P13-A01): executes the Quarto
// demonstration in a throwaway copy of the repository's science/ folder, and compares what came
// out with what is committed. The working tree is never written.
import { createHash } from "node:crypto"
import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises"
import { existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { buildDocument, docInfo } from "../scripts/science.mjs"

export const repo = fileURLToPath(new URL("../", import.meta.url))
export const DEMO = "demo/demo-synthetic-signals"

const sha = (data) => createHash("sha256").update(data).digest("hex")

async function files(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await files(path)))
    else out.push(path)
  }
  return out.sort()
}

/**
 * Executes the demonstration from nothing (no frozen results) in a copy, then renders it again with
 * no results to recompute. Returns { root, differences, executed } where `differences` lists every
 * committed generated file whose bytes are not what the execution produced.
 */
export async function executeDemoInCopy() {
  const root = await mkdtemp(join(tmpdir(), "gusmaolab-demo-run-"))
  await cp(join(repo, "science"), join(root, "science"), {
    recursive: true,
    filter: (from) =>
      !/science\/(?:_build|\.quarto)/.test(from) && !/_freeze\/demo/.test(from),
  })
  const executed = await buildDocument(root, DEMO, { execute: true })
  const info = docInfo(DEMO)
  const differences = []
  // The frozen results hold, besides the computed outputs, Quarto's own list of supporting files, whose
  // last entry depends on whether `execute` or a later `render` wrote the file last. That list is
  // not a result, so the frozen file is compared without it; every published file is compared
  // byte for byte.
  const comparable = async (path, rel) => {
    const raw = await readFile(path)
    if (!rel.startsWith("science/_freeze/") || !rel.endsWith(".json")) return sha(raw)
    const data = JSON.parse(raw.toString("utf8"))
    delete data.result?.supporting
    return sha(JSON.stringify(data))
  }
  const compare = async (rel) => {
    const here = join(root, rel)
    const there = join(repo, rel)
    if (!existsSync(here) || !existsSync(there))
      return differences.push(`${rel}: missing`)
    if ((await comparable(here, rel)) !== (await comparable(there, rel)))
      differences.push(
        `${rel}: ${rel.startsWith("science/_freeze/") && rel.endsWith(".json") ? "computed results" : "bytes"} differ from the committed file`,
      )
  }
  for (const rel of [info.fragment, info.stub]) await compare(rel)
  for (const dir of [info.assetDir, info.freeze])
    for (const file of await files(join(repo, dir))) await compare(relative(repo, file))
  return { root, differences, executed, info }
}

export const cleanup = (root) => rm(root, { recursive: true, force: true })
