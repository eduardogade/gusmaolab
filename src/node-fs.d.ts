// The one Node.js function src/content.config.ts uses, declared here because the project
// installs no @types/node (a dependency needs a recorded decision). content.config.ts
// runs in Node.js, when Astro loads the content collections, never in the browser.
declare module "node:fs/promises" {
  export function readFile(path: string, encoding: "utf8"): Promise<string>
}
