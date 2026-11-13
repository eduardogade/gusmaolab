# Editorial test fixtures

SYNTHETIC FIXTURE for tests/editorial-build.mjs. It says nothing true about anyone's research or writing, and it is never published.

These files sit **outside** `src/content/` on purpose: nothing here is ever loaded by the
site. `tests/editorial-build.mjs` copies the project to a temporary directory, copies the
`good/` entries (or one `bad-*/` scenario) into that copy's `src/content/`, builds it there
and checks the output. The real `src/content/` and the real `dist/` are never touched.

- `good/`: valid entries for several collections, covering drafts, published and archived
  entries, Markdown features and collections left empty.
- `bad-duplicate-slug/`, `bad-date/`, `bad-missing-field/`, `bad-unknown-field/`,
  `bad-related-record/` (P11: a reference to a canonical record that does not exist):
  scenarios that must fail the build.
