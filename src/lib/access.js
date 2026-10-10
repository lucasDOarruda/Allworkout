// Who can see what. The admin is identified by their Firebase (Google) account UID.
// Note: this is a front-end guard only. Real protection lives in the backend
// (adminGate) and in Firestore security rules.
export const ADMIN_UIDS = ['pNeXKFvYLhd9rem7Vil5xwZnXzF3']

export const isAdminUid = (uid) => !!uid && ADMIN_UIDS.includes(uid)

// Pages anyone can open without an account
const PUBLIC = ['welcome', 'tools', 'signin']

// What each route needs: 'admin', 'coach' (coach or admin) or 'member' (any signed-in user)
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
  if (need === 'admin') return me.role === 'admin'
  if (need === 'coach') return me.role === 'coach' || me.role === 'admin'
  return true
}
