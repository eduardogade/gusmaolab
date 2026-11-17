// The few Node.js functions src/downloads/files.ts uses, declared here because the project installs no
// @types/node (a dependency needs a recorded decision). files.ts runs in Node.js at build time and in
// the tests, never in the browser. Same arrangement as node-fs.d.ts.
declare module "node:crypto" {
  export function createHash(algorithm: "sha256"): {
    update(data: Uint8Array): { digest(encoding: "hex"): string }
  }
}
declare module "node:fs" {
  export function existsSync(path: string): boolean
  export function readFileSync(path: string): Uint8Array
  export function statSync(path: string): { size: number; isFile(): boolean }
}
declare module "node:path" {
  export function dirname(path: string): string
  export function join(...parts: string[]): string
}
declare module "node:process" {
  const process: { cwd(): string }
  export default process
}
declare module "node:url" {
  export function fileURLToPath(url: string | URL): string
}
