# Open issues

- ISSUE-0003 — Recruiter-era files remain in public Git history — Medium — opened in P02; a possible third file noted in P03 — [record](investigations/ISSUE-0003.md)
- ISSUE-0004 — Navigation flash during physical-folder transitions — Medium — opened in P09; fix implemented (a 140 ms cross-document fade), awaiting the owner's retest on real devices — [record](investigations/ISSUE-0004.md)

- ISSUE-0005 — NUC-031 failed intermittently — Low — P22: cause established (the test waited a fixed time for a model-time quantity under load); NUC-031 and NUC-026B repaired; NUC-050 stays load-sensitive by design; the QA command reports any rescued failure as FLAKY — [record](investigations/ISSUE-0005.md)
- ISSUE-0007 — The browser job of the QA workflow was red on GitHub's runner — Medium — P22-A01: repaired; both jobs green in run 11 (2026-11-24), including on the slow AMD EPYC 7763; every cause is recorded (harness and tests, three owner decisions D-158 to D-160, two real site defects), two flakes of my own checks found by re-running (NUC-024B's fixed wait, QA-HISTORY-01's clean-up) are repaired; kept as a record to be watched, 13 static checks stay SKIPPED and 19 DEFERRED on GitHub — [record](investigations/ISSUE-0007.md)

Add one line per open issue, with a link to its record in `investigations/`:

`- ISSUE-NNNN — <title> — <severity> — [record](investigations/ISSUE-NNNN.md)`
