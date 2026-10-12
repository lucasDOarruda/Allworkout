import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { StoreProvider } from './store'

// Friendly paths like /admin (served by vercel.json rewrites) become hash routes
const path = location.pathname.replace(/\/+$/, '')
if (/\/admin$/.test(path) && !location.hash) history.replaceState(null, '', `${path.replace(/\/admin$/, '/')}#/admin`)

// Firebase loads after the app has started so it doesn't slow the first screen
import('./lib/firebase').then(({ trackScreen }) => {
  import('./lib/cloud').then((c) => c.trackVisit())
  trackScreen(location.hash)
  window.addEventListener('hashchange', () => trackScreen(location.hash))
})

// Offline support on the live site (the app opens and keeps working without internet)
if (import.meta.env.PROD && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
