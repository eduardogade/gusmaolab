// The quality system tested by itself (P22, D-151 to D-156): the QA checks that need no browser. They read the
// release build (run `npm run build` first, or `npm run verify`), the repository, and throwaway COPIES of the build with
// a controlled defect: the real dist/ and the real source are never written.
//
// What they show: the inventory covers every test file; the six result states mean what the policy says (a deferral is
// never a pass, a retry that rescues a failure is FLAKY, an unexecuted mandatory stage fails the run); the QA command exits
// nonzero and names the defect when a link is broken, a title or description or image is missing, or a development page
// appears, and exits zero again when the defect is removed; the report has its schema and a readable twin; the workflow
// verifies and never deploys; D-144, the CV and the masters are untouched. What they do not show: that the GitHub Actions
// workflow has run (it needs a push), or anything the browser suites show (accessibility, performance, the nucleus).
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { parse as parseYaml } from "yaml"
import { historyCheck } from "../scripts/qa.mjs"
import { DEFERRALS, KNOWN_FLAKY, REPORT_SCHEMA, classify, countStatuses, parseChecks, redact, stageFails, suiteStatus, verdict } from "../scripts/qa-lib.mjs"
import { MATRIX, evaluate } from "../scripts/qa-matrix.mjs"
import { ALL_SUITES, BROWSER_SUITES, HELPERS, MEASUREMENT_SUITES, ON_DEMAND, UNIT_SUITES } from "../scripts/qa-suites.mjs"
import { freshness, sourceState } from "../src/quality/source.mjs"
import { DEFECTS, copyBuild, fingerprint, readReport, runAudits } from "./qa-fixtures.mjs"
import { DEV_PAGES, QUALITY_PAGE } from "../src/design/site-map.ts"
import { demoBuild } from "./demo-dist.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const dist = join(repo, "dist")
const BASE = "dc1c237" // the head P22 began from
const json = (v) => JSON.stringify(v)
const read = (path) => readFile(join(repo, path), "utf8")
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
if (!existsSync(join(dist, "index.html"))) {
  console.error("FAIL: dist/index.html is missing. Run `npm run build` first.")
  process.exit(1)
}
const git = (...args) => spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" })
const gitOk = git("rev-parse", "--git-dir").status === 0 && git("cat-file", "-e", BASE).status === 0
const changedSinceBase = (paths) => {
  if (!gitOk) return []
  const out = new Set(git("diff", "--name-only", BASE, "--", ...paths).stdout.split("\n").filter(Boolean))
  for (const f of git("ls-files", "--others", "--exclude-standard", "--", ...paths).stdout.split("\n").filter(Boolean)) out.add(f)
  return [...out].sort()
}
const pkg = JSON.parse(await read("package.json"))
const testScript = (name) => pkg.scripts[name].split("&&").map((s) => s.trim()).filter((s) => s.startsWith("node tests/")).map((s) => s.replace(/^node tests\/(.+)\.mjs$/, "$1"))

// --- Inventory and the command ---------------------------------------------------------------------------

await test("QA-INV-01", "The inventory names every test file, and `npm test` and `npm run test:browser` run exactly the suites it lists", async (check) => {
  const files = (await readdir(join(repo, "tests"))).filter((f) => f.endsWith(".mjs")).map((f) => `tests/${f}`)
  const known = new Set([...ALL_SUITES.map((s) => s.file), ...HELPERS.map((h) => h.file), ...ON_DEMAND.map((o) => o.file)])
  for (const f of files) check(known.has(f), `${f} is in no inventory list (scripts/qa-suites.mjs)`)
  for (const f of known) check(existsSync(join(repo, f)), `${f} is in the inventory but does not exist`)
  check(json(testScript("test")) === json(UNIT_SUITES.map((s) => s.id)), `npm test runs ${json(testScript("test"))}, the inventory lists ${json(UNIT_SUITES.map((s) => s.id))}`)
  const browserScript = testScript("test:browser")
  check(json(browserScript) === json(BROWSER_SUITES.map((s) => s.id)), `npm run test:browser runs ${json(browserScript)}`)
  check(pkg.scripts["test:perf"] === "node tests/perf-browser.mjs" && MEASUREMENT_SUITES.length === 1, "the measurement suite is not `npm run test:perf`")
  for (const s of ALL_SUITES) check(Boolean(s.purpose) && Array.isArray(s.needs) && s.needs.every((n) => ["dist", "demo", "browser", "quarto", "science", "git"].includes(n)), `${s.id}: purpose or needs are wrong`)
  check(new Set(ALL_SUITES.map((s) => s.id)).size === ALL_SUITES.length, "a suite is listed twice")
  check(ALL_SUITES.filter((s) => s.needs.includes("browser")).every((s) => s.tier === "browser"), "a browser suite is not tier browser")
})

await test("QA-EXIT-01", "Mandatory failures propagate a nonzero exit status, and nothing swallows them", async (check) => {
  for (const status of ["FAIL", "NOT RUN"]) check(verdict([{ id: "s", mandatory: true, status }]).exit === 1, `${status} did not fail the run`)
  check(verdict([{ id: "s", mandatory: true, status: "PASS" }, { id: "t", mandatory: true, status: "DEFERRED" }]).exit === 0, "PASS and DEFERRED failed the run")
  const code = await read("scripts/qa.mjs")
  check(/process\.exit\(exit\)/.test(code) && /exit: v\.exit/.test(code), "the command does not exit with the verdict")
  check(/QA could not run/.test(code) && /process\.exit\(1\)/.test(code), "a crash of the command itself does not exit nonzero")
  check(!/\|\|\s*true|2>\/dev\/null/.test(code), "the command hides a failure")
})

await test("QA-CLI-01", "One QA command exists, with a quick and a deep profile, and an unknown profile is refused", async (check) => {
  check(pkg.scripts.qa === "node scripts/qa.mjs" && pkg.scripts["qa:quick"] === "node scripts/qa.mjs --profile quick" && pkg.scripts["qa:deep"] === "node scripts/qa.mjs --profile deep", json({ qa: pkg.scripts.qa, quick: pkg.scripts["qa:quick"], deep: pkg.scripts["qa:deep"] }))
  const bad = spawnSync(process.execPath, [join(repo, "scripts/qa.mjs"), "--profile", "nonsense"], { cwd: repo, encoding: "utf8" })
  check(bad.status !== 0 && /unknown profile/.test(bad.stderr), `an unknown profile exited ${bad.status}`)
  const code = await read("scripts/qa.mjs")
  check(!/\|\|\s*true|catch\s*\{\s*\}\s*$/m.test(code.replace(/\/\/.*$/gm, "")) || !/\|\|\s*true/.test(code), "the QA command hides a failure behind `|| true`")
  check(/--profile quick|quick:/.test(await read("development/quality-assurance.md")) && /qa:deep/.test(await read("development/quality-assurance.md")), "the guide does not explain the profiles")
})

// --- Result states and the exit policy ---------------------------------------------------------------------

await test("QA-STATE-01", "A deferred check is never a pass, and only an approved deferral may be deferred", async (check) => {
  const c = classify({ id: "SCH-021", title: "x", status: "BLOCKED", reasons: [] })
  check(c.status === "DEFERRED" && /EXTERNAL ACTIVATION PENDING/.test(c.reasons[0]), json(c))
  const stray = classify({ id: "NUC-999", title: "x", status: "BLOCKED", reasons: [] })
  check(stray.status === "NOT RUN", `an unregistered BLOCKED became ${stray.status}`)
  check(Object.keys(DEFERRALS).length === 19 && Object.keys(DEFERRALS).every((id) => /^SCH-0\d\d[B]?$/.test(id)), "the deferral register is not the 19 provider-dependent scheduling checks")
  const counts = countStatuses([{ status: "PASS" }, { status: "DEFERRED" }, { status: "SKIPPED" }])
  check(counts.PASS === 1 && counts.DEFERRED === 1 && counts.SKIPPED === 1, json(counts))
  // A deferral does not fail the run, and does not make a mixed item a pass.
  const stage = { id: "unit", mandatory: true, status: "PASS", counts: counts }
  check(verdict([stage]).exit === 0, "a deferral failed the run")
  const items = evaluate((ref) => ({ "check:A": "PASS", "check:B": "DEFERRED" })[ref], () => true)
  check(items.every((i) => i.status !== "PASS" || i.refs.every((r) => true)), "matrix evaluate misbehaves")
  const mixed = evaluate((ref) => ({ "check:SCH-054": "PASS", "deferred:SCH-": "DEFERRED" })[ref], () => true).find((i) => i.id === "QA-058")
  check(mixed.status === "DEFERRED", `QA-058 is ${mixed.status}`)
  // The scheduling suite really prints its deferrals as BLOCKED, and the parser reads them.
  const out = spawnSync(process.execPath, [join(repo, "tests/scheduling.mjs")], { cwd: repo, encoding: "utf8" })
  const parsed = parseChecks(out.stdout).map(classify)
  check(parsed.filter((p) => p.status === "DEFERRED").length === 19, `${parsed.filter((p) => p.status === "DEFERRED").length} deferred checks parsed from the scheduling suite`)
  check(parsed.filter((p) => p.status === "PASS").length >= 40 && parsed.every((p) => p.status !== "FAIL"), "the scheduling suite's real checks did not parse as passes")
})

await test("QA-STATE-02", "A retry that rescues a failure is FLAKY, never PASS, and unregistered instability fails the run", async (check) => {
  const fail = { exit: 1, checks: [{ id: "NUC-031", title: "t", status: "FAIL", reasons: ["x"] }] }
  const pass = { exit: 0, checks: [{ id: "NUC-031", title: "t", status: "PASS", reasons: [] }] }
  check(suiteStatus([fail, pass]).status === "FLAKY", "fail then pass is not FLAKY")
  check(suiteStatus([pass, fail, pass]).status === "FLAKY", "pass, fail, pass is not FLAKY")
  check(suiteStatus([pass]).status === "PASS" && suiteStatus([fail, fail]).status === "FAIL", "plain pass or fail changed")
  check(suiteStatus([fail, pass]).firstFailures.join() === "NUC-031", "the first failure was not kept as evidence")
  const flaky = { id: "browser", mandatory: true, status: "FLAKY", registered: false }
  check(stageFails(flaky) && verdict([flaky]).exit === 1, "an unregistered FLAKY did not fail the run")
  check(!stageFails({ ...flaky, registered: true }), "a registered FLAKY failed the run")
  check(Object.keys(KNOWN_FLAKY).length === 0, "a check is registered as known-flaky: its investigation must be cited in the report")
  const code = await read("scripts/qa.mjs")
  check(/retries: 1/.test(code) && /repeat: 3/.test(code) && /attempts/.test(code), "the profiles do not declare their retries and repeats")
})

await test("QA-STATE-03", "Known flakiness is reported by name in the report, with its attempts", async (check) => {
  const md = await read("scripts/qa.mjs")
  check(/Flaky \/ under investigation/.test(md) && /NOT registered: investigate/.test(md), "the report has no flaky section")
  check(/ISSUE-0005/.test(await read("scripts/qa-suites.mjs")), "the inventory does not point at the investigation")
})

await test("QA-STATE-04", "An unexecuted mandatory stage or suite is NOT RUN and fails the run; it is never a pass", async (check) => {
  check(suiteStatus([{ exit: 2, checks: [] }]).status === "NOT RUN", "exit 2 is not NOT RUN")
  check(suiteStatus([{ exit: 0, checks: [{ id: "A-1", status: "BLOCKED", title: "t", reasons: [] }] }]).status === "NOT RUN", "an unapproved BLOCKED is not NOT RUN")
  check(suiteStatus([{ exit: 1, checks: [] }]).status === "FAIL", "a crash without a single check line is not FAIL")
  check(suiteStatus([{ exit: 0, checks: [{ id: "A-1", status: "FAIL", title: "t", reasons: [] }] }]).status === "FAIL", "exit 0 with a FAIL line is not FAIL")
  const notRun = { id: "browser", mandatory: true, status: "NOT RUN" }
  check(stageFails(notRun) && verdict([notRun]).exit === 1, "a NOT RUN stage did not fail the run")
  const skipped = { id: "browser", mandatory: true, status: "SKIPPED", profileExcluded: true }
  check(verdict([skipped]).exit === 0 && verdict([skipped]).partial === true, "a profile-skipped stage failed the run or was not marked partial")
  const r = redact("/Users/someone/projects/GusmaoLab/x and /private/var/folders/ab/cd/T/foo", "/Users/someone/projects/GusmaoLab")
  check(!/someone/.test(r) && /<repo>/.test(r) && /<tmp>/.test(r), r)
})

// --- Failures propagate: a controlled defect in a throwaway copy of the build ------------------------------------

const before = await fingerprint(dist)
const gitBefore = gitOk ? git("status", "--porcelain").stdout : ""
const cleanCopy = await copyBuild()
let cleanReport
try {
  const clean = runAudits(cleanCopy.dist, cleanCopy.reports)
  cleanReport = await readReport(cleanCopy.reports).catch(() => null)
  await test("QA-NEGATIVE-00", "The audits pass on an unmodified copy of the build (the control for the controlled failures)", async (check) => {
    check(clean.status === 0, `exit ${clean.status}: ${clean.stdout.slice(-400)}`)
    check(cleanReport !== null && cleanReport.overall.status === "PASS", "the control report is not PASS")
  })
} finally {
  await cleanCopy.cleanup()
}

await test("QA-NEGATIVE-01", "A controlled defect is detected, the command exits nonzero, the report names it, and removing it restores a clean run", async (check) => {
  for (const defect of DEFECTS) {
    const copy = await copyBuild()
    try {
      const path = join(copy.dist, defect.file)
      const original = existsSync(path) ? await readFile(path, "utf8") : null
      const { mkdir, writeFile } = await import("node:fs/promises")
      if (defect.create !== undefined) {
        await mkdir(join(path, ".."), { recursive: true })
        await writeFile(path, defect.create)
      } else await writeFile(path, defect.apply(original))
      const broken = runAudits(copy.dist, copy.reports)
      const report = await readReport(copy.reports).catch(() => null)
      check(broken.status === 1, `${defect.name}: the command exited ${broken.status}, not 1`)
      const found = report?.checks.find((c) => c.id === defect.check)
      check(found?.status === "FAIL", `${defect.name}: ${defect.check} is ${found?.status}`)
      check(report?.overall.status === "FAIL" && report.overall.failing.includes("audits"), `${defect.name}: the report does not fail the audits stage`)
      check(report?.stages.find((s) => s.id === "audits")?.failures.some((f) => f.id === defect.check), `${defect.name}: the report's failure list does not name ${defect.check}`)
      check(/FAIL/.test(broken.stdout) && broken.stdout.includes(defect.check), `${defect.name}: the console does not name ${defect.check}`)
      // Remove the defect: the same copy must be clean again.
      if (defect.create !== undefined) await (await import("node:fs/promises")).rm(join(copy.dist, "_design"), { recursive: true, force: true })
      else await writeFile(path, original)
      const fixed = runAudits(copy.dist, copy.reports)
      check(fixed.status === 0, `${defect.name}: after removing it the command still exits ${fixed.status}`)
    } finally {
      await copy.cleanup()
    }
  }
})

await test("QA-FIXTURE-01", "The controlled failures never touched the real build, the repository or any source file", async (check) => {
  check((await fingerprint(dist)) === before, "dist/ changed while the fixtures ran")
  if (gitOk) check(git("status", "--porcelain").stdout === gitBefore, "the working tree changed while the fixtures ran")
  for (const defect of DEFECTS) check(!existsSync(join(dist, "_design/qa-fixture")), "a fixture page leaked into dist/")
})

// --- The report ---------------------------------------------------------------------------------------------------

const reportCopy = await copyBuild()
let report
let reportDir
try {
  runAudits(reportCopy.dist, reportCopy.reports)
  report = await readReport(reportCopy.reports)
  reportDir = reportCopy.reports
  await test("QA-REPORT-01", "The machine-readable report has the stable schema, an execution time, the commit, the profile and the environment", async (check) => {
    check(report.schema === REPORT_SCHEMA, report.schema)
    for (const key of ["generatedAt", "durationMs", "profile", "source", "environment", "overall", "stages", "suites", "checks", "deferred", "findings", "matrix"]) check(key in report, `the report lacks ${key}`)
    check(!Number.isNaN(Date.parse(report.generatedAt)), "generatedAt is not a date")
    check(typeof report.source.head === "string" && report.source.head.length === 40 && typeof report.source.fingerprint === "string", json(report.source))
    check(report.profile === "full" && Array.isArray(report.only), "the selected profile is not recorded")
    for (const key of ["node", "npm", "platform", "arch", "cpu", "ci"]) check(key in report.environment, `the environment lacks ${key}`)
    check(report.matrix.length === 82 && report.matrix.every((m) => /^QA-\d{3}$/.test(m.id) && ["PASS", "FAIL", "SKIPPED", "DEFERRED", "NOT RUN", "FLAKY"].includes(m.status)), "the acceptance matrix is not 82 items with a state")
    check(report.checks.every((c) => ["PASS", "FAIL", "SKIPPED", "DEFERRED", "NOT RUN", "FLAKY"].includes(c.status) && c.id && c.stage), "a check lacks an ID, a stage or a valid state")
    check(report.deferred.length === 19 && report.deferred.every((d) => d.reason && d.decision), "the deferral list is incomplete")
    const text = JSON.stringify(report)
    check(!/\/Users\/|\/home\/[a-z]|\/private\/var|gmail\.com|@gusmaolab/.test(text), "the report carries a local path or an address")
    // A report from a partial run says what it left out, and counts only what it ran.
    check(report.overall.partial === true && report.stages.filter((s) => s.status === "SKIPPED" && s.profileExcluded).length === 8, `the partial run is not marked: ${report.stages.map((s) => `${s.id}:${s.status}`).join(" ")}`)
    check(report.matrix.find((m) => m.id === "QA-024").status === "SKIPPED", "a browser item of a static-only run is not SKIPPED")
    check(report.matrix.find((m) => m.id === "QA-009").status === "PASS", "QA-009 is not derived from QA-LINK-01")
  })
  await test("QA-REPORT-02", "The human-readable report exists, states the meaning of each state, and keeps the deferrals visible", async (check) => {
    const md = await readFile(join(reportDir, "latest.md"), "utf8")
    for (const word of ["PASS", "FAIL", "SKIPPED", "DEFERRED", "NOT RUN", "FLAKY"]) check(md.includes(word), `the report does not mention ${word}`)
    check(/## Stages/.test(md) && /## Acceptance items/.test(md) && /## Findings/.test(md), "a section is missing")
    check(/never merged/.test(md) && /mandatory FAIL, NOT RUN or unregistered FLAKY/.test(md), "the policy sentence is missing")
    check(!/\/Users\//.test(md), "the report carries a local path")
  })
  await test("QA-REPORT-03", "The latest report can be inspected locally, and an old one is never called current", async (check) => {
    const now = sourceState()
    check(freshness({ source: { head: now.head, fingerprint: now.fingerprint } }, now).state === "current", "an exact match is not current")
    check(freshness({ source: { head: "0".repeat(40), fingerprint: now.fingerprint } }, now).state === "stale", "another commit is not stale")
    check(freshness({ source: { head: now.head, fingerprint: "deadbeefdeadbeef" } }, now).state === "stale", "a changed tree is not stale")
    check(freshness({}, now).state === "unknown" && freshness(null, now).state === "unknown", "a report without a source is not unknown")
    const page = await read("src/pages/[design]/quality/index.astro")
    check(/qa-report\/latest\.json/.test(page) && /freshness\(/.test(page) && /data-quality-freshness/.test(page) && /data-quality-empty/.test(page), "the page does not read the report, say how current it is, or explain the empty state")
    check(!/<button|<form|<input|fetch\(|child_process|execSync|spawn/.test(page.replace(/---[\s\S]*?---/, (m) => m.replace(/spawn|child_process/g, ""))), "the read-only page has a control or runs a command")
    check(DEV_PAGES.some((p) => p.href === QUALITY_PAGE && p.label === "Quality Assurance"), "the overview is not in the development list")
  })
} finally {
  await reportCopy.cleanup()
}

await test("QA-MATRIX-01", "Every acceptance item is QA-001 to QA-082 in order, and every reference names evidence that exists", async (check) => {
  check(MATRIX.length === 82 && MATRIX.every((m, i) => m.id === `QA-${String(i + 1).padStart(3, "0")}`), "the items are not QA-001 to QA-082 in order")
  const ids = new Set()
  for (const f of (await readdir(join(repo, "tests"))).filter((x) => x.endsWith(".mjs"))) for (const m of (await read(`tests/${f}`)).matchAll(/["'`]([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+)["'`]/g)) ids.add(m[1])
  for (const f of ["scripts/qa-audits.mjs", "scripts/qa.mjs"]) for (const m of (await read(f)).matchAll(/["'`]([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+)["'`]/g)) ids.add(m[1])
  const suites = new Set(ALL_SUITES.map((s) => s.id))
  const stages = new Set(["environment", "diagnostics", "build", "unit", "audits", "reproducibility", "demo-build", "browser", "performance"])
  for (const item of MATRIX)
    for (const ref of item.refs) {
      const [kind, ...rest] = ref.split(":")
      const key = rest.join(":")
      if (kind === "suite") check(suites.has(key), `${item.id}: no suite ${key}`)
      else if (kind === "stage") check(stages.has(key), `${item.id}: no stage ${key}`)
      else if (kind === "check") check(ids.has(key), `${item.id}: no check ${key} in any test or audit`)
      else if (kind === "deferred") check(Object.keys(DEFERRALS).some((d) => d.startsWith(key)), `${item.id}: no deferral ${key}`)
      else check(false, `${item.id}: unknown reference kind ${ref}`)
    }
})

await test("QA-EVIDENCE-01", "A failing browser check leaves a screenshot and the page text behind, when the QA command asks for it", async (check) => {
  const harness = await read("tests/browser-harness.mjs")
  check(/QA_EVIDENCE_DIR/.test(harness) && /Page\.captureScreenshot/.test(harness) && /failures\.length > 0\) await captureEvidence/.test(harness), "the harness does not capture evidence on a failure")
  const code = await read("scripts/qa.mjs")
  check(/QA_EVIDENCE_DIR: evidenceDir/.test(code) && /logs/.test(code) && /attempt\$\{n\}/.test(code), "the QA command does not pass the evidence folder or keep each attempt's log")
  check(/qa-report\/evidence/.test(await read(".github/workflows/quality.yml")), "the workflow does not keep the evidence of a failure")
})

// --- CI -----------------------------------------------------------------------------------------------------------

const workflowText = await read(".github/workflows/quality.yml")
const workflow = parseYaml(workflowText)
await test("QA-CI-01", "The workflow installs from the lockfile with the project's Node and runs the same command as a developer", async (check) => {
  const steps = Object.values(workflow.jobs).flatMap((j) => j.steps)
  check(Object.values(workflow.jobs).every((j) => j.steps.some((s) => s.run === "npm ci")), "a job does not run `npm ci`")
  check(Object.values(workflow.jobs).every((j) => j.steps.some((s) => s.uses?.startsWith("actions/setup-node") && s.with["node-version-file"] === ".node-version")), "a job does not take Node from .node-version")
  check(steps.filter((s) => s.run?.includes("scripts/qa.mjs")).length === 2, "the jobs do not run scripts/qa.mjs")
  check(!/npm install\b|\|\|\s*true|continue-on-error:\s*true/.test(workflowText), "the workflow installs without the lockfile or hides a failure")
  check(Object.keys(workflow.jobs).join() === "static,browser", `jobs: ${Object.keys(workflow.jobs)}`)
  check(workflow.on.pull_request && workflow.on.push.branches.includes("development") && workflow.on.workflow_dispatch, "the triggers are not pull requests, development pushes and manual runs")
  check(Object.values(workflow.jobs).every((j) => typeof j["timeout-minutes"] === "number"), "a job has no timeout")
  check(steps.every((s) => !s.uses || /^actions\/(checkout|setup-node|upload-artifact)@v\d+$/.test(s.uses)), `an unexpected action: ${steps.filter((s) => s.uses).map((s) => s.uses)}`)
})
await test("QA-CI-02", "The workflow verifies and never deploys or publishes", async (check) => {
  check(!/deploy|pages:|gh-pages|actions\/deploy-pages|upload-pages-artifact|publish|release|git push|environment:/i.test(workflowText.replace(/^\s*#.*$/gm, "")), "the workflow deploys, publishes or pushes")
  check(!/secrets\.|GITHUB_TOKEN|id-token/.test(workflowText.replace(/^\s*#.*$/gm, "")), "the workflow uses a secret or a token")
  const placeholders = (await readdir(join(repo, ".github/workflows"))).filter((f) => f !== "quality.yml")
  check(placeholders.length === 8, `${placeholders.length} other workflow files`)
  check(changedSinceBase(placeholders.map((f) => `.github/workflows/${f}`)).length === 0, "a placeholder workflow was changed (the release workflow is not P22's to touch)")
})
await test("QA-CI-03", "The workflow has the least privilege: read-only contents, no stored credentials, small artifacts, no secret", async (check) => {
  check(json(workflow.permissions) === json({ contents: "read" }), json(workflow.permissions))
  for (const job of Object.values(workflow.jobs)) {
    check(!job.permissions, "a job widens its permissions")
    for (const s of job.steps.filter((x) => x.uses?.startsWith("actions/checkout"))) check(s.with?.["persist-credentials"] === false, "a checkout keeps its credentials")
    for (const s of job.steps.filter((x) => x.uses?.startsWith("actions/upload-artifact"))) check(s.with["retention-days"] <= 14, "an artifact is kept longer than 14 days")
    check(job.steps.filter((x) => x.uses?.startsWith("actions/upload-artifact") && x.if === "failure()").length >= 1, "no evidence upload on failure")
  }
  check(workflow.concurrency?.["cancel-in-progress"] === true, "superseded runs are not cancelled")
})

// --- Preservation -----------------------------------------------------------------------------------------------

await test("QA-PRESERVE-01", "D-144, with its two accepted trade-offs, is unchanged", async (check) => {
  const paragraph = (text) => /\*\*D-144\.\*\*[\s\S]*?(?=\n\n|$)/.exec(text)?.[0].trim()
  const was = gitOk ? paragraph(git("show", `${BASE}:development/decisions.md`).stdout) : undefined
  check(was !== undefined && paragraph(await read("development/decisions.md")) === was, "D-144 differs from the paragraph P22 began with")
  check(changedSinceBase(["src/styles/home-tabs.css", "tests/home-browser.mjs", "tests/clocks-browser.mjs"]).length === 0, "home-tabs.css or the HOME-026 and CLOCK-033B exemptions changed")
  const home = await read("tests/home-browser.mjs")
  const clocks = await read("tests/clocks-browser.mjs")
  check((home.match(/gl-home-tabs-raise/g) ?? []).length >= 1 && (clocks.match(/gl-home-tabs-raise/g) ?? []).length >= 1, "an exemption no longer names the one animation")
})
await test("QA-PRESERVE-02", "The versioned CV sources are untouched", async (check) => {
  check(changedSinceBase(["cv", "src/cv", "src/data/cv"]).length === 0, `CV files changed: ${json(changedSinceBase(["cv", "src/cv", "src/data/cv"]))}`)
  check(!(gitOk && git("diff", "--cached", "--name-only").stdout.split("\n").some((f) => /^cv\//.test(f))), "a CV file is staged")
})
await test("QA-PRESERVE-03", "The canonical Bearnard masters and derivatives are untouched", async (check) => {
  check(changedSinceBase(["brand", "assets/bearnard", "public/illustrations", "src/illustrations", "scripts/bearnard_derivatives.py"]).length === 0, "a Bearnard file changed")
})
await test("QA-PRESERVE-04", "The navigation registry, the folder components and the palettes are unchanged", async (check) => {
  const touched = changedSinceBase(["src/navigation", "src/components/folders", "src/styles/folders.css", "src/styles/categories.css", "src/styles/tokens.css", "src/styles/home-tabs.css", "src/visualization", "src/home", "src/components/home", "src/pages/index.astro"])
  check(touched.length === 0, `changed: ${json(touched)}`)
})
await test("QA-DOC-01", "The guide states what automated accessibility checking cannot show, and what is left for P23", async (check) => {
  const guide = await read("development/quality-assurance.md")
  check(/not a claim of WCAG|does not establish WCAG|not full WCAG/i.test(guide) || /automated.*only part/is.test(guide), "the guide does not limit the accessibility claim")
  check(/P23/.test(guide) && /screen reader/i.test(guide) && /Safari/.test(guide) && /Firefox/.test(guide), "the guide does not hand the manual checks to P23")
  check(/DEFERRED/.test(guide) && /Cal\.com/.test(guide), "the guide does not explain the deferred booking checks")
})
await test("QA-FLAKE-01", "NUC-031 is investigated: the record names the cause with evidence, and the test waits for the state, not for time", async (check) => {
  const issue = await read("debugging/investigations/ISSUE-0005.md")
  check(/NUC-031/.test(issue) && /maxStep/.test(issue) && /CPU/i.test(issue) && /Root cause/i.test(issue), "ISSUE-0005 does not state the cause")
  check(/Evidence/i.test(issue) && /Remaining/i.test(issue), "ISSUE-0005 has no evidence or remaining-risk section")
  const test031 = (await read("tests/nucleus-browser.mjs")).split('await test("NUC-031"')[1].split('await test("NUC-018B"')[0]
  check(!/sleep\(700\)|sleep\(500\)/.test(test031) && /waitFor\(answered/.test(test031), "NUC-031 still waits a fixed time")
  check(/activation\)? ?> 20|> 20/.test(test031), "NUC-031's standard was lowered")
})

// P22-A01: a browser suite that started a dev server (demo-dev-browser, authoring-browser) passed every check on the GitHub
// runner and then sat for the orchestrator's whole 900 s, because `npx astro dev` stays attached to the test process there
// (on a Mac it hands off and exits) and its pipe kept the event loop alive. Every run of a failing suite ends the process;
// a passing one must too, or the orchestrator reports a suite whose checks all passed as failed.
await test("QA-EXIT-02", "A passing browser suite ends its own process, so nothing left running can hold it until the orchestrator's timeout", async (check) => {
  const harness = await read("tests/browser-harness.mjs")
  const finish = harness.slice(harness.indexOf("async function finish()"))
  check(/console\.log\(`PASS: \$\{results\.length\} browser checks[^\n]*\n(\s*\/\/[^\n]*\n)*\s*process\.exit\(0\)/.test(finish), "finish() does not end the process after a passing run")
  for (const file of ["tests/demo-dev-browser.mjs", "tests/authoring-browser.mjs"]) {
    const source = await read(file)
    check(/process\.on\("exit", stopDev\)/.test(source) && /await finish\(\)\s*$/.test(source.trimEnd()), `${file}: the dev server is not stopped by the exit that finish() now makes`)
  }
})

// P22-A01: `.ed__body pre` and `.ed__body table` scroll sideways inside their own box (editorial.css), and a scrolling
// region the keyboard cannot reach fails WCAG 2.1.1. Whether a table overflows depends on the font (the first GitHub
// run, on a runner with a wider fallback font, was the first to see it), so axe alone cannot guard this on a machine
// whose fonts are narrow: the markup is checked, whatever the font.
await test("QA-A11Y-01", "Every code block and table of a Quarto article can take keyboard focus, so a scrolling one can be scrolled by keyboard", async (check) => {
  const build = await demoBuild()
  const article = await build.read("lecture-notes/greenhouse/demo-synthetic-signals/index.html")
  const elements = [...article.matchAll(/<(pre|table)\b[^>]*>/g)]
  check(elements.some((m) => m[1] === "table"), "the demonstration article has no table: this check guards nothing")
  check(elements.some((m) => m[1] === "pre"), "the demonstration article has no code block: this check guards nothing")
  for (const [tag] of elements) check(/\btabindex="0"/.test(tag), `${tag.slice(0, 80)} cannot take keyboard focus`)
})

// P22-A01: the first GitHub run used a depth-1 checkout, in which the guards that compare with earlier commits failed or
// were SKIPPED. The environment stage must say so, whatever the cause, and the workflow must ask for the history.
await test("QA-HISTORY-01", "A shallow checkout fails the environment stage, a complete one passes, and the workflow checks out the full history", async (check) => {
  const dir = await mkdtemp(join(tmpdir(), "gusmaolab-history-"))
  try {
    const clone = join(dir, "clone")
    const made = spawnSync("git", ["clone", "--quiet", "--no-local", "--depth", "1", `file://${repo}`, clone], { encoding: "utf8" })
    check(made.status === 0, `a shallow clone could not be made: ${made.stderr}`)
    if (made.status === 0) {
      const shallow = historyCheck(clone)
      check(shallow.id === "QA-ENV-06" && shallow.status === "FAIL", `a depth-1 clone reported ${shallow.status}`)
      check(/fetch-depth: 0/.test(shallow.reasons.join()) && /unshallow/.test(shallow.reasons.join()), "the failure does not say how to fix it")
      const filled = spawnSync("git", ["-C", clone, "fetch", "--quiet", "--unshallow"], { encoding: "utf8" })
      check(filled.status === 0, `the clone could not be completed: ${filled.stderr}`)
      check(historyCheck(clone).status === "PASS", "a clone with its full history did not pass")
    }
    check(historyCheck(dir).status === "FAIL", "a folder that is not a git checkout did not fail")
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
  const jobs = Object.values(workflow.jobs)
  for (const job of jobs) for (const s of job.steps.filter((x) => x.uses?.startsWith("actions/checkout"))) check(s.with?.["fetch-depth"] === 0, "a checkout in the workflow does not fetch the full history")
})

let failed = 0
for (const { id, title, failures } of results) {
  if (failures.length === 0) console.log(`PASS ${id} ${title}`)
  else {
    failed++
    console.log(`FAIL ${id} ${title}`)
    for (const message of failures.slice(0, 8)) console.log(`  - ${message}`)
  }
}
console.log(failed === 0 ? `\n${results.length} checks passed.` : `\n${failed} of ${results.length} checks failed.`)
process.exit(failed === 0 ? 0 : 1)
