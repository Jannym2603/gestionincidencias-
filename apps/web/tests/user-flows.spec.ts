import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, role: string) {
    await page.goto('/login');
    await page.locator('#correo').fill(`${role.toLowerCase()}@fixture.invalid`);
    await page.locator('#password').fill('fixture-password');
    await page.getByRole('button', { name: 'Entrar al sistema' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('#protected-app')).toBeVisible();
}

async function logout(page: Page) {
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => sessionStorage.getItem('usuarioSistema'))).toBeNull();
}

test('flujo CLIENTE: login, dashboard, ticket, comentario, adjunto, historial y logout', async ({ page }) => {
    await login(page, 'CLIENTE');
    await expect(page.locator('#dashboard-status')).toHaveText('Datos actualizados.');
    await page.goto('/tickets/nuevo');
    await page.locator('#project').selectOption('1');
    await page.getByLabel('Tipo de incidencia *').selectOption('8');
    await page.getByLabel('Asunto / titulo *').fill('Flujo E2E cliente');
    await page.getByLabel('Descripcion *').fill('Ticket creado durante el recorrido integral.');
    await page.getByRole('button', { name: 'Crear ticket' }).click();
    await expect(page).toHaveURL(/\/tickets\/\d+$/);
    await expect(page.locator('#ticket-title')).toHaveText('Flujo E2E cliente');

    await page.getByLabel('Comentario').fill('Comentario del flujo de cliente.');
    await page.getByRole('button', { name: 'Agregar comentario' }).click();
    await expect(page.locator('#comments-list')).toContainText('Comentario del flujo de cliente.');
    await page.locator('#attachment').setInputFiles({ name: 'flujo-cliente.txt', mimeType: 'text/plain', buffer: Buffer.from('fixture') });
    await page.getByRole('button', { name: 'Subir archivo' }).click();
    await expect(page.locator('#attachments-list')).toContainText('flujo-cliente.txt');
    await expect(page.locator('#history-list')).not.toContainText('No hay historial registrado');
    await logout(page);
});

test('flujo SUPERVISOR: tickets, asignación, prioridad, recurso, reportes, enlace y logout', async ({ page }) => {
    const reset = await page.request.post('http://127.0.0.1:4310/__test/reset-ticket-priority');
    expect(reset.status()).toBe(204);
    await login(page, 'SUPERVISOR');
    await page.goto('/tickets');
    await expect(page.locator('#tickets-body')).toContainText('INC-2026-0100');
    await page.goto('/tickets/100');
    await expect(page.locator('#assignment-form')).toBeVisible();
    await page.getByRole('button', { name: 'Asignar agente' }).click();
    await expect(page.locator('#ticket-agent')).toContainText('Usuario AGENTE');
    await page.locator('#priority-select').selectOption('P1_CRITICA');
    let priorityBody: Record<string, unknown> | undefined;
    page.on('request', (request) => {
        if (request.url().includes('/api/tickets/100/prioridad') && request.method() === 'PUT') priorityBody = request.postDataJSON();
    });
    const priorityResponse = page.waitForResponse((response) => response.url().includes('/api/tickets/100/prioridad'));
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Guardar prioridad' }).click()]);
    const priorityResult = await priorityResponse;
    expect(priorityResult.status()).toBe(200);
    expect(priorityBody).toMatchObject({ prioridad: 'P1_CRITICA' });
    await expect(page.locator('#ticket-priority')).toContainText('P1_CRITICA');

    await page.goto('/tickets/101');
    await expect(page.locator('#resource-form')).toBeVisible();
    await page.locator('#resource-state-select').selectOption('RECIBIDO');
    await page.getByRole('button', { name: 'Guardar seguimiento' }).click();
    await expect(page.locator('#resource-state')).toContainText('RECIBIDO');
    await page.goto('/solicitudes-recursos');
    await expect(page.locator('#resource-requests-body')).toContainText('INC-2026-0101');
    await page.locator('#resource-state-filter').selectOption('RECIBIDO');
    await expect(page.locator('#resource-requests-body')).toContainText('Llave de acceso');
    await expect(page.locator('#resource-requests-body')).toContainText('Administrar');
    await page.goto('/reportes');
    await expect(page.locator('#report-total-tickets')).not.toHaveText('Cargando');
    await page.goto('/tickets/100');
    await page.locator('#shared-link-email').fill('supervisor-flujo@fixture.invalid');
    await page.getByRole('button', { name: 'Generar enlace' }).click();
    await expect(page.locator('#shared-link-created-status')).toContainText('Enlace generado');
    await logout(page);
});

test('flujo AGENTE: tickets asignados, estado, comentario, recurso no autorizado y logout', async ({ page }) => {
    await login(page, 'AGENTE');
    await page.goto('/tickets');
    await expect(page.locator('#tickets-body')).toContainText('INC-2026-0100');
    await page.goto('/tickets/100');
    await expect(page.locator('#state-form')).toBeVisible();
    await page.locator('#state-select').selectOption('CERRADO');
    await page.getByLabel('Nota de cierre').fill('Validado durante el flujo integral.');
    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Cerrar ticket' }).click();
    await expect(page.locator('#ticket-state')).toHaveText('CERRADO');
    await page.getByLabel('Visibilidad').selectOption('PUBLICO');
    await page.getByLabel('Comentario').fill('Seguimiento realizado por el agente.');
    await page.getByRole('button', { name: 'Agregar comentario' }).click();
    await expect(page.locator('#comments-list')).toContainText('Seguimiento realizado por el agente.');
    await page.goto('/tickets/101');
    await expect(page.locator('#resource-form')).toBeHidden();
    await page.goto('/solicitudes-recursos');
    await expect(page.locator('#resource-requests-body')).toContainText('No hay solicitudes de recursos');
    await logout(page);
});

test('flujo ADMIN: usuario, compañía, proyecto/asignación, reportes, configuración, auditoría y logout', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/usuarios/nuevo');
    await page.locator('#user-name').fill('Flujo');
    await page.locator('#user-surname').fill('Demo');
    await page.locator('#user-email').fill('flujo-admin@fixture.invalid');
    await page.locator('#user-role').selectOption('CLIENTE');
    await page.locator('#user-password').fill('fixture-user-password');
    await page.locator('#user-password-confirm').fill('fixture-user-password');
    await page.getByRole('button', { name: 'Crear usuario' }).click();
    await expect(page).toHaveURL(/\/usuarios\/\d+$/);
    const userId = new URL(page.url()).pathname.split('/').at(-1)!;

    await page.goto('/companias/nueva');
    await page.locator('#company-name').fill('Compañía flujo E2E');
    await page.locator('#company-description').fill('Compañía temporal del fixture.');
    await page.getByRole('button', { name: 'Guardar compañía' }).click();
    await expect(page).toHaveURL(/\/companias\/\d+$/);
    const companyId = new URL(page.url()).pathname.split('/').at(-1)!;

    await page.goto('/proyectos/nuevo');
    await page.locator('#project-company').selectOption(companyId);
    await page.locator('#project-name').fill('Proyecto flujo E2E');
    await page.locator('#project-description').fill('Proyecto temporal del fixture.');
    await page.getByRole('button', { name: 'Guardar proyecto' }).click();
    await expect(page).toHaveURL(/\/proyectos\/\d+$/);
    await page.locator('#project-user-select').selectOption(userId);
    await page.getByRole('button', { name: 'Asignar usuario' }).click();
    await expect(page.locator('#project-users-body')).toContainText('flujo-admin@fixture.invalid');

    await page.goto('/reportes');
    await expect(page.locator('#report-total-tickets')).not.toHaveText('Cargando');
    await page.goto('/historial');
    await expect(page.locator('#global-history-body tr').first()).toContainText('INC-2026-');
    await page.locator('#history-action').selectOption({ label: 'CREADO' });
    await expect(page.locator('#global-history-body')).toContainText('CREADO');
    await page.locator('#history-company').selectOption('1');
    await page.locator('#history-project').selectOption('1');
    await expect(page.locator('#global-history-scope')).toContainText('Portal');
    await page.goto('/configuracion');
    await expect(page.locator('#system-settings')).toBeVisible();
    await page.getByRole('button', { name: /Reportes Permite/ }).click();
    const reportFlag = page.locator('#flag-reportesCliente');
    const wasChecked = await reportFlag.isChecked();
    await reportFlag.setChecked(!wasChecked, { force: true });
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.locator('#settings-form-status')).toContainText('guardada');
    await page.goto('/auditoria');
    await expect(page.locator('#audit-list .audit-item').first()).toContainText('Reportes');
    await logout(page);
});

test('flujo público: acceso sin JWT, lectura segura y enlaces inválido, revocado y expirado', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const publicPage = await page.context().newPage();
    await login(page, 'ADMIN');
    await page.goto('/tickets/100');
    await page.locator('#shared-link-email').fill('publico-flujo@fixture.invalid');
    await page.getByRole('button', { name: 'Generar enlace' }).click();
    await expect(page.locator('#shared-link-created-status')).toContainText('copiado');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    const token = new URL(copied).searchParams.get('token')!;
    let authenticationLookups = 0;
    publicPage.on('request', (request) => { if (request.url().includes('/api/usuarios/me')) authenticationLookups += 1; });
    await publicPage.goto(`/ticket-compartido.html?token=${encodeURIComponent(token)}`);
    await expect(publicPage.locator('#public-ticket')).toBeVisible();
    expect(authenticationLookups).toBe(0);
    const publicText = await publicPage.locator('body').innerText();
    expect(publicText).not.toContain(token);
    expect(publicText).not.toContain('publico-flujo@fixture.invalid');
    expect(publicText).not.toContain('passwordHash');
    expect(publicText).not.toContain('private@fixture.invalid');
    expect(publicText).not.toContain('Comentario público');
    expect(publicText).not.toContain('evidencia.txt');

    const linkRow = page.locator('#shared-links-body tr').filter({ hasText: 'publico-flujo@fixture.invalid' });
    page.on('dialog', (dialog) => dialog.accept());
    await linkRow.getByRole('button', { name: 'Revocar' }).click();
    await publicPage.goto(`/ticket-compartido.html?token=${encodeURIComponent(token)}`);
    await expect(publicPage.locator('#public-error-message')).toContainText('desactivado');
    await publicPage.goto('/ticket-compartido.html?token=no-existe');
    await expect(publicPage.locator('#public-error-message')).toContainText('no existe');
    await publicPage.goto('/ticket-compartido.html?token=fixture-expired-token');
    await expect(publicPage.locator('#public-error-message')).toContainText('expirado');
    await publicPage.close();
});

test('alcance de historial por rol y bloqueo del flag deshabilitado', async ({ page }) => {
    const expectedRows: Record<string, number> = { ADMIN: 2, SUPERVISOR: 2, AGENTE: 2, CLIENTE: 1 };
    for (const role of Object.keys(expectedRows)) {
        await login(page, role);
        await expect(page.locator('[data-menu="historial"]')).toBeVisible();
        await page.goto('/historial');
        await expect(page.locator('#global-history-content')).toBeVisible();
        await expect(page.locator('#global-history-body tr')).toHaveCount(expectedRows[role]!);
        await page.evaluate(() => sessionStorage.clear());
    }
    await login(page, 'CLIENTE');
    await page.route('**/api/configuracion-sistema', (route) => route.fulfill({ json: { historialActivo: false, historialCliente: true } }));
    await page.goto('/historial');
    await expect(page.locator('#history-access-denied')).toContainText('no está habilitado');
});

test('rutas principales no generan errores de consola y la tabla de historial responde en móvil', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    await login(page, 'ADMIN');
    for (const path of ['/tickets', '/tickets/100', '/tickets/nuevo', '/solicitudes-recursos', '/proyectos', '/proyectos/1', '/companias', '/companias/1', '/usuarios', '/usuarios/1', '/reportes', '/configuracion', '/auditoria', '/historial']) {
        await page.goto(path);
        await expect(page.locator('#protected-app')).toBeVisible();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
});
