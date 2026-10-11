import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { buildSeed } from './data/seed'
import { OFFICIAL_WORKOUTS } from './data/workouts'
import { OFFICIAL_PROGRAMS, programDays } from './data/programs'
import { AVATAR_COLORS, uid } from './lib/utils'

const KEY = 'all-workout:db:v3'
const THEME_KEY = 'all-workout:theme:v4' // v4: dark is the default for everyone

const isDemo = (id) => typeof id === 'string' && id.startsWith('demo-')

// Older versions shipped demo members (ids starting "demo-") with demo sessions, comments,
// coaching links and workouts. Remove all of it, keeping anything real members created.
export function removeDemoData(d) {
  return removeUsers(d, (id, u) => isDemo(id) || u?.demo)
}

// On the live site every member signs in with Google, so any profile without a Google
// account is sample data or a leftover from an older version. Removed at the first sign-in.
export function removeSampleAccounts(d) {
  return removeUsers(d, (id, u) => isDemo(id) || u?.demo || !u?.googleUid)
}

// Remove the users matching drop(id, user) and every record tied to them
function removeUsers(d, drop) {
  const demoIds = new Set(Object.keys(d.users || {}).filter((id) => drop(id, d.users[id])))
  if (!demoIds.size && !d.sessions?.some((s) => isDemo(s.userId))) return d
  const gone = (id) => demoIds.has(id) || isDemo(id)
  const users = Object.fromEntries(
    Object.entries(d.users || {})
      .filter(([id]) => !gone(id))
      .map(([id, u]) => [id, { ...u, partners: (u.partners || []).filter((p) => !gone(p)) }]),
  )
  const workouts = (d.workouts || [])
    .filter((w) => !gone(w.authorId))
    .map((w) => ({ ...w, unlocked: (w.unlocked || []).filter((x) => !gone(x)), requests: (w.requests || []).filter((x) => !gone(x)) }))
  const workoutIds = new Set(workouts.map((w) => w.id))
  const keepWorkout = (id) => workoutIds.has(id) || String(id).startsWith('off-')
  const sessions = (d.sessions || []).filter((s) => !gone(s.userId)).map((s) => ({ ...s, partnerIds: (s.partnerIds || []).filter((p) => !gone(p)) }))
  const sessionIds = new Set(sessions.map((s) => s.id))
  const cleanList = (obj, keep) =>
    Object.fromEntries(
      Object.entries(obj || {})
        .filter(([k]) => keep(k))
        .map(([k, ids]) => [k, (ids || []).filter((x) => !gone(x))]),
    )
  return {
    ...d,
    currentUserId: gone(d.currentUserId) ? null : d.currentUserId,
    users,
    workouts,
    sessions,
    comments: (d.comments || []).filter((c) => !gone(c.userId) && (c.workoutId ? keepWorkout(c.workoutId) : sessionIds.has(c.sessionId))),
    likes: cleanList(d.likes, keepWorkout),
    kudos: cleanList(d.kudos, (k) => sessionIds.has(k)),
    enrollments: Object.fromEntries(Object.entries(d.enrollments || {}).filter(([k]) => !gone(k))),
    coaching: (d.coaching || []).filter((c) => !gone(c.coachId) && !gone(c.clientId)),
    assignments: (d.assignments || []).filter((a) => !gone(a.coachId) && !gone(a.clientId) && keepWorkout(a.workoutId)),
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return removeDemoData(JSON.parse(raw))
  } catch {
    /* corrupt or unavailable storage, fall back to an empty start */
  }
  return buildSeed()
}

function save(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
    return true
  } catch {
    return false // storage full or blocked; keep working in memory
  }
}

const StoreCtx = createContext(null)

export function StoreProvider({ children }) {
  const [db, setDb] = useState(load)
  const [toast, setToast] = useState(null)
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'dark'
    } catch {
      return 'dark'
    }
  })


  // Keep several open tabs in sync (handy for testing two "accounts" side by side)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY && e.newValue) setDb(JSON.parse(e.newValue))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const mutate = useCallback((fn) => {
    setDb((prev) => {
      const draft = structuredClone(prev)
      fn(draft)
      return draft
    })
  }, [])

  const notify = useCallback((text, kind = 'info') => {
    const id = Date.now()
    setToast({ id, text, kind })
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2800)
  }, [])

  useEffect(() => {
    if (!save(db)) notify('Storage is full. Remove some images or export a backup.', 'error')
  }, [db, notify])

  const me = db.currentUserId ? db.users[db.currentUserId] || null : null
  const joined = !!me
  const role = me?.role || 'guest'

  const workouts = useMemo(
    () =>
      [...OFFICIAL_WORKOUTS, ...db.workouts.filter((w) => !w.private || w.authorId === db.currentUserId)].map((w) => ({ ...w, likes: db.likes[w.id] || [] })),
    [db.workouts, db.likes, db.currentUserId],
  )

  const actions = useMemo(
    () => ({
      signIn: (userId) => mutate((d) => void (d.currentUserId = userId)),
      signOut: () => {
        mutate((d) => void (d.currentUserId = null))
        import('./lib/firebase').then((m) => m.googleSignOut()).catch(() => {})
      },
      createAccount: ({ name, role, photo = null, email = '', googleUid = null }) => {
        const id = uid('u')
        mutate((d) => {
          d.users[id] = {
            id,
            name: name.trim(),
            role,
            photo,
            email,
            googleUid,
            bio: '',
            payLink: '',
            color: AVATAR_COLORS[Object.keys(d.users).length % AVATAR_COLORS.length],
            partners: [],
            favorites: [],
            seeking: role === 'client',
            goals: '',
            specialties: '',
            coachPrice: '',
            createdAt: new Date().toISOString(),
          }
          d.currentUserId = id
        })
        return id
      },
      updateProfile: (patch) => mutate((d) => Object.assign(d.users[d.currentUserId], patch)),
      // Admin
      setRole: (userId, role) => mutate((d) => void (d.users[userId].role = role)),
      deleteUser: (userId) =>
        mutate((d) => {
          delete d.users[userId]
          delete d.enrollments[userId]
          for (const u of Object.values(d.users)) u.partners = u.partners.filter((x) => x !== userId)
          d.coaching = d.coaching.filter((c) => c.coachId !== userId && c.clientId !== userId)
          d.assignments = d.assignments.filter((a) => a.coachId !== userId && a.clientId !== userId)
          if (d.currentUserId === userId) d.currentUserId = null
        }),
      togglePartner: (otherId) =>
        mutate((d) => {
          const a = d.users[d.currentUserId]
          const b = d.users[otherId]
          if (a.partners.includes(otherId)) {
            a.partners = a.partners.filter((x) => x !== otherId)
            b.partners = b.partners.filter((x) => x !== a.id)
          } else {
            a.partners.push(otherId)
            if (!b.partners.includes(a.id)) b.partners.push(a.id)
          }
        }),
      toggleFavorite: (exerciseId) =>
        mutate((d) => {
          const u = d.users[d.currentUserId]
          u.favorites = u.favorites.includes(exerciseId) ? u.favorites.filter((x) => x !== exerciseId) : [...u.favorites, exerciseId]
        }),
      toggleLike: (workoutId) =>
        mutate((d) => {
          const list = d.likes[workoutId] || []
          d.likes[workoutId] = list.includes(d.currentUserId)
            ? list.filter((x) => x !== d.currentUserId)
            : [...list, d.currentUserId]
        }),
      addComment: (workoutId, text) =>
        mutate((d) =>
          d.comments.push({ id: uid('c'), workoutId, userId: d.currentUserId, text, createdAt: new Date().toISOString() }),
        ),
      addSessionComment: (sessionId, text) =>
        mutate((d) =>
          d.comments.push({ id: uid('c'), sessionId, userId: d.currentUserId, text, createdAt: new Date().toISOString() }),
        ),
      toggleKudos: (sessionId) =>
        mutate((d) => {
          const list = d.kudos[sessionId] || []
          d.kudos[sessionId] = list.includes(d.currentUserId) ? list.filter((x) => x !== d.currentUserId) : [...list, d.currentUserId]
        }),
      // Programs
      enroll: (programId) =>
        mutate((d) => void (d.enrollments[d.currentUserId || 'solo'] = { programId, startedAt: new Date().toISOString(), done: [] })),
      leaveProgram: () => mutate((d) => void delete d.enrollments[d.currentUserId || 'solo']),
      deleteComment: (id) => mutate((d) => void (d.comments = d.comments.filter((c) => c.id !== id))),
      // Workouts
      saveWorkout: (w) => {
        const id = w.id || uid('cw')
        mutate((d) => {
          const i = d.workouts.findIndex((x) => x.id === id)
          // Private workouts (members' own, or a trainer's "just for me") sit under "Mine"
          const category = w.private ? 'Mine' : 'Community'
          if (i >= 0) d.workouts[i] = { ...d.workouts[i], ...w, id, ...(d.workouts[i].sharedBy ? {} : { category }) }
          else
            d.workouts.push({
              ...w,
              id,
              official: false,
              category,
              authorId: d.currentUserId,
              unlocked: [],
              requests: [],
              createdAt: new Date().toISOString(),
            })
        })
        return id
      },
      // A workout a friend shared: a private copy only this member sees (category "Shared")
      saveSharedWorkout: (w, from) => {
        const id = uid('sh')
        mutate((d) => {
          d.workouts.push({
            name: String(w.name || 'Shared workout').slice(0, 80),
            description: String(w.description || ''),
            level: w.level || 'All levels',
            focus: w.focus || '',
            parts: Array.isArray(w.parts) ? w.parts : [],
            cover: typeof w.cover === 'string' && w.cover.startsWith('data:image/') ? w.cover : null,
            id,
            official: false,
            premium: false,
            price: '',
            private: true,
            category: 'Shared',
            sharedBy: { uid: from.uid, name: String(from.name || 'A friend').slice(0, 60) },
            shareId: from.shareId || null,
            authorId: d.currentUserId,
            unlocked: [],
            requests: [],
            createdAt: new Date().toISOString(),
          })
        })
        return id
      },
      deleteWorkout: (id) =>
        mutate((d) => {
          d.workouts = d.workouts.filter((w) => w.id !== id)
          d.comments = d.comments.filter((c) => c.workoutId !== id)
          d.assignments = d.assignments.filter((a) => a.workoutId !== id)
          delete d.likes[id]
        }),
      requestAccess: (workoutId) =>
        mutate((d) => {
          const w = d.workouts.find((x) => x.id === workoutId)
          if (w && !w.requests.includes(d.currentUserId)) w.requests.push(d.currentUserId)
        }),
      setUnlocked: (workoutId, userId, on) =>
        mutate((d) => {
          const w = d.workouts.find((x) => x.id === workoutId)
          if (!w) return
          w.unlocked = w.unlocked.filter((x) => x !== userId)
          w.requests = w.requests.filter((x) => x !== userId)
          if (on) w.unlocked.push(userId)
        }),
      // Coaching
      requestCoach: (coachId) =>
        mutate((d) => {
          d.coaching = d.coaching.filter((c) => c.clientId !== d.currentUserId)
          d.coaching.push({ id: uid('co'), coachId, clientId: d.currentUserId, status: 'pending', createdAt: new Date().toISOString() })
        }),
      leaveCoach: () => mutate((d) => void (d.coaching = d.coaching.filter((c) => c.clientId !== d.currentUserId))),
      respondCoaching: (linkId, accept) =>
        mutate((d) => {
          const link = d.coaching.find((c) => c.id === linkId)
          if (!link) return
          if (accept) {
            link.status = 'active'
            if (d.users[link.clientId]) d.users[link.clientId].seeking = false
          } else d.coaching = d.coaching.filter((c) => c.id !== linkId)
        }),
      assignWorkout: (clientId, workoutId, note) =>
        mutate((d) =>
          d.assignments.push({ id: uid('as'), coachId: d.currentUserId, clientId, workoutId, note, createdAt: new Date().toISOString() }),
        ),
      removeAssignment: (id) => mutate((d) => void (d.assignments = d.assignments.filter((a) => a.id !== id))),
      // Part-by-part progress through a workout
      completePart: (workoutId, partIdx, result) =>
        mutate((d) => {
          const key = d.currentUserId || 'solo'
          d.progress[key] = d.progress[key] || {}
          const pr = d.progress[key][workoutId] || { done: [], duration: 0, sets: [], rounds: 0, saved: false }
          if (!pr.done.includes(partIdx)) pr.done.push(partIdx)
          pr.duration += result.duration || 0
          pr.sets = [...pr.sets, ...(result.sets || [])]
          pr.rounds += result.rounds || 0
          pr.saved = false
          d.progress[key][workoutId] = pr
        }),
      resetProgress: (workoutId) =>
        mutate((d) => {
          const key = d.currentUserId || 'solo'
          if (d.progress[key]) delete d.progress[key][workoutId]
        }),
      saveSession: (s) =>
        mutate((d) => {
          d.sessions.push({ ...s, id: uid('s'), userId: d.currentUserId })
          // Tick off the next program day if this was its workout
          const en = d.enrollments[d.currentUserId]
          const prog = en && OFFICIAL_PROGRAMS.find((p) => p.id === en.programId)
          if (prog) {
            const next = programDays(prog).find((x) => !en.done.includes(x.key))
            if (next && next.workoutId === s.workoutId) en.done.push(next.key)
          }
          for (const key of [d.currentUserId, 'solo']) {
            const pr = d.progress[key]?.[s.workoutId]
            if (pr) pr.saved = true
          }
        }),
      deleteSession: (id) => mutate((d) => void (d.sessions = d.sessions.filter((s) => s.id !== id))),
      replaceDb: (next) => setDb(next),
      clearLocalData: () => setDb(buildSeed()),
      removeSampleAccounts: () => setDb((d) => removeSampleAccounts(d)),
    }),
    [mutate],
  )

  const progressFor = useCallback((workoutId) => db.progress[me?.id || 'solo']?.[workoutId] || null, [db.progress, me])

  const value = { db, me, joined, role, workouts, actions, progressFor, toast, notify, theme, setTheme: setThemeState }
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export const useStore = () => useContext(StoreCtx)

export function canAccess(w, me) {
  if (!w.premium) return true
  if (!me) return false
  return me.role === 'admin' || w.authorId === me.id || (w.unlocked || []).includes(me.id)
}

export const isCoach = (u) => u?.role === 'coach' || u?.role === 'admin'

// ---------- Tiny hash router ----------

const parse = () => (window.location.hash.replace(/^#\/?/, '') || 'welcome').split('/').map(decodeURIComponent)

export function useRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const on = () => {
      setRoute(parse())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export const go = (path) => {
  window.location.hash = `/${path}`
}
