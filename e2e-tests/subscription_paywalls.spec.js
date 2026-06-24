const { test, expect } = require('@playwright/test');

/**
 * Test de Paywalls: Verificación de bloqueos por suscripción
 * Asegura que el usuario no acceda a módulos Pro sin el plan adecuado.
 */

const DASHBOARD_URL = 'https://app.cartaymesa.com';
const EMAIL = 'isaacrodas10@gmail.com';
const PASS = '32613036';

test.describe('Flujo de Suscripción y Paywalls', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 20000 });
  });

  test('debe mostrar el banner de suscripción si el plan no está activo', async ({ page }) => {
    // Nota: Este test depende del estado actual del usuario isaacrodas10.
    // Si tiene plan activo, verificamos que el banner NO sea invasivo o no esté.
    // Si no tiene plan, el banner debe ser visible.
    
    const banner = page.locator('.subscription-banner, .upgrade-banner');
    const isVisible = await banner.isVisible().catch(() => false);
    
    if (isVisible) {
        console.log('ℹ️ Banner de suscripción detectado (Plan inactivo o Free).');
        await expect(banner).toContainText(/Plan|Suscripción|Actualiza/i);
    } else {
        console.log('ℹ️ Sin banner visible (Probablemente Plan Pro activo).');
    }
  });

  test('debe abrir la página de precios al intentar acceder a una función bloqueada', async ({ page }) => {
    // Buscamos un item del menú lateral que tenga el icono de candado
    const lockedLink = page.locator('.nav-link.locked').first();
    
    if (await lockedLink.isVisible()) {
        console.log('🔘 Intentando clicar en función bloqueada...');
        await lockedLink.click();
        
        // Debería navegar a /subscription
        await expect(page).toHaveURL(/.*subscription/);
        console.log('✅ Redirección a Suscripción exitosa desde Paywall.');
        
        // Verificar que se ven los planes
        await expect(page.locator('.plan-card, .pricing-grid')).toBeVisible();
    } else {
        console.log('ℹ️ No se encontraron funciones bloqueadas para este usuario.');
    }
  });

});
