import { EXERCISES } from '../data/exercises'
import { OFFICIAL_PROGRAMS } from '../data/programs'
import { FORMATS } from '../data/workouts'
import { go, useStore } from '../store'
import { useState } from 'react'
import { ActivityCard } from './Home'
import HealthTools, { SOURCES } from './HealthTools'
import Icon from '../components/Icon'

const img = (name) => `${import.meta.env.BASE_URL}img/${name}.jpg`

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

const FEATURES = [
  ['chat', 'A feed that keeps you honest', 'See what your partners and coach did today. Give kudos, leave a comment, tag who you trained with.'],
  ['timer', 'Timers that coach you', `EMOM, AMRAP, Tabata and circuits with beeps, a 10-second countdown and what’s next on screen.`],
  ['calendar', 'Programs that plan your week', 'Follow a multi-week program and we’ll tick off each day as you train.'],
  ['chart', 'Progress you can see', 'Weekly volume, personal records, streaks and badges, all from the sets you log.'],
]

export default function Landing({ tools = false }) {
  const [toolsOpen, setToolsOpen] = useState(tools)
  const openTools = () => setToolsOpen(true)
  const closeTools = () => {
    setToolsOpen(false)
    if (location.hash.startsWith('#/tools')) go('welcome')
  }
  const { db, me, workouts } = useStore()
  const latest = [...db.sessions].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
  const coaches = Object.values(db.users).filter((u) => u.role === 'coach')
  const openApp = () => go(me ? 'home' : 'signin')

  return (
    <div className="landing">
      <nav className="l-nav">
        <a className="l-brand" href="#/welcome">
          <span className="l-mark">AW</span> All Workout
        </a>
        <div className="l-links">
          <button onClick={() => scrollTo('features')}>Features</button>
          <button onClick={() => scrollTo('coaches')}>For coaches</button>
          <button className="l-tools-link" onClick={openTools}>
            Health tools
          </button>
        </div>
        <div className="row gap-s">
          {me ? (
            <button className="btn btn-primary" onClick={openApp}>
              Open app
            </button>
          ) : (
            <>
              <button className="btn btn-ghost l-login" onClick={() => go('signin')}>
                Log in
              </button>
              <button className="btn btn-primary" onClick={() => go('signin')}>
                Sign up
              </button>
            </>
          )}
        </div>
      </nav>

      <header className="l-hero-wrap">
        <div className="l-hero">
          <div className="l-hero-copy">
            <p className="l-eyebrow">The social network for people who lift</p>
            <h1>
              Train together.
              <br />
              <span>Track every rep.</span>
            </h1>
            <p className="l-lede">
              Follow coaches, share sessions with training partners, and run every EMOM, AMRAP and Tabata with a timer that talks you
              through it.
            </p>
            <div className="row gap-s wrap">
              <button className="btn btn-primary big" onClick={() => go('signin')}>
                Join for free →
              </button>
            </div>
          </div>
          <div className="l-mosaic" aria-hidden="true">
            <img className="m1" src={img('gym')} alt="" />
            <img className="m2" src={img('class')} alt="" />
            <img className="m3" src={img('deadlift')} alt="" />
            <img className="m4" src={img('home')} alt="" />
            <div className="l-live-chip">
              <span className="dot live" /> Live EMOM · Round 3 / Min 18
            </div>
          </div>
        </div>
      </header>

      <section className="l-band">
        <div>
          <strong>{EXERCISES.length}</strong>
          <span>exercises with form cues</span>
        </div>
        <div>
          <strong>{Object.keys(FORMATS).length - 1}</strong>
          <span>workout formats</span>
        </div>
        <div>
          <strong>{workouts.length}</strong>
          <span>ready-to-run workouts</span>
        </div>
        <div>
          <strong>{OFFICIAL_PROGRAMS.length}</strong>
          <span>multi-week programs</span>
        </div>
      </section>

      <section className="l-app">
        <div className="l-app-copy">
          <p className="l-eyebrow">The app</p>
          <h2>Your week, your crew, your coach. In one feed.</h2>
          <ul className="l-list">
            <li>Every session lands in your feed with time, volume and effort.</li>
            <li>Partners give kudos and comment. Tag them and it counts for both of you.</li>
            <li>Your coach sees what you did and assigns what’s next.</li>
          </ul>
          <button className="btn btn-lime big" onClick={openApp}>
            Open the app →
          </button>
        </div>
        <div className="l-phone" aria-label="App preview">
          <div className="l-phone-screen">
            <div className="l-phone-top">
              <strong>Home</strong>
              <span className="l-phone-pill">Following</span>
            </div>
            <div className="week-card mini">
              <span className="week-eyebrow">Your week</span>
              <div className="week-stats">
                <div>
                  <span className="week-n">3</span>
                  <span className="week-l">Sessions</span>
                </div>
                <div>
                  <span className="week-n">2h 14m</span>
                  <span className="week-l">Time</span>
                </div>
                <div>
                  <span className="week-n">12.4t</span>
                  <span className="week-l">Volume</span>
                </div>
              </div>
            </div>
            {latest && <ActivityCard s={latest} />}
          </div>
        </div>
      </section>

      <section className="l-section">
        <p className="l-eyebrow">Wherever you train</p>
        <h2>Gym, garage or living room. Bring your people.</h2>
        <div className="l-photos">
          {[
            ['gym', 'In the gym', 'Barbell, machine and dumbbell workouts with sets, reps and rest.'],
            ['home', 'At home', 'No-equipment circuits, Tabatas and AMRAPs.'],
            ['class', 'With your crew', 'Tag partners and every session counts for both of you.'],
            ['ropes', 'Conditioning', 'EMOM and interval timers that call every round.'],
          ].map(([photo, title, body]) => (
            <figure key={photo} className="l-photo">
              <img src={img(photo)} alt={title} loading="lazy" />
              <figcaption>
                <strong>{title}</strong>
                <span>{body}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="l-section" id="features">
        <p className="l-eyebrow">Features</p>
        <h2>Everything between “let’s train” and “that was a PR”.</h2>
        <div className="l-grid">
          {FEATURES.map(([icon, title, body]) => (
            <article key={title} className="l-card">
              <span className="l-icon" aria-hidden="true">
                <Icon name={icon} />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="l-section l-split" id="coaches">
        <div>
          <p className="l-eyebrow">For coaches</p>
          <h2>Your clients, your workouts, your way.</h2>
          <ul className="l-list">
            <li>Publish workouts for everyone, or keep premium plans for your clients.</li>
            <li>Accept clients, assign workouts with a note, and see every session they log.</li>
            <li>Add your own photos and how-to videos to every move.</li>
          </ul>
          <button className="btn btn-primary big" onClick={() => go('signin')}>
            Start coaching
          </button>
        </div>
        <div className="l-coaches">
          <img className="l-coach-photo" src={img('coach')} alt="A coach guiding a client through a push-up" loading="lazy" />
          {coaches.map((c) => (
            <button key={c.id} className="l-coach" onClick={() => go(`coach/${c.id}`)}>
              <span className="avatar" style={{ width: 56, height: 56, background: c.color, fontSize: 20 }}>
                {c.name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')}
              </span>
              <span className="grow">
                <strong className="block">{c.name}</strong>
                <span className="muted small">{c.specialties}</span>
              </span>
            </button>
          ))}
        </div>
      </section>



      <section className="l-section">
        <div className="l-tools">
          <div>
            <p className="l-eyebrow">Free for everyone · no account</p>
            <h2>Know your numbers. Keep the science.</h2>
            <p className="l-lede">
              Calculators for energy and macros, carb cycling and body measures beyond BMI. Every result shows its error range and links
              to the research behind it.
            </p>
            <button className="btn btn-primary big" onClick={openTools}>
              Open health calculators
            </button>
          </div>
          <ul className="l-tools-list">
            <li>
              <strong>Energy & macros</strong>
              <span>Resting energy, maintenance range and a safe daily target</span>
            </li>
            <li>
              <strong>Carb cycling</strong>
              <span>More fuel on hard days, same weekly total</span>
            </li>
            <li>
              <strong>Beyond BMI</strong>
              <span>Waist-to-height ratio and a tape-measure body fat estimate</span>
            </li>
            <li>
              <strong>Evidence</strong>
              <span>{SOURCES.length} studies and guidelines, linked from every number</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="l-cta" style={{ backgroundImage: `linear-gradient(100deg, rgb(220 240 90 / 97%) 40%, rgb(205 232 60 / 70%)), url(${img('barbell')})` }}>
        <h2>Your next session starts here.</h2>
        <button className="btn btn-white big" onClick={() => go('signin')}>
          Join All Workout
        </button>
      </section>

      <section className="l-stores-wrap" aria-label="Mobile apps">
        <div>
          <strong className="l-stores-title">All Workout on your phone</strong>
          <span className="muted small">iPhone and Android apps are on the way. Use the web app until then.</span>
        </div>
        <div className="l-stores">
          <span className="l-store" aria-label="Coming soon to the App Store">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path
                fill="currentColor"
                d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.9-.9-3.1-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6-.1-.1-2.4-1-2.4-3.8zM14.1 5.8c.6-.8 1.1-1.8 1-2.8-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.7-1 2.7 1 .1 2-.5 2.7-1.3z"
              />
            </svg>
            <span>
              <small>Coming soon to the</small>
              <strong>App Store</strong>
            </span>
          </span>
          <span className="l-store" aria-label="Coming soon on Google Play for Android">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path fill="currentColor" d="M5 16a7 7 0 0 1 14 0z" />
              <path d="M8.2 10.4 6.6 7.6M15.8 10.4l1.6-2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              <circle cx="9.6" cy="13.2" r="0.9" fill="#0d0e0a" />
              <circle cx="14.4" cy="13.2" r="0.9" fill="#0d0e0a" />
            </svg>
            <span>
              <small>Coming soon on</small>
              <strong>Android</strong>
            </span>
          </span>
        </div>
      </section>

      <footer className="l-footer">
        <span>
          Photos: Unsplash · © {new Date().getFullYear()} All Workout · Hosted for the community · Built by{' '}
          <a className="l-credit" href="https://yadata.com.au" target="_blank" rel="noreferrer">
            yadata.com.au
          </a>
        </span>
        <div className="row gap-s wrap">
          <a href="#/home">Open app</a>
          <a href="#/explore">Workouts</a>
          <a href="#/explore/coaches">Coaches</a>
          <button className="l-foot-btn" onClick={openTools}>
            Health tools
          </button>
        </div>
      </footer>
      {toolsOpen && <HealthTools onClose={closeTools} />}
    </div>
  )
}
