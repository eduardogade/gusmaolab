# Decisions

Statuses: **Approved**, **Provisional**, **Experimental**, **Deferred**, **Superseded**.

| ID | Decision | Status | Date |
| --- | --- | --- | --- |
| D-001 | Astro is the site framework | Approved | 2026-11-10 |
| D-002 | Static generation by default; minimal, isolated client-side JavaScript | Approved | 2026-11-10 |
| D-003 | Markdown-first authoring; Python and Quarto for scientific workflows | Approved | 2026-11-10 |
| D-004 | Booking through a separate external service where necessary | Approved; provider Experimental (E-02) | 2026-11-10 |
| D-005 | Deploy to GitHub Pages | Approved; mechanism Deferred | 2026-11-10 |
| D-006 | Pelican as the site generator | Superseded by D-001 | 2026-11-10 |
| D-007 | Archive the Pelican site under `_backup/pelican-legacy/` | Approved | 2026-11-10 |
| D-008 | Retire the Pelican deploy workflow by archiving it | Approved | 2026-11-10 |
| D-009 | Exclude `_backup/` from pre-commit hooks | Approved | 2026-11-10 |
| D-010 | Keep `docs/`, `cv/`, `publications/`, `scripts/`, `data/` and `hyperglam/` at the root | Provisional | 2026-11-10 |
| D-011 | Leave Bearnard masters in `brand/bearnard/`; do not copy them into `assets/bearnard/masters/` yet | Deferred | 2026-11-10 |
| D-012 | Node.js 26 LTS line | Approved in P02 (was Deferred) | 2026-11-10 |
| D-013 | One branch per prompt, with a checkpoint tag before structural changes | Approved | 2026-11-10 |
| D-014 | Replace the root README with a short pointer; archive the Pelican README | Approved | 2026-11-10 |
| D-015 | Pin Astro 7.4.8 | Approved | 2026-11-10 |
| D-016 | npm as the package manager; commit `package-lock.json`; install with `npm ci` | Approved | 2026-11-10 |
| D-017 | TypeScript 6.0.3 with `@astrojs/check` 0.9.12 for diagnostics | Approved | 2026-11-10 |
| D-018 | Static output with no adapter; `site` is `https://www.gusmaolab.org`, with no `base` | Approved | 2026-11-10 |
| D-019 | Initial project layout | Approved | 2026-11-10 |
| D-020 | No UI framework, CSS framework or feature library until a feature decision needs one | Approved | 2026-11-10 |
| D-021 | Keep Prettier at 3.6.2; add no Astro plugin yet | Provisional | 2026-11-10 |
| D-022 | Deny fsevents' install script | Approved | 2026-11-10 |
| D-023 | Point the `package.json` license field to `LICENSE` | Approved | 2026-11-10 |
| D-024 | Exclude the archive, `brand/` and the private folders from TypeScript | Approved | 2026-11-10 |
| D-025 | Remove two recruiter-era files from the working branch | Approved by the owner | 2026-11-10 |
| D-026 | Design tokens in three layers of native CSS custom properties, in `src/styles/` | Approved (P03 brief); values Provisional | 2026-11-10 |
| D-027 | Section environments selected declaratively with `data-environment`; a fixed environment contract | Approved | 2026-11-10 |
| D-028 | Palette candidate: 24 primitives and their semantic roles | Provisional, awaiting the owner's review | 2026-11-10 |
| D-029 | Typography from installed system fonts only; no web fonts | Provisional, awaiting the owner's review | 2026-11-10 |
| D-030 | Flannel lining and paper materials in CSS only | Provisional, awaiting the owner's review | 2026-11-10 |
| D-031 | Contrast policy: WCAG 2.2 thresholds, enforced by a test; one focus style everywhere | Approved | 2026-11-10 |
| D-032 | Design checks as plain Node scripts sharing one token reader | Approved | 2026-11-10 |
| D-033 | The temporary homepage becomes the P03 design specimen | Approved (temporary) | 2026-11-10 |
| D-034 | Add `.claude/launch.json` for local preview servers | Approved | 2026-11-10 |

## Details

**D-001 to D-004.** Recorded from the approved technical direction in the P01 brief.

**D-005.** P02 configured only the canonical `site` origin. The deployment mechanism stays deferred: no workflow, GitHub Pages settings, secrets, DNS or `eduardogade.github.io` changes. The old deployment published the separate `eduardogade/eduardogade.github.io` repository; whether the new one does the same is undecided.

**D-007.** P01 moved files with `git mv`, so the history follows each file and the moves are reversible. Authored content moved together with the application because it is in Pelican's format; later prompts migrate it from the archive. The primary restoration mechanisms are the tag `pre-astro-checkpoint` and the external backup, not the archive.

**D-008.** `deploy.yml` built Pelican on every push to `main` and force-pushed the output to `eduardogade/eduardogade.github.io`. With the sources archived, it would have failed on the next push. Archived, it no longer runs, so pushes to `main` deploy nothing and the live site stays as last deployed. The eight placeholder workflows are entirely commented out, so they stay where they are. No replacement workflow was added.

**D-009.** See ISSUE-0001. The active hooks would have added a newline to the archived `CNAME`, run `black` on archived Python files and rejected six empty JSON files. A top-level `exclude: ^_backup/` keeps archived files byte-for-byte without bypassing the hooks.

**D-010.** Every tracked file in `cv/`, `publications/`, `scripts/`, `data/` and `hyperglam/` is an empty placeholder, and their purpose for the new site is unclear. `docs/` holds Pelican-era planning notes. They stay in place until a prompt needs them.

**D-011.** `.gitignore` excludes `brand/bearnard/` on purpose, and the repository is public, so committing masters would publish full-resolution artwork. An untracked second copy adds no protection and invites confusion about which file is authoritative. Options for a later decision: keep masters out of Git and rely on backups and checksums, use private storage, or use Git LFS. Until then, the external backup and `assets/bearnard/SHA256SUMS` protect them.

**D-012.** The nodejs.org release index shows that Node.js 26 entered Active LTS ("Lithium") with v26.13.0 on 2026-10-28. P01 described the local v26.12.0 as "not an LTS release". That was true of that build, which predates the LTS designation, but it wrongly suggested the 26 line was not LTS. Policy: `.node-version` says `26`, so version managers and CI pick the latest 26.x release. `package.json` engines are `>=26.12.0 <27`: from the version validated in P02 up to the next major. The local v26.12.0 lacks the v26.12.1 security release; updating it is the owner's call (KL-06).

**D-013.** P01 used `chore/gusmaolab-foundation-p01` and P02 uses `chore/gusmaolab-astro-foundation-p02`. The annotated tag `pre-astro-checkpoint` marks the original state. All are local only.

**D-014.** The old README documented the Pelican build. Leaving it at the root would have misled readers once that build was archived. P02 expanded the new README with prerequisites and commands.

**D-015.** Astro 7.4.8 is the current stable release: npm `latest`, published 2026-11-09, not deprecated. It requires Node `>=22.23.4` and npm `>=9.6.5`. It is pinned exactly, so upgrades are deliberate decisions.

**D-016.** npm ships with Node.js, and no other package manager is installed. `npm ci` installs exactly what the lockfile records; P02 verified this in an empty copy. `.gitignore` no longer ignores `package-lock.json`.

**D-017.** `astro check` needs `@astrojs/check` and `typescript`. `@astrojs/check` 0.9.12 accepts TypeScript `^5 || ^6`, so the current latest TypeScript, 7.0.2, cannot be used yet. 6.0.3 is the latest 6.x release. `tsconfig.json` extends `astro/tsconfigs/strict`, following Astro 7.4.8's official minimal example.

**D-018.** Static output is Astro's default and matches D-002. `site` sets the canonical origin. The site is served from the domain root, so there is no `base`, even though the source repository is named GusmaoLab.

**D-019.** P02 created `src/pages/`, `src/layouts/` and `tests/smoke-test.mjs`. `src/components/`, `src/styles/` and `public/` will be created when something needs them: nothing does yet, and Git cannot track empty folders. Astro treats `public/` as optional. The homepage is intentionally plain, with no CSS. P03 later added `src/styles/` and `src/design/` (D-026, D-032); `src/components/` and `public/` still do not exist.

**D-020.** No React, Vue, Svelte, Tailwind, Bootstrap, UI kits, Three.js, animation, calendar, Quarto front-end or icon packages. Each needs a feature decision first.

**D-021.** `npm install` briefly upgraded Prettier to 3.9.10 within `^3.6.2`. It was pinned back to the 3.6.2 already in use, so formatting behavior stays the same. Without `prettier-plugin-astro`, Prettier does not format `.astro` files. Revisit when components arrive.

**D-022.** npm 11.20 holds back install scripts until they are approved. fsevents, a macOS file watcher that Vite uses, has an implicit `node-gyp` build script, and its prebuilt binary loads without it. `allowScripts` in `package.json` records the denial.

**D-023.** `LICENSE` is the GNU AGPL v3, while `package.json` said `ISC`, npm's default. `SEE LICENSE IN LICENSE` avoids choosing between `AGPL-3.0-only` and `AGPL-3.0-or-later` on the owner's behalf.

**D-024.** Astro's base preset includes every file under the root and allows JavaScript. Excluding `_backup`, `brand` and the private folders keeps archived and private files out of diagnostics. The empty placeholder scripts in `hyperglam/` and `scripts/` are still included.

**D-025.** The owner authorized deleting obsolete recruiter-related material, which is in the external backup. Both files were confirmed byte-identical there and removed with `git rm` in `d94f170`. Their exposure in the public history remains open as ISSUE-0003.

**D-026.** The P03 brief asked for `tokens.css`, `environments.css` and `global.css`, native CSS, and no Tailwind, Sass, CSS-in-JS or component framework. The layers are primitives (`--palette-*`), semantic tokens and aliases. Aliases are declared on `:root, [data-environment]`: a custom property is computed where it is declared, so a derived token declared only on `:root` would keep its core value inside an environment. BaseLayout imports the three files in cascade order. The structure is approved; the values are not (D-028–D-030).

**D-027.** Every environment defines exactly the 33 tokens of `ENVIRONMENT_TOKENS` in `src/design/contract.mjs`, and `:root` defines them as the core environment. `BaseLayout`'s `environment` prop sets `data-environment` on `<html>`; any element can carry the attribute for a nested scope. No JavaScript theme system and no light/dark toggle. Which section uses which environment comes from the P03 brief for now; P04's route data decides it for real pages.

**D-028.** The brief's suggested colors were kept where they worked (espresso, chestnut, warm brown, muted honey, parchment, warm ivory, charcoal, midnight navy). P03 chose forest `#3D6B2F` from the hue of Bearnard's eyes and added ember, kraft, gold, text tiers, a navy family, spruce, ash and two flannel grounds. Hex values were sampled read-only from the v1.3 master as references, not as specifications. The bear-pride stripes are palette interpretations, not certified flag values. Details and open questions: `planning/design-system.md`.

**D-029.** Seravek for interface and body, Iowan Old Style for editorial text, Superclarendon for display, the system monospace for code and STIX Two Math for MathML. All are installed system fonts, so nothing is downloaded, bundled or redistributed, and the build has no font files. The trade-off: other platforms fall back to close relatives (KL-15). BD Plakatbau, the _Kid A_ reference, is proprietary and unlicensed here, so it was not used.

**D-030.** The flannel is layered CSS gradients (a twill plus warp and weft stripes), scaled by `--texture-flannel-strength`, with `--color-backdrop` as its plain fallback. No image files, no animation, no fixed attachment, and never text on it. It is dropped under `prefers-contrast: more`, `forced-colors: active` and in print. Paper surfaces are flat colors with edge highlights and warm shadows; no paper grain yet.

**D-031.** The thresholds are 4.5:1 for body text and 3:1 for essential non-text indicators, on opaque pairings, in every environment. Disabled text is reported but exempt. Focus uses the same tokens in every environment: a 3 px navy ring on paper and a honey ring on dark surfaces, 2 px offset. Passing the test is not accessibility compliance (KL-17, KL-19).

**D-032.** `npm test` runs three scripts with no test framework: `tests/design-tokens.mjs` (token architecture), `tests/contrast.mjs` (WCAG ratios) and `tests/smoke-test.mjs` (build output). They share `src/design/css-tokens.mjs`, which resolves `var()` and `color-mix(in srgb, …)` as the browser does, and the contract in `src/design/contract.mjs`. The specimen uses the same reader, so the values it shows always match the CSS. The smoke test now checks structural invariants instead of exact text and sizes. It also compares every output file with the Bearnard checksums.

**D-033.** The P02 foundation page is replaced by a specimen, clearly labeled temporary, so the owner can review the visual language before P05–P09 build on it. Its layout styles are scoped to the page and leave with it; the real homepage composition is a later prompt.

**D-034.** The Claude desktop app starts local preview servers from `.claude/launch.json`. `astro-preview` serves the built `dist/` on port 4322, and `astro-dev` runs the dev server on 4321. Both set `ASTRO_TELEMETRY_DISABLED=1` (KL-14). Other tools can ignore the file.
