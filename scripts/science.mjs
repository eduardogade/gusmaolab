// The scientific-article tool (P13, D-098 to D-103): turns a Quarto source (science/<dir>/<name>.qmd)
// into what Astro publishes, and says whether what is published is still the source's.
//
//   npm run science:check                      the toolchain, and nothing else
//   npm run science:verify                     offline: is every generated file current? (no Quarto)
//   npm run science:render  -- <doc>           render from the frozen results; never computes
//   npm run science:execute -- <doc>           run the document's code, then render; the only
//                                              command that executes anything
//
// <doc> is `<dir>/<name>`: greenhouse/<name> or trail/<name> for an entry, design/<name> for
// the design study. Nothing else is accepted: no path, no glob, no "all". `npm run build`,
// `npm run check` and `npm test` never run Quarto or Python: the build only runs `verify`.
//
// Ownership (planning/architecture.md, "Quarto and Astro"):
//   science/<dir>/<name>.qmd        the source, and the only place the entry's metadata is written
//   science/_freeze/                the computed results (committed), written by `execute`
//   science/_build/                 Quarto's page (ignored): an intermediate, never published
//   src/science/<dir>/<name>.html   the validated article fragment (committed, generated)
//   src/content/<dir>/<name>.md     the entry's registration for P10: metadata only (committed, generated)
//   public/assets/scientific/...    the figures the fragment refers to (committed, generated)
//   src/science/manifest.json       fingerprints of all of the above (committed, generated)
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import {
  cp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import { dirname, join, relative, resolve, sep } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { parseDocument } from "yaml"
import { collectionById, COLLECTIONS } from "../src/editorial/collections.ts"
import { schemaFor } from "../src/editorial/schema.ts"
import { extractFragment, svgIssues } from "./science-html.mjs"
import { resolvePython, sciencePythonEnv } from "./science-env.mjs"

export const ROOT = fileURLToPath(new URL("../", import.meta.url))
export const MANIFEST = "src/science/manifest.json"
export const GENERATED_MARKER = "GENERATED from science/"
/**
 * Where a document may live: an entry's collection directory, the design study, or the
 * demonstrations (P13-A01: synthetic Greenhouse articles that are never published).
 */
export const DIRECTORIES = ["greenhouse", "trail", "design", "demo"]
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
/** What Quarto reads from a source's front matter besides the entry's own metadata. */
export const QUARTO_KEYS = [
  "bibliography",
  "csl",
  "engine",
  "jupyter",
  "execute",
  "lang",
  "link-citations",
  "format",
]
const MAX_ASSET_BYTES = 500_000

export class ScienceError extends Error {
  constructor(message) {
    super(message)
    this.name = "ScienceError"
  }
}

const sha = (data) => createHash("sha256").update(data).digest("hex")
const fileSha = async (path) => sha(await readFile(path))

// --- Documents ------------------------------------------------------------------------------

/** Validates a `<dir>/<name>` argument and returns where everything of it lives. */
export function docInfo(doc) {
  const match = /^([a-z]+)\/([a-z0-9-]+)$/.exec(String(doc))
  if (!match || !DIRECTORIES.includes(match[1]) || !NAME.test(match[2]))
    throw new ScienceError(
      `"${doc}" is not a document: write <dir>/<name> with <dir> one of ${DIRECTORIES.join(", ")} and a lowercase-hyphen name`,
    )
  const [, dir, name] = match
  const kind = dir === "design" ? "study" : dir === "demo" ? "demo" : "entry"
  const base = {
    doc: `${dir}/${name}`,
    dir,
    name,
    kind,
    collection:
      kind === "entry"
        ? COLLECTIONS.find((c) => c.directory === dir)?.id
        : "greenhouse",
    source: `science/${dir}/${name}.qmd`,
    built: `science/_build/${dir}/${name}.html`,
    freeze: `science/_freeze/${dir}/${name}`,
  }
  if (kind === "study")
    return {
      ...base,
      fragment: `src/design/quarto/${name}.html`,
      stub: null,
      // Not in public/, whose files every build copies: the study's figure is served by a route that exists
      // only while development pages are on (P22, D-157); the URL the article names is unchanged.
      assetDir: `src/design/quarto/assets/${name}`,
      assetBase: `/_design/quarto/assets/${name}/`,
    }
  // A demonstration is an ordinary Greenhouse entry that lives outside src/content/ and public/,
  // so that only a development or demonstration run ever routes or serves it (src/editorial/demo.ts).
  if (kind === "demo")
    return {
      ...base,
      fragment: `src/demos/science/${name}.html`,
      stub: `src/demos/greenhouse/${name}.md`,
      assetDir: `src/demos/assets/${name}`,
      assetBase: `/demo-assets/${name}/`,
    }
  return {
    ...base,
    fragment: `src/science/${dir}/${name}.html`,
    stub: `src/content/${dir}/${name}.md`,
    assetDir: `public/assets/scientific/${dir}/${name}`,
    assetBase: `/assets/scientific/${dir}/${name}/`,
  }
}

/** The documents the repository has: every science/<dir>/<name>.qmd. */
export async function listSources(root = ROOT) {
  const found = []
  for (const dir of DIRECTORIES) {
    const folder = join(root, "science", dir)
    if (!existsSync(folder)) continue
    for (const file of (await readdir(folder)).sort())
      if (file.endsWith(".qmd")) found.push(`${dir}/${file.slice(0, -4)}`)
  }
  return found
}

/** The front matter of a source, and the rest of it. */
export function splitSource(text) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text)
  if (!match) throw new ScienceError("the source has no YAML front matter")
  const parsed = parseDocument(match[1], { prettyErrors: true })
  if (parsed.errors.length > 0)
    throw new ScienceError(
      `the front matter is not valid YAML: ${parsed.errors[0].message}`,
    )
  const data = parsed.toJS()
  if (data === null || typeof data !== "object" || Array.isArray(data))
    throw new ScienceError("the front matter must be a mapping")
  return { data, body: match[2] }
}

/**
 * The entry's metadata, from the source's own front matter: everything that is not a Quarto
 * option, checked against the collection's schema. The metadata is written once, here.
 */
export function publicationMetadata(info, data) {
  const publication = Object.fromEntries(
    Object.entries(data).filter(([key]) => !QUARTO_KEYS.includes(key)),
  )
  const parsed = schemaFor(info.collection, {
    synthetic: info.kind === "demo",
  }).safeParse(publication)
  if (!parsed.success)
    throw new ScienceError(
      `${info.source}: the metadata is not valid for ${collectionById(info.collection).label}:\n` +
        parsed.error.issues
          .map((i) => `  - ${i.path.join(".") || "(entry)"}: ${i.message}`)
          .join("\n"),
    )
  if (Array.isArray(publication.references) && publication.references.length > 0)
    throw new ScienceError(
      `${info.source}: a Quarto document keeps its references in its bibliography (the bibliography: option), not in a references list`,
    )
  return publication
}

/** The code cells of a source, as written: what a computation depends on. */
export function codeChunks(text) {
  return [
    ...text.matchAll(
      /^```\{(?:python|r|julia|ojs|bash)\b[^\n]*\}\n[\s\S]*?^```[ \t]*$/gm,
    ),
  ].map((m) => m[0])
}

/** A source's inputs: every file whose change must change the rendering. */
async function inputFiles(root, info, data) {
  const files = [info.source, "science/_quarto.yml"]
  for (const key of ["bibliography", "csl"]) {
    const value = data[key]
    for (const item of Array.isArray(value) ? value : value ? [value] : []) {
      const path = join("science", info.dir, String(item))
      const inside = resolve(root, path).startsWith(join(root, "science") + sep)
      if (!inside || String(item).includes(".."))
        throw new ScienceError(`${info.source}: ${key} "${item}" leaves science/`)
      if (!existsSync(join(root, path)))
        throw new ScienceError(`${info.source}: ${key} "${item}" does not exist`)
      files.push(path)
    }
  }
  return files
}

const hashAll = async (root, files) =>
  Object.fromEntries(
    await Promise.all(files.sort().map(async (f) => [f, await fileSha(join(root, f))])),
  )

async function listFiles(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await listFiles(path)))
    else out.push(path)
  }
  return out.sort()
}

/**
 * Gives every text file of a folder exactly one newline at its end, which is what the
 * repository's end-of-file hook would do on commit. Doing it here keeps the fingerprints true
 * to what is committed: a hook that rewrote a fingerprinted file would make it look edited.
 */
async function normalizeEndings(root, folder) {
  for (const file of await listFiles(join(root, folder)))
    if (/\.(json|svg|html|md|txt)$/.test(file)) {
      const text = await readFile(file, "utf8")
      const fixed = text.replace(/\n*$/, "\n")
      if (fixed !== text) await writeFile(file, fixed)
    }
}

/** One fingerprint for a folder: the paths and contents of its files, in order. */
async function folderSha(root, folder) {
  const hash = createHash("sha256")
  for (const file of await listFiles(join(root, folder)))
    hash.update(relative(join(root, folder), file) + "\0").update(await readFile(file))
  return hash.digest("hex")
}

// --- The manifest -----------------------------------------------------------------------------

export async function readManifest(root = ROOT) {
  const path = join(root, MANIFEST)
  if (!existsSync(path)) return { version: 1, documents: {} }
  return JSON.parse(await readFile(path, "utf8"))
}

async function writeManifest(root, manifest) {
  const documents = Object.fromEntries(
    Object.entries(manifest.documents).sort(([a], [b]) => (a < b ? -1 : 1)),
  )
  await mkdir(join(root, "src/science"), { recursive: true })
  await writeFile(
    join(root, MANIFEST),
    JSON.stringify({ version: 1, documents }, null, 2) + "\n",
  )
}

// --- Verify (offline) --------------------------------------------------------------------------

/**
 * Every reason a generated file may not be published, without running Quarto or any code:
 * a source with no rendering, a rendering whose source changed, a computation whose code changed,
 * a generated file edited by hand, a generated file nobody owns. Fail-closed: an approved entry
 * with a missing or outdated derivative is an error, never a silent stale page.
 */
export async function verify(root = ROOT) {
  const issues = []
  const manifest = await readManifest(root)
  const sources = await listSources(root)
  for (const doc of sources)
    if (!manifest.documents[doc])
      issues.push(
        `${doc}: the source has no rendering (run: npm run science:render -- ${doc})`,
      )
  for (const [doc, record] of Object.entries(manifest.documents)) {
    const redo = `npm run science:render -- ${doc}`
    if (!sources.includes(doc)) {
      issues.push(`${doc}: the manifest names a source that is gone`)
      continue
    }
    let info
    try {
      info = docInfo(doc)
    } catch (error) {
      issues.push(error.message)
      continue
    }
    for (const [file, hash] of Object.entries(record.inputs ?? {})) {
      if (!existsSync(join(root, file)))
        issues.push(`${doc}: the input ${file} is gone`)
      else if ((await fileSha(join(root, file))) !== hash)
        issues.push(`${doc}: ${file} changed since it was rendered (run: ${redo})`)
    }
    const text = existsSync(join(root, info.source))
      ? await readFile(join(root, info.source), "utf8")
      : ""
    const chunks = codeChunks(text)
    if (chunks.length > 0) {
      const execution = record.execution
      if (!execution)
        issues.push(
          `${doc}: the document has code and was never executed (run: npm run science:execute -- ${doc})`,
        )
      else {
        if (sha(chunks.join("\n---\n")) !== execution.codeSha256)
          issues.push(
            `${doc}: the code changed since it was executed (run: npm run science:execute -- ${doc})`,
          )
        if ((await folderSha(root, info.freeze)) !== execution.freezeSha256)
          issues.push(
            `${doc}: the frozen results changed since they were recorded (run: npm run science:execute -- ${doc})`,
          )
      }
    }
    const output = record.output ?? {}
    if (!existsSync(join(root, info.fragment)))
      issues.push(`${doc}: the article ${info.fragment} is missing (run: ${redo})`)
    else {
      const fragment = await readFile(join(root, info.fragment), "utf8")
      if (sha(fragment) !== output.fragmentSha256)
        issues.push(`${doc}: ${info.fragment} was edited by hand (run: ${redo})`)
      // The fragment must still pass the trust boundary it was made under.
      const again = await extractFragment(
        `<main id="quarto-document-content">${fragment}</main>`,
        { assetBase: info.assetBase },
      )
      for (const issue of again.issues)
        issues.push(`${doc}: the article fails its checks: ${issue}`)
      // A fragment that was already cleaned must come back unchanged: anything the checks would
      // remove (a script, a style) was added after they ran.
      if (again.issues.length === 0 && again.html.trim() !== fragment.trim())
        issues.push(
          `${doc}: the article holds markup that the checks remove (run: ${redo})`,
        )
    }
    if (info.stub) {
      if (!existsSync(join(root, info.stub)))
        issues.push(`${doc}: the entry ${info.stub} is missing (run: ${redo})`)
      else if ((await fileSha(join(root, info.stub))) !== output.stubSha256)
        issues.push(`${doc}: ${info.stub} was edited by hand (run: ${redo})`)
    }
    if ((await folderSha(root, info.assetDir)) !== output.assetsSha256)
      issues.push(
        `${doc}: the figures in ${info.assetDir} do not match the rendering (run: ${redo})`,
      )
  }
  // Generated files nobody owns.
  const owned = new Set(
    Object.keys(manifest.documents)
      .map((d) => docInfo(d).stub)
      .filter(Boolean),
  )
  for (const base of [
    ...COLLECTIONS.map((collection) => `src/content/${collection.directory}`),
    "src/demos/greenhouse",
  ]) {
    const folder = join(root, base)
    for (const file of existsSync(folder) ? await readdir(folder) : []) {
      if (!file.endsWith(".md")) continue
      const rel = `${base}/${file}`
      if (
        (await readFile(join(root, rel), "utf8")).includes(GENERATED_MARKER) &&
        !owned.has(rel)
      )
        issues.push(`${rel}: a generated entry whose source is gone`)
    }
  }
  const fragments = new Set(
    Object.keys(manifest.documents).map((d) => docInfo(d).fragment),
  )
  for (const base of ["src/science", "src/design/quarto", "src/demos/science"])
    for (const file of await listFiles(join(root, base)))
      if (file.endsWith(".html") && !fragments.has(relative(root, file)))
        issues.push(`${relative(root, file)}: a generated article whose source is gone`)
  return issues
}

// --- Quarto ----------------------------------------------------------------------------------

/**
 * The Python the tool uses (scripts/science-env.mjs): SCIENCE_PYTHON, else QUARTO_PYTHON, else the
 * micromamba environment gusmaolab-science, else none (empty counts as none). Never a `python3`
 * picked up from the PATH.
 */
const chosenPython = () => resolvePython().python
const environment = () => sciencePythonEnv()

/** Runs a command with an argument list (never a shell string); returns its result. */
export function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", env: environment(), ...options })
}

export function toolchain() {
  const quarto = run("quarto", ["--version"])
  const python = run(chosenPython() ?? "python3-not-configured", [
    "-c",
    "import sys; print(sys.version.split()[0]); import ipykernel, nbformat, nbclient, yaml, jupyter_core",
  ])
  return {
    quarto: quarto.status === 0 ? quarto.stdout.trim() : null,
    python: python.status === 0 ? python.stdout.trim().split("\n")[0] : null,
    jupyter: python.status === 0,
    jupyterProblem:
      python.status === 0 ? null : (python.stderr ?? "").trim().split("\n").at(-1),
  }
}

/**
 * Renders one document. `execute: true` runs its code (the only place anything is executed);
 * otherwise Quarto is told not to compute, and uses the frozen results of the last execution.
 */
export async function buildDocument(root, doc, { execute = false } = {}) {
  const info = docInfo(doc)
  const sourcePath = join(root, info.source)
  if (!existsSync(sourcePath)) throw new ScienceError(`${info.source} does not exist`)
  if (
    (await realpath(sourcePath)) !==
    resolve(await realpath(join(root, "science")), info.dir, `${info.name}.qmd`)
  )
    throw new ScienceError(
      `${info.source} is not a plain file inside science/${info.dir}/`,
    )
  const text = await readFile(sourcePath, "utf8")
  const { data } = splitSource(text)
  const publication = publicationMetadata(info, data)
  const chunks = codeChunks(text)
  const manifest = await readManifest(root)
  const previous = manifest.documents[info.doc]
  const codeSha256 = sha(chunks.join("\n---\n"))
  if (
    !execute &&
    chunks.length > 0 &&
    (!previous?.execution || previous.execution.codeSha256 !== codeSha256)
  )
    throw new ScienceError(
      `${info.doc} has code that was not executed in its current form. Rendering never computes: run  npm run science:execute -- ${info.doc}`,
    )
  const inputs = await inputFiles(root, info, data)

  const tools = toolchain()
  if (tools.quarto === null)
    throw new ScienceError(
      "Quarto is not installed or not on the PATH (https://quarto.org)",
    )
  if (execute && chunks.length > 0 && !tools.jupyter)
    throw new ScienceError(
      `Python with Jupyter is needed for ${info.doc}'s code (create the environment with: npm run science:env -- create, or set SCIENCE_PYTHON to a Python that has the packages in environments/science/requirements.txt): ${tools.jupyterProblem}`,
    )

  await rm(join(root, "science/_build", info.dir, `${info.name}.html`), { force: true })
  await rm(join(root, "science/_build", info.dir, `${info.name}_files`), {
    recursive: true,
    force: true,
  })
  const mode = execute
    ? ["--execute"]
    : chunks.length > 0
      ? ["--use-freezer"]
      : ["--no-execute"]
  const result = run(
    "quarto",
    ["render", `${info.dir}/${info.name}.qmd`, "--to", "html", ...mode],
    { cwd: join(root, "science") },
  )
  const log = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
  if (result.status !== 0)
    throw new ScienceError(
      `Quarto failed on ${info.doc}:\n${log.trim().split("\n").slice(-25).join("\n")}`,
    )
  const trouble = log
    .split("\n")
    .filter((l) =>
      /citeproc.*not found|unable to resolve crossref|WARN.*(?:crossref|citation)|Error in |Traceback/i.test(
        l,
      ),
    )
  if (trouble.length > 0)
    throw new ScienceError(
      `Quarto reported problems in ${info.doc}:\n  ${trouble.join("\n  ")}`,
    )

  const builtPath = join(root, info.built)
  if (!existsSync(builtPath)) throw new ScienceError(`Quarto produced no ${info.built}`)
  const extracted = await extractFragment(await readFile(builtPath, "utf8"), {
    assetBase: info.assetBase,
  })
  if (extracted.issues.length > 0)
    throw new ScienceError(
      `${info.doc} cannot be published as an article:\n  - ${extracted.issues.join("\n  - ")}`,
    )

  // Figures: only the files the article refers to, only from its own build folder.
  const builtDir = resolve(root, "science/_build", info.dir)
  await rm(join(root, info.assetDir), { recursive: true, force: true })
  for (const { source, name } of extracted.assets) {
    const from = resolve(builtDir, source)
    if (!from.startsWith(builtDir + sep) || !existsSync(from))
      throw new ScienceError(
        `the figure ${source} is not inside the build of ${info.doc}`,
      )
    const size = (await stat(from)).size
    if (size > MAX_ASSET_BYTES)
      throw new ScienceError(
        `the figure ${name} is ${size} bytes; the limit is ${MAX_ASSET_BYTES}`,
      )
    if (name.endsWith(".svg")) {
      const problems = svgIssues(await readFile(from, "utf8"))
      if (problems.length > 0)
        throw new ScienceError(
          `the figure ${name} is not safe to publish: ${problems.join("; ")}`,
        )
    }
    await mkdir(join(root, info.assetDir), { recursive: true })
    await cp(from, join(root, info.assetDir, name))
  }

  await normalizeEndings(root, info.assetDir)
  await normalizeEndings(root, info.freeze)
  await mkdir(dirname(join(root, info.fragment)), { recursive: true })
  await writeFile(join(root, info.fragment), extracted.html)
  if (info.stub) {
    const head = Object.entries(publication)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join("\n")
    const stub = `---\n${head}\n---\n<!-- ${GENERATED_MARKER}${info.dir}/${info.name}.qmd by \`npm run science:render\`. Do not edit: the article is the .qmd; this file only registers it as an entry. -->\n`
    await mkdir(dirname(join(root, info.stub)), { recursive: true })
    await writeFile(join(root, info.stub), stub)
  }

  const execution =
    chunks.length === 0
      ? null
      : execute
        ? {
            codeSha256,
            freezeSha256: await folderSha(root, info.freeze),
            python: tools.python,
          }
        : { ...previous.execution, freezeSha256: await folderSha(root, info.freeze) }
  manifest.documents[info.doc] = {
    kind: info.kind,
    source: info.source,
    inputs: await hashAll(root, inputs),
    quarto: tools.quarto,
    execution,
    output: {
      fragment: info.fragment,
      fragmentSha256: sha(extracted.html),
      stub: info.stub,
      stubSha256: info.stub ? await fileSha(join(root, info.stub)) : null,
      assetDir: info.assetDir,
      assetsSha256: await folderSha(root, info.assetDir),
      assets: extracted.assets.map((a) => a.name).sort(),
    },
    // Derived from the source's front matter, for pages that show a document without
    // an entry (the design study). The source stays the one place it is written.
    metadata: publication,
    headings: extracted.headings,
    features: extracted.features,
  }
  await writeManifest(root, manifest)
  return {
    info,
    features: extracted.features,
    headings: extracted.headings.length,
    executed: execute && chunks.length > 0,
    assets: extracted.assets.length,
  }
}

// --- Command line ------------------------------------------------------------------------------

async function main() {
  const [command, doc, ...rest] = process.argv.slice(2)
  try {
    if (rest.length > 0) throw new ScienceError(`unexpected argument "${rest[0]}"`)
    if (command === "check") {
      const t = toolchain()
      console.log(`Quarto:  ${t.quarto ?? "not found"}`)
      console.log(
        `Python:  ${t.python ?? "not found"}${t.jupyter ? " (with the Jupyter packages)" : ` (Jupyter packages: ${t.jupyterProblem ?? "missing"})`}`,
      )
      console.log(`Documents: ${(await listSources()).join(", ") || "none"}`)
      console.log(
        "Rendering computes nothing; only `science:execute` runs code. Set SCIENCE_PYTHON to choose the Python.",
      )
      return
    }
    if (command === "verify") {
      const issues = await verify()
      if (issues.length > 0) {
        console.error(`FAIL: ${issues.length} problem(s) with the scientific articles:`)
        for (const issue of issues) console.error(`  - ${issue}`)
        process.exit(1)
      }
      const manifest = await readManifest()
      console.log(
        `PASS: ${Object.keys(manifest.documents).length} scientific article(s) current; nothing executed`,
      )
      return
    }
    if (command === "render" || command === "execute") {
      if (!doc)
        throw new ScienceError(
          `name the document: npm run science:${command} -- <dir>/<name>`,
        )
      const r = await buildDocument(ROOT, doc, { execute: command === "execute" })
      console.log(
        `${r.executed ? "Executed and rendered" : "Rendered (nothing computed)"} ${r.info.doc}: ${r.headings} headings, ${r.features.equations} equations, ${r.features.figures} figures, ${r.features.tables} tables, ${r.features.citations} citations, ${r.assets} figure file(s)`,
      )
      console.log(
        `  article ${r.info.fragment}${r.info.stub ? `, entry ${r.info.stub}` : ""}, figures ${r.info.assetDir}/`,
      )
      return
    }
    throw new ScienceError(
      "usage: science.mjs check | verify | render <dir>/<name> | execute <dir>/<name>",
    )
  } catch (error) {
    if (error instanceof ScienceError) {
      console.error(`science: ${error.message}`)
      process.exit(1)
    }
    throw error
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
