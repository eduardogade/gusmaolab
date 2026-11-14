// The CV tool (P11-A01, D-089 to D-093): the only code that opens the author's CV file.
//
//   node scripts/cv.mjs check      what the manifest selects, whether the working file can
//                                  be understood, and what an approved version would yield
//   node scripts/cv.mjs snapshot   writes src/data/cv/snapshot.ts from the version the
//                                  owner has approved in cv/manifest.json; refuses otherwise
//
// It reads the CV and never writes to it. Its output carries counts, identifiers and
// reasons: never the text of the CV. `--verbose` adds the identifiers of what was left
// out. `--root <dir>` works on another copy of the project (the tests use it).
import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { adaptCv, identityIssues } from "../src/cv/adapter.ts"
import { manifestIssues, publicationDecision } from "../src/cv/manifest.ts"
import { mergeRecords } from "../src/cv/snapshot.ts"
import {
  PRIVATE_SECTIONS,
  RECORD_LISTS,
  SECTIONS,
  authoringIssues,
  parseCvSource,
  recordsOf,
} from "../src/cv/source.ts"
import { validateRecords } from "../src/records/registry.ts"
import { FAMILY_NAMES } from "../src/records/schema.ts"

const repo = fileURLToPath(new URL("../", import.meta.url))
export const SNAPSHOT_MODULE = "src/data/cv/snapshot.ts"

export class CvToolError extends Error {
  constructor(reasons) {
    super(`The CV cannot be published:\n- ${reasons.join("\n- ")}`)
    this.name = "CvToolError"
    this.reasons = reasons
  }
}

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"))

/** The manifest and the identity map of a project, with their problems. */
export async function loadSetup(root = repo) {
  const manifest = await readJson(join(root, "cv/manifest.json"))
  const identities = await readJson(join(root, "cv/identities.json"))
  return { manifest, identities, manifestIssues: manifestIssues(manifest) }
}

/** A CV file, read and parsed; null when it is not on this machine. Never written. */
export async function readCvFile(root, file) {
  let text
  try {
    text = await readFile(join(root, "cv", file), "utf8")
  } catch (error) {
    if (error.code === "ENOENT") return null
    throw error
  }
  return {
    file,
    sha256: createHash("sha256").update(text).digest("hex"),
    source: parseCvSource(text),
  }
}

const tally = (items, keyOf) => {
  const counts = {}
  for (const item of items) counts[keyOf(item)] = (counts[keyOf(item)] ?? 0) + 1
  return counts
}

/** A reason without the names in it, so that reasons can be counted. */
const kindOf = (reason) =>
  reason
    .replace(
      /^[a-z_.]+(?:, [a-z_.]+)* (is|are) unresolved or missing$/,
      "a required field is unresolved or missing",
    )
    .replace(/the site has no project \S+:.*/, "the site has no such project")
    .replace(/\S+ is already given to another record/, "its record ID is already taken")

/**
 * What the tool can say without publishing anything. The preview is what the working
 * file would yield if it were approved as it is: a count, for the author, of how much is
 * ready. It approves nothing.
 */
export async function checkCv(root = repo, { siteProjectIds = [] } = {}) {
  const { manifest, identities, manifestIssues: problems } = await loadSetup(root)
  const report = { manifestIssues: problems, working: null, published: null }
  if (problems.length > 0)
    return { ...report, publication: { approved: false, reasons: problems } }
  if (manifest.workingFile !== null) {
    const read = await readCvFile(root, manifest.workingFile)
    if (read === null) {
      report.working = { file: manifest.workingFile, present: false }
    } else {
      const { document, version, placeholders } = read.source
      const meta = document.metadados ?? {}
      const identity = identityIssues(identities, document)
      const preview = adaptCv(document, { identities, siteProjectIds })
      report.working = {
        file: read.file,
        present: true,
        sha256: read.sha256,
        version,
        status: typeof meta.situacao === "string" ? meta.situacao : undefined,
        sourceOfTruth: meta.fonte_de_verdade === true,
        authoring: authoringIssues(read.source, read.file),
        placeholders,
        sections: {
          projected: Object.keys(document).filter((k) => SECTIONS[k] === "projected")
            .length,
          private: Object.keys(document).filter((k) => PRIVATE_SECTIONS.includes(k))
            .length,
          unknown: Object.keys(document).filter((k) => !(k in SECTIONS)).length,
        },
        lists: RECORD_LISTS.map((list) => {
          const records = recordsOf(document, list)
          return {
            key: list.key,
            records: records.length,
            identified: records.filter((r) => r.sourceId !== undefined).length,
          }
        }),
        identities: identity,
        preview: {
          projected: Object.fromEntries(
            FAMILY_NAMES.map((f) => [f, preview.records[f].length]).filter(
              ([, n]) => n > 0,
            ),
          ),
          excluded: preview.excluded.length,
          excludedBy: tally(preview.excluded, (x) => kindOf(x.reason)),
          omittedFields: preview.omitted.length,
          detail: { excluded: preview.excluded, omitted: preview.omitted },
        },
      }
    }
  }
  let facts
  if (manifest.published !== null) {
    const read = await readCvFile(root, manifest.published.file)
    report.published = { file: manifest.published.file, present: read !== null }
    if (read !== null) facts = { version: read.source.version, sha256: read.sha256 }
  }
  const publication = publicationDecision(manifest, facts)
  if (manifest.published !== null && !report.published.present)
    publication.reasons.push(`${manifest.published.file} is not on this machine`)
  return {
    ...report,
    publication: {
      approved: publication.reasons.length === 0,
      reasons: publication.reasons,
    },
  }
}

/**
 * The public snapshot of the approved version. Throws a CvToolError, with every reason,
 * unless the owner has approved a version and that exact file is here. `independent` is
 * the site's hand-written records, which the result must fit.
 */
export async function buildSnapshot(root = repo, { independent = {} } = {}) {
  const { manifest, identities, manifestIssues: problems } = await loadSetup(root)
  if (problems.length > 0) throw new CvToolError(problems)
  const first = publicationDecision(manifest)
  if (!first.approved) throw new CvToolError(first.reasons)
  const approval = manifest.published
  const read = await readCvFile(root, approval.file)
  if (read === null) throw new CvToolError([`${approval.file} is not on this machine`])
  const decision = publicationDecision(manifest, {
    version: read.source.version,
    sha256: read.sha256,
  })
  if (!decision.approved) throw new CvToolError(decision.reasons)
  const authoring = authoringIssues(read.source, read.file)
  if (authoring.errors.length > 0) throw new CvToolError(authoring.errors)
  const identity = identityIssues(identities, read.source.document)
  if (identity.errors.length > 0) throw new CvToolError(identity.errors)
  const adaptation = adaptCv(read.source.document, {
    identities,
    approval,
    siteProjectIds: (independent.projects ?? []).map((p) => p.id),
  })
  if (adaptation.profile === null)
    throw new CvToolError(adaptation.excluded.map((x) => `${x.where}: ${x.reason}`))
  const snapshot = {
    source: { file: approval.file, version: approval.version, sha256: read.sha256 },
    approvedOn: approval.approvedOn,
    ownerId: identities.owner,
    records: Object.fromEntries(
      FAMILY_NAMES.map((f) => [f, adaptation.records[f]]).filter(
        ([, list]) => list.length > 0,
      ),
    ),
    profile: adaptation.profile,
  }
  // The same two checks the site makes when it loads: nothing is written that would not load.
  const issues = validateRecords(mergeRecords(independent, snapshot))
  if (issues.length > 0) throw new CvToolError(issues)
  return { snapshot, adaptation }
}

/** The text of src/data/cv/snapshot.ts for a snapshot. */
export async function snapshotModuleText(snapshot) {
  const text = `/**
 * The public CV snapshot (P11-A01, D-092). GENERATED: never edit this file by hand.
 *
 * Written by \`npm run cv:snapshot\` from ${snapshot.source.file} (version ${snapshot.source.version}),
 * which the owner approved on ${snapshot.approvedOn}, through the adapter's allowlist
 * (src/cv/adapter.ts). The CV file itself is private and is not in this repository. To
 * change a fact, change the CV, approve a version and generate this file again.
 */
import type { CvSnapshot } from "../../cv/snapshot.ts"

export const CV_SNAPSHOT: CvSnapshot | null = ${JSON.stringify(snapshot, null, 2)}
`
  try {
    const prettier = await import("prettier")
    const config = (await prettier.resolveConfig(join(repo, SNAPSHOT_MODULE))) ?? {}
    return await prettier.format(text, { ...config, parser: "typescript" })
  } catch {
    return text
  }
}

// --- Command line -------------------------------------------------------------------------

function printCheck(report, verbose) {
  const line = (text = "") => console.log(text)
  for (const issue of report.manifestIssues) line(`cv/manifest.json: ${issue}`)
  const w = report.working
  if (w === null) line("Working file: none named in cv/manifest.json")
  else if (!w.present)
    line(`Working file: cv/${w.file} is not on this machine (it is private)`)
  else {
    line(`Working file: cv/${w.file}`)
    line(`  version ${w.version ?? "not stated"} · status: ${w.status ?? "not stated"}`)
    line(
      `  source of truth: ${w.sourceOfTruth ? "yes" : "not stated"} (this is not an approval)`,
    )
    line(`  sha256 ${w.sha256}`)
    line(
      `  sections: ${w.sections.projected} projected, ${w.sections.private} private (never read), ${w.sections.unknown} unknown`,
    )
    line(`  unresolved placeholders: ${w.placeholders} (allowed while drafting)`)
    for (const e of w.authoring.errors) line(`  ERROR ${e}`)
    for (const x of w.authoring.warnings) line(`  note: ${x}`)
    for (const e of w.identities.errors) line(`  ERROR cv/identities.json: ${e}`)
    if (w.identities.stale.length > 0)
      line(
        `  note: ${w.identities.stale.length} identities name no record of this file`,
      )
    const records = w.lists.reduce((n, l) => n + l.records, 0)
    line(
      `  records: ${records} in ${w.lists.filter((l) => l.records > 0).length} lists`,
    )
    const projected = Object.entries(w.preview.projected)
    line(
      `  if approved as it is: ${projected.length === 0 ? "no record" : projected.map(([f, n]) => `${n} ${f}`).join(", ")} would be projected`,
    )
    for (const [reason, n] of Object.entries(w.preview.excludedBy))
      line(`    ${n} left out: ${reason}`)
    line(`    ${w.preview.omittedFields} fields left out of kept records`)
    if (verbose) {
      for (const x of w.preview.detail.excluded) line(`    - ${x.where}: ${x.reason}`)
      for (const x of w.preview.detail.omitted) line(`    · ${x.where} ${x.reason}`)
    }
  }
  line()
  if (report.publication.approved)
    line("Publication: approved. `npm run cv:snapshot` may be run.")
  else {
    line("Publication: NOT approved. No CV data reaches the site.")
    for (const reason of report.publication.reasons) line(`  - ${reason}`)
  }
}

async function main(argv) {
  const [command = "check", ...rest] = argv
  const rootAt = rest.indexOf("--root")
  const root = rootAt === -1 ? repo : rest[rootAt + 1]
  const { INDEPENDENT_RECORDS: independent } = await import(
    "../src/data/records/independent.ts"
  )
  if (command === "check") {
    const report = await checkCv(root, {
      siteProjectIds: (independent.projects ?? []).map((p) => p.id),
    })
    printCheck(report, rest.includes("--verbose"))
    const failed =
      report.manifestIssues.length > 0 ||
      (report.working?.authoring?.errors.length ?? 0) > 0 ||
      (report.working?.identities?.errors.length ?? 0) > 0
    return failed ? 1 : 0
  }
  if (command === "snapshot") {
    try {
      const { snapshot, adaptation } = await buildSnapshot(root, { independent })
      await writeFile(join(root, SNAPSHOT_MODULE), await snapshotModuleText(snapshot))
      const counts = Object.entries(snapshot.records).map(
        ([f, list]) => `${list.length} ${f}`,
      )
      console.log(
        `Wrote ${SNAPSHOT_MODULE} from cv/${snapshot.source.file}: ${counts.join(", ")}.`,
      )
      console.log(
        `${adaptation.excluded.length} records and ${adaptation.omitted.length} fields were left out (see \`npm run cv:check -- --verbose\`).`,
      )
      console.log("Read the diff of that file before committing it: it is public.")
      return 0
    } catch (error) {
      if (!(error instanceof CvToolError)) throw error
      console.error(error.message)
      console.error(`${SNAPSHOT_MODULE} was not changed.`)
      return 1
    }
  }
  console.error(
    "Usage: node scripts/cv.mjs check [--verbose] | snapshot   [--root <dir>]",
  )
  return 2
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2))
}
