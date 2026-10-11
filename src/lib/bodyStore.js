// Body check-ins (photos and measurements) stored ONLY on this device, in IndexedDB.
// Nothing here is uploaded. Each member's check-ins are kept apart by their account id.
//   check-in: { id, owner, date, front (data URL), side (data URL), measures: {weight, waist, …}, note }

const DB_NAME = 'all-workout-body'
const STORE = 'checkins'
const CONSENT_KEY = 'aw:body-consent'

function open() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('This browser can’t store body check-ins.'))
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }).createIndex('owner', 'owner')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run(mode, fn) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const result = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(result?.result ?? result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('Storage is full. Delete some check-ins.'))
  })
}

export async function listCheckins(owner) {
  const all = await run('readonly', (s) => s.index('owner').getAll(owner))
  return (all || []).sort((a, b) => (a.date < b.date ? -1 : 1))
}

export const saveCheckin = (c) => run('readwrite', (s) => s.put(c))
export const deleteCheckin = (id) => run('readwrite', (s) => s.delete(id))

export async function deleteAllCheckins(owner) {
  const list = await listCheckins(owner)
  await run('readwrite', (s) => list.forEach((c) => s.delete(c.id)))
  setConsent(owner, false)
}

// Consent is per member and per device
export function hasConsent(owner) {
  try {
    return JSON.parse(localStorage.getItem(CONSENT_KEY) || '{}')[owner]?.agreed === true
  } catch {
    return false
  }
}
export function setConsent(owner, agreed) {
  try {
    const all = JSON.parse(localStorage.getItem(CONSENT_KEY) || '{}')
    if (agreed) all[owner] = { agreed: true, at: new Date().toISOString() }
    else delete all[owner]
    localStorage.setItem(CONSENT_KEY, JSON.stringify(all))
  } catch {
    /* private mode */
  }
}

export const MEASURES = [
  ['weight', 'Weight', 'kg'],
  ['bodyFat', 'Body fat', '%'],
  ['waist', 'Waist', 'cm'],
  ['hips', 'Hips', 'cm'],
  ['chest', 'Chest', 'cm'],
  ['arm', 'Arm', 'cm'],
  ['thigh', 'Thigh', 'cm'],
]
