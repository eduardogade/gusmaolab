/**
 * The public contact channels (P18, D-126): the only list of ways to reach the owner that the site
 * shows. The owner gave the nine public profiles below in the P24 prompt (2026-11-24, D-164). No email
 * address is listed yet: the owner prefers one and has approved `eduardo@gusmaolab.org` in principle,
 * but it is published only once it is configured and a test message has arrived (D-164). The WhatsApp
 * number the owner mentioned is not listed: the owner asked for it only under a condition not yet met.
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

/** The day the owner gave these profiles for the site (the P24 prompt, D-164). */
const P24 = "2026-11-24"

export const CONTACT_CHANNELS: readonly ContactChannel[] = [
  { id: "linkedin", kind: "profile", label: "LinkedIn", destination: "https://www.linkedin.com/in/eduardogade/", description: "Professional profile and messages.", use: "professional", approvedOn: P24 },
  { id: "orcid", kind: "profile", label: "ORCID", destination: "https://orcid.org/0000-0001-7461-1443", description: "Researcher identifier and record of scholarly work.", use: "professional", approvedOn: P24 },
  { id: "google-scholar", kind: "profile", label: "Google Scholar", destination: "https://scholar.google.com/citations?user=erHz7L8AAAAJ&hl=en", description: "Publications and citations.", use: "professional", approvedOn: P24 },
  { id: "researchgate", kind: "profile", label: "ResearchGate", destination: "https://www.researchgate.net/profile/Eduardo-Gusmao", description: "Research profile and messages.", use: "professional", approvedOn: P24 },
  { id: "github", kind: "profile", label: "GitHub", destination: "https://github.com/eduardogade", description: "Code and software projects.", use: "technical", approvedOn: P24 },
  { id: "dev-to", kind: "profile", label: "DEV", destination: "https://dev.to/eduardogade", description: "Technical articles.", use: "technical", approvedOn: P24 },
  { id: "medium", kind: "profile", label: "Medium", destination: "https://medium.com/@eduardogade", description: "Articles and essays.", use: "general", approvedOn: P24 },
  { id: "instagram", kind: "profile", label: "Instagram", destination: "https://www.instagram.com/gusmaolab1990/", description: "Social profile.", use: "general", approvedOn: P24 },
  { id: "facebook", kind: "profile", label: "Facebook", destination: "https://www.facebook.com/profile.php?id=61595332356467", description: "Social profile.", use: "general", approvedOn: P24 },
]
