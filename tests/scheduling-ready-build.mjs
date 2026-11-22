// A release build of a throwaway copy of the project with scheduling ENABLED on a synthetic booking
// link (P21, D-150), so the ready Schedule page, its single script and its failure paths can be
// tested although the owner has no provider account. The repository is never written: the copy is
// in the system's temporary folder and its src/data/scheduling.ts is replaced there only.
//
// The booking link is synthetic and the provider is never contacted by these builds' tests: the
// browser test blocks the provider's origin, and the Node tests use a stand-in browser. Nothing
// built here is real availability, and nothing here proves the provider works.
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { cp, mkdtemp, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { releaseEnvironment } from "../scripts/demo-check.mjs"

export const repo = fileURLToPath(new URL("../", import.meta.url))
export const SYNTHETIC_LINK = "https://cal.com/synthetic-test-user/synthetic-meeting"

export const READY_CONFIG = `import type { SchedulingConfig } from "../scheduling/config.ts"
export const SCHEDULING_CONFIG: SchedulingConfig = {
  provider: "calcom",
  enabled: true,
  bookingUrl: "${SYNTHETIC_LINK}",
  ownerTimeZone: "America/Recife",
  availabilitySourcePath: "env:GUSMAOLAB_AVAILABILITY_FILE",
  providerSettings: { requiresConfirmation: true, requiresBookerEmailVerification: true, pendingRequestsHoldSlots: true },
  approvedOn: "2027-01-01",
}
`

async function listFiles(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await listFiles(path)))
    else out.push(path)
  }
  return out
}

/**
 * Builds the throwaway project in `mode` ("production" for the release build) with `config` as
 * src/data/scheduling.ts. Returns the output folder, its files and a `cleanup()`.
 */
export async function buildWith(config = READY_CONFIG, mode = "production", outDir = "dist") {
  const root = await mkdtemp(join(await realpath(tmpdir()), "gusmaolab-scheduling-"))
  for (const item of ["src", "public", "science", "astro.config.mjs", "tsconfig.json", "package.json"])
    await cp(join(repo, item), join(root, item), { recursive: true, filter: (path) => !/science\/(_build|\.quarto)/.test(path) })
  await symlink(join(repo, "node_modules"), join(root, "node_modules"), "dir")
  await writeFile(join(root, "src/data/scheduling.ts"), config)
  const env = mode === "production" ? releaseEnvironment(process.env) : { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" }
  const run = spawnSync(
    process.execPath,
    [join(repo, "node_modules/astro/bin/astro.mjs"), "build", "--root", root, "--mode", mode, "--outDir", outDir],
    { cwd: root, encoding: "utf8", env: { ...env, FORCE_COLOR: "0" } },
  )
  const dist = join(root, outDir)
  const files = existsSync(dist) ? (await listFiles(dist)).map((f) => relative(dist, f)).sort() : []
  return {
    ok: run.status === 0,
    output: `${run.stdout}\n${run.stderr}`,
    root,
    dist,
    files,
    cleanup: () => rm(root, { recursive: true, force: true }),
  }
}
