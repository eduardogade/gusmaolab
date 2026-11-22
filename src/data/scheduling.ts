/**
 * The scheduling configuration (P21, D-145): the only place the site learns whether, and through
 * which booking link, a visitor may request a meeting. It starts switched off, because the owner has
 * not yet created a scheduling account, chosen a real event type or supplied availability. The
 * Schedule page says so honestly and shows no times and no form.
 *
 * To turn scheduling on, once all of that exists, the owner (or an agent working with the owner)
 * edits this file and nothing else:
 *
 *   export const SCHEDULING_CONFIG: SchedulingConfig = {
 *     provider: "calcom",
 *     enabled: true,
 *     bookingUrl: "https://cal.com/<username>/<event>",   // the real public booking link
 *     ownerTimeZone: "America/Recife",
 *     availabilitySourcePath: "env:GUSMAOLAB_AVAILABILITY_FILE", // optional, later (see below)
 *     providerSettings: {
 *       requiresConfirmation: true,            // Cal.com event type > Privacy & security > Requires confirmation: Always
 *       requiresBookerEmailVerification: true, // the booker verifies their address
 *       pendingRequestsHoldSlots: true,        // "Unconfirmed bookings still block calendar slots"
 *     },
 *     approvedOn: "YYYY-MM-DD",                // the day the owner approved publishing the link
 *   }
 *
 * Rules (src/scheduling/config.ts checks them, and a build fails on a violation):
 * - Only a real Cal.com booking link. Never a placeholder, and no query string: nothing personal
 *   travels in a URL.
 * - `providerSettings` is the owner's attestation that the account is set that way, not a test
 *   result. Enabling without all three true is refused: a request must stay pending until the
 *   owner accepts it.
 * - No secret belongs here, and none is needed: the booking calendar is an embed of the public
 *   link. Never put an API key, token or cookie in this file or in any PUBLIC_ variable.
 * - `availabilitySourcePath` is where the owner's future availability file will be, as
 *   `repo:<relative path>` or `env:<NAME>` (a variable holding a local path). It is never sent to
 *   the browser, and the file is never copied under public/. Leave it out until the file exists.
 */
import type { SchedulingConfig } from "../scheduling/config.ts"

export const SCHEDULING_CONFIG: SchedulingConfig = {
  provider: "calcom",
  enabled: false,
  ownerTimeZone: "America/Recife",
}
