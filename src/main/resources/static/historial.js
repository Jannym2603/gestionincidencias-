let historialOriginal = [];
let ticketsDisponibles = [];
let historialVisible = [];

document.addEventListener("DOMContentLoaded", async () => {
    inicializarLayout();

    await cargarTicketsParaFiltro();
    await cargarHistorial();

    const filtroTicket = document.getElementById("filtroTicket");
    const filtroAccion = document.getElementById("filtroAccion");

    if (filtroTicket) {
        filtroTicket.addEventListener("change", aplicarFiltrosHistorial);
    }

    if (filtroAccion) {
        filtroAccion.addEventListener("change", aplicarFiltrosHistorial);
    }
});

async function cargarTicketsParaFiltro() {
    try {
        const usuario = obtenerSesion();

        const response = await fetch(`${API_BASE}/tickets`);

        if (!response.ok) {
            throw new Error("No se pudieron cargar los tickets");
        }

        const tickets = await response.json();

        ticketsDisponibles = filtrarTicketsPorRol(tickets, usuario);

        const select = document.getElementById("filtroTicket");

        if (!select) {
            return;
        }

        select.innerHTML = `<option value="">Todos los tickets</option>`;

        ticketsDisponibles.forEach(ticket => {
            const option = document.createElement("option");
            option.value = ticket.id;
            option.textContent = `${ticket.numeroTicket} - ${ticket.titulo}`;
            select.appendChild(option);
        });

        configurarTextoHistorial(usuario);

    } catch (error) {
        console.error("Error cargando tickets para filtro:", error);
    }
}

async function cargarHistorial() {
    try {
        const usuario = obtenerSesion();

        const response = await fetch(`${API_BASE}/historial-tickets`);

        if (!response.ok) {
            throw new Error("No se pudo cargar el historial");
        }

        const historial = await response.json();

        historialOriginal = filtrarHistorialPorRol(historial, ticketsDisponibles, usuario);
        historialVisible = [...historialOriginal];

        pintarHistorial(historialVisible);

    } catch (error) {
        console.error("Error cargando historial:", error);

        const tbody = document.getElementById("historialBody");
        tbody.innerHTML = `
            <tr>
                <td colspan="7">No se pudo cargar el historial.</td>
            </tr>
        `;
    }
}

function filtrarTicketsPorRol(tickets, usuario) {
    if (!usuario) {
        return [];
    }

    if (usuario.rol === "CLIENTE") {
        return tickets.filter(ticket => Number(ticket.clienteId) === Number(usuario.id));
    }

    if (usuario.rol === "AGENTE") {
        return tickets.filter(ticket => Number(ticket.agenteId) === Number(usuario.id));
    }

    return tickets;
}

function filtrarHistorialPorRol(historial, tickets, usuario) {
    if (!usuario) {
        return [];
    }

    if (usuario.rol === "ADMIN" || usuario.rol === "SUPERVISOR") {
        return historial;
    }

    const idsTicketsPermitidos = tickets.map(ticket => Number(ticket.id));

    return historial.filter(item => idsTicketsPermitidos.includes(Number(item.ticketId)));
}

function aplicarFiltrosHistorial() {
    const ticketId = document.getElementById("filtroTicket")?.value || "";
    const accion = document.getElementById("filtroAccion")?.value || "";

    let historialFiltrado = [...historialOriginal];

    if (ticketId) {
        historialFiltrado = historialFiltrado.filter(item => Number(item.ticketId) === Number(ticketId));
    }

    if (accion) {
        historialFiltrado = historialFiltrado.filter(item => item.accion === accion);
    }

    historialVisible = historialFiltrado;
    pintarHistorial(historialVisible);
}

function pintarHistorial(historial) {
    const tbody = document.getElementById("historialBody");
    tbody.innerHTML = "";

    if (historial.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">No hay eventos registrados para mostrar.</td>
            </tr>
        `;
        return;
    }

    historial.forEach(item => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${item.numeroTicket}</td>
            <td>${item.nombreUsuario || "Sistema"}</td>
            <td><span class="badge badge-asignado">${item.accion}</span></td>
            <td>${item.valorAnterior || "-"}</td>
            <td>${item.valorNuevo || "-"}</td>
            <td>${item.descripcion || "-"}</td>
            <td>${formatearFecha(item.fechaCreacion)}</td>
        `;

        tbody.appendChild(tr);
    });
}

function limpiarFiltros() {
    const filtroTicket = document.getElementById("filtroTicket");
    const filtroAccion = document.getElementById("filtroAccion");

    if (filtroTicket) {
        filtroTicket.value = "";
    }

    if (filtroAccion) {
        filtroAccion.value = "";
    }

    historialVisible = [...historialOriginal];
    pintarHistorial(historialVisible);
}

function configurarTextoHistorial(usuario) {
    const titulo = document.querySelector(".topbar h1");
    const descripcion = document.querySelector(".topbar p");

    if (!usuario || !titulo || !descripcion) {
        return;
    }

    if (usuario.rol === "CLIENTE") {
        titulo.textContent = "Mi historial";
        descripcion.textContent = "Consulta el historial de cambios de tus tickets.";
    } else if (usuario.rol === "AGENTE") {
        titulo.textContent = "Historial de tickets asignados";
        descripcion.textContent = "Consulta el historial de los tickets asignados a tu usuario.";
    } else if (usuario.rol === "SUPERVISOR") {
        titulo.textContent = "Historial general";
        descripcion.textContent = "Consulta los cambios registrados en todos los tickets.";
    } else if (usuario.rol === "ADMIN") {
        titulo.textContent = "Historial general";
        descripcion.textContent = "Consulta todos los eventos registrados en el sistema.";
    }
}