# ISSUE-0008 — Private working files are in the tip of the public default branch

| Field | Value |
| --- | --- |
| Issue ID | ISSUE-0008 |
| Related prompt | P24 (found by the Git preflight, 2026-11-24) |
| Status | **Open**, awaiting the owner's decision. The proposed reconciliation removes the files from the tip; only the owner can decide about the history |
| Severity | **High**: private documents are publicly retrievable today |
| Affected component | `origin/main` of the public repository `eduardogade/gusmaolab` (its default branch). The live site is **not** affected: the Pelican build of that commit failed, and nothing was deployed from it |

## Observed symptoms

Commit `1e1c52b` ("GusmaoLab Astro V0.1", 2026-11-16) on `origin/main` added the folder `cv/codex-yaml/`: 16 files of the owner's private CV working folder. `development` ignores that folder on purpose (`.gitignore`, AGENTS.md: only the owner changes it, and nothing from it is published). The same commit added generated output that `development` also ignores: `.astro/`, `dist-demo/` (the demonstration build, with its synthetic articles and development pages), `science/_build/` and `science/.quarto/`. Because `main` is the default branch of a public repository, anyone can browse or download these files now. P24 listed their names only. It did not open, copy or quote any of them, and this record does not name them.

## Expected behavior

The private CV working files, and generated demonstration output, are never in the public repository.

## Reproduction steps

```bash
git ls-tree -r --name-only origin/main -- cv/codex-yaml | wc -l      # 16
git log --oneline origin/main -- cv/codex-yaml                       # 1e1c52b
```

## Root cause

The folder was committed on `main` directly, where `development`'s ignore rules and preservation guards do not apply. It was then pushed. `main` is not protected.

## Proposed fix (owner's decision)

1. **Remove the files from the tip** with the reconciliation merge in `development/p24-release.md`, section 3. That merge's tree equals `development`'s, so the folder leaves `main`. This is proposed and not applied: it needs the owner's approval like any change to `main`. It does not remove the files from history.
2. **Treat the contents as exposed** since 2026-11-16, whatever is done next. Whether anyone named in those documents should be told is the owner's judgement.
3. **Rewrite history** (for example `git filter-repo` on `main` and the branches that hold `1e1c52b`, a force push, and a request to GitHub to purge cached views and pull-request references). This is destructive: it changes the hash of every later commit, and it needs coordinating with every clone. No agent may do it: it is the owner's own act.
4. Make the repository private, or protect `main` (pull requests only) so a direct commit cannot repeat this.

## Validation

Pending. After a reconciliation, `git ls-tree -r --name-only origin/main -- cv/codex-yaml` must print nothing. History stays as the owner decides.

## Relevant commits

`1e1c52b` (adds the files). `5341dcc` and `33cd424` (later commits on `main`). The P24 commit records this issue; it changes nothing on `main`.
