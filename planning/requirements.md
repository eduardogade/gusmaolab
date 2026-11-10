# Requirements

Status: summary written in P01 (2026-11-10) from the P01 brief. The detailed Stage 1–7 specification was not available in the repository. Items marked **To be supplied** need the owner's input.

## Purpose

GusmaoLab is Eduardo Gade Gusmao's personal website and publishing ecosystem. It combines computational biology, bioinformatics, research, software engineering, academic work, technical education, literature and personal interests. It is deliberately unconventional: scientific rigor and visual humor are complementary, not opposing qualities.

## Functional requirements

| ID | Requirement | Details |
| --- | --- | --- |
| R-01 | Physical-folder interface | Inspired by real paper folders, not computer folders. See `information-architecture.md`. |
| R-02 | Folder tabs | Horizontal tabs, at most three visible nesting levels. |
| R-03 | Shared design system | Derived from the bear-pride flag, Bearnard's blue/green/Terrain colors and a cozy lumberjack aesthetic. See `design-system.md`. |
| R-04 | Distinct environments | Sections can look different without losing the shared identity. |
| R-05 | Bearnard throughout | Bearnard v1.3 and approved variants appear across the site. |
| R-06 | Editorial collections | Eight independent collections. See `content-model.md`. |
| R-07 | Canonical records | Reusable records for research projects, publications, people, teaching, talks and related information. |
| R-08 | Nucleus visualization | A three-dimensional, interactive nucleus and chromatin visualization on Home. Feasibility experiment: E-01. |
| R-09 | International clocks | Eight clocks. Cities: **To be supplied**. |
| R-10 | Scheduling and booking | A real booking feature, using a separate external service where necessary. Feasibility experiment: E-02. |
| R-11 | Deployment | GitHub Pages. |

## Technical constraints

- Astro, with TypeScript where appropriate.
- Semantic HTML and CSS.
- Minimal, isolated client-side JavaScript.
- Markdown-first authoring.
- Python and Quarto for scientific workflows when appropriate.
- Static generation by default.

## Asset constraints

- Bearnard masters are immutable inputs. See `assets/bearnard/README.md`.

## To be supplied

- The detailed Stage 1–7 specification.
- Acceptance criteria per feature, beyond the gates in `development/acceptance-matrix.md`.
- Clock cities and the booking provider.
- Whether the site is multilingual. The legacy site had Portuguese page placeholders, all empty.
- Analytics and privacy requirements.
