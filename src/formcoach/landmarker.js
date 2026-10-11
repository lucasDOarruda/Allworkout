// Loads the MediaPipe pose model from our own site (see vite.config.js and public/models).
// GPU first, CPU if WebGL isn't available. Shared by the form check and the body check.
const BASE = new URL(import.meta.env.BASE_URL, location.href).href
const WASM = `${BASE}mediapipe/wasm`
const MODEL = `${BASE}models/pose_landmarker_lite.task`

export async function loadPoseLandmarker(runningMode = 'VIDEO') {
  const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
  const files = await FilesetResolver.forVisionTasks(WASM)
  const make = (delegate) => PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate }, runningMode, numPoses: 1 })
  try {
    return await make('GPU')
  } catch {
    return await make('CPU')
  }
}
