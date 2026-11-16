// The editorial authoring tool's engine (P14, D-107 to D-111): reads the entries in a workspace,
// checks them, and makes the three changes an author asks for (create, publish, archive). The
// command line is scripts/content.mjs; this file has no output of its own, so the tests call it
// directly, on a throwaway root.
//
// What it reuses, and never copies:
//   metadata          src/editorial/schema.ts (schemaFor), src/editorial/raw-dates.ts
//   identity, routes  src/editorial/model.ts (collectionIssues, contentRoutes), src/navigation
//   relationships     src/editorial/reading.ts (entryReferenceIssues), src/records
//   Quarto            scripts/science.mjs (verify, buildDocument): the freshness and execution model
//   what is checked   src/editorial/authoring.ts (PREFLIGHT_CHECKS), the one list
//
// What it never does: run a notebook cell (only `npm run science:execute` does), edit a generated
// file, commit, push, or write anything but the one source file an author asked it to.
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import { basename, dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import {
  COLLECTIONS,
  collectionById,
  collectionPrefix,
} from "../src/editorial/collections.ts"
import {
  COLLECTION_FIELDS,
  PLACEHOLDER_PATTERN,
  PREFLIGHT_CHECKS,
  articleTemplate,
  formatsOf,
  isSlug,
  levelOf,
  registrationPath,
  setFrontMatterField,
  slugFromTitle,
  sourcePath,
} from "../src/editorial/authoring.ts"
import {
  collectionIssues,
  contentRoutes,
  isPublic,
  publicPath,
} from "../src/editorial/model.ts"
import { recordReferenceIssues } from "../src/editorial/model.ts"
import { rawDateIssues } from "../src/editorial/raw-dates.ts"
import { entryReferenceIssues } from "../src/editorial/reading.ts"
import { isCalendarDate, schemaFor } from "../src/editorial/schema.ts"
import {
  NavigationConfigError,
  createNavigation,
  normalizePath,
  siteNavigation,
} from "../src/navigation/index.ts"
import { SECTIONS } from "../src/navigation/registry.ts"
import { siteRecords } from "../src/records/index.ts"
import {
  GENERATED_MARKER,
  QUARTO_KEYS,
  buildDocument,
  codeChunks,
  listSources,
  readManifest,
  splitSource,
  toolchain,
  verify,
} from "./science.mjs"

export const ROOT = fileURLToPath(new URL("../", import.meta.url))
const CHECKS = new Map(PREFLIGHT_CHECKS.map((check) => [check.id, check]))
const QUARTO_DIRECTORIES = COLLECTIONS.filter((c) =>
  formatsOf(c.id).includes("qmd"),
).map((c) => c.directory)

/** A refusal with reasons the author can act on. Nothing was changed when one is thrown. */
export class AuthoringError extends Error {
  constructor(messages) {
    const list = Array.isArray(messages) ? messages : [messages]
    super(list.join("\n"))
    this.name = "AuthoringError"
    this.messages = list
  }
}

const posix = (path) => path.split(sep).join("/")
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

// --- Reading the workspace ------------------------------------------------------------------------

async function markdownFiles(folder) {
  if (!existsSync(folder)) return []
  const found = []
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name)
    if (entry.isDirectory()) found.push(...(await markdownFiles(path)))
    else if (entry.name.endsWith(".md") && !entry.name.startsWith("_")) found.push(path)
  }
  return found.sort()
}

const finding = (check, message, extra = {}) => ({
  check,
  message,
  ...extra,
})

/** What the schema's issues mean to an author: which check, which field, what to do. */
function schemaFindings(issues) {
  return issues.map((issue) => {
    const field = issue.path.join(".") || undefined
    const publication =
      /^an? (?:published|archived) entry needs/.test(issue.message) ||
      /^a (?:published|archived) entry needs/.test(issue.message)
    if (publication)
      return finding("metadata.publication", `${issue.message}.`, {
        field,
        action: `add ${field}: to the front matter`,
      })
    if (issue.code === "unrecognized_keys")
      return finding("metadata.schema", `${issue.message}.`, {
        field,
        action: "correct the spelling, or remove the key: unknown fields are errors",
      })
    if (/received undefined/.test(issue.message))
      return finding("metadata.schema", "Missing required field.", {
        field,
        action: `add ${field}: to the front matter`,
      })
    return finding("metadata.schema", `${issue.message}.`.replace(/\.\.$/, "."), {
      field,
    })
  })
}

/** One entry of the workspace, with its metadata parsed (or the reasons it could not be). */
async function readEntry(root, collection, kind, path) {
  const text = await readFile(join(root, path), "utf8")
  const entry = {
    collection: collection.id,
    id:
      kind === "qmd"
        ? basename(path, ".qmd")
        : posix(
            relative(join(root, "src/content", collection.directory), join(root, path)),
          ).replace(/\.md$/, ""),
    format: kind,
    file: path,
    text,
    data: null,
    raw: null,
    body: "",
    bodyStart: 0,
    findings: [],
  }
  let split
  try {
    split = splitSource(text)
  } catch (error) {
    entry.findings.push(
      finding("metadata.syntax", `${error.message.replace(/\.$/, "")}.`, {
        field: "(front matter)",
        action: "begin the file with a --- block of YAML metadata",
      }),
    )
    return entry
  }
  entry.raw = split.data
  entry.body = split.body
  entry.bodyStart = text.length - split.body.length
  for (const issue of rawDateIssues(text))
    entry.findings.push(
      finding("metadata.syntax", `${issue}.`, { field: issue.split(":")[0] }),
    )
  const metadata =
    kind === "qmd"
      ? Object.fromEntries(
          Object.entries(split.data).filter(([key]) => !QUARTO_KEYS.includes(key)),
        )
      : split.data
  const parsed = schemaFor(collection.id).safeParse(metadata)
  if (parsed.success) entry.data = parsed.data
  else entry.findings.push(...schemaFindings(parsed.error.issues))
  if (Object.hasOwn(split.data, "synthetic"))
    entry.findings.push(
      finding(
        "safety.synthetic",
        "The metadata says `synthetic`: only a demonstration does.",
        {
          field: "synthetic",
          action:
            "demonstrations live in src/demos/ and are never published; remove the field",
        },
      ),
    )
  return entry
}

/**
 * Every entry the author wrote, in every collection: Markdown files in src/content/, and Quarto
 * sources in science/<dir>/ (a generated registration in src/content/ is not an entry of its
 * own: its source is). Demonstrations (src/demos/) and the design study are not entries.
 */
export async function loadWorkspace(root = ROOT) {
  const entries = []
  const orphans = []
  const qmds = new Set(await listSources(root))
  for (const collection of COLLECTIONS) {
    for (const file of await markdownFiles(
      join(root, "src/content", collection.directory),
    )) {
      const rel = posix(relative(root, file))
      const head = (await readFile(file, "utf8")).slice(0, 4000)
      if (head.includes(GENERATED_MARKER)) {
        const doc = `${collection.directory}/${basename(file, ".md")}`
        if (!qmds.has(doc)) orphans.push({ collection: collection.id, file: rel })
        continue
      }
      entries.push(await readEntry(root, collection, "md", rel))
    }
    if (QUARTO_DIRECTORIES.includes(collection.directory))
      for (const doc of [...qmds].filter((d) =>
        d.startsWith(`${collection.directory}/`),
      ))
        entries.push(await readEntry(root, collection, "qmd", `science/${doc}.qmd`))
  }
  entries.sort((a, b) => compare(a.collection + a.id, b.collection + b.id))
  return { root, entries, orphans }
}

/** The entry of a collection with this slug (the public identity), or throws with what exists. */
export function findEntry(workspace, collection, slug) {
  const same = workspace.entries.filter(
    (entry) =>
      entry.collection === collection &&
      (entry.data?.slug === slug || (entry.data === null && entry.id === slug)),
  )
  if (same.length === 1) return same[0]
  if (same.length > 1)
    throw new AuthoringError(
      `${same.length} entries of ${collection} have the slug "${slug}": ${same.map((e) => e.file).join(", ")}`,
    )
  const known = workspace.entries
    .filter((entry) => entry.collection === collection)
    .map((entry) => entry.data?.slug ?? entry.id)
  throw new AuthoringError([
    `${collection} has no article with the slug "${slug}".`,
    known.length > 0
      ? `Its articles: ${known.join(", ")}.`
      : `${collectionById(collection).label} has no articles yet: create one with  npm run content:new`,
  ])
}

// --- Text helpers ---------------------------------------------------------------------------------

/**
 * The lines of a file as `{ number, text, code }`: `code` is true inside a fenced block. Inline
 * code is blanked in `prose`, so a link or a marker written as an example is not mistaken for one.
 */
function lines(text) {
  let fence = null
  return text.split("\n").map((line, index) => {
    const marker = /^\s*(```+|~~~+)/.exec(line)
    let code = fence !== null
    if (marker) {
      if (fence === null) fence = marker[1][0]
      else if (marker[1][0] === fence) fence = null
      code = true
    }
    return {
      number: index + 1,
      text: line,
      code,
      prose: code ? "" : line.replace(/`[^`\n]*`/g, (m) => " ".repeat(m.length)),
    }
  })
}

// --- The checks -----------------------------------------------------------------------------------

const sourceLabel = (entry) => entry.file
const entryKey = (entry) => `${entry.collection}/${entry.id}`

/** The git HEAD version of a file's slug and status, or null (not a repository, new file). */
export function gitPrevious(root, path) {
  const shown = spawnSync("git", ["-C", root, "show", `HEAD:${path}`], {
    encoding: "utf8",
  })
  if (shown.status !== 0) return null
  const front = /^---\n([\s\S]*?)\n---/.exec(shown.stdout)?.[1] ?? ""
  const value = (key) =>
    new RegExp(`^${key}:\\s*["']?([^"'\\s#]+)`, "m").exec(front)?.[1]
  return { slug: value("slug"), status: value("status") }
}

/** The documents of a Quarto entry: its status offline, from the manifest and the files. */
export async function quartoStatus(root, entry, issuesOfAll) {
  const doc = `${collectionById(entry.collection).directory}/${entry.id}`
  const registration = registrationPath(entry.collection, entry.id)
  const mine = issuesOfAll.filter(
    (issue) => issue.startsWith(`${doc}:`) || issue.startsWith(`${registration}:`),
  )
  const kind = (issue) => {
    if (/was edited by hand/.test(issue) && issue.includes(registration))
      return "invalid"
    if (
      /never executed|code changed since it was executed|frozen results changed/.test(
        issue,
      )
    )
      return "computation required"
    if (/has no rendering|is missing|is gone/.test(issue)) return "missing"
    if (
      /changed since it was rendered|do not match the rendering|was edited by hand/.test(
        issue,
      )
    )
      return "stale"
    return "invalid"
  }
  const order = ["invalid", "computation required", "missing", "stale"]
  const kinds = mine.map(kind)
  const status = order.find((k) => kinds.includes(k)) ?? "current"
  const text = existsSync(join(root, entry.file))
    ? await readFile(join(root, entry.file), "utf8")
    : ""
  return {
    doc,
    status,
    issues: mine.map((message) => ({ message, kind: kind(message) })),
    hasCode: codeChunks(text).length > 0,
  }
}

/**
 * Checks the entries of a workspace. `targets` are the entries reported (all, or one); every
 * entry is read for the checks that compare entries with each other. `proposed` replaces one
 * entry's metadata with the state it would have after a change, which is how publication is
 * checked before anything is written. Returns findings, each with a level and an entry.
 */
export async function analyze(
  workspace,
  { targets = workspace.entries, proposed = null, previous = gitPrevious } = {},
) {
  const { root } = workspace
  const findings = []
  const add = (entry, check, message, extra = {}, becomesPublic = false) => {
    const definition = CHECKS.get(check)
    if (definition === undefined) throw new Error(`unknown check ${check}`)
    findings.push({
      entry: entry ? entryKey(entry) : null,
      file: entry ? sourceLabel(entry) : null,
      check,
      level: levelOf(definition.severity, becomesPublic),
      ...extra,
      message,
    })
  }

  // The state each entry would have: the proposed change applied to one of them.
  const state = (entry) =>
    proposed !== null && proposed.entry === entry ? proposed.data : entry.data
  const records = workspace.entries
    .filter((entry) => state(entry) !== null)
    .map((entry) => ({
      collection: entry.collection,
      id: entry.id,
      data: state(entry),
    }))
  const targetKeys = new Set(targets.map(entryKey))
  const attribute = (message) =>
    workspace.entries.find(
      (entry) =>
        message.includes(`"${entry.id}"`) && message.includes(entry.collection),
    ) ?? workspace.entries.find((entry) => message.includes(`"${entry.id}"`))
  const addCross = (check, messages, action) => {
    for (const message of messages) {
      const owner = attribute(message)
      if (
        owner !== undefined &&
        !targetKeys.has(entryKey(owner)) &&
        targets.length === 1
      )
        continue
      const becomes = owner ? isPublic(state(owner)?.status ?? "draft") : false
      add(
        owner ?? null,
        check,
        `${message}.`.replace(/\.\.$/, "."),
        action ? { action } : {},
        becomes,
      )
    }
  }

  addCross(
    "identity.slug",
    collectionIssues(records),
    "give one of them another slug, or another position",
  )
  addCross(
    "relationships.entries",
    entryReferenceIssues(records),
    "fix the related: list",
  )
  addCross(
    "relationships.records",
    recordReferenceIssues(records, (id) => siteRecords.byId.has(id)),
    "use an existing record ID, or remove it",
  )
  try {
    createNavigation(SECTIONS, contentRoutes(records, { drafts: true }))
  } catch (error) {
    if (!(error instanceof NavigationConfigError)) throw error
    for (const message of error.issues) {
      const owner = workspace.entries.find((entry) => {
        const data = state(entry)
        return (
          data !== null &&
          message.includes(publicPath({ collection: entry.collection, data }))
        )
      })
      if (
        owner !== undefined &&
        !targetKeys.has(entryKey(owner)) &&
        targets.length === 1
      )
        continue
      add(owner ?? null, "identity.route", `${message}.`.replace(/\.\.$/, "."), {
        action: "choose another slug",
      })
    }
  }

  // Pages a link may name: the folders, the entries' pages (drafts marked as such), public/.
  const draftPaths = new Set()
  const entryPaths = new Set()
  for (const record of records) {
    const path = publicPath(record)
    entryPaths.add(path)
    if (!isPublic(record.data.status)) draftPaths.add(path)
  }
  const publicFile = (path) =>
    existsSync(join(root, "public", path.replace(/^\/+/, "")))

  const issuesOfAll =
    workspace.entries.some((e) => e.format === "qmd") || workspace.orphans.length > 0
      ? await verify(root)
      : []
  const manifest = await readManifest(root)

  for (const entry of targets) {
    const data = state(entry)
    const status = data?.status ?? entry.raw?.status ?? "draft"
    const becomesPublic = isPublic(String(status))
    const at = (check, message, extra = {}) =>
      add(entry, check, message, extra, becomesPublic)

    for (const carried of entry.findings) {
      const { check, message, ...extra } = carried
      // A missing description or date is a problem of a public entry only; the entry's own
      // parse does not carry it for a draft, so it appears here only when it is real.
      at(check, message, extra)
    }
    if (proposed !== null && proposed.entry === entry && data !== null) {
      const again = schemaFor(entry.collection).safeParse(data)
      if (!again.success)
        for (const carried of schemaFindings(again.error.issues)) {
          const { check, message, ...extra } = carried
          at(check, message, extra)
        }
    }
    if (data === null) continue

    // Readiness of a draft: what it still needs before it can be published.
    if (!becomesPublic) {
      if (data.description === undefined)
        at("metadata.publication", "No description yet: needed to publish.", {
          field: "description",
          action: "add description: (one sentence, shown in the index)",
        })
    }

    // Identity.
    const stem = entry.format === "qmd" ? entry.id : entry.id.split("/").at(-1)
    if (stem !== data.slug)
      at(
        "identity.filename",
        `The file is named ${stem} but the slug is ${data.slug}.`,
        {
          field: "slug",
          action: "harmless; the address comes from the slug, never the file name",
        },
      )
    if (isPublic(entry.data?.status ?? "draft") || becomesPublic) {
      const before = previous(root, entry.format === "qmd" ? entry.file : entry.file)
      if (
        before?.slug !== undefined &&
        before.status !== "draft" &&
        before.status !== undefined &&
        before.slug !== data.slug
      )
        at(
          "identity.stable",
          `The slug was ${before.slug} in the last commit and is now ${data.slug}: the public address ${publicPath({ collection: entry.collection, data: { ...data, slug: before.slug } })} would stop working.`,
          {
            field: "slug",
            action:
              "restore the slug; changing a public address is a migration that needs its own decision",
          },
        )
    }
    if (entry.format === "md") {
      const doc = `${collectionById(entry.collection).directory}/${entry.id}`
      if (
        QUARTO_DIRECTORIES.includes(collectionById(entry.collection).directory) &&
        existsSync(join(root, "science", `${doc}.qmd`))
      )
        at(
          "identity.source",
          `Both ${entry.file} and science/${doc}.qmd are sources of the same entry.`,
          {
            action:
              "keep one: the Quarto source owns the entry, and the Markdown file is generated from it",
          },
        )
    }

    // Quarto: the source is the .qmd; the registration and the article are derived from it.
    if (entry.format === "qmd") {
      const q = await quartoStatus(root, entry, issuesOfAll)
      for (const { message, kind } of q.issues) {
        const check =
          kind === "computation required"
            ? "quarto.execution"
            : kind === "invalid" && /was edited by hand/.test(message)
              ? "identity.source"
              : "quarto.freshness"
        const run = /\(run: ([^)]+)\)/.exec(message)?.[1]
        at(
          check,
          `${message.replace(/\s*\(run: [^)]+\)/, "").replace(/^[a-z]+\/[a-z0-9-]+:\s*/, "")}.`.replace(
            /\.\.$/,
            ".",
          ),
          {
            field: `Quarto ${kind}`,
            ...(run ? { action: run } : {}),
          },
        )
      }
      const record = manifest.documents[q.doc]
      if (q.status === "current" && record) {
        const fragment = await readFile(join(root, record.output.fragment), "utf8")
        if (/\?@[a-z]|quarto-unresolved-ref/.test(fragment))
          at(
            "quarto.references",
            "The rendered article has an unresolved cross-reference or citation.",
            {
              action:
                "check the @labels and [@keys] against the document and its bibliography, then re-render",
            },
          )
      }
    }

    // The text.
    const all = lines(entry.text)
    const body = all.filter(
      (line) =>
        line.number > entry.text.slice(0, entry.bodyStart).split("\n").length - 1,
    )
    let lastLevel = 0
    for (const line of body) {
      if (line.code) continue
      const heading = /^(#{1,6})\s+\S/.exec(line.prose)
      if (heading) {
        const level = heading[1].length
        if (level === 1)
          add(
            entry,
            "markdown.heading-level",
            `Line ${line.number}: a level-1 heading; the title is the page's <h1>.`,
            {
              action: "start sections at ##",
            },
          )
        else if (lastLevel > 0 && level > lastLevel + 1)
          add(
            entry,
            "markdown.heading-order",
            `Line ${line.number}: a level-${level} heading follows level ${lastLevel}.`,
            {
              action: `use level ${lastLevel + 1}`,
            },
          )
        lastLevel = level
      }
      for (const match of line.prose.matchAll(/(!?)\[[^\]]*\]\(\s*([^)\s]+)/g)) {
        const [, image, target] = match
        if (/^(?:https?:|mailto:|#|data:)/.test(target)) continue
        const path = target.split(/[?#]/)[0]
        if (path === "") continue
        if (!path.startsWith("/")) {
          if (entry.format === "qmd" && image) continue
          at(
            image ? "markdown.resources" : "markdown.links",
            `Line ${line.number}: ${target} is relative, so it breaks when the page moves.`,
            {
              action: "write it from the site root, starting with /",
            },
          )
          continue
        }
        const asPage = normalizePath(
          path.endsWith("/") || /\.[a-z0-9]+$/i.test(path) ? path : `${path}/`,
        )
        if (image || (/\.[a-z0-9]+$/i.test(path) && !path.endsWith("/"))) {
          if (!publicFile(path))
            at(
              "markdown.resources",
              `Line ${line.number}: ${path} is not in public/.`,
              {
                action: "put the file in public/, or correct the path",
              },
            )
          continue
        }
        if (/^\/(?:_design|demo-assets)\//.test(path))
          at(
            "markdown.links",
            `Line ${line.number}: ${path} is a development page, which a build leaves out.`,
            {
              action: "remove the link",
            },
          )
        else if (draftPaths.has(asPage))
          at(
            "markdown.links",
            `Line ${line.number}: ${path} is a draft, which has no page in a build.`,
            {
              action: "publish the draft first, or remove the link",
            },
          )
        else if (
          !entryPaths.has(asPage) &&
          !siteNavigation.resolve(asPage).found &&
          !publicFile(path)
        )
          at(
            "markdown.links",
            `Line ${line.number}: ${path} is not a page of this site.`,
            {
              action: "correct the address",
            },
          )
      }
    }

    // Placeholders, local paths, demonstration markers.
    for (const line of all) {
      const markers = line.code
        ? []
        : [...line.prose.matchAll(new RegExp(PLACEHOLDER_PATTERN.source, "gi"))]
      for (const marker of markers)
        at(
          "safety.placeholders",
          `Line ${line.number}: "${marker[0]}" is still in the text.`,
          { action: "write the text, or delete the line" },
        )
      const locals = [
        ...line.text.matchAll(
          /\/Users\/\S+|\/home\/[a-z]\S*|\b[A-Za-z]:\\\S+|file:\/\/\S*/g,
        ),
        ...(line.code
          ? []
          : line.prose.matchAll(/\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/g)),
      ]
      for (const local of locals)
        at(
          "safety.local",
          `Line ${line.number}: "${local[0]}" is a local path or address.`,
          { action: "remove it: it would be public, and means nothing to a reader" },
        )
      if (/Development demonstration|data-demo-|synthetic content/i.test(line.text))
        add(
          entry,
          "safety.synthetic",
          `Line ${line.number}: a demonstration marker is in a real entry.`,
          {
            action: "demonstration text belongs in src/demos/",
          },
        )
    }

    // A public entry recommends only public entries.
    if (becomesPublic)
      for (const reference of data.related ?? []) {
        const other = workspace.entries.find((candidate) => {
          const d = state(candidate)
          return (
            d !== null &&
            `${collectionById(candidate.collection).directory}/${d.slug}` === reference
          )
        })
        if (other !== undefined && !isPublic(state(other).status))
          at(
            "relationships.public",
            `related names ${reference}, which is still a draft.`,
            {
              field: "related",
              action: "publish it first, or remove it from related:",
            },
          )
      }
  }

  const order = { error: 0, warning: 1, info: 2 }
  return findings.sort(
    (a, b) =>
      compare(a.file ?? "", b.file ?? "") ||
      order[a.level] - order[b.level] ||
      compare(a.check, b.check) ||
      compare(a.message, b.message),
  )
}

export const errorsOf = (findings) => findings.filter((f) => f.level === "error")

// --- Reports --------------------------------------------------------------------------------------

/** The text a command prints for findings: grouped by article, numbered, with the way out. */
export function formatFindings(findings, { heading, workspace }) {
  const out = []
  const errors = errorsOf(findings).length
  const warnings = findings.filter((f) => f.level === "warning").length
  out.push(heading, "")
  const keys = [...new Set(findings.map((f) => f.entry ?? "(several articles)"))]
  const shown = keys.length > 0 ? keys : []
  for (const key of shown) {
    const mine = findings.filter((f) => (f.entry ?? "(several articles)") === key)
    const entry = workspace?.entries.find((e) => entryKey(e) === key)
    out.push(`Collection: ${key.split("/")[0]}`)
    if (entry) out.push(`Source: ${entry.file}`)
    mine.forEach((f, index) => {
      out.push(
        `${index + 1}. [${f.level}] ${f.field ? `${f.field}: ` : ""}${f.message}`,
      )
      if (f.action) out.push(`     -> ${f.action}`)
    })
    out.push("")
  }
  out.push(`${errors} error(s), ${warnings} warning(s).`)
  return out.join("\n")
}

// --- Creating -------------------------------------------------------------------------------------

/** Today's date at the author's computer, as YYYY-MM-DD. */
export function today(now = new Date()) {
  const two = (n) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`
}

const inside = (root, path) => {
  const full = resolve(root, path)
  return full === resolve(root) || full.startsWith(resolve(root) + sep)
}

/**
 * Creates a draft. Every refusal is decided before the first byte is written, and the file is
 * opened with the exclusive flag, so an existing article cannot be replaced even in a race.
 * A Quarto draft is also registered (a render that computes nothing); if that fails, the source
 * is removed again and the workspace is as it was.
 */
export async function createArticle(
  root,
  { collection, format = "md", title, slug, description, date, fields = {} },
) {
  const problems = []
  const known = COLLECTIONS.find((c) => c.id === collection)
  if (known === undefined)
    throw new AuthoringError(
      `"${collection}" is not a collection. They are: ${COLLECTIONS.map((c) => c.id).join(", ")}.`,
    )
  if (!formatsOf(collection).includes(format))
    throw new AuthoringError(
      format === "qmd"
        ? `${known.label} takes Markdown only (--format md). Quarto is available for: ${COLLECTIONS.filter(
            (c) => formatsOf(c.id).includes("qmd"),
          )
            .map((c) => c.id)
            .join(", ")}.`
        : `"${format}" is not a format: use md or qmd.`,
    )
  const cleanTitle = typeof title === "string" ? title.trim() : ""
  if (cleanTitle === "" || /[\r\n]/.test(cleanTitle))
    problems.push('Give a title on one line: --title "My Article".')
  const chosen = slug ?? slugFromTitle(cleanTitle)
  if (chosen === "" || !isSlug(chosen))
    problems.push(
      slug === undefined
        ? "The title gives no usable slug: add one with --slug my-article."
        : `"${slug}" is not a slug: use lowercase letters and digits with single hyphens, at most 80 characters.`,
    )
  if (date !== undefined && !isCalendarDate(date))
    problems.push(`"${date}" is not a calendar date: write YYYY-MM-DD.`)
  const values = {}
  for (const option of COLLECTION_FIELDS[collection]) {
    const given = fields[option.key]
    if (given === undefined) {
      if (option.required)
        problems.push(`${known.label} needs --${option.flag} (${option.help}).`)
      continue
    }
    values[option.key] = option.type === "number" ? Number(given) : given
    if (
      option.type === "number" &&
      !(Number.isInteger(values[option.key]) && values[option.key] > 0)
    )
      problems.push(`--${option.flag} must be a positive whole number.`)
    if (option.type === "enum" && !option.values.includes(String(given)))
      problems.push(`--${option.flag} must be one of ${option.values.join(", ")}.`)
  }
  for (const key of Object.keys(fields))
    if (!COLLECTION_FIELDS[collection].some((o) => o.key === key))
      problems.push(`${known.label} has no field ${key}.`)
  if (problems.length > 0) throw new AuthoringError(problems)

  const article = {
    collection,
    format,
    title: cleanTitle,
    slug: chosen,
    ...(description !== undefined ? { description } : {}),
    ...(date !== undefined ? { publishedAt: date } : {}),
    fields: values,
  }
  const text = articleTemplate(article)
  // The template must be a valid draft before it is offered.
  const front = splitSource(text).data
  const check = schemaFor(collection).safeParse(front)
  if (!check.success)
    throw new AuthoringError(
      check.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    )

  const source = sourcePath(collection, chosen, format)
  const registration = registrationPath(collection, chosen)
  const workspace = await loadWorkspace(root)
  const clashes = []
  for (const path of [source, registration])
    if (!inside(root, path)) clashes.push(`${path} is outside the project.`)
    else if (existsSync(join(root, path)))
      clashes.push(`${path} already exists; nothing was overwritten.`)
  const same = workspace.entries.find(
    (entry) => entry.collection === collection && entry.data?.slug === chosen,
  )
  if (same !== undefined)
    clashes.push(
      `${known.label} already has an article with the slug "${chosen}" (${same.file}).`,
    )
  if (clashes.length === 0)
    try {
      createNavigation(
        SECTIONS,
        contentRoutes(
          [
            ...workspace.entries
              .filter((e) => e.data !== null)
              .map((e) => ({ collection: e.collection, id: e.id, data: e.data })),
            { collection, id: chosen, data: check.data },
          ],
          { drafts: true },
        ),
      )
    } catch (error) {
      if (!(error instanceof NavigationConfigError)) throw error
      clashes.push(
        `The address ${collectionPrefix(known)}${chosen}/ collides with another page: choose another slug.`,
      )
    }
  if (clashes.length > 0) throw new AuthoringError(clashes)
  if (format === "qmd") {
    const tools = toolchain()
    if (tools.quarto === null)
      throw new AuthoringError(
        "Quarto is not installed or not on the PATH, and a Quarto article must be registered when it is created. Install Quarto (https://quarto.org), or create a Markdown article.",
      )
  }

  await mkdir(dirname(join(root, source)), { recursive: true })
  try {
    await writeFile(join(root, source), text, { flag: "wx" })
  } catch (error) {
    // Another process made the file after the checks above: still not overwritten.
    if (error.code === "EEXIST")
      throw new AuthoringError(`${source} already exists; nothing was overwritten.`)
    throw error
  }
  if (format === "qmd") {
    try {
      await buildDocument(root, `${collectionById(collection).directory}/${chosen}`, {
        execute: false,
      })
    } catch (error) {
      // Take back the one file this call made, and nothing else.
      const { rm } = await import("node:fs/promises")
      await rm(join(root, source), { force: true })
      throw new AuthoringError([
        `The new article could not be registered, so it was not kept: ${error.message}`,
      ])
    }
  }
  return {
    source,
    registration: format === "qmd" ? registration : null,
    path: publicPath({ collection, data: { slug: chosen } }),
    slug: chosen,
    status: "draft",
  }
}

// --- Publishing and archiving ---------------------------------------------------------------------

function changeLines(before, after, keys) {
  const pick = (text, key) =>
    text
      .split("\n")
      .slice(0, text.split("\n").indexOf("---", 1))
      .find((l) => new RegExp(`^${key}\\s*:`).test(l))
  return keys.flatMap((key) => {
    const a = pick(before, key)
    const b = pick(after, key)
    return a === b ? [] : [{ key, before: a ?? "(absent)", after: b }]
  })
}

/**
 * The shared step of publishing and archiving: find the entry, check the state it is in, work out
 * its new metadata, check that state with everything else, and (only with `apply`) write it.
 * Nothing is written when anything is wrong, and a Quarto source is re-registered afterwards;
 * if that fails the source is put back as it was.
 */
async function transition(
  root,
  { collection, slug, from, to, date, today: useToday, apply },
  previous,
) {
  const workspace = await loadWorkspace(root)
  const entry = findEntry(workspace, collection, slug)
  if (entry.data === null) {
    const findings = await analyze(workspace, { targets: [entry], previous })
    throw new AuthoringError([
      `${entry.file} is not valid, so it cannot be ${to === "published" ? "published" : "archived"}:`,
      ...findings
        .filter((f) => f.level === "error")
        .map((f) => `  ${f.field ? `${f.field}: ` : ""}${f.message}`),
    ])
  }
  const status = entry.data.status
  if (status === to)
    return {
      entry,
      unchanged: true,
      findings: [],
      changes: [],
      applied: false,
      workspace,
    }
  if (status !== from)
    throw new AuthoringError(
      to === "published"
        ? status === "archived"
          ? `${entry.file} is archived. Archiving is not undone by this command; change status: by hand if you mean to.`
          : `${entry.file} is ${status}, not a draft.`
        : status === "draft"
          ? `${entry.file} is a draft: it has no public address to keep. Publish it first, or leave it as it is.`
          : `${entry.file} is ${status}.`,
    )
  const proposed = { ...entry.data, status: to }
  const problems = []
  let editedText = entry.text
  let edits = setFrontMatterField(editedText, "status", to)
  if (edits === null) problems.push(`${entry.file}: cannot edit status: in place.`)
  else editedText = edits
  if (to === "published") {
    const wanted = date ?? (useToday ? today() : undefined)
    if (wanted !== undefined && !isCalendarDate(wanted))
      problems.push(`"${wanted}" is not a calendar date: write YYYY-MM-DD.`)
    else if (entry.data.publishedAt !== undefined) {
      if (wanted !== undefined && wanted !== entry.data.publishedAt)
        problems.push(
          `${entry.file} already has publishedAt: ${entry.data.publishedAt}. A date is never rewritten by this command; edit it by hand if it is wrong.`,
        )
    } else if (wanted === undefined)
      problems.push(
        "Say when it is published: --date YYYY-MM-DD, or --today to use today's date. No date is invented.",
      )
    else {
      proposed.publishedAt = wanted
      edits = setFrontMatterField(editedText, "publishedAt", wanted, "slug")
      if (edits === null)
        problems.push(`${entry.file}: cannot add publishedAt: in place.`)
      else editedText = edits
    }
  }
  // The missing date has been said once, as the thing to do; the schema's echo of it is dropped.
  const dateMissing = problems.some((problem) => problem.startsWith("Say when"))
  const findings = (
    await analyze(workspace, {
      targets: [entry],
      proposed: { entry, data: proposed },
      previous,
    })
  ).filter((f) => !(dateMissing && f.field === "publishedAt"))
  const errors = errorsOf(findings)
  if (problems.length > 0 || errors.length > 0)
    return {
      entry,
      blocked: true,
      problems,
      findings,
      workspace,
      changes: [],
      applied: false,
    }
  const changes = changeLines(entry.text, editedText, ["status", "publishedAt"])
  const path = publicPath({ collection, data: proposed })
  if (!apply)
    return { entry, findings, changes, applied: false, workspace, proposed, path }
  await writeFile(join(root, entry.file), editedText)
  if (entry.format === "qmd") {
    try {
      await buildDocument(root, `${collectionById(collection).directory}/${entry.id}`, {
        execute: false,
      })
    } catch (error) {
      await writeFile(join(root, entry.file), entry.text)
      throw new AuthoringError([
        `The source was put back as it was: re-registering it failed: ${error.message}`,
      ])
    }
  }
  return {
    entry,
    findings,
    changes,
    applied: true,
    workspace,
    proposed,
    path,
  }
}

export const publishArticle = (root, options, previous = gitPrevious) =>
  transition(root, { ...options, from: "draft", to: "published" }, previous)
export const archiveArticle = (root, options, previous = gitPrevious) =>
  transition(root, { ...options, from: "published", to: "archived" }, previous)

// --- Preview --------------------------------------------------------------------------------------

/** Whether a URL answers, without claiming more than it did. */
export async function probe(url, timeout = 1500) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      redirect: "manual",
    })
    return { reachable: true, status: response.status }
  } catch {
    return { reachable: false, status: null }
  }
}

export async function previewInfo(
  root,
  { collection, slug, port = 4321, refresh = false },
  previous = gitPrevious,
) {
  const workspace = await loadWorkspace(root)
  const entry = findEntry(workspace, collection, slug)
  const issuesOfAll = entry.format === "qmd" ? await verify(root) : []
  let quarto = null
  let refreshed = null
  if (entry.format === "qmd") {
    quarto = await quartoStatus(root, entry, issuesOfAll)
    if (refresh && quarto.status !== "current") {
      try {
        await buildDocument(root, quarto.doc, { execute: false })
        refreshed = "rendered, nothing computed"
      } catch (error) {
        refreshed = `not refreshed: ${error.message.split("\n")[0]}`
      }
      quarto = await quartoStatus(root, entry, await verify(root))
    }
  }
  const findings = await analyze(workspace, { targets: [entry], previous })
  const usable = entry.data !== null && errorsOf(findings).length === 0
  const path = entry.data ? publicPath({ collection, data: entry.data }) : null
  // `astro dev` listens on "localhost", which may be the IPv6 or the IPv4 loopback address: the
  // first that answers is the one printed. If none does, the address Astro itself prints.
  let origin = `http://localhost:${port}`
  let server = { reachable: false, status: null }
  for (const candidate of [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    `http://[::1]:${port}`,
  ]) {
    server = await probe(`${candidate}/`)
    if (server.reachable) {
      origin = candidate
      break
    }
  }
  const page = usable && server.reachable ? await probe(`${origin}${path}`) : null
  return {
    entry,
    label: collectionById(collection).label,
    findings,
    usable,
    path,
    url: usable ? `${origin}${path}` : null,
    server,
    page,
    quarto,
    refreshed,
  }
}
