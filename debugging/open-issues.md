# Open issues

- ISSUE-0003 — Recruiter-era files remain in public Git history — Medium — opened in P02; a possible third file noted in P03 — [record](investigations/ISSUE-0003.md)
- ISSUE-0004 — Navigation flash during physical-folder transitions — Medium — opened in P09; fix implemented (a 140 ms cross-document fade), awaiting the owner's retest on real devices — [record](investigations/ISSUE-0004.md)

- ISSUE-0005 — NUC-031 failed intermittently — Low — P22: cause established (the test waited a fixed time for a model-time quantity under load); NUC-031 and NUC-026B repaired; NUC-050 stays load-sensitive by design; the QA command reports any rescued failure as FLAKY — [record](investigations/ISSUE-0005.md)
- ISSUE-0007 — The browser job of the QA workflow is red on GitHub's runner — Medium — P22-A01: the static job passes on a clean Linux runner; the browser job lost 24 failures to causes repaired (shallow checkout, no pointer, click geometry, view-transition clicks, fixed waits, a process that did not exit); run 8 left three (CLOCK-034B, NUC-050, NUCINT-033B), which the owner decided on 2026-11-23: a short date and a stable column (D-158), a reference and a CI smoke threshold for frame time (D-159), and the swipe's aim repaired; the dev servers' cleanup is proven and Markdown tables take keyboard focus (D-160). Open until the next GitHub run — [record](investigations/ISSUE-0007.md)

Add one line per open issue, with a link to its record in `investigations/`:

`- ISSUE-NNNN — <title> — <severity> — [record](investigations/ISSUE-NNNN.md)`
