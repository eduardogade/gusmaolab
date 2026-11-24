# ISSUE-0008 — Private working files are in the tip of the public default branch

| Field | Value |
| --- | --- |
| Issue ID | ISSUE-0008 |
| Related prompt | P24 (found by the Git preflight, 2026-11-24) |
| Status | **Resolved at the tip, by the owner's decision (D-166, 2026-11-24): history kept.** `main`'s tip (`58fcc3b`) no longer holds the files; every earlier commit still does, and the contents are treated as exposed since 2026-11-16 |
| Severity | **High**: private documents were on the public default branch from 2026-11-16 to 2026-11-24, and remain retrievable from its history |
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

Done 2026-11-24: after the reconciliation (`58fcc3b`), `git ls-tree -r --name-only origin/main -- cv/codex-yaml` prints nothing. History is kept, as the owner decided (D-166).

## Relevant commits

`1e1c52b` (adds the files). `5341dcc` and `33cd424` (later commits on `main`). The P24 commit records this issue; it changes nothing on `main`.

## Outcome (2026-11-24)

The owner chose option 1 and not option 3: "Remove from tip only".

- The reconciliation merge `58fcc3b` (parents `2b3b94e` and `33cd424`, tree identical to `development`'s) was pushed to `development` and passed Quality Assurance (run 45472006424). `main` was then fast-forwarded to it.
- `git ls-tree -r --name-only origin/main -- cv/codex-yaml` prints nothing.
- The files remain in the history of `1e1c52b`, `5341dcc` and `33cd424`, as chosen.
- Options 2 and 4 (telling anyone named, protecting `main` or making the repository private) remain the owner's.
- The local branch `main` (`ffafcd3`, never pushed) still holds the files: never check it out or push it.
