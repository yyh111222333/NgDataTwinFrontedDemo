import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// 本地 dev 代理目标，与 Docker 部署中 nginx 反代行为一致（同源 /api、/health）
const devApiTarget = process.env.VITE_DEV_API_PROXY_TARGET ?? 'http://localhost:8084'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api': {
        target: devApiTarget,
        changeOrigin: true,
      },
      '/health': {
        target: devApiTarget,
        changeOrigin: true,
      },
    },
  },
})
