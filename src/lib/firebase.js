// Firebase setup. The web config below identifies the project; it is not a secret.
// Lock it down in the Firebase console (authorised domains, API key restrictions).
import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported, logEvent } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: 'AIzaSyB7jn7z486HcmWOFCxMFxwk9YcltQsBazg',
  authDomain: 'allworkout-61d91.firebaseapp.com',
  projectId: 'allworkout-61d91',
  storageBucket: 'allworkout-61d91.firebasestorage.app',
  messagingSenderId: '466984590678',
  appId: '1:466984590678:web:2c87c856f58b7bf2994af7',
  measurementId: 'G-NTCSVSBTZ9',
}

export const app = initializeApp(firebaseConfig)

// Analytics only runs in browsers that support it, and not during local development
let analytics = null
const ready = import.meta.env.PROD
  ? isSupported()
      .then((ok) => {
        if (ok) analytics = getAnalytics(app)
      })
      .catch(() => {})
  : Promise.resolve()

// The app uses hash routes (#/home), so log a page view on every screen change
export function trackScreen(hash) {
  ready.then(() => {
    if (!analytics) return
    const screen = (hash.replace(/^#\/?/, '') || 'welcome').split('/')[0]
    logEvent(analytics, 'page_view', { page_title: screen, page_location: location.href, page_path: `/${hash.replace(/^#\/?/, '')}` })
  })
}

// ---------- Google sign-in (Firebase Authentication) ----------
// Requires: Firebase console → Authentication → Sign-in method → Google enabled,
// and the site's domain listed under Authentication → Settings → Authorised domains.

const AUTH_ERRORS = {
  'auth/operation-not-allowed': 'Google sign-in isn’t switched on yet. Enable it in Firebase → Authentication → Sign-in method.',
  'auth/unauthorized-domain': 'This website isn’t on Firebase’s list of authorised domains yet.',
  'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
}

// Load the auth code ahead of time: browsers only allow the Google pop-up if it
// opens straight from a tap, with no download in between.
let authMod = null
export const preloadAuth = () => import('firebase/auth').then((m) => (authMod = m))

// Returns { uid, name, email, photo } or null if the person closed the window
export async function googleSignIn() {
  const { getAuth, GoogleAuthProvider, signInWithPopup } = authMod || (await preloadAuth())
  const auth = getAuth(app)
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    const { user } = await signInWithPopup(auth, provider)
    return { uid: user.uid, name: user.displayName || user.email.split('@')[0], email: user.email, photo: user.photoURL || null }
  } catch (err) {
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') return null
    throw new Error(AUTH_ERRORS[err?.code] || 'Google sign-in didn’t work. Please try again.')
  }
}

export async function googleSignOut() {
  const { getAuth, signOut } = await import('firebase/auth')
  await signOut(getAuth(app)).catch(() => {})
}
