// Rep engine and metrics tests with synthetic data. Run: npm run test:formcoach
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRepEngine } from '../src/formcoach/repEngine.js'
import { formExerciseById, formCheckFor } from '../src/formcoach/exercises.js'
import { computeMetrics } from '../src/formcoach/metrics.js'
import { angle } from '../src/formcoach/poseMath.js'

const FPS = 30
const base = { ok: true, kneeAngle: 175, hipAngle: 175, torsoLean: 10, depth: -0.4, wristOffset: 0.05, heelLift: 0, kneeRatio: 1, lowerKnee: 175, frontKnee: 175, rearKneeGap: 0.5 }

// Interpolate keyframes [{t (s), ...metrics}] into 30 fps frames and run them through the engine
function run(exId, keys, extra = {}) {
  const engine = createRepEngine(formExerciseById[exId], extra)
  const out = { reps: [], dropped: 0, ignored: 0, liveSeen: new Set() }
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]
    const b = keys[i + 1]
    const n = Math.max(1, Math.round((b.t - a.t) * FPS))
    for (let f = 0; f < n; f++) {
      const k = f / n
      const m = { ...base }
      for (const key of Object.keys(base)) if (typeof base[key] === 'number') m[key] = (a[key] ?? base[key]) + ((b[key] ?? base[key]) - (a[key] ?? base[key])) * k
      if (a.ok === false) m.ok = false
      const r = engine.update(m, (a.t + (b.t - a.t) * k) * 1000)
      r.live?.forEach((x) => out.liveSeen.add(x.id))
      if (r.rep) out.reps.push(r.rep)
      if (r.ignored) out.ignored++
      if (r.dropped) out.dropped++
    }
  }
  return out
}

const hold = (t, m) => ({ t, ...m })

test('a smooth, deep squat is a good rep', () => {
  const r = run('squat', [hold(0, {}), hold(1, {}), hold(2, { kneeAngle: 75, depth: 0.08, torsoLean: 35 }), hold(2.3, { kneeAngle: 75, depth: 0.08, torsoLean: 35 }), hold(3.3, {}), hold(4.5, {})])
  assert.equal(r.reps.length, 1)
  assert.equal(r.reps[0].good, true, JSON.stringify(r.reps[0].faults))
})

test('a shallow squat is a no-rep for depth', () => {
  const r = run('squat', [hold(0, {}), hold(1, {}), hold(2, { kneeAngle: 105, depth: -0.12, torsoLean: 30 }), hold(3, {}), hold(4, {})])
  assert.equal(r.reps.length, 1)
  assert.equal(r.reps[0].good, false)
  assert.deepEqual(r.reps[0].faults.map((f) => f.id), ['depth'])
})

test('a small dip is ignored as a twitch', () => {
  const r = run('squat', [hold(0, {}), hold(1, {}), hold(1.6, { kneeAngle: 140 }), hold(2.2, {}), hold(3, {})])
  assert.equal(r.reps.length, 0)
  assert.equal(r.ignored, 1)
})

test('too much forward lean turns red during the rep and fails it', () => {
  const r = run('squat', [hold(0, {}), hold(1, {}), hold(2, { kneeAngle: 80, depth: 0.05, torsoLean: 62 }), hold(3, {}), hold(4, {})])
  assert.ok(r.liveSeen.has('chest'))
  assert.equal(r.reps[0].good, false)
  assert.ok(r.reps[0].faults.some((f) => f.id === 'chest'))
})

test('not standing up at the top is a lockout fault', () => {
  // Rises above `end` (160) but only to 162, under the 165 needed at the top
  const r = run('squat', [hold(0, {}), hold(1, {}), hold(2, { kneeAngle: 80, depth: 0.05 }), hold(3, { kneeAngle: 162 }), hold(4, { kneeAngle: 162 }), hold(5, {})])
  assert.equal(r.reps.length, 1)
  assert.ok(r.reps[0].faults.some((f) => f.id === 'stand'))
})

test('heel lift is experimental and off by default', () => {
  const keys = [hold(0, {}), hold(1, {}), hold(2, { kneeAngle: 80, depth: 0.05, heelLift: 0.1 }), hold(3, {}), hold(4, {})]
  assert.equal(run('squat', keys).reps[0].good, true)
  assert.ok(run('squat', keys, { includeExperimental: true }).reps[0].faults.some((f) => f.id === 'heels'))
})

test('deadlift where the knees straighten before the hips is "hips shot up"', () => {
  const r = run('deadlift', [
    hold(0, {}),
    hold(1, {}),
    hold(2, { hipAngle: 85, kneeAngle: 110, torsoLean: 70 }),
    hold(2.5, { hipAngle: 88, kneeAngle: 150, torsoLean: 75 }), // knees open 40, hips only 3
    hold(3.5, { hipAngle: 175, kneeAngle: 175 }),
    hold(4.5, {}),
  ])
  assert.equal(r.reps.length, 1)
  assert.ok(r.reps[0].faults.some((f) => f.id === 'hips-up'))
})

test('deadlift where hips and knees open together is good', () => {
  const r = run('deadlift', [hold(0, {}), hold(1, {}), hold(2, { hipAngle: 85, kneeAngle: 110, torsoLean: 60 }), hold(3, { hipAngle: 130, kneeAngle: 150 }), hold(3.6, {}), hold(4.6, {})])
  assert.equal(r.reps[0].good, true, JSON.stringify(r.reps[0].faults))
})

test('a rep is dropped, not guessed, when the body goes out of view', () => {
  const r = run('squat', [hold(0, {}), hold(1, {}), hold(1.8, { kneeAngle: 90, depth: 0.05 }), { t: 2, ok: false }, hold(2.5, {}), hold(3.5, {})])
  assert.equal(r.reps.length, 0)
  assert.ok(r.dropped >= 1)
})

test('kettlebell swing that squats instead of hinging is a fault', () => {
  const r = run('kb-swing', [hold(0, {}), hold(0.5, {}), hold(1, { hipAngle: 100, kneeAngle: 110 }), hold(1.5, { hipAngle: 178, kneeAngle: 175 }), hold(2, {})])
  assert.ok(r.reps[0].faults.some((f) => f.id === 'squatting'))
})

test('lunge needs the back knee near the floor', () => {
  const r = run('lunge', [hold(0, {}), hold(1, {}), hold(2, { lowerKnee: 95, frontKnee: 95, rearKneeGap: 0.3 }), hold(3, {}), hold(4, {})])
  assert.ok(r.reps[0].faults.some((f) => f.id === 'back-knee'))
})

test('library exercises map to their form check', () => {
  assert.equal(formCheckFor('back-squat').id, 'squat')
  assert.equal(formCheckFor('wall-ball').id, 'wall-ball')
  assert.equal(formCheckFor('romanian-deadlift').id, 'rdl')
  assert.equal(formCheckFor('run'), null)
  assert.equal(formCheckFor('sled-push'), null)
})

test('angle maths', () => {
  assert.equal(Math.round(angle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 })), 180)
  assert.equal(Math.round(angle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })), 90)
})

test('metrics from a side-on squat skeleton', () => {
  // Normalised landmarks for someone squatting side-on (facing right), left side nearest the camera
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.2 }))
  const set = (i, x, y, v = 0.99, z = -0.1) => (lm[i] = { x, y, z, visibility: v })
  set(11, 0.45, 0.35) // shoulder
  set(23, 0.4, 0.62) // hip, below knee height
  set(25, 0.58, 0.6) // knee
  set(27, 0.52, 0.85) // ankle
  set(29, 0.5, 0.87) // heel
  set(31, 0.58, 0.87) // toes
  set(15, 0.6, 0.45) // wrist
  const m = computeMetrics(lm, null, { width: 640, height: 480, view: 'side', needs: 'side' })
  assert.equal(m.ok, true)
  assert.equal(m.side, 'left')
  assert.ok(m.kneeAngle > 50 && m.kneeAngle < 110, `knee ${m.kneeAngle}`)
  assert.ok(m.depth > 0, 'hip crease below knee')
  const hidden = computeMetrics(lm.map((l, i) => (i === 27 ? { ...l, visibility: 0.1 } : l)), null, { width: 640, height: 480, view: 'side', needs: 'side' })
  assert.equal(hidden.ok, false)
  assert.match(hidden.reason, /feet/)
})
