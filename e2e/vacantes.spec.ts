import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Flujo de vacantes de punta a punta (capa simulada en el navegador + cuentas reales del backend):
 * la persona que contrata publica una vacante → al trabajador le llega la alerta y se postula →
 * quien contrata ve a los postulados por viabilidad y lo selecciona → el trabajador recibe el aviso con día,
 * hora y lugar → (demo) termina la jornada → quien contrata finaliza y elige el método de pago de cada
 * persona → el trabajador ve el pago. Las dos sesiones son pestañas del mismo navegador (comparten la capa simulada).
 * Requisitos: backend en Docker y scripts/seed-demo.sh en co. Capturas en docs/evidencias/vacantes.
 */

const PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo12345';
const OUT = 'docs/evidencias/vacantes';
mkdirSync(OUT, { recursive: true });

async function signIn(page: Page, email: string) {
  await page.goto('/start');
  await page.locator('.country', { hasText: 'COP' }).first().click();
  await page.locator('button.btn.primary').click();
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(PASSWORD);
  await page.locator('form button.btn.primary').click();
  await page.waitForURL((u) => u.pathname === '/');
  await expect(page.locator('.tw-nav')).toBeVisible();
}

test('vacante: publicar, postularse, seleccionar, finalizar y pagar', async ({ context }) => {
  const worker = await context.newPage();
  await signIn(worker, 'trabajador@co.jornal.test');
  const sw = worker.locator('.tw-availability [role=switch]');
  await expect(sw).toBeVisible();
  if ((await sw.getAttribute('aria-checked')) !== 'true') await sw.click();
  await expect(worker.getByTestId('vacancy-card').first()).toBeVisible(); // vacantes de ejemplo cercanas
  await worker.waitForTimeout(1500);
  await worker.screenshot({ path: `${OUT}/01-trabajador-inicio.png`, fullPage: true });

  // Quien contrata publica una vacante de bodega por 3 días para 2 personas
  const boss = await context.newPage();
  await signIn(boss, 'cliente@co.jornal.test');
  await boss.screenshot({ path: `${OUT}/02-empresa-inicio.png`, fullPage: true });
  await boss.getByTestId('new-vacancy').click();
  await boss.locator('.tw-chip', { hasText: 'Bodega' }).first().click();
  await boss.locator('#vac-desc').fill('Conteo de inventario y organización de estibas en la bodega principal.');
  await boss.locator('#vac-req').fill('Botas de seguridad');
  await boss.locator('#vac-req').press('Enter');
  await boss.getByLabel(/Personas que necesitas/).fill('2');
  await boss.locator('.tw-chip', { hasText: '3 días' }).click();
  await boss.screenshot({ path: `${OUT}/03-publicar.png`, fullPage: true });
  await boss.getByTestId('publish').click();
  await boss.waitForURL(/\/vacantes\/[0-9a-f-]{36}$/);
  const vacancyUrl = boss.url();

  // Al trabajador le llega la alerta de vacante cercana y se postula
  const alert = worker.getByRole('dialog');
  await expect(alert).toBeVisible({ timeout: 30_000 });
  await worker.screenshot({ path: `${OUT}/04-alerta.png` });
  await alert.getByTestId('alert-apply').click();
  await expect(alert).toHaveCount(0);

  // Quien contrata ve a los postulados ordenados por viabilidad y elige al trabajador real
  await boss.reload();
  const real = boss.getByTestId('applicant').filter({ hasNot: boss.locator('.tw-demo') }).first();
  await expect(real).toBeVisible();
  await boss.screenshot({ path: `${OUT}/05-postulados.png`, fullPage: true });
  await real.locator('input[type=checkbox]').check();
  await boss.getByTestId('select').click();
  await expect(boss.getByTestId('finalize')).toBeVisible();
  await expect(boss.getByTestId('finalize')).toBeDisabled(); // aún no termina la última jornada

  // El trabajador ve que lo seleccionaron: día, hora y lugar
  await worker.goto(vacancyUrl);
  await expect(worker.locator('.tw-banner.ok')).toBeVisible();
  await worker.screenshot({ path: `${OUT}/06-seleccionado.png` });

  // Demo: termina la jornada; quien contrata finaliza y elige el método de pago de cada persona
  await boss.getByTestId('demo-end').click();
  await expect(boss.getByTestId('finalize')).toBeEnabled();
  await boss.screenshot({ path: `${OUT}/07-en-proceso.png`, fullPage: true });
  await boss.getByTestId('finalize').click();
  await boss.waitForURL(/\/finalizar$/);
  await boss.locator('.tw-person select').first().selectOption('NEQUI');
  await boss.screenshot({ path: `${OUT}/08-pagar.png`, fullPage: true });
  await boss.getByTestId('pay').click();
  await boss.waitForURL(vacancyUrl);
  await expect(boss.locator('.tw-status.done')).toBeVisible();

  // Registro de quien contrata y pago visto por el trabajador
  await boss.goto('/registro');
  await boss.locator('.tw-segments button').nth(1).click();
  await expect(boss.getByTestId('employer-vacancy').first()).toBeVisible();
  await boss.screenshot({ path: `${OUT}/09-registro.png`, fullPage: true });
  await worker.goto('/mensajes');
  await expect(worker.locator('.tw-offer', { hasText: /Pago recibido/ }).first()).toBeVisible();
  await worker.screenshot({ path: `${OUT}/10-trabajador-mensajes.png`, fullPage: true });
  await worker.goto('/trabajos');
  await worker.locator('.tw-segments button').nth(1).click();
  await worker.screenshot({ path: `${OUT}/11-trabajador-historial.png`, fullPage: true });
});

test('pantallas sin sesión y administrador con el mismo diseño', async ({ page }) => {
  await page.goto('/start');
  await page.screenshot({ path: `${OUT}/12-inicio-pais.png`, fullPage: true });
  await page.locator('.country', { hasText: 'COP' }).first().click();
  await page.locator('button.btn.primary').click();
  await page.screenshot({ path: `${OUT}/13-login.png`, fullPage: true });
  await page.locator('input[type=email]').fill('admin@co.jornal.test');
  await page.locator('input[type=password]').fill('Admin12345');
  await page.locator('form button.btn.primary').click();
  await page.waitForURL((u) => u.pathname === '/');
  await expect(page.locator('.tw-nav')).toBeVisible();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/14-admin-consola.png`, fullPage: true });
});
