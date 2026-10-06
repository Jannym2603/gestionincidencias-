import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, role = 'ADMIN') {
    await page.goto('/login');
    await page.locator('#correo').fill(`${role.toLowerCase()}@fixture.invalid`);
    await page.locator('#password').fill('fixture-password');
    await page.getByRole('button', { name: 'Entrar al sistema' }).click();
    await expect(page).toHaveURL(/dashboard/);
}

test('usuarios lista, busca, crea válido e inválido y edita sin mostrar campos sensibles', async ({ page }) => {
    await login(page); await page.goto('/usuarios');
    await expect(page.locator('#users-body')).toContainText('admin@fixture.invalid');
    await page.locator('#user-search').fill('cliente@fixture.invalid');
    await expect(page.locator('#users-body')).toContainText('cliente@fixture.invalid');
    await expect(page.locator('#users-body')).not.toContainText('admin@fixture.invalid');

    await page.goto('/usuarios/nuevo');
    await page.locator('#user-name').fill('Nuevo'); await page.locator('#user-surname').fill('Cliente');
    await page.locator('#user-email').fill('nuevo-cliente@fixture.invalid'); await page.locator('#user-role').selectOption('CLIENTE');
    await page.locator('#user-password').fill('cliente-123'); await page.locator('#user-password-confirm').fill('cliente-123');
    await page.getByRole('button', { name: 'Crear usuario' }).click();
    await expect(page).toHaveURL(/\/usuarios\/\d+$/); await expect(page.locator('#user-detail-title')).toHaveText('Nuevo Cliente');
    await expect(page.locator('#user-detail-fields')).not.toContainText('password');
    await page.getByRole('button', { name: 'Editar' }).click(); await page.locator('#user-phone').fill('6000-1234');
    await page.getByRole('button', { name: 'Guardar cambios' }).click(); await expect(page.locator('#user-detail-fields')).toContainText('6000-1234');

    await page.goto('/usuarios/nuevo'); await page.locator('#user-name').fill('Inválido'); await page.locator('#user-surname').fill('Email');
    await page.locator('#user-email').fill('no-es-correo'); await page.locator('#user-role').selectOption('CLIENTE');
    await page.locator('#user-password').fill('corto'); await page.locator('#user-password-confirm').fill('corto');
    await page.getByRole('button', { name: 'Crear usuario' }).click();
    await expect(page).toHaveURL(/\/usuarios\/nuevo$/);
    expect(await page.locator('#user-form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(false);
});

test('SUPERVISOR solo puede seleccionar roles permitidos y el backend rechaza un rol forzado', async ({ page }) => {
    await login(page, 'SUPERVISOR'); await page.goto('/usuarios/nuevo');
    await expect(page.locator('#user-role option')).toHaveText(['Selecciona un rol', 'AGENTE', 'CLIENTE']);
    await page.locator('#user-name').fill('Prueba'); await page.locator('#user-surname').fill('Rol');
    await page.locator('#user-email').fill('rol-forzado@fixture.invalid'); await page.locator('#user-password').fill('password123'); await page.locator('#user-password-confirm').fill('password123');
    await page.locator('#user-role').evaluate((select: HTMLSelectElement) => { select.add(new Option('ADMIN', 'ADMIN')); select.value = 'ADMIN'; });
    await page.getByRole('button', { name: 'Crear usuario' }).click();
    await expect(page.locator('#user-form-status')).toContainText('SUPERVISOR solo puede administrar');
});

test('usuarios activa y desactiva registros con confirmación y conserva la asignación', async ({ page }) => {
    await login(page); await page.goto('/usuarios');
    page.on('dialog', (dialog) => dialog.accept());
    const row = page.locator('#users-body tr').filter({ hasText: 'AGENTE' });
    await row.getByRole('button', { name: 'Desactivar' }).click();
    await expect(row).toContainText('INACTIVO');
    await row.getByRole('button', { name: 'Activar' }).click();
    await expect(row).toContainText('ACTIVO');
});

test('usuario agrega y quita acceso de proyecto sin borrar la asignación', async ({ page }) => {
    await login(page); await page.goto('/usuarios/4');
    await expect(page.locator('#user-projects-body')).toContainText('Portal');
    await page.locator('#user-project-select').selectOption('2'); await page.getByRole('button', { name: 'Asignar proyecto' }).click();
    await expect(page.locator('#user-projects-body')).toContainText('Privado');
    page.on('dialog', (dialog) => dialog.accept());
    const row = page.locator('#user-projects-body tr').filter({ hasText: 'Privado' });
    await row.getByRole('button', { name: 'Quitar acceso' }).click(); await expect(row).toContainText('INACTIVA');
});

test('rutas administrativas redirigen en 401 y muestran acceso denegado en 403', async ({ page }) => {
    await login(page); await page.route('**/api/usuarios/me', (route) => route.fulfill({ status: 401, json: { message: 'Sesión expirada.' } }));
    await page.goto('/usuarios'); await expect(page).toHaveURL(/login\?sesion=expirada/);
    await page.unroute('**/api/usuarios/me');
    await login(page, 'CLIENTE'); await page.goto('/companias'); await expect(page.locator('#admin-access-denied')).toContainText('No tienes permiso');
    await expect(page.locator('#companies-list')).toBeHidden();
});

test('compañías lista, crea, edita, cambia estado y representa error de API', async ({ page }) => {
    await login(page); await page.goto('/companias'); await expect(page.locator('#companies-list')).toContainText('Acme');
    await page.goto('/companias/nueva'); await page.locator('#company-name').fill('Compañía nueva'); await page.locator('#company-description').fill('Descripción nueva');
    await page.getByRole('button', { name: 'Guardar compañía' }).click(); await expect(page).toHaveURL(/\/companias\/\d+$/);
    await expect(page.locator('#company-detail-title')).toHaveText('Compañía nueva');
    await page.getByRole('button', { name: 'Editar' }).click(); await page.locator('#company-description').fill('Descripción editada');
    await page.getByRole('button', { name: 'Guardar compañía' }).click(); await expect(page).toHaveURL(/\/companias\/\d+$/);
    page.on('dialog', (dialog) => dialog.accept()); await page.getByRole('button', { name: 'Desactivar' }).click();
    await expect(page.locator('#company-detail-fields')).toContainText('Inactiva');

    await page.route('**/api/companias', (route) => route.fulfill({ status: 500, json: { message: 'Error API de prueba.' } }));
    await page.goto('/companias'); await expect(page.locator('#companies-status')).toContainText('Error API de prueba.');
});

test('compañías supervisor es solo lectura y detalle inexistente muestra error', async ({ page }) => {
    await login(page, 'SUPERVISOR'); await page.goto('/companias'); await expect(page.locator('#companies-list')).toContainText('Acme');
    await expect(page.getByRole('link', { name: 'Nueva compañía' })).toBeHidden();
    await page.goto('/companias/999'); await expect(page.locator('#company-detail-status')).toContainText('Compañía no encontrada');
});

test('proyectos lista y detalle, crea, edita, activa/desactiva y asigna usuarios', async ({ page }) => {
    await login(page); await page.goto('/proyectos'); await expect(page.locator('#projects-body')).toContainText('Portal');
    await page.goto('/proyectos/nuevo'); await page.locator('#project-company').selectOption('1'); await page.locator('#project-name').fill('Proyecto nuevo');
    await page.locator('#project-description').fill('Descripción proyecto'); await page.getByRole('button', { name: 'Guardar proyecto' }).click();
    await expect(page).toHaveURL(/\/proyectos\/\d+$/); await expect(page.locator('#project-detail-title')).toHaveText('Proyecto nuevo');
    await expect(page.locator('#project-ticket-total')).toHaveText('0');
    await page.locator('#project-user-select').selectOption('4'); await page.getByRole('button', { name: 'Asignar usuario' }).click();
    await expect(page.locator('#project-users-body')).toContainText('CLIENTE');
    page.on('dialog', (dialog) => dialog.accept());
    const assignment = page.locator('#project-users-body tr').filter({ hasText: 'cliente@fixture.invalid' });
    await assignment.getByRole('button', { name: 'Quitar acceso' }).click(); await expect(assignment).toHaveCount(0);
    await page.getByRole('button', { name: 'Editar' }).click(); await page.locator('#project-name').fill('Proyecto editado');
    await page.getByRole('button', { name: 'Guardar proyecto' }).click(); await expect(page).toHaveURL(/\/proyectos\/\d+$/); await expect(page.locator('#project-detail-title')).toHaveText('Proyecto editado');
    await page.getByRole('button', { name: 'Desactivar' }).click(); await expect(page.locator('#project-detail-fields')).toContainText('Inactivo');
    await page.getByRole('button', { name: 'Activar' }).click(); await expect(page.locator('#project-detail-fields')).toContainText('Activo');
});

test('proyecto fuera de alcance devuelve 403, inexistente/error y lista muestra loading', async ({ page }) => {
    await login(page, 'SUPERVISOR'); await page.goto('/proyectos/2'); await expect(page.locator('#admin-access-denied')).toContainText('No tienes acceso al proyecto');
    await page.goto('/proyectos/999'); await expect(page.locator('#project-detail-status')).toContainText('Proyecto no encontrado');
    await page.route('**/api/proyectos', async (route) => { await new Promise((resolve) => setTimeout(resolve, 400)); await route.continue(); });
    await page.goto('/proyectos'); await expect(page.locator('#projects-status')).toContainText('Cargando proyectos'); await expect(page.locator('#projects-body')).toContainText('Portal');
    await page.unroute('**/api/proyectos'); await page.route('**/api/proyectos', (route) => route.fulfill({ status: 500, json: { message: 'Fallo de proyectos.' } }));
    await page.goto('/proyectos'); await expect(page.locator('#projects-status')).toContainText('Fallo de proyectos.');
});
