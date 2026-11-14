// Controlled computation and reproducibility (P13, D-099, D-102): QTO-017 and QTO-018. They run
// the real tool, so they need Quarto and a Python that has Jupyter (science/environment.txt); set
// SCIENCE_PYTHON to choose it. Without them each check is reported SKIPPED, never passed, and the
// process still exits 0, so a machine that edits only Markdown can run `npm test`.
//
// What they show: the explicit `execute` command runs the document's code, in a throwaway root, and
// produces the same article, entry and figure as the committed fixture; two independent executions
// give byte-identical results; `render` afterwards computes nothing (it succeeds with no Python at
// all). What they do not show: that the analysis of any real data is reproducible, or that another
// machine's Python would give the same figures. The seeded computation is the standard library's.
import { readFile, readdir, rm, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { buildDocument, readManifest, toolchain, verify } from "../scripts/science.mjs"
import { generateFixture } from "./fixtures/science/regenerate.mjs"

const here = fileURLToPath(new URL(".", import.meta.url))
const committed = join(here, "fixtures/science/generated")
const tools = toolchain()
const IDS = ["QTO-017", "QTO-018"]
if (tools.quarto === null || !tools.jupyter) {
  for (const id of IDS)
    console.log(
      `SKIPPED ${id} (${tools.quarto === null ? "Quarto is not installed" : `no Python with Jupyter: set SCIENCE_PYTHON; ${tools.jupyterProblem}`})`,
    )
  console.log(
    "SKIPPED: the controlled-execution checks did not run, and are not reported as passed",
  )
  process.exit(0)
}

const results = []
async function test(id, title, body) {
  const failures = []
  try {
    await body((ok, message) => ok || failures.push(message))
  } catch (error) {
    failures.push(error.stack ?? error.message)
  }
  results.push({ id, title, failures })
}

const FILES = [
  "src/science/greenhouse/fixture-quarto.html",
  "src/content/greenhouse/fixture-quarto.md",
  "public/assets/scientific/greenhouse/fixture-quarto/fig-bar-output-1.svg",
  "src/science/trail/fixture-draft-lesson.html",
]
const sha = async (path) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex")
/** What two runs must agree on: every generated file, and the manifest without the machine's versions. */
async function summary(root) {
  const files = Object.fromEntries(
    await Promise.all(FILES.map(async (f) => [f, await sha(join(root, f))])),
  )
  const manifest = await readManifest(root)
  for (const record of Object.values(manifest.documents)) {
    delete record.quarto
    if (record.execution) delete record.execution.python
  }
  return { files, manifest }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const first = await generateFixture()
const second = await generateFixture()
try {
  await test(
    "QTO-017",
    "The execute command runs the document's code, and render never does",
    async (check) => {
      const manifest = await readManifest(first)
      const record = manifest.documents["greenhouse/fixture-quarto"]
      check(
        record.execution && /^[0-9a-f]{64}$/.test(record.execution.codeSha256),
        "the execution is not recorded",
      )
      check(
        record.execution?.python === tools.python,
        `the Python is not recorded (${record.execution?.python})`,
      )
      check(
        (
          await readdir(join(first, "science/_freeze/greenhouse/fixture-quarto"))
        ).includes("execute-results"),
        "no computed results were frozen",
      )
      check(
        manifest.documents["trail/fixture-draft-lesson"].execution === null,
        "a document without code claims an execution",
      )
      check(
        (await verify(first)).length === 0,
        `the result is not current: ${JSON.stringify(await verify(first))}`,
      )
      // It makes what is committed, exactly.
      const mine = await summary(first)
      const theirs = await summary(committed)
      check(
        same(mine.files, theirs.files),
        `the generated files differ from tests/fixtures/science/generated/:\n${JSON.stringify(mine.files)}\n${JSON.stringify(theirs.files)}`,
      )
      check(
        same(
          mine.manifest.documents["greenhouse/fixture-quarto"].output,
          theirs.manifest.documents["greenhouse/fixture-quarto"].output,
        ),
        "the manifest's outputs differ from the committed fixture's",
      )
      check(
        same(
          mine.manifest.documents["greenhouse/fixture-quarto"].execution,
          theirs.manifest.documents["greenhouse/fixture-quarto"].execution,
        ),
        "the execution fingerprints differ from the committed fixture's",
      )
      // Rendering afterwards computes nothing: the frozen results are untouched, and no Python is needed.
      const frozen = await sha(
        join(
          first,
          "science/_freeze/greenhouse/fixture-quarto/execute-results/html.json",
        ),
      )
      const saved = { s: process.env.SCIENCE_PYTHON, q: process.env.QUARTO_PYTHON }
      process.env.SCIENCE_PYTHON = "/nonexistent/python"
      delete process.env.QUARTO_PYTHON
      try {
        const r = await buildDocument(first, "greenhouse/fixture-quarto", {
          execute: false,
        })
        check(!r.executed, "render says it executed")
      } finally {
        if (saved.s === undefined) delete process.env.SCIENCE_PYTHON
        else process.env.SCIENCE_PYTHON = saved.s
        if (saved.q !== undefined) process.env.QUARTO_PYTHON = saved.q
      }
      check(
        frozen ===
          (await sha(
            join(
              first,
              "science/_freeze/greenhouse/fixture-quarto/execute-results/html.json",
            ),
          )),
        "render changed the frozen results",
      )
      check(
        same((await summary(first)).files, theirs.files),
        "render changed the generated files",
      )
    },
  )

  await test(
    "QTO-018",
    "Two independent executions give the same result",
    async (check) => {
      const a = await summary(first)
      const b = await summary(second)
      check(
        same(a.files, b.files),
        `two executions differ: ${JSON.stringify(a.files)} / ${JSON.stringify(b.files)}`,
      )
      check(same(a.manifest, b.manifest), "the two manifests differ")
      const figure =
        "public/assets/scientific/greenhouse/fixture-quarto/fig-bar-output-1.svg"
      check(
        (await readFile(join(first, figure), "utf8")) ===
          (await readFile(join(second, figure), "utf8")),
        "the two figures differ",
      )
      // The test can fail: a different seed gives a different figure.
      const source = join(second, "science/greenhouse/fixture-quarto.qmd")
      const text = await readFile(source, "utf8")
      await writeFile(source, text.replace("random.seed(1)", "random.seed(2)"))
      await buildDocument(second, "greenhouse/fixture-quarto", { execute: true })
      check(
        (await sha(join(second, figure))) !== (await sha(join(first, figure))),
        "another seed gives the same figure, so the comparison proves nothing",
      )
      check(
        a.manifest.documents["greenhouse/fixture-quarto"].execution !== undefined,
        "no execution was recorded",
      )
    },
  )
} finally {
  await rm(first, { recursive: true, force: true })
  await rm(second, { recursive: true, force: true })
}

let failed = 0
for (const { id, title, failures } of results) {
  if (failures.length === 0) console.log(`PASS ${id} ${title}`)
  else {
    failed++
    console.error(`FAIL ${id} ${title}`)
    for (const message of failures.slice(0, 12)) console.error(`  - ${message}`)
  }
}
if (failed > 0) process.exit(1)
console.log(
  `PASS: ${results.length} execution checks with Quarto ${tools.quarto} and Python ${tools.python}`,
)
