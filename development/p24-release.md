# P24 — Release plan and production release authorization request

Prepared 2026-11-24 on `development`, starting from `1bbcfa9` (equal to `origin/development`, tree clean except two files the owner had just added to `brand/`). Everything below about GitHub, DNS and the live site was **read**, not changed: no setting, branch, DNS record, deployment or Pages repository was touched. The decisions are D-163 (release metadata), D-164 (the public profiles) and D-165 (the release architecture, **proposed**, awaiting the owner).

**Status: P24 RELEASE CANDIDATE READY — OWNER CUTOVER AUTHORIZATION PENDING.** Update, same day: on the owner's decision about ISSUE-0008, the reconciliation of section 3 was carried out (D-166); `main` and `development` are both `58fcc3b` or its descendants, and production is unchanged. The cutover also waits on owner-side setup (section 7.0) and on the owner's choice about an email address (section 10).

---

## 1. Git state at the start (2026-11-24)

| Ref | Commit | Note |
| --- | --- | --- |
| `development` = `origin/development` | `1bbcfa9` | the accepted P23 close-out |
| `origin/main` | `33cd424` | the repository's default branch; **not protected**, no ruleset |
| local `main` | `ffafcd3` | one commit never pushed (`add untracked files`), two behind `origin/main` |
| merge base of `origin/main` and `origin/development` | `6eedf02` | 2026-11-10, where P01 began |
| divergence | `origin/main` 10 commits, `origin/development` 65 | `git rev-list --left-right --count origin/main...origin/development` |
| tags | `pre-astro-checkpoint` | untouched |
| other remote branches | 22 | heads of merged pull requests and older work; untouched |

The repository's canonical name is `eduardogade/gusmaolab` (GitHub's API `full_name`); the old capitalisation `eduardogade/GusmaoLab` is redirected. The local remote now uses the canonical URL (`git remote set-url`, local configuration only; fetch and push verified).

## 2. What `main` has that `development` does not

| Commit or group | Branch | Purpose | Disposition | Rationale |
| --- | --- | --- | --- | --- |
| `d87b444`, merged by `757c95d` (#124) | `origin/main` | sample algorithm files in `__bak9/` | keep in history; not in the site | removed again by `6036137` |
| `6036137` | `origin/main` | removes `__bak9/` ("mistake") | keep in history | net change zero |
| `277dec8`, merged by `e28d43a` (#125) | `origin/main` | sample files in `__frag8/` | keep in history; not in the site | deleted again by `1e1c52b` |
| `4c19654`, merged by `1661041` (#126) | `origin/main` | sample files in `__tmp2/` | keep in history; not in the site | deleted by `1e1c52b`. `1661041` is the last commit the live site was built from (Pelican, 2026-11-13) |
| `1e1c52b` ("GusmaoLab Astro V0.1", owner) | `origin/main` | commits generated output and local working files: `.astro/`, `dist-demo/`, `science/_build/`, `science/.quarto/`, `cv/codex-yaml/`; deletes `__frag8/`, `__tmp2/`; moves `themes/` | keep in history; **remove every one of these paths from the tip** | `development` ignores all five folders on purpose (generated, or private: AGENTS.md). The Pelican deploy run on it failed, so nothing was published from it. See the private finding in the owner's report |
| `5341dcc`, merged by `33cd424` (#127) | `origin/main` | sample files in `__mods6/` | keep in history; remove from the tip | not part of the website; its deploy run failed |
| `ffafcd3` | local `main` only | refreshes `.astro/` and `dist-demo/` | leave local and unpushed | generated output; never push it |
| `6eedf02..development` (65 commits, P01–P23, plus P24) | `development` | the Astro site | **the release content** | accepted by the owner |

A trial merge (a throwaway worktree, since removed) showed that `origin/main` merges into `development` **without a conflict**. It adds exactly 167 files and changes nothing else: 17 in `.astro/`, 9 in `__mods6/`, 16 in `cv/codex-yaml/`, 86 in `dist-demo/` and 39 in `science/`. With those removed, the merged tree is **byte-identical** to `development`'s tree (`git write-tree` equal to `development^{tree}`, `81094e1`). The legacy Pelican workflow (`.github/workflows/deploy.yml`) is on `main` only. `development` archived it in P01 (`e33e333`), and the merge removes it from `main`.

## 3. Reconciliation (**done 2026-11-24, D-166**: merge `58fcc3b`, `main` fast-forwarded to it)

The strategy is a merge that keeps both histories and makes `main` a fast-forward. It is never a reset, a rebase or a force push.

```bash
git fetch origin
# A separate worktree, never this checkout: checking out main here would overwrite ignored local files
# (the private CV working folder among them) with main's older copies.
git worktree add --detach ../gusmaolab-reconcile origin/development
cd ../gusmaolab-reconcile
git merge --no-ff --no-commit origin/main
git rm -r -q .astro __mods6 cv/codex-yaml dist-demo science/.quarto science/_build
test "$(git write-tree)" = "$(git rev-parse origin/development^{tree})"   # the release content is development's, exactly
git commit -m "merge: reconcile main into development, keeping development's tree [P24]"
git merge-base --is-ancestor origin/main HEAD && git merge-base --is-ancestor origin/development HEAD
git push origin HEAD:development        # fast-forward; Quality Assurance runs on it
# after Quality Assurance passes on that commit:
git push origin HEAD:main               # fast-forward; no deploy.yml, so no Pelican run
cd - && git worktree remove ../gusmaolab-reconcile && git pull --ff-only
```

Preconditions:

- **Stop new pull requests into `main` until the cutover.** Four merges arrived there between 2026-11-10 and 2026-11-17. Whatever produces them must pause, or the merge must be redone. The release workflow refuses a commit that is not on both branches.
- Never `git checkout main` in the owner's working tree (see the comment above). Since D-166 `origin/main` no longer holds the private files; the local `main` (`ffafcd3`, never pushed) still does, so never check it out or push it.
- The private files stay in `main`'s **history** after the merge. Removing them from history means rewriting the public default branch, which is the owner's decision alone (owner's report).

## 4. The production site today (read on 2026-11-24)

| Layer | Fact |
| --- | --- |
| Source | `eduardogade/gusmaolab`, `main`, `.github/workflows/deploy.yml`: Pelican on every push to `main`, then `peaceiris/actions-gh-pages@v4` with the personal access token secret `PAGES_DEPLOY_TOKEN`, **`force_orphan: true`**, into `eduardogade/eduardogade.github.io`. The last successful run was on `1661041` (2026-11-13); the runs on `1e1c52b` and `33cd424` failed. |
| Pages repository | `eduardogade/eduardogade.github.io` (public user site), branch `main`, path `/`, legacy build, `CNAME` = `www.gusmaolab.org`, `.nojekyll` present. **One commit only**, `dc0cb6c`, because of the orphan force-push. GitHub has no certificate for it, and `https_enforced` is false. No deploy key. |
| Source repository Pages | none (`has_pages: false`) |
| DNS | Cloudflare (`adel`/`andronicus.ns.cloudflare.com`), proxied A and AAAA for both `gusmaolab.org` and `www`. MX is Cloudflare Email Routing; SPF `include:_spf.mx.cloudflare.net ~all`; DMARC `p=none` |
| HTTPS | Cloudflare's edge certificate (Google Trust Services, `gusmaolab.org` and `*.gusmaolab.org`, valid until 2027-02-08) |
| Behaviour | `https://www.gusmaolab.org/` 200 (Pelican). `http://www.gusmaolab.org/` **200, not redirected**. `gusmaolab.org` 301 to `www` (GitHub). `/favicon.ico` 404, `/sitemap.xml` 404, `/robots.txt` 200. The three recruiter-era files of ISSUE-0003 answer 200 (status only, not opened). |

## 5. The proposed architecture (D-165)

**Option A, recommended:** keep the Pages repository, and publish to it from a new manual workflow.

- `.github/workflows/release.yml`, `workflow_dispatch` only. The owner types the full commit SHA and the domain.
  - **candidate** job, with no secret: checks that the commit is on both `main` and `development`, and that Quality Assurance passed on it. Runs `qa:quick`, then `npm run build`, then `scripts/release-check.mjs`, and keeps the artifact.
  - **publish** job, in the `production` environment: clones the Pages repository with a deploy key and replaces its tree with the artifact plus `CNAME` and `.nojekyll`. It commits **on top of** the previous site (never an orphan, never a force push), pushes, then runs `scripts/smoke.mjs` until the live site serves exactly the build.
- No DNS change and no custom-domain move: the domain stays where it is today.
- The credential is a deploy key for one repository in place of a personal access token. The legacy token can be retired after the release.
- Rollback is one `git revert` in the Pages repository (section 8).

**Option B, later:** GitHub Pages' own artifact deployment from `eduardogade/gusmaolab`. That means moving the custom domain from the user-site repository to this one, which takes the site down until the move completes and makes rollback a second domain move. It removes the second repository and the key. Better done once Option A has proven the build, if ever. **Not chosen now.**

Things to know:

- The workflow can be dispatched only once `release.yml` is on `main` (GitHub requires it on the default branch), so it waits for the reconciliation anyway.
- Pushes made with a deploy key normally start a Pages build. That is **expected, and verified only at the first release** (SMOKE-00 waits for it).

## 6. The release candidate

- **Source:** the P24 commit on `development` once pushed, and after the reconciliation the merge commit that holds the same tree.
- **Build:** `npm run build` on Node 26 from the lockfile. It writes 37 pages: 36 folder destinations and the 404 page. No published editorial entry exists yet.
- **Other files:** `favicon.ico`, `robots.txt`, `sitemap.xml`, the `_astro/` bundle and two Bearnard derivatives.
- **Sitemap:** Home and the folder pages whose state is `ready` (4 today). An empty or in-preparation page stays linked and crawlable but is not advertised (D-163).
- **Checks:** `scripts/release-check.mjs` passes on the build. `scripts/smoke.mjs` passes 9 of 9 against a local `astro preview` of it.

## 7. Cutover runbook (only after the owner's authorization)

**7.0 Owner setup, once:**

1. Make a deploy key, then delete the local private key file:
   `ssh-keygen -t ed25519 -N "" -C "gusmaolab release" -f pages_deploy`
2. In `eduardogade/eduardogade.github.io` → Settings → Deploy keys, add `pages_deploy.pub` with **write access**.
3. In `eduardogade/gusmaolab` → Settings → Environments, create `production`:
   - **required reviewer**: the owner;
   - deployment branches: `main` only;
   - environment secret `PAGES_DEPLOY_KEY` = the private key.
4. Cloudflare → SSL/TLS → Edge Certificates: turn on **Always Use HTTPS** (SMOKE-09 fails without it). This is not a DNS change.
5. Pause whatever opens pull requests into `main`.

**7.1** Preserve the current site outside GitHub. Run this somewhere outside the project:
`git clone https://github.com/eduardogade/eduardogade.github.io.git` then `git -C eduardogade.github.io bundle create ../pelican-site-dc0cb6c.bundle --all`

**7.2** Reconcile (section 3), and wait for Quality Assurance on the merge commit.

**7.3** Dispatch the release, then approve the `production` environment when GitHub asks:
`gh workflow run release.yml --repo eduardogade/gusmaolab --ref main -f commit=<merge SHA> -f confirm=www.gusmaolab.org`

**7.4** Read the run summary: the Pages commit before and after, and the smoke result.

**7.5** Check the site yourself: Chrome, Firefox, Safari, a phone, VoiceOver (section 11).

**7.6** Record the run ID and both Pages commits in `development/current-state.md`. After a quiet week, delete the `PAGES_DEPLOY_TOKEN` secret.

## 8. Rollback

**Triggers:**

- the domain is unreachable, or a wrong site is served;
- the primary navigation or CSS is broken, or major assets are missing;
- the custom domain is wrong;
- private content is exposed;
- any FAIL in the workflow's smoke test that the owner does not accept.

**Procedure (no DNS, no domain move, nothing destructive):**

```bash
git clone git@github.com:eduardogade/eduardogade.github.io.git && cd eduardogade.github.io
git revert --no-edit <the deploy commit from the run summary>
git push origin main        # Pages rebuilds dc0cb6c's tree: the Pelican site, as it was
```

The release commits on top of `dc0cb6c`, so the previous site stays in the Pages repository's history, and the bundle from 7.1 is a second copy. The source repository needs nothing: a deployment only reads it. Rolling back restores the Pelican site, **including its exposed files** (section 4), so it is a last resort.

## 9. DNS and HTTPS

**No DNS change is needed or proposed.**

- The domain, its proxying and the email routing stay as they are.
- The one recommended change is in Cloudflare, not DNS: Always Use HTTPS. Without it, the site keeps answering plain HTTP, as it does today.
- Cloudflare's SSL mode toward GitHub (Flexible or Full) cannot be read from outside, and **is not claimed**.
- HTTPS is verified only by testing the public address after the release (SMOKE-09, SMOKE-10), never by a setting.

## 10. Contact (the release gate)

- **Profiles:** the Contact page lists the nine public profiles the owner gave in the P24 prompt (D-164). The site's only reasons why are the profiles' own URLs.
  - Reached with a status of 200 on 2026-11-24: GitHub, ORCID, Google Scholar, DEV, Instagram, Facebook.
  - **Not verified**, because the sites refuse automated requests: LinkedIn (999), ResearchGate (403), Medium (403). The owner clicks them once.
- **Email:** none is published.
  - The owner prefers email, and has approved `eduardo@gusmaolab.org` in principle.
  - The domain's MX is Cloudflare Email Routing, so the alias can be a routing rule to the owner's inbox. No DNS record changes. Routing receives only: replies leave from the inbox's own address unless sending is set up separately.
  - To add it: create the route, send a test message from an outside account, confirm it arrived, and then tell Claude to add the channel. D-164 records the date, and REL-012 checks that a published address has a decision.
- **WhatsApp:** not listed. The owner's instruction was conditional, and the condition is not met.
- **Decision for the owner:** do the profiles satisfy "one approved, working contact channel" for the first release, or must the email come first?

## 11. Owner release checklist (human approvals: not test results)

| Area | Item | Status |
| --- | --- | --- |
| Site | Home composition, Bearnard, nucleus, world clocks, navigation, editorial layouts | accepted (P15–P23) |
| Site | Contact functioning | **owner**: profiles listed; three profile links and the email decision pending |
| Site | Schedule honestly disabled; downloads (none approved); 404 | built and checked |
| Browsers | Chrome, Firefox | checked in P23 |
| Browsers | Safari; a physical phone or tablet; VoiceOver or NVDA | **owner: perform or waive** |
| Infrastructure | Git reconciliation (section 3), release workflow, DNS (none), HTTPS (Always Use HTTPS), rollback (section 8) | **owner: review** |
| Infrastructure | Deploy key, `production` environment with a required reviewer, secret | **owner: set up** (7.0) |
| Content | No invented publications, no private CV, no synthetic studies, no unapproved Bearnard art, no booking link | checked by the build and by tests/release.mjs |
| Content | The live site's legacy URLs (Pelican: `/publications/`, `/talks/`, `/teaching/`, `/questionnaire/` and others) will answer 404 after the cutover; nothing redirects them | **owner: accept** |

## 12. Release acceptance status (REL-001 to REL-056)

| Range | Status | Where |
| --- | --- | --- |
| REL-001 to REL-012, REL-015 to REL-020, REL-023, REL-024 (controlled defects), REL-040 to REL-042, REL-048, REL-052, REL-053, REL-055, REL-056 | **PASS** (automated) | `tests/release.mjs` |
| REL-021, REL-022, REL-025 to REL-028 | **PASS** (automated) | `scripts/release-check.mjs` through REL-010 and REL-024; QA-META-09; `scripts/demo-check.mjs`; AUTH-025, EDIT-019 |
| REL-043 to REL-047, REL-049 to REL-051, REL-054 | **PASS** (held by the suites that own them) | home, clocks, nucleus, a11y, content, science, util; QA's SKIPPED list |
| REL-013, REL-014 | **PENDING**: no email address is approved yet | section 10 |
| REL-029 to REL-039 | **PENDING LIVE VERIFICATION**: they need the real site after an authorized release | `scripts/smoke.mjs` (SMOKE-00 to SMOKE-10), the run summary, section 8 |

---

## 13. Production Release Authorization Request

| Item | Proposed |
| --- | --- |
| Source commit to release | the merge commit of section 3, whose tree equals `development`'s at the P24 commit (named at the gate, once pushed and green) |
| Git reconciliation | **done (D-166)**: merge `58fcc3b` of `origin/main` into `development`, the 167 ignored paths removed, made in a separate worktree. `development`, then `main`, fast-forwarded to it after QA passed. No force, no rewrite. At the cutover `main` needs only a fast-forward to the commit released |
| Pages architecture | Option A: the existing Pages repository, published by `release.yml` |
| Workflow to run | `release.yml` (`workflow_dispatch`, inputs `commit` and `confirm`), environment `production` |
| Destination repository | `eduardogade/eduardogade.github.io`, branch `main` |
| Domain | `https://www.gusmaolab.org` (canonical); `gusmaolab.org` redirects to it |
| Contact channel | the nine profiles (D-164); email only if the owner adds it first |
| Favicon | the owner's `favicon.ico` (six sizes, 16–256 px, 149 KB), unchanged |
| DNS changes | **none**. Cloudflare setting: Always Use HTTPS |
| Expected change to the public site | the Pelican site is replaced by the Astro site; legacy URLs answer 404; the ISSUE-0003 files stop being served |
| Rollback | `git revert` of the deploy commit in the Pages repository (section 8), plus the bundle from 7.1 |
| QA evidence | local `npm run qa`, and the GitHub Quality Assurance run on the release commit (the P24 report has the figures) |
| Not verified | Safari, a physical device, a screen reader, three profile links, the deploy-key Pages build, everything live (REL-029 to REL-039) |
| Remaining limitations | KL-133, KL-134, D-144's seam; Cal.com deferred (19 checks); 13 scientific checks SKIPPED on GitHub |

**The owner is asked to approve, separately and explicitly:**

1. ~~the reconciliation of `main` (section 3)~~ done on the owner's decision, D-166;
2. Option A and the release workflow;
3. the first production deployment, with the source commit named;
4. whether the profiles are enough contact for the first release.

**Nothing in this file is that approval.**
