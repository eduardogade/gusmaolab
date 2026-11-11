/**
 * The Bearnard illustration registry (P09): which approved illustrations the website may
 * show, and what each one is for.
 *
 * Bearnard is the GusmaoLab mascot and may appear in any section, scientific ones
 * included. His canonical identity is the v1.3 master (assets/bearnard/README.md). The
 * masters stay in brand/bearnard/, gitignored and immutable; the site uses only the web
 * derivatives that scripts/bearnard_derivatives.py made from approved masters, committed
 * in public/illustrations/bearnard/ with their provenance in
 * assets/bearnard/derivatives.json. So the site builds without the masters.
 *
 * Roles say where an illustration is meant to appear. A role gets an illustration only
 * when the owner approves that assignment: until then it is empty, and the component
 * renders its fallback (or nothing). An illustration can also be chosen by its ID.
 *
 * Separate from the navigation, the content and the layout: data only, no paths on disk.
 */

/** Places in the site that may show Bearnard. Assignments need the owner's approval. */
export type IllustrationRole =
  | "home-welcome"
  | "research"
  | "teaching"
  | "reading"
  | "writing"
  | "technical-explaining"
  | "under-construction"
  | "not-found"
  | "booking"

export const ILLUSTRATION_ROLES: readonly IllustrationRole[] = [
  "home-welcome",
  "research",
  "teaching",
  "reading",
  "writing",
  "technical-explaining",
  "under-construction",
  "not-found",
  "booking",
]

/** One web derivative, as served from public/. */
export interface IllustrationFile {
  /** Root-relative URL of the file in public/. */
  readonly src: string
  readonly width: number
  readonly height: number
}

export interface BearnardIllustration {
  /** Stable identity, shared with assets/bearnard/derivatives.json. */
  readonly id: string
  /** The master it was made from, as listed in assets/bearnard/inventory.csv. Never served. */
  readonly master: string
  /** The master's classification in the inventory: only approved classes are allowed. */
  readonly category: "canonical-master" | "approved-derived"
  /** Roles the owner has assigned it to; empty until an assignment is approved. */
  readonly roles: readonly IllustrationRole[]
  /** What it shows, for visitors who cannot see it. */
  readonly alt: string
  /** Its web derivatives, narrowest first; all share one aspect ratio. */
  readonly files: readonly IllustrationFile[]
  /** Optional guidance for compositions. */
  readonly placement?: string
}

export const ILLUSTRATIONS: readonly BearnardIllustration[] = [
  {
    id: "bearnard-v1.3-portrait",
    master: "brand/bearnard/bearnard_v1.3.png",
    category: "canonical-master",
    roles: [],
    alt: "Bearnard, a cheerful dark-furred bear in tortoiseshell glasses, a plaid flannel shirt over a DNA T-shirt and jeans, smiling with a steaming mug in his paw.",
    files: [
      {
        src: "/illustrations/bearnard/bearnard-v1.3-portrait-320.webp",
        width: 320,
        height: 632,
      },
      {
        src: "/illustrations/bearnard/bearnard-v1.3-portrait-640.webp",
        width: 640,
        height: 1265,
      },
    ],
    placement:
      "Full-length and transparent: stands beside text or at the foot of a column; never cropped.",
  },
]

/** The illustration with this ID; undefined if there is none. */
export const illustrationById = (id: string): BearnardIllustration | undefined =>
  ILLUSTRATIONS.find((illustration) => illustration.id === id)

/**
 * The illustration for a role: the first one assigned to it, in registry order, so a page
 * always shows the same one. Undefined while no illustration is approved for the role.
 */
export const illustrationFor = (
  role: IllustrationRole,
): BearnardIllustration | undefined =>
  ILLUSTRATIONS.find((illustration) => illustration.roles.includes(role))
