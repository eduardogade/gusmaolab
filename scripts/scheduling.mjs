// `npm run scheduling:check` (P21, D-146): says, for a maintainer, what the scheduling configuration is
// and what is known about the owner's future availability file. It changes nothing, calls no network
// service, never prints the file's content and never prints a path that is not already in the data file.
//
// What it is not: a synchroniser. There is no adapter for the owner's availability format yet (the
// file has not been supplied), so nothing is read, planned or applied; `planSync` says so, and so does
// this command. The provider stays the only authority on what can be booked.
import { existsSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { SCHEDULING_CONFIG } from "../src/data/scheduling.ts"
import { parseSourceReference, describeSource, planSync } from "../src/scheduling/availability.ts"
import { publicScheduling, validateScheduling } from "../src/scheduling/config.ts"

const ROOT = fileURLToPath(new URL("../", import.meta.url))

/** What this machine has for a configured source reference: a probe for `describeSource`. */
export function probeSource(reference, { root = ROOT, env = process.env } = {}) {
  if (reference === undefined) return undefined
  const parsed = parseSourceReference(reference)
  if (parsed.kind === "env") {
    const value = env[parsed.name]
    if (value === undefined || value === "") return { variableSet: false, fileExists: false }
    const file = resolve(value)
    return { variableSet: true, fileExists: existsSync(file) && statSync(file).isFile() }
  }
  const file = join(root, parsed.path)
  return { fileExists: existsSync(file) && statSync(file).isFile() }
}

/** The report, as lines, for a configuration. Exported for the tests. */
export function report(config = SCHEDULING_CONFIG, options = {}) {
  const issues = validateScheduling(config)
  const lines = []
  if (issues.length > 0) {
    lines.push("INVALID scheduling configuration:")
    for (const issue of issues) lines.push(`  - ${issue}`)
    return { ok: false, lines }
  }
  const view = publicScheduling(config)
  lines.push(`provider:            ${config.provider}`)
  lines.push(`state:               ${view.state}`)
  lines.push(`owner time zone:     ${config.ownerTimeZone}`)
  lines.push(`booking link:        ${config.bookingUrl === undefined ? "not configured" : "configured"}`)
  const source = describeSource(config.availabilitySourcePath, probeSource(config.availabilitySourcePath, options))
  lines.push(`availability source: ${source.status}`)
  lines.push(`                     ${source.message}`)
  lines.push(`synchronisation:     ${planSync(undefined).reason}`)
  if (view.state !== "ready")
    lines.push("The Schedule page shows its preparation notice: no times, no form, no booking button.")
  return { ok: true, lines }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { ok, lines } = report()
  console.log(lines.join("\n"))
  process.exit(ok ? 0 : 1)
}
