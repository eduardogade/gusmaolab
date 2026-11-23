// The scientific environment (P13-A01, D-104): P13A-001, P13A-003 to P13A-007, P13A-009, P13A-025,
// P13A-026 and P13A-028. They read the repository and run the real tools where there are any:
// Quarto and the micromamba environment `gusmaolab-science`. A check that needs a tool that is not
// installed is reported SKIPPED, never passed, and the file still exits 0, so a machine that only
// edits Markdown can run `npm test`. P13A-005's slow half (rebuilding the environment from its
// specification in a fresh folder) is tests/science-restore.mjs.
//
// What they show: the environment is the specified one (name, interpreter, ARM64, packages, lock),
// Quarto runs the code with that interpreter and not whichever `python3` comes first, building the
// site needs neither, and a stale or edited generated file is refused. What they do not show: that
// another operating system gives the same bytes (only this computer's macOS ARM64 is tested).
import { spawnSync } from "node:child_process"
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { verify } from "../scripts/science.mjs"
import {
  environmentIssues,
  environmentName,
  environmentPrefix,
  inspectPython,
  resolvePython,
  sciencePythonEnv,
} from "../scripts/science-env.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const read = (path) => readFile(join(repo, path), "utf8")
const run = (command, args, options = {}) =>
  spawnSync(command, args, { encoding: "utf8", ...options })
const P13 = "92fdcdc" // the commit the Quarto integration was committed at
const P12 = "5b127f5"

// The default resolution is what is under test: a variable set in the caller's shell must not
// decide it. (An explicit SCIENCE_PYTHON is tested by naming one below.)
const callerPython = process.env.SCIENCE_PYTHON
delete process.env.SCIENCE_PYTHON
delete process.env.QUARTO_PYTHON

const results = []
const skipped = []
async function test(id, title, body) {
  const failures = []
  try {
    await body(
      (ok, message) => ok || failures.push(message),
      (reason) => skipped.push(`${id} (${reason})`),
    )
  } catch (error) {
    failures.push(error.stack ?? error.message)
  }
  results.push({ id, title, failures })
}
const quarto = run("quarto", ["--version"])
const quartoVersion = quarto.status === 0 ? quarto.stdout.trim() : null
const resolved = resolvePython()
const hasEnvironment = resolved.python !== undefined && resolved.prefix !== null

/** Does `version` satisfy the plain range ">=A <B" of science/_quarto.yml? */
const satisfies = (version, range) => {
  const v = version.split(".").map(Number)
  const cmp = (a, b) => {
    for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1
    return 0
  }
  const [, low, high] = /^>=(\S+)\s+<(\S+)$/.exec(range) ?? []
  if (!low) return false
  const pad = (x) => [...x.split(".").map(Number), 0, 0].slice(0, 3)
  return cmp(v, pad(low)) >= 0 && cmp(v, pad(high)) < 0
}

await test(
  "P13A-001",
  "The development tools have recorded versions",
  async (check) => {
    const doc = await read("development/scientific-environment.md")
    for (const tool of [
      "macOS",
      "Node.js",
      "npm",
      "Astro",
      "Quarto",
      "Python",
      "uv",
      "micromamba",
    ])
      check(
        new RegExp(`^\\|\\s*${tool}\\s*\\|[^|]*\\d`, "m").test(doc),
        `${tool} has no recorded version in development/scientific-environment.md`,
      )
    const nodeMajor = (await read(".node-version")).trim().split(".")[0]
    check(
      new RegExp(`Node\\.js\\s*\\|[^|]*\\b${nodeMajor}\\.`).test(doc),
      `the recorded Node.js is not the .node-version major (${nodeMajor})`,
    )
    const range = /^quarto-required:\s*"([^"]+)"/m.exec(
      await read("science/_quarto.yml"),
    )?.[1]
    check(range !== undefined, "science/_quarto.yml has no quarto-required")
    check(
      doc.includes(range ?? "?"),
      `the guide does not state the Quarto range ${range}`,
    )
    const manifest = JSON.parse(await read("src/science/manifest.json"))
    for (const [name, record] of Object.entries(manifest.documents))
      check(
        satisfies(record.quarto, range ?? ""),
        `${name} was rendered with Quarto ${record.quarto}, outside ${range}`,
      )
    if (quartoVersion !== null)
      check(
        satisfies(quartoVersion, range ?? ""),
        `the installed Quarto ${quartoVersion} is outside ${range}`,
      )
    const arch = run("uname", ["-m"]).stdout.trim()
    check(arch === "arm64" || arch === "x86_64", `unknown architecture ${arch}`)
  },
)

await test(
  "P13A-003",
  "Quarto's installation and Jupyter checks pass",
  async (check, skip) => {
    if (quartoVersion === null || !hasEnvironment)
      return skip(quartoVersion === null ? "Quarto is not installed" : "no environment")
    const result = run("quarto", ["check", "jupyter"], { env: sciencePythonEnv() })
    const text = `${result.stdout}${result.stderr}`
    check(result.status === 0, `quarto check jupyter exited ${result.status}`)
    check(
      /Checking Python 3 installation\.*\S*\s*OK/.test(text) ||
        /\[✓\] Checking Python 3 installation/.test(text),
      "the Python check did not pass",
    )
    check(
      /Checking Jupyter engine render\.*\S*\s*OK|\[✓\] Checking Jupyter engine render/.test(
        text,
      ),
      "the Jupyter render check did not pass",
    )
    check(
      text.includes(resolved.python),
      `Quarto checked a different Python than ${resolved.python}`,
    )
  },
)

await test(
  "P13A-004",
  "Scientific Python runs in the dedicated environment",
  async (check, skip) => {
    if (!hasEnvironment)
      return skip(`micromamba environment ${environmentName()} not found`)
    const prefix = environmentPrefix()
    check(
      prefix !== null && resolved.python.startsWith(prefix),
      "the interpreter is not in the environment",
    )
    const facts = await inspectPython(resolved.python)
    check(facts !== null, "the interpreter did not answer")
    check(facts.prefix === prefix, `sys.prefix is ${facts.prefix}, not ${prefix}`)
    check(facts.version.startsWith("3.12."), `Python ${facts.version}`)
    check(
      facts.machine === run("uname", ["-m"]).stdout.trim(),
      `the interpreter is ${facts.machine}`,
    )
    const issues = await environmentIssues()
    check(
      issues.length === 0,
      `the environment differs from its specification: ${issues.join("; ")}`,
    )
  },
)

await test(
  "P13A-005",
  "The Python dependencies are specified exactly",
  async (check) => {
    const yml = await read("environments/science/environment.yml")
    const input = (await read("environments/science/requirements.in"))
      .split("\n")
      .map((l) => l.replace(/#.*/, "").trim())
      .filter(Boolean)
    const lock = await read("environments/science/requirements.txt")
    check(
      /^name:\s*gusmaolab-science\s*$/m.test(yml),
      "the environment is not named gusmaolab-science",
    )
    check(/-\s*python=3\.12/.test(yml), "Python is not pinned to 3.12")
    check(/-\s*uv\s*$/m.test(yml), "uv is not part of the environment")
    check(/conda-forge/.test(yml), "no conda-forge channel")
    // One owner per package: the environment file lists the interpreter and uv, nothing scientific.
    for (const name of input)
      check(
        !new RegExp(`^\\s*-\\s*${name}\\b`, "mi").test(yml),
        `${name} is in both environment.yml and requirements.in`,
      )
    for (const name of input) {
      const key = name.toLowerCase().replace(/_/g, "-")
      check(
        new RegExp(`^${key}==`, "mi").test(lock),
        `${name} is not pinned in requirements.txt`,
      )
    }
    const pins = lock.match(/^[A-Za-z0-9][A-Za-z0-9._-]*==/gm) ?? []
    const hashes = lock.match(/--hash=sha256:/g) ?? []
    check(
      pins.length > 10 && hashes.length >= pins.length,
      "the lock does not carry a hash for every package",
    )
    check(
      !/^[A-Za-z0-9._-]+\s*([<>~]=?|!=)/m.test(lock),
      "the lock holds an unpinned requirement",
    )
  },
)

await test(
  "P13A-006",
  "Quarto runs the code with the intended interpreter",
  async (check, skip) => {
    if (quartoVersion === null || !hasEnvironment)
      return skip(quartoVersion === null ? "Quarto is not installed" : "no environment")
    const dir = await mkdtemp(join(tmpdir(), "gusmaolab-interp-"))
    try {
      await writeFile(
        join(dir, "probe.qmd"),
        '---\ntitle: probe\nengine: jupyter\njupyter: python3\nformat: html\n---\n\n```{python}\n#| echo: false\nimport sys\nprint("INTERPRETER=" + sys.prefix)\n```\n',
      )
      const env = sciencePythonEnv()
      check(
        env.QUARTO_PYTHON === resolved.python,
        "QUARTO_PYTHON is not the environment's Python",
      )
      const result = run("quarto", ["render", "probe.qmd", "--execute"], {
        cwd: dir,
        env,
      })
      check(result.status === 0, `render failed: ${result.stderr.slice(-300)}`)
      const html = await readFile(join(dir, "probe.html"), "utf8")
      check(
        html.includes(`INTERPRETER=${resolved.prefix}`),
        `the code ran in another Python (page: ${/INTERPRETER=\S+/.exec(html)?.[0]})`,
      )
      // A different explicit choice is honoured: the selection is real, not decoration.
      if (
        callerPython &&
        callerPython !== resolved.python &&
        existsSync(callerPython)
      ) {
        const other = run("quarto", ["render", "probe.qmd", "--execute"], {
          cwd: dir,
          env: { ...sciencePythonEnv(), QUARTO_PYTHON: callerPython },
        })
        check(other.status === 0, "the explicit interpreter failed")
        const text = await readFile(join(dir, "probe.html"), "utf8")
        check(
          !text.includes(`INTERPRETER=${resolved.prefix}`),
          "an explicit QUARTO_PYTHON was ignored",
        )
      }
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  },
)

await test(
  "P13A-007",
  "Building the site needs neither Quarto nor Python",
  async (check) => {
    // Offline verification with an empty PATH: no quarto, no python, no micromamba can be found.
    const bare = run(process.execPath, [join(repo, "scripts/science.mjs"), "verify"], {
      env: {
        PATH: "/nonexistent",
        SCIENCE_PYTHON: "/nonexistent/python",
        HOME: tmpdir(),
      },
      cwd: repo,
    })
    check(bare.status === 0, `verify needed a tool: ${bare.stdout}${bare.stderr}`)
    const pkg = JSON.parse(await read("package.json"))
    for (const name of [
      "build",
      "check",
      "test",
      "verify",
      "dev",
      "preview",
      "demo:build",
    ])
      check(
        !/science:(?:render|execute)|science\.mjs (?:render|execute)|quarto/.test(
          pkg.scripts[name] ?? "",
        ),
        `npm run ${name} can run Quarto or code`,
      )
    const build = await read("scripts/public-build.mjs")
    check(
      !/quarto|science-env|execute/i.test(build.replace(/\/\/.*$/gm, "")),
      "the release build reaches Quarto",
    )
  },
)

await test("P13A-009", "A stale or edited source is refused offline", async (check) => {
  const dir = await mkdtemp(join(tmpdir(), "gusmaolab-fresh-"))
  try {
    for (const path of [
      "science",
      "src/science",
      "src/design/quarto",
      "src/demos",
    ])
      await cp(join(repo, path), join(dir, path), {
        recursive: true,
        filter: (from) => !/science\/(?:_build|\.quarto)/.test(from),
      })
    check(
      (await verify(dir)).length === 0,
      "a copy of the committed state is not current",
    )
    const doc = "science/demo/demo-synthetic-signals"
    const keep = {
      qmd: await readFile(join(dir, `${doc}.qmd`), "utf8"),
      bib: await readFile(join(dir, `${doc}.bib`), "utf8"),
    }
    const expectIssue = async (label, pattern) => {
      const issues = await verify(dir)
      check(
        issues.some((i) => pattern.test(i)),
        `${label}: not reported (${issues.join(" | ") || "none"})`,
      )
    }
    await writeFile(join(dir, `${doc}.bib`), keep.bib + "\n% edited\n")
    await expectIssue(
      "a changed bibliography",
      /demo-synthetic-signals.*changed since it was rendered/,
    )
    await writeFile(join(dir, `${doc}.bib`), keep.bib)
    await writeFile(
      join(dir, `${doc}.qmd`),
      keep.qmd.replace("SAMPLES = 160", "SAMPLES = 161"),
    )
    await expectIssue("changed code", /code changed since it was executed/)
    await writeFile(join(dir, `${doc}.qmd`), keep.qmd)
    const frag = join(dir, "src/demos/science/demo-synthetic-signals.html")
    const html = await readFile(frag, "utf8")
    await writeFile(frag, html.replace("Motivation", "Motivations"))
    await expectIssue("an edited article", /edited by hand/)
    await writeFile(frag, html)
    const stub = join(dir, "src/demos/greenhouse/demo-synthetic-signals.md")
    await writeFile(stub, (await readFile(stub, "utf8")) + "\nextra\n")
    await expectIssue("an edited entry", /edited by hand/)
    check((await verify(dir)).length === 1, "only the edited entry should be reported")
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

await test("P13A-025", "The author's CV files are untouched", async (check) => {
  const status = run("git", ["status", "--porcelain", "--", "cv"], { cwd: repo }).stdout
  check(status.trim() === "", `cv/ has changes: ${status}`)
  // The owner committed their own edit of cv/cv.md (e74bbac, 2026-11-16, after P17). Nothing an
  // agent did may change cv/ since then; before it, cv/ was unchanged since P13 except for that file.
  const OWNER_CV_COMMIT = "e74bbac"
  const since = run("git", ["diff", "--name-only", OWNER_CV_COMMIT, "HEAD", "--", "cv"], {
    cwd: repo,
  }).stdout
  check(since.trim() === "", `cv/ changed since ${OWNER_CV_COMMIT}: ${since}`)
  const before = run("git", ["diff", "--name-only", P13, OWNER_CV_COMMIT, "--", "cv"], {
    cwd: repo,
  }).stdout
  check(before.trim() === "cv/cv.md", `cv/ changed between ${P13} and the owner's commit: ${before}`)
})

await test("P13A-026", "The five category palettes are unchanged", async (check) => {
  const diff = run("git", ["diff", P12, "--", "src/styles/categories.css"], {
    cwd: repo,
  }).stdout
  check(
    diff.trim() === "",
    "src/styles/categories.css differs from the approved commit",
  )
  const tokens = run("git", ["diff", P12, "--", "src/styles/tokens.css"], {
    cwd: repo,
  }).stdout
  check(tokens.trim() === "", "src/styles/tokens.css differs from the approved commit")
})

await test("P13A-028", "No global or unrelated change is needed", async (check) => {
  const files = [
    "environments/science/environment.yml",
    "environments/science/requirements.in",
    "scripts/science-env.mjs",
  ]
  for (const file of files) {
    const text = (await read(file)).replace(/^\s*(?:#|\/\/).*$/gm, "")
    check(
      !/\bbrew\b|\bsudo\b|\bpip3? install\b|\bnpm (?:update|install -g)/.test(text),
      `${file} changes something global`,
    )
  }
  check(
    !/hardcoded|\/Users\//.test(await read("scripts/science-env.mjs")),
    "science-env.mjs names a home directory",
  )
  // `create` never replaces an environment.
  if (hasEnvironment) {
    const again = run(
      process.execPath,
      [join(repo, "scripts/science-env.mjs"), "create"],
      { cwd: repo, env: { ...process.env, SCIENCE_PYTHON: "" } },
    )
    check(
      again.status !== 0 && /already exists/.test(again.stderr),
      `create did not refuse an existing environment: ${again.stderr}`,
    )
  }
  const gi = await read(".gitignore")
  check(/\/dist-demo\//.test(gi), "dist-demo/ is not ignored")
})

// --- Report -----------------------------------------------------------------------------------------

for (const line of skipped) console.log(`SKIPPED ${line}`)
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
  `PASS: ${results.length} environment checks${skipped.length ? `; ${skipped.length} skipped for a missing tool` : ""}`,
)
