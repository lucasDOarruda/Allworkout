// Emails triggered by signed-in members. Every call must carry a valid Firebase ID token,
// and each event checks Firestore (as that member) so it can't be used to send arbitrary mail.
//   signup              welcome email to the new member + alert to the admin (once per member)
//   trainer-application alert to the admin + "we got it" to the trainer
//   trainer-decision    admin only: tells the trainer they were approved or not
import { ADMIN_UIDS, NOTIFY_TO, SITE, esc, getDoc, json, layout, limited, p, place, rows, sameOrigin, sendEmail, stampField, verifyUser } from './_lib/server.js'

const GOALS = { 'lose-weight': 'Lose weight', 'build-muscle': 'Build muscle', 'get-stronger': 'Get stronger', 'get-fit': 'Get fitter', health: 'Feel healthier', event: 'Train for an event' }
const QUAL = {
  'cert3-4': 'Certificate III and IV in Fitness',
  cert4: 'Certificate IV in Fitness',
  diploma: 'Diploma of Sport or Fitness',
  degree: 'Bachelor of Exercise or Sport Science',
  aep: 'Accredited Exercise Physiologist',
  other: 'Other equivalent qualification',
}
const first = (name) => esc(String(name || '').split(' ')[0] || 'there')

export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403)
  const user = await verifyUser(req)
  if (!user) return json({ error: 'Sign in first' }, 401)
  if (limited(`notify:${user.uid}`, 10, 60 * 60 * 1000)) return json({ error: 'Too many requests' }, 429)
  const { event, uid: target } = await req.json().catch(() => ({}))

  if (event === 'signup') {
    // Firestore only lets welcomeSentAt be set once, so a member gets one welcome email
    if (!(await stampField(`users/${user.uid}`, 'welcomeSentAt', user.token))) return json({ sent: false })
    const profile = (await getDoc(`users/${user.uid}`, user.token)) || {}
    const name = profile.name || user.name
    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Kinetic Performances',
        html: layout(
          `Welcome, ${String(name || '').split(' ')[0] || 'there'}!`,
          p(`Thanks for joining <strong>Kinetic Performances</strong>, the community fitness app from Yadata.`) +
            p('Here’s how to get going:') +
            `<ul style="line-height:1.7;padding-left:20px;margin:0 0 12px">
              <li>Pick a workout in Explore and tap Start. The timer talks you through every round.</li>
              <li>Follow a program for a plan every week.</li>
              <li>Find a licensed, insured personal trainer when you want one.</li>
              <li>Use the free health tools to know your numbers.</li>
            </ul>` +
            p('If you’re a personal trainer, send your application from the You tab and we’ll review it.') +
            p('Questions? Just reply to this email.'),
          { href: SITE, label: 'Open Kinetic Performances' },
        ),
        replyTo: NOTIFY_TO,
      })
    }
    await sendEmail({
      to: NOTIFY_TO,
      subject: `New Kinetic Performances member: ${name || user.email}`,
      html: layout(
        'New member signed up',
        rows([
          ['Name', name],
          ['Email', user.email],
          ['Goal', GOALS[profile.goal] || ''],
          ['Location', place(req)],
          ['Role', { client: 'Member', coach: 'Trainer', admin: 'Admin' }[profile.role] || 'Member'],
        ]),
        { href: `${SITE}/admin`, label: 'Open the admin dashboard' },
      ),
      replyTo: user.email || undefined,
    })
    return json({ sent: true })
  }

  if (event === 'trainer-application') {
    const app = await getDoc(`trainerApps/${user.uid}`, user.token)
    const fresh = app?.submittedAt && Date.now() - new Date(app.submittedAt).getTime() < 10 * 60 * 1000
    if (!app || app.status !== 'pending' || !fresh) return json({ sent: false })
    await sendEmail({
      to: NOTIFY_TO,
      subject: `Trainer to approve: ${app.fullName}`,
      html: layout(
        'A personal trainer is waiting for approval',
        p('Check the certificate, ABN, first aid and insurance, then approve or decline in the dashboard.') +
          rows([
            ['Name', app.fullName],
            ['Email', app.email || user.email],
            ['Mobile', app.phone],
            ['ABN', app.abn],
            ['Qualification', QUAL[app.qualification] || app.qualification],
            ['Provider', app.provider],
            ['First aid and CPR until', app.firstAidExpiry],
            ['Insurance until', app.insuranceExpiry],
            ['Location', place(req)],
          ]),
        { href: `${SITE}/admin#/admin/trainers`, label: 'Review the application' },
      ),
      replyTo: user.email || undefined,
    })
    if (user.email)
      await sendEmail({
        to: user.email,
        subject: 'We’ve received your trainer application',
        html: layout(
          `Thanks, ${first(app.fullName)}`,
          p('We’ve received your personal trainer application for Kinetic Performances. We’ll check your qualification, ABN, first aid and insurance and let you know once it’s reviewed.') +
            p('Until then you can use Kinetic Performances as a member.'),
          { href: SITE, label: 'Open Kinetic Performances' },
        ),
        replyTo: NOTIFY_TO,
      })
    return json({ sent: true })
  }

  if (event === 'trainer-decision') {
    if (!ADMIN_UIDS.includes(user.uid) || typeof target !== 'string' || !/^[A-Za-z0-9_-]{6,128}$/.test(target)) return json({ error: 'Forbidden' }, 403)
    const app = await getDoc(`trainerApps/${target}`, user.token)
    const to = app?.email
    if (!app || !to || !['approved', 'rejected'].includes(app.status)) return json({ sent: false })
    const approved = app.status === 'approved'
    await sendEmail({
      to,
      subject: approved ? 'You’re approved as an Kinetic Performances trainer' : 'About your Kinetic Performances trainer application',
      html: layout(
        approved ? `You’re approved, ${String(app.fullName || '').split(' ')[0]}!` : `Hi ${String(app.fullName || '').split(' ')[0]},`,
        approved
          ? p('Your personal trainer application has been approved. Sign in to Kinetic Performances to publish free and paid workouts and train members.') +
              p('Please keep your qualification, first aid and CPR, and insurance current, and let us know if anything changes.')
          : p('We couldn’t approve your personal trainer application yet.') +
              (app.reviewNote ? p(`<strong>Note from our team:</strong> ${esc(app.reviewNote)}`) : '') +
              p('You can update your details and resend it from the You tab.'),
        { href: approved ? `${SITE}/#/create` : `${SITE}/#/apply`, label: approved ? 'Create your first workout' : 'Update my application' },
      ),
      replyTo: NOTIFY_TO,
    })
    return json({ sent: true })
  }

  return json({ error: 'Unknown event' }, 400)
}
