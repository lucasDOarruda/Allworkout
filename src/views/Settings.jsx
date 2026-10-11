import { useRef, useState } from 'react'
import { Avatar, ImagePicker, RoleBadge, Segmented, WorkoutCard } from '../components/ui'
import { go, isCoach, useStore } from '../store'
import { GOALS } from '../lib/goals'

// Settings content (lives inside the You page)
export function SettingsBody() {
  const { me } = useStore()
  return (
    <>
      {me ? (
        <>
          <ProfileForm key={me.id} />
          {me.googleUid && <HealthConsent />}
          <Partners />
          {isCoach(me) && <MyWorkouts />}
        </>
      ) : (
        <div className="card prompt-card">
          <p>You’re in Solo mode.</p>
          <button className="btn btn-primary" onClick={() => go('signin')}>
            Sign in
          </button>
        </div>
      )}
      <AppSettings />
    </>
  )
}

function ProfileForm() {
  const { me, actions, notify } = useStore()
  const [f, setF] = useState({
    name: me.name,
    photo: me.photo,
    bio: me.bio,
    payLink: me.payLink,
    goals: me.goals,
    seeking: me.seeking,
    specialties: me.specialties,
    coachPrice: me.coachPrice,
    goal: me.goal || '',
  })
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const badLink = f.payLink.trim() && !/^https?:\/\//.test(f.payLink.trim())

  const save = (e) => {
    e.preventDefault()
    if (!f.name.trim() || badLink) return
    actions.updateProfile({ ...f, name: f.name.trim(), bio: f.bio.trim(), payLink: isCoach(me) ? f.payLink.trim() : '' })
    if (f.goal !== (me.goal || '') && me.googleUid) import('../lib/cloud').then((c) => c.saveGoal(me.googleUid, f.goal))
    notify('Profile saved')
  }

  return (
    <form className="card stack" onSubmit={save}>
      <span className="label">Profile</span>
      <ImagePicker value={f.photo} onChange={(v) => set('photo', v)} label="Photo" round />
      <label className="field">
        <span>Name</span>
        <input value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={40} />
      </label>
      <label className="field">
        <span>Bio</span>
        <textarea rows={2} value={f.bio} onChange={(e) => set('bio', e.target.value)} placeholder="What do you train for?" maxLength={160} />
      </label>
      {me.role === 'client' && (
        <>
          <label className="field">
            <span>Main goal</span>
            <select value={f.goal} onChange={(e) => set('goal', e.target.value)}>
              <option value="">Not set</option>
              {GOALS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Goals</span>
            <input value={f.goals} onChange={(e) => set('goals', e.target.value)} placeholder="e.g. First pull-up by summer" maxLength={100} />
          </label>
          <label className="check">
            <input type="checkbox" checked={f.seeking} onChange={(e) => set('seeking', e.target.checked)} />
            <span>
              <span className="strong">I’m looking for a coach</span>
              <span className="muted small block">Coaches and admins can see you’re open to coaching.</span>
            </span>
          </label>
        </>
      )}
      {isCoach(me) && (
        <>
          <label className="field">
            <span>Specialties</span>
            <input value={f.specialties} onChange={(e) => set('specialties', e.target.value)} placeholder="Kettlebell, strength, mobility" maxLength={80} />
          </label>
          <label className="field">
            <span>Coaching price (optional)</span>
            <input value={f.coachPrice} onChange={(e) => set('coachPrice', e.target.value)} placeholder="$49/month" maxLength={20} />
          </label>
        </>
      )}
      {isCoach(me) && (
        <label className="field">
          <span>Payment link (for paid workouts and coaching)</span>
          <input type="url" value={f.payLink} onChange={(e) => set('payLink', e.target.value)} placeholder="https://buy.stripe.com/… or https://ko-fi.com/…" />
          {badLink && <span className="error small">Links need to start with https://</span>}
        </label>
      )}
      <button className="btn btn-primary" disabled={!f.name.trim() || badLink}>
        Save profile
      </button>
    </form>
  )
}

// Members choose whether their health calculator numbers are saved to their account
export function HealthConsent() {
  const { me, actions, notify } = useStore()
  const toggle = async (on) => {
    actions.updateProfile({ healthConsent: on })
    try {
      const c = await import('../lib/cloud')
      await c.setHealthConsent(me.googleUid, on)
      notify(on ? 'Your calculator results will be saved to your account' : 'Turned off. Saved calculator results were deleted.')
    } catch {
      notify('Couldn’t update this setting. Try again.', 'error')
    }
  }
  return (
    <section className="card stack">
      <span className="label">Health calculator data</span>
      <label className="check">
        <input type="checkbox" checked={!!me.healthConsent} onChange={(e) => toggle(e.target.checked)} />
        <span>
          <span className="strong">Save my calculator results to my account</span>
          <span className="muted small block">
            Your height, weight, body measures, goal and results from the health tools are kept with your account so the All Workout team can help with your plan. Turn it
            off any time and we delete them. <a href="#/privacy">Privacy Policy</a>
          </span>
        </span>
      </label>
    </section>
  )
}

function Partners() {
  const { db, me, actions, notify } = useStore()
  const members = Object.values(db.users)
    .filter((u) => u.id !== me.id && u.role !== 'admin')
    .sort((a, b) => me.partners.includes(b.id) - me.partners.includes(a.id) || a.name.localeCompare(b.name))
  return (
    <section className="card">
      <span className="label">Training partners</span>
      <p className="muted small">Partners can tag you in sessions, and those sessions count for both of you.</p>
      <ul className="people">
        {members.map((u) => {
          const on = me.partners.includes(u.id)
          return (
            <li key={u.id}>
              <Avatar user={u} />
              <span className="grow">
                <span className="strong">{u.name}</span> <RoleBadge role={u.role} />
                {u.bio && <span className="muted small block">{u.bio}</span>}
              </span>
              <button
                className={`btn small ${on ? 'btn-ghost' : 'btn-secondary'}`}
                onClick={() => {
                  actions.togglePartner(u.id)
                  notify(on ? `Removed ${u.name}` : `${u.name} is now your training partner`)
                }}
              >
                {on ? '✓ Partner' : '+ Partner'}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function MyWorkouts() {
  const { me, workouts } = useStore()
  const mine = workouts.filter((w) => w.authorId === me.id)
  return (
    <section>
      <div className="row between">
        <h2 className="section-title">My workouts</h2>
        <button className="btn btn-secondary small" onClick={() => go('create')}>
          + Create
        </button>
      </div>
      {mine.length === 0 ? (
        <p className="muted small">You haven’t published anything yet.</p>
      ) : (
        <>
          <p className="muted small">Open a workout to edit or delete it.</p>
          <div className="grid">
            {mine.map((w) => (
              <WorkoutCard key={w.id} w={w} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function AppSettings() {
  const { db, me, actions, notify, theme, setTheme } = useStore()
  const fileRef = useRef()

  const exportData = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `all-workout-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importData = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const next = JSON.parse(await file.text())
      if (next.version !== 3 || !next.users || !Array.isArray(next.sessions)) throw new Error('bad file')
      actions.replaceDb(next)
      notify('Data imported')
    } catch {
      notify('That file isn’t an All Workout backup', 'error')
    }
  }

  return (
    <section className="card stack">
      <span className="label">App</span>
      <div className="field">
        <span>Theme</span>
        <Segmented
          options={[
            ['light', 'Light'],
            ['dark', 'Dark'],
            ['system', 'System'],
          ]}
          value={theme}
          onChange={setTheme}
        />
      </div>
      <div className="row gap-s wrap">
        <button className="btn btn-secondary" onClick={() => go('signin')}>
          {me ? 'Switch account' : 'Sign in'}
        </button>
        {me && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              actions.signOut()
              go('welcome')
            }}
          >
            Sign out
          </button>
        )}
        <button className="btn btn-ghost" onClick={exportData}>
          Export data
        </button>
        <button className="btn btn-ghost" onClick={() => fileRef.current.click()}>
          Import data
        </button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={importData} />
        <button
          className="btn btn-danger"
          onClick={() => {
            if (!confirm('Clear everything stored on this device? Your Google account stays; you’ll need to sign in again.')) return
            actions.clearLocalData()
            notify('Local data cleared')
            go('welcome')
          }}
        >
          Clear local data
        </button>
      </div>
      <p className="tiny">Everything is stored locally in this browser. Export a backup to move it to another device.</p>
    </section>
  )
}
