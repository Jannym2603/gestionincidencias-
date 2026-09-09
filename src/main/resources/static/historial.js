let historialOriginal = [];
let ticketsHistorial = [];
let historialEnriquecido = [];

document.addEventListener("DOMContentLoaded", async () => {
    inicializarLayout();

    const usuario = obtenerSesion();

    if (!usuario) {
        window.location.href = "login.html";
        return;
    }

    configurarDescripcionHistorial(usuario);
    configurarFiltrosHistorial();

    await cargarDatosHistorial();
});

async function cargarDatosHistorial() {
    const tbody = document.getElementById("historialBody");

    try {
        /*
         * Primero cargamos /api/tickets.
         * Ese endpoint ya devuelve solamente los tickets que el
         * usuario autenticado puede consultar según su rol.
         */
        const ticketsResponse =
            await fetch(`${API_BASE}/tickets`);

        if (!ticketsResponse.ok) {
            throw new Error(
                await obtenerMensajeErrorHistorial(ticketsResponse)
                || "No se pudieron cargar los tickets disponibles."
            );
        }

        ticketsHistorial =
            await ticketsResponse.json();

        if (!Array.isArray(ticketsHistorial)) {
            ticketsHistorial = [];
        }

        /*
         * En lugar de depender del endpoint global
         * /api/historial-tickets, consultamos el historial de cada
         * ticket permitido. Este mismo endpoint ya es utilizado en
         * el detalle del ticket y permite respetar el alcance por rol.
         */
        const respuestasHistorial =
            await Promise.all(
                ticketsHistorial.map(
                    async ticket => {
                        try {
                            const response =
                                await fetch(
                                    `${API_BASE}/historial-tickets/ticket/${ticket.id}`
                                );

                            if (!response.ok) {
                                console.warn(
                                    `No se pudo cargar el historial del ticket ${ticket.numeroTicket || ticket.id}.`
                                );

                                return [];
                            }

                            const data =
                                await response.json();

                            return Array.isArray(data)
                                ? data
                                : [];

                        } catch (error) {
                            console.warn(
                                `Error cargando historial del ticket ${ticket.numeroTicket || ticket.id}:`,
                                error
                            );

                            return [];
                        }
                    }
                )
            );

        historialOriginal =
            respuestasHistorial.flat();

        historialEnriquecido =
            enriquecerHistorial(
                historialOriginal,
                ticketsHistorial
            );

        cargarFiltroCompanias();
        actualizarFiltroProyectos();
        actualizarFiltroTickets();
        aplicarFiltrosHistorial();

    } catch (error) {
        console.error("Error cargando historial:", error);

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9">
                        No se pudo cargar el historial.
                    </td>
                </tr>
            `;
        }
    }
}

function enriquecerHistorial(historial, tickets) {
    const ticketsPorId = new Map();

    tickets.forEach(ticket => {
        ticketsPorId.set(Number(ticket.id), ticket);
    });

    return historial
        .map(item => {
            const ticket = ticketsPorId.get(Number(item.ticketId));

            if (!ticket) return null;

            return {
                ...item,
                companiaId: Number(ticket.companiaId || 0),
                companiaNombre: ticket.companiaNombre || "Sin compañía",
                proyectoId: Number(ticket.proyectoId || 0),
                proyectoNombre: ticket.proyectoNombre || "Sin proyecto"
            };
        })
        .filter(Boolean);
}

function configurarDescripcionHistorial(usuario) {
    const descripcion = document.getElementById("descripcionHistorial");

    if (!descripcion) return;

    const rol = String(usuario?.rol || "").trim().toUpperCase();

    if (rol === "ADMIN") {
        descripcion.textContent =
            "Consulta las acciones registradas en todos los tickets del sistema.";
    } else if (rol === "SUPERVISOR") {
        descripcion.textContent =
            "Consulta el historial de los tickets pertenecientes a los proyectos que supervisas.";
    } else if (rol === "AGENTE") {
        descripcion.textContent =
            "Consulta el historial de los tickets que tienes asignados.";
    } else if (rol === "CLIENTE") {
        descripcion.textContent =
            "Consulta el historial disponible de tus propios tickets.";
    }
}

function configurarFiltrosHistorial() {
    const filtroCompania = document.getElementById("filtroCompania");
    const filtroProyecto = document.getElementById("filtroProyecto");
    const filtroTicket = document.getElementById("filtroTicket");
    const filtroAccion = document.getElementById("filtroAccion");
    const btnLimpiar = document.getElementById("btnLimpiarFiltrosHistorial");

    filtroCompania?.addEventListener("change", () => {
        actualizarFiltroProyectos();

        if (filtroProyecto) filtroProyecto.value = "";

        actualizarFiltroTickets();
        aplicarFiltrosHistorial();
    });

    filtroProyecto?.addEventListener("change", () => {
        actualizarFiltroTickets();

        if (filtroTicket) filtroTicket.value = "";

        aplicarFiltrosHistorial();
    });

    filtroTicket?.addEventListener("change", aplicarFiltrosHistorial);
    filtroAccion?.addEventListener("change", aplicarFiltrosHistorial);

    btnLimpiar?.addEventListener("click", () => {
        if (filtroCompania) filtroCompania.value = "";

        actualizarFiltroProyectos();

        if (filtroProyecto) filtroProyecto.value = "";

        actualizarFiltroTickets();

        if (filtroTicket) filtroTicket.value = "";
        if (filtroAccion) filtroAccion.value = "";

        aplicarFiltrosHistorial();
    });
}

function cargarFiltroCompanias() {
    const select = document.getElementById("filtroCompania");

    if (!select) return;

    const companias = new Map();

    historialEnriquecido.forEach(item => {
        if (item.companiaId && !companias.has(item.companiaId)) {
            companias.set(item.companiaId, item.companiaNombre);
        }
    });

    select.innerHTML =
        `<option value="">Todas las compañías</option>`;

    Array.from(companias.entries())
        .sort((a, b) =>
            String(a[1]).localeCompare(
                String(b[1]),
                "es",
                { sensitivity: "base" }
            )
        )
        .forEach(([id, nombre]) => {
            const option = document.createElement("option");
            option.value = String(id);
            option.textContent = nombre;
            select.appendChild(option);
        });
}

function actualizarFiltroProyectos() {
    const selectCompania = document.getElementById("filtroCompania");
    const selectProyecto = document.getElementById("filtroProyecto");

    if (!selectProyecto) return;

    const companiaId = Number(selectCompania?.value || 0);
    const proyectos = new Map();

    historialEnriquecido
        .filter(item =>
            !companiaId
            || Number(item.companiaId) === companiaId
        )
        .forEach(item => {
            if (item.proyectoId && !proyectos.has(item.proyectoId)) {
                proyectos.set(item.proyectoId, item.proyectoNombre);
            }
        });

    selectProyecto.innerHTML =
        `<option value="">Todos los proyectos</option>`;

    Array.from(proyectos.entries())
        .sort((a, b) =>
            String(a[1]).localeCompare(
                String(b[1]),
                "es",
                { sensitivity: "base" }
            )
        )
        .forEach(([id, nombre]) => {
            const option = document.createElement("option");
            option.value = String(id);
            option.textContent = nombre;
            selectProyecto.appendChild(option);
        });
}

function actualizarFiltroTickets() {
    const selectCompania = document.getElementById("filtroCompania");
    const selectProyecto = document.getElementById("filtroProyecto");
    const selectTicket = document.getElementById("filtroTicket");

    if (!selectTicket) return;

    const companiaId = Number(selectCompania?.value || 0);
    const proyectoId = Number(selectProyecto?.value || 0);
    const tickets = new Map();

    historialEnriquecido
        .filter(item =>
            (!companiaId || Number(item.companiaId) === companiaId)
            &&
            (!proyectoId || Number(item.proyectoId) === proyectoId)
        )
        .forEach(item => {
            if (item.ticketId && !tickets.has(Number(item.ticketId))) {
                tickets.set(
                    Number(item.ticketId),
                    item.numeroTicket || `Ticket #${item.ticketId}`
                );
            }
        });

    selectTicket.innerHTML =
        `<option value="">Todos los tickets</option>`;

    Array.from(tickets.entries())
        .sort((a, b) =>
            String(b[1]).localeCompare(
                String(a[1]),
                "es",
                { numeric: true }
            )
        )
        .forEach(([id, numero]) => {
            const option = document.createElement("option");
            option.value = String(id);
            option.textContent = numero;
            selectTicket.appendChild(option);
        });
}

function aplicarFiltrosHistorial() {
    const companiaId = Number(
        document.getElementById("filtroCompania")?.value || 0
    );

    const proyectoId = Number(
        document.getElementById("filtroProyecto")?.value || 0
    );

    const ticketId = Number(
        document.getElementById("filtroTicket")?.value || 0
    );

    const accion = String(
        document.getElementById("filtroAccion")?.value || ""
    )
        .trim()
        .toUpperCase();

    const filtrados = historialEnriquecido.filter(item => {
        if (
            companiaId
            &&
            Number(item.companiaId) !== companiaId
        ) {
            return false;
        }

        if (
            proyectoId
            &&
            Number(item.proyectoId) !== proyectoId
        ) {
            return false;
        }

        if (
            ticketId
            &&
            Number(item.ticketId) !== ticketId
        ) {
            return false;
        }

        if (
            accion
            &&
            String(item.accion || "").trim().toUpperCase() !== accion
        ) {
            return false;
        }

        return true;
    });

    pintarHistorial(filtrados);
    actualizarTextoAlcanceHistorial(filtrados.length);
}

function pintarHistorial(historial) {
    const tbody = document.getElementById("historialBody");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (!Array.isArray(historial) || historial.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    No hay eventos que coincidan con los filtros seleccionados.
                </td>
            </tr>
        `;
        return;
    }

    historial
        .slice()
        .sort((a, b) =>
            new Date(b.fechaCreacion || 0)
            -
            new Date(a.fechaCreacion || 0)
        )
        .forEach(item => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>
                    <strong>${escaparHtmlHistorial(item.numeroTicket || "-")}</strong>
                </td>

                <td>${escaparHtmlHistorial(item.companiaNombre || "-")}</td>

                <td>${escaparHtmlHistorial(item.proyectoNombre || "-")}</td>

                <td>${escaparHtmlHistorial(item.nombreUsuario || "Sistema")}</td>

                <td>
                    <span class="badge historial-action-badge">
                        ${escaparHtmlHistorial(formatearAccionHistorial(item.accion))}
                    </span>
                </td>

                <td>${escaparHtmlHistorial(item.valorAnterior || "-")}</td>

                <td>${escaparHtmlHistorial(item.valorNuevo || "-")}</td>

                <td class="historial-description-cell">
                    ${escaparHtmlHistorial(item.descripcion || "-")}
                </td>

                <td>${formatearFecha(item.fechaCreacion)}</td>
            `;

            tbody.appendChild(tr);
        });
}

function actualizarTextoAlcanceHistorial(total) {
    const alcance = document.getElementById("alcanceHistorial");
    const contador = document.getElementById("contadorHistorial");

    const compania = document.getElementById("filtroCompania");
    const proyecto = document.getElementById("filtroProyecto");
    const ticket = document.getElementById("filtroTicket");

    let texto = "Todos los eventos disponibles";

    if (ticket?.value) {
        texto =
            ticket.options[ticket.selectedIndex]?.text
            || "Ticket seleccionado";
    } else if (proyecto?.value) {
        texto =
            proyecto.options[proyecto.selectedIndex]?.text
            || "Proyecto seleccionado";
    } else if (compania?.value) {
        texto =
            compania.options[compania.selectedIndex]?.text
            || "Compañía seleccionada";
    }

    if (alcance) alcance.textContent = texto;

    if (contador) {
        contador.textContent = `${total} evento(s) encontrado(s).`;
    }
}

function formatearAccionHistorial(valor) {
    const accion = String(valor || "").trim().toUpperCase();

    const etiquetas = {
        CREACION_TICKET: "Creación ticket",
        ASIGNACION_AGENTE: "Asignación agente",
        CAMBIO_ESTADO: "Cambio estado",
        COMENTARIO_AGREGADO: "Comentario agregado",
        CAMBIO_PRIORIDAD: "Cambio prioridad"
    };

    return etiquetas[accion] || accion.replaceAll("_", " ");
}

function escaparHtmlHistorial(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function obtenerMensajeErrorHistorial(response) {
    try {
        const tipo =
            response.headers.get("content-type")
            || "";

        if (tipo.includes("application/json")) {
            const data = await response.json();

            return data?.message
                || data?.error
                || null;
        }

        return await response.text();

    } catch (error) {
        return null;
    }
}
