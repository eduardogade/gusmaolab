# Current state

Last updated: P04, 2026-11-10. Verified facts only.

## Framework

- **Astro 7.4.8**, static output. The repository root is the Astro project.
- The only page is the **temporary P03 design specimen** (`src/pages/index.astro`), unchanged in P04. **The physical-folder interface, navigation UI, section pages and Bearnard rendering are not implemented.**
- The archived Pelican site in `_backup/pelican-legacy/` is not built.
- Nothing has been deployed, and no deployment workflow is active.

## Design foundation (P03)

The owner approved the visual direction and overall appearance (D-041). Tokens are in `src/styles/`, the contract in `src/design/`, and the description in `planning/design-system.md`. Typography consolidation is a deferred refinement (D-042).

## Navigation model (P04)

| Item | Where |
| --- | --- |
| Types | `src/navigation/types.ts` |
| Registry: 12 top-level and 25 second-level folders, no third level yet | `src/navigation/registry.ts` |
| Helpers: normalization, validation, resolution, previews | `src/navigation/navigation.ts` |
| Compiled site navigation (`siteNavigation`) | `src/navigation/index.ts` |
| Rules and site map | `planning/information-architecture.md` |

No component uses it yet; P05–P07 build the tabs. Of the 37 registered destinations, only `/` has a page (the specimen). The content-route list is empty until content collections exist.

## Toolchain

| Item | Value |
| --- | --- |
| Node.js policy | The 26 LTS line: `.node-version` says `26`; `package.json` engines `>=26.12.0 <27` |
| Local Node.js | v26.12.0. Compatible, but it predates the first 26 LTS release (v26.13.0) and lacks the v26.12.1 security release. |
| Package manager | npm 11.20.0. `package-lock.json` is committed; install with `npm ci`. |
| Dependencies | `astro` 7.4.8. P03 and P04 added none. |
| Dev dependencies | `@astrojs/check` 0.9.12, `typescript` 6.0.3, `prettier` 3.6.2 (range `^3.6.2`) |
| TypeScript | `astro/tsconfigs/strict` with `erasableSyntaxOnly` |
| Astro config | `site: "https://www.gusmaolab.org"`, `output: "static"`, no `base`, no adapter |
| Local preview | `.claude/launch.json`: `astro-preview` (built site, port 4322) and `astro-dev` (port 4321) |

## npm scripts

`dev`, `build`, `preview`, `check`, `test`, `verify` (`check`, then `build`, then `test`), `astro` and `format`. `npm test` runs `tests/design-tokens.mjs`, `tests/contrast.mjs`, `tests/navigation.mjs` and `tests/smoke-test.mjs`.

## Build status

`npm run verify` passes:

- `astro check`: 0 errors, 0 warnings, 0 hints across 18 files.
- Build: 1 page. `dist/` holds `index.html` and one stylesheet, byte-identical to the P03 build.
- Token checks and contrast checks pass (165 of 165 enforced pairings).
- Navigation: 14 of 14 tests pass (NAV-001 to NAV-014).
- Smoke test passes, including the rule that every built page is a registered destination.

## Repository

| Item | Value |
| --- | --- |
| Working branch | `development` (D-035), local only, created from `851fdbb` (the P03 commit) |
| Milestone branches | `chore/gusmaolab-foundation-p01` (`4096691`), `chore/gusmaolab-astro-foundation-p02` (`5fab52c`), `feat/gusmaolab-design-system-p03` (`851fdbb`), all kept |
| Recovery tag | `pre-astro-checkpoint` → `6eedf02`, local only |
| `main` and `origin/main` | `6036137`, the same tree as the checkpoint. No `development` branch exists on `origin`. |
| Remote | `origin` = `git@github.com:eduardogade/GusmaoLab.git`, public. Nothing was pushed in P01–P04. |
| Untracked | `clean`, a byte-identical copy of `clean.sh` that appeared at 18:01 on 2026-11-10. Claude Code did not create it, and left it alone at the owner's instruction. |

## Assets

- The 352 Bearnard images in `brand/bearnard/` are unchanged and gitignored; every checksum in `assets/bearnard/SHA256SUMS` matches.
- No Bearnard image is in `public/` or `dist/`.

## Legacy archive

Unchanged since P03. ISSUE-0003 stays open: the recruiter-era files in the public history, and a possible third file.

## Completed prompts

P01, P02, P03 and P04.

## Blockers

None for P05.

## Waiting for the owner

- The third-level folders, when content work reaches them (`planning/information-architecture.md` section 3).
- Whether the second-level slugs are final before first publication (D-037).
- Update the local Node.js to the latest 26.x LTS release (KL-06).
- Decide what to do about ISSUE-0003, including the possible third file.
- The deployment design: target repository, CNAME and token (D-005).
- How to store Bearnard masters (D-011).
- Approval of the 204 Codex expression candidates.
- What to do with the untracked `clean` file.

## Bearnard WhatsApp preparation — Prompt 1/3 (2026-11-10)

Local derivatives are complete in `brand/bearnard/expressions2/_all/`: 204 static transparent 512 × 512 WebPs, each ≤100,000 bytes (79,210–99,996 bytes; total 18,872,908 bytes). All exports pass decode, static-frame, dimensions, alpha, margin and size checks. All 210 protected source/reference/prompt files retain their hashes. Nine existing side-edge contacts are documented and preserved. Every sticker received overview QA; 18 representative/edge cases received larger previews. Ready for emotional categorization; no packs or app were created. Script, manifest, preparation report and QA previews are local ignored assets.
