# GusmaoLab

Source for [www.gusmaolab.org](https://www.gusmaolab.org), Eduardo Gade Gusmao's website and publishing ecosystem.

**Status:** this repository is an [Astro](https://astro.build) 7 static site. It has two temporary pages: a design specimen of the visual foundations at `/`, and a study of the physical folder tabs at `/_design/folders/`, which awaits the owner's review. **The website itself is not implemented yet**, and nothing is deployed from here. The previous Pelican site, including its original README, is archived in [`_backup/pelican-legacy/`](_backup/pelican-legacy/).

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
| `npm test` | Check the design tokens, color contrast and navigation model, then smoke-test the built output and the folder components (run `npm run build` first) |
| `npm run verify` | Run `check`, `build` and `test` in one go |
| `node tests/contrast.mjs --markdown` | Print every contrast ratio as Markdown tables |

To review the design specimen, run `npm run build` and `npm run preview`, then open the address it prints; add `/_design/folders/` for the folder study. The design tokens and folder styles live in `src/styles/` and are described in [`planning/design-system.md`](planning/design-system.md).

## Project records

- [`AGENTS.md`](AGENTS.md): rules for contributors and coding agents
- [`planning/`](planning/): requirements, design system, architecture
- [`development/`](development/): roadmap, current state, decisions
- [`debugging/`](debugging/): issues and known limitations

License: see [`LICENSE`](LICENSE).
