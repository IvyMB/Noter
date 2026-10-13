import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

const shared = { '@shared': resolve('src/shared') }

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()], resolve: { alias: shared } },
  preload: { plugins: [externalizeDepsPlugin()], resolve: { alias: shared } },
  renderer: { plugins: [react()], resolve: { alias: shared } }
})
