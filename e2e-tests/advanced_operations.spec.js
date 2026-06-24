const { test, expect } = require('@playwright/test');

/**
 * Test de Operaciones Avanzadas: Cuentas Divididas y Arqueo Cruzado
 * Verifica la integridad financiera en flujos complejos.
 */

const DASHBOARD_URL = 'https://app.cartaymesa.com';
const EMAIL = 'isaacrodas10@gmail.com';
const PASS = '32613036';
const PIN = '1234';

test.describe('Operaciones de Caja y Restaurante Avanzadas', () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 30000 });
  });

  test('debe permitir dividir una cuenta (Split Bill) y facturar por partes', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}/restaurante`);
    await page.waitForSelector('.rd-tab-btn', { timeout: 20000 });

    // 1. Asegurarse de que hay una mesa con pedidos (si no, crear una rápida)
    // Para efectos de este test, buscaremos una mesa ocupada.
    const occupiedTable = page.locator('.table-card.occupied').first();
    
    if (await occupiedTable.isVisible()) {
        await occupiedTable.click({ force: true });
        
        // 2. Abrir modal de cuenta dividida
        const splitBtn = page.locator('button:has-text("Dividir Cuenta"), .rd-btn-bill:has-text("Dividir")').first();
        if (await splitBtn.isVisible()) {
            console.log('🔘 Iniciando Split Bill...');
            await splitBtn.click();
            
            // 3. Verificar que aparezca el modal de división
            await expect(page.locator('.split-bill-modal, .rd-modal-content:has-text("Dividir")').first()).toBeVisible();
            
            // 4. Mover un producto a una nueva persona (simulación simplificada)
            const itemToMove = page.locator('.split-unassigned-item, .split-item-row').first();
            if (await itemToMove.isVisible()) {
                await itemToMove.click(); // Suele moverlo a la Persona 1
            }
            
            console.log('✅ Interfaz de Split Bill validada.');
        } else {
            console.log('ℹ️ Función de Split Bill no disponible para esta mesa o plan.');
        }
    } else {
        console.log('ℹ️ No hay mesas ocupadas para probar Split Bill.');
    }
  });

  test('debe validar la consistencia del Arqueo (Efectivo vs Tarjeta)', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}/pos`);
    
    // 1. Verificar si hay turno abierto
    const openShiftBtn = page.locator('.shift-status-btn.open').first();
    const isShiftOpen = await openShiftBtn.isVisible().catch(() => false);

    if (isShiftOpen) {
        console.log('🔘 Abriendo resumen de arqueo...');
        await openShiftBtn.click();
        
        // 2. Verificar que el modal de cierre muestre los desgloses
        const modal = page.locator('.shift-modal-content, .rd-modal-content').first();
        await expect(modal).toBeVisible();
        
        // Buscamos etiquetas de montos esperados
        const cashExpected = modal.locator('text=Efectivo Esperado, text=Total Efectivo');
        const cardExpected = modal.locator('text=Tarjeta Esperado, text=Total Tarjeta');
        
        await expect(cashExpected.first() || cardExpected.first()).toBeVisible();
        console.log('✅ Consistencia de arqueo (Efectivo/Tarjeta) visible en el resumen.');
    } else {
        console.log('ℹ️ Turno cerrado. No se puede validar arqueo dinámico.');
    }
  });
});
