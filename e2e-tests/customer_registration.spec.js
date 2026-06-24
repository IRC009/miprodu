const { test, expect } = require('@playwright/test');

/**
 * Test E2E: Persistencia de Datos de Clientes (CRM & Loyalty)
 * Verifica que los clientes se guarden en la base de datos tras realizar acciones clave.
 */

const DASHBOARD_URL = 'https://app.cartaymesa.com';
const MENU_URL = 'https://menu.cartaymesa.com/r/isaacrodas10/menu';
const EMAIL = 'isaacrodas10@gmail.com';
const PASS = '32613036';

async function prepareCustomerPage(customerPage) {
    await customerPage.waitForTimeout(3000);
    await customerPage.evaluate(() => {
        const selectors = [
            '.promos-modal-overlay', '.promo-overlay', '.modern-alert-overlay', 
            '.subscription-banner', '.modal-overlay', '.location-banner'
        ];
        selectors.forEach(s => {
            document.querySelectorAll(s).forEach(el => el.remove());
        });
    });
}

async function addFirstProduct(customerPage) {
    const product = customerPage.locator('.product-card').first();
    await product.waitFor({ state: 'visible', timeout: 30000 });
    await product.click({ force: true });
    
    const addBtn = customerPage.locator('.product-modal-add-btn, .product-card button').first();
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addBtn.click({ force: true });
    }
}

async function fillRegistrationData(customerPage, type, name, extra = {}) {
    const cartBtn = customerPage.locator('.cart-fab-btn, .cart-btn, [aria-label="Carrito"]').first();
    await cartBtn.waitFor({ state: 'visible', timeout: 20000 });
    await cartBtn.click({ force: true });
    
    // Seleccionar tipo con click físico en el label que contiene el radio
    const typeLabel = customerPage.locator(`.cart-radio:has-text("${type === 'Domicilio' ? 'Domicilio' : type}")`).first();
    await typeLabel.click({ force: true });
    await customerPage.waitForTimeout(1000);

    // Nombre
    const nameInput = customerPage.locator('.cart-fields input[placeholder*="Juan"], .cart-fields input[placeholder*="nombre"]').first();
    await nameInput.click({ force: true });
    await nameInput.fill(name);
    await customerPage.keyboard.press('Tab');

    if (type === 'Domicilio') {
        const addrInput = customerPage.locator('.cart-fields input[placeholder*="Calle"], .cart-fields input[placeholder*="Dirección"]').first();
        await addrInput.click({ force: true });
        await addrInput.fill(extra.address || 'Calle CRM 123');
        await customerPage.keyboard.press('Tab');

        const phoneInput = customerPage.locator('.cart-fields input[placeholder*="300"], .cart-fields input[placeholder*="Teléfono"]').first();
        await phoneInput.click({ force: true });
        await phoneInput.fill(extra.phone || '3009998877');
        await customerPage.keyboard.press('Tab');
    }
    
    if (extra.loyaltyDoc) {
        const loyaltyCheck = customerPage.locator('input[type="checkbox"]').first();
        await loyaltyCheck.check({ force: true });
        const docInput = customerPage.locator('input[placeholder*="documento"]').first();
        await docInput.click({ force: true });
        await docInput.fill(extra.loyaltyDoc);
        await customerPage.keyboard.press('Tab');
    }

    await customerPage.locator('.btn-checkout, .cart-submit-btn').first().click({ force: true });
}

test.describe('Persistencia de Datos de Clientes', () => {
  test.setTimeout(240000);

  test('debe guardar un nuevo cliente en el CRM tras un pedido de domicilio', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const customerContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const customerPage = await customerContext.newPage();

    // 1. LOGIN ADMIN
    await adminPage.goto(`${DASHBOARD_URL}/login`);
    await adminPage.fill('input[type="email"]', EMAIL);
    await adminPage.fill('input[type="password"]', PASS);
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL('**/', { timeout: 30000 });

    // 2. REALIZAR PEDIDO (CLIENTE)
    const uniqueName = `Customer-${Date.now().toString().slice(-4)}`;
    await customerPage.goto(MENU_URL);
    await prepareCustomerPage(customerPage);
    await addFirstProduct(customerPage);
    await fillRegistrationData(customerPage, 'Domicilio', uniqueName);
    console.log('✅ Pedido enviado. Verificando CRM...');

    // 3. VERIFICAR CRM (ADMIN)
    await adminPage.bringToFront();
    await adminPage.goto(`${DASHBOARD_URL}/crm`);
    await adminPage.waitForSelector('.saas-table', { timeout: 30000 });
    
    const searchInput = adminPage.locator('input[placeholder*="Buscar"]');
    await searchInput.fill(uniqueName);
    await adminPage.waitForTimeout(3000);
    
    await expect(adminPage.locator(`.saas-table tr:has-text("${uniqueName}")`).first()).toBeVisible({ timeout: 20000 });
    console.log(`✅ Cliente ${uniqueName} persistido en CRM.`);

    await adminContext.close();
    await customerContext.close();
  });

  test('debe guardar un cliente en el sistema de lealtad tras acumular puntos', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const customerContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const customerPage = await customerContext.newPage();

    await adminPage.goto(`${DASHBOARD_URL}/login`);
    await adminPage.fill('input[type="email"]', EMAIL);
    await adminPage.fill('input[type="password"]', PASS);
    await adminPage.click('button[type="submit"]');
    
    const docId = `LOY-${Date.now().toString().slice(-4)}`;
    await customerPage.goto(MENU_URL);
    await prepareCustomerPage(customerPage);
    await addFirstProduct(customerPage);
    await fillRegistrationData(customerPage, 'Domicilio', 'Cliente Loyalty', { loyaltyDoc: docId });

    await adminPage.bringToFront();
    await adminPage.goto(`${DASHBOARD_URL}/loyalty`);
    await adminPage.click('button:has-text("Clientes")');
    
    // Buscar el cliente por documento para asegurar que aparezca
    const searchInput = adminPage.locator('input[placeholder*="Buscar"]').first();
    if (await searchInput.isVisible()) {
        await searchInput.fill(docId);
        await adminPage.waitForTimeout(3000);
    }
    
    await expect(adminPage.locator(`text=${docId}`).first()).toBeVisible({ timeout: 45000 });
    console.log(`✅ Cliente ${docId} persistido en Loyalty.`);

    await adminContext.close();
    await customerContext.close();
  });

});
