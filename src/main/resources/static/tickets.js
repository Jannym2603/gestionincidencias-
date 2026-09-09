let ticketsOriginales = [];
let ticketsVisibles = [];
let proyectoContextoId = null;


document.addEventListener("DOMContentLoaded", async () => {

    inicializarLayout();

    const params =
        new URLSearchParams(
            window.location.search
        );


    const proyectoOrigen =
        Number(
            params.get("proyectoId")
        );


    proyectoContextoId =
        Number.isInteger(proyectoOrigen)
        &&
        proyectoOrigen > 0
            ? proyectoOrigen
            : null;


    configurarPermisosVista();
    configurarFiltros();

    await cargarTickets();
});


/*
 * =========================================================
 * PERMISOS VISUALES
 * =========================================================
 */

function configurarPermisosVista() {
    /*
     * La visibilidad de Crear Ticket se controla desde app.js
     * mediante los permisos dinámicos del módulo.
     */
}


/*
 * =========================================================
 * CARGA DE TICKETS
 * =========================================================
 */

async function cargarTickets() {

    try {

        const usuario =
            obtenerSesion();

        const response =
            await fetch(
                `${API_BASE}/tickets`
            );


        if (!response.ok) {

            throw new Error(
                "No se pudieron cargar los tickets"
            );
        }


        const tickets =
            await response.json();


        /*
         * El backend ya filtra los tickets según el rol.
         *
         * Conservamos además el filtro visual que
         * ya tenía tu sistema.
         */
        ticketsOriginales =
            aplicarFiltroPorPerfil(
                Array.isArray(tickets)
                    ? tickets
                    : [],
                usuario
            );


        ticketsVisibles =
            [...ticketsOriginales];


        configurarDescripcionVista(
            usuario
        );


        cargarClientesEnFiltro(
            ticketsOriginales,
            usuario
        );


        cargarCompaniasEnFiltro(
            ticketsOriginales
        );


        actualizarFiltroProyectos();


        aplicarContextoProyectoDesdeUrl();


        aplicarFiltros();


    } catch (error) {

        console.error(
            "Error cargando tickets:",
            error
        );


        const tbody =
            document.getElementById(
                "ticketsBody"
            );


        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="11">
                        No se pudieron cargar los tickets.
                    </td>
                </tr>
            `;
        }
    }
}


/*
 * =========================================================
 * FILTRO SEGÚN PERFIL
 * =========================================================
 */

function aplicarFiltroPorPerfil(
    tickets,
    usuario
) {

    if (!usuario) {

        return [];
    }


    const rol =
        String(usuario.rol || "")
            .trim()
            .toUpperCase();


    /*
     * CLIENTE:
     * solamente sus propios tickets.
     */
    if (rol === "CLIENTE") {

        return tickets.filter(
            ticket =>

                Number(
                    ticket.clienteId
                )
                ===
                Number(
                    usuario.id
                )
        );
    }


    /*
     * AGENTE:
     * solamente tickets asignados a él.
     */
    if (rol === "AGENTE") {

        return tickets.filter(
            ticket =>

                Number(
                    ticket.agenteId
                )
                ===
                Number(
                    usuario.id
                )
        );
    }


    /*
     * ADMIN y SUPERVISOR:
     * el backend ya devolvió solamente
     * los tickets autorizados.
     */
    return tickets;
}


/*
 * =========================================================
 * TEXTO DE LA VISTA
 * =========================================================
 */

function configurarDescripcionVista(
    usuario
) {

    const descripcion =
        document.getElementById(
            "descripcionVista"
        );


    if (
        !descripcion
        ||
        !usuario
    ) {

        return;
    }


    const rol =
        String(usuario.rol || "")
            .trim()
            .toUpperCase();


    if (rol === "CLIENTE") {

        descripcion.textContent =
            "Estás viendo únicamente tus tickets dentro de los proyectos a los que tienes acceso.";

    } else if (rol === "AGENTE") {

        descripcion.textContent =
            "Estás viendo únicamente los tickets asignados a ti dentro de tus proyectos.";

    } else if (rol === "SUPERVISOR") {

        descripcion.textContent =
            "Estás viendo los tickets de los proyectos a los que tienes acceso, agrupados por cliente.";

    } else if (rol === "ADMIN") {

        descripcion.textContent =
            "Estás viendo todos los tickets del sistema, organizados por cliente, compañía y proyecto.";
    }
}


/*
 * =========================================================
 * PINTAR TICKETS
 * =========================================================
 */

function pintarTickets(
    tickets
) {

    const usuario =
        obtenerSesion();

    const tbody =
        document.getElementById(
            "ticketsBody"
        );

    const tabla =
        tbody?.closest(
            "table"
        );

    const tableWrapper =
        tbody?.closest(
            ".table-wrapper"
        );


    if (!tbody) {

        return;
    }


    tbody.innerHTML =
        "";


    if (
        !Array.isArray(tickets)
        ||
        tickets.length === 0
    ) {

        tabla?.classList.remove(
            "tickets-agrupados-tabla"
        );

        tableWrapper?.classList.remove(
            "tickets-agrupados-wrapper"
        );


        tbody.innerHTML = `
            <tr>
                <td colspan="11">
                    No hay tickets que coincidan con los filtros seleccionados.
                </td>
            </tr>
        `;

        return;
    }


    const rol =
        String(
            usuario?.rol || ""
        )
            .trim()
            .toUpperCase();


    const debeAgrupar =
        rol === "ADMIN"
        ||
        rol === "SUPERVISOR";


    /*
     * ADMIN y SUPERVISOR:
     * mantenemos el diseño agrupado por cliente
     * que ya utilizabas.
     */
    if (debeAgrupar) {

        tabla?.classList.add(
            "tickets-agrupados-tabla"
        );

        tableWrapper?.classList.add(
            "tickets-agrupados-wrapper"
        );


        pintarTicketsAgrupadosPorCliente(
            tickets
        );

        return;
    }


    /*
     * CLIENTE y AGENTE:
     * tabla normal.
     */
    tabla?.classList.remove(
        "tickets-agrupados-tabla"
    );

    tableWrapper?.classList.remove(
        "tickets-agrupados-wrapper"
    );


    pintarTicketsNormales(
        tickets
    );
}


/*
 * =========================================================
 * TABLA NORMAL
 * CLIENTE / AGENTE
 * =========================================================
 */

function pintarTicketsNormales(
    tickets
) {

    const tbody =
        document.getElementById(
            "ticketsBody"
        );


    if (!tbody) {

        return;
    }


    tbody.innerHTML =
        "";


    tickets.forEach(
        ticket => {

            const tr =
                document.createElement(
                    "tr"
                );


            tr.innerHTML = `

                <td>
                    ${escaparHtmlTicket(
                        ticket.numeroTicket
                        ||
                        "Sin número"
                    )}
                </td>


                <td>
                    ${escaparHtmlTicket(
                        ticket.titulo
                        ||
                        "Sin título"
                    )}
                </td>


                <td>
                    ${escaparHtmlTicket(
                        ticket.companiaNombre
                        ||
                        "Sin compañía"
                    )}
                </td>


                <td>
                    ${escaparHtmlTicket(
                        ticket.proyectoNombre
                        ||
                        "Sin proyecto"
                    )}
                </td>


                <td>
                    ${escaparHtmlTicket(
                        obtenerTextoTipoAtencion(
                            ticket.tipoAtencion
                        )
                    )}
                </td>


                <td>
                    ${escaparHtmlTicket(
                        ticket.clienteNombre
                        ||
                        "Sin cliente"
                    )}
                </td>


                <td>
                    ${escaparHtmlTicket(
                        ticket.agenteNombre
                        ||
                        "Sin asignar"
                    )}
                </td>


                <td>

                    <span
                        class="badge ${
                            obtenerClaseEstado(
                                ticket.estado
                            )
                        }">

                        ${escaparHtmlTicket(
                            ticket.estado
                            ||
                            "Sin estado"
                        )}

                    </span>

                </td>


                <td>

                    <span
                        class="badge ${
                            obtenerClasePrioridad(
                                ticket.prioridad
                            )
                        }">

                        ${escaparHtmlTicket(
                            ticket.prioridad
                            ||
                            "Sin prioridad"
                        )}

                    </span>

                </td>


                <td>
                    ${formatearFecha(
                        ticket.fechaCreacion
                    )}
                </td>


                <td>

                    <a
                        href="${construirUrlDetalleTicket(ticket.id)}"
                        class="action-link">

                        Ver

                    </a>

                </td>
            `;


            tbody.appendChild(
                tr
            );
        }
    );
}


/*
 * =========================================================
 * TABLA AGRUPADA POR CLIENTE
 * ADMIN / SUPERVISOR
 * =========================================================
 */

function pintarTicketsAgrupadosPorCliente(
    tickets
) {

    const tbody =
        document.getElementById(
            "ticketsBody"
        );


    if (!tbody) {

        return;
    }


    tbody.innerHTML =
        "";


    const grupos = {};


    /*
     * Agrupamos los tickets por cliente.
     */
    tickets.forEach(
        ticket => {

            const cliente =
                ticket.clienteNombre
                ||
                "Cliente sin nombre";


            if (!grupos[cliente]) {

                grupos[cliente] =
                    [];
            }


            grupos[cliente].push(
                ticket
            );
        }
    );


    Object
        .keys(grupos)

        .sort(
            (clienteA, clienteB) =>

                clienteA.localeCompare(
                    clienteB,
                    "es",
                    {
                        sensitivity:
                            "base"
                    }
                )
        )

        .forEach(
            cliente => {

                const ticketsCliente =
                    grupos[cliente];


                const filaGrupo =
                    document.createElement(
                        "tr"
                    );


                filaGrupo.className =
                    "cliente-grupo-fila";


                const celdaGrupo =
                    document.createElement(
                        "td"
                    );


                /*
                 * Antes eran 8 columnas.
                 * Ahora tenemos 10.
                 */
                celdaGrupo.colSpan =
                    11;


                celdaGrupo.className =
                    "cliente-grupo-celda";


                const grupo =
                    document.createElement(
                        "section"
                    );


                grupo.className =
                    "cliente-ticket-grupo";


                const titulo =
                    document.createElement(
                        "div"
                    );


                titulo.className =
                    "cliente-ticket-titulo";


                titulo.textContent =
                    `Cliente: ${cliente} — `
                    +
                    `${ticketsCliente.length} ticket(s)`;


                const scroll =
                    document.createElement(
                        "div"
                    );


                scroll.className =
                    "cliente-ticket-scroll";


                const tabla =
                    document.createElement(
                        "table"
                    );


                tabla.className =
                    "cliente-ticket-tabla";


                tabla.innerHTML = `

                    <thead>

                        <tr>

                            <th>
                                Número
                            </th>

                            <th>
                                Título
                            </th>

                            <th>
                                Compañía
                            </th>

                            <th>
                                Proyecto
                            </th>

                            <th>
                                Atención
                            </th>

                            <th>
                                Cliente
                            </th>

                            <th>
                                Agente
                            </th>

                            <th>
                                Estado
                            </th>

                            <th>
                                Prioridad
                            </th>

                            <th>
                                Fecha
                            </th>

                            <th>
                                Acciones
                            </th>

                        </tr>

                    </thead>


                    <tbody>
                    </tbody>
                `;


                const tbodyCliente =
                    tabla.querySelector(
                        "tbody"
                    );


                ticketsCliente.forEach(
                    ticket => {

                        tbodyCliente.appendChild(
                            crearFilaTicketAgrupado(
                                ticket
                            )
                        );
                    }
                );


                scroll.appendChild(
                    tabla
                );


                grupo.appendChild(
                    titulo
                );


                grupo.appendChild(
                    scroll
                );


                celdaGrupo.appendChild(
                    grupo
                );


                filaGrupo.appendChild(
                    celdaGrupo
                );


                tbody.appendChild(
                    filaGrupo
                );
            }
        );
}


/*
 * Crea cada fila dentro de las tablas
 * agrupadas por cliente.
 */
function crearFilaTicketAgrupado(
    ticket
) {

    const tr =
        document.createElement(
            "tr"
        );


    tr.innerHTML = `

        <td>
            ${escaparHtmlTicket(
                ticket.numeroTicket
                ||
                "Sin número"
            )}
        </td>


        <td>
            ${escaparHtmlTicket(
                ticket.titulo
                ||
                "Sin título"
            )}
        </td>


        <td>
            ${escaparHtmlTicket(
                ticket.companiaNombre
                ||
                "Sin compañía"
            )}
        </td>


        <td>
            ${escaparHtmlTicket(
                ticket.proyectoNombre
                ||
                "Sin proyecto"
            )}
        </td>


        <td>
            ${escaparHtmlTicket(
                obtenerTextoTipoAtencion(
                    ticket.tipoAtencion
                )
            )}
        </td>


        <td>
            ${escaparHtmlTicket(
                ticket.clienteNombre
                ||
                "Sin cliente"
            )}
        </td>


        <td>
            ${escaparHtmlTicket(
                ticket.agenteNombre
                ||
                "Sin asignar"
            )}
        </td>


        <td>

            <span
                class="badge ${
                    obtenerClaseEstado(
                        ticket.estado
                    )
                }">

                ${escaparHtmlTicket(
                    ticket.estado
                    ||
                    "Sin estado"
                )}

            </span>

        </td>


        <td>

            <span
                class="badge ${
                    obtenerClasePrioridad(
                        ticket.prioridad
                    )
                }">

                ${escaparHtmlTicket(
                    ticket.prioridad
                    ||
                    "Sin prioridad"
                )}

            </span>

        </td>


        <td>
            ${formatearFecha(
                ticket.fechaCreacion
            )}
        </td>


        <td>

            <a
                href="${construirUrlDetalleTicket(ticket.id)}"
                class="action-link">

                Ver

            </a>

        </td>
    `;


    return tr;
}



/*
 * =========================================================
 * CONTEXTO DE PROYECTO DESDE LA URL
 * =========================================================
 */

function aplicarContextoProyectoDesdeUrl() {

    if (!proyectoContextoId) {

        return;
    }


    const filtroProyecto =
        document.getElementById(
            "filtroProyecto"
        );


    const filtroCompania =
        document.getElementById(
            "filtroCompania"
        );


    const ticketReferencia =
        ticketsOriginales.find(
            ticket =>
                Number(
                    ticket.proyectoId
                )
                ===
                Number(
                    proyectoContextoId
                )
        );


    /*
     * Si conocemos la compañía del proyecto,
     * la seleccionamos primero para que el filtro
     * de proyectos quede limitado correctamente.
     */
    if (
        ticketReferencia?.companiaId
        &&
        filtroCompania
    ) {

        const companiaDisponible =
            Array.from(
                filtroCompania.options
            )
                .some(
                    option =>
                        Number(
                            option.value
                        )
                        ===
                        Number(
                            ticketReferencia.companiaId
                        )
                );


        if (companiaDisponible) {

            filtroCompania.value =
                String(
                    ticketReferencia.companiaId
                );


            actualizarFiltroProyectos();
        }
    }


    const descripcion =
        document.getElementById(
            "descripcionVista"
        );


    if (
        descripcion
        &&
        ticketReferencia?.proyectoNombre
    ) {

        descripcion.textContent =
            `Estás viendo los tickets del proyecto "${ticketReferencia.proyectoNombre}".`;
    }


    if (filtroProyecto) {

        const proyectoDisponible =
            Array.from(
                filtroProyecto.options
            )
                .some(
                    option =>
                        Number(
                            option.value
                        )
                        ===
                        Number(
                            proyectoContextoId
                        )
                );


        if (proyectoDisponible) {

            filtroProyecto.value =
                String(
                    proyectoContextoId
                );
        }
    }
}


/*
 * =========================================================
 * URL DEL DETALLE DEL TICKET
 * =========================================================
 */

function construirUrlDetalleTicket(
    ticketId
) {

    const params =
        new URLSearchParams();


    params.set(
        "id",
        String(
            ticketId
        )
    );


    /*
     * Si llegamos desde el detalle de un proyecto,
     * conservamos ese proyecto al abrir el ticket.
     */
    if (
        proyectoContextoId
    ) {

        params.set(
            "proyectoId",
            String(
                proyectoContextoId
            )
        );
    }


    return `ticket-detalle.html?${
        params.toString()
    }`;
}


/*
 * =========================================================
 * CONFIGURACIÓN DE FILTROS
 * =========================================================
 */

function configurarFiltros() {

    const filtroEstado =
        document.getElementById(
            "filtroEstado"
        );


    const filtroTipoAtencion =
        document.getElementById(
            "filtroTipoAtencion"
        );


    const filtroPrioridad =
        document.getElementById(
            "filtroPrioridad"
        );


    const filtroCliente =
        document.getElementById(
            "filtroCliente"
        );


    const filtroCompania =
        document.getElementById(
            "filtroCompania"
        );


    const filtroProyecto =
        document.getElementById(
            "filtroProyecto"
        );


    const buscarTicket =
        document.getElementById(
            "buscarTicket"
        );


    filtroEstado?.addEventListener(
        "change",
        aplicarFiltros
    );


    filtroTipoAtencion?.addEventListener(
        "change",
        aplicarFiltros
    );


    filtroPrioridad?.addEventListener(
        "change",
        aplicarFiltros
    );


    filtroCliente?.addEventListener(
        "change",
        aplicarFiltros
    );


    /*
     * Cuando cambia la compañía:
     *
     * 1. Actualizamos los proyectos disponibles.
     * 2. Aplicamos nuevamente los filtros.
     */
    filtroCompania?.addEventListener(
        "change",
        () => {

            actualizarFiltroProyectos();

            aplicarFiltros();
        }
    );


    filtroProyecto?.addEventListener(
        "change",
        aplicarFiltros
    );


    buscarTicket?.addEventListener(
        "input",
        aplicarFiltros
    );
}


/*
 * =========================================================
 * APLICAR FILTROS
 * =========================================================
 */

function aplicarFiltros() {

    const estado =
        document
            .getElementById(
                "filtroEstado"
            )
            ?.value
        ||
        "";


    const tipoAtencion =
        document
            .getElementById(
                "filtroTipoAtencion"
            )
            ?.value
        ||
        "";


    const prioridad =
        document
            .getElementById(
                "filtroPrioridad"
            )
            ?.value
        ||
        "";


    const clienteId =
        document
            .getElementById(
                "filtroCliente"
            )
            ?.value
        ||
        "";


    const companiaId =
        document
            .getElementById(
                "filtroCompania"
            )
            ?.value
        ||
        "";


    const proyectoId =
        document
            .getElementById(
                "filtroProyecto"
            )
            ?.value
        ||
        "";


    const texto =
        document
            .getElementById(
                "buscarTicket"
            )
            ?.value
            .toLowerCase()
            .trim()
        ||
        "";


    let ticketsFiltrados =
        [...ticketsOriginales];


    /*
     * ESTADO
     */
    if (estado) {

        ticketsFiltrados =
            ticketsFiltrados.filter(
                ticket =>
                    ticket.estado
                    ===
                    estado
            );
    }


    /*
     * TIPO DE ATENCIÓN
     */
    if (tipoAtencion) {

        ticketsFiltrados =
            ticketsFiltrados.filter(
                ticket =>
                    String(
                        ticket.tipoAtencion || "OPERATIVO"
                    )
                        .trim()
                        .toUpperCase()
                    ===
                    tipoAtencion
            );
    }


    /*
     * PRIORIDAD
     */
    if (prioridad) {

        ticketsFiltrados =
            ticketsFiltrados.filter(
                ticket =>
                    ticket.prioridad
                    ===
                    prioridad
            );
    }


    /*
     * CLIENTE
     */
    if (clienteId) {

        ticketsFiltrados =
            ticketsFiltrados.filter(
                ticket =>

                    Number(
                        ticket.clienteId
                    )
                    ===
                    Number(
                        clienteId
                    )
            );
    }


    /*
     * COMPAÑÍA
     */
    if (companiaId) {

        ticketsFiltrados =
            ticketsFiltrados.filter(
                ticket =>

                    Number(
                        ticket.companiaId
                    )
                    ===
                    Number(
                        companiaId
                    )
            );
    }


    /*
     * PROYECTO
     */
    if (proyectoId) {

        ticketsFiltrados =
            ticketsFiltrados.filter(
                ticket =>

                    Number(
                        ticket.proyectoId
                    )
                    ===
                    Number(
                        proyectoId
                    )
            );
    }


    /*
     * BUSCADOR GENERAL
     */
    if (texto) {

        ticketsFiltrados =
            ticketsFiltrados.filter(
                ticket => {

                    const numeroTicket =
                        String(
                            ticket.numeroTicket
                            ||
                            ""
                        )
                            .toLowerCase();


                    const titulo =
                        String(
                            ticket.titulo
                            ||
                            ""
                        )
                            .toLowerCase();


                    const clienteNombre =
                        String(
                            ticket.clienteNombre
                            ||
                            ""
                        )
                            .toLowerCase();


                    const agenteNombre =
                        String(
                            ticket.agenteNombre
                            ||
                            ""
                        )
                            .toLowerCase();


                    const companiaNombre =
                        String(
                            ticket.companiaNombre
                            ||
                            ""
                        )
                            .toLowerCase();


                    const proyectoNombre =
                        String(
                            ticket.proyectoNombre
                            ||
                            ""
                        )
                            .toLowerCase();


                    const tipoAtencionTicket =
                        obtenerTextoTipoAtencion(
                            ticket.tipoAtencion
                        )
                            .toLowerCase();


                    const estadoTicket =
                        String(
                            ticket.estado
                            ||
                            ""
                        )
                            .toLowerCase();


                    const prioridadTicket =
                        String(
                            ticket.prioridad
                            ||
                            ""
                        )
                            .toLowerCase();


                    return (

                        numeroTicket.includes(
                            texto
                        )

                        ||

                        titulo.includes(
                            texto
                        )

                        ||

                        clienteNombre.includes(
                            texto
                        )

                        ||

                        agenteNombre.includes(
                            texto
                        )

                        ||

                        companiaNombre.includes(
                            texto
                        )

                        ||

                        proyectoNombre.includes(
                            texto
                        )

                        ||

                        tipoAtencionTicket.includes(
                            texto
                        )

                        ||

                        estadoTicket.includes(
                            texto
                        )

                        ||

                        prioridadTicket.includes(
                            texto
                        )
                    );
                }
            );
    }


    ticketsVisibles =
        ticketsFiltrados;


    pintarTickets(
        ticketsVisibles
    );
}


/*
 * =========================================================
 * FILTRO DE CLIENTES
 * =========================================================
 */

function cargarClientesEnFiltro(
    tickets,
    usuario
) {

    const filtroCliente =
        document.getElementById(
            "filtroCliente"
        );


    const grupoFiltroCliente =
        document.getElementById(
            "grupoFiltroCliente"
        );


    if (
        !filtroCliente
        ||
        !grupoFiltroCliente
        ||
        !usuario
    ) {

        return;
    }


    const rol =
        String(
            usuario.rol || ""
        )
            .trim()
            .toUpperCase();


    /*
     * CLIENTE y AGENTE no necesitan
     * filtrar por cliente.
     */
    if (
        rol !== "ADMIN"
        &&
        rol !== "SUPERVISOR"
    ) {

        grupoFiltroCliente.style.display =
            "none";

        return;
    }


    grupoFiltroCliente.style.display =
        "flex";


    filtroCliente.innerHTML = `
        <option value="">
            Todos los clientes
        </option>
    `;


    const clientesUnicos =
        new Map();


    tickets.forEach(
        ticket => {

            if (
                ticket.clienteId
                &&
                ticket.clienteNombre
            ) {

                clientesUnicos.set(
                    Number(
                        ticket.clienteId
                    ),
                    ticket.clienteNombre
                );
            }
        }
    );


    Array
        .from(
            clientesUnicos.entries()
        )

        .sort(
            (a, b) =>

                String(
                    a[1]
                )
                    .localeCompare(
                        String(
                            b[1]
                        ),
                        "es",
                        {
                            sensitivity:
                                "base"
                        }
                    )
        )

        .forEach(
            ([id, nombre]) => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    id;


                option.textContent =
                    nombre;


                filtroCliente.appendChild(
                    option
                );
            }
        );
}


/*
 * =========================================================
 * FILTRO DE COMPAÑÍAS
 * =========================================================
 */

function cargarCompaniasEnFiltro(
    tickets
) {

    const filtroCompania =
        document.getElementById(
            "filtroCompania"
        );


    if (!filtroCompania) {

        return;
    }


    filtroCompania.innerHTML = `
        <option value="">
            Todas las compañías
        </option>
    `;


    const companiasUnicas =
        new Map();


    tickets.forEach(
        ticket => {

            if (
                ticket.companiaId
                &&
                ticket.companiaNombre
            ) {

                companiasUnicas.set(
                    Number(
                        ticket.companiaId
                    ),
                    ticket.companiaNombre
                );
            }
        }
    );


    Array
        .from(
            companiasUnicas.entries()
        )

        .sort(
            (a, b) =>

                String(
                    a[1]
                )
                    .localeCompare(
                        String(
                            b[1]
                        ),
                        "es",
                        {
                            sensitivity:
                                "base"
                        }
                    )
        )

        .forEach(
            ([id, nombre]) => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    id;


                option.textContent =
                    nombre;


                filtroCompania.appendChild(
                    option
                );
            }
        );
}


/*
 * =========================================================
 * FILTRO DE PROYECTOS
 * =========================================================
 */

function actualizarFiltroProyectos() {

    const filtroCompania =
        document.getElementById(
            "filtroCompania"
        );


    const filtroProyecto =
        document.getElementById(
            "filtroProyecto"
        );


    if (!filtroProyecto) {

        return;
    }


    const companiaId =
        filtroCompania?.value
        ||
        "";


    const proyectoSeleccionado =
        filtroProyecto.value;


    /*
     * Si hay compañía seleccionada,
     * mostramos solamente proyectos de ella.
     *
     * Si no hay compañía seleccionada,
     * mostramos todos los proyectos disponibles.
     */
    const ticketsBase =
        companiaId

            ? ticketsOriginales.filter(
                ticket =>

                    Number(
                        ticket.companiaId
                    )
                    ===
                    Number(
                        companiaId
                    )
            )

            : ticketsOriginales;


    const proyectosUnicos =
        new Map();


    ticketsBase.forEach(
        ticket => {

            if (
                ticket.proyectoId
                &&
                ticket.proyectoNombre
            ) {

                proyectosUnicos.set(
                    Number(
                        ticket.proyectoId
                    ),
                    ticket.proyectoNombre
                );
            }
        }
    );


    filtroProyecto.innerHTML = `
        <option value="">
            Todos los proyectos
        </option>
    `;


    Array
        .from(
            proyectosUnicos.entries()
        )

        .sort(
            (a, b) =>

                String(
                    a[1]
                )
                    .localeCompare(
                        String(
                            b[1]
                        ),
                        "es",
                        {
                            sensitivity:
                                "base"
                        }
                    )
        )

        .forEach(
            ([id, nombre]) => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    id;


                option.textContent =
                    nombre;


                filtroProyecto.appendChild(
                    option
                );
            }
        );


    /*
     * Conservamos el proyecto seleccionado
     * solamente si sigue perteneciendo a la
     * compañía escogida.
     */
    const proyectoSigueDisponible =
        Array
            .from(
                filtroProyecto.options
            )
            .some(
                option =>
                    option.value
                    ===
                    proyectoSeleccionado
            );


    filtroProyecto.value =
        proyectoSigueDisponible

            ? proyectoSeleccionado

            : "";
}


/*
 * =========================================================
 * SEGURIDAD AL INSERTAR TEXTO EN HTML
 * =========================================================
 */

function obtenerTextoTipoAtencion(valor) {

    return String(
        valor || "OPERATIVO"
    )
        .trim()
        .toUpperCase()
    === "RECURSO_EXTERNO"

        ? "Recurso externo"
        : "Operativo";
}


/* =========================================================
 * ESCAPE / UTILIDADES
 * ========================================================= */

function escaparHtmlTicket(
    valor
) {

    return String(
        valor ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}