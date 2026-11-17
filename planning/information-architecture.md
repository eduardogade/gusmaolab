# Information architecture

Status: navigation model implemented in P04 (2026-11-10). The first and second levels are approved. **No third-level folder is approved yet**: the model supports a third level, and the final third-level site map will be settled in the content prompts. P05 added the physical folder components that draw this model (section 13). P06 (2026-11-11) made the tabs links, generated a page for every folder from the registry, and added the Overview tab (section 14). P07 added temporary previews of an unopened folder's contents (section 15). P08 made the same folders work on every screen size (section 16). P09-A01 (2026-11-12, D-076) removed External from the navigation, leaving eleven sections, and gave every section a permanent archive category (sections 1 and 11).

Source of truth: `src/navigation/registry.ts` (data), `src/navigation/navigation.ts` (helpers) and `src/navigation/types.ts` (types). Tests: `tests/navigation.mjs` (NAV-001 to NAV-021, NAV-025 and NAV-033), `tests/routes.mjs` (NAV-022, NAV-023, NAV-026 to NAV-032), `tests/categories.mjs` and `tests/categories-browser.mjs` (CAT-001 to CAT-017, the categories) and, for the previews, `tests/previews.mjs` and `tests/previews-browser.mjs` (PREV-001 to PREV-015). NAV-024, Back and Forward, is checked in a browser.

## 1. Top-level sections (approved)

Eleven tabs on the global row, in this order. P09-A01 (D-076) fixed the eleven and their categories; **P10 (D-077) grouped the row by category**, so the tabs of one category are adjacent and the colour alone shows the five groups.

| # | Label | ID | URL | Category (colour) | Environment (typography) |
| ---: | --- | --- | --- | --- | --- |
| 1 | Home | `home` | `/` | Core | Core |
| 2 | About | `about` | `/about/` | Core | Core |
| 3 | Contact | `contact` | `/contact/` | Core | Core |
| 4 | Schedule | `schedule` | `/schedule/` | Core | Core |
| 5 | Portfolio | `portfolio` | `/portfolio/` | Research | Scientific |
| 6 | CV | `cv` | `/cv/` | Research | Scientific |
| 7 | Lab | `lab` | `/lab/` | Research | Scientific |
| 8 | Blog | `blog` | `/blog/` | Blog & Notes | Core |
| 9 | Lecture Notes | `lecture-notes` | `/lecture-notes/` | Blog & Notes | Technical |
| 10 | Writing | `writing` | `/writing/` | Writing | Literary |
| 11 | Bearnard's Area | `bearnards-area` | `/bearnards-area/` | Bearnard | Personal |

**Grouping rule (P10).** Every category forms one contiguous block of the global row: Core (4), Research (3), Blog & Notes (2), Writing (1), Bearnard (1). `validateNavigation()` rejects a registry in which a category returns after another began, and NAV-033 and CAT-001 check the real row. Only the order changed: labels, IDs, URLs, categories, environments and children are as before, and no heading, gap or other element was added to the row. Before P10 the row kept the original conceptual order (Home, About, Blog, Portfolio, Contact, Schedule, CV, Lab, Lecture Notes, Writing, Bearnard's Area), which interleaved Blog & Notes, Research and Core.

The labels are authoritative. The URLs are the brief's recommended values, adopted unchanged in P04.

**External was removed in P09-A01.** It was the sixth of twelve tabs in the P04 order, at `/external/`, and held only the development placeholder: no content existed, so none was deleted or moved. Its page was generated from the registry, so removing the entry stops the page being built; `/external/` is now an unknown URL. Nothing took its place, and no new destination was invented for it.

## 2. Second-level folders (approved)

| Parent | Children (in order) and URLs |
| --- | --- |
| CV | Teaching `/cv/teaching/` · Research `/cv/research/` · Publications `/cv/publications/` · Talks / Presentations `/cv/talks/` · Mentoring / Supervision `/cv/mentoring/` · Awards & Honors `/cv/awards/` · Service `/cv/service/` · Outreach / Public Engagement `/cv/outreach/` |
| Lab | People `/lab/people/` · Join Us `/lab/join-us/` · Research Areas `/lab/research-areas/` · Facilities `/lab/facilities/` · Partners `/lab/partners/` · Resources `/lab/resources/` |
| Lecture Notes | Bearnard's Trail `/lecture-notes/bearnards-trail/` · The Greenhouse `/lecture-notes/greenhouse/` · Berries `/lecture-notes/berries/` · Timber Logs `/lecture-notes/timber-logs/` |
| Writing | Months' Original `/writing/months-original/` · Kosmos Series `/writing/kosmos/` · Book Club `/writing/book-club/` |
| Bearnard's Area | Photos `/bearnards-area/photos/` · Videos `/bearnards-area/videos/` · Powerlifting `/bearnards-area/powerlifting/` · Bear Life `/bearnards-area/bear-life/` |

That is 25 second-level folders, 36 tabs in all. Home, About, Blog, Portfolio, Contact and Schedule have no child folders: they display their own content. Blog is a publication collection, so its articles arrive as content routes (section 8), not tabs.

Short slugs were chosen where a label is long or punctuated: `talks`, `mentoring`, `awards`, `outreach`, `greenhouse`, `kosmos`. They are recommendations and can change before anything is published. After publication, a changed URL needs a redirect.

The editorial collections (`content-model.md`) sit in these folders: Blog under Blog; Bearnard's Trail, The Greenhouse, Berries and Timber Logs under Lecture Notes; Months' Original, Kosmos Series and Book Club under Writing.

## 3. The third level: supported, not yet populated

The type system, helpers and tests support a third visible level. The production registry declares none, because none is approved. Ideas from earlier planning, all **provisional** and not in the registry:

- CV → Research → Projects, and CV → Research → Themes
- CV → Teaching → Courses
- Lab → People → Alumni
- Lab → Resources → Datasets
- Writing → Kosmos Series → Mikrokosmos

Tests use explicitly synthetic fixtures (`synthetic-projects`, labeled "Synthetic: …"), never these names.

## 4. At most three visible tab levels

Navigation uses real physical folder tabs, counting the global row as level 1:

1. The global row: the eleven sections.
2. Opening a section with children shows a folder of their tabs inside its body.
3. A third folder may appear inside the second.

There is never a fourth row. The registry rejects an entry at level 4. Deeper content is reached from inside the third-level folder's body, through article indexes, links, cards and reading sequences. **The limit applies to visible tabs, not to URL depth**: content routes may be as deep as needed.

No breadcrumbs, no persistent sidebar, no computer-file-manager design, no dropdown tree replacing the folders. The active tab has a V-shaped indicator and connects to the folder body below it; inactive tabs stay visible and slightly dimmed.

## 5. Every parent is a page

Every tab, parent or leaf, has its own destination. Clicking CV opens the CV page at `/cv/`: CV is selected on the global row, and CV's row of folders opens below it with its **Overview** tab selected, standing for that page (section 14). Clicking Research opens `/cv/research/`, with CV and Research selected. A tab never only expands a menu, and no row of tabs is ever left unselected.

## 6. Canonical URLs

`normalizePath()` gives the canonical form used for every comparison:

- `/` is the homepage; every other path ends with a slash: `/cv/research/`.
- The origin, query string and fragment are dropped, so `/cv/research?tab=x#top` selects the same folders as `/cv/research/`.
- Repeated slashes collapse, dot segments resolve and a trailing `index.html` is removed.
- Paths are case-sensitive, like the static host. Canonical paths are lowercase, so `/CV/` is an unknown page.

Registry paths are never typed by hand: a tab's path is its parent's path plus its slug, so a child cannot escape its parent. Slugs are single lowercase kebab-case segments.

## 7. From URL to folder state

`siteNavigation.resolve(url)` is a pure function of the URL; no client-side router is involved. For a known page it returns:

| Field | Meaning |
| --- | --- |
| `page` | What the folder body displays: a folder page, or a content route |
| `folder` | The folder whose body shows the page |
| `selection` | The selected tab per level, global row first (at most three) |
| `rows` | Rows to draw: each with its level, parent, display tabs in order (a child row starts with its parent's Overview), and the `selectedId` carrying the V indicator. Every row has one (P06). Each row also has `previews`: the contents of its unselected folders that have children (P07, section 15). |
| `currentTabId` | The tab that stands for the page itself, which gets `aria-current="page"`; `null` on a content page |
| `category` | The open section's archive category: the colour of the flannel, the folder bodies and the paper (P09-A01) |
| `environment` | The folder's semantic environment: typography and texture only |

Examples:

| URL | Selection | Rows |
| --- | --- | --- |
| `/` | Home | 1: the global row, Home selected |
| `/cv/` | CV | 2: global row (CV); CV's row, Overview selected |
| `/cv/research/` | CV › Research | 2: global row (CV); CV's row (Research) |
| a level-3 page | three levels | 3, each with its selected tab |
| a level-2 page with children, such as `/cv/research/` if Research had folders | two levels | 3: the third row has the level-2 folder's Overview selected |
| an article inside Berries | Lecture Notes › Berries | 2; the article is shown in the Berries body, with no tab of its own |

An unknown URL returns `found: false`. Its `context` names the deepest folder containing the path, which a future 404 page may use for helpful links, but the URL never becomes a page. `/cv/this-page-does-not-exist/` is not a CV page.

## 8. Folder tabs and content routes are different things

A **folder** (navigation node) is a tab in the registry. A **content route** is any other real page: a blog post, a lecture note, a publication page. Not every URL segment is a folder.

Content routes are registered explicitly: `{ path, owner }`, where `owner` is the ID of the folder whose body displays the page. Since P10 the editorial collections generate them at build time (D-080): published and archived entries only, each owned by its collection's folder (`planning/content-model.md`). For example, `/lecture-notes/berries/some-article/` is owned by `lecture-notes-berries`. It is a page, but Berries' tab stays selected and no new tab appears.

## 9. Ownership rules

Validation rejects a content route that:

- is not a canonical path;
- duplicates a folder's path or another route;
- names an unknown owner;
- lies outside its owner's path;
- is owned by an ancestor while lying inside a deeper folder. The owner must be the deepest folder containing the route.

Only registered routes resolve. A registered article never makes its siblings valid.

## 10. Hover-preview data

`siteNavigation.preview(id)` returns a tab's immediate children, in declared order. Grandchildren never appear, and a leaf returns an empty list. Hovering only previews; it never navigates or changes the selection.

The registry stores no interaction state. Selection comes from the URL. Since P07 the drawn previews are `TabRow.previews`, which add the folder's Overview in front of these children (section 15); whether a preview is showing is transient state that lives only in the page's script, never in the model (D-058).

## 11. Category and environment inheritance

Two separate properties, since P09-A01 (D-076):

**Category: colour.** Every top-level section declares one of five archive categories, and the registry rejects one without it. Its folders inherit it and can never declare their own, so a whole section is one cardstock.

| Category | ID | Sections |
| --- | --- | --- |
| Core | `core` | Home, About, Contact, Schedule |
| Research | `research` | CV, Portfolio, Lab |
| Blog & Notes | `blog-notes` | Blog, Lecture Notes |
| Writing | `writing` | Writing |
| Bearnard | `bearnard` | Bearnard's Area |

The registry names categories only; the colours live in `src/styles/categories.css` (`design-system.md`, section 3). A category is used in two ways:

- **The page's category** is the open section's: `FolderPage` passes `state.category` to BaseLayout, which sets `<html data-category>`. It colours the flannel, the open folder bodies, the second-level tabs and the reading paper.
- **A tab's own category** is permanent: every top-level tab carries its section's `data-category`, so it keeps its own cardstock on every page, whichever folder is open. A preview is inside its tab and takes the same category.

**Environment: typography and texture.** A tab's environment is its own, or else its parent's; a top-level tab without one is `core`. CV, Lab and Portfolio are scientific; Lecture Notes technical; Writing literary; Bearnard's Area personal; the rest core. Children inherit unless overridden. The registry names environments only; their type lives in `src/styles/environments.css`, which sets no colour. A page sets the environment through BaseLayout's `environment` prop, which adds `data-environment` (`core` means no attribute).

Category and environment are independent: Blog is Blog & Notes in the core environment, and Lecture Notes is Blog & Notes in the technical one.

## 12. Route generation (P06)

The registry creates no pages by itself. Pages come from Astro route files that read it (D-053):

1. **Folder pages (P06):** one route file per tab level, so the routes follow the three visible levels exactly.

   | Route file | Pages |
   | --- | --- |
   | `src/pages/index.astro` | Home, `/` |
   | `src/pages/[section]/index.astro` | The 10 other level-1 folders |
   | `src/pages/[section]/[folder]/index.astro` | The 25 level-2 folders |
   | `src/pages/[section]/[folder]/[subfolder]/index.astro` | Level-3 folders: none until one is approved |

   Each lists `siteNavigation.folderStaticPaths(level)`, so a page exists for exactly the registered folders, and adding a folder to the registry is enough to build its page. No page file is maintained by hand per section.
2. **Content routes (P10, D-080):** the editorial entries that are published or archived become `ContentRoute`s at build time (`src/editorial/site.ts`). They are passed to `createNavigation()` alongside the registry, and the same three route files generate their pages (`pageStaticPaths(level)` lists the folders at that depth, then the entries at that depth), so navigation and output cannot disagree. This replaces the earlier plan of separate route files under static segments: one mechanism serves every collection, and no second file can claim a pattern the first already has. An entry's page is built only below its owner, never at the owner's own path, and a draft's page is not built.
3. **Build checks, active now:** the smoke test fails if `dist/` holds a page that is not a registered destination, a declared study, or an editorial entry that declares itself published or archived at its collection's prefix plus its slug, or if a registered destination has no page. Since P09-A01, 36 of 36 destinations have a page (37 before External was removed). `tests/routes.mjs` checks every page's folders, links, category, environment and landmarks.
4. **Not to do:** no catch-all route (`[...slug]`) that could swallow unknown paths or collide with collections; no server rendering; no client-side router. An unknown URL has no file, so the static host answers 404.
5. **Design studies (P05, P06):** temporary pages under `/_design/` are the only built pages outside the registry: the P03 tokens specimen at `/_design/tokens/` (moved from `/` in P06, D-055), the folder study at `/_design/folders/`, the Bearnard study at `/_design/bearnard/` (P09) and the records study at `/_design/records/` (P11). No slug can start with `_`, so they can never collide with a folder. The smoke test lists them explicitly (D-048).

## 13. From navigation state to physical folders (P05)

The folder components in `src/components/folders/` draw what `resolve()` returns; they hold no navigation data of their own (D-043).

| Navigation model (P04) | Physical folders (P05) |
| --- | --- |
| `state.rows` | `<FolderStack rows={…}>`: one folder level per row, at most `MAX_TAB_LEVELS` |
| `row.level` | `data-level` on the level: its material, tab size and label size |
| `row.tabs`, in order | The row's tabs: each `tab.label`, with the Overview first in a child row |
| `row.selectedId` | The selected tab: raised, joined to the open body, with the V. Every row has one (P06). |
| `state.currentTabId` | That tab's link carries `aria-current="page"`; other selected tabs carry `aria-current="true"` (P06) |
| `tab.href` | The tab's link (P06); an Overview's is its parent's path |
| The deepest folder | Its body holds the page's content on ivory paper, in `<main>`; a content route deeper than level 3 is shown there too |
| `state.category` | The stack's `data-category`, and `<html data-category>` through `FolderPage`: the open folders' cardstock, the paper and the flannel (P09-A01) |
| A level-1 `tab.node.category` | That tab's own `data-category`: its permanent cardstock, and its preview's |
| `state.environment` | Set by `FolderPage` through BaseLayout's `environment`, or by a `data-environment` wrapper in a study; the components never choose it. Typography only |
| `row.previews` | Each unselected folder with children carries its preview after its link: a hidden index card of its Overview and children, shown on hover and keyboard focus (P07, section 15) |

`FolderStack` fails the build if the rows are impossible: none, more than three, out of order, not following the selected tab, a row without a valid selection, an Overview out of place, or a row below an Overview. A page therefore cannot draw a fourth level, an unselected row, or a stack that disagrees with the registry. The folder study (`/_design/folders/`) builds its stacks from `siteNavigation.resolve()`. Its third level is a synthetic fixture (Projects, Themes, Datasets under CV › Research), made with `createNavigation()`, and is not added to the registry.

## 14. Overview tabs and folder pages (P06)

### Navigation nodes and display tabs

The registry holds **navigation nodes**: folders with an ID, label, slug and children. A row of tabs on screen holds **display tabs**, built from those nodes by the resolver:

| Display tab | What it is | Links to |
| --- | --- | --- |
| `NodeTab` (`kind: "folder"`) | A registered folder | Its own path |
| `OverviewTab` (`kind: "overview"`) | The open parent's own page, drawn first in the parent's row of children | The parent's own path |

The Overview is a presentation, not data (D-051). It has no slug, no URL of its own and no page of its own, and it is never added to the registry. Its ID, `overview:<parent ID>`, can never be a node ID. It never has an Overview of its own, and no row opens below it. The registry's uniqueness rules are unchanged: 36 nodes, 36 paths, 36 pages.

### Selection

Selection is a pure function of the URL:

1. `resolve(url)` finds the page: a folder, or a registered content route and its owning folder.
2. The open folders are the page's folder and its ancestors (`state.selection`, registry nodes only). Each one's tab is selected in its row.
3. If the page's folder has children, its row of children opens below it, led by its Overview. On the folder's own page, Overview is selected and stands for the page.
4. Every drawn row therefore has exactly one selected tab (D-050).

| Page | Selected tabs | Current page (`aria-current="page"`) |
| --- | --- | --- |
| `/` | Home | Home |
| `/about/` (leaf) | About | About |
| `/cv/` (parent) | CV › Overview | Overview |
| `/cv/research/` (leaf) | CV › Research | Research |
| `/cv/research/` if Research had folders | CV › Research › Overview | Overview |
| a content page owned by Berries | Lecture Notes › Berries | none: the article is not a tab |
| a content page owned by Lecture Notes itself | Lecture Notes › Overview | none |

Selected tabs above the current page are the open folders that contain it: they get `aria-current="true"`, not `"page"`. So CV and its Overview, which both link to `/cv/`, never both announce themselves as the current page (D-054).

### Parent pages and leaves

- A parent's tab opens its own page. That page is drawn as the parent's Overview: the parent stays selected, and its row of children opens with Overview selected.
- A leaf adds no row: `/about/` shows the global row and About's page in its body, and `/cv/research/` ends at the second level while Research has no folders (D-052).
- A third row appears only for a level-2 folder with registered children. None is approved yet; a synthetic fixture tests it (NAV-019) and shows it (case G of the folder study).

### Depth and ownership

- At most three rows of tabs, ever. The registry rejects a fourth level, `FolderStack` rejects a fourth row, and an Overview never opens another row.
- A deeper page, such as a future `/cv/research/projects/example-project/`, is a content route registered with its owning folder (D-039), and shows in that folder's body. Ownership is explicit and validated. A URL prefix never makes a page valid, and an unknown path is never built.

### Pages

Every folder page uses `FolderPage` (`src/layouts/FolderPage.astro`). It resolves the page's own URL, sets the category and the environment, and draws the folders around the page's content, so no page builds its own rows. Until the content prompts, the content is `ScaffoldContent`: a labelled development placeholder that names the folder and invents nothing.

## 15. Folder previews (P07)

### Open and previewed folders

| | An **open** folder | A **previewed** folder |
| --- | --- | --- |
| Comes from | The page's URL, at build time | Pointer hover or keyboard focus, in the page |
| Looks like | A raised tab with the V, joined to its body, with its row of children below | An index card of its contents hanging from its tab, in the tab's own category (its level-2 cardstock); the tab keeps its hover color |
| Changes | The URL, the selection, `aria-current`, the page's category and environment | Nothing: no URL, history entry, selection, V, category or environment change |
| Lasts | As long as the page | Until the pointer and focus leave it, Escape, another preview or navigation |

A previewed folder never looks open: it gets no V, no body and no row of tabs. Only one preview is visible at a time (D-058).

### What a preview holds

- **Immediate children only.** A folder's Overview, then its registered children in registry order: exactly the row that opens below it on its own page, built from the same display tabs (PREV-001, PREV-007). Never grandchildren, articles or other content routes, and never an inferred folder from a URL prefix.
- **Overview** links to the folder's own canonical path, like the Overview tab (D-051): there is no `/overview/` URL.
- **No recursion.** An item is a plain link; hovering it opens nothing. Its own contents appear in its row once its page is open (PREV-006).

| Hover over | Preview |
| --- | --- |
| CV, from another section | Overview, Teaching, Research, Publications, Talks / Presentations, Mentoring / Supervision, Awards & Honors, Service, Outreach / Public Engagement |
| Lecture Notes | Overview, Bearnard's Trail, The Greenhouse, Berries, Timber Logs |
| Writing, from `/cv/research/` | Overview, Months' Original, Kosmos Series, Book Club; CV and Research stay selected |
| A second-level folder with registered children | Its Overview and its third-level folders (none are approved; the synthetic fixture in case H of the folder study shows it) |
| Kosmos Series, or any folder without children | None |
| About, Contact or any other leaf | None; normal hover feedback only |
| An open folder, such as CV on `/cv/` | None: its children are already the row below it |

### Interaction

- **Pointer:** a mouse or pen over an eligible tab opens its preview; moving into the card keeps it open; leaving both closes it after 120 ms. Moving to another eligible tab switches after 90 ms (D-060).
- **Keyboard:** Tab to an eligible tab's link opens its preview without moving focus. The next Tab reaches its links, then the next tab. Enter follows a link. Escape closes it, returning focus to the tab if it was inside, and it stays closed until focus leaves the tab. Focus is never trapped.
- **Touch:** ignored. A tap opens the tab's page, whose row shows its children: every destination stays one tap away without a preview.
- **Without JavaScript** or without the Popover API, previews never show and every link works as before (PREV-013).

### Selection invariants

1. The URL alone decides the open folders, `aria-current`, the page's category and the environment. Preview code never reads or writes them.
2. Previews are data built beside the selection, never from it: a folder previewed from any page shows the same items.
3. A preview item is a real destination; following it is ordinary navigation, after which the folders follow the new URL.

## 16. Navigation on small screens (P08)

The navigation is the same on every screen: the same rows, tabs, Overview, selection, previews and links. Only the layout adapts (D-064).

- **Rows scroll sideways.** A row wider than its folder scrolls inside the folder; the page never does. Every tab stays in the registry's order with its full label, and every row of an open folder stays visible: on a phone `/cv/research/` still shows the global row with CV selected and CV's row with Research selected.
- **The selected tab is revealed.** Each row opens with its selected tab in view: Home, CV, Writing or Bearnard's Area on the global row, and the selected child below it. A tab already in view is not moved. Selection still comes only from the URL; revealing it moves a row, never the page, focus or the URL (D-066).
- **Parents and Overview.** Unchanged: a parent's page selects its Overview, which leads its row, and Overview links to the parent's own URL.
- **Three levels on a phone.** All three rows stay, each revealing its selected tab; nest insets shrink to 4 px, so the deepest paper keeps about three quarters of a 320 px screen. Deeper pages still open in the third folder's body, never as a fourth row.
- **Touch.** A tap on a tab opens its page (CV → `/cv/`, Research → `/cv/research/`, Overview → its parent's URL); a horizontal swipe scrolls the row without opening anything; previews never open from touch. Under a coarse pointer every tab is at least 44 px tall.
- **Keyboard.** Tab moves through the tabs in order, row by row; a focused tab scrolls into view clear of the edge fades, with its focus ring visible; Enter follows it; previews open, are traversed and close with Escape as in P07. There is no arrow-key model and no roving tabindex: these are links between pages.
- **Without JavaScript.** Rows still scroll by touch, trackpad and Shift + wheel, and every tab is still a link. Chromium still opens rows at their selected tab; other browsers open them at their start.

| Page on a 390 px phone | Global row | Second row |
| --- | --- | --- |
| `/` | Home, in view at the start | — |
| `/cv/` | CV, centred | Overview, in view at the start |
| `/cv/research/` | CV, centred | Research, centred |
| `/bearnards-area/powerlifting/` | Bearnard's Area, at the end | Powerlifting, centred |

## 17. Canonical records behind the sections (P11)

P11 added the data that the research sections will present, and no navigation: the eleven tabs, the 25 folders and their URLs are unchanged, and no record has a page (D-083 to D-088; `planning/content-model.md`).

| Section | What it will read | Through |
| --- | --- | --- |
| CV and its folders (Teaching, Research, Publications, Talks, Mentoring, Awards, Service, Outreach) | One person's appointments, education, projects, outputs and activities, each in its own chronological order | `cvProjection(records, personId)` |
| Portfolio | The projects, with their people, organizations, links and outputs | `portfolioProjection(records)` |
| Lab and its folders (People, Research Areas, Partners …) | Research areas with their projects and outputs, profiled people, the projects' organizations | `labProjection(records)` |
| Any publication list | Outputs, cited once and identically everywhere | `publications()` and `citationOf()` |
| Editorial entries (Lecture Notes, Blog) | The records an entry is about, and the entries about a record | `relatedRecords`, `entriesAbout()` |

- The CV's eight folders match the record families and activity types one to one, so each folder's page is a section of one projection, not a list of its own.
- A record never becomes a tab. If a project or a person gets a page, it will be a content route owned by a folder (section 8), added by a recorded decision.
- Until verified records exist, these pages are in preparation and say so (P17, section 18). The projections are shown, with invented data, only at `/_design/records/` and `/_design/page-states/`.

### The CV behind the CV section (P11-A01)

The author's versioned CV YAML is the source of the owner's professional history (D-089). It changes no navigation: no tab, folder, URL or page was added, and the CV section's nine pages are as they were.

| Folder of the CV section | Reads, once a version is approved |
| --- | --- |
| CV (Overview) | The profile (`siteCv.profile`), education and appointments |
| Research | Appointments, funding |
| Publications | Outputs, cited through `citationOf` |
| Teaching | Teaching activities |
| Talks | Presentations and participation in events |
| Mentoring | Mentoring activities |
| Awards | Awards |
| Service | Service activities |
| Outreach | Outreach activities |

- This table is a reading contract, not a design: which section shows what is decided when the CV pages are built.
- Training, certifications and skills have no folder of their own; where they appear is open (question below).
- A downloadable CV, academic or industry, will be another presentation of the same records. None exists.
- Nothing of the CV is on the site today: no version is approved (`cv/manifest.json`).

## Open questions

- The third-level folders (section 3).
- P08 never hides a selected folder's row, so an open folder still never needs a preview. If a later design ever does hide one, whether its tab should then preview its contents needs deciding.
- How legacy URLs map to the new ones, and whether redirects are needed. The legacy site used `/{slug}/` for pages and `/blog/{slug}/` for posts (`_backup/pelican-legacy/pelicanconf.py`); `/blog/` posts fit the new Blog folder.
- Whether the slugs in sections 1–2 are final before first publication.
- Whether `astro.config.mjs` should enforce `trailingSlash: "always"`, now that section pages exist. Links use the trailing slash; the static host serves both forms.
- A designed 404 page that uses `resolve()`'s `context`: the polished content states belong to P17. Until then, unknown URLs get the host's default 404.
- Whether Overview should ever carry a section-specific label (for example "Contents" for a literary folder). P06 uses "Overview" everywhere.

## Development-only routes (P14)

`/_design/publishing/`, `/_design/publishing/workflow/` and `/_design/publishing/draft-example/` are the Publishing Workbench (D-110). They are not tabs, not folders and not part of the registry: they are pages inside the Greenhouse folder (selected like any Greenhouse page, so no fourth row or level appears), routed only in `npm run dev` and `npm run demo:build`. The Greenhouse Overview links to the first from its Development Demonstrations section, so the owner reaches it by clicking: Home → Lecture Notes → The Greenhouse → Publishing Workbench. A release build has none of them.

## Home (P15)

`/` is the entrance, not a folder with children: the global row is its only row, with Home selected. Its body links to the destinations that answer "where do I begin?" in three groups (research and engineering: Portfolio, CV, Lab; learning and explanation: Lecture Notes, Blog; writing and personality: Writing, Bearnard's Area), plus About, Contact and Schedule once each. This is a selection, not a second registry: labels and URLs come from the registry, and the groups are not colour categories. The page also holds the reserved nucleus stage, eight world-clock places and the newest three published Blog entries (D-112 to D-117). `/_design/home/` is a development specimen of the same page, not a route of the site (development and demonstration builds only).

## 18. Every destination has a page, and says what state it is in (P17)

All 36 registered folders (11 sections and 25 children; no third-level folder) have a built page (D-122 to D-125). The registry is still the only list: this section describes what the pages do, and the exact inventory (label, URL, parent, category, state, reason, whether its route is generated) is generated, not copied, by the development site map at `/_design/site-map/` ("Site Map & Page Coverage"; development and demonstration builds only, linked from the local homepage's development note and the Publishing Workbench's banner).

**Route ownership.** A registered folder owns its page. Editorial entries are content routes owned by their collection's folder and are never tabs (section 8). Home, About, Contact, Schedule, Portfolio and Blog have no children; the other five sections open a row whose first tab is the parent's Overview (section 14): a display tab linking to the parent's own URL, never a registry node and never a URL of its own. `/external/` is not a route (D-076); an unknown URL has no page and is not redirected to Home.

**Page states.** A page is in one of four presentation states: ready, empty, in preparation or unavailable. They describe pages, never articles (draft, published and archived are P10's), and are derived from the real source, never typed: a collection by its published entries, a records page by its verified records, a declared-planned page by the declaration in `src/site/destinations.ts`, a parent by its children.

| Section | Destinations | What the pages are now |
| --- | --- | --- |
| Core | Home; About, Contact, Schedule | Home is ready. The other three are in preparation: a purpose, an honest notice, no form, no address, no booking control |
| Research | Portfolio; CV and its 8 sections; Lab and its 6 | In preparation: they are filled from verified records and the owner's approved CV snapshot, and none exists yet. Join Us, Facilities and Resources are declared planned |
| Blog & Notes | Blog; Lecture Notes and its 4 collections | The five collections are empty (working, nothing published). The Lecture Notes Overview is ready: it guides the four collections |
| Writing | Writing and its 3 collections | The three collections are empty. The Writing Overview is ready |
| Bearnard | Bearnard's Area and its 4 pages | In preparation. The Overview shows his approved illustration; Photos, Videos, Powerlifting and Bear Life say what each is for and what is missing, and invent nothing |

**Contextual navigation.** A page may name up to three closely related folders (`related` in `src/site/destinations.ts`, as registry IDs, so labels and URLs come from the registry): Lab Research Areas to Portfolio, Portfolio to Lab, CV Research to Lab, Contact to Schedule. A parent's page also lists its children (`ChildGuide`) with what each is for and, in words, its state. No page links to every section, to an article that does not exist, or through a disabled card.

**Planned features.** Contact, Schedule, Join Us, Facilities, Resources and the four Bearnard pages are declared planned. Contact and Schedule do not pretend to work: P18 completes Contact, and booking waits for a provider (R-10, E-02).

## 19. Contact, downloads and a missing address (P18)

**Contact** (`/contact/`, Core, a leaf) lists the owner's approved public channels, grouped by use (general inquiries, research collaboration, professional opportunities, technical and project discussions), from `src/data/contact.ts` (D-126). That file is the only source: a channel needs an owner's approval date, and nothing found elsewhere in the repository counts. Today it is empty and the page says that direct contact details are being prepared. An email channel is a readable address and a plain `mailto:` link; a profile channel is an ordinary external link; neither forces a new tab. There is no form (GitHub Pages has no backend and no form service is chosen). **To add a channel**, add one entry to `src/data/contact.ts` (the file's comment shows the shape); the build fails for an invalid or unapproved one. A profile URL already held by a Person record stays in that record. Privacy: the CV's contact details and references are private and are never imported.

**Downloads** have no route and no tab (D-127). A download is shown where it belongs: CV documents on the CV Overview, others on a page whose `src/site/destinations.ts` entry has `downloads: "<category>"`. A new `/downloads/` route would be a deliberate IA decision, not a side effect. Files are served from `/downloads/<name>` (`public/downloads/`); the registry, validation and workflow are `development/downloads-guide.md`. Today none is approved, and the CV page lists the planned CV document as not yet available.

**A missing address** is not a destination. `404.html` (from `src/pages/404.astro`) is the page a static host serves, with a 404 status, for an address that matches no page (D-128). It is not in the registry, is never a tab and selects no folder. It is distinct from an empty collection or a page in preparation (section 18), which are real pages. `/external/` stays an unknown address and gets this page. Redirects are for known former URLs only, never to Home generally.
