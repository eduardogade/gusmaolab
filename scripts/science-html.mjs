// Quarto HTML to a trusted article fragment (P13, D-098 to D-101): the one place where the
// HTML that Quarto writes is turned into the HTML the site embeds.
//
// Quarto renders a whole page: a head, styles, scripts, a title block, a copy button on code,
// an appendix. The site owns all of that (P12 draws the title, the folders and the styles).
// What it takes from Quarto is the scientific content of the article. This module parses the
// page with a real HTML parser (ultrahtml, pinned as a development dependency), keeps what an
// allowlist names, drops the known chrome, and refuses anything else, so a document that
// needs a script, an iframe or an external image fails instead of being published.
//
// The trust model: sources are written by the owner and rendered on the owner's machine
// (science/README.md). This is a check on what Quarto wrote, not a defence against hostile
// input, and it stays strict anyway: a fragment that passes holds no script, no event handler,
// no style attribute, no external resource and no URL scheme but http(s) and mailto.
//
// Pure functions over strings: no file access. scripts/science.mjs does the files.
import { ELEMENT_NODE, TEXT_NODE, parse, render } from "ultrahtml"

const ID = /^[A-Za-z][\w:.-]*$/
const TOKEN = /^[\w:.-]+$/
const UUID = /-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/g

/** Tags that may stay, as written. */
const HTML_TAGS = new Set(
  "a abbr b blockquote br caption cite code col colgroup dd del dfn div dl dt em figcaption figure h2 h3 h4 h5 h6 hr i img ins kbd li mark ol p pre q s samp section small span strong sub sup table tbody td tfoot th thead time tr u ul var".split(
    " ",
  ),
)
const MATHML_TAGS = new Set(
  "math semantics annotation mrow mi mn mo mtext mspace msup msub msubsup mfrac msqrt mroot munder mover munderover mtable mtr mtd mstyle mpadded mphantom menclose mmultiscripts mprescripts none mlabeledtr".split(
    " ",
  ),
)
/** Quarto's page chrome: removed with everything inside. */
const DROP_TAGS = new Set([
  "script",
  "style",
  "link",
  "meta",
  "title",
  "button",
  "noscript",
  // Column widths Quarto computes for a wide table are inline styles: the site owns presentation.
  "colgroup",
])
/** Wrappers that are dropped while their content stays. */
const UNWRAP_CLASSES = new Set(["code-copy-outer-scaffold", "quarto-appendix-contents"])

const GLOBAL_ATTRS = new Set(["id", "class", "lang", "dir", "title", "role"])
const TAG_ATTRS = {
  a: ["href", "rel"],
  img: ["src", "alt", "width", "height"],
  td: ["colspan", "rowspan", "headers", "scope"],
  th: ["colspan", "rowspan", "headers", "scope"],
  ol: ["start", "type", "reversed"],
  li: ["value"],
  time: ["datetime"],
  col: ["span"],
  colgroup: ["span"],
  math: ["display", "xmlns"],
  annotation: ["encoding"],
}
const MATHML_ATTRS = new Set(
  "mathvariant displaystyle scriptlevel stretchy form fence separator accent accentunder lspace rspace width height columnalign rowspacing columnspacing linethickness encoding movablelimits largeop symmetric minsize maxsize display xmlns mathsize mathcolor".split(
    " ",
  ),
)
const ASSET_TYPES = /\.(?:svg|png|jpe?g|gif|webp)$/i
const SAFE_HREF = /^(?:#[\w:.-]+|https?:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+)$/i

/** Characters of a text content that can open a script or a style in an SVG asset. */
export function svgIssues(text) {
  const issues = []
  if (/<script|<foreignObject|<iframe|<style[^>]*@import/i.test(text))
    issues.push("it holds a script, a foreign object or an import")
  if (/\son[a-z]+\s*=/i.test(text)) issues.push("it holds an event handler")
  if (/javascript:|data:text\/html/i.test(text)) issues.push("it holds a script URL")
  if (/(?:xlink:)?href\s*=\s*["']\s*(?:https?:)?\/\//i.test(text))
    issues.push("it loads an external resource")
  return issues
}

const classesOf = (node) => (node.attributes?.class ?? "").split(/\s+/).filter(Boolean)
const hasClass = (node, name) => classesOf(node).includes(name)
const textOf = (node) =>
  node.type === TEXT_NODE ? node.value : (node.children ?? []).map(textOf).join("")
const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

/**
 * Takes Quarto's HTML page and returns the article fragment.
 *
 * @param html the page Quarto wrote
 * @param options.assetBase the public address the fragment's images will have, ending in "/"
 * @returns { html, headings, assets, features, issues } where `assets` are the files the
 *   fragment refers to, as `{ source, name }` (source: as Quarto wrote it, relative to the
 *   page; name: the file name in assetBase). An empty `issues` list means it can be used.
 */
export async function extractFragment(html, { assetBase }) {
  const issues = []
  const assets = new Map()
  const doc = parse(html)

  const find = (node, test) => {
    if (node.type === ELEMENT_NODE && test(node)) return node
    for (const child of node.children ?? []) {
      const found = find(child, test)
      if (found) return found
    }
    return undefined
  }
  const main = find(
    doc,
    (n) => n.name === "main" && n.attributes?.id === "quarto-document-content",
  )
  if (!main) {
    return {
      html: "",
      headings: [],
      assets: [],
      features: {},
      issues: ["no Quarto article found in the page"],
    }
  }

  // --- 1. Clean: allowlist, chrome out, wrappers off ------------------------------------
  const clean = (node) => {
    if (node.type === TEXT_NODE) return [node]
    if (node.type !== ELEMENT_NODE) return [] // comments and the rest
    const name = node.name
    const cls = classesOf(node)
    if (DROP_TAGS.has(name)) return []
    if (name === "header" && node.attributes?.id === "title-block-header") return []
    if (cls.includes("callout-icon-container")) return []
    if (name === "a" && /^#cb\d+-\d+$/.test(node.attributes?.href ?? "")) return [] // line anchors
    if (name === "div" && node.attributes?.id === "quarto-appendix") return flat(node)
    if (name === "div" && cls.some((c) => UNWRAP_CLASSES.has(c))) return flat(node)
    if (name === "section" && node.attributes?.id === "quarto-bibliography")
      return flat(node)
    if (name === "main" || name === "body" || name === "html" || name === "head") {
      issues.push(`a <${name}> inside the article`)
      return []
    }
    if (name === "h1") {
      issues.push("a level-1 heading in the article: the title is the page's own")
      return []
    }
    if (name === "svg" || name === "iframe" || name === "object" || name === "embed") {
      issues.push(`<${name}> is not allowed in an article (use an image file)`)
      return []
    }
    const known = HTML_TAGS.has(name) || MATHML_TAGS.has(name)
    if (!known) {
      issues.push(`<${name}> is not allowed in an article`)
      return []
    }
    // attributes
    const attributes = {}
    let alignClass = ""
    for (const [key, raw] of Object.entries(node.attributes ?? {})) {
      const value = String(raw)
      if (key === "style" && (name === "th" || name === "td")) {
        // Pandoc aligns a table column with an inline style; the site uses a class.
        const align = /^\s*text-align:\s*(left|right|center)\s*;?\s*$/.exec(value)
        if (align) {
          alignClass = `align-${align[1]}`
          continue
        }
      }
      if (/^on/i.test(key) || key === "style") {
        issues.push(`<${name}> has the attribute ${key}`)
        continue
      }
      const allowed =
        GLOBAL_ATTRS.has(key) ||
        /^aria-[\w-]+$/.test(key) ||
        /^data-[\w-]+$/.test(key) ||
        (TAG_ATTRS[name] ?? []).includes(key) ||
        (MATHML_TAGS.has(name) && MATHML_ATTRS.has(key))
      if (!allowed) continue // Quarto's own attributes (an `alt` on a div, say) are dropped
      if (key === "id" && !ID.test(value)) {
        issues.push(`the id "${value}" is not allowed`)
        continue
      }
      if (
        key === "class" &&
        !value.split(/\s+/).every((c) => c === "" || TOKEN.test(c))
      ) {
        issues.push(`the class "${value}" is not allowed`)
        continue
      }
      attributes[key] = value
    }
    if (alignClass) attributes.class = `${attributes.class ?? ""} ${alignClass}`.trim()
    // URLs
    if (name === "a") {
      const href = attributes.href
      if (href === undefined) delete attributes.href
      else if (!SAFE_HREF.test(href)) {
        issues.push(
          `the link "${href}" is not allowed (only #anchors, http(s) and mailto)`,
        )
        delete attributes.href
      }
      if (attributes.href?.startsWith("http")) attributes.rel = "noopener"
    }
    if (name === "img") {
      const src = attributes.src ?? ""
      if (
        src.startsWith(assetBase) &&
        ASSET_TYPES.test(src) &&
        !src.slice(assetBase.length).includes("/")
      ) {
        // Already a published figure: an article that was extracted before.
      } else if (
        !ASSET_TYPES.test(src) ||
        /^[a-z][a-z0-9+.-]*:/i.test(src) ||
        src.startsWith("/") ||
        src.split("/").includes("..")
      ) {
        issues.push(
          `the image "${src}" is not a local figure file inside the document's own folder`,
        )
        return []
      } else {
        const clean = src.replace(/^\.\//, "")
        const file = clean.split("/").at(-1)
        assets.set(clean, file)
        attributes.src = `${assetBase}${file}`
      }
      if (!attributes.alt || attributes.alt.trim() === "")
        issues.push(`the figure ${src.split("/").at(-1)} has no alt text: add fig-alt`)
      // No lazy loading: a figure that loads late moves the text below it, and an address that
      // points at a figure or a table would land in the wrong place.
    }
    // headings: remove the anchor class's script hooks
    delete attributes["data-anchor-id"]
    // Pandoc's section ids go to the heading (below), line ids are noise
    if (/^cb\d+-\d+$/.test(attributes.id ?? "")) delete attributes.id
    if (attributes.id) attributes.id = attributes.id.replace(UUID, "")
    if (attributes["aria-describedby"])
      attributes["aria-describedby"] = attributes["aria-describedby"].replace(UUID, "")
    if (name === "th" && attributes.scope === undefined) attributes.scope = "col"

    let children = []
    for (const child of node.children ?? []) children.push(...clean(child))
    const next = { ...node, attributes, children }
    // sections become their heading's id, and disappear
    if (name === "section") {
      const id = attributes.id
      const first = children.find((c) => c.type === ELEMENT_NODE)
      if (id && first && /^h[2-6]$/.test(first.name) && !first.attributes.id) {
        first.attributes.id = id
        delete attributes.id
      } else if (id && !(first && /^h[2-6]$/.test(first.name))) {
        // a section that is not a heading's: keep it (the footnotes)
        return [next]
      }
      if (cls.includes("footnotes") || attributes.role === "doc-endnotes") return [next]
      return children
    }
    return [next]
  }
  const flat = (node) => (node.children ?? []).flatMap(clean)
  const content = flat(main)

  // --- 2. Name the appendix headings ---------------------------------------------------
  const walk = (nodes, visit) => {
    for (const node of nodes) {
      if (node.type !== ELEMENT_NODE) continue
      visit(node)
      walk(node.children ?? [], visit)
    }
  }
  walk(content, (node) => {
    if (
      /^h[2-6]$/.test(node.name) &&
      hasClass(node, "quarto-appendix-heading") &&
      !node.attributes.id
    ) {
      const label = decode(textOf(node)).trim().toLowerCase()
      node.attributes.id =
        label === "references"
          ? "references"
          : label === "footnotes"
            ? "footnotes"
            : label.replace(/[^a-z0-9]+/g, "-")
    }
  })

  // --- 3. Facts about the result ---------------------------------------------------------
  const ids = new Map()
  const hrefs = []
  const headings = []
  const features = {
    math: 0,
    figures: 0,
    tables: 0,
    citations: 0,
    footnotes: 0,
    callouts: 0,
    code: 0,
    equations: 0,
  }
  walk(content, (node) => {
    const { id, href } = node.attributes
    if (id) ids.set(id, (ids.get(id) ?? 0) + 1)
    if (href?.startsWith("#")) hrefs.push(href.slice(1))
    if (/^h[2-6]$/.test(node.name)) {
      if (!id) issues.push(`the heading "${decode(textOf(node)).trim()}" has no id`)
      headings.push({
        depth: Number(node.name[1]),
        slug: id ?? "",
        text: decode(textOf(node)).trim(),
      })
    }
    if (node.name === "math") {
      features.math++
      if (node.attributes.display === "block") features.equations++
    }
    if (node.name === "figure" && hasClass(node, "quarto-float-fig")) features.figures++
    if (node.name === "figure" && hasClass(node, "quarto-float-tbl")) features.tables++
    if (hasClass(node, "citation")) features.citations++
    if (hasClass(node, "footnote-ref")) features.footnotes++
    if (hasClass(node, "callout")) features.callouts++
    if (node.name === "pre") features.code++
    if (hasClass(node, "quarto-unresolved-ref") || /^\?@/.test(textOf(node).trim()))
      issues.push(
        `an unresolved cross-reference: ${decode(textOf(node)).trim().slice(0, 40)}`,
      )
  })
  for (const [id, n] of ids) if (n > 1) issues.push(`the id "${id}" is used ${n} times`)
  for (const target of hrefs)
    if (!ids.has(target)) issues.push(`the link #${target} has no target`)
  // A citation must reach its entry in the reference list.
  walk(content, (node) => {
    if (hasClass(node, "citation")) {
      for (const key of (node.attributes["data-cites"] ?? "")
        .split(/\s+/)
        .filter(Boolean))
        if (!ids.has(`ref-${key}`))
          issues.push(`the citation "${key}" has no entry in the reference list`)
    }
  })
  const reserved = [
    "ed-toc-title",
    "ed-related-title",
    "ed-prerequisites",
    "ed-chapters-title",
  ]
  for (const id of reserved)
    if (ids.has(id)) issues.push(`the id "${id}" belongs to the page`)

  const out = await render({ type: 0, name: "", attributes: {}, children: content })
  return {
    html: out.trim() + "\n",
    headings,
    assets: [...assets].map(([source, name]) => ({ source, name })),
    features,
    issues,
  }
}

/** The table of contents of a fragment, as P12 expects it: headings of depth 2 and 3. */
export const headingsForContents = (headings) =>
  headings.filter((h) => h.depth === 2 || h.depth === 3)
