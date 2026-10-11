import { useEffect, useRef, useState } from 'react'
import { Avatar, ImagePicker, RoleBadge } from '../components/ui'
import { PublicNav } from '../components/PublicChrome'

// Device-only accounts exist for local development only.
// On the live site the only way in is a real (Google) account.
const DEV_ACCOUNTS = import.meta.env.DEV
import { go, useStore } from '../store'
import { PENDING_KEY } from './SessionForm'
import { isAdminUid, takeDestination } from '../lib/access'
import { TERMS_VERSION } from '../lib/trainer'
import { GOALS } from '../lib/goals'

// Google blocks sign-in inside apps' built-in browsers (Gmail, Instagram, Facebook...)
const IN_APP = typeof navigator !== 'undefined' && /FBAN|FBAV|Instagram|Line\/|LinkedInApp|GSA\/|; wv\)|Snapchat|TikTok/i.test(navigator.userAgent)

const TERMS_KEY = 'aw:terms-accepted'
const termsAcceptedHere = () => {
  try {
    return localStorage.getItem(TERMS_KEY) === TERMS_VERSION
  } catch {
    return false
  }
}

// A session finished in Solo mode waits here until someone signs in
function takePending() {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    localStorage.removeItem(PENDING_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const ROLES = [
  ['client', 'I want to work out', 'Follow workouts, track your progress and find a coach.'],
  ['coach', 'I’m a personal trainer', 'Licensed PTs only. Apply with your qualification, ABN and insurance. We approve you before you can publish, sell or coach.'],
]

// adminMode: the /admin sign-in. Only admin Google accounts get in; nobody else gets an account made.
export default function SignIn({ gate = false, onShow, adminMode = false }) {
  const { db, me, actions, notify } = useStore()
  const [name, setName] = useState('')
  const [role, setRole] = useState('client')
  const [goal, setGoal] = useState(null)
  const [agreed, setAgreed] = useState(termsAcceptedHere)
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showLocal, setShowLocal] = useState(false)
  const fb = useRef(null)
  const order = { admin: 0, coach: 1, client: 2 }

  // Opened in place of a members-only page: remember it for after sign-in
  useEffect(() => {
    if (gate) onShow?.()
  }, [gate, onShow])

  // Preload Firebase so the Google pop-up opens instantly on tap
  useEffect(() => {
    import('../lib/firebase')
      .then((m) => {
        fb.current = m
        return m.preloadAuth()
      })
      .catch(() => {})
  }, [])
  // Admins and Google-linked accounts sign in with Google only, so they aren't offered here
  const profiles = Object.values(db.users)
    .filter((u) => (u.role !== 'admin' && !u.googleUid) || u.id === me?.id)
    .sort((a, b) => order[a.role] - order[b.role] || a.name.localeCompare(b.name))

  const finish = (msg, dest) => {
    const pending = takePending()
    if (pending) {
      actions.saveSession({ ...pending, partnerIds: [] })
      notify('Signed in and saved your session')
      return go('you/activities')
    }
    notify(msg)
    const next = takeDestination()
    go(next && next !== 'signin' && !(next.startsWith('admin') && dest !== 'admin') ? next : dest)
  }

  const pick = (u) => {
    actions.signIn(u.id)
    finish(`Signed in as ${u.name}`, u.role === 'admin' ? 'admin' : 'home')
  }

  // Match a Google account to a member on this device, or create one
  const applyGoogleProfile = (g) => {
    // Live site: only Google members count, so sample and device-only profiles are dropped
    const users = Object.values(db.users).filter((u) => !import.meta.env.PROD || u.googleUid)
    const existing = users.find((u) => u.googleUid === g.uid) || users.find((u) => u.email && u.email.toLowerCase() === g.email.toLowerCase())
    const admin = isAdminUid(g.uid)
    if (adminMode && !admin && existing?.role !== 'admin') {
      fb.current?.googleSignOut?.()
      setError(`${g.email} isn’t an admin account. Sign in with your admin Google account.`)
      return
    }
    // Save the profile, contact details and sign-in to the cloud so admins can see who joined
    // Everyone joins as a client. Trainers become coaches only when an admin approves them.
    const cloudRole = admin ? 'admin' : 'client'
    const newGoal = !existing?.goal && role === 'client' ? goal : null
    try {
      localStorage.setItem(TERMS_KEY, TERMS_VERSION)
    } catch {
      /* private mode */
    }
    import('../lib/cloud').then((c) => c.recordSignIn(g, cloudRole, adminMode ? null : TERMS_VERSION, newGoal))
    if (import.meta.env.PROD) actions.removeSampleAccounts()
    if (existing) {
      actions.signIn(existing.id)
      actions.updateProfile({ googleUid: g.uid, email: g.email, ...(existing.photo ? {} : { photo: g.photo }), ...(admin ? { role: 'admin' } : {}), ...(newGoal ? { goal: newGoal } : {}) })
      return finish(`Welcome back, ${existing.name.split(' ')[0]}`, admin || existing.role === 'admin' ? 'admin' : 'home')
    }
    if (admin) {
      actions.createAccount({ name: g.name, role: 'admin', photo: g.photo, email: g.email, googleUid: g.uid })
      return finish(`Welcome, ${g.name.split(' ')[0]}. You’re signed in as admin.`, 'admin')
    }
    actions.createAccount({ name: g.name, role: 'client', photo: g.photo, email: g.email, googleUid: g.uid })
    if (role === 'coach') {
      actions.updateProfile({ trainerStatus: 'apply' })
      return finish('Welcome! Send your trainer application to get coach tools.', 'apply')
    }
    if (goal) actions.updateProfile({ goal })
    finish('Welcome! Pick a workout or find a coach.', 'home')
  }

  const google = async () => {
    setError('')
    if (!adminMode && !agreed) return setError('Tick the box to agree to the Terms of Service and Privacy Policy.')
    setBusy(true)
    try {
      const m = fb.current || (await import('../lib/firebase'))
      const g = await m.googleSignIn()
      if (g) applyGoogleProfile(g)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Lets automated tests exercise the account matching without a real Google pop-up
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const onTest = (e) => applyGoogleProfile(JSON.parse(e.detail))
    window.addEventListener('aw-google-test', onTest)
    return () => window.removeEventListener('aw-google-test', onTest)
  })

  const create = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    actions.createAccount({ name, role, photo })
    finish(role === 'coach' ? 'Welcome, coach! Create your first workout.' : 'Welcome! Pick a workout or find a coach.', role === 'coach' ? 'you/settings' : 'home')
  }

  return (
    <div className="landing signin-page">
      <PublicNav active="signin" />
      <div className="page narrow signin-wrap">
      <h1 className="signin-title">{adminMode ? 'Admin sign in' : gate ? 'Sign in to continue' : 'Sign in'}</h1>
      <p className="muted signin-sub">
        {adminMode ? 'Use your admin Google account to open the dashboard.' : 'All Workout is free. Use your Google account to join or sign back in.'}
      </p>

      <section className="card stack signin-card">
        {!adminMode && (
        <>
        <span className="label">What brings you here?</span>
        <div className="role-pick" role="radiogroup" aria-label="What brings you here?">
          {ROLES.map(([v, label, desc]) => (
            <button type="button" key={v} role="radio" aria-checked={role === v} className={`role-opt ${role === v ? 'on' : ''}`} onClick={() => setRole(v)}>
              <span className="role-radio" aria-hidden="true" />
              <span className="role-text">
                <span className="role-title">{label}</span>
                <span className="small muted">{desc}</span>
              </span>
            </button>
          ))}
        </div>
        {role === 'client' && (
          <>
            <span className="label">Your main goal</span>
            <div className="goal-pick" role="radiogroup" aria-label="Your main goal">
              {GOALS.map(([k, l]) => (
                <button type="button" key={k} role="radio" aria-checked={goal === k} className={`chip ${goal === k ? 'on' : ''}`} onClick={() => setGoal(goal === k ? null : k)}>
                  {l}
                </button>
              ))}
            </div>
          </>
        )}
        <label className="check-row terms-check">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            I’m 18 or older and agree to the{' '}
            <a href="#/terms" target="_blank" rel="noreferrer">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#/privacy" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            . All Workout gives general fitness information, not medical advice.
          </span>
        </label>
        </>
        )}
        {IN_APP && (
          <p className="inapp-note" role="note">
            Google sign-in doesn’t work inside this app’s browser. Tap the menu (⋯ or ⋮) and choose <strong>Open in Safari</strong> or <strong>Open in Chrome</strong>, then sign
            in.
          </p>
        )}
        <button className="btn-google" onClick={google} disabled={busy}>
          <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          {busy ? 'Opening Google…' : 'Continue with Google'}
        </button>
        {error && (
          <p className="signin-error" role="alert">
            {error}
          </p>
        )}
        {!adminMode && <p className="tiny center">Already a member? Just continue with Google. These choices only apply to new accounts.</p>}
        <p className="tiny center privacy-note">
          We keep your name, email, photo, goal, sign-in activity and approximate location (city) to run your account. Only you and the All Workout admin can see them.{' '}
          <a href="#/privacy">Privacy Policy</a>
        </p>
      </section>

      {DEV_ACCOUNTS && !adminMode && (
      <>
      <p className="notice">Development only: these options don’t appear on the live site.</p>
      <button className="link-btn small signin-toggle" onClick={() => setShowLocal(!showLocal)} aria-expanded={showLocal}>
        {showLocal ? 'Hide' : 'Or create an account on this device without Google'}
      </button>
      {showLocal && (
        <form className="card stack" onSubmit={create}>
          <ImagePicker value={photo} onChange={setPhoto} label="Photo" round />
          <label className="field">
            <span>Your name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lucas" maxLength={40} />
          </label>
          <button className="btn btn-primary big" disabled={!name.trim()}>
            Create {role} account
          </button>
        </form>
      )}

      <h2 className="section-title">Accounts on this device</h2>
      <div className="card list-card">
        {profiles.map((u) => (
          <button key={u.id} className="ex-row" onClick={() => pick(u)}>
            <Avatar user={u} size={44} />
            <span className="grow">
              <span className="strong">{u.name}</span> <RoleBadge role={u.role} />
              <span className="muted small block">
                {u.email || 'Account on this device'}
                {me?.id === u.id ? ' · signed in' : ''}
              </span>
            </span>
            <span className="chev-right">›</span>
          </button>
        ))}
      </div>

      </>
      )}

      {me && (
        <button
          className="btn btn-ghost full"
          onClick={() => {
            actions.signOut()
            go('welcome')
          }}
        >
          Sign out
        </button>
      )}
      </div>
    </div>
  )
}
