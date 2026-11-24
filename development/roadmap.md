# Roadmap

Status: provisional. The six-wave structure is approved. Individual tasks are not specified beyond the titles below.

| Wave | Prompts | Status |
| --- | --- | --- |
| I — Foundations | P01–P04 | Completed 2026-11-10 |
| II — Physical Folders & Visual Identity | P05–P09 | P05 to P09 completed 2026-11-11; P09's three owner reviews are pending |
| III — Publishing & Content | P10–P14 | P10 to P14 completed 2026-11-15; owner reviews of P13's demonstrations and P14's workflow are pending |
| IV — Website Composition | P15–P18 | P15 to P17 completed 2026-11-16 and P18 on 2026-11-17; owner reviews are pending |
| V — Advanced Features | P19–P21 | P19 and P20 technically complete 2026-11-21 (the 3D nucleus prototype, then its integration on Home; owner reviews are pending); P21 integration-ready on 2026-11-22 (Schedule with an external provider, switched off until the owner has an account; its operational checks are blocked) |
| VI — QA & Release | P22–P24 | P22 automated QA complete 2026-11-22 (one `npm run qa` command, audits, accessibility, performance, a CI workflow that has run on GitHub (P22-A01: the static job passes; run 11, 2026-11-24: both jobs passed on the slow runner too, after the owner's decisions D-158 to D-160 and two flakes of my own checks found by re-running and repaired, ISSUE-0007; the 13 static skips were not run there); Cal.com checks deferred by the owner; the legacy design studies gated out of the release, D-157); P23 reviewed 2026-11-24 (awaiting the owner's acceptance); P24 not started |

## Known prompt titles

- **P01** — Workspace Audit, Preservation & Astro Preparation (completed)
- **P02** — Astro Foundation, Development Environment & Reproducible Static Build (completed)
- **P03** — GusmaoLab Design Tokens, Palette Architecture & Visual Foundations (completed; the owner approved the overall appearance)
- **P04** — Navigation Data Model, Hierarchy & Route Configuration (completed)
- **P05** — Physical Folder Geometry & Connected Tab System (completed; the owner approved the folder appearance)
- **P06** — Route-Driven Physical Folder Navigation & Overview Tabs (completed; the owner approved the navigation and Overview tabs)
- **P07** — Immediate-Child Hover Previews & Keyboard-Accessible Folder Discovery (completed; the owner approved the folder previews)
- **P08** — Responsive Physical-Folder Navigation & Adaptive Layout (completed; the owner approved the small-screen layout; real-device checks pending)
- **P09** — Navigation Continuity, Environmental Refinement & Bearnard Integration Foundations (technically completed; awaiting the owner's retest of the folder transition and the Bearnard role assignments)
  - **P09-A01** — Final Color Architecture: Chromatic Archive (addendum to P09; implemented 2026-11-12; five category palettes approved and locked by the owner, D-076; it replaces P09's environment candidates and removes External from the navigation)
- **P10** — Editorial Collections, Structured Publishing Foundations & Navigation Consolidation (completed 2026-11-13: the global row grouped by category, eight schema-validated collections, entry routes inside the folders, no content published; nothing pushed)
- **P11** — Canonical Research, Publication, People & Professional Records (completed 2026-11-13: eight record families, validation, selectors and projections, proved with a synthetic fixture; the site's records are empty until the owner supplies verified ones; nothing pushed)
  - **P11-A01** — The Author's Versioned CV YAML as the Canonical Professional Source of Truth (addendum to P11; implemented 2026-11-14: a read-only adapter from the CV to the P11 records, explicit version selection and approval, a generated public snapshot; no CV data is published, and the owner's CV file is unchanged)
- **P12** — Distinctive Editorial Layouts & Reading Experiences (completed)
- **P13** — Quarto and scientific publishing (completed)
  - **P13-A01** — Environment Stabilization, Reproducibility & Visible Scientific Publishing Demonstrations (completed 2026-11-15; the owner visually approved P12, P13 and the demonstrations)
- **P14** — Authoring Workflow, Publication Validation & Editorial Developer Experience (completed 2026-11-15: five `content:*` commands, one preflight, the development Publishing Workbench; the owner's use of the workflow is pending)
- **P15** — Homepage Composition: Bearnard, scientific identity, world clocks and editorial discovery (completed 2026-11-16: the real homepage with five regions, a reserved nucleus stage, eight configured clock locations and recent Blog updates; the owner's review is pending).
- **P16** — Eight World Clocks: timezone accuracy, live updates and homepage integration (completed 2026-11-16: eight live, IANA-correct clocks in the homepage's region, one update loop, a development specimen of simulated instants; the owner's clock review is pending). P17 is next; its purpose is whatever this roadmap says when it is prepared.
- **P17** — Complete Site Navigation & Content States (completed 2026-11-16: all 36 folders have a page with a derived state, a development site map, an internal-link checker; the owner's site-wide review is pending)
- **P18** — Contact, Downloads & Error Pages (completed 2026-11-17: a Contact page that lists only owner-approved channels (none yet), a validated download registry with no approved file yet, a custom static 404 page; the owner's review and approved channels are pending)
- **P19** — Scientific 3D Nucleus & Chromatin: Standalone Prototype (technically completed 2026-11-21: a real Three.js model of an interphase nucleus with folded chromatin and one yellow region that opens and reaches modestly toward a simulated target, a development specimen at `/_design/nucleus/`, the interface P20 will use; not on the homepage; awaiting the owner's visual approval)
- **P20** — Homepage Nucleus Integration (technically completed 2026-11-21: the P19 nucleus mounted on the real Home, driven by the real folder tabs through stable navigation IDs and a chromatin-domain abstraction with one domain; lazy, still on touch and reduced motion; a brief for multi-domain chromatin; then the tab row kept on screen on Home, D-144; the owner's homepage review is pending)
- **P21** — Scheduling Integration: Monthly Calendar, Verified Requests & Owner Approval (integration-ready 2026-11-22: the Schedule page, a validated switched-off configuration for an external Cal.com booking link, a click-to-load monthly embed that ships on Schedule only, an availability-file boundary, a development specimen and 61 checks; the real booking workflow is untested and blocked until the owner has a provider account)
- **P22** — Automated Quality Assurance: Build Integrity, Accessibility, Performance & Regression Protection (completed 2026-11-22: `npm run qa`, `qa:quick`, `qa:deep`; six result states; static audits, axe-core, measured performance and budgets; a development quality overview; a non-deploying workflow; NUC-031 investigated; the Cal.com checks DEFERRED by the owner's decision; the legacy design studies gated out of the release at the owner's choice, D-157, ISSUE-0006)
- P23 (manual browser review and refinement: done 2026-11-24 and closed out after the owner's final-acceptance follow-up, D-162; **accepted by the owner 2026-11-24**; `development/p23-review.md`) and P24 (deployment and handover: preparation done 2026-11-24, **release candidate ready, owner cutover authorization pending**; `development/p24-release.md`, `development/operations.md`)

Since P04, ordinary prompts run on the persistent `development` branch (D-035).

## Feasibility experiments

| ID | Topic | Status |
| --- | --- | --- |
| E-01 | 3D nucleus/chromatin visualization | Prototype built in P19 (60 fps measured on one GPU), mounted on Home in P20; awaiting the owner's review. Distinct chromatin per tab is a future refinement (`planning/nucleus-multidomain.md`) |
| E-02 | Scheduling provider capability | Not started |

When the experiments run relative to the waves is not yet decided.
