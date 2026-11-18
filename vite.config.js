import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Keep the Supabase client in its own chunk so the entry chunk stays small (#41).
        codeSplitting: {
          groups: [{ name: 'supabase', test: /@supabase/ }],
        },
      },
    },
  },
})
