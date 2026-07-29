document.addEventListener("DOMContentLoaded", () => {
    inicializarLayout();
    cargarDashboardPersonalizado();
    configurarBusqueda();
});

let ticketsDashboard = [];

async function cargarDashboardPersonalizado() {
    try {
        const usuario = obtenerSesion();
        if (!usuario) {
            window.location.href = "login.html";
            return;
        }

        const response = await fetch(`${API_BASE}/tickets`);
        if (!response.ok) {
            throw new Error("No se pudieron cargar los tickets");
        }

        const tickets = await response.json();
        ticketsDashboard = filtrarTicketsPorRol(tickets, usuario);

        configurarTextoDashboard(usuario);
        cargarResumenPersonalizado(ticketsDashboard, usuario);
        cargarReportesPersonalizados(ticketsDashboard);
        pintarTicketsRecientes(ticketsDashboard.slice(0, 5));
    } catch (error) {
        console.error("Error cargando dashboard personalizado:", error);
    }
}

function filtrarTicketsPorRol(tickets, usuario) {
    if (!usuario) return [];
    if (usuario.rol === "CLIENTE") {
        return tickets.filter(ticket => Number(ticket.clienteId) === Number(usuario.id));
    }
    if (usuario.rol === "AGENTE") {
        return tickets.filter(ticket => Number(ticket.agenteId) === Number(usuario.id));
    }
    return tickets;
}

function configurarTextoDashboard(usuario) {
    const titulo = document.querySelector(".topbar h1");
    const descripcion = document.querySelector(".topbar p");
    if (!titulo || !descripcion) return;

    if (usuario.rol === "CLIENTE") {
        titulo.textContent = "Mi Dashboard";
        descripcion.textContent = "Resumen personalizado de tus incidencias registradas.";
    } else if (usuario.rol === "AGENTE") {
        titulo.textContent = "Dashboard del Agente";
        descripcion.textContent = "Resumen de los tickets asignados a tu usuario.";
    } else if (usuario.rol === "SUPERVISOR") {
        titulo.textContent = "Dashboard Supervisor";
        descripcion.textContent = "Resumen general de incidencias del sistema.";
    } else if (usuario.rol === "ADMIN") {
        titulo.textContent = "Dashboard Administrador";
        descripcion.textContent = "Vista general de tickets, usuarios, comentarios y reportes.";
    }
}

function cargarResumenPersonalizado(tickets, usuario) {
    colocarTexto("totalTickets", tickets.length);
    colocarTexto("ticketsNuevos", tickets.filter(ticket => ticket.estado === "NUEVO").length);
    colocarTexto("ticketsAsignados", tickets.filter(ticket => ticket.estado === "ASIGNADO").length);
    colocarTexto("ticketsEnProgreso", tickets.filter(ticket => ticket.estado === "EN_PROGRESO").length);
    colocarTexto("ticketsResueltos", tickets.filter(ticket => ticket.estado === "RESUELTO").length);
    colocarTexto("ticketsCerrados", tickets.filter(ticket => ticket.estado === "CERRADO").length);

    if (usuario.rol === "CLIENTE" || usuario.rol === "AGENTE") {
        colocarTexto("totalUsuarios", "—");
        colocarTexto("totalComentarios", "—");
    } else {
        cargarTotalesGlobalesExtra();
    }
}

async function cargarTotalesGlobalesExtra() {
    try {
        const response = await fetch(`${API_BASE}/reportes/resumen`);
        if (!response.ok) throw new Error("No se pudo cargar el resumen global");
        const data = await response.json();
        colocarTexto("totalUsuarios", data.totalUsuarios);
        colocarTexto("totalComentarios", data.totalComentarios);
    } catch (error) {
        console.error("Error cargando totales globales:", error);
        colocarTexto("totalUsuarios", "—");
        colocarTexto("totalComentarios", "—");
    }
}

function cargarReportesPersonalizados(tickets) {
    pintarReporte("estadoReporte", contarPorCampo(tickets, "estado"));
    pintarReporte("prioridadReporte", contarPorCampo(tickets, "prioridad"));
    pintarReporte("tipoReporte", contarPorCampo(tickets, "tipoIncidenciaNombre"));
}

function contarPorCampo(tickets, campo) {
    const conteo = {};
    tickets.forEach(ticket => {
        const valor = ticket[campo] || "Sin dato";
        conteo[valor] = (conteo[valor] || 0) + 1;
    });
    return Object.keys(conteo).map(nombre => ({ nombre, total: conteo[nombre] }));
}

function pintarReporte(contenedorId, data) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;
    contenedor.innerHTML = "";

    if (data.length === 0) {
        contenedor.innerHTML = "<p>No hay datos disponibles.</p>";
        return;
    }

    data.forEach(item => {
        const div = document.createElement("div");
        div.className = "report-item";
        div.innerHTML = `<span>${item.nombre}</span><strong>${item.total}</strong>`;
        contenedor.appendChild(div);
    });
}

function pintarTicketsRecientes(tickets) {
    const tbody = document.getElementById("ticketsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (tickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8">No hay tickets registrados para este perfil.</td></tr>`;
        return;
    }

    tickets.forEach(ticket => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${ticket.numeroTicket}</td>
            <td>${ticket.titulo}</td>
            <td>${ticket.tipoIncidenciaNombre}</td>
            <td>${ticket.clienteNombre}</td>
            <td><span class="badge ${obtenerClaseEstado(ticket.estado)}">${ticket.estado}</span></td>
            <td>${ticket.prioridad}</td>
            <td>${formatearFecha(ticket.fechaCreacion)}</td>
            <td><a href="ticket-detalle.html?id=${ticket.id}" class="action-link">Ver</a></td>`;
        tbody.appendChild(tr);
    });
}

function configurarBusqueda() {
    const inputBusqueda = document.getElementById("buscarTicket");
    if (!inputBusqueda) return;

    inputBusqueda.addEventListener("input", () => {
        const texto = inputBusqueda.value.toLowerCase();
        const ticketsFiltrados = ticketsDashboard.filter(ticket =>
            String(ticket.numeroTicket || "").toLowerCase().includes(texto) ||
            String(ticket.titulo || "").toLowerCase().includes(texto) ||
            String(ticket.clienteNombre || "").toLowerCase().includes(texto) ||
            String(ticket.estado || "").toLowerCase().includes(texto) ||
            String(ticket.prioridad || "").toLowerCase().includes(texto)
        );
        pintarTicketsRecientes(ticketsFiltrados.slice(0, 5));
    });
}

function colocarTexto(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = valor;
}
