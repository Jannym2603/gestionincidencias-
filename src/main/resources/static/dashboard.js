document.addEventListener("DOMContentLoaded", () => {
    inicializarLayout();
    cargarDashboardPersonalizado();
    configurarBusqueda();
});

let ticketsDashboard = [];
let solicitudesRecursosDashboard = [];


async function cargarDashboardPersonalizado() {
    try {
        const usuario = obtenerSesion();

        if (!usuario) {
            window.location.href = "login.html";
            return;
        }

        configurarTextoDashboard(usuario);

        const response =
            await fetch(`${API_BASE}/tickets`);

        if (!response.ok) {
            throw new Error(
                "No se pudieron cargar los tickets"
            );
        }

        const tickets = await response.json();

        ticketsDashboard =
            filtrarTicketsPorRol(
                Array.isArray(tickets)
                    ? tickets
                    : [],
                usuario
            );

        cargarResumenOperativo(
            ticketsDashboard,
            usuario
        );

        cargarReportesOperativos(
            ticketsDashboard
        );

        pintarTicketsRecientes(
            ticketsDashboard.slice(0, 5)
        );

        await cargarResumenRecursosDashboard();

    } catch (error) {
        console.error(
            "Error cargando dashboard personalizado:",
            error
        );
    }
}


function filtrarTicketsPorRol(tickets, usuario) {
    if (!usuario) {
        return [];
    }

    /*
     * El backend ya limita los tickets según el usuario
     * autenticado. Conservamos este filtro adicional para
     * CLIENTE y AGENTE como protección de presentación.
     */
    if (usuario.rol === "CLIENTE") {
        return tickets.filter(
            ticket =>
                Number(ticket.clienteId) ===
                Number(usuario.id)
        );
    }

    if (usuario.rol === "AGENTE") {
        return tickets.filter(
            ticket =>
                Number(ticket.agenteId) ===
                Number(usuario.id)
        );
    }

    return tickets;
}


function obtenerTicketsOperativos(tickets) {
    return tickets.filter(
        ticket =>
            String(
                ticket.tipoAtencion || "OPERATIVO"
            )
                .trim()
                .toUpperCase()
            !== "RECURSO_EXTERNO"
    );
}


function configurarTextoDashboard(usuario) {
    const titulo =
        document.querySelector(".topbar h1");

    const descripcion =
        document.querySelector(".topbar p");

    if (!titulo || !descripcion) {
        return;
    }

    if (usuario.rol === "CLIENTE") {
        titulo.textContent =
            "Mi Dashboard";

        descripcion.textContent =
            "Resumen de tus incidencias y solicitudes de recursos.";

    } else if (usuario.rol === "AGENTE") {
        titulo.textContent =
            "Dashboard del Agente";

        descripcion.textContent =
            "Resumen de los tickets operativos y solicitudes dentro de tu alcance.";

    } else if (usuario.rol === "SUPERVISOR") {
        titulo.textContent =
            "Dashboard Supervisor";

        descripcion.textContent =
            "Resumen de Operaciones y recursos externos de tus proyectos.";

    } else if (usuario.rol === "ADMIN") {
        titulo.textContent =
            "Dashboard Administrador";

        descripcion.textContent =
            "Vista general del trabajo operativo y de las dependencias externas.";
    }
}


function cargarResumenOperativo(
    tickets,
    usuario
) {
    const operativos =
        obtenerTicketsOperativos(tickets);

    colocarTexto(
        "totalOperativos",
        operativos.length
    );

    colocarTexto(
        "ticketsNuevos",
        contarEstadoDashboard(
            operativos,
            "NUEVO"
        )
    );

    /*
     * ASIGNADO y RESUELTO se conservan solamente por compatibilidad
     * con tickets históricos. Mientras no exista un cierre formal,
     * se contabilizan dentro del trabajo en progreso.
     */
    const enProgreso =
        operativos.filter(
            ticket =>
                [
                    "ASIGNADO",
                    "EN_PROGRESO",
                    "RESUELTO"
                ].includes(
                    String(ticket.estado || "")
                        .trim()
                        .toUpperCase()
                )
        ).length;

    colocarTexto(
        "ticketsEnProgreso",
        enProgreso
    );

    colocarTexto(
        "ticketsCerrados",
        contarEstadoDashboard(
            operativos,
            "CERRADO"
        )
    );

    if (
        usuario.rol === "CLIENTE"
        || usuario.rol === "AGENTE"
    ) {
        colocarTexto(
            "totalUsuarios",
            "—"
        );

        colocarTexto(
            "totalComentarios",
            "—"
        );
    } else {
        cargarTotalesGlobalesExtra();
    }
}


function contarEstadoDashboard(
    tickets,
    estado
) {
    return tickets.filter(
        ticket =>
            String(ticket.estado || "")
                .trim()
                .toUpperCase()
            === estado
    ).length;
}


async function cargarTotalesGlobalesExtra() {
    try {
        const response =
            await fetch(
                `${API_BASE}/reportes/dashboard-resumen`
            );

        if (!response.ok) {
            throw new Error(
                "No se pudo cargar el resumen del Dashboard"
            );
        }

        const data =
            await response.json();

        colocarTexto(
            "totalUsuarios",
            data.totalUsuarios
        );

        colocarTexto(
            "totalComentarios",
            data.totalComentarios
        );

    } catch (error) {
        console.error(
            "Error cargando totales globales:",
            error
        );

        colocarTexto(
            "totalUsuarios",
            "—"
        );

        colocarTexto(
            "totalComentarios",
            "—"
        );
    }
}


function cargarReportesOperativos(tickets) {
    const operativos =
        obtenerTicketsOperativos(tickets);

    const estadosNormalizados = {};

    operativos.forEach(ticket => {
        const estado =
            String(ticket.estado || "SIN_ESTADO")
                .trim()
                .toUpperCase();

        const etiqueta =
            ["ASIGNADO", "RESUELTO"].includes(estado)
                ? "EN_PROGRESO"
                : estado;

        estadosNormalizados[etiqueta] =
            (estadosNormalizados[etiqueta] || 0) + 1;
    });

    pintarReporte(
        "estadoReporte",
        Object.entries(estadosNormalizados)
            .map(([nombre, total]) => ({
                nombre,
                total
            }))
    );

    pintarReporte(
        "prioridadReporte",
        contarPorCampo(
            operativos,
            "prioridad"
        )
    );

    pintarReporte(
        "tipoReporte",
        contarPorCampo(
            operativos,
            "tipoIncidenciaNombre"
        )
    );
}


async function cargarResumenRecursosDashboard() {
    const seccion =
        document.getElementById(
            "seccionRecursosDashboard"
        );

    try {
        const response =
            await fetch(
                `${API_BASE}/solicitudes-recursos`
            );

        /*
         * Si el módulo está desactivado para este usuario,
         * el backend responde 403. En ese caso el bloque
         * queda oculto.
         */
        if (response.status === 403) {
            if (seccion) {
                seccion.style.display = "none";
            }

            return;
        }

        if (!response.ok) {
            throw new Error(
                "No se pudieron cargar las solicitudes de recursos"
            );
        }

        const data =
            await response.json();

        solicitudesRecursosDashboard =
            Array.isArray(data)
                ? data
                : [];

        const ahora =
            new Date();

        const limite =
            new Date(
                ahora.getTime()
                + (7 * 24 * 60 * 60 * 1000)
            );

        const esperando =
            solicitudesRecursosDashboard.filter(
                solicitud =>
                    String(
                        solicitud.estadoRecurso || ""
                    )
                        .trim()
                        .toUpperCase()
                    === "ESPERANDO_PROVEEDOR"
            ).length;

        const entregadas =
            solicitudesRecursosDashboard.filter(
                solicitud =>
                    String(
                        solicitud.estadoRecurso || ""
                    )
                        .trim()
                        .toUpperCase()
                    === "ENTREGADO"
            ).length;

        const retrasadas =
            solicitudesRecursosDashboard.filter(
                solicitud =>
                    solicitudEstaRetrasada(
                        solicitud,
                        ahora
                    )
            ).length;

        const proximas =
            solicitudesRecursosDashboard.filter(
                solicitud =>
                    solicitudEsProximaEntrega(
                        solicitud,
                        ahora,
                        limite
                    )
            ).length;

        colocarTexto(
            "recursosEsperandoProveedor",
            esperando
        );

        colocarTexto(
            "recursosProximasEntregas",
            proximas
        );

        colocarTexto(
            "recursosRetrasados",
            retrasadas
        );

        colocarTexto(
            "recursosEntregados",
            entregadas
        );

    } catch (error) {
        console.error(
            "Error cargando recursos externos en Dashboard:",
            error
        );

        colocarTexto(
            "recursosEsperandoProveedor",
            "—"
        );

        colocarTexto(
            "recursosProximasEntregas",
            "—"
        );

        colocarTexto(
            "recursosRetrasados",
            "—"
        );

        colocarTexto(
            "recursosEntregados",
            "—"
        );
    }
}


function solicitudEstaRetrasada(
    solicitud,
    ahora
) {
    if (!solicitud?.fechaEstimadaEntrega) {
        return false;
    }

    const estado =
        String(
            solicitud.estadoRecurso || "NUEVO"
        )
            .trim()
            .toUpperCase();

    if (
        [
            "RECIBIDO",
            "ENTREGADO",
            "CERRADO",
            "CANCELADO"
        ].includes(estado)
    ) {
        return false;
    }

    const fecha =
        new Date(
            solicitud.fechaEstimadaEntrega
        );

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return false;
    }

    return fecha < ahora;
}


function solicitudEsProximaEntrega(
    solicitud,
    ahora,
    limite
) {
    if (!solicitud?.fechaEstimadaEntrega) {
        return false;
    }

    const estado =
        String(
            solicitud.estadoRecurso || "NUEVO"
        )
            .trim()
            .toUpperCase();

    if (
        [
            "RECIBIDO",
            "ENTREGADO",
            "CERRADO",
            "CANCELADO"
        ].includes(estado)
    ) {
        return false;
    }

    const fecha =
        new Date(
            solicitud.fechaEstimadaEntrega
        );

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return false;
    }

    return fecha >= ahora
        && fecha <= limite;
}


function contarPorCampo(tickets, campo) {
    const conteo = {};

    tickets.forEach(ticket => {
        const valor =
            ticket[campo]
            || "Sin dato";

        conteo[valor] =
            (conteo[valor] || 0) + 1;
    });

    return Object.keys(conteo)
        .map(nombre => ({
            nombre,
            total: conteo[nombre]
        }));
}


function pintarReporte(
    contenedorId,
    data
) {
    const contenedor =
        document.getElementById(
            contenedorId
        );

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = "";

    if (data.length === 0) {
        contenedor.innerHTML =
            "<p>No hay datos disponibles.</p>";

        return;
    }

    data.forEach(item => {
        const div =
            document.createElement("div");

        div.className =
            "report-item";

        div.innerHTML =
            `<span>${escaparHtmlDashboard(formatearEtiquetaDashboard(item.nombre))}</span>`
            + `<strong>${item.total}</strong>`;

        contenedor.appendChild(div);
    });
}


function formatearEtiquetaDashboard(valor) {
    const texto =
        String(valor || "")
            .trim();

    const equivalencias = {
        NUEVO: "Nuevo",
        EN_PROGRESO: "En progreso",
        CERRADO: "Cerrado",
        P1_CRITICA: "P1 · Crítica",
        P2_ALTA: "P2 · Alta",
        P3_MEDIA: "P3 · Media",
        P4_BAJA: "P4 · Baja"
    };

    return equivalencias[
        texto.toUpperCase()
    ]
    ||
    texto.replaceAll("_", " ");
}


function pintarTicketsRecientes(tickets) {
    const tbody =
        document.getElementById(
            "ticketsTableBody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (tickets.length === 0) {
        tbody.innerHTML =
            `<tr>`
            + `<td colspan="9">`
            + `No hay tickets registrados para este perfil.`
            + `</td>`
            + `</tr>`;

        return;
    }

    tickets.forEach(ticket => {
        const tr =
            document.createElement("tr");

        const tipoAtencion =
            String(
                ticket.tipoAtencion || "OPERATIVO"
            )
                .trim()
                .toUpperCase();

        const textoAtencion =
            tipoAtencion === "RECURSO_EXTERNO"
                ? "Recurso externo"
                : "Operativo";

        tr.innerHTML = `
            <td>${escaparHtmlDashboard(ticket.numeroTicket)}</td>
            <td>${escaparHtmlDashboard(ticket.titulo)}</td>
            <td>${escaparHtmlDashboard(textoAtencion)}</td>
            <td>${escaparHtmlDashboard(ticket.tipoIncidenciaNombre)}</td>
            <td>${escaparHtmlDashboard(ticket.clienteNombre)}</td>
            <td>
                <span class="badge ${obtenerClaseEstado(ticket.estado)}">
                    ${escaparHtmlDashboard(ticket.estado)}
                </span>
            </td>
            <td>${escaparHtmlDashboard(ticket.prioridad)}</td>
            <td>${escaparHtmlDashboard(formatearFecha(ticket.fechaCreacion))}</td>
            <td>
                <a
                    href="ticket-detalle.html?id=${Number(ticket.id)}"
                    class="action-link">
                    Ver
                </a>
            </td>`;

        tbody.appendChild(tr);
    });
}


function configurarBusqueda() {
    const inputBusqueda =
        document.getElementById(
            "buscarTicket"
        );

    if (!inputBusqueda) {
        return;
    }

    inputBusqueda.addEventListener(
        "input",
        () => {
            const texto =
                inputBusqueda.value
                    .toLowerCase();

            const ticketsFiltrados =
                ticketsDashboard.filter(
                    ticket =>
                        String(
                            ticket.numeroTicket || ""
                        )
                            .toLowerCase()
                            .includes(texto)

                        || String(
                            ticket.titulo || ""
                        )
                            .toLowerCase()
                            .includes(texto)

                        || String(
                            ticket.clienteNombre || ""
                        )
                            .toLowerCase()
                            .includes(texto)

                        || String(
                            ticket.estado || ""
                        )
                            .toLowerCase()
                            .includes(texto)

                        || String(
                            ticket.prioridad || ""
                        )
                            .toLowerCase()
                            .includes(texto)

                        || String(
                            ticket.tipoAtencion || ""
                        )
                            .toLowerCase()
                            .includes(texto)
                );

            pintarTicketsRecientes(
                ticketsFiltrados.slice(0, 5)
            );
        }
    );
}


function colocarTexto(id, valor) {
    const elemento =
        document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor;
    }
}


function escaparHtmlDashboard(valor) {
    return String(
        valor ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
