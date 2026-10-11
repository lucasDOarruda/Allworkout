// Rep engine: smooths the metrics, runs the rep phases and judges each rep. Plain JavaScript
// (no React), so it runs the same in the browser, in tests and on saved landmark data.
//
// Phases: ready → down (signal below `start`) → rising (signal above `end`) → judged after the
// lifter has been up for `settleMs`. A rep that never gets below `mustReach` is ignored as a twitch.
// If the body goes out of view mid-rep, the rep is dropped instead of guessed.

const ALPHA = 0.5 // smoothing: higher follows faster, lower is steadier
const MAX_REP_MS = 20000 // anything longer isn't a rep (someone walked off, or rested at the bottom)
const MAX_SAMPLES = 900

function emptyRep(t) {
  return { startT: t, samples: [], bottomIndex: 0, bottom: null, min: {}, max: {}, liveFaults: new Set() }
}

export function createRepEngine(ex, { includeExperimental = false } = {}) {
  const liveChecks = (ex.live || []).filter((c) => includeExperimental || !c.experimental)
  const endChecks = ex.afterRep || []
  let phase = 'ready'
  let smooth = null
  let rep = null
  let risingSince = null

  const smoothen = (m) => {
    if (!smooth) return (smooth = { ...m })
    const out = { ...m }
    for (const k of Object.keys(m)) if (typeof m[k] === 'number' && typeof smooth[k] === 'number') out[k] = smooth[k] + ALPHA * (m[k] - smooth[k])
    return (smooth = out)
  }

  const record = (m) => {
    if (rep.samples.length < MAX_SAMPLES) rep.samples.push(m)
    for (const [k, v] of Object.entries(m)) {
      if (typeof v !== 'number') continue
      if (rep.min[k] === undefined || v < rep.min[k]) rep.min[k] = v
      if (rep.max[k] === undefined || v > rep.max[k]) rep.max[k] = v
    }
    if (!rep.bottom || m[ex.signal] <= rep.bottom[ex.signal]) {
      rep.bottom = m
      rep.bottomIndex = rep.samples.length - 1
    }
  }

  const judge = (top) => {
    if (rep.min[ex.signal] > ex.mustReach) return null // a twitch, not a rep
    const summary = { ...rep, top }
    const faults = []
    const add = (c) => !faults.some((f) => f.id === c.id) && faults.push({ id: c.id, label: c.label, cue: c.cue })
    for (const c of liveChecks) if (rep.liveFaults.has(c.id)) add(c)
    for (const c of endChecks) if (c.when(summary)) add(c)
    return { good: faults.length === 0, faults, bottom: rep.bottom, durationMs: top._t - rep.startT }
  }

  const reset = () => {
    phase = 'ready'
    rep = null
    risingSince = null
  }

  /**
   * Feed one frame of metrics (from computeMetrics) at time t (ms).
   * Returns { phase, signal, live: [faults now], keyHit, metrics, rep?: {good, faults}, dropped?, reason? }
   */
  function update(raw, t) {
    if (!raw || !raw.ok) {
      smooth = null
      const wasInRep = phase !== 'ready'
      reset()
      return { phase: 'ready', live: [], dropped: wasInRep, reason: raw?.reason || 'Step into the frame' }
    }
    const m = { ...smoothen(raw), _t: t }
    const s = m[ex.signal]
    let live = []

    if (phase === 'ready' && s < ex.start) {
      phase = 'down'
      rep = emptyRep(t)
    }

    if (phase === 'down' || phase === 'rising') {
      if (t - rep.startT > MAX_REP_MS) {
        reset()
        return { phase, signal: s, live, metrics: m, dropped: true, reason: 'Rep took too long' }
      }
      record(m)
      live = liveChecks.filter((c) => c.when(m)).map((c) => ({ id: c.id, label: c.label, cue: c.cue }))
      live.forEach((f) => rep.liveFaults.add(f.id))

      if (phase === 'down' && s > ex.end) {
        phase = 'rising'
        risingSince = t
      } else if (phase === 'rising' && s <= ex.end) {
        phase = 'down' // dipped again before settling
        risingSince = null
      }

      if (phase === 'rising' && t - risingSince >= ex.settleMs) {
        const result = judge(m)
        reset()
        return { phase: 'judged', signal: s, live, metrics: m, rep: result, ignored: !result }
      }
    }

    const keyHit = phase !== 'ready' && (ex.key ? ex.key(m) : s <= ex.mustReach)
    return { phase, signal: s, live, keyHit, metrics: m }
  }

  return { update, reset, get phase() { return phase } }
}
