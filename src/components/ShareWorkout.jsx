import { useEffect, useState } from 'react'
import { go, useStore } from '../store'
import Icon from './Icon'
import { Avatar } from './ui'

// "Share with friends" on a workout: pick friends, add a note, send a copy
export default function ShareWorkout({ w, canShare }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="btn btn-ghost full share-btn" onClick={() => setOpen(true)}>
        <Icon name="users" size={18} /> Share with friends
      </button>
      {open && <ShareSheet w={w} canShare={canShare} onClose={() => setOpen(false)} />}
    </>
  )
}

function ShareSheet({ w, canShare, onClose }) {
  const { me, notify } = useStore()
  const [friends, setFriends] = useState(null)
  const [picked, setPicked] = useState([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    import('../lib/social')
      .then((s) => s.loadSocial(me.googleUid))
      .then((r) => setFriends(r.friends.map((f) => f.person)))
      .catch(() => setFriends([]))
  }, [me.googleUid])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const send = async () => {
    setBusy(true)
    try {
      const s = await import('../lib/social')
      await s.shareWorkout(me, picked, w, note)
      notify(`Shared “${w.name}” with ${picked.length} friend${picked.length === 1 ? '' : 's'}`)
      onClose()
    } catch {
      notify('Couldn’t share it. Check your connection and try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="contact-back" onClick={onClose}>
      <div className="contact-pop" role="dialog" aria-modal="true" aria-label="Share with friends" onClick={(e) => e.stopPropagation()}>
        <div className="contact-pop-head">
          <div>
            <h2>Share with friends</h2>
            <p className="small muted">They get their own copy of “{w.name}” to do or save.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="plus" className="rot45" />
          </button>
        </div>
        {!canShare ? (
          <p className="notice">This is a paid workout, so only its trainer can share it.</p>
        ) : friends === null ? (
          <p className="muted">Loading your friends…</p>
        ) : friends.length === 0 ? (
          <div className="stack gap-s">
            <p className="muted">You don’t have any friends on All Workout yet.</p>
            <button
              className="btn btn-primary"
              onClick={() => {
                onClose()
                go('friends')
              }}
            >
              Find friends
            </button>
          </div>
        ) : (
          <>
            <ul className="share-list">
              {friends.map((f) => {
                const on = picked.includes(f.uid)
                return (
                  <li key={f.uid}>
                    <label className="check-row">
                      <input type="checkbox" checked={on} onChange={() => setPicked((p) => (on ? p.filter((x) => x !== f.uid) : [...p, f.uid]))} />
                      <Avatar user={{ name: f.name, photo: f.photo, color: '#3a4d00' }} size={32} />
                      <span className="grow strong">{f.name}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
            <label className="field">
              <span>Note (optional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Try this one on Saturday?" />
            </label>
            <button className="btn btn-primary big" disabled={!picked.length || busy} onClick={send}>
              {busy ? 'Sharing…' : picked.length ? `Share with ${picked.length}` : 'Pick friends'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
