/**
 * The site's navigation, compiled and validated once at build time. Components import
 * from here; they never hardcode labels or URLs. An invalid registry throws, which fails
 * the build.
 */
import { createNavigation } from "./navigation.ts"
import { CONTENT_ROUTES, SECTIONS } from "./registry.ts"

export const siteNavigation = createNavigation(SECTIONS, CONTENT_ROUTES)

export {
  CATEGORY_IDS,
  ENVIRONMENT_IDS,
  MAX_TAB_LEVELS,
  NavigationConfigError,
  OVERVIEW_LABEL,
  ROUTE_PARAMS,
  createNavigation,
  isCanonicalPath,
  normalizePath,
  overviewTabId,
  validateNavigation,
} from "./navigation.ts"
export type { FolderStaticPath, Navigation } from "./navigation.ts"
export type * from "./types.ts"
