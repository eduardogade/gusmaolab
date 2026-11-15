// The release build (P13-A01, D-105): `astro build` in Astro's "production" mode, then a check of
// what it wrote. It exists so that the demonstrations (src/demos/) cannot reach a release by
// accident: the mode is passed explicitly, the environment is cleaned of what can override it
// (releaseEnvironment), and the output is searched for every trace of them. A build with a trace
// fails. A deployment must run `npm run build`, not `astro build` directly.
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import process from "node:process"
import { publicBuildIssues, releaseEnvironment, ROOT } from "./demo-check.mjs"

const env = releaseEnvironment(process.env)
const built = spawnSync(
  "npx",
  ["astro", "build", "--mode", "production", "--outDir", "dist"],
  { stdio: "inherit", env, cwd: ROOT },
)
if (built.status !== 0) process.exit(built.status ?? 1)

const issues = await publicBuildIssues(join(ROOT, "dist"))
if (issues.length > 0) {
  console.error(
    `FAIL: the release build holds ${issues.length} trace(s) of demonstrations:`,
  )
  for (const issue of issues.slice(0, 20)) console.error(`  - ${issue}`)
  process.exit(1)
}
console.log("PASS: the release build holds no demonstration")
