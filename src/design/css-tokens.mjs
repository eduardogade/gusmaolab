/**
 * Reads the custom properties declared in GusmaoLab's token stylesheets and resolves
 * them per archive category and section environment, as the browser would. Used at
 * build time by the design specimen and by the token, category and contrast tests.
 *
 * It understands only the syntax tokens.css, categories.css and environments.css use:
 * hex colours, `transparent`, `rgb()`, `var()` references and `color-mix(in srgb, …)`.
 * Anything else resolves to raw text (font stacks, lengths, shadows).
 */

/** @typedef {[number, number, number, number]} Rgba channels 0–255, alpha 0–1 */
/** @typedef {{ kind: "color", rgba: Rgba, hex: string, opaque: boolean, text: string }} ColorValue */
/** @typedef {{ kind: "raw", text: string }} RawValue */
/** @typedef {ColorValue | RawValue} TokenValue */
/** @typedef {{ selectors: string[], declarations: Map<string, string> }} Rule */
/**
 * Where a token is resolved: an element's category and environment. A string names one
 * or the other (their ids never overlap); undefined is the root element with neither
 * attribute, which is the Core category in the core environment.
 * @typedef {string | { category?: string, environment?: string } | undefined} Scope
 */

const ENVIRONMENT_SELECTOR =
  /^\[data-environment=(?:"([a-z-]+)"|'([a-z-]+)'|([a-z-]+))\]$/
const CATEGORY_SELECTOR = /^\[data-category=(?:"([a-z-]+)"|'([a-z-]+)'|([a-z-]+))\]$/
const ALIAS_SELECTORS = [":root", "[data-environment]", "[data-category]"]

/** @param {string} css */
export function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "")
}

/**
 * Split on a separator that is not inside parentheses or quotes.
 * @param {string} text
 * @param {string} separator
 */
export function splitTopLevel(text, separator) {
  const parts = []
  let depth = 0
  let start = 0
  /** @type {string | null} */
  let quote = null
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quote) {
      if (ch === quote) quote = null
    } else if (ch === '"' || ch === "'") quote = ch
    else if (ch === "(") depth++
    else if (ch === ")") depth--
    else if (ch === separator && depth === 0) {
      parts.push(text.slice(start, i))
      start = i + 1
    }
  }
  parts.push(text.slice(start))
  return parts
}

/** @param {string} body */
function parseDeclarations(body) {
  /** @type {Map<string, string>} */
  const declarations = new Map()
  for (const part of splitTopLevel(body, ";")) {
    const match = part.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]*?)\s*$/)
    if (!match) continue
    if (declarations.has(match[1]))
      throw new Error(`${match[1]} is declared twice in one rule`)
    declarations.set(
      match[1],
      match[2].replace(/\s+/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")"),
    )
  }
  return declarations
}

/**
 * Top-level rules and their custom-property declarations. At-rules are skipped.
 * @param {string} css
 * @returns {Rule[]}
 */
export function parseRules(css) {
  const text = stripComments(css)
  /** @type {Rule[]} */
  const rules = []
  let depth = 0
  let selectorStart = 0
  let bodyStart = 0
  let selector = ""
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      if (depth === 0) {
        selector = text.slice(selectorStart, i).trim()
        bodyStart = i + 1
      }
      depth++
    } else if (text[i] === "}") {
      depth--
      if (depth === 0) {
        if (!selector.startsWith("@")) {
          rules.push({
            selectors: splitTopLevel(selector, ",").map((s) =>
              s.trim().replace(/\s+/g, " "),
            ),
            declarations: parseDeclarations(text.slice(bodyStart, i)),
          })
        }
        selectorStart = i + 1
      }
    }
  }
  return rules
}

/** @param {number} n */
const channel = (n) => Math.round(Math.min(255, Math.max(0, n)))

/**
 * @param {Rgba} rgba
 * @returns {ColorValue}
 */
function color(rgba) {
  const [r, g, b] = rgba.slice(0, 3).map(channel)
  const a = Math.round(rgba[3] * 1000) / 1000
  const hex = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")
  const opaque = a === 1
  return {
    kind: "color",
    rgba: [r, g, b, a],
    hex,
    opaque,
    text: opaque ? hex : `rgb(${r} ${g} ${b} / ${a})`,
  }
}

/**
 * Parse one colour stop of color-mix(): "<color> <percentage>?" in either order.
 * @param {string} text
 */
function mixStop(text) {
  const trimmed = text.trim()
  const after = trimmed.match(/^([\s\S]*?)\s+(-?[\d.]+)%$/)
  const before = trimmed.match(/^(-?[\d.]+)%\s+([\s\S]*)$/)
  if (after) return { color: parseColor(after[1]), percent: Number(after[2]) }
  if (before) return { color: parseColor(before[2]), percent: Number(before[1]) }
  return { color: parseColor(trimmed), percent: undefined }
}

/**
 * Parse a fully substituted colour expression. Returns null if it is not a colour.
 * @param {string} text
 * @returns {ColorValue | null}
 */
export function parseColor(text) {
  const value = text.trim().toLowerCase()
  if (value === "transparent") return color([0, 0, 0, 0])
  const hex = value.match(/^#([0-9a-f]{3,8})$/)
  if (hex) {
    let digits = hex[1]
    if (digits.length === 3 || digits.length === 4)
      digits = [...digits].map((d) => d + d).join("")
    if (digits.length !== 6 && digits.length !== 8) return null
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16))
    const a = digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1
    return color([r, g, b, a])
  }
  const rgb = value.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[/,]\s*([\d.]+)(%?))?\s*\)$/,
  )
  if (rgb) {
    const alpha = rgb[4] === undefined ? 1 : Number(rgb[4]) / (rgb[5] ? 100 : 1)
    return color([Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), alpha])
  }
  const mix = value.match(/^color-mix\(([\s\S]*)\)$/)
  if (mix) {
    const [space, first, second, ...rest] = splitTopLevel(mix[1], ",")
    if (space.trim() !== "in srgb" || !first || !second || rest.length > 0) {
      throw new Error(`Only two-colour color-mix(in srgb, …) is supported: ${text}`)
    }
    const a = mixStop(first)
    const b = mixStop(second)
    if (!a.color || !b.color) return null
    let p1 = a.percent
    let p2 = b.percent
    if (p1 === undefined && p2 === undefined) p1 = p2 = 50
    else if (p1 === undefined) p1 = 100 - /** @type {number} */ (p2)
    else if (p2 === undefined) p2 = 100 - p1
    const sum = p1 + /** @type {number} */ (p2)
    if (sum <= 0) return color([0, 0, 0, 0])
    const w1 = p1 / sum
    const w2 = /** @type {number} */ (p2) / sum
    const [c1, c2] = [a.color.rgba, b.color.rgba]
    // Premultiplied-alpha interpolation, as CSS Color 5 specifies for color-mix().
    const alpha = c1[3] * w1 + c2[3] * w2
    const mixed = [0, 1, 2].map((i) =>
      alpha === 0 ? 0 : (c1[i] * c1[3] * w1 + c2[i] * c2[3] * w2) / alpha,
    )
    return color([mixed[0], mixed[1], mixed[2], alpha * Math.min(1, sum / 100)])
  }
  return null
}

/**
 * WCAG 2.2 relative luminance of an sRGB colour.
 * @param {Rgba | number[]} rgba
 */
export function relativeLuminance([r, g, b]) {
  /** @param {number} c */
  const linear = (c) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/**
 * WCAG 2.2 contrast ratio between two opaque colours.
 * @param {Rgba | number[]} a
 * @param {Rgba | number[]} b
 */
export function contrastRatio(a, b) {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  )
  return (light + 0.05) / (dark + 0.05)
}

/** Custom properties referenced with var() in a value. @param {string} value */
export function references(value) {
  return [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1])
}

export class TokenSet {
  /**
   * @param {Map<string, string>} root       declared on `:root`
   * @param {Map<string, string>} aliases    declared on the alias selectors
   * @param {Map<string, Map<string, string>>} environments  declared per environment
   * @param {Map<string, Map<string, string>>} [categories]  declared per category
   */
  constructor(root, aliases, environments, categories = new Map()) {
    this.root = root
    this.aliases = aliases
    this.environments = environments
    this.categories = categories
  }

  /** Every declared name, in any scope. */
  names() {
    const all = new Set([...this.root.keys(), ...this.aliases.keys()])
    for (const scopes of [this.environments, this.categories])
      for (const scope of scopes.values())
        for (const name of scope.keys()) all.add(name)
    return all
  }

  /** @param {string} name */
  has(name) {
    return this.names().has(name)
  }

  /**
   * @param {Scope} scope
   * @returns {{ category?: string, environment?: string } | undefined}
   */
  scope(scope) {
    if (scope === undefined) return undefined
    if (typeof scope === "string") {
      if (this.environments.has(scope)) return { environment: scope }
      if (this.categories.has(scope)) return { category: scope }
      throw new Error(`Unknown environment or category: ${scope}`)
    }
    const { category, environment } = scope
    if (environment !== undefined && !this.environments.has(environment))
      throw new Error(`Unknown environment: ${environment}`)
    if (category !== undefined && !this.categories.has(category))
      throw new Error(`Unknown category: ${category}`)
    return category === undefined && environment === undefined
      ? undefined
      : { category, environment }
  }

  /**
   * The declaration that applies to an element with the scope's `data-category` and
   * `data-environment`, or to the bare root element when the scope is undefined.
   * Environment and category blocks come after the alias block in the cascade, and the
   * alias block after :root; an environment and a category never set the same token.
   * @param {string} name
   * @param {Scope} [scope]
   * @returns {{ value: string, scope: Scope } | undefined}
   */
  declaration(name, scope) {
    const where = this.scope(scope)
    if (where !== undefined) {
      for (const block of [
        where.environment && this.environments.get(where.environment),
        where.category && this.categories.get(where.category),
        this.aliases,
      ]) {
        if (block && block.has(name))
          return { value: /** @type {string} */ (block.get(name)), scope: where }
      }
    }
    if (this.aliases.has(name))
      return { value: /** @type {string} */ (this.aliases.get(name)), scope: undefined }
    if (this.root.has(name))
      return { value: /** @type {string} */ (this.root.get(name)), scope: undefined }
    return undefined
  }

  /**
   * Resolve a token in a scope (undefined = Core, core environment). Tokens that the
   * scope does not redeclare are inherited from the root element, already computed
   * there.
   * @param {string} name
   * @param {Scope} [scope]
   * @param {string[]} [chain]
   * @returns {TokenValue}
   */
  resolve(name, scope, chain = []) {
    if (chain.includes(name))
      throw new Error(`Circular reference: ${[...chain, name].join(" → ")}`)
    const found = this.declaration(name, scope)
    if (!found) {
      const via = chain.length > 0 ? ` (via ${chain.join(" → ")})` : ""
      throw new Error(`Undefined token ${name}${via}`)
    }
    const text = found.value.replace(/var\(\s*(--[\w-]+)\s*\)/g, (_, ref) => {
      return this.resolve(ref, found.scope, [...chain, name]).text
    })
    if (/var\(/.test(text))
      throw new Error(`Unsupported var() fallback in ${name}: ${found.value}`)
    return parseColor(text) ?? { kind: "raw", text }
  }

  /**
   * Resolve a token that must be an opaque colour.
   * @param {string} name
   * @param {Scope} [scope]
   * @returns {ColorValue}
   */
  color(name, scope) {
    const value = this.resolve(name, scope)
    if (value.kind !== "color")
      throw new Error(`${name} is not a colour: ${value.text}`)
    return value
  }
}

/**
 * Read the token stylesheets (tokens.css, categories.css, environments.css) into a
 * TokenSet. Four kinds of rule are understood, and anything else is an error:
 *   `:root`                                        global tokens
 *   `:root, [data-environment], [data-category]`   aliases
 *   `[data-environment="id"]`                      one environment
 *   `[data-category="id"]`, optionally with `:root` for the default category
 * @param {...string} stylesheets
 */
export function readTokens(...stylesheets) {
  /** @type {Map<string, string>} */
  const root = new Map()
  /** @type {Map<string, string>} */
  const aliases = new Map()
  /** @type {Map<string, Map<string, string>>} */
  const environments = new Map()
  /** @type {Map<string, Map<string, string>>} */
  const categories = new Map()

  /**
   * @param {Map<string, string>} target
   * @param {Map<string, string>} declarations
   * @param {string} where
   */
  const assign = (target, declarations, where) => {
    for (const [name, value] of declarations) {
      if (target.has(name)) throw new Error(`${name} is declared twice in ${where}`)
      target.set(name, value)
    }
  }
  /**
   * @param {Map<string, Map<string, string>>} scopes
   * @param {string} id
   */
  const block = (scopes, id) => {
    if (!scopes.has(id)) scopes.set(id, new Map())
    return /** @type {Map<string, string>} */ (scopes.get(id))
  }
  /**
   * @param {string} selector
   * @param {RegExp} pattern
   */
  const idIn = (selector, pattern) => {
    const match = selector.match(pattern)
    return match ? (match[1] ?? match[2] ?? match[3]) : undefined
  }

  for (const css of stylesheets) {
    for (const { selectors, declarations } of parseRules(css)) {
      const envIds = selectors.map((s) => idIn(s, ENVIRONMENT_SELECTOR))
      // A category block may also name :root, which makes it the default category.
      const categorySelectors = selectors.filter((s) => s !== ":root")
      const categoryIds = categorySelectors.map((s) => idIn(s, CATEGORY_SELECTOR))
      if (selectors.length === 1 && selectors[0] === ":root") {
        assign(root, declarations, ":root")
      } else if (
        selectors.length === ALIAS_SELECTORS.length &&
        ALIAS_SELECTORS.every((s) => selectors.includes(s))
      ) {
        assign(aliases, declarations, "the alias block")
      } else if (envIds.every((id) => id !== undefined)) {
        for (const id of /** @type {string[]} */ (envIds))
          assign(block(environments, id), declarations, `[data-environment="${id}"]`)
      } else if (
        categoryIds.length > 0 &&
        categoryIds.every((id) => id !== undefined)
      ) {
        if (categorySelectors.length < selectors.length)
          assign(root, declarations, ":root")
        for (const id of /** @type {string[]} */ (categoryIds))
          assign(block(categories, id), declarations, `[data-category="${id}"]`)
      } else {
        throw new Error(
          `Unexpected selector in a token stylesheet: ${selectors.join(", ")}`,
        )
      }
    }
  }
  return new TokenSet(root, aliases, environments, categories)
}
