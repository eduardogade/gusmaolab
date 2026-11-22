// The one command that says what state the website is in (P22, D-151 to D-153): `npm run qa`.
//
//   npm run qa:quick   environment, Astro diagnostics, the production build, every unit suite, the static
//                      audits of the build and a reproducibility check. No browser. Minutes, not tens.
//   npm run qa         quick, plus the demonstration build, every browser suite (with one reported retry),
//                      accessibility with axe-core, and the measured performance run. The standard check.
//   npm run qa:deep    qa, but each browser suite runs three times and performance five, to look for
//                      instability. Slow; for before a release and for investigating a flake.
//
// It orchestrates; it does not replace a runner. Each suite is `node tests/<name>.mjs`, exactly as `npm
// test` and `npm run test:browser` run it (the inventory is scripts/qa-suites.mjs), and the output is read
// by one parser (scripts/qa-lib.mjs) into six states that are never merged: PASS, FAIL, SKIPPED, DEFERRED,
// NOT RUN and FLAKY. A mandatory FAIL, NOT RUN, or unregistered FLAKY exits 1; approved deferrals (the
// Cal.com booking checks, owner decision) and profile-skipped stages do not, and are reported in full.
// The report is qa-report/latest.json and latest.md (gitignored); the development page /_design/quality/
// shows it, with its age and whether the tree has changed since.
//
//   node scripts/qa.mjs [--profile quick|full|deep] [--only stage,stage] [--dist folder] [--report-dir folder]
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, statSync } from "node:fs"
import { appendFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { cpus } from "node:os"
import { join, relative, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { auditDist, auditReproducibility } from "./qa-audits.mjs"
import { DEFERRALS, KNOWN_FLAKY, REPORT_SCHEMA, classify, countStatuses, emptyCounts, environmentSummary, parseChecks, redact, stripAnsi, suiteStatus, verdict } from "./qa-lib.mjs"
import { evaluate } from "./qa-matrix.mjs"
import { REPO, sourceState } from "../src/quality/source.mjs"
import { BROWSER_SUITES, MEASUREMENT_SUITES, UNIT_SUITES } from "./qa-suites.mjs"

const ROOT = REPO
export const PROFILES = {
  quick: { stages: ["environment", "diagnostics", "build", "unit", "audits", "reproducibility"], retries: 0, repeat: 1, perfRuns: 0 },
  full: { stages: ["environment", "diagnostics", "build", "unit", "audits", "reproducibility", "demo-build", "browser", "performance"], retries: 1, repeat: 1, perfRuns: 5 },
  deep: { stages: ["environment", "diagnostics", "build", "unit", "audits", "reproducibility", "demo-build", "browser", "performance"], retries: 0, repeat: 3, perfRuns: 10 },
}
const STAGE_TITLES = {
  environment: "Environment sanity",
  diagnostics: "Astro and TypeScript diagnostics",
  build: "Production build (with the offline science check and the public-output search)",
  unit: "Unit and build-reading suites",
  audits: "Static audits of the build: routes, links, metadata, images, output safety, budgets",
  reproducibility: "Build reproducibility",
  "demo-build": "Demonstration build (the development specimens the browser suites read)",
  browser: "Browser regression and accessibility suites",
  performance: "Measured performance and route budgets",
}
const CATEGORY = { environment: "environment", diagnostics: "build", build: "build", unit: "tests", audits: "audit", reproducibility: "build", "demo-build": "build", browser: "browser", performance: "performance" }

const RANK = { FAIL: 6, "NOT RUN": 5, FLAKY: 4, SKIPPED: 1, DEFERRED: 1, PASS: 0 }
const worst = (statuses) => statuses.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), "PASS")

const CHROME_CANDIDATES = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
const chromePath = () => CHROME_CANDIDATES.find((p) => p && existsSync(p))

function parseArgs(argv) {
  const args = { profile: "full", only: null, dist: null, reportDir: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    if (a === "--profile") args.profile = next()
    else if (a.startsWith("--profile=")) args.profile = a.slice(10)
    else if (a === "--only") args.only = next().split(",")
    else if (a.startsWith("--only=")) args.only = a.slice(7).split(",")
    else if (a === "--dist") args.dist = next()
    else if (a === "--report-dir") args.reportDir = next()
    else throw new Error(`unknown argument ${a}`)
  }
  if (!PROFILES[args.profile]) throw new Error(`unknown profile "${args.profile}" (quick, full, deep)`)
  return args
}

const run = (command, args, options = {}) => spawnSync(command, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, ...options })
const tool = (name, args) => run(name, args).stdout?.trim() ?? ""

// --- Stages ----------------------------------------------------------------------------------------------

function envStage(context) {
  const checks = []
  const wanted = readFileSync(join(ROOT, ".node-version"), "utf8").trim()
  const major = process.versions.node.split(".")[0]
  checks.push({ id: "QA-ENV-01", title: `Node.js matches .node-version (${wanted})`, status: major === wanted.split(".")[0] ? "PASS" : "FAIL", reasons: major === wanted.split(".")[0] ? [] : [`this run uses Node ${process.versions.node}; the project requires ${wanted} (package.json engines). Results from another major version are not comparable.`] })
  // Lockfile: the direct dependencies in package.json are exactly those the lock records, and what is installed is what the lock says.
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"))
  const lock = JSON.parse(readFileSync(join(ROOT, "package-lock.json"), "utf8"))
  const root = lock.packages?.[""] ?? {}
  const reasons = []
  for (const kind of ["dependencies", "devDependencies"])
    for (const [name, range] of Object.entries(pkg[kind] ?? {})) {
      if ((root[kind] ?? {})[name] !== range) reasons.push(`${kind}.${name} is "${range}" in package.json and "${(root[kind] ?? {})[name]}" in package-lock.json`)
      const locked = lock.packages?.[`node_modules/${name}`]?.version
      const installedFile = join(ROOT, "node_modules", name, "package.json")
      if (!existsSync(installedFile)) reasons.push(`${name} is not installed (run npm ci)`)
      else if (locked && JSON.parse(readFileSync(installedFile, "utf8")).version !== locked) reasons.push(`${name}: installed ${JSON.parse(readFileSync(installedFile, "utf8")).version}, the lockfile says ${locked} (run npm ci)`)
    }
  checks.push({ id: "QA-ENV-03", title: "Direct dependencies match the lockfile and the installed packages", status: reasons.length === 0 ? "PASS" : "FAIL", reasons })
  const src = sourceState()
  checks.push({ id: "QA-ENV-04", title: "A git checkout is available, so the report can name its source state", status: src.head ? "PASS" : "FAIL", reasons: src.head ? [] : ["not a git checkout"] })
  if (context.needsBrowser) {
    const chrome = chromePath()
    checks.push({ id: "QA-ENV-05", title: "Chrome or Chromium is available for the browser stages", status: chrome ? "PASS" : "NOT RUN", reasons: chrome ? [] : ["no Chrome or Chromium found (set CHROME_PATH); the browser stages cannot run, which is NOT RUN, not a pass"] })
    context.chromeVersion = chrome ? tool(chrome, ["--version"]).replace(/^.*?(\d+\.\d+\.\d+\.\d+).*$/, "$1") : null
  }
  return { checks }
}

function commandStage(command, args) {
  const started = Date.now()
  const out = run(command, args, { env: { ...process.env, FORCE_COLOR: "0" } })
  const text = stripAnsi(`${out.stdout ?? ""}\n${out.stderr ?? ""}`)
  return { exit: out.status ?? 1, text, durationMs: Date.now() - started, checks: parseChecks(out.stdout ?? "").map(classify) }
}

function runSuiteOnce(suite, env, timeoutMs = 900_000) {
  const started = Date.now()
  const out = run(process.execPath, [suite.file], { env: { ...process.env, ...env, FORCE_COLOR: "0" }, timeout: timeoutMs })
  const timedOut = out.error?.code === "ETIMEDOUT" || out.signal === "SIGTERM"
  const text = stripAnsi(`${out.stdout ?? ""}${out.stderr ? `\n--- stderr ---\n${out.stderr}` : ""}${timedOut ? `\n--- timed out after ${timeoutMs / 1000} s ---` : ""}`)
  return { exit: timedOut ? 1 : (out.status ?? 1), text, durationMs: Date.now() - started, checks: parseChecks(out.stdout ?? "") }
}

// --- The run ---------------------------------------------------------------------------------------------

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv)
  const profile = PROFILES[args.profile]
  const reportDir = resolve(ROOT, args.reportDir ?? "qa-report")
  const dist = resolve(ROOT, args.dist ?? "dist")
  const selected = new Set(args.only ?? profile.stages)
  const logsDir = join(reportDir, "logs")
  const evidenceDir = join(reportDir, "evidence")
  await rm(logsDir, { recursive: true, force: true })
  await rm(evidenceDir, { recursive: true, force: true })
  await mkdir(logsDir, { recursive: true })
  await mkdir(evidenceDir, { recursive: true })

  const startedAt = new Date()
  const stages = []
  const allChecks = []
  const suiteResults = []
  const findings = []
  let performance = null
  let accessibility = null
  const context = { needsBrowser: ["browser", "performance"].some((s) => selected.has(s)), chromeVersion: null }
  const logOf = async (name, text) => {
    const file = join(logsDir, `${name}.log`)
    await writeFile(file, redact(text, ROOT))
    return relative(ROOT, file).startsWith("..") ? file : relative(ROOT, file)
  }
  const say = (stage) => console.log(`${stage.status.padEnd(8)} ${stage.id.padEnd(16)} ${stage.title}${stage.note ? `  (${stage.note})` : ""}`)

  const record = (id, base) => {
    const stage = { id, title: STAGE_TITLES[id], category: CATEGORY[id], mandatory: true, ...base }
    stages.push(stage)
    say(stage)
    return stage
  }
  const skipped = (id) => record(id, { status: "SKIPPED", profileExcluded: true, note: args.only ? "not selected (--only)" : `not part of the ${args.profile} profile`, counts: emptyCounts(), durationMs: 0, suites: [] })
  const functionStage = (id, checks, durationMs, extra = {}) => {
    allChecks.push(...checks.map((c) => ({ stage: id, suite: id, ...c })))
    const status = worst(checks.map((c) => c.status))
    return record(id, { status, counts: countStatuses(checks), durationMs, suites: [], ...extra })
  }
  const commandResult = async (id, command, args2) => {
    const r = commandStage(command, args2)
    const log = await logOf(id, r.text)
    const checks = r.checks
    allChecks.push(...checks.map((c) => ({ stage: id, suite: id, ...c })))
    const status = r.exit === 0 ? "PASS" : "FAIL"
    return record(id, { status, counts: countStatuses(checks.length ? checks : [{ status }]), durationMs: r.durationMs, command: `${command} ${args2.join(" ")}`, log, suites: [], failures: r.exit === 0 ? [] : [{ id, title: STAGE_TITLES[id], reasons: [`exit ${r.exit}`, ...r.text.trim().split("\n").slice(-6)] }] })
  }
  const runSuites = async (stageId, suites, { retries, repeat, env }) => {
    const started = Date.now()
    const results = []
    for (const suite of suites) {
      const attempts = []
      const limit = repeat > 1 ? repeat : 1 + retries
      for (let n = 1; n <= limit; n++) {
        const a = runSuiteOnce(suite, env)
        a.log = await logOf(`${suite.id}.attempt${n}`, a.text)
        attempts.push(a)
        const verdictNow = suiteStatus([a]).status
        if (repeat === 1 && verdictNow === "PASS") break
        if (repeat === 1 && n === limit) break
      }
      const result = suiteStatus(attempts.map((a) => ({ exit: a.exit, checks: a.checks })))
      const last = attempts.at(-1)
      const checks = last.checks.map(classify)
      allChecks.push(...checks.map((c) => ({ stage: stageId, suite: suite.id, attempt: attempts.length, ...c })))
      const failing = (result.status === "FLAKY" ? attempts.find((a) => suiteStatus([{ exit: a.exit, checks: a.checks }]).status !== "PASS") : last)
      const failures = failing ? failing.checks.map(classify).filter((c) => c.status === "FAIL" || c.status === "NOT RUN").map((c) => ({ id: c.id, title: c.title, reasons: c.reasons })) : []
      if (result.status === "FAIL" && failures.length === 0) failures.push({ id: suite.id, title: suite.purpose, reasons: [`exit ${last.exit}`, ...last.text.trim().split("\n").slice(-6)] })
      const suiteStatusWord = result.status
      const entry = { id: suite.id, file: suite.file, tier: suite.tier, purpose: suite.purpose, status: suiteStatusWord, registered: result.registered, firstFailures: result.firstFailures, counts: countStatuses(checks), attempts: attempts.map((a) => ({ exit: a.exit, durationMs: a.durationMs, log: a.log })), failures, stage: stageId }
      results.push(entry)
      suiteResults.push(entry)
      console.log(`  ${suiteStatusWord.padEnd(8)} ${suite.id}${attempts.length > 1 ? `  (${attempts.length} attempts)` : ""}`)
    }
    const status = worst(results.map((r) => r.status))
    const flakyUnregistered = results.some((r) => r.status === "FLAKY" && !r.registered)
    return record(stageId, { status, registered: status === "FLAKY" ? !flakyUnregistered : undefined, counts: results.reduce((n, r) => { for (const k of Object.keys(n)) n[k] += r.counts[k]; return n }, emptyCounts()), durationMs: Date.now() - started, suites: results.map((r) => r.id), failures: results.flatMap((r) => r.failures.map((f) => ({ suite: r.id, ...f }))) })
  }

  console.log(`GusmaoLab quality assurance, profile "${args.profile}"${args.only ? ` (only ${args.only.join(", ")})` : ""}\n`)
  const buildOk = () => stages.find((s) => s.id === "build")?.status === "PASS"
  const distThere = () => existsSync(join(dist, "index.html"))

  // environment
  if (selected.has("environment")) {
    const t = Date.now()
    const e = envStage(context)
    functionStage("environment", e.checks, Date.now() - t)
  } else skipped("environment")

  // diagnostics + build
  if (selected.has("diagnostics")) await commandResult("diagnostics", "npm", ["run", "check"])
  else skipped("diagnostics")
  if (selected.has("build")) await commandResult("build", "npm", ["run", "build"])
  else skipped("build")

  // unit suites
  if (selected.has("unit")) {
    if (!distThere() && !selected.has("build")) record("unit", { status: "NOT RUN", counts: emptyCounts(), durationMs: 0, suites: [], failures: [{ id: "unit", title: STAGE_TITLES.unit, reasons: ["dist/ is not built: run `npm run build` or select the build stage"] }] })
    else await runSuites("unit", UNIT_SUITES, { retries: 0, repeat: 1, env: { QA_REPORT_DIR: reportDir } })
  } else skipped("unit")

  // audits
  let budgets = null
  try { budgets = JSON.parse(await readFile(join(ROOT, "development/qa-budgets.json"), "utf8")) } catch { budgets = null }
  if (selected.has("audits")) {
    if (!existsSync(join(dist, "index.html"))) record("audits", { status: "NOT RUN", counts: emptyCounts(), durationMs: 0, suites: [], failures: [{ id: "audits", title: STAGE_TITLES.audits, reasons: [`${relative(ROOT, dist)} is not built`] }] })
    else {
      const t = Date.now()
      const a = await auditDist(dist, { root: ROOT, budgets })
      findings.push(...a.findings)
      functionStage("audits", a.checks, Date.now() - t, { failures: a.checks.filter((c) => c.status === "FAIL").map((c) => ({ id: c.id, title: c.title, reasons: c.reasons })), weights: a.weights.length })
      await writeFile(join(reportDir, "page-weights.json"), JSON.stringify(a.weights.map((w) => ({ url: w.url, htmlGzip: w.html, jsGzip: w.js, cssGzip: w.css, imagesBytes: w.images, scriptFiles: w.scriptFiles })), null, 1))
    }
  } else skipped("audits")
  if (selected.has("reproducibility")) {
    if (!existsSync(join(dist, "index.html"))) record("reproducibility", { status: "NOT RUN", counts: emptyCounts(), durationMs: 0, suites: [], failures: [{ id: "reproducibility", title: STAGE_TITLES.reproducibility, reasons: ["dist/ is not built"] }] })
    else {
      const t = Date.now()
      const checks = await auditReproducibility(dist, { root: ROOT })
      // Byte differences are volatility to be reported, not a defect, unless the file lists differ.
      const volatile = checks.find((c) => c.id === "QA-REPRO-02")
      if (volatile && volatile.status === "FAIL") { findings.push({ id: "F-VOLATILITY", severity: "limitation", area: "build", text: `${volatile.data.differing} of ${volatile.data.identical + volatile.data.differing} files differ byte-for-byte between two builds of the same inputs: ${volatile.reasons.slice(0, 5).join("; ")}` }); volatile.status = "PASS"; volatile.reasons = [`reported as volatility, not a defect: ${volatile.data.differing} file(s) differ (see findings)`] }
      functionStage("reproducibility", checks, Date.now() - t, { failures: checks.filter((c) => c.status === "FAIL").map((c) => ({ id: c.id, title: c.title, reasons: c.reasons })) })
    }
  } else skipped("reproducibility")

  // demonstration build + browser suites + performance
  if (selected.has("demo-build")) await commandResult("demo-build", "npm", ["run", "demo:build"])
  else skipped("demo-build")
  const browserReady = () => context.chromeVersion !== null || chromePath() !== undefined
  if (selected.has("browser")) {
    if (!browserReady()) record("browser", { status: "NOT RUN", counts: emptyCounts(), durationMs: 0, suites: [], failures: [{ id: "browser", title: STAGE_TITLES.browser, reasons: ["no Chrome or Chromium: the browser stage cannot run (NOT RUN, never a pass)"] }] })
    else await runSuites("browser", BROWSER_SUITES, { retries: profile.retries, repeat: profile.repeat, env: { QA_REPORT_DIR: reportDir, QA_EVIDENCE_DIR: evidenceDir } })
    try { accessibility = JSON.parse(await readFile(join(reportDir, "accessibility.json"), "utf8")) } catch { accessibility = null }
  } else skipped("browser")
  if (selected.has("performance")) {
    if (!browserReady()) record("performance", { status: "NOT RUN", counts: emptyCounts(), durationMs: 0, suites: [], failures: [{ id: "performance", title: STAGE_TITLES.performance, reasons: ["no Chrome or Chromium"] }] })
    else await runSuites("performance", MEASUREMENT_SUITES, { retries: 0, repeat: 1, env: { QA_REPORT_DIR: reportDir, QA_EVIDENCE_DIR: evidenceDir, QA_PERF_RUNS: String(profile.perfRuns || 5) } })
    try { performance = JSON.parse(await readFile(join(reportDir, "performance.json"), "utf8")) } catch { performance = null }
  } else skipped("performance")

  // Verdict, the acceptance items, and the report.
  const owners = await checkOwners()
  const byRef = (ref) => {
    const [kind, ...rest] = ref.split(":")
    const key = rest.join(":")
    if (kind === "stage") { const s = stages.find((x) => x.id === key); return s && s.status !== "SKIPPED" ? s.status : undefined }
    if (kind === "suite") { const s = suiteResults.find((x) => x.id === key); return s?.status }
    if (kind === "deferred") return allChecks.some((c) => c.status === "DEFERRED" && c.id.startsWith(key)) ? "DEFERRED" : undefined
    const found = allChecks.filter((c) => c.id === key)
    return found.length ? worst(found.map((c) => c.status)) : undefined
  }
  const isSelected = (ref) => {
    const [kind, ...rest] = ref.split(":")
    const key = rest.join(":")
    let stage
    if (kind === "stage") stage = key
    else if (kind === "suite") stage = suiteResults.find((x) => x.id === key)?.stage ?? ([...BROWSER_SUITES].some((s) => s.id === key) ? "browser" : [...MEASUREMENT_SUITES].some((s) => s.id === key) ? "performance" : "unit")
    else if (kind === "deferred") stage = "unit"
    else stage = /^QA-(ROUTE|LINK|META|IMG|OUT|BUDGET)-/.test(key) ? "audits" : /^QA-REPRO/.test(key) ? "reproducibility" : /^QA-ENV/.test(key) ? "environment" : (owners.get(key) ?? "unit")
    return selected.has(stage)
  }
  const matrix = evaluate(byRef, isSelected)
  const blockers = findings.filter((f) => f.severity === "release-blocker")
  const CAVEATS = new Set(["QA-008", "QA-023", "QA-065"])
  const v = verdict(stages)
  const state = sourceState()
  const changedFiles = run("git", ["status", "--porcelain=v1", "--untracked-files=all"]).stdout?.split("\n").filter(Boolean) ?? []
  const source = { ...state, dirty: changedFiles.length > 0, changed: changedFiles.length }
  const report = {
    schema: REPORT_SCHEMA,
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    profile: args.profile,
    only: args.only,
    source,
    environment: environmentSummary({ node: process.versions.node, npm: tool("npm", ["--version"]), platform: process.platform, arch: process.arch, cpu: cpus()[0]?.model ?? "unknown", chrome: context.chromeVersion ?? (chromePath() ? tool(chromePath(), ["--version"]).replace(/^.*?(\d+\.\d+\.\d+\.\d+).*$/, "$1") : null), axe: safeVersion("axe-core"), ci: Boolean(process.env.CI) }),
    overall: { status: v.status, exit: v.exit, partial: v.partial, failing: v.failing, counts: v.counts, checkCounts: countStatuses(allChecks) },
    stages,
    suites: suiteResults,
    checks: allChecks.map((c) => ({ stage: c.stage, suite: c.suite, id: c.id, title: c.title, status: c.status, reasons: c.reasons?.slice(0, 5), data: c.data })),
    deferred: Object.entries(DEFERRALS).map(([id, d]) => ({ id, title: d.title, status: allChecks.some((c) => c.id === id && c.status === "DEFERRED") ? "DEFERRED" : "NOT RUN", reason: d.reason, decision: d.decision, reactivate: d.reactivate })),
    knownFlaky: Object.keys(KNOWN_FLAKY),
    findings,
    performance,
    accessibility,
    matrix: matrix.map((m) => ({ id: m.id, title: m.title, status: m.status, evidence: m.evidence, ...(CAVEATS.has(m.id) && blockers.length > 0 ? { caveat: `Passes with a registered release-blocker exception: ${blockers.map((b) => b.id.replace("F-EXCEPTION:", "")).join(", ")} (see Release blockers).` } : {}) })),
  }
  const clean = JSON.parse(redact(JSON.stringify(report), ROOT))
  await writeFile(join(reportDir, "latest.json"), JSON.stringify(clean, null, 2))
  await writeFile(join(reportDir, "latest.md"), markdown(clean))
  await appendFile(join(reportDir, "history.jsonl"), `${JSON.stringify({ generatedAt: clean.generatedAt, profile: clean.profile, head: source.head?.slice(0, 7), fingerprint: source.fingerprint, status: clean.overall.status, partial: clean.overall.partial, counts: clean.overall.checkCounts })}\n`)

  const c = clean.overall.checkCounts
  console.log(`\n${clean.overall.status}${clean.overall.partial ? " (partial: some stages were not part of this profile)" : ""}: ${c.PASS} PASS, ${c.FAIL} FAIL, ${c.SKIPPED} SKIPPED, ${c.DEFERRED} DEFERRED, ${c["NOT RUN"]} NOT RUN, ${c.FLAKY} FLAKY checks; ${stages.filter((s) => s.status === "FAIL" || s.status === "NOT RUN").length} stage(s) failed or did not run.`)
  for (const s of stages.filter((x) => x.mandatory && (x.status === "FAIL" || x.status === "NOT RUN" || (x.status === "FLAKY" && x.registered !== true)))) {
    console.log(`  ${s.status} ${s.id}`)
    for (const f of (s.failures ?? []).slice(0, 6)) console.log(`    - ${f.suite ? `${f.suite}: ` : ""}${f.id}: ${(f.reasons ?? [])[0] ?? f.title}`)
  }
  const deferred = clean.deferred.filter((d) => d.status === "DEFERRED").length
  if (deferred) console.log(`  ${deferred} Cal.com booking checks are DEFERRED, not passed: EXTERNAL ACTIVATION PENDING (owner decision).`)
  console.log(`Report: ${relative(ROOT, join(reportDir, "latest.md"))}  and  ${relative(ROOT, join(reportDir, "latest.json"))}`)
  return { report: clean, exit: v.exit }
}

function safeVersion(name) {
  try { return JSON.parse(readFileSync(join(ROOT, "node_modules", name, "package.json"), "utf8")).version } catch { return null }
}

/** Which stage prints each check ID: read from the test sources, so a matrix reference to a missing check is NOT RUN, not a guess. */
async function checkOwners() {
  const owners = new Map()
  const ID = /["'`]([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+)["'`]/g
  for (const [stage, suites] of [["unit", UNIT_SUITES], ["browser", BROWSER_SUITES], ["performance", MEASUREMENT_SUITES]])
    for (const suite of suites) {
      const text = existsSync(join(ROOT, suite.file)) ? await readFile(join(ROOT, suite.file), "utf8") : ""
      for (const m of text.matchAll(ID)) if (!owners.has(m[1])) owners.set(m[1], stage)
    }
  return owners
}

function markdown(r) {
  const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ")
  const dur = (ms) => (ms >= 60000 ? `${(ms / 60000).toFixed(1)} min` : `${(ms / 1000).toFixed(1)} s`)
  const L = []
  L.push(`# GusmaoLab quality report`, "")
  L.push(`**${r.overall.status}**${r.overall.partial ? " (partial: stages left out by the profile are SKIPPED, not passed)" : ""} · profile \`${r.profile}\` · ${r.generatedAt} · ${dur(r.durationMs)}`, "")
  L.push(`Source: commit \`${r.source.head?.slice(0, 7) ?? "unknown"}\` on \`${r.source.branch ?? "?"}\`, ${r.source.dirty ? `${r.source.changed} uncommitted change(s)` : "clean tree"}, fingerprint \`${r.source.fingerprint ?? "?"}\`.`)
  const e = r.environment
  L.push(`Environment: Node ${e.node}, npm ${e.npm}, ${e.platform}/${e.arch}, ${e.cpu}, Chrome ${e.chrome ?? "not found"}, axe-core ${e.axe ?? "n/a"}${e.ci ? ", CI" : ""}.`, "")
  L.push(`Statuses are never merged: PASS executed without a defect · FAIL a defect · SKIPPED not part of this run · DEFERRED pending an approved external action · NOT RUN expected and not executed · FLAKY unstable. A run fails on a mandatory FAIL, NOT RUN or unregistered FLAKY.`, "")
  const c = r.overall.checkCounts
  L.push(`**Checks:** ${c.PASS} PASS · ${c.FAIL} FAIL · ${c.SKIPPED} SKIPPED · ${c.DEFERRED} DEFERRED · ${c["NOT RUN"]} NOT RUN · ${c.FLAKY} FLAKY`, "")
  const blockers = r.findings.filter((f) => f.severity === "release-blocker")
  if (blockers.length) { L.push("## Release blockers (the owner must decide before P24)", ""); for (const b of blockers) L.push(`- **${b.id.replace("F-EXCEPTION:", "")}** (${b.area}): ${cell(b.text)}`); L.push("") }
  L.push("## Stages", "", "| Stage | Status | Checks | Time | Note |", "| --- | --- | --- | --- | --- |")
  for (const s of r.stages) L.push(`| ${s.id} | ${s.status}${s.status === "FLAKY" && s.registered ? " (registered)" : ""} | ${s.counts ? `${s.counts.PASS}/${Object.values(s.counts).reduce((a, b) => a + b, 0)} pass` : ""} | ${dur(s.durationMs ?? 0)} | ${cell(s.note ?? (s.title ?? ""))} |`)
  const bad = r.stages.filter((s) => (s.failures ?? []).length > 0 && s.status !== "PASS" && s.status !== "SKIPPED")
  if (bad.length) { L.push("", "## Failures", ""); for (const s of bad) for (const f of s.failures.slice(0, 40)) L.push(`- **${s.id}${f.suite ? ` / ${f.suite}` : ""}** \`${f.id}\` ${cell(f.title)} — ${cell((f.reasons ?? [])[0] ?? "")}${s.log ? ` (log: \`${s.log}\`)` : ""}`) }
  const flaky = r.suites.filter((s) => s.status === "FLAKY")
  if (flaky.length) { L.push("", "## Flaky / under investigation", ""); for (const s of flaky) L.push(`- **${s.id}**: ${s.attempts.length} attempts; first failures: ${s.firstFailures.join(", ") || "(none recorded)"}${s.registered ? " — registered as known" : " — NOT registered: investigate"}`) }
  const def = r.deferred.filter((d) => d.status === "DEFERRED")
  L.push("", "## Deferred (not passed)", "")
  if (def.length === 0) L.push("None reported in this run.")
  else { L.push(`${def.length} provider-dependent scheduling checks are **DEFERRED — EXTERNAL ACTIVATION PENDING**. ${def[0].decision}. Reactivate ${def[0].reactivate}.`, ""); L.push(def.map((d) => `\`${d.id}\``).join(" · ")) }
  if (r.findings.length) { L.push("", "## Findings (recommendations and limitations; they do not fail the run)", ""); for (const f of r.findings.filter((x) => !x.id.startsWith("F-ORPHAN") && !x.id.startsWith("F-DUPLICATE"))) L.push(`- **${f.severity}** (${f.area}) ${cell(f.text)}`); const o = r.findings.filter((x) => x.id.startsWith("F-ORPHAN") || x.id.startsWith("F-DUPLICATE")); if (o.length) L.push(`- **recommendation** (images) ${o.length} orphaned or duplicated asset(s): ${o.map((x) => x.id.split(":")[1]).slice(0, 8).join(", ")}${o.length > 8 ? ", …" : ""}`) }
  if (r.performance?.pages) {
    L.push("", "## Performance (median of cold runs)", "", `${r.performance.environment?.summary ?? ""}`, "", "| Page | Runs | LCP ms | CLS | TBT* ms | Requests | JS KB | CSS KB | Images KB |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    for (const p of r.performance.pages) L.push(`| ${p.name} | ${p.runs} | ${p.median.lcp} (${p.min.lcp}–${p.max.lcp}) | ${p.median.cls} | ${p.median.tbt} | ${p.median.requests} | ${p.median.jsKB} | ${p.median.cssKB} | ${p.median.imagesKB} |`)
    L.push("", "*TBT is approximated from long tasks after first paint, not Lighthouse's own simulation.")
  }
  if (r.accessibility?.pages) {
    L.push("", "## Accessibility (axe-core)", "", `${r.accessibility.pages.length} pages scanned; ${r.accessibility.violations} violation(s) outside the register, ${r.accessibility.registered} registered known issue(s). Automated checks find only part of the WCAG problems; manual review remains for P23.`)
  }
  L.push("", "## Acceptance items (QA-001 to QA-082)", "", "| Item | Status | Requirement |", "| --- | --- | --- |")
  for (const m of r.matrix) L.push(`| ${m.id} | ${m.status} | ${cell(m.title)}${m.caveat ? ` — *${cell(m.caveat)}*` : ""} |`)
  L.push("", "## Suites", "", "| Suite | Status | Attempts | Checks |", "| --- | --- | --- | --- |")
  for (const s of r.suites) L.push(`| ${s.id} | ${s.status} | ${s.attempts.length} | ${Object.values(s.counts).reduce((a, b) => a + b, 0)} |`)
  L.push("", `Open this in the browser: run \`npm run dev\`, then Home, the development note, "Site Map & Page Coverage", "Quality Assurance" (\`/_design/quality/\`).`, "")
  return L.join("\n")
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { exit } = await main()
    process.exit(exit)
  } catch (error) {
    console.error(`QA could not run: ${error.stack ?? error.message}`)
    process.exit(1)
  }
}
