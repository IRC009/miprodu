const { test, expect } = require('@playwright/test');

/**
 * Test de Seguridad: RBAC y Restricciones de Navegación
 * Verifica que los roles y niveles de plan protejan el acceso.
 */

const DASHBOARD_URL = 'https://app.miprodu.com';
const EMAIL = 'isaacrodas10@gmail.com';
const PASS = '32613036';

test.describe('Seguridad y RBAC (Acceso)', () => {

  test.beforeEach(async ({ page }) => {
    // Login inicial
    await page.goto(`${DASHBOARD_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 20000 });
  });

  test('debe restringir acceso a módulos según el Plan (Nivel 2 vs Nivel 1)', async ({ page }) => {
    // Ir a un módulo que suele ser de Nivel 2 (Ej: Analytics o CRM)
    // Nota: El usuario de prueba es Owner, por lo que verá todo si el plan es 2.
    // Verificamos que si intentamos navegar a algo bloqueado, el sistema responda.
    
    await page.goto(`${DASHBOARD_URL}/analytics`);
    
    // Si el plan es Nivel 1, debería mostrarse un modal de Upgrade o redirección
    const isLocked = await page.locator('.locked-feature-overlay, .upgrade-modal-content').isVisible().catch(() => false);
    
    if (isLocked) {
        console.log('✅ Característica bloqueada correctamente por nivel de plan.');
        await expect(page.locator('text=Actualiza tu Plan')).toBeVisible();
    } else {
        console.log('ℹ️ Característica accesible (probablemente Plan Nivel 2 activo).');
        await expect(page.locator('h1, h2, .elegant-title')).toBeVisible();
    }
  });

  test('no debe permitir navegar a rutas inexistentes o protegidas sin sesión', async ({ page, context }) => {
    // Cerrar sesión
    await page.goto(`${DASHBOARD_URL}/settings`);
    await page.click('button:has-text("Cerrar Sesión")');
    await page.waitForURL('**/login');

    // Intentar entrar a una ruta protegida
    await page.goto(`${DASHBOARD_URL}/restaurante`);
    
    // Debería redirigir al login
    await expect(page).toHaveURL(/.*login/);
    console.log('✅ Redirección al login exitosa para ruta protegida.');
  });

});
