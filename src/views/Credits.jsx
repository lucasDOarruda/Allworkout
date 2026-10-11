import { useEffect } from 'react'
import { PublicFooter, PublicNav } from '../components/PublicChrome'
import { EXERCISE_PHOTOS } from '../data/exercisePhotos'
import { exerciseById } from '../data/exercises'

// Image credits. Exercise images are Creative Commons (CC BY-SA), which requires crediting the
// author and licence; this page does that in one place instead of under every image.
export default function Credits() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  const rows = Object.entries(EXERCISE_PHOTOS).sort((a, b) => (exerciseById[a[0]]?.name || a[0]).localeCompare(exerciseById[b[0]]?.name || b[0]))
  return (
    <div className="landing">
      <PublicNav active="credits" />
      <article className="legal">
        <p className="l-eyebrow">Legal</p>
        <h1>Image credits</h1>
        <p>
          Stock photos are from <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a> under the Unsplash licence. Exercise images are from{' '}
          <a href="https://wger.de" target="_blank" rel="noreferrer">wger.de</a>, an open-source fitness project, under the Creative Commons licences listed below. We
          resized them; our copies are shared under the same licence.
        </p>
        <ul className="credits-list">
          {rows.map(([id, p]) => (
            <li key={id}>
              <strong>{exerciseById[id]?.name || id}</strong>: {p.author ? `${p.author}, ` : ''}
              <a href={p.source} target="_blank" rel="noreferrer">wger.de</a>,{' '}
              <a href={p.licenseUrl} target="_blank" rel="noreferrer">{p.license}</a>
            </li>
          ))}
        </ul>
      </article>
      <PublicFooter />
    </div>
  )
}
