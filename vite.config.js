import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Content Security Policy for the production site. GitHub Pages can't send headers,
// so it goes in a <meta> tag. Dev is left alone because Vite's live reload needs inline scripts.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' https://apis.google.com https://www.googletagmanager.com", // wasm: the camera form check's pose model
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data: blob: https:",
  // Exercise clips: uploaded (data:) or linked .mp4/.webm files
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https://*.googleapis.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.firebaseapp.com",
  'frame-src https://allworkout-61d91.firebaseapp.com https://accounts.google.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const cspMeta = {
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
}

// Camera form check: serve MediaPipe's WebAssembly files from our own site (no CDN). In dev they're
// read from node_modules; in a build they're copied to dist/mediapipe/wasm. Keeping them in step
// with the installed @mediapipe/tasks-vision version is automatic this way.
const WASM_DIR = 'node_modules/@mediapipe/tasks-vision/wasm'
const WASM_FILES = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']
const mediapipeWasm = {
  name: 'mediapipe-wasm',
  configureServer(server) {
    server.middlewares.use('/mediapipe/wasm', (req, res, next) => {
      const file = (req.url || '').split('?')[0].replace(/^\//, '')
      if (!WASM_FILES.includes(file)) return next()
      res.setHeader('Content-Type', file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript')
      fs.createReadStream(path.join(WASM_DIR, file)).pipe(res)
    })
  },
  generateBundle() {
    for (const file of WASM_FILES) this.emitFile({ type: 'asset', fileName: `mediapipe/wasm/${file}`, source: fs.readFileSync(path.join(WASM_DIR, file)) })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cspMeta, mediapipeWasm],
  // Relative asset paths so the build works at any URL, e.g. GitHub Pages at /Allworkout/.
  // The app uses hash routes (#/home), so no server rewrites are needed.
  base: './',
})
