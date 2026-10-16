import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

const TOPICS = [
  ['general', 'General question'],
  ['trainer', 'Personal trainers'],
  ['partner', 'Partnerships'],
  ['support', 'Help with my account'],
]

// Landing page contact form. Sent through /api/contact, which emails contact@yadata.com.au.
export default function ContactForm() {
  const [f, setF] = useState({ name: '', email: '', topic: 'general', message: '', website: '' })
  const [state, setState] = useState('idle') // idle | sending | sent
  const [error, setError] = useState('')
  const shownAt = useRef(Date.now())
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (f.name.trim().length < 2) return setError('Enter your name.')
    if (!/^\S+@\S+\.\S{2,}$/.test(f.email.trim())) return setError('Enter a valid email address.')
    if (f.message.trim().length < 10) return setError('Write a little more so we can help (10 characters or more).')
    setState('sending')
    try {
      const c = await import('../lib/cloud')
      await c.sendContact({ ...f, elapsed: Date.now() - shownAt.current })
      setState('sent')
    } catch (err) {
      setError(err.message)
      setState('idle')
    }
  }

  if (state === 'sent')
    return (
      <div className="contact-done" role="status">
        <h3>Thanks, {f.name.trim().split(' ')[0]}!</h3>
        <p className="muted">Your message is on its way. We’ll reply to {f.email.trim()}.</p>
      </div>
    )

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <div className="contact-grid">
        <label className="field">
          <span>Name</span>
          <input value={f.name} onChange={set('name')} autoComplete="name" maxLength={80} />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={f.email} onChange={set('email')} autoComplete="email" maxLength={200} />
        </label>
      </div>
      <label className="field">
        <span>Topic</span>
        <select value={f.topic} onChange={set('topic')}>
          {TOPICS.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Message</span>
        <textarea rows={4} value={f.message} onChange={set('message')} maxLength={3000} />
      </label>
      {/* Hidden from people; bots fill it in */}
      <label className="hp" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} />
      </label>
      {error && (
        <p className="signin-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-lime big" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send message'}
      </button>
      <p className="tiny">
        We use your details only to reply. <a href="#/privacy">Privacy Policy</a>
      </p>
    </form>
  )
}

// Open the contact popup from anywhere (buttons, footer link)
const OPEN_EVENT = 'aw-open-contact'
export const openContact = () => window.dispatchEvent(new Event(OPEN_EVENT))

// Mounted once in the public footer; shows the form in a popup when asked
export function ContactPopup() {
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const back = useRef(null)

  useEffect(() => {
    const show = () => {
      back.current = document.activeElement
      setOpen(true)
    }
    window.addEventListener(OPEN_EVENT, show)
    return () => window.removeEventListener(OPEN_EVENT, show)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    box.current?.querySelector('input')?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      back.current?.focus?.()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="contact-back" onClick={() => setOpen(false)}>
      <div ref={box} className="contact-pop" role="dialog" aria-modal="true" aria-labelledby="contact-title" onClick={(e) => e.stopPropagation()}>
        <div className="contact-pop-head">
          <div>
            <p className="l-eyebrow">Contact</p>
            <h2 id="contact-title">Talk to us.</h2>
            <p className="small muted">
              Questions, partnerships, or you’re a personal trainer who wants to train members on Kinetic Performances? Yadata Pty Ltd ·{' '}
              <a href="mailto:contact@yadata.com.au">contact@yadata.com.au</a>
            </p>
          </div>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
            <Icon name="plus" className="rot45" />
          </button>
        </div>
        <ContactForm />
      </div>
    </div>
  )
}
