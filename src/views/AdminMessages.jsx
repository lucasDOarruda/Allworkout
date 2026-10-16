import { useEffect, useState } from 'react'
import { Chips } from '../components/ui'
import { useStore } from '../store'
import { timeAgo } from '../lib/utils'
import { CloudSetup } from './AdminCloud'

const TOPICS = { general: 'General question', trainer: 'Personal trainers', partner: 'Partnerships', support: 'Help with my account' }

// Contact form messages from Firestore (they're also emailed to contact@yadata.com.au)
export function useMessages() {
  const [state, setState] = useState({ loading: true })
  const load = () => {
    setState((s) => ({ ...s, loading: true }))
    import('../lib/cloud').then((c) => c.loadMessages().then((r) => setState({ loading: false, ...r })))
  }
  useEffect(load, [])
  return { ...state, reload: load }
}

export function Messages({ data }) {
  const { notify } = useStore()
  const [filter, setFilter] = useState('open')
  if (data.loading) return <p className="muted">Loading messages…</p>
  if (data.error) return <CloudSetup error={data.error} onRetry={data.reload} />
  const all = data.messages || []
  const rows = all.filter((m) => (filter === 'open' ? !m.done : filter === 'done' ? m.done : true))

  const mark = async (m, done) => {
    try {
      const c = await import('../lib/cloud')
      await c.setMessageDone(m.id, done)
      data.reload()
    } catch {
      notify('Couldn’t update the message.', 'error')
    }
  }

  return (
    <>
      <div className="adm-toolbar">
        <Chips
          options={[
            ['open', `To answer (${all.filter((m) => !m.done).length})`],
            ['done', 'Answered'],
          ]}
          value={filter}
          onChange={setFilter}
        />
        <button className="btn btn-ghost small" onClick={data.reload}>
          Refresh
        </button>
      </div>
      {rows.length === 0 ? (
        <section className="adm-panel">
          <p className="muted small">{all.length ? 'Nothing here.' : 'No messages yet. They arrive from the contact form on the landing page.'}</p>
        </section>
      ) : (
        rows.map((m) => (
          <section key={m.id} className="adm-panel msg">
            <div className="row between wrap gap-s">
              <span>
                <span className="strong">{m.name}</span> · <a href={`mailto:${m.email}`}>{m.email}</a>
                <span className="tiny block">
                  {TOPICS[m.topic] || m.topic} · {m.createdAt ? timeAgo(m.createdAt.toISOString()) : 'just now'}
                  {m.location ? ` · ${m.location}` : ''}
                </span>
              </span>
              <span className="row gap-s">
                <a className="btn btn-primary small" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message to Kinetic Performances')}`}>
                  Reply
                </a>
                <button className="btn btn-ghost small" onClick={() => mark(m, !m.done)}>
                  {m.done ? 'Reopen' : 'Mark answered'}
                </button>
              </span>
            </div>
            <p className="msg-body">{m.message}</p>
          </section>
        ))
      )}
    </>
  )
}
