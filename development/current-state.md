# Current state

Last updated: P01, 2026-11-10. Verified facts only.

## Framework

- **No framework is active.** The Pelican site is archived in `_backup/pelican-legacy/` and does not build from the repository root.
- **Astro is not installed.** There are no Astro files, dependencies or lockfile yet.
- **The new website is not implemented.** P01 pushed nothing and triggered no deployment.

## Repository

| Item | Value |
| --- | --- |
| Working branch | `chore/gusmaolab-foundation-p01`, local only |
| Base | `main` at `6eedf02a9e8343a77871ff82ae0c8cded3d028a1` |
| Recovery reference | Annotated tag `pre-astro-checkpoint` → `6eedf02`, local only |
| P01 commits | `e33e333` (archive), then the commit that adds these records |
| Remote | `origin` = `git@github.com:eduardogade/GusmaoLab.git`, a **public** repository. 20 other remote branches exist; none were checked out or changed. |
| Submodule | Flex theme, now at `_backup/pelican-legacy/themes/Flex`, commit `bbf8768` |

## Assets

- The 352 Bearnard images are in `brand/bearnard/`, gitignored and unchanged by P01.
- Canonical master: `brand/bearnard/bearnard_v1.3.png`, SHA-256 `71040bf6…d432a`.
- Inventory and checksums: `assets/bearnard/`.
- External backup `GusmaoLab-pre-astro-backup.zip`, in the folder that contains the repository: 1,172,441,521 bytes, created 2026-11-10 13:24 (−03:00). It passed `unzip -t` and holds byte-identical copies of every Bearnard image.

## Legacy archive

Archived with `git mv` as 183 pure renames: the Pelican configuration and tooling (`pelicanconf.py`, `publishconf.py`, `tasks.py`, `Makefile`, `requirements.txt`, `environment.yml`, `environment.txt`), the old `README.md`, `content/`, `content-pt/`, `themes/` (including the Flex submodule), `static/`, `tree.txt`, `cloc.txt` and `.github/workflows/deploy.yml`.

## Records

`planning/`, `development/`, `debugging/`, `AGENTS.md`, `CLAUDE.md` and a new root `README.md` exist. The planning documents are summaries with marked gaps.

## Completed prompts

P01.

## Blockers

None for P02.

## Waiting for the owner

- Node.js and package manager pins (P02).
- The new deployment design: target repository, CNAME and token.
- How to store Bearnard masters (D-011).
- A review of potentially sensitive tracked files (`debugging/known-limitations.md`, KL-08).
- Approval of the 204 Codex expression candidates.
