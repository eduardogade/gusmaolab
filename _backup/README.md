# Legacy archive

`pelican-legacy/` holds the GusmaoLab website as it was built with Pelican. It was moved here unchanged in P01 (2026-11-10) with `git mv`.

- **Source state:** `main` at `6eedf02`, tagged `pre-astro-checkpoint`.
- **Not a build input.** Nothing here is part of the Astro site. The pre-commit hooks skip `_backup/` so these files stay byte-for-byte as archived.
- **Deployment retired.** `pelican-legacy/.github/workflows/deploy.yml` is the old GitHub Pages workflow. GitHub only runs workflows from the root `.github/workflows/`, so it is inactive here.
- **Flex theme:** a Git submodule at `pelican-legacy/themes/Flex`, pinned to `bbf8768`.
- **Restore:** check out the tag (`git switch -c restore-pelican pre-astro-checkpoint`), or move files back with `git mv`.

The relative layout is unchanged, so running Pelican from inside `pelican-legacy/` should work. This was not tested in P01; Pelican is not installed in the default shell.

Do not edit, reformat or delete files here. Copy what a new feature needs into the new site instead.
