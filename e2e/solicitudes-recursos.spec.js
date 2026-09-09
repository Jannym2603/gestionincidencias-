const { test, expect } = require('@playwright/test');


test.beforeEach(async ({ page }) => {

    /*
     * Simulamos una sesión ADMIN válida.
     */
    await page.addInitScript(() => {

        sessionStorage.setItem(
            'usuarioSistema',
            JSON.stringify({
                id: 1,
                nombre: 'Janeth Ramos',
                correo: 'jrmarin2603@gmail.com',
                rol: 'ADMIN',
                token: 'token-playwright-prueba'
            })
        );
    });


    /*
     * Simulamos la configuración del sistema
     * para mantener activo el módulo de recursos.
     */
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


    /*
     * Respuesta predeterminada para el listado
     * de solicitudes.
     */
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


    /*
     * Evitamos respuestas 401 en cualquier
     * otro GET que haga la página.
     */
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


/* =====================================================
   PRUEBA 1
   Abrir módulo de Solicitudes de Recursos
===================================================== */

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


/* =====================================================
   PRUEBA 2
   Mostrar filtros principales
===================================================== */

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


        await expect(
            page.locator('#filtroRetrasoRecurso')
        ).toBeVisible();
    }
);


/* =====================================================
   PRUEBA 3
   Filtrar solicitudes por estado
===================================================== */

test(
    'debe permitir filtrar solicitudes por estado',
    async ({ page }) => {

        await page.route(
            '**/api/solicitudes-recursos',
            async route => {

                await route.fulfill({

                    status: 200,

                    contentType: 'application/json',

                    body: JSON.stringify([
                        {
                            id: 1,
                            ticketId: 101,

                            numeroTicket: 'INC-001',

                            clienteNombre: 'Cliente Uno',

                            companiaNombre: 'Empresa A',

                            proyectoNombre: 'Proyecto A',

                            categoria: 'PIEZA_COMPUTADORA',

                            recurso: 'Disco SSD 1 TB',

                            cantidad: 1,

                            proveedor: 'Proveedor A',

                            estadoRecurso: 'NUEVO',

                            retrasada: false
                        },

                        {
                            id: 2,
                            ticketId: 102,

                            numeroTicket: 'INC-002',

                            clienteNombre: 'Cliente Dos',

                            companiaNombre: 'Empresa B',

                            proyectoNombre: 'Proyecto B',

                            categoria: 'EQUIPO',

                            recurso: 'Laptop',

                            cantidad: 1,

                            proveedor: 'Proveedor B',

                            estadoRecurso: 'ENTREGADO',

                            retrasada: false
                        }
                    ])
                });
            }
        );


        await page.goto(
            'http://localhost:8081/solicitudes-recursos.html'
        );


        /*
         * Antes del filtro deben aparecer ambas.
         */
        await expect(
            page.getByText('INC-001')
        ).toBeVisible();


        await expect(
            page.getByText('INC-002')
        ).toBeVisible();


        const filtroEstado =
            page.locator(
                '#filtroEstadoRecurso'
            );


        await expect(
            filtroEstado
        ).toBeVisible();


        await filtroEstado.selectOption(
            'ENTREGADO'
        );


        /*
         * La solicitud entregada permanece.
         */
        await expect(
            page.getByText('INC-002')
        ).toBeVisible();


        /*
         * La solicitud NUEVO debe desaparecer.
         */
        await expect(
            page.getByText('INC-001')
        ).toBeHidden();
    }
);


/* =====================================================
   PRUEBA 4
   Identificar y filtrar solicitudes retrasadas
===================================================== */

test(
    'debe identificar una solicitud retrasada',
    async ({ page }) => {

        await page.route(
            '**/api/solicitudes-recursos',
            async route => {

                await route.fulfill({

                    status: 200,

                    contentType: 'application/json',

                    body: JSON.stringify([
                        {
                            id: 3,

                            ticketId: 103,

                            numeroTicket: 'INC-003',

                            clienteNombre:
                                'Cliente Retrasado',

                            companiaNombre:
                                'Empresa C',

                            proyectoNombre:
                                'Proyecto C',

                            categoria:
                                'EQUIPO',

                            recurso:
                                'Cámara de seguridad',

                            cantidad: 2,

                            proveedor:
                                'Proveedor C',

                            estadoRecurso:
                                'ESPERANDO_PROVEEDOR',

                            fechaEstimadaEntrega:
                                '2020-01-01T10:00:00',

                            /*
                             * El backend indica que
                             * esta solicitud está retrasada.
                             */
                            retrasada: true
                        },

                        {
                            id: 4,

                            ticketId: 104,

                            numeroTicket: 'INC-004',

                            clienteNombre:
                                'Cliente En Tiempo',

                            companiaNombre:
                                'Empresa D',

                            proyectoNombre:
                                'Proyecto D',

                            categoria:
                                'EQUIPO',

                            recurso:
                                'Laptop',

                            cantidad: 1,

                            proveedor:
                                'Proveedor D',

                            estadoRecurso:
                                'ESPERANDO_PROVEEDOR',

                            fechaEstimadaEntrega:
                                '2099-12-31T10:00:00',

                            /*
                             * Esta solicitud no está
                             * retrasada.
                             */
                            retrasada: false
                        }
                    ])
                });
            }
        );


        await page.goto(
            'http://localhost:8081/solicitudes-recursos.html'
        );


        /*
         * Inicialmente deben aparecer
         * las dos solicitudes.
         */
        await expect(
            page.getByText('INC-003')
        ).toBeVisible();


        await expect(
            page.getByText('INC-004')
        ).toBeVisible();


        /*
         * Debe existir una solicitud retrasada
         * en el resumen.
         */
        const resumen =
            page.locator(
                '#resumenSolicitudes'
            );


        await expect(
            resumen
        ).toContainText(
            '1 retrasada'
        );


        /*
         * El registro retrasado debe mostrar
         * su situación.
         */
        await expect(
            page.getByText(
                'RETRASADO',
                {
                    exact: true
                }
            )
        ).toBeVisible();


        /*
         * Aplicamos el filtro de retrasados.
         */
        const filtroRetraso =
            page.locator(
                '#filtroRetrasoRecurso'
            );


        await expect(
            filtroRetraso
        ).toBeVisible();


        await filtroRetraso.selectOption(
            'RETRASADO'
        );


        /*
         * INC-003 es la retrasada,
         * por lo tanto debe permanecer.
         */
        await expect(
            page.getByText('INC-003')
        ).toBeVisible();


        /*
         * INC-004 no está retrasada,
         * por lo tanto debe desaparecer.
         */
        await expect(
            page.getByText('INC-004')
        ).toBeHidden();
    }
);