import { test, expect, type Page } from '@playwright/test';

const login = async (page: Page, role = 'ADMIN') => {
    await page.goto('/login');
    await page.locator('#correo').fill(`${role.toLowerCase()}@fixture.invalid`);
    await page.locator('#password').fill('fixture-password');
    await page.getByRole('button', { name: 'Entrar al sistema' }).click();
    await expect(page).toHaveURL(/dashboard/);
};

test('CLIENTE crea un ticket y usa su cuenta y proyecto autorizado', async ({ page }) => {
    let payload: Record<string, unknown> | undefined;
    await page.route('**/api/tickets', async (route) => { if (route.request().method() === 'POST') payload = route.request().postDataJSON(); await route.continue(); });
    await login(page, 'CLIENTE'); await page.goto('/tickets/nuevo'); await page.locator('#project').selectOption('1');
    await page.getByLabel('Tipo de incidencia *').selectOption('8'); await page.getByLabel('Asunto / titulo *').fill('Problema de acceso'); await page.getByLabel('Descripcion *').fill('Detalle de la incidencia.');
    await page.getByRole('button', { name: 'Crear ticket' }).click(); await expect(page).toHaveURL(/\/tickets\/\d+$/);
    expect(payload).toMatchObject({ clienteId: 4, proyectoId: 1, tipoIncidenciaId: 8, tipoAtencion: 'OPERATIVO', titulo: 'Problema de acceso', impacto: 'MEDIO', urgencia: 'MEDIA' });
});

test('CLIENTE no puede forzar un proyecto que no esta autorizado', async ({ page }) => {
    let posted = false;
    await page.route('**/api/tickets', async (route) => { if (route.request().method() === 'POST') posted = true; await route.continue(); });
    await login(page, 'CLIENTE'); await page.goto('/tickets/nuevo'); await page.locator('#project').selectOption('1'); await page.getByLabel('Tipo de incidencia *').selectOption('8'); await page.getByLabel('Asunto / titulo *').fill('Intento'); await page.getByLabel('Descripcion *').fill('No autorizado.');
    await page.locator('#project').evaluate((el: HTMLSelectElement) => { el.add(new Option('Fuera de alcance', '2')); el.value = '2'; }); await page.getByRole('button', { name: 'Crear ticket' }).click();
    await expect(page.locator('#create-status')).toContainText('proyecto disponible'); expect(posted).toBe(false);
});

test('ADMIN crea solicitud de recurso con los campos legacy', async ({ page }) => {
    let payload: Record<string, any> | undefined;
    await page.route('**/api/tickets', async (route) => { if (route.request().method() === 'POST') payload = route.request().postDataJSON(); await route.continue(); });
    await login(page); await page.goto('/tickets/nuevo'); await page.getByLabel('Tipo de atencion').selectOption('RECURSO_EXTERNO'); await page.locator('#customer').selectOption('4'); await page.locator('#project').selectOption('1'); await page.getByLabel('Tipo de incidencia *').selectOption('9'); await page.getByLabel('Descripcion *').fill('Se requiere reemplazo.'); await page.getByLabel('Recurso solicitado *').fill('Camara IP'); await page.getByLabel('Cantidad *').fill('2'); await page.getByRole('button', { name: 'Crear ticket' }).click(); await expect(page).toHaveURL(/\/tickets\/\d+$/);
    expect(payload?.titulo).toBe('Solicitud de recurso - Camara IP'); expect(payload?.solicitudRecurso).toMatchObject({ categoria: 'PIEZA_COMPUTADORA', recurso: 'Camara IP', cantidad: 2 });
});

test('AGENTE crea ticket solo para cliente/proyecto visible en sus tickets asignados', async ({ page }) => {
    let payload: Record<string, unknown> | undefined;
    await page.route('**/api/tickets', async (route) => { if (route.request().method() === 'POST') payload = route.request().postDataJSON(); await route.continue(); });
    await login(page, 'AGENTE'); await page.goto('/tickets/nuevo'); await page.locator('#customer').selectOption('4'); await page.locator('#project').selectOption('1'); await page.getByLabel('Tipo de incidencia *').selectOption('8'); await page.getByLabel('Asunto / titulo *').fill('Seguimiento del agente'); await page.getByLabel('Descripcion *').fill('Incidencia en el proyecto asignado.'); await page.getByRole('button', { name: 'Crear ticket' }).click(); await expect(page).toHaveURL(/\/tickets\/\d+$/); expect(payload).toMatchObject({ clienteId: 4, proyectoId: 1 });
});

test('rol sin permisos no ve controles de asignacion, estado o prioridad', async ({ page }) => {
    await login(page, 'CLIENTE'); await page.goto('/tickets/100'); await expect(page.locator('#ticket-content')).toBeVisible();
    await expect(page.locator('#assignment-form')).toBeHidden(); await expect(page.locator('#state-form')).toBeHidden(); await expect(page.locator('#priority-form')).toBeHidden();
});

test('SUPERVISOR asigna un agente activo del proyecto', async ({ page }) => {
    let body: unknown;
    await page.route('**/api/tickets/100/asignar', async (route) => { body = route.request().postDataJSON(); await route.continue(); });
    await login(page, 'SUPERVISOR'); await page.goto('/tickets/100'); await expect(page.locator('#assignment-form')).toBeVisible(); await expect(page.locator('#agent-select option')).toHaveCount(2);
    await page.getByRole('button', { name: 'Asignar agente' }).click(); await expect(page).toHaveURL(/\/tickets\/100/); expect(body).toEqual({ agenteId: 3 });
});

test('AGENTE solo puede seleccionar transiciones operativas y exige nota para cierre', async ({ page }) => {
    let current = { estado: 'NUEVO', agenteId: 3, id: 100, tipoAtencion: 'OPERATIVO', proyectoId: 1, fechaCreacion: '2026-10-05T10:00:00' };
    await page.route('**/api/tickets/100', (route) => route.fulfill({ json: current }));
    await page.route('**/api/tickets/100/estado', async (route) => { const body = route.request().postDataJSON(); current = { ...current, estado: body.estado }; await route.fulfill({ json: current }); });
    await login(page, 'AGENTE'); await page.goto('/tickets/100'); await expect(page.locator('#state-form')).toBeVisible(); await expect(page.locator('#state-select')).toHaveValue('EN_PROGRESO');
    await page.locator('#state-select').selectOption('EN_PROGRESO'); await page.getByRole('button', { name: 'Actualizar estado' }).click(); await expect(page.locator('#ticket-state')).toHaveText('EN_PROGRESO');
    await page.locator('#state-select').selectOption('CERRADO'); await expect(page.getByLabel('Nota de cierre')).toHaveAttribute('required', '');
    await page.getByLabel('Nota de cierre').fill('Servicio restablecido.'); page.on('dialog', (dialog) => dialog.accept()); await page.getByRole('button', { name: 'Cerrar ticket' }).click(); await expect(page.locator('#ticket-state')).toHaveText('CERRADO');
});

test('transicion de estado invalida muestra el rechazo del backend', async ({ page }) => {
    await login(page); await page.goto('/tickets/100'); await expect(page.locator('#state-form')).toBeVisible();
    await page.locator('#state-select').evaluate((select: HTMLSelectElement) => select.add(new Option('NUEVO', 'NUEVO')));
    await page.locator('#state-select').selectOption('NUEVO'); await page.locator('#close-note').fill('Nota de cierre');
    await page.locator('#state-form button[type="submit"]').click(); await expect(page.locator('#action-status')).toContainText('Transicion no permitida');
});

test('prioridad exige rol autorizado y envia el usuario del token', async ({ page }) => {
    let body: Record<string, unknown> | undefined;
    await page.route('**/api/tickets/100/prioridad', async (route) => { body = route.request().postDataJSON(); await route.fulfill({ json: { prioridad: 'P1_CRITICA' } }); });
    await login(page); await page.goto('/tickets/100'); await expect(page.locator('#priority-form')).toBeVisible(); await page.locator('#priority-select').selectOption('P1_CRITICA'); await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Guardar prioridad' }).click()]); await expect(page.locator('#ticket-content')).toBeVisible(); expect(body).toMatchObject({ prioridad: 'P1_CRITICA', usuarioId: 1 });
    await page.evaluate(() => sessionStorage.clear()); await login(page, 'CLIENTE'); await page.goto('/tickets/100'); await expect(page.locator('#priority-form')).toBeHidden();
});

test('SUPERVISOR sigue transiciones y cierre de recurso externo con fecha', async ({ page }) => {
    let item: Record<string, any> = { id: 1, ticketId: 101, recurso: 'Llave', proveedor: 'Proveedor', estadoRecurso: 'ESPERANDO_PROVEEDOR', fechaEstimadaEntrega: '2026-10-12T10:00:00', situacionEntrega: 'EN_TIEMPO', diasRetraso: 0 };
    await page.route('**/api/solicitudes-recursos/ticket/101', (route) => route.fulfill({ json: [item] }));
    await page.route('**/api/solicitudes-recursos/1', async (route) => { if (route.request().method() === 'PUT') { item = { ...item, ...route.request().postDataJSON() }; if (item.estadoRecurso === 'ENTREGADO') item.fechaEntregaCliente ||= '2026-10-06T10:00'; } await route.fulfill({ json: item }); });
    await login(page, 'SUPERVISOR'); await page.goto('/tickets/101'); await expect(page.locator('#resource-form')).toBeVisible(); await expect(page.locator('#resource-state')).toHaveText('ESPERANDO_PROVEEDOR');
    await page.locator('#resource-state-select').selectOption('RECIBIDO'); await page.getByRole('button', { name: 'Guardar seguimiento' }).click(); await expect(page.locator('#resource-state')).toHaveText('RECIBIDO');
    await page.locator('#resource-state-select').selectOption('ENTREGADO'); await page.getByRole('button', { name: 'Guardar seguimiento' }).click(); await expect(page.locator('#resource-state')).toHaveText('ENTREGADO');
    await page.locator('#resource-state-select').selectOption('CERRADO'); await expect(page.locator('#resource-delivered-date')).not.toHaveValue(''); page.on('dialog', (dialog) => dialog.accept()); await page.getByRole('button', { name: 'Guardar seguimiento' }).click(); await expect(page.locator('#resource-state')).toHaveText('CERRADO');
});
