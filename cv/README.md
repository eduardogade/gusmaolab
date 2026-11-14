# cv/

The author's CV is the source of truth for the owner's professional history: identity, education, positions, publications, teaching, mentoring, service, awards, funding and skills (P11-A01, decisions D-089 to D-093). The website never keeps a second, hand-written copy of those facts. It shows records derived from one version that the owner has approved.

## What is here

| File | In Git | What it is |
| --- | --- | --- |
| `manifest.json` | yes | Which file is being edited, and which version is approved for publication. |
| `identities.json` | yes | The permanent record ID of each CV entry that may be shown. |
| `codex-yaml/CV.proposta.yaml` | **no** | The working proposal the author is editing. |
| `CV-vX.Y.yaml` | **no** | Versions the author creates explicitly. None exists yet. |
| `cv.md`, `template.tex` | yes | Empty placeholders from the first commit. |

The CV files are ignored by Git on purpose. This repository is public, and they hold private details such as contacts and references. Nothing in the website reads them: a build reads only the generated snapshot, `src/data/cv/snapshot.ts`.

## Rules

- Only the author edits a CV file. No tool or agent rewrites, formats, renames or moves one. The CV tool reads them and writes only the snapshot.
- Unresolved placeholders (`{{…}}`) are normal in a draft. They are never filled in by guessing, and never shown.
- `metadados.fonte_de_verdade: true` says the file is the authoritative CV. It is not an approval to publish.
- The newest file is never chosen automatically. A version is published only when `manifest.json` names it.

## Commands

```sh
npm run cv:check              # what is selected, and what an approved version would yield
npm run cv:check -- --verbose # also lists what would be left out, by identifier
npm run cv:snapshot           # writes the public snapshot; refuses without an approval
```

Neither command prints the text of the CV, and neither is part of a build.

## Publishing a version

Nothing below has been done. Each step is the owner's.

1. Finish and review the CV, then save a copy as `cv/CV-vX.Y.yaml` with the same version in `metadados.versao`.
2. In `identities.json`, set `owner` to the owner's person ID (`person-…`) and give each entry to be shown a record ID, keyed by its list and its identifier in the CV:

   ```json
   {
     "owner": "person-…",
     "records": {
       "publicacoes.artigos/4.1.1": "publication-…",
       "formacao_academica/formacao_1": "education-…"
     }
   }
   ```

   An entry without an ID is not shown. IDs are permanent: they do not change when the CV is renumbered.

3. In `manifest.json`, approve the version:

   ```json
   {
     "workingFile": "codex-yaml/CV.proposta.yaml",
     "published": {
       "file": "CV-vX.Y.yaml",
       "version": "X.Y.0",
       "sha256": "<shasum -a 256 cv/CV-vX.Y.yaml>",
       "approvedOn": "YYYY-MM-DD",
       "contact": ["orcid", "github"]
     },
     "publishEnabled": true
   }
   ```

   `contact` lists the profile links to show. An email address, a telephone number and a location cannot be published this way.

4. Run `npm run cv:snapshot`, read the diff of `src/data/cv/snapshot.ts` (it is public), run `npm run verify`, and commit the snapshot.

If the approved file is edited afterwards, its fingerprint no longer matches and nothing is published until it is approved again.

Details: `planning/content-model.md`, section "The author's CV".
