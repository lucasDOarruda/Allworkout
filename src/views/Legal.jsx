import { useEffect } from 'react'
import { PublicFooter, PublicNav } from '../components/PublicChrome'

// Terms of Service and Privacy Policy, adapted from Yadata Pty Ltd's for a health and
// fitness platform. Keep TERMS_VERSION in lib/trainer.js in step with UPDATED.
const UPDATED = '11 October 2026'
const COMPANY = 'Yadata Pty Ltd (ABN 42 327 513 086)'
const EMAIL = 'contact@yadata.com.au'
const Mail = () => <a href={`mailto:${EMAIL}`}>{EMAIL}</a>

const TERMS = [
  [
    'About us',
    <>
      <p>
        All Workout is a community fitness platform operated by {COMPANY}, an Australian technology company registered in New South Wales. In these terms, “we”, “us” and
        “our” mean Yadata Pty Ltd, and “you” means anyone who visits All Workout or creates an account.
      </p>
      <p>
        Contact: <Mail />
      </p>
    </>,
  ],
  [
    'Acceptance of these terms',
    <>
      <p>
        By creating an account, signing in or using All Workout, you agree to these Terms of Service and our <a href="#/privacy">Privacy Policy</a>. If you don’t agree, please don’t
        use the platform.
      </p>
      <p>
        You must be 18 or older to create an account. These terms are governed by the laws of New South Wales and applicable Commonwealth law, including the Australian Consumer Law
        (Schedule 2, Competition and Consumer Act 2010 (Cth)) and the Electronic Transactions Act 2000 (NSW).
      </p>
    </>,
  ],
  [
    'Health and safety',
    <>
      <p>
        <strong>All Workout is not medical advice.</strong> Workouts, programs, timers, health calculators and content from trainers are general information only. They don’t
        replace advice from your doctor or another qualified health professional, and calculator results are estimates, not a diagnosis.
      </p>
      <ul>
        <li>
          Talk to your doctor before starting a new exercise or nutrition program, especially if you are pregnant, injured, have a heart condition, high blood pressure,
          diabetes or another medical condition, take medication, or haven’t exercised for a while.
        </li>
        <li>Choose workouts that suit your fitness, warm up, use correct technique and safe equipment, and stop straight away if you feel pain, dizziness or shortness of breath.</li>
        <li>Exercise involves a risk of injury. You take part at your own risk and are responsible for deciding what is safe for you.</li>
        <li>
          The camera form check gives general feedback on positions such as depth and lean. It can’t see your spine, feel pain or guarantee you won’t be injured. Stop if
          anything hurts, and use a qualified trainer for heavy lifts.
        </li>
        <li>In an emergency, call 000.</li>
      </ul>
    </>,
  ],
  [
    'Your account',
    <>
      <p>
        You sign in with your Google account. Keep it secure and don’t let anyone else use your All Workout account. The details you give us must be accurate, and you’re
        responsible for what happens under your account.
      </p>
    </>,
  ],
  [
    'Personal trainers',
    <>
      <p>Only licensed personal trainers approved by us can publish workouts, sell them or train members. To apply, a trainer must:</p>
      <ul>
        <li>hold at least a Certificate IV in Fitness, or a higher qualification such as an exercise science degree or accreditation as an exercise physiologist;</li>
        <li>have a valid Australian Business Number (ABN);</li>
        <li>hold current first aid and CPR certificates;</li>
        <li>hold current professional indemnity and public liability insurance; and</li>
        <li>be 18 or older.</li>
      </ul>
      <p>
        We check the details and documents each trainer gives us before approving them, and we may ask for more evidence or check again at any time. Approval is at our
        discretion. Our checks rely on the documents provided, so we can’t guarantee a trainer’s qualifications, advice or services.
      </p>
      <p>
        Approved trainers are independent businesses, not our employees or agents. Each trainer is responsible for their workouts and advice, for screening members before
        training them, for working within their scope of practice and referring members to health professionals when needed, for keeping their qualification, first aid and
        insurance current (and telling us if any of them lapse), and for their own tax and GST obligations. We may suspend or remove trainer access if requirements aren’t met
        or these terms are breached.
      </p>
    </>,
  ],
  [
    'Workouts and paid content',
    <>
      <p>
        Approved trainers can publish free workouts and sell paid ones. A trainer sets the price of their content and is paid through their own payment link, so a purchase is
        an agreement between you and the trainer. The trainer is responsible for delivering what they sell and for refunds under the Australian Consumer Law.
      </p>
      <p>Content must be the trainer’s own or properly licensed, safe, accurately described and labelled with a suitable level. We may remove content that doesn’t meet this standard.</p>
    </>,
  ],
  [
    'Community rules',
    <>
      <p>When you use All Workout, you agree not to:</p>
      <ul>
        <li>harass, bully, threaten or discriminate against anyone, or post offensive, explicit or misleading content;</li>
        <li>give unsafe advice, or promote extreme dieting, performance-enhancing drugs or products that aren’t legal in Australia;</li>
        <li>claim qualifications you don’t hold or pretend to be someone else;</li>
        <li>tag people in activities without their agreement, or share other people’s personal information;</li>
        <li>send spam, or use All Workout for any unlawful purpose; or</li>
        <li>try to access parts of the platform, accounts or data you aren’t allowed to, or interfere with how it works.</li>
      </ul>
    </>,
  ],
  [
    'Your content',
    <p>
      You keep ownership of the workouts, sessions, comments and photos you add. You give us a non-exclusive licence to host, display and share them within All Workout so the
      platform can work. We may remove content that breaks these terms.
    </p>,
  ],
  [
    'Australian Consumer Law',
    <p>
      Nothing in these terms excludes, restricts or modifies any rights or remedies you have under the Australian Consumer Law, including consumer guarantees that can’t be
      excluded by law. Where the law allows, our liability for failing to meet a consumer guarantee is limited to supplying the services again or paying the cost of having
      them supplied again.
    </p>,
  ],
  [
    'Intellectual property',
    <p>
      The All Workout name, design, code and official workouts belong to Yadata Pty Ltd or its licensors and are protected under the Copyright Act 1968 (Cth). You may not copy,
      distribute or reuse them without our written consent. Photos are used under the Unsplash licence. Exercise images come from{' '}
      <a href="https://wger.de" target="_blank" rel="noreferrer">
        wger.de
      </a>{' '}
      under Creative Commons licences (CC BY-SA); each image shows its author and licence, and our resized copies are shared under the same licence.
    </p>,
  ],
  [
    'Limitation of liability',
    <>
      <p>
        To the maximum extent permitted by law, we aren’t liable for any indirect, incidental, special or consequential loss arising from your use of All Workout, including
        injury or illness from exercise you choose to do, advice or services from trainers, or loss of data, revenue or profit.
      </p>
      <p>This doesn’t apply to any liability that can’t be excluded under the Australian Consumer Law or other law.</p>
    </>,
  ],
  [
    'Other services',
    <p>
      All Workout uses Google sign-in, Firebase and Vercel, and trainers may link to their own payment pages and websites. We aren’t responsible for the content, privacy
      practices or terms of those services.
    </p>,
  ],
  [
    'Suspension and termination',
    <p>
      You can stop using All Workout at any time and ask us to delete your account. We may suspend or close an account, or remove trainer access, if these terms are breached
      or to keep members safe.
    </p>,
  ],
  [
    'Changes to these terms',
    <p>
      We may update these terms from time to time. The current version is always on this page. If you keep using All Workout after a change is posted, you accept the updated
      terms.
    </p>,
  ],
  [
    'Governing law and complaints',
    <p>
      These terms are governed by the laws of New South Wales, Australia, and disputes are subject to the exclusive jurisdiction of its courts. Please contact us first at{' '}
      <Mail /> so we can try to resolve any problem fairly and promptly.
    </p>,
  ],
]

const PRIVACY = [
  [
    'Who we are',
    <>
      <p>
        All Workout is operated by {COMPANY}, an Australian technology company in New South Wales. This policy explains how we collect, use, store and disclose your personal
        information under the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).
      </p>
      <p>
        Contact: <Mail />
      </p>
    </>,
  ],
  [
    'What we collect',
    <>
      <p>
        <strong>Members:</strong> your name, email address and profile photo from your Google account, your Google account ID, whether you joined to work out or to train
        people, your main goal (for example losing weight or building muscle), when you agreed to our terms, when you sign in, your approximate location when you sign in
        (city, region and country, worked out from your internet connection; we don’t store your IP address or use GPS), your device type (for example “iPhone · Safari”), the
        last screen you used and the days you were active.
      </p>
      <p>
        <strong>Personal trainers who apply:</strong> full legal name, date of birth, mobile number, ABN and business name, qualification, training provider and certificate
        number, a photo of your certificate, registration body and number, first aid and CPR expiry, and your insurer and insurance expiry, plus anything you add to your bio.
      </p>
      <p>
        <strong>Visitors:</strong> counts of page views and daily visitors, how many visitors came from each approximate location (city level), which health calculators are
        opened and which goal is picked in them (counts only, not what you enter), and analytics from Google Analytics for Firebase (pages viewed, device, browser and
        approximate location).
      </p>
      <p>
        <strong>Friends and community:</strong> your name and Google profile photo in the member directory (so people can find you by name, unless you turn that off),
        your friends and friend requests, workouts you share with friends, the finished workouts you choose to share with friends (workout name, length and date), the
        likes and comments you post on workouts, and the results you post to workout leaderboards (your time or rounds).
      </p>
      <p>We don’t knowingly collect personal information from anyone under 18.</p>
    </>,
  ],
  [
    'Health information',
    <>
      <p>
        Workouts, sessions and notes you log are stored in your browser on your device, not on our servers. The health calculators run in your browser, and what you enter
        stays there unless you choose to save it.
      </p>
      <p>
        If you’re signed in and turn on <strong>Save my calculator results to my account</strong>, we store your calculator inputs (sex, age, height, weight, activity level,
        body measurements and goal) and results (such as BMI, estimated body fat, and energy and protein targets) with your account. This is health information, which is
        sensitive information under the Privacy Act, so we only collect it with your consent. Only you and our admin can see it. You can turn it off at any time in Settings or
        in the health tools, and we delete the saved results.
      </p>
    </>,
  ],
  [
    'Camera form check',
    <p>
      If you use the camera form check, your camera feed is processed on your device by a pose model that estimates where your joints are. The video is never recorded,
      uploaded or stored, and we never receive it. Only the rep results (good reps, no-reps and the type of fault) are kept, in this browser and in the workout notes you
      choose to save. You can stop the camera at any time, and your browser asks for permission before it turns on.
    </p>,
  ],
  [
    'Body check',
    <p>
      If you use Body check (progress photos and body measurements), your photos and measurements are stored only on your device, in your browser. They aren’t uploaded,
      and nobody else can see them, including trainers and our team. The camera guide checks your position on the device and doesn’t record video. You must be 18 or
      older to use it. You can delete a check-in, or all your body check data, at any time; clearing your browser data also deletes it.
    </p>,
  ],
  [
    'How we collect it',
    <ul>
      <li>From you, when you sign in with Google, fill in your profile or apply as a trainer.</li>
      <li>Automatically, through Firebase and Google Analytics, when you use All Workout.</li>
    </ul>,
  ],
  [
    'Why we collect it',
    <>
      <ul>
        <li>to create and run your account and show your profile to other members;</li>
        <li>to check that trainers are qualified, insured and hold a valid ABN before approving them (we may look up ABNs on the public ABN Lookup);</li>
        <li>to support members, for example by contacting you about your account or application;</li>
        <li>to let you find friends, share workouts with them and see what they share with you;</li>
        <li>to understand what members want (such as weight loss or building muscle) and where they are, so we can plan workouts, programs and trainers;</li>
        <li>to keep the platform safe and secure, and to understand and improve how it’s used; and</li>
        <li>to meet our legal obligations.</li>
      </ul>
      <p>
        Other signed-in members can see your name and photo, your comments and likes on workouts, the leaderboard results you post, and (only if you turn it on) the workouts you finish. Friends see what
        you share with them. You can turn off “find me by name” and workout sharing at any time under Friends or Settings. A trainer’s public profile shows their name, photo, bio and specialties. Their date of birth, phone, ABN, certificate and insurance details are only seen by the trainer
        and our admin. We won’t use your information for any other purpose without your consent.
      </p>
    </>,
  ],
  [
    'Storage and security',
    <>
      <p>
        Account and trainer application information is stored in Google Firebase (Cloud Firestore), hosted on Google Cloud servers in the United States. Security rules limit
        it so only you and our admin can read your private details. The website is hosted by Vercel.
      </p>
      <p>
        We take reasonable steps to protect your personal information from misuse, loss, unauthorised access, modification and disclosure. However, no transmission over the
        internet is completely secure and we can’t guarantee absolute security.
      </p>
    </>,
  ],
  [
    'Who we share it with',
    <>
      <ul>
        <li>Google LLC (Firebase Authentication, Cloud Firestore and Google Analytics), for sign-in, storage and analytics;</li>
        <li>Vercel Inc., for hosting the website;</li>
        <li>service providers who help us run All Workout, under confidentiality obligations; and</li>
        <li>law enforcement or regulators, where the law requires it.</li>
      </ul>
      <p>Because Google and Vercel are based overseas, your information may be stored or processed outside Australia. We don’t sell, rent or trade your personal information.</p>
    </>,
  ],
  [
    'Cookies and local storage',
    <p>
      All Workout uses your browser’s local storage to keep your workouts, sessions and settings on your device, and Google Analytics uses cookies to measure visits. We don’t
      use advertising cookies. You can clear this data in your browser settings, but you’ll lose anything stored only on that device.
    </p>,
  ],
  [
    'How long we keep it',
    <p>
      We keep your account information while your account is open. We keep trainer application details while you’re an approved trainer and for as long as we need them for
      legal or safety reasons afterwards. You can ask us to delete your account and information at any time.
    </p>,
  ],
  [
    'Access, correction and deletion',
    <p>
      You can ask to see the personal information we hold about you, and to correct or delete it, by emailing <Mail />. We’ll respond within 30 days.
    </p>,
  ],
  [
    'Complaints',
    <p>
      If you believe we have breached the Australian Privacy Principles, contact us at <Mail />. If you aren’t satisfied with our response, you can complain to the Office of the
      Australian Information Commissioner (OAIC) at{' '}
      <a href="https://www.oaic.gov.au" target="_blank" rel="noreferrer">
        www.oaic.gov.au
      </a>
      .
    </p>,
  ],
  [
    'Changes to this policy',
    <p>
      We may update this policy from time to time. The current version is always on this page. If you keep using All Workout after a change is posted, you accept the updated
      policy.
    </p>,
  ],
]

export default function Legal({ page }) {
  const terms = page === 'terms'
  const sections = terms ? TERMS : PRIVACY
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])
  return (
    <div className="landing">
      <PublicNav active={page} />
      <article className="legal">
        <p className="l-eyebrow">Legal</p>
        <h1>{terms ? 'Terms of Service' : 'Privacy Policy'}</h1>
        <p className="muted">Last updated: {UPDATED}</p>
        <nav className="legal-toc" aria-label="Sections">
          {sections.map(([title], i) => (
            <a key={title} href={`#/${page}`} onClick={(e) => (e.preventDefault(), document.getElementById(`s${i + 1}`)?.scrollIntoView({ behavior: 'smooth' }))}>
              {i + 1}. {title}
            </a>
          ))}
        </nav>
        {sections.map(([title, body], i) => (
          <section key={title} id={`s${i + 1}`}>
            <h2>
              {i + 1}. {title}
            </h2>
            {body}
          </section>
        ))}
        <p className="legal-foot">Yadata Pty Ltd · ABN 42 327 513 086 · New South Wales, Australia · {EMAIL}</p>
        <p className="tiny">
          See also the <a href={terms ? '#/privacy' : '#/terms'}>{terms ? 'Privacy Policy' : 'Terms of Service'}</a>.
        </p>
      </article>
      <PublicFooter />
    </div>
  )
}
