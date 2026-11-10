/**
 * Pure helpers for the GusmaoLab navigation model (P04): path normalization, registry
 * validation, compilation, URL-to-folder-state resolution and hover-preview data.
 *
 * Nothing here touches the DOM, holds UI state or creates routes. It runs both inside
 * Astro and directly under Node.js (native type stripping), so it uses erasable
 * TypeScript only and imports types with `import type`.
 */
import type {
  ContentRoute,
  NavigationEntry,
  NavigationNode,
  NavigationPage,
  NavigationResolution,
  NavigationState,
  SectionEnvironment,
  TabLevel,
  TabRow,
} from "./types.ts"

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

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ENTRY_KEYS = new Set([
  "id",
  "label",
  "slug",
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

    const { id, label, slug, environment, description, children } = entry
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
  /** Hover-preview data: immediate children only, in declared order. Empty for a leaf. */
  preview(id: string): readonly NavigationNode[]
  /** The folder state for a path or URL, or `found: false` for an unknown page. */
  resolve(pathOrUrl: string): NavigationResolution
  /** Every registered page path, folders first, for route generation and build checks. */
  pagePaths(): readonly string[]
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
    parent: { path: string; id: string; environment: SectionEnvironment } | null,
  ): NavigationNode => {
    const path =
      parent === null ? childPath("/", entry.slug) : childPath(parent.path, entry.slug)
    const environment = entry.environment ?? parent?.environment ?? "core"
    const self = { path, id: entry.id, environment }
    const children = Object.freeze(
      (entry.children ?? []).map((child) => compile(child, level + 1, self)),
    )
    const node: NavigationNode = Object.freeze({
      id: entry.id,
      label: entry.label,
      path,
      level: tabLevel(level),
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

  const stateFor = (
    path: string,
    page: NavigationPage,
    folder: NavigationNode,
  ): NavigationState => {
    const selection = lineage(folder.id)
    const rows: TabRow[] = [
      { level: 1, parent: null, tabs: top, selectedId: selection[0].id },
    ]
    for (let i = 1; i < selection.length; i++) {
      const parent = selection[i - 1]
      rows.push({
        level: tabLevel(i + 1),
        parent,
        tabs: parent.children,
        selectedId: selection[i].id,
      })
    }
    // An open folder with children shows their row, with nothing selected yet.
    if (folder.children.length > 0) {
      rows.push({
        level: tabLevel(folder.level + 1),
        parent: folder,
        tabs: folder.children,
        selectedId: null,
      })
    }
    return Object.freeze({
      path,
      page,
      folder,
      selection,
      rows: Object.freeze(rows.map((row) => Object.freeze(row))),
      environment: folder.environment,
    })
  }

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
  })
}
