import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// 本地开发复用已部署的大屏网关，避免浏览器直接访问厂区内网服务。
const devGatewayTarget = process.env.VITE_DEV_GATEWAY_TARGET ?? 'http://10.13.0.8:8083'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/gateway': {
        target: devGatewayTarget,
        changeOrigin: true,
      },
      '/relay-api': {
        target: devGatewayTarget,
        changeOrigin: true,
      },
      '/parking-api': {
        target: devGatewayTarget,
        changeOrigin: true,
      },
      '/api': {
        target: devGatewayTarget,
        changeOrigin: true,
      },
      '/health': {
        target: devGatewayTarget,
        changeOrigin: true,
      },
    },
  },
})
