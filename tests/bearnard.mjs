// Bearnard illustration checks (P09): BEAR-001 to BEAR-008. They read the registry
// (src/illustrations/bearnard.ts), the provenance (assets/bearnard/derivatives.json), the
// inventory and checksums (assets/bearnard/), the committed derivatives (public/) and the
// build (dist/). Run `npm run build` first, or `npm run verify`.
//
// The masters in brand/bearnard/ are gitignored, so a clean checkout has none: BEAR-004
// then reports SKIPPED, never PASS, and every other check still runs.
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { readFile, readdir } from "node:fs/promises"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import {
  ILLUSTRATIONS,
  ILLUSTRATION_ROLES,
  illustrationById,
  illustrationFor,
} from "../src/illustrations/bearnard.ts"

const repo = fileURLToPath(new URL("../", import.meta.url))
const read = (path) => readFile(join(repo, path))
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")
const json = (value) => JSON.stringify(value)

const manifest = JSON.parse(await read("assets/bearnard/derivatives.json"))
// The scientific articles' figures (P13), as public addresses.
const figures = new Set(
  Object.values(JSON.parse(await read("src/science/manifest.json")).documents).flatMap(
    (d) =>
      d.output.assets.map((n) => `/${d.output.assetDir.replace(/^public\//, "")}/${n}`),
  ),
)
const inventory = new Map(
  (await read("assets/bearnard/inventory.csv"))
    .toString()
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(","))
    .map(([path, , , , hash, category, status]) => [path, { hash, category, status }]),
)
const sums = new Map(
  (await read("assets/bearnard/SHA256SUMS"))
    .toString()
    .trim()
    .split("\n")
    .map((line) => line.split(/\s+/))
    .map(([hash, path]) => [path.replace(/^\*/, ""), hash]),
)

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((e) =>
      e.isDirectory() ? listFiles(join(dir, e.name)) : [join(dir, e.name)],
    ),
  )
  return nested.flat()
}
const dist = join(repo, "dist")
if (!existsSync(join(dist, "index.html"))) {
  console.error("FAIL: dist/ not found. Run `npm run build` first.")
  process.exit(1)
}
const distFiles = (await listFiles(dist)).map((f) => relative(dist, f))

/** A WebP file's pixel size, from its header (VP8X, VP8 or VP8L). */
function webpSize(bytes) {
  if (
    bytes.toString("latin1", 0, 4) !== "RIFF" ||
    bytes.toString("latin1", 8, 12) !== "WEBP"
  )
    return null
  const chunk = bytes.toString("latin1", 12, 16)
  if (chunk === "VP8X") {
    return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) }
  }
  if (chunk === "VP8 ") {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    }
  }
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21)
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) }
  }
  return null
}

const results = []
async function test(id, title, body) {
  const failures = []
  let skipped = null
  try {
    await body(
      (ok, message) => ok || failures.push(message),
      (reason) => (skipped = reason),
    )
  } catch (error) {
    failures.push(error.message)
  }
  results.push({ id, title, failures, skipped })
}

// --- Tests --------------------------------------------------------------------------------

await test("BEAR-001", "Registry entries have unique, stable identities", (check) => {
  const ids = ILLUSTRATIONS.map((i) => i.id)
  check(new Set(ids).size === ids.length, `duplicate IDs: ${json(ids)}`)
  for (const id of ids)
    check(/^bearnard-[a-z0-9.-]+$/.test(id), `${id} is not a stable kebab-case ID`)
  const recorded = manifest.derivatives.map((d) => d.id)
  check(
    json([...ids].sort()) === json([...recorded].sort()),
    `registry ${json(ids)} vs provenance ${json(recorded)}`,
  )
})

await test(
  "BEAR-002",
  "Registered derivative files exist and match their provenance",
  async (check) => {
    for (const illustration of ILLUSTRATIONS) {
      const record = manifest.derivatives.find((d) => d.id === illustration.id)
      for (const file of illustration.files) {
        const output = record?.outputs.find((o) => o.url === file.src)
        check(output !== undefined, `${file.src} has no provenance record`)
        const source = join(repo, "public", file.src)
        const built = join(dist, file.src)
        check(existsSync(source), `${file.src} is missing from public/`)
        check(existsSync(built), `${file.src} is missing from dist/`)
        if (!existsSync(source) || !output) continue
        const bytes = await readFile(source)
        check(
          sha256(bytes) === output.sha256,
          `${file.src} differs from its recorded checksum`,
        )
        const size = webpSize(bytes)
        check(
          size?.width === file.width && size?.height === file.height,
          `${file.src} is ${json(size)}, registered as ${file.width}×${file.height}`,
        )
        if (existsSync(built))
          check(
            sha256(await readFile(built)) === output.sha256,
            `dist/ copy of ${file.src} differs`,
          )
      }
    }
  },
)

await test(
  "BEAR-003",
  "Every illustration's metadata is valid and traceable",
  (check) => {
    for (const illustration of ILLUSTRATIONS) {
      const where = illustration.id
      check(
        illustration.alt.trim().length >= 20 && !/\.(png|webp)/.test(illustration.alt),
        `${where}: weak alt text`,
      )
      check(
        illustration.roles.every((r) => ILLUSTRATION_ROLES.includes(r)) &&
          new Set(illustration.roles).size === illustration.roles.length,
        `${where}: unknown or repeated roles ${json(illustration.roles)}`,
      )
      const listed = inventory.get(illustration.master)
      check(
        listed !== undefined &&
          listed.category === illustration.category &&
          ["canonical-master", "approved-derived"].includes(listed.category),
        `${where}: ${illustration.master} is not an approved master in the inventory (${json(listed)})`,
      )
      const record = manifest.derivatives.find((d) => d.id === illustration.id)
      check(
        record?.source.path === illustration.master &&
          record?.source.sha256 === listed?.hash &&
          listed?.hash === sums.get(illustration.master),
        `${where}: provenance does not match the inventory and checksums`,
      )
      const widths = illustration.files.map((f) => f.width)
      check(
        json(widths) === json([...widths].sort((a, b) => a - b)),
        `${where}: files are not narrowest first`,
      )
      const ratios = illustration.files.map((f) => f.height / f.width)
      check(
        ratios.every((r) => Math.abs(r - ratios.at(-1)) < 0.01),
        `${where}: files differ in aspect ratio`,
      )
      if (record) {
        const master = record.source.height / record.source.width
        check(
          Math.abs(ratios.at(-1) - master) < 0.01,
          `${where}: cropped or stretched from its master`,
        )
      }
    }
  },
)

await test("BEAR-004", "The masters are unchanged", async (check, skip) => {
  const masters = [...new Set(ILLUSTRATIONS.map((i) => i.master))]
  if (!masters.every((m) => existsSync(join(repo, m)))) {
    skip("the masters are not in this checkout (brand/bearnard/ is gitignored)")
    return
  }
  for (const master of masters) {
    check(sha256(await read(master)) === sums.get(master), `${master} has changed`)
  }
})

await test(
  "BEAR-005",
  "Roles without an approved illustration fail gracefully",
  async (check) => {
    for (const role of ILLUSTRATION_ROLES) {
      const found = illustrationFor(role)
      check(
        found === undefined || found.roles.includes(role),
        `illustrationFor("${role}") is wrong`,
      )
    }
    check(
      illustrationById("bearnard-not-a-real-id") === undefined,
      "an unknown ID resolves",
    )
    // On the study, each unassigned role shows its fallback and no image.
    const study = (await readFile(join(dist, "_design/bearnard/index.html"))).toString()
    for (const role of ILLUSTRATION_ROLES.filter(
      (r) => illustrationFor(r) === undefined,
    )) {
      const item = study.match(
        new RegExp(`<li data-role="${role}"[^>]*>([\\s\\S]*?)</li>`),
      )
      check(
        item && /no approved illustration yet/.test(item[1]) && !/<img/.test(item[1]),
        `${role} does not fall back`,
      )
    }
  },
)

await test("BEAR-006", "The build holds no master and no oversized image", (check) => {
  for (const file of distFiles) {
    check(
      !/\.(png|jpe?g|tiff?|psd)$/i.test(file),
      `dist/${file} is not a web derivative`,
    )
    check(!/bearnard_v\d/.test(file), `dist/${file} is named like a master`)
  }
  const images = distFiles.filter((f) => f.startsWith("illustrations/"))
  check(
    images.length === ILLUSTRATIONS.flatMap((i) => i.files).length,
    `dist/ has ${images.length} illustrations`,
  )
})

await test("BEAR-007", "Nothing in the build reads the masters", async (check) => {
  const sources = (await listFiles(join(repo, "src"))).map((f) => relative(repo, f))
  for (const file of [...sources, "astro.config.mjs"]) {
    const text = (await read(file)).toString()
    // The registry names its masters as data; nothing may import or read from brand/.
    check(
      !/(import|from|readFile|fetch)\s*\(?\s*["'`][^"'`]*brand\//.test(text),
      `${file} reads from brand/`,
    )
  }
})

await test(
  "BEAR-008",
  "Asset references are site-relative, never local paths",
  async (check) => {
    for (const file of distFiles.filter(
      (f) => f.endsWith(".html") || f.endsWith(".css"),
    )) {
      const text = (await readFile(join(dist, file))).toString()
      check(
        !/\/Users\/|file:\/\/|[A-Z]:\\\\|brand\/bearnard/.test(text),
        `dist/${file} contains a local path`,
      )
      for (const [, src] of text.matchAll(/<img[^>]+src="([^"]+)"/g)) {
        // Bearnard's derivatives, or a scientific article's own figure (P13): a file the
        // science manifest names, which is no illustration of Bearnard.
        check(
          src.startsWith("/illustrations/") || figures.has(src),
          `dist/${file}: image ${src}`,
        )
      }
      for (const [, set] of text.matchAll(/srcset="([^"]+)"/g)) {
        check(
          set.split(",").every((part) => part.trim().startsWith("/illustrations/")),
          `dist/${file}: srcset ${set}`,
        )
      }
    }
  },
)

// --- Report -------------------------------------------------------------------------------

let failed = 0
for (const { id, title, failures, skipped } of results) {
  if (skipped) console.log(`SKIPPED ${id} ${title}: ${skipped}`)
  else if (failures.length === 0) console.log(`PASS ${id} ${title}`)
  else {
    failed++
    console.error(`FAIL ${id} ${title}`)
    for (const message of failures.slice(0, 12)) console.error(`  - ${message}`)
  }
}
if (failed > 0) process.exit(1)
const passed = results.filter((r) => !r.skipped).length
console.log(
  `PASS: ${passed} Bearnard checks${passed < results.length ? `, ${results.length - passed} skipped` : ""}; ${ILLUSTRATIONS.length} illustration(s)`,
)
