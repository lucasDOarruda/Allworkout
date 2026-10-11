// Friends in the cloud (Firestore), so members on different devices can find each other.
//   members/{uid}                      name, photo, search prefixes, privacy choices
//   friendships/{smallUid_largeUid}    pending → accepted; the other person accepts
//   shares/{id}                        a workout (JSON copy) sent to a friend
//   activity/{uid}/items/{id}          finished workouts a member chose to share with friends
// See firestore.rules in the backend repo for who can read and write what.
import { app } from './firebase'

const isMock = () => {
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
    const [f, { getAuth }] = await Promise.all([import('firebase/firestore'), import('firebase/auth')])
    // Wait for the saved Google sign-in to load, or Firestore sees an anonymous request
    await getAuth(app).authStateReady?.()
    fs = f
    db = fs.getFirestore(app)
  }
  return fs
}
const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null)
export const pairId = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`)

// Lowercase prefixes of each word and of the full name, for "search by name"
export function searchKeys(name) {
  const clean = String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const keys = new Set()
  for (const word of [clean, ...clean.split(' ')]) for (let i = 2; i <= Math.min(word.length, 20); i++) keys.add(word.slice(0, i))
  return [...keys].slice(0, 120)
}
const normalise = (q) =>
  String(q || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20)

// A workout as JSON for sharing: no likes, buyers or big images
export function workoutSnapshot(w) {
  const { name, description, level, focus, parts, cover } = w
  const json = JSON.stringify({ name, description, level, focus, parts, cover: typeof cover === 'string' && cover.length < 150000 ? cover : null })
  return json.length < 290000 ? json : JSON.stringify({ name, description, level, focus, parts, cover: null })
}

// ---------- Directory ----------

export async function publishMember(me) {
  if (!me?.googleUid) return
  const findable = me.findable !== false
  const data = {
    name: String(me.name || 'Member').slice(0, 60),
    photo: typeof me.photo === 'string' && /^https:\/\//.test(me.photo) && me.photo.length < 500 ? me.photo : null,
    search: findable ? searchKeys(me.name) : [],
    findable,
    shareActivity: !!me.shareActivity,
  }
  if (isMock()) return mock((d) => (d.members[me.googleUid] = data))
  const m = await firestore()
  await m.setDoc(m.doc(db, 'members', me.googleUid), { ...data, updatedAt: m.serverTimestamp() })
}

export async function searchMembers(q, myUid) {
  const key = normalise(q)
  if (key.length < 2) return []
  if (isMock()) {
    const d = mock()
    return Object.entries(d.members)
      .filter(([uid, x]) => uid !== myUid && x.search.includes(key))
      .map(([uid, x]) => ({ uid, ...x }))
  }
  const m = await firestore()
  const snap = await m.getDocs(m.query(m.collection(db, 'members'), m.where('search', 'array-contains', key), m.limit(20)))
  return snap.docs.filter((d) => d.id !== myUid).map((d) => ({ uid: d.id, name: d.data().name, photo: d.data().photo }))
}

async function membersById(uids) {
  const out = {}
  if (!uids.length) return out
  if (isMock()) {
    const d = mock()
    for (const u of uids) if (d.members[u]) out[u] = d.members[u]
    return out
  }
  const m = await firestore()
  const snaps = await Promise.all(uids.map((u) => m.getDoc(m.doc(db, 'members', u)).catch(() => null)))
  snaps.forEach((s, i) => s?.exists() && (out[uids[i]] = s.data()))
  return out
}

// ---------- Friendships and shares ----------

// Everything the Friends page needs in one go
export async function loadSocial(myUid) {
  let links, incoming, sent
  if (isMock()) {
    const d = mock()
    links = Object.entries(d.friendships)
      .filter(([, f]) => f.users.includes(myUid))
      .map(([id, f]) => ({ id, ...f }))
    incoming = Object.entries(d.shares)
      .filter(([, s]) => s.to === myUid)
      .map(([id, s]) => ({ id, ...s }))
    sent = Object.entries(d.shares)
      .filter(([, s]) => s.from === myUid)
      .map(([id, s]) => ({ id, ...s }))
  } else {
    const m = await firestore()
    const [f, i, s] = await Promise.all([
      m.getDocs(m.query(m.collection(db, 'friendships'), m.where('users', 'array-contains', myUid))),
      m.getDocs(m.query(m.collection(db, 'shares'), m.where('to', '==', myUid), m.limit(50))),
      m.getDocs(m.query(m.collection(db, 'shares'), m.where('from', '==', myUid), m.limit(50))),
    ])
    links = f.docs.map((x) => ({ id: x.id, ...x.data() }))
    incoming = i.docs.map((x) => ({ id: x.id, ...x.data() }))
    sent = s.docs.map((x) => ({ id: x.id, ...x.data() }))
  }
  const others = links.map((l) => l.users.find((u) => u !== myUid))
  const people = await membersById(others)
  const byDate = (a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0)
  const linksOut = links.map((l) => {
    const other = l.users.find((u) => u !== myUid)
    return { ...l, other, person: { uid: other, name: people[other]?.name || 'Member', photo: people[other]?.photo || null }, createdAt: toDate(l.createdAt) }
  })
  return {
    friends: linksOut.filter((l) => l.status === 'accepted'),
    incoming: linksOut.filter((l) => l.status === 'pending' && l.requester !== myUid),
    outgoing: linksOut.filter((l) => l.status === 'pending' && l.requester === myUid),
    shares: incoming.sort(byDate).map((s) => ({ ...s, createdAt: toDate(s.createdAt) })),
    sentShares: sent.length,
  }
}

export async function sendFriendRequest(myUid, otherUid) {
  const id = pairId(myUid, otherUid)
  const users = [myUid, otherUid].sort()
  if (isMock()) return mock((d) => (d.friendships[id] = { users, requester: myUid, status: 'pending', createdAt: new Date().toISOString() }))
  const m = await firestore()
  await m.setDoc(m.doc(db, 'friendships', id), { users, requester: myUid, status: 'pending', createdAt: m.serverTimestamp() })
}

export async function acceptFriend(id) {
  if (isMock()) return mock((d) => (d.friendships[id].status = 'accepted'))
  const m = await firestore()
  await m.updateDoc(m.doc(db, 'friendships', id), { status: 'accepted', acceptedAt: m.serverTimestamp() })
}

// Decline, cancel or unfriend
export async function removeFriendship(id) {
  if (isMock()) return mock((d) => delete d.friendships[id])
  const m = await firestore()
  await m.deleteDoc(m.doc(db, 'friendships', id))
}

export async function shareWorkout(me, toUids, workout, note = '') {
  const data = { from: me.googleUid, fromName: String(me.name || '').slice(0, 60), workout: workoutSnapshot(workout), note: String(note).slice(0, 300) }
  if (isMock())
    return mock((d) => {
      for (const to of toUids) d.shares[`s${Date.now()}${to}`] = { ...data, to, createdAt: new Date().toISOString() }
    })
  const m = await firestore()
  await Promise.all(toUids.map((to) => m.addDoc(m.collection(db, 'shares'), { ...data, to, createdAt: m.serverTimestamp() })))
}

export async function markShareSaved(id) {
  if (isMock()) return mock((d) => (d.shares[id].savedAt = new Date().toISOString()))
  const m = await firestore()
  await m.updateDoc(m.doc(db, 'shares', id), { savedAt: m.serverTimestamp() })
}

export async function deleteShare(id) {
  if (isMock()) return mock((d) => delete d.shares[id])
  const m = await firestore()
  await m.deleteDoc(m.doc(db, 'shares', id))
}

// ---------- Friends' activity ----------

// A finished workout, for members who turned on "share my workouts with friends"
export async function publishActivity(me, session, workout) {
  if (!me?.googleUid || !me.shareActivity) return
  const item = {
    workoutId: String(session.workoutId || ''),
    workoutName: String(session.workoutName || workout?.name || 'Workout').slice(0, 120),
    // Official workouts exist for everyone; others travel as a copy so friends can do them
    ...(workout && !workout.official ? { workout: workoutSnapshot(workout) } : {}),
    duration: Number(session.duration) || 0,
    date: String(session.date || new Date().toISOString()),
  }
  if (isMock()) return mock((d) => (d.activity[me.googleUid] = [{ ...item, id: `a${Date.now()}`, createdAt: new Date().toISOString() }, ...(d.activity[me.googleUid] || [])]))
  const m = await firestore()
  await m.addDoc(m.collection(db, 'activity', me.googleUid, 'items'), { ...item, createdAt: m.serverTimestamp() })
}

// Latest shared workouts from each friend (newest first)
export async function loadFriendActivity(friends) {
  const list = friends.slice(0, 30)
  let rows
  if (isMock()) {
    const d = mock()
    rows = list.flatMap((f) => (d.activity[f.uid] || []).slice(0, 5).map((a) => ({ ...a, friend: f })))
  } else {
    const m = await firestore()
    const per = await Promise.all(
      list.map((f) =>
        m
          .getDocs(m.query(m.collection(db, 'activity', f.uid, 'items'), m.orderBy('createdAt', 'desc'), m.limit(5)))
          .then((s) => s.docs.map((x) => ({ id: x.id, ...x.data(), friend: f })))
          .catch(() => []),
      ),
    )
    rows = per.flat()
  }
  return rows.map((r) => ({ ...r, createdAt: toDate(r.createdAt) })).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
}

// ---------- Likes and comments on workouts (everyone signed in sees them) ----------

export async function loadWorkoutSocial(workoutId, myUid) {
  if (isMock()) {
    const d = mock()
    const likes = d.likes[workoutId] || []
    return { count: likes.length, liked: likes.includes(myUid), comments: (d.comments[workoutId] || []).map((c) => ({ ...c, createdAt: new Date(c.createdAt) })) }
  }
  const m = await firestore()
  const likes = m.collection(db, 'workoutLikes', workoutId, 'users')
  const [count, mine, comments] = await Promise.all([
    m.getCountFromServer(likes),
    m.getDoc(m.doc(likes, myUid)),
    m.getDocs(m.query(m.collection(db, 'workoutComments', workoutId, 'items'), m.orderBy('createdAt', 'asc'), m.limit(200))),
  ])
  return {
    count: count.data().count,
    liked: mine.exists(),
    comments: comments.docs.map((x) => ({ id: x.id, ...x.data(), createdAt: toDate(x.data().createdAt) })),
  }
}

export async function setWorkoutLike(workoutId, myUid, on) {
  if (isMock())
    return mock((d) => {
      const list = (d.likes[workoutId] || []).filter((u) => u !== myUid)
      d.likes[workoutId] = on ? [...list, myUid] : list
    })
  const m = await firestore()
  const ref = m.doc(db, 'workoutLikes', workoutId, 'users', myUid)
  if (on) await m.setDoc(ref, { createdAt: m.serverTimestamp() })
  else await m.deleteDoc(ref)
}

export async function addWorkoutComment(workoutId, me, text) {
  const data = {
    uid: me.googleUid,
    name: String(me.name || 'Member').slice(0, 60),
    photo: typeof me.photo === 'string' && /^https:\/\//.test(me.photo) && me.photo.length < 500 ? me.photo : null,
    text: String(text).trim().slice(0, 500),
  }
  if (isMock()) return mock((d) => (d.comments[workoutId] = [...(d.comments[workoutId] || []), { ...data, id: `c${Date.now()}`, createdAt: new Date().toISOString() }]))
  const m = await firestore()
  await m.addDoc(m.collection(db, 'workoutComments', workoutId, 'items'), { ...data, createdAt: m.serverTimestamp() })
}

export async function deleteWorkoutComment(workoutId, id) {
  if (isMock()) return mock((d) => (d.comments[workoutId] = (d.comments[workoutId] || []).filter((c) => c.id !== id)))
  const m = await firestore()
  await m.deleteDoc(m.doc(db, 'workoutComments', workoutId, 'items', id))
}

// ---------- Leaderboards ----------

export const fmtScore = (score, unit) => {
  if (unit === 'rounds') return `${score} round${score === 1 ? '' : 's'}`
  const s = Math.round(score)
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0')
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// "1:12:30", "72:30" or "45" (minutes) → seconds
export function parseTime(text) {
  const parts = String(text).trim().split(':').map((x) => Number(x))
  if (!parts.length || parts.some((x) => !Number.isFinite(x) || x < 0)) return null
  if (parts.length === 1) return parts[0] * 60
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

// Best result per member, best first (fastest time or most rounds)
export async function loadLeaderboard(workoutId, unit) {
  const dir = unit === 'time' ? 'asc' : 'desc'
  if (isMock()) {
    const rows = Object.entries(mock().results[workoutId] || {}).map(([uid, r]) => ({ uid, ...r, at: new Date(r.at) }))
    return rows.sort((a, b) => (dir === 'asc' ? a.score - b.score : b.score - a.score))
  }
  const m = await firestore()
  const snap = await m.getDocs(m.query(m.collection(db, 'results', workoutId, 'entries'), m.orderBy('score', dir), m.limit(100)))
  return snap.docs.map((d) => ({ uid: d.id, ...d.data(), at: toDate(d.data().at) }))
}

// Saves the result only if it beats your previous best. Returns true when it's a new best.
export async function postResult(workoutId, me, score, unit, previous) {
  const better = !previous || (unit === 'time' ? score < previous.score : score > previous.score)
  if (!better) return false
  const data = {
    name: String(me.name || 'Member').slice(0, 60),
    photo: typeof me.photo === 'string' && /^https:\/\//.test(me.photo) && me.photo.length < 500 ? me.photo : null,
    score,
    unit,
  }
  if (isMock()) {
    mock((d) => (d.results[workoutId] = { ...(d.results[workoutId] || {}), [me.googleUid]: { ...data, at: new Date().toISOString() } }))
    return true
  }
  const m = await firestore()
  await m.setDoc(m.doc(db, 'results', workoutId, 'entries', me.googleUid), { ...data, at: m.serverTimestamp() })
  return true
}

// ---------- Notifications inbox ----------

const workoutName = (json) => {
  try {
    return JSON.parse(json).name || 'a workout'
  } catch {
    return 'a workout'
  }
}

// Live list of things to tell a member about, newest first:
//   share    a friend shared a workout with you
//   request  someone sent you a friend request
//   saved    a friend saved a workout you shared with them
// Calls onChange(items) whenever something changes. Returns a function that stops watching.
export function watchInbox(myUid, onChange) {
  let shares = []
  let links = []
  let sent = []
  let stopped = false
  const names = {}

  const emit = async () => {
    const need = [...new Set([...links.map((l) => l.users.find((u) => u !== myUid)), ...sent.map((x) => x.to)])].filter((u) => u && !names[u])
    if (need.length) Object.assign(names, Object.fromEntries(Object.entries(await membersById(need)).map(([u, mm]) => [u, mm.name])))
    if (stopped) return
    const items = [
      ...shares.map((x) => ({ id: `share:${x.id}`, type: 'share', at: toDate(x.createdAt), from: x.fromName, fromUid: x.from, workoutName: workoutName(x.workout), note: x.note, share: x })),
      ...links
        .filter((l) => l.status === 'pending' && l.requester !== myUid)
        .map((l) => ({ id: `request:${l.id}`, type: 'request', at: toDate(l.createdAt), linkId: l.id, fromUid: l.requester, from: names[l.requester] || 'A member' })),
      ...sent.filter((x) => x.savedAt).map((x) => ({ id: `saved:${x.id}`, type: 'saved', at: toDate(x.savedAt), from: names[x.to] || 'A friend', workoutName: workoutName(x.workout) })),
    ].sort((a, b) => (b.at?.getTime() || 0) - (a.at?.getTime() || 0))
    onChange(items)
  }

  if (isMock()) {
    const tick = () => {
      const d = mock()
      shares = Object.entries(d.shares).filter(([, x]) => x.to === myUid).map(([id, x]) => ({ id, ...x }))
      sent = Object.entries(d.shares).filter(([, x]) => x.from === myUid).map(([id, x]) => ({ id, ...x }))
      links = Object.entries(d.friendships).filter(([, f]) => f.users.includes(myUid)).map(([id, f]) => ({ id, ...f }))
      emit()
    }
    tick()
    const timer = setInterval(tick, 2000)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }

  const unsubs = []
  firestore().then((m) => {
    if (stopped) return
    const on = (q, set) =>
      unsubs.push(
        m.onSnapshot(
          q,
          (snap) => {
            set(snap.docs.map((x) => ({ id: x.id, ...x.data() })))
            emit()
          },
          () => {},
        ),
      )
    on(m.query(m.collection(db, 'shares'), m.where('to', '==', myUid), m.limit(50)), (v) => (shares = v))
    on(m.query(m.collection(db, 'shares'), m.where('from', '==', myUid), m.limit(50)), (v) => (sent = v))
    on(m.query(m.collection(db, 'friendships'), m.where('users', 'array-contains', myUid)), (v) => (links = v))
  })
  return () => {
    stopped = true
    unsubs.forEach((u) => u())
  }
}

// ---------- Dev-only mock (stripped from production builds) ----------
const MOCK_KEY = 'aw:social-mock'
function mock(change) {
  if (!import.meta.env.DEV) return {}
  let d
  try {
    d = JSON.parse(localStorage.getItem(MOCK_KEY) || 'null')
  } catch {
    d = null
  }
  if (!d) {
    const person = (name) => ({ name, photo: null, search: searchKeys(name), findable: true, shareActivity: true })
    d = {
      members: { 'g-1': person('Jordan Lee'), 'g-2': person('Sam Patel'), 'g-3': person('Alex Kim'), 'g-4': { ...person('Riley Brown'), search: [], findable: false } },
      friendships: {},
      shares: {},
      likes: { 'off-gym-strength-a': ['g-1', 'g-2'] },
      comments: { 'off-gym-strength-a': [{ id: 'c1', uid: 'g-1', name: 'Jordan Lee', photo: null, text: 'Brutal and simple. Loved it.', createdAt: new Date(Date.now() - 3600000).toISOString() }] },
      activity: {
        'g-1': [{ id: 'a1', workoutId: 'off-bw-tabata', workoutName: 'Tabata Blast', duration: 960, date: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString() }],
      },
    }
  }
  d.likes ||= {}
  d.comments ||= {}
  d.results ||= {
    'off-hyrox-half': {
      'g-1': { name: 'Jordan Lee', photo: null, score: 2950, unit: 'time', at: new Date(Date.now() - 2 * 86400000).toISOString() },
      'g-2': { name: 'Sam Patel', photo: null, score: 3410, unit: 'time', at: new Date(Date.now() - 5 * 86400000).toISOString() },
    },
  }
  if (change) {
    change(d)
    localStorage.setItem(MOCK_KEY, JSON.stringify(d))
  }
  return d
}
