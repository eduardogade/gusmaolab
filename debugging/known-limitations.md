# Known limitations

Recorded in P01 (2026-11-10).

| ID | Limitation |
| --- | --- |
| KL-01 | Bearnard images are not in Git, because `brand/bearnard/` is gitignored. Only the external backup and `assets/bearnard/SHA256SUMS` protect them. The backup is a snapshot from 2026-11-10 13:23, so anything changed after that is unprotected. |
| KL-02 | The private workspace folders `_books/`, `_papers/`, `_references/` and `_reports/` are gitignored and protected only by the external backup. They hold private material and must never be committed to this public repository. |
| KL-03 | Git cannot track empty folders. `backup/`, `releases/`, `resources/`, `viz/` and `_logo/` exist only on disk and in the backup. |
| KL-04 | The legacy site no longer builds from the root. Building it from inside `_backup/pelican-legacy/` was not tested, and Pelican is not installed in the default shell. |
| KL-05 | Much of the legacy content is empty: 4 blog posts, all 10 Portuguese pages, all 6 data files, and every tracked file in `cv/`, `publications/`, `scripts/`, `data/`, `hyperglam/` and the GusmaoLab theme templates. |
| KL-06 | The local Node.js v26.12.0 is not an LTS release. |
| KL-07 | The pre-commit hook runs from the micromamba environment `web`. Commits will fail if that environment is removed. |
| KL-08 | Two obsolete recruiter-era files, `content/extra/conversion_logix_partial_delivery_5b.zip` and `content/static/ResponseToFelipe/questionnaire.md`, were removed from the working branch in P02 after their backup copies were confirmed. They remain in the public Git history and possibly on the deployed legacy site. Follow-up: ISSUE-0003 (open). |
| KL-09 | The header of `.pre-commit-config.yaml` says no hooks run, but six hooks are active (ISSUE-0001). |
| KL-10 | The backup ZIP was made with macOS Finder: it includes 9,639 `__MACOSX/` metadata entries and one symlink (`node_modules/.bin/prettier`). To restore, extract it outside the repository and ignore `__MACOSX/`. |
