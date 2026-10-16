// Contact form on the landing page. Public, so it's guarded against spam: a hidden honeypot
// field, a minimum time on the form, length limits and a per-IP rate limit. The message is
// saved to Firestore (admins read it in the dashboard) and emailed to the admin with the
// sender as reply-to. Nothing is ever emailed to the address the visitor typed.
import { NOTIFY_TO, SITE, addDoc, clientIp, json, layout, limited, p, place, rows, sameOrigin, sendEmail, esc } from './_lib/server.js'

const TOPICS = { general: 'General question', trainer: 'Personal trainers', partner: 'Partnerships', support: 'Help with my account' }
const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/

export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403)
  const ip = clientIp(req)
  if (limited(`contact:${ip}`, 5, 60 * 60 * 1000)) return json({ error: 'Too many messages. Try again later or email contact@yadata.com.au.' }, 429)
  const b = await req.json().catch(() => null)
  if (!b) return json({ error: 'Bad request' }, 400)

  // Bots fill the hidden field or submit instantly: pretend it worked
  if (b.website || !(Number(b.elapsed) > 2500)) return json({ ok: true })

  const name = String(b.name || '').trim().slice(0, 80)
  const email = String(b.email || '').trim().slice(0, 200)
  const message = String(b.message || '').trim()
  const topic = TOPICS[b.topic] ? b.topic : 'general'
  if (name.length < 2) return json({ error: 'Enter your name.' }, 400)
  if (!EMAIL.test(email)) return json({ error: 'Enter a valid email address.' }, 400)
  if (message.length < 10 || message.length > 3000) return json({ error: 'Write a message between 10 and 3000 characters.' }, 400)
  if ((message.match(/https?:\/\//g) || []).length > 3) return json({ error: 'Please include fewer links.' }, 400)

  const where = place(req)
  const saved = await addDoc('contactMessages', { name, email, topic, message, location: where }).catch(() => false)
  const sent = await sendEmail({
    to: NOTIFY_TO,
    subject: `Kinetic Performances contact: ${TOPICS[topic]} from ${name}`,
    html: layout(
      'New message from the website',
      rows([
        ['Name', name],
        ['Email', email],
        ['Topic', TOPICS[topic]],
        ['Location', where],
      ]) + p(esc(message).replace(/\n/g, '<br>')),
      { href: `${SITE}/admin#/admin/messages`, label: 'Open messages' },
    ),
    replyTo: email,
  })
  if (!saved && !sent) return json({ error: 'We couldn’t send your message. Please email contact@yadata.com.au.' }, 502)
  return json({ ok: true })
}
