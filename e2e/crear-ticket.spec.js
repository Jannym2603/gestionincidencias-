const { test, expect } = require('@playwright/test');


test.beforeEach(async ({ page }) => {

    await page.addInitScript(() => {

        sessionStorage.setItem(
            'usuarioSistema',
            JSON.stringify({
                id: 12,
                nombre: 'Admin Prueba',
                correo: 'admin.prueba@correo.com',
                rol: 'ADMIN',
                token: 'token-playwright-prueba'
            })
        );
    });


    await page.route(
        '**/api/configuracion-sistema',
        async route => {

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    crearTicketActivo: true,

                    solicitudesRecursosActivo: true,
                    solicitudesRecursosCliente: true,
                    solicitudesRecursosAgente: true,
                    solicitudesRecursosSupervisor: true,
                    solicitudesRecursosAdmin: true,

                    reportesActivos: true,
                    historialActivo: true
                })
            });
        }
    );


    await page.route(
        '**/api/solicitudes-recursos',
        async route => {

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        }
    );


    await page.route(
        '**/api/**',
        async route => {

            if (
                route.request().method() === 'GET'
            ) {

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([])
                });

                return;
            }

            await route.continue();
        }
    );
});


test(
    'debe abrir la pantalla de solicitudes de recursos',
    async ({ page }) => {

        await page.goto(
            'http://localhost:8081/solicitudes-recursos.html'
        );

        await expect(
            page
        ).toHaveURL(
            /solicitudes-recursos\.html/
        );

        await expect(
            page.getByRole(
                'heading',
                {
                    name: /solicitudes de recursos/i
                }
            ).first()
        ).toBeVisible();
    }
);


test(
    'debe mostrar los filtros de solicitudes de recursos',
    async ({ page }) => {

        await page.goto(
            'http://localhost:8081/solicitudes-recursos.html'
        );

        await expect(
            page.locator('#buscarSolicitud')
        ).toBeVisible();

        await expect(
            page.locator('#filtroEstadoRecurso')
        ).toBeVisible();

        await expect(
            page.locator('#filtroCategoriaRecurso')
        ).toBeVisible();

        await expect(
            page.locator('#filtroCompaniaRecurso')
        ).toBeVisible();

        await expect(
            page.locator('#filtroProyectoRecurso')
        ).toBeVisible();
    }
);
test(
    'debe permitir completar los datos de una solicitud de recurso',
    async ({ page }) => {

        await page.goto(
            'http://localhost:8081/crear-ticket.html'
        );

        const tipoAtencion =
            page.locator('#tipoAtencion');

        await tipoAtencion.selectOption(
            'RECURSO_EXTERNO'
        );

        const categoria =
            page.locator('#categoriaRecurso');

        const recurso =
            page.locator('#recursoSolicitado');

        const cantidad =
            page.locator('#cantidadRecurso');

        await categoria.selectOption(
            'PIEZA_COMPUTADORA'
        );

        await recurso.fill(
            'Disco SSD 1 TB'
        );

        await cantidad.fill(
            '2'
        );

        await expect(
            categoria
        ).toHaveValue(
            'PIEZA_COMPUTADORA'
        );

        await expect(
            recurso
        ).toHaveValue(
            'Disco SSD 1 TB'
        );

        await expect(
            cantidad
        ).toHaveValue(
            '2'
        );
    }
);