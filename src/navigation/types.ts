/**
 * Types for the GusmaoLab navigation model (P04).
 *
 * The model is data only. It holds no colors or styles (environments are semantic names
 * resolved by src/styles/environments.css) and no transient pointer or keyboard state.
 */

/** Section environments. "core" is the default: no `data-environment` attribute. */
export type SectionEnvironment =
  | "core"
  | "scientific"
  | "technical"
  | "literary"
  | "personal"

/** A visible physical-folder tab level. Level 1 is the global row. */
export type TabLevel = 1 | 2 | 3

/** One folder tab as declared in the registry (src/navigation/registry.ts). */
export interface NavigationEntry {
  /** Stable identity: lowercase kebab-case, unique, independent of the label and the URL. */
  readonly id: string
  /** Visible tab text. Changing it changes neither the identity nor the URL. */
  readonly label: string
  /** URL segment below the parent's path. Only Home has "", which gives the path "/". */
  readonly slug: string
  /** Overrides the environment inherited from the parent; top-level tabs default to "core". */
  readonly environment?: SectionEnvironment
  /** Optional short accessible description. */
  readonly description?: string
  /** Child folders, in display order. Allowed on levels 1 and 2 only. */
  readonly children?: readonly NavigationEntry[]
}

/**
 * A real page below the folder tabs, such as an article, registered with the folder whose
 * body displays it. It gets no tab of its own.
 */
export interface ContentRoute {
  /** Canonical path of the page, inside its owner's path. */
  readonly path: string
  /** ID of the owning folder: the deepest folder whose path contains this path. */
  readonly owner: string
  /** Optional page title, for future indexes and 404 context. */
  readonly title?: string
}

/** A folder tab after compilation: path, level and environment resolved. */
export interface NavigationNode {
  readonly id: string
  readonly label: string
  readonly path: string
  readonly level: TabLevel
  /** The node's own environment, or the one inherited from its parent. */
  readonly environment: SectionEnvironment
  readonly description?: string
  readonly parentId: string | null
  /** Immediate children in declared order: the data a hover preview shows. */
  readonly children: readonly NavigationNode[]
}

/** One visible row of tabs. */
export interface TabRow {
  readonly level: TabLevel
  /** The open folder whose children form this row; null for the global row. */
  readonly parent: NavigationNode | null
  readonly tabs: readonly NavigationNode[]
  /** The tab with the V indicator in this row, or null when the row is open but unselected. */
  readonly selectedId: string | null
}

/** What the folder body displays. */
export type NavigationPage =
  | { readonly kind: "folder"; readonly node: NavigationNode }
  | { readonly kind: "content"; readonly route: ContentRoute }

/** The visible folder state for one canonical path. */
export interface NavigationState {
  readonly path: string
  readonly page: NavigationPage
  /** The folder whose body shows the page: the page's own node, or a content route's owner. */
  readonly folder: NavigationNode
  /** The selected tab per level, from the global row down. Never more than three. */
  readonly selection: readonly NavigationNode[]
  /** Tab rows to draw, from the global row down. Never more than three. */
  readonly rows: readonly TabRow[]
  readonly environment: SectionEnvironment
}

/** The result of resolving a URL. Unknown paths are never treated as pages. */
export type NavigationResolution =
  | { readonly found: true; readonly state: NavigationState }
  | {
      readonly found: false
      readonly path: string
      /** The deepest registered folder containing the path, for a future 404 page. */
      readonly context: NavigationNode | null
    }

/**
 * Transient tab interaction, owned by the tab components (P07) and never stored in the
 * registry. Selection comes from the URL; hover and focus only choose which immediate
 * children to preview.
 */
export interface TabInteraction {
  readonly hoveredId: string | null
  readonly focusedId: string | null
}
