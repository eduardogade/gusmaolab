// Explicit recomputation of the Quarto demonstration (P13-A01): P13A-008 and P13A-016. Like
// tests/science-execute.mjs it runs the real tool, so it needs Quarto and the environment (the
// micromamba environment gusmaolab-science, or SCIENCE_PYTHON); without them each check is
// reported SKIPPED, never passed, and the process exits 0.
//
// What it shows: `execute`, from no frozen results at all, produces the same article, entry, figure
// and frozen results, byte for byte, as the committed ones; and afterwards `render` recomputes
// nothing (it succeeds with no Python). What it does not show: that another operating system gives
// the same bytes, or that a real analysis would.
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { buildDocument, toolchain } from "../scripts/science.mjs"
import { cleanup, DEMO, executeDemoInCopy } from "./demo-run.mjs"

const IDS = ["P13A-008", "P13A-016"]
const tools = toolchain()
if (tools.quarto === null || !tools.jupyter) {
  for (const id of IDS)
    console.log(
      `SKIPPED ${id} (${tools.quarto === null ? "Quarto is not installed" : "no Python with Jupyter"})`,
    )
  console.log(
    "SKIPPED: the demonstration's execution checks did not run, and are not reported as passed",
  )
  process.exit(0)
}

const failures = { "P13A-008": [], "P13A-016": [] }
const { root, differences, executed, info } = await executeDemoInCopy()
try {
  if (!executed.executed)
    failures["P13A-008"].push("execute did not run the document's code")
  const manifest = JSON.parse(
    await readFile(join(root, "src/science/manifest.json"), "utf8"),
  )
  const record = manifest.documents[DEMO]
  if (record?.execution?.python === undefined)
    failures["P13A-008"].push("the manifest does not record the Python that ran")
  if (!/^3\.12\./.test(record?.execution?.python ?? ""))
    failures["P13A-008"].push(`executed with Python ${record?.execution?.python}`)
  // Rendering afterwards computes nothing: it works with no Python at all.
  process.env.SCIENCE_PYTHON = "/nonexistent/python"
  try {
    const again = await buildDocument(root, DEMO, { execute: false })
    if (again.executed) failures["P13A-008"].push("render computed something")
  } catch (error) {
    failures["P13A-008"].push(`render without Python failed: ${error.message}`)
  }
  for (const difference of differences) failures["P13A-016"].push(difference)
  const figure = await readFile(
    join(root, info.assetDir, "fig-signals-output-1.svg"),
    "utf8",
  )
  if (!figure.includes("<polyline"))
    failures["P13A-016"].push("the executed figure has no data")
} finally {
  await cleanup(root)
}

const TITLES = {
  "P13A-008": "Explicit recomputation works, and rendering computes nothing",
  "P13A-016":
    "The computation is deterministic: byte-identical to the committed results",
}
let failed = 0
for (const id of IDS) {
  if (failures[id].length === 0) console.log(`PASS ${id} ${TITLES[id]}`)
  else {
    failed++
    console.error(`FAIL ${id} ${TITLES[id]}`)
    for (const message of failures[id]) console.error(`  - ${message}`)
  }
}
if (failed > 0) process.exit(1)
console.log(
  "PASS: 2 demonstration execution checks; 1 throwaway execution from no frozen results",
)
