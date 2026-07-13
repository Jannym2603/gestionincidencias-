let historialOriginal = [];
let ticketsDisponibles = [];
let historialVisible = [];

document.addEventListener("DOMContentLoaded", async () => {
    inicializarLayout();

    await cargarTicketsParaFiltro();
    await cargarHistorial();

    const filtroTicket =
        document.getElementById("filtroTicket");

    const filtroAccion =
        document.getElementById("filtroAccion");

    if (filtroTicket) {
        filtroTicket.addEventListener(
            "change",
            aplicarFiltrosHistorial
        );
    }

    if (filtroAccion) {
        filtroAccion.addEventListener(
            "change",
            aplicarFiltrosHistorial
        );
    }
});

/* =====================================================
   CARGAR TICKETS
===================================================== */

async function cargarTicketsParaFiltro() {
    try {
        const usuario = obtenerSesion();

        if (!usuario) {
            window.location.href = "login.html";
            return;
        }

        const response = await fetch(
            `${API_BASE}/tickets`
        );

        if (!response.ok) {
            throw new Error(
                "No se pudieron cargar los tickets."
            );
        }

        const tickets = await response.json();

        /*
         * Guardamos temporalmente todos los tickets.
         * Después de cargar el historial, mostraremos
         * solamente los tickets donde el usuario realizó acciones.
         */
        ticketsDisponibles = tickets;

        configurarTextoHistorial(usuario);

    } catch (error) {
        console.error(
            "Error cargando tickets para filtro:",
            error
        );
    }
}

/* =====================================================
   CARGAR HISTORIAL
===================================================== */

async function cargarHistorial() {
    try {
        const usuario = obtenerSesion();

        if (!usuario) {
            window.location.href = "login.html";
            return;
        }

        const response = await fetch(
            `${API_BASE}/historial-tickets`
        );

        if (!response.ok) {
            throw new Error(
                "No se pudo cargar el historial."
            );
        }

        const historial = await response.json();

        /*
         * Solo mostramos los eventos realizados
         * por el usuario que inició sesión.
         */
        historialOriginal = historial.filter(
            item =>
                Number(item.usuarioId) ===
                Number(usuario.id)
        );

        historialVisible = [...historialOriginal];

        actualizarFiltroTickets();
        pintarHistorial(historialVisible);

    } catch (error) {
        console.error(
            "Error cargando historial:",
            error
        );

        const tbody =
            document.getElementById("historialBody");

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        No se pudo cargar el historial.
                    </td>
                </tr>
            `;
        }
    }
}

/* =====================================================
   FILTRO DE TICKETS
===================================================== */

function actualizarFiltroTickets() {
    const select =
        document.getElementById("filtroTicket");

    if (!select) {
        return;
    }

    select.innerHTML = `
        <option value="">
            Todos mis tickets
        </option>
    `;

    /*
     * Obtenemos los IDs de tickets donde el usuario
     * realizó al menos una acción.
     */
    const idsTicketsHistorial = [
        ...new Set(
            historialOriginal.map(
                item => Number(item.ticketId)
            )
        )
    ];

    const ticketsDelUsuario =
        ticketsDisponibles.filter(
            ticket =>
                idsTicketsHistorial.includes(
                    Number(ticket.id)
                )
        );

    ticketsDelUsuario.forEach(ticket => {
        const option =
            document.createElement("option");

        option.value = ticket.id;

        option.textContent =
            `${ticket.numeroTicket} - ${ticket.titulo}`;

        select.appendChild(option);
    });
}

/* =====================================================
   APLICAR FILTROS
===================================================== */

function aplicarFiltrosHistorial() {
    const ticketId =
        document.getElementById("filtroTicket")
            ?.value || "";

    const accion =
        document.getElementById("filtroAccion")
            ?.value || "";

    let historialFiltrado = [
        ...historialOriginal
    ];

    if (ticketId) {
        historialFiltrado =
            historialFiltrado.filter(
                item =>
                    Number(item.ticketId) ===
                    Number(ticketId)
            );
    }

    if (accion) {
        historialFiltrado =
            historialFiltrado.filter(
                item => item.accion === accion
            );
    }

    historialVisible = historialFiltrado;

    pintarHistorial(historialVisible);
}

/* =====================================================
   PINTAR HISTORIAL
===================================================== */

function pintarHistorial(historial) {
    const tbody =
        document.getElementById("historialBody");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (historial.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    No tienes eventos registrados.
                </td>
            </tr>
        `;

        return;
    }

    historial.forEach(item => {
        const tr =
            document.createElement("tr");

        tr.innerHTML = `
            <td>
                ${escaparHtml(
                    item.numeroTicket || "-"
                )}
            </td>

            <td>
                ${escaparHtml(
                    item.nombreUsuario || "Sistema"
                )}
            </td>

            <td>
                <span class="badge badge-asignado">
                    ${escaparHtml(
                        item.accion || "-"
                    )}
                </span>
            </td>

            <td>
                ${escaparHtml(
                    item.valorAnterior || "-"
                )}
            </td>

            <td>
                ${escaparHtml(
                    item.valorNuevo || "-"
                )}
            </td>

            <td>
                ${escaparHtml(
                    item.descripcion || "-"
                )}
            </td>

            <td>
                ${formatearFecha(
                    item.fechaCreacion
                )}
            </td>
        `;

        tbody.appendChild(tr);
    });
}

/* =====================================================
   LIMPIAR FILTROS
===================================================== */

function limpiarFiltros() {
    const filtroTicket =
        document.getElementById("filtroTicket");

    const filtroAccion =
        document.getElementById("filtroAccion");

    if (filtroTicket) {
        filtroTicket.value = "";
    }

    if (filtroAccion) {
        filtroAccion.value = "";
    }

    historialVisible = [
        ...historialOriginal
    ];

    pintarHistorial(historialVisible);
}

/* =====================================================
   TEXTO SEGÚN USUARIO
===================================================== */

function configurarTextoHistorial(usuario) {
    const titulo =
        document.querySelector(".topbar h1");

    const descripcion =
        document.querySelector(".topbar p");

    if (!usuario || !titulo || !descripcion) {
        return;
    }

    titulo.textContent = "Mi historial";

    descripcion.textContent =
        "Consulta únicamente las acciones realizadas por tu usuario.";
}

/* =====================================================
   UTILIDAD DE SEGURIDAD
===================================================== */

function escaparHtml(valor) {
    const texto = String(valor ?? "");

    return texto
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}