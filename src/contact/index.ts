/**
 * The site's contact channels, validated once when the module loads (P18, D-126): an invalid or
 * unapproved channel throws, which fails the build. Pages import from here and never read
 * src/data/contact.ts directly.
 */
import { CONTACT_CHANNELS } from "../data/contact.ts"
import { validateChannels } from "./channels.ts"
import type { ContactChannel } from "./channels.ts"

export class ContactConfigError extends Error {
  readonly issues: readonly string[]
  constructor(issues: readonly string[]) {
    super(`Invalid contact channels:\n- ${issues.join("\n- ")}`)
    this.name = "ContactConfigError"
    this.issues = issues
  }
}

const issues = validateChannels(CONTACT_CHANNELS)
if (issues.length > 0) throw new ContactConfigError(issues)

export const siteChannels: readonly ContactChannel[] = CONTACT_CHANNELS
export * from "./channels.ts"
