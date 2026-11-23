/**
 * The figure of the Quarto design study (P13, moved in P22, D-157). It is not in `public/`, whose files every build
 * copies, so a release holds no trace of the study: the figure sits in src/design/quarto/assets/ and is served from
 * this route, which has static paths only while development pages are on (src/editorial/demo.ts). The address the
 * article names (/_design/quarto/assets/<name>/<file>.svg) is the one it always had.
 */
import type { APIRoute, GetStaticPaths } from "astro"
import { demosEnabled } from "../../../../../editorial/demo.ts"

const figures = import.meta.glob<string>("/src/design/quarto/assets/*/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
})

export const getStaticPaths = (() =>
  demosEnabled()
    ? Object.entries(figures).map(([path, svg]) => {
        const [name, file] = path.split("/").slice(-2)
        return { params: { design: "_design", name, file: file.replace(/\.svg$/, "") }, props: { svg } }
      })
    : []) satisfies GetStaticPaths

export const GET: APIRoute = ({ props }) =>
  new Response(props.svg as string, { headers: { "Content-Type": "image/svg+xml" } })
