// Turns 33 pose landmarks into the numbers the rules use. Plain JavaScript (no React).
//
// Angles are in degrees (180 = straight). Distances are divided by leg length, so they work at
// any distance from the camera. Side view uses image (pixel) coordinates, which are precise for
// depth and lean. Front view uses the model's 3D "world" points for joint angles, because a knee
// bending towards the camera barely changes its angle on a flat image.
import { SIDES, angle, dist, leanFromVertical, mid } from './poseMath.js'

const VISIBLE = 0.5

const toPixels = (lms, width, height) => lms.map((l) => ({ x: l.x * width, y: l.y * height, z: (l.z ?? 0) * width, v: l.visibility ?? 1 }))

// The side of the body nearest the camera: the most visible one, or the one with smaller depth (z)
export function nearestSide(px) {
  const score = (s) => ['shoulder', 'hip', 'knee', 'ankle'].reduce((a, k) => a + px[SIDES[s][k]].v, 0)
  const l = score('left')
  const r = score('right')
  if (Math.abs(l - r) > 0.3) return l > r ? 'left' : 'right'
  const z = (s) => ['shoulder', 'hip', 'knee'].reduce((a, k) => a + px[SIDES[s][k]].z, 0)
  return z('left') <= z('right') ? 'left' : 'right'
}

// Which joints an exercise needs to see, so we can say what's out of frame
const NEED = {
  side: ['shoulder', 'hip', 'knee', 'ankle'],
  sideHands: ['shoulder', 'wrist', 'hip', 'knee', 'ankle'],
  both: ['hip', 'knee', 'ankle'],
}

/**
 * @param {Array} landmarks  33 normalised landmarks ({x, y, z, visibility})
 * @param {Array|null} world 33 world landmarks in metres, or null
 * @param {{width:number, height:number, view:'side'|'front', needs?:'side'|'sideHands'|'both'}} opts
 */
export function computeMetrics(landmarks, world, { width, height, view = 'side', needs = 'side' }) {
  if (!landmarks || landmarks.length < 33) return { ok: false, reason: 'Step into the frame' }
  const px = toPixels(landmarks, width, height)
  const side = nearestSide(px)
  const S = SIDES[side]
  const O = SIDES[side === 'left' ? 'right' : 'left']

  // Visibility of what this exercise needs
  const keys = NEED[needs] || NEED.side
  const sidesToCheck = needs === 'both' || view === 'front' ? [S, O] : [S]
  const hidden = sidesToCheck.flatMap((sd) => keys.filter((k) => px[sd[k]].v < VISIBLE))
  if (hidden.length) {
    const parts = [...new Set(hidden)].map((k) => (k === 'ankle' ? 'feet' : k === 'wrist' ? 'hands' : `${k}s`))
    return { ok: false, side, reason: `Move so your ${parts.slice(0, 3).join(', ')} are in view` }
  }

  const P = (sd, k) => px[sd[k]]
  const legLen = dist(P(S, 'hip'), P(S, 'knee')) + dist(P(S, 'knee'), P(S, 'ankle')) || 1

  // Joint angles: pixel coordinates from the side, 3D world points from the front
  const W = world && world.length >= 33 ? world : null
  const jointAngle = (sd, a, b, c) =>
    view === 'front' && W ? angle(W[sd[a]], W[sd[b]], W[sd[c]]) : angle(P(sd, a), P(sd, b), P(sd, c))

  const kneeS = jointAngle(S, 'hip', 'knee', 'ankle')
  const kneeO = jointAngle(O, 'hip', 'knee', 'ankle')
  const hipAngle = jointAngle(S, 'shoulder', 'hip', 'knee')
  const kneeAngle = view === 'front' ? (kneeS + kneeO) / 2 : kneeS

  const midfoot = mid(P(S, 'heel'), P(S, 'foot'))

  // Lunges: the back knee is the one lower in the image; the other leg is the front leg
  const sBack = P(S, 'knee').y >= P(O, 'knee').y
  const backKnee = sBack ? P(S, 'knee') : P(O, 'knee')
  const floorY = Math.max(...[S, O].flatMap((sd) => ['ankle', 'heel', 'foot'].map((k) => P(sd, k).y)))

  const kneeGap = Math.abs(P(S, 'knee').x - P(O, 'knee').x)
  const ankleGap = Math.abs(P(S, 'ankle').x - P(O, 'ankle').x)

  return {
    ok: true,
    side,
    kneeAngle,
    hipAngle,
    torsoLean: leanFromVertical(P(S, 'shoulder'), P(S, 'hip')),
    // Positive when the hip crease is below the top of the knee
    depth: (P(S, 'hip').y - P(S, 'knee').y) / legLen,
    // Wrist (bar or bell) distance in front of or behind mid-foot
    wristOffset: Math.abs(P(S, 'wrist').x - midfoot.x) / legLen,
    // Positive when the heel is higher than the toes
    heelLift: (P(S, 'foot').y - P(S, 'heel').y) / legLen,
    kneeRatio: ankleGap > 1 ? kneeGap / ankleGap : 1,
    lowerKnee: Math.min(kneeS, kneeO),
    frontKnee: sBack ? kneeO : kneeS,
    rearKneeGap: (floorY - backKnee.y) / legLen,
  }
}
