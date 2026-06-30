const { test, expect } = require('@playwright/test');

/**
 * Test de Integridad Visual y White-labeling
 * Verifica que las variables CSS y la identidad del restaurante se apliquen.
 */

const MENU_URL = 'https://menu.miprodu.com/r/isaacrodas10/menu';

test.describe('Integridad Visual y Marca Blanca', () => {

  test('debe aplicar la identidad visual del restaurante al Menú Público', async ({ page }) => {
    await page.goto(MENU_URL);
    
    // 1. Esperar a que cargue la app con reintento
    try {
        await page.waitForSelector('.menu-page, .welcome-container', { timeout: 30000 });
    } catch (e) {
        console.log('⚠️ Carga lenta detectada. Refrescando...');
        await page.reload();
        await page.waitForSelector('.menu-page, .welcome-container', { timeout: 45000 });
    }
    
    // 2. Verificar que el nombre del restaurante esté presente (varios posibles selectores)
    const name = page.locator('h1, h2, .elegant-title, .welcome-content-box, .branch-name, .restaurant-name').first();
    await expect(name).toBeVisible({ timeout: 20000 });
    console.log(`✅ Identidad confirmada: ${await name.textContent()}`);

    // 3. Verificar inyección de variables CSS (White-labeling)
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
    });
    
    console.log(`🎨 Color primario detectado: ${primaryColor}`);
    expect(primaryColor).toMatch(/^(#|rgb|rgba)/);
    
    // 4. Verificar layout de productos
    const productCards = page.locator('.product-card');
    const count = await productCards.count();
    
    if (count > 0) {
        const firstCard = productCards.first();
        const display = await firstCard.evaluate(el => getComputedStyle(el).display);
        expect(display).not.toBe('none');
        console.log(`✅ Layout de productos operativo (${count} ítems).`);
    }
  });

});
