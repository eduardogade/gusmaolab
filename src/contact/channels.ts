/**
 * Public contact channels (P18, D-126): the model and the rules, and nothing about any person. The
 * channels themselves are the owner's, in src/data/contact.ts, and that file starts empty: a channel
 * is published only when the owner has approved it, and nothing in this repository counts as
 * approval (not the CV, not a record, not a profile URL found somewhere).
 *
 * A channel is small: a stable ID, a kind, the words a visitor sees, where it goes, what it is
 * for, and the date the owner approved it. `validateChannels` is the only gate. It never accepts
 * an unapproved channel, a malformed address or URL, a script URL, a duplicate, or (outside a
 * test) an address on a reserved example domain, so a placeholder cannot reach a page.
 *
 * No form, no mail service, no obfuscation and no client script: an email channel is a plain
 * `mailto:` link beside the readable address.
 *
 * Pure and Node-runnable (erasable TypeScript, D-040).
 */

export const CHANNEL_KINDS = ["email", "profile"] as const
export type ChannelKind = (typeof CHANNEL_KINDS)[number]

/** What a channel is for. The page groups by it, in this order. */
export const CHANNEL_USES = ["general", "collaboration", "professional", "technical"] as const
export type ChannelUse = (typeof CHANNEL_USES)[number]

export const USE_LABELS: Readonly<Record<ChannelUse, string>> = {
  general: "General inquiries",
  collaboration: "Research collaboration",
  professional: "Professional opportunities",
  technical: "Technical and project discussions",
}

export interface ContactChannel {
  /** Stable, lowercase, never changes with a label: "email-general". */
  readonly id: string
  readonly kind: ChannelKind
  /** What the link says: "Email", "GitHub", "ORCID". */
  readonly label: string
  /** An email address (kind `email`) or an https URL (kind `profile`). */
  readonly destination: string
  /** What to write there, in a short sentence. */
  readonly description: string
  readonly use: ChannelUse
  /** The day the owner approved this channel for the public site, `YYYY-MM-DD`. */
  readonly approvedOn: string
}

export interface ChannelOptions {
  /** Test fixtures and development specimens only: accept reserved example domains. */
  readonly allowExampleDomains?: boolean
}

const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const DAY = /^\d{4}-\d{2}-\d{2}$/
// A deliberately plain address: one @, a dotted host, no spaces, quotes or angle brackets.
const ADDRESS = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/
const EXAMPLE_HOST = /(^|\.)(example\.(com|org|net)|localhost|invalid|test|example)$/i

/** The `mailto:` URL of an address. Only the address is encoded; it is never given a subject or body. */
export const mailtoHref = (address: string): string => `mailto:${encodeURIComponent(address).replace(/%40/g, "@")}`

/** The host of a profile channel, for the label that says where the link goes. */
export function profileHost(destination: string): string {
  return new URL(destination).hostname.replace(/^www\./, "")
}

/** Every problem with a list of channels, as sentences a maintainer can act on. Empty means valid. */
export function validateChannels(
  channels: readonly ContactChannel[],
  options: ChannelOptions = {},
): string[] {
  const issues: string[] = []
  const ids = new Set<string>()
  const destinations = new Set<string>()
  for (const channel of channels) {
    const at = `contact channel "${channel.id}"`
    if (!ID.test(channel.id)) issues.push(`${at}: the ID must be lowercase words joined by hyphens`)
    if (ids.has(channel.id)) issues.push(`${at}: the ID is used twice`)
    ids.add(channel.id)
    if (!(CHANNEL_KINDS as readonly string[]).includes(channel.kind)) issues.push(`${at}: unknown kind "${channel.kind}"`)
    if (!(CHANNEL_USES as readonly string[]).includes(channel.use)) issues.push(`${at}: unknown use "${channel.use}"`)
    if (channel.label.trim() === "") issues.push(`${at}: it has no label`)
    if (channel.description.trim() === "") issues.push(`${at}: it has no description`)
    if (!DAY.test(channel.approvedOn) || Number.isNaN(Date.parse(channel.approvedOn)))
      issues.push(`${at}: it has no valid approval date (approvedOn, YYYY-MM-DD); a channel the owner has not approved is not published`)
    const key = channel.destination.trim().toLowerCase()
    if (destinations.has(key)) issues.push(`${at}: the destination is listed twice`)
    destinations.add(key)
    if (channel.kind === "email") {
      if (!ADDRESS.test(channel.destination)) issues.push(`${at}: "${channel.destination}" is not a plain email address (no "mailto:", no name, no spaces)`)
      else if (!options.allowExampleDomains && EXAMPLE_HOST.test(channel.destination.split("@")[1] ?? ""))
        issues.push(`${at}: the address is on a reserved example domain, so it is a placeholder`)
    } else if (channel.kind === "profile") {
      let url: URL | undefined
      try {
        url = new URL(channel.destination)
      } catch {
        issues.push(`${at}: "${channel.destination}" is not a URL`)
      }
      if (url !== undefined) {
        if (url.protocol !== "https:") issues.push(`${at}: a profile link must be https, not ${url.protocol}`)
        if (url.username !== "" || url.password !== "") issues.push(`${at}: a profile link must not carry credentials`)
        if (!url.hostname.includes(".")) issues.push(`${at}: "${url.hostname}" is not a public host`)
        if (!options.allowExampleDomains && EXAMPLE_HOST.test(url.hostname))
          issues.push(`${at}: the host is a reserved example domain, so it is a placeholder`)
      }
    }
  }
  return issues
}

/** The channels grouped by use, in the page's order, omitting uses with none. */
export function groupByUse(
  channels: readonly ContactChannel[],
): { use: ChannelUse; label: string; channels: ContactChannel[] }[] {
  return CHANNEL_USES.map((use) => ({
    use,
    label: USE_LABELS[use],
    channels: channels.filter((channel) => channel.use === use),
  })).filter((group) => group.channels.length > 0)
}
