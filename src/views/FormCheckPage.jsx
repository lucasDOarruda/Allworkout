import { Suspense, lazy } from 'react'
import { go } from '../store'

// Camera form check on its own: pick any supported exercise, no workout needed
const FormCoach = lazy(() => import('../formcoach/FormCoach'))

export default function FormCheckPage({ exerciseId }) {
  return (
    <Suspense fallback={<div className="fc fc-loading">Loading form check…</div>}>
      <FormCoach exerciseId={exerciseId} onClose={() => (history.length > 1 ? history.back() : go('home'))} />
    </Suspense>
  )
}
