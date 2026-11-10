# ISSUE-0001 — Pre-commit hooks would rewrite or reject archived files

| Field | Value |
| --- | --- |
| Issue ID | ISSUE-0001 |
| Related prompt | P01 |
| Status | Resolved |
| Severity | Medium: it would have blocked the archive commit or changed archived files |
| Affected component | `.pre-commit-config.yaml` and the installed `.git/hooks/pre-commit` |

## Observed symptoms

A pre-commit hook is installed (pre-commit 4.5.1, micromamba environment `web`). Six hooks are active even though the config header says none run: `trailing-whitespace`, `end-of-file-fixer`, `check-yaml`, `check-json`, `mixed-line-ending` and `black`. pre-commit checks renamed files at their new paths.

A read-only check of the 190 tracked text files to be archived found:

- `content/extra/CNAME` has no final newline, so `end-of-file-fixer` would add one.
- The six JSON files in `content/data/` are empty, so `check-json` would reject them.
- `black` would run on the archived Python files. Its `exclude` only covered `output/`, `themes/` and `static/` at their old paths.

## Expected behavior

The archive commit consists of byte-identical renames and passes the hooks without bypassing them.

## Reproduction steps

Without the fix: stage `git mv content _backup/pelican-legacy/content`, then run `pre-commit run`. This was not executed. The outcome is predicted from the hook definitions and the file checks above.

## Root cause

The config had no exclusion for archived files, and renames count as changed files.

## Fix applied

A top-level `exclude: ^_backup/` in `.pre-commit-config.yaml` (decision D-009).

## Validation

- `pre-commit validate-config` passed.
- During the archive commit, `check json` and `black` reported "no files to check", and the other hooks passed.
- All 183 renames are 100% similar.

## Relevant commits

`e33e333` — chore(workspace): archive legacy Pelican site under _backup/pelican-legacy [P01]
