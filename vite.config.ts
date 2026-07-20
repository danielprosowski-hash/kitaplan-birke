import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relativer Pfad, damit der Build unabhängig vom Unterpfad funktioniert
  // (z. B. https://<name>.github.io/<repo>/ bei GitHub Pages).
  base: './',
  build: {
    // false, damit wiederholte lokale Builds keine Dateien löschen müssen –
    // wichtig auf manchen Systemen mit eingeschränkten Dateirechten.
    emptyOutDir: false,
  },
})
