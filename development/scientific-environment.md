# Scientific environment

How GusmaoLab's scientific articles are made on the owner's computer (P13-A01, D-104). The site is Astro; Quarto prepares scientific documents; Python runs their code. Each has one owner and one file that fixes it.

## Who owns what

| Layer | Owner | Fixed by |
| --- | --- | --- |
| Astro, TypeScript, CSS, tests | npm | `package.json`, `package-lock.json`, `.node-version` |
| The environment and its Python interpreter | micromamba | `environments/science/environment.yml` |
| Every Python package | uv | `environments/science/requirements.in` (written by hand), `requirements.txt` (generated, hashed) |
| Document rendering | Quarto, installed separately | `quarto-required` in `science/_quarto.yml` |
| The scientific article | the `.qmd` source | `science/<dir>/<name>.qmd` |
| What a computation produced | the frozen results | `science/_freeze/`, fingerprinted in `src/science/manifest.json` |
| The public website | the Astro static build | `npm run build` |

No package has two owners. `environment.yml` lists the interpreter and `uv` only; Python libraries live in `requirements.in`. Node.js is not installed in the environment, and Quarto is not installed in it either.

## Tested versions

Recorded on 15 November 2026, on the owner's computer. "Before" is given only where an earlier record exists; nothing is guessed.

| Tool | Version | Before | Notes |
| --- | --- | --- | --- |
| macOS | 27.2.1, arm64 (Apple M1 Max) | not recorded | Every Python here is arm64 |
| Node.js | 26.13.1 (`.node-version`: 26) | not recorded | Homebrew `node` |
| npm | 11.20.0 | not recorded |  |
| Astro | 7.4.8 | 7.4.8 | Locked; `npm ls` |
| Quarto | 1.11.9 | 1.10.19 | `/Applications/quarto`; Pandoc is Quarto's own. Required range `>=1.10.19 <2` |
| Python | 3.12.16 (conda-forge, arm64) | 3.12.13 (older `egg` environment) | In `gusmaolab-science` |
| uv | 0.13.8 | not installed | Installed inside the environment, not globally |
| micromamba | 2.3.0 on the PATH, 2.10.0 from Homebrew | not recorded | Either runs the tool |
| Chrome | 157 | 157 | The browser tests use it, headless |

Homebrew's `pandoc` (3.14) is not used: Quarto renders with the Pandoc it carries.

## Set it up

From the repository root. Nothing here touches another environment, the system Python, or Homebrew.

```bash
npm ci
npm run science:env -- create
npm run science:env -- check
```

`create` runs `micromamba create` from `environment.yml`, then `uv pip install --require-hashes` from `requirements.txt`, into the interpreter it just made. It refuses to run if the environment already exists, and never replaces one. It installs with `uv pip install`, not `uv pip sync`: sync would uninstall `pip`, `setuptools` and `wheel`, which conda-forge's Python owns. `check` compares both ways instead: every pin is installed at its version, and nothing is installed that is not pinned.

`npm run science:env -- create --prefix <folder>` builds the same environment in a fresh folder, which is how the specification is tested (`npm run science:restore-test`).

## Validate it

```bash
npm run science:env -- resolve     # which Python, and why
npm run science:env -- check       # ARM64, Python 3.12, packages match the lock
npm run science:check              # Quarto, the same Python, the documents
npm run science:quarto -- check jupyter
```

## How Quarto finds the interpreter

`scripts/science-env.mjs` decides, in this order:

1. `SCIENCE_PYTHON`, if set.
2. `QUARTO_PYTHON`, if set.
3. The micromamba environment named `SCIENCE_ENV` (default `gusmaolab-science`), found through `micromamba env list`, whatever the root directory.
4. Nothing. The tool says so. It never falls back to the first `python3` on the PATH.

It then sets `QUARTO_PYTHON` to that interpreter, `JUPYTER_PATH` to the environment's own kernel folder (so a user-level `python3` kernel cannot run the code under another Python) and `PYTHONNOUSERSITE=1`. `npm run science:quarto -- <arguments>` runs Quarto that way and returns Quarto's exit code. `tests/science-env.mjs` renders a probe document and checks that the code ran in the environment's prefix.

## Reproduce a computation

```bash
npm run science:execute -- demo/demo-synthetic-signals    # runs the code: the only command that does
npm run science:verify                                    # offline: are all results current?
```

`execute` writes the article, the entry, the figures and the frozen results; `render` re-renders from the frozen results and computes nothing; `npm run build` only verifies. Two executions on this machine give byte-identical files (`tests/science-execute.mjs`). That shows the seeded, standard-library computation is deterministic here. It does not show that another operating system, or a real analysis with other libraries, would match byte for byte; floating-point output is printed at three decimals so that a last-digit difference in a maths library would not change it.

If a figure differs between machines in bytes only (metadata, ordering of attributes), compare the numbers first: the table in the article is the numerical record.

## Update on purpose

- **A Python package:** edit `requirements.in`, run `npm run science:env -- lock`, review the diff of `requirements.txt`, run `npm run science:env -- sync`, then `npm run science:env -- check`. Re-execute the documents (`science:execute`) and commit the changed results with the lock.
- **Quarto:** install the new version, run `npm run science:render -- <doc>` for each document and `npm run science:verify`. If the generated files do not change, nothing else is needed; if they do, read the diff before committing. Widen `quarto-required` only after that.
- **Python itself:** change `python=` in `environment.yml`, create the environment under a new name (`SCIENCE_ENV=...`), run `lock`, `check` and the execution tests, and only then move to it.

## After a Homebrew upgrade

Upgrading Homebrew packages does not touch the micromamba environment or the pinned packages, so it cannot change a computed result. It can change Node, Quarto (if Quarto was installed by Homebrew), micromamba or Chrome.

1. `npm run science:env -- check` (the environment is unchanged).
2. `quarto --version`, and compare with `quarto-required`.
3. `npm run verify` and `npm run test:browser`.
4. If Quarto changed: `npm run science:render -- <doc>` for each document, then `git diff --stat`. Identical output means the upgrade was harmless.
5. If `uv` says "Library not loaded: libzstd" when run by hand, set `DYLD_FALLBACK_LIBRARY_PATH` to the environment's `lib/` folder (the tool does this itself; KL-78).
6. If a command is not found: `micromamba env list`, `which -a quarto`, `which -a node`. Two Quarto or micromamba binaries on the PATH are normal on this computer; the first one wins.

The 15 November 2026 upgrade moved Quarto from 1.10.19 to 1.11.9. Re-executing the P13 specimen under 1.11.9 and a new Python gave byte-identical article, figure and frozen results; only the recorded versions in the manifest changed.

## On another machine, or in CI

- The lock is universal (`uv pip compile --universal`), so it also resolves on Linux. Pins that apply to other platforms carry markers; `check` evaluates them for the machine it runs on.
- A CI job that only builds the site needs Node and `npm ci`, and nothing else: `npm run build` verifies generated files offline.
- A CI job that renders or executes needs Quarto at a version in range, and an environment created by `create`. Install `micromamba` first, or set `SCIENCE_PYTHON` to an interpreter that has the pinned packages.
- Byte-for-byte equality across operating systems is not claimed. Test it before relying on it.
