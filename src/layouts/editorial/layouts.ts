/**
 * The one explicit map from a collection to its reading layout (P12, D-094). The route
 * components and the design study both read it, so a collection cannot be drawn one way on
 * the site and another in the study. tests/editorial-layouts.mjs checks that it covers
 * exactly the eight collections and agrees with PRESENTATIONS (src/editorial/reading.ts).
 */
import type { CollectionId } from "../../editorial/collections.ts"
import BerriesLayout from "./BerriesLayout.astro"
import BlogLayout from "./BlogLayout.astro"
import BookClubLayout from "./BookClubLayout.astro"
import GreenhouseLayout from "./GreenhouseLayout.astro"
import KosmosLayout from "./KosmosLayout.astro"
import MonthsOriginalLayout from "./MonthsOriginalLayout.astro"
import TimberLogLayout from "./TimberLogLayout.astro"
import TrailLayout from "./TrailLayout.astro"

export const EDITORIAL_LAYOUTS = {
  blog: BlogLayout,
  trail: TrailLayout,
  greenhouse: GreenhouseLayout,
  berries: BerriesLayout,
  timberLogs: TimberLogLayout,
  monthsOriginal: MonthsOriginalLayout,
  kosmos: KosmosLayout,
  bookClub: BookClubLayout,
} satisfies Record<CollectionId, unknown>
