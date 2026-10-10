import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the build works at any URL, e.g. GitHub Pages at /Allworkout/.
  // The app uses hash routes (#/home), so no server rewrites are needed.
  base: './',
})
