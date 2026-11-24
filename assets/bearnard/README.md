# Bearnard assets

Inventory and protection rules for Bearnard, the GusmaoLab mascot. Snapshot taken in P01 on 2026-11-10.

## Where the files are

The images are **not in Git**. They live in `brand/bearnard/`, which `.gitignore` excludes on purpose. This folder holds only the records:

| File | Contents |
| --- | --- |
| `inventory.csv` | One row per image: path, format, size, SHA-256, category, status, evidence, and whether the backup holds an identical copy |
| `SHA256SUMS` | The same checksums in `shasum` format |
| `derivatives.json` | Since P09: the provenance of the website's derivatives (source master and its checksum, settings, and each output's size and checksum) |

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
| unclassified | 1 | owner-supplied, kept for future assets | `bearnard-favicon-full.png` (1024 × 1024): added by the owner in P24A (D-168). It is **not** the favicon (the favicon's source is `brand/favicon.ico`) and no derivative is made from it until the owner approves one |

No sticker, Under Construction or error-page illustrations were found by filename. The 17 non-image files in `expressions2/` (prompts, review notes, scripts) are not inventoried.

## Rules

1. Masters are immutable inputs. Never edit, rename, crop, resize, convert, recompress or overwrite them.
2. Never run image optimization, formatting or cleanup tools over `brand/bearnard/`.
3. Generate derivatives into a separate folder, only from masters the inventory lists as `canonical-master` or `approved-derived` (see "Website derivatives").
4. Never put full-resolution masters in the website's public directory.
5. Only the owner can approve an experimental or unclassified image. Record approvals in `development/decisions.md` and update `inventory.csv`.
6. Do not force-add `brand/bearnard/` to Git.

## Website derivatives (P09)

The website never reads the masters. It uses small WebP derivatives, which are in Git:

| Derivative | Size | Bytes | Made from |
| --- | --- | ---: | --- |
| `public/illustrations/bearnard/bearnard-v1.3-portrait-320.webp` | 320 × 632 | 54,626 | `brand/bearnard/bearnard_v1.3.png` |
| `public/illustrations/bearnard/bearnard-v1.3-portrait-640.webp` | 640 × 1265 | 187,394 | `brand/bearnard/bearnard_v1.3.png` |

`scripts/bearnard_derivatives.py` made them and wrote `derivatives.json`. It only reads a master, and only after checking that the inventory lists it as approved and that its checksum matches the inventory and `SHA256SUMS`; it refuses to write inside `brand/bearnard/`. To add a derivative after the owner approves an illustration: add it to the script's list, run `python3 -I scripts/bearnard_derivatives.py` (needs Pillow with WebP support), add the illustration to `src/illustrations/bearnard.ts`, run `npm run verify`, and commit the new files with `derivatives.json`.

The derivatives are not masters: they are not listed in `inventory.csv` or `SHA256SUMS`, and `tests/bearnard.mjs` checks them against `derivatives.json` instead. Which illustration appears where is recorded in `src/illustrations/bearnard.ts` and `planning/design-system.md`, section 11.

## Proposed organization (deferred)

P01 proposed `assets/bearnard/masters/` as the home for masters, but did not copy any files there. The owner keeps Bearnard images out of this public repository on purpose, and a second untracked copy would add confusion without adding protection. How to store and version the masters is an open decision (`development/decisions.md`, D-011).
