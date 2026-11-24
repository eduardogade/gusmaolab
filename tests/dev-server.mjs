// A real `astro dev` for the browser suites that need one (P13-A01, P14, P22-A01), and its cleanup.
//
// Astro allows one dev server per project: if the owner already has one running, it is used and left running; otherwise
// this starts one on a free port and stops it. How `astro dev` behaves differs by platform (found in P22-A01): on a Mac it
// hands off to a detached child and the process that was started exits, so the server must be found by the port it
// listens on; on the GitHub runner (Linux) it stays attached to the process that started it, so the process group must be
// killed. A suite that only stopped one of them either leaked the server or sat in the orchestrator until its timeout.
//
// Cleanup is therefore checked, not assumed: `stop()` ends every listener on the port and the process group, waits for the
// port to close, and if anything still listens it says so, names the processes and makes the suite FAIL (exit code 1),
// instead of leaving the leak hidden behind the parent's exit. It runs on exit, on SIGINT, SIGTERM and SIGHUP (the
// orchestrator's timeout sends SIGTERM); a SIGKILL cannot be caught, and is the one thing this does not cover. The
// server's command and arguments can be replaced for a test of this module (tests/qa.mjs, QA-DEVSERVER-01).
import { spawn, spawnSync } from "node:child_process"
import { readFileSync, readdirSync, readlinkSync } from "node:fs"
import { createServer } from "node:net"
import process from "node:process"

/** A TCP port nothing is listening on. */
export function freePort() {
  return new Promise((resolve) => {
    const server = createServer()
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

/**
 * The process ids listening on a TCP port, or `null` when this machine cannot say (no `lsof`, and no /proc either).
 * `lsof` first (a Mac has it; so does most of Linux); on Linux without it, /proc: the listening socket's inode in
 * /proc/net/tcp and /proc/net/tcp6 (state 0A), then the process whose file descriptors hold that inode.
 */
export function listeningPids(port) {
  const lsof = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" })
  if (!lsof.error) return (lsof.stdout ?? "").split("\n").filter(Boolean).map(Number)
  if (process.platform !== "linux") return null
  try {
    const inodes = new Set()
    for (const table of ["/proc/net/tcp", "/proc/net/tcp6"]) {
      for (const line of readFileSync(table, "utf8").split("\n").slice(1)) {
        const cols = line.trim().split(/\s+/)
        if (cols.length > 9 && cols[3] === "0A" && parseInt(cols[1].split(":")[1], 16) === port) inodes.add(cols[9])
      }
    }
    if (inodes.size === 0) return []
    const pids = []
    for (const pid of readdirSync("/proc").filter((name) => /^\d+$/.test(name))) {
      try {
        for (const fd of readdirSync(`/proc/${pid}/fd`)) {
          const target = readlinkSync(`/proc/${pid}/fd/${fd}`)
          if (/^socket:\[(\d+)\]$/.test(target) && inodes.has(/\[(\d+)\]/.exec(target)[1])) {
            pids.push(Number(pid))
            break
          }
        }
      } catch {} // a process that ended, or one we may not look into
    }
    return pids
  } catch {
    return null
  }
}

/**
 * The live members of a process group (a zombie is a process that ended and has not been collected yet: it holds no
 * port and runs nothing, and this module's own child is one until the event loop reaps it, so it does not count).
 * `null` when `ps` cannot say.
 */
export function liveGroupMembers(pgid) {
  const ps = spawnSync("ps", ["-A", "-o", "pid=,pgid=,stat=,command="], { encoding: "utf8" })
  if (ps.error || ps.status !== 0) return null
  return (ps.stdout ?? "")
    .split("\n")
    .map((line) => /^\s*(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/.exec(line))
    .filter((m) => m && Number(m[2]) === pgid && !m[3].startsWith("Z"))
    .map((m) => ({ pid: Number(m[1]), command: m[4].slice(0, 120) }))
}

/**
 * Starts the dev server (or finds the owner's) and returns `{ origin, port, started, stop }`. `probe` is a path that
 * answers 200 when the site is up; the start gives up after `attempts` half-seconds and returns `origin: null`.
 */
export async function startDevServer({ probe, attempts = 240, command = "npx", args = (port) => ["astro", "dev", "--port", String(port), "--host", "127.0.0.1"], env = {} } = {}) {
  const port = await freePort()
  const dev = spawn(command, args(port), {
    stdio: ["ignore", "pipe", "ignore"],
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", ...env },
    detached: true,
  })
  let announced = ""
  dev.stdout.on("data", (chunk) => (announced += chunk))
  let origin = `http://127.0.0.1:${port}`
  let started = true
  let stopped = false

  /** Ends what this started and proves the port is closed; sets a failing exit code if it is not. Safe to call twice. */
  function stop() {
    if (!started || stopped) return { port, leaked: [] }
    stopped = true
    const killed = new Set()
    const signal = (name) => {
      for (const pid of listeningPids(port) ?? []) {
        killed.add(pid)
        try {
          process.kill(pid, name)
        } catch {}
      }
      try {
        process.kill(-dev.pid, name) // the group `npx` started: where Linux keeps the server
      } catch {}
    }
    signal("SIGTERM")
    let leaked = []
    for (let waited = 0; waited <= 4000; waited += 100) {
      const left = listeningPids(port)
      leaked = left === null ? [] : left
      if (leaked.length === 0 && (liveGroupMembers(dev.pid) ?? []).length === 0) break
      if (waited === 2000) signal("SIGKILL")
      sleepSync(100)
    }
    const unknown = listeningPids(port) === null
    const groupLeft = liveGroupMembers(dev.pid) ?? []
    if (leaked.length > 0 || groupLeft.length > 0) {
      process.stderr.write(`DEV SERVER LEAK: the dev server this suite started is still running (port ${port}, listening pids ${JSON.stringify(leaked)}${groupLeft.length ? `, process group ${dev.pid} still holds ${JSON.stringify(groupLeft)}` : ""}). Stop it by the pid listening on the port.\n`)
      process.exitCode = 1
    } else {
      process.stdout.write(`dev server stopped: port ${port} is closed${killed.size ? ` (ended pid ${[...killed].join(", ")})` : ""}${unknown ? "; this machine cannot list listeners, so only the process group was checked" : ""}\n`)
    }
    return { port, leaked }
  }
  process.on("exit", stop)
  // The orchestrator's timeout and a terminal's interrupt arrive as signals, which skip the exit handler unless asked to exit.
  for (const [name, code] of [["SIGINT", 130], ["SIGTERM", 143], ["SIGHUP", 129]]) process.on(name, () => process.exit(code))

  let up = false
  for (let i = 0; i < attempts && !up; i++) {
    const existing = /already running at (http:\/\/\S+)/.exec(announced)?.[1]
    if (existing) {
      origin = existing
      started = false
    }
    up = await fetch(`${origin}${probe}`)
      .then((r) => r.ok)
      .catch(() => false)
    if (!up) await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return { origin: up ? origin : null, port, started, stop }
}
