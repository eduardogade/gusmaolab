# Bearnard assets

Inventory and protection rules for Bearnard, the GusmaoLab mascot. Snapshot taken in P01 on 2026-11-10.

## Where the files are

The images are **not in Git**. They live in `brand/bearnard/`, which `.gitignore` excludes on purpose. This folder holds only the records:

| File | Contents |
| --- | --- |
| `inventory.csv` | One row per image: path, format, size, SHA-256, category, status, evidence, and whether the backup holds an identical copy |
| `SHA256SUMS` | The same checksums in `shasum` format |

To check that nothing has changed, run this from the repository root:

```bash
shasum -a 256 -c --quiet assets/bearnard/SHA256SUMS
```

Git does not protect these images. The external backup `GusmaoLab-pre-astro-backup.zip`, in the folder that contains this repository, held byte-identical copies of all 352 images when P01 checked it.

## Canonical master

| Path | Size | SHA-256 |
| --- | --- | --- |
| `brand/bearnard/bearnard_v1.3.png` | 2,667,446 bytes | `71040bf6607a97f6e627061c7997781464271ababddbeb2603f41944643d432a` |

Evidence: the P01 brief names Bearnard v1.3 the established canonical identity, and the expressions2 kit's master reference (`expressions2/references/bearnard-v1.3.png`) is a byte-identical copy of this file.

## Categories

| Category | Count | Status | Where |
| --- | ---: | --- | --- |
| canonical-master | 1 | confirmed | `bearnard_v1.3.png` |
| approved-derived | 2 | approved references | expression study A (framing) and D (teeth), per the expressions2 kit and `TEETH_CANON.md` |
| historical-version | 5 | not canonical | `bearnard_v1.0`, `v1.1`, `v1.2`, `v1.3-rc2`, `v1.3-rc3` |
| experimental | 204 | candidates, pending user approval | `expressions2/outputs/` (Codex run completed 2026-11-10; 0 approved) |
| experimental | 50 | review artifacts | `expressions2/reviews/` |
| experimental | 55 | unresolved | `expressions/` (34, all but A, D and AH) and `studies/` (21) |
| experimental | 1 | rejected | `expressions/bearnard-expression-v1.3-AH.png`, documented as a negative example |
| working-copy | 3 | duplicates, not authoritative | `expressions2/references/` (copies of the master, A and D) |
| unclassified | 31 | unresolved | `bears/`: no documentation; these may not depict Bearnard |

No sticker, Under Construction or error-page illustrations were found by filename. The 17 non-image files in `expressions2/` (prompts, review notes, scripts) are not inventoried.

## Rules

1. Masters are immutable inputs. Never edit, rename, crop, resize, convert, recompress or overwrite them.
2. Never run image optimization, formatting or cleanup tools over `brand/bearnard/`.
3. Generate derivatives from the master into a separate folder, in a later prompt.
4. Never put full-resolution masters in the website's public directory.
5. Only the owner can approve an experimental or unclassified image. Record approvals in `development/decisions.md` and update `inventory.csv`.
6. Do not force-add `brand/bearnard/` to Git.

## Proposed organization (deferred)

P01 proposed `assets/bearnard/masters/` as the home for masters, but did not copy any files there. The owner keeps Bearnard images out of this public repository on purpose, and a second untracked copy would add confusion without adding protection. How to store and version the masters is an open decision (`development/decisions.md`, D-011).
