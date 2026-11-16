// The authoring workflow, end to end, in a throwaway project folder (P14, AUTH-E2E).
//
// A SYNTHETIC article is created, broken on purpose, repaired, checked, published and archived
// with the real commands. The folder is made fresh in the system's temporary directory and
// removed afterwards: the real src/content/ is never touched. The text this produces is shown in
// the development workbench (src/design/publishing/workflow-transcript.txt) and tests/authoring.mjs
// regenerates it and fails when the committed copy no longer matches, so the page cannot describe
// commands that behave differently.
//
//   node tests/fixtures/authoring/scenario.mjs --write    rewrites the committed transcript
import { spawnSync } from "node:child_process"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const repo = fileURLToPath(new URL("../../../", import.meta.url))
export const TRANSCRIPT = "src/design/publishing/workflow-transcript.txt"
const SLUG = "a-small-example"
const FILE = `src/content/greenhouse/${SLUG}.md`

/** Runs the scenario and returns its transcript and what it observed, for the tests. */
export async function runScenario() {
  const root = await mkdtemp(join(tmpdir(), "gusmaolab-authoring-"))
  const out = []
  const seen = { codes: [] }
  try {
    await mkdir(join(root, "science"), { recursive: true })
    const run = (command, ...args) => {
      const shown = args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ")
      out.push(`$ npm run content:${command} -- ${shown}`)
      const result = spawnSync(
        process.execPath,
        [join(repo, "scripts/content.mjs"), command, "--root", root, ...args],
        { encoding: "utf8" },
      )
      out.push((result.stdout + result.stderr).trimEnd(), `[exit ${result.status}]`, "")
      seen.codes.push(result.status)
      return result
    }
    const show = async (lines = 8) => {
      const text = await readFile(join(root, FILE), "utf8")
      out.push(`$ head -n ${lines} ${FILE}`, text.split("\n").slice(0, lines).join("\n"), "")
    }
    const edit = async (change) => {
      const path = join(root, FILE)
      await writeFile(path, change(await readFile(path, "utf8")))
    }
    const target = ["--collection", "greenhouse", "--slug", SLUG]

    run("new", "--collection", "greenhouse", "--title", "A Small Example")
    await show(12)
    run("validate", ...target)
    out.push("# edit the file: delete the TODO line, add a description (misspelt on purpose)", "")
    await edit((t) =>
      t
        .replace(/^# description:.*$/m, 'desription: "One sentence for the index."')
        .replace(/^<!-- TODO.*-->\n\n/m, ""),
    )
    run("validate", ...target)
    out.push("# correct the spelling", "")
    await edit((t) => t.replace(/^desription:/m, "description:"))
    run("validate", ...target)
    run("publish", ...target, "--date", "2026-11-20")
    run("publish", ...target, "--date", "2026-11-20", "--yes")
    await show(7)
    run("archive", ...target, "--yes")
    await show(7)
    seen.final = await readFile(join(root, FILE), "utf8")
  } finally {
    await rm(root, { recursive: true, force: true })
  }
  return { transcript: out.join("\n").trimEnd() + "\n", ...seen }
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes("--write")) {
  const { transcript } = await runScenario()
  await writeFile(join(repo, TRANSCRIPT), transcript)
  console.log(`wrote ${TRANSCRIPT}`)
}
