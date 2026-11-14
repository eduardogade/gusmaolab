# Scientific articles (P13)

How to write, compute, check and publish an article in Quarto. Astro owns the website and Quarto
only prepares scientific documents for it (D-098): the article keeps its P10 metadata, its one
public address, its folder and the approved Greenhouse layout.

Use Quarto only when an article needs what Markdown cannot do: numbered equations, figure and
table numbers with cross-references, citations with a bibliography, computed figures. Everything
else stays a Markdown entry. Quarto is accepted for the Greenhouse (`greenhouse/`) and Bearnard's
Trail (`trail/`), and for the design study (`design/`); nothing else.

## What lives where

| Path | What | In Git |
| --- | --- | --- |
| `science/<dir>/<name>.qmd` | The source, and the only place the entry's metadata is written | yes |
| `science/<dir>/<name>.bib` | Its bibliography (and an optional `.csl` style) | yes |
| `science/_quarto.yml` | The Quarto settings shared by all documents | yes |
| `science/_freeze/` | The results of the last execution (small) | yes |
| `science/_build/`, `science/.quarto/` | Quarto's own pages and state | no (ignored) |
| `src/science/<dir>/<name>.html` | The article Astro publishes (generated) | yes |
| `src/content/<dir>/<name>.md` | The entry's registration: metadata only (generated) | yes |
| `public/assets/scientific/<dir>/<name>/` | Its figures (generated) | yes |
| `src/science/manifest.json` | Fingerprints of all of the above (generated) | yes |

The generated files are committed so that a build (GitHub Actions included) needs neither Quarto
nor Python. Do not edit them: `npm run science:verify` fails if you do, or if their source changed.

## 1. Create a document

Create `science/greenhouse/<name>.qmd` (`<name>`: lowercase letters, digits and hyphens). Start with
the front matter:

```yaml
---
title: "The title"
description: "One sentence, shown under the title and in the index."
status: draft            # draft | published | archived
slug: the-public-address # the last part of the URL; chosen once
publishedAt: 2026-11-14  # needed once it is published
tags: [statistics]
difficulty: introductory # optional, Greenhouse
prerequisites: [Reading simple Python]
bibliography: the-name.bib
engine: jupyter          # only when the document has code
jupyter: python3
---
```

Every key that is not a Quarto option (`bibliography`, `csl`, `engine`, `jupyter`, `execute`,
`lang`, `link-citations`, `format`) is the entry's P10 metadata and is checked against the
collection's schema when you render: a misspelt or missing field is an error that names it. The
metadata is written here only; the tool derives the entry file from it. Do not write a title as a
`#` heading: the page's own title is the `<h1>`, so sections start at `##`.

## 2. Write it

- **Equations:** `$x^2$` inline; `$$ ... $$ {#eq-name}` displayed and numbered; refer with `@eq-name`.
  They become MathML: no script, no math library, drawn in the site's math face.
- **Figures:** a code cell with `#| label: fig-name`, `#| fig-cap: "..."` and `#| fig-alt: "..."`
  (alt text is required), or `![Caption](file.svg){#fig-name fig-alt="..."}`. Refer with `@fig-name`.
  Figures are image files (SVG, PNG, JPEG, WebP, GIF, at most 500 kB each); no inline HTML or scripts.
- **Tables:** a Markdown table followed by `: Caption {#tbl-name}`, or a code cell with
  `#| label: tbl-name` and `#| tbl-cap: "..."`. Refer with `@tbl-name`. Wide tables scroll inside their box.
- **Citations:** `[@key]` or `@key`, keys from the `.bib` file. A missing key fails the render.
  The style is Pandoc's default author-date; add `csl: style.csl` (a file in the same folder) to change it.
  A bibliography is not a record of your own publications (P11): cite external literature here.
- **Footnotes:** `text[^1]` and `[^1]: the note`.
- **Callouts:** `::: {.callout-note}` ... `:::` (also `-tip`, `-warning`, `-important`, `-caution`), with a
  `## Title` first. The kind is printed as a word, so colour is never the only signal.
- **Code:** a fenced block shows a listing; `{python}` cells run only when you execute (below).

## 3. Preview

```bash
npm run science:render -- greenhouse/<name>   # prepares the article; computes nothing
npm run dev                                   # then open the entry (a draft is previewed in dev)
```

The design study at `/_design/quarto/` shows a finished example beside its Markdown counterpart.

## 4. Compute, explicitly

Code runs only when you ask, and only for the one document you name:

```bash
export SCIENCE_PYTHON=/path/to/python   # a Python with the packages in science/environment.txt
npm run science:execute -- greenhouse/<name>
```

`execute` runs the document's code, freezes the results in `science/_freeze/`, then renders. Run
`npm run science:check` to see which Quarto and Python the tool finds. `render` never computes: if the
code changed since the last execution it stops and tells you to execute. `npm run build`, `npm run check`
and `npm test` run neither; the build only runs `npm run science:verify`, which needs no Quarto and no Python.

The environment: Quarto 1.10.19 (tested; any 1.10 release should do), Python 3.12 with `ipykernel`,
`jupyter_core`, `nbformat`, `nbclient` and `pyyaml` (tested: 7.3.0, 5.9.1, 5.10.4, 0.11.0, 6.0.3). The
demonstration uses only the standard library. Pin the Quarto version in any CI that renders; CI that only
builds needs neither.

Only code you wrote is run, on your machine. Never execute a document from anyone else, and keep private
data out of `science/`: nothing in it is excluded from Git except Quarto's working files.

## 5. Check

```bash
npm run science:verify
```

It fails when a source has no rendering, a source, bibliography or setting changed after rendering,
code changed after it was executed, the frozen results changed, a generated file was edited by hand, or
a generated file has no source. Fix it by running the command it prints.

## 6. Publish

Set `status: published` (and `publishedAt`), render, and run `npm run verify`. The entry is an ordinary
P10 entry: it appears at `/lecture-notes/greenhouse/<slug>/`, in the Greenhouse index, with the
P12 layout. A `draft` has a file but no page. Commit the `.qmd`, the `.bib`, `science/_freeze/` and the
generated files together. Nothing publishes to the web until the site is deployed.
