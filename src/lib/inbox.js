// Notifications for the signed-in member, shared across the app (bell badge, inbox page, toasts).
// Items come from social.watchInbox; "seen" is remembered per member on this device.
import { useSyncExternalStore } from 'react'

let state = { items: [], seenAt: 0, ready: false }
const listeners = new Set()
const set = (patch) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
const seenKey = (uid) => `aw:inbox-seen:${uid}`

let stop = null
let currentUid = null

// Start watching for this member. onNew is called with items that arrive while the app is open.
export function startInbox(uid, onNew) {
  if (currentUid === uid) return
  stopInbox()
  currentUid = uid
  let seenAt = 0
  try {
    seenAt = Number(localStorage.getItem(seenKey(uid))) || 0
  } catch {
    /* private mode */
  }
  set({ items: [], seenAt, ready: false })
  let known = null
  import('./social').then((s) => {
    if (currentUid !== uid) return
    stop = s.watchInbox(uid, (items) => {
      // The first load isn't "new"; anything after it is
      if (known) items.filter((i) => !known.has(i.id)).forEach((i) => onNew?.(i))
      known = new Set(items.map((i) => i.id))
      set({ items, ready: true })
    })
  })
}

export function stopInbox() {
  stop?.()
  stop = null
  currentUid = null
  set({ items: [], seenAt: 0, ready: false })
}

export function markInboxSeen() {
  const now = Date.now()
  try {
    if (currentUid) localStorage.setItem(seenKey(currentUid), String(now))
  } catch {
    /* private mode */
  }
  set({ seenAt: now })
}

export const unreadCount = (s) => s.items.filter((i) => (i.at?.getTime() || Date.now()) > s.seenAt).length

export function useInbox() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

// One line of text for a notification
export function inboxText(i) {
  if (i.type === 'share') return `${i.from} shared “${i.workoutName}” with you`
  if (i.type === 'request') return `${i.from} sent you a friend request`
  return `${i.from} saved your workout “${i.workoutName}”`
}
