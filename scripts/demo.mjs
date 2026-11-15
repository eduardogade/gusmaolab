// The demonstration build (P13-A01, D-105): the site with its synthetic demonstrations, in a folder
// of its own so that it can never be mistaken for the release.
//
//   npm run demo:build     astro build --mode demo --outDir dist-demo, then demo:verify
//   npm run demo:preview   serve dist-demo/ on http://localhost:4323/
//   npm run demo:verify    does dist-demo/ hold every demonstration, labelled?
//
// `npm run dev` needs none of this: the dev server shows the demonstrations already.
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import process from "node:process"
import { demoBuildIssues, DEMO_OUT, ROOT } from "./demo-check.mjs"

const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" }
const astro = (args) =>
  spawnSync("npx", ["astro", ...args], { stdio: "inherit", env, cwd: ROOT })

async function verify() {
  const issues = await demoBuildIssues(join(ROOT, DEMO_OUT))
  if (issues.length > 0) {
    console.error(`FAIL: ${DEMO_OUT}/ is not a complete demonstration build:`)
    for (const issue of issues) console.error(`  - ${issue}`)
    process.exit(1)
  }
  console.log(
    `PASS: ${DEMO_OUT}/ holds every demonstration, each labelled as synthetic`,
  )
}

const [command] = process.argv.slice(2)
if (command === "build") {
  const science = spawnSync(
    process.execPath,
    [join(ROOT, "scripts/science.mjs"), "verify"],
    {
      stdio: "inherit",
      cwd: ROOT,
    },
  )
  if (science.status !== 0) process.exit(science.status ?? 1)
  const built = astro(["build", "--mode", "demo", "--outDir", DEMO_OUT])
  if (built.status !== 0) process.exit(built.status ?? 1)
  await verify()
} else if (command === "preview") {
  process.exit(astro(["preview", "--outDir", DEMO_OUT, "--port", "4323"]).status ?? 1)
} else if (command === "verify") {
  await verify()
} else {
  console.error("usage: demo.mjs build | preview | verify")
  process.exit(1)
}
