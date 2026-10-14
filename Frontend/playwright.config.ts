import { defineConfig, devices } from '@playwright/test'

const audioFixture = process.env.PLAYWRIGHT_AUDIO_FIXTURE

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      permissions: audioFixture ? ['microphone'] : [],
      launchOptions: audioFixture ? {
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          `--use-file-for-fake-audio-capture=${audioFixture}`,
        ],
      } : undefined,
    },
  }],
})
