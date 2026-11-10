# Known limitations

Recorded in P01 and updated in P02 and P03 (2026-11-10).

| ID | Limitation |
| --- | --- |
| KL-01 | Bearnard images are not in Git, because `brand/bearnard/` is gitignored. Only the external backup and `assets/bearnard/SHA256SUMS` protect them. The backup is a snapshot from 2026-11-10 13:23, so anything changed after that is unprotected. |
| KL-02 | The private workspace folders `_books/`, `_papers/`, `_references/` and `_reports/` are gitignored and protected only by the external backup. They hold private material and must never be committed to this public repository. |
| KL-03 | Git cannot track empty folders. `backup/`, `releases/`, `resources/`, `viz/` and `_logo/` exist only on disk and in the backup. |
| KL-04 | The legacy site no longer builds from the root. Building it from inside `_backup/pelican-legacy/` was not tested, and Pelican is not installed in the default shell. |
| KL-05 | Much of the legacy content is empty: 4 blog posts, all 10 Portuguese pages, all 6 data files, and every tracked file in `cv/`, `publications/`, `scripts/`, `data/`, `hyperglam/` and the GusmaoLab theme templates. |
| KL-06 | The local Node.js is v26.12.0. The 26 line has been LTS since v26.13.0 (2026-10-28), but this build predates that and lacks the v26.12.1 security release (2026-10-21). Update to the latest 26.x release; P02 did not change the machine. |
| KL-07 | The pre-commit hook runs from the micromamba environment `web`. Commits will fail if that environment is removed. |
| KL-08 | Two obsolete recruiter-era files, `content/extra/conversion_logix_partial_delivery_5b.zip` and `content/static/ResponseToFelipe/questionnaire.md`, were removed from the working branch in P02 after their backup copies were confirmed. They remain in the public Git history and possibly on the deployed legacy site. Follow-up: ISSUE-0003 (open). |
| KL-09 | The header of `.pre-commit-config.yaml` says no hooks run, but six hooks are active (ISSUE-0001). |
| KL-10 | The backup ZIP was made with macOS Finder: it includes 9,639 `__MACOSX/` metadata entries and one symlink (`node_modules/.bin/prettier`). To restore, extract it outside the repository and ignore `__MACOSX/`. |
| KL-11 | The root `.gitignore` has Python-template patterns, such as `lib/`, `build/`, `env/` and `downloads/`, that match folders at any depth. A future `src/lib/` would be silently ignored. Check new folders with `git check-ignore -v <path>`. |
| KL-12 | Prettier does not format `.astro` files, because `prettier-plugin-astro` is not installed (D-021). |
| KL-13 | Astro's optional peer dependency `@astrojs/markdown-remark` is not installed. Markdown pages may need it; not verified in P02. |
| KL-14 | Astro's telemetry setting was not changed. P02 ran every Astro command with `ASTRO_TELEMETRY_DISABLED=1`. To opt out permanently, run `npx astro telemetry disable`. |
| KL-15 | The typefaces are system fonts. Seravek, Iowan Old Style, Superclarendon and STIX Two Math ship with macOS, and other platforms fall back to relatives such as Calibri, Palatino, Bookman or Georgia. Only macOS rendering was inspected. Chrome does not support `ui-monospace`, so code uses Menlo there. |
| KL-16 | The flannel is generated with CSS gradients. It can look more synthetic than a real textile, and its repeat is a fixed 8.25rem. No moiré was seen in Chromium at standard density; high-density screens and other browsers were not inspected. |
| KL-17 | The `prefers-contrast: more`, `forced-colors: active` and print fallbacks exist in CSS but were not checked visually. Screen readers were not tested. The contrast test covers opaque pairings only, not text over the flannel or translucent layers. |
| KL-18 | Astro's HTML compression drops the whitespace where a line in an `.astro` template ends just before an inline element, gluing the words together. Keep such text and its inline element on one line, or add `{" "}`. |
| KL-19 | The P03 visual review used Chromium-based browsers only: the Claude desktop app's browser (Chromium 152) and headless Chrome 157, on macOS 26.6.2. Safari and Firefox were not inspected. |
