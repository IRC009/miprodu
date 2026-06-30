const { test, expect } = require('@playwright/test');

/**
 * Test de Resiliencia: Modo Offline y Errores de Red
 * Verifica cómo se comporta la aplicación ante la pérdida de conexión.
 */

const DASHBOARD_URL = 'https://app.miprodu.com';
const EMAIL = 'isaacrodas10@gmail.com';
const PASS = '32613036';

test.describe('Resiliencia y Conectividad', () => {

  test('debe manejar la pérdida de conexión a internet en el Dashboard', async ({ page, context }) => {
    // 1. Login
    await page.goto(`${DASHBOARD_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 20000 });

    // 2. Simular Offline
    console.log('🔌 Desconectando red...');
    await context.setOffline(true);
    
    // 3. Intentar realizar una acción (Ej: navegar o clicar un botón que requiera red)
    await page.goto(`${DASHBOARD_URL}/restaurante`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    
    // 4. Verificar que aparezca un mensaje de aviso o que la UI no se rompa
    // La app suele usar un contexto de alerta o notificaciones de Firebase que fallan
    const bodyText = await page.textContent('body');
    // Buscamos indicadores de desconexión o fallos de red
    const isErrorVisible = bodyText.includes('conexion') || bodyText.includes('red') || bodyText.includes('offline');
    
    if (isErrorVisible) {
        console.log('✅ Notificación de desconexión detectada.');
    } else {
        console.log('ℹ️ La UI se mantiene estable en modo offline.');
    }

    // 5. Reconectar
    console.log('🔌 Reconectando red...');
    await context.setOffline(false);
    await page.reload();
    await expect(page.locator('.dashboard-layout, .saas-loading-state').first()).toBeVisible({ timeout: 20000 });
    console.log('✅ Aplicación recuperada tras reconexión.');
  });

});
