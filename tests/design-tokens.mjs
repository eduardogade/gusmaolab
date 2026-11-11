// Static checks of the design-token stylesheets (P03). No build needed.
//
// They keep the token architecture honest: primitives stay primitives, every environment
// defines exactly the environment contract, nothing is left stale when an environment
// changes, every var() reference resolves, and the global CSS uses semantic tokens only.
import { readFile } from "node:fs/promises"
import {
  ENVIRONMENT_TOKENS,
  ENVIRONMENTS,
  REQUIRED_TOKENS,
} from "../src/design/contract.mjs"
import { readTokens, references, stripComments } from "../src/design/css-tokens.mjs"

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")
// Files that style components and pages (P05, P06). Like global.css, they use semantic
// tokens only.
const componentFiles = [
  "src/styles/folders.css",
  "src/components/folders/FolderStack.astro",
  "src/components/folders/FolderLayer.astro",
  "src/components/folders/FolderTabStrip.astro",
  "src/components/folders/FolderTab.astro",
  "src/components/scaffold/ScaffoldContent.astro",
  "src/layouts/FolderPage.astro",
  "src/pages/index.astro",
  "src/pages/[design]/folders.astro",
]
const sources = {
  "src/styles/tokens.css": await read("src/styles/tokens.css"),
  "src/styles/environments.css": await read("src/styles/environments.css"),
  "src/styles/global.css": await read("src/styles/global.css"),
  "src/layouts/BaseLayout.astro": await read("src/layouts/BaseLayout.astro"),
  "src/pages/[design]/tokens.astro": await read("src/pages/[design]/tokens.astro"),
}
for (const file of componentFiles) sources[file] = await read(file)
const tokensCss = sources["src/styles/tokens.css"]
const environmentsCss = sources["src/styles/environments.css"]
const globalCss = stripComments(sources["src/styles/global.css"])

const failures = []
const check = (ok, message) => ok || failures.push(message)

let tokens
try {
  tokens = readTokens(tokensCss, environmentsCss)
} catch (error) {
  console.error(`FAIL: ${error.message}`)
  process.exit(1)
}

// 1. Primitives are six-digit hex colours, declared on :root only.
const primitives = [...tokens.root.keys()].filter((name) =>
  name.startsWith("--palette-"),
)
check(primitives.length > 0, "no --palette-* primitives in tokens.css")
for (const name of primitives) {
  check(
    /^#[0-9a-f]{6}$/i.test(tokens.root.get(name)),
    `${name} is not a six-digit hex colour`,
  )
}
for (const [id, scope] of tokens.environments) {
  for (const name of scope.keys()) {
    check(
      !name.startsWith("--palette-"),
      `environment ${id} redefines the primitive ${name}`,
    )
  }
}
for (const name of tokens.aliases.keys()) {
  check(!name.startsWith("--palette-"), `the alias block defines the primitive ${name}`)
}

// 2. Exactly the four environments, each defining exactly the contract.
const ids = ENVIRONMENTS.map((env) => env.id)
const found = [...tokens.environments.keys()]
check(
  found.length === ids.length && ids.every((id) => found.includes(id)),
  `environments.css defines [${found.join(", ")}], expected [${ids.join(", ")}]`,
)
for (const [id, scope] of tokens.environments) {
  const missing = ENVIRONMENT_TOKENS.filter((name) => !scope.has(name))
  const extra = [...scope.keys()].filter((name) => !ENVIRONMENT_TOKENS.includes(name))
  check(missing.length === 0, `environment ${id} omits ${missing.join(", ")}`)
  check(
    extra.length === 0,
    `environment ${id} defines tokens outside the contract: ${extra.join(", ")}`,
  )
}
const coreMissing = ENVIRONMENT_TOKENS.filter((name) => !tokens.root.has(name))
check(
  coreMissing.length === 0,
  `:root lacks core defaults for ${coreMissing.join(", ")}`,
)

// 3. The three layers do not overlap.
for (const name of tokens.aliases.keys()) {
  check(
    !tokens.root.has(name),
    `${name} is declared both on :root and in the alias block`,
  )
  check(
    !ENVIRONMENT_TOKENS.includes(name),
    `${name} is both an alias and a contract token`,
  )
}

// 4. A token declared only on :root is computed once, on the root element. If it depended
//    on something an environment changes, it would be stale inside that environment.
const environmentDependent = new Set([...ENVIRONMENT_TOKENS, ...tokens.aliases.keys()])
const dependsOnEnvironment = (name, seen = new Set()) => {
  if (seen.has(name)) return false
  seen.add(name)
  const value = tokens.root.get(name)
  if (value === undefined) return false
  return references(value).some(
    (ref) => environmentDependent.has(ref) || dependsOnEnvironment(ref, seen),
  )
}
for (const name of tokens.root.keys()) {
  if (environmentDependent.has(name)) continue
  check(
    !dependsOnEnvironment(name),
    `${name} is declared only on :root but depends on an environment token; make it an alias`,
  )
}

// 5. Every token resolves, without cycles or gaps, in the core and every environment.
for (const env of [undefined, ...ids]) {
  for (const name of tokens.names()) {
    try {
      tokens.resolve(name, env)
    } catch (error) {
      failures.push(`${env ?? "core"}: ${error.message}`)
    }
  }
}

// 6. Every role the P03 brief asks for exists.
for (const [group, names] of Object.entries(REQUIRED_TOKENS)) {
  for (const name of names) check(tokens.has(name), `missing ${name} (${group})`)
}

// 7. Environments reassign primitives; they never introduce raw colours.
const rawColour = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i
check(
  !rawColour.test(stripComments(environmentsCss)),
  "environments.css contains a raw colour",
)

// 8. The global foundation and the components use semantic tokens only. Components never
//    target an environment either: environments change tokens, not component rules.
check(!/--palette-/.test(globalCss), "global.css references a --palette-* primitive")
check(!rawColour.test(globalCss), "global.css contains a raw colour")
for (const file of componentFiles) {
  const text = stripComments(sources[file])
  check(!/--palette-/.test(text), `${file} references a --palette-* primitive`)
  check(!rawColour.test(text), `${file} contains a raw colour`)
  if (file.endsWith(".css")) {
    check(!/\[data-environment/.test(text), `${file} styles a specific environment`)
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
const positions = ["tokens", "environments", "global"].map((name) =>
  layout.indexOf(`import "../styles/${name}.css"`),
)
check(
  positions.every((p) => p >= 0) &&
    positions[0] < positions[1] &&
    positions[1] < positions[2],
  "BaseLayout must import tokens.css, environments.css and global.css, in that order",
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
    `${ids.length} environments each define all ${ENVIRONMENT_TOKENS.length} contract tokens`,
)
