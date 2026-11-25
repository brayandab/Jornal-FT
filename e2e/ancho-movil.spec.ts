import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Sin scroll horizontal a 360 y 390 px en las pantallas de cada rol y en idiomas de textos largos
 * (francés y portugués) y japonés. Requisitos: backend en Docker y scripts/seed-demo.sh en co.
 */

const PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo12345';
const LOCALES = ['es-CO', 'fr-FR', 'pt-BR', 'ja-JP'];

async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto('/start');
  await page.locator('.country', { hasText: 'COP' }).first().click();
  await page.locator('button.btn.primary').click();
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.locator('form button.btn.primary').click();
  await page.waitForURL((u) => u.pathname === '/');
}

async function setLocale(page: Page, locale: string) {
  await page.evaluate((l) => {
    const raw = sessionStorage.getItem('trabajoya.session');
    const s = raw ? JSON.parse(raw) : {};
    sessionStorage.setItem('trabajoya.session', JSON.stringify({ ...s, locale: l }));
  }, locale);
}

/** Elementos visibles cuyo borde derecho pasa el ancho de la ventana. */
async function overflow(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const out: string[] = [];
    if (document.documentElement.scrollWidth > w) out.push(`documento: ${document.documentElement.scrollWidth}px`);
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= w + 1) return;
      // Se permiten los contenedores con scroll horizontal propio (chips, tablas, barra de avance).
      for (let p: Element | null = el; p; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (p !== el && (ox === 'auto' || ox === 'scroll' || ox === 'hidden')) return;
      }
      out.push(`${el.tagName.toLowerCase()}.${(el as HTMLElement).className || ''} → ${Math.round(r.right)}px`);
    });
    return out.slice(0, 8);
  });
}

const SCREENS: Record<string, string[]> = {
  cliente: ['/', '/vacantes/nueva', '/registro', '/mensajes', '/profile'],
  trabajador: ['/', '/mapa', '/trabajos', '/mensajes', '/profile'],
  admin: ['/', '/admin/users', '/admin/categories', '/admin/region', '/admin/billing'],
};
const USERS: Record<string, [string, string?]> = {
  cliente: ['cliente@co.jornal.test'],
  trabajador: ['trabajador@co.jornal.test'],
  admin: ['admin@co.jornal.test', 'Admin12345'],
};

for (const width of [360, 390]) {
  for (const role of Object.keys(SCREENS)) {
    test(`${role} sin scroll horizontal a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await signIn(page, USERS[role][0], USERS[role][1]);
      const problems: string[] = [];
      for (const locale of LOCALES) {
        await setLocale(page, locale);
        for (const path of SCREENS[role]) {
          await page.goto(path);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(400);
          const found = await overflow(page);
          if (found.length) problems.push(`${locale} ${path}: ${found.join(' | ')}`);
        }
      }
      // También el inicio de sesión y la pantalla de país
      expect(problems).toEqual([]);
    });
  }
}

test('pantallas sin sesión sin scroll horizontal a 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ['/start', '/login', '/register']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await overflow(page)).toEqual([]);
  }
});
