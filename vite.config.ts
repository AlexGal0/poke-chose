import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  server: { host: '127.0.0.1', port: 15300, strictPort: true, proxy: { '/x-live-api': { target: `http://127.0.0.1:${process.env.X_LIVE_BRIDGE_PORT ?? 15305}`, changeOrigin: true }, '/x-save-api': { target: `http://127.0.0.1:${process.env.X_SAVE_BRIDGE_PORT ?? 15304}`, changeOrigin: true }, '/enemy-api': { target: 'http://127.0.0.1:15303', changeOrigin: true }, '/live-api': { target: `http://127.0.0.1:${process.env.LIVE_BRIDGE_PORT ?? 15302}`, changeOrigin: true }, '/save-api': { target: `http://127.0.0.1:${process.env.SAVE_BRIDGE_PORT ?? 15301}`, changeOrigin: true } } },
  preview: { host: '127.0.0.1', port: 15400, strictPort: true, proxy: { '/x-live-api': { target: `http://127.0.0.1:${process.env.X_LIVE_BRIDGE_PORT ?? 15305}`, changeOrigin: true }, '/x-save-api': { target: `http://127.0.0.1:${process.env.X_SAVE_BRIDGE_PORT ?? 15304}`, changeOrigin: true }, '/enemy-api': { target: 'http://127.0.0.1:15303', changeOrigin: true }, '/live-api': { target: `http://127.0.0.1:${process.env.LIVE_BRIDGE_PORT ?? 15302}`, changeOrigin: true }, '/save-api': { target: `http://127.0.0.1:${process.env.SAVE_BRIDGE_PORT ?? 15301}`, changeOrigin: true } } },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
