# Information architecture

Status: navigation model implemented in P04 (2026-11-10). The first and second levels are approved. **No third-level folder is approved yet**: the model supports a third level, and the final third-level site map will be settled in the content prompts. P05 added the physical folder components that draw this model (section 13). P06 (2026-11-11) made the tabs links, generated a page for every folder from the registry, and added the Overview tab (section 14).

Source of truth: `src/navigation/registry.ts` (data), `src/navigation/navigation.ts` (helpers) and `src/navigation/types.ts` (types). Tests: `tests/navigation.mjs` (NAV-001 to NAV-021, NAV-025) and `tests/routes.mjs` (NAV-022, NAV-023, NAV-026 to NAV-032). NAV-024, Back and Forward, is checked in a browser.

## 1. Top-level sections (approved)

Twelve tabs on the global row, in this order:

| # | Label | ID | URL | Environment |
| ---: | --- | --- | --- | --- |
| 1 | Home | `home` | `/` | Core |
| 2 | About | `about` | `/about/` | Core |
| 3 | Blog | `blog` | `/blog/` | Core |
| 4 | Portfolio | `portfolio` | `/portfolio/` | Scientific |
| 5 | Contact | `contact` | `/contact/` | Core |
| 6 | External | `external` | `/external/` | Core |
| 7 | Schedule | `schedule` | `/schedule/` | Core |
| 8 | CV | `cv` | `/cv/` | Scientific |
| 9 | Lab | `lab` | `/lab/` | Scientific |
| 10 | Lecture Notes | `lecture-notes` | `/lecture-notes/` | Technical |
| 11 | Writing | `writing` | `/writing/` | Literary |
| 12 | Bearnard's Area | `bearnards-area` | `/bearnards-area/` | Personal |

The labels are authoritative. The URLs are the brief's recommended values, adopted unchanged in P04.

## 2. Second-level folders (approved)

| Parent | Children (in order) and URLs |
| --- | --- |
| CV | Teaching `/cv/teaching/` · Research `/cv/research/` · Publications `/cv/publications/` · Talks / Presentations `/cv/talks/` · Mentoring / Supervision `/cv/mentoring/` · Awards & Honors `/cv/awards/` · Service `/cv/service/` · Outreach / Public Engagement `/cv/outreach/` |
| Lab | People `/lab/people/` · Join Us `/lab/join-us/` · Research Areas `/lab/research-areas/` · Facilities `/lab/facilities/` · Partners `/lab/partners/` · Resources `/lab/resources/` |
| Lecture Notes | Bearnard's Trail `/lecture-notes/bearnards-trail/` · The Greenhouse `/lecture-notes/greenhouse/` · Berries `/lecture-notes/berries/` · Timber Logs `/lecture-notes/timber-logs/` |
| Writing | Months' Original `/writing/months-original/` · Kosmos Series `/writing/kosmos/` · Book Club `/writing/book-club/` |
| Bearnard's Area | Photos `/bearnards-area/photos/` · Videos `/bearnards-area/videos/` · Powerlifting `/bearnards-area/powerlifting/` · Bear Life `/bearnards-area/bear-life/` |

That is 25 second-level folders, 37 tabs in all. Home, About, Blog, Portfolio, Contact, External and Schedule have no child folders: they display their own content. Blog is a publication collection, so its articles arrive as content routes (section 8), not tabs.

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

1. The global row: the twelve sections.
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
| `rows` | Rows to draw: each with its level, parent, display tabs in order (a child row starts with its parent's Overview), and the `selectedId` carrying the V indicator. Every row has one (P06). |
| `currentTabId` | The tab that stands for the page itself, which gets `aria-current="page"`; `null` on a content page |
| `environment` | The folder's semantic environment |

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

Content routes are registered explicitly: `{ path, owner }`, where `owner` is the ID of the folder whose body displays the page. For example, `/lecture-notes/berries/some-article/` is owned by `lecture-notes-berries`. It is a page, but Berries' tab stays selected and no new tab appears.

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

The registry stores no interaction state. Selection comes from the URL. Pointer hover and keyboard focus are transient state owned by the tab components (P07), described by the `TabInteraction` type. Keyboard users will need an equivalent way to discover children; P07 decides how.

## 11. Environment inheritance

A tab's environment is its own, or else its parent's; a top-level tab without one is `core`. CV, Lab and Portfolio are scientific; Lecture Notes technical; Writing literary; Bearnard's Area personal; the rest core. Children inherit unless overridden. The registry names environments only; colors and type live in `src/styles/environments.css`. A page sets the environment through BaseLayout's `environment` prop, which adds `data-environment` (`core` means no attribute).

## 12. Route generation (P06)

The registry creates no pages by itself. Pages come from Astro route files that read it (D-053):

1. **Folder pages (P06):** one route file per tab level, so the routes follow the three visible levels exactly.

   | Route file | Pages |
   | --- | --- |
   | `src/pages/index.astro` | Home, `/` |
   | `src/pages/[section]/index.astro` | The 11 other level-1 folders |
   | `src/pages/[section]/[folder]/index.astro` | The 25 level-2 folders |
   | `src/pages/[section]/[folder]/[subfolder]/index.astro` | Level-3 folders: none until one is approved |

   Each lists `siteNavigation.folderStaticPaths(level)`, so a page exists for exactly the registered folders, and adding a folder to the registry is enough to build its page. No page file is maintained by hand per section.
2. **Content routes (Wave III):** collection entries become `ContentRoute`s at build time. They are passed to `createNavigation()` alongside the registry, and generate their pages from the same list, so navigation and output cannot disagree. Their route files sit under a static segment (for example `src/pages/blog/…`), which outranks the dynamic folder routes. They build only the pages below their owner, never the owner's own page.
3. **Build checks, active now:** the smoke test fails if `dist/` holds a page that is not a registered destination or a declared study, or if a registered destination has no page. In P06, 37 of 37 destinations have a page. `tests/routes.mjs` checks every page's folders, links, environment and landmarks.
4. **Not to do:** no catch-all route (`[...slug]`) that could swallow unknown paths or collide with collections; no server rendering; no client-side router. An unknown URL has no file, so the static host answers 404.
5. **Design studies (P05, P06):** temporary pages under `/_design/` are the only built pages outside the registry: the P03 tokens specimen at `/_design/tokens/` (moved from `/` in P06, D-055) and the folder study at `/_design/folders/`. No slug can start with `_`, so they can never collide with a folder. The smoke test lists them explicitly (D-048).

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
| `state.environment` | Set by `FolderPage` through BaseLayout's `environment`, or by a `data-environment` wrapper in a study; the components never choose it |
| `preview(id)` | Not used yet: hover previews are P07 |

`FolderStack` fails the build if the rows are impossible: none, more than three, out of order, not following the selected tab, a row without a valid selection, an Overview out of place, or a row below an Overview. A page therefore cannot draw a fourth level, an unselected row, or a stack that disagrees with the registry. The folder study (`/_design/folders/`) builds its stacks from `siteNavigation.resolve()`. Its third level is a synthetic fixture (Projects, Themes, Datasets under CV › Research), made with `createNavigation()`, and is not added to the registry.

## 14. Overview tabs and folder pages (P06)

### Navigation nodes and display tabs

The registry holds **navigation nodes**: folders with an ID, label, slug and children. A row of tabs on screen holds **display tabs**, built from those nodes by the resolver:

| Display tab | What it is | Links to |
| --- | --- | --- |
| `NodeTab` (`kind: "folder"`) | A registered folder | Its own path |
| `OverviewTab` (`kind: "overview"`) | The open parent's own page, drawn first in the parent's row of children | The parent's own path |

The Overview is a presentation, not data (D-051). It has no slug, no URL of its own and no page of its own, and it is never added to the registry. Its ID, `overview:<parent ID>`, can never be a node ID. It never has an Overview of its own, and no row opens below it. The registry's uniqueness rules are unchanged: 37 nodes, 37 paths, 37 pages.

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

Every folder page uses `FolderPage` (`src/layouts/FolderPage.astro`). It resolves the page's own URL, sets the environment, and draws the folders around the page's content, so no page builds its own rows. Until the content prompts, the content is `ScaffoldContent`: a labelled development placeholder that names the folder and invents nothing.

## Open questions

- The third-level folders (section 3).
- How tab previews work on touch screens and with the keyboard, where there is no hover (P07).
- How legacy URLs map to the new ones, and whether redirects are needed. The legacy site used `/{slug}/` for pages and `/blog/{slug}/` for posts (`_backup/pelican-legacy/pelicanconf.py`); `/blog/` posts fit the new Blog folder.
- Whether the slugs in sections 1–2 are final before first publication.
- Whether `astro.config.mjs` should enforce `trailingSlash: "always"`, now that section pages exist. Links use the trailing slash; the static host serves both forms.
- A designed 404 page that uses `resolve()`'s `context`: the polished content states belong to P17. Until then, unknown URLs get the host's default 404.
- Whether Overview should ever carry a section-specific label (for example "Contents" for a literary folder). P06 uses "Overview" everywhere.
