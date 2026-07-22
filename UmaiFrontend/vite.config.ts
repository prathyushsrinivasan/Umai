import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // Listen on all interfaces so the dev server also works from a container.
      host: true,
      // Proxying /api keeps the browser same-origin in development, so local work
      // does not depend on the backend CORS configuration.
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
