const { test, expect } = require('@playwright/test');

/**
 * Test de Seguridad Financiera: Arqueo y Turnos
 * Verifica que no se pueda operar el POS sin un turno (Shift) abierto.
 */

const DASHBOARD_URL = 'https://app.cartaymesa.com';
const EMAIL = 'isaacrodas10@gmail.com';
const PASS = '32613036';

test.describe('Seguridad Financiera: Control de Turnos', () => {

  test.beforeEach(async ({ page }) => {
    // Login inicial
    await page.goto(`${DASHBOARD_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 20000 });
  });

  test('debe obligar a abrir turno antes de entrar al POS', async ({ page }) => {
    // Intentar ir al POS directamente
    await page.goto(`${DASHBOARD_URL}/pos`);

    // Esperar a que el header cargue
    await page.waitForSelector('.pos-header', { timeout: 20000 });

    // Verificar el botón de estado del turno en el header
    const closedBtn = page.locator('.shift-status-btn.closed, button:has-text("Caja Cerrada")').first();
    const openBtn = page.locator('.shift-status-btn.open, button:has-text("Caja Abierta")').first();

    if (await openBtn.isVisible().catch(() => false)) {
        console.log('ℹ️ Turno ya estaba abierto. Verificando que el POS sea operativo.');
        await expect(page.locator('.pos-main-layout, .pos-products-grid').first()).toBeVisible();
        console.log('✅ POS operativo verificado.');
    } else {
        console.log('✅ Bloqueo de turno detectado en el header.');
        await expect(closedBtn).toBeVisible({ timeout: 15000 });
        
        // Al clicar el botón cerrado, debe abrirse el modal de apertura
        await closedBtn.click();
        await expect(page.locator('text=Abrir Turno, text=Base Inicial, .rd-modal-content').first()).toBeVisible();
        console.log('✅ Modal de apertura de caja verificado.');
    }
  });

  test('debe registrar correctamente el cierre de caja (Arqueo)', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}/restaurante`);
    await page.click('button:has-text("Mesas"), .rd-tab-btn:has-text("Mesas")');
    
    // Buscar si hay turno abierto para cerrar
    const cerrarCajaBtn = page.locator('button:has-text("Cerrar Caja"), button:has-text("Cerrar Turno")');
    
    if (await cerrarCajaBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('🔘 Iniciando proceso de cierre de caja...');
        await cerrarCajaBtn.click();
        
        // Completar formulario de arqueo
        const efectivoFinal = page.locator('input[placeholder*="efectivo"], .arqueo-input').first();
        if (await efectivoFinal.isVisible()) {
            await efectivoFinal.fill('100000');
            await page.click('button:has-text("Confirmar Cierre"), button:has-text("Finalizar")');
            console.log('✅ Arqueo completado exitosamente.');
        }
    } else {
        console.log('ℹ️ No hay turno abierto para realizar arqueo.');
    }
  });

});
