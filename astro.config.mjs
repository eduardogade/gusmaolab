// @ts-check
import { defineConfig } from "astro/config"

// https://astro.build/config
export default defineConfig({
  // Canonical origin of the production site. The site is served from the domain
  // root, so there is no `base` path. How it is deployed is not decided yet.
  site: "https://www.gusmaolab.org",
  output: "static",
})
