// The test inventory (P22, D-151): every file in tests/, what it is for, what it needs, where it runs.
// One list, read by the QA command (scripts/qa.mjs) to run the suites, by the report to describe them,
// and by tests/qa.mjs, which fails if a test file or an npm script is missing here. It does not replace
// any runner: each suite is still `node tests/<name>.mjs`, exactly as `npm test` and `npm run
// test:browser` run it, so a developer who runs one suite and the QA command see the same result.
//
// `needs`:  dist = the release build (npm run build); demo = the demonstration build (npm run demo:build,
//           which `npm run test:browser` makes first); browser = headless Chrome or Chromium;
//           quarto / science = the optional scientific toolchain (the suite reports SKIPPED without it);
//           git = a git checkout. No suite needs the network or an external service: the scheduling
//           suites never contact the provider (P21), so nothing in CI waits on one.
// `ci`:     whether it belongs in the GitHub Actions QA workflow. Suites that need the full scientific
//           environment run there only as far as they can without it (they SKIP, and say so).
//
// Pure data. Node reads it; so does the development quality page.

const unit = (id, purpose, needs = [], extra = {}) => ({ id, file: `tests/${id}.mjs`, tier: "unit", purpose, needs, ci: true, ...extra })
const browser = (id, purpose, needs = ["browser"], extra = {}) => ({ id, file: `tests/${id}.mjs`, tier: "browser", purpose, needs, ci: true, ...extra })

/** Suites in the order `npm test` runs them. */
export const UNIT_SUITES = [
  unit("design-tokens", "Design-token stylesheets: tokens, layers and the locked palettes' structure (P03, P09-A01)"),
  unit("contrast", "WCAG 2.2 contrast of the principal text and indicator pairings in every category (P03)"),
  unit("navigation", "Navigation model, registry validation, previews data and the model's routes (P04, P06)"),
  unit("smoke-test", "Release build smoke test: pages, assets, script and size ceilings (P02)", ["dist"]),
  unit("folders", "Physical-folder component output in the built pages (P05)", ["dist"]),
  unit("routes", "Route and page tests: static routes, one stack per page, plain-link navigation (P06)", ["dist", "quarto"]),
  unit("previews", "Folder-preview data and markup without a browser (P07)", ["dist"]),
  unit("responsive", "Responsive structure of the built pages and stylesheets (P08)", ["dist"]),
  unit("transitions", "Navigation-continuity rules: the cross-fade and its opt-ins (P09)", ["dist"]),
  unit("bearnard", "Bearnard illustration registry and derivatives (P09)", ["dist"]),
  unit("categories", "The five Chromatic Archive categories (P09-A01, D-076)", ["dist"]),
  unit("content", "Editorial collection schemas, routing and publication rules (P10)"),
  unit("editorial-build", "Editorial pipeline in real throwaway builds (P10)", ["dist"]),
  unit("editorial-layouts", "Editorial reading layouts without a browser (P12)", ["dist", "quarto"]),
  unit("science", "Scientific (Quarto) article preparation, offline (P13)", ["dist", "quarto"]),
  unit("science-execute", "Controlled computation and reproducibility; SKIPPED unless explicitly asked (P13)", ["quarto", "science"]),
  unit("science-env", "The scientific environment specification (P13-A01)", ["demo", "quarto", "science"]),
  unit("demo-execute", "Explicit recomputation of the Quarto demonstration; SKIPPED unless asked (P13-A01)", ["quarto", "science"]),
  unit("demos", "Development demonstrations and their exclusion from releases (P13-A01)", ["dist", "demo", "quarto"]),
  unit("authoring", "The authoring commands and preflight (P14)", ["quarto"]),
  unit("authoring-build", "Authoring results in real builds (P14)", ["dist", "demo", "quarto"]),
  unit("home", "The homepage's data and built page (P15)", ["dist"]),
  unit("clocks", "The eight world clocks: IANA zones, one loop (P16)", ["dist"]),
  unit("site", "Site-wide coverage, content states and the site map (P17)", ["dist", "quarto", "git"]),
  unit("util", "Contact, downloads and the 404 page without a browser (P18)", ["dist", "git"]),
  unit("nucleus", "The 3D nucleus model, deformation and lifecycle with a stand-in browser (P19)", ["dist", "git"]),
  unit("nucleus-integration", "The nucleus on Home: navigation contract and mount with a stand-in browser (P20)", ["dist", "git"]),
  unit("scheduling", "Scheduling configuration, loader, time zones and privacy; the provider is never contacted (P21)", ["dist", "git"]),
  unit("records", "Canonical records model and projections (P11)", ["quarto"]),
  unit("cv", "The CV as the owner's source of truth, with synthetic data only (P11-A01)", ["dist", "quarto"]),
  unit("release", "Release configuration, metadata, artifact boundary and preservation before the cutover: REL-001 to REL-056 where they can be decided (P24)", ["dist", "git"]),
  unit("qa", "The quality system itself: inventory, result states, exit policy, audits and a controlled failure (P22)", ["dist", "git"]),
]

/** Suites in the order `npm run test:browser` runs them (after the demonstration build). */
export const BROWSER_SUITES = [
  browser("previews-browser", "Folder previews: hover, focus, keyboard, placement (P07)"),
  browser("responsive-browser", "Folders at every width: scrolling rows, no overflow (P08)"),
  browser("transitions-browser", "Navigation continuity and the cross-fade (P09)"),
  browser("categories-browser", "Chromatic Archive categories in a browser (P09-A01)"),
  browser("editorial-browser", "Editorial reading layouts (P12)"),
  browser("science-browser", "Scientific articles in a browser (P13)", ["browser", "quarto"]),
  browser("demo-browser", "Demonstration pages at five widths (P13-A01)", ["browser", "demo", "quarto"]),
  browser("demo-dev-browser", "Demonstrations through the real dev server (P13-A01)", ["browser", "quarto"]),
  browser("authoring-browser", "The Publishing Workbench through the dev server (P14)"),
  browser("home-browser", "The homepage as a reader sees it (P15); HOME-026 exempts exactly the D-144 animation", ["browser", "demo"]),
  browser("clocks-browser", "The world clocks live; CLOCK-033B exempts exactly the D-144 animation (P16)", ["browser", "demo"]),
  browser("site-browser", "The site map, page states and navigation (P17)", ["browser", "demo"]),
  browser("util-browser", "Contact, downloads and the 404 page in a browser (P18)", ["browser", "demo"]),
  browser("nucleus-browser", "The nucleus specimen: WebGL, deformation, still modes (P19)", ["browser", "demo"], { flakyNote: "NUC-031 failed intermittently once in P21; see debugging/investigations/ISSUE-0005.md" }),
  browser("nucleus-integration-browser", "The nucleus on Home, driven by the real tabs (P20, D-144)"),
  browser("scheduling-browser", "Scheduling in a browser with the provider blocked or stood in for (P21)", ["browser", "demo", "quarto"]),
  browser("a11y-browser", "Automated accessibility (axe-core) on representative pages (P22)", ["browser", "demo", "dist"]),
]

/** The measured performance run (P22): writes qa-report/performance.json, which the QA command reads. */
export const MEASUREMENT_SUITES = [
  browser("perf-browser", "Measured page performance and route budgets, several cold runs each (P22)", ["browser", "dist", "demo"]),
]

/** Files in tests/ that are not suites: shared code. */
export const HELPERS = [
  { file: "tests/browser-harness.mjs", purpose: "Headless Chrome over the DevTools protocol, a static server, the shared helpers" },
  { file: "tests/html-tree.mjs", purpose: "A small HTML reader for the built-page tests" },
  { file: "tests/nucleus-fakes.mjs", purpose: "Stand-in browser pieces for the nucleus suites" },
  { file: "tests/demo-run.mjs", purpose: "Runs the Quarto demonstration, for demo-execute and science-restore" },
  { file: "tests/scheduling-ready-build.mjs", purpose: "A throwaway build with scheduling enabled on a synthetic link" },
  { file: "tests/demo-dist.mjs", purpose: "A throwaway demonstration build, for the tests that read development pages such as the design studies (D-157)" },
  { file: "tests/dev-server.mjs", purpose: "Starts `astro dev` for the two dev-server suites, stops it on exit and on a signal, and fails the suite if the port is still open (P22-A01)" },
  { file: "tests/approved-changes.mjs", purpose: "The files an owner-approved decision (D-158) allowed to change, which the older preservation guards subtract" },
  { file: "tests/qa-fixtures.mjs", purpose: "Throwaway copies of a build, with a controlled defect, for the QA system's own tests" },
]

/** Run on demand, not by `npm test` or `npm run test:browser`. */
export const ON_DEMAND = [
  { file: "tests/science-restore.mjs", command: "npm run science:restore-test", purpose: "Rebuilds the scientific environment from its specification in a fresh folder and runs the demonstration; slow, needs the toolchain and the network", ci: false },
]

export const ALL_SUITES = [...UNIT_SUITES, ...BROWSER_SUITES, ...MEASUREMENT_SUITES]
