// Scheduling integration (P21, D-145 to D-150): the SCH checks that need no browser and no provider.
// They read the release build in dist/ (run `npm run build` first, or `npm run verify`), make a
// throwaway release build with scheduling enabled on a SYNTHETIC link (tests/scheduling-ready-build.mjs),
// and run the real configuration, loader, time-zone and availability code against a stand-in browser.
// The browser half (SCH-017B, 018, 020, 044 to 048, 050) is tests/scheduling-browser.mjs.
//
// What they show: the configuration refuses a half-enabled or placeholder booking setup; the
// unconfigured Schedule page offers no times, no form, no control and no provider code; a ready page
// loads the provider only on one press and only from one origin; a blocked, failed or slow provider
// becomes a plain message; time zones are the standard library's; and nothing private is shipped.
//
// What they do NOT show, and report as BLOCKED rather than passed: that the provider's calendar loads
// and shows real availability, that email verification is enforced, that a request arrives pending,
// that the owner is emailed, that accepting or declining notifies the visitor, that conflicts and holds
// work, and that a confirmed booking reaches a calendar. Those need the owner's provider account
// (development/scheduling-guide.md, "Testing safely"); no check here uses one.
import { withoutApproved } from "./approved-changes.mjs"
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { SCHEDULING_CONFIG } from "../src/data/scheduling.ts"
import {
  BOOKING_HOSTS, DEFAULT_OWNER_TIME_ZONE, EMBED_LAYOUT, EMBED_ORIGIN, EMBED_SCRIPT, SCHEDULING_PROVIDERS,
  parseBookingUrl, publicScheduling, validateScheduling,
} from "../src/scheduling/config.ts"
import { describeSource, parseSourceReference, planSync, validateSourceReference } from "../src/scheduling/availability.ts"
import { BOOKING_TIMEOUT_MS, embedIsAllowed, startBooking } from "../src/scheduling/embed.ts"
import { COPY } from "../src/scheduling/copy.ts"
import { describeSlot, inZone, isValidTimeZone, offsetMinutes } from "../src/scheduling/time.ts"
import { siteScheduling } from "../src/scheduling/index.ts"
import { SIM_NOW, SIM_ZONES, simMonth, simSlots } from "../src/design/scheduling-fixture.ts"
import { SCHEDULING_PAGE, DEV_PAGES } from "../src/design/site-map.ts"
import { siteNavigation } from "../src/navigation/index.ts"
import { coverage } from "../src/site/coverage.ts"
import { pageFacts, siteRecordViews } from "../src/site/facts.ts"
import { report, probeSource } from "../scripts/scheduling.mjs"
import { MARKERS, publicBuildIssues } from "../scripts/demo-check.mjs"
import { READY_CONFIG, SYNTHETIC_LINK, buildWith } from "./scheduling-ready-build.mjs"
import { elements, labelOf, layersOf, parse, selectedOf, tabsOf, textOf, visibleTextOf } from "./html-tree.mjs"

const repo = fileURLToPath(new URL("../", import.meta.url))
const dist = join(repo, "dist")
const BASE = "553b166" // the head P21 began from
const json = (value) => JSON.stringify(value)
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
const blocked = []
const BLOCKED_REASON = "BLOCKED: needs the owner's provider account (no booking link, no verified settings)"
const block = (id, title) => blocked.push({ id, title })

if (!existsSync(join(dist, "index.html"))) {
  console.error("FAIL: dist/index.html is missing. Run `npm run build` first.")
  process.exit(1)
}

async function listFiles(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await listFiles(path)))
    else out.push(path)
  }
  return out
}
const TEXTY = /\.(html|js|mjs|css|json|txt|xml|svg|map)$/
const textOfBuild = async (folder) => {
  const map = new Map()
  for (const file of await listFiles(folder)) if (TEXTY.test(file)) map.set(file.slice(folder.length + 1), await readFile(file, "utf8"))
  return map
}
const git = (...args) => spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" })
const gitAvailable = git("rev-parse", "--git-dir").status === 0 && git("cat-file", "-e", BASE).status === 0
const lines = (r) => r.stdout.split("\n").filter(Boolean)
/** Files that differ from the head P21 began from, committed or not, including new ones. */
function changedSinceBase(paths) {
  if (!gitAvailable) return []
  const files = new Set(lines(git("diff", "--name-only", BASE, "--", ...paths)))
  for (const f of lines(git("ls-files", "--others", "--exclude-standard", "--", ...paths))) files.add(f)
  return [...files].sort()
}

const releaseText = await textOfBuild(dist)
const schedulePath = "schedule/index.html"
const scheduleHtml = releaseText.get(schedulePath) ?? ""
const mainOf = (html) => elements(parse(html)).find((el) => el.tag === "main")

// A throwaway release build with scheduling ENABLED on a synthetic link.
const ready = await buildWith()
const readyText = ready.ok ? await textOfBuild(ready.dist) : new Map()
const readyHtml = readyText.get(schedulePath) ?? ""

// --- Configuration and architecture -----------------------------------------------------------------------

await test("SCH-001", "The Schedule route remains /schedule/", async (check) => {
  check(siteNavigation.node("schedule").path === "/schedule/", siteNavigation.node("schedule").path)
  check(scheduleHtml.length > 0 && /<h1[^>]*>Schedule<\/h1>/.test(scheduleHtml), "dist/schedule/index.html has no Schedule heading")
})

await test("SCH-002", "Schedule belongs to Core", async (check) => {
  check(siteNavigation.node("schedule").category === "core", siteNavigation.node("schedule").category)
  check(/data-category="core"/.test(scheduleHtml), "the built page is not in the Core category")
})

await test("SCH-003", "The physical-folder navigation remains intact on Schedule", async (check) => {
  const { layers } = layersOf(parse(scheduleHtml))
  check(layers.length === 1, `${layers.length} levels`)
  const labels = tabsOf(layers[0]).map(labelOf)
  check(json(labels) === json(siteNavigation.sections.map((s) => s.label)), json(labels))
  check(selectedOf(layers[0]).map(labelOf).join() === "Schedule", "Schedule is not the selected tab")
})

await test("SCH-004", "The scheduling configuration validates", async (check) => {
  check(validateScheduling(SCHEDULING_CONFIG).length === 0, json(validateScheduling(SCHEDULING_CONFIG)))
  const good = {
    provider: "calcom", enabled: true, bookingUrl: SYNTHETIC_LINK, ownerTimeZone: "America/Recife",
    providerSettings: { requiresConfirmation: true, requiresBookerEmailVerification: true, pendingRequestsHoldSlots: true },
    approvedOn: "2027-01-01",
  }
  check(validateScheduling(good).length === 0, json(validateScheduling(good)))
  const bad = (change, what) => check(validateScheduling({ ...good, ...change }).length > 0, `${what} was accepted`)
  bad({ approvedOn: undefined }, "enabling without approvedOn")
  bad({ providerSettings: undefined }, "enabling without provider settings")
  bad({ providerSettings: { ...good.providerSettings, requiresConfirmation: false } }, "enabling without required confirmation")
  bad({ providerSettings: { ...good.providerSettings, requiresBookerEmailVerification: false } }, "enabling without email verification")
  bad({ providerSettings: { ...good.providerSettings, pendingRequestsHoldSlots: false } }, "enabling without pending holds")
  bad({ bookingUrl: undefined }, "enabling without a booking link")
  bad({ approvedOn: "soon" }, "a malformed approval date")
  check(validateScheduling({ ...good, enabled: false }).length === 0, "a switched-off configuration with a link was refused")
})

await test("SCH-005", "The provider identity is explicit", async (check) => {
  check(json(SCHEDULING_PROVIDERS) === json(["calcom"]), json(SCHEDULING_PROVIDERS))
  check(SCHEDULING_CONFIG.provider === "calcom", SCHEDULING_CONFIG.provider)
  check(validateScheduling({ ...SCHEDULING_CONFIG, provider: "calendly" }).some((i) => /unknown provider/.test(i)), "another provider was accepted")
  check(json(BOOKING_HOSTS) === json(["cal.com", "app.cal.com"]) && EMBED_ORIGIN === "https://app.cal.com", "the allowed origins changed")
})

await test("SCH-006", "The unconfigured state is safe: no times, no form, no control, no provider code", async (check) => {
  check(siteScheduling.state === "unconfigured", siteScheduling.state)
  check(json(publicScheduling(SCHEDULING_CONFIG)) === json({ state: "unconfigured", ownerTimeZone: "America/Recife" }), json(publicScheduling(SCHEDULING_CONFIG)))
  const main = mainOf(scheduleHtml)
  const inMain = elements(main)
  check(!inMain.some((el) => ["form", "button", "input", "textarea", "select", "iframe", "script"].includes(el.tag)), "a control or script is on the unconfigured page")
  check(!/data-schedule|app\.cal\.com|embed\.js|cal\.com/.test(scheduleHtml), "the unconfigured page mentions the provider's origin or a schedule widget")
  check(/data-page-state="preparation"/.test(scheduleHtml) && /data-state-notice="preparation"/.test(scheduleHtml), "no preparation notice")
  const text = textOf(main)
  check(/Booking is not set up yet/.test(text) && /no times are shown and no request can be sent/.test(text), "the notice does not say booking is off")
  check(/href="\/contact\/"/.test(scheduleHtml), "no way to Contact")
  const row = coverage(siteNavigation, pageFacts({}, siteRecordViews())).find((r) => r.id === "schedule")
  check(row.state === "preparation" && row.source === "scheduling", json(row))
})

await test("SCH-007", "An invalid booking link is rejected", async (check) => {
  for (const url of [
    "not a url", "http://cal.com/u/e", "https://evil.example.com/u/e", "https://cal.com.evil.net/u/e", "https://cal.com:8443/u/e",
    "https://user:pw@cal.com/u/e", "https://cal.com/u/e?email=a@b.c", "https://cal.com/u/e#frag", "https://cal.com/", "https://cal.com/a/b/c",
    "https://cal.com/u/<script>", "javascript:alert(1)", "https://calendly.com/u/e", "https://app.cal.com.attacker.io/u/e",
  ])
    check(!parseBookingUrl(url).ok, `${url} was accepted`)
  check(validateScheduling({ ...SCHEDULING_CONFIG, bookingUrl: "https://cal.com/example/demo" }).some((i) => /placeholder/.test(i)), "a placeholder user was accepted")
  const ok = parseBookingUrl("https://cal.com/some-person/intro-call/")
  check(ok.ok && ok.value.calLink === "some-person/intro-call" && ok.value.url === "https://cal.com/some-person/intro-call", json(ok))
  check(parseBookingUrl("https://app.cal.com/some-person").ok, "app.cal.com was refused")
})

await test("SCH-008", "No private API credential can enter a client bundle", async (check) => {
  const sources = await Promise.all(["src/data/scheduling.ts", "src/scheduling/config.ts", "src/scheduling/embed.ts", "src/scheduling/copy.ts", "src/scripts/schedule-embed.ts", "src/components/schedule/ScheduleBooking.astro"].map(read))
  check(sources.every((s) => !/process\.env|import\.meta\.env|apiKey|api_key|API_KEY|Bearer |cal_(live|test)_|secret|token/i.test(s.replace(/\/\*[\s\S]*?\*\//g, ""))), "a source reads an environment variable or names a credential")
  for (const [name, text] of [...releaseText, ...readyText])
    if (/\.(html|js)$/.test(name)) check(!/cal_(live|test)_[A-Za-z0-9]|Bearer [A-Za-z0-9]|api[_-]?key["']?\s*[:=]/i.test(text), `${name} carries a credential-looking string`)
  const viewKeys = Object.keys(publicScheduling(JSON.parse(JSON.stringify({ ...SCHEDULING_CONFIG, enabled: true, bookingUrl: SYNTHETIC_LINK, approvedOn: "2027-01-01", availabilitySourcePath: "env:SECRET_PATH", providerSettings: { requiresConfirmation: true, requiresBookerEmailVerification: true, pendingRequestsHoldSlots: true } }))))
  check(json(viewKeys) === json(["state", "ownerTimeZone", "bookingUrl", "embed"]), json(viewKeys))
  check(!/PUBLIC_[A-Z_]*(CAL|SCHEDUL|BOOKING|AVAIL)/.test(await read("src/data/scheduling.ts")), "a PUBLIC_ variable is named for scheduling")
})

await test("SCH-009", "The availability-source path can be configured, and is never public", async (check) => {
  for (const ok of ["repo:data/availability.yaml", "repo:owner/availability.json", "env:GUSMAOLAB_AVAILABILITY_FILE"]) check(validateSourceReference(ok).length === 0, `${ok}: ${json(validateSourceReference(ok))}`)
  for (const bad of ["/Users/someone/availability.yaml", "C:\\x\\a.yaml", "repo:../outside.yaml", "repo:/abs.yaml", "repo:public/availability.yaml", "repo:dist/a.yaml", "repo:cv/CV.yaml", "repo:src/pages/a.yaml", "env:lowercase", "env:PUBLIC_AVAILABILITY", "env:VITE_PATH", "availability.yaml", "repo:", "repo:a/../b"])
    check(validateSourceReference(bad).length > 0, `${bad} was accepted`)
  check(parseSourceReference("env:A_B").kind === "env" && parseSourceReference("repo:x/y.yaml").path === "x/y.yaml", "parsing")
  check(validateScheduling({ ...SCHEDULING_CONFIG, availabilitySourcePath: "env:GUSMAOLAB_AVAILABILITY_FILE" }).length === 0, "the configuration refused a valid source")
  check(validateScheduling({ ...SCHEDULING_CONFIG, availabilitySourcePath: "/abs/path" }).some((i) => /availabilitySourcePath/.test(i)), "the configuration accepted an absolute path")
  // The path stays out of the page, the script and the public view.
  for (const [name, text] of readyText) check(!/GUSMAOLAB_AVAILABILITY_FILE/.test(text), `${name} contains the availability path`)
})

await test("SCH-010", "A missing future availability file is reported honestly, and nothing is invented", async (check) => {
  check(describeSource(undefined).status === "not-configured", "not configured")
  check(describeSource("repo:data/availability.yaml", { fileExists: false }).status === "missing", "missing repo file")
  check(describeSource("env:X_PATH", { variableSet: false, fileExists: false }).status === "missing" && /not set/.test(describeSource("env:X_PATH", { variableSet: false, fileExists: false }).message), "unset variable")
  check(describeSource("repo:data/availability.yaml", { fileExists: true }).status === "present-no-adapter", "a present file with no adapter")
  const plan = planSync(undefined)
  check(plan.applied === false && plan.dryRun === true && /no adapter/.test(plan.reason), json(plan))
  const out = report(SCHEDULING_CONFIG, { env: {} })
  check(out.ok && /not-configured/.test(out.lines.join("\n")) && /no adapter/i.test(out.lines.join("\n")), out.lines.join(" | "))
  const withEnv = report({ ...SCHEDULING_CONFIG, availabilitySourcePath: "env:GUSMAOLAB_AVAILABILITY_FILE" }, { env: {} })
  check(/missing/.test(withEnv.lines.join("\n")), withEnv.lines.join(" | "))
  check(probeSource("repo:data/definitely-absent.yaml").fileExists === false, "probe found a file that does not exist")
  const cli = spawnSync(process.execPath, [join(repo, "scripts/scheduling.mjs")], { encoding: "utf8" })
  check(cli.status === 0 && /state:\s+unconfigured/.test(cli.stdout), `scheduling:check: ${cli.status} ${cli.stdout}${cli.stderr}`)
})

await test("SCH-011", "No real availability is generated or invented", async (check) => {
  const src = await Promise.all(["src/data/scheduling.ts", "src/scheduling/config.ts", "src/scheduling/availability.ts", "src/components/schedule/ScheduleBooking.astro"].map(read))
  const code = src.map((s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")).join("\n")
  check(!/\b(monday|tuesday|wednesday|thursday|friday|workingHours|weeklyHours|slotsPerDay|bufferMinutes|durationMinutes|meetingLength)\b/i.test(code), "scheduling code names a weekday, hours or a meeting length")
  check(json(Object.keys(SCHEDULING_CONFIG).sort()) === json(["enabled", "ownerTimeZone", "provider"]), `the configuration holds ${json(Object.keys(SCHEDULING_CONFIG))}`)
  for (const [name, html] of [["release", scheduleHtml], ["ready", readyHtml]]) {
    const text = textOf(mainOf(html))
    check(!/\b\d{1,2}:\d{2}\b/.test(text) && !/\b(Mon|Tues|Wednes|Thurs|Fri)day\b/.test(text), `the ${name} Schedule page shows a time or a weekday`)
  }
  check(!/availability\.(ya?ml|json|csv)/i.test(scheduleHtml + readyHtml), "a page names an availability file")
})

await test("SCH-012", "The owner time zone is explicit and valid", async (check) => {
  check(DEFAULT_OWNER_TIME_ZONE === "America/Recife" && SCHEDULING_CONFIG.ownerTimeZone === "America/Recife", SCHEDULING_CONFIG.ownerTimeZone)
  check(isValidTimeZone("America/Recife"), "America/Recife is not valid here")
  for (const bad of ["UTC-3", "GMT-3", "Recife", "", " America/Recife", "America/NotAPlace", "-03:00"]) check(!isValidTimeZone(bad), `${bad} was accepted`)
  check(validateScheduling({ ...SCHEDULING_CONFIG, ownerTimeZone: "UTC-3" }).some((i) => /ownerTimeZone/.test(i)), "a fixed offset was accepted")
})

// --- Provider integration (the loader, against a stand-in browser) -----------------------------------------------

function fakeBrowser({ script = "load", events = [] } = {}) {
  const log = { scripts: [], timers: [], cleared: [], calls: [] }
  const win = {}
  const container = { id: "frame" }
  const host = {
    win,
    container,
    loadScript(src, onLoad, onError) {
      log.scripts.push(src)
      if (script === "error") onError()
      if (script === "load") {
        onLoad()
        // The provider's script drains the queue: replay the calls and fire the requested events.
        for (const call of win.Cal.q) log.calls.push(Array.from(call))
        for (const event of events)
          for (const call of win.Cal.q)
            if (call[0] === "on" && call[1].action === event) call[1].callback()
      }
    },
    setTimer(callback, ms) {
      log.timers.push({ callback, ms })
      return log.timers.length
    },
    clearTimer(handle) {
      log.cleared.push(handle)
    },
  }
  return { host, log, win, container }
}
const statusesOf = (view, options) => {
  const b = fakeBrowser(options)
  const seen = []
  startBooking(b.host, view, (s) => seen.push(s))
  return { b, seen }
}
const readyView = publicScheduling({
  provider: "calcom", enabled: true, bookingUrl: SYNTHETIC_LINK, ownerTimeZone: "America/Recife",
  providerSettings: { requiresConfirmation: true, requiresBookerEmailVerification: true, pendingRequestsHoldSlots: true }, approvedOn: "2027-01-01",
})

await test("SCH-013", "The loader asks the provider for the monthly view (configuration only: the provider is untested)", async (check) => {
  const { b, seen } = statusesOf(readyView, { events: ["linkReady"] })
  const inline = b.log.calls.find((c) => c[0] === "inline")
  check(inline !== undefined && inline[1].config.layout === "month_view" && EMBED_LAYOUT === "month_view", json(inline))
  check(inline[1].calLink === "synthetic-test-user/synthetic-meeting" && inline[1].elementOrSelector === b.container, "the inline call is not for the configured link and frame")
  check(b.log.calls.some((c) => c[0] === "init" && c[1].origin === EMBED_ORIGIN), "init did not name the one origin")
  check(!b.log.calls.some((c) => c[0] === "inline" && /prefill|name|email/i.test(json(c[1].config))), "the loader prefills a visitor field")
  check(json(seen) === json(["loading", "ready"]), json(seen))
  check(json(b.log.scripts) === json([EMBED_SCRIPT]), json(b.log.scripts))
})
block("SCH-013B", "The provider's monthly view loads and shows real availability")
block("SCH-014", "The booking interface works within the Schedule layout (live provider)")

await test("SCH-015", "The hosted-page fallback is the configured link (wiring only: the link itself is unverified)", async (check) => {
  const hrefs = [...readyHtml.matchAll(/data-schedule-fallback[^>]*>\s*<a href="([^"]+)"/g)].map((m) => m[1])
  check(json(hrefs) === json([SYNTHETIC_LINK]), json(hrefs))
  check(!/data-schedule-fallback/.test(scheduleHtml), "the unconfigured page offers a fallback link")
})
block("SCH-015B", "The configured booking link opens a real, working provider page")

await test("SCH-016", "The provider's script loads only on Schedule", async (check) => {
  check(ready.ok, ready.output.slice(-400))
  const holders = [...readyText].filter(([n, t]) => /app\.cal\.com|embed\/embed\.js/.test(t)).map(([n]) => n)
  check(json(holders) === json([schedulePath]), `provider origin found in ${json(holders)}`)
  const pages = [...readyText.keys()].filter((n) => n.endsWith(".html") && n !== schedulePath)
  check(pages.length >= 36 && pages.every((n) => !/data-schedule|app\.cal\.com/.test(readyText.get(n))), "another page carries scheduling code")
  check(!/data-schedule|app\.cal\.com/.test(readyText.get("index.html") ?? "x"), "Home carries scheduling code")
  check([...releaseText].every(([n, t]) => !/app\.cal\.com/.test(t)), "the unconfigured release build names the provider's origin")
})

await test("SCH-017", "A failed, blocked, slow or refused provider becomes 'failed', never an empty box", async (check) => {
  check(json(statusesOf(readyView, { script: "error" }).seen) === json(["loading", "failed"]), "a script error")
  const slow = statusesOf(readyView, { script: "hang" })
  check(json(slow.seen) === json(["loading"]) && slow.b.log.timers.length === 1 && slow.b.log.timers[0].ms === BOOKING_TIMEOUT_MS, "the timeout was not set")
  slow.b.log.timers[0].callback()
  check(json(slow.seen) === json(["loading", "failed"]), "the timeout did not fail the load")
  check(json(statusesOf(readyView, { events: ["linkFailed"] }).seen) === json(["loading", "failed"]), "linkFailed")
  const twice = statusesOf(readyView, { events: ["linkReady", "linkFailed"] })
  check(json(twice.seen) === json(["loading", "ready"]), `a late failure changed the outcome: ${json(twice.seen)}`)
  for (const tampered of [
    { ...readyView, embed: { ...readyView.embed, script: "https://evil.example/embed.js" } },
    { ...readyView, embed: { ...readyView.embed, origin: "https://evil.example" } },
    { ...readyView, embed: { ...readyView.embed, calLink: "a/b/c" } },
    { ...readyView, embed: { ...readyView.embed, calLink: "u/<x>" } },
    { state: "unconfigured", ownerTimeZone: "America/Recife" },
    { ...readyView, state: "disabled" },
  ]) {
    const out = statusesOf(tampered)
    check(json(out.seen) === json(["failed"]) && out.b.log.scripts.length === 0 && embedIsAllowed(tampered) === false, `a refused view loaded ${json(out.b.log.scripts)}`)
  }
  check(/fallback/.test(readyHtml) && /href="https:\/\/cal\.com\/synthetic-test-user\/synthetic-meeting"/.test(readyHtml), "the static fallback link is missing")
  check(COPY.failed.length > 80 && /booking page/.test(COPY.failed) && /Contact/.test(COPY.failed), COPY.failed)
})

await test("SCH-018", "Nothing in the page's script touches navigation or the clocks (structure)", async (check) => {
  const code = (await read("src/scripts/schedule-embed.ts")) + (await read("src/scheduling/embed.ts"))
  check(!/document\.(body|documentElement)|querySelectorAll?\(["'](nav|\.gl-|\[data-tab)/.test(code.replace(/\/\*[\s\S]*?\*\//g, "")), "the scheduling script reaches into the folders or the page")
  check(!/history\.|location\.|pushState|preventDefault|stopPropagation/.test(code.replace(/\/\*[\s\S]*?\*\//g, "")), "the scheduling script changes the URL or cancels events")
  check([...readyText].filter(([n, t]) => n.endsWith(".html") && n !== schedulePath).every(([n, t]) => !/Cal\("/.test(t)), "another page calls the provider")
})

await test("SCH-019", "Third-party resources follow the narrow policy: one provider origin, no other", async (check) => {
  const external = (text) => new Set([...text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1].toLowerCase()))
  const IGNORED = new Set(["www.w3.org", "www.gusmaolab.org", "gusmaolab.org", "127.0.0.1", "localhost"])
  const hosts = new Set([...external(readyHtml)].filter((h) => !IGNORED.has(h) && !/^(three\.js|threejs\.org|github\.com|doi\.org)/.test(h)))
  for (const host of hosts) check(["cal.com", "app.cal.com"].includes(host), `the ready Schedule page reaches ${host}`)
  check(/https:\/\/cal\.com\/privacy/.test(readyHtml) && /rel="noopener"/.test(readyHtml), "the privacy link is missing or unprotected")
  check(!/<(script|link|img|iframe)\b[^>]*(src|href)="https?:\/\/(?!cal\.com)/i.test(readyHtml), "a resource tag loads from another origin")
  check(!/<iframe/i.test(readyHtml) && !/<script[^>]+src="https?:/i.test(readyHtml), "the page includes a frame or a remote script before the visitor presses the button")
  check((await read("src/scheduling/config.ts")).includes('EMBED_ORIGIN = "https://app.cal.com"'), "the origin constant changed")
  // No Content-Security-Policy is deployed: GitHub Pages cannot send response headers, and a <meta> policy could not carry frame rules. Say so, rather than imply one.
  check(!/Content-Security-Policy/i.test(readyHtml), "a CSP meta appeared without a recorded decision")
})

await test("SCH-020", "The public site works with the provider offline (static behaviour)", async (check) => {
  for (const [name, html] of [["release", scheduleHtml], ["ready", readyHtml]]) {
    check(/<h1[^>]*>Schedule<\/h1>/.test(html) && /href="\/contact\/"/.test(html), `the ${name} page is not readable without the provider`)
    check(!/<(script|link)[^>]+src="https?:/i.test(html), `the ${name} page needs a remote resource to render`)
  }
  check(/data-schedule-fallback/.test(readyHtml) && /<noscript|data-schedule-load/.test(readyHtml), "the ready page has no way forward without the script's help")
})

// --- Booking lifecycle: blocked, not passed ---------------------------------------------------------------------

for (const [id, title] of [
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
])
  block(id, title)

await test("SCH-024S", "The configuration cannot be enabled unless pending requests hold their slot and confirmation is required (the owner's attestation, not a test of the provider)", async (check) => {
  check(validateScheduling({ ...SCHEDULING_CONFIG, enabled: true, bookingUrl: SYNTHETIC_LINK, approvedOn: "2027-01-01" }).length >= 1, "enabled without settings")
  check(/Requests are reviewed before confirmation/.test(COPY.intro) && /not a confirmed meeting/.test(COPY.lifecycle.join(" ")), "the workflow words lost the pending rule")
})

// --- Time zones (the standard library over fixed instants) ---------------------------------------------------------

await test("SCH-036", "The owner time zone is America/Recife and carries no fixed offset", async (check) => {
  check(siteScheduling.ownerTimeZone === "America/Recife", siteScheduling.ownerTimeZone)
  const src = await read("src/scheduling/time.ts")
  check(!/UTC[-+]?\d|[-+]03:?00|\*\s*60\s*\*\s*60|setUTCHours|getTimezoneOffset|3\s*\*\s*60/.test(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")), "time.ts does arithmetic on an offset")
  for (const instant of ["2027-01-06T12:00:00Z", "2027-07-06T12:00:00Z", "2027-12-31T23:30:00Z"]) check(offsetMinutes(instant, "America/Recife") === -180, `Recife offset at ${instant}: ${offsetMinutes(instant, "America/Recife")}`)
})

await test("SCH-037", "The visitor's time zone is stated clearly, and distinguished from the owner's", async (check) => {
  const text = textOf(mainOf(readyHtml)).replace(/\s+/g, " ")
  check(/your own time zone/.test(text) && /owner's calendar is kept in America\/Recife/.test(text), text.slice(0, 400))
  check(describeSlot("2027-01-06T12:00:00Z", "Europe/Lisbon").includes("(Europe/Lisbon)"), "a slot line does not name its zone")
})

await test("SCH-038", "Conversions of one instant are exact in six zones", async (check) => {
  const at = "2027-01-06T12:00:00Z"
  const expect = { "America/Recife": ["2027-01-06", "09:00"], "Europe/Lisbon": ["2027-01-06", "12:00"], "America/New_York": ["2027-01-06", "07:00"], "America/Los_Angeles": ["2027-01-06", "04:00"], "Asia/Tokyo": ["2027-01-06", "21:00"], "Pacific/Auckland": ["2027-01-07", "01:00"] }
  for (const { zone } of SIM_ZONES) {
    const z = inZone(at, zone)
    check(json([z.date, z.time]) === json(expect[zone]), `${zone}: ${z.date} ${z.time}`)
  }
  check(json(Object.keys(expect).sort()) === json(SIM_ZONES.map((z) => z.zone).sort()), "the specimen's zones changed")
})

await test("SCH-039", "A date boundary moves the day, not the instant", async (check) => {
  const a = inZone("2027-01-06T12:00:00Z", "Pacific/Auckland")
  check(a.date === "2027-01-07" && a.time === "01:00" && a.weekday === 4, json(a))
  const b = inZone("2027-01-06T02:59:00Z", "America/Recife")
  const c = inZone("2027-01-06T03:00:00Z", "America/Recife")
  check(b.date === "2027-01-05" && b.time === "23:59" && c.date === "2027-01-06" && c.time === "00:00", `${b.date} ${b.time} / ${c.date} ${c.time}`)
})

await test("SCH-040", "A year boundary is handled", async (check) => {
  const at = "2026-12-31T23:30:00Z"
  const rows = { "America/Recife": ["2026-12-31", "20:30"], "Asia/Tokyo": ["2027-01-01", "08:30"], "Pacific/Auckland": ["2027-01-01", "12:30"], "America/Los_Angeles": ["2026-12-31", "15:30"] }
  for (const [zone, want] of Object.entries(rows)) check(json([inZone(at, zone).date, inZone(at, zone).time]) === json(want), `${zone}: ${json([inZone(at, zone).date, inZone(at, zone).time])}`)
})

await test("SCH-041", "DST transitions are applied by the tz database, with no fixed offset", async (check) => {
  check(inZone("2027-03-14T06:59:00Z", "America/New_York").time === "01:59" && offsetMinutes("2027-03-14T06:59:00Z", "America/New_York") === -300, "New York before spring-forward")
  check(inZone("2027-03-14T07:00:00Z", "America/New_York").time === "03:00" && offsetMinutes("2027-03-14T07:00:00Z", "America/New_York") === -240, "New York after spring-forward (the 02:00 hour does not exist)")
  check(offsetMinutes("2027-03-28T00:59:00Z", "Europe/Lisbon") === 0 && offsetMinutes("2027-03-28T01:00:00Z", "Europe/Lisbon") === 60, "Lisbon at its 2027 clock change")
  check(offsetMinutes("2027-11-07T05:59:00Z", "America/New_York") === -240 && offsetMinutes("2027-11-07T06:00:00Z", "America/New_York") === -300, "New York fall-back")
  check(offsetMinutes("2027-01-15T12:00:00Z", "America/Recife") === offsetMinutes("2027-07-15T12:00:00Z", "America/Recife"), "Recife observes no DST")
  let threw = false
  try { inZone("2027-01-01T00:00:00Z", "UTC-3") } catch { threw = true }
  check(threw, "a fixed-offset name was accepted by inZone")
})

block("SCH-042", "The provider offers no past slots (provider behaviour)")

await test("SCH-042S", "The specimen's synthetic month marks past dates unavailable from a fixed instant, not the clock", async (check) => {
  const days = simMonth()
  check(days.filter((d) => d.date <= SIM_NOW.slice(0, 10)).every((d) => d.status === "past"), "a past date is not marked past")
  check(days.filter((d) => d.status === "available").every((d) => d.date > SIM_NOW.slice(0, 10) && d.weekday >= 1 && d.weekday <= 5), "an available date is a weekend or in the past")
  check(json(simSlots("2027-01-06")) === json(["2027-01-06T12:00:00Z", "2027-01-06T13:30:00Z", "2027-01-06T17:00:00Z"]), "the slot instants changed")
})

await test("SCH-043", "Local and owner time-zone labels are not confused", async (check) => {
  const slots = simSlots("2027-01-06").map((s) => [describeSlot(s, "America/Recife"), describeSlot(s, "Pacific/Auckland")])
  for (const [recife, auckland] of slots) check(recife !== auckland && /America\/Recife/.test(recife) && /Pacific\/Auckland/.test(auckland), `${recife} / ${auckland}`)
  check(COPY.timezone("America/Recife").includes("your own time zone") && COPY.timezone("America/Recife").includes("owner's calendar"), COPY.timezone("America/Recife"))
})

// --- Copy, labelling, privacy, tracking ----------------------------------------------------------------------

await test("SCH-049", "The pending-approval copy is accurate: a request never sounds confirmed", async (check) => {
  const norm = (s) => s.replace(/not a confirmed meeting/gi, "").replace(/No meeting is scheduled/gi, "").replace(/before it is confirmed/gi, "")
  const spoken = [COPY.intro, ...COPY.lifecycle, COPY.status.verification.text, COPY.status.pending.text, COPY.status.declined.text, COPY.status.unavailable.text, COPY.loadNote, COPY.disclosure]
  for (const s of spoken) check(!/\b(confirmed|booked|scheduled|accepted|approved)\b/i.test(norm(s)), `"${s}" sounds confirmed`)
  check(/awaiting confirmation/.test(COPY.status.pending.text) && /not a confirmed meeting/.test(COPY.status.pending.text), COPY.status.pending.text)
  check(!/within \d|hours|days|24|48|guarantee|immediately|instant/i.test(spoken.join(" ")), "the copy promises a response time or approval")
  check(/reviewed before confirmation/.test(COPY.intro), COPY.intro)
  const page = visibleTextOf(mainOf(readyHtml)).replace(/\s+/g, " ")
  check(!/Your meeting is confirmed|Meeting confirmed|has confirmed the meeting/.test(page), "the ready page says a meeting is confirmed")
  check(!/Meeting confirmed|Request declined|Request submitted/.test(readyHtml), "the ready page's script carries the specimen's request states")
  check(/Meeting confirmed/.test(COPY.status.confirmed.title) && /provider|scheduling service/.test(COPY.status.confirmed.text), "the confirmed state does not credit the provider")
})

await test("SCH-051", "Synthetic fixtures and the specimen stay out of production", async (check) => {
  const holdIssues = await publicBuildIssues(dist)
  check(holdIssues.length === 0, `the release build holds a demonstration: ${json(holdIssues).slice(0, 300)}`)
  for (const marker of ["data-scheduling-specimen", "data-sim-calendar", "scheduling-fixture", "Scheduling Integration", "no real booking will be created"])
    check(MARKERS.includes(marker), `the marker ${marker} is not searched for`)
  for (const [name, text] of releaseText) check(!/data-scheduling-specimen|data-sim-|synthetic-test-user|Schedule \(specimen\)|Development demonstration: no real booking/.test(text), `${name} holds a scheduling demonstration or synthetic link`)
  // The throwaway ready build holds the synthetic link by design, and still no specimen.
  for (const [name, text] of readyText) check(!/data-scheduling-specimen|data-sim-|Schedule \(specimen\)|Development demonstration: no real booking/.test(text), `${name} (ready build) holds a scheduling demonstration`)
  check(!releaseText.has("_design/scheduling/index.html"), "the specimen page is in the release build")
  check(!/design\/scheduling-fixture/.test(await read("src/data/scheduling.ts")) && !/scheduling-fixture/.test(await read("src/components/schedule/ScheduleBooking.astro")), "production code imports the fixture")
  check(DEV_PAGES.some((p) => p.href === SCHEDULING_PAGE && p.label === "Scheduling Integration"), "the specimen is not listed with the development pages")
})

await test("SCH-052", "No visitor personal information is committed, collected or stored", async (check) => {
  const tracked = lines(git("ls-files"))
  check(!tracked.some((f) => /(^|\/)(bookings?|booking-requests?|attendees?|appointments?)(\/|\.|-)/i.test(f) && !/^(tests|development|planning|debugging)\//.test(f) && f !== "src/data/records/appointments.ts"), "a bookings-like file is tracked")
  const code = (await Promise.all(["src/scheduling/embed.ts", "src/scripts/schedule-embed.ts", "src/scripts/scheduling-specimen.ts"].map(read))).join("\n").replace(/\/\*[\s\S]*?\*\//g, "")
  check(!/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest|sendBeacon|FormData/.test(code), "scheduling code stores or sends data")
  for (const html of [readyHtml, scheduleHtml]) check(!/<(form|input|textarea)\b/.test(html), "the page collects a field itself")
  check(!/prefill|[?&](name|email|guests?)=/i.test(readyHtml.replace(/data-schedule-config="[^"]*"/, "")), "the ready page prefills a visitor field")
})

await test("SCH-053", "No provider credential is publicly bundled", async (check) => {
  for (const [name, text] of [...releaseText, ...readyText]) check(!/cal_(live|test)_[A-Za-z0-9]{6}|Authorization|x-cal-secret|CAL_API|CALCOM_API/i.test(text), `${name} holds a credential-like string`)
  check(!(await read("package.json")).match(/@calcom|cal-?com/i), "a Cal.com package was added")
})

await test("SCH-054", "Booking scripts do not load globally", async (check) => {
  check([...releaseText].every(([n, t]) => !/Cal\(|embed\.js|data-schedule-load/.test(t)), "the release build holds provider code")
  const pages = [...readyText].filter(([n]) => n.endsWith(".html") && n !== schedulePath)
  check(pages.every(([n, t]) => !/Cal\(|embed\.js|data-schedule-load/.test(t)), "a page other than Schedule holds provider code")
  const home = readyText.get("index.html") ?? ""
  check(!/Cal\(|embed\.js/.test(home), "Home holds provider code")
  check(!/schedule-embed|ScheduleEmbed/.test(await read("src/layouts/BaseLayout.astro")) && !/schedule-embed|ScheduleEmbed/.test(await read("src/layouts/FolderPage.astro")), "a layout imports the scheduling script")
  check(/Cal\(/.test(readyHtml) || /embed/.test(readyHtml), "the ready page does not contain the booking logic at all")
})

await test("SCH-055", "No analytics or tracking SDK is introduced", async (check) => {
  const pkg = gitAvailable ? git("show", `${BASE}:package.json`).stdout : ""
  // P22 (D-154) added axe-core, a test-only accessibility checker, pinned exactly; nothing else may differ.
  const deps = (text) => json([JSON.parse(text).dependencies, Object.fromEntries(Object.entries(JSON.parse(text).devDependencies).filter(([k]) => k !== "axe-core"))])
  check(pkg === "" || deps(await read("package.json")) === deps(pkg), "the dependencies changed since the P21 start")
  const lockNames = Object.keys(JSON.parse(await read("package-lock.json")).packages)
  check(!lockNames.some((n) => /analytics|gtag|plausible|segment|hotjar|mixpanel|posthog|umami|sentry/i.test(n)), "the lockfile holds an analytics or tracking package")
  for (const [name, text] of [...releaseText, ...readyText]) check(!/google-analytics|gtag\(|googletagmanager|plausible\.io|segment\.com|hotjar|fbq\(|mixpanel|posthog|umami/i.test(text), `${name} contains a tracking SDK`)
})

// --- Regression: nothing outside scheduling moved -------------------------------------------------------------------

// The world clocks' short date (D-158, owner-approved in P22-A01) is the one change since P21 to these files, and tests/approved-changes.mjs names its files.
const unchanged = (id, title, paths) =>
  test(id, title, async (check) => {
    const touched = withoutApproved(changedSinceBase(paths))
    check(touched.length === 0, `P21 changed ${json(touched)}`)
  })

await unchanged("SCH-056", "The P15 homepage is unchanged", ["src/pages/index.astro", "src/components/home/", "src/home/archive.ts", "src/home/updates.ts", "src/styles/home.css"])
await unchanged("SCH-057", "The P16 world clocks are unchanged", ["src/home/clocks.ts", "src/home/clock-time.ts", "src/home/clock-loop.ts", "src/scripts/world-clocks.ts"])
// P22 added one <h1> to the development specimen's page (axe-core found it had none); the nucleus, its model and its mount are untouched.
await test("SCH-058", "The P19 nucleus is unchanged", async (check) => {
  const touched = changedSinceBase(["src/visualization/", "src/components/scientific/", "src/pages/[design]/nucleus/"]).filter((f) => f !== "src/pages/[design]/nucleus/index.astro")
  check(touched.length === 0, `changed ${json(touched)}`)
})
await unchanged("SCH-059", "The P20 homepage integration is unchanged", ["src/scripts/home-nucleus.ts", "src/home/nucleus-navigation.ts", "src/components/home/NucleusStage.astro"])
await unchanged("SCH-060", "The Home-only sticky tabs are unchanged", ["src/styles/home-tabs.css"])

await test("SCH-061", "D-144, with its two accepted trade-offs, is unchanged and not reopened", async (check) => {
  const now = await read("development/decisions.md")
  const paragraph = (text) => /\*\*D-144\.\*\*[\s\S]*?(?=\n\n|$)/.exec(text)?.[0].trim()
  const was = gitAvailable ? paragraph(git("show", `${BASE}:development/decisions.md`).stdout) : undefined
  check(was !== undefined && paragraph(now) === was, "the D-144 paragraph differs from the one P21 began with")
  check(/1 px/.test(was ?? "") && /z-index/.test(was ?? ""), "D-144 no longer names both costs")
  check(changedSinceBase(["tests/home-browser.mjs"]).length === 0, "the HOME-026 exemption was edited")
  // tests/clocks-browser.mjs gained checks for the short date (D-158); CLOCK-033B's exemption lines are what must not move.
  const exemption = (text) => text.split("\n").filter((l) => /gl-home-tabs-raise|Except the scroll-driven z-index raise/.test(l))
  const clocksThen = gitAvailable ? exemption(git("show", `${BASE}:tests/clocks-browser.mjs`).stdout) : undefined
  check(clocksThen !== undefined && clocksThen.length >= 2 && json(exemption(await read("tests/clocks-browser.mjs"))) === json(clocksThen), "the CLOCK-033B exemption was edited")
})

await unchanged("SCH-062", "The P07 previews are unchanged", ["src/scripts/folder-previews.ts", "src/scripts/folder-rows.ts"])
await unchanged("SCH-063", "The physical-folder geometry is unchanged", ["src/components/folders/", "src/styles/folders.css", "src/styles/view-transitions.css", "src/layouts/"])
await unchanged("SCH-064", "The five Chromatic Archive palettes are unchanged", ["src/styles/categories.css", "src/styles/tokens.css", "src/styles/environments.css", "src/design/contract.mjs"])
await unchanged("SCH-065", "The eleven tabs and the navigation registry are unchanged", ["src/navigation/"])
// P22 (D-157) moved the Quarto study's figure out of public/: one path in scripts/science.mjs and the same one in the manifest.
await test("SCH-066", "The P10-P14 editorial publishing is unchanged", async (check) => {
  const touched = changedSinceBase(["src/editorial/", "src/content.config.ts", "src/content/", "src/science/", "science/", "scripts/science.mjs", "scripts/content.mjs", "scripts/content-lib.mjs"]).filter((f) => !["scripts/science.mjs", "src/science/manifest.json"].includes(f))
  check(touched.length === 0, `changed ${json(touched)}`)
})

await test("SCH-067", "P17 page coverage remains intact, with Schedule now a scheduling page", async (check) => {
  const rows = coverage(siteNavigation, pageFacts({}, siteRecordViews()))
  check(rows.length === 36, `${rows.length} rows`)
  check(rows.filter((r) => r.source === "planned").every((r) => r.state === "preparation"), "a planned row is not in preparation")
  check(rows.find((r) => r.id === "schedule").source === "scheduling", "Schedule is not a scheduling destination")
  const lit = coverage(siteNavigation, { editorial: {}, records: {}, scheduling: true }).find((r) => r.id === "schedule")
  check(lit.state === "ready", "a configured booking link does not make the page ready")
  check(/data-page-state="(ready)"/.test(readyHtml) && !/data-page-state="preparation"/.test(readyHtml.slice(readyHtml.indexOf("<main"))), "the ready build's Schedule page is not ready")
})

await unchanged("SCH-068", "P18 Contact, Downloads and the 404 page are unchanged", ["src/contact/", "src/data/contact.ts", "src/downloads/", "src/data/downloads.ts", "src/pages/404.astro", "src/layouts/ErrorPage.astro", "src/components/errors/", "src/components/contact/", "src/components/downloads/", "public/downloads/"])
await unchanged("SCH-069", "The CV source-of-truth files are untouched", ["cv/", "src/cv/", "src/data/cv/"])
await unchanged("SCH-070", "No Bearnard asset is modified", ["brand/", "assets/bearnard/", "public/illustrations/", "src/illustrations/", "scripts/bearnard_derivatives.py"])

await ready.cleanup()

// --- Report ---------------------------------------------------------------------------------------------------------

let failed = 0
for (const { id, title, failures } of results) {
  if (failures.length === 0) console.log(`PASS ${id} ${title}`)
  else {
    failed++
    console.log(`FAIL ${id} ${title}`)
    for (const message of failures.slice(0, 8)) console.log(`  - ${message}`)
  }
}
for (const { id, title } of blocked) console.log(`BLOCKED ${id} ${title} (${BLOCKED_REASON})`)
console.log(
  failed === 0
    ? `\n${results.length} checks passed; ${blocked.length} operational checks BLOCKED (not passed).`
    : `\n${failed} of ${results.length} checks failed; ${blocked.length} operational checks BLOCKED.`,
)
process.exit(failed === 0 ? 0 : 1)
