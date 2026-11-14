# GusmaoLab

Source for [www.gusmaolab.org](https://www.gusmaolab.org), Eduardo Gade Gusmao's website and publishing ecosystem.

**Status:** this repository is an [Astro](https://astro.build) 7 static site. Every section of the site has a page inside the physical folders, the folder tabs are working links, hovering or keyboard-focusing an unopened folder previews its contents, and the folders work on phones, tablets and desktops alike, but **the pages hold temporary development content only**: the real content is not written yet, and nothing is deployed from here. Temporary design studies sit beside them: the visual foundations at `/_design/tokens/`, the physical folder tabs at `/_design/folders/`, the Bearnard illustrations at `/_design/bearnard/`, and the canonical records, with invented data, at `/_design/records/`. The eleven sections, grouped by category, belong to five colour categories, each a permanent cardstock (the Chromatic Archive, [`planning/design-system.md`](planning/design-system.md), section 7). Eight editorial collections (Blog, Bearnard's Trail, The Greenhouse, Berries, Timber Logs, Months' Original, Kosmos Series and Book Club) are ready for Markdown entries in `src/content/`; none holds a published entry yet, and [`planning/content-model.md`](planning/content-model.md) describes the authoring workflow. Research, publication and professional records have one typed source each in `src/data/records/`, also empty so far. The previous Pelican site, including its original README, is archived in [`_backup/pelican-legacy/`](_backup/pelican-legacy/).

## Prerequisites

- Node.js 26, the LTS line named in [`.node-version`](.node-version). `package.json` accepts `>=26.12.0 <27`.
- npm, as bundled with Node.js 26 (11.20.0 when this was written).

## Commands

| Command | What it does |
| --- | --- |
| `npm ci` | Install the exact dependencies recorded in `package-lock.json` |
| `npm run dev` | Start the local development server (port 4321 by default) |
| `npm run check` | Run Astro and TypeScript diagnostics |
| `npm run build` | Build the static site into `dist/` |
| `npm run preview` | Serve the built `dist/` locally (port 4321 by default) |
| `npm test` | Check the design tokens, color contrast and navigation model, then smoke-test the built output, the folder components, the generated pages, the folder previews' markup, the responsive rules, the page transition, the Bearnard illustrations, the five category palettes, the editorial collections, the canonical records and the CV integration (run `npm run build` first) |
| `npm run test:browser` | Check the folder previews, the responsive layout (pointer, keyboard, touch, scrolling rows, widths from 320 to 2560 px) the cross-fade between pages and the painted category colours in a local headless Chrome (run `npm run build` first; set `CHROME_PATH` if Chrome is elsewhere). Not part of `verify`. |
| `npm run verify` | Run `check`, `build` and `test` in one go |
| `npm run dev` | Serve the site with live reload. Editorial drafts are previewed here, at their future URLs, and nowhere else |
| `node tests/contrast.mjs --markdown` | Print every contrast ratio as Markdown tables |
| `npm run cv:check` | Report which CV file is selected, whether it can be read and whether a version is approved. Prints counts and identifiers, never the CV's text. Add `-- --verbose` to list what would be left out. See [`cv/README.md`](cv/README.md). |
| `npm run cv:snapshot` | Write the public CV snapshot (`src/data/cv/snapshot.ts`) from the version approved in `cv/manifest.json`. Refuses, and changes nothing, without an approval. Not part of a build. |

To try the site, run `npm run build` and `npm run preview`, then open the address it prints and click through the folder tabs. Add `/_design/tokens/` for the design specimen, `/_design/folders/` for the folder study, `/_design/bearnard/` for the Bearnard illustrations and `/_design/records/` for the canonical records (synthetic data). The design tokens and folder styles live in `src/styles/` and are described in [`planning/design-system.md`](planning/design-system.md).

## Project records

- [`AGENTS.md`](AGENTS.md): rules for contributors and coding agents
- [`planning/`](planning/): requirements, design system, architecture
- [`development/`](development/): roadmap, current state, decisions
- [`debugging/`](debugging/): issues and known limitations

License: see [`LICENSE`](LICENSE).
