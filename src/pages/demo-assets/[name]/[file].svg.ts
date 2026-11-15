/**
 * The figures of the demonstrations (P13-A01, D-105). A demonstration's figures are not in
 * `public/`, whose files every build copies: they sit in src/demos/assets/ and are served from
 * this route, which has static paths only while demonstrations are on (src/editorial/demo.ts).
 * A production build therefore writes no /demo-assets/ at all.
 */
import type { APIRoute, GetStaticPaths } from "astro"
import { demosEnabled } from "../../../editorial/demo.ts"

const figures = import.meta.glob<string>("/src/demos/assets/*/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
})

export const getStaticPaths = (() =>
  demosEnabled()
    ? Object.entries(figures).map(([path, svg]) => {
        const [name, file] = path.split("/").slice(-2)
        return { params: { name, file: file.replace(/\.svg$/, "") }, props: { svg } }
      })
    : []) satisfies GetStaticPaths

export const GET: APIRoute = ({ props }) =>
  new Response(props.svg as string, { headers: { "Content-Type": "image/svg+xml" } })
