import { useEffect, useRef, useState } from 'react'
import { isCoach, useStore } from '../store'
import { isAdminUid } from '../lib/access'

const mediaLib = () => import('../lib/media')
const CHANGED = 'aw-exercise-media-changed'
const KIND_LABEL = { image: 'a photo', gif: 'a GIF', video: 'a video clip', link: 'a video link' }

// The photo, GIF or video an admin or trainer added for an exercise (null while loading or none)
export function useExerciseMedia(exerciseId) {
  const [media, setMedia] = useState(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let live = true
    setMedia(null)
    if (!exerciseId) return
    mediaLib()
      .then((m) => m.getExerciseMedia(exerciseId))
      .then((x) => live && setMedia(x))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [exerciseId, version])
  // Refresh every view of this exercise when its media changes
  useEffect(() => {
    const on = (e) => e.detail === exerciseId && setVersion((v) => v + 1)
    window.addEventListener(CHANGED, on)
    return () => window.removeEventListener(CHANGED, on)
  }, [exerciseId])
  return [media, () => window.dispatchEvent(new CustomEvent(CHANGED, { detail: exerciseId }))]
}

// Renders uploaded media: photo or GIF as an image, a clip as a looping muted video, a link embedded
export function MediaView({ media, alt = '', className = '' }) {
  const [embed, setEmbed] = useState(null)
  useEffect(() => {
    if (media?.kind === 'link') mediaLib().then((m) => setEmbed(m.videoFromUrl(media.src)))
  }, [media])
  if (!media) return null
  if (media.kind === 'image' || media.kind === 'gif') return <img className={`xm ${className}`} src={media.src} alt={alt} />
  if (media.kind === 'video') return <video className={`xm ${className}`} src={media.src} autoPlay muted loop playsInline aria-label={alt} />
  if (!embed) return null
  if (embed.type === 'video') return <video className={`xm ${className}`} src={embed.src} autoPlay muted loop playsInline aria-label={alt} />
  return <iframe className={`xm ${className}`} src={embed.src} title={alt || 'Exercise video'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
}

// Upload or link media for an exercise. Shown to admins and approved trainers only.
export function ExerciseMediaEditor({ exerciseId, name }) {
  const { me, notify } = useStore()
  const [media, reload] = useExerciseMedia(exerciseId)
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const file = useRef(null)
  if (!me?.googleUid || !isCoach(me)) return null
  const admin = me.role === 'admin' && (import.meta.env.DEV || isAdminUid(me.googleUid))
  const canChange = !media || admin || media.by === me.googleUid

  const save = async (getMedia) => {
    setError('')
    setBusy(true)
    try {
      const m = await mediaLib()
      await m.saveExerciseMedia(exerciseId, me, await getMedia(m))
      notify(`Saved media for ${name}`)
      setLink('')
      reload()
    } catch (err) {
      setError(err?.code === 'permission-denied' ? 'Only admins and approved trainers can change this media.' : err.message || 'Couldn’t save it.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm(`Remove the media for ${name}?`)) return
    try {
      const m = await mediaLib()
      await m.removeExerciseMedia(exerciseId)
      notify('Media removed')
      reload()
    } catch {
      setError('Couldn’t remove it.')
    }
  }

  return (
    <section className="xm-editor card stack">
      <span className="label">Photo, GIF or video for members</span>
      {media ? (
        <p className="tiny">
          Showing {KIND_LABEL[media.kind] || 'media'}
          {media.byName ? ` added by ${media.byName}` : ''}. Members see it in every workout with this exercise.
        </p>
      ) : (
        <p className="tiny">No media yet. Members see the muscle diagram until you add one.</p>
      )}
      {canChange ? (
        <>
          <div className="row gap-s wrap">
            <button type="button" className="btn btn-secondary small" disabled={busy} onClick={() => file.current.click()}>
              {busy ? 'Saving…' : media ? 'Replace with a file' : 'Upload photo, GIF or clip'}
            </button>
            {media && (
              <button type="button" className="btn btn-ghost small" onClick={remove}>
                Remove
              </button>
            )}
          </div>
          <input
            ref={file}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) save((m) => m.fileToMedia(f))
            }}
          />
          <div className="row gap-s">
            <input className="grow" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Or paste a YouTube, Vimeo or .mp4 link" />
            <button
              type="button"
              className="btn btn-ghost small"
              disabled={busy || !link.trim()}
              onClick={() =>
                save(async (m) => {
                  const url = link.trim()
                  if (!m.videoFromUrl(url)) throw new Error('Use a YouTube, Vimeo or https://….mp4 link.')
                  return { kind: 'link', src: url }
                })
              }
            >
              Save link
            </button>
          </div>
          <p className="tiny">Photos are resized for you. GIFs and video clips: up to 650 KB (a few seconds). Longer videos: use a link.</p>
        </>
      ) : (
        <p className="tiny">Another trainer added this. Ask an admin to change it.</p>
      )}
      {error && (
        <p className="signin-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
