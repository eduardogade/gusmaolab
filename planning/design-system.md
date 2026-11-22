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

**P09-A01 (2026-11-12): the Chromatic Archive** (section 7). **Approved and locked by the owner (D-076).** Colour now belongs to five archive categories (Core, Research, Blog & Notes, Writing, Bearnard), each a permanent cardstock of five colours. Every top-level tab keeps its own category's colour on every page; the open folder, its paper and the flannel take the page's category; the shell, links, the accent and the V are the same everywhere. The four environments keep their typography and texture and set no colour. This replaces the environment colours of P03 and the environment candidates of P09 (D-075), which are superseded and removed. Folder geometry, Overview, previews and small-screen behaviour are unchanged.

**Deferred refinement:** typography consolidation (D-042), unchanged since P04. The wish for stronger palette differences (D-056) is answered by the Chromatic Archive (D-076).

Source files: `src/styles/tokens.css`, `src/styles/categories.css` (the only home of category colour), `src/styles/environments.css`, `src/styles/global.css`, `src/styles/folders.css` and the contract in `src/design/contract.mjs`. The specimen, the folder study and the tests read the values from those files, so this document can go stale but the pages cannot. Regenerate the contrast tables with `node tests/contrast.mjs --markdown`.

## 1. Aesthetic direction (approved)

**The Lumberjack's Archive — Simplified.** A system of real paper folders in five permanent cardstock colours (section 7; kraft, parchment and ivory until P09-A01), inside a dark shell, with a quiet flannel lining around the site. It must feel contemporary: not retro office software, not a file explorer, not a fake wooden cabin.

GusmaoLab is a personal ecosystem, not a corporate portfolio. Scientific rigor, warmth, humor and creative freedom go together, and Bearnard is welcome in every section, including the CV. The site may become richly ornamental later; the rule is to avoid visual incoherence, not exuberance.

| Source | Role |
| --- | --- |
| Bear-pride stripe family | Identity |
| Bearnard (navy fur, green eyes, amber glasses, flannel) | Character |
| Flannel | Atmosphere |
| Physical paper folders | Structure |

## 2. Palette

Forty-three primitives: eighteen global ones in `src/styles/tokens.css`, and the twenty-five locked colours of the Chromatic Archive in `src/styles/categories.css` (section 7). Components never use them directly (section 3).

P03's palette had twenty-four primitives. P09-A01 (D-076) kept fifteen, added the archive's three shared colours, and removed the nine that only the environment colours used: chestnut, forest, rust, midnight, slate, denim, spruce, terrain and P03's oxblood `#55301F` (the archive's Oxblood is `#5D3A35`).

### Global primitives

| Token | Hex | Role |
| --- | --- | --- |
| `--palette-deep-charcoal` | `#29282C` | The shell; code blocks. **Locked (D-076)** |
| `--palette-forest-teal` | `#275B52` | Links and the accent. **Locked (D-076)** |
| `--palette-midnight-ink` | `#26313B` | The V on the selected tab; active state. **Locked (D-076)** |
| `--palette-bark` | `#1F1713` | Tab labels; shadows; the flannel band; folder borders |
| `--palette-espresso` | `#32251E` | Primary text and headings |
| `--palette-umber` | `#5C4033` | Secondary text |
| `--palette-cocoa` | `#6E5646` | Muted text, mixed half and half with umber (`#654B3D`) |
| `--palette-warm-brown` | `#74422D` | Bear-pride brown |
| `--palette-ember` | `#AA5B22` | Bear-pride orange (sampled from Bearnard's shirt) |
| `--palette-honey` | `#D89348` | Focus ring on dark surfaces; text selection |
| `--palette-gold` | `#E5B45A` | Bear-pride gold |
| `--palette-kraft` | `#D4B089` | Muted text on the shell |
| `--palette-parchment` | `#F4E2C9` | Text on the shell; bear-pride tan |
| `--palette-ivory` | `#FFF8EA` | Edge highlights; the flannel twill; bear-pride white |
| `--palette-navy` | `#202D39` | Focus ring on paper (Bearnard's fur) |
| `--palette-eye-green` | `#8DB04A` | Links on the shell (Bearnard's eyes) |
| `--palette-ash` | `#8A827A` | Disabled states; the shell's edge; bear-pride gray |
| `--palette-charcoal` | `#28282D` | Bear-pride black |

### The Chromatic Archive

Twenty-five primitives named after the owner's colour names, five for each category: section 7 has the table. They are declared in `src/styles/categories.css` and nowhere else.

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
| Eyes | `#64712D`, highlights `#799B2C` | Hue for eye green |
| Amber glasses | `#8F6047`–`#CA8754` | Honey and ember |
| Flannel | orange `#AA5B22`, dark check `#302728` | Ember; flannel bands |
| Linen tee | `#DDD1CA` | Parchment and ivory |
| Denim | `#555B5F` | Unused since P09-A01 |
| Belt | `#3E2820` | Espresso |

### Why these choices

- The archive's twenty-eight colours (twenty-five category colours and three shared ones) are the owner's choice, and locked (D-076). Nothing here re-derives or adjusts them.
- The other global colours are P03's, kept where the archive is silent: the text inks, the focus rings, the text on the shell and the bear-pride family.
- Text inks are one warm set for every cardstock: espresso, umber and a cocoa darkened towards umber. All three stay at or above 4.5:1 on every reading paper and every Level 2 cardstock, so muted text never fails on any paper (section 8).
- Forest Teal is the link colour wherever links are placed on paper. On the Deep Charcoal shell it would reach only 1.88:1, so links there keep the eye green (5.88:1).

## 3. Token conventions

Three layers, all native CSS custom properties.

| Layer | Prefix or form | Declared in | Used by |
| --- | --- | --- | --- |
| Primitives | `--palette-*` | `:root` in `tokens.css` (global) and in `categories.css` (the archive) | Those two files only (and the specimen's swatches) |
| Semantic tokens | `--color-*`, `--font-*`, `--space-*`, `--radius-*`, `--folder-*`, `--texture-*` … | Global: `:root` in `tokens.css`. Category: `categories.css`. Environment: defaults on `:root` in `tokens.css`, sections in `environments.css` | Components and `global.css` |
| Aliases | semantic tokens built from other semantic tokens | `:root, [data-environment], [data-category]` in `tokens.css` | Components |

Rules, enforced by `tests/design-tokens.mjs` and `tests/categories.mjs`:

- Components and `global.css` use semantic tokens only, never primitives or raw colors.
- **The category contract** (`CATEGORY_TOKENS` in `src/design/contract.mjs`): five colour tokens that every category defines, and nothing else: `--color-backdrop`, `--color-flannel-line`, `--color-folder-parent`, `--color-folder-nested` and `--color-folder-active`. `:root` is Core. Only `categories.css` may declare them (CAT-009).
- **The environment contract** (`ENVIRONMENT_TOKENS`): ten typography and texture tokens that every environment defines, and `:root` defines as the core defaults: `--font-body`, `--font-heading`, `--font-heading-style`, `--font-heading-weight`, `--letter-spacing-heading`, `--font-size-body`, `--line-height-body`, `--measure-prose`, `--texture-flannel-strength` and `--ornament-intensity`. An environment defines nothing else, and never a colour (CAT-007).
- **Global tokens** are declared once, on `:root`: the shell, links, the accent, the V, the text inks and the focus rings. No category and no environment sets them (CAT-004).
- **Aliases recompute wherever a category or an environment is chosen.** A custom property is computed where it is declared, so a token declared only on `:root` would keep its Core value inside another category. Anything derived from a contract token (inactive and hovered tabs, the preview card, supporting surfaces, shadows) is therefore an alias. A `:root`-only token must not depend on a contract token or an alias. This is also what lets one tab keep its own cardstock on a page of another colour.
- `color-mix(in srgb, …)` is allowed in tokens; the tests resolve it the way the browser does.
- No motion: no transitions, animation or smooth scrolling.

Selecting both is declarative. `<BaseLayout category="research" environment="scientific">` sets `data-category` and `data-environment` on `<html>`; `FolderPage` passes both from the page's route. Each top-level tab also carries its own `data-category` (section 9). Any element can carry either attribute for a nested scope (the specimen panels do this), and `global.css` re-applies the body font and color inside a nested environment. Without the attributes, a page is Core in both senses. There is no JavaScript theme system and no light/dark toggle.

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
- Code: inline `0.9em` on a chip of the category's Level 2 cardstock; blocks `0.9375rem` on the shell color.

Every size includes a rem term, so text still grows with browser zoom. Radiohead's _Kid A_ / BD Plakatbau is **not** included: it is a proprietary font, and there is no license. It stays a possible later display experiment if a licensed copy is supplied.

## 5. Space and geometry

- Spacing scale: `--space-3xs` 0.25rem, `2xs` 0.5, `xs` 0.75, `s` 1, `m` 1.5, `l` 2, `xl` 3, `2xl` 4, `3xl` 6.
- Fluid rhythm: `--space-gutter` (visible flannel around the shell, 8–30.4 px; it stops growing at 1440 px since P08, so the shell never narrows on a wider screen), `--space-shell-padding` (4–18 px: P03's curve from 1024 px up, a steeper one below, P08), `--space-content-inline`, `--space-content-block`.
- Sizes: `--size-shell-max` 80rem; reading width as above.
- Borders: hairline 1 px, thin 2 px, thick 3 px. Folder borders are translucent bark, so one value works on every cardstock and paper.
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

| Surface | Value | Treatment |
| --- | --- | --- |
| Shell `--color-shell` | Deep Charcoal `#29282C` on every page (locked, D-076) | Hairline edge, deep soft shadow (`--shadow-shell`) |
| Level 1 folder `--color-folder-parent` | The category's Level 1 cardstock (section 7) | Edge highlight, lifted shadow (`--shadow-folder`) |
| Level 2 folder `--color-folder-nested` | The category's Level 2 cardstock | Resting shadow, optional recess |
| Level 3 folder `--color-folder-deep` | The category's reading paper; it has no colour of its own (P09-A01) | Edge highlight and resting shadow, like the nested folder |
| Reading paper `--color-folder-active` | The category's reading paper | Raised shadow; the quietest surface |

Depth comes from edges and soft warm shadows as much as from lightness, so deeper layers step up gently rather than jump. Shadow tokens: `--shadow-shell`, `--shadow-folder`, `--shadow-paper`, `--shadow-paper-raised`, `--shadow-recess`. Edge highlight `--color-folder-edge` (ivory); recess `--color-folder-recess` (bark). Shadows are tinted with `--color-shadow` (bark), never neutral black.

**Flannel lining** (`.gl-flannel`, in `global.css`), CSS gradients only:

- A 45° twill of 1 px lines every `--texture-flannel-twill` (4 px).
- Warp and weft stripes repeating every `--texture-flannel-sett` (8.25rem): a wide band (6–40%), a narrow line (47–50%) and a fine thread (71–72.4%), the same in both directions so the crossings darken like woven cloth.
- Opacity scales with `--texture-flannel-strength`: band 46%, line 44%, thread 24%, twill 5% at strength 1.
- Fallback: `--color-backdrop`. Strength 0 leaves it plain, and `prefers-contrast: more`, `forced-colors: active` and print drop the pattern.
- **Colours (P09-A01).** The ground (`--color-backdrop`) and the line (`--color-flannel-line`) are the page's category. The fine thread is the same line colour, drawn thinner (`--color-flannel-thread`). The wide band is bark and the twill ivory in every category. The addendum changed these colour inputs only: the weave's geometry and architecture are P03's, and there is no photograph or texture file.

Rules: no text on the flannel; nothing small or interactive on it; no animation or fixed attachment. Miniatures may scale the sett locally, as the specimen does.

## 7. The Chromatic Archive: categories and environments

**Status: APPROVED / LOCKED by the owner (P09-A01, D-076).** Every hexadecimal value in this section is the owner's. None may be substituted, adjusted or re-derived, and no other palette is to be proposed, without a new recorded decision.

Two independent things describe a section.

| | Category | Environment |
| --- | --- | --- |
| Sets | Colour: flannel, folders and paper | Typography and texture: fonts, sizes, measure, flannel strength, ornament |
| Values | Core, Research, Blog & Notes, Writing, Bearnard | Core (no attribute), Scientific, Technical, Literary, Personal |
| Source of truth | `src/styles/categories.css` | `src/styles/environments.css` |
| Assigned in | `category` in `src/navigation/registry.ts` | `environment` in the registry |
| Markup | `data-category` on `<html>` and on every top-level tab | `data-environment` on `<html>` |

### The principle

Each category has a permanent cardstock colour. Every top-level tab shows its own category's Level 1 colour on every page, so all five colours stand together on the global row whichever folder is open. Opening a folder reveals that category's body, paper and flannel. Nothing recolours the whole row: the rejected model, in which the open section's environment coloured every visible tab, is gone.

### Categories

| Category | ID | Sections | Character |
| --- | --- | --- | --- |
| Core | `core` | Home, About, Contact, Schedule | The darkest cardstock; also the default |
| Research | `research` | Portfolio, CV, Lab | |
| Blog & Notes | `blog-notes` | Blog, Lecture Notes | |
| Writing | `writing` | Writing | |
| Bearnard | `bearnard` | Bearnard's Area | The lightest cardstock, on dark navy flannel |

A section's folders inherit its category (`planning/information-architecture.md`, section 11).

### The five palettes

| Element | Token | Core | Research | Blog & Notes | Writing | Bearnard |
| --- | --- | --- | --- | --- | --- | --- |
| Flannel ground | `--color-backdrop` | Charcoal Terrain `#303134` | Coffee Terrain `#47403B` | Oxblood `#5D3A35` | Dark Ochre `#68502F` | Navy Terrain `#344656` |
| Flannel line | `--color-flannel-line` | Silver Ash `#74716E` | Antique Gold `#947D65` | Copper Clay `#AD6F5E` | Wheat Gold `#C6A05C` | Glacier Blue `#819DAA` |
| Tab and folder, Level 1 | `--color-folder-parent` | Silver Taupe `#A09A91` | Cream Terrain `#BBAA8C` | Cinnamon `#D1AB92` | Golden Honey `#E7C46B` | Powder Blue `#D5E0E6` |
| Tab and folder, Level 2 | `--color-folder-nested` | Ash Linen `#CBC5B9` | Almond Cream `#DED0B7` | Apricot Linen `#E9C3AA` | Golden Cream `#F2DEA3` | Pale Glacier `#EAF0F1` |
| Reading paper | `--color-folder-active` | Antique White `#F4F2EC` | Cream Ivory `#FCF4E6` | Peach Ivory `#FFF3E9` | Lemon Ivory `#FFFAE5` | Snow White `#FAFCFD` |

Each colour is a primitive named after it, such as `--palette-golden-honey`.

### Shared colours

The same on every page, and never set per category.

| Role | Token | Colour |
| --- | --- | --- |
| Shell | `--color-shell` | Deep Charcoal `#29282C` |
| Links | `--color-text-link` | Forest Teal `#275B52` |
| Accent | `--color-accent` | Forest Teal `#275B52` |
| The V on the selected tab | `--color-indicator-selected` | Midnight Ink `#26313B` |

The text inks, the focus rings and the text on the shell are global too (section 2). They are P03's values, not part of the locked set.

### Where each colour goes

- **Top-level tabs.** Each shows its own category's Level 1 cardstock, whichever folder is open. The selected tab and the open folder's body are exactly the same colour, so they read as one sheet.
- **Second level.** Tabs and their opened bodies use the page's Level 2 cardstock.
- **Third level.** The category's reading paper, its lightest material. Edges, shadows and insets tell the tab, the folder and the page apart; no derived tint was needed, and no fourth row of tabs exists. No approved section has a third level yet; the synthetic case at `/_design/folders/` shows the material.
- **Reading paper.** The page's category. Text sits on it, never on the flannel and never on an unrelated dark panel.
- **Flannel.** Ground and line follow the page's category (section 6). The shell between flannel and folders stays Deep Charcoal.
- **Previews.** A preview card is its own tab's Level 2 cardstock: hovering Writing from a CV page shows a golden-cream card, and nothing else changes (section 9).
- **Navigation.** Going from CV to Writing keeps every tab's colour; the V moves, and the body, paper and flannel become Writing's. Pages stay ordinary static pages with ordinary links, and the only motion is the existing 140 ms cross-fade (D-071).

### Derived values

No further permanent colour was introduced. These are computed from the locked values with `color-mix`, by rules that predate the addendum.

| Derived | Rule | Core | Research | Blog & Notes | Writing | Bearnard |
| --- | --- | --- | --- | --- | --- | --- |
| Inactive Level 1 tab | 78% cardstock, 22% shell | `#86817B` | `#9B8D77` | `#AC8E7C` | `#BDA25D` | `#AFB8BD` |
| Hovered Level 1 tab | 90% cardstock, 10% shell | `#948F87` | `#AC9D82` | `#C09E88` | `#D4B465` | `#C4CED3` |
| Inactive Level 2 tab | 78% Level 2, 22% shell | `#A7A29A` | `#B6AB98` | `#BFA18E` | `#C6B689` | `#C0C4C6` |
| Hovered Level 2 tab | 90% Level 2, 10% shell | `#BBB5AB` | `#CCBFA9` | `#D6B49D` | `#DECC97` | `#D7DCDD` |
| Inactive Level 3 tab | 78% paper, 22% shell | `#C7C6C2` | `#CEC7BD` | `#D0C6BF` | `#D0CCBC` | `#CCCDCF` |
| Hovered Level 3 tab | 90% paper, 10% shell | `#E0DED9` | `#E7E0D3` | `#EADFD6` | `#EAE5D3` | `#E5E7E8` |
| Hover surface | 18% Forest Teal on paper | `#CFD7D0` | `#D6D8CB` | `#D8D8CE` | `#D8DDCB` | `#D4DFDE` |
| Striped table row | 40% Level 2 on paper | `#E4E0D8` | `#F0E6D3` | `#F6E0D0` | `#FAEFCB` | `#F4F7F8` |

Global derived values: hovered links `#25473F` (Forest Teal 70%, bark 30%); muted text `#654B3D`; the shell's edge `#464343` (Deep Charcoal 70%, ash 30%).

An inactive tab keeps its hue and is dimmed only slightly, so it never looks disabled. A hovered tab moves most of the way back to its own cardstock; it never takes another category's colour and never moves the V.

### Environments: typography and texture only

One folder system, four environments. Since P09-A01 an environment sets no colour, and cannot: the ten tokens of its contract are all typographic or textural (section 3).

| | Core | Scientific | Technical | Literary | Personal |
| --- | --- | --- | --- | --- | --- |
| Sections | Home, About, Blog, Contact, Schedule | Portfolio, CV, Lab | Lecture Notes | Writing | Bearnard's Area |
| Body font | Seravek | Seravek | Seravek | Iowan Old Style | Seravek |
| Heading font | Superclarendon 400 | Iowan Old Style 700 | Seravek 700 | Iowan Old Style 700 italic | Superclarendon 700 |
| Body size | 16–18 px | 16–18 px | 16–17 px | 17–20 px | 16–18 px |
| Line height | 1.6 | 1.6 | 1.6 | 1.7 | 1.6 |
| Measure | 68ch | 70ch | 74ch | 62ch | 66ch |
| Flannel strength | 1 | 0.8 | 0.9 | 1.15 | 1.25 |
| Ornament intensity | 0.5 | 0.25 | 0.4 | 0.6 | 1 |

These are P03's values, unchanged; typography consolidation stays deferred (D-042). Category and environment are independent: Blog and Lecture Notes share the Blog & Notes cardstock, but Blog is set in the core type and Lecture Notes in the technical one.

### Superseded

- **P03's environment colours.** Each environment used to set 33 tokens, colours included: navy shells for scientific and personal, a charcoal one for technical, gold folders for personal, per-environment link and V colours. All of it is replaced by the tables above.
- **The P09 environment candidates (D-075).** The four proposed palettes, their stylesheet (`src/styles/environment-candidates.css`), their study (`/_design/environments-v2/`) and their test (`tests/environments.mjs`, ENV-001 to ENV-006) were removed. They are in the history at `b76f3b0`.
- **External.** The twelfth tab left the navigation with the same decision; eleven tabs remain (`planning/information-architecture.md`, section 1).

## 8. Contrast verification

`tests/contrast.mjs` (part of `npm test`) resolves 52 text and indicator pairings in each of the five categories, using the WCAG 2.2 relative-luminance formula: 260 pairings. It enforces 4.5:1 for body text and 3:1 for essential non-text indicators, 49 pairings in each category and 245 in all, every one passing. Ratios are truncated, never rounded up. Three pairings in each category are informational only: disabled text (WCAG exempts disabled controls) and the two nested-tab silhouettes at the end of the table. Environments are not checked separately, because they set no colour (section 7). P05 added twelve pairings for the second and third folder levels, P06 two for hovered tabs on those levels, and P07 four for the folder previews.

| Pairing | Min | Core | Research | Blog & Notes | Writing | Bearnard |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Primary text on reading paper | 4.5 | 13.21 | 13.54 | 13.56 | 14.13 | 14.38 |
| Secondary text on reading paper | 4.5 | 8.38 | 8.59 | 8.60 | 8.96 | 9.12 |
| Muted text on reading paper | 4.5 | 7.14 | 7.31 | 7.32 | 7.63 | 7.76 |
| Headings on reading paper | 4.5 | 13.21 | 13.54 | 13.56 | 14.13 | 14.38 |
| Links on reading paper | 4.5 | 6.93 | 7.10 | 7.11 | 7.41 | 7.54 |
| Hovered links on reading paper | 4.5 | 9.14 | 9.36 | 9.38 | 9.77 | 9.94 |
| Active-state text on reading paper | 4.5 | 11.83 | 12.12 | 12.14 | 12.65 | 12.87 |
| Primary text on nested folder | 4.5 | 8.61 | 9.73 | 9.05 | 11.10 | 12.84 |
| Secondary text on nested folder | 4.5 | 5.46 | 6.17 | 5.74 | 7.04 | 8.15 |
| Muted text on nested folder | 4.5 | 4.65 | 5.25 | 4.89 | 5.99 | 6.94 |
| Links on nested folder | 4.5 | 4.52 | 5.10 | 4.75 | 5.82 | 6.74 |
| Primary text on parent folder | 4.5 | 5.30 | 6.51 | 7.01 | 8.81 | 11.01 |
| Label on the active tab | 4.5 | 6.32 | 7.76 | 8.36 | 10.50 | 13.13 |
| Label on a hovered tab | 4.5 | 5.49 | 6.63 | 7.13 | 8.83 | 11.02 |
| Label on an inactive tab | 4.5 | 4.57 | 5.43 | 5.80 | 7.13 | 8.74 |
| Label on an active nested tab | 4.5 | 10.27 | 11.60 | 10.79 | 13.23 | 15.31 |
| Label on an inactive nested tab | 4.5 | 6.95 | 7.78 | 7.31 | 8.78 | 10.04 |
| Label on an active deep tab | 4.5 | 15.76 | 16.14 | 16.17 | 16.85 | 17.14 |
| Label on an inactive deep tab | 4.5 | 10.32 | 10.52 | 10.51 | 10.96 | 11.09 |
| Label on a hovered nested tab | 4.5 | 8.66 | 9.73 | 9.13 | 11.08 | 12.74 |
| Label on a hovered deep tab | 4.5 | 13.12 | 13.44 | 13.46 | 13.98 | 14.22 |
| Item in a folder preview | 4.5 | 10.27 | 11.60 | 10.79 | 13.23 | 15.31 |
| Hovered item in a folder preview | 4.5 | 12.00 | 12.21 | 12.29 | 12.70 | 12.94 |
| Title of a folder preview | 4.5 | 4.65 | 5.25 | 4.89 | 5.99 | 6.94 |
| Focus ring on a folder preview | 3 | 8.17 | 9.23 | 8.59 | 10.53 | 12.18 |
| Text on the dark shell | 4.5 | 11.55 | 11.55 | 11.55 | 11.55 | 11.55 |
| Muted text on the dark shell | 4.5 | 7.23 | 7.23 | 7.23 | 7.23 | 7.23 |
| Links on the dark shell | 4.5 | 5.88 | 5.88 | 5.88 | 5.88 | 5.88 |
| Code block text | 4.5 | 11.55 | 11.55 | 11.55 | 11.55 | 11.55 |
| Inline code | 4.5 | 8.61 | 9.73 | 9.05 | 11.10 | 12.84 |
| Text on a content card | 4.5 | 13.21 | 13.54 | 13.56 | 14.13 | 14.38 |
| Text in a quote | 4.5 | 8.61 | 9.73 | 9.05 | 11.10 | 12.84 |
| Table header text | 4.5 | 8.61 | 9.73 | 9.05 | 11.10 | 12.84 |
| Text on a striped table row | 4.5 | 11.24 | 11.95 | 11.62 | 12.87 | 13.74 |
| Text in a callout | 4.5 | 8.61 | 9.73 | 9.05 | 11.10 | 12.84 |
| Text on a hover surface | 4.5 | 10.06 | 10.24 | 10.31 | 10.65 | 10.85 |
| Selected text | 4.5 | 9.62 | 9.62 | 9.62 | 9.62 | 9.62 |
| Selection indicator on the active tab | 3 | 4.74 | 5.83 | 6.27 | 7.89 | 9.86 |
| Selection indicator on an active nested tab | 3 | 7.71 | 8.71 | 8.10 | 9.93 | 11.50 |
| Selection indicator on an active deep tab | 3 | 11.83 | 12.12 | 12.14 | 12.65 | 12.87 |
| Focus ring on reading paper | 3 | 12.54 | 12.85 | 12.86 | 13.40 | 13.64 |
| Focus ring on nested folder | 3 | 8.17 | 9.23 | 8.59 | 10.53 | 12.18 |
| Focus ring on parent folder | 3 | 5.03 | 6.17 | 6.65 | 8.36 | 10.45 |
| Focus ring on the deep folder | 3 | 12.54 | 12.85 | 12.86 | 13.40 | 13.64 |
| Focus ring on an inactive tab | 3 | 3.63 | 4.32 | 4.62 | 5.67 | 6.96 |
| Focus ring on an inactive nested tab | 3 | 5.53 | 6.19 | 5.81 | 6.98 | 7.99 |
| Focus ring on an inactive deep tab | 3 | 8.21 | 8.37 | 8.36 | 8.72 | 8.82 |
| Focus ring on the dark shell | 3 | 5.70 | 5.70 | 5.70 | 5.70 | 5.70 |
| Inactive tab against the shell | 3 | 3.79 | 4.51 | 4.82 | 5.91 | 7.26 |
| Inactive nested tab against the parent folder (informational) | — | 1.09 | 1.00 | 1.14 | 1.19 | 1.30 |
| Inactive deep tab against the nested folder (informational) | — | 1.00 | 1.10 | 1.02 | 1.20 | 1.38 |
| Disabled text (exempt; informational) | — | 3.37 | 3.46 | 3.46 | 3.61 | 3.67 |

**What the locked colours required.** No locked value was changed to pass a check. Where a fixed colour could not serve a pairing, the pairing was avoided or an unlocked value did the work:

- **Tab labels use the darkest ink** (bark, `--color-folder-tab-text`). The tightest label is on an inactive Core tab, Silver Taupe dimmed to `#86817B`: 4.57:1.
- **Muted text is darker than P03's** (`#654B3D`, from `#6E5646`), so it passes on every Level 2 cardstock; Core's Ash Linen is the tightest, at 4.65:1.
- **Links on Level 2 cardstock** pass in every category; Core is the tightest pairing in the whole table, at 4.52:1 against 4.5:1. Any change to Core's Level 2 colour or to the link colour should rerun the test.
- **Forest Teal is not used on the shell.** On Deep Charcoal it reaches 1.88:1. Links on the shell use the eye green (5.88:1), as they did before the addendum.
- **Forest Teal is not used directly on Level 1 cardstock.** It would reach 2.78:1 on Core, 3.41:1 on Research, 3.67:1 on Blog & Notes, 4.62:1 on Writing and 5.78:1 on Bearnard. No page places a link there: Level 1 bodies hold only folders and paper. A design that needs one would need the owner's decision (section 10, question 26).
- **The V** contrasts with its tab by 4.74–12.87:1; the tightest is Core's Level 1 tab.
- **Inactive tabs against the shell** reach 3.79:1 or more (Core), so every tab's silhouette is clear on the dark shell.

An inactive Level 2 tab and the Level 1 body it stands on have almost the same luminance (1.00–1.30:1), and so do an inactive Level 3 tab and the Level 2 body (1.00–1.38:1). The tabs are told apart by their hairline edges and shadows, and identified by their labels. Paper on paper cannot reach 3:1 without darkening the tabs, so these two are recorded, not enforced (section 10, question 14).

Focus is the same everywhere so it is learnable: a 3 px navy ring on paper and a honey ring on dark surfaces, 2 px offset. Checked live in a Chromium-based browser: keyboard focus shows on a link, a button and a link on the shell, and links change color and underline weight on hover.

**This is not an accessibility certification.** The figures are computed from the tokens; `tests/categories-browser.mjs` confirms in headless Chrome that pages are painted with those colours (CAT-011 to CAT-017). Text over the flannel or translucent layers, real content, Safari and Firefox rendering, forced-colors and high-contrast modes, and screen readers were not assessed.

## 9. Physical folders (P05)

Built in P05 and shown at `/_design/folders/`, a temporary study page (D-048). **Approved by the owner (D-049).** Components: `src/components/folders/`; styles: `src/styles/folders.css`; decisions D-043–D-047.

### Construction

A stack holds one to three folder levels. Each level is a row of tabs, exactly one of them selected, and the selected folder's open body. The body holds the next level or, at the deepest level, the page on the category's reading paper. Since P06 no row is ever left unselected: an open parent such as `/cv/` selects its Overview tab (below). P05's state, a row of tabs rising from behind the page with none selected, was rejected by the owner and no longer exists.

| Level | Folder | Selected tab | Inactive tabs stand on |
| --- | --- | --- | --- |
| 1 | Level 1 cardstock `--color-folder-parent` | Exactly the same colour | The dark shell |
| 2 | Level 2 cardstock `--color-folder-nested` | Exactly the same colour | The Level 1 body |
| 3 | Reading paper `--color-folder-deep` | Exactly the same colour | The Level 2 body |
| Page | Reading paper `--color-folder-active` | — | — |

The colours are the category's (section 7). A third-level folder and the page inside it are the same paper since P09-A01; the folder's edge highlight, the inset between them and the page's raised shadow keep them apart.

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
- Its colour is Midnight Ink `#26313B` on every tab of every category (locked, D-076). It contrasts with the tab by 4.74–12.87:1 across levels and categories.

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
- A top-level tab mixes its own category's cardstock, so it keeps its hue on every page (P09-A01).
- Their labels keep full contrast (4.57:1 or more; section 8). They are not dimmed with opacity and do not look disabled.

### Depth and shadows

- Depth comes from stacking order, the seam, edge highlights and small warm shadows tinted with `--color-shadow`, more than from brightness.
- The level-1 body uses `--shadow-folder`. Nested bodies use an edge highlight plus `--shadow-paper`. The page uses `--shadow-paper-raised`.
- No gradients beyond a faint shade on inactive tabs. No glass, no bevels, no wood grain, no ageing.
- Each level adds `--folder-nest-inset` (0.5–1rem) on each side. Three levels at 390 px leave a reading column of about 300 px.

### Categories and environments

- One stylesheet serves every category and every environment. The components never name one; `data-category` and `data-environment` change tokens, and the tokens change the folders.
- The stack (`.gl-folders`) carries the page's category, which colours the open bodies, the second and third levels and the paper.
- Each top-level tab carries its own `data-category`. The aliases recompute there (section 3), so the tab is painted in its own cardstock, dimmed while inactive, whichever folder is open (CAT-008, CAT-011).
- The selected tab's category is the page's, so the tab and its body are the same colour by construction (CAT-005, CAT-012).
- An environment changes type only: it cannot recolour a folder (CAT-007).
- The test suite rejects environment selectors and selectors for a specific category in `folders.css`.

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

- **Material.** A small index card of the hovered folder's own Level 2 cardstock, `--color-folder-preview`, with a hairline `--color-folder-border` edge, a 2 px top edge in `--color-accent` (Forest Teal, the same everywhere), `--shadow-paper-raised` and `--radius-card` lower corners. It has no tab, no V and no folder body, so it never reads as a fourth folder.
- **Content.** A small upper-case title in `--color-text-muted` (the folder's name), then the folder's Overview and its children as a compact vertical list in `--font-size-tab-preview` at medium weight, in the tab text color. Labels are never cut: the card is as wide as its longest label, up to a tab's maximum label width plus padding, and wraps no sooner than a tab would.
- **Anchoring.** It hangs from the foot of its tab, left-aligned with the part of the tab its row lets through, and at least as wide as that part. It never covers its own tab. Near the viewport's right edge it shifts left to stay 8 px inside; when there is more room above than below, it opens above the tab with its accent edge at the bottom. A list longer than the room left scrolls inside the card.
- **Stacking.** The card is a popover in the top layer, above every folder level and outside every scrolling row, so nothing clips it and it takes no space in the page: no layout shift, and the page never scrolls sideways. `--z-folder-preview` stays reserved and unused.
- **The tab.** While its card is open, the tab keeps its hover color (`--color-folder-tab-hover…`). The V stays on the open folders and never moves or doubles.
- **Category.** The card is a child of its tab, so it takes the tab's category, not the page's: hovering Writing from a CV page shows a golden-cream card, and nothing else on the page changes colour (P09-A01, CAT-015). Its type is the page's environment.
- **Hover and focus.** A hovered item takes `--color-state-hover` and an underline. Focus uses the global ring (3 px navy, 2 px offset); the card's inner padding keeps it clear of the card's edge.
- **Motion.** None: no transition or animation, so nothing to reduce for `prefers-reduced-motion`.
- **Contrast.** Item 11.54:1 or more, title 4.84:1 or more, focus ring 11.07:1 (section 8).

### Remaining visual questions

- Section 10, questions 13, 14, 16, 18, 20–22, 25 and 26.

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
4. **Green.** Closed by D-076: links and the accent are Forest Teal `#275B52`. The eye green `#8DB04A` remains only for links on the shell, where Forest Teal cannot be read.
5. **Folder materials.** Closed by D-076: five category cardstocks (section 7).
6. **Flannel.** Colours closed by D-076: ground and line per category. Still open: strength, sett size (8.25rem), and whether the CSS weave looks too synthetic.
7. **Scientific text in navy ink.** Closed by D-076: the text inks are one warm set in every category.
8. **Technical shell.** Closed by D-076: the shell is Deep Charcoal `#29282C` everywhere.
9. **The pride mark:** a small seven-band label beside the wordmark. Too subtle, or right?
10. **Wordmark:** the specimen uses a text wordmark; `brand/gusmaolab-logo.svg` is an empty placeholder.
11. **Paper grain:** none yet. Add a subtle texture to the Level 1 cardstock only, or keep paper flat?
12. **Ornament:** `--ornament-intensity` exists (0.25–1) but is barely used. What ornament, if any, belongs to each environment?
13. **Folder tabs (P05):** is the slope (0.625rem over a 2.875rem tab) right, or should tabs be squarer or more chamfered? Are the fillets at the foot of the selected tab visible enough?
14. **Inactive nested tabs (P05)** mix towards the shell, which leaves them almost the luminance of the Level 1 body they stand on (1.00–1.30:1 across the categories). Should they mix towards their parent folder instead (closer in hue, but with even less separation)?
15. **Third-level material.** Closed by D-076: the third level is the category's reading paper. A slight tint derived within the category stays possible if a real third-level folder shows it is needed; it would be recorded.
16. **Inactive labels (P05)** sit 2 px lower than the selected label, because inactive tabs stand 0.25rem lower and are a little shorter. Should all labels share one baseline instead?
17. **Section colors on the global row (P05).** Closed by D-076: every top-level tab carries its own category's colour on every page.
18. **Overview (P06):** it looks exactly like the other tabs. Should it be told apart, for example by a slightly narrower card, a different weight, or a section-specific label?
19. **Stronger environments (D-056).** Closed by D-076: the Chromatic Archive. The P09 candidates (D-075) are superseded.
20. **Hover (P06):** an inactive tab lightens 12 points towards the folder material when hovered. Too subtle, or right?
21. **Folder previews (P07):** an index card of the hovered folder's own Level 2 cardstock (since D-076) with a Forest Teal top edge, hanging from its tab, with a small title and a compact list. Is it distinct enough from the folders without feeling like a generic menu? Should it carry a paper-grain or ruled-card detail?
22. **Small screens (P08):** rows scroll sideways with a fade and a glimpse of the next tab, and no buttons. Is that discoverable enough, or should a row show small "more" arrows or previous/next buttons? Are 4 px insets on phones enough to read three levels as nested folders? Should the flannel band on phones be thinner, or gone?
23. **Bearnard roles (P09):** nine places may show Bearnard (section 11), and none has an illustration yet. Should the v1.3 portrait stand in for any of them, for example the Home welcome, until role-specific poses are approved? Which of the 204 expression candidates, if any, should be approved for which role?
24. **Environment candidates (P09).** Superseded by D-076: the owner chose the Chromatic Archive instead, and no further palette is to be explored.
25. **Close neighbours (P09-A01).** Core and Research are the two closest cardstocks on the global row, most of all while inactive (`#86817B` and `#9B8D77`): a grey beside a warmer tan. Both are locked values, so nothing was changed; this is for the owner's eye on a real screen.
26. **Links on Level 1 cardstock (P09-A01).** Forest Teal would not reach 4.5:1 directly on the Core, Research or Blog & Notes Level 1 cardstock (2.78, 3.41 and 3.67:1). No page puts a link there today. If one ever must, the smallest corrections are to place it on a Level 2 or paper surface, or to let that link use the primary text ink with an underline; either needs the owner's decision.

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

## 12. Editorial reading layouts (P12)

The eight editorial collections read differently without becoming eight sites (D-094). One stylesheet, `src/styles/editorial.css`, serves them all.

### Shared rules

- **Colour and type are not the collection's to choose.** The page's category colours the paper; the section's environment sets the typefaces (Lecture Notes: interface type; Writing: editorial type with italic headings). No collection adds a font, a colour, a texture, a transition or a script.
- **Reading measure** (tokens in `tokens.css`): technical long-form `72ch`, short notes `64ch`, literary prose `60ch`. The body never exceeds its measure, however wide the folder paper is. Body text is at least 16 px with a line height of 1.45 or more.
- **Tokens:** `--measure-reading-technical|note|literary`, `--size-reading-aside`, `--space-reading-gap|section|paragraph|paragraph-literary`, `--editorial-section-mark`. Sizes only.
- **Metadata** is one line of small label type under the title: `Published`, `Updated`, `Level`. A collection shows what it needs and no more.
- **Responsive:** layout follows the width of the paper (container queries), not the window. Code blocks and tables scroll inside their own box; figures and images fit the column; long words, URLs and inline code wrap. No page scrolls sideways at 320 px.
- **Restraint:** delicate rules, small uppercase labels, a bookmark, a dotted leader, a three-dot section mark. No heavy texture behind prose, no shadows, no cards for articles.

### The eight

| Collection | Index | Article | Distinct features |
| --- | --- | --- | --- |
| Blog | A dated stream, newest first, date before title | Compact header with the kind of post; plain measure | Smaller title; rule under the header |
| Bearnard's Trail | One path for each series; numbered lessons on a dotted line | Series and lesson number above the title; prerequisites box; previous and next lesson | No progress is stored or implied |
| The Greenhouse | Roomy rows: summary, date, level, tags | Strong header; contents beside (wide) or above (narrow) the text; references | Sticky contents, only when there are three or more headings |
| Berries | Small tiles, one link each | Narrow measure on a small sheet; no contents | Minimal metadata |
| Timber Logs | A logbook: year, then month | The reporting period leads; ruled margin; labelled sections | Looks like a field journal, claims nothing official |
| Months' Original | Year and month, title, the author's subtitle | Month above the title; epigraph; generous paragraphs; section mark in place of a rule | Italic subtitle |
| Kosmos Series | A shelf of works; chapters in reading order with leader dots | Chapter header centred, work name, the author's chapter mark, epigraph | Marks and section labels are the author's |
| Book Club | A panel for each book with a bookmark | Book plate (book, author, session date); spoiler note | Spoilers are a visible note, never hidden |

### Not decided

Syntax colours inside code blocks are Shiki's own (only the block's background is the archive's). Whether to keep them, and how formulas and figures are numbered, belongs to P13.

## 13. Scientific content (P13)

Quarto articles are drawn in the approved Greenhouse (section 12): the same header, measure, contents list, type and colours. Only what Markdown cannot say is added, with rules in `src/styles/editorial.css` (section 6) that use the existing tokens. No Quarto, Bootstrap or Pandoc stylesheet reaches the site, and no script.

- **Mathematics** is MathML, set in the page's own math face (`--font-math`). A displayed equation sits in its own line with its number, and scrolls inside the column when it is wider than it; inline mathematics keeps the text's line. Nothing is loaded for a page without mathematics.
- **Figures** are centred image files in a `<figure>` with a numbered caption below, in the small label type; they never exceed the column. Alt text is required. Figures are drawn as images, so their ink is the image's own, not the page's.
- **Tables** keep their header cells (`scope="col"`), the page's table styling, a numbered caption above, and scroll inside their own box when wider than the column; column alignment is a class.
- **Callouts** are a bordered note on the callout surface with the kind printed as a small uppercase word before the title (Note, Tip, Warning…), so colour is never the only signal; warnings, important and caution notes have a thicker border. No icon, no neon, no Bootstrap look.
- **Code** is the site's code block, scrolling inside its box; a computed result is a block with a rule on its left. Quarto's token colours are not carried over (KL-66).
- **Citations and references:** in-text citations are ordinary links to their entry; the reference list is small text with a hanging indent that wraps long addresses; footnotes are an ordered list after a rule, with a backlink to the place they came from.
- **Responsive:** checked at 320, 390, 768, 1280 and 1440 px: no page scrolls sideways, equations, tables, code and references stay in the column, the contents list is beside the text from a wide paper and above it on a narrow one.

## 14. Demonstrations (P13-A01)

A demonstration is drawn in the approved Greenhouse, unchanged: only two things say what it is. The **notice** under the header, a note in the existing `ed__notice` style (the callout surface and its rule, no new colour): "Development demonstration — synthetic content", then one sentence. And the **Overview section**: a dashed rule below the Greenhouse's real list, a small uppercase heading "Development Demonstrations", one sentence of explanation, then the Greenhouse index rows. Both use semantic tokens only. They add no tab, no row and no motion, and the global tabs keep their category colours.

## Legacy material

- `docs/design-system.md` is an empty placeholder from the Pelican era.
- `_backup/pelican-legacy/static/css/tokens.css` and `dark.css` hold the old site's generic blue-and-white tokens. P03 did not adopt them.

## 15. Publishing Workbench (P14)

A development page, not a part of the site's design. It uses only existing semantic tokens and the Greenhouse folder's own colours, adds no colour, no font and no motion, and no client script. Its parts: a dashed note at the head (the study banner's treatment), a flow of four chips, cards for the lifecycle and the eight collections (a definition list inside each), command blocks (`pre`, focusable, scrolling inside themselves so the page never scrolls sideways), a checklist and a two-column glossary. Checked at 320, 390, 768, 1280 and 1440 px.

## 16. Homepage (P15)

Home is a page of the Core category on one sheet of reading paper. It adds no colour, font, motion or script (D-112 to D-117). Its parts and their reasons:

- **Welcome.** The display size of the heading font for "GusmaoLab" (the page's one `<h1>`), a lead sentence, a short paragraph and two actions: an outlined link ("About me", in the link colour like every link: no second link colour exists) and a text link ("Explore the archive"). Bearnard stands in a column at the right on a wide paper (up to 15rem, 474 px tall at most) and small (9rem) between the words and the actions on a narrow one, so the page's useful content is never a screen of mascot away. The image reserves its size from its width and height and loads eagerly.
- **Where to begin.** Three columns (one on a phone) of plain rows separated by hairlines, under small-caps group titles with a heavy rule. A row is one link in the heading font, a sentence, and the folder's own children in small type; its whole area is the target (at least 44 px tall). No cards, no icons.
- **Inside the nucleus.** Text and the nucleus's frame, side by side on a wide paper and stacked on a narrow one. The frame is 4:3, or 16:10 from a 34rem paper, with no border or panel of its own (P20: the dashed placeholder is gone): the nucleus sits on the paper, a still picture of the same model in the static HTML and the 3D render where the browser can draw it. The text says it is an illustration and not a measured genome or simulation.
- **From the Blog.** The Blog's own stream language: date in small caps, then the title, then the summary, with hairlines. Long titles wrap anywhere. With no post, one dashed note says so.
- **Around the world.** A list of eight rows, city in the heading font, country in small type, and at the right the local time (monospace token, tabular digits, heading-3 size) over the weekday and date in small type (P16, D-120). Rows reflow to one or two columns by the width they get (each at least 15rem). The not-yet-read state has the same size, quieter colour; there is no animation, flag, map, clock face or new font.
- **Layout.** The regions follow one another, opened by a hairline; updates and clocks sit side by side from a 60rem paper. Every responsive rule is a container query on the paper's width (`@container home`), never the window.
- **Not here:** a dashboard, an animation, a decorative stage, a second mascot image, a new category colour.

### World clocks (P16)

The clocks are rows of the homepage's existing language: hairlines, the heading font for the city, the monospace token for the digits, secondary and muted text for the date and country, and no new colour, font, shadow, motion or script beyond the clocks' own (D-118 to D-121). The reading's footprint is the same before and after the script fills it. Checked at 320, 390, 430, 768, 1024, 1280 and 1440 px: no overflow, the approved order in reading order, a city never running into its reading. The development specimen `/_design/world-clocks/` repeats the region for fixed, simulated instants under plain headings and a dashed note.

## 17. Content states (P17)

A page that has nothing to show yet is designed, not broken. The system has four presentation states, derived from real data (`src/site/coverage.ts`, D-122): **ready** (the page draws its material), **empty** (a working collection says in its own voice that nothing is published; the editorial empty states of P12), **in preparation** (a notice says what the page is for and what it is waiting for) and **unavailable** (a feature needs a resource that is not available; unused so far).

- **A notice is text.** A hairline frame with a 0.25 rem leading edge, an `<h2>` ("In preparation", "Nothing published yet", "Not available right now") and a short paragraph, in the page's own typography and on the open folder's own paper. A dashed frame marks "empty". No giant label, no icon, no construction emoji, no count, no thumbnail, no card, no button and no disabled control. The page's own title and its one-paragraph purpose come first, so the page still says what it is for.
- **Parents** show a guide to their folders: a link, one sentence on what the folder is for and its state in words, in an auto-fit grid (`minmax(min(100%, 15rem), 1fr)`) that stacks on a phone. **Related folders** are a short list of real links under a "Related" heading.
- **Bearnard.** On his own overview he stands beside the notice (the notice shares a row with him and wraps under him when narrow); on other pages an unassigned illustration role draws nothing and leaves no gap.
- **Colour and motion.** No palette colour is added: everything uses semantic tokens and the page's category. No transition or animation (`tests/site.mjs`, SITE-020).
- **Accessibility.** Each block is a `<section>` labelled by its heading; there is one `<h1>` per page; nothing is a live region or takes focus; links keep the global focus ring. Checked at 200% text size and under reduced motion (SITE-046, SITE-047).

## 18. Utility pages (P18)

- **Contact and downloads** reuse the P17 state components and `src/styles/states.css`: a "Related"-style list vocabulary, hairline separators, the page's own type and the open folder's paper. A channel is a link, a short sentence of what it is for, and, for an email, "Opens your email application"; a profile shows its host in muted small text. A download is a restrained list item: a link, a sentence, and a muted line of type, size, version and file name; a planned file is plain secondary text, "Not yet available", with no link or button. Long addresses and file names wrap (`overflow-wrap: anywhere`). No icon, no card, no call-to-action styling.
- **The 404 page** is the Core atmosphere: the dark shell and one level-1 folder on its reading paper, with no row of tabs (nothing is selected, because no folder owns the address). An eyebrow ("404 · Not filed"), the one heading ("This folder isn't in the archive."), a short line, a way home and four real destinations. No red, no warning colour, no animation, no illustration until the owner assigns the `not-found` role.
- **No palette, font or motion is added** (SITE-030, UTIL-030, UTIL-045).

## 19. The 3D nucleus (P19)

The nucleus is an illustration with its own, scientifically motivated colours (pale periwinkle, lavender, sage and blush chromatin, a yellow highlighted region, a pale translucent envelope) defined in `src/visualization/nucleus/config.ts`. They are not site tokens and appear in no stylesheet; the five Chromatic Archive palettes, the Home folder and the surrounding UI are not recoloured to suit it (D-076, D-131). Its frame keeps a fixed aspect ratio (no layout shift), it takes no pointer events, it moves only in response to a target, never idles, and it is a still image on touch devices and under reduced motion (D-134). It is a development specimen until the owner approves it.

## 20. The nucleus on Home (P20)

The nucleus on the homepage is the P19 nucleus unchanged: its colours stay its own (D-131), nothing in `tokens.css`, `categories.css`, `environments.css` or `global.css` changed, and no site token was added for it. Integration changed only the frame's footprint treatment (no border, padding or placeholder badge), the framing (the camera fits the frame, as in P19), the transparent background (the canvas sits on the Core reading paper) and the stacking: the canvas is absolutely positioned inside the frame with `pointer-events: none`, so it never overlaps a tab, a preview or a link, and no z-index was added. A tab does not change colour when it is active: the response is entirely in the nucleus.
