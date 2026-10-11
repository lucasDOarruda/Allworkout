import { useCallback, useEffect, useState } from 'react'
import { Avatar, Empty } from '../components/ui'
import Icon from '../components/Icon'
import { go, useStore } from '../store'
import { fmtDuration, timeAgo } from '../lib/utils'

const asUser = (p) => ({ name: p.name, photo: p.photo, color: '#3a4d00' })
const social = () => import('../lib/social')

// Friends: find people by name, accept requests, and see what friends share
export default function Friends() {
  const { me, workouts, actions, notify } = useStore()
  const [data, setData] = useState(null)
  const [activity, setActivity] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)

  const load = useCallback(async () => {
    try {
      const s = await social()
      const r = await s.loadSocial(me.googleUid)
      setData(r)
      setError('')
      setActivity(await s.loadFriendActivity(r.friends.map((f) => f.person)))
    } catch {
      setError('Couldn’t load your friends. Check your connection and try again.')
    }
  }, [me.googleUid])
  useEffect(() => {
    load()
  }, [load])

  // Search as you type (after a short pause)
  useEffect(() => {
    if (q.trim().length < 2) return setResults(null)
    const t = setTimeout(() => {
      social()
        .then((s) => s.searchMembers(q, me.googleUid))
        .then(setResults)
        .catch(() => setResults([]))
    }, 300)
    return () => clearTimeout(t)
  }, [q, me.googleUid])

  const act = async (fn, msg) => {
    try {
      await fn(await social())
      if (msg) notify(msg)
      load()
    } catch {
      notify('That didn’t work. Try again.', 'error')
    }
  }

  // Open a shared workout: reuse this member's copy or make one
  const openShared = (json, from) => {
    const existing = from.shareId && workouts.find((w) => w.shareId === from.shareId)
    if (existing) return go(`w/${existing.id}`)
    let w
    try {
      w = JSON.parse(json)
    } catch {
      return notify('That workout couldn’t be opened.', 'error')
    }
    const id = actions.saveSharedWorkout(w, from)
    if (from.shareId && !from.shareId.startsWith('act-')) social().then((s) => s.markShareSaved(from.shareId).catch(() => {}))
    go(`w/${id}`)
  }

  const doActivity = (a) => {
    if (workouts.some((w) => w.id === a.workoutId)) return go(`w/${a.workoutId}`)
    if (a.workout) return openShared(a.workout, { uid: a.friend.uid, name: a.friend.name, shareId: `act-${a.id}` })
    notify('That workout isn’t available to you.')
  }

  if (!me?.googleUid)
    return (
      <div className="page narrow">
        <Empty icon="users" title="Sign in with Google to add friends" />
      </div>
    )

  const stateOf = (uid) => {
    if (!data) return null
    if (data.friends.some((f) => f.other === uid)) return 'friends'
    if (data.outgoing.some((f) => f.other === uid)) return 'sent'
    if (data.incoming.some((f) => f.other === uid)) return 'incoming'
    return null
  }

  return (
    <div className="page narrow friends-page">
      <header className="app-head">
        <h1>Friends</h1>
      </header>

      <section className="card stack">
        <label className="field">
          <span>Find people by name</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Jordan" autoComplete="off" />
        </label>
        {results !== null &&
          (results.length === 0 ? (
            <p className="muted small">Nobody found. People can turn off “find me by name”.</p>
          ) : (
            <ul className="people">
              {results.map((p) => {
                const st = stateOf(p.uid)
                const link = data && [...data.incoming].find((f) => f.other === p.uid)
                return (
                  <li key={p.uid}>
                    <Avatar user={asUser(p)} />
                    <span className="grow strong">{p.name}</span>
                    {st === 'friends' ? (
                      <span className="tag">Friends</span>
                    ) : st === 'sent' ? (
                      <span className="tag">Requested</span>
                    ) : st === 'incoming' ? (
                      <button className="btn btn-primary small" onClick={() => act((s) => s.acceptFriend(link.id), `You and ${p.name} are now friends`)}>
                        Accept
                      </button>
                    ) : (
                      <button className="btn btn-primary small" onClick={() => act((s) => s.sendFriendRequest(me.googleUid, p.uid), `Friend request sent to ${p.name}`)}>
                        Add friend
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          ))}
      </section>

      {error && <p className="signin-error">{error}</p>}
      {!data && !error && <p className="muted">Loading…</p>}

      {data && data.incoming.length > 0 && (
        <>
          <h2 className="section-title">Friend requests</h2>
          <ul className="card people">
            {data.incoming.map((f) => (
              <li key={f.id}>
                <Avatar user={asUser(f.person)} />
                <span className="grow strong">{f.person.name}</span>
                <button className="btn btn-primary small" onClick={() => act((s) => s.acceptFriend(f.id), `You and ${f.person.name} are now friends`)}>
                  Accept
                </button>
                <button className="btn btn-ghost small" onClick={() => act((s) => s.removeFriendship(f.id), 'Request declined')}>
                  Decline
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {data && data.shares.length > 0 && (
        <>
          <h2 className="section-title">Shared with you</h2>
          <ul className="card people">
            {data.shares.map((sh) => {
              let name = 'Workout'
              try {
                name = JSON.parse(sh.workout).name || name
              } catch {
                /* ignore */
              }
              return (
                <li key={sh.id}>
                  <span className="share-icon">
                    <Icon name="dumbbell" size={18} />
                  </span>
                  <span className="grow">
                    <span className="strong block">{name}</span>
                    <span className="tiny">
                      From {sh.fromName} · {sh.createdAt ? timeAgo(sh.createdAt.toISOString()) : 'just now'}
                      {sh.note ? ` · “${sh.note}”` : ''}
                    </span>
                  </span>
                  <button className="btn btn-primary small" onClick={() => openShared(sh.workout, { uid: sh.from, name: sh.fromName, shareId: sh.id })}>
                    {sh.savedAt ? 'Open' : 'Do it'}
                  </button>
                  <button className="icon-btn" aria-label={`Remove ${name}`} onClick={() => act((s) => s.deleteShare(sh.id))}>
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {data && (
        <>
          <h2 className="section-title">Friends’ workouts</h2>
          {activity === null ? (
            <p className="muted small">Loading…</p>
          ) : activity.length === 0 ? (
            <p className="muted small">When friends choose to share their finished workouts, they show up here so you can do them too.</p>
          ) : (
            <ul className="card people">
              {activity.map((a) => (
                <li key={`${a.friend.uid}-${a.id}`}>
                  <Avatar user={asUser(a.friend)} />
                  <span className="grow">
                    <span className="strong block">{a.workoutName}</span>
                    <span className="tiny">
                      {a.friend.name} · {a.duration ? `${fmtDuration(a.duration)} · ` : ''}
                      {a.createdAt ? timeAgo(a.createdAt.toISOString()) : ''}
                    </span>
                  </span>
                  <button className="btn btn-secondary small" onClick={() => doActivity(a)}>
                    Do this
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h2 className="section-title">Your friends {data.friends.length ? `(${data.friends.length})` : ''}</h2>
          {data.friends.length === 0 ? (
            <p className="muted small">Search above to add your first friend.</p>
          ) : (
            <ul className="card people">
              {data.friends.map((f) => (
                <li key={f.id}>
                  <Avatar user={asUser(f.person)} />
                  <span className="grow strong">{f.person.name}</span>
                  <button className="btn btn-ghost small" onClick={() => confirm(`Remove ${f.person.name} as a friend?`) && act((s) => s.removeFriendship(f.id), 'Friend removed')}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {data.outgoing.length > 0 && (
            <>
              <h2 className="section-title">Sent requests</h2>
              <ul className="card people">
                {data.outgoing.map((f) => (
                  <li key={f.id}>
                    <Avatar user={asUser(f.person)} />
                    <span className="grow strong">{f.person.name}</span>
                    <button className="btn btn-ghost small" onClick={() => act((s) => s.removeFriendship(f.id), 'Request cancelled')}>
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <SharingSettings />
    </div>
  )
}

// What this member shares: being found by name, and their finished workouts
export function SharingSettings() {
  const { me, actions, notify } = useStore()
  const set = async (patch, msg) => {
    actions.updateProfile(patch)
    try {
      const s = await social()
      await s.publishMember({ ...me, ...patch })
      notify(msg)
    } catch {
      notify('Couldn’t save that setting. Try again.', 'error')
    }
  }
  return (
    <section className="card stack">
      <span className="label">Sharing</span>
      <label className="check">
        <input type="checkbox" checked={me.findable !== false} onChange={(e) => set({ findable: e.target.checked }, e.target.checked ? 'People can find you by name' : 'You’re hidden from name search')} />
        <span>
          <span className="strong">Let people find me by name</span>
          <span className="muted small block">Other members can search your name and send you a friend request.</span>
        </span>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={!!me.shareActivity}
          onChange={(e) => set({ shareActivity: e.target.checked }, e.target.checked ? 'Friends will see the workouts you finish' : 'Your workouts are private again')}
        />
        <span>
          <span className="strong">Share my finished workouts with friends</span>
          <span className="muted small block">Friends see which workouts you finish (name, length and date) and can do them too. Off by default.</span>
        </span>
      </label>
    </section>
  )
}
