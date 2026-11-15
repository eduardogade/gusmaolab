/**
 * Whether the demonstrations are part of this run (P13-A01, D-105). A demonstration is a
 * synthetic Greenhouse article in src/demos/ that exercises the real components, so the owner
 * can see a feature working. It is never public content, so it is routed only when Astro's
 * mode says so:
 *
 *   - "development": the dev server (`npm run dev`), or
 *   - "demo": a build run with `--mode demo` (`npm run demo:build`), which also writes to its
 *     own folder (dist-demo/), never to the release folder.
 *
 * It is the mode, not `import.meta.env.DEV`, that decides: `DEV` follows NODE_ENV, which a shell
 * can leave set to "development" and so turn a production build into a development one.
 * `npm run build` runs `astro build --mode production` with a cleaned environment
 * (scripts/public-build.mjs) and then searches its own output for any demonstration.
 *
 * Nothing here is a client-side switch: a page is either generated or it is not.
 * Only Astro-side code imports this file (it reads `import.meta.env`).
 */
export const demosEnabled = (): boolean =>
  import.meta.env.MODE === "development" || import.meta.env.MODE === "demo"
