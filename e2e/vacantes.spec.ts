import { expect, test } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

/**
 * Flujo de vacantes de punta a punta contra el backend real (Docker):
 * quien contrata publica → al trabajador cercano le llega el mensaje emergente y se postula → quien contrata
 * ve a los postulados por viabilidad y lo contrata → el trabajador recibe el aviso con el botón «¿Puedes
 * asistir?» y confirma → termina el trabajo → quien contrata presiona «Finalizar» y registra el pago a mano
 * (paga menos de lo acordado, así que debe justificarlo) → el trabajador ve el pago.
 * La hora de fin se adelanta en la base (docker exec psql) para no esperar a que termine la jornada.
 * Requisitos: backend en Docker con scripts/seed-demo.sh en co. Capturas en docs/evidencias/vacantes.
 */

const PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo12345';
const PG_USER = process.env.POSTGRES_USER ?? 'jornalAdmin';
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

async function auth(request: APIRequestContext, email: string) {
  const login = await request.post('/api/co/auth/login', { data: { email, password: PASSWORD } });
  const { accessToken } = await login.json();
  return { Authorization: `Bearer ${accessToken}` };
}

/** Ubicación base del trabajador en el centro de Bogotá, con radio de 10 km (para recibir el aviso). */
async function workerNearCenter(request: APIRequestContext) {
  const headers = await auth(request, 'trabajador@co.jornal.test');
  const cats = await (await request.get('/api/co/categories?q=warehouse', { headers })).json();
  await request.put('/api/co/workers/me', {
    headers, data: { bio: 'Bodega', workRadiusKm: 10, categoryIds: [cats[0].id], baseLatitude: 4.65, baseLongitude: -74.08 },
  });
}

/** Pago a mano para esta prueba (el pago automático lo cubre scripts/demo-vacantes.sh del backend). */
async function manualPayout(request: APIRequestContext) {
  const headers = await auth(request, 'cliente@co.jornal.test');
  await request.put('/api/co/vacancies/settings', { headers, data: { autoPayout: false } });
}

function endWork(vacancyId: string) {
  execSync(`docker exec jornal-postgres-1 psql -U ${PG_USER} -d jornal_co -c "UPDATE vacancies SET starts_at = now() - interval '9 hours', ends_at = now() - interval '1 hour' WHERE id = '${vacancyId}'"`);
}

test('vacante: publicar, aviso cercano, contratar, confirmar asistencia, finalizar y pagar', async ({ context, request }) => {
  await workerNearCenter(request);
  await manualPayout(request);

  const worker = await context.newPage();
  await signIn(worker, 'trabajador@co.jornal.test');
  await worker.waitForTimeout(1500);   // WebSocket conectado
  await worker.screenshot({ path: `${OUT}/01-trabajador-inicio.png`, fullPage: true });

  // Quien contrata publica una vacante de bodega por 3 días para 2 personas, con implementos
  const boss = await context.newPage();
  await signIn(boss, 'cliente@co.jornal.test');
  await boss.screenshot({ path: `${OUT}/02-empresa-inicio.png`, fullPage: true });
  await boss.getByTestId('new-vacancy').click();
  await boss.locator('.tw-chip', { hasText: 'Bodega' }).first().click();
  await boss.locator('#vac-desc').fill('Conteo de inventario y organización de estibas en la bodega principal.');
  await boss.locator('#vac-req').fill('Botas de seguridad');
  await boss.locator('#vac-req').press('Enter');
  await boss.getByLabel(/Personas requeridas/).fill('2');
  await boss.locator('.tw-chip', { hasText: '3 días' }).click();
  await boss.getByTestId('use-profile-address').click();   // dirección del perfil con un toque
  await boss.screenshot({ path: `${OUT}/03-publicar.png`, fullPage: true });
  await boss.getByTestId('publish').click();
  await boss.waitForURL(/\/vacantes\/[0-9a-f-]{36}$/);
  const vacancyUrl = boss.url();
  const vacancyId = vacancyUrl.split('/').pop()!;

  // Mensaje emergente al trabajador cercano (llega por WebSocket) y se postula
  const alert = worker.getByRole('dialog');
  await expect(alert).toBeVisible({ timeout: 30_000 });
  await worker.screenshot({ path: `${OUT}/04-alerta.png` });
  await alert.getByTestId('alert-apply').click();
  await expect(alert).toHaveCount(0);

  // Quien contrata ve al postulado (ordenado por viabilidad) y lo contrata
  const applicant = boss.getByTestId('applicant').first();
  await expect(applicant).toBeVisible();
  await boss.screenshot({ path: `${OUT}/05-postulados.png`, fullPage: true });
  await applicant.locator('input[type=checkbox]').check();
  await boss.getByTestId('select').click();
  await expect(boss.getByTestId('hired').first()).toContainText('Pendiente de confirmar asistencia');

  // Aviso al trabajador con el botón «¿Puedes asistir?» y confirma
  await worker.goto('/mensajes');
  // El aviso de esta vacante (puede haber otros de corridas anteriores)
  const notice = worker.locator('li').filter({ has: worker.locator(`a[href="/vacantes/${vacancyId}"]`) })
    .filter({ has: worker.getByTestId('attendance-inbox') });
  const attend = notice.getByTestId('attendance-inbox');
  await expect(attend).toBeVisible({ timeout: 30_000 });
  await worker.screenshot({ path: `${OUT}/06-contratado-mensaje.png`, fullPage: true });
  await attend.getByRole('button', { name: 'Sí, asistiré' }).click();
  await expect(notice).toHaveCount(0);
  await worker.goto(vacancyUrl);
  await expect(worker.locator('.tw-banner.ok')).toContainText('Asistencia confirmada');
  await worker.screenshot({ path: `${OUT}/07-trabajador-confirmado.png`, fullPage: true });

  // Termina el trabajo: quien contrata ve los botones Finalizar y Cancelar por persona
  await expect(boss.getByTestId('hired').first()).toContainText('Asistencia confirmada');
  endWork(vacancyId);
  await boss.reload();
  await expect(boss.getByTestId('complete-work')).toBeVisible();
  await expect(boss.getByTestId('cancel-work')).toBeVisible();
  await boss.screenshot({ path: `${OUT}/08-por-cerrar.png`, fullPage: true });
  await boss.getByTestId('complete-work').click();

  // Pago a mano: pagar menos exige justificación
  await boss.getByTestId('pay-manual').click();
  const form = boss.getByTestId('payment-form');
  await form.locator('input[type=number]').fill('200000');
  await expect(form.getByTestId('confirm-pay')).toBeDisabled();
  await form.locator('textarea').fill('Llegó una hora tarde el segundo día');
  await boss.screenshot({ path: `${OUT}/09-pago-a-mano.png`, fullPage: true });
  await form.getByTestId('confirm-pay').click();
  await expect(boss.getByTestId('hired').first()).toContainText('Pagado');

  // Registro: pestaña de pagos
  await boss.goto('/registro');
  await boss.locator('.tw-segments button', { hasText: 'Pagos' }).click();
  await expect(boss.getByTestId('payout').first()).toBeVisible();
  await boss.screenshot({ path: `${OUT}/10-registro-pagos.png`, fullPage: true });

  // Configuración: botón de pago automático
  await boss.goto('/profile');
  await expect(boss.getByTestId('payment-settings')).toBeVisible();
  await boss.getByTestId('payment-settings').screenshot({ path: `${OUT}/11-configuracion-pago.png` });

  // El trabajador ve el pago y la nota del empleador
  await worker.goto(vacancyUrl);
  await expect(worker.locator('.tw-banner.ok')).toContainText('Se le realizó el pago');
  await worker.screenshot({ path: `${OUT}/12-trabajador-pagado.png`, fullPage: true });

  // Cambio de idioma: la interfaz y el contenido de la vacante (escrito en español) pasan a inglés
  await worker.goto('/profile');
  const saved = worker.waitForResponse((r) => r.url().endsWith('/users/me') && r.request().method() === 'PATCH');
  await worker.getByLabel('Idioma').selectOption('en-US');
  await saved;   // el idioma queda guardado en el perfil antes de recargar
  await worker.goto(vacancyUrl);
  await expect(worker.getByTestId('translated-note')).toContainText('Automatically translated from Spanish', { timeout: 60_000 });
  await expect(worker.locator('.tw-paragraph').first()).not.toContainText('organización de estibas');
  await worker.screenshot({ path: `${OUT}/13-trabajador-en-ingles.png`, fullPage: true });
  await worker.goto('/profile');
  await worker.getByLabel('Language').selectOption('es-CO');
});
