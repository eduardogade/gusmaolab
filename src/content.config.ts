/**
 * The editorial collections (P10, D-078): one Markdown file per entry, in its own
 * directory below src/content/, validated by the schemas in src/editorial/schema.ts.
 *
 * The entry ID is the file's path below its directory, without the extension. It is
 * internal: the public URL comes from the explicit `slug` in the metadata, never from the
 * file name or the title (the default loader would take `slug` as the ID, which would mix
 * the two). Files whose names start with "_" are ignored, so notes can sit beside entries.
 *
 * The collections are listed one by one, not generated, so that Astro can type each one.
 * Adding a ninth collection means adding it to src/editorial/collections.ts, to
 * schema.ts, and here.
 */
import { readFile } from "node:fs/promises"
import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { collectionById } from "./editorial/collections.ts"
import type { CollectionId } from "./editorial/collections.ts"
import { rawDateIssues } from "./editorial/raw-dates.ts"
import { schemaFor } from "./editorial/schema.ts"

/**
 * The glob loader, with one guard added: the raw text of each entry's date fields is
 * checked before the YAML parser can silently correct an impossible date
 * (src/editorial/raw-dates.ts). Everything else is the loader as Astro ships it.
 */
const entries = (base: string) => {
  const loader = glob({
    pattern: "**/[^_]*.md",
    base,
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  })
  return {
    ...loader,
    load: (context: Parameters<typeof loader.load>[0]) =>
      loader.load({
        ...context,
        parseData: async (props) => {
          const issues = rawDateIssues(await readFile(props.filePath ?? "", "utf8"))
          if (issues.length > 0)
            throw new Error(`${props.filePath}: ${issues.join("; ")}`)
          return context.parseData(props)
        },
      }),
  }
}

const collection = (id: CollectionId) =>
  defineCollection({
    loader: entries(`./src/content/${collectionById(id).directory}`),
    schema: schemaFor(id),
  })

/**
 * The demonstrations (P13-A01, D-105): synthetic Greenhouse articles in src/demos/greenhouse/,
 * validated by the Greenhouse schema plus the required `synthetic: true`. They are loaded like
 * any collection but only routed when src/editorial/demo.ts says so; src/content/ never holds one.
 */
const demonstrations = defineCollection({
  loader: entries("./src/demos/greenhouse"),
  schema: schemaFor("greenhouse", { synthetic: true }),
})

export const collections = {
  blog: collection("blog"),
  trail: collection("trail"),
  greenhouse: collection("greenhouse"),
  berries: collection("berries"),
  timberLogs: collection("timberLogs"),
  monthsOriginal: collection("monthsOriginal"),
  kosmos: collection("kosmos"),
  bookClub: collection("bookClub"),
  greenhouseDemos: demonstrations,
}
