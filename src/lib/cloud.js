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
//   users/{uid}/private/health  calculator inputs and results, only for members who opted in
//   geo/{YYYY-MM-DD}            visitor counts per approximate place (admins read)
//   toolStats/{YYYY-MM-DD}      calculator use and goals picked, counts only (admins read)
//   trainerApps/{uid}           personal trainer application (owner + admins); an admin approves it
//   trainerApps/{uid}/files/certificate   the certificate image
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

// ---------- Location ----------

// Approximate place from Vercel's IP lookup (live site only). Cached for the visit.
let geoPromise = null
export function getGeo() {
  if (!import.meta.env.PROD) return Promise.resolve(null)
  geoPromise ||= fetch('/api/geo')
    .then((r) => (r.ok ? r.json() : null))
    .then((g) => (g?.country ? g : null))
    .catch(() => null)
  return geoPromise
}
export const placeLabel = (g) => (g ? [g.city, g.region, g.country].filter(Boolean).join(', ') : '')
const counterKey = (...parts) => parts.filter(Boolean).join('_').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 60) || 'unknown'

// Add 1 to one named counter in a per-day doc (geo, toolStats). The rules check `k`.
async function bump(collection, key) {
  const m = await firestore()
  await m.setDoc(m.doc(db, collection, dayKey()), { [key]: m.increment(1), k: key }, { merge: true })
}

// Once per browser per day for each key, so a refresh doesn't count twice
function firstToday(key) {
  try {
    const k = `aw:once:${dayKey()}:${key}`
    if (localStorage.getItem(k)) return false
    localStorage.setItem(k, '1')
    return true
  } catch {
    return true
  }
}

// ---------- Emails (sent by the /api/notify server function, never from the browser) ----------

// Asks the server to send an email for an event. The server checks the sign-in token and
// Firestore before sending anything. Live site only; failures never block the app.
async function notifyServer(event, extra = {}) {
  if (!import.meta.env.PROD) return
  try {
    const { getAuth } = await import('firebase/auth')
    const token = await getAuth(app).currentUser?.getIdToken()
    if (!token) return
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ event, ...extra }),
    })
  } catch {
    /* email is best effort */
  }
}

// Contact form → /api/contact (saves the message and emails the admin)
export async function sendContact(form) {
  if (!import.meta.env.PROD) throw new Error('The contact form works on the live site (it needs the server function).')
  const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || 'We couldn’t send your message. Please email contact@yadata.com.au.')
}

// Admin: contact form messages, newest first
export async function loadMessages() {
  try {
    const m = await firestore()
    const snap = await withTimeout(m.getDocs(m.query(m.collection(db, 'contactMessages'), m.orderBy('createdAt', 'desc'), m.limit(200))))
    return { messages: snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) })) }
  } catch (err) {
    return { error: cloudError(err) }
  }
}
export async function setMessageDone(id, done) {
  const m = await firestore()
  await m.updateDoc(m.doc(db, 'contactMessages', id), { done })
}

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
    if (firstToday) {
      const g = await getGeo()
      if (g) await bump('geo', counterKey(g.country, g.region, g.city))
    }
  } catch {
    /* Firestore not set up yet, or offline: traffic just isn't counted */
  }
}

// After a Google sign-in: profile, private contact details and a sign-in history entry
export async function recordSignIn(profile, role, termsVersion = null, goal = null) {
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
        ...(termsVersion ? { termsVersion, termsAcceptedAt: now } : {}),
        ...(goal ? { goal } : {}),
        // Role and join date are only written the first time; admins manage roles after that
        ...(snap.exists() ? {} : { role, createdAt: now }),
      },
      { merge: true },
    )
    const device = deviceLabel()
    const location = placeLabel(await getGeo())
    await m.setDoc(
      m.doc(db, 'users', profile.uid, 'private', 'account'),
      { email: profile.email, lastSignInAt: now, lastDevice: device, ...(location ? { lastLocation: location } : {}) },
      { merge: true },
    )
    await m.addDoc(m.collection(db, 'users', profile.uid, 'signins'), { at: now, device, ...(location ? { location } : {}) })
    await m.setDoc(m.doc(db, 'stats', dayKey()), { signins: m.increment(1) }, { merge: true })
    // First sign-in: welcome email to the member, alert to the admin
    if (!snap.exists()) await notifyServer('signup')
  } catch {
    /* Firestore not set up yet: the app keeps working, the admin just won't see it */
  }
}

// A member's main goal (lose weight, build muscle...), shown to the admin
export async function saveGoal(uid, goal) {
  if (!uid || !import.meta.env.PROD) return
  try {
    const m = await firestore()
    if ((await authUid()) !== uid) return
    await m.setDoc(m.doc(db, 'users', uid), { goal }, { merge: true })
  } catch {
    /* offline or not set up */
  }
}

// Calculator use: counts which calculator was opened and which goal was picked. No personal data.
export function trackTool(key) {
  if (!import.meta.env.PROD || !firstToday(`tool:${key}`)) return
  bump('toolStats', counterKey(key)).catch(() => {})
}

// Members who opt in keep their calculator inputs and results in their account
export async function setHealthConsent(uid, on) {
  if (!uid || !import.meta.env.PROD) return
  const m = await firestore()
  if ((await authUid()) !== uid) return
  await m.setDoc(m.doc(db, 'users', uid), { healthConsent: on, healthConsentAt: m.serverTimestamp() }, { merge: true })
  if (!on) await m.deleteDoc(m.doc(db, 'users', uid, 'private', 'health'))
}
export async function saveHealth(uid, snapshot) {
  if (!uid || !import.meta.env.PROD) return
  try {
    const m = await firestore()
    if ((await authUid()) !== uid) return
    await m.setDoc(m.doc(db, 'users', uid, 'private', 'health'), { ...snapshot, updatedAt: m.serverTimestamp() })
  } catch {
    /* offline or not set up */
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

// Add up per-day counter docs into { key: total }
function sumCounts(docs) {
  const out = {}
  for (const d of docs) for (const [k, v] of Object.entries(d.data())) if (k !== 'k' && typeof v === 'number') out[k] = (out[k] || 0) + v
  return out
}

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
    const since = dayKey(new Date(Date.now() - 29 * 86400000))
    const [users, presence, crm, stats, geo, tools] = await withTimeout(Promise.all([
      m.getDocs(m.collection(db, 'users')),
      m.getDocs(m.collection(db, 'presence')),
      m.getDocs(m.collection(db, 'crm')),
      m.getDocs(m.query(m.collection(db, 'stats'), m.where(m.documentId(), '>=', since))),
      m.getDocs(m.query(m.collection(db, 'geo'), m.where(m.documentId(), '>=', since))).catch(() => ({ docs: [] })),
      m.getDocs(m.query(m.collection(db, 'toolStats'), m.where(m.documentId(), '>=', since))).catch(() => ({ docs: [] })),
    ]))
    const presenceBy = Object.fromEntries(presence.docs.map((d) => [d.id, d.data()]))
    const crmBy = Object.fromEntries(crm.docs.map((d) => [d.id, d.data()]))
    const privateDocs = await withTimeout(Promise.all(users.docs.map((d) => m.getDoc(m.doc(db, 'users', d.id, 'private', 'account')))))
    const healthDocs = await withTimeout(
      Promise.all(users.docs.map((d) => (d.data().healthConsent ? m.getDoc(m.doc(db, 'users', d.id, 'private', 'health')).catch(() => null) : null))),
    )
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
        location: acc.lastLocation || '',
        goal: u.goal || '',
        health: healthDocs[i]?.exists() ? { ...healthDocs[i].data(), updatedAt: toDate(healthDocs[i].data().updatedAt) } : null,
        screen: p.screen || '',
        activeDays: p.days || [],
        crm: crmBy[d.id] || {},
      }
    })
    const traffic = stats.docs.map((d) => ({ day: d.id, ...d.data() }))
    return { members, traffic, places: sumCounts(geo.docs), tools: sumCounts(tools.docs) }
  } catch (err) {
    return { error: cloudError(err) }
  }
}

export async function loadSignins(uid) {
  if (import.meta.env.DEV && isMockMode()) return mockSignins(uid)
  try {
    const m = await firestore()
    const snap = await m.getDocs(m.query(m.collection(db, 'users', uid, 'signins'), m.orderBy('at', 'desc'), m.limit(10)))
    return snap.docs.map((d) => ({ at: toDate(d.data().at), device: d.data().device, location: d.data().location || '' }))
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

// ---------- Personal trainer applications ----------

const APP_FIELDS = ['fullName', 'dob', 'phone', 'abn', 'businessName', 'qualification', 'provider', 'completedYear', 'certNumber', 'registration', 'registrationNumber', 'firstAidExpiry', 'insurer', 'insuranceExpiry', 'specialties', 'bio']
const appOut = (id, a) => ({
  uid: id,
  ...a,
  submittedAt: toDate(a.submittedAt),
  reviewedAt: toDate(a.reviewedAt),
})

// The signed-in member's own application and role, used to keep this browser in step with
// what the admin decided. Returns null when the cloud can't be reached.
export async function myTrainerAccess(uid) {
  if (import.meta.env.DEV && isMockMode()) return mockMyAccess(uid)
  try {
    const m = await firestore()
    if ((await authUid()) !== uid) return null
    const [user, app] = await withTimeout(Promise.all([m.getDoc(m.doc(db, 'users', uid)), m.getDoc(m.doc(db, 'trainerApps', uid))]))
    return {
      role: user.exists() ? user.data().role || 'client' : null,
      application: app.exists() ? appOut(uid, app.data()) : null,
    }
  } catch {
    return null
  }
}

// Send (or re-send after a rejection) an application. It always goes in as pending.
export async function submitTrainerApp(uid, email, application, certificate) {
  const data = Object.fromEntries(APP_FIELDS.map((k) => [k, String(application[k] ?? '').trim().slice(0, k === 'bio' ? 600 : 120)]))
  data.abn = data.abn.replace(/\s/g, '')
  if (import.meta.env.DEV && isMockMode()) return mockSubmitApp(uid, email, data, certificate)
  const m = await firestore()
  if ((await authUid()) !== uid) throw new Error('Sign in with Google again, then send your application.')
  await m.setDoc(m.doc(db, 'trainerApps', uid, 'files', 'certificate'), { image: certificate })
  await m.setDoc(m.doc(db, 'trainerApps', uid), { ...data, email, status: 'pending', submittedAt: m.serverTimestamp(), termsVersion: application.termsVersion })
  notifyServer('trainer-application')
}

// Admin: every application, newest first
export async function loadTrainerApps() {
  if (import.meta.env.DEV && isMockMode()) return mockLoadApps()
  try {
    const m = await firestore()
    const snap = await withTimeout(m.getDocs(m.collection(db, 'trainerApps')))
    const apps = snap.docs.map((d) => appOut(d.id, d.data()))
    return { apps: apps.sort((a, b) => (b.submittedAt?.getTime() || 0) - (a.submittedAt?.getTime() || 0)) }
  } catch (err) {
    return { error: cloudError(err) }
  }
}

export async function loadCertificate(uid) {
  if (import.meta.env.DEV && isMockMode()) return (mockStore().certs || {})[uid] || null
  const m = await firestore()
  const snap = await m.getDoc(m.doc(db, 'trainerApps', uid, 'files', 'certificate'))
  return snap.exists() ? snap.data().image : null
}

// Admin decision. Approving makes the member a coach; rejecting or revoking makes them a client.
export async function reviewTrainerApp(uid, status, note = '') {
  if (import.meta.env.DEV && isMockMode()) return mockReview(uid, status, note)
  const m = await firestore()
  const batch = m.writeBatch(db)
  batch.update(m.doc(db, 'trainerApps', uid), { status, reviewNote: note.slice(0, 500), reviewedAt: m.serverTimestamp() })
  batch.set(m.doc(db, 'users', uid), { role: status === 'approved' ? 'coach' : 'client' }, { merge: true })
  await batch.commit()
  notifyServer('trainer-decision', { uid })
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
      { uid: 'g-1', name: 'Jordan Lee', email: 'jordan@example.com', role: 'client', createdAt: ago(60 * 24 * 40), lastSeenAt: ago(1), signInCount: 14, lastDevice: 'iPhone/iPad · Safari', screen: 'home', activeDays: [], location: 'Sydney, NSW, AU', goal: 'lose-weight', health: { goal: 'lose', sex: 'female', age: 31, height: 165, weight: 72, bmi: 26.4, tdee: 2210, target: 1770, protein: 130, whtr: 0.49, bodyFat: 31, updatedAt: ago(60 * 24) } },
      { uid: 'g-2', name: 'Sam Patel', email: 'sam@example.com', role: 'coach', createdAt: ago(60 * 24 * 12), lastSeenAt: ago(60 * 24 * 3), signInCount: 6, lastDevice: 'Mac · Chrome', screen: 'clients', activeDays: [], location: 'Melbourne, VIC, AU', goal: 'build-muscle' },
      { uid: 'g-3', name: 'Alex Kim', email: 'alex@example.com', role: 'client', createdAt: ago(60 * 24 * 2), lastSeenAt: ago(60 * 24 * 2), signInCount: 1, lastDevice: 'Android · Chrome', screen: 'welcome', activeDays: [], location: 'Brisbane, QLD, AU', goal: 'get-fit' },
      { uid: 'g-4', name: 'Riley Brown', email: 'riley@example.com', role: 'client', createdAt: ago(60 * 24 * 90), lastSeenAt: ago(60 * 24 * 45), signInCount: 3, lastDevice: 'Windows · Edge', screen: 'plan', activeDays: [] },
    ],
    crm: { 'g-2': { notes: [{ text: 'Interested in selling a 6-week program.', at: ago(60 * 24) }], tags: ['coach-lead'] } },
    traffic: Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now - (29 - i) * 86400000)
      return { day: dayKey(d), views: 20 + ((i * 37) % 60), visitors: 8 + ((i * 13) % 25), signins: (i * 7) % 6 }
    }),
    signins: {},
    apps: {
      'g-5': {
        email: 'casey@example.com', status: 'pending', submittedAt: ago(60 * 5), fullName: 'Casey Morgan', dob: '1992-04-18', phone: '0412 345 678',
        abn: '42327513086', businessName: 'Morgan Strength', qualification: 'cert3-4', provider: 'Australian Institute of Fitness', completedYear: '2019',
        certNumber: 'AIF-77812', registration: 'ausactive', registrationNumber: 'AA123456', firstAidExpiry: '2027-03-01', insurer: 'Fitness Insurance',
        insuranceExpiry: '2027-06-30', specialties: 'Strength, kettlebells', bio: 'Strength coach in Sydney.',
      },
    },
    certs: {},
    places: { AU_NSW_Sydney: 120, AU_VIC_Melbourne: 64, AU_QLD_Brisbane: 31, NZ_AUK_Auckland: 9 },
    tools: { energy: 80, food: 41, carbs: 12, body: 37, goal_lose: 52, goal_gain: 23, goal_maintain: 14 },
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
    health: u.health ? { ...u.health, updatedAt: new Date(u.health.updatedAt) } : null,
  }))
  return { members, traffic: d.traffic, places: d.places || {}, tools: d.tools || {} }
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
async function mockMyAccess(uid) {
  const d = mockStore()
  const a = d.apps?.[uid]
  return { role: d.members.find((u) => u.uid === uid)?.role || null, application: a ? appOut(uid, a) : null }
}
async function mockSubmitApp(uid, email, data, certificate) {
  const d = mockStore()
  d.apps = { ...(d.apps || {}), [uid]: { ...data, email, status: 'pending', submittedAt: new Date().toISOString() } }
  d.certs = { ...(d.certs || {}), [uid]: certificate }
  mockWrite(d)
}
async function mockLoadApps() {
  const d = mockStore()
  return { apps: Object.entries(d.apps || {}).map(([id, a]) => appOut(id, a)) }
}
async function mockReview(uid, status, note) {
  const d = mockStore()
  Object.assign(d.apps[uid], { status, reviewNote: note, reviewedAt: new Date().toISOString() })
  const u = d.members.find((x) => x.uid === uid)
  if (u) u.role = status === 'approved' ? 'coach' : 'client'
  mockWrite(d)
}
