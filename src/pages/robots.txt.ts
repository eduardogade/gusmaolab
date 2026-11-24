/**
 * robots.txt (P24, D-163), written by the build as /robots.txt: every crawler may read what is published,
 * and the sitemap is named from Astro's `site`. It hides nothing, because the build holds nothing private.
 */
import type { APIRoute } from "astro"
import { robotsTxt } from "../release/metadata.ts"

export const GET: APIRoute = ({ site }) => {
  if (site === undefined) throw new Error("robots.txt: astro.config.mjs must set `site`")
  return new Response(robotsTxt(site), { headers: { "Content-Type": "text/plain; charset=utf-8" } })
}
