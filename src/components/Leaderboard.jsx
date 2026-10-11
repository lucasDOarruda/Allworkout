import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { timeAgo } from '../lib/utils'
import { Avatar, Segmented } from './ui'
import Icon from './Icon'
import { ShareSheet } from './ShareWorkout'

const social = () => import('../lib/social')

// Strava-style leaderboard for a race or AMRAP workout: post your best, compare with friends
export default function Leaderboard({ w, unit }) {
  const { me, db, notify } = useStore()
  const [rows, setRows] = useState(null)
  const [friendIds, setFriendIds] = useState(null)
  const [tab, setTab] = useState('friends')
  const [entry, setEntry] = useState('')
  const [busy, setBusy] = useState(false)
  const [challenge, setChallenge] = useState(false)
  const [lib, setLib] = useState(null)

  const load = useCallback(async () => {
    const s = await social()
    setLib(s)
    try {
      setRows(await s.loadLeaderboard(w.id, unit))
    } catch {
      setRows([])
    }
  }, [w.id, unit])
  useEffect(() => {
    load()
    social()
      .then((s) => s.loadSocial(me.googleUid))
      .then((r) => setFriendIds(new Set(r.friends.map((f) => f.other))))
      .catch(() => setFriendIds(new Set()))
  }, [load, me.googleUid])

  // Suggest the time from your latest logged session of this workout
  const lastSession = useMemo(
    () => db.sessions.filter((s) => s.userId === me.id && s.workoutId === w.id).sort((a, b) => (a.date < b.date ? 1 : -1))[0],
    [db.sessions, me.id, w.id],
  )
  useEffect(() => {
    if (unit === 'time' && lastSession?.duration && lib && !entry) setEntry(lib.fmtScore(lastSession.duration, 'time'))
  }, [lastSession, lib, unit]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!lib) return null
  const mine = rows?.find((r) => r.uid === me.googleUid)
  const shown = (rows || []).filter((r) => tab === 'everyone' || r.uid === me.googleUid || friendIds?.has(r.uid))

  const post = async (e) => {
    e.preventDefault()
    const score = unit === 'time' ? lib.parseTime(entry) : Math.round(Number(entry))
    if (!score || score <= 0) return notify(unit === 'time' ? 'Enter your time like 1:12:30 or 72:30.' : 'Enter how many rounds you finished.', 'error')
    setBusy(true)
    try {
      const best = await lib.postResult(w.id, me, score, unit, mine)
      notify(best ? `New best: ${lib.fmtScore(score, unit)}` : `Saved. Your best is still ${lib.fmtScore(mine.score, unit)}.`)
      if (best) load()
    } catch {
      notify('Couldn’t post your result. Try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card stack lb">
      <div className="row between">
        <span className="label">
          <Icon name="medal" size={16} /> Leaderboard · {unit === 'time' ? 'fastest time' : 'most rounds'}
        </span>
        {mine && <span className="tag">Your best {lib.fmtScore(mine.score, unit)}</span>}
      </div>
      <Segmented
        options={[
          ['friends', 'Friends'],
          ['everyone', 'Everyone'],
        ]}
        value={tab}
        onChange={setTab}
      />
      {rows === null ? (
        <p className="muted small">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="muted small">{tab === 'friends' ? 'No results from friends yet. Post yours and challenge them.' : 'No results yet. Be the first.'}</p>
      ) : (
        <ol className="lb-list">
          {shown.slice(0, 20).map((r, i) => (
            <li key={r.uid} className={r.uid === me.googleUid ? 'me' : ''}>
              <span className={`lb-rank ${i < 3 ? `top${i + 1}` : ''}`}>{i + 1}</span>
              <Avatar user={{ name: r.name, photo: r.photo, color: '#3a4d00' }} size={32} />
              <span className="grow">
                <span className="strong block">{r.uid === me.googleUid ? 'You' : r.name}</span>
                <span className="tiny">{r.at ? timeAgo(r.at.toISOString()) : ''}</span>
              </span>
              <span className="lb-score">{lib.fmtScore(r.score, unit)}</span>
            </li>
          ))}
        </ol>
      )}
      <form className="row gap-s" onSubmit={post}>
        <input
          className="grow"
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          inputMode={unit === 'time' ? 'text' : 'numeric'}
          placeholder={unit === 'time' ? 'Your time, e.g. 1:12:30' : 'Rounds, e.g. 6'}
          aria-label={unit === 'time' ? 'Your time' : 'Rounds finished'}
          maxLength={10}
        />
        <button className="btn btn-primary" disabled={busy || !entry.trim()}>
          Post
        </button>
      </form>
      <button className="btn btn-secondary" onClick={() => setChallenge(true)}>
        Challenge friends
      </button>
      <p className="tiny">Results are posted by members themselves. Be honest, it’s more fun that way.</p>
      {challenge && (
        <ShareSheet
          w={w}
          canShare
          title="Challenge friends"
          defaultNote={mine ? `Can you beat my ${lib.fmtScore(mine.score, unit)} on ${w.name}?` : `Race me on ${w.name}!`}
          onClose={() => setChallenge(false)}
        />
      )}
    </section>
  )
}
