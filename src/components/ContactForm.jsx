import { useRef, useState } from 'react'

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
