# Operations guide

How GusmaoLab is built, checked, published, verified and recovered: for the owner, and for any agent working on the owner's behalf. Where a step changes something public, it says so. The architecture is D-167 (P24A): **one repository, GitHub Pages' own deployment**.

## 1. Where things live

| What | Where |
| --- | --- |
| Source, and what is published | `github.com/eduardogade/gusmaolab` (public). `git@github.com:eduardogade/gusmaolab.git` |
| Day-to-day work | branch `development` (D-035); short-lived topic branches are fine |
| Releases | branch `main`, which only ever fast-forwards to a commit already on `development` |
| Publishing | `.github/workflows/release.yml` (manual) → GitHub Pages of this repository → `https://www.gusmaolab.org` |
| Domain, DNS, HTTPS, mail | Cloudflare: proxied records, its edge certificate, Email Routing. GitHub Pages holds the custom domain `www.gusmaolab.org` in this repository's Pages settings |
| Decisions, plan, state | `development/decisions.md`, `development/roadmap.md`, `development/current-state.md` |

`main` and `development` are protected by a repository ruleset: they cannot be deleted or force-pushed. Nothing else is required: no pull requests and no reviews, so normal work stays simple.

## 2. Develop and preview

```bash
npm ci                 # Node 26 (.node-version), from the lockfile
npm run dev            # http://localhost:4321, with drafts and the development pages
npm run build          # the release build in dist/ (no drafts, no demonstrations)
npm run preview        # http://localhost:4322, serving exactly dist/
```

A passing build is not a visual check: look at the running site at 1440, 1280, 768 and 390 px.

## 3. Check

```bash
npm run verify         # diagnostics, the build, every unit suite (before every commit)
npm run qa:quick       # no browser: adds the audits and a reproducibility build
npm run qa             # everything, with headless Chrome (Node 26, outside any micromamba environment)
npm run release:check  # is dist/ fit to publish (metadata, boundary, no credential)
```

The results are PASS, FAIL, SKIPPED, DEFERRED, NOT RUN and FLAKY, and they are never converted into one another. The 19 Cal.com checks are DEFERRED. The scientific checks SKIP where Quarto is absent (GitHub). Every push to `development` runs the **Quality Assurance** workflow (a static job and a browser job), which never deploys. A failed run keeps its logs, and the browser job's screenshots, for 14 days: see the Actions tab, or `gh run list --branch development` then `gh run view <id> --log-failed`.

## 4. Publish an article

- Markdown: `npm run content:new`, then write, then `content:validate`, `content:preview`, `content:publish` (`development/authoring-guide.md`).
- Scientific (Quarto): `science/<dir>/<name>.qmd`, prepared with `npm run science:render` (`science/README.md`). Never run `science:execute` except on a document you named.

A published article appears on the site at the next **release**, not at the commit.

## 5. Release

1. Pick the commit: the newest one on `development` whose Quality Assurance run passed.
2. Fast-forward `main` to it, with no merge, force or checkout needed: `git push origin <full SHA>:main`.
3. Start the release:

   ```bash
   gh workflow run release.yml --repo eduardogade/gusmaolab --ref main -f commit=<full SHA> -f confirm=www.gusmaolab.org
   ```

   The workflow refuses a commit that is not on both branches or has no green QA run. It then runs the quick QA, builds, checks the build, uploads it as the Pages artifact, deploys it, and smoke-tests the live site until it serves exactly that build.
4. Read the run's summary: the source commit, the deployment URL and the run link. GitHub also lists the deployment under the repository's **Environments → github-pages**.

## 6. Verify a release

The workflow does this itself, and anyone can repeat it:

```bash
npm run build && npm run smoke -- https://www.gusmaolab.org --dist dist
```

It checks:

- every page answers 200 with its own canonical address;
- the assets load, and nothing is mixed content;
- the favicon, `robots.txt` and the sitemap;
- an unknown address gets the 404 page, with Bearnard, and the status 404;
- development and private paths are absent;
- HTTP redirects to HTTPS, and the bare domain redirects to `www`.

It cannot see rendering, running scripts, console errors or a screen reader. Look yourself in Chrome, Safari and on a phone.

## 7. Roll back

Run the release again with the **previous** release's commit, taken from the earlier run's summary or the `github-pages` environment's history. GitHub Pages serves that build within minutes. No DNS change is involved, and nothing in Git needs undoing.

To return to the old Pelican site (an emergency only; its URLs and its exposed old files would come back):

1. Unarchive `eduardogade/eduardogade.github.io`.
2. Remove the custom domain from this repository's Pages settings.
3. Set the custom domain of that repository's Pages to `www.gusmaolab.org`. Its Pages were never switched off: GitHub does not allow it for a user site through the API, so it still serves the old copy at `eduardogade.github.io`.

Its last site commit is `dc0cb6c`, tagged `pelican-final`. GitHub added "Delete CNAME" (`da20865`) on top when the domain moved, and setting the domain again restores the file.

## 8. DNS, HTTPS and mail

- `gusmaolab.org` and `www` are proxied by Cloudflare, and visitors get Cloudflare's certificate. GitHub cannot issue its own while the records are proxied, which is expected. Leave GitHub's "Enforce HTTPS" off, and leave Cloudflare's SSL mode as it is.
- Cloudflare's **Always Use HTTPS** sends plain HTTP to HTTPS. The smoke test's SMOKE-09 checks it. At the first release it was off, so SMOKE-09 failed.
- Cloudflare adds two things at its edge, outside the build:
  - its **Web Analytics** beacon, in pages served to browsers;
  - its **managed robots.txt** rules, before the site's own `robots.txt`.

  Both are Cloudflare settings. The smoke test's byte comparison does not see the beacon, because it is injected only for browsers.
- The domain's MX, SPF and DMARC belong to Cloudflare Email Routing. A website change never needs a DNS change, so do not edit them for one.

## 9. Contact and scheduling

Contact is the owner's nine profiles in `src/data/contact.ts` (D-164). An email address is added only by the owner's decision, and P24A runs no email test of any kind. Scheduling (`src/data/scheduling.ts`) stays switched off until the owner supplies a real booking link (`development/scheduling-guide.md`). Its 19 checks stay DEFERRED.

## 10. Brand assets

- `brand/` holds sources.
- `brand/favicon.ico` is the favicon's one source. `public/favicon.ico` is its 16/32/48 px derivative: after changing the source, run `npm run favicon`. REL-016 fails if they disagree.
- `brand/bearnard/` holds the Bearnard masters. It is ignored by Git, inventoried in `assets/bearnard/`, and never published. Derivatives come only from `scripts/bearnard_derivatives.py` (`assets/bearnard/README.md`).
- The 404 page shows one of three slots at random, `NOT_FOUND_SLOTS` in `src/illustrations/bearnard.ts` (D-169). All three hold the portrait until the owner chooses three images: register the approved illustration, then put its ID in a slot.

## 11. Dependencies

- `npm` owns JavaScript, and `package-lock.json` is committed. Update one dependency at a time, then run `npm run qa`.
- Workflow actions are pinned to full commit SHAs with the version in a comment. Update a pin only from the action's own repository:

  ```bash
  gh api repos/<owner>/<action>/git/ref/tags/<tag>
  ```

## 12. What must never be published

These are absent from the build, and `npm run build`, `release:check` and the tests refuse them:

- the private CV working files (`cv/codex-yaml/`);
- the Bearnard masters;
- drafts, demonstrations and development pages (`/_design/`);
- QA reports, scientific caches, and anything confidential.

`robots.txt` is not access control. The repository is public, so commit only what may be public. Old private files remain in Git history (ISSUE-0003, ISSUE-0008); that is accepted by the owner and not undone by a release.
