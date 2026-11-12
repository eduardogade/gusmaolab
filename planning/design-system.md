# Design system

Status: **implemented and approved.** Built in P03 (2026-11-10); in P04 the owner reviewed the specimen screenshots and approved the visual direction and overall appearance (D-041). The questions in section 10 remain open refinements. **Deferred visual refinement: typography consolidation** (D-042): the owner would like fewer font families eventually, to be revisited once the folder layout and real pages exist. Change values through a recorded decision.

**P05 (2026-11-10): the physical folders are built (section 9), and the owner approved their appearance after reviewing the screenshots (D-049).** Questions 13–17 in section 10 remain refinements, not blockers.

**P06 (2026-11-11): the folders are the site's navigation, and the owner approved P06 after reviewing the screenshots (D-057).** Their geometry and materials are unchanged. What P06 added:

- the Overview tab, selected by default when a folder with children is open (section 9, D-050, D-051);
- links;
- hover feedback on inactive tabs.

**P07 (2026-11-11): folder previews** (section 9, "Folder previews"). Hovering or keyboard-focusing an unopened folder with children shows a small parchment index card of its contents, hanging from its tab. The folders, tabs, V and environments are unchanged. The owner approved the previews after reviewing the screenshots (D-063); question 21 in section 10 remains a refinement.

**P08 (2026-11-11): small screens** (section 9, "Width and small screens"). The folders stay physical folders at every width: rows scroll sideways and open at their selected tab, keyboard focus stays clear of the edge fades, phones get thinner shell padding and nest insets, touch screens get 44 px tabs, and wide content scrolls inside itself. From 1024 px up the layout is pixel-identical to P07; above 1440 px the shell no longer narrows. The owner approved the small-screen layout after reviewing the screenshots (D-070); question 22 in section 10 remains a refinement.

**P09 (2026-11-11): continuity.** Folder pages cross-fade for 140 ms when the visitor changes folder, instead of cutting in one frame (D-071, ISSUE-0004). It is the site's only motion; reduced motion turns it off.

**P09 (2026-11-11): Bearnard foundations** (section 11). A registry of approved illustrations, one component and the first web derivatives of the v1.3 master exist (D-073). No site page shows Bearnard yet, and no role has an illustration assigned: both await the owner.

**P09 (2026-11-11): environment candidates** (section 7, "Proposed environments"). Each of the four section environments has a proposed, stronger palette, shown beside the approved one at `/_design/environments-v2/` (D-075). They are **candidates pending the owner's approval**: no site page uses them, and the approved environments are unchanged.

**Deferred refinements:** typography consolidation (D-042), unchanged since P04. Stronger palette differences between the environments (D-056) now have candidates (D-075); the question stays open until the owner adopts or rejects each one.

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
- Fluid rhythm: `--space-gutter` (visible flannel around the shell, 8–30.4 px; it stops growing at 1440 px since P08, so the shell never narrows on a wider screen), `--space-shell-padding` (4–18 px: P03's curve from 1024 px up, a steeper one below, P08), `--space-content-inline`, `--space-content-block`.
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
| `--folder-nest-inset`, `--folder-layer-offset` | 0.25–1rem (P08; 0.5–1rem in P05), 0.375rem. The inset follows P05's curve from 1024 px up and a steeper one below, reaching 0.25rem on phones. |
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

### Proposed environments (P09, candidates)

**Status: candidates pending the owner's approval (D-075).** The tables above are still the approved palette, and the only one the site uses. The owner asked for environments that differ more (D-056); P09 proposes one stronger palette for each section, to be compared at `/_design/environments-v2/`, where each section appears twice with the same folders and text.

Rules for the candidates:

- **Colours and materials only.** Folder geometry, tabs, the V, Overview, previews, small-screen behaviour, fonts and type values are the same on both sides (ENV-004). Typography consolidation stays deferred (D-042).
- **Separate from the approved palette.** They live in `src/styles/environment-candidates.css`, as complete contract blocks named `proposed-<section>` plus eleven candidate hues (`--palette-proposed-*`). Only the study loads that file (ENV-005). `environments.css` and `tokens.css` did not change (ENV-006).
- **Same contrast rules.** Each candidate passes all 49 enforced pairings of section 8, and its active and inactive tabs are at least as distinct as the approved ones (ENV-002, ENV-003). Passing proves legibility, not taste.
- **Selective.** Each candidate can be adopted alone, changed or rejected. Adopting one needs a recorded decision; its block then moves into `environments.css` and its hues into `tokens.css`.

The ideas:

- **Scientific:** blue-green (celadon) cardstock outside and the same warm parchment and cream inside, on midnight navy with a navy band and spruce lines. Cool, not sterile; honey stays for small accents.
- **Technical:** a workshop. Honey-kraft folders on a deep spruce workbench instead of charcoal, cream and graph-paper cream inside, honey instead of gold for thread and accent.
- **Literary:** copper cardstock with peach and rich cream papers, an oxblood shell on oxblood flannel with a rust band, ember accents.
- **Personal:** Bearnard's colours, stronger. Amber folders with honey cream inside, and a forest-green flannel with navy bands and forest lines instead of the orange-brown one.

Current → proposed, as resolved. "same" means the candidate keeps the approved value.

| Role | Scientific | Technical | Literary | Personal |
| --- | --- | --- | --- | --- |
| Lining | same | same | `#463128` → `#55301F` | `#683D20` → `#22372C` |
| Flannel band | `#1F1713` → `#202D39` | same | `#74422D` → `#8E3D1C` | `#1F1713` → `#202D39` |
| Flannel line | `#3D4E60` → `#1F5F5B` | same | same | `#202D39` → `#3D6B2F` |
| Flannel thread | same | `#E5B45A` → `#D89348` | `#E5B45A` → `#E6A26F` | `#E5B45A` → `#F2B93B` |
| Shell | same | `#28282D` → `#142D29` | `#32251E` → `#3D1E13` | same |
| Shell border | same | `#454344` → `#374741` | same | same |
| Parent folder | `#D4B089` → `#A9C6B5` | `#D4B089` → `#DBAB68` | `#D5A672` → `#E6A26F` | `#E5B45A` → `#F2B93B` |
| Inactive tab (derived) | `#AC9377` → `#8BA49A` | `#AE9275` → `#AF8F5A` | `#B18A60` → `#C1855B` | `#BA9653` → `#C49A3B` |
| Nested folder | same | `#F4E2C9` → `#F4E9CF` | `#F4E2C9` → `#F6D8B6` | `#F4E2C9` → `#F8E6B6` |
| Inactive nested tab (derived) | same | `#C7B9A7` → `#C3C0AA` | `#C9B8A3` → `#CDAF92` | `#C5BAA9` → `#C8BD9B` |
| Third-level folder (derived) | `#E6CCAC` → `#D2D5C0` | `#E6CCAC` → `#E9CDA1` | `#E6C7A2` → `#EFC096` | `#EDCD97` → `#F5D27F` |
| Inactive third-level tab (derived) | `#BAA993` → `#ABB0A2` | `#BCA890` → `#BAAA87` | `#BEA385` → `#C89C79` | `#C0AA82` → `#C6AE70` |
| Reading paper | same | `#FFF8EA` → `#FCF7E8` | `#FCF1E0` → `#FAEBD3` | same |
| Folder border (base colour) | same | same | `#74422D` → `#8E3D1C` | same |
| Text on the shell | same | `#F4E2C9` → `#F4E9CF` | `#F4E2C9` → `#F6D8B6` | same |
| Muted text on the shell | `#D4B089` → `#A9C6B5` | `#D4B089` → `#DBAB68` | `#D4B089` → `#E6A26F` | `#D4B089` → `#F2B93B` |
| Accent | same | `#E5B45A` → `#D89348` | `#D89348` → `#AA5B22` | same |
| Active state | `#202D39` → `#1F5F5B` | same | same | same |
| Flannel strength | 0.8 → 0.85 | same | same | same |
| Ornament intensity | 0.25 → 0.3 | 0.4 → 0.45 | 0.6 → 0.7 | same |

Primary, secondary and muted text, headings, links, the selection indicator and every font and type value are the same as approved in all four.

Contrast, current → proposed (`tests/environments.mjs`; 49 enforced pairings each, none failing):

| Measure | Scientific | Technical | Literary | Personal |
| --- | --- | --- | --- | --- |
| Tightest enforced pairing | Muted text on nested folder, 4.85 → 4.85 | Label on an inactive tab, 5.05 → 4.86 | Label on an inactive tab, 4.70 → 4.77 | Links on nested folder, 4.96 → 5.08 |
| Primary text on reading paper | 15.59 → 15.59 | 14.00 → 13.82 | 13.25 → 12.61 | 14.00 → 14.00 |
| Links on reading paper | 5.94 → 5.94 | 6.98 → 6.89 | 6.63 → 6.31 | 5.94 → 5.94 |
| Text on the shell | 11.08 → 11.08 | 11.57 → 12.11 | 11.68 → 11.06 | 11.08 → 11.08 |
| Inactive tab against its folder | 1.44 → 1.45 | 1.45 → 1.45 | 1.43 → 1.44 | 1.45 → 1.47 |
| Parent folder against the shell | 6.93 → 7.64 | 7.24 → 6.98 | 6.71 → 7.01 | 7.36 → 7.87 |

What the comparison shows: with the candidates, no two sections share a first-level folder colour (celadon, honey kraft, copper, amber; today scientific and technical share kraft), and the four second-level folders differ, where today all four are the same parchment. What it cannot show: whether the result is better. That is question 24 in section 10.

## 8. Contrast verification

`tests/contrast.mjs` (part of `npm test`) resolves 52 text and indicator pairings in the core and all four environments, using the WCAG 2.2 relative-luminance formula. It enforces 4.5:1 for body text and 3:1 for essential non-text indicators: 245 checks, all passing. Ratios are truncated, never rounded up. Three pairings are informational only: disabled text (WCAG exempts disabled controls) and the two nested-tab silhouettes at the end of the table. P05 added twelve pairings for the second and third folder levels, P06 two for hovered tabs on those levels, and P07 four for the folder previews.

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
| Label on a hovered tab (P06) | 4.5 | 6.21 | 6.94 | 6.20 | 5.73 | 6.60 |
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
| Label on a hovered nested tab (P06) | 4.5 | 9.73 | 10.89 | 9.72 | 9.73 | 9.77 |
| Label on a hovered third-level tab (P06) | 4.5 | 8.03 | 8.98 | 8.07 | 7.75 | 8.18 |
| Item in a folder preview (P07) | 4.5 | 11.67 | 13.00 | 11.67 | 11.67 | 11.67 |
| Hovered item in a folder preview (P07) | 4.5 | 12.11 | 13.49 | 12.66 | 11.54 | 12.16 |
| Title of a folder preview (P07) | 4.5 | 5.37 | 4.84 | 5.37 | 5.37 | 5.37 |
| Focus ring on a folder preview (P07) | 3 | 11.07 | 11.07 | 11.07 | 11.07 | 11.07 |
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

Built in P05 and shown at `/_design/folders/`, a temporary study page (D-048). **Approved by the owner (D-049).** Components: `src/components/folders/`; styles: `src/styles/folders.css`; decisions D-043–D-047.

### Construction

A stack holds one to three folder levels. Each level is a row of tabs, exactly one of them selected, and the selected folder's open body. The body holds the next level or, at the deepest level, the page on ivory paper. Since P06 no row is ever left unselected: an open parent such as `/cv/` selects its Overview tab (below). P05's state, a row of tabs rising from behind the page with none selected, was rejected by the owner and no longer exists.

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

### The Overview tab (P06)

- **Default selection.** When a folder with children is open, its row of children starts with **Overview**, which stands for the folder's own page. On `/cv/` the CV tab is selected on the global row and Overview is selected in CV's row: CV's page opens inside CV's folder, like any other folder's page.
- **Same construction.** Overview is drawn exactly like every other tab: the same card, slope, fillets, seam, V and materials, and the same inactive look when another child is selected. Nothing distinguishes it but its place and its label.
- **Always first.** It leads the row whichever child is selected, followed by the children in registry order.
- **Only where needed.** A folder without children adds no row, so there is never a row holding only an Overview.
- **One level only.** An Overview never opens a further row.
- **Label.** The label is "Overview" everywhere. A section-specific label or treatment would be a later decision.

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

### Width and small screens (P08)

The folders are physical folders at every width (D-064). **Approved by the owner (D-070).** Nothing turns into a menu, sidebar, accordion or icon row, labels are never shortened, and every level stays visible.

| Width | Shell | Global row | Nesting |
| --- | --- | --- | --- |
| 1440 px and wider | 1219 px, centred on the flannel (unchanged from 1440 px up since P08) | Fits | P05 insets (1rem) |
| 1280 px | 1226 px | Fits | P05 insets |
| 1024 px | 980 px | Scrolls (215 px more) | P05 insets (15 px) |
| 768 px | 734 px | Scrolls | About 11 px |
| 320–430 px | The screen less an 8–10 px band of flannel on each side | Scrolls | 4 px; shell padding 4 px |

- **Rows that do not fit scroll sideways inside their folder**, never the page:
  - The scrollbar stays hidden, because it would sit between tabs and folder.
  - A fade in the ground color marks an edge beyond which more tabs lie, and the next tab shows cut off at the edge. Neither appears when the row fits.
  - Touch swipes, trackpads, Shift + wheel and keyboard focus scroll a row; nothing hijacks vertical scrolling, and there are no scroll buttons (question 22).
- **The selected tab is in view when the page opens.** Chromium opens each row with its selected tab in the middle (`scroll-initial-target`); other browsers get the same from `src/scripts/folder-rows.ts`, only when the tab would otherwise be hidden (D-066). On `/bearnards-area/powerlifting/` at 390 px, both Bearnard's Area and Powerlifting are in view at once.
- **Keyboard focus stays clear of the fades.** Each row's `scroll-padding-inline` is a fade plus a focus ring (25 px); the script moves a row the few pixels the browser leaves, so a focused tab and its ring are never under a fade (D-066).
- **Phones get room to read.** Shell padding and nest insets shrink below 1024 px, down to 4 px each on phones (D-065). Three levels at 320 px leave a 238 px reading column (206 px before P08); two levels at 390 px leave 312 px (285 px). The paper keeps its padding, and the selected tabs, V, seams and shadows are unchanged.
- **Touch targets.** Under a coarse pointer, nested tabs take the level-1 height, so every tab is at least 44 px tall (D-067). Mouse users see the P05 heights.
- **Vertical space.** Thinner insets also bring the content up: on `/cv/` at 390 px the page heading starts at 222 px instead of 236 px. No folder level is ever dropped to save height.
- **Previews** (P07) are unchanged: they open on hover and keyboard focus at every width, stay inside the screen, follow their tab when its row scrolls, and close if it scrolls out of sight. Touch never opens them.
- **CV's row.** Its nine tabs need about 1,300 px, so it scrolls at every width, opening at the selected tab (KL-20). "Outreach / Public Engagement" wraps to two lines inside its 16rem tab and is wider than the clear middle of a 320 px row; its label still shows whole when selected.

### Wide content in the folders (P08)

- Text reflows to the paper's width. Long words and addresses wrap: headings, paragraphs and list items since P03, everything else on the paper since P08.
- Code blocks and display formulas scroll inside themselves (P03). Images fit their column.
- Wide tables and figures go in a `.gl-scroll-x` region (`tabindex="0"`, `role="region"`, a name), which scrolls inside its column; tables keep their size rather than shrink.
- Anything still too wide scrolls the paper sideways, never the page (D-068).
- Study case I shows all of it in the deepest synthetic folder.

### Links and semantics (P06)

- **Links.** On site pages every tab is a link to its page. The whole card is the click target: a stretched pseudo-element of the link covers the tab. Labels keep the tab text color, with no underline.
- **Landmarks.** Each row is a navigation landmark named "Sections" or "‹Parent› folders". The page's content is `<main>`, on the paper inside the deepest folder, after every row.
- **Current page.** The tab that stands for the page has `aria-current="page"`: Overview on a parent's page, or the folder's own tab on a leaf. The other selected tabs are open folders containing the page, with `aria-current="true"`. The V stays decorative.
- **Overview's accessible name.** It reads "Overview of CV", from visually hidden text after the visible label.
- **No ARIA tab roles.** These are links between pages.
- **Hover.** An inactive tab's card lightens to `--color-folder-tab-hover` (level 1), `--color-folder-tab-hover-nested` or `--color-folder-tab-hover-deep`: the level's material mixed 90% with the shell. There is no transition and no other change. Labels on hovered tabs reach 5.73:1 or more. Hover also previews an unopened folder's children (P07, below).
- **Focus.** Keyboard focus uses the global ring (3 px navy, 2 px offset) around the label. Checked on real tab links in P06: the ring shows and the scrolling row does not clip it.
- **Design studies.** Studies draw tabs as labels, without links. Each case is a picture of one state.

### Folder previews (P07)

A preview is a glimpse into an unopened folder, not another open folder (D-058, D-061). **Approved by the owner (D-063).** Shown at `/_design/folders/` (every case; case H previews a second-level folder) and on every site page.

- **Material.** A small index card of parchment, `--color-folder-preview`, with a hairline `--color-folder-border` edge, a 2 px top edge in the environment's `--color-accent` (honey, gold or eye green), `--shadow-paper-raised` and `--radius-card` lower corners. It has no tab, no V and no folder body, so it never reads as a fourth folder.
- **Content.** A small upper-case title in `--color-text-muted` (the folder's name), then the folder's Overview and its children as a compact vertical list in `--font-size-tab-preview` at medium weight, in the tab text color. Labels are never cut: the card is as wide as its longest label, up to a tab's maximum label width plus padding, and wraps no sooner than a tab would.
- **Anchoring.** It hangs from the foot of its tab, left-aligned with the part of the tab its row lets through, and at least as wide as that part. It never covers its own tab. Near the viewport's right edge it shifts left to stay 8 px inside; when there is more room above than below, it opens above the tab with its accent edge at the bottom. A list longer than the room left scrolls inside the card.
- **Stacking.** The card is a popover in the top layer, above every folder level and outside every scrolling row, so nothing clips it and it takes no space in the page: no layout shift, and the page never scrolls sideways. `--z-folder-preview` stays reserved and unused.
- **The tab.** While its card is open, the tab keeps its hover color (`--color-folder-tab-hover…`). The V stays on the open folders and never moves or doubles.
- **Environment.** The card takes the current page's environment, like everything else on it: hovering Writing from a CV page does not turn anything literary.
- **Hover and focus.** A hovered item takes `--color-state-hover` and an underline. Focus uses the global ring (3 px navy, 2 px offset); the card's inner padding keeps it clear of the card's edge.
- **Motion.** None: no transition or animation, so nothing to reduce for `prefers-reduced-motion`.
- **Contrast.** Item 11.54:1 or more, title 4.84:1 or more, focus ring 11.07:1 (section 8).

### Remaining visual questions

- Section 10, questions 13–18 and 20–22.

### Still to come

- **P06 (done):** tabs became links to their pages, with route-driven selection and the Overview tab.
- **P07 (done):** previews of an unopened folder's immediate contents, on hover and keyboard focus (below).
- **P08 (done):** the folders on every screen size (above).
- **P09 (done):** the Bearnard illustration registry, component and first derivatives (section 11). Placing him on real pages comes with the pages.
- **P10 and later:**
  - reading paper for long-form prose (`.gl-prose`), code, mathematics, tables, quotes and callouts;
  - Bearnard on real pages, by role, with approved derivatives only and never full-resolution masters in `public/`;
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
18. **Overview (P06):** it looks exactly like the other tabs. Should it be told apart, for example by a slightly narrower card, a different weight, or a section-specific label?
19. **Stronger environments (D-056):** the owner would like the environments to differ more in palette. P09 proposed one candidate per section (section 7, "Proposed environments"; D-075); see question 24.
20. **Hover (P06):** an inactive tab lightens 12 points towards the folder material when hovered. Too subtle, or right?
21. **Folder previews (P07):** a parchment index card with a honey top edge, hanging from its tab, with a small title and a compact list. Is it distinct enough from the folders without feeling like a generic menu? Should it carry a paper-grain or ruled-card detail, or the hovered folder's own section color?
22. **Small screens (P08):** rows scroll sideways with a fade and a glimpse of the next tab, and no buttons. Is that discoverable enough, or should a row show small "more" arrows or previous/next buttons? Are 4 px insets on phones enough to read three levels as nested folders? Should the flannel band on phones be thinner, or gone?
23. **Bearnard roles (P09):** nine places may show Bearnard (section 11), and none has an illustration yet. Should the v1.3 portrait stand in for any of them, for example the Home welcome, until role-specific poses are approved? Which of the 204 expression candidates, if any, should be approved for which role?
24. **Environment candidates (P09):** which of the four proposed palettes should be adopted, changed or dropped (`/_design/environments-v2/`)? Each can be decided alone. Points to judge on a real screen: is celadon right for the scientific folders, or too far from paper? Is the technical spruce workbench too close to the scientific navy at a glance? Is the literary oxblood too heavy behind long reading? Does Personal lose warmth without its orange-brown flannel? Should the twelve global tabs then carry their own sections' colours (question 17)?

## 11. Bearnard illustrations (P09)

Bearnard is the GusmaoLab mascot and belongs in every section, scientific and technical ones included (R-05). His canonical identity is the v1.3 master. The site shows only web derivatives of approved masters, through one registry and one component (D-073; `planning/architecture.md`, "Bearnard illustrations").

### What is registered

| ID | Master | Category | Files | Roles |
| --- | --- | --- | --- | --- |
| `bearnard-v1.3-portrait` | `brand/bearnard/bearnard_v1.3.png` (892 × 1763) | canonical-master | WebP, 320 × 632 (54,626 bytes) and 640 × 1265 (187,394 bytes), transparent | none assigned |

Alt text: "Bearnard, a cheerful dark-furred bear in tortoiseshell glasses, a plaid flannel shirt over a DNA T-shirt and jeans, smiling with a steaming mug in his paw."

### Roles

A role is a place in the site that may show Bearnard. An illustration is assigned to a role only when the owner approves that pairing; until then the role is empty and pages render their fallback.

| Role | Meant for | Illustration |
| --- | --- | --- |
| `home-welcome` | The Home page greeting | None approved yet |
| `research` | Research and laboratory pages | None approved yet |
| `teaching` | Lecture notes and teaching pages | None approved yet |
| `reading` | The Book Club and reading lists | None approved yet |
| `writing` | Writing and the literary collections | None approved yet |
| `technical-explaining` | Technical explanations and tutorials | None approved yet |
| `under-construction` | Pages whose content is not written yet | None approved yet |
| `not-found` | The 404 page | None approved yet |
| `booking` | The scheduling page | None approved yet |

### Using the component

```astro
<BearnardIllustration role="not-found" />
<BearnardIllustration variant="bearnard-v1.3-portrait" sizes="(min-width: 64rem) 9rem, 30vw" />
<BearnardIllustration role="booking"><p slot="fallback">…</p></BearnardIllustration>
<BearnardIllustration variant="bearnard-v1.3-portrait" decorative />
```

- The image fills its container's width and keeps its aspect ratio: size the container, not the image, and pass `sizes` to match. It is never cropped, stretched, recoloured or flipped.
- It stands on folder paper or a shell, never directly on the flannel lining, like text.
- It is informative by default. Pass `decorative` only when the text beside it already says everything the picture does.
- At most 320 CSS px wide on a high-density screen with the current files (640 px); a wider placement needs a wider derivative.
- It loads lazily unless `loading="eager"` is passed, for an illustration at the top of a page.
- No animation, no hover effect, no speech bubbles in CSS: expression comes from approved artwork.

## Legacy material

- `docs/design-system.md` is an empty placeholder from the Pelican era.
- `_backup/pelican-legacy/static/css/tokens.css` and `dark.css` hold the old site's generic blue-and-white tokens. P03 did not adopt them.
