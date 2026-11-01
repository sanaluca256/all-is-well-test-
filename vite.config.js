import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 프론트에서 /api/... 로 보낸 요청을 로컬 서버(server/server.js)로 전달
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
