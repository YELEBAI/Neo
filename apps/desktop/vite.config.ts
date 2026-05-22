/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@neo-tavern/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@neo-tavern/core': path.resolve(__dirname, '../../packages/core/src'),
      '@neo-tavern/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
