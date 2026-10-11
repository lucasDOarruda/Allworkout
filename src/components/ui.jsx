import { useEffect, useRef, useState } from 'react'
import { exerciseById } from '../data/exercises'
import { FORMATS } from '../data/workouts'
import { go, useStore } from '../store'
import { fileToDataUrl, initials, safeUrl, workoutEquipment, workoutFormats, workoutMinutes, youtubeEmbed } from '../lib/utils'
import { MoveImage, MusclesWorked } from './BodyMap'
import { workoutPhoto } from '../lib/photos'
import Icon from './Icon'

export function Avatar({ user, size = 36 }) {
  if (!user) return null
  if (user.photo) return <img className="avatar" src={user.photo} alt="" style={{ width: size, height: size }} />
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4, background: user.color }} aria-hidden="true">
      {initials(user.name)}
    </span>
  )
}

export function PageHead({ title, back, children }) {
  return (
    <header className="page-head">
      {back && (
        <button className="icon-btn back-btn" onClick={back === true ? () => history.back() : back} aria-label="Back">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <h1 className="display">{title}</h1>
      <div className="page-head-right">{children}</div>
    </header>
  )
}

export function Chips({ options, value, onChange, all = 'All' }) {
  return (
    <div className="chips" role="group">
      {all && (
        <button className={`chip ${!value ? 'on' : ''}`} onClick={() => onChange(null)} aria-pressed={!value}>
          {all}
        </button>
      )}
      {options.map((o) => {
        const [v, label] = Array.isArray(o) ? o : [o, o]
        return (
          <button key={v} className={`chip ${value === v ? 'on' : ''}`} onClick={() => onChange(value === v ? null : v)} aria-pressed={value === v}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented" role="tablist">
      {options.map(([v, label]) => (
        <button key={v} role="tab" aria-selected={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="display">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Collapsible({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="card collapsible">
      <button className="collapsible-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="display">{title}</span>
        <span className={`chev ${open ? 'up' : ''}`} aria-hidden="true">
          ⌄
        </span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </section>
  )
}

export function FormatPill({ format }) {
  return <span className={`fmt-pill fmt-${format}`}>{FORMATS[format]}</span>
}

// Video area: embeds real YouTube links, otherwise shows the image with a link out
export function MoveMedia({ move, large = false }) {
  const embed = youtubeEmbed(move.video)
  if (embed && large)
    return (
      <div className="media">
        <iframe src={embed} title={`${move.name} video`} allow="encrypted-media; picture-in-picture" allowFullScreen />
      </div>
    )
  return (
    <div className="media">
      <MoveImage move={move} size="100%" className="media-img" />
      {safeUrl(move.video) && (
        <a className="media-link" href={safeUrl(move.video)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
          ▶ How-to video
        </a>
      )}
    </div>
  )
}

// Detail sheet for a library exercise or a move in a workout
export function MoveSheet({ move, onClose }) {
  const { me, actions } = useStore()
  const ex = move.exerciseId ? exerciseById[move.exerciseId] : null
  const fav = me && ex && me.favorites.includes(ex.id)
  return (
    <Modal title={move.name} onClose={onClose}>
      {(move.image || youtubeEmbed(move.video)) && <MoveMedia move={{ ...move, video: move.video || ex?.video }} large />}
      {ex && <MusclesWorked exerciseId={ex.id} />}
      {safeUrl(move.video || ex?.video) && !youtubeEmbed(move.video) && (
        <a className="btn btn-ghost full how-to-btn" href={safeUrl(move.video || ex?.video)} target="_blank" rel="noreferrer">
          ▶ Watch a how-to video
        </a>
      )}
      <div className="row between sheet-meta">
        {ex ? (
          <p className="muted small">
            {ex.muscles.join(' · ')} — {ex.equipment}
          </p>
        ) : (
          <span />
        )}
        {me && ex && (
          <button className={`icon-btn star ${fav ? 'on' : ''}`} onClick={() => actions.toggleFavorite(ex.id)} aria-pressed={!!fav} aria-label="Favourite">
            {fav ? '★' : '☆'}
          </button>
        )}
      </div>
      {move.reps && <p className="move-target display">{move.sets > 1 ? `${move.sets} × ` : ''}{move.reps}{Number(move.rest) > 0 ? ` · ${move.rest}s rest` : ''}</p>}
      {move.note && <p className="coach-note">“{move.note}”</p>}
      {ex && (
        <>
          <h3 className="label">Form cues</h3>
          <ol className="cues">
            {ex.cues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </>
      )}
    </Modal>
  )
}

export function WorkoutCard({ w, compact = false }) {
  const { db } = useStore()
  const author = w.authorId ? db.users[w.authorId] : null
  return (
    <button className={`wcard ${compact ? 'compact' : ''}`} onClick={() => go(`w/${w.id}`)}>
      <div className="wcard-cover">
        <img src={workoutPhoto(w)} alt="" loading="lazy" />
        <span className={`price-tag ${w.premium ? 'paid' : ''}`}>{w.premium ? `★ ${w.price}` : 'Free'}</span>
      </div>
      <div className="wcard-body">
        <div className="row gap-xs wrap">
          {workoutFormats(w).map((f) => (
            <FormatPill key={f} format={f} />
          ))}
        </div>
        <h3 className="display">{w.name}</h3>
        <p className="muted small">
          {workoutMinutes(w)} min · {w.level} · {workoutEquipment(w).join(', ')}
        </p>
        <p className="row gap-s small muted">
          {author ? (
            <>
              <Avatar user={author} size={18} /> {author.name}
            </>
          ) : (
            <>All Workout · {w.category}</>
          )}
          <span className="grow" />♥ {w.likes.length}
        </p>
      </div>
    </button>
  )
}

export function Empty({ icon = 'flag', title, children }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={28} />
      </div>
      <p className="strong">{title}</p>
      {children && <div className="muted small">{children}</div>}
    </div>
  )
}

export function SignInPrompt({ text = 'Sign in to join the community.' }) {
  return (
    <div className="card prompt-card">
      <p>{text}</p>
      <button className="btn btn-primary" onClick={() => go('signin')}>
        Sign in
      </button>
    </div>
  )
}

export function ImagePicker({ value, onChange, label = 'Photo', round = false }) {
  const ref = useRef()
  const { notify } = useStore()
  const pick = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      onChange(await fileToDataUrl(f))
    } catch {
      notify('That file isn’t an image', 'error')
    }
  }
  return (
    <div className="image-picker">
      <button type="button" className={`image-slot ${round ? 'round' : ''}`} onClick={() => ref.current.click()} aria-label={`Upload ${label}`}>
        {value ? <img src={value} alt="" /> : <span>＋ {label}</span>}
      </button>
      {value && (
        <button type="button" className="link-btn small" onClick={() => onChange(null)}>
          Remove
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
    </div>
  )
}

export const RoleBadge = ({ role }) => <span className={`role-badge role-${role}`}>{role}</span>
