import { defineConfig } from '@playwright/test'

/*
 * Testes no navegador (Playwright).
 * Sobem uma API separada (porta 3100, banco azteca_test) e o Vite (porta 5174) apontando para ela.
 * Nunca usam o banco de desenvolvimento.
 *
 * Localmente usa o Microsoft Edge já instalado; no CI (CI=true) usa o Chromium do Playwright
 * (npx playwright install --with-deps chromium).
 */
const API = 'http://127.0.0.1:3100'
const WEB = 'http://127.0.0.1:5174'

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: WEB,
    channel: process.env.CI ? undefined : 'msedge',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node ../backend/scripts/e2e-server.js',
      url: `${API}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
    },
    {
      command: 'npx vite --port 5174 --strictPort --host 127.0.0.1',
      url: WEB,
      env: { VITE_API_URL: `${API}/api` },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})
