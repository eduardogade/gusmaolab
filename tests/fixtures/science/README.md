# Scientific-article test fixtures

SYNTHETIC FIXTURE for tests/science.mjs and tests/science-execute.mjs. It says nothing true about
anyone's research, and it is never published.

- `source/`: two Quarto sources, laid out as `science/` is (a Greenhouse article with code, a
  bibliography and cross-references; a draft Trail lesson with no code).
- `generated/`: what scripts/science.mjs made from them, exactly: the manifest, the articles, the
  figures and the two entries. tests/science.mjs builds a throwaway copy of the site with these in
  place. tests/science-execute.mjs, where Quarto is installed, regenerates them from `source/`
  and compares the result, so this folder cannot drift from the tool.

Regenerate with: `node tests/fixtures/science/regenerate.mjs` (needs Quarto and Python with the
packages in environments/science/requirements.txt; set SCIENCE_PYTHON).
