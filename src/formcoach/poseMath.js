// Pose geometry helpers. Plain JavaScript (no React), so the rules can be tested offline.
// Landmark indices follow MediaPipe Pose (33 points).

export const SIDES = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27, heel: 29, foot: 31 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28, heel: 30, foot: 32 },
}

// Lines drawn for the skeleton overlay (no face points)
export const CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
  [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
]
export const SKELETON_POINTS = [...new Set(CONNECTIONS.flat())]

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0))

// Angle at b between b→a and b→c, in degrees (180 = straight joint). Works in 2D or 3D.
export function angle(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) }
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: (c.z ?? 0) - (b.z ?? 0) }
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z
  const n = Math.hypot(v1.x, v1.y, v1.z) * Math.hypot(v2.x, v2.y, v2.z)
  if (!n) return 180
  return (Math.acos(Math.max(-1, Math.min(1, dot / n))) * 180) / Math.PI
}

// Lean of the line bottom→top away from vertical, in degrees (0 = upright). Image y points down.
export function leanFromVertical(top, bottom) {
  const dx = top.x - bottom.x
  const dy = bottom.y - top.y
  return Math.abs((Math.atan2(dx, dy) * 180) / Math.PI)
}

export const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: ((a.z ?? 0) + (b.z ?? 0)) / 2 })
