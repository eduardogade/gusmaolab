# Open issues

- ISSUE-0003 — Recruiter-era files remain in public Git history — Medium — opened in P02; a possible third file noted in P03 — [record](investigations/ISSUE-0003.md)
- ISSUE-0004 — Navigation flash during physical-folder transitions — Medium — opened in P09; fix implemented (a 140 ms cross-document fade), awaiting the owner's retest on real devices — [record](investigations/ISSUE-0004.md)

- ISSUE-0005 — NUC-031 failed intermittently — Low — P22: cause established (the test waited a fixed time for a model-time quantity under load); NUC-031 and NUC-026B repaired; NUC-050 stays load-sensitive by design; the QA command reports any rescued failure as FLAKY — [record](investigations/ISSUE-0005.md)
- ISSUE-0006 — Legacy design studies (36 pages of synthetic content) are routed in the release build — High for P24 — found in P22; a registered exception until the owner decides to gate or remove them — [record](investigations/ISSUE-0006.md)

Add one line per open issue, with a link to its record in `investigations/`:

`- ISSUE-NNNN — <title> — <severity> — [record](investigations/ISSUE-NNNN.md)`
