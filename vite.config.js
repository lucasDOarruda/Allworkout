import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Content Security Policy for the production site. GitHub Pages can't send headers,
// so it goes in a <meta> tag. Dev is left alone because Vite's live reload needs inline scripts.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://apis.google.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.googleapis.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.firebaseapp.com",
  'frame-src https://allworkout-61d91.firebaseapp.com https://accounts.google.com https://www.youtube.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const cspMeta = {
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cspMeta],
  // Relative asset paths so the build works at any URL, e.g. GitHub Pages at /Allworkout/.
  // The app uses hash routes (#/home), so no server rewrites are needed.
  base: './',
})
