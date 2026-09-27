import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.BACKEND_URL?.trim()
  if (command === 'serve' && !backendUrl && !env.VITE_REALTIME_URL?.trim()) {
    throw new Error('Configurează BACKEND_URL în frontend/.env pentru proxy-ul local sau VITE_REALTIME_URL pentru un backend public.')
  }
  return {
    plugins: [react()],
    server: {
      host: true,
      strictPort: true,
      proxy: backendUrl ? {
        '/ws': { target: backendUrl, ws: true },
      } : undefined,
    },
  }
})
