let ticketsOriginales = [];
let ticketsVisibles = [];

document.addEventListener("DOMContentLoaded", () => {
    inicializarLayout();
    cargarTickets();
    configurarFiltros();
});

async function cargarTickets() {
    try {
        const usuario = obtenerSesion();

        const response = await fetch(`${API_BASE}/tickets`);

        if (!response.ok) {
            throw new Error("No se pudieron cargar los tickets");
        }

        const tickets = await response.json();

        ticketsOriginales = aplicarFiltroPorPerfil(tickets, usuario);
        ticketsVisibles = [...ticketsOriginales];

        configurarDescripcionVista(usuario);
        cargarClientesEnFiltro(ticketsOriginales, usuario);
        pintarTickets(ticketsVisibles);

    } catch (error) {
        console.error("Error cargando tickets:", error);

        const tbody = document.getElementById("ticketsBody");
        tbody.innerHTML = `
            <tr>
                <td colspan="8">No se pudieron cargar los tickets.</td>
            </tr>
        `;
    }
}

function aplicarFiltroPorPerfil(tickets, usuario) {
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

function configurarDescripcionVista(usuario) {
    const descripcion = document.getElementById("descripcionVista");

    if (!descripcion || !usuario) {
        return;
    }

    if (usuario.rol === "CLIENTE") {
        descripcion.textContent = "Estás viendo únicamente los tickets registrados a tu nombre.";
    } else if (usuario.rol === "AGENTE") {
        descripcion.textContent = "Estás viendo únicamente los tickets asignados a ti.";
    } else if (usuario.rol === "SUPERVISOR") {
        descripcion.textContent = "Estás viendo todos los tickets separados por cliente.";
    } else if (usuario.rol === "ADMIN") {
        descripcion.textContent = "Estás viendo todos los tickets del sistema separados por cliente.";
    }
}

function pintarTickets(tickets) {
    const usuario = obtenerSesion();
    const tbody = document.getElementById("ticketsBody");
    tbody.innerHTML = "";

    if (tickets.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">No hay tickets registrados para este perfil.</td>
            </tr>
        `;
        return;
    }

    if (usuario.rol === "ADMIN" || usuario.rol === "SUPERVISOR") {
        pintarTicketsAgrupadosPorCliente(tickets);
        return;
    }

    pintarTicketsNormales(tickets);
}

function pintarTicketsNormales(tickets) {
    const tbody = document.getElementById("ticketsBody");
    tbody.innerHTML = "";

    tickets.forEach(ticket => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${ticket.numeroTicket}</td>
            <td>${ticket.titulo}</td>
            <td>${ticket.clienteNombre}</td>
            <td>${ticket.agenteNombre || "Sin asignar"}</td>
            <td>
                <span class="badge ${obtenerClaseEstado(ticket.estado)}">
                    ${ticket.estado}
                </span>
            </td>
            <td>${ticket.prioridad}</td>
            <td>${formatearFecha(ticket.fechaCreacion)}</td>
            <td>
                <a href="ticket-detalle.html?id=${ticket.id}" class="action-link">Ver</a>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function pintarTicketsAgrupadosPorCliente(tickets) {
    const tbody = document.getElementById("ticketsBody");
    tbody.innerHTML = "";

    const grupos = {};

    tickets.forEach(ticket => {
        const cliente = ticket.clienteNombre || "Cliente sin nombre";

        if (!grupos[cliente]) {
            grupos[cliente] = [];
        }

        grupos[cliente].push(ticket);
    });

    Object.keys(grupos).sort().forEach(cliente => {
        const filaCliente = document.createElement("tr");

        filaCliente.innerHTML = `
            <td colspan="8" style="
                background: #eff6ff;
                color: #1e40af;
                font-weight: bold;
                padding: 14px;
                border-top: 2px solid #bfdbfe;
            ">
                Cliente: ${cliente} — ${grupos[cliente].length} ticket(s)
            </td>
        `;

        tbody.appendChild(filaCliente);

        grupos[cliente].forEach(ticket => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${ticket.numeroTicket}</td>
                <td>${ticket.titulo}</td>
                <td>${ticket.clienteNombre}</td>
                <td>${ticket.agenteNombre || "Sin asignar"}</td>
                <td>
                    <span class="badge ${obtenerClaseEstado(ticket.estado)}">
                        ${ticket.estado}
                    </span>
                </td>
                <td>${ticket.prioridad}</td>
                <td>${formatearFecha(ticket.fechaCreacion)}</td>
                <td>
                    <a href="ticket-detalle.html?id=${ticket.id}" class="action-link">Ver</a>
                </td>
            `;

            tbody.appendChild(tr);
        });
    });
}

function configurarFiltros() {
    const filtroEstado = document.getElementById("filtroEstado");
    const filtroPrioridad = document.getElementById("filtroPrioridad");
    const filtroCliente = document.getElementById("filtroCliente");
    const buscarTicket = document.getElementById("buscarTicket");

    if (filtroEstado) {
        filtroEstado.addEventListener("change", aplicarFiltros);
    }

    if (filtroPrioridad) {
        filtroPrioridad.addEventListener("change", aplicarFiltros);
    }

    if (filtroCliente) {
        filtroCliente.addEventListener("change", aplicarFiltros);
    }

    if (buscarTicket) {
        buscarTicket.addEventListener("input", aplicarFiltros);
    }
}

function aplicarFiltros() {
    const estado = document.getElementById("filtroEstado")?.value || "";
    const prioridad = document.getElementById("filtroPrioridad")?.value || "";
    const clienteId = document.getElementById("filtroCliente")?.value || "";
    const texto = document.getElementById("buscarTicket")?.value.toLowerCase() || "";

    let ticketsFiltrados = [...ticketsOriginales];

    if (estado) {
        ticketsFiltrados = ticketsFiltrados.filter(ticket => ticket.estado === estado);
    }

    if (prioridad) {
        ticketsFiltrados = ticketsFiltrados.filter(ticket => ticket.prioridad === prioridad);
    }

    if (clienteId) {
        ticketsFiltrados = ticketsFiltrados.filter(ticket => Number(ticket.clienteId) === Number(clienteId));
    }

    if (texto) {
        ticketsFiltrados = ticketsFiltrados.filter(ticket =>
            ticket.numeroTicket.toLowerCase().includes(texto) ||
            ticket.titulo.toLowerCase().includes(texto) ||
            ticket.clienteNombre.toLowerCase().includes(texto) ||
            (ticket.agenteNombre && ticket.agenteNombre.toLowerCase().includes(texto)) ||
            ticket.estado.toLowerCase().includes(texto) ||
            ticket.prioridad.toLowerCase().includes(texto)
        );
    }

    ticketsVisibles = ticketsFiltrados;
    pintarTickets(ticketsVisibles);
}

function cargarClientesEnFiltro(tickets, usuario) {
    const filtroCliente = document.getElementById("filtroCliente");
    const grupoFiltroCliente = document.getElementById("grupoFiltroCliente");

    if (!filtroCliente || !grupoFiltroCliente || !usuario) {
        return;
    }

    if (usuario.rol !== "ADMIN" && usuario.rol !== "SUPERVISOR") {
        grupoFiltroCliente.style.display = "none";
        return;
    }

    grupoFiltroCliente.style.display = "flex";
    filtroCliente.innerHTML = `<option value="">Todos los clientes</option>`;

    const clientesUnicos = [];

    tickets.forEach(ticket => {
        const existe = clientesUnicos.some(cliente => Number(cliente.id) === Number(ticket.clienteId));

        if (!existe && ticket.clienteId && ticket.clienteNombre) {
            clientesUnicos.push({
                id: ticket.clienteId,
                nombre: ticket.clienteNombre
            });
        }
    });

    clientesUnicos
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .forEach(cliente => {
            const option = document.createElement("option");
            option.value = cliente.id;
            option.textContent = cliente.nombre;
            filtroCliente.appendChild(option);
        });
}