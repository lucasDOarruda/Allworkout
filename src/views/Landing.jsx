import { go, useStore } from '../store'
import Icon from '../components/Icon'
import { PublicFooter, PublicNav } from '../components/PublicChrome'
import { photoUrl } from '../lib/photos'
import { openContact } from '../components/ContactForm'

const FEATURES = [
  ['ropes', 'Timers that coach you', 'EMOM, AMRAP, Tabata and circuits, with beeps and what’s next on screen.'],
  ['class', 'Train with your crew', 'Share sessions, give kudos and tag partners so it counts for both of you.'],
  ['coach', 'Licensed trainers only', 'Every trainer is a qualified, insured PT we’ve checked and approved. Follow one, get workouts assigned and see your plan.'],
  ['gym', 'Progress you can see', 'Volume, personal records and streaks from every set you log.'],
]

export default function Landing() {
  const { me } = useStore()
  const start = () => go(me ? 'home' : 'signin')

  return (
    <div className="landing">
      <PublicNav />

      <header className="l-hero-wrap">
        <div className="l-hero">
          <div className="l-hero-copy">
            <p className="l-eyebrow">The social network for people who lift</p>
            <h1>
              Train together.
              <br />
              <span>Track every rep.</span>
            </h1>
            <p className="l-lede">Follow trainers, train with friends and let the timer talk you through every round.</p>
            <div className="row gap-s wrap">
              <button className="btn btn-primary big" onClick={start}>
                {me ? 'Open the app →' : 'Join for free →'}
              </button>
              <a className="btn btn-outline-white big l-tools-cta" href="#/tools">
                <Icon name="heart" size={18} /> Free health calculators
              </a>
            </div>
          </div>
          <div className="l-duo" aria-hidden="true">
            <img className="d1" src={photoUrl('hyrox-event')} alt="" />
            <img className="d2" src={photoUrl('class')} alt="" />
          </div>
        </div>
      </header>

      <section className="l-section">
        <h2>Everything in one app.</h2>
        <div className="l-photos">
          {FEATURES.map(([photo, title, body]) => (
            <figure key={photo} className="l-photo">
              <img src={photoUrl(photo)} alt="" loading="lazy" />
              <figcaption>
                <strong>{title}</strong>
                <span>{body}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="l-section">
        <div className="l-tools slim">
          <div>
            <p className="l-eyebrow">Free for everyone · no account</p>
            <h2>Know your numbers.</h2>
            <p className="l-lede">Energy, food, carb cycling and body measures, with every result linked to the research behind it.</p>
          </div>
          <a className="btn btn-lime big" href="#/tools">
            Open health tools →
          </a>
        </div>
      </section>

      <section className="l-section">
        <div className="l-tools slim l-contact-cta">
          <div>
            <p className="l-eyebrow">Contact</p>
            <h2>Questions? Talk to us.</h2>
            <p className="l-lede">Partnerships, support, or you’re a personal trainer who wants to train members on Kinetic Performances.</p>
          </div>
          <button className="btn btn-lime big" onClick={openContact}>
            Contact us →
          </button>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
