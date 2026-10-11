// Shared (cloud) data in Firestore: member profiles, sign-in history, presence and
// daily traffic. Everything else in the app is still stored per browser.
//
// Collections (see firestore.rules in the backend repo):
//   users/{uid}                 public profile: name, photo, role, createdAt, lastSeenAt, signInCount
//   users/{uid}/private/account email, last sign-in and device (owner + admins only)
//   users/{uid}/signins/{id}    sign-in history (owner writes, admins read)
//   presence/{uid}              last activity, for "online now" (admins read)
//   stats/{YYYY-MM-DD}          daily views, visitors, sign-ins (increment-only, admins read)
//   crm/{uid}                   admin notes, tags, follow-up (admins only)
import { app } from './firebase'

const ONLINE_MS = 2 * 60 * 1000
export const onlineCutoff = () => Date.now() - ONLINE_MS

// Local calendar day, e.g. 2026-10-11
export const dayKey = (d = new Date()) => d.toLocaleDateString('en-CA')

export function deviceLabel() {
  const ua = navigator.userAgent
  const os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Other'
  const browser = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  return `${os} · ${browser}`
}

// Dev-only stand-in so the admin screens can be tested without a real database.
// Turn on with localStorage['aw:cloud-mock'] = '1' while running `npm run dev`.
const isMockMode = () => {
  try {
    return import.meta.env.DEV && localStorage.getItem('aw:cloud-mock') === '1'
  } catch {
    return false
  }
}

let fs = null
let db = null
async function firestore() {
  if (!fs) {
    fs = await import('firebase/firestore')
    db = fs.getFirestore(app)
  }
  return fs
}

async function authUid() {
  const { getAuth } = await import('firebase/auth')
  const auth = getAuth(app)
  await auth.authStateReady?.()
  return auth.currentUser?.uid || null
}

const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null)

// ---------- Writes (members and visitors) ----------

// Count one page view per load, and one visitor per browser per day
export async function trackVisit() {
  if (!import.meta.env.PROD) return
  try {
    const m = await firestore()
    const key = `aw:visited:${dayKey()}`
    let firstToday = false
    try {
      firstToday = !localStorage.getItem(key)
      localStorage.setItem(key, '1')
    } catch {
      /* private mode */
    }
    await m.setDoc(m.doc(db, 'stats', dayKey()), { views: m.increment(1), ...(firstToday ? { visitors: m.increment(1) } : {}) }, { merge: true })
  } catch {
    /* Firestore not set up yet, or offline: traffic just isn't counted */
  }
}

// After a Google sign-in: profile, private contact details and a sign-in history entry
export async function recordSignIn(profile, role) {
  if (import.meta.env.DEV && isMockMode()) return mockRecordSignIn(profile, role)
  try {
    const m = await firestore()
    if ((await authUid()) !== profile.uid) return
    const ref = m.doc(db, 'users', profile.uid)
    const snap = await m.getDoc(ref)
    const now = m.serverTimestamp()
    await m.setDoc(
      ref,
      {
        name: profile.name,
        photo: profile.photo || null,
        lastSeenAt: now,
        signInCount: m.increment(1),
        // Role and join date are only written the first time; admins manage roles after that
        ...(snap.exists() ? {} : { role, createdAt: now }),
      },
      { merge: true },
    )
    const device = deviceLabel()
    await m.setDoc(m.doc(db, 'users', profile.uid, 'private', 'account'), { email: profile.email, lastSignInAt: now, lastDevice: device }, { merge: true })
    await m.addDoc(m.collection(db, 'users', profile.uid, 'signins'), { at: now, device })
    await m.setDoc(m.doc(db, 'stats', dayKey()), { signins: m.increment(1) }, { merge: true })
  } catch {
    /* Firestore not set up yet: the app keeps working, the admin just won't see it */
  }
}

// Heartbeat while a signed-in member has the app open (for "online now" and active days)
let beatTimer = null
export function startPresence(me) {
  stopPresence()
  if (!me?.googleUid || (import.meta.env.DEV && isMockMode()) || !import.meta.env.PROD) return
  const beat = async () => {
    if (document.visibilityState !== 'visible') return
    try {
      const m = await firestore()
      if ((await authUid()) !== me.googleUid) return
      const screen = (location.hash.replace(/^#\/?/, '') || 'welcome').split('/')[0]
      await m.setDoc(
        m.doc(db, 'presence', me.googleUid),
        { lastActive: m.serverTimestamp(), screen, days: m.arrayUnion(dayKey()) },
        { merge: true },
      )
      await m.setDoc(m.doc(db, 'users', me.googleUid), { lastSeenAt: m.serverTimestamp() }, { merge: true })
    } catch {
      /* not set up yet */
    }
  }
  beat()
  beatTimer = setInterval(beat, 60 * 1000)
  document.addEventListener('visibilitychange', beat)
  stopPresence.cleanup = () => document.removeEventListener('visibilitychange', beat)
}
export function stopPresence() {
  if (beatTimer) clearInterval(beatTimer)
  beatTimer = null
  stopPresence.cleanup?.()
}

// ---------- Reads and CRM (admins only; Firestore rules enforce it) ----------

function cloudError(err) {
  const code = err?.code || ''
  if (code === 'permission-denied') return 'Firestore rules aren’t deployed yet, or this account isn’t an admin there.'
  if (code === 'failed-precondition' || code === 'not-found' || /database .* does not exist/i.test(err?.message || ''))
    return 'The Firestore database hasn’t been created yet.'
  if (code === 'unavailable') return 'Can’t reach Firestore right now. Check your connection.'
  if (code === 'timeout') return 'Firestore didn’t answer. If the database hasn’t been created yet, create it first.'
  return 'Couldn’t load cloud data.'
}

// Firestore keeps retrying when the database doesn't exist, so give up after a while
const withTimeout = (promise, ms = 12000) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'timeout' })), ms))])

// Members with contact details, CRM notes and presence, plus 30 days of traffic
export async function loadAdminData() {
  if (import.meta.env.DEV && isMockMode()) return mockLoad()
  try {
    const m = await firestore()
    const [users, presence, crm, stats] = await withTimeout(Promise.all([
      m.getDocs(m.collection(db, 'users')),
      m.getDocs(m.collection(db, 'presence')),
      m.getDocs(m.collection(db, 'crm')),
      m.getDocs(m.query(m.collection(db, 'stats'), m.where(m.documentId(), '>=', dayKey(new Date(Date.now() - 29 * 86400000))))),
    ]))
    const presenceBy = Object.fromEntries(presence.docs.map((d) => [d.id, d.data()]))
    const crmBy = Object.fromEntries(crm.docs.map((d) => [d.id, d.data()]))
    const privateDocs = await withTimeout(Promise.all(users.docs.map((d) => m.getDoc(m.doc(db, 'users', d.id, 'private', 'account')))))
    const members = users.docs.map((d, i) => {
      const u = d.data()
      const p = presenceBy[d.id] || {}
      const acc = privateDocs[i].exists() ? privateDocs[i].data() : {}
      return {
        uid: d.id,
        name: u.name || 'Unknown',
        photo: u.photo || null,
        role: u.role || 'client',
        createdAt: toDate(u.createdAt),
        lastSeenAt: toDate(p.lastActive) || toDate(u.lastSeenAt),
        signInCount: u.signInCount || 0,
        email: acc.email || '',
        lastDevice: acc.lastDevice || '',
        lastSignInAt: toDate(acc.lastSignInAt),
        screen: p.screen || '',
        activeDays: p.days || [],
        crm: crmBy[d.id] || {},
      }
    })
    const traffic = stats.docs.map((d) => ({ day: d.id, ...d.data() }))
    return { members, traffic }
  } catch (err) {
    return { error: cloudError(err) }
  }
}

export async function loadSignins(uid) {
  if (import.meta.env.DEV && isMockMode()) return mockSignins(uid)
  try {
    const m = await firestore()
    const snap = await m.getDocs(m.query(m.collection(db, 'users', uid, 'signins'), m.orderBy('at', 'desc'), m.limit(10)))
    return snap.docs.map((d) => ({ at: toDate(d.data().at), device: d.data().device }))
  } catch {
    return []
  }
}

export async function saveCrm(uid, patch) {
  if (import.meta.env.DEV && isMockMode()) return mockSaveCrm(uid, patch)
  const m = await firestore()
  await m.setDoc(m.doc(db, 'crm', uid), { ...patch, updatedAt: m.serverTimestamp() }, { merge: true })
}

export async function setCloudRole(uid, role) {
  if (import.meta.env.DEV && isMockMode()) return mockSaveRole(uid, role)
  const m = await firestore()
  await m.setDoc(m.doc(db, 'users', uid), { role }, { merge: true })
}

// ---------- Dev-only mock (never included in production builds) ----------

const MOCK_KEY = 'aw:cloud-mock-data'
function mockStore() {
  try {
    const raw = localStorage.getItem(MOCK_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  const now = Date.now()
  const ago = (min) => new Date(now - min * 60000).toISOString()
  const data = {
    members: [
      { uid: 'g-1', name: 'Jordan Lee', email: 'jordan@example.com', role: 'client', createdAt: ago(60 * 24 * 40), lastSeenAt: ago(1), signInCount: 14, lastDevice: 'iPhone/iPad · Safari', screen: 'home', activeDays: [] },
      { uid: 'g-2', name: 'Sam Patel', email: 'sam@example.com', role: 'coach', createdAt: ago(60 * 24 * 12), lastSeenAt: ago(60 * 24 * 3), signInCount: 6, lastDevice: 'Mac · Chrome', screen: 'clients', activeDays: [] },
      { uid: 'g-3', name: 'Alex Kim', email: 'alex@example.com', role: 'client', createdAt: ago(60 * 24 * 2), lastSeenAt: ago(60 * 24 * 2), signInCount: 1, lastDevice: 'Android · Chrome', screen: 'welcome', activeDays: [] },
      { uid: 'g-4', name: 'Riley Brown', email: 'riley@example.com', role: 'client', createdAt: ago(60 * 24 * 90), lastSeenAt: ago(60 * 24 * 45), signInCount: 3, lastDevice: 'Windows · Edge', screen: 'plan', activeDays: [] },
    ],
    crm: { 'g-2': { notes: [{ text: 'Interested in selling a 6-week program.', at: ago(60 * 24) }], tags: ['coach-lead'] } },
    traffic: Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now - (29 - i) * 86400000)
      return { day: dayKey(d), views: 20 + ((i * 37) % 60), visitors: 8 + ((i * 13) % 25), signins: (i * 7) % 6 }
    }),
    signins: {},
  }
  localStorage.setItem(MOCK_KEY, JSON.stringify(data))
  return data
}
const mockWrite = (d) => localStorage.setItem(MOCK_KEY, JSON.stringify(d))
async function mockLoad() {
  const d = mockStore()
  const members = d.members.map((u) => ({
    ...u,
    createdAt: new Date(u.createdAt),
    lastSeenAt: new Date(u.lastSeenAt),
    lastSignInAt: new Date(u.lastSeenAt),
    crm: d.crm[u.uid] || {},
  }))
  return { members, traffic: d.traffic }
}
async function mockSignins(uid) {
  const d = mockStore()
  const u = d.members.find((x) => x.uid === uid)
  return Array.from({ length: Math.min(u?.signInCount || 0, 5) }, (_, i) => ({ at: new Date(Date.now() - i * 86400000 * 2), device: u.lastDevice }))
}
async function mockSaveCrm(uid, patch) {
  const d = mockStore()
  d.crm[uid] = { ...(d.crm[uid] || {}), ...patch }
  mockWrite(d)
}
async function mockSaveRole(uid, role) {
  const d = mockStore()
  const u = d.members.find((x) => x.uid === uid)
  if (u) u.role = role
  mockWrite(d)
}
async function mockRecordSignIn(profile, role) {
  const d = mockStore()
  const u = d.members.find((x) => x.uid === profile.uid)
  if (u) {
    u.signInCount++
    u.lastSeenAt = new Date().toISOString()
  } else d.members.push({ uid: profile.uid, name: profile.name, email: profile.email, role, createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), signInCount: 1, lastDevice: deviceLabel(), screen: 'home', activeDays: [] })
  mockWrite(d)
}
