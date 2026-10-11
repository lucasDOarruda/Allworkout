// Who can see what. The admin is identified by their Firebase (Google) account UID.
// Note: this is a front-end guard only. Real protection lives in the backend
// (adminGate) and in Firestore security rules.
export const ADMIN_UIDS = ['pNeXKFvYLhd9rem7Vil5xwZnXzF3']

export const isAdminUid = (uid) => !!uid && ADMIN_UIDS.includes(uid)

// Pages anyone can open without an account
const PUBLIC = ['welcome', 'tools', 'signin', 'terms', 'privacy']

// What each route needs: 'admin', 'coach' (approved trainer or admin) or 'member' (any signed-in user)
export function routeNeeds([head, , sub]) {
  if (PUBLIC.includes(head)) return null
  if (head === 'admin') return 'admin'
  if (head === 'clients' || head === 'create') return 'coach'
  if (head === 'w' && sub === 'edit') return 'coach'
  return 'member'
}

// Remember where someone was heading so sign-in can take them there
const AFTER_KEY = 'aw:after-login'
export function rememberDestination() {
  try {
    sessionStorage.setItem(AFTER_KEY, location.hash.replace(/^#\/?/, ''))
  } catch {
    /* ignore */
  }
}
export function takeDestination() {
  try {
    const v = sessionStorage.getItem(AFTER_KEY)
    sessionStorage.removeItem(AFTER_KEY)
    return v
  } catch {
    return null
  }
}

export function canSee(need, me) {
  if (!need) return true
  if (!me) return false
  // On the live site the admin dashboard is tied to the admin Google UID itself, so a role
  // planted in this browser's storage (e.g. via an imported backup) can't open it
  if (need === 'admin') return me.role === 'admin' && (import.meta.env.DEV || isAdminUid(me.googleUid))
  if (need === 'coach') return me.role === 'coach' || me.role === 'admin'
  return true
}
