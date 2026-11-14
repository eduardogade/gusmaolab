// Regenerates tests/fixtures/science/generated/ from source/ with the real tool, in a throwaway
// root (the repository's own science/ and src/ are never touched).
import { cp, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { buildDocument } from "../../../scripts/science.mjs"

const here = fileURLToPath(new URL(".", import.meta.url))
const repo = fileURLToPath(new URL("../../../", import.meta.url))

/** Builds the fixture documents into a fresh root and returns it. */
export async function generateFixture() {
  const root = await mkdtemp(join(tmpdir(), "gusmaolab-science-"))
  await cp(join(repo, "science/_quarto.yml"), join(root, "science/_quarto.yml"))
  await cp(join(here, "source"), join(root, "science"), { recursive: true })
  await buildDocument(root, "greenhouse/fixture-quarto", { execute: true })
  await buildDocument(root, "trail/fixture-draft-lesson", { execute: false })
  return root
}

/** The generated files, as a list of paths relative to the root. */
export const GENERATED = [
  "science/_freeze",
  "src/science",
  "src/content",
  "public/assets",
]

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = await generateFixture()
  await rm(join(here, "generated"), { recursive: true, force: true })
  for (const path of GENERATED)
    await cp(join(root, path), join(here, "generated", path), { recursive: true })
  await cp(join(root, "science"), join(here, "generated/science"), {
    recursive: true,
    filter: (s) => !/_build|\.quarto/.test(s),
  })
  await rm(root, { recursive: true, force: true })
  console.log("regenerated tests/fixtures/science/generated/")
}
