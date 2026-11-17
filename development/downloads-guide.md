# Downloads guide (P18, D-127)

How a file becomes a public download, and how it stops being one. The site offers a file only when it is **approved by the owner**, **registered**, and **present**. Being in the repository is never approval.

## What exists

- **The registry:** `src/data/downloads.ts`. `DOWNLOADS` holds approved files (none yet). `PLANNED_DOWNLOADS` holds files the site expects later (today: the CV as a PDF). A planned entry has no path, no file name and no link, and is shown only as "Not yet available: waiting for …".
- **The rules:** `src/downloads/registry.ts` (`validateDownloads`), and the file reads in `src/downloads/files.ts`.
- **The component:** `src/components/downloads/DownloadList.astro`. It reads each file's real size, shows type, size and version, and links with an ordinary `<a href download>`. It draws nothing for empty lists.
- **The check:** `scripts/downloads.mjs`, run by `npm run build` before and after Astro builds, and by `npm run downloads:check`. A missing, unregistered or private-looking file fails the build with a sentence naming the file.
- **Where the CV page shows it:** the CV Overview lists `cv`-category downloads and planned ones.

## Publish a file

1. **Get approval.** The owner decides this file is public. Never publish a source (YAML, notes, drafts) or a raw export; produce a document meant for readers.
2. **Name it** with a stable, descriptive, lowercase name: letters, digits, dot, hyphen, underscore (`gusmao-cv-academic.pdf`). No `final`, no `v3-final`, no personal detail, no `cv.yaml`.
3. **Put it in `public/downloads/`.** That is the only folder a download may be served from. (Check with `git check-ignore -v public/downloads/<name>`: the Python template's `downloads/` rule in `.gitignore` is overridden for this folder, D-127.)
4. **Register it** in `DOWNLOADS`:

   ```ts
   {
     id: "cv-academic",                 // stable, lowercase, hyphenated; never changes
     title: "Curriculum vitae (academic, PDF)",
     description: "The academic CV, version 1.2.",
     category: "cv",                    // cv | research | reference | project
     publicPath: "/downloads/gusmao-cv-academic.pdf",
     fileName: "gusmao-cv-academic.pdf",
     mediaType: "application/pdf",
     version: "1.2",                    // only if the document has one; never invented
     approvedOn: "2026-12-01",          // the day the owner approved it
   }
   ```

   Allowed types: PDF, text, Markdown, CSV (`FILE_TYPES`). Size is read from the file; do not type it.
5. **Remove the planned entry** it replaces from `PLANNED_DOWNLOADS`.
6. **Check:** `npm run downloads:check` after `npm run build`, then `npm run verify`.

The page that should show it (the CV page for `category: "cv"`) lists it automatically. To show a download on another page, give that page's entry in `src/site/destinations.ts` a `downloads: "<category>"`.

## Replace a version

Overwrite the file at the same name only if its meaning is unchanged (a typo fix). For a new version, add the new file under a new descriptive name, update the entry (`version`, `approvedOn`), and remove the old file and entry in the same commit. Old links then fail, so keep a file in place if its URL was shared and a redirect is not planned.

## Withdraw a file

Remove its entry and its file from `public/downloads/` in one commit, and, if it should be listed as returning, add a `PLANNED_DOWNLOADS` entry. The build fails if either is missing without the other. A file removed from the repository stays in git history; if a file was private, tell the owner, and do not rewrite history without them.

## What a build excludes

- `public/downloads/` holds only registered files: an unregistered file fails the build.
- A private or unfinished source anywhere in `public/` (a `.yaml`, `CV-…`, `proposta`, `identities.json`, `.env`) fails the build.
- The synthetic fixtures (`src/demos/downloads/`) are served from `/demo-downloads/` by a route that exists only in development and demonstration builds; a release build writes none and is searched for it.

## The CV, later

The unfinished CV (`cv/codex-yaml/CV.proposta.yaml`, then `cv/CV-vX.Y.yaml`) is a private source. The intended path to a public CV download, none of which P18 builds:

1. The owner approves a CV version in `cv/manifest.json`.
2. A public projection is derived through the adapter's allowlist (the P11-A01 snapshot).
3. A reviewed document (a PDF) is produced from that projection, by a tool the owner chooses.
4. The owner approves that PDF; it is placed in `public/downloads/` and registered with `category: "cv"`.
5. The CV page shows it, in place of the planned entry.

Until then the CV page says the document is not yet available, and no link exists.

## Development specimen

`/_design/downloads/` (development and demonstration builds): the real component and the real rules on two small synthetic files that really download, and one planned example. Reach it from the local homepage's development note, the Site Map & Page Coverage page or the Publishing Workbench banner. Tests: `tests/util.mjs` (UTIL-010 to UTIL-021, 050) and `tests/util-browser.mjs` (UTIL-019B, 021B, 022).
