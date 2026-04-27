/**
 * Tests E2E — Nelson Companion
 * Ejecutar con: npm run test:e2e  (requiere app en localhost:3000)
 *
 * Nota: los tests fijan la fecha a 2026-04-26 (dentro del protocolo activo)
 * para garantizar consistencia independientemente de cuándo se corran.
 */
const { test, expect } = require('@playwright/test');

// ── Helpers ───────────────────────────────────────────────────────────────

/** Inyecta Date mockeada a una hora concreta y limpia localStorage. */
function fixDate(hour = 9, minute = 0) {
  return async ({ page }, use) => {
    await page.addInitScript(({ h, m }) => {
      const FIXED = new Date(2026, 3, 26, h, m, 0); // 2026-04-26
      const Orig  = Date;
      class MockDate extends Orig {
        constructor(...args) { super(...(args.length ? args : [FIXED.getTime()])); }
        static now()        { return FIXED.getTime(); }
        static parse(s)     { return Orig.parse(s); }
        static UTC(...args) { return Orig.UTC(...args); }
      }
      window.Date = MockDate;
    }, { h: hour, m: minute });
    await use();
  };
}

/** Marca slots anteriores al vital (08:30) como completados en localStorage. */
async function markPreVitalDone(page) {
  await page.evaluate(() => {
    localStorage.setItem('nc_checks', JSON.stringify({
      '20260426_0730_0': true,  // photo slot
      '20260426_0800_0': true,  // med slot (amlodipino)
    }));
  });
}

// ── CAREGIVER — caregiver.html ────────────────────────────────────────────

test.describe('Caregiver — dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Fecha fija para reproducibilidad
      const FIXED = new Date(2026, 3, 26, 10, 0, 0);
      const Orig  = Date;
      class MockDate extends Orig {
        constructor(...args) { super(...(args.length ? args : [FIXED.getTime()])); }
        static now()        { return FIXED.getTime(); }
        static parse(s)     { return Orig.parse(s); }
        static UTC(...args) { return Orig.UTC(...args); }
      }
      window.Date = MockDate;
      localStorage.clear();
    });
    await page.goto('/caregiver.html');
    await page.waitForSelector('.cg-nav-btn', { timeout: 8000 });
  });

  // ── Sidebar ────────────────────────────────────────────────────
  test('sidebar muestra los 6 tabs de navegación', async ({ page }) => {
    const tabs = ['overview', 'compliance', 'bp', 'notes', 'stoprules', 'schedule'];
    for (const tab of tabs) {
      // Scope to sidebar para evitar colisión con shortcuts en el contenido
      await expect(
        page.locator(`.cg-sidebar [data-action="setTab"][data-tab="${tab}"]`)
      ).toBeVisible();
    }
  });

  test('nombre del paciente y diagnóstico visibles en sidebar', async ({ page }) => {
    const sidebar = page.locator('.cg-sidebar');
    await expect(sidebar).toContainText('Nelson Luciani');
    await expect(sidebar).toContainText('ACV x2');
  });

  // ── Tab: Resumen (overview) ────────────────────────────────────
  test('tab overview muestra KPIs de cumplimiento y presión', async ({ page }) => {
    const html = await page.locator('.cg-main').innerHTML();
    expect(html).toContain('Cumplimiento');
    expect(html).toContain('Última presión');
  });

  // ── Tab: Cumplimiento ──────────────────────────────────────────
  test('tab compliance muestra tabla con 7 filas', async ({ page }) => {
    await page.click('[data-action="setTab"][data-tab="compliance"]');
    await page.waitForSelector('.comp-table');
    const rows = page.locator('.comp-table tbody tr');
    await expect(rows).toHaveCount(7);
  });

  test('compliance muestra las 4 columnas de ejes', async ({ page }) => {
    await page.click('[data-action="setTab"][data-tab="compliance"]');
    await page.waitForSelector('.comp-table');
    const headers = await page.locator('.comp-table thead th').allTextContents();
    expect(headers.some(h => /Meds/i.test(h))).toBe(true);
    expect(headers.some(h => /PA/i.test(h))).toBe(true);
    expect(headers.some(h => /Caminar/i.test(h))).toBe(true);
    expect(headers.some(h => /Comida/i.test(h))).toBe(true);
  });

  // ── Tab: Presión arterial ──────────────────────────────────────
  test('tab bp muestra 4 KPIs (incluyendo SpO₂)', async ({ page }) => {
    await page.click('[data-action="setTab"][data-tab="bp"]');
    await page.waitForSelector('.kpi-grid');
    const kpis = page.locator('.kpi-card');
    await expect(kpis).toHaveCount(4);
    const html = await page.locator('.cg-main').innerHTML();
    expect(html).toContain('SpO₂');
  });

  test('tab bp muestra mensaje de sin lecturas cuando no hay vitales', async ({ page }) => {
    await page.click('[data-action="setTab"][data-tab="bp"]');
    await page.waitForSelector('.card');
    const html = await page.locator('.cg-main').innerHTML();
    expect(html).toContain('Sin suficientes lecturas');
  });

  // ── Tab: Notas ─────────────────────────────────────────────────
  test('tab notes muestra el formulario de nueva observación', async ({ page }) => {
    await page.click('[data-action="setTab"][data-tab="notes"]');
    await page.waitForSelector('#note-draft');
    await expect(page.locator('#note-draft')).toBeVisible();
    await expect(page.locator('[data-action="saveNote"]')).toBeVisible();
  });

  test('guardar una nota la muestra en la lista', async ({ page }) => {
    await page.click('[data-action="setTab"][data-tab="notes"]');
    await page.waitForSelector('#note-draft');
    await page.fill('#note-draft', 'Nelson estuvo de buen ánimo esta tarde.');
    await page.click('[data-action="saveNote"]');
    await expect(page.locator('.note-item')).toBeVisible();
    await expect(page.locator('.note-text')).toContainText('buen ánimo');
  });

  test('cambiar categoría de nota la resalta', async ({ page }) => {
    await page.click('[data-action="setTab"][data-tab="notes"]');
    await page.waitForSelector('[data-action="noteCategory"]');
    await page.click('[data-action="noteCategory"][data-cat="Sueño"]');
    await expect(
      page.locator('[data-action="noteCategory"][data-cat="Sueño"]')
    ).toHaveClass(/active/);
  });

  // ── Tab: Reglas de parada ──────────────────────────────────────
  test('tab stoprules muestra al menos 5 reglas de emergencia', async ({ page }) => {
    await page.click('[data-action="setTab"][data-tab="stoprules"]');
    await page.waitForSelector('.stop-rule');
    const rules = page.locator('.stop-rule');
    await expect(rules).toHaveCount(7);
  });

  test('stoprules menciona los umbrales clave de PA y pulso', async ({ page }) => {
    await page.click('[data-action="setTab"][data-tab="stoprules"]');
    await page.waitForSelector('.stop-rule');
    const html = await page.locator('.cg-main').innerHTML();
    expect(html).toContain('95/60');
    expect(html).toContain('40 bpm');
    expect(html).toContain('170/105');
  });

  // ── Tab: Agenda de mañana ──────────────────────────────────────
  test('tab schedule muestra slots del día siguiente', async ({ page }) => {
    await page.click('[data-action="setTab"][data-tab="schedule"]');
    await page.waitForSelector('.schedule-row, .schedule-list, [data-action="copyToday"]');
    await expect(page.locator('[data-action="copyToday"]')).toBeVisible();
    await expect(page.locator('[data-action="saveSchedule"]')).toBeVisible();
  });

  test('copyToday muestra toast de confirmación', async ({ page }) => {
    await page.click('[data-action="setTab"][data-tab="schedule"]');
    await page.waitForSelector('[data-action="copyToday"]');
    await page.click('[data-action="copyToday"]');
    await expect(page.locator('#nc-toast')).toBeVisible();
  });

  test('saveSchedule muestra toast de confirmación', async ({ page }) => {
    await page.click('[data-action="setTab"][data-tab="schedule"]');
    await page.waitForSelector('[data-action="saveSchedule"]');
    await page.click('[data-action="saveSchedule"]');
    await expect(page.locator('#nc-toast')).toBeVisible();
  });

  // ── Selector de tema ───────────────────────────────────────────
  test('click en dot "clinical" cambia el tema de la app', async ({ page }) => {
    await page.click('[data-action="setTheme"][data-theme="clinical"]');
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe('clinical');
  });

  test('click en dot "high-contrast" cambia el tema', async ({ page }) => {
    await page.click('[data-action="setTheme"][data-theme="high-contrast"]');
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe('high-contrast');
  });

  test('el tema se persiste en localStorage', async ({ page }) => {
    await page.click('[data-action="setTheme"][data-theme="clinical"]');
    const stored = await page.evaluate(() => localStorage.getItem('nc_theme'));
    expect(stored).toBe('clinical');
  });

  // ── Export CSV ─────────────────────────────────────────────────
  test('botón exportar CSV no lanza errores de JS', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.click('[data-action="export"]');
    await page.waitForTimeout(300);
    expect(errors).toHaveLength(0);
  });

  // ── Imprimir ───────────────────────────────────────────────────
  test('botón imprimir establece data-print-date en body', async ({ page }) => {
    await page.click('[data-action="print"]');
    const printDate = await page.evaluate(() => document.body.dataset.printDate);
    expect(printDate).toBeTruthy();
  });
});

// ── PATIENT — patient.html ────────────────────────────────────────────────

test.describe('Patient — vista de Nelson', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Fecha fija: 2026-04-26 09:00 — el slot vital de 08:30 está dentro de la ventana
      const FIXED = new Date(2026, 3, 26, 9, 0, 0);
      const Orig  = Date;
      class MockDate extends Orig {
        constructor(...args) { super(...(args.length ? args : [FIXED.getTime()])); }
        static now()        { return FIXED.getTime(); }
        static parse(s)     { return Orig.parse(s); }
        static UTC(...args) { return Orig.UTC(...args); }
      }
      window.Date = MockDate;
      localStorage.clear();
    });
  });

  // ── Header y carga ─────────────────────────────────────────────
  test('muestra el banner de voz en carga inicial', async ({ page }) => {
    await page.goto('/patient.html');
    await page.waitForSelector('.p-voice-banner', { timeout: 8000 });
    await expect(page.locator('.p-voice-banner')).toBeVisible();
    await expect(page.locator('.p-voice-banner')).toContainText('Activar voz');
  });

  test('header muestra la hora en formato HH:MM', async ({ page }) => {
    await page.goto('/patient.html');
    await page.waitForSelector('.p-time', { timeout: 8000 });
    const timeText = await page.locator('.p-time').textContent();
    expect(timeText).toMatch(/^\d{2}:\d{2}$/);
  });

  test('header muestra la fecha del día', async ({ page }) => {
    await page.goto('/patient.html');
    await page.waitForSelector('.p-date', { timeout: 8000 });
    const dateText = await page.locator('.p-date').textContent();
    expect(dateText).toMatch(/Dom|Lun|Mar|Mié|Jue|Vie|Sáb/);
  });

  test('renderiza una tarea (card de slot)', async ({ page }) => {
    await page.goto('/patient.html');
    await page.waitForSelector('.p-task-area', { timeout: 8000 });
    await expect(page.locator('.p-task-area')).toBeVisible();
  });

  test('botón SOS es siempre visible', async ({ page }) => {
    await page.goto('/patient.html');
    await page.waitForSelector('.p-sos-btn', { timeout: 8000 });
    await expect(page.locator('.p-sos-btn')).toBeVisible();
  });

  test('click en SOS abre el modal de emergencia', async ({ page }) => {
    await page.goto('/patient.html');
    await page.waitForSelector('.p-sos-btn', { timeout: 8000 });
    await page.click('.p-sos-btn');
    await expect(page.locator('.p-sos-overlay')).toBeVisible();
    await expect(page.locator('.p-sos-overlay')).toContainText('Christian');
  });

  test('cerrar SOS oculta el modal', async ({ page }) => {
    await page.goto('/patient.html');
    await page.waitForSelector('.p-sos-btn', { timeout: 8000 });
    await page.click('.p-sos-btn');
    await page.waitForSelector('.p-sos-overlay');
    await page.click('[data-action="sosClose"]');
    await expect(page.locator('.p-sos-overlay')).not.toBeVisible();
  });

  // ── BP stepper ─────────────────────────────────────────────────
  test.describe('BP stepper — flujo completo', () => {
    test.beforeEach(async ({ page }) => {
      // Marcar slots previos al vital (08:30) como completados
      await page.addInitScript(() => {
        const checks = {
          '20260426_0730_0': true,  // photo
          '20260426_0800_0': true,  // med (amlodipino)
        };
        localStorage.setItem('nc_checks', JSON.stringify(checks));
      });
    });

    test('renderiza pantalla intro del BP con "YA LO TENGO"', async ({ page }) => {
      await page.goto('/patient.html');
      await page.waitForSelector('[data-action="bpNext"]', { timeout: 8000 });
      await expect(page.locator('[data-action="bpNext"]')).toContainText('YA LO TENGO');
    });

    test('intro → sys al click en YA LO TENGO', async ({ page }) => {
      await page.goto('/patient.html');
      await page.waitForSelector('[data-action="bpNext"]', { timeout: 8000 });
      await page.click('[data-action="bpNext"]');
      await expect(page.locator('.p-bp-label-main')).toContainText('Número de arriba');
    });

    test('ajustador +10 incrementa el valor de sys', async ({ page }) => {
      await page.goto('/patient.html');
      await page.waitForSelector('[data-action="bpNext"]', { timeout: 8000 });
      await page.click('[data-action="bpNext"]'); // → sys
      const before = parseInt(await page.locator('#bp-value-display').textContent());
      await page.click('[data-action="bpAdj"][data-delta="10"]');
      const after = parseInt(await page.locator('#bp-value-display').textContent());
      expect(after).toBe(before + 10);
    });

    test('avanza sys → dia → pul → spo2 en clicks sucesivos', async ({ page }) => {
      await page.goto('/patient.html');
      await page.waitForSelector('[data-action="bpNext"]', { timeout: 8000 });

      await page.click('[data-action="bpNext"]'); // intro → sys
      await expect(page.locator('.p-bp-label-main')).toContainText('Número de arriba');

      await page.click('[data-action="bpNext"]'); // sys → dia
      await expect(page.locator('.p-bp-label-main')).toContainText('Número de abajo');

      await page.click('[data-action="bpNext"]'); // dia → pul
      await expect(page.locator('.p-bp-label-main')).toContainText('Pulso');

      await page.click('[data-action="bpNext"]'); // pul → spo2
      await expect(page.locator('.p-bp-label-main')).toContainText('Oxígeno en sangre');
    });

    test('SALTAR en spo2 avanza a confirm sin mostrar SpO₂', async ({ page }) => {
      await page.goto('/patient.html');
      await page.waitForSelector('[data-action="bpNext"]', { timeout: 8000 });
      // intro → sys → dia → pul → spo2
      for (let i = 0; i < 4; i++) await page.click('[data-action="bpNext"]');
      await page.waitForSelector('[data-action="bpSpo2Skip"]');
      await page.click('[data-action="bpSpo2Skip"]');
      // Confirm screen
      await expect(page.locator('[data-action="listo"]')).toContainText('GUARDAR');
      const html = await page.locator('.p-task-area').innerHTML();
      expect(html).not.toContain('SpO₂:');
    });

    test('confirm con SpO₂ muestra el porcentaje', async ({ page }) => {
      await page.goto('/patient.html');
      await page.waitForSelector('[data-action="bpNext"]', { timeout: 8000 });
      // intro → sys → dia → pul → spo2
      for (let i = 0; i < 4; i++) await page.click('[data-action="bpNext"]');
      await page.waitForSelector('[data-action="bpNext"]');
      await page.click('[data-action="bpNext"]'); // spo2 → confirm
      await expect(page.locator('[data-action="listo"]')).toContainText('GUARDAR');
      const html = await page.locator('.p-task-area').innerHTML();
      expect(html).toContain('SpO₂:');
      expect(html).toContain('%');
    });

    test('Volver a escribir regresa al paso sys', async ({ page }) => {
      await page.goto('/patient.html');
      await page.waitForSelector('[data-action="bpNext"]', { timeout: 8000 });
      for (let i = 0; i < 4; i++) await page.click('[data-action="bpNext"]');
      await page.click('[data-action="bpSpo2Skip"]');
      await page.waitForSelector('[data-action="bpRedo"]');
      await page.click('[data-action="bpRedo"]');
      await expect(page.locator('.p-bp-label-main')).toContainText('Número de arriba');
    });

    test('GUARDAR en confirm muestra pantalla de éxito', async ({ page }) => {
      await page.goto('/patient.html');
      await page.waitForSelector('[data-action="bpNext"]', { timeout: 8000 });
      for (let i = 0; i < 4; i++) await page.click('[data-action="bpNext"]');
      await page.click('[data-action="bpSpo2Skip"]');
      await page.waitForSelector('[data-action="listo"]');
      await page.click('[data-action="listo"]');
      await expect(page.locator('.p-done-title')).toBeVisible();
      await expect(page.locator('.p-done-title')).toContainText('Nelson');
    });
  });

  // ── Slot de medicamento ────────────────────────────────────────
  test('slot de medicamento muestra el nombre y dosis', async ({ page }) => {
    // addInitScript se ejecuta en orden: primero el de beforeEach (clear + Date),
    // luego este. Ambos corren ANTES de que patient.html ejecute su JS,
    // así que nc_checks queda seteado cuando el módulo lo lee.
    await page.addInitScript(() => {
      localStorage.setItem('nc_checks', JSON.stringify({ '20260426_0730_0': true }));
    });
    await page.goto('/patient.html');
    await page.waitForSelector('.p-task-area', { timeout: 8000 });
    await expect(page.locator('.p-task-area')).toContainText('Amlodipino');
  });

  // ── Sin protocolo ──────────────────────────────────────────────
  test('navegación de regreso a index con link cambiar modo', async ({ page }) => {
    await page.goto('/patient.html');
    await page.waitForSelector('.p-switch-mode', { timeout: 8000 });
    await expect(page.locator('.p-switch-mode')).toHaveAttribute('href', /index\.html/);
  });
});

// ── INDEX — selector de modo ──────────────────────────────────────────────

test.describe('Index — selector de modo', () => {
  // Bloquear SW para que page.route() pueda interceptar las navegaciones
  // sin que el SW instalado por tests anteriores las sirva desde caché.
  test.use({ serviceWorkers: 'block' });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/index.html');
    await page.waitForSelector('.mode-tile', { timeout: 5000 });
  });

  test('muestra dos tiles: Nelson y cuidador', async ({ page }) => {
    await expect(page.locator('.mode-tile.patient')).toBeVisible();
    await expect(page.locator('.mode-tile.caregiver')).toBeVisible();
  });

  test('click en "Soy Nelson" redirige a patient.html', async ({ page }) => {
    // page.route intercepta antes del SW → evita net::ERR_FAILED
    let capturedUrl = null;
    await page.route('**/patient.html', route => {
      capturedUrl = route.request().url();
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body></body></html>' });
    });
    await page.click('.mode-tile.patient');
    await expect.poll(() => capturedUrl, { timeout: 5000 }).toMatch(/patient\.html/);
  });

  test('click en "Soy cuidador" redirige a caregiver.html', async ({ page }) => {
    let capturedUrl = null;
    await page.route('**/caregiver.html', route => {
      capturedUrl = route.request().url();
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body></body></html>' });
    });
    await page.click('.mode-tile.caregiver');
    await expect.poll(() => capturedUrl, { timeout: 5000 }).toMatch(/caregiver\.html/);
  });

  test('marcar recordar + elegir modo guarda en localStorage', async ({ page }) => {
    await page.check('#remember');
    // Abortar la navegación para quedarnos en index.html y poder leer localStorage.
    // El click handler llama setItem ANTES de location.href, así que el valor ya está.
    await page.route('**/patient.html', route => route.abort());
    await page.click('.mode-tile.patient').catch(() => {});
    const value = await page.evaluate(() => localStorage.getItem('nc_user_type'));
    expect(value).toBe('patient');
  });

  test('sin marcar recordar no persiste en localStorage', async ({ page }) => {
    // Sin remember, el handler llama removeItem — nc_user_type no debe estar en storage.
    await page.route('**/caregiver.html', route => route.abort());
    await page.click('.mode-tile.caregiver').catch(() => {});
    const value = await page.evaluate(() => localStorage.getItem('nc_user_type'));
    expect(value).toBeNull();
  });
});
