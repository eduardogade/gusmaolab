// A stand-in browser suite for QA-DEVSERVER-01: starts the fake dev server through tests/dev-server.mjs, says which port and
// pid it got, and then ends the way the test asks: a normal exit (a passing suite's process.exit(0)), a thrown error, or
// waiting to be sent a signal (the orchestrator's timeout sends SIGTERM).
import { fileURLToPath } from "node:url"
import { listeningPids, startDevServer } from "../../dev-server.mjs"

const [mode, ending] = process.argv.slice(2)
const server = await startDevServer({
  probe: "/",
  attempts: 40,
  command: process.execPath,
  args: (port) => [fileURLToPath(new URL("./fake-server.mjs", import.meta.url)), "--port", String(port), "--mode", mode],
})
if (server.origin === null) {
  console.log("NOT STARTED")
  process.exit(2)
}
console.log(`STARTED port=${server.port} origin=${server.origin} listeners=${JSON.stringify(listeningPids(server.port))}`)
if (ending === "exit") process.exit(0)
if (ending === "throw") throw new Error("a suite that failed")
setInterval(() => {}, 1000) // wait for a signal
