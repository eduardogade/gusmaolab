# CLAUDE.md

@AGENTS.md

## Claude Code notes

- `AGENTS.md`, imported above, holds the shared rules. If this file ever disagrees with it, `AGENTS.md` wins and this file needs fixing.
- Start each prompt by reading `development/current-state.md`, then the planning files the prompt touches.
- Prompts are numbered P01–P24 (`development/roadmap.md`). Do only the prompt you were given; do not start the next one.
- Before committing, run `npm run verify` and `git diff --check`. The pre-commit hook runs from the micromamba environment `web`.
- `astro dev` and `astro preview` hand off to a detached child process. Stop a server by the PID listening on its port (`lsof -nP -iTCP:<port> -sTCP:LISTEN -t`), not the PID you started.
- In the desktop app, start local servers with the preview tools: `astro-preview` (the built `dist/`, port 4322) or `astro-dev` (port 4321), from `.claude/launch.json`. Run `npm run build` before previewing.
- A passing build is not a visual check. For visual work, inspect the running site at 1440, 1280, 768 and 390 px and report which widths you actually looked at.
- End commit subjects with the prompt ID, for example `chore(workspace): … [P01]`.
