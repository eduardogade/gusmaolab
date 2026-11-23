# Open issues

- ISSUE-0003 — Recruiter-era files remain in public Git history — Medium — opened in P02; a possible third file noted in P03 — [record](investigations/ISSUE-0003.md)
- ISSUE-0004 — Navigation flash during physical-folder transitions — Medium — opened in P09; fix implemented (a 140 ms cross-document fade), awaiting the owner's retest on real devices — [record](investigations/ISSUE-0004.md)

- ISSUE-0005 — NUC-031 failed intermittently — Low — P22: cause established (the test waited a fixed time for a model-time quantity under load); NUC-031 and NUC-026B repaired; NUC-050 stays load-sensitive by design; the QA command reports any rescued failure as FLAKY — [record](investigations/ISSUE-0005.md)
- ISSUE-0007 — The browser job of the QA workflow is red on GitHub's runner — Medium — P22-A01: the static job passes on a clean Linux runner; the browser job lost 24 failures to causes now repaired (shallow checkout, no pointer, click geometry, view-transition clicks, fixed waits) and still fails on five checks that compare with macOS-font geometry and on NUC-050's frame-time ceiling, which need owner decisions; one real accessibility defect (a scrolling table not reachable by keyboard) was found and repaired — [record](investigations/ISSUE-0007.md)

Add one line per open issue, with a link to its record in `investigations/`:

`- ISSUE-NNNN — <title> — <severity> — [record](investigations/ISSUE-NNNN.md)`
