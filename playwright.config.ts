import { defineConfig } from '@playwright/test';

/**
 * Pruebas extremo a extremo contra el backend real en Docker (a través del gateway y del proxy de Vite).
 * Requisitos: backend arriba (infra/docker-compose.yml) y datos de scripts/seed-demo.sh en las regiones a probar.
 *   npx playwright test                      # todas las regiones de REGIONS (por defecto co)
 *   REGIONS=co,br,us,fr,jp npx playwright test
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 6 * 60_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4200',
    viewport: { width: 390, height: 844 },
    // Sin Chromium descargado se puede usar el navegador instalado: PW_CHANNEL=chrome o PW_CHANNEL=msedge
    channel: process.env.PW_CHANNEL,
    trace: 'retain-on-failure',
  },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'npx vite --port 4200 --strictPort', url: 'http://localhost:4200', reuseExistingServer: true },
});
