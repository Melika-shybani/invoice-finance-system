import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    // وقتی بک‌اند آماده شد، درخواست‌های /api به آن پروکسی می‌شود
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } },
  },
})
