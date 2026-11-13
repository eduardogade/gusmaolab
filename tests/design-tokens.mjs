// Static checks of the design-token stylesheets (P03, P09-A01). No build needed.
//
// They keep the token architecture honest: primitives stay primitives, every category
// defines exactly the category contract (colour) and every environment exactly the
// environment contract (typography and texture), nothing is left stale when either
// changes, every var() reference resolves, and the global CSS uses semantic tokens only.
// The locked colour values themselves are checked in tests/categories.mjs.
import { readFile } from "node:fs/promises"
import {
  CATEGORIES,
  CATEGORY_TOKENS,
  ENVIRONMENT_TOKENS,
  ENVIRONMENTS,
  REQUIRED_TOKENS,
} from "../src/design/contract.mjs"
import {
  parseRules,
  readTokens,
  references,
  stripComments,
} from "../src/design/css-tokens.mjs"

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")
// Files that style components and pages (P05, P06). Like global.css, they use semantic
// tokens only.
const componentFiles = [
  "src/styles/folders.css",
  "src/components/folders/FolderStack.astro",
  "src/components/folders/FolderLayer.astro",
  "src/components/folders/FolderTabStrip.astro",
  "src/components/folders/FolderTab.astro",
  "src/components/folders/FolderPreview.astro",
  "src/scripts/folder-previews.ts",
  "src/scripts/folder-rows.ts",
  "src/components/bearnard/BearnardIllustration.astro",
  "src/pages/[design]/bearnard.astro",
  "src/components/scaffold/ScaffoldContent.astro",
  "src/layouts/FolderPage.astro",
  "src/pages/index.astro",
  "src/pages/[design]/folders.astro",
]
const sources = {
  "src/styles/tokens.css": await read("src/styles/tokens.css"),
  "src/styles/categories.css": await read("src/styles/categories.css"),
  "src/styles/environments.css": await read("src/styles/environments.css"),
  "src/styles/global.css": await read("src/styles/global.css"),
  "src/layouts/BaseLayout.astro": await read("src/layouts/BaseLayout.astro"),
  "src/pages/[design]/tokens.astro": await read("src/pages/[design]/tokens.astro"),
}
for (const file of componentFiles) sources[file] = await read(file)
const tokensCss = sources["src/styles/tokens.css"]
const categoriesCss = sources["src/styles/categories.css"]
const environmentsCss = sources["src/styles/environments.css"]
const globalCss = stripComments(sources["src/styles/global.css"])

const failures = []
const check = (ok, message) => ok || failures.push(message)

let tokens
try {
  tokens = readTokens(tokensCss, categoriesCss, environmentsCss)
} catch (error) {
  console.error(`FAIL: ${error.message}`)
  process.exit(1)
}

// 1. Primitives are six-digit hex colours, declared on :root only.
const primitives = [...tokens.root.keys()].filter((name) =>
  name.startsWith("--palette-"),
)
check(primitives.length > 0, "no --palette-* primitives on :root")
for (const name of primitives) {
  check(
    /^#[0-9a-f]{6}$/i.test(tokens.root.get(name)),
    `${name} is not a six-digit hex colour`,
  )
}
for (const [kind, scopes] of [
  ["environment", tokens.environments],
  ["category", tokens.categories],
]) {
  for (const [id, scope] of scopes) {
    for (const name of scope.keys()) {
      check(
        !name.startsWith("--palette-"),
        `${kind} ${id} redefines the primitive ${name}`,
      )
    }
  }
}
for (const name of tokens.aliases.keys()) {
  check(!name.startsWith("--palette-"), `the alias block defines the primitive ${name}`)
}

// 2. Exactly the five categories and the four environments, each defining exactly its
//    contract; :root has the defaults of both (the Core category, the core environment).
const ids = ENVIRONMENTS.map((env) => env.id)
const categoryIds = CATEGORIES.map((category) => category.id)
for (const [kind, file, expected, scopes, contract] of [
  ["environment", "environments.css", ids, tokens.environments, ENVIRONMENT_TOKENS],
  ["category", "categories.css", categoryIds, tokens.categories, CATEGORY_TOKENS],
]) {
  const found = [...scopes.keys()]
  check(
    found.length === expected.length && expected.every((id) => found.includes(id)),
    `${file} defines [${found.join(", ")}], expected [${expected.join(", ")}]`,
  )
  for (const [id, scope] of scopes) {
    const missing = contract.filter((name) => !scope.has(name))
    const extra = [...scope.keys()].filter((name) => !contract.includes(name))
    check(missing.length === 0, `${kind} ${id} omits ${missing.join(", ")}`)
    check(
      extra.length === 0,
      `${kind} ${id} defines tokens outside the contract: ${extra.join(", ")}`,
    )
  }
  const missing = contract.filter((name) => !tokens.root.has(name))
  check(missing.length === 0, `:root lacks ${kind} defaults for ${missing.join(", ")}`)
}
// The default category on :root is Core, the same declarations as its own block.
for (const name of CATEGORY_TOKENS) {
  check(
    tokens.root.get(name) === tokens.categories.get("core")?.get(name),
    `:root's default ${name} is not the Core category's`,
  )
}

// 3. The layers do not overlap: a category sets colour, an environment sets typography
//    and texture, and an alias is neither.
for (const name of CATEGORY_TOKENS) {
  check(
    !ENVIRONMENT_TOKENS.includes(name),
    `${name} is in both the category and the environment contract`,
  )
}
for (const name of tokens.aliases.keys()) {
  check(
    !tokens.root.has(name),
    `${name} is declared both on :root and in the alias block`,
  )
  check(
    !ENVIRONMENT_TOKENS.includes(name) && !CATEGORY_TOKENS.includes(name),
    `${name} is both an alias and a contract token`,
  )
}

// 4. A token declared only on :root is computed once, on the root element. If it depended
//    on something a category or an environment changes, it would be stale on an element
//    that chooses another one: a tab of another category, say.
const scoped = new Set([
  ...CATEGORY_TOKENS,
  ...ENVIRONMENT_TOKENS,
  ...tokens.aliases.keys(),
])
const dependsOnScope = (name, seen = new Set()) => {
  if (seen.has(name)) return false
  seen.add(name)
  const value = tokens.root.get(name)
  if (value === undefined) return false
  return references(value).some((ref) => scoped.has(ref) || dependsOnScope(ref, seen))
}
for (const name of tokens.root.keys()) {
  if (scoped.has(name)) continue
  check(
    !dependsOnScope(name),
    `${name} is declared only on :root but depends on a category or environment token; make it an alias`,
  )
}

// 5. Every token resolves, without cycles or gaps, on the bare root and in every
//    combination of a category and an environment.
const scopes = [undefined]
for (const category of categoryIds) {
  for (const environment of [undefined, ...ids]) scopes.push({ category, environment })
}
for (const scope of scopes) {
  const where = scope
    ? `${scope.category}/${scope.environment ?? "core environment"}`
    : "root"
  for (const name of tokens.names()) {
    try {
      tokens.resolve(name, scope)
    } catch (error) {
      failures.push(`${where}: ${error.message}`)
    }
  }
}

// 6. Every role the P03 brief asks for exists.
for (const [group, names] of Object.entries(REQUIRED_TOKENS)) {
  for (const name of names) check(tokens.has(name), `missing ${name} (${group})`)
}

// 7. Raw colours live in primitives only. Environments have no colour at all, and
//    categories.css is its own primitives on :root plus category tokens that are each
//    exactly one of them: a locked colour is never mixed or adjusted on its way to a role.
const rawColour = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i
check(
  !rawColour.test(stripComments(environmentsCss)),
  "environments.css contains a raw colour",
)
check(
  !/--palette-|--color-/.test(stripComments(environmentsCss)),
  "environments.css sets or uses a colour token",
)
for (const { selectors, declarations } of parseRules(categoriesCss)) {
  const primitivesRule = selectors.length === 1 && selectors[0] === ":root"
  for (const [name, value] of declarations) {
    if (primitivesRule) {
      check(
        name.startsWith("--palette-") && /^#[0-9a-f]{6}$/i.test(value),
        `categories.css :root declares ${name}: ${value}; only hex primitives belong there`,
      )
    } else {
      check(
        /^var\(--palette-[\w-]+\)$/.test(value),
        `categories.css sets ${name} to ${value}; a category token is exactly one primitive`,
      )
    }
  }
}

// 8. The global foundation and the components use semantic tokens only. Components never
//    target an environment or name a category either: those change tokens, not component
//    rules. (Reading the presence of `data-category`, without a value, is allowed: it is
//    how a top-level tab takes its own cardstock.)
check(!/--palette-/.test(globalCss), "global.css references a --palette-* primitive")
check(!rawColour.test(globalCss), "global.css contains a raw colour")
for (const file of componentFiles) {
  const text = stripComments(sources[file])
  check(!/--palette-/.test(text), `${file} references a --palette-* primitive`)
  check(!rawColour.test(text), `${file} contains a raw colour`)
  if (file.endsWith(".css")) {
    check(!/\[data-environment/.test(text), `${file} styles a specific environment`)
    check(
      !/\[data-category\s*[~|^$*]?=/.test(text),
      `${file} styles a specific category`,
    )
  }
}

// 9. Every var() reference in the stylesheets, layout and specimen resolves to a token or
//    to a custom property declared locally (for example the specimen's --chip).
const declaredLocally = new Set(
  Object.values(sources).flatMap((text) =>
    [...text.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]),
  ),
)
for (const [file, text] of Object.entries(sources)) {
  for (const ref of new Set(references(stripComments(text)))) {
    check(
      tokens.has(ref) || declaredLocally.has(ref),
      `${file} references undefined ${ref}`,
    )
  }
}

// 10. BaseLayout imports the stylesheets in cascade order.
const layout = sources["src/layouts/BaseLayout.astro"]
const positions = ["tokens", "environments", "categories", "global"].map((name) =>
  layout.indexOf(`import "../styles/${name}.css"`),
)
check(
  positions.every((p, i) => p >= 0 && (i === 0 || positions[i - 1] < p)),
  "BaseLayout must import tokens.css, environments.css, categories.css and global.css, in that order",
)

// 11. No motion: no transitions, animation or smooth scrolling (P03, P05).
const motion =
  /\b(?:transition|animation)(?:-[\w-]+)?\s*:|scroll-behavior\s*:\s*smooth/i
for (const [file, text] of Object.entries(sources)) {
  check(!motion.test(stripComments(text)), `${file} adds motion`)
}

if (failures.length > 0) {
  for (const message of failures) console.error(`FAIL: ${message}`)
  process.exit(1)
}
console.log(
  `PASS: ${primitives.length} primitives and ${tokens.names().size} tokens; ` +
    `${categoryIds.length} categories each define the ${CATEGORY_TOKENS.length} colour tokens, ` +
    `${ids.length} environments the ${ENVIRONMENT_TOKENS.length} typography and texture tokens`,
)
