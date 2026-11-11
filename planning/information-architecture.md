# Information architecture

Status: navigation model implemented in P04 (2026-11-10). The first and second levels are approved. **No third-level folder is approved yet**: the model supports a third level, and the final third-level site map will be settled in the content prompts. P05 added the physical folder components that draw this model (section 13); tabs are not links yet (P06).

Source of truth: `src/navigation/registry.ts` (data), `src/navigation/navigation.ts` (helpers) and `src/navigation/types.ts` (types). Tests: `tests/navigation.mjs` (NAV-001 to NAV-014).

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

Every tab, parent or leaf, has its own destination. Clicking CV opens the CV overview at `/cv/`, with CV's children shown as an open row with nothing selected yet. Clicking Research opens `/cv/research/`.

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
| `rows` | Rows to draw: each with its level, parent, tabs in order, and the `selectedId` carrying the V indicator (`null` when the row is open but unselected) |
| `environment` | The folder's semantic environment |

Examples:

| URL | Selection | Rows |
| --- | --- | --- |
| `/` | Home | 1: the global row, Home selected |
| `/cv/` | CV | 2: global row (CV); CV's children, none selected |
| `/cv/research/` | CV › Research | 2: global row (CV); CV's children (Research) |
| a level-3 page | three levels | 3, each with its selected tab |
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

## 12. Route generation: future responsibilities

The registry creates no pages: Astro routes come from `src/pages/` and, later, content collections. The contract:

1. **Section pages** (P05 onwards): each folder needs a page at its path, built from the registry, for example with one `getStaticPaths()` over `siteNavigation.nodes`. Those prompts should then make "every destination has a page" a build check.
2. **Content routes** (Wave III): collection entries become `ContentRoute`s at build time. They are passed to `createNavigation()` alongside the registry and generate their pages from the same list, so navigation and output cannot disagree.
3. **Build check, active now:** the smoke test fails if `dist/` contains a page that is not a registered destination. In P04, 1 of 37 destinations has a page: `/`, the P03 specimen.
4. **Not to do:** no catch-all route (`[...slug]`) that could swallow unknown paths or collide with collections; no server rendering; no client-side router.
5. **Design studies (P05):** temporary pages under `/_design/`, such as the folder study at `/_design/folders/`, are the only built pages outside the registry. No slug can start with `_`, so they can never collide with a folder. The smoke test lists them explicitly (D-048).

## 13. From navigation state to physical folders (P05)

The folder components in `src/components/folders/` draw what `resolve()` returns; they hold no navigation data of their own (D-043).

| Navigation model (P04) | Physical folders (P05) |
| --- | --- |
| `state.rows` | `<FolderStack rows={…}>`: one folder level per row, at most `MAX_TAB_LEVELS` |
| `row.level` | `data-level` on the level: its material, tab size and label size |
| `row.tabs`, in order | The row's tabs, labelled with `node.label` |
| `row.selectedId` | The selected tab: raised, joined to the open body, with the V; `aria-current="true"` on its label |
| `row.selectedId === null` (an open parent, such as `/cv/`) | All tabs inactive, rising from behind the page; no open body |
| The deepest folder | Its body holds the page's content on ivory paper; a content route deeper than level 3 is shown there too |
| `state.environment` | Set by the page (BaseLayout's `environment`, or a `data-environment` wrapper); the components never choose it |
| `node.path` | Not used yet: tabs become links to it in P06 |
| `preview(id)` | Not used yet: hover previews are P07 |

`FolderStack` fails the build if the rows are impossible: none, more than three, out of order, or not following the selected tab. A page therefore cannot draw a fourth level or a stack that disagrees with the registry. The folder study (`/_design/folders/`) builds its stacks from `siteNavigation.resolve()`. Its third level is a synthetic fixture (Projects, Themes, Datasets under CV › Research), made with `createNavigation()`, and is not added to the registry.

## Open questions

- The third-level folders (section 3).
- How tab previews work on touch screens and with the keyboard, where there is no hover (P07).
- How legacy URLs map to the new ones, and whether redirects are needed. The legacy site used `/{slug}/` for pages and `/blog/{slug}/` for posts (`_backup/pelican-legacy/pelicanconf.py`); `/blog/` posts fit the new Blog folder.
- Whether the slugs in sections 1–2 are final before first publication.
- Whether `astro.config.mjs` should enforce `trailingSlash: "always"` once section pages exist.
