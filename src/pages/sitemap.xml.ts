/**
 * The public sitemap (P24, D-163), written by the build as /sitemap.xml. It lists the pages that have
 * something to read: every registered folder whose state is "ready" (P17: derived from the registry, the
 * editorial counts and the records, never typed) and every published or archived entry. An empty or
 * in-preparation folder page stays linked and crawlable, but is not advertised; it enters the sitemap by
 * itself the day its content does. Never a draft, a demonstration (`synthetic: true`), the 404 page or a
 * development page; no `lastmod`, because the site invents no date.
 */
import type { APIRoute } from "astro"
import { pageStaticPaths } from "../editorial/site.ts"
import { sitemapXml } from "../release/metadata.ts"
import { siteCoverage } from "../site/page.ts"

/** Whether an entry is a public article: neither a draft nor a demonstration. */
const isPublicEntry = (data: Record<string, unknown>): boolean => data.status !== "draft" && data.synthetic !== true

export const GET: APIRoute = async ({ site }) => {
  if (site === undefined) throw new Error("sitemap.xml: astro.config.mjs must set `site`")
  const folders = (await siteCoverage()).filter((row) => row.state === "ready").map((row) => row.path)
  const entries = (await Promise.all(([1, 2, 3] as const).map((depth) => pageStaticPaths(depth))))
    .flat()
    .filter(({ props }) => props.entry !== undefined && isPublicEntry(props.entry.data as Record<string, unknown>))
    .map(({ params }) => `/${Object.values(params).filter(Boolean).join("/")}/`)
  return new Response(sitemapXml([...folders, ...entries], site), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  })
}
