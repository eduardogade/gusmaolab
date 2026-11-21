# Demonstrations

How GusmaoLab shows a feature working (P13-A01, D-105, D-106). A feature meant to be seen is reachable from the running website; a log, a screenshot or a fixture that cannot be opened is not a demonstration.

## What they are

A demonstration is a synthetic article of The Greenhouse that goes through the real pipeline: the P10 schema (plus a required `synthetic: true`), the P12 Greenhouse layout, the P13 Quarto tool where it has computed content, the real routes under the real folders. It is not a mock-up and has no presentation of its own. Today there are three:

| Article | Source | Address | Shows |
| --- | --- | --- | --- |
| A Small Guide to Scientific Markdown | `src/demos/greenhouse/demo-scientific-markdown.md` | `/lecture-notes/greenhouse/demo-scientific-markdown/` | An ordinary Markdown article: headings, lists, code, a table, a quotation, links, references |
| From Synthetic Signals to Reproducible Results | `science/demo/demo-synthetic-signals.qmd` (+ `.bib`) | `/lecture-notes/greenhouse/demo-synthetic-signals/` | Quarto: equations, a computed figure and table, cross-references, citations, a bibliography, a footnote, callouts, code and its output |
| One Archive, Two Authoring Formats | `src/demos/greenhouse/demo-markdown-and-quarto.md` | `/lecture-notes/greenhouse/demo-markdown-and-quarto/` | When to use which format, and how both reach the same site |

Their data are invented and the article says so on its first screen ("Development demonstration — synthetic content").

## Where to find them

Run the ordinary dev server and click: **Home > Lecture Notes > The Greenhouse**. Below the Greenhouse's own (still empty) list is **Development Demonstrations**, with the three articles. No typed URL and no variable is needed.

```bash
npm run dev
```

A build with them, for looking at the static result:

```bash
npm run demo:build     # into dist-demo/, never dist/
npm run demo:preview   # http://localhost:4323/
npm run demo:verify    # does dist-demo/ hold every demonstration, labelled?
```

The desktop app has the launch entry `astro-demo-preview` (port 4323) next to `astro-dev` (4321). Astro allows one dev server per project, so stop the running one before starting another.

## How they stay out of the release

Three independent guards (D-105):

1. **Loading.** The demonstrations are an Astro collection (`greenhouseDemos`, `src/content.config.ts`) that `src/editorial/site.ts` reads only when `src/editorial/demo.ts` says so: Astro's mode is `development` (the dev server) or `demo` (`astro build --mode demo`). `NODE_ENV` does not decide it. In a production build no demonstration is loaded, so none has a route, an index entry, a related link, a figure or a place in any other page.
2. **The build command.** `npm run build` is `scripts/public-build.mjs`: `astro build --mode production --outDir dist` in an environment cleaned of what can override the mode (`MODE`, `ASTRO_MODE`, `NODE_ENV` set to production).
3. **The output.** The same script then searches everything it wrote for every demonstration's slug and title and for the markers only they carry, and fails on one. A demonstration's figures are not in `public/` (which every build copies) but in `src/demos/assets/`, served by `src/pages/demo-assets/[name]/[file].svg.ts`, which has static paths only in the two modes above.

A deployment must run `npm run build`, not `astro build` directly. `tests/demos.mjs` builds the site with a hostile environment, and shows that the output search catches a build that leaks.

## Add, update or remove one

- **A Markdown demonstration:** a file in `src/demos/greenhouse/`, with the Greenhouse's front matter, `status: published` and `synthetic: true`. The slug starts with `demo-`. It may link only to other demonstrations or to ordinary pages, and may relate (`related:`) only to other demonstrations: a build stops otherwise.
- **A Quarto demonstration:** `science/demo/<name>.qmd` with `synthetic: true`; then `npm run science:execute -- demo/<name>` (computed) or `science:render` (not computed). It writes `src/demos/greenhouse/<name>.md` (the entry), `src/demos/science/<name>.html` (the article) and `src/demos/assets/<name>/` (figures). Never edit those.
- **Remove one:** delete its source and generated files (for Quarto: the `.qmd`, `.bib`, `science/_freeze/demo/<name>/`, and the manifest entry, which `science:render` cannot drop: edit `src/science/manifest.json` and run `npm run science:verify`).
- **Check that a release is clean:** `npm run build` (it fails on a trace) and `npm run demo:verify` for the other direction.

## Make a demonstration of a new feature (the standing rule)

When a milestone adds something to be seen, it ships a way to see it in the local website: a new article layout gets a demonstration article, a research-project card a synthetic project specimen, a figure system an actual rendered figure, a Bearnard composition an accessible live page. The demonstration uses the production components, is reachable by clicking, is labelled synthetic, and is excluded from the release by the same three guards. Never invent public content to make a feature look finished.

## The Publishing Workbench (P14)

The same convention, applied to authoring: `npm run dev`, then Home → Lecture Notes → The Greenhouse → **Publishing Workbench** (a link in the Development Demonstrations section, `/_design/publishing/`). It has the lifecycle, the five commands to copy, the eight collections, the publication checklist and the reasons things look as they do; from its banner, the **workflow example** (the real commands run on a throwaway synthetic article, with their output) and a **draft preview** (a synthetic draft in the real Greenhouse layout). It is read-only and gated like the demonstrations: a release build has none of it (`scripts/demo-check.mjs` searches for its paths and markers), and `npm run demo:build` includes it.

The workflow transcript is `src/design/publishing/workflow-transcript.txt`. `tests/authoring.mjs` regenerates it from the commands and fails if it differs; refresh it after changing a command's output with `node tests/fixtures/authoring/scenario.mjs --write`.

## Contact, downloads and the 404 page (P18)

The same convention again: from `npm run dev`, Home, then the development note at the foot of the page links to `/_design/downloads/` (two synthetic files that really download, and a planned one with no link), `/_design/contact/` (the finished Contact layout with synthetic channels on example domains) and to a missing URL that shows the real 404 page. The real Contact page is Home → Contact. The synthetic files are in `src/demos/downloads/` and are served from `/demo-downloads/` only in development and demonstration builds. See `development/downloads-guide.md`.

## The 3D nucleus prototype (P19)

From `npm run dev`: Home, then the development note at the foot of the page, then "3D Nucleus Prototype" (or Site Map & Page Coverage, then the same name), at `/_design/nucleus/`. Move the pointer over a simulated tab above the nucleus, or Tab to it, to see the yellow region open and reach toward it; leave and it returns. "Play the response" does it for Lab and then releases. The frame-width buttons resize the frame, "Preview the still nucleus" shows what touch and reduced motion get, and "Show diagnostics" reveals frame counts and renderer statistics. Nothing here is published, and a release build has no trace of it.
