# Content model

Status: summary written in P01 (2026-11-10). Collection schemas are **To be supplied**, expected in Wave III (P10–P14).

## Editorial collections

Each collection is independent.

| Collection | Schema |
| --- | --- |
| Blog | To be supplied |
| Bearnard's Trail | To be supplied |
| The Greenhouse | To be supplied |
| Berries | To be supplied |
| Timber Logs | To be supplied |
| Months' Original | To be supplied |
| Kosmos Series | To be supplied |
| Book Club | To be supplied |

## Canonical records

Records are written once and reused across pages:

- Research projects
- Publications
- People
- Teaching
- Talks
- Related information (**To be supplied**)

Fields, identifiers and relationships are **To be supplied**.

## Authoring

Markdown-first, with Python and Quarto for scientific content when appropriate.

## Legacy content available for migration

Archived in `_backup/pelican-legacy/`. Pages and posts use Pelican's metadata header (`Title:`, `Date:`, `Category:`, `Tags:`, `Slug:`).

| Path | Tracked files | Notes |
| --- | ---: | --- |
| `content/blog/` | 28 | Includes `_archetypes/` (5) and `c03-one-pagers/` (1). Four posts are empty. |
| `content/pages/` | 25 | |
| `content/images/` | 64 | 49 of them in `github/` |
| `content/extra/` | 10 | CV PDF, CNAME, intro videos and a ZIP. `humans.txt`, `robots.txt` and `security.txt` are empty. |
| `content/data/` | 6 | All six JSON files are empty. |
| `content/static/` | 4 | |
| `content-pt/pages/` | 10 | All empty (Portuguese placeholders) |

Still at the repository root, and also empty: `cv/cv.md`, `cv/template.tex`, `publications/publications.bib`, `publications/style.csl` and `publications/templates/pub_list.md`.
