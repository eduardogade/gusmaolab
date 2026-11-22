# Multi-domain chromatin: a brief for a future refinement

Status: **a design brief, not a plan of record.** Written in P20 (D-139 to D-143). It is not permission to start a second nucleus redesign, and it does not choose which chromatin answers which tab: that is an artistic and scientific choice the owner has not made. P20 built the *interface* that such a choice would use; this file says what the *geometry* would need.

The words matter. A **navigation target** is what the page sends: a registry ID such as `cv`, and a position. A **chromatin domain** is a stretch of the model that can respond. **Different chromatin means different, identifiable geometry**, never a different colour on the same stretch.

## 1. How many independently identifiable chromatin domains are currently present?

**One.** The highlighted region of P19: points 37 to 111 of `territory-00`, reported by `domainsOf(model)` (`src/visualization/nucleus/domains.ts`) with the ID `highlighted-region`. The other eleven territories are drawn but cannot deform; they are not domains and have no IDs. All eleven top-level tabs resolve to the one domain, by default, because `NAVIGATION_DOMAINS` is empty. Multiple regions are **not implemented**, and nothing in the site, the tests or the documents says otherwise.

## 2. How are their identities represented?

Today: a string ID on a `ChromatinDomain { id, strandId, start, end, center }`, listed by `domainsOf()`. A target may name one (`chromatinDomainId`); otherwise `resolveDomain()` maps the navigation ID through `NAVIGATION_DOMAINS` and falls back to the first domain (the default). An unknown ID is reported as `unknown-domain` and answered by the default; nothing throws.

For several domains the IDs would be **stable and independent of colour, order and tab**: `strand id + index range` is a good source of truth, because the model already addresses control points that way (a domain is a contiguous run of one strand, anchored at both ends).

## 3. What geometry changes would allow independent domains?

The P19 model has one `HighlightRegion` and one `DeformationState`. The changes, smallest first:

1. **A list of regions.** `NucleusModel.highlight` becomes `domains: readonly HighlightRegion[]`, each with its own `opened` shape (`buildHighlight` already makes one from a strand and an index range, so it is called per domain). Ranges on the same strand must not overlap; their ends stay anchored with the same `sin²` weight (zero value and zero slope at both ends), so a deformed domain still leaves its strand continuous.
2. **A state per domain.** One `DeformationState` per domain (`s`, direction, reach, velocities). The lifecycle holds a map `domainId → state`, steps every state that is not settled, and the loop stops only when **all** are settled (`isSettled` per state; the loop condition becomes "any").
3. **Displacement.** `applyDeformation` takes a region and a state; call it once per active domain into the shared control-point array (domains on different strands, or disjoint ranges, cannot interfere, which keeps the per-point work the same as today).
4. **Region geometry.** Each domain needs a place where opening makes sense: a stretch of a territory with enough free space around it that the Lipschitz ellipsoid clamp (0.935 of the envelope) does not flatten the motion. Territories are packed with minimum spacing; a domain near the envelope will deform less than P19's, which was placed by hand.
5. **Meshes.** Today the highlighted strand is its own dynamic mesh and the other eleven are merged into one static mesh. Each domain's strand needs its own dynamic mesh, or the whole strand is dynamic. A domain on a merged strand would require splitting that strand out of the static mesh *at build time* (not when a tab is hovered): that is **one more mesh and draw call per domain strand**, within the budget of 6 draw calls only for up to two more.

## 4. How would each top-level navigation ID select its domain?

Through `NAVIGATION_DOMAINS`, the one table: `{ cv: "domain-…", lab: "domain-…" }`. Nothing else changes: the page already sends the registry ID, `activate()` already resolves it, the diagnostics already report the answer. Several tabs may share a domain (a category could share one: the registry gives each tab a category), and a tab without an entry takes the default. The mapping is data, reviewed by the owner, and tests assert it against the registry (every key is a registry ID, every value a domain the model has).

Do **not** invent the mapping here. Which of the eleven tabs, or five categories, gets which region is a decision for the owner, with the geometry in front of them.

## 5. How would the transition between domains work?

The same way a retarget works now: nothing is replaced. Activating domain B while A is active starts B's state toward its target and releases A's; both are critically damped, so A returns while B opens, over about two seconds, each continuous from where it is. There is no cross-fade of geometry, no visibility switch and no re-creation of a mesh.

## 6. Should previous domains return to rest while another activates?

**Yes.** Only the most recent input holds a response (the precedence rule of D-138), so the previous domain is released the moment the next tab takes over, and it returns at the same rate as any release. Two domains open at once would read as two controls, which is not what a pointer on one tab means. If the owner prefers a lingering trail, that is a visual choice to make with the motion in front of them.

## 7. How would continuity and physical attachment be preserved?

By the invariants P19 already tests, applied per domain: the end points are anchored (weight zero with zero slope), the displacement is bounded (reach < 0.4, outside points move less), the control path stays continuous with no hairpin (NUC-004, NUC-015), the strand is never replaced and its vertex count never changes (NUC-006), and the clamp keeps everything inside the envelope with its tube radius. Each is a test that would run once per domain.

## 8. What scientific simplifications remain acceptable?

The same as now: an artistic model, not a reconstruction. Twelve territories are not the 46 human chromosomes; a "domain" is a stretch of one polymer (picture a topologically associating domain or a compartment segment), not a measured TAD; opening toward a tab is an illustration of a conformational change, not a simulated one. A domain must not be labelled with a real locus, gene or chromosome unless the owner supplies and confirms it, and then as an illustration of it.

## 9. How would colour identity be assigned without changing colours abruptly?

Colour is a property of the stretch, fixed at build time, and **never changes at run time**: a domain is yellow or teal from the first frame, as the highlighted region is yellow now (`HIGHLIGHT_COLOR`, blended over five control points at each end). Two domains need two distinct, tested, colour-blind-safe colours that are neither the site's category colours (D-076) nor the territory tones; choosing them is a visual decision. The alternative, one shared highlight colour for every domain, keeps the identity in the *place* of the opening and costs nothing. Either way, no tab ever recolours a domain.

## 10. What new performance costs would appear?

Per domain: one more dynamic mesh (draw call, a vertex buffer updated in place), and per active frame one more strand rebuilt (~1/12th of the tube work, now about a 12th of the geometry). Idle cost stays zero: nothing draws when every state is settled. Triangles grow by the share of the strand made dynamic, not by the number of tabs. Measure on the homepage, with the stated budget of 6 draw calls and 140,000 triangles, before and after; P20's measurements are the baseline (`development/current-state.md`).

## 11. What new tests would be needed?

- **Model:** the domains are disjoint, anchored, inside their strands, finite, and deterministic for the seed; each opens by a bounded amount; none leaves the envelope (NUC-003, -004, -011, -015 per domain).
- **Mapping:** every key of `NAVIGATION_DOMAINS` is a registry ID; every value is a domain the model has; the explicit-ID and unknown-ID rules hold (NUCINT-021, -022, -025, now against real domains, not synthetic).
- **Lifecycle:** with two domains, one loop; the loop stops when both settle; activating B while A is active releases A and raises B without a jump (a continuity test over both states, as NUCINT-015); idle cost zero.
- **Rendering:** each domain visible at rest and moving in the browser (pixel checks per domain, as NUCINT-011B), no recolouring, the draw-call and triangle budgets.
- **Documents:** the guide, the matrix and the decisions say how many domains exist, and the NUCINT-024 check is updated from "one" to the real number on purpose.

## 12. Which decisions need the owner's visual approval?

All of the following, with the nucleus on screen: which regions exist and where; which tab or category answers which region (the mapping); how far each opens and in which direction; whether domains share a colour or have their own, and which; whether a previous domain returns at once or lingers; how many domains read well at the homepage's size (the stage is about 590 px wide on a laptop). None is made by this brief.

## What P20 already provides

The page-side contract (stable registry IDs from `data-tab-id`, a position sampled from the visible part of the tab, passive observers with a documented precedence), the `activate({ navigationId, position, chromatinDomainId? })` / `clear()` controller, `domainsOf` / `resolveDomain` with the explicit, mapped, default and unknown-domain rules, and synthetic two-domain tests of the mapping. Items 1 to 5 of section 3 are the model work that is **not** done.
