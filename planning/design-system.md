# Design system

Status: **implemented and approved.** Built in P03 (2026-11-10); in P04 the owner reviewed the specimen screenshots and approved the visual direction and overall appearance (D-041). The questions in section 10 remain open refinements. **Deferred visual refinement: typography consolidation** (D-042): the owner would like fewer font families eventually, to be revisited once the folder layout and real pages exist. Change values through a recorded decision.

**P05 (2026-11-10): the physical folders are built (section 9) and await the owner's visual review.** Their geometry values, the third folder material and the inactive-tab colors for levels 2 and 3 are provisional until then (D-044–D-047).

Source files: `src/styles/tokens.css`, `src/styles/environments.css`, `src/styles/global.css`, `src/styles/folders.css` and the contract in `src/design/contract.mjs`. The specimen, the folder study and the tests read the values from those files, so this document can go stale but the pages cannot. Regenerate the contrast tables with `node tests/contrast.mjs --markdown`.

## 1. Aesthetic direction (approved)

**The Lumberjack's Archive — Simplified.** A system of real paper folders: kraft, parchment and ivory, inside a dark shell, with a quiet flannel lining around the site. It must feel contemporary: not retro office software, not a file explorer, not a fake wooden cabin.

GusmaoLab is a personal ecosystem, not a corporate portfolio. Scientific rigor, warmth, humor and creative freedom go together, and Bearnard is welcome in every section, including the CV. The site may become richly ornamental later; the rule is to avoid visual incoherence, not exuberance.

| Source | Role |
| --- | --- |
| Bear-pride stripe family | Identity |
| Bearnard (navy fur, green eyes, amber glasses, flannel) | Character |
| Flannel | Atmosphere |
| Physical paper folders | Structure |

## 2. Palette (P03 candidate)

Twenty-four primitives: eleven foundations and thirteen supporting tones. Components never use them directly (section 3).

### Foundations

| Token | Hex | Role | From the brief? |
| --- | --- | --- | --- |
| `--palette-espresso` | `#32251E` | Shell; primary text | Kept as suggested |
| `--palette-chestnut` | `#463128` | Shell edges; dark details | Kept |
| `--palette-warm-brown` | `#74422D` | Bear-pride brown; literary flannel | Kept |
| `--palette-ember` | `#AA5B22` | Bear-pride orange; Bearnard's flannel | Added (sampled from his shirt) |
| `--palette-honey` | `#D89348` | Accents; focus on dark surfaces | Kept |
| `--palette-kraft` | `#D4B089` | Parent folders and their tabs | Added |
| `--palette-parchment` | `#F4E2C9` | Nested folders; quotes; inline code | Kept |
| `--palette-ivory` | `#FFF8EA` | Active reading paper | Kept |
| `--palette-navy` | `#202D39` | Bearnard's fur; focus ring | Kept |
| `--palette-forest` | `#3D6B2F` | Links; the deep side of his eye green | Chosen in P03 |
| `--palette-charcoal` | `#28282D` | Bear-pride black; technical shell | Kept |

### Supporting tones

| Token | Hex | Role |
| --- | --- | --- |
| `--palette-bark` | `#1F1713` | Shadows, flannel bands |
| `--palette-umber` | `#5C4033` | Secondary text |
| `--palette-cocoa` | `#6E5646` | Muted text |
| `--palette-rust` | `#8E3D1C` | Selection indicator; literary links |
| `--palette-gold` | `#E5B45A` | Bear-pride gold; personal folders |
| `--palette-midnight` | `#16202A` | Scientific text and lining |
| `--palette-slate` | `#3D4E60` | Navy edges; scientific secondary text |
| `--palette-denim` | `#556373` | Scientific muted text (Bearnard's jeans) |
| `--palette-eye-green` | `#8DB04A` | Bearnard's vivid eyes; links on dark |
| `--palette-spruce` | `#1F5F5B` | Technical links and details |
| `--palette-ash` | `#8A827A` | Bear-pride gray; disabled states |
| `--palette-terrain` | `#3A3125` | Technical flannel lining |
| `--palette-oxblood` | `#55301F` | Core flannel lining |

### Bear-pride stripe family

No local copy of the flag exists in the repository, so the seven-stripe family was used qualitatively. These are palette interpretations, **not certified flag values**.

| Stripe | Token | Value |
| --- | --- | --- |
| Dark brown | `--color-pride-brown` | warm brown `#74422D` |
| Orange and rust | `--color-pride-orange` | ember `#AA5B22` |
| Golden yellow | `--color-pride-gold` | gold `#E5B45A` |
| Cream and tan | `--color-pride-tan` | parchment `#F4E2C9` |
| White | `--color-pride-white` | ivory `#FFF8EA` |
| Gray | `--color-pride-gray` | ash `#8A827A` |
| Black | `--color-pride-black` | charcoal `#28282D` |

### Bearnard reference samples

Read-only medians from `brand/bearnard/bearnard_v1.3.png` (shaded 3D render, so approximate). The master's checksum was unchanged afterwards.

| Feature | Sample | Used as |
| --- | --- | --- |
| Fur | `#393436` (range `#2A292E`–`#4C4146`) | Navy family; the brief's `#202D39` kept for the role |
| Cream markings | `#D0B59A` | Close to kraft |
| Eyes | `#64712D`, highlights `#799B2C` | Hue for forest and eye green |
| Amber glasses | `#8F6047`–`#CA8754` | Honey and ember |
| Flannel | orange `#AA5B22`, dark check `#302728` | Ember; flannel bands |
| Linen tee | `#DDD1CA` | Parchment and ivory |
| Denim | `#555B5F` | Denim |
| Belt | `#3E2820` | Espresso and chestnut |

### Why these choices

- The suggested candidates were kept wherever they worked; additions fill roles the brief named but did not color (folder material, focus, indicator, text tiers).
- Text tiers (espresso, umber, cocoa) all stay at or above 4.5:1 on parchment, so muted text never fails on any paper.
- Green does double duty: deep forest for text-sized links, vivid eye green only for decoration and links on dark surfaces.
- The mid-tones sit around one lightness band so any of them can become a tab, chip or accent without clashing.

## 3. Token conventions

Three layers, all native CSS custom properties.

| Layer | Prefix or form | Declared in | Used by |
| --- | --- | --- | --- |
| Primitives | `--palette-*` | `:root` in `tokens.css` | `tokens.css` and `environments.css` only (and the specimen's swatches) |
| Semantic tokens | `--color-*`, `--font-*`, `--space-*`, `--radius-*`, `--folder-*`, `--texture-*` … | `:root` in `tokens.css`; contract tokens also in `environments.css` | Components and `global.css` |
| Aliases | semantic tokens built from other semantic tokens | `:root, [data-environment]` in `tokens.css` | Components |

Rules, all enforced by `tests/design-tokens.mjs`:

- Components and `global.css` use semantic tokens only, never primitives or raw colors.
- **The environment contract** (`ENVIRONMENT_TOKENS` in `src/design/contract.mjs`): 33 tokens every environment defines, and `:root` defines as the core defaults. Environments define nothing else.
- **Aliases recompute per environment.** A custom property is computed where it is declared, so a token declared only on `:root` would keep its core value inside an environment. Anything derived from a contract token (inactive tabs, supporting surfaces, shadows) is therefore an alias. A `:root`-only token must not depend on a contract token or an alias.
- `color-mix(in srgb, …)` of primitives is allowed in tokens and environments; the tests resolve it the way the browser does.
- No motion: no transitions, animation or smooth scrolling.

Selecting an environment is declarative: `<BaseLayout environment="scientific">` sets `data-environment` on `<html>`. Any element can also carry `data-environment` for a nested scope (the specimen panels do this), and `global.css` re-applies the body font and color there. Without the attribute, a page uses the core environment. There is no JavaScript theme system and no light/dark toggle.

Inside dark surfaces, the `gl-on-dark` class switches text, links, headings and the focus ring to their on-dark tokens. Global classes use the `gl-` prefix.

## 4. Typography

All four families are fonts already installed on readers' devices, so nothing is downloaded or redistributed.

| Role | Token | Stack (first choice → fallbacks) | Why |
| --- | --- | --- | --- |
| Interface and body | `--font-interface` | Seravek → Gill Sans Nova, Ubuntu, Calibri, DejaVu Sans, Source Sans, sans-serif | Warm humanist sans; friendly without being corporate |
| Editorial | `--font-editorial` | Iowan Old Style → Palatino Linotype, URW Palladio L, P052, serif | Bookish and readable for long prose |
| Display | `--font-display` | Superclarendon → Bookman Old Style, URW Bookman, Georgia Pro, Georgia, serif | A Clarendon with archival, poster warmth; light and bold weights give contemporary contrast |
| Code | `--font-mono` | ui-monospace → Cascadia Code, Source Code Pro, Menlo, Consolas, DejaVu Sans Mono | System monospace |
| Mathematics | `--font-math` | STIX Two Math → Cambria Math, Latin Modern Math, `math` | MathML |

Role tokens map these families per environment: `--font-body`, `--font-heading` (with `--font-heading-weight`, `--font-heading-style`, `--letter-spacing-heading`), `--font-label` (interface) and `--font-code` (mono).

| Token | Value | About 390 px → 1440 px |
| --- | --- | --- |
| `--font-size-body` (core) | `clamp(1rem, 0.96rem + 0.18vw, 1.125rem)` | 16 → 18 px |
| `--font-size-lead` | `clamp(1.125rem, 1.06rem + 0.3vw, 1.3125rem)` | 18 → 21 px |
| `--font-size-h3` | `clamp(1.1875rem, 1.1rem + 0.4vw, 1.4375rem)` | 19 → 23 px |
| `--font-size-h2` | `clamp(1.5rem, 1.3rem + 0.9vw, 2.125rem)` | 24 → 34 px |
| `--font-size-h1` | `clamp(2rem, 1.6rem + 1.9vw, 3.25rem)` | 33 → 52 px |
| `--font-size-display` | `clamp(2.5rem, 1.7rem + 3.9vw, 5.25rem)` | 42 → 84 px |
| `--font-size-sm`, `--font-size-xs` | `0.875rem`, `0.75rem` | 14, 12 px |

- Line heights: display `1.02`, headings `1.15`, interface `1.35`, body `1.6` (literary `1.7`), code `1.6`.
- Letter spacing: display `-0.015em`, headings per environment, uppercase labels `0.09em`.
- Weights: `--font-weight-light` 300 to `--font-weight-black` 900.
- Reading width: `--measure-prose` per environment (62–74ch); `--measure-narrow` 46ch, `--measure-wide` 80ch.
- Folder-tab labels: `--font-size-tab-1` 1rem, `-2` 0.9375rem, `-3` 0.875rem, preview 0.875rem; weight 600; tracking `0.01em`.
- Code: inline `0.9em` on a parchment chip; blocks `0.9375rem` on the shell color.

Every size includes a rem term, so text still grows with browser zoom. Radiohead's _Kid A_ / BD Plakatbau is **not** included: it is a proprietary font, and there is no license. It stays a possible later display experiment if a licensed copy is supplied.

## 5. Space and geometry

- Spacing scale: `--space-3xs` 0.25rem, `2xs` 0.5, `xs` 0.75, `s` 1, `m` 1.5, `l` 2, `xl` 3, `2xl` 4, `3xl` 6.
- Fluid rhythm: `--space-gutter` (visible flannel around the shell, 8–40 px), `--space-shell-padding`, `--space-content-inline`, `--space-content-block`.
- Sizes: `--size-shell-max` 80rem; reading width as above.
- Borders: hairline 1 px, thin 2 px, thick 3 px. Folder borders are translucent bark, so one value works on kraft, parchment and ivory.
- Radii: paper 3 px, control 5 px, card 6 px, folder 10 px, shell 18 px.
- Focus: `--focus-ring-width` 3 px, `--focus-ring-offset` 2 px.

**Folder geometry, used by the folder components since P05 (section 9).** A tab is part of its folder. It rises from the body through concave fillets (`--folder-tab-fillet-radius`), slopes over `--folder-tab-slant`, rounds at `--folder-tab-corner-radius`, and tucks behind its neighbours by `--folder-tab-overlap`. Tabs must never become separate pills. P05 tuned the values in the browser (D-046); the P03 values are in brackets where they changed.

| Token | Value |
| --- | --- |
| `--folder-tab-height-1`, `-2`, `-3` | 2.875rem, 2.625rem, 2.5rem (2.75, 2.5, 2.25): visible height of a selected tab |
| `--folder-tab-padding-inline` | 0.625rem (1.25rem) |
| `--folder-tab-min-inline-size`, `-max-inline-size` | 4.5rem (6rem), 16rem |
| `--folder-tab-slant`, `-corner-radius`, `-fillet-radius` | 0.625rem (0.875rem), 0.5rem, 0.5rem |
| `--folder-tab-overlap`, `--folder-tab-rise` | 0.5rem (0.625rem), 0.25rem |
| `--folder-tab-line-height` | 1.2 (new) |
| `--folder-tab-inactive-mix`, `-hover-mix` | 78%, 90% (share of folder material against the shell) |
| `--folder-indicator-width`, `-depth`, `-gap`, `-stroke` | 1rem, 0.5rem, 0.375rem, 2px (stroke new) |
| `--folder-nest-inset`, `--folder-layer-offset` | 0.5–1rem, 0.375rem |
| `--folder-seam` | 2px (new): how far a selected tab reaches into its body |
| `--folder-strip-headroom` | 0.5rem (new): room above a row for the raised tab and its shadow |
| `--folder-scroll-hint-size` | 1.25rem (new): the fade at the edge of a scrolling row |
| `--z-folder-inactive`, `-body`, `-active`, `-scroll-hint` | 1, 2 (new), 3 (was 2), 4 (new) |
| `--z-folder-preview`, `--z-overlay` | 10, 100 |

## 6. Materials and flannel

| Surface | Core value | Treatment |
| --- | --- | --- |
| Shell `--color-shell` | espresso `#32251E` | Hairline edge, deep soft shadow (`--shadow-shell`) |
| Parent folder `--color-folder-parent` | kraft `#D4B089` | Edge highlight, lifted shadow (`--shadow-folder`) |
| Nested folder `--color-folder-nested` | parchment `#F4E2C9` | Resting shadow, optional recess |
| Third-level folder `--color-folder-deep` (P05) | pale kraft `#E6CCAC`: 45% parent, 55% nested | Edge highlight and resting shadow, like the nested folder |
| Active paper `--color-folder-active` | ivory `#FFF8EA` | Raised shadow; the quietest surface |

Depth comes from edges and soft warm shadows as much as from lightness, so deeper layers step up gently rather than jump. Shadow tokens: `--shadow-shell`, `--shadow-folder`, `--shadow-paper`, `--shadow-paper-raised`, `--shadow-recess`. Edge highlight `--color-folder-edge` (ivory); recess `--color-folder-recess` (bark). Shadows are tinted with each environment's `--color-shadow`, never neutral black.

**Flannel lining** (`.gl-flannel`, in `global.css`), CSS gradients only:

- A 45° twill of 1 px lines every `--texture-flannel-twill` (4 px).
- Warp and weft stripes repeating every `--texture-flannel-sett` (8.25rem): a wide band (6–40%), a narrow line (47–50%) and a fine thread (71–72.4%), the same in both directions so the crossings darken like woven cloth.
- Opacity scales with `--texture-flannel-strength`: band 46%, line 44%, thread 24%, twill 5% at strength 1.
- Fallback: `--color-backdrop`. Strength 0 leaves it plain, and `prefers-contrast: more`, `forced-colors: active` and print drop the pattern.

Rules: no text on the flannel; nothing small or interactive on it; no animation or fixed attachment. Miniatures may scale the sett locally, as the specimen does. The core lining is a red-brown plaid; the personal environment uses Bearnard's own orange-and-dark check.

## 7. Section environments

One folder system, four environments. Section lists come from the P03 brief; P04's navigation data assigns real pages.

| Environment | Sections |
| --- | --- |
| Scientific | CV, Research, Lab, Portfolio |
| Technical | Lecture Notes, The Greenhouse, Bearnard's Trail, Berries, Timber Logs |
| Literary | Writing, Kosmos, Months' Original, Book Club |
| Personal | Bearnard's Area, Photos, Videos, Powerlifting, Bear Life |

| Role | Core | Scientific | Technical | Literary | Personal |
| --- | --- | --- | --- | --- | --- |
| Lining | `#55301F` | `#16202A` | `#3A3125` | `#463128` | `#683D20` |
| Flannel band | `#1F1713` | `#1F1713` | `#1F1713` | `#74422D` | `#1F1713` |
| Flannel line | `#202D39` | `#3D4E60` | `#1F5F5B` | `#1F1713` | `#202D39` |
| Flannel thread | `#D89348` | `#D89348` | `#E5B45A` | `#E5B45A` | `#E5B45A` |
| Shell | `#32251E` | `#202D39` | `#28282D` | `#32251E` | `#202D39` |
| Parent folder | `#D4B089` | `#D4B089` | `#D4B089` | `#D5A672` | `#E5B45A` |
| Inactive tab (derived) | `#B09171` | `#AC9377` | `#AE9275` | `#B18A60` | `#BA9653` |
| Nested folder | `#F4E2C9` | `#F4E2C9` | `#F4E2C9` | `#F4E2C9` | `#F4E2C9` |
| Inactive nested tab (derived, P05) | `#C9B8A3` | `#C5BAA9` | `#C7B9A7` | `#C9B8A3` | `#C5BAA9` |
| Third-level folder (derived, P05) | `#E6CCAC` | `#E6CCAC` | `#E6CCAC` | `#E6C7A2` | `#EDCD97` |
| Inactive third-level tab (derived, P05) | `#BEA78D` | `#BAA993` | `#BCA890` | `#BEA385` | `#C0AA82` |
| Reading paper | `#FFF8EA` | `#FFF8EA` | `#FFF8EA` | `#FCF1E0` | `#FFF8EA` |
| Primary text | `#32251E` | `#16202A` | `#32251E` | `#32251E` | `#32251E` |
| Secondary text | `#5C4033` | `#3D4E60` | `#5C4033` | `#5C4033` | `#5C4033` |
| Muted text | `#6E5646` | `#556373` | `#6E5646` | `#6E5646` | `#6E5646` |
| Links | `#3D6B2F` | `#3D6B2F` | `#1F5F5B` | `#8E3D1C` | `#3D6B2F` |
| Link hover | `#345227` | `#31542E` | `#1F4945` | `#673019` | `#345227` |
| Link on shell | `#8DB04A` | `#8DB04A` | `#E5B45A` | `#D89348` | `#8DB04A` |
| Accent | `#D89348` | `#D89348` | `#E5B45A` | `#D89348` | `#8DB04A` |
| Selection indicator | `#8E3D1C` | `#202D39` | `#1F5F5B` | `#673019` | `#202D39` |
| Code block (derived) | `#32251E` | `#202D39` | `#28282D` | `#32251E` | `#202D39` |
| Body font | Seravek | Seravek | Seravek | Iowan Old Style | Seravek |
| Heading font | Superclarendon 400 | Iowan Old Style 700 | Seravek 700 | Iowan Old Style 700 italic | Superclarendon 700 |
| Body size | 16–18 px | 16–18 px | 16–17 px | 17–20 px | 16–18 px |
| Line height | 1.6 | 1.6 | 1.6 | 1.7 | 1.6 |
| Measure | 68ch | 70ch | 74ch | 62ch | 66ch |
| Flannel strength | 1 | 0.8 | 0.9 | 1.15 | 1.25 |
| Ornament intensity | 0.5 | 0.25 | 0.4 | 0.6 | 1 |

- **Core** (no attribute; the specimen and, provisionally, Home): espresso shell, kraft folders, honey accents, Superclarendon headings.
- **Scientific:** midnight-navy lining and shell, navy-ink text on warm cream, Iowan headings, forest links, restrained honey. Warm and welcoming, never stern.
- **Technical:** terrain lining with spruce lines, a charcoal workbench shell, Seravek headings, spruce links, gold accents; code blocks take the charcoal shell.
- **Literary:** chestnut lining with warmer bands, amber-kraft folders, warmer paper, Iowan for body and italic headings, rust links, a narrower measure.
- **Personal:** Bearnard's palette: his orange flannel check, navy-fur shell, gold folders, Superclarendon Bold headings in navy, eye-green accents, the highest ornament.

## 8. Contrast verification

`tests/contrast.mjs` (part of `npm test`) resolves 46 text and indicator pairings in the core and all four environments, using the WCAG 2.2 relative-luminance formula. It enforces 4.5:1 for body text and 3:1 for essential non-text indicators: 215 checks, all passing. Ratios are truncated, never rounded up. Three pairings are informational only: disabled text (WCAG exempts disabled controls) and the two nested-tab silhouettes at the end of the table. P05 added twelve pairings for the second and third folder levels.

| Pairing | Min | Core | Scientific | Technical | Literary | Personal |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Primary text on reading paper | 4.5 | 14.00 | 15.59 | 14.00 | 13.24 | 14.00 |
| Secondary text on reading paper | 4.5 | 8.88 | 8.08 | 8.88 | 8.40 | 8.88 |
| Muted text on reading paper | 4.5 | 6.44 | 5.81 | 6.44 | 6.09 | 6.44 |
| Links on reading paper | 4.5 | 5.94 | 5.94 | 6.98 | 6.63 | 5.94 |
| Hovered links on reading paper | 4.5 | 8.33 | 8.14 | 9.47 | 9.33 | 8.33 |
| Muted text on nested folder | 4.5 | 5.37 | 4.84 | 5.37 | 5.37 | 5.37 |
| Links on nested folder | 4.5 | 4.95 | 4.95 | 5.82 | 5.84 | 4.95 |
| Primary text on parent folder | 4.5 | 7.30 | 8.13 | 7.30 | 6.71 | 7.75 |
| Label on an inactive tab | 4.5 | 5.02 | 5.64 | 5.05 | 4.70 | 5.33 |
| Text on the dark shell | 4.5 | 11.67 | 11.07 | 11.57 | 11.67 | 11.07 |
| Muted text on the dark shell | 4.5 | 7.30 | 6.93 | 7.24 | 7.30 | 6.93 |
| Links on the dark shell | 4.5 | 5.94 | 5.64 | 7.68 | 5.76 | 5.64 |
| Code block text | 4.5 | 11.67 | 11.07 | 11.57 | 11.67 | 11.07 |
| Selection indicator on the active tab | 3 | 3.65 | 6.93 | 3.64 | 4.73 | 7.35 |
| Focus ring on parent folder | 3 | 6.93 | 6.93 | 6.93 | 6.36 | 7.35 |
| Focus ring on the dark shell | 3 | 5.76 | 5.47 | 5.71 | 5.76 | 5.47 |
| Inactive tab against the shell | 3 | 5.02 | 4.80 | 5.00 | 4.70 | 5.06 |
| Label on an active nested tab (P05) | 4.5 | 11.67 | 13.00 | 11.67 | 11.67 | 11.67 |
| Label on an inactive nested tab (P05) | 4.5 | 7.65 | 8.61 | 7.69 | 7.65 | 7.73 |
| Label on an active third-level tab (P05) | 4.5 | 9.58 | 10.67 | 9.58 | 9.20 | 9.71 |
| Label on an inactive third-level tab (P05) | 4.5 | 6.41 | 7.20 | 6.44 | 6.17 | 6.56 |
| Selection indicator on an active nested tab (P05) | 3 | 5.84 | 11.07 | 5.82 | 8.22 | 11.07 |
| Selection indicator on an active third-level tab (P05) | 3 | 4.79 | 9.09 | 4.77 | 6.48 | 9.21 |
| Focus ring on the third-level folder (P05) | 3 | 9.09 | 9.09 | 9.09 | 8.72 | 9.21 |
| Focus ring on an inactive tab (P05) | 3 | 4.76 | 4.80 | 4.79 | 4.46 | 5.06 |
| Focus ring on an inactive nested tab (P05) | 3 | 7.26 | 7.33 | 7.30 | 7.26 | 7.33 |
| Focus ring on an inactive third-level tab (P05) | 3 | 6.08 | 6.13 | 6.11 | 5.86 | 6.22 |
| Disabled text (informational) | — | 3.57 | 3.57 | 3.57 | 3.38 | 3.57 |
| Inactive nested tab against the parent folder (informational, P05) | — | 1.04 | 1.05 | 1.05 | 1.14 | 1.00 |
| Inactive third-level tab against the nested folder (informational, P05) | — | 1.82 | 1.80 | 1.81 | 1.88 | 1.77 |

The tightest margin is the literary inactive-tab label, at 4.70:1. Any change to the literary parent folder or shell should rerun the test. An inactive nested tab and the kraft folder it stands on have almost the same luminance (1.00–1.14:1). The tab is told apart by its cooler hue, its hairline edge and its shadow, and identified by its label. Paper on paper cannot reach 3:1 without darkening the tabs, so these two are recorded, not enforced (section 10, question 14).

Focus is the same everywhere so it is learnable: a 3 px navy ring on paper and a honey ring on dark surfaces, 2 px offset. Checked live in a Chromium-based browser: keyboard focus shows on a link, a button and a link on the shell, and links change color and underline weight on hover.

**This is not an accessibility certification.** Text over the flannel or translucent layers, real content, Safari and Firefox rendering, forced-colors and high-contrast modes, and screen readers were not assessed in P03.

## 9. Physical folders (P05)

Built in P05 and shown at `/_design/folders/`, a temporary study page (D-048). **Visual approval is pending the owner's review.** Components: `src/components/folders/`; styles: `src/styles/folders.css`; decisions D-043–D-047.

### Construction

A stack holds one to three folder levels. Each level is a row of tabs and, when one tab is selected, that folder's open body. The body holds the next level or, at the deepest level, the page on ivory paper. When no tab in the row is selected (an open parent such as `/cv/`), the row's tabs rise from behind the page itself.

| Level | Folder | Selected tab | Inactive tabs stand on |
| --- | --- | --- | --- |
| 1 | Kraft `--color-folder-parent` | Kraft | The dark shell |
| 2 | Parchment `--color-folder-nested` | Parchment | The kraft body |
| 3 | Pale kraft `--color-folder-deep` | Pale kraft | The parchment body |
| Page | Ivory paper `--color-folder-active` | — | — |

### Tab silhouette

- **Shape.** Each tab is card stock: a flat top with 0.5rem rounded corners and sides that slope outwards by `--folder-tab-slant` towards the folder. The card is two halves, each skewed about its bottom edge; their overlap is invisible because both share one fill. Tabs are as wide as their labels (at least `--folder-tab-min-inline-size`), so the slope is the same on every tab whatever its width.
- **Neighbours.** Tabs overlap at their bases by `--folder-tab-overlap`; a later tab covers the one before it. Their tops stay apart.
- **Edges.** A filter on the card draws one hairline edge and a soft shadow around the whole silhouette, never between the halves. The top edge carries a light highlight: stronger on the selected tab, faint on inactive ones.

### The selected tab and its body

- The selected tab has the body's material and stands in front of it (stacking: inactive tabs 1, body 2, selected tab 3, scroll hints 4; each level isolates its own stacking context).
- It reaches `--folder-seam` (2 px) into the body, covering the body's top-edge highlight, so there is no line between tab and folder.
- A concave fillet at each foot, tangent to the sloping side and to the body's top edge, makes the tab grow out of the folder.
- Its shadow falls sideways onto the inactive tabs, not onto its own body.
- It stands `--folder-tab-rise` (0.25rem) higher than its neighbours.
- The selected state does not depend on color alone: the tab is raised, joined to the open body, and carries the V.

### The V

- A downward chevron below the label, pointing into the open folder. It is an inline SVG, decorative (`aria-hidden`), with no icon library or emoji.
- 1rem × 0.5rem with a 2 px round-capped stroke in `--color-indicator-selected`, the same at every level.
- It contrasts with the tab by 4.77–11.07:1 across levels and environments.

### Inactive tabs

- They use the level's material mixed 78% with the shell (`--color-folder-tab-inactive`, `-inactive-nested`, `-inactive-deep`), darkening a little towards the folder in front of them.
- They stand lower and tuck behind the body's top edge.
- Their labels keep full contrast (5.02:1 or more; section 8). They are not dimmed with opacity and do not look disabled.

### Depth and shadows

- Depth comes from stacking order, the seam, edge highlights and small warm shadows tinted with `--color-shadow`, more than from brightness.
- The level-1 body uses `--shadow-folder`. Nested bodies use an edge highlight plus `--shadow-paper`. The page uses `--shadow-paper-raised`.
- No gradients beyond a faint shade on inactive tabs. No glass, no bevels, no wood grain, no ageing.
- Each level adds `--folder-nest-inset` (0.5–1rem) on each side. Three levels at 390 px leave a reading column of about 300 px.

### Environments

- One stylesheet serves every environment. The components never name an environment; a `data-environment` ancestor changes the materials, text colors, V color and type through tokens.
- The test suite rejects environment selectors in `folders.css`.
- Scientific and personal use navy shells, so their inactive tabs read cooler. Personal folders are gold, and literary ones amber kraft.

### Width

- At 1440 and 1280 px the twelve top-level tabs fit on one row, measured at 1,145 px.
- A row wider than its folder scrolls sideways inside its own strip, never the page (D-047):
  - The scrollbar is hidden, because it would sit between tabs and folder.
  - A fade in the ground color marks an edge with more tabs beyond it.
  - Chromium opens the row centered on its selected tab (`scroll-initial-target`).
- CV's eight second-level tabs need about 1,200 px, more than the 80rem shell allows, so that row always scrolls (KL-20).
- P08 owns the real small-screen and wide-row strategy.

### Semantics

- Tabs are plain labels until P06 makes them links. Each row is a list labelled "Sections" or "‹Parent› folders", and the selected label has `aria-current="true"`.
- No ARIA tab roles, because these will be links between pages.
- Keyboard focus uses the global ring (3 px navy, 2 px offset). Checked on a tab label turned into a link for the test: the ring shows and is not clipped by the scrolling row.

### Remaining visual questions

- Section 10, questions 13–17.

### Still to come

- **P06:** tabs become links to their pages, with route-driven selection.
- **P07:** hover previews of a tab's immediate children, on `--color-folder-preview`, and an equivalent for keyboard users.
- **P08:** the responsive navigation strategy.
- **P09 and later:**
  - reading paper for long-form prose (`.gl-prose`), code, mathematics, tables, quotes and callouts;
  - Bearnard placement, with approved derivatives only and never full-resolution masters in `public/`;
  - environment selection from the route data, through BaseLayout's `environment` prop.

## 10. Unresolved visual questions for the owner

1. **Display face.** Superclarendon (light and bold) is the candidate. Alternatives seen in P03: Iowan Old Style Black Italic (warmer, more literary) or Futura Condensed ExtraBold (poster-like, closer to _Kid A_). It is a macOS font; elsewhere it falls back to Bookman or Georgia.
2. **Self-hosted fonts.** System stacks look as intended on macOS only. An open-licensed self-hosted family would make every platform match; that needs a decision and a license check.
3. **Navy.** Bearnard's fur samples as a desaturated charcoal-navy (`#393436`); the palette keeps the brief's `#202D39`, which reads as navy at interface sizes. Which is "his" color?
4. **Green.** Forest `#3D6B2F` for links and eye green `#8DB04A` for accents. Is the link green right, or should links take a bluer green?
5. **Folder materials.** Kraft `#D4B089` everywhere except literary (amber kraft) and personal (gold). Is gold too bold for the personal folders?
6. **Flannel.** Red-brown plaid for the core, Bearnard's check for personal. Strength, sett size (8.25rem), and whether the CSS weave looks too synthetic.
7. **Scientific text in navy ink** rather than espresso.
8. **Technical shell:** charcoal "workbench" or terrain brown.
9. **The pride mark:** a small seven-band label beside the wordmark. Too subtle, or right?
10. **Wordmark:** the specimen uses a text wordmark; `brand/gusmaolab-logo.svg` is an empty placeholder.
11. **Paper grain:** none yet. Add a subtle texture to kraft only, or keep paper flat?
12. **Ornament:** `--ornament-intensity` exists (0.25–1) but is barely used. What ornament, if any, belongs to each environment?
13. **Folder tabs (P05):** is the slope (0.625rem over a 2.875rem tab) right, or should tabs be squarer or more chamfered? Are the fillets at the foot of the selected tab visible enough?
14. **Inactive nested tabs (P05)** mix towards the shell, so under the navy shells (scientific, personal) they read cool gray against kraft or gold. Should they mix towards their parent folder instead (warmer, but with even less separation)?
15. **Third-level material (P05):** pale kraft between kraft and parchment, or another tone?
16. **Inactive labels (P05)** sit 2 px lower than the selected label, because inactive tabs stand 0.25rem lower and are a little shorter. Should all labels share one baseline instead?
17. **Section colors on the global row (P05):** every tab takes the current page's environment. Should the twelve top-level tabs carry their own sections' colors instead?

## Legacy material

- `docs/design-system.md` is an empty placeholder from the Pelican era.
- `_backup/pelican-legacy/static/css/tokens.css` and `dark.css` hold the old site's generic blue-and-white tokens. P03 did not adopt them.
