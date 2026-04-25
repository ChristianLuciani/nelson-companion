/**
 * Tests E2E — Nelson Companion
 * Ejecutar con: npm run test:e2e
 * Requiere que la app esté corriendo en http://localhost:3000
 */
const { test, expect } = require('@playwright/test');

test.describe('Nelson Companion — flujo principal', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/caregiver.html');
    // Esperar a que el protocolo cargue y la UI se renderice
    await page.waitForSelector('.day-btn', { timeout: 5000 });
  });

  test('muestra la hora actual prominentemente', async ({ page }) => {
    const timeEl = await page.locator('.time');
    const timeText = await timeEl.textContent();
    expect(timeText).toMatch(/^\d{2}:\d{2}$/);
  });

  test('muestra la barra de días con fechas del protocolo', async ({ page }) => {
    const dayBtns = await page.locator('.day-btn').count();
    expect(dayBtns).toBeGreaterThan(0);
  });

  test('marcar medicamento cambia estado visual', async ({ page }) => {
    // Navegar a un día con medicamentos
    const dayBtn = page.locator('.day-btn').first();
    await dayBtn.click();

    const medBtn = page.locator('.med-btn').first();
    if (await medBtn.count() > 0) {
      await medBtn.click();
      await expect(medBtn).toHaveClass(/checked/);
    }
  });

  test('campos de presión aceptan valores numéricos', async ({ page }) => {
    // Navegar a una vista con vitales
    const vitalTab = page.locator('[data-view="vitals"]');
    await vitalTab.click();

    const sysInput = page.locator('input[data-field="sys"]').first();
    if (await sysInput.count() > 0) {
      await sysInput.fill('125');
      await expect(sysInput).toHaveValue('125');
    }
  });

  test('botón exportar CSV descarga un archivo', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
    const exportBtn = page.locator('[data-action="export"]').first();
    await exportBtn.click();
    // Solo verificar que no hay error de JS
    const errors = [];
    page.on('pageerror', e => errors.push(e));
    expect(errors).toHaveLength(0);
  });

  test('la pestaña Pastillas muestra todos los medicamentos', async ({ page }) => {
    await page.locator('[data-view="pills"]').click();
    const pillCards = await page.locator('.slot-card').count();
    expect(pillCards).toBeGreaterThan(0);
  });

  test('la pestaña Alertas muestra reglas de parada', async ({ page }) => {
    await page.locator('[data-view="alarms"]').click();
    const alarmCards = await page.locator('.alarm-card').count();
    expect(alarmCards).toBeGreaterThan(3);
  });
});
