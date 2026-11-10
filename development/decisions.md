# Decisions

Statuses: **Approved**, **Provisional**, **Experimental**, **Deferred**, **Superseded**.

| ID | Decision | Status | Date |
| --- | --- | --- | --- |
| D-001 | Astro is the site framework | Approved | 2026-11-10 |
| D-002 | Static generation by default; minimal, isolated client-side JavaScript | Approved | 2026-11-10 |
| D-003 | Markdown-first authoring; Python and Quarto for scientific workflows | Approved | 2026-11-10 |
| D-004 | Booking through a separate external service where necessary | Approved; provider Experimental (E-02) | 2026-11-10 |
| D-005 | Deploy to GitHub Pages | Approved; mechanism Deferred | 2026-11-10 |
| D-006 | Pelican as the site generator | Superseded by D-001 | 2026-11-10 |
| D-007 | Archive the Pelican site under `_backup/pelican-legacy/` | Approved | 2026-11-10 |
| D-008 | Retire the Pelican deploy workflow by archiving it | Approved | 2026-11-10 |
| D-009 | Exclude `_backup/` from pre-commit hooks | Approved | 2026-11-10 |
| D-010 | Keep `docs/`, `cv/`, `publications/`, `scripts/`, `data/` and `hyperglam/` at the root | Provisional | 2026-11-10 |
| D-011 | Leave Bearnard masters in `brand/bearnard/`; do not copy them into `assets/bearnard/masters/` yet | Deferred | 2026-11-10 |
| D-012 | Node.js and package manager versions | Deferred to P02 | 2026-11-10 |
| D-013 | One branch per prompt, with a checkpoint tag before structural changes | Approved | 2026-11-10 |
| D-014 | Replace the root README with a short pointer; archive the Pelican README | Approved | 2026-11-10 |

## Details

**D-001 to D-005.** Recorded from the approved technical direction in the P01 brief.

**D-007.** P01 moved files with `git mv`, so the history follows each file and the moves are reversible. Authored content moved together with the application because it is in Pelican's format. Later prompts migrate it from the archive. The tag `pre-astro-checkpoint` and the external backup are the primary restoration mechanisms; the archive is not.

**D-008.** `deploy.yml` built Pelican on every push to `main` and force-pushed the output to `eduardogade/eduardogade.github.io`. With the sources archived it would have failed on the next push. Archiving it means pushes to `main` deploy nothing and the live site stays as last deployed. The eight placeholder workflows are entirely commented out, so they stay where they are. No replacement workflow was added.

**D-009.** See ISSUE-0001. The active hooks would have added a newline to the archived `CNAME`, run `black` on archived Python files, and rejected six empty JSON files. A top-level `exclude: ^_backup/` keeps archived files byte-for-byte without bypassing the hooks.

**D-010.** Every tracked file in `cv/`, `publications/`, `scripts/`, `data/` and `hyperglam/` is an empty placeholder, and their purpose for the new site is unclear. `docs/` holds Pelican-era planning notes. They stay in place until a prompt needs them. This is provisional.

**D-011.** `.gitignore` excludes `brand/bearnard/` on purpose, and the repository is public. Committing masters would publish full-resolution artwork. An untracked second copy adds no protection and invites confusion about which file is authoritative. Options for a later decision: keep masters out of Git and rely on backups and checksums, use private storage, or use Git LFS. Until then the external backup and `assets/bearnard/SHA256SUMS` protect them.

**D-012.** The local Node v26.12.0 is not an LTS release, but meets `astro@7.4.8`'s stated engine range (`>=22.23.4`). P02 chooses the pins.

**D-013.** P01 used `chore/gusmaolab-foundation-p01` and the annotated tag `pre-astro-checkpoint`, both local only.

**D-014.** The old README documented the Pelican build. Leaving it at the root would mislead readers once that build was archived.
