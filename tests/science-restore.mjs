// Rebuilds the scientific environment from its committed specification in a fresh folder, and runs
// the demonstration there (P13-A01): P13A-005B. It needs the network (conda-forge and PyPI) and a
// minute or two, so it is not part of `npm test`; run it with `npm run science:restore-test`. The
// working environment is never touched: the new one is made under a temporary folder and removed.
//
// What it shows: environment.yml and requirements.txt alone are enough to get an interpreter and
// packages that `science:env -- check` accepts, and that execute the demonstration to the same
// bytes as the committed results. What it does not show: another operating system's behaviour.
import { spawnSync } from "node:child_process"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { cleanup, executeDemoInCopy } from "./demo-run.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const holder = await mkdtemp(join(tmpdir(), "gusmaolab-restore-"))
const prefix = join(holder, "env")
let code = 0
try {
  console.log(`creating a fresh environment at ${prefix} ...`)
  const made = spawnSync(
    process.execPath,
    [join(repo, "scripts/science-env.mjs"), "create", "--prefix", prefix],
    {
      cwd: repo,
      stdio: "inherit",
    },
  )
  if (made.status !== 0) throw new Error("create failed")
  process.env.SCIENCE_PYTHON = join(prefix, "bin", "python")
  const { environmentIssues, inspectPython } = await import(
    "../scripts/science-env.mjs"
  )
  const issues = await environmentIssues()
  if (issues.length > 0)
    throw new Error(
      `the fresh environment differs from its specification: ${issues.join("; ")}`,
    )
  const facts = await inspectPython(process.env.SCIENCE_PYTHON)
  console.log(
    `PASS P13A-005B the specification restores an environment: Python ${facts.version} ${facts.machine}, ${Object.keys(facts.pins).length} pinned packages`,
  )
  const { root, differences } = await executeDemoInCopy()
  try {
    if (differences.length > 0) throw new Error(differences.join("; "))
  } finally {
    await cleanup(root)
  }
  console.log(
    "PASS P13A-016B the demonstration computed in the fresh environment is byte-identical to the committed results",
  )
} catch (error) {
  console.error(`FAIL: ${error.message}`)
  code = 1
} finally {
  await rm(holder, { recursive: true, force: true })
}
process.exit(code)
