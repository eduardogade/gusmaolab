/**
 * The public contact channels (P18, D-126): the only list of ways to reach the owner that the site
 * shows. It is empty, because the owner has approved no public channel yet; the Contact page says
 * so and invents nothing.
 *
 * To publish a channel, the owner adds an entry here and nothing else:
 *
 *   {
 *     id: "email-general",
 *     kind: "email",                         // "email" or "profile"
 *     label: "Email",
 *     destination: "name@your-domain.org",   // an address, or an https URL for a profile
 *     description: "General questions, and anything that does not fit elsewhere.",
 *     use: "general",                        // general | collaboration | professional | technical
 *     approvedOn: "YYYY-MM-DD",              // the day the owner approved making it public
 *   }
 *
 * Rules (src/contact/channels.ts checks them, and a build fails on a violation):
 * - Only an address or profile the owner intends to be public. Never copy one from the CV, a
 *   record, a commit or another file: being in the repository is not approval, and the CV's
 *   contact details and references are private.
 * - A profile URL already held by a Person record (src/data/records/people.ts) belongs in that
 *   record, not here, so a fact has one home.
 * - No form, no third-party form service and no address obfuscation: an email channel is a
 *   readable address and a `mailto:` link.
 */
import type { ContactChannel } from "../contact/channels.ts"

export const CONTACT_CHANNELS: readonly ContactChannel[] = []
