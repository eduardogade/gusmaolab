// A stand-in for `astro dev` in the test of tests/dev-server.mjs (QA-DEVSERVER-01): it listens on --port and answers 200 to
// everything, in one of the two ways the real one behaves. Synthetic: it serves nothing of the site.
//   attached: the process that was started keeps serving (the GitHub runner, Linux)
//   handoff:  the process that was started starts a detached server in its own session and exits (a Mac)
import { spawn } from "node:child_process"
import { createServer } from "node:http"
import { fileURLToPath } from "node:url"

const arg = (name) => process.argv[process.argv.indexOf(name) + 1]
const port = Number(arg("--port"))
const mode = arg("--mode")
const serve = () => createServer((request, response) => response.writeHead(200).end("ok")).listen(port, "127.0.0.1")
if (mode === "attached" || mode === "served") {
  serve()
  if (mode === "attached") console.log(`fake dev server listening on ${port}`)
} else if (mode === "handoff") {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--port", String(port), "--mode", "served"], { detached: true, stdio: "ignore" })
  child.unref()
  console.log(`fake dev server handed off to ${child.pid}`)
  setTimeout(() => process.exit(0), 300)
}
