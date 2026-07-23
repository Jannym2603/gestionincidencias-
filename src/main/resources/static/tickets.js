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

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        No se pudieron cargar los tickets.
                    </td>
                </tr>
            `;
        }
    }
}

function aplicarFiltroPorPerfil(tickets, usuario) {
    if (!usuario) {
        return [];
    }

    if (usuario.rol === "CLIENTE") {
        return tickets.filter(
            ticket =>
                Number(ticket.clienteId) === Number(usuario.id)
        );
    }

    if (usuario.rol === "AGENTE") {
        return tickets.filter(
            ticket =>
                Number(ticket.agenteId) === Number(usuario.id)
        );
    }

    return tickets;
}

function configurarDescripcionVista(usuario) {
    const descripcion =
        document.getElementById("descripcionVista");

    if (!descripcion || !usuario) {
        return;
    }

    if (usuario.rol === "CLIENTE") {
        descripcion.textContent =
            "Estás viendo únicamente los tickets registrados a tu nombre.";

    } else if (usuario.rol === "AGENTE") {
        descripcion.textContent =
            "Estás viendo únicamente los tickets asignados a ti.";

    } else if (usuario.rol === "SUPERVISOR") {
        descripcion.textContent =
            "Estás viendo todos los tickets separados por cliente.";

    } else if (usuario.rol === "ADMIN") {
        descripcion.textContent =
            "Estás viendo todos los tickets del sistema separados por cliente.";
    }
}

function pintarTickets(tickets) {
    const usuario = obtenerSesion();
    const tbody = document.getElementById("ticketsBody");
    const tabla = tbody?.closest("table");
    const tableWrapper = tbody?.closest(".table-wrapper");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (tickets.length === 0) {
        tabla?.classList.remove("tickets-agrupados-tabla");
        tableWrapper?.classList.remove(
            "tickets-agrupados-wrapper"
        );

        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    No hay tickets registrados para este perfil.
                </td>
            </tr>
        `;
        return;
    }

    const debeAgrupar =
        usuario?.rol === "ADMIN" ||
        usuario?.rol === "SUPERVISOR";

    if (debeAgrupar) {
        tabla?.classList.add("tickets-agrupados-tabla");
        tableWrapper?.classList.add(
            "tickets-agrupados-wrapper"
        );

        pintarTicketsAgrupadosPorCliente(tickets);
        return;
    }

    tabla?.classList.remove("tickets-agrupados-tabla");
    tableWrapper?.classList.remove(
        "tickets-agrupados-wrapper"
    );

    pintarTicketsNormales(tickets);
}

function pintarTicketsNormales(tickets) {
    const tbody = document.getElementById("ticketsBody");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    tickets.forEach(ticket => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${ticket.numeroTicket || "Sin número"}</td>
            <td>${ticket.titulo || "Sin título"}</td>
            <td>${ticket.clienteNombre || "Sin cliente"}</td>
            <td>${ticket.agenteNombre || "Sin asignar"}</td>

            <td>
                <span class="badge ${obtenerClaseEstado(ticket.estado)}">
                    ${ticket.estado || "Sin estado"}
                </span>
            </td>

            <td>
                <span class="badge ${obtenerClasePrioridad(ticket.prioridad)}">
                    ${ticket.prioridad || "Sin prioridad"}
                </span>
            </td>

            <td>${formatearFecha(ticket.fechaCreacion)}</td>

            <td>
                <a
                    href="ticket-detalle.html?id=${ticket.id}"
                    class="action-link"
                >
                    Ver
                </a>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function pintarTicketsAgrupadosPorCliente(tickets) {
    const tbody = document.getElementById("ticketsBody");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    const grupos = {};

    tickets.forEach(ticket => {
        const cliente =
            ticket.clienteNombre ||
            "Cliente sin nombre";

        if (!grupos[cliente]) {
            grupos[cliente] = [];
        }

        grupos[cliente].push(ticket);
    });

    Object.keys(grupos)
        .sort((clienteA, clienteB) =>
            clienteA.localeCompare(
                clienteB,
                "es",
                {
                    sensitivity: "base"
                }
            )
        )
        .forEach(cliente => {
            const ticketsCliente = grupos[cliente];

            const filaGrupo =
                document.createElement("tr");

            filaGrupo.className =
                "cliente-grupo-fila";

            const celdaGrupo =
                document.createElement("td");

            celdaGrupo.colSpan = 8;
            celdaGrupo.className =
                "cliente-grupo-celda";

            const grupo =
                document.createElement("section");

            grupo.className =
                "cliente-ticket-grupo";

            const titulo =
                document.createElement("div");

            titulo.className =
                "cliente-ticket-titulo";

            titulo.textContent =
                `Cliente: ${cliente} — ` +
                `${ticketsCliente.length} ticket(s)`;

            const scroll =
                document.createElement("div");

            scroll.className =
                "cliente-ticket-scroll";

            const tabla =
                document.createElement("table");

            tabla.className =
                "cliente-ticket-tabla";

            tabla.innerHTML = `
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Título</th>
                        <th>Cliente</th>
                        <th>Agente</th>
                        <th>Estado</th>
                        <th>Prioridad</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>

                <tbody></tbody>
            `;

            const tbodyCliente =
                tabla.querySelector("tbody");

            ticketsCliente.forEach(ticket => {
                tbodyCliente.appendChild(
                    crearFilaTicketAgrupado(ticket)
                );
            });

            scroll.appendChild(tabla);
            grupo.appendChild(titulo);
            grupo.appendChild(scroll);
            celdaGrupo.appendChild(grupo);
            filaGrupo.appendChild(celdaGrupo);
            tbody.appendChild(filaGrupo);
        });
}

function crearFilaTicketAgrupado(ticket) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td>
            ${ticket.numeroTicket || "Sin número"}
        </td>

        <td>
            ${ticket.titulo || "Sin título"}
        </td>

        <td>
            ${ticket.clienteNombre || "Sin cliente"}
        </td>

        <td>
            ${ticket.agenteNombre || "Sin asignar"}
        </td>

        <td>
            <span class="badge ${obtenerClaseEstado(ticket.estado)}">
                ${ticket.estado || "Sin estado"}
            </span>
        </td>

        <td>
            <span class="badge ${obtenerClasePrioridad(ticket.prioridad)}">
                ${ticket.prioridad || "Sin prioridad"}
            </span>
        </td>

        <td>
            ${formatearFecha(ticket.fechaCreacion)}
        </td>

        <td>
            <a
                href="ticket-detalle.html?id=${ticket.id}"
                class="action-link"
            >
                Ver
            </a>
        </td>
    `;

    return tr;
}

function configurarFiltros() {
    const filtroEstado =
        document.getElementById("filtroEstado");

    const filtroPrioridad =
        document.getElementById("filtroPrioridad");

    const filtroCliente =
        document.getElementById("filtroCliente");

    const buscarTicket =
        document.getElementById("buscarTicket");

    if (filtroEstado) {
        filtroEstado.addEventListener(
            "change",
            aplicarFiltros
        );
    }

    if (filtroPrioridad) {
        filtroPrioridad.addEventListener(
            "change",
            aplicarFiltros
        );
    }

    if (filtroCliente) {
        filtroCliente.addEventListener(
            "change",
            aplicarFiltros
        );
    }

    if (buscarTicket) {
        buscarTicket.addEventListener(
            "input",
            aplicarFiltros
        );
    }
}

function aplicarFiltros() {
    const estado =
        document.getElementById("filtroEstado")
            ?.value || "";

    const prioridad =
        document.getElementById("filtroPrioridad")
            ?.value || "";

    const clienteId =
        document.getElementById("filtroCliente")
            ?.value || "";

    const texto =
        document.getElementById("buscarTicket")
            ?.value
            .toLowerCase()
            .trim() || "";

    let ticketsFiltrados = [...ticketsOriginales];

    if (estado) {
        ticketsFiltrados =
            ticketsFiltrados.filter(
                ticket => ticket.estado === estado
            );
    }

    if (prioridad) {
        ticketsFiltrados =
            ticketsFiltrados.filter(
                ticket => ticket.prioridad === prioridad
            );
    }

    if (clienteId) {
        ticketsFiltrados =
            ticketsFiltrados.filter(
                ticket =>
                    Number(ticket.clienteId) ===
                    Number(clienteId)
            );
    }

    if (texto) {
        ticketsFiltrados =
            ticketsFiltrados.filter(ticket => {
                const numeroTicket =
                    (ticket.numeroTicket || "")
                        .toLowerCase();

                const titulo =
                    (ticket.titulo || "")
                        .toLowerCase();

                const clienteNombre =
                    (ticket.clienteNombre || "")
                        .toLowerCase();

                const agenteNombre =
                    (ticket.agenteNombre || "")
                        .toLowerCase();

                const estadoTicket =
                    (ticket.estado || "")
                        .toLowerCase();

                const prioridadTicket =
                    (ticket.prioridad || "")
                        .toLowerCase();

                return (
                    numeroTicket.includes(texto) ||
                    titulo.includes(texto) ||
                    clienteNombre.includes(texto) ||
                    agenteNombre.includes(texto) ||
                    estadoTicket.includes(texto) ||
                    prioridadTicket.includes(texto)
                );
            });
    }

    ticketsVisibles = ticketsFiltrados;
    pintarTickets(ticketsVisibles);
}

function cargarClientesEnFiltro(tickets, usuario) {
    const filtroCliente =
        document.getElementById("filtroCliente");

    const grupoFiltroCliente =
        document.getElementById(
            "grupoFiltroCliente"
        );

    if (
        !filtroCliente ||
        !grupoFiltroCliente ||
        !usuario
    ) {
        return;
    }

    if (
        usuario.rol !== "ADMIN" &&
        usuario.rol !== "SUPERVISOR"
    ) {
        grupoFiltroCliente.style.display = "none";
        return;
    }

    grupoFiltroCliente.style.display = "flex";

    filtroCliente.innerHTML = `
        <option value="">
            Todos los clientes
        </option>
    `;

    const clientesUnicos = [];

    tickets.forEach(ticket => {
        const existe =
            clientesUnicos.some(
                cliente =>
                    Number(cliente.id) ===
                    Number(ticket.clienteId)
            );

        if (
            !existe &&
            ticket.clienteId &&
            ticket.clienteNombre
        ) {
            clientesUnicos.push({
                id: ticket.clienteId,
                nombre: ticket.clienteNombre
            });
        }
    });

    clientesUnicos
        .sort((a, b) =>
            a.nombre.localeCompare(
                b.nombre,
                "es",
                {
                    sensitivity: "base"
                }
            )
        )
        .forEach(cliente => {
            const option =
                document.createElement("option");

            option.value = cliente.id;
            option.textContent = cliente.nombre;

            filtroCliente.appendChild(option);
        });
}
