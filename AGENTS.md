# AGENTS.md — GusmaoLab

Shared rules for every coding agent in this repository: Claude Code, Codex and others. Keep this file short; details live in the files it points to.

## Project

GusmaoLab is Eduardo Gade Gusmao's personal website and publishing ecosystem: computational biology, bioinformatics, research, software engineering, teaching, literature and personal interests. Scientific rigor and visual humor go together.

The site is an Astro static project. The only page is a temporary design specimen (P03); the visual interface is not implemented yet. The old Pelican site is archived in `_backup/pelican-legacy/`.

## Where things are

| Need | Read |
| --- | --- |
| What to build | `planning/requirements.md`, `planning/feature-specifications.md` |
| Look and feel | `planning/design-system.md` |
| Sections and navigation | `planning/information-architecture.md` |
| Technical direction | `planning/architecture.md` |
| Content and records | `planning/content-model.md` |
| What exists now | `development/current-state.md` |
| Why things are as they are | `development/decisions.md` |
| Plan | `development/roadmap.md` |
| Bearnard assets | `assets/bearnard/README.md` |

## Commands

Use Node.js 26 LTS (`.node-version`) with npm. Install with `npm ci`, and run `npm run verify` (diagnostics, build, token and contrast checks, smoke test) before committing. `README.md` lists every command.

## Styling

- Native CSS only. Tokens live in `src/styles/tokens.css`, environment overrides in `src/styles/environments.css`, and global defaults in `src/styles/global.css` (`planning/design-system.md`).
- Components use semantic tokens (`--color-*`, `--font-*`, `--space-*` …), never `--palette-*` primitives or raw colors.
- Choose a section environment with `data-environment` (BaseLayout's `environment` prop). Change what an environment can set only through `src/design/contract.mjs` and a recorded decision.
- Keep `tests/design-tokens.mjs` and `tests/contrast.mjs` passing. Do not lower a contrast threshold to make a color pass.
- Never place text directly on the flannel lining. Add no transitions, animation or smooth scrolling without a decision.

## Invariants

- **Architecture:** Astro, static by default, TypeScript where appropriate, semantic HTML and CSS, minimal isolated client-side JavaScript, Markdown-first authoring, GitHub Pages. Booking uses an external service where necessary. Add dependencies only through a recorded decision.
- **Physical folders:** real paper-folder tabs with at most three visible levels. Clicking a tab opens its page, and hovering previews only its immediate children. The active tab has a V-shaped indicator and inactive tabs stay visible. No persistent sidebar, no breadcrumbs, no file-manager look. Deeper content goes in the body of the third-level folder.
- **Approved requirements change only through a recorded decision** in `development/decisions.md`, never as a side effect of implementation or debugging.

## Bearnard masters

- `brand/bearnard/bearnard_v1.3.png` is the canonical master. Masters are immutable: never edit, rename, crop, resize, convert, recompress or overwrite them.
- Never run optimization, formatting or cleanup tools over `brand/bearnard/`.
- Generate derivatives into separate folders. Never put full-resolution masters in the site's public directory.
- Experimental and unclassified images stay that way until the owner approves them (`assets/bearnard/inventory.csv`).
- `brand/bearnard/` is gitignored on purpose. Do not force-add it.

## Version control

- Inspect before modifying, and prefer reversible operations.
- Work on one branch per prompt. Do not commit directly to `main`.
- Never push, force-push, rewrite history, amend pushed commits, or move or delete tags unless the owner explicitly asks.
- Never run destructive commands such as `git reset --hard`, `git clean -fd` or `rm -rf` on project content. Never discard changes you did not make.
- The repository is public. Do not commit secrets, credentials or unexpectedly large binary files.
- Commit `package-lock.json`. Never commit `node_modules/`, `dist/` or `.astro/`.
- The root `.gitignore` has Python-template patterns, such as `lib/` and `build/`, that match folders at any depth. Check new folders with `git check-ignore -v <path>`.
- Never commit the private workspace folders `_books/`, `_papers/`, `_references/` or `_reports/`.
- `_backup/` is a read-only archive, excluded from pre-commit hooks. Do not edit it.
- Do not bypass hooks with `--no-verify` unless the owner explicitly asks.
- Some commands that look read-only write state. For example, `git lfs` commands write `.git/config`.
- Only one agent writes to the repository at a time.

## Reporting

- Report the commands you ran and their results. Keep verified facts separate from assumptions.
- An untested requirement is **Untested**, never **Passed**. Report failed checks; never hide them.
- At the end of each prompt, update `development/current-state.md` and `development/implementation-log.md`.
- Development records (`development/`) and debugging records (`debugging/`) stay separate. If a debugging outcome changes the architecture, record a decision in `development/decisions.md`.
- Create an issue record in `debugging/investigations/` only for a genuine issue.
