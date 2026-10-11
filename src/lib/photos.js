// Stock photos (Unsplash) bundled in public/img. Cards pick one that matches the
// workout type, varied by id so a grid doesn't repeat the same picture.
export const photoUrl = (name) => `${import.meta.env.BASE_URL}img/${name}.jpg`

const POOLS = {
  Gym: ['gym', 'deadlift', 'barbell'],
  Kettlebell: ['dumbbells', 'ropes', 'timer'],
  Bodyweight: ['home', 'class'],
  Community: ['class', 'coach', 'barbell', 'home'],
  HYROX: ['hyrox-sled', 'hyrox-run', 'hyrox-row', 'hyrox-floor', 'hyrox-gym'],
}

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

// Hand-picked for the official workouts so neighbouring cards never repeat
const OFFICIAL = {
  'off-sweat-starter': 'ropes',
  'off-gym-strength-a': 'barbell',
  'off-gym-pull': 'gym',
  'off-gym-legs': 'deadlift',
  'off-gym-upper-circuit': 'dumbbells',
  'off-kb-complex': 'timer',
  'off-kb-amrap': 'class',
  'off-kb-strength': 'dumbbells',
  'off-bw-tabata': 'home',
  'off-bw-starter': 'coach',
  'off-bw-calisthenics': 'barbell',
  'off-bw-amrap': 'ropes',
  'off-hyrox-40': 'hyrox-run',
  'off-hyrox-sim': 'hyrox-sled',
  'off-hyrox-half': 'hyrox-floor',
  'off-hyrox-engine': 'hyrox-row',
  'off-hyrox-strength': 'hyrox-gym',
  'off-hyrox-stations': 'hyrox-floor',
  'off-hyrox-compromised': 'hyrox-run',
}

export function workoutPhoto(w) {
  if (w.cover) return w.cover
  if (OFFICIAL[w.id]) return photoUrl(OFFICIAL[w.id])
  const pool = POOLS[w.category] || POOLS.Community
  return photoUrl(pool[hash(w.id) % pool.length])
}

const PROGRAM_PHOTOS = {
  'prog-full-body-burner': 'ropes',
  'prog-strength-start': 'deadlift',
  'prog-no-equipment': 'home',
  'prog-hyrox-8wk': 'hyrox-sled',
  'prog-strength-to-hyrox': 'hyrox-gym',
}
export const programPhoto = (p) => photoUrl(PROGRAM_PHOTOS[p.id] || 'class')
