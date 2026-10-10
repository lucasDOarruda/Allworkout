import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { StoreProvider } from './store'

// Firebase loads after the app has started so it doesn't slow the first screen
import('./lib/firebase').then(({ trackScreen }) => {
  trackScreen(location.hash)
  window.addEventListener('hashchange', () => trackScreen(location.hash))
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
