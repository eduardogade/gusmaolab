// A throwaway demonstration build for the tests that read development pages (P22, D-157). Since D-157 every
// development page, including the six design studies of P03 to P12, is routed only in development and demonstration
// builds (src/editorial/demo.ts), so `dist/` (the release) has none of them and the tests of those pages read this
// instead. It is made once per process, with `astro build --mode demo`, into a temporary folder; `dist/` and
// `dist-demo/` are never written, and the folder is removed when the process ends.
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, realpathSync, rmSync } from "node:fs"
import { readFile, readdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const repo = fileURLToPath(new URL("../", import.meta.url))
let building

async function listFiles(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await listFiles(path)))
    else out.push(path)
  }
  return out
}

export function demoBuild() {
  building ??= (async () => {
    const holder = mkdtempSync(join(realpathSync(tmpdir()), "gusmaolab-demo-dist-"))
    process.on("exit", () => rmSync(holder, { recursive: true, force: true }))
    const dir = join(holder, "dist-demo")
    const run = spawnSync(process.execPath, [join(repo, "node_modules/astro/bin/astro.mjs"), "build", "--mode", "demo", "--outDir", dir], {
      cwd: repo,
      encoding: "utf8",
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", FORCE_COLOR: "0" },
    })
    if (run.status !== 0 || !existsSync(join(dir, "index.html"))) throw new Error(`the throwaway demonstration build failed:\n${run.stdout}\n${run.stderr}`.slice(0, 1500))
    const files = (await listFiles(dir)).map((f) => relative(dir, f)).sort()
    return { dir, files, read: (rel) => readFile(join(dir, rel), "utf8") }
  })()
  return building
}
