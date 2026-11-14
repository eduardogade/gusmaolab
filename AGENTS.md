# AGENTS.md — GusmaoLab

Shared rules for every coding agent in this repository: Claude Code, Codex and others. Keep this file short; details live in the files it points to.

## Project

GusmaoLab is Eduardo Gade Gusmao's personal website and publishing ecosystem: computational biology, bioinformatics, research, software engineering, teaching, literature and personal interests. Scientific rigor and visual humor go together.

The site is an Astro static project. Every registered folder has a page generated from the navigation registry (P06), with temporary development content only, unopened folders preview their contents on hover and keyboard focus (P07), and the folders adapt to every screen size (P08); the eleven sections belong to five colour categories, each a permanent cardstock (the Chromatic Archive, P09-A01); temporary design studies live under `/_design/` (the P03 tokens specimen, the P05 folder study, the P09 Bearnard study and the P11 records study). The old Pelican site is archived in `_backup/pelican-legacy/`.

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

Use Node.js 26 LTS (`.node-version`) with npm. Install with `npm ci`, and run `npm run verify` (diagnostics, build, token, contrast, navigation, folder, route, preview, category, editorial, record and CV tests, smoke test) before committing. After changing the folders' interaction, also run `npm run test:browser` (headless Chrome). `README.md` lists every command.

## Navigation

- `src/navigation/registry.ts` is the only place that declares tabs, labels, URLs, order, categories and environments (`planning/information-architecture.md`). Components read `siteNavigation` from `src/navigation/index.ts`; they never hardcode labels or URLs.
- At most three visible tab levels. Deeper pages are content routes registered with an owning folder, never extra tabs. No breadcrumbs, sidebars, dropdown trees or computer-folder icons.
- Do not add third-level folders that the owner has not approved. Mark test-only data as synthetic.
- Folder pages come from one route file per tab level (`src/pages/index.astro`, `[section]/`, `[section]/[folder]/`, `[section]/[folder]/[subfolder]/`), each listing `siteNavigation.folderStaticPaths(level)`, and wrap their content in `FolderPage` (`src/layouts/`), which draws the folders from the page's own URL (D-053, D-054).
- An open folder with children always shows its row with a selected tab: its Overview, a display tab linking to the parent's own URL. Overview is never a registry node and never has a URL of its own (D-050, D-051).
- No catch-all route, server rendering or client-side router. Keep `tests/navigation.mjs` and `tests/routes.mjs` passing.
- The global row is grouped by category: the tabs of one category are adjacent, and `validateNavigation()` rejects a registry that splits one (D-077).
- Editorial entries (P10, D-078 to D-081) are content routes owned by their collection's folder, never tabs or registry nodes. Collections, schemas and routing rules live in `src/editorial/` and `src/content.config.ts`; one Markdown file per entry in `src/content/<collection>/`. Publication state decides route generation: a draft has no page in a build. Never publish a fabricated entry, never migrate Pelican content unasked, and keep synthetic fixtures in `tests/fixtures/editorial/`, never in `src/content/`. Keep `tests/content.mjs` and `tests/editorial-build.mjs` passing (`planning/content-model.md`).
- Canonical records (P11, D-083 to D-088) are the one copy of every person, organization, research area, project, scholarly output, appointment, qualification and activity: typed lists in `src/data/records/`, model in `src/records/`. Pages read them through selectors and projections and never keep their own copy of a fact; relationships are IDs, stored on one side only. Never invent, infer or import a record: add one only from facts the owner has confirmed, with its `provenance`, and leave unknown fields out. Nothing confidential goes in a record (the repository is public), and a record creates no page. Synthetic records live only in `src/design/records-fixture.ts`. Keep `tests/records.mjs` passing (`planning/content-model.md`).
- The author's CV (P11-A01, D-089 to D-093) is the source of truth for the owner's professional history: the working file `cv/codex-yaml/CV.proposta.yaml` and, later, versions `cv/CV-vX.Y.yaml`. Never edit, format, rename, move, stage or commit a CV file, never fill or resolve its placeholders, and never copy its content into `src/`, `public/` or a record: only the owner changes it. The owner's education, positions, outputs and activities are never written by hand in `src/data/records/`; they are derived by `src/cv/adapter.ts` (an allowlist) into `src/data/cv/snapshot.ts`, which only `npm run cv:snapshot` writes and only after the owner approves a version in `cv/manifest.json`. Never approve a version, switch `publishEnabled` on, or assign IDs in `cv/identities.json` for the owner. Only `scripts/cv.mjs` opens a CV file; no page or site module imports `src/cv/source.ts`, `src/cv/adapter.ts` or `yaml`. Synthetic CV data lives only in `tests/fixtures/cv/`. Keep `tests/cv.mjs` passing (`cv/README.md`, `planning/content-model.md`).
- Folder previews (P07) show an unopened folder's Overview and immediate children, from `row.previews`; never an open folder's, never deeper. The only client-side scripts are `src/scripts/folder-previews.ts` (previews) and `src/scripts/folder-rows.ts` (scrolling rows to the selected or focused tab); neither changes the URL, history, focus or selection, and navigation must keep working without them (D-058–D-060, D-066). Keep `tests/previews.mjs`, `tests/responsive.mjs` and `npm run test:browser` passing.
- Code under `src/navigation/` also runs directly in Node.js: use erasable TypeScript only, `import type` for types, and `.ts` extensions on relative imports (D-040).

## Styling

- Native CSS only. Tokens live in `src/styles/tokens.css`, environment overrides in `src/styles/environments.css`, and global defaults in `src/styles/global.css` (`planning/design-system.md`).
- Components use semantic tokens (`--color-*`, `--font-*`, `--space-*` …), never `--palette-*` primitives or raw colors.
- A section's category and environment are declared in the registry and reach the page as `data-category` and `data-environment` (BaseLayout's `category` and `environment` props). Change what either can set only through `src/design/contract.mjs` and a recorded decision.
- Keep `tests/design-tokens.mjs` and `tests/contrast.mjs` passing. Do not lower a contrast threshold to make a color pass.
- Colour is the Chromatic Archive, approved and locked by the owner (D-076): five categories (`core`, `research`, `blog-notes`, `writing`, `bearnard`), whose palettes live only in `src/styles/categories.css`, and four shared colours (shell, links, accent, V) in `tokens.css`. Never change, substitute or add a palette colour, and never propose another palette, without the owner's recorded decision.
- Every top-level tab keeps its own category's colour on every page, through its own `data-category`; the page's category colours only the open folder, the paper and the flannel. An environment sets typography and texture, never colour. Keep `tests/categories.mjs` and the category checks in `npm run test:browser` passing.
- Never place text directly on the flannel lining. Add no transitions, animation or smooth scrolling without a decision. The only motion is the 140 ms cross-fade between folder pages (`src/styles/view-transitions.css`, D-071), off under reduced motion; never add a client router for it.
- On small screens the folders stay folders: rows scroll sideways inside their folders, never the page, and no menu, sidebar or icon row replaces them (D-064). Check layout changes at 320, 390, 768, 1024, 1280 and 1440 px.
- Physical folders are `src/components/folders/` with `src/styles/folders.css`. Draw them from a `siteNavigation.resolve()` state (`<FolderStack state={…}>`), never a hand-built tree. Levels differ only by `data-level` and tokens; never add environment-specific or category-specific folder rules (D-043–D-047, D-076).

## Invariants

- **Architecture:** Astro, static by default, TypeScript where appropriate, semantic HTML and CSS, minimal isolated client-side JavaScript, Markdown-first authoring, GitHub Pages. Booking uses an external service where necessary. Add dependencies only through a recorded decision.
- **Physical folders:** real paper-folder tabs with at most three visible levels. Clicking a tab opens its page, and hovering previews only its immediate children. The active tab has a V-shaped indicator and inactive tabs stay visible. No persistent sidebar, no breadcrumbs, no file-manager look. Deeper content goes in the body of the third-level folder.
- **Approved requirements change only through a recorded decision** in `development/decisions.md`, never as a side effect of implementation or debugging.

## Bearnard masters

- `brand/bearnard/bearnard_v1.3.png` is the canonical master. Masters are immutable: never edit, rename, crop, resize, convert, recompress or overwrite them.
- Never run optimization, formatting or cleanup tools over `brand/bearnard/`.
- Generate derivatives into separate folders. Never put full-resolution masters in the site's public directory.
- The site shows Bearnard only through `src/illustrations/bearnard.ts` and `<BearnardIllustration>`, from the committed derivatives in `public/illustrations/bearnard/` (D-073). Make derivatives only with `scripts/bearnard_derivatives.py`, only from approved masters, and never assign an illustration to a role without the owner. Keep `tests/bearnard.mjs` passing.
- Experimental and unclassified images stay that way until the owner approves them (`assets/bearnard/inventory.csv`).
- `brand/bearnard/` is gitignored on purpose. Do not force-add it.

## Version control

- Inspect before modifying, and prefer reversible operations.
- Ordinary prompts work on the persistent `development` branch (D-035). Start from its verified HEAD, check the working tree, implement one milestone, validate it, and commit with the prompt ID. Do not create `feature/pNN` branches.
- Use an `experiment/<topic>` branch or a worktree only for independent, high-risk work that needs isolation, such as `experiment/nucleus`. Never reset, rebase or overwrite `development`; if it has diverged unexpectedly, stop and report.
- Do not commit directly to `main`. Promote to it only for an intended release, in the order of D-082: fetch and inspect, reconcile without discarding commits, check private-file exclusions, validate, confirm the deployment target, then push. Never trigger an unreviewed deployment.
- Commit coherent, verified milestones to `development` without asking each time (D-082). Pushing is permitted but never automatic: decide each time from verification, remote divergence, the repository being public, readiness and deployment implications, and push unfinished work to no remote branch that deploys. Never force-push, rewrite history, amend pushed commits, discard remote-only commits, or move or delete tags.
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
