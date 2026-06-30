const { test, expect } = require('@playwright/test');

const DASHBOARD_URL = 'https://app.miprodu.com';
const EMAIL = 'isaacrodas10@gmail.com';
const PASS = '32613036';

test.describe('Flujo de Asistencia de Personal (Check-in / Check-out)', () => {

  test.beforeEach(async ({ page }) => {
    console.log('\n[DEBUG-E2E] 🚀 Iniciando navegación y autenticación del test E2E...');
    // Login inicial
    await page.goto(`${DASHBOARD_URL}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    
    // Esperar a que cargue el dashboard
    await page.waitForURL('**/', { timeout: 20000 });
    console.log('[DEBUG-E2E] ✅ Login exitoso. Navegando al módulo de Personal...');
  });

  test('Paso 1: Abrir módulo de personal y realizar Check-In', async ({ page }) => {
    // Ir a la sección de Personal
    await page.goto(`${DASHBOARD_URL}/waiters`);
    console.log('[DEBUG-E2E] 📍 En la pantalla de Personal. Buscando mesero disponible...');
    
    // Esperar a que la tabla cargue
    await page.waitForSelector('.saas-table tbody tr', { timeout: 30000 });

    // Buscar el botón de Iniciar Turno (del primer mesero que esté fuera de turno)
    const checkInButton = page.locator('button:has-text("Iniciar Turno")').first();
    
    // Si no hay botón de Iniciar Turno, es porque todos están en turno.
    if (await checkInButton.isVisible()) {
      console.log('[DEBUG-E2E] 🔘 Botón "Iniciar Turno" encontrado. Haciendo click...');
      await checkInButton.click();
      
      // Esperar que aparezca el modal de PIN
      console.log('[DEBUG-E2E] 🔐 Esperando modal de PIN...');
      const pinModal = page.locator('.saas-modal-content:has-text("Iniciar Turno")');
      await expect(pinModal).toBeVisible();

      console.log('[DEBUG-E2E] ⌨️ Ingresando PIN...');
      // Ingresar PIN (asumimos 1234 para test)
      await page.fill('.saas-modal-content input[type="password"]', '1234');
      
      console.log('[DEBUG-E2E] 🔘 Confirmando PIN...');
      await page.click('.saas-modal-content button:has-text("Confirmar")');

      // Esperar alerta de éxito
      console.log('[DEBUG-E2E] ⏳ Esperando notificación de éxito...');
      await expect(page.locator('text=Turno iniciado')).toBeVisible({ timeout: 5000 });
      console.log('[DEBUG-E2E] ✅ Check-In completado con éxito.');
    } else {
      console.log('[DEBUG-E2E] ⚠️ No hay meseros fuera de turno para probar Check-In.');
    }
  });

  test('Paso 2: Realizar Check-Out del empleado en turno', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}/waiters`);
    console.log('[DEBUG-E2E] 📍 En la pantalla de Personal. Buscando empleado en turno...');
    
    await page.waitForSelector('.saas-table tbody tr', { timeout: 30000 });

    const checkOutButton = page.locator('button:has-text("Finalizar Turno")').first();
    
    if (await checkOutButton.isVisible()) {
      console.log('[DEBUG-E2E] 🔘 Botón "Finalizar Turno" encontrado. Haciendo click...');
      await checkOutButton.click();
      
      console.log('[DEBUG-E2E] 🔐 Esperando modal de PIN de salida...');
      const pinModal = page.locator('.saas-modal-content:has-text("Finalizar Turno")');
      await expect(pinModal).toBeVisible();

      console.log('[DEBUG-E2E] ⌨️ Ingresando PIN de salida...');
      await page.fill('.saas-modal-content input[type="password"]', '1234');
      
      console.log('[DEBUG-E2E] 🔘 Confirmando PIN...');
      await page.click('.saas-modal-content button:has-text("Confirmar")');

      console.log('[DEBUG-E2E] ⏳ Esperando notificación de éxito de salida...');
      await expect(page.locator('text=Turno finalizado')).toBeVisible({ timeout: 5000 });
      console.log('[DEBUG-E2E] ✅ Check-Out completado con éxito.');
    } else {
      console.log('[DEBUG-E2E] ⚠️ No hay meseros en turno para probar Check-Out.');
    }
  });
});
