const { test, expect } = require('@playwright/test');

/**
 * Test E2E: Sistema de Puntos de Lealtad (Loyalty)
 */

const DASHBOARD_URL = 'https://app.cartaymesa.com';
const EMAIL = 'isaacrodas10@gmail.com';
const PASS = '32613036';
const PIN = '1234';

test.describe('Programa de Lealtad (Loyalty System)', () => {
  test.setTimeout(150000);

  test.beforeEach(async ({ page }) => {
    // 1. Login inicial
    await page.goto(`${DASHBOARD_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 30000 });
  });

  test('debe permitir configurar el programa y acumular puntos en el POS', async ({ page }) => {
    // 2. Ir al Loyalty Manager
    await page.goto(`${DASHBOARD_URL}/loyalty`);
    await page.waitForSelector('h1:has-text("Programa de Puntos")', { timeout: 20000 });
    console.log('✅ Loyalty Manager cargado');

    // 3. Habilitar el programa si no lo está
    const enableToggle = page.locator('button:has-text("Programa de Puntos") + div input[type="checkbox"], button:has-text("Desactivar"), button:has-text("Activar")').first();
    // Nota: El toggle depende de la implementación exacta de la UI. 
    // Basado en LoyaltyManager.jsx, es un interruptor con texto "Activar Programa" o "Desactivar Programa"
    const activateBtn = page.locator('button:has-text("Activar Programa")');
    if (await activateBtn.isVisible()) {
        await activateBtn.click();
        console.log('🔘 Programa activado');
    }

    // Guardar cambios si hay botón (en LoyaltyManager.jsx se guarda al cambiar pestañas o explícitamente)
    // El botón de guardar está en la parte inferior de la pestaña Configuración
    const saveBtn = page.locator('button:has-text("Guardar Configuración")');
    if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
    }

    // 4. Ir al POS
    await page.goto(`${DASHBOARD_URL}/pos`);
    await page.waitForSelector('.pos-product-card', { timeout: 20000 });
    console.log('✅ POS cargado');

    // 5. Añadir productos
    await page.locator('.pos-product-card').first().click();
    console.log('✅ Producto añadido');

    // 6. Abrir Checkout
    console.log('🔘 Abriendo Checkout...');
    await page.click('.pos-btn-pay');
    
    // Si pide PIN
    const pinInput = page.locator('.pos-pin-input');
    if (await pinInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('ℹ️ PIN Modal detectado');
        await pinInput.fill(PIN);
        await page.click('.pos-btn-confirm');
    }

    // 7. Ingresar Documento de Cliente en el Panel de Lealtad
    console.log('🔘 Buscando panel de lealtad en el checkout...');
    const loyaltyPanel = page.locator('div:has-text("Acumular / Canjear Puntos")').first();
    const isLoyaltyVisible = await loyaltyPanel.isVisible({ timeout: 15000 }).catch(() => false);
    
    if (!isLoyaltyVisible) {
        console.log('❌ ERROR: El panel de lealtad NO es visible en el checkout. Posiblemente no está habilitado o el plan es insuficiente.');
        // Tomar captura para debug (si fuera posible verla)
        throw new Error('Panel de lealtad no encontrado en checkout');
    }

    console.log('🔘 Panel de lealtad encontrado. Buscando input...');
    const docId = `TEST-${Date.now().toString().slice(-6)}`;
    const loyaltyInput = page.locator('input[placeholder="Documento de identidad del cliente"]');
    await loyaltyInput.waitFor({ state: 'visible', timeout: 5000 });
    console.log(`🔘 Ingresando documento: ${docId}`);
    await loyaltyInput.fill(docId);
    
    // Buscar cliente para asegurar que el sistema lo reconozca/prepare
    await page.click('button:has-text("Buscar")');
    console.log('🔘 Clic en Buscar cliente');
    await page.waitForTimeout(3000);

    // 8. Confirmar Factura
    console.log(`🚀 Facturando para cliente ${docId}`);
    const confirmBtn = page.locator('.pos-btn-confirm:has-text("Confirmar")');
    await confirmBtn.click({ force: true });

    // 9. Verificar Toast de Puntos
    await page.waitForSelector('.modern-alert-overlay', { state: 'visible', timeout: 20000 });
    console.log('✅ Notificación de puntos/éxito detectada');

    // 10. Volver a Loyalty Manager para verificar al cliente
    await page.goto(`${DASHBOARD_URL}/loyalty`);
    // Ir a la pestaña de Clientes
    await page.click('button:has-text("Clientes")');
    
    // Buscar el documento en la tabla
    await expect(page.locator(`text=${docId}`)).toBeVisible({ timeout: 20000 });
    console.log(`✅ Cliente ${docId} verificado en el panel administrativo`);
  });
});
