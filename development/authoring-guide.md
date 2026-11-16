# Authoring guide

How to write and publish a GusmaoLab article (P14, D-107 to D-111). You need Node.js (see `.node-version`), `npm ci` run once, and an editor. For a Quarto article you also need Quarto and the scientific environment ([scientific-environment.md](scientific-environment.md)).

## Quick reference

```text
Create Markdown  → npm run content:new -- --collection <id> --title "<title>"
Create Quarto    → npm run content:new -- --collection <id> --format qmd --title "<title>"
Validate         → npm run content:validate -- --all
Preview          → npm run content:preview -- --collection <id> --slug <slug>
Publish          → npm run content:publish -- --collection <id> --slug <slug> --date YYYY-MM-DD [--yes]
Archive          → npm run content:archive -- --collection <id> --slug <slug> [--yes]
```

Five commands; Quarto is an option of `new`. `npm run content:<command> -- --help` prints the options. The same list is on the development workbench: `npm run dev`, then Home → Lecture Notes → The Greenhouse → Publishing Workbench.

None of them commits, pushes, deploys, or runs a notebook cell. `publish` and `archive` only show what they would change until you add `--yes`.

## 1. Choose a collection

| `--collection` | Where it appears | Markdown | Quarto |
| --- | --- | --- | --- |
| `blog` | Blog | yes | no |
| `trail` | Lecture Notes → Bearnard's Trail | yes | yes |
| `greenhouse` | Lecture Notes → The Greenhouse | yes | yes |
| `berries` | Lecture Notes → Berries | yes | no |
| `timberLogs` | Lecture Notes → Timber Logs (needs `--period YYYY-MM`) | yes | no |
| `monthsOriginal` | Writing → Months' Original (needs `--period YYYY-MM`) | yes | no |
| `kosmos` | Writing → Kosmos Series (needs `--work <slug>`) | yes | no |
| `bookClub` | Writing → Book Club (needs `--book "<title>"`) | yes | no |

`npm run content:new -- --help` lists every option each collection has. A flag that belongs to another collection is an error, not ignored.

## 2. Choose Markdown or Quarto

Write **Markdown** unless the article needs what only Quarto gives: numbered equations, computed figures and tables, cross-references, citations from a bibliography. Markdown is a single file you can read anywhere. Quarto is offered only for The Greenhouse and Bearnard's Trail, the collections where it is built and tested.

## 3. Create a draft

```bash
npm run content:new -- --collection greenhouse --title "Eigenvalues, Gently"
```

This writes `src/content/greenhouse/eigenvalues-gently.md` and prints the address it will have. The article starts as `status: draft`, with no date: nothing is invented. The slug (`eigenvalues-gently`) is suggested from the title **once**. After that it is fixed, and a later change of title never moves the address. Use `--slug` to choose your own. The command never overwrites a file, and refuses a slug that is already taken.

For Quarto, `--format qmd` writes `science/greenhouse/<slug>.qmd`, and also registers it (`src/content/greenhouse/<slug>.md`, `src/science/…`). It does this without running code. If registering fails, the new file is removed again.

## 4. Edit the source

Edit **one file**: the Markdown entry, or the `.qmd`.

- The metadata is the YAML between the first two `---` lines. Unknown keys are errors, so a misspelling cannot hide.
- Start sections at `##`. The title is the page's only `<h1>`.
- The new file has a `TODO` line. Publication is refused until you delete it.
- **Never edit the generated files of a Quarto article**: `src/content/<dir>/<slug>.md`, the fragment under `src/science/`, the figures under `public/assets/scientific/`. They are derived from the `.qmd` and are regenerated.
- Link to other pages from the site root: `/lecture-notes/greenhouse/`, not `../greenhouse/`.
- To relate an article to another, list `<collection directory>/<slug>` under `related:`.

## 5. Preview

```bash
npm run dev          # once, in one terminal
npm run content:preview -- --collection greenhouse --slug eigenvalues-gently
```

The command prints the article's source, state, validation summary and its local address, and says whether the dev server is running and whether the page answered. It prints an address only when the article is valid enough to open. The page is drawn in its real folder with the real reading layout; a draft carries a "Draft preview" notice and appears nowhere else.

For a Quarto article it also tells you whether the generated article is current. If it is stale, `--refresh` re-registers it from the source (nothing is computed).

## 6. Validate

```bash
npm run content:validate -- --all
npm run content:validate -- --collection greenhouse --slug eigenvalues-gently
```

Each finding says which file, which field, what is wrong, and what to do. **Errors** fail the command (exit 1). **Warnings** do not. A draft's missing description or leftover `TODO` is only a warning; the same findings are errors once the article is published, or when you publish it. `--json` prints the findings as data.

The checks are listed on the workbench, grouped, from the same list the code uses. They test that an article is technically ready. They cannot test that it is right.

## 7. Handle errors

| Message | What to do |
| --- | --- |
| `Missing required field` | add the field to the front matter |
| `Unrecognized key` | fix the spelling or remove it |
| `a published entry needs a description` | add `description:` (one sentence, shown in the index) |
| `share the slug` | give one of them another slug |
| `relates to … which does not exist` | fix `related:` |
| `still a draft` (in `related:`) | publish the related entry first, or remove it |
| `"TODO" is still in the text` | write the text or delete the line |
| `is a local path or address` | remove it |
| `Quarto stale` | `npm run science:render -- <dir>/<name>` (computes nothing) |
| `has code … never executed` | `npm run science:execute -- <dir>/<name>` (this one runs the code) |

Every refusal ends with "No files were modified."

## 8. Publish

```bash
npm run content:publish -- --collection greenhouse --slug eigenvalues-gently --date 2026-11-20
```

This checks the draft **as it would be once published**, shows the exact lines it would change, and stops. When you are satisfied, add `--yes`:

```bash
npm run content:publish -- --collection greenhouse --slug eigenvalues-gently --date 2026-11-20 --yes
```

- `--date` says when it is published. `--today` uses today's date. Neither is assumed. A `publishedAt` already in the file is kept and never rewritten.
- It changes only `status:` and `publishedAt:`, leaving the rest of the file as you wrote it. For a Quarto article it then re-registers the article, and puts your source back if that fails.
- It does not commit, push or deploy. **A published source is not a deployed site.** Review `git diff`, commit, and release on your own terms (AGENTS.md, "Version control").

## 9. Update a published article

Edit the file. Keep the slug. To record a revision, add `updatedAt: YYYY-MM-DD` by hand: nothing bumps it for you. Run `content:validate`. A published or archived entry whose slug differs from the last commit is an error: changing a public address is a migration that needs its own decision (no redirect system exists yet).

## 10. Archive

```bash
npm run content:archive -- --collection greenhouse --slug eigenvalues-gently --yes
```

Archiving changes `status:` to `archived` and nothing else. The page stays at its address, keeps its date, stays in the index marked as historical, and is left out of current-featured content. There is no delete command: removing an article is a deliberate edit that you make and commit yourself.

## 11. Quarto: execution and freshness

An article has code only if its `.qmd` contains a fenced `{python}` block. Rendering never runs it. Only this does:

```bash
npm run science:execute -- greenhouse/eigenvalues-gently
```

The status of a Quarto article is one of:

| Status | Meaning | Fix |
| --- | --- | --- |
| current | the generated article matches the source | nothing |
| stale | the source, bibliography or settings changed | `npm run science:render -- <doc>` |
| missing | never rendered, or a generated file is gone | `npm run science:render -- <doc>` |
| computation required | code changed, or was never executed | `npm run science:execute -- <doc>` |
| invalid | a generated file was edited by hand | render again; never edit them |

`npm run build` verifies this offline and never runs Quarto or Python. A stale article stops the build, whatever its status, because the build would otherwise ship a page that is not what the source says.

## 12. Drafts and the repository

The repository is public. A draft never appears on the website (no page, no index entry, no link, no feed), but once you commit its file, its text is in the repository for anyone to read. Keep unfinished work you do not want read out of committed files.

The dev server is a preview, not a lock: do not expose it to a network.

## 13. Troubleshooting

- *The preview says the page answered 404.* The dev server was started before the article existed, or the article has an error: run `content:validate`, then restart `npm run dev`.
- *`content:new` says the slug is taken.* An article with that slug exists in the collection, whatever its file name. Choose another.
- *`content:validate` says `--slug` is ambiguous.* Two files share a slug; `validate --all` shows both.
- *A command says it did not modify files.* It did not. Nothing is partly done.
- *`--slug -x` is rejected as an option.* Write it as `--slug=-x`, or choose a slug that does not start with a hyphen (a slug cannot).

## Where things live

| What | Where |
| --- | --- |
| the commands | `scripts/content.mjs`, `scripts/content-lib.mjs` |
| templates, formats, the command list, the check list | `src/editorial/authoring.ts` |
| collections and metadata rules | `src/editorial/collections.ts`, `src/editorial/schema.ts` |
| Quarto | `scripts/science.mjs`, `science/README.md` |
| the workbench | `src/pages/[design]/publishing/`, `src/design/publishing/` |
