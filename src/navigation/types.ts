/**
 * Types for the GusmaoLab navigation model (P04), with the display tabs added in P06 and
 * the folder previews added in P07.
 *
 * The model is data only. It holds no colors or styles (categories and environments are
 * semantic names, resolved by src/styles/categories.css and src/styles/environments.css)
 * and no transient pointer or keyboard state:
 * whether a preview is showing belongs to the page's script, never to the model (P07).
 */

/**
 * Archive categories (P09-A01, D-076): the five permanent cardstock colours. Every
 * first-level section belongs to one, and its folders inherit it. A category decides
 * colour only: its tab keeps that colour on every page.
 */
export type ArchiveCategory =
  | "core"
  | "research"
  | "blog-notes"
  | "writing"
  | "bearnard"

/**
 * Section environments: typography and texture, never colour (D-076). "core" is the
 * default: no `data-environment` attribute.
 */
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
  /**
   * The archive category. Required on first-level sections and allowed nowhere else:
   * folders always share their section's cardstock.
   */
  readonly category?: ArchiveCategory
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

/** A folder tab after compilation: path, level, category and environment resolved. */
export interface NavigationNode {
  readonly id: string
  readonly label: string
  readonly path: string
  readonly level: TabLevel
  /** The category of the node's first-level section: its permanent cardstock. */
  readonly category: ArchiveCategory
  /** The node's own environment, or the one inherited from its parent. */
  readonly environment: SectionEnvironment
  readonly description?: string
  readonly parentId: string | null
  /** Immediate children in declared order: the data a hover preview shows. */
  readonly children: readonly NavigationNode[]
}

/** A registered folder, drawn as a tab. */
export interface NodeTab {
  readonly kind: "folder"
  /** The node's ID. */
  readonly id: string
  readonly label: string
  /** The node's canonical path. */
  readonly href: string
  readonly node: NavigationNode
}

/**
 * The Overview tab (P06): an open parent's own page, drawn first in its children's row.
 * It is a presentation of the parent, not a registry node: it links to the parent's own
 * canonical path, adds no URL and no page, and never has an Overview of its own.
 */
export interface OverviewTab {
  readonly kind: "overview"
  /** `overview:<parent ID>`. The colon keeps it apart from every node ID. */
  readonly id: string
  readonly label: string
  /** The parent's canonical path. */
  readonly href: string
  readonly parent: NavigationNode
}

/** One tab as drawn in a row. */
export type DisplayTab = NodeTab | OverviewTab

/**
 * A temporary preview of an unopened folder's contents (P07): what its own row of tabs
 * would show if it were opened. Built with the page; showing it changes nothing else.
 */
export interface TabPreview {
  /** The folder previewed: an unselected tab of the row, with children. */
  readonly folder: NavigationNode
  /**
   * Its Overview, then its immediate children in registry order: the same display tabs,
   * in the same order, as the row that opens below it on its own page. Never deeper.
   */
  readonly tabs: readonly DisplayTab[]
}

/** One visible row of tabs. */
export interface TabRow {
  readonly level: TabLevel
  /** The open folder whose children form this row; null for the global row. */
  readonly parent: NavigationNode | null
  /** In display order. A child row starts with its parent's Overview tab. */
  readonly tabs: readonly DisplayTab[]
  /** The tab with the V indicator. Every row has one: there is no unselected row (D-050). */
  readonly selectedId: string
  /**
   * Previews by tab ID (P07): one for each unselected folder tab that has children. The
   * selected tab has none, because its children are already the row below it; leaves and
   * Overview tabs have none, because there is nothing inside them to show.
   */
  readonly previews: ReadonlyMap<string, TabPreview>
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
  /**
   * The open folders, from the global row down to `folder`: registry nodes only, never an
   * Overview tab. Never more than three.
   */
  readonly selection: readonly NavigationNode[]
  /**
   * Tab rows to draw, from the global row down. Never more than three. When `folder` has
   * children, the last row is theirs, with its Overview tab selected.
   */
  readonly rows: readonly TabRow[]
  /**
   * The tab that stands for this page, which carries `aria-current="page"`: the last row's
   * selected tab on a folder page (the Overview tab, when the folder has children). Null on
   * a content page, whose selected tabs are all folders that contain it.
   */
  readonly currentTabId: string | null
  /** The open section's category: the page's flannel, folder bodies and reading paper. */
  readonly category: ArchiveCategory
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
