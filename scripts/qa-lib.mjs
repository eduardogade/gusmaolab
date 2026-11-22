// The vocabulary of the quality system (P22, D-151): what a result can be, how test output is read, and
// when a run fails. Pure functions; no file or process access, so tests/qa.mjs can exercise every rule.
//
// The six states are not interchangeable, and none is ever converted into another to make a run green:
//
//   PASS      executed, and no defect was detected
//   FAIL      executed, and a defect was detected
//   SKIPPED   not applicable to this run (a profile leaves the stage out, or a tool the check needs,
//             such as Quarto, is not installed): reported, never counted as a pass
//   DEFERRED  intentionally pending an external dependency or a future approved action, on the
//             register below; visible in every report, never a pass, never a failure
//   NOT RUN   expected and not executed (the process crashed, the browser was missing, a check the
//             suite should have printed is absent): a mandatory NOT RUN fails the run
//   FLAKY     failed and then passed on a retry, or is under investigation: evidence of instability,
//             kept apart from PASS; unregistered FLAKY fails the run

export const STATUSES = ["PASS", "FAIL", "SKIPPED", "DEFERRED", "NOT RUN", "FLAKY"]

/**
 * The approved deferrals: provider-dependent scheduling checks the owner chose not to run yet
 * (P21, D-145 to D-150; P22 owner decision). Only these identifiers may be DEFERRED. A BLOCKED line
 * from any other check is NOT RUN, so an approved deferral cannot hide an unrelated regression.
 * Removing the owner's attestation gate or enabling scheduling is a P21 matter, never done here.
 */
export const DEFERRALS = Object.freeze(
  Object.fromEntries(
    [
      ["SCH-013B", "The provider's monthly view loads and shows real availability"],
      ["SCH-014", "The booking interface works within the Schedule layout (live provider)"],
      ["SCH-015B", "The configured booking link opens a real, working provider page"],
      ["SCH-021", "Available slots are provider-authoritative"],
      ["SCH-022", "Past dates are unavailable (provider)"],
      ["SCH-023", "Calendar conflicts are respected"],
      ["SCH-024", "Pending bookings follow the configured slot-hold policy"],
      ["SCH-025", "Booker email verification is enforced"],
      ["SCH-026", "An unverified request cannot bypass verification"],
      ["SCH-027", "New requests enter the pending state"],
      ["SCH-028", "Pending requests do not appear falsely confirmed (provider)"],
      ["SCH-029", "The owner receives the request notification"],
      ["SCH-030", "The owner can approve a request"],
      ["SCH-031", "The owner can reject a request"],
      ["SCH-032", "The visitor receives an approval notification"],
      ["SCH-033", "The visitor receives a rejection notification"],
      ["SCH-034", "Accepted bookings appear in the connected calendar"],
      ["SCH-035", "Confirmed slots cannot be double-booked"],
      ["SCH-042", "The provider offers no past slots (provider behaviour)"],
    ].map(([id, title]) => [
      id,
      {
        title,
        reason: "EXTERNAL ACTIVATION PENDING: the owner has no Cal.com account or booking link yet and chose not to activate scheduling",
        decision: "owner decision recorded at P22; P21 D-145 to D-150",
        reactivate: "after the owner configures the account (development/scheduling-guide.md, 'Testing safely')",
      },
    ]),
  ),
)

/**
 * Checks known to be unstable, with the investigation that explains them. A suite that fails and then
 * passes on a retry is FLAKY; if its check is registered here the run still exits 0 but the report
 * says FLAKY in full, and an unregistered one fails the run: instability is investigated, not hidden.
 * Empty on purpose until an investigation has a conclusion that is not "fixed".
 */
export const KNOWN_FLAKY = Object.freeze({})

const ANSI = /\u001b\[[0-9;]*m/g
export const stripAnsi = (text) => text.replace(ANSI, "")

const LINE = /^(PASS|FAIL|SKIPPED|SKIP|BLOCKED|NOT RUN)\s+([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+)\b\s*(.*)$/

/**
 * Reads a suite's output into checks. A line is `STATUS ID title`; the indented `- reason` lines that
 * follow a FAIL belong to it. Summary lines (`PASS: 12 checks`, `FAIL: ...`) are not checks. Output
 * from browser tests prints the same shape, so one reader serves every suite.
 */
export function parseChecks(text) {
  const checks = []
  let last
  for (const raw of stripAnsi(text).split("\n")) {
    const match = LINE.exec(raw)
    if (match) {
      const [, word, id, rest] = match
      const status = word === "BLOCKED" ? "BLOCKED" : word === "SKIP" || word === "SKIPPED" ? "SKIPPED" : word
      last = { id, title: rest.trim(), status, reasons: [] }
      checks.push(last)
    } else if (last && last.status === "FAIL" && /^\s+- /.test(raw)) {
      last.reasons.push(raw.replace(/^\s+- /, "").trim())
    } else if (!/^\s+- /.test(raw)) last = undefined
  }
  return checks
}

/** A parsed check as a report check, applying the deferral register: BLOCKED is DEFERRED only if approved. */
export function classify(check) {
  if (check.status === "BLOCKED") {
    const deferral = DEFERRALS[check.id]
    return deferral
      ? { ...check, status: "DEFERRED", reasons: [deferral.reason] }
      : { ...check, status: "NOT RUN", reasons: [`${check.id} reported BLOCKED but is not on the approved deferral register`] }
  }
  if (check.status === "NOT RUN") return { ...check, status: "NOT RUN" }
  return check
}

export const emptyCounts = () => ({ PASS: 0, FAIL: 0, SKIPPED: 0, DEFERRED: 0, "NOT RUN": 0, FLAKY: 0 })

export function countStatuses(items) {
  const counts = emptyCounts()
  for (const item of items) counts[item.status] += 1
  return counts
}

/**
 * The status of one suite run (or a function stage) from its exit code, its parsed checks and any
 * earlier attempts. `attempts` is a list of `{ exit, checks }`, first attempt first.
 *
 * Exit 0 with a FAIL line is still FAIL; exit 2 is the browser tests' NOT RUN convention; a crash
 * without a single check line is FAIL (it ran and broke), never PASS. A first attempt that failed
 * and a later one that passed (or any mixture of passes and failures) is FLAKY, with the failing checks kept as evidence.
 */
export function suiteStatus(attempts, { known = KNOWN_FLAKY } = {}) {
  const verdict = (attempt) => {
    const checks = attempt.checks.map(classify)
    if (attempt.exit === 2) return "NOT RUN"
    if (attempt.exit !== 0 || checks.some((c) => c.status === "FAIL")) return "FAIL"
    if (checks.some((c) => c.status === "NOT RUN")) return "NOT RUN"
    return "PASS"
  }
  const verdicts = attempts.map(verdict)
  const final = verdicts.at(-1)
  // Any mixture of a pass and a failure is instability, whatever the order: it is FLAKY, never PASS.
  if (verdicts.includes("PASS") && verdicts.some((v) => v !== "PASS")) {
    const first = attempts[verdicts.findIndex((v) => v !== "PASS")]
    const failed = first.checks.filter((c) => c.status === "FAIL").map((c) => c.id)
    return { status: "FLAKY", firstFailures: failed, registered: failed.length > 0 && failed.every((id) => id in known) }
  }
  return { status: final, firstFailures: [], registered: false }
}

/** Whether a stage's status fails the run. `mandatory` stages must PASS (or be SKIPPED/DEFERRED by policy). */
export function stageFails(stage) {
  if (!stage.mandatory) return false
  if (stage.status === "FAIL" || stage.status === "NOT RUN") return true
  if (stage.status === "FLAKY") return stage.registered !== true
  return false
}

/**
 * The run's verdict. FAIL if a mandatory stage failed, did not run, or was unregistered-flaky. A run
 * that skipped stages by profile is PASS but `partial`: the report says which stages it left out.
 */
export function verdict(stages) {
  const failing = stages.filter(stageFails)
  const counts = countStatuses(stages)
  const partial = stages.some((s) => s.status === "SKIPPED" && s.profileExcluded === true)
  return {
    status: failing.length > 0 ? "FAIL" : "PASS",
    exit: failing.length > 0 ? 1 : 0,
    partial,
    failing: failing.map((s) => s.id),
    counts,
  }
}

/** Environment facts safe to publish: versions and the platform, never paths or user names. */
export function environmentSummary({ node, npm, platform, arch, cpu, chrome, ci, axe }) {
  return { node, npm, platform, arch, cpu, chrome: chrome ?? null, axe: axe ?? null, ci: Boolean(ci) }
}

/** Removes what a report must not carry: home directories, temporary folders, long absolute paths. */
export function redact(text, root) {
  let out = String(text)
  if (root) out = out.split(root.replace(/\/$/, "")).join("<repo>")
  return out
    .replace(/\/Users\/[^/\s]+/g, "/Users/<user>")
    .replace(/\/home\/[^/\s]+/g, "/home/<user>")
    .replace(/\/private\/var\/folders\/[^\s]+/g, "<tmp>")
    .replace(/\/var\/folders\/[^\s]+/g, "<tmp>")
}

export const REPORT_SCHEMA = "gusmaolab-qa-report/1"
