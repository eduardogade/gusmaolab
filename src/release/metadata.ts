/**
 * Release metadata (P24, D-163): the canonical address of a page, whether a page is indexable, the
 * sitemap and robots.txt. Pure and Node-runnable (erasable TypeScript, D-040), so the release checks
 * (scripts/release-check.mjs, src/pages/sitemap.xml.ts, src/pages/robots.txt.ts) and the tests use the same rules as the pages.
 *
 * - The canonical origin is Astro's `site` (astro.config.mjs), never typed twice.
 * - Only a release build (Astro's "production" mode) states canonical addresses: a development or
 *   demonstration build holds specimens and synthetic articles, which must never claim one.
 * - The 404 page and every development page (`/_design/`) have no canonical address and are not indexed.
 * - A folder path always ends with a slash, the form the build writes (`/about/` is `about/index.html`).
 */

/** The site's name, as Open Graph says it. */
export const SITE_NAME = "GusmaoLab"

/** Paths that are never a public, indexable page. */
const NOT_INDEXABLE = [/^\/404(?:\.html|\/)?$/, /^\/_design(?:\/|$)/]

/** The path in the one form the site uses: a leading slash, a trailing slash, no `index.html`. */
export function normalizePagePath(pathname: string): string {
  let path = pathname.replace(/index\.html$/, "")
  if (!path.startsWith("/")) path = `/${path}`
  if (!path.endsWith("/") && !/\.[a-z0-9]+$/i.test(path)) path = `${path}/`
  return path
}

/** Whether a path may be indexed: not the 404 page and not a development page. */
export const isIndexablePath = (pathname: string): boolean =>
  !NOT_INDEXABLE.some((pattern) => pattern.test(pathname))

/**
 * The canonical URL of a page, or undefined where the page must not state one: outside a release
 * build, on the 404 page and on development pages. The origin must be https.
 */
export function canonicalUrl(pathname: string, site: URL | string | undefined, release: boolean): string | undefined {
  if (!release || site === undefined || !isIndexablePath(pathname)) return undefined
  const origin = new URL(site)
  if (origin.protocol !== "https:") throw new Error(`canonicalUrl: the site origin must be https, not ${origin.protocol}`)
  return new URL(normalizePagePath(pathname), origin).href
}

const escapeXml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")

/**
 * A sitemap of absolute URLs, sorted and without duplicates. No `lastmod`: the site invents no date,
 * and a folder page has none of its own.
 */
export function sitemapXml(paths: readonly string[], site: URL | string): string {
  const urls = [...new Set(paths.filter(isIndexablePath).map((path) => new URL(normalizePagePath(path), site).href))].sort()
  const body = urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

/**
 * robots.txt: every crawler may read everything that is published, and the sitemap is named. It is
 * not access control: nothing private is in the build, so there is nothing for it to hide (D-163).
 */
export const robotsTxt = (site: URL | string): string =>
  `User-agent: *\nAllow: /\n\nSitemap: ${new URL("/sitemap.xml", site).href}\n`
