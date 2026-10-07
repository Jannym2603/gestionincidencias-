import { test, expect, type Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
    await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        url.host = '127.0.0.1:4310';
        await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
    });
    const response = await page.request.post('http://127.0.0.1:4310/api/auth/login', {
        data: { correo: 'admin@fixture.invalid', password: 'fixture-password' },
    });
    expect(response.ok()).toBeTruthy();
    const session = await response.json();
    await page.goto('/login');
    await page.evaluate((value) => sessionStorage.setItem('usuarioSistema', JSON.stringify(value)), session);
    await page.goto('/dashboard');
    await expect(page.locator('#protected-app')).toBeVisible();
}

test('desktop: el encabezado colapsa y el logo GI expande el rail', async ({ page }) => {
    await loginAsAdmin(page);
    const sidebar = page.locator('#sidebar');
    const toggle = page.locator('#sidebar-toggle');

    await expect(page.locator('#sidebar-toggle')).toHaveCount(1);
    await expect(sidebar).toHaveCSS('width', '232px');
    await expect(page.locator('.logo-icon')).toHaveCSS('width', '42px');
    await expect(sidebar.getByText('Gestión de Incidencias')).toBeVisible();
    expect(await sidebar.locator('.sidebar-brand-copy > strong').evaluate((title) => title.scrollWidth <= title.clientWidth)).toBeTruthy();
    await expect(toggle).toHaveAttribute('aria-label', 'Ocultar barra lateral');
    await page.locator('.sidebar-collapse-icon:not(.sidebar-collapse-icon-open)').click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).not.toHaveAttribute('title');
    await expect(sidebar).toHaveCSS('width', '70px');
    await expect(page.locator('.logo-icon')).toHaveCSS('width', '42px');
    await expect(sidebar.locator('.sidebar-brand-copy')).toHaveCSS('opacity', '0');
    await expect(sidebar.locator('.sidebar-collapse-icon:not(.sidebar-collapse-icon-open)')).toBeHidden();
    const sidebarBox = await sidebar.boundingBox();
    const logoBox = await page.locator('.logo-icon').boundingBox();
    expect(sidebarBox && logoBox).toBeTruthy();
    expect(Math.abs((logoBox!.x + logoBox!.width / 2) - (sidebarBox!.x + sidebarBox!.width / 2))).toBeLessThanOrEqual(1);
    await expect(page.locator('.sidebar-collapse-icon-open')).toBeHidden();
    expect(await page.getByRole('link', { name: 'Tickets' }).evaluate((link) => getComputedStyle(link, '::before').content)).not.toBe('none');

    await page.locator('.logo-icon').click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(sidebar).toHaveCSS('width', '232px');

    await page.getByRole('link', { name: 'Tickets' }).click();
    await expect(page).toHaveURL(/\/tickets$/);
    await expect(sidebar).toHaveCSS('width', '232px');
    await page.getByRole('link', { name: 'Proyectos' }).click();
    await expect(page).toHaveURL(/\/proyectos$/);
    await expect(sidebar).toHaveCSS('width', '232px');
    await page.locator('.sidebar-collapse-icon:not(.sidebar-collapse-icon-open)').click();
    await expect(sidebar).toHaveCSS('width', '70px');
    await page.locator('.logo-icon').click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(sidebar).toHaveCSS('width', '232px');
});

test('móvil: el branding conserva el control y el menú no cubre el contenido', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    const sidebar = page.locator('#sidebar');
    const toggle = page.locator('#sidebar-toggle');

    await expect(sidebar).toHaveCSS('position', 'relative');
    await expect(sidebar.locator('.menu')).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-label', 'Abrir navegación');
    await expect(sidebar.locator('.menu')).toBeHidden();
    await expect(page.locator('.main-content')).toBeVisible();
    await page.locator('.logo-icon').click();
    await expect(sidebar.locator('.menu')).toBeVisible();

    await page.getByRole('link', { name: 'Tickets' }).click();
    await expect(page).toHaveURL(/\/tickets$/);
    await expect(sidebar.locator('.menu')).toBeVisible();
});
