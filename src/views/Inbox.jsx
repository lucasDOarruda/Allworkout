import { useEffect } from 'react'
import { Avatar, Empty, PageHead } from '../components/ui'
import Icon from '../components/Icon'
import { go, useStore } from '../store'
import { timeAgo } from '../lib/utils'
import { inboxText, markInboxSeen, useInbox } from '../lib/inbox'

// Notifications: workouts friends shared, friend requests, and friends saving your workouts
export default function Inbox() {
  const { workouts, actions, notify } = useStore()
  const inbox = useInbox()
  const seenAt = inbox.seenAt

  // Opening the page marks everything as seen (after it has rendered with the old marker)
  useEffect(() => {
    if (inbox.ready) markInboxSeen()
  }, [inbox.ready, inbox.items.length])

  const openShare = async (share) => {
    const existing = workouts.find((w) => w.shareId === share.id)
    if (existing) return go(`w/${existing.id}`)
    let w
    try {
      w = JSON.parse(share.workout)
    } catch {
      return notify('That workout couldn’t be opened.', 'error')
    }
    const id = actions.saveSharedWorkout(w, { uid: share.from, name: share.fromName, shareId: share.id })
    import('../lib/social').then((s) => s.markShareSaved(share.id).catch(() => {}))
    notify(`Saved “${w.name}” to your workouts`)
    go(`w/${id}`)
  }

  const friend = async (fn, msg) => {
    try {
      const s = await import('../lib/social')
      await fn(s)
      notify(msg)
    } catch {
      notify('That didn’t work. Try again.', 'error')
    }
  }

  return (
    <div className="page narrow inbox-page">
      <PageHead title="Notifications" back />
      {!inbox.ready ? (
        <p className="muted">Loading…</p>
      ) : inbox.items.length === 0 ? (
        <Empty icon="bell" title="Nothing yet">
          When friends share a workout or send you a request, it shows up here.
          <div className="row gap-s locked-actions">
            <button className="btn btn-primary" onClick={() => go('friends')}>
              Find friends
            </button>
          </div>
        </Empty>
      ) : (
        <ul className="card inbox-list">
          {inbox.items.map((i) => {
            const unread = (i.at?.getTime() || Date.now()) > seenAt
            return (
              <li key={i.id} className={unread ? 'unread' : ''}>
                <Avatar user={{ name: i.from, color: '#3a4d00' }} size={40} />
                <div className="grow">
                  <p>{inboxText(i)}</p>
                  {i.note && <p className="small muted">“{i.note}”</p>}
                  <p className="tiny">{i.at ? timeAgo(i.at.toISOString()) : 'just now'}</p>
                  {i.type === 'share' && (
                    <div className="row gap-s">
                      <button className="btn btn-primary small" onClick={() => openShare(i.share)}>
                        {i.share.savedAt ? 'Open' : 'Save & open'}
                      </button>
                    </div>
                  )}
                  {i.type === 'request' && (
                    <div className="row gap-s">
                      <button className="btn btn-primary small" onClick={() => friend((s) => s.acceptFriend(i.linkId), `You and ${i.from} are now friends`)}>
                        Accept
                      </button>
                      <button className="btn btn-ghost small" onClick={() => friend((s) => s.removeFriendship(i.linkId), 'Request declined')}>
                        Decline
                      </button>
                    </div>
                  )}
                </div>
                {unread && <span className="inbox-dot" aria-label="New" />}
              </li>
            )
          })}
        </ul>
      )}
      <button className="btn btn-ghost full" onClick={() => go('friends')}>
        <Icon name="users" size={18} /> Friends
      </button>
    </div>
  )
}
