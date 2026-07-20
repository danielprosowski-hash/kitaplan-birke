import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Separate Konfiguration nur für die Tests (Vite selbst kennt kein "test"-Feld).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
