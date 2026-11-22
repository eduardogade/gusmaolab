/**
 * The scheduling configuration (P21, D-145 to D-147): the model and the rules, and nothing about
 * the owner's real availability. The values are the owner's, in src/data/scheduling.ts, and that
 * file starts with scheduling switched off: a booking link is published only when the owner has
 * created a real provider account, and nothing in this repository counts as that.
 *
 * What this module decides, and what it does not:
 *   - It decides whether the Schedule page may show a booking interface, from a configuration
 *     that must name a real Cal.com booking link and attest that the provider is set to require
 *     the owner's confirmation and the booker's email verification. The attestation is the
 *     owner's word, recorded with a date; it is never evidence that the provider works (that is
 *     an operational test, `development/scheduling-guide.md`).
 *   - It does not hold availability, bookings, requests or visitor data. The provider is the only
 *     authority on which times can be booked; a booking request is not a confirmed meeting.
 *   - It never carries a secret. There is no API key here, and the public view (below) leaves out
 *     the availability-source path and every provider setting.
 *
 * Pure and Node-runnable (erasable TypeScript, D-040): no Astro, no DOM, no file access.
 */
import { isValidTimeZone } from "./time.ts"
import { validateSourceReference } from "./availability.ts"

export const SCHEDULING_PROVIDERS = ["calcom"] as const
export type SchedulingProvider = (typeof SCHEDULING_PROVIDERS)[number]

/** The reference timezone of the owner's calendar when the configuration does not say otherwise. */
export const DEFAULT_OWNER_TIME_ZONE = "America/Recife"

/**
 * The hosts a booking link may be on, and the one origin the embed script and frame come from.
 * Narrow on purpose: a self-hosted instance or another domain needs a recorded decision, not an
 * edit to the data file.
 */
export const BOOKING_HOSTS = ["cal.com", "app.cal.com"] as const
export const EMBED_ORIGIN = "https://app.cal.com"
export const EMBED_SCRIPT = `${EMBED_ORIGIN}/embed/embed.js`
/** The provider's monthly calendar layout (`config.layout`), the page's primary layout. */
export const EMBED_LAYOUT = "month_view"

/** The settings the owner attests the provider event type has. All three must be true to enable. */
export interface ProviderSettings {
  /** "Requires confirmation: always": a request is pending until the owner accepts or rejects it. */
  readonly requiresConfirmation: boolean
  /** "Requires booker email verification": the booker proves control of the address. */
  readonly requiresBookerEmailVerification: boolean
  /** "Unconfirmed bookings still block calendar slots": a pending request holds its time. */
  readonly pendingRequestsHoldSlots: boolean
}

export interface SchedulingConfig {
  readonly provider: SchedulingProvider
  /** Master switch. False keeps the page in preparation whatever else is set. */
  readonly enabled: boolean
  /** The public booking link, `https://cal.com/<user>/<event>`. No query, no fragment. */
  readonly bookingUrl?: string
  /** IANA zone of the owner's calendar. */
  readonly ownerTimeZone: string
  /** Where the owner's availability file will be (`repo:<relative path>` or `env:<NAME>`); never public. */
  readonly availabilitySourcePath?: string
  /** What the owner attests the provider event type is set to. Required to enable. */
  readonly providerSettings?: ProviderSettings
  /** The day the owner approved publishing the booking link, `YYYY-MM-DD`. Required to enable. */
  readonly approvedOn?: string
}

export interface ConfigOptions {
  /** Test fixtures only: accept `example` booking hosts and users. */
  readonly allowExample?: boolean
}

const DAY = /^\d{4}-\d{2}-\d{2}$/
const SEGMENT = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/

export interface ParsedBookingUrl {
  readonly url: string
  /** What `Cal("inline", { calLink })` takes: `user/event`. */
  readonly calLink: string
}

/** A booking link's parts, or the reasons it is not one. */
export function parseBookingUrl(
  value: string,
): { ok: true; value: ParsedBookingUrl } | { ok: false; reasons: string[] } {
  const reasons: string[] = []
  let url: URL | undefined
  try {
    url = new URL(value)
  } catch {
    return { ok: false, reasons: [`"${value}" is not a URL`] }
  }
  if (url.protocol !== "https:") reasons.push(`a booking link must be https, not ${url.protocol}`)
  if (url.username !== "" || url.password !== "") reasons.push("a booking link must not carry credentials")
  if (url.port !== "") reasons.push("a booking link must not name a port")
  if (!(BOOKING_HOSTS as readonly string[]).includes(url.hostname))
    reasons.push(`the host "${url.hostname}" is not one of ${BOOKING_HOSTS.join(", ")}`)
  if (url.search !== "" || url.hash !== "")
    reasons.push("a booking link must have no query or fragment (nothing personal travels in a URL)")
  const segments = url.pathname.split("/").filter((s) => s !== "")
  if (segments.length < 1 || segments.length > 2 || !segments.every((s) => SEGMENT.test(s)))
    reasons.push("the path must be /<user> or /<user>/<event>, with plain names")
  if (reasons.length > 0) return { ok: false, reasons }
  const clean = `${url.origin}/${segments.join("/")}`
  return { ok: true, value: { url: clean, calLink: segments.join("/") } }
}

/** Every problem with a configuration, as sentences a maintainer can act on. Empty means valid. */
export function validateScheduling(config: SchedulingConfig, options: ConfigOptions = {}): string[] {
  const issues: string[] = []
  if (!(SCHEDULING_PROVIDERS as readonly string[]).includes(config.provider))
    issues.push(`unknown provider "${config.provider}" (supported: ${SCHEDULING_PROVIDERS.join(", ")})`)
  if (!isValidTimeZone(config.ownerTimeZone))
    issues.push(`ownerTimeZone "${config.ownerTimeZone}" is not an IANA time zone`)

  if (config.bookingUrl !== undefined) {
    const parsed = parseBookingUrl(config.bookingUrl)
    if (!parsed.ok) for (const reason of parsed.reasons) issues.push(`bookingUrl: ${reason}`)
    else if (!options.allowExample && /^(example|your-?user|username|test|demo)(\/|$)/i.test(parsed.value.calLink))
      issues.push("bookingUrl: the user is a placeholder, so it is not a real booking link")
  }
  if (config.availabilitySourcePath !== undefined)
    for (const reason of validateSourceReference(config.availabilitySourcePath))
      issues.push(`availabilitySourcePath: ${reason}`)
  if (config.approvedOn !== undefined && (!DAY.test(config.approvedOn) || Number.isNaN(Date.parse(config.approvedOn))))
    issues.push("approvedOn is not a valid date (YYYY-MM-DD)")

  if (config.enabled) {
    if (config.bookingUrl === undefined) issues.push("scheduling is enabled but there is no bookingUrl")
    if (config.approvedOn === undefined)
      issues.push("scheduling is enabled but the owner has not approved it (approvedOn, YYYY-MM-DD)")
    const s = config.providerSettings
    if (s === undefined) issues.push("scheduling is enabled but providerSettings is missing")
    else {
      if (!s.requiresConfirmation) issues.push("enabling needs the owner's confirmation to be required (requiresConfirmation)")
      if (!s.requiresBookerEmailVerification)
        issues.push("enabling needs the booker's email verification to be required (requiresBookerEmailVerification)")
      if (!s.pendingRequestsHoldSlots)
        issues.push("enabling needs pending requests to hold their slot (pendingRequestsHoldSlots), so two requests cannot take one time")
    }
  }
  return issues
}

export type SchedulingState =
  /** No booking link: the Schedule page says scheduling is not set up. */
  | "unconfigured"
  /** A link exists but the owner has switched scheduling off. */
  | "disabled"
  /** A verified link and the attested provider settings: the page may offer the booking calendar. */
  | "ready"

/** Everything the page and its client script may know. No path, no setting, no secret. */
export interface PublicScheduling {
  readonly state: SchedulingState
  readonly ownerTimeZone: string
  /** The provider's own booking page, for the fallback link. Only when `ready`. */
  readonly bookingUrl?: string
  readonly embed?: {
    readonly origin: string
    readonly script: string
    readonly calLink: string
    readonly layout: typeof EMBED_LAYOUT
  }
}

/** The public view of a valid configuration. Call `validateScheduling` first. */
export function publicScheduling(config: SchedulingConfig): PublicScheduling {
  const parsed = config.bookingUrl === undefined ? undefined : parseBookingUrl(config.bookingUrl)
  const link = parsed !== undefined && parsed.ok ? parsed.value : undefined
  if (link === undefined) return { state: "unconfigured", ownerTimeZone: config.ownerTimeZone }
  if (!config.enabled) return { state: "disabled", ownerTimeZone: config.ownerTimeZone }
  return {
    state: "ready",
    ownerTimeZone: config.ownerTimeZone,
    bookingUrl: link.url,
    embed: { origin: EMBED_ORIGIN, script: EMBED_SCRIPT, calLink: link.calLink, layout: EMBED_LAYOUT },
  }
}
