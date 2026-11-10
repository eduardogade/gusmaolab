# ISSUE-0002 — An inspection command modified `.git/config`

| Field | Value |
| --- | --- |
| Issue ID | ISSUE-0002 |
| Related prompt | P01 |
| Status | Resolved |
| Severity | Low: local configuration only, no behavior change |
| Affected component | `.git/config` (local, untracked) |

## Observed symptoms

Comparing the repository with the external backup showed one difference: `.git/config` had gained this section at 13:34:59, after the backup was made:

```ini
[lfs]
	repositoryformatversion = 0
```

## Expected behavior

The P01 inspection is read-only.

## Reproduction steps

Run `git lfs ls-files` in a repository that has no LFS configuration. Git LFS writes the section above.

## Root cause

The initial inspection ran `git lfs ls-files` to look for LFS-tracked files. The command looks read-only but writes repository configuration.

## Fix applied

`git config --local --remove-section lfs`

## Validation

Afterwards `.git/config` was byte-identical to the copy in the backup (checked with `cmp`).

## Relevant commits

None. The change and the fix were both local configuration. `AGENTS.md` now warns that `git lfs` commands write `.git/config`.
