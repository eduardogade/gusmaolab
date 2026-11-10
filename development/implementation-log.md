# Implementation log

Newest entry first.

## P01 — Workspace Audit, Preservation & Astro Preparation — 2026-11-10

**Agent:** Claude Code. **Branch:** `chore/gusmaolab-foundation-p01`, from `main` at `6eedf02`. **Result:** completed. Nothing was pushed.

### Inspection

- The repository root, `~/projects/GusmaoLab`, is the Git top level. `main` was clean and level with `origin/main` at `6eedf02`. One worktree, one submodule (the Flex theme), and no tags, stashes or Git operations in progress.
- `brand/bearnard/` and the private workspace folders are gitignored.
- Codex generated Bearnard expression sheets in `brand/bearnard/expressions2/` until 13:12. Its manifest reports `execution_status: COMPLETE` (204 of 204 images). Nothing in the repository was written after that, and no Codex process had a working directory or open files inside it, so the run was treated as finished.
- CI: only `.github/workflows/deploy.yml` was active (a Pelican build, then a force-push to `eduardogade/eduardogade.github.io`). The other eight workflows are entirely commented out.
- An installed pre-commit hook runs six active hooks (ISSUE-0001).

### Backup verification

- `~/projects/GusmaoLab-pre-astro-backup.zip` is 1,172,441,521 bytes. It was created at 13:24, after the last Codex write and the 13:22 commit.
- `unzip -t` found no errors. There are no absolute paths, `..` components or encrypted entries; one symlink (`node_modules/.bin/prettier`); and 9,639 `__MACOSX/` entries.
- Coverage: the ZIP holds 9,304 of the 9,305 files on disk, including `.git/`, `brand/bearnard/` and the private folders, all with identical size and CRC-32. The missing file is `brand/bearnard/.DS_Store`, written after the backup. One file differed: `.git/config`, which the inspection had modified (ISSUE-0002, fixed).
- All 352 Bearnard images are byte-identical in the backup (SHA-256).

### Changes

1. Created the annotated tag `pre-astro-checkpoint` → `6eedf02` and the branch `chore/gusmaolab-foundation-p01`.
2. Commit `e33e333` archived the Pelican site into `_backup/pelican-legacy/` with `git mv`: 183 renames, all 100% similar, including the Flex submodule (its `.gitmodules` path was updated) and `deploy.yml`. It also removed the empty `themes/` folder left behind, added `_backup/README.md`, and added `exclude: ^_backup/` to `.pre-commit-config.yaml`.
3. The records commit adds `planning/` (6 files), `development/` (6), `debugging/` (4, plus 2 investigation records), `AGENTS.md`, `CLAUDE.md`, a new root `README.md`, and `assets/bearnard/` (`README.md`, `inventory.csv`, `SHA256SUMS`).
4. Local only, not committed: removed the `[lfs]` section the inspection had added to `.git/config` (ISSUE-0002).

Not done, by design: no Astro installation, no dependencies, no masters copied (D-011), no push.

### Retained in place

`brand/`, `docs/`, `cv/`, `publications/`, `scripts/`, `data/` and `hyperglam/` (D-010); the eight placeholder workflows; repository tooling, `LICENSE`, `.python-version`, `clean.sh` and `treecloc.sh`; the private workspace folders; and the empty placeholder folders.

### Validation (before the records commit)

| Check | Result |
| --- | --- |
| Expected files and folders | All present |
| Bearnard checksums (`shasum -a 256 -c`, 352 images) | All match; none of the 370 files in `brand/bearnard/` changed after the backup, apart from `.DS_Store` |
| Backup ZIP | Size and modification time unchanged |
| `git fsck --no-dangling` | No errors (exit code 0) |
| Submodule | Flex at `bbf8768`, working from its new path |
| Workflows | No active workflow in `.github/workflows/` |
| Push | The branch has no upstream; `origin/main` is still `6eedf02` |
| New files ignored by `.gitignore` | None |
| `git diff --cached --check` | No whitespace errors |
| Pelican or Astro build | Not run; neither is required in P01 |

The pre-commit hooks also run when the records commit is made.
