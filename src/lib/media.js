// Exercise photos, GIFs and videos (Firestore). Admins and approved trainers add them;
// every member sees them in the workout player.
//   exerciseMedia/{exerciseId}             { kind: image | gif | video | link, url?, by, byName, updatedAt }
//   exerciseMedia/{exerciseId}/files/main  { src: data URL } for uploaded files
import { app } from './firebase'
import { fileToDataUrl } from './utils'

const MAX_DATA_URL = 880000 // Firestore documents are capped at 1 MB
export const MAX_UPLOAD_KB = 650 // what that leaves for a GIF or video file

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
    await getAuth(app).authStateReady?.()
    fs = f
    db = fs.getFirestore(app)
  }
  return fs
}

// ---------- Links ----------

// YouTube or Vimeo → iframe that plays muted on a loop like a GIF; .mp4/.webm → <video>
export function videoFromUrl(url = '') {
  const yt = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)?.[1]
  if (yt) return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}&controls=0&rel=0&playsinline=1` }
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1]
  if (vimeo) return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeo}?autoplay=1&muted=1&loop=1&background=1` }
  if (/^https:\/\/\S+\.(mp4|webm)(\?\S*)?$/i.test(url)) return { type: 'video', src: url }
  return null
}

// ---------- Reading (cached for the visit) ----------

const cache = new Map()

export function getExerciseMedia(exerciseId) {
  if (!exerciseId) return Promise.resolve(null)
  if (!cache.has(exerciseId)) cache.set(exerciseId, load(exerciseId).catch(() => null))
  return cache.get(exerciseId)
}

async function load(id) {
  if (isMock()) return mock().items[id] || null
  const m = await firestore()
  const snap = await m.getDoc(m.doc(db, 'exerciseMedia', id))
  if (!snap.exists()) return null
  const meta = snap.data()
  if (meta.kind === 'link') return { ...meta, src: meta.url }
  const file = await m.getDoc(m.doc(db, 'exerciseMedia', id, 'files', 'main'))
  return file.exists() ? { ...meta, src: file.data().src } : null
}

// Which exercises have media (without downloading the files), for the admin list
export async function listExerciseMedia() {
  if (isMock()) return Object.fromEntries(Object.entries(mock().items).map(([k, v]) => [k, { kind: v.kind, byName: v.byName }]))
  const m = await firestore()
  const snap = await m.getDocs(m.collection(db, 'exerciseMedia'))
  return Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]))
}

// ---------- Writing (admins and approved trainers) ----------

// A chosen file → { kind, src }. Photos are resized; GIFs and videos must already be small.
export async function fileToMedia(file) {
  if (file.type === 'image/gif' || file.type.startsWith('video/')) {
    if (file.type.startsWith('video/') && !/^video\/(mp4|webm|quicktime)$/.test(file.type)) throw new Error('Use an MP4 or WebM video.')
    if (file.size > MAX_UPLOAD_KB * 1024)
      throw new Error(`That file is ${Math.round(file.size / 1024)} KB. Keep GIFs and clips under ${MAX_UPLOAD_KB} KB (a few seconds), or paste a YouTube or Vimeo link instead.`)
    const src = await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result)
      r.onerror = () => reject(new Error('Couldn’t read that file.'))
      r.readAsDataURL(file)
    })
    return { kind: file.type === 'image/gif' ? 'gif' : 'video', src: src.replace(/^data:video\/quicktime/, 'data:video/mp4') }
  }
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo, GIF or short video.')
  let src = await fileToDataUrl(file, 1200, 0.8)
  if (src.length > MAX_DATA_URL) src = await fileToDataUrl(file, 800, 0.7)
  return { kind: 'image', src }
}

export async function saveExerciseMedia(exerciseId, me, media) {
  const meta = { kind: media.kind, by: me.googleUid, byName: String(me.name || '').slice(0, 60) }
  cache.delete(exerciseId)
  if (isMock()) return mock((d) => (d.items[exerciseId] = { ...meta, src: media.src, updatedAt: new Date().toISOString() }))
  if (media.kind !== 'link' && media.src.length > MAX_DATA_URL) throw new Error('That file is too big.')
  const m = await firestore()
  if (media.kind === 'link') {
    await m.setDoc(m.doc(db, 'exerciseMedia', exerciseId), { ...meta, url: media.src, updatedAt: m.serverTimestamp() })
    await m.deleteDoc(m.doc(db, 'exerciseMedia', exerciseId, 'files', 'main')).catch(() => {})
  } else {
    await m.setDoc(m.doc(db, 'exerciseMedia', exerciseId, 'files', 'main'), { src: media.src })
    await m.setDoc(m.doc(db, 'exerciseMedia', exerciseId), { ...meta, updatedAt: m.serverTimestamp() })
  }
}

export async function removeExerciseMedia(exerciseId) {
  cache.delete(exerciseId)
  if (isMock()) return mock((d) => delete d.items[exerciseId])
  const m = await firestore()
  await m.deleteDoc(m.doc(db, 'exerciseMedia', exerciseId, 'files', 'main')).catch(() => {})
  await m.deleteDoc(m.doc(db, 'exerciseMedia', exerciseId))
}

// ---------- Dev-only mock (stripped from production builds) ----------
function mock(change) {
  if (!import.meta.env.DEV) return { items: {} }
  let d
  try {
    d = JSON.parse(localStorage.getItem('aw:media-mock') || 'null')
  } catch {
    d = null
  }
  d ||= { items: {} }
  if (change) {
    change(d)
    localStorage.setItem('aw:media-mock', JSON.stringify(d))
  }
  return d
}
