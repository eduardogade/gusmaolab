/**
 * The files of the development downloads specimen (P18, D-127). They are not in `public/`, whose files
 * every build copies: they sit in src/demos/downloads/ and are served from this route, which has
 * static paths only while demonstrations are on (src/editorial/demo.ts). A release build therefore
 * writes no /demo-downloads/ at all, and scripts/demo-check.mjs searches for it.
 */
import type { APIRoute, GetStaticPaths } from "astro"
import { demosEnabled } from "../../editorial/demo.ts"
import { FILE_TYPES, extensionOf } from "../../downloads/registry.ts"

const files = import.meta.glob<string>("/src/demos/downloads/*", {
  query: "?raw",
  import: "default",
  eager: true,
})

export const getStaticPaths = (() =>
  demosEnabled()
    ? Object.entries(files).map(([path, body]) => ({
        params: { file: path.split("/").at(-1) as string },
        props: { body },
      }))
    : []) satisfies GetStaticPaths

export const GET: APIRoute = ({ props, params }) =>
  new Response(props.body as string, {
    headers: {
      "Content-Type": `${FILE_TYPES[extensionOf(params.file ?? "")]?.mediaType ?? "application/octet-stream"}; charset=utf-8`,
    },
  })
