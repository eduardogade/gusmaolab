/**
 * The site's scheduling configuration, validated once when the module loads (P21, D-145): an invalid
 * or half-enabled configuration throws, which fails the build. Pages import from here and never
 * read src/data/scheduling.ts directly. Only `siteScheduling` (the public view) goes to a page;
 * the full configuration, with its availability path and attested settings, stays server-side.
 */
import { SCHEDULING_CONFIG } from "../data/scheduling.ts"
import { publicScheduling, validateScheduling } from "./config.ts"
import type { PublicScheduling } from "./config.ts"

export class SchedulingConfigError extends Error {
  readonly issues: readonly string[]
  constructor(issues: readonly string[]) {
    super(`Invalid scheduling configuration:\n- ${issues.join("\n- ")}`)
    this.name = "SchedulingConfigError"
    this.issues = issues
  }
}

const issues = validateScheduling(SCHEDULING_CONFIG)
if (issues.length > 0) throw new SchedulingConfigError(issues)

export const siteScheduling: PublicScheduling = publicScheduling(SCHEDULING_CONFIG)
export * from "./config.ts"
export * from "./time.ts"
