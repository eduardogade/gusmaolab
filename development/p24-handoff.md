# P24 handoff — what the release needs (written in P23, 2026-11-24)

P24 deploys and hands over; P23 only records. Nothing below was done in P23.

## Release blockers (the owner must decide or supply)

1. **Contact has no channel** (P23-F08). Schedule sends visitors to Contact, which says none is approved. Approve at least one channel in `src/data/contact.ts` (no form, no address taken from another file).
2. **No favicon or icon** (`/favicon.ico` is a 404 in every browser). A design asset, then a `<link rel="icon">` in `BaseLayout.astro`.
3. **Production hostname, HTTPS and DNS** (the build names `https://www.gusmaolab.org`; how it is deployed is not decided yet).

## Release configuration tasks

- Canonical link, Open Graph metadata, `robots.txt`, a public sitemap (QA reports each as a finding: KL-126). GitHub Pages cannot send security headers.
- The release workflow (the only deploying workflow today is `deploy.yml` for the Pelican site, on `main`); pin third-party actions to commit SHAs (they are on major versions); the production smoke test after a deploy.
- Public and private artifact separation check on the real Pages output (the build already refuses private files).
- Documentation and operational handover.

## Repository housekeeping (owner decision F; not changed in P23)

- GitHub answers every push with "This repository moved: `git@github.com:eduardogade/gusmaolab.git`". The remote URL was not changed.
- Eight commented-out placeholder workflows (`artifact_keep5`, `build_deploy`, `lighthouse_ci`, `link_check`, `nightly_resource_metrics`, `pa11y_axe`, `pandoc_cv`, `visual_regression`) fail on every push (KL-129). Decide in P24: delete, or fill in.

## Not done on purpose, and why

- **Scientific CI tier** (owner decision E). The static job skips 13 checks (11 Quarto, 1 scientific environment, 1 protected Bearnard masters) and says so. A separate tier would run them on a schedule or on demand rather than in every push: Quarto and the micromamba environment are about a gigabyte and several minutes. Useful before the first real scientific article is published; not needed for the first release.
- **Cal.com** stays disabled and its 19 checks DEFERRED, owner-controlled and not a deployment prerequisite.
- **Successful-run diagnostics** (owner decision C): a few lines kept for a passing CI run (the dev server's `dev server stopped…`, which touch gesture moved the row, the renderer's start and cleanup) were not added; optional housekeeping.
- **A machine-relative frame budget** (owner decision A): not introduced; D-159's two thresholds stand.

## Unfinished content (nothing is invented)

About, Contact, Portfolio, the CV and its eight sections, the Lab and its six sections, Bearnard's Area and its four sections are "in preparation" or empty; Blog, the four Lecture Notes collections and the three Writing collections are empty. Bearnard's other poses (professional, lab, cosy, educational) are separate artwork. The future multi-domain nucleus is deferred (`planning/nucleus-multidomain.md`).

## Not tested yet (for the owner's final review)

Safari, a physical phone or tablet, VoiceOver or NVDA (walkthroughs in `development/p23-review.md`, section 4).

## Suggested final review path

`npm run dev` → Home → the eleven tabs and their previews → the Greenhouse demonstration article (Development Demonstrations) → Contact → Schedule → a nonexistent address → the QA inspector (`/_design/quality/`) → `development/p23-review.md`.
