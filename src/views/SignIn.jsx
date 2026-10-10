import { useState } from 'react'
import { Avatar, ImagePicker, PageHead, RoleBadge } from '../components/ui'
import { go, useStore } from '../store'
import { PENDING_KEY } from './SessionForm'

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
  ['client', 'Client', 'Train with free and paid workouts, find a coach.'],
  ['coach', 'Coach', 'Publish free or paid workouts and take on clients.'],
]

export default function SignIn() {
  const { db, me, actions, notify } = useStore()
  const [name, setName] = useState('')
  const [role, setRole] = useState('client')
  const [photo, setPhoto] = useState(null)
  const order = { admin: 0, coach: 1, client: 2 }
  const profiles = Object.values(db.users).sort((a, b) => !!a.demo - !!b.demo || order[a.role] - order[b.role] || a.name.localeCompare(b.name))

  const finish = (msg, dest) => {
    const pending = takePending()
    if (pending) {
      actions.saveSession({ ...pending, partnerIds: [] })
      notify('Signed in and saved your session')
      return go('you/activities')
    }
    notify(msg)
    go(dest)
  }

  const pick = (u) => {
    actions.signIn(u.id)
    finish(`Signed in as ${u.name}`, u.role === 'admin' ? 'admin' : 'home')
  }

  const create = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    actions.createAccount({ name, role, photo })
    finish(role === 'coach' ? 'Welcome, coach! Create your first workout.' : 'Welcome! Pick a workout or find a coach.', role === 'coach' ? 'you/settings' : 'home')
  }

  return (
    <div className="page narrow">
      <PageHead title="Sign up" back={() => go('home')} />
      <p className="muted">
        This local version keeps every account on this device. Create your own, or switch into a demo account to see the
        app as an admin, a coach or a client.
      </p>

      <form className="card stack" onSubmit={create}>
        <span className="label">I am a…</span>
        <div className="role-pick" role="radiogroup">
          {ROLES.map(([v, label, desc]) => (
            <button type="button" key={v} role="radio" aria-checked={role === v} className={`role-opt ${role === v ? 'on' : ''}`} onClick={() => setRole(v)}>
              <span className="display">{label}</span>
              <span className="small muted">{desc}</span>
            </button>
          ))}
        </div>
        <ImagePicker value={photo} onChange={setPhoto} label="Photo" round />
        <label className="field">
          <span>Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lucas" maxLength={40} />
        </label>
        <button className="btn btn-primary big" disabled={!name.trim()}>
          Create {role} account
        </button>
      </form>

      <h2 className="section-title display">Accounts on this device</h2>
      <div className="card list-card">
        {profiles.map((u) => (
          <button key={u.id} className="ex-row" onClick={() => pick(u)}>
            <Avatar user={u} size={44} />
            <span className="grow">
              <span className="strong">{u.name}</span> <RoleBadge role={u.role} />
              <span className="muted small block">
                {u.demo ? 'Demo account' : 'Your account'}
                {me?.id === u.id ? ' · signed in' : ''}
              </span>
            </span>
            <span className="chev-right">›</span>
          </button>
        ))}
      </div>

      {me && (
        <button
          className="btn btn-ghost full"
          onClick={() => {
            actions.signOut()
            go('home')
          }}
        >
          Sign out (use Solo mode)
        </button>
      )}
    </div>
  )
}
