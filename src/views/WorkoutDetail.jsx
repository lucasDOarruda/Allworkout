import { useState } from 'react'
import { Avatar, Empty, FormatPill, SignInPrompt } from '../components/ui'
import { MoveImage } from '../components/BodyMap'
import { FORMATS } from '../data/workouts'
import { workoutPhoto } from '../lib/photos'
import { canAccess, go, useStore } from '../store'
import { partMinutes, partSummary, safeUrl, timeAgo, workoutEquipment, workoutMinutes } from '../lib/utils'

const partHeadline = (p) => (p.format === 'timed' ? `${partMinutes(p)} min warmup` : `${FORMATS[p.format]} · ${partSummary(p)}`)

export const moveLine = (p, mv) => (p.format === 'sets' ? `${mv.sets} × ${mv.reps} ${mv.name}` : `${mv.reps} ${mv.name}`)

export default function WorkoutDetail({ id }) {
  const { db, me, workouts, actions, notify, progressFor } = useStore()
  const w = workouts.find((x) => x.id === id)

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

  const author = w.authorId ? db.users[w.authorId] : null
  const isOwner = me && w.authorId === me.id
  const access = canAccess(w, me)
  const liked = me && w.likes.includes(me.id)
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
          onClick={() => (me ? actions.toggleLike(w.id) : notify('Sign in to like workouts.'))}
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
        {author ? (
          <button className="row gap-s link-plain author-row" onClick={() => go(`coach/${author.id}`)}>
            <Avatar user={author} size={30} />
            <span>
              <span className="strong block">{author.name}</span>
              <span className="tiny">Coach</span>
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
            <span className="act-v">{w.likes.length}</span>
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

      {isOwner && w.premium && <BuyersPanel w={w} />}

      <h2 className="section-title">Comments</h2>
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

function CommentForm({ workoutId }) {
  const { actions } = useStore()
  const [text, setText] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    actions.addComment(workoutId, text.trim())
    setText('')
  }
  return (
    <form className="row gap-s comment-form" onSubmit={submit}>
      <input className="grow" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment" maxLength={500} />
      <button className="btn btn-primary" disabled={!text.trim()}>
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
