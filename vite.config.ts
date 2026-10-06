import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  server: { host: '127.0.0.1', proxy: { '/enemy-api': { target: 'http://127.0.0.1:3003', changeOrigin: true }, '/live-api': { target: `http://127.0.0.1:${process.env.LIVE_BRIDGE_PORT ?? 3002}`, changeOrigin: true }, '/save-api': { target: `http://127.0.0.1:${process.env.SAVE_BRIDGE_PORT ?? 3001}`, changeOrigin: true } } },
  preview: { host: '127.0.0.1', proxy: { '/enemy-api': { target: 'http://127.0.0.1:3003', changeOrigin: true }, '/live-api': { target: `http://127.0.0.1:${process.env.LIVE_BRIDGE_PORT ?? 3002}`, changeOrigin: true }, '/save-api': { target: `http://127.0.0.1:${process.env.SAVE_BRIDGE_PORT ?? 3001}`, changeOrigin: true } } },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
