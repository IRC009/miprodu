const { test, expect } = require('@playwright/test');

/**
 * Smoke Tests (Web Explorador)
 * Verifica el estado de las aplicaciones en vivo y la interactividad básica.
 */

const DASHBOARD_URL = 'https://app.miprodu.com';
const MENU_BASE_URL = 'https://menu.miprodu.com';
const EMAIL = 'isaacrodas10@gmail.com';
const PASS = '32613036';

test.describe('WebExplora Smoke & Interactivity Tests', () => {

  test('Dashboard / Login: Verificación de acceso y UI', async ({ page }) => {
    console.log(`\n--- Verificando Dashboard en ${DASHBOARD_URL} ---`);
    await page.goto(`${DASHBOARD_URL}/login`, { waitUntil: 'load' });
    
    const title = await page.title();
    console.log(`Título: "${title}"`);

    const hasEmail = await page.locator('input[type="email"]').isVisible();
    expect(hasEmail).toBeTruthy();
    console.log('✅ Formulario de login presente.');
  });

  test('Menú Público: Carga directa de carta', async ({ page }) => {
    const testUrl = `${MENU_BASE_URL}/r/isaacrodas10/menu`;
    console.log(`\n--- Verificando Menú Público Directo en ${testUrl} ---`);
    
    await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); 

    const rootHasContent = await page.locator('#root').innerHTML();
    expect(rootHasContent.length).toBeGreaterThan(0);
    console.log('✅ Aplicación React del Menú cargada correctamente.');
  });

  test('Integración: Navegación del Dashboard al Menú Público', async ({ page, context }) => {
    console.log('\n--- Probando Navegación Dashboard -> Menú ---');
    
    // 1. Login
    await page.goto(`${DASHBOARD_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');

    // 2. Ir a Restaurante
    await page.waitForURL('**/');
    await page.goto(`${DASHBOARD_URL}/restaurante`);
    await page.waitForSelector('.rd-tab-btn', { timeout: 20000 });
    console.log('✅ Dashboard operativo.');

    // 3. Clic en Menú (Topbar)
    const menuLink = page.locator('a[title="Ver mi menú público"]');
    await expect(menuLink).toHaveAttribute('href', /r\/(?!null|undefined).+/, { timeout: 15000 });
    
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      menuLink.click()
    ]);

    await newPage.waitForLoadState();
    console.log(`✅ Navegación a Menú Público exitosa: ${newPage.url()}`);
    
    await expect(newPage).toHaveURL(/menu\.miprodu\.com\/r\//);
    
    // Cerrar modal de promociones si aparece
    const promoCloseBtn = newPage.locator('button:has-text("Entendido"), .promos-modal-close');
    if (await promoCloseBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('🎁 Modal de promociones detectado. Cerrando...');
        await promoCloseBtn.click();
    }
  });

});
