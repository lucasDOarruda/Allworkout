// The workout part in progress, saved on this device so it survives switching apps, locking the
// phone, Safari reloading the tab, closing the browser and losing internet.
//
// Saved in localStorage on purpose: iOS can freeze a page the moment it goes to the background,
// and localStorage writes finish immediately, whereas IndexedDB writes are asynchronous and may
// not complete in time. The record is small (one part's progress).
//
// One active session at a time. It's only cleared when the part is finished or the member
// discards it.
const KEY = 'aw:active-session'
const listeners = new Set()

// What identifies a part's shape, so a saved session is never applied to an edited workout
export const partSignature = (p) => `${p.format}|${p.moves.length}|${p.rounds}|${p.minutes}|${p.moves.map((m) => `${m.name}:${m.sets}`).join(',')}`

export function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    return s && s.workoutId && s.state ? s : null
  } catch {
    return null
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...session, savedAt: Date.now() }))
  } catch {
    /* storage full or private mode: the workout still runs, it just can't be restored */
  }
  listeners.forEach((l) => l())
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export function onSessionChange(fn) {
  listeners.add(fn)
  const onStorage = (e) => e.key === KEY && fn()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    window.removeEventListener('storage', onStorage)
  }
}

// The part of the player state worth keeping (the part itself and its timeline are rebuilt)
export const PERSISTED = ['phase', 'remaining', 'paused', 'elapsed', 'segIdx', 'moveIdx', 'setIdx', 'resting', 'log', 'rounds']
