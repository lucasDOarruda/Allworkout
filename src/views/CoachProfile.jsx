import { Avatar, Empty, PageHead, WorkoutCard } from '../components/ui'
import { go, useStore } from '../store'
import { safeUrl } from '../lib/utils'

export default function CoachProfile({ id }) {
  const { db, me, workouts, actions, notify } = useStore()
  const coach = db.users[id]
  if (!coach || (coach.role !== 'coach' && coach.role !== 'admin')) return <Empty icon="info" title="Coach not found" />

  const theirs = workouts.filter((w) => w.authorId === coach.id)
  const free = theirs.filter((w) => !w.premium)
  const paid = theirs.filter((w) => w.premium)
  const clients = db.coaching.filter((c) => c.coachId === coach.id && c.status === 'active').length
  const myLink = me && db.coaching.find((c) => c.clientId === me.id)
  const isMine = myLink?.coachId === coach.id

  const request = () => {
    if (!me) return go('signin')
    if (myLink && !isMine && !confirm(`You already have a coach. Switch to ${coach.name}?`)) return
    actions.requestCoach(coach.id)
    notify(`Request sent to ${coach.name}`)
  }

  return (
    <div className="page narrow">
      <PageHead title="Coach" back />
      <section className="coach-hero">
        <Avatar user={coach} size={112} />
        <h2 className="display coach-hero-name">{coach.name}</h2>
        {coach.specialties && <p className="accent small strong">{coach.specialties}</p>}
        {coach.bio && <p className="muted">{coach.bio}</p>}
        <div className="stat-trio card">
          <div>
            <span className="label">Clients</span>
            <span className="display stat-n">{clients}</span>
          </div>
          <div>
            <span className="label">Free</span>
            <span className="display stat-n">{free.length}</span>
          </div>
          <div>
            <span className="label">Premium</span>
            <span className="display stat-n">{paid.length}</span>
          </div>
        </div>
        {me?.id !== coach.id && me?.role !== 'coach' && (
          <div className="stack full-w">
            {isMine ? (
              <>
                <p className="center strong">{myLink.status === 'active' ? '✓ You train with this coach' : '⏳ Request sent, waiting for approval'}</p>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    if (!confirm('Stop training with this coach?')) return
                    actions.leaveCoach()
                  }}
                >
                  {myLink.status === 'active' ? 'Leave coach' : 'Cancel request'}
                </button>
              </>
            ) : (
              <>
                {coach.coachPrice && safeUrl(coach.payLink) && (
                  <a className="btn btn-secondary" href={safeUrl(coach.payLink)} target="_blank" rel="noreferrer">
                    Pay for coaching · {coach.coachPrice}
                  </a>
                )}
                <button className="btn btn-primary big" onClick={request}>
                  Become a client
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {free.length > 0 && (
        <>
          <h2 className="section-title display">Free workouts</h2>
          <div className="grid">
            {free.map((w) => (
              <WorkoutCard key={w.id} w={w} />
            ))}
          </div>
        </>
      )}
      {paid.length > 0 && (
        <>
          <h2 className="section-title display">Premium workouts</h2>
          <div className="grid">
            {paid.map((w) => (
              <WorkoutCard key={w.id} w={w} />
            ))}
          </div>
        </>
      )}
      {theirs.length === 0 && <Empty icon="note" title="No workouts published yet" />}
    </div>
  )
}
