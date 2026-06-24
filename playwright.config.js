const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './e2e-tests',
  timeout: 60 * 1000,
  /* Reporter: Solo lista en consola */
  reporter: [['list']],
  /* No generar reportes HTML */
  outputDir: path.join(process.env.TEMP || '/tmp', 'playwright-results'),
  use: {
    /* Capturar screenshots solo en fallos para debug */
    screenshot: 'only-on-failure',
    trace: 'off',
    video: 'off',
    headless: true,
  },
  /* Ejecutar tests de forma secuencial para evitar colisiones en producción */
  fullyParallel: false,
  /* Forzar 1 worker para evitar que varios tests usen el mismo usuario/mesa simultáneamente */
  workers: 1,
  /* Reintentos en 0 para no alargar si falla */
  retries: 0,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
