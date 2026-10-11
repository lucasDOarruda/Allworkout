// Shared helpers for the Vercel functions in /api. Files under _lib aren't served as endpoints.
// Secrets come from Vercel environment variables only:
//   RESEND_API_KEY  (required)  Resend key for sending email; never sent to the browser
//   EMAIL_FROM      (optional)  sender, on a domain verified in Resend
//   NOTIFY_TO       (optional)  where admin alerts go
import { createRemoteJWKSet, jwtVerify } from 'jose'

export const PROJECT_ID = 'allworkout-61d91'
export const ADMIN_UIDS = ['pNeXKFvYLhd9rem7Vil5xwZnXzF3']
export const SITE = 'https://allworkout-lovat.vercel.app'
const FROM = process.env.EMAIL_FROM || 'All Workout by Yadata <noreply@yadata.com.au>'
export const NOTIFY_TO = process.env.NOTIFY_TO || 'contact@yadata.com.au'

export const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

// Only accept calls from our own pages
export function sameOrigin(req) {
  const origin = req.headers.get('origin')
  if (!origin) return true
  try {
    const o = new URL(origin)
    return o.host === new URL(req.url).host || o.hostname === 'localhost'
  } catch {
    return false
  }
}

// ---------- Firebase sign-in tokens ----------
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))

// Returns { uid, email, name, token } for a valid Firebase ID token, or null
export async function verifyUser(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
      algorithms: ['RS256'],
    })
    if (!payload.sub) return null
    return { uid: payload.sub, email: payload.email_verified ? payload.email : null, name: payload.name || '', token }
  } catch {
    return null
  }
}

// ---------- Firestore REST, acting as the signed-in person (security rules still apply) ----------
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

const plain = (v) => {
  if (!v) return null
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return v.timestampValue
  if ('nullValue' in v) return null
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(plain)
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, plain(x)]))
  return null
}

export async function getDoc(path, token) {
  const r = await fetch(`${DOCS}/${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!r.ok) return null
  const d = await r.json()
  return Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, plain(v)]))
}

// Set one field to the server time. Returns false when the rules refuse (e.g. already set).
export async function stampField(path, field, token) {
  const r = await fetch(`${DOCS.replace(/\/documents$/, '/documents:commit')}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writes: [{ transform: { document: `projects/${PROJECT_ID}/databases/(default)/documents/${path}`, fieldTransforms: [{ fieldPath: field, setToServerValue: 'REQUEST_TIME' }] }, currentDocument: { exists: true } }],
    }),
  })
  return r.ok
}

// Create a document with the given string fields and a server-time createdAt
export async function addDoc(collection, fields) {
  const name = `projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${crypto.randomUUID()}`
  const r = await fetch(`${DOCS.replace(/\/documents$/, '/documents:commit')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writes: [
        {
          update: { name, fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { stringValue: String(v) }])) },
          updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
          currentDocument: { exists: false },
        },
      ],
    }),
  })
  return r.ok
}

// ---------- Rough rate limiting (per server instance) ----------
const hits = new Map()
export function limited(key, max, windowMs) {
  const now = Date.now()
  const list = (hits.get(key) || []).filter((t) => t > now - windowMs)
  list.push(now)
  hits.set(key, list)
  if (hits.size > 5000) hits.clear()
  return list.length > max
}
export const clientIp = (req) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
export function place(req) {
  const h = (n) => {
    try {
      return decodeURIComponent(req.headers.get(n) || '')
    } catch {
      return ''
    }
  }
  return [h('x-vercel-ip-city'), h('x-vercel-ip-country-region'), h('x-vercel-ip-country')].filter(Boolean).join(', ')
}

// ---------- Email ----------
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export async function sendEmail({ to, subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('RESEND_API_KEY is not set; email not sent:', subject)
    return false
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  })
  if (!r.ok) console.error('Resend error', r.status, (await r.text()).slice(0, 300))
  return r.ok
}

// Simple branded layout that works in email clients
export function layout(title, bodyHtml, cta) {
  return `<!doctype html><html><body style="margin:0;background:#f4f7e4;font-family:Arial,Helvetica,sans-serif;color:#0d0e0a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7e4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0d0e0a;padding:20px 24px"><span style="display:inline-block;background:#dcf05a;color:#0d0e0a;font-weight:bold;border-radius:8px;padding:4px 8px">AW</span>
<span style="color:#ffffff;font-weight:bold;font-size:18px;margin-left:8px">All Workout</span></td></tr>
<tr><td style="padding:28px 24px 8px"><h1 style="margin:0 0 12px;font-size:22px">${esc(title)}</h1>${bodyHtml}
${cta ? `<p style="margin:24px 0"><a href="${esc(cta.href)}" style="background:#dcf05a;color:#0d0e0a;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:999px;display:inline-block">${esc(cta.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:16px 24px 24px;color:#686c58;font-size:12px;line-height:1.5;border-top:1px solid #dfe4c6">
All Workout is a product of Yadata Pty Ltd · ABN 42 327 513 086 · New South Wales, Australia<br>
<a href="mailto:contact@yadata.com.au" style="color:#686c58">contact@yadata.com.au</a> ·
<a href="${SITE}/#/terms" style="color:#686c58">Terms</a> · <a href="${SITE}/#/privacy" style="color:#686c58">Privacy</a><br>
General fitness information only, not medical advice.</td></tr>
</table></td></tr></table></body></html>`
}

export const p = (text) => `<p style="margin:0 0 12px;line-height:1.55">${text}</p>`
export const rows = (pairs) =>
  `<table role="presentation" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:8px 0 12px">${pairs
    .map(([k, v]) => `<tr><td style="color:#686c58;padding-right:16px;vertical-align:top">${esc(k)}</td><td>${esc(v || '–')}</td></tr>`)
    .join('')}</table>`
