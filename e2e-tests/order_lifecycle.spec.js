const { test, expect } = require('@playwright/test');

/**
 * Test E2E: Ciclo de Vida de una Orden
 * Este test cubre desde el login hasta la liberación de una mesa facturada.
 */

const DASHBOARD_URL = 'https://app.cartaymesa.com';
const EMAIL = 'isaacrodas10@gmail.com';
const PASS = '32613036';
const PIN = '1234';

test.describe('Ciclo de Vida de Restaurante (E2E)', () => {
  test.setTimeout(120000); // Aumentar timeout global a 120s para flujos largos

  test.beforeEach(async ({ page }) => {
    // 1. Login inicial
    await page.goto(`${DASHBOARD_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 20000 });
    console.log('✅ Autenticación exitosa');
  });

  test('debe crear una orden, añadir productos y luego facturarla', async ({ page }) => {
    // 2. Ir al Dashboard de Restaurante
    await page.goto(`${DASHBOARD_URL}/restaurante`);
    await page.waitForSelector('.rd-tab-btn', { timeout: 20000 });
    console.log('✅ Dashboard cargado');

    // 3. Buscar una mesa LIBRE. Si no hay, liberar una ocupada primero.
    let freeTable = page.locator('.table-card.free').first();
    if (await freeTable.count() === 0) {
        console.log('⚠️ No hay mesas libres. Liberando una mesa ocupada para el test...');
        const occupiedToFree = page.locator('.table-card.occupied').first();
        if (await occupiedToFree.count() > 0) {
            await occupiedToFree.click({ force: true });
            
            // Esperar a que el modal de gestión sea visible
            await page.waitForSelector('.rd-modal-content', { state: 'visible', timeout: 15000 });
            
            // Puede haber órdenes por facturar o mesa ya facturada pendiente de liberar
            const billBtn = page.locator('button:has-text("Consolidar y Facturar"), button:has-text("Liberar Mesa")').first();
            await billBtn.waitFor({ state: 'visible', timeout: 10000 });
            await billBtn.click();
            
            // Manejar AuthModal (PIN) si aparece
            const authOverlay = page.locator('.rd-modal-overlay');
            if (await authOverlay.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('ℹ️ AuthModal detectado durante liberación. Autenticando...');
                const select = page.locator('.rd-modal-content select');
                await select.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
                if (await select.isVisible()) {
                    await select.selectOption({ index: 1 });
                }
                
                const passwordInput = page.locator('.rd-modal-content input[type="password"]');
                if (await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await passwordInput.fill(PIN);
                    await page.locator('.rd-modal-content button:has-text("Validar"), .rd-modal-content button:has-text("Confirmar")').first().click();
                }
            }
            
            // Si se abrió el modal de facturación rápida (Checkout), confirmar
            const checkoutConfirm = page.locator('button:has-text("Confirmar Factura")');
            if (await checkoutConfirm.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('ℹ️ Confirmando factura rápida...');
                await checkoutConfirm.click();
                await page.waitForSelector('.modern-alert-overlay', { state: 'visible', timeout: 10000 }).catch(() => {});
                await page.locator('.modern-alert-overlay').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
            }
            
            // Después de facturar, la mesa puede quedar en estado "Billed" pero no libre aún.
            const tableAfterBill = page.locator('.table-card').first(); 
            const status = await tableAfterBill.evaluate(el => el.className);
            if (status.includes('occupied')) {
                 // Asegurarse de que no hay modales previos bloqueando
                 await page.locator('.rd-modal-overlay').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
                 
                 await tableAfterBill.click({ force: true });
                 const liberarBtn = page.locator('button:has-text("Liberar Mesa")');
                 if (await liberarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                     await liberarBtn.click({ force: true });
                     console.log('🔘 Clic en Liberar Mesa...');
                     await page.waitForTimeout(1000);
                     // Esperar a que se cierre el modal de liberación
                     await page.locator('.rd-modal-overlay').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
                     
                     // Esperar a que la mesa se marque como libre en el DOM
                     await expect(tableAfterBill).toHaveClass(/free/, { timeout: 15000 });
                     console.log('✅ Mesa liberada detectada en el DOM.');
                 }
            }
        }

        // Esperar a que el sistema procese y el Dashboard se actualice
        await page.waitForSelector('.modern-alert-overlay', { state: 'visible', timeout: 20000 }).catch(() => {});
        await page.locator('.modern-alert-overlay').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(3000);
    }

    // Actualizar referencia a mesa libre y esperar a que sea visible
    await page.waitForTimeout(2000);
    freeTable = page.locator('.table-card.free').first();
    const isVisible = await freeTable.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (!isVisible) {
        console.log('⚠️ Sigue sin detectarse una mesa libre. Recargando página...');
        await page.reload();
        await page.waitForSelector('.table-card', { timeout: 20000 });
        freeTable = page.locator('.table-card.free').first();
    }

    const tableLabel = freeTable.locator('.table-name, .rd-table-name').first();
    await expect(tableLabel).toBeVisible({ timeout: 45000 });
    let tableNumber = await tableLabel.textContent();
    tableNumber = tableNumber.replace('Mesa', '').trim();
    console.log(`🚀 Iniciando orden en Mesa ${tableNumber}`);
    await freeTable.click({ force: true });

    // 4. ¿Apareció el modal de PIN?
    const authModal = page.locator('.rd-modal-overlay');
    if (await authModal.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('ℹ️ AuthModal detectado. Autenticando...');
        const select = page.locator('.rd-modal-content select');
        await select.waitFor({ state: 'visible', timeout: 5000 });
        await select.selectOption({ index: 1 });
        
        const pinField = page.locator('.rd-modal-content input[type="password"]');
        if (await pinField.isVisible()) {
            await pinField.fill(PIN);
        }
        await page.locator('.rd-modal-content button:has-text("Confirmar"), .rd-modal-content button:has-text("Validar")').first().click();
    }

    // 5. Debería estar en el POS
    await page.waitForURL('**/pos', { timeout: 30000 });
    console.log('✅ Navegado al POS');

    // 6. Añadir el primer producto disponible
    const product = page.locator('.pos-product-card').first();
    await product.waitFor({ state: 'visible' });
    await product.click();
    console.log('✅ Producto añadido al carrito');

    // 7. Enviar Comanda (Ordenar)
    await page.click('button:has-text("📋 Ordenar")');
    
    // Si aparece modal de PIN
    const pinInput = page.locator('.pos-pin-input');
    if (await pinInput.isVisible()) {
        await pinInput.fill(PIN);
        await page.click('.pos-btn-confirm');
    }

    // 8. Esperar redirección al Dashboard
    await page.waitForURL(url => url.pathname.includes('restaurante'), { timeout: 20000 });
    console.log('✅ Pedido enviado. Regresando al Dashboard.');

    // 9. Verificar que la mesa está OCUPADA
    const occupiedTable = page.locator(`.table-card.occupied:has-text("Mesa ${tableNumber}")`).first();
    await expect(occupiedTable).toBeVisible({ timeout: 60000 });
    console.log(`✅ Mesa ${tableNumber} confirmada como OCUPADA`);

    // Esperar a que desaparezca la alerta de éxito
    await page.locator('.modern-alert-overlay').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // 10. FLUJO DE FACTURACIÓN
    console.log(`| Intentando abrir modal de Mesa ${tableNumber}...`);
    await occupiedTable.click({ force: true });
    
    await page.waitForSelector('.rd-modal-content', { state: 'visible', timeout: 20000 });
    await page.click('button:has-text("Consolidar y Facturar")');
    console.log('✅ Modal de gestión abierto');

    // 11. Manejar AuthModal (PIN)
    const authOverlayFinal = page.locator('.rd-modal-overlay');
    await expect(authOverlayFinal).toBeVisible({ timeout: 10000 });
    const selectFinal = page.locator('.rd-modal-content select');
    await selectFinal.waitFor({ state: 'visible' });
    await selectFinal.selectOption({ index: 1 });
    
    const passwordInputFinal = page.locator('.rd-modal-content input[type="password"]');
    if (await passwordInputFinal.isVisible({ timeout: 2000 }).catch(() => false)) {
        await passwordInputFinal.pressSequentially(PIN, { delay: 100 });
        await page.keyboard.press('Enter');
    }
    await page.locator('.rd-modal-content button:has-text("Confirmar"), .rd-modal-content button:has-text("Validar")').first().click();

    // 12. Verificar éxito
    await page.waitForSelector('.modern-alert-overlay', { state: 'visible', timeout: 20000 });
    await expect(page.locator('text=Pedido Facturado Correctamente')).toBeVisible();
    await page.locator('.modern-alert-overlay').waitFor({ state: 'detached', timeout: 20000 });

    // 13. Verificar que la mesa vuelve a estar LIBRE
    await expect(page.locator(`.table-card.free:has-text("${tableNumber}")`)).toBeVisible({ timeout: 20000 });
    console.log(`✅ Mesa ${tableNumber.trim()} LIBERADA exitosamente`);
  });

});
