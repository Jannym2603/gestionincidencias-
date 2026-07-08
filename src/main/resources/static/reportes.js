document.addEventListener("DOMContentLoaded", () => {
    inicializarLayout();

    const usuario = obtenerSesion();

    if (usuario.rol !== "ADMIN" && usuario.rol !== "SUPERVISOR") {
        alert("Solo ADMIN y SUPERVISOR pueden ver los reportes.");
        redirigirSegunRol(usuario.rol);
        return;
    }

    cargarResumenReportes();
    cargarReporteSimple("/reportes/tickets-por-estado", "reporteEstado");
    cargarReporteSimple("/reportes/tickets-por-prioridad", "reportePrioridad");
    cargarReporteSimple("/reportes/tickets-por-tipo", "reporteTipo");
});

async function cargarResumenReportes() {
    try {
        const response = await fetch(`${API_BASE}/reportes/resumen`);

        if (!response.ok) {
            throw new Error("No se pudo cargar el resumen");
        }

        const data = await response.json();

        document.getElementById("totalTickets").textContent = data.totalTickets;
        document.getElementById("ticketsNuevos").textContent = data.ticketsNuevos;
        document.getElementById("ticketsAsignados").textContent = data.ticketsAsignados;
        document.getElementById("ticketsEnProgreso").textContent = data.ticketsEnProgreso;
        document.getElementById("ticketsResueltos").textContent = data.ticketsResueltos;
        document.getElementById("ticketsCerrados").textContent = data.ticketsCerrados;
        document.getElementById("totalUsuarios").textContent = data.totalUsuarios;
        document.getElementById("totalComentarios").textContent = data.totalComentarios;

        pintarTablaResumen(data);

    } catch (error) {
        console.error("Error cargando resumen:", error);
        alert("No se pudo cargar el resumen de reportes.");
    }
}

function pintarTablaResumen(data) {
    const tbody = document.getElementById("tablaResumen");

    tbody.innerHTML = `
        <tr>
            <td>Total de tickets</td>
            <td><strong>${data.totalTickets}</strong></td>
            <td>Cantidad total de incidencias registradas en el sistema.</td>
        </tr>
        <tr>
            <td>Tickets nuevos</td>
            <td><strong>${data.ticketsNuevos}</strong></td>
            <td>Incidencias pendientes de asignación o revisión inicial.</td>
        </tr>
        <tr>
            <td>Tickets asignados</td>
            <td><strong>${data.ticketsAsignados}</strong></td>
            <td>Incidencias que ya tienen un agente responsable.</td>
        </tr>
        <tr>
            <td>Tickets en progreso</td>
            <td><strong>${data.ticketsEnProgreso}</strong></td>
            <td>Incidencias que están siendo atendidas.</td>
        </tr>
        <tr>
            <td>Tickets resueltos</td>
            <td><strong>${data.ticketsResueltos}</strong></td>
            <td>Incidencias solucionadas, pendientes de cierre final.</td>
        </tr>
        <tr>
            <td>Tickets cerrados</td>
            <td><strong>${data.ticketsCerrados}</strong></td>
            <td>Incidencias finalizadas completamente.</td>
        </tr>
        <tr>
            <td>Total usuarios</td>
            <td><strong>${data.totalUsuarios}</strong></td>
            <td>Usuarios registrados en la plataforma.</td>
        </tr>
        <tr>
            <td>Total comentarios</td>
            <td><strong>${data.totalComentarios}</strong></td>
            <td>Comentarios o seguimientos agregados a tickets.</td>
        </tr>
    `;
}

async function cargarReporteSimple(endpoint, contenedorId) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);

        if (!response.ok) {
            throw new Error("No se pudo cargar el reporte");
        }

        const data = await response.json();

        const contenedor = document.getElementById(contenedorId);
        contenedor.innerHTML = "";

        if (data.length === 0) {
            contenedor.innerHTML = "<p>No hay datos disponibles.</p>";
            return;
        }

        data.forEach(item => {
            const div = document.createElement("div");
            div.className = "report-item";

            div.innerHTML = `
                <span>${item.nombre}</span>
                <strong>${item.total}</strong>
            `;

            contenedor.appendChild(div);
        });

    } catch (error) {
        console.error("Error cargando reporte:", error);

        const contenedor = document.getElementById(contenedorId);

        if (contenedor) {
            contenedor.innerHTML = "<p>No se pudo cargar este reporte.</p>";
        }
    }
}