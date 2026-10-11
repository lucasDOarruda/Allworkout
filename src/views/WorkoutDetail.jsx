import { useCallback, useEffect, useState } from 'react'
import ShareWorkout from '../components/ShareWorkout'
import { Avatar, Empty, FormatPill, SignInPrompt } from '../components/ui'
import { MoveImage } from '../components/BodyMap'
import { FORMATS } from '../data/workouts'
import { workoutPhoto } from '../lib/photos'
import { canAccess, go, useStore } from '../store'
import { partMinutes, partSummary, safeUrl, timeAgo, workoutEquipment, workoutMinutes } from '../lib/utils'

const partHeadline = (p) => (p.format === 'timed' ? `${partMinutes(p)} min warmup` : `${FORMATS[p.format]} · ${partSummary(p)}`)

export const moveLine = (p, mv) => (p.format === 'sets' ? `${mv.sets} × ${mv.reps} ${mv.name}` : `${mv.reps} ${mv.name}`)

// Likes and comments from the cloud, so members see each other's (Google accounts only)
function useWorkoutSocial(workoutId, uid) {
  const [state, setState] = useState(null)
  const load = useCallback(() => {
    if (!uid) return
    import('../lib/social')
      .then((s) => s.loadWorkoutSocial(workoutId, uid))
      .then(setState)
      .catch(() => setState({ error: true, count: 0, liked: false, comments: [] }))
  }, [workoutId, uid])
  useEffect(() => {
    load()
  }, [load])
  return [state, setState, load]
}

export default function WorkoutDetail({ id }) {
  const { db, me, workouts, actions, notify, progressFor } = useStore()
  const w = workouts.find((x) => x.id === id)
  const [cloud, setCloud, reloadCloud] = useWorkoutSocial(id, me?.googleUid)

  if (!w) {
    return (
      <div className="page">
        <Empty icon="info" title="Workout not found">
          It may have been deleted.{' '}
          <button className="link-btn" onClick={() => go('explore')}>
            Back to the library
          </button>
        </Empty>
      </div>
    )
  }

  const author = w.authorId && !w.sharedBy ? db.users[w.authorId] : null
  const isOwner = me && w.authorId === me.id
  const access = canAccess(w, me)
  const localLiked = !!me && w.likes.includes(me.id)
  const liked = cloud && !cloud.error ? cloud.liked : localLiked
  const likeCount = cloud && !cloud.error ? cloud.count : w.likes.length
  const toggleLike = () => {
    if (!me) return notify('Sign in to like workouts.')
    if (localLiked === liked) actions.toggleLike(w.id) // keep this browser's liked list in step
    if (!cloud || cloud.error) return
    const on = !liked
    setCloud((c) => ({ ...c, liked: on, count: c.count + (on ? 1 : -1) }))
    import('../lib/social')
      .then((s) => s.setWorkoutLike(w.id, me.googleUid, on))
      .catch(() => {
        notify('Couldn’t save your like.', 'error')
        reloadCloud()
      })
  }
  const comments = db.comments.filter((c) => c.workoutId === w.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  const doneBy = new Set(db.sessions.filter((s) => s.workoutId === w.id).flatMap((s) => [s.userId, ...(s.partnerIds || [])]))
  const pr = progressFor(w.id)
  const done = pr?.done || []
  const allDone = done.length === w.parts.length
  const nextPart = w.parts.findIndex((_, i) => !done.includes(i))
  const requested = me && (w.requests || []).includes(me.id)

  // Buyers preview only the first two moves
  let shown = 0
  const visible = w.parts.map((p) => p.moves.map(() => access || shown++ < 2))

  const cta = () => {
    if (allDone && pr.saved) {
      actions.resetProgress(w.id)
      return go(`w/${w.id}/p/0`)
    }
    if (allDone) return go(`w/${w.id}/finish`)
    go(`w/${w.id}/p/${nextPart}`)
  }
  const ctaLabel = allDone ? (pr.saved ? 'Restart Workout' : 'Save session') : done.length ? 'Continue Workout' : 'Start Workout'

  return (
    <div className="page narrow has-sticky w-page">
      <section className="w-hero">
        <img className="w-hero-img" src={workoutPhoto(w)} alt="" />
        <div className="w-hero-shade" />
        <button className="hero-btn left" onClick={() => (history.length > 1 ? history.back() : go('explore'))} aria-label="Back">
          ‹
        </button>
        <button
          className={`hero-btn right ${liked ? 'on' : ''}`}
          onClick={toggleLike}
          aria-pressed={!!liked}
          aria-label="Like"
        >
          {liked ? '♥' : '♡'}
        </button>
        <span className="hero-play" aria-hidden="true">
          ▶
        </span>
      </section>

      <div className="w-head">
        <div className="row gap-xs wrap">
          {[...new Set(w.parts.filter((p) => p.format !== 'timed').map((p) => p.format))].map((f) => (
            <FormatPill key={f} format={f} />
          ))}
          <span className="tag">{w.level}</span>
          {w.premium ? <span className="tag paid">★ {w.price}</span> : <span className="tag">Free</span>}
        </div>
        <h1 className="w-title">{w.name}</h1>
        {w.sharedBy ? (
          <p className="muted small">Shared with you by {w.sharedBy.name} · only you can see this copy</p>
        ) : author ? (
          <button className="row gap-s link-plain author-row" onClick={() => go(`coach/${author.id}`)}>
            <Avatar user={author} size={30} />
            <span>
              <span className="strong block">{author.name}</span>
              <span className="tiny">{w.private ? 'Your private workout · only you can see it' : author.role === 'coach' ? 'Trainer' : 'Member'}</span>
            </span>
          </button>
        ) : (
          <p className="muted small">All Workout · {w.category}</p>
        )}
        <div className="w-stats">
          <div>
            <span className="act-v">{workoutMinutes(w)}</span>
            <span className="act-l">min</span>
          </div>
          <div>
            <span className="act-v">{w.parts.reduce((a, p) => a + p.moves.length, 0)}</span>
            <span className="act-l">moves</span>
          </div>
          <div>
            <span className="act-v">{doneBy.size}</span>
            <span className="act-l">did it</span>
          </div>
          <div>
            <span className="act-v">{likeCount}</span>
            <span className="act-l">likes</span>
          </div>
        </div>
        <p className="muted">{w.description}</p>
        <p className="tiny">{workoutEquipment(w).join(' · ')}</p>
      </div>

      {w.parts.map((p, i) => {
        const isDone = done.includes(i)
        return (
          <section key={p.id || i} className="part-block">
            <button className="part-block-head" onClick={() => (access ? go(`w/${w.id}/p/${i}`) : notify('Get access to open this part.'))}>
              <span className={`day-check ${isDone ? 'on' : ''}`}>{isDone ? '✓' : i + 1}</span>
              <span className="grow">
                <span className="strong block">{p.name}</span>
                <span className="muted small">{partHeadline(p)}</span>
              </span>
              <span className="chev-right">›</span>
            </button>
            <ul className="move-rows">
              {p.moves.map((mv, j) => (
                <li key={j} className={visible[i][j] ? '' : 'locked'}>
                  {visible[i][j] ? (
                    <>
                      <MoveImage move={mv} size={40} />
                      <span className="grow">{mv.name}</span>
                      <span className="move-reps">{p.format === 'sets' ? `${mv.sets} × ${mv.reps}` : mv.reps}</span>
                    </>
                  ) : (
                    <span className="grow muted">Locked move</span>
                  )}
                </li>
              ))}
            </ul>
            {p.format === 'timed' && p.overview && <p className="muted small part-note">{p.overview}</p>}
          </section>
        )
      })}

      {!access && (
        <div className="card lock-card">
          <p className="card-h">Unlock the full workout</p>
          <p className="muted small">Pay {author?.name || 'the creator'}, then they’ll unlock it for you here.</p>
          {safeUrl(w.payLink) ? (
            <a className="btn btn-primary full" href={safeUrl(w.payLink)} target="_blank" rel="noreferrer">
              Get access · {w.price}
            </a>
          ) : (
            <p className="muted small">The creator hasn’t added a payment link yet.</p>
          )}
          {me ? (
            requested ? (
              <p className="muted small center">✓ Waiting for {author?.name.split(' ')[0] || 'the creator'} to unlock it.</p>
            ) : (
              <button
                className="btn btn-ghost full"
                onClick={() => {
                  actions.requestAccess(w.id)
                  notify('The creator can now see you’ve paid.')
                }}
              >
                I’ve paid, let the creator know
              </button>
            )
          ) : (
            <SignInPrompt text="Sign in to request access after you’ve paid." />
          )}
        </div>
      )}

      {me?.googleUid && <ShareWorkout w={w} canShare={!w.premium || isOwner} />}

      {isOwner && w.premium && <BuyersPanel w={w} />}

      <h2 className="section-title">Comments</h2>
      {me?.googleUid ? (
        <CloudComments w={w} me={me} cloud={cloud} reload={reloadCloud} />
      ) : (
        <>
      {comments.length === 0 && <p className="muted small">No comments yet.</p>}
      <ul className="comments">
        {comments.map((c) => {
          const u = db.users[c.userId]
          if (!u) return null
          return (
            <li key={c.id}>
              <Avatar user={u} size={28} />
              <div className="grow">
                <p>
                  <span className="strong">{u.name}</span> <span className="tiny">{timeAgo(c.createdAt)}</span>
                </p>
                <p>{c.text}</p>
              </div>
              {me && (c.userId === me.id || isOwner || me.role === 'admin') && (
                <button className="icon-btn small" onClick={() => actions.deleteComment(c.id)} aria-label="Delete comment">
                  ✕
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {me ? <CommentForm workoutId={w.id} /> : <SignInPrompt text="Sign in to comment." />}
        </>
      )}

      {(isOwner || (me?.role === 'admin' && !w.official)) && (
        <section className="card owner-tools">
          <span className="label">{isOwner ? 'Your workout' : 'Admin'}</span>
          <div className="row gap-s">
            {isOwner && (
              <button className="btn btn-secondary grow" onClick={() => go(`w/${w.id}/edit`)}>
                Edit
              </button>
            )}
            <button
              className="btn btn-danger grow"
              onClick={() => {
                if (!confirm(`Delete “${w.name}”? Comments and likes go too. Logged sessions stay in history.`)) return
                actions.deleteWorkout(w.id)
                notify('Workout deleted')
                go('home')
              }}
            >
              Delete
            </button>
          </div>
        </section>
      )}

      {access && (
        <div className="sticky-cta">
          <div className="cta-pair">
            <button className="btn btn-ghost big" onClick={() => (me ? go(`w/${w.id}/log`) : go('signin'))}>
              Log
            </button>
            <button className="btn btn-primary big grow" onClick={cta}>
              ▶ {ctaLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Comments everyone can see (stored in Firestore)
function CloudComments({ w, me, cloud, reload }) {
  const { notify } = useStore()
  if (!cloud) return <p className="muted small">Loading comments…</p>
  const remove = async (c) => {
    try {
      const s = await import('../lib/social')
      await s.deleteWorkoutComment(w.id, c.id)
      reload()
    } catch {
      notify('Couldn’t delete the comment.', 'error')
    }
  }
  const post = async (text) => {
    const s = await import('../lib/social')
    await s.addWorkoutComment(w.id, me, text)
    reload()
  }
  return (
    <>
      {cloud.error && <p className="muted small">Comments couldn’t load. Check your connection.</p>}
      {!cloud.error && cloud.comments.length === 0 && <p className="muted small">No comments yet. Be the first.</p>}
      <ul className="comments">
        {cloud.comments.map((c) => (
          <li key={c.id}>
            <Avatar user={{ name: c.name, photo: c.photo, color: '#3a4d00' }} size={28} />
            <div className="grow">
              <p>
                <span className="strong">{c.name}</span> <span className="tiny">{c.createdAt ? timeAgo(c.createdAt.toISOString()) : 'just now'}</span>
              </p>
              <p>{c.text}</p>
            </div>
            {(c.uid === me.googleUid || me.role === 'admin') && (
              <button className="icon-btn small" onClick={() => remove(c)} aria-label="Delete comment">
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      <CommentForm workoutId={w.id} onPost={post} />
    </>
  )
}

function CommentForm({ workoutId, onPost }) {
  const { actions, notify } = useStore()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    if (!onPost) {
      actions.addComment(workoutId, text.trim())
      return setText('')
    }
    setBusy(true)
    try {
      await onPost(text.trim())
      setText('')
    } catch {
      notify('Couldn’t post your comment. Try again.', 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="row gap-s comment-form" onSubmit={submit}>
      <input className="grow" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment" maxLength={500} />
      <button className="btn btn-primary" disabled={!text.trim() || busy}>
        Post
      </button>
    </form>
  )
}

function BuyersPanel({ w }) {
  const { db, actions, notify } = useStore()
  const [pick, setPick] = useState('')
  const requests = (w.requests || []).map((id) => db.users[id]).filter(Boolean)
  const buyers = (w.unlocked || []).map((id) => db.users[id]).filter(Boolean)
  const others = Object.values(db.users).filter((u) => u.id !== w.authorId && !w.unlocked.includes(u.id) && u.role !== 'admin')

  const unlock = (u) => {
    actions.setUnlocked(w.id, u.id, true)
    notify(`Unlocked for ${u.name}`)
  }

  return (
    <section className="card">
      <span className="label">Sales · {w.price}</span>
      <p className="muted small">When a payment arrives, unlock the workout for that person.</p>
      {requests.length > 0 && (
        <>
          <h3 className="label accent">Says they’ve paid</h3>
          <ul className="people">
            {requests.map((u) => (
              <li key={u.id}>
                <Avatar user={u} size={28} />
                <span className="grow">{u.name}</span>
                <button className="btn btn-primary small" onClick={() => unlock(u)}>
                  Unlock
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className="label">Unlocked ({buyers.length})</h3>
      {buyers.length === 0 && <p className="muted small">Nobody yet.</p>}
      <ul className="people">
        {buyers.map((u) => (
          <li key={u.id}>
            <Avatar user={u} size={28} />
            <span className="grow">{u.name}</span>
            <button className="btn btn-ghost small" onClick={() => actions.setUnlocked(w.id, u.id, false)}>
              Revoke
            </button>
          </li>
        ))}
      </ul>
      {others.length > 0 && (
        <div className="row gap-s">
          <select className="grow" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Member to unlock">
            <option value="">Unlock another member…</option>
            {others.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-secondary"
            disabled={!pick}
            onClick={() => {
              unlock(db.users[pick])
              setPick('')
            }}
          >
            Unlock
          </button>
        </div>
      )}
    </section>
  )
}
