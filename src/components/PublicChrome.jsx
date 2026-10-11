import { go, useStore } from '../store'

// Shared top bar and footer for the public pages (landing, health tools, sign in)
export function PublicNav({ active }) {
  const { me } = useStore()
  return (
    <nav className="l-nav">
      <a className="l-brand" href="#/welcome">
        <span className="l-mark">AW</span> All Workout
      </a>
      <div className="row gap-s">
        <a className={`l-navlink ${active === 'tools' ? 'on' : ''}`} href="#/tools">
          Health tools
        </a>
        {me ? (
          <button className="btn btn-primary" onClick={() => go('home')}>
            Open app
          </button>
        ) : (
          active !== 'signin' && (
            <button className="btn btn-primary" onClick={() => go('signin')}>
              Sign in
            </button>
          )
        )}
      </div>
    </nav>
  )
}

export function PublicFooter() {
  return (
    <footer className="l-footer slim">
      <div className="l-stores" aria-label="Mobile apps coming soon">
        <span className="l-store" aria-label="Coming soon to the App Store">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              fill="currentColor"
              d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.9-.9-3.1-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6-.1-.1-2.4-1-2.4-3.8zM14.1 5.8c.6-.8 1.1-1.8 1-2.8-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.7-1 2.7 1 .1 2-.5 2.7-1.3z"
            />
          </svg>
          <span>
            <small>Coming soon to the</small>
            <strong>App Store</strong>
          </span>
        </span>
        <span className="l-store" aria-label="Coming soon on Android">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path fill="currentColor" d="M5 16a7 7 0 0 1 14 0z" />
            <path d="M8.2 10.4 6.6 7.6M15.8 10.4l1.6-2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <circle cx="9.6" cy="13.2" r="0.9" fill="#0d0e0a" />
            <circle cx="14.4" cy="13.2" r="0.9" fill="#0d0e0a" />
          </svg>
          <span>
            <small>Coming soon on</small>
            <strong>Android</strong>
          </span>
        </span>
      </div>
      <p>
        © {new Date().getFullYear()} All Workout · Hosted for the community · Built by{' '}
        <a className="l-credit" href="https://yadata.com.au" target="_blank" rel="noreferrer">
          yadata.com.au
        </a>{' '}
        · Photos: Unsplash
      </p>
    </footer>
  )
}
