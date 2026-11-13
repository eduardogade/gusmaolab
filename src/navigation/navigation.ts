/**
 * Pure helpers for the GusmaoLab navigation model (P04): path normalization, registry
 * validation, compilation, URL-to-folder-state resolution and hover-preview data. P06
 * added the Overview display tabs and the static-path lists for the section pages; P07
 * added each row's folder previews, built from the same display tabs.
 *
 * Nothing here touches the DOM, holds UI state or creates routes. It runs both inside
 * Astro and directly under Node.js (native type stripping), so it uses erasable
 * TypeScript only and imports types with `import type`.
 */
import type {
  ArchiveCategory,
  ContentRoute,
  DisplayTab,
  NavigationEntry,
  NavigationNode,
  NavigationPage,
  NavigationResolution,
  NavigationState,
  NodeTab,
  OverviewTab,
  SectionEnvironment,
  TabLevel,
  TabPreview,
  TabRow,
} from "./types.ts"

/** Every archive category (P09-A01): the five permanent cardstock colours. */
export const CATEGORY_IDS: readonly ArchiveCategory[] = [
  "core",
  "research",
  "blog-notes",
  "writing",
  "bearnard",
]

/** Every section environment. "core" is the default, with no `data-environment` attribute. */
export const ENVIRONMENT_IDS: readonly SectionEnvironment[] = [
  "core",
  "scientific",
  "technical",
  "literary",
  "personal",
]

/** Visible physical-folder tab levels, counting the global row. Content may go deeper. */
export const MAX_TAB_LEVELS = 3

/** The label of every Overview tab (D-051). */
export const OVERVIEW_LABEL = "Overview"

/**
 * The display ID of a parent's Overview tab. Node IDs are kebab-case, so the colon means
 * an Overview ID can never equal, or be mistaken for, a node ID.
 */
export const overviewTabId = (parentId: string): string => `overview:${parentId}`

/**
 * Route parameter names for the section pages, by tab level: `src/pages/[section]/`,
 * `[section]/[folder]/` and `[section]/[folder]/[subfolder]/` (D-053).
 */
export const ROUTE_PARAMS = ["section", "folder", "subfolder"] as const

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ENTRY_KEYS = new Set([
  "id",
  "label",
  "slug",
  "category",
  "environment",
  "description",
  "children",
])
const ROUTE_KEYS = new Set(["path", "owner", "title"])
// Only used to parse paths; the origin itself is ignored.
const PARSE_BASE = "https://gusmaolab.invalid/"

/**
 * The canonical form of a path or URL, used for every comparison:
 *
 * - the origin, query string and fragment are dropped;
 * - dot segments are resolved and repeated slashes collapsed;
 * - a trailing `index.html` is removed;
 * - every path ends with a slash, and the homepage is `/`.
 *
 * Case is kept: canonical paths are lowercase, and `/CV/` is a different, unknown path.
 */
export function normalizePath(input: string): string {
  const isAbsoluteUrl = /^[a-z][a-z\d+.-]*:/i.test(input)
  // A leading "//" would otherwise be read as a host name.
  const source = isAbsoluteUrl ? input : input.replace(/^[\\/]+/, "/")
  let path = new URL(source, PARSE_BASE).pathname.replace(/\/{2,}/g, "/")
  path = path.replace(/\/index\.html$/i, "/")
  return path.endsWith("/") ? path : `${path}/`
}

/** True when a path is already canonical and made of lowercase kebab-case segments. */
export function isCanonicalPath(path: string): boolean {
  if (path !== normalizePath(path)) return false
  return (
    path === "/" ||
    path
      .slice(1, -1)
      .split("/")
      .every((s) => SEGMENT_PATTERN.test(s))
  )
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const describe = (value: unknown): string =>
  isPlainObject(value) && typeof value.id === "string" ? `"${value.id}"` : "an entry"

const childPath = (parentPath: string, slug: string): string =>
  slug === "" ? parentPath : `${parentPath}${slug}/`

/**
 * Every problem in a registry and its content routes, in a stable order. An empty list
 * means the configuration is valid. Input is checked at runtime as well as by TypeScript,
 * so fixtures written in JavaScript are covered too.
 */
export function validateNavigation(
  sections: readonly NavigationEntry[],
  contentRoutes: readonly ContentRoute[] = [],
): string[] {
  const issues: string[] = []
  const ids = new Map<string, string>()
  const paths = new Map<string, string>()
  const seen = new Set<unknown>()

  if (!Array.isArray(sections) || sections.length === 0) {
    return ["the registry must be a non-empty array of top-level sections"]
  }

  const visit = (
    entry: unknown,
    level: number,
    parentPath: string,
    ancestors: readonly unknown[],
  ): void => {
    const name = describe(entry)
    if (!isPlainObject(entry)) {
      issues.push(`level ${level} has an entry that is not an object`)
      return
    }
    if (ancestors.includes(entry)) {
      issues.push(`${name} contains itself: the hierarchy has a cycle`)
      return
    }
    if (seen.has(entry)) {
      issues.push(`${name} is declared in more than one place`)
      return
    }
    seen.add(entry)
    if (level > MAX_TAB_LEVELS) {
      issues.push(
        `${name} would be tab level ${level}; at most ${MAX_TAB_LEVELS} levels are visible`,
      )
      return
    }
    for (const key of Object.keys(entry)) {
      if (!ENTRY_KEYS.has(key)) issues.push(`${name} has an unknown field "${key}"`)
    }

    const { id, label, slug, category, environment, description, children } = entry
    if (typeof id !== "string" || !ID_PATTERN.test(id)) {
      issues.push(`${name} needs an id in lowercase kebab-case`)
    } else if (ids.has(id)) {
      issues.push(`id "${id}" is used more than once`)
    } else {
      ids.set(id, id)
    }
    if (typeof label !== "string" || label.trim() === "") {
      issues.push(`${name} needs a label`)
    }

    let path: string | null = null
    if (typeof slug !== "string") {
      issues.push(`${name} needs a slug`)
    } else if (slug === "") {
      if (level !== 1)
        issues.push(`${name} has an empty slug; only a top-level Home may`)
      else path = "/"
    } else if (!SEGMENT_PATTERN.test(slug)) {
      issues.push(`${name} has slug "${slug}"; use one lowercase kebab-case segment`)
    } else {
      path = childPath(parentPath, slug)
    }
    if (path !== null) {
      const owner = paths.get(path)
      if (owner !== undefined)
        issues.push(`path ${path} is used by both "${owner}" and ${name}`)
      else paths.set(path, typeof id === "string" ? id : name)
    }

    // A category is the whole section's cardstock: declared once, on the section.
    if (level === 1) {
      if (category === undefined) {
        issues.push(`${name} needs a category: every top-level section has one`)
      } else if (!CATEGORY_IDS.includes(category as ArchiveCategory)) {
        issues.push(`${name} has an unknown category "${String(category)}"`)
      }
    } else if (category !== undefined) {
      issues.push(`${name} declares a category; a folder always shares its section's`)
    }
    if (
      environment !== undefined &&
      !ENVIRONMENT_IDS.includes(environment as SectionEnvironment)
    ) {
      issues.push(`${name} has an unknown environment "${String(environment)}"`)
    }
    if (
      description !== undefined &&
      (typeof description !== "string" || description.trim() === "")
    ) {
      issues.push(`${name} has an empty description; omit it instead`)
    }
    if (children !== undefined) {
      if (!Array.isArray(children)) {
        issues.push(`${name} has children that are not an array`)
      } else {
        for (const child of children) {
          visit(child, level + 1, path ?? parentPath, [...ancestors, entry])
        }
      }
    }
  }

  for (const section of sections) visit(section, 1, "/", [])

  if (!Array.isArray(contentRoutes)) {
    issues.push("content routes must be an array")
    return issues
  }
  const routePaths = new Set<string>()
  // Folder paths only, deepest last, to find the folder that must own each route.
  const folderPaths = [...paths.entries()].sort(([a], [b]) => a.length - b.length)

  for (const route of contentRoutes) {
    if (!isPlainObject(route)) {
      issues.push("a content route is not an object")
      continue
    }
    for (const key of Object.keys(route)) {
      if (!ROUTE_KEYS.has(key))
        issues.push(`content route ${String(route.path)} has an unknown field "${key}"`)
    }
    const { path, owner, title } = route
    if (typeof path !== "string" || !isCanonicalPath(path)) {
      issues.push(`content route ${JSON.stringify(path)} is not a canonical path`)
      continue
    }
    if (paths.has(path)) {
      issues.push(`content route ${path} duplicates the folder "${paths.get(path)}"`)
      continue
    }
    if (routePaths.has(path)) {
      issues.push(`content route ${path} is registered more than once`)
      continue
    }
    routePaths.add(path)
    if (title !== undefined && (typeof title !== "string" || title.trim() === "")) {
      issues.push(`content route ${path} has an empty title; omit it instead`)
    }
    if (typeof owner !== "string" || !ids.has(owner)) {
      issues.push(
        `content route ${path} names an unknown owner ${JSON.stringify(owner)}`,
      )
      continue
    }
    const deepest = folderPaths
      .filter(([folderPath]) => path.startsWith(folderPath))
      .at(-1)
    const ownerPath = [...paths.entries()].find(([, id]) => id === owner)?.[0]
    if (ownerPath === undefined || !path.startsWith(ownerPath)) {
      issues.push(`content route ${path} lies outside its owner "${owner}"`)
    } else if (deepest !== undefined && deepest[1] !== owner) {
      issues.push(
        `content route ${path} is owned by "${owner}" but lies inside "${deepest[1]}"`,
      )
    }
  }
  return issues
}

/** Thrown by createNavigation() for an invalid registry, with every issue listed. */
export class NavigationConfigError extends Error {
  readonly issues: readonly string[]

  constructor(issues: readonly string[]) {
    super(`Invalid navigation configuration:\n- ${issues.join("\n- ")}`)
    this.name = "NavigationConfigError"
    this.issues = issues
  }
}

/** A compiled, validated navigation model. Every method is a pure lookup. */
export interface Navigation {
  /** The global row of tabs, in declared order. */
  readonly sections: readonly NavigationNode[]
  /** Every folder node, by ID. */
  readonly nodes: ReadonlyMap<string, NavigationNode>
  /** Every registered content route, by canonical path. */
  readonly contentRoutes: ReadonlyMap<string, ContentRoute>
  /** The node with this ID; throws for an unknown ID, which is always a programming error. */
  node(id: string): NavigationNode
  /** The node and its ancestors, from the global row down to the node itself. */
  lineage(id: string): readonly NavigationNode[]
  /**
   * A folder's immediate children, in declared order; empty for a leaf (P04). The drawn
   * previews (P07) are `TabRow.previews`, which add the folder's Overview in front.
   */
  preview(id: string): readonly NavigationNode[]
  /** The folder state for a path or URL, or `found: false` for an unknown page. */
  resolve(pathOrUrl: string): NavigationResolution
  /** Every registered page path, folders first, for route generation and build checks. */
  pagePaths(): readonly string[]
  /**
   * `getStaticPaths()` entries for the folder pages of one tab level, in registry order:
   * the path's segments as `ROUTE_PARAMS`. Home, whose path is `/`, has its own page file
   * and is never listed. Each call returns new objects, which Astro may annotate.
   */
  folderStaticPaths(level: TabLevel): FolderStaticPath[]
}

/** One `getStaticPaths()` entry for a folder page. */
export interface FolderStaticPath {
  params: Record<string, string>
}

const tabLevel = (level: number): TabLevel => {
  if (level === 1 || level === 2 || level === 3) return level
  throw new Error(`tab level ${level} is outside 1–${MAX_TAB_LEVELS}`)
}

/**
 * Validate and compile a registry. Throws NavigationConfigError if anything is wrong, so
 * an invalid configuration fails the build instead of producing unpredictable state.
 */
export function createNavigation(
  sections: readonly NavigationEntry[],
  contentRoutes: readonly ContentRoute[] = [],
): Navigation {
  const issues = validateNavigation(sections, contentRoutes)
  if (issues.length > 0) throw new NavigationConfigError(issues)

  const nodes = new Map<string, NavigationNode>()
  const byPath = new Map<string, NavigationNode>()

  const compile = (
    entry: NavigationEntry,
    level: number,
    parent: {
      path: string
      id: string
      category: ArchiveCategory
      environment: SectionEnvironment
    } | null,
  ): NavigationNode => {
    const path =
      parent === null ? childPath("/", entry.slug) : childPath(parent.path, entry.slug)
    // Validation guarantees a category on every section and on nothing below one.
    const category = parent?.category ?? (entry.category as ArchiveCategory)
    const environment = entry.environment ?? parent?.environment ?? "core"
    const self = { path, id: entry.id, category, environment }
    const children = Object.freeze(
      (entry.children ?? []).map((child) => compile(child, level + 1, self)),
    )
    const node: NavigationNode = Object.freeze({
      id: entry.id,
      label: entry.label,
      path,
      level: tabLevel(level),
      category,
      environment,
      ...(entry.description === undefined ? {} : { description: entry.description }),
      parentId: parent?.id ?? null,
      children,
    })
    nodes.set(node.id, node)
    byPath.set(node.path, node)
    return node
  }

  const top = Object.freeze(sections.map((entry) => compile(entry, 1, null)))
  const routes = new Map(
    contentRoutes.map((route) => [route.path, Object.freeze({ ...route })]),
  )

  const node = (id: string): NavigationNode => {
    const found = nodes.get(id)
    if (found === undefined) throw new Error(`Unknown navigation node "${id}"`)
    return found
  }

  const lineage = (id: string): readonly NavigationNode[] => {
    const chain: NavigationNode[] = []
    for (let current: NavigationNode | undefined = node(id); current; ) {
      chain.unshift(current)
      current = current.parentId === null ? undefined : node(current.parentId)
    }
    return Object.freeze(chain)
  }

  // Display tabs, made once per node and per parent: rows share them.
  const nodeTabs = new Map<string, NodeTab>()
  for (const n of nodes.values()) {
    nodeTabs.set(
      n.id,
      Object.freeze({
        kind: "folder",
        id: n.id,
        label: n.label,
        href: n.path,
        node: n,
      }),
    )
  }
  const overviewTabs = new Map<string, OverviewTab>()
  for (const n of nodes.values()) {
    if (n.children.length === 0) continue
    overviewTabs.set(
      n.id,
      Object.freeze({
        kind: "overview",
        id: overviewTabId(n.id),
        label: OVERVIEW_LABEL,
        href: n.path,
        parent: n,
      }),
    )
  }
  const topTabs = Object.freeze(top.map((n) => nodeTabs.get(n.id) as NodeTab))
  // A parent's row of children always starts with the parent's own Overview tab.
  const childTabs = new Map<string, readonly DisplayTab[]>()
  for (const [id, overview] of overviewTabs) {
    const children = node(id).children.map((n) => nodeTabs.get(n.id) as NodeTab)
    childTabs.set(id, Object.freeze([overview, ...children]))
  }
  // A folder's preview is exactly the row that would open below it (P07): the same
  // frozen display tabs, so the preview and the opened folder can never disagree.
  const folderPreviews = new Map<string, TabPreview>()
  for (const [id, tabs] of childTabs) {
    folderPreviews.set(id, Object.freeze({ folder: node(id), tabs }))
  }

  type RowWithoutPreviews = Omit<TabRow, "previews">
  // Only unselected folders with children get a preview. The selected tab's children
  // are already the row below it, and a leaf or an Overview has nothing inside it.
  const withPreviews = (row: RowWithoutPreviews): TabRow => {
    const previews = new Map<string, TabPreview>()
    for (const tab of row.tabs) {
      if (tab.kind !== "folder" || tab.id === row.selectedId) continue
      const preview = folderPreviews.get(tab.id)
      if (preview !== undefined) previews.set(tab.id, preview)
    }
    return Object.freeze({ ...row, previews })
  }

  const stateFor = (
    path: string,
    page: NavigationPage,
    folder: NavigationNode,
  ): NavigationState => {
    const selection = lineage(folder.id)
    const rows: RowWithoutPreviews[] = [
      { level: 1, parent: null, tabs: topTabs, selectedId: selection[0].id },
    ]
    for (let i = 1; i < selection.length; i++) {
      const parent = selection[i - 1]
      rows.push({
        level: tabLevel(i + 1),
        parent,
        tabs: childTabs.get(parent.id) ?? [],
        selectedId: selection[i].id,
      })
    }
    // An open folder with children always shows their row, with a selected tab: its
    // Overview, which stands for the folder's own page (D-050, D-051). A leaf adds no row.
    const overview = overviewTabs.get(folder.id)
    if (overview !== undefined) {
      rows.push({
        level: tabLevel(folder.level + 1),
        parent: folder,
        tabs: childTabs.get(folder.id) ?? [],
        selectedId: overview.id,
      })
    }
    const deepest = rows[rows.length - 1]
    return Object.freeze({
      path,
      page,
      folder,
      selection,
      rows: Object.freeze(rows.map(withPreviews)),
      currentTabId: page.kind === "folder" ? deepest.selectedId : null,
      category: folder.category,
      environment: folder.environment,
    })
  }

  // Fresh, unfrozen objects on every call: Astro annotates what getStaticPaths() returns.
  const folderStaticPaths = (level: TabLevel): FolderStaticPath[] =>
    [...nodes.values()]
      .filter((n) => n.level === level && n.path !== "/")
      .map((n) => {
        const segments = n.path.slice(1, -1).split("/")
        return {
          params: Object.fromEntries(
            segments.map((segment, i) => [ROUTE_PARAMS[i], segment]),
          ),
        }
      })

  const resolve = (pathOrUrl: string): NavigationResolution => {
    const path = normalizePath(pathOrUrl)
    const folder = byPath.get(path)
    if (folder !== undefined) {
      return {
        found: true,
        state: stateFor(path, { kind: "folder", node: folder }, folder),
      }
    }
    const route = routes.get(path)
    if (route !== undefined) {
      return {
        found: true,
        state: stateFor(path, { kind: "content", route }, node(route.owner)),
      }
    }
    // Unknown: never a page. Report the deepest folder that contains it, as context only.
    let context: NavigationNode | null = null
    for (const candidate of byPath.values()) {
      if (
        path.startsWith(candidate.path) &&
        (context === null || candidate.path.length > context.path.length)
      ) {
        context = candidate
      }
    }
    return { found: false, path, context }
  }

  return Object.freeze({
    sections: top,
    nodes,
    contentRoutes: routes,
    node,
    lineage,
    preview: (id: string) => node(id).children,
    resolve,
    pagePaths: () => Object.freeze([...byPath.keys(), ...routes.keys()]),
    folderStaticPaths,
  })
}
