// The editorial authoring commands (P14, D-107). Five commands, each an npm script, all reading the
// same model as the site (scripts/content-lib.mjs):
//
//   npm run content:new      -- --collection <id> --title "<title>" [--format md|qmd] [options]
//   npm run content:validate -- --all | --collection <id> [--slug <slug>]
//   npm run content:preview  -- --collection <id> --slug <slug>
//   npm run content:publish  -- --collection <id> --slug <slug> --date YYYY-MM-DD [--yes]
//   npm run content:archive  -- --collection <id> --slug <slug> [--yes]
//
// Every command takes explicit arguments and asks nothing. Nothing here commits, pushes, deploys,
// or runs a notebook cell. `--root <dir>` points at another project folder (the tests use a
// throwaway one); `--json` prints validation findings as data.
import { parseArgs } from "node:util"
import { fileURLToPath } from "node:url"
import process from "node:process"
import { COLLECTIONS, collectionById } from "../src/editorial/collections.ts"
import {
  COLLECTION_FIELDS,
  COMMANDS,
  FORMATS,
  formatsOf,
} from "../src/editorial/authoring.ts"
import {
  AuthoringError,
  ROOT,
  analyze,
  archiveArticle,
  createArticle,
  errorsOf,
  findEntry,
  formatFindings,
  loadWorkspace,
  previewInfo,
  publishArticle,
} from "./content-lib.mjs"

const FIELD_FLAGS = new Map()
for (const options of Object.values(COLLECTION_FIELDS))
  for (const option of options) FIELD_FLAGS.set(option.flag, option)

export const OPTIONS = {
  collection: { type: "string" },
  format: { type: "string" },
  title: { type: "string" },
  slug: { type: "string" },
  description: { type: "string" },
  date: { type: "string" },
  today: { type: "boolean" },
  all: { type: "boolean" },
  yes: { type: "boolean" },
  refresh: { type: "boolean" },
  json: { type: "boolean" },
  port: { type: "string" },
  root: { type: "string" },
  help: { type: "boolean" },
  ...Object.fromEntries(
    [...FIELD_FLAGS.values()].map((o) => [
      o.flag,
      { type: o.type === "boolean" ? "boolean" : "string" },
    ]),
  ),
}

const out = (line = "") => process.stdout.write(`${line}\n`)
const err = (line = "") => process.stderr.write(`${line}\n`)
const ids = () => COLLECTIONS.map((c) => c.id).join(", ")

function usage(id) {
  const command = COMMANDS.find((c) => c.id === id)
  out(`npm run content:${id}: ${command.summary}`)
  out("")
  for (const example of command.examples) out(`  ${example}`)
  if (id === "new") {
    out("")
    out(`  --collection  one of ${ids()}`)
    out(
      `  --format      ${FORMATS.join(" | ")} (default md; qmd only for ${COLLECTIONS.filter(
        (c) => formatsOf(c.id).includes("qmd"),
      )
        .map((c) => c.id)
        .join(", ")})`,
    )
    out("  --title       the title; the slug is suggested from it, once")
    out("  --slug        choose the slug yourself")
    out("  --description  one sentence, optional for a draft")
    out("  --date        a publication date for the draft, optional (YYYY-MM-DD)")
    out("")
    for (const c of COLLECTIONS)
      for (const o of COLLECTION_FIELDS[c.id])
        out(`  ${c.id}: --${o.flag}${o.required ? " (required)" : ""}  ${o.help}`)
  }
  if (id === "publish")
    out(
      "\n  Without --yes nothing is changed: it checks and shows the change.\n  --date YYYY-MM-DD, or --today, says when; no date is invented.",
    )
  if (id === "archive") out("\n  Without --yes nothing is changed.")
  if (id === "preview")
    out(
      "\n  --port 4321 (the dev server's port)  --refresh (re-register a stale Quarto article; computes nothing)",
    )
}

const need = (values, names) => {
  const missing = names.filter((name) => values[name] === undefined)
  if (missing.length > 0)
    throw new AuthoringError(
      `Missing ${missing.map((m) => `--${m}`).join(" and ")}. ${missing.includes("collection") ? `Collections: ${ids()}.` : ""}`.trim(),
    )
}

const knownCollection = (id) => {
  if (!COLLECTIONS.some((c) => c.id === id))
    throw new AuthoringError(`"${id}" is not a collection. They are: ${ids()}.`)
}

async function runNew(values, root) {
  need(values, ["collection", "title"])
  knownCollection(values.collection)
  const fields = {}
  for (const option of COLLECTION_FIELDS[values.collection]) {
    const given = values[option.flag]
    if (given !== undefined) fields[option.key] = given
  }
  // A flag that belongs to another collection is an error, not a silent omission.
  for (const [flag, option] of FIELD_FLAGS)
    if (
      values[flag] !== undefined &&
      !COLLECTION_FIELDS[values.collection].some((o) => o.flag === flag)
    )
      throw new AuthoringError(
        `${collectionById(values.collection).label} has no --${flag} (${option.help}).`,
      )
  const made = await createArticle(root, {
    collection: values.collection,
    format: values.format ?? "md",
    title: values.title,
    slug: values.slug,
    description: values.description,
    date: values.date,
    fields,
  })
  out(`Created a draft in ${collectionById(values.collection).label}.`)
  out("")
  out(`Source:  ${made.source}`)
  if (made.registration)
    out(
      `Registered as ${made.registration} (generated: never edit it; the .qmd is the article)`,
    )
  out(`Slug:    ${made.slug}  (fixed now: retitling never moves the address)`)
  out(`Status:  draft`)
  out(`Address when published: ${made.path}`)
  out("")
  out("Next:")
  out(`  edit ${made.source}`)
  out(
    `  npm run content:preview  -- --collection ${values.collection} --slug ${made.slug}`,
  )
  out(
    `  npm run content:validate -- --collection ${values.collection} --slug ${made.slug}`,
  )
}

async function runValidate(values, root) {
  const workspace = await loadWorkspace(root)
  let targets = workspace.entries
  if (values.all !== true) {
    need(values, ["collection"])
    knownCollection(values.collection)
    targets = workspace.entries.filter((e) => e.collection === values.collection)
    if (values.slug !== undefined)
      targets = [findEntry(workspace, values.collection, values.slug)]
  }
  const findings = await analyze(workspace, { targets })
  for (const orphan of workspace.orphans)
    findings.push({
      entry: `${orphan.collection}/(orphan)`,
      file: orphan.file,
      check: "identity.source",
      level: "error",
      message: `${orphan.file} is a generated registration whose Quarto source is gone.`,
      action:
        "restore the .qmd, or remove the generated file with its generated article",
    })
  const errors = errorsOf(findings)
  if (values.json === true) {
    out(JSON.stringify({ checked: targets.length, findings }, null, 2))
    return errors.length > 0 ? 1 : 0
  }
  if (targets.length === 0 && findings.length === 0) {
    out("Publication validation passed")
    out("")
    out("No articles to check: the collections are empty.")
    return 0
  }
  const heading =
    errors.length > 0
      ? "Publication validation failed"
      : "Publication validation passed"
  out(formatFindings(findings, { heading, workspace }))
  out(`${targets.length} article(s) checked. No files were modified.`)
  return errors.length > 0 ? 1 : 0
}

async function runPreview(values, root) {
  need(values, ["collection", "slug"])
  knownCollection(values.collection)
  const info = await previewInfo(root, {
    collection: values.collection,
    slug: values.slug,
    port: Number(values.port ?? 4321),
    refresh: values.refresh === true,
  })
  const { entry } = info
  const status = entry.data?.status ?? "invalid"
  out(`Collection: ${info.label}`)
  out(
    `Source: ${entry.file}${entry.format === "qmd" ? " (Quarto: the article; the registration is generated)" : ""}`,
  )
  out(`Status: ${status}`)
  out(`Public slug: ${entry.data?.slug ?? "(not readable)"}`)
  const errors = errorsOf(info.findings)
  const warnings = info.findings.filter((f) => f.level === "warning").length
  out(
    `Validation: ${errors.length} error(s), ${warnings} warning(s)${info.findings.length > 0 ? "  (npm run content:validate shows them)" : ""}`,
  )
  if (info.quarto) {
    out(
      `Quarto: ${info.quarto.status === "current" ? "generated article current" : `generated article ${info.quarto.status}`}${info.quarto.hasCode ? " (the source has code)" : ""}`,
    )
    if (info.refreshed) out(`  refresh: ${info.refreshed}`)
    if (info.quarto.status === "computation required")
      out(
        `  The code must be executed on purpose: npm run science:execute -- ${info.quarto.doc}`,
      )
    else if (info.quarto.status !== "current")
      out(
        `  Re-register it (computes nothing): npm run science:render -- ${info.quarto.doc}   or add --refresh`,
      )
    out("Scientific execution: never run by this command")
  }
  if (!info.usable) {
    out("")
    out(
      "Local preview: not available until the errors above are fixed (the dev server would refuse the page).",
    )
    return 1
  }
  out("")
  if (!info.server.reachable) {
    out(
      `Dev server: not running on port ${values.port ?? 4321}. Start it with: npm run dev`,
    )
    out(`Local preview, once it runs: ${info.url}`)
  } else if (info.page && info.page.status === 200) {
    out("Dev server: running; the page answered (HTTP 200)")
    out(`Local preview: ${info.url}`)
  } else {
    out(
      `Dev server: running, but the page answered HTTP ${info.page?.status}: it may still be loading, or the server was started before this article existed (reload, or restart npm run dev).`,
    )
    out(`Local preview: ${info.url}  (not confirmed)`)
  }
  out(
    status === "draft"
      ? "Production: a build leaves this draft out."
      : `Production: ${status}, at ${info.path}`,
  )
  return 0
}

function reportTransition(result, verb, values) {
  const { entry, findings } = result
  const label = verb === "publish" ? "Publication" : "Archive"
  if (result.unchanged) {
    out(`${entry.file} is already ${entry.data.status}. Nothing to do.`)
    return 0
  }
  if (result.blocked) {
    out(`${label} preflight failed`)
    out("")
    out(`Collection: ${entry.collection}`)
    out(`Source: ${entry.file}`)
    let n = 0
    for (const problem of result.problems) out(`${++n}. [error] ${problem}`)
    for (const f of findings.filter((f) => f.level === "error")) {
      out(`${++n}. [error] ${f.field ? `${f.field}: ` : ""}${f.message}`)
      if (f.action) out(`     -> ${f.action}`)
    }
    out("")
    out("No files were modified.")
    return 1
  }
  for (const f of findings.filter((f) => f.level === "warning")) {
    out(`warning: ${f.field ? `${f.field}: ` : ""}${f.message}`)
  }
  out(`${label} preflight passed`)
  out("")
  out(`Collection: ${entry.collection}`)
  out(`Source: ${entry.file}`)
  out(`Change:`)
  for (const c of result.changes) out(`  ${c.before}  ->  ${c.after}`)
  if (!result.applied) {
    out(`Address: ${result.path}${verb === "archive" ? " (unchanged)" : ""}`)
    out("")
    out(`Dry run: no files were modified. Add --yes to make the change:`)
    out(
      `  npm run content:${verb} -- --collection ${values.collection} --slug ${values.slug}${verb === "publish" ? (values.today ? " --today" : ` --date ${result.proposed.publishedAt}`) : ""} --yes`,
    )
    return 0
  }
  out(`Status now: ${result.proposed.status}`)
  out(`Public address: ${result.path}`)
  if (entry.format === "qmd")
    out("The article was re-registered from the source (nothing was computed).")
  out("")
  out("Next: review the change, then commit it yourself:")
  out(`  git diff -- ${entry.file}`)
  out("This changed one source file. It did not commit, push or deploy anything.")
  return 0
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)
  if (!COMMANDS.some((c) => c.id === command)) {
    err(
      `usage: content.mjs ${COMMANDS.map((c) => c.id).join(" | ")}  (use the npm scripts: npm run content:<command> -- ...)`,
    )
    process.exit(2)
  }
  let parsed
  try {
    parsed = parseArgs({ args: rest, options: OPTIONS, allowPositionals: false })
  } catch (error) {
    err(`content:${command}: ${error.message}`)
    err("Run: npm run content:" + command + " -- --help")
    process.exit(2)
  }
  const { values } = parsed
  if (values.help) return usage(command)
  const root = values.root ?? ROOT
  try {
    let code = 0
    if (command === "new") await runNew(values, root)
    else if (command === "validate") code = await runValidate(values, root)
    else if (command === "preview") code = await runPreview(values, root)
    else {
      need(values, ["collection", "slug"])
      knownCollection(values.collection)
      const run = command === "publish" ? publishArticle : archiveArticle
      const result = await run(root, {
        collection: values.collection,
        slug: values.slug,
        date: values.date,
        today: values.today === true,
        apply: values.yes === true,
      })
      code = reportTransition(result, command, values)
    }
    process.exit(code)
  } catch (error) {
    if (error instanceof AuthoringError) {
      err(`content:${command} failed`)
      err("")
      error.messages.forEach((m, i) =>
        err(error.messages.length > 1 ? `${i + 1}. ${m}` : m),
      )
      err("")
      err("No files were modified.")
      process.exit(1)
    }
    throw error
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
