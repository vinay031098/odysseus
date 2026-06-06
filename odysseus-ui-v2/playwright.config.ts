import { defineConfig } from '@playwright/test'

const previewPort = 4173
const previewUrl = `http://127.0.0.1:${previewPort}`
// Default: vite preview (no backend). Set PLAYWRIGHT_BASE_URL=http://127.0.0.1:7860 for full backend e2e.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? previewUrl
const usePreviewServer = baseURL === previewUrl

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: usePreviewServer
    ? {
        command: `npm run preview -- --port ${previewPort} --host 127.0.0.1`,
        port: previewPort,
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
})
