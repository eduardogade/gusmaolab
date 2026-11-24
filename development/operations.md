# Operations guide

How GusmaoLab is built, checked, published, verified and recovered. It is written for the owner, and for any agent working on the owner's behalf. Where a step changes something public, it says so.

Status on 2026-11-24 (P24): the release machinery is prepared, but **the Astro site has not been published yet**. Until the first release, `www.gusmaolab.org` serves the old Pelican site. `development/p24-release.md` is the plan and the authorization request for that first release.

## 1. Where things live

| What | Where |
| --- | --- |
| Source | `github.com/eduardogade/gusmaolab` (public). Clone it with `git@github.com:eduardogade/gusmaolab.git` |
| Day-to-day work | branch `development` (D-035). Never commit to `main` directly |
| What is published | one named commit, by `.github/workflows/release.yml`, into `eduardogade/eduardogade.github.io` (branch `main`). GitHub Pages serves it at `www.gusmaolab.org` |
| Domain, DNS, HTTPS, mail | Cloudflare: proxied records, its edge certificate, Email Routing |
| Decisions | `development/decisions.md`. Plan: `development/roadmap.md`. Current state: `development/current-state.md` |

## 2. Develop and preview

```bash
npm ci                 # Node 26 (.node-version), from the lockfile
npm run dev            # http://localhost:4321, with drafts and the development pages
npm run build          # the release build in dist/ (no drafts, no demonstrations)
npm run preview        # http://localhost:4322, serving exactly dist/
```

A passing build is not a visual check. Look at the running site at 1440, 1280, 768 and 390 px.

## 3. Check

```bash
npm run verify         # diagnostics, the build, every unit suite (before every commit)
npm run qa:quick       # no browser: adds the audits and a reproducibility build
npm run qa             # everything, with headless Chrome (run on Node 26, not in a micromamba environment)
npm run release:check  # is dist/ fit to publish (metadata, boundary, no credential)
```

The results are PASS, FAIL, SKIPPED, DEFERRED, NOT RUN and FLAKY, and they are never converted into one another. The 19 Cal.com checks are DEFERRED, and the scientific checks SKIP where Quarto is absent (GitHub). `development/quality-assurance.md` explains the report.

Every push to `development` runs the **Quality Assurance** workflow: a static job and a browser job. Read it from the repository's Actions tab, or with `gh run list --branch development`. A failed run keeps its logs, and its browser screenshots, as artifacts for 14 days.

## 4. Publish an article

- Markdown: `npm run content:new`, then write, then `content:validate`, `content:preview`, `content:publish` (`development/authoring-guide.md`).
- Scientific (Quarto): `science/<dir>/<name>.qmd`, prepared with `npm run science:render` (`science/README.md`). Never run `science:execute` except on a document you named.

A published article appears on the site at the next **release**, not at the commit.

## 5. Release (deploy)

The workflow publishes only a commit that is on both `main` and `development`, and whose Quality Assurance run passed.

1. Bring `main` up to the commit you want to publish. Use a fast-forward, or a merge that keeps history, done in a separate worktree (`development/p24-release.md`, section 3). Never force-push, and never `git checkout main` in a working tree that holds the private CV folder.
2. Start the release, then approve the `production` environment when GitHub asks:
   ```bash
   gh workflow run release.yml --repo eduardogade/gusmaolab --ref main -f commit=<full SHA> -f confirm=www.gusmaolab.org
   ```
3. The run summary records the source commit, the Pages repository's commit before (**the rollback point**) and after, and the smoke test.

What it needs, set up once: a deploy key with write access to `eduardogade.github.io`, stored as the `production` environment's secret `PAGES_DEPLOY_KEY`, with the owner as required reviewer (`p24-release.md`, 7.0).

## 6. Verify a release

The workflow runs this itself, and anyone can run it again:

```bash
npm run build && npm run smoke -- https://www.gusmaolab.org --dist dist
```

It checks:

- every page answers 200 with its own canonical address;
- the assets load, and nothing is mixed content;
- the favicon, `robots.txt` and the sitemap;
- an unknown address gets the 404 page with the status 404;
- development and private paths are absent;
- HTTP redirects to HTTPS, and the bare domain redirects to `www`.

It cannot see rendering, running scripts, console errors or a screen reader. Look yourself, in Chrome, Firefox, Safari and on a phone.

## 7. Roll back

In a clone of `eduardogade/eduardogade.github.io`:

```bash
git revert --no-edit <deploy commit>
git push origin main
```

GitHub Pages rebuilds the previous tree within minutes. No DNS change is involved, and nothing in the source repository changes. Never delete the Pages repository's history: it is the rollback.

## 8. DNS, HTTPS and mail

- `gusmaolab.org` and `www` are proxied by Cloudflare. HTTPS is Cloudflare's edge certificate, so GitHub holds none, and that is expected.
- Keep Cloudflare's **Always Use HTTPS** on.
- The domain's MX, SPF and DMARC belong to Cloudflare Email Routing. A website change never needs a DNS change, so do not edit those records for one.
- If the site ever moves to GitHub Pages' own deployment (D-165, Option B), the custom domain moves too. Plan that as its own change, with its own rollback.

## 9. Contact

`src/data/contact.ts` is the only list (P18, D-164). An email channel is published only after its address receives a test message from an outside account. Record the date in D-164; the build validates the entry.

## 10. Scheduling (Cal.com, later)

`src/data/scheduling.ts` starts switched off. It is enabled only with the owner's real booking link and a dated attestation (`development/scheduling-guide.md`). The DEFERRED checks become real checks then.

## 11. Dependencies

- `npm` owns JavaScript and `package-lock.json` is committed. Update one dependency at a time, then run `npm run qa`.
- The workflows' actions are pinned to full commit SHAs with the version in a comment. Update a pin only from the action's own repository, never from an example:
  ```bash
  gh api repos/actions/checkout/git/ref/tags/<tag>
  ```
- Scientific Python lives only in the `gusmaolab-science` micromamba environment (`development/scientific-environment.md`).

## 12. What must never be published

These are absent from the build, and `npm run build`, `release:check` and the tests refuse them:

- the private CV working files (`cv/codex-yaml/`);
- the Bearnard masters (`brand/bearnard/`);
- drafts, demonstrations and development pages (`/_design/`);
- QA reports, scientific caches, and anything confidential.

`robots.txt` hides nothing: it is not access control. The repository itself is public, so commit only what may be public (ISSUE-0008).
