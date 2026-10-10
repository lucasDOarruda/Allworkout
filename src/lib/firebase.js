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
