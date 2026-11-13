/**
 * The GusmaoLab design-token contract: P03's tokens, with colour rebuilt as the Chromatic
 * Archive in P09-A01 (D-076). Shared by the design specimen
 * (src/pages/[design]/tokens.astro) and the tests in tests/.
 *
 * Two independent choices style a section. Its archive category decides colour
 * (src/styles/categories.css); its environment decides typography and texture
 * (src/styles/environments.css). Neither sets a token of the other's.
 */

/**
 * The five archive categories, in the owner's order, with the sections that belong to
 * each. The registry (src/navigation/registry.ts) assigns them; tests/categories.mjs
 * checks that the two agree and that the colours are the locked ones.
 */
export const CATEGORIES = [
  {
    id: "core",
    name: "Core",
    sections: ["Home", "About", "Contact", "Schedule"],
  },
  {
    id: "research",
    name: "Research",
    sections: ["Portfolio", "CV", "Lab"],
  },
  {
    id: "blog-notes",
    name: "Blog & Notes",
    sections: ["Blog", "Lecture Notes"],
  },
  {
    id: "writing",
    name: "Writing",
    sections: ["Writing"],
  },
  {
    id: "bearnard",
    name: "Bearnard",
    sections: ["Bearnard's Area"],
  },
]

/**
 * The category contract: every category in categories.css defines exactly these five
 * tokens, the locked palette's five rows, and nothing else.
 */
export const CATEGORY_TOKENS = [
  "--color-backdrop", // flannel ground
  "--color-flannel-line", // flannel line
  "--color-folder-parent", // tab and folder, level 1
  "--color-folder-nested", // tab and folder, level 2
  "--color-folder-active", // reading paper
]

/**
 * The four section environments: typography and texture, never colour. The section
 * lists are the registry's (src/navigation/registry.ts).
 */
export const ENVIRONMENTS = [
  {
    id: "scientific",
    name: "Scientific",
    sections: ["Portfolio", "CV", "Lab"],
  },
  {
    id: "technical",
    name: "Technical",
    sections: ["Lecture Notes"],
  },
  {
    id: "literary",
    name: "Literary",
    sections: ["Writing"],
  },
  {
    id: "personal",
    name: "Personal",
    sections: ["Bearnard's Area"],
  },
]

/**
 * The environment contract: every environment in environments.css defines exactly these
 * tokens, and :root in tokens.css defines them as the core defaults. No colour: an
 * environment that set one would recolour folders that belong to another category.
 */
export const ENVIRONMENT_TOKENS = [
  // Typography roles
  "--font-body",
  "--font-heading",
  "--font-heading-style",
  "--font-heading-weight",
  "--letter-spacing-heading",
  "--font-size-body",
  "--line-height-body",
  "--measure-prose",
  // Texture and ornament
  "--texture-flannel-strength",
  "--ornament-intensity",
]

/** Tokens that must exist, grouped by the roles the P03 brief asks for. */
export const REQUIRED_TOKENS = {
  "Application surroundings": [
    "--color-backdrop",
    "--color-flannel-band",
    "--color-flannel-line",
    "--color-flannel-thread",
    "--color-flannel-twill",
    "--color-shell",
    "--color-shell-border",
    "--color-shadow",
    "--shadow-shell",
  ],
  "Folder materials": [
    "--color-folder-parent",
    "--color-folder-nested",
    "--color-folder-active",
    "--color-folder-tab-active",
    "--color-folder-tab-inactive",
    "--color-folder-tab-hover",
    "--color-folder-tab-hover-nested",
    "--color-folder-tab-hover-deep",
    "--color-folder-tab-text",
    "--color-folder-preview",
    "--color-folder-border",
    "--color-folder-edge",
    "--color-folder-recess",
    "--shadow-folder",
    "--shadow-paper",
    "--shadow-paper-raised",
    "--shadow-recess",
  ],
  Typography: [
    "--color-text-primary",
    "--color-text-secondary",
    "--color-text-muted",
    "--color-text-heading",
    "--color-text-link",
    "--color-text-link-hover",
    "--color-text-on-dark",
    "--color-text-on-dark-muted",
    "--color-text-link-on-dark",
    "--font-interface",
    "--font-editorial",
    "--font-display",
    "--font-mono",
    "--font-math",
    "--font-body",
    "--font-heading",
    "--font-label",
    "--font-code",
    "--font-size-body",
    "--font-size-lead",
    "--font-size-h1",
    "--font-size-h2",
    "--font-size-h3",
    "--font-size-display",
    "--line-height-body",
    "--line-height-heading",
    "--line-height-display",
    "--letter-spacing-display",
    "--letter-spacing-label",
    "--measure-prose",
    "--font-size-tab-1",
    "--font-size-tab-2",
    "--font-size-tab-3",
    "--font-weight-tab",
    "--font-size-code",
    "--font-size-code-block",
    "--line-height-code",
  ],
  Interaction: [
    "--color-accent",
    "--color-state-active",
    "--color-state-hover",
    "--color-state-disabled",
    "--color-state-disabled-surface",
    "--color-focus-ring",
    "--color-focus-ring-on-dark",
    "--color-indicator-selected",
    "--color-text-selection",
  ],
  "Supporting surfaces": [
    "--color-surface-card",
    "--color-surface-card-border",
    "--color-surface-code",
    "--color-text-code",
    "--color-surface-code-inline",
    "--color-surface-quote",
    "--color-quote-rule",
    "--color-surface-table-header",
    "--color-table-rule",
    "--color-table-stripe",
    "--color-surface-callout",
    "--color-callout-border",
  ],
  "Space, size and geometry": [
    "--space-3xs",
    "--space-2xs",
    "--space-xs",
    "--space-s",
    "--space-m",
    "--space-l",
    "--space-xl",
    "--space-2xl",
    "--space-3xl",
    "--space-gutter",
    "--space-shell-padding",
    "--space-content-inline",
    "--space-content-block",
    "--size-shell-max",
    "--border-width-hairline",
    "--border-width-thin",
    "--border-width-thick",
    "--radius-paper",
    "--radius-card",
    "--radius-folder",
    "--radius-shell",
    "--focus-ring-width",
    "--focus-ring-offset",
  ],
  "Folder geometry (P05–P07)": [
    "--folder-tab-height-1",
    "--folder-tab-height-2",
    "--folder-tab-height-3",
    "--folder-tab-padding-inline",
    "--folder-tab-min-inline-size",
    "--folder-tab-max-inline-size",
    "--folder-tab-slant",
    "--folder-tab-corner-radius",
    "--folder-tab-fillet-radius",
    "--folder-tab-overlap",
    "--folder-tab-rise",
    "--folder-indicator-width",
    "--folder-indicator-depth",
    "--folder-indicator-gap",
    "--folder-nest-inset",
    "--folder-layer-offset",
    "--z-folder-inactive",
    "--z-folder-active",
    "--z-folder-preview",
  ],
  "Texture and ornament": [
    "--texture-flannel-sett",
    "--texture-flannel-twill",
    "--texture-flannel-strength",
    "--ornament-intensity",
  ],
  Identity: [
    "--color-pride-brown",
    "--color-pride-orange",
    "--color-pride-gold",
    "--color-pride-tan",
    "--color-pride-white",
    "--color-pride-gray",
    "--color-pride-black",
  ],
}

/**
 * @typedef {object} ContrastPair
 * @property {string} id
 * @property {string} label
 * @property {string} foreground  token name
 * @property {string} background  token name
 * @property {number | null} min  WCAG minimum, or null for information only
 */

/** @typedef {[string, string, string, string, number | null]} ContrastRow */

/**
 * Opaque pairings checked against WCAG 2.2 thresholds in every archive category:
 * 4.5:1 for body text, 3:1 for essential non-text indicators. `min: null` is reported
 * for information only. Text over the flannel or translucent layers is not covered and
 * needs visual inspection.
 * @type {ContrastPair[]}
 */
export const CONTRAST_PAIRS = /** @type {ContrastRow[]} */ ([
  [
    "primary-on-paper",
    "Primary text on reading paper",
    "--color-text-primary",
    "--color-folder-active",
    4.5,
  ],
  [
    "secondary-on-paper",
    "Secondary text on reading paper",
    "--color-text-secondary",
    "--color-folder-active",
    4.5,
  ],
  [
    "muted-on-paper",
    "Muted text on reading paper",
    "--color-text-muted",
    "--color-folder-active",
    4.5,
  ],
  [
    "heading-on-paper",
    "Headings on reading paper",
    "--color-text-heading",
    "--color-folder-active",
    4.5,
  ],
  [
    "link-on-paper",
    "Links on reading paper",
    "--color-text-link",
    "--color-folder-active",
    4.5,
  ],
  [
    "link-hover-on-paper",
    "Hovered links on reading paper",
    "--color-text-link-hover",
    "--color-folder-active",
    4.5,
  ],
  [
    "active-on-paper",
    "Active-state text on reading paper",
    "--color-state-active",
    "--color-folder-active",
    4.5,
  ],
  [
    "primary-on-nested",
    "Primary text on nested folder",
    "--color-text-primary",
    "--color-folder-nested",
    4.5,
  ],
  [
    "secondary-on-nested",
    "Secondary text on nested folder",
    "--color-text-secondary",
    "--color-folder-nested",
    4.5,
  ],
  [
    "muted-on-nested",
    "Muted text on nested folder",
    "--color-text-muted",
    "--color-folder-nested",
    4.5,
  ],
  [
    "link-on-nested",
    "Links on nested folder",
    "--color-text-link",
    "--color-folder-nested",
    4.5,
  ],
  [
    "primary-on-parent",
    "Primary text on parent folder",
    "--color-text-primary",
    "--color-folder-parent",
    4.5,
  ],
  [
    "tab-label-active",
    "Label on the active tab",
    "--color-folder-tab-text",
    "--color-folder-tab-active",
    4.5,
  ],
  [
    "tab-label-hover",
    "Label on a hovered tab",
    "--color-folder-tab-text",
    "--color-folder-tab-hover",
    4.5,
  ],
  [
    "tab-label-inactive",
    "Label on an inactive tab",
    "--color-folder-tab-text",
    "--color-folder-tab-inactive",
    4.5,
  ],
  // Folder levels 2 and 3 (P05): labels on nested and deep tabs, selected and inactive.
  [
    "tab-label-active-nested",
    "Label on an active nested tab",
    "--color-folder-tab-text",
    "--color-folder-nested",
    4.5,
  ],
  [
    "tab-label-inactive-nested",
    "Label on an inactive nested tab",
    "--color-folder-tab-text",
    "--color-folder-tab-inactive-nested",
    4.5,
  ],
  [
    "tab-label-active-deep",
    "Label on an active deep tab",
    "--color-folder-tab-text",
    "--color-folder-deep",
    4.5,
  ],
  [
    "tab-label-inactive-deep",
    "Label on an inactive deep tab",
    "--color-folder-tab-text",
    "--color-folder-tab-inactive-deep",
    4.5,
  ],
  // Hovered tab links on levels 2 and 3 (P06).
  [
    "tab-label-hover-nested",
    "Label on a hovered nested tab",
    "--color-folder-tab-text",
    "--color-folder-tab-hover-nested",
    4.5,
  ],
  [
    "tab-label-hover-deep",
    "Label on a hovered deep tab",
    "--color-folder-tab-text",
    "--color-folder-tab-hover-deep",
    4.5,
  ],
  // Folder previews (P07): the index card of an unopened folder's contents.
  [
    "preview-item",
    "Item in a folder preview",
    "--color-folder-tab-text",
    "--color-folder-preview",
    4.5,
  ],
  [
    "preview-item-hover",
    "Hovered item in a folder preview",
    "--color-folder-tab-text",
    "--color-state-hover",
    4.5,
  ],
  [
    "preview-title",
    "Title of a folder preview",
    "--color-text-muted",
    "--color-folder-preview",
    4.5,
  ],
  [
    "focus-on-preview",
    "Focus ring on a folder preview",
    "--color-focus-ring",
    "--color-folder-preview",
    3,
  ],
  [
    "text-on-shell",
    "Text on the dark shell",
    "--color-text-on-dark",
    "--color-shell",
    4.5,
  ],
  [
    "muted-on-shell",
    "Muted text on the dark shell",
    "--color-text-on-dark-muted",
    "--color-shell",
    4.5,
  ],
  [
    "link-on-shell",
    "Links on the dark shell",
    "--color-text-link-on-dark",
    "--color-shell",
    4.5,
  ],
  ["code-block", "Code block text", "--color-text-code", "--color-surface-code", 4.5],
  [
    "inline-code",
    "Inline code",
    "--color-text-primary",
    "--color-surface-code-inline",
    4.5,
  ],
  [
    "card",
    "Text on a content card",
    "--color-text-primary",
    "--color-surface-card",
    4.5,
  ],
  ["quote", "Text in a quote", "--color-text-primary", "--color-surface-quote", 4.5],
  [
    "table-header",
    "Table header text",
    "--color-text-primary",
    "--color-surface-table-header",
    4.5,
  ],
  [
    "table-stripe",
    "Text on a striped table row",
    "--color-text-primary",
    "--color-table-stripe",
    4.5,
  ],
  [
    "callout",
    "Text in a callout",
    "--color-text-primary",
    "--color-surface-callout",
    4.5,
  ],
  [
    "hover-surface",
    "Text on a hover surface",
    "--color-text-primary",
    "--color-state-hover",
    4.5,
  ],
  ["selection", "Selected text", "--color-text-primary", "--color-text-selection", 4.5],
  [
    "indicator-on-tab",
    "Selection indicator on the active tab",
    "--color-indicator-selected",
    "--color-folder-tab-active",
    3,
  ],
  [
    "indicator-on-nested-tab",
    "Selection indicator on an active nested tab",
    "--color-indicator-selected",
    "--color-folder-nested",
    3,
  ],
  [
    "indicator-on-deep-tab",
    "Selection indicator on an active deep tab",
    "--color-indicator-selected",
    "--color-folder-deep",
    3,
  ],
  [
    "focus-on-paper",
    "Focus ring on reading paper",
    "--color-focus-ring",
    "--color-folder-active",
    3,
  ],
  [
    "focus-on-nested",
    "Focus ring on nested folder",
    "--color-focus-ring",
    "--color-folder-nested",
    3,
  ],
  [
    "focus-on-parent",
    "Focus ring on parent folder",
    "--color-focus-ring",
    "--color-folder-parent",
    3,
  ],
  [
    "focus-on-deep",
    "Focus ring on the deep folder",
    "--color-focus-ring",
    "--color-folder-deep",
    3,
  ],
  [
    "focus-on-inactive-tab",
    "Focus ring on an inactive tab",
    "--color-focus-ring",
    "--color-folder-tab-inactive",
    3,
  ],
  [
    "focus-on-inactive-nested-tab",
    "Focus ring on an inactive nested tab",
    "--color-focus-ring",
    "--color-folder-tab-inactive-nested",
    3,
  ],
  [
    "focus-on-inactive-deep-tab",
    "Focus ring on an inactive deep tab",
    "--color-focus-ring",
    "--color-folder-tab-inactive-deep",
    3,
  ],
  [
    "focus-on-shell",
    "Focus ring on the dark shell",
    "--color-focus-ring-on-dark",
    "--color-shell",
    3,
  ],
  [
    "tab-on-shell",
    "Inactive tab against the shell",
    "--color-folder-tab-inactive",
    "--color-shell",
    3,
  ],
  // A nested tab against the folder it stands on. Paper on paper cannot reach 3:1, and
  // the label identifies the tab, so these are reported for information only.
  [
    "nested-tab-on-parent",
    "Inactive nested tab against the parent folder (informational)",
    "--color-folder-tab-inactive-nested",
    "--color-folder-parent",
    null,
  ],
  [
    "deep-tab-on-nested",
    "Inactive deep tab against the nested folder (informational)",
    "--color-folder-tab-inactive-deep",
    "--color-folder-nested",
    null,
  ],
  [
    "disabled-on-paper",
    "Disabled text (exempt; informational)",
    "--color-state-disabled",
    "--color-folder-active",
    null,
  ],
]).map(([id, label, foreground, background, min]) => ({
  id,
  label,
  foreground,
  background,
  min,
}))
