import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './src/tests/e2e',
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Chrome',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          args: [
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        }
      },
    }
  ],
  webServer: {
    command: 'npm start',
    port: 3002,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
}

export default config;
