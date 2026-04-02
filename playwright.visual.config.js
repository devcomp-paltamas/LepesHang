import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.005,
    },
  },
  webServer: {
    command:
      'VITE_SUPABASE_URL=https://test.supabase.co VITE_SUPABASE_ANON_KEY=test-anon-key npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
})
