# ISSUE-0003 — Recruiter-era files remain in public Git history

| Field | Value |
| --- | --- |
| Issue ID | ISSUE-0003 |
| Related prompt | P02 |
| Status | **Open**, awaiting the owner's decision |
| Severity | Medium: obsolete recruiter-related material may be publicly retrievable |
| Affected component | Git history of the public repository `eduardogade/GusmaoLab`; possibly the deployed legacy site |

## Observed symptoms

P01 flagged two tracked files (KL-08). With the owner's authorization, P02 removed them from the working branch after confirming that the external backup holds byte-identical copies (SHA-256). Their contents were not opened or displayed.

| File | Size |
| --- | ---: |
| `_backup/pelican-legacy/content/extra/conversion_logix_partial_delivery_5b.zip` | 22,412 bytes |
| `_backup/pelican-legacy/content/static/ResponseToFelipe/questionnaire.md` | 13,595 bytes |

- Both files remain in earlier commits under their original `content/…` paths: the ZIP in 2 commits (1 of them on `origin/main`), the questionnaire in 9 (8 on `origin/main`). Anyone can retrieve them from the public history.
- The old Pelican configuration published both: the ZIP was listed in `STATIC_PATHS`, and `content/static/` was published through the `"static"` entry. The deployed site in `eduardogade/eduardogade.github.io` may still serve them. P02 did not check this, because it must not touch that repository.
- The archived `pelicanconf.py` still lists the ZIP in `STATIC_PATHS`. It was left unchanged as historical material.

## Expected behavior

Obsolete recruiter-related material is not publicly available.

## Reproduction steps

```bash
git log --all --oneline -- content/extra/conversion_logix_partial_delivery_5b.zip content/static/ResponseToFelipe/questionnaire.md
```

## Root cause

The files were committed to a public repository and published by the old site's static-file settings.

## Proposed fix (owner's decision)

None of these has been applied:

1. Accept the historical exposure.
2. Remove the files from the deployed site, which means changing `eduardogade/eduardogade.github.io`.
3. Rewrite history (for example with `git filter-repo`), force-push, and ask GitHub to purge cached views. This is destructive: it changes every later commit hash and needs coordination with every clone and fork.
4. Make the repository private.

## Validation

Pending the owner's decision. Removing the files from the current branch does **not** resolve this issue.

## Relevant commits

The P02 privacy commit on `chore/gusmaolab-astro-foundation-p02` removed both files from the working branch. To find it:

```bash
git log --diff-filter=D --oneline -- _backup/pelican-legacy/content/extra/conversion_logix_partial_delivery_5b.zip
```
