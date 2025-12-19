import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PENTING: Jangan ada konfigurasi css/postcss di sini.
// Biarkan postcss.config.cjs yang menanganinya.
export default defineConfig({
  plugins: [react()],
})