import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, role = 'ADMIN') {
    if (!page.url().startsWith('about:')) await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
    await page.goto('/login'); await page.locator('#correo').fill(`${role.toLowerCase()}@fixture.invalid`); await page.locator('#password').fill('fixture-password'); await page.getByRole('button', { name: 'Entrar al sistema' }).click(); await expect(page).toHaveURL(/dashboard/);
}

test('reportes carga resumen, estado, prioridad, tipo, recursos y filtros por compañía/proyecto', async ({ page }) => {
    await login(page); await page.goto('/reportes');
    await expect(page.locator('#report-total-tickets')).toHaveText('3'); await expect(page.locator('#report-operational-total')).toHaveText('2');
    await expect(page.locator('#report-states')).toContainText('NUEVO'); await expect(page.locator('#report-priorities')).toContainText('P2_ALTA'); await expect(page.locator('#report-types')).toContainText('Red');
    await expect(page.locator('#resource-total')).toHaveText('1'); await page.locator('#reports-company').selectOption('1'); await page.locator('#reports-project').selectOption('1');
    await expect(page.locator('#reports-scope')).toContainText('Acme'); await expect(page.locator('#report-summary-title')).toContainText('Portal');
});

test('reportes contempla estado vacío, error API y permisos configurables del backend', async ({ page }) => {
    await login(page); await page.route('**/api/reportes/**', (route) => {
        const url = new URL(route.request().url()); const path = url.pathname;
        if (path.endsWith('/resumen')) return route.fulfill({ json: { totalTickets: 0, totalUsuarios: 0, totalComentarios: 0 } });
        if (path.endsWith('/operacion-resumen')) return route.fulfill({ json: { totalOperativos: 0, ticketsNuevos: 0, ticketsAsignados: 0, ticketsEnProgreso: 0, ticketsResueltos: 0, ticketsCerrados: 0 } });
        if (path.endsWith('/recursos-resumen')) return route.fulfill({ json: { totalSolicitudes: 0, nuevas: 0, enValidacion: 0, solicitadasProveedor: 0, esperandoProveedor: 0, recibidas: 0, entregadas: 0, cerradas: 0, canceladas: 0, retrasadas: 0, proximasEntregas: 0, promedioDiasProveedor: 0 } });
        return route.fulfill({ json: [] });
    });
    await page.goto('/reportes'); await expect(page.locator('#reports-data-status')).toContainText('No hay datos'); await expect(page.locator('#report-states')).toContainText('Sin datos');
    await page.unroute('**/api/reportes/**'); await page.route('**/api/reportes/tickets-por-prioridad**', (route) => route.fulfill({ status: 500, json: { message: 'Fallo de reportes.' } }));
    await page.reload(); await expect(page.locator('#reports-data-status')).toContainText('Fallo de reportes.');
    await page.unroute('**/api/reportes/tickets-por-prioridad**'); await login(page, 'CLIENTE'); await page.route('**/api/reportes/resumen**', (route) => route.fulfill({ status: 403, json: { message: 'Reportes desactivados para CLIENTE.' } }));
    await page.goto('/reportes'); await expect(page.locator('#reports-access-denied')).toContainText('Reportes desactivados');
});

test('configuración muestra perfil, lee flags y guarda/restaura permisos; audita cambios en orden', async ({ page }) => {
    await login(page); await page.goto('/configuracion'); await expect(page.locator('#profile-fields')).toContainText('admin@fixture.invalid');
    await expect(page.locator('#flag-reportesActivos')).toBeChecked(); await expect(page.locator('#settings-modules')).not.toContainText('passwordHash');
    await page.getByRole('button', { name: /Reportes Permite/ }).click(); const clientReports = page.locator('#flag-reportesCliente'); await clientReports.uncheck({ force: true }); await page.getByRole('button', { name: 'Guardar cambios' }).click(); await expect(page.locator('#settings-form-status')).toContainText('guardada');
    await page.getByRole('button', { name: /Reportes Permite/ }).click(); await clientReports.check({ force: true }); await page.getByRole('button', { name: 'Guardar cambios' }).click(); await expect(page.locator('#settings-form-status')).toContainText('guardada');
    await page.goto('/auditoria'); await expect(page.locator('#audit-list .audit-item')).toHaveCount(2); await expect(page.locator('#audit-list .audit-item').first()).toContainText('Reportes · CLIENTE'); await expect(page.locator('#audit-list .audit-item').first()).toContainText('Inactivo'); await expect(page.locator('#audit-list .audit-item').first()).toContainText('Activo');
});

test('configuración muestra validación de actualización API, 401 y acceso ADMIN solamente', async ({ page }) => {
    await login(page); await page.goto('/configuracion'); await page.route('**/api/configuracion-sistema', async (route) => {
        if (route.request().method() !== 'PUT') return route.continue();
        const invalid = route.request().postDataJSON(); invalid.reportesCliente = 'false';
        return route.fulfill({ response: await route.fetch({ postData: JSON.stringify(invalid) }) });
    });
    await page.getByRole('button', { name: /Reportes Permite/ }).click(); await page.locator('#flag-reportesCliente').uncheck({ force: true }); await page.getByRole('button', { name: 'Guardar cambios' }).click(); await expect(page.locator('#settings-form-status')).toContainText('banderas deben ser booleanas');
    await page.unroute('**/api/configuracion-sistema'); await login(page, 'SUPERVISOR'); await page.goto('/configuracion'); await expect(page.locator('#system-settings')).toBeHidden(); await page.goto('/auditoria'); await expect(page.locator('#audit-access-denied')).toContainText('Solo ADMIN');
    await page.route('**/api/configuracion-sistema', (route) => route.fulfill({ status: 401, json: { message: 'Sesión expirada.' } })); await page.goto('/configuracion'); await expect(page).toHaveURL(/\/login/);
});

test('auditoría muestra vacío/error y no ofrece escritura manual', async ({ page }) => {
    await login(page); await page.route('**/api/configuracion-sistema/auditoria', (route) => route.fulfill({ json: [] })); await page.goto('/auditoria'); await expect(page.locator('#audit-list')).toContainText('Todavía no hay cambios'); await expect(page.getByRole('button', { name: /guardar|editar|eliminar/i })).toHaveCount(0);
    await page.unroute('**/api/configuracion-sistema/auditoria'); await page.route('**/api/configuracion-sistema/auditoria', (route) => route.fulfill({ status: 500, json: { message: 'Error de auditoría.' } })); await page.reload(); await expect(page.locator('#audit-status')).toContainText('Error de auditoría.');
});

test('ADMIN y SUPERVISOR generan, copian y revocan enlaces; creación permite regenerar', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']); await login(page); await page.goto('/tickets/100'); await expect(page.locator('#shared-links-section')).toBeVisible();
    await page.locator('#shared-link-email').fill('compartido@fixture.invalid'); await page.getByRole('button', { name: 'Generar enlace' }).click(); await expect(page.locator('#shared-link-created-status')).toContainText('Enlace generado');
    const copied = await page.evaluate(() => navigator.clipboard.readText()); const token = new URL(copied).searchParams.get('token'); expect(token).toBeTruthy();
    const createdRow = page.locator('#shared-links-body tr').filter({ hasText: 'compartido@fixture.invalid' }); await expect(createdRow).toContainText('ACTIVO');
    await page.locator('#shared-link-email').fill('compartido2@fixture.invalid'); await page.getByRole('button', { name: 'Generar enlace' }).click(); await expect(page.locator('#shared-links-body tr').filter({ hasText: 'compartido2@fixture.invalid' })).toContainText('ACTIVO');
    page.on('dialog', (dialog) => dialog.accept()); await createdRow.getByRole('button', { name: 'Revocar' }).click(); await expect(createdRow).toContainText('DESACTIVADO');
    await login(page, 'SUPERVISOR'); await page.goto('/tickets/100'); await expect(page.locator('#shared-links-section')).toBeVisible();
});

test('AGENTE no recibe controles de enlace y la página pública no requiere sesión ni revela datos sensibles', async ({ page }) => {
    await login(page, 'AGENTE'); await page.goto('/tickets/100'); await expect(page.locator('#shared-links-section')).toBeHidden();
    await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
    let authCalls = 0; page.on('request', (request) => { if (request.url().includes('/api/usuarios/me')) authCalls++; });
    await page.goto('/ticket-compartido.html?token=fixture-expired-token'); await expect(page.locator('#public-error-message')).toContainText('expirado'); await expect.poll(() => authCalls).toBe(0);
    await page.goto('/ticket-compartido.html?token=missing-token'); await expect(page.locator('#public-error-message')).toContainText('no existe');
    await page.goto('/ticket-compartido.html?token=fixture-revoked-token'); await expect(page.locator('#public-error-message')).toContainText('desactivado');
});

test('enlace público válido expone solo el DTO de lectura del backend', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']); await login(page); await page.goto('/tickets/100'); await page.locator('#shared-link-email').fill('publico@fixture.invalid'); await page.getByRole('button', { name: 'Generar enlace' }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText()); const token = new URL(copied).searchParams.get('token')!;
    await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); }); await page.goto(`/ticket-compartido.html?token=${encodeURIComponent(token)}`);
    await expect(page.locator('#public-ticket')).toBeVisible(); await expect(page.locator('#public-title')).toHaveText('Revisar red'); await expect(page.locator('#public-agent')).toContainText('Usuario AGENTE');
    const content = await page.locator('body').innerText(); expect(content).not.toContain('publico@fixture.invalid'); expect(content).not.toContain(token); expect(content).not.toContain('passwordHash'); expect(content).not.toContain('evidencia.txt'); expect(content).not.toContain('Comentario público');
});
