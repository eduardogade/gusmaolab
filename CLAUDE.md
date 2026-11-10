# CLAUDE.md

@AGENTS.md

## Claude Code notes

- `AGENTS.md`, imported above, holds the shared rules. If this file ever disagrees with it, `AGENTS.md` wins and this file needs fixing.
- Start each prompt by reading `development/current-state.md`, then the planning files the prompt touches.
- Prompts are numbered P01–P24 (`development/roadmap.md`). Do only the prompt you were given; do not start the next one.
- Before committing, run `git diff --check`. The pre-commit hook runs from the micromamba environment `web`.
- End commit subjects with the prompt ID, for example `chore(workspace): … [P01]`.
