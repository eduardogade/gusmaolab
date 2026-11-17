/**
 * Reading the files behind the registered downloads (P18, D-127): where a public path lives in the
 * repository, and what is known of the file there. The only module of the downloads system that
 * touches the file system; the rules are in registry.ts. It runs at build time and in tests, never
 * in a visitor's browser.
 */
import { createHash } from "node:crypto"
import { existsSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { DOWNLOAD_ROOTS } from "./registry.ts"
import type { DownloadResource, DownloadRoot, FileFact } from "./registry.ts"

/**
 * The repository root. From source this module is two folders below it; inside a build's bundle
 * (dist/, dist-demo/ or a temporary output folder) it is not, so walk up to the folder that holds
 * src/data/downloads.ts and, failing that, use the folder the build was started in.
 */
function findRepository(): string {
  let dir = dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 8; i++, dir = dirname(dir)) if (existsSync(join(dir, "src/data/downloads.ts"))) return dir
  return process.cwd()
}

export const REPOSITORY = findRepository()

/** The file a resource is served from, as an absolute path, or undefined if its path is outside the root. */
export function fileOf(resource: DownloadResource, root: DownloadRoot = "release", repo = REPOSITORY): string | undefined {
  const { urlPrefix, directory } = DOWNLOAD_ROOTS[root]
  if (!resource.publicPath.startsWith(urlPrefix)) return undefined
  const name = resource.publicPath.slice(urlPrefix.length)
  if (name === "" || name.includes("/") || name.includes("..")) return undefined
  return join(repo, directory, name)
}

/** What is known of each resource's file, keyed by public path. */
export function factsOf(
  resources: readonly DownloadResource[],
  root: DownloadRoot = "release",
  repo = REPOSITORY,
): Map<string, FileFact> {
  const facts = new Map<string, FileFact>()
  for (const resource of resources) {
    const file = fileOf(resource, root, repo)
    facts.set(
      resource.publicPath,
      file !== undefined && existsSync(file) && statSync(file).isFile()
        ? { exists: true, size: statSync(file).size }
        : { exists: false },
    )
  }
  return facts
}

/** The size in bytes of a resource's file; throws, with the path, if it is missing. */
export function sizeOf(resource: DownloadResource, root: DownloadRoot = "release", repo = REPOSITORY): number {
  const file = fileOf(resource, root, repo)
  if (file === undefined || !existsSync(file)) throw new Error(`download "${resource.id}": its file is missing (${resource.publicPath})`)
  return statSync(file).size
}

/** The SHA-256 of a resource's file, for a technical download that wants one. Never stored by hand. */
export function checksumOf(resource: DownloadResource, root: DownloadRoot = "release", repo = REPOSITORY): string {
  const file = fileOf(resource, root, repo)
  if (file === undefined || !existsSync(file)) throw new Error(`download "${resource.id}": its file is missing (${resource.publicPath})`)
  return createHash("sha256").update(readFileSync(file)).digest("hex")
}
