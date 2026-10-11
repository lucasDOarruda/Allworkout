import { exerciseById } from '../data/exercises'

export const uid = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const AVATAR_COLORS = ['#0047AB', '#0E7C66', '#B4451F', '#7A3DB8', '#A0185A', '#1F6F9E', '#8A6A00']

export function initials(name = '?') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

// ---------- Dates ----------

export function timeAgo(iso) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

export function fmtClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export const fmtMinutes = (sec) => `${Math.round(sec / 60)} min`

// Monday 00:00 local time of the week containing `date`
export function weekStart(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d
}
export const weekKey = (date) => weekStart(date).toISOString().slice(0, 10)

export const fmtKg = (kg) =>
  kg >= 10000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg).toLocaleString()} kg`

// ---------- Workouts & parts ----------

export const allMoves = (w) => w.parts.flatMap((p) => p.moves)

// The format that best describes a workout (ignores warmup blocks)
export const primaryFormat = (w) => (w.parts.find((p) => p.format !== 'timed') || w.parts[0]).format

export function workoutEquipment(w) {
  const set = new Set()
  for (const mv of allMoves(w)) {
    const ex = mv.exerciseId && exerciseById[mv.exerciseId]
    set.add(ex ? ex.equipment : mv.equipment || 'Bodyweight')
  }
  return [...set]
}

export const workoutFormats = (w) => [...new Set(w.parts.filter((p) => p.format !== 'timed' || w.parts.length === 1).map((p) => p.format))]

export function partMinutes(p) {
  const n = p.moves.length
  switch (p.format) {
    case 'circuit':
      return Math.round(((Number(p.work) + Number(p.rest)) * n * p.rounds) / 60)
    case 'emom':
      return n * p.rounds
    case 'amrap':
    case 'timed':
      return Number(p.minutes)
    case 'tabata':
      return n * 4
    default: {
      const sec = p.moves.reduce((acc, mv) => acc + mv.sets * (40 + Number(mv.rest || 0)), 0)
      return Math.max(3, Math.round(sec / 60))
    }
  }
}

export const workoutMinutes = (w) => w.parts.reduce((a, p) => a + partMinutes(p), 0)

export function partRounds(p) {
  switch (p.format) {
    case 'circuit':
    case 'emom':
      return p.rounds
    case 'tabata':
      return 8
    case 'sets':
      return p.moves.reduce((a, mv) => a + Number(mv.sets), 0) + ' sets'
    case 'amrap':
      return 'Max'
    default:
      return 1
  }
}

export function partSummary(p) {
  switch (p.format) {
    case 'circuit':
      return `${p.rounds} rounds · ${p.work}s on / ${p.rest}s off`
    case 'emom':
      return `${partMinutes(p)} min · ${p.rounds} rounds`
    case 'amrap':
      return `${p.minutes} minute cap`
    case 'tabata':
      return '8 × 20s on / 10s off per move'
    case 'timed':
      return `${p.minutes} minutes`
    default:
      return `${p.moves.reduce((a, mv) => a + Number(mv.sets), 0)} total sets`
  }
}

// "6 REPS" / "30 SEC" style label for a move target
export function repsLabel(reps) {
  const r = String(reps).trim()
  const sec = r.match(/^(\d+)\s*s(ec)?$/i)
  if (sec) return `${sec[1]} sec`
  if (/^\d+$/.test(r)) return `${r} reps`
  return r
}

// Interval timeline for Circuit, EMOM and Tabata parts
export function buildTimeline(p) {
  const segs = []
  const n = p.moves.length
  if (p.format === 'circuit') {
    for (let r = 0; r < p.rounds; r++) {
      p.moves.forEach((mv, i) => {
        segs.push({ kind: 'work', moveIdx: i, dur: Number(p.work), round: r + 1, label: `Round ${r + 1} / ${p.rounds}` })
        const last = r === p.rounds - 1 && i === n - 1
        if (!last && p.rest > 0) segs.push({ kind: 'rest', moveIdx: (i + 1) % n, dur: Number(p.rest), round: r + 1, label: 'Rest' })
      })
    }
  } else if (p.format === 'emom') {
    for (let r = 0; r < p.rounds; r++) {
      p.moves.forEach((mv, i) => {
        const minute = r * n + i + 1
        segs.push({ kind: 'work', moveIdx: i, dur: 60, round: r + 1, minute, label: `Round ${r + 1} / Min ${minute}` })
      })
    }
  } else if (p.format === 'tabata') {
    p.moves.forEach((mv, i) => {
      for (let r = 0; r < 8; r++) {
        segs.push({ kind: 'work', moveIdx: i, dur: 20, round: r + 1, label: `Tabata ${i + 1} · Round ${r + 1} / 8` })
        const last = i === n - 1 && r === 7
        if (!last) segs.push({ kind: 'rest', moveIdx: r === 7 ? i + 1 : i, dur: 10, round: r + 1, label: 'Rest' })
      }
    })
  }
  return segs
}

// Shrink an uploaded image so it fits comfortably in localStorage
export function fileToDataUrl(file, max = 560, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Not an image'))
    }
    img.src = url
  })
}

// YouTube watch/short links → embeddable URL (search links can't be embedded)
export function youtubeEmbed(url = '') {
  const id = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)?.[1]
  return id ? `https://www.youtube.com/embed/${id}?rel=0` : null
}

// ---------- Sound ----------

let ctx
let muted = (() => {
  try {
    return localStorage.getItem('aw:muted') === '1'
  } catch {
    return false
  }
})()
export const isMuted = () => muted
export function setMuted(v) {
  muted = v
  try {
    localStorage.setItem('aw:muted', v ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function beep(freq = 880, ms = 140, vol = 0.25) {
  if (muted && vol > 0.001) return
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + ms / 1000 + 0.02)
  } catch {
    /* audio not available */
  }
}
export const unlockAudio = () => beep(440, 10, 0.0001)

// ---------- Progress stats ----------

export const sessionsFor = (db, userId) =>
  db.sessions.filter((s) => s.userId === userId || (s.partnerIds || []).includes(userId))

export const sessionVolume = (s) =>
  (s.sets || []).reduce((acc, st) => acc + (Number(st.reps) || 0) * (Number(st.kg) || 0), 0)

export function weeklyStreak(sessions) {
  const weeks = new Set(sessions.map((s) => weekKey(s.date)))
  let cursor = weekStart()
  if (!weeks.has(weekKey(cursor))) cursor.setDate(cursor.getDate() - 7)
  let streak = 0
  while (weeks.has(weekKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

export function personalRecords(ownSessions) {
  const prs = {}
  for (const s of ownSessions) {
    for (const st of s.sets || []) {
      const kg = Number(st.kg) || 0
      const reps = Number(st.reps) || 0
      if (!reps) continue
      const cur = prs[st.name]
      if (!cur || kg > cur.kg || (kg === cur.kg && reps > cur.reps)) {
        prs[st.name] = { name: st.name, kg, reps, date: s.date }
      }
    }
  }
  return Object.values(prs).sort((a, b) => b.kg - a.kg || b.reps - a.reps)
}

export function computeStats(db, userId) {
  const all = sessionsFor(db, userId).sort((a, b) => new Date(b.date) - new Date(a.date))
  const own = all.filter((s) => s.userId === userId)
  const totalKg = own.reduce((acc, s) => acc + sessionVolume(s), 0)
  const minutes = Math.round(all.reduce((acc, s) => acc + (s.duration || 0), 0) / 60)
  const streak = weeklyStreak(all)
  const prs = personalRecords(own)
  const withPartner = all.some((s) => (s.partnerIds || []).length > 0 || s.userId !== userId)
  const published = db.workouts.filter((w) => w.authorId === userId).length
  const formats = new Set(all.map((s) => s.format))

  const badges = [
    { id: 'first', icon: 'target', name: 'First session', desc: 'Log your first session', earned: all.length >= 1 },
    { id: 'ten', icon: 'flag', name: 'Ten down', desc: 'Complete 10 sessions', earned: all.length >= 10 },
    { id: 'fifty', icon: 'medal', name: 'Half century', desc: 'Complete 50 sessions', earned: all.length >= 50 },
    { id: 'streak3', icon: 'flame', name: 'On fire', desc: '3-week streak', earned: streak >= 3 },
    { id: 'ton', icon: 'dumbbell', name: '10 t club', desc: 'Lift 10,000 kg in total', earned: totalKg >= 10000 },
    { id: 'partner', icon: 'users', name: 'Better together', desc: 'Train with a partner', earned: withPartner },
    { id: 'creator', icon: 'pencil', name: 'Creator', desc: 'Publish a workout', earned: published > 0 },
    { id: 'variety', icon: 'layers', name: 'All-rounder', desc: 'Try 3 different formats', earned: formats.size >= 3 },
  ]

  // Sessions and volume per week, last 12 weeks (oldest first)
  const weeks = []
  const start = weekStart()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(start)
    d.setDate(d.getDate() - i * 7)
    const key = weekKey(d)
    weeks.push({ key, label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), count: 0, volume: 0 })
  }
  const byKey = Object.fromEntries(weeks.map((w) => [w.key, w]))
  for (const s of all) {
    const w = byKey[weekKey(s.date)]
    if (w) {
      w.count++
      if (s.userId === userId) w.volume += sessionVolume(s)
    }
  }

  return { all, own, totalKg, minutes, streak, prs, badges, weeks }
}

// ---------- Activity helpers ----------

const GROUP = {
  Quads: 'Legs', Hamstrings: 'Legs', Glutes: 'Legs', Calves: 'Legs', Adductors: 'Legs', Abductors: 'Legs',
  Chest: 'Push', Shoulders: 'Push', Triceps: 'Push',
  Lats: 'Pull', Biceps: 'Pull', 'Traps & Neck': 'Pull', Forearms: 'Pull',
  Abs: 'Core', Obliques: 'Core', 'Lower back': 'Core',
  Cardio: 'Cardio',
}

// Rough share of work per muscle group, from logged sets or the workout's moves
export function muscleSplit(session, workout) {
  const score = {}
  const add = (exerciseId, weight) => {
    const ex = exerciseById[exerciseId]
    if (!ex) return
    ex.muscles.forEach((mu, i) => {
      const g = GROUP[mu]
      score[g] = (score[g] || 0) + weight * (i === 0 ? 1 : 0.4)
    })
  }
  const byName = Object.fromEntries(Object.values(exerciseById).map((e) => [e.name, e.id]))
  if (session.sets?.length) {
    for (const st of session.sets) add(st.exerciseId || byName[st.name.replace(/ \((L|R)\)$/, '')], 1)
  } else if (workout) {
    for (const p of workout.parts) for (const mv of p.moves) add(mv.exerciseId, p.format === 'timed' ? 0.3 : 1)
  }
  const total = Object.values(score).reduce((a, b) => a + b, 0)
  if (!total) return []
  return Object.entries(score)
    .map(([group, v]) => ({ group, pct: Math.round((v / total) * 100) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)
}

export function fmtDuration(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return h ? `${h}h ${m}m` : `${m}m`
}

// This week at a glance: sessions, time, volume and which days had training
export function weekSummary(sessions) {
  const start = weekStart()
  const mine = sessions.filter((s) => new Date(s.date) >= start)
  const days = Array.from({ length: 7 }, (_, i) => mine.some((s) => ((new Date(s.date).getDay() + 6) % 7) === i))
  return {
    count: mine.length,
    time: mine.reduce((a, s) => a + (s.duration || 0), 0),
    volume: mine.reduce((a, s) => a + sessionVolume(s), 0),
    days,
  }
}

// Only allow http(s) links from data (workout videos, payment links, imported backups).
// Anything else, like javascript: URLs, is dropped so it can't run code.
export function safeUrl(url) {
  try {
    const u = new URL(String(url || ''))
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : undefined
  } catch {
    return undefined
  }
}
