# GusmaoLab

Source for [www.gusmaolab.org](https://www.gusmaolab.org), Eduardo Gade Gusmao's website and publishing ecosystem.

**Status:** this repository is an [Astro](https://astro.build) 7 static site. Every section of the site has a page inside the physical folders, the folder tabs are working links, hovering or keyboard-focusing an unopened folder previews its contents, and the folders work on phones, tablets and desktops alike, and every folder page now says what it is for and what state it is in (ready, empty, in preparation), without inventing content: the owner's material (About, Contact, Schedule, the CV, the Lab, the Portfolio and Bearnard's Area) is not supplied yet, and nothing is deployed from here. Temporary design studies sit beside them: the visual foundations at `/_design/tokens/`, the physical folder tabs at `/_design/folders/`, the Bearnard illustrations at `/_design/bearnard/`, and the canonical records, with invented data, at `/_design/records/`. The eleven sections, grouped by category, belong to five colour categories, each a permanent cardstock (the Chromatic Archive, [`planning/design-system.md`](planning/design-system.md), section 7). Eight editorial collections (Blog, Bearnard's Trail, The Greenhouse, Berries, Timber Logs, Months' Original, Kosmos Series and Book Club) are ready for Markdown entries in `src/content/`; none holds a published entry yet, and [`planning/content-model.md`](planning/content-model.md) describes the authoring workflow. Research, publication and professional records have one typed source each in `src/data/records/`, also empty so far. The previous Pelican site, including its original README, is archived in [`_backup/pelican-legacy/`](_backup/pelican-legacy/).

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
| `npm run content:new -- --collection <id> --title "<title>" [--format qmd]` | Create a draft article (Markdown, or Quarto for The Greenhouse and Bearnard's Trail). See [`development/authoring-guide.md`](development/authoring-guide.md). |
| `npm run content:validate -- --all` | Check one article or all of them: metadata, identity, relationships, text, Quarto freshness, publication safety. Changes nothing. |
| `npm run content:preview -- --collection <id> --slug <slug>` | Show an article's source, state and local address, and whether the dev server answers. Changes nothing. |
| `npm run content:publish -- --collection <id> --slug <slug> --date YYYY-MM-DD [--yes]` | Check a draft as it would be published and show the change; with `--yes`, make it. Never commits or deploys. |
| `npm run content:archive -- --collection <id> --slug <slug> [--yes]` | Mark a published article archived; its address and date stay. |
| `npm run science:check` | Report the Quarto and Python the scientific-article tool finds. See [`science/README.md`](science/README.md). |
| `npm run science:verify` | Offline check that every generated scientific article is current (no Quarto, no Python, nothing executed). `npm run build` runs it first. |
| `npm run science:render -- <dir>/<name>` | Prepare one Quarto article from its frozen results; never computes. |
| `npm run science:execute -- <dir>/<name>` | Run one Quarto article's code, freeze the results, then render. The only command that runs code. Uses the micromamba environment `gusmaolab-science` unless `SCIENCE_PYTHON` names another. |
| `npm run science:env -- <command>` | The scientific environment: `resolve`, `check`, `create [--prefix <dir>]`, `sync`, `lock`. See [`development/scientific-environment.md`](development/scientific-environment.md). |
| `npm run science:quarto -- <arguments>` | Run Quarto with `QUARTO_PYTHON` set to that environment's Python. |
| `npm run science:restore-test` | Rebuild the environment from its specification in a temporary folder and run the demonstration there (network, about two minutes). Not part of `npm test`. |
| `npm run demo:build` | Build the site with its synthetic demonstrations into `dist-demo/` (never `dist/`), then check it. `npm run build` never includes them. See [`development/demonstrations.md`](development/demonstrations.md). |
| `npm run demo:preview` | Serve `dist-demo/` on port 4323. |
| `npm run demo:verify` | Check that `dist-demo/` holds every demonstration, labelled as synthetic. |
| `npm run links [-- <folder>]` | Check every internal link of a built folder (`dist/` by default): pages, files, canonical trailing slashes and fragments. External URLs are counted, never fetched. Changes nothing. |
| `npm run downloads:check` | Check the download registry against the files in `public/downloads/` and, after a build, against `dist/`. `npm run build` runs it too. See [`development/downloads-guide.md`](development/downloads-guide.md). |
| (3D nucleus, P19, P20) | No command of its own: it is on Home (`npm run dev`, `/`), where the folder tabs move it, and the standalone prototype is Home, the development note, "3D Nucleus Prototype" (`/_design/nucleus/`). Its tests are `tests/nucleus.mjs` and `tests/nucleus-integration.mjs` (in `npm test`) and `tests/nucleus-browser.mjs` and `tests/nucleus-integration-browser.mjs` (in `npm run test:browser`). See [`development/nucleus-guide.md`](development/nucleus-guide.md) and [`planning/nucleus-multidomain.md`](planning/nucleus-multidomain.md). |
| `npm run scheduling:check` | Report the scheduling configuration (provider, state, owner time zone, whether a booking link and an availability file are configured) and what is known about the future availability file. Changes nothing, calls no service, prints no file content. See [`development/scheduling-guide.md`](development/scheduling-guide.md). |
| `npm run cv:check` | Report which CV file is selected, whether it can be read and whether a version is approved. Prints counts and identifiers, never the CV's text. Add `-- --verbose` to list what would be left out. See [`cv/README.md`](cv/README.md). |
| `npm run cv:snapshot` | Write the public CV snapshot (`src/data/cv/snapshot.ts`) from the version approved in `cv/manifest.json`. Refuses, and changes nothing, without an approval. Not part of a build. |

To try the site, run `npm run build` and `npm run preview`, then open the address it prints and click through the folder tabs. Add `/_design/tokens/` for the design specimen, `/_design/folders/` for the folder study, `/_design/bearnard/` for the Bearnard illustrations `/_design/records/` for the canonical records (synthetic data), and, in development, `/_design/site-map/` (Site Map & Page Coverage: every folder and its state), `/_design/contact/`, `/_design/downloads/` and, to see the 404 page, any address that is not in the archive such as `/this-folder-is-not-in-the-archive/`. The design tokens and folder styles live in `src/styles/` and are described in [`planning/design-system.md`](planning/design-system.md).

## Project records

- [`AGENTS.md`](AGENTS.md): rules for contributors and coding agents
- [`planning/`](planning/): requirements, design system, architecture
- [`development/`](development/): roadmap, current state, decisions
- [`debugging/`](debugging/): issues and known limitations

License: see [`LICENSE`](LICENSE).
