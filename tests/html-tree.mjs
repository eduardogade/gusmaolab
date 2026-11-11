// Shared by the tests that read built pages (tests/folders.mjs, tests/routes.mjs).
//
// A minimal HTML tree builder for Astro's well-formed output: elements, attributes and
// text. Enough to walk the folder markup; not a general HTML parser. Moved here from
// tests/folders.mjs in P06.

const VOID = new Set([
  "area",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "wbr",
])

export function parse(html) {
  const root = { tag: "#root", attrs: {}, children: [], parent: null }
  let node = root
  const pattern =
    /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/gi
  for (const match of html.matchAll(pattern)) {
    const [, closing, opening, rawAttrs, selfClosing, text] = match
    if (closing) {
      for (let n = node; n !== root; n = n.parent) {
        if (n.tag === closing.toLowerCase()) {
          node = n.parent
          break
        }
      }
    } else if (opening) {
      const attrs = {}
      for (const [, name, value] of rawAttrs.matchAll(/([^\s=>/]+)(?:="([^"]*)")?/g)) {
        attrs[name] = value ?? ""
      }
      const element = { tag: opening.toLowerCase(), attrs, children: [], parent: node }
      node.children.push(element)
      if (!selfClosing && !VOID.has(element.tag)) node = element
    } else if (text !== undefined) {
      node.children.push({ tag: "#text", text, parent: node })
    }
  }
  return root
}

/** Every element below `root`, in document order. */
export const elements = (root) => {
  const all = []
  const walk = (n) => {
    for (const child of n.children ?? []) {
      if (child.tag === "#text") continue
      all.push(child)
      walk(child)
    }
  }
  walk(root)
  return all
}

export const classes = (el) => (el.attrs?.class ?? "").split(/\s+/)
export const hasClass = (name) => (el) => classes(el).includes(name)
export const childrenOf = (el, test) =>
  el.children.filter((c) => c.tag !== "#text" && test(c))

const decode = (s) =>
  s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")

export const textOf = (el) =>
  el.tag === "#text" ? decode(el.text) : (el.children ?? []).map(textOf).join("")

/** Text as seen on screen: without visually hidden context such as "of CV". */
export const visibleTextOf = (el) =>
  el.tag === "#text"
    ? decode(el.text)
    : classes(el).includes("gl-visually-hidden")
      ? ""
      : (el.children ?? []).map(visibleTextOf).join("")

// The physical folders inside one stack, or any element that holds one stack.

/** The one folder stack inside `container`, and its levels, outermost first. */
export function layersOf(container) {
  const stacks = elements(container).filter(hasClass("gl-folders"))
  if (stacks.length !== 1)
    throw new Error(`expected one folder stack, found ${stacks.length}`)
  const layers = elements(stacks[0]).filter(hasClass("gl-folder"))
  return { stack: stacks[0], layers }
}

/** The row of tabs of one level: its strip, and the tabs in it. */
export const stripOf = (layer) => childrenOf(layer, hasClass("gl-folder__strip"))[0]
export const tabsOf = (layer) =>
  elements(stripOf(layer)).filter(hasClass("gl-folder-tab"))
export const labelElementOf = (tab) =>
  elements(tab).find(hasClass("gl-folder-tab__label"))
export const labelOf = (tab) => visibleTextOf(labelElementOf(tab)).trim()
export const selectedOf = (layer) =>
  tabsOf(layer).filter((tab) => "data-selected" in tab.attrs)
