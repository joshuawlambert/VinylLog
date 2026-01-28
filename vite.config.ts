import { defineConfig } from 'vite'

export default defineConfig(() => {
  const basePath = process.env.BASE_PATH || '/'
  return {
    base: basePath,
    server: {
      port: 5173,
      strictPort: true
    }
  }
})
