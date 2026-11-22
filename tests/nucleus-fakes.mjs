// Stand-ins for the browser, shared by tests/nucleus.mjs (P19) and tests/nucleus-integration.mjs (P20): an
// event target that counts its listeners, a fake document, window, canvas, host and frame/timer queue for
// the lifecycle (which is written against an `Environment` for exactly this), and a fake host element.

export function listeners() {
  const map = new Map()
  let adds = 0
  let removes = 0
  return {
    adds: () => adds,
    removes: () => removes,
    live: () => [...map.values()].reduce((s, set) => s + set.size, 0),
    addEventListener(type, fn) {
      adds++
      if (!map.has(type)) map.set(type, new Set())
      map.get(type).add(fn)
    },
    removeEventListener(type, fn) {
      if (map.get(type)?.delete(fn)) removes++
    },
    fire(type, event = {}) {
      for (const fn of [...(map.get(type) ?? [])]) fn({ preventDefault() {}, ...event })
    },
  }
}

export function fakeBrowser({ width = 700, height = 525, hidden = false, dpr = 2 } = {}) {
  const doc = Object.assign(listeners(), { hidden })
  const win = Object.assign(listeners(), { devicePixelRatio: dpr })
  const canvasEvents = listeners()
  const rect = { left: 100, top: 100, width, height }
  const canvas = Object.assign(canvasEvents, { removed: false, remove() { this.removed = true }, getBoundingClientRect: () => rect, setAttribute() {}, attributes: {} })
  const host = { dataset: {}, getBoundingClientRect: () => rect, querySelectorAll: () => [], append() {} }
  let frames = []
  let nextId = 1
  let time = 0
  const timers = new Map()
  let sizeCallback = null
  let observing = 0
  let released = 0
  const env = {
    document: doc,
    window: win,
    now: () => time,
    requestFrame(cb) { const id = nextId++; frames.push({ id, cb }); return id },
    cancelFrame(id) { frames = frames.filter((f) => f.id !== id) },
    setTimer(cb, ms) { const id = nextId++; timers.set(id, { cb, ms }); return id },
    clearTimer(id) { timers.delete(id) },
    observeSize(_el, cb) { sizeCallback = cb; observing++; return () => { observing--; released++ } },
  }
  const surface = {
    canvas,
    calls: { resize: [], draw: 0, dispose: 0 },
    resize(w, h, r) { this.calls.resize.push([w, h, r]) },
    draw() { this.calls.draw++ },
    stats: () => ({ triangles: 90_000, geometries: 3, materials: 3, drawCalls: 4 }),
    dispose() { this.calls.dispose++ },
  }
  return {
    env, surface, canvas, host, doc, win, rect, timers,
    pending: () => frames.length,
    observing: () => observing,
    released: () => released,
    resizeCallback: () => sizeCallback,
    /** Run the pending frame at `ms` later; returns false when none was pending. */
    tick(ms = 1000 / 60) { const f = frames.shift(); if (!f) return false; time += ms; f.cb(time); return true },
    runUntilIdle(limit = 2000) { let n = 0; while (this.tick() && n++ < limit); return n },
  }
}
export function fakeHost() {
  const canvases = []
  return {
    dataset: {},
    canvases,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }),
    querySelectorAll: () => canvases.filter((c) => !c.removed),
    append(c) { canvases.push(c) },
  }
}
