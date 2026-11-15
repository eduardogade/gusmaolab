// The scientific environment (P13-A01, D-104): finds GusmaoLab's isolated Python, checks it, and
// runs Quarto with it. Responsibilities, one owner each:
//
//   npm                    JavaScript (Astro, tests)             package.json + lockfile
//   micromamba             the environment and its interpreter   environments/science/environment.yml
//   uv                     every Python package                  environments/science/requirements.{in,txt}
//   Quarto                 document rendering, a separate tool   science/_quarto.yml (quarto-required)
//
//   npm run science:env -- resolve            where the environment's Python is
//   npm run science:env -- check              is it the right one, and does it match the lock?
//   npm run science:env -- create [--prefix <dir>]   build it from the committed specification
//   npm run science:env -- sync               install requirements.txt into it (never uninstalls)
//   npm run science:env -- lock               re-resolve requirements.in into requirements.txt
//   npm run science:quarto -- <quarto args>   run Quarto with QUARTO_PYTHON set to that Python
//
// No path is written down: the environment is found by name (SCIENCE_ENV, default
// gusmaolab-science) through micromamba, whatever its root. SCIENCE_PYTHON and QUARTO_PYTHON,
// when set, win, so CI or another machine can name its own interpreter.
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { basename, join } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

export const ROOT = fileURLToPath(new URL("../", import.meta.url))
export const ENV_DIR = "environments/science"
export const DEFAULT_ENV = "gusmaolab-science"

const capture = (command, args, options = {}) =>
  spawnSync(command, args, { encoding: "utf8", ...options })

/** The environment's name: SCIENCE_ENV, else gusmaolab-science. */
export const environmentName = () => process.env.SCIENCE_ENV || DEFAULT_ENV

/** The prefix (directory) of a named micromamba environment, or null. micromamba finds its own root. */
export function environmentPrefix(name = environmentName()) {
  const listed = capture("micromamba", ["env", "list", "--json"])
  if (listed.status !== 0) return null
  try {
    const found = JSON.parse(listed.stdout).envs.find(
      (prefix) => basename(prefix) === name,
    )
    return found ?? null
  } catch {
    return null
  }
}

const interpreterIn = (prefix) => join(prefix, "bin", "python")

/**
 * The Python Quarto and the tool use, and why. Explicit variables win; otherwise the named
 * micromamba environment; otherwise nothing, which the tool reports instead of guessing a
 * `python3` from the PATH.
 */
let resolved
export function resolvePython() {
  const key = [
    process.env.SCIENCE_PYTHON,
    process.env.QUARTO_PYTHON,
    process.env.SCIENCE_ENV,
  ].join("|")
  if (resolved?.key !== key) resolved = { key, value: resolveUncached() }
  return resolved.value
}

function resolveUncached() {
  if (process.env.SCIENCE_PYTHON)
    return {
      python: process.env.SCIENCE_PYTHON,
      source: "SCIENCE_PYTHON",
      prefix: null,
    }
  if (process.env.QUARTO_PYTHON)
    return { python: process.env.QUARTO_PYTHON, source: "QUARTO_PYTHON", prefix: null }
  const prefix = environmentPrefix()
  if (prefix !== null && existsSync(interpreterIn(prefix)))
    return {
      python: interpreterIn(prefix),
      source: `micromamba environment ${environmentName()}`,
      prefix,
    }
  return { python: undefined, source: "none", prefix: null }
}

/**
 * The environment variables for a Quarto or Python child process: the chosen interpreter, the
 * environment's own kernel directory first (so a user-level `python3` kernel cannot run the
 * code with another Python), and no user site-packages.
 */
export function sciencePythonEnv(base = process.env) {
  const env = { ...base }
  const { python, prefix } = resolvePython()
  if (python === undefined) delete env.QUARTO_PYTHON
  else env.QUARTO_PYTHON = python
  if (prefix !== null) env.JUPYTER_PATH = join(prefix, "share", "jupyter")
  env.PYTHONNOUSERSITE = "1"
  return env
}

const CONDA_OWNED = ["pip", "setuptools", "wheel"]

/**
 * Run by the environment's own Python, with requirements.txt on stdin: what the interpreter is,
 * what the lock pins *for this platform* (the lock is universal, so some pins carry markers such
 * as `sys_platform == "win32"`; the interpreter evaluates them), and what is installed.
 */
const INSPECT = String.raw`
import importlib.metadata as m, json, platform, re, sys
from packaging.requirements import Requirement
text = sys.stdin.read().replace(chr(92) + chr(10), " ")
pins = {}
for line in text.splitlines():
    line = re.sub(r"\s--hash=\S+", "", line.split("#")[0]).strip()
    if not line:
        continue
    r = Requirement(line)
    if r.marker is None or r.marker.evaluate():
        pins[r.name.lower().replace("_", "-").replace(".", "-")] = str(r.specifier).lstrip("=")
print(json.dumps({
  "version": sys.version.split()[0],
  "executable": sys.executable,
  "prefix": sys.prefix,
  "machine": platform.machine(),
  "pins": pins,
  "packages": {d.metadata["Name"].lower().replace("_", "-").replace(".", "-"): d.version for d in m.distributions()},
}))`

/** What the interpreter says about itself and about requirements.txt (see INSPECT). */
export async function inspectPython(python, root = ROOT) {
  const lock = await readFile(join(root, ENV_DIR, "requirements.txt"), "utf8")
  const result = capture(python, ["-I", "-c", INSPECT], { input: lock })
  if (result.status !== 0) return null
  return JSON.parse(result.stdout)
}

/** Every reason the environment is not the specified one. An empty list is a pass. */
export async function environmentIssues(root = ROOT) {
  const issues = []
  const { python, source } = resolvePython()
  if (python === undefined)
    return [
      `no scientific Python found: create the environment (npm run science:env -- create) or set SCIENCE_PYTHON`,
    ]
  const facts = await inspectPython(python, root)
  if (facts === null)
    return [`${python} (${source}) does not run, or lacks the packaging module`]
  const machine = capture("uname", ["-m"]).stdout.trim()
  if (facts.machine !== machine)
    issues.push(
      `the interpreter is ${facts.machine} but this computer is ${machine}: an x86_64 Python would run under translation`,
    )
  if (!facts.version.startsWith("3.12."))
    issues.push(`Python ${facts.version}: the specification asks for 3.12`)
  for (const [name, version] of Object.entries(facts.pins)) {
    const have = facts.packages[name]
    if (have === undefined)
      issues.push(`${name} ${version} is pinned but not installed`)
    else if (have !== version)
      issues.push(`${name}: ${have} installed, ${version} pinned`)
  }
  // Both ways: a package nobody pinned is a package nobody reviewed. pip, setuptools and wheel
  // are conda-forge's own (the interpreter's), not uv's.
  for (const name of Object.keys(facts.packages))
    if (!(name in facts.pins) && !CONDA_OWNED.includes(name))
      issues.push(
        `${name} ${facts.packages[name]} is installed but not in requirements.txt`,
      )
  return issues
}

// --- Command line ------------------------------------------------------------------------------

const fail = (message) => {
  console.error(`science-env: ${message}`)
  process.exit(1)
}

function spawnInherit(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options })
  if (result.error) fail(`${command}: ${result.error.message}`)
  return result.status ?? 1
}

function uvIn(prefix) {
  const uv = join(prefix, "bin", "uv")
  if (!existsSync(uv))
    fail(
      `uv is not in ${prefix}: it belongs to the environment (environment.yml); recreate it`,
    )
  return uv
}

/**
 * Runs the environment's own uv. conda hard-links its binaries, and on macOS a hard-linked
 * executable can be resolved to micromamba's package cache, where its @rpath no longer finds the
 * libraries of the other packages (found by tests/science-restore.mjs in a fresh prefix). The
 * environment's lib/ folder is named as the fallback, which is where they are.
 */
function spawnUv(prefix, args) {
  return spawnInherit(uvIn(prefix), args, {
    env: { ...process.env, DYLD_FALLBACK_LIBRARY_PATH: join(prefix, "lib") },
  })
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)
  const specification = join(ROOT, ENV_DIR)
  if (command === "resolve") {
    const { python, source, prefix } = resolvePython()
    if (python === undefined)
      fail("no scientific Python found (see: npm run science:env -- create)")
    console.log(
      `python: ${python}\nsource: ${source}${prefix ? `\nprefix: ${prefix}` : ""}`,
    )
    return
  }
  if (command === "check") {
    const issues = await environmentIssues()
    const { python, source } = resolvePython()
    if (issues.length > 0) {
      console.error(`FAIL: the scientific environment (${source}):`)
      for (const issue of issues) console.error(`  - ${issue}`)
      process.exit(1)
    }
    const facts = await inspectPython(python)
    console.log(
      `PASS: ${python} (${source}): Python ${facts.version} ${facts.machine}, ${Object.keys(facts.pins).length} pinned packages match requirements.txt`,
    )
    return
  }
  if (command === "create") {
    const at = rest.indexOf("--prefix")
    const prefix = at >= 0 ? rest[at + 1] : undefined
    if (at >= 0 && !prefix) fail("--prefix needs a directory")
    const target = prefix ? ["-p", prefix] : ["-n", environmentName()]
    if ((prefix && existsSync(prefix)) || (!prefix && environmentPrefix() !== null))
      fail(
        `${prefix ?? environmentName()} already exists: create never replaces an environment (use sync to install into it)`,
      )
    let status = spawnInherit("micromamba", [
      "create",
      "-y",
      ...target,
      "-f",
      join(specification, "environment.yml"),
    ])
    if (status !== 0) process.exit(status)
    const where = prefix ?? environmentPrefix()
    status = spawnUv(where, [
      "pip",
      "install",
      "--python",
      interpreterIn(where),
      "--require-hashes",
      "-r",
      join(specification, "requirements.txt"),
    ])
    process.exit(status)
  }
  if (command === "sync") {
    const { python, prefix } = resolvePython()
    if (prefix === null)
      fail("sync installs into the named micromamba environment only")
    // `uv pip install`, not `uv pip sync`: sync would uninstall pip, setuptools and wheel, which
    // conda-forge's Python owns. The lock is still the whole truth: `check` compares both ways.
    process.exit(
      spawnUv(prefix, [
        "pip",
        "install",
        "--python",
        python,
        "--require-hashes",
        "-r",
        join(specification, "requirements.txt"),
      ]),
    )
  }
  if (command === "lock") {
    const { python, prefix } = resolvePython()
    if (prefix === null) fail("lock runs in the named micromamba environment only")
    process.exit(
      spawnUv(prefix, [
        "pip",
        "compile",
        join(specification, "requirements.in"),
        "--python",
        python,
        "--universal",
        "--generate-hashes",
        "--no-header",
        "-o",
        join(specification, "requirements.txt"),
      ]),
    )
  }
  if (command === "quarto") {
    const args = rest[0] === "--" ? rest.slice(1) : rest
    process.exit(
      spawnInherit("quarto", args, {
        env: sciencePythonEnv(),
        cwd: join(ROOT, "science"),
      }),
    )
  }
  fail(
    "usage: science-env.mjs resolve | check | create [--prefix <dir>] | sync | lock | quarto <args>",
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
