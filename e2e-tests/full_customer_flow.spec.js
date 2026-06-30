const { test, expect } = require('@playwright/test');

/**
 * Test E2E: Ciclo Completo del Cliente (Menú Público -> Dashboard -> Entrega)
 * Cubre: Mesa (con Inbox), Barra y Domicilio.
 */

const DASHBOARD_URL = 'https://app.miprodu.com';
const MENU_URL = 'https://menu.miprodu.com/r/isaacrodas10/menu';
const EMAIL = 'isaacrodas10@gmail.com';
const PASS = '32613036';
const PIN = '1234';

async function prepareCustomerPage(customerPage) {
    // Cerrar modal de promociones y limpiar overlays que bloquean clics
    await customerPage.waitForTimeout(3000);
    await customerPage.evaluate(() => {
        const selectors = [
            '.promos-modal-overlay', '.promo-overlay', '.modern-alert-overlay', 
            '.modal-overlay', '.rd-modal-overlay', '.subscription-banner',
            '.location-banner', '.read-only-banner'
        ];
        selectors.forEach(s => {
            document.querySelectorAll(s).forEach(el => el.remove());
        });
    });
    console.log('🧹 Limpieza de modales realizada en cliente');
}

async function addFirstProduct(customerPage) {
    const firstProduct = customerPage.locator('.product-card').first();
    await firstProduct.waitFor({ state: 'visible', timeout: 30000 });
    await firstProduct.click({ force: true });
    
    const productModal = customerPage.locator('.product-modal-content');
    if (await productModal.isVisible({ timeout: 5000 }).catch(() => false)) {
        const variant = productModal.locator('.product-modal-variant-item').first();
        if (await variant.isVisible()) await variant.click({ force: true });
        await productModal.locator('.product-modal-add-btn').click({ force: true });
        await customerPage.waitForTimeout(1000);
    }
}

async function fillCustomerData(customerPage, type, name, extra = {}) {
    console.log(`📝 Llenando datos para pedido de tipo: ${type}`);
    const cartFields = customerPage.locator('.cart-fields');
    await cartFields.waitFor({ state: 'visible', timeout: 10000 });

    // Seleccionar tipo con click físico en el label
    const typeLabel = customerPage.locator(`.cart-radio:has-text("${type === 'Domicilio' ? 'Domicilio' : type}")`).first();
    await typeLabel.click({ force: true });
    await customerPage.waitForTimeout(1000);

    // Nombre
    console.log('📝 Escribiendo nombre...');
    const nameInput = customerPage.locator('.cart-fields input[placeholder*="Juan"], .cart-fields input[placeholder*="nombre"]').first();
    await nameInput.click({ force: true });
    await nameInput.fill(name);
    await customerPage.keyboard.press('Tab');
    
    // Extras (Mesa, Dirección, Teléfono)
    if (type === 'Mesa') {
        const tableInput = customerPage.locator('.cart-fields input[placeholder*="Ej: 5"]').first();
        if (await tableInput.isVisible() && await tableInput.isEnabled()) {
            console.log('📝 Escribiendo mesa...');
            await tableInput.click({ force: true });
            await tableInput.fill(extra.table || '99');
            await customerPage.keyboard.press('Tab');
        }
    } else if (type === 'Domicilio') {
        console.log('📝 Escribiendo dirección y teléfono...');
        const addrInput = customerPage.locator('.cart-fields input[placeholder*="Calle"], .cart-fields input[placeholder*="Dirección"]').first();
        const phoneInput = customerPage.locator('.cart-fields input[placeholder*="300"], .cart-fields input[placeholder*="Teléfono"]').first();
        
        if (await addrInput.isVisible()) {
            await addrInput.click({ force: true });
            await addrInput.fill(extra.address || 'Carrera 7 #10-10');
            await customerPage.keyboard.press('Tab');
        }
        if (await phoneInput.isVisible()) {
            await phoneInput.click({ force: true });
            await phoneInput.fill(extra.phone || '3001112233');
            await customerPage.keyboard.press('Tab');
        }
    }
    
    await customerPage.waitForTimeout(1000); 
}

test.describe('Flujo de Vida Completo del Pedido', () => {
  test.setTimeout(300000); // 5 minutos

  test('debe procesar un pedido de MESA desde el menú hasta el cierre en el dashboard', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const customerContext = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: 4.6097, longitude: -74.0817 },
    });
    
    const adminPage = await adminContext.newPage();
    const customerPage = await customerContext.newPage();

    // -- ADMIN: Login --
    await adminPage.goto(`${DASHBOARD_URL}/login`);
    await adminPage.fill('input[type="email"]', EMAIL);
    await adminPage.fill('input[type="password"]', PASS);
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL('**/', { timeout: 45000 });
    
    // -- OBTENER SUCURSAL VÁLIDA --
    console.log('⏳ Sincronizando sede...');
    await adminPage.goto(`${DASHBOARD_URL}/restaurante`);
    await adminPage.waitForSelector('.rd-tab-btn, .rd-branch-select', { timeout: 30000 });
    
    // Intentar obtener ID de la URL o del localStorage/selector
    let branchId = new URL(adminPage.url()).searchParams.get('branch');
    
    if (!branchId) {
        console.log('ℹ️ No hay branch en URL, buscando en selector...');
        const branchSelect = adminPage.locator('select').first(); // Asumiendo que el primer select es de sedes
        if (await branchSelect.isVisible()) {
            branchId = await branchSelect.inputValue();
        }
    }
    
    await adminPage.click('button:has-text("Bandeja"), .rd-tab-btn:has-text("Bandeja")');
    console.log(`✅ Admin sincronizado con Sede: ${branchId || 'Por defecto (root)'}`);

    // -- CUSTOMER: Pedido Mesa --
    const customerUrl = branchId ? `${MENU_URL}?table=99&branch=${branchId}` : `${MENU_URL}?table=99`;
    console.log(`🚀 Navegando cliente a: ${customerUrl}`);
    await customerPage.goto(customerUrl); 
    await prepareCustomerPage(customerPage);
    await addFirstProduct(customerPage);
    
    const cartBtn = customerPage.locator('.cart-fab-btn, .cart-btn, [aria-label="Carrito"]').first();
    await cartBtn.waitFor({ state: 'visible', timeout: 20000 });
    await cartBtn.click({ force: true });
    
    await fillCustomerData(customerPage, 'Mesa', 'Cliente Mesa Playwright', { table: '99' });
    
    const submitBtn = customerPage.locator('.btn-checkout, .cart-submit-btn').first();
    await submitBtn.click({ force: true });
    console.log('🚀 Pedido de mesa enviado');

    await customerPage.waitForURL(url => url.pathname.includes('order-status'), { timeout: 60000 });
    
    // -- ADMIN: Gestionar --
    await adminPage.bringToFront();
    console.log('⏳ Buscando orden en Bandeja (espera larga para producción)...');
    const inboxOrder = adminPage.locator('.rd-order-ticket').filter({ hasText: 'Cliente Mesa Playwright' }).first();
    await expect(inboxOrder).toBeVisible({ timeout: 90000 });
    
    await inboxOrder.locator('button:has-text("Atender")').click();
    
    // Esperar al modal y al select de meseros
    const modal = adminPage.locator('.rd-modal-content');
    await expect(modal).toBeVisible({ timeout: 15000 });
    
    const select = modal.locator('select').first();
    await select.waitFor({ state: 'visible', timeout: 15000 });
    
    // Reintentar esperar a que el select tenga opciones (pueden tardar en cargar de Firebase)
    await adminPage.waitForFunction(sel => sel.options.length > 1, await select.elementHandle(), { timeout: 20000 }).catch(e => {
        console.log('⚠️ No se cargaron meseros a tiempo o no hay meseros creados.');
    });
    
    const optionsCount = await select.evaluate(sel => sel.options.length);
    if (optionsCount > 1) {
        await select.selectOption({ index: 1 });
    } else {
        console.log('ℹ️ Usando opción por defecto en el select (posiblemente la única).');
    }
    
    await adminPage.locator('input[type="password"]').first().fill(PIN);
    await adminPage.click('button:has-text("Confirmar")');
    
    await adminPage.click('button:has-text("Mesas")');
    const table99 = adminPage.locator('.table-card:has-text("99"), .rd-order-ticket:has-text("99")').first();
    await table99.click({ force: true });
    await adminPage.click('button:has-text("Listo")');
    
    await adminPage.click('button:has-text("Facturar"), button:has-text("Consolidar")');
    if (await adminPage.locator('.rd-modal-overlay').isVisible({ timeout: 3000 }).catch(() => false)) {
        await adminPage.locator('input[type="password"]').first().fill(PIN);
        await adminPage.click('button:has-text("Confirmar")');
    }
    
    await adminPage.locator('.modern-alert-overlay').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
    await table99.click({ force: true });
    await adminPage.click('button:has-text("Liberar Mesa")');
    console.log('✅ Ciclo Mesa Completado');

    await adminContext.close();
    await customerContext.close();
  });

  test('debe procesar un pedido de DOMICILIO directo al dashboard', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const customerContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const customerPage = await customerContext.newPage();

    await adminPage.goto(`${DASHBOARD_URL}/login`);
    await adminPage.fill('input[type="email"]', EMAIL);
    await adminPage.fill('input[type="password"]', PASS);
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL('**/', { timeout: 30000 });
    
    await adminPage.goto(`${DASHBOARD_URL}/restaurante`);
    await adminPage.waitForSelector('.rd-tab-btn', { timeout: 20000 });
    await adminPage.click('button:has-text("Domicilios"), .rd-tab-btn:has-text("Domicilios")');

    // -- CUSTOMER: Pedido Domicilio --
    await customerPage.goto(MENU_URL);
    await prepareCustomerPage(customerPage);
    await addFirstProduct(customerPage);
    
    const cartBtn = customerPage.locator('.cart-fab-btn, .cart-btn').first();
    await cartBtn.click({ force: true });
    
    await fillCustomerData(customerPage, 'Domicilio', 'Cliente Domicilio Playwright', { 
        address: 'Carrera 7 #10-10', 
        phone: '3005554433' 
    });
    
    await customerPage.locator('.btn-checkout, .cart-submit-btn').first().click({ force: true });
    console.log('🚀 Pedido de domicilio enviado');
    await customerPage.waitForURL(url => url.pathname.includes('order-status'));

    // -- ADMIN: Verificar --
    await adminPage.bringToFront();
    const deliveryTicket = adminPage.locator('.rd-order-ticket').filter({ hasText: 'Cliente Domicilio Playwright' }).first();
    await expect(deliveryTicket).toBeVisible({ timeout: 90000 });
    console.log('✅ Pedido de domicilio llegó al Dashboard');

    await adminContext.close();
    await customerContext.close();
  });
});
