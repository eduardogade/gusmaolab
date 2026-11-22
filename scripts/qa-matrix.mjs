// The P22 acceptance items (QA-001 to QA-082) and what evidence each one rests on (D-153). A reference is
// `stage:<id>` (a stage of the QA run), `suite:<id>` (a test suite), `check:<ID>` (one check, from a
// suite or an audit) or `deferred:<prefix>` (approved deferrals). The report derives every item's
// status from the results of the run; none is typed in. An item whose evidence was not part of the
// selected profile is SKIPPED, one whose evidence should have run and did not is NOT RUN.
//
// Where a reference is a whole suite, the item rests on that suite passing: the item says "this is
// covered by that suite", not that the suite has one check named after it.

export const MATRIX = [
  ["QA-001", "Production build succeeds", ["stage:build"]],
  ["QA-002", "Astro diagnostics succeed", ["stage:diagnostics"]],
  ["QA-003", "Dependencies resolve from the lockfile", ["check:QA-ENV-03"]],
  ["QA-004", "Generated route inventory is valid", ["check:QA-ROUTE-02", "check:QA-ROUTE-03"]],
  ["QA-005", "Required folder destinations exist", ["check:QA-ROUTE-01", "check:SITE-001", "check:SITE-003"]],
  ["QA-006", "Published article routes exist", ["check:QA-ROUTE-05"]],
  ["QA-007", "Draft routes are excluded", ["check:QA-ROUTE-05"]],
  ["QA-008", "Development-only routes are excluded", ["check:QA-OUT-07", "check:QA-ROUTE-07"]],
  ["QA-009", "Internal links resolve", ["check:QA-LINK-01"]],
  ["QA-010", "Canonical URL conventions are valid", ["check:QA-META-09"]],
  ["QA-011", "Custom 404 output exists", ["check:QA-ROUTE-01", "suite:util"]],
  ["QA-012", "Approved downloads resolve", ["check:QA-ROUTE-06"]],
  ["QA-013", "Required metadata is present", ["check:QA-META-01", "check:QA-META-02", "check:QA-META-07"]],
  ["QA-014", "Titles are valid", ["check:QA-META-02", "check:QA-META-03"]],
  ["QA-015", "Descriptions are valid", ["check:QA-META-04"]],
  ["QA-016", "Publication dates are valid", ["suite:content"]],
  ["QA-017", "Duplicate article slugs are rejected", ["suite:content"]],
  ["QA-018", "Related-entry references resolve", ["suite:content", "suite:records"]],
  ["QA-019", "Generated Quarto registration metadata remains valid", ["suite:science"]],
  ["QA-020", "Quarto artifact freshness is validated", ["stage:build", "suite:science"]],
  ["QA-021", "Public pages have appropriate metadata", ["check:QA-META-01", "check:QA-META-02", "check:QA-META-04", "check:QA-META-05", "check:QA-META-07"]],
  ["QA-022", "Canonical URLs do not conflict", ["check:QA-META-09"]],
  ["QA-023", "Synthetic content is excluded from ordinary production", ["check:QA-OUT-07", "check:QA-ROUTE-05"]],
  ["QA-024", "Representative pages pass the automated accessibility checks", ["suite:a11y-browser"]],
  ["QA-025", "Primary navigation remains keyboard accessible", ["suite:previews-browser", "check:A11Y-KEYBOARD"]],
  ["QA-026", "Focus indicators are visible", ["check:A11Y-FOCUS"]],
  ["QA-027", "Informative images have appropriate alternatives", ["check:QA-IMG-02"]],
  ["QA-028", "Required form controls have accessible names", ["check:A11Y-001"]],
  ["QA-029", "Heading structures are valid", ["check:QA-META-05", "check:QA-META-06"]],
  ["QA-030", "Color contrast issues are reported", ["suite:contrast", "check:A11Y-001"]],
  ["QA-031", "Reduced-motion behavior remains intact", ["check:NUC-018B", "check:A11Y-MOTION"]],
  ["QA-032", "Nucleus fallback remains accessible", ["check:NUCINT-039B", "check:NUCINT-040B", "check:A11Y-NUCLEUS"]],
  ["QA-033", "World-clock updates do not create excessive announcements", ["suite:clocks", "suite:clocks-browser", "check:A11Y-CLOCKS"]],
  ["QA-034", "Automated accessibility limitations are documented", ["check:QA-DOC-01"]],
  ["QA-035", "Representative pages have measured performance baselines", ["suite:perf-browser"]],
  ["QA-036", "JavaScript payloads are recorded", ["check:QA-BUDGET-01", "check:PERF-001"]],
  ["QA-037", "Large image assets are detected", ["check:QA-IMG-04"]],
  ["QA-038", "Referenced images exist", ["check:QA-IMG-01"]],
  ["QA-039", "Relevant image dimensions are present", ["check:QA-IMG-03"]],
  ["QA-040", "No unintended page-wide layout shifts are introduced", ["check:PERF-CLS", "check:NUCINT-004B"]],
  ["QA-041", "Three.js loads only on applicable pages", ["check:QA-BUDGET-02", "check:NUCINT-006B"]],
  ["QA-042", "Schedule provider scripts remain absent while scheduling is disabled", ["check:QA-OUT-08", "check:SCH-054"]],
  ["QA-043", "Nucleus idle rendering remains bounded", ["check:NUCINT-035B", "check:PERF-IDLE"]],
  ["QA-044", "Performance results include environment information", ["check:PERF-ENV"]],
  ["QA-045", "The browser regression suite executes reliably", ["stage:browser"]],
  ["QA-046", "NUC-031 has been investigated", ["check:QA-FLAKE-01"]],
  ["QA-047", "Known flaky behavior is reported transparently", ["check:QA-STATE-03"]],
  ["QA-048", "Retries do not silently mask failures", ["check:QA-STATE-02"]],
  ["QA-049", "Failure evidence is retained where supported", ["check:QA-EVIDENCE-01"]],
  ["QA-050", "Test fixtures are isolated", ["check:QA-FIXTURE-01"]],
  ["QA-051", "Browser lifecycle tests remain valid", ["check:NUCINT-017B", "suite:transitions-browser"]],
  ["QA-052", "Approved D-144 animation exceptions remain narrow", ["check:HOME-026", "check:CLOCK-033B", "check:NUCINT-055"]],
  ["QA-053", "A coherent QA command exists", ["check:QA-CLI-01"]],
  ["QA-054", "Mandatory test failures propagate nonzero exit status", ["check:QA-EXIT-01", "check:QA-NEGATIVE-01"]],
  ["QA-055", "The GitHub Actions QA workflow uses reproducible dependencies", ["check:QA-CI-01"]],
  ["QA-056", "QA does not deploy the website", ["check:QA-CI-02"]],
  ["QA-057", "CI permissions are appropriately limited", ["check:QA-CI-03"]],
  ["QA-058", "External scheduling tests remain explicitly deferred", ["deferred:SCH-"]],
  ["QA-059", "Deferred checks do not appear as passes", ["check:QA-STATE-01"]],
  ["QA-060", "Unexecuted mandatory checks do not appear as passes", ["check:QA-STATE-04"]],
  ["QA-061", "A machine-readable report is generated", ["check:QA-REPORT-01"]],
  ["QA-062", "A human-readable report is generated", ["check:QA-REPORT-02"]],
  ["QA-063", "The latest report can be inspected locally", ["check:QA-REPORT-03"]],
  ["QA-064", "The local QA inspector is discoverable", ["check:QA-INSPECT-01"]],
  ["QA-065", "The inspector is excluded from public output", ["check:QA-INSPECT-02", "check:QA-OUT-07"]],
  ["QA-066", "Eleven global tabs remain unchanged", ["check:SITE-001"]],
  ["QA-067", "Twenty-five approved child destinations remain unchanged", ["check:SITE-003"]],
  ["QA-068", "Physical-folder geometry remains unchanged", ["suite:folders", "suite:responsive"]],
  ["QA-069", "Five Chromatic Archive palettes remain unchanged", ["suite:categories", "suite:design-tokens"]],
  ["QA-070", "P15 homepage composition remains unchanged", ["suite:home", "suite:home-browser"]],
  ["QA-071", "P16 world clocks remain functional", ["suite:clocks", "suite:clocks-browser"]],
  ["QA-072", "P19 nucleus prototype remains intact", ["suite:nucleus", "suite:nucleus-browser"]],
  ["QA-073", "P20 nucleus integration remains intact", ["suite:nucleus-integration", "suite:nucleus-integration-browser"]],
  ["QA-074", "Home-only sticky tabs remain functional", ["check:NUCINT-055", "check:NUCINT-055B"]],
  ["QA-075", "Accepted D-144 trade-offs remain unchanged", ["check:SCH-061", "check:QA-PRESERVE-01"]],
  ["QA-076", "P10-P14 editorial publishing remains functional", ["suite:content", "suite:editorial-build", "suite:editorial-layouts", "suite:authoring", "suite:editorial-browser"]],
  ["QA-077", "P17 site coverage remains intact", ["suite:site", "suite:site-browser"]],
  ["QA-078", "P18 utilities remain intact", ["suite:util", "suite:util-browser"]],
  ["QA-079", "P21 scheduling stays disabled pending external activation", ["check:QA-OUT-08", "suite:scheduling"]],
  ["QA-080", "Versioned CV sources remain untouched", ["check:QA-PRESERVE-02", "suite:cv"]],
  ["QA-081", "Canonical Bearnard masters remain untouched", ["check:QA-PRESERVE-03", "suite:bearnard"]],
  ["QA-082", "No private material enters public output", ["check:QA-OUT-01", "check:QA-OUT-02", "check:QA-OUT-03", "check:QA-OUT-04"]],
].map(([id, title, refs]) => ({ id, title, refs }))

const RANK = { FAIL: 6, "NOT RUN": 5, FLAKY: 4, SKIPPED: 3, DEFERRED: 2, PASS: 1 }

/**
 * Each item's status from the run's results. `lookup(ref)` returns a status or undefined for a reference
 * the run did not produce; `executed(ref)` says whether the evidence was in the run's profile.
 */
export function evaluate(lookup, selected) {
  return MATRIX.map((item) => {
    const parts = item.refs.map((ref) => {
      const status = lookup(ref)
      if (status !== undefined) return { ref, status }
      return { ref, status: selected(ref) ? "NOT RUN" : "SKIPPED" }
    })
    const worst = parts.reduce((a, b) => (RANK[b.status] > RANK[a.status] ? b : a))
    const everyDeferred = parts.every((p) => p.status === "DEFERRED")
    // A mixture of PASS and DEFERRED is not a pass of the deferred part: say DEFERRED, never PASS.
    const status = everyDeferred ? "DEFERRED" : worst.status === "PASS" ? "PASS" : worst.status
    return { ...item, status, evidence: parts }
  })
}
