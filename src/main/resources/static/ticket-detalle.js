let ticketActual = null;
let ticketId = null;

document.addEventListener("DOMContentLoaded", () => {
    inicializarLayout();

    const params = new URLSearchParams(window.location.search);
    ticketId = params.get("id");

    if (!ticketId) {
        alert("No se recibio el ID del ticket.");
        window.location.href = "tickets.html";
        return;
    }

    cargarDetalleTicket();
    cargarComentarios();
    cargarHistorial();
    cargarAdjuntosTicket();
    cargarUsuariosParaAsignar();
    configurarVistaPorRol();
});

async function cargarDetalleTicket() {
    try {
        const response = await fetch(`${API_BASE}/tickets`);

        if (!response.ok) {
            throw new Error("No se pudieron cargar los tickets");
        }

        const tickets = await response.json();

        ticketActual = tickets.find(ticket => Number(ticket.id) === Number(ticketId));

        if (!ticketActual) {
            alert("Ticket no encontrado.");
            window.location.href = "tickets.html";
            return;
        }

        pintarDetalle(ticketActual);

    } catch (error) {
        console.error("Error cargando detalle:", error);
        alert("Error cargando el detalle del ticket.");
    }
}

function pintarDetalle(ticket) {
    document.getElementById("ticketNumero").textContent = ticket.numeroTicket || `Ticket #${ticket.id}`;
    document.getElementById("ticketTitulo").textContent = ticket.titulo || "Sin titulo";
    document.getElementById("ticketEstado").textContent = ticket.estado || "-";
    document.getElementById("ticketPrioridad").textContent = ticket.prioridad || "-";
    document.getElementById("ticketTipo").textContent = ticket.tipoIncidenciaNombre || "-";
    document.getElementById("ticketFecha").textContent = formatearFecha(ticket.fechaCreacion);
    document.getElementById("ticketCliente").textContent = ticket.clienteNombre || "-";
    document.getElementById("ticketCorreo").textContent = ticket.clienteCorreo || "-";
    document.getElementById("ticketAgente").textContent = ticket.agenteNombre || "Sin asignar";
    document.getElementById("ticketDescripcion").textContent = ticket.descripcion || "Sin descripcion";

    const nuevoEstado = document.getElementById("nuevoEstado");

    if (nuevoEstado) {
        nuevoEstado.value = ticket.estado;
    }

    const nuevaPrioridad = document.getElementById("nuevaPrioridad");

    if (nuevaPrioridad) {
        nuevaPrioridad.value = ticket.prioridad;
    }
}

function configurarVistaPorRol() {
    const usuario = obtenerSesion();

    const accionesSupervisor = document.getElementById("accionesSupervisor");
    const accionesAgente = document.getElementById("accionesAgente");
    const mensajeAcciones = document.getElementById("mensajeAcciones");
    const tipoComentario = document.getElementById("tipoComentario");

    if (!usuario) {
        return;
    }

    if (usuario.rol === "SUPERVISOR" || usuario.rol === "ADMIN") {
        if (accionesSupervisor) accionesSupervisor.style.display = "block";
        if (accionesAgente) accionesAgente.style.display = "block";
        if (mensajeAcciones) mensajeAcciones.textContent = "Puedes asignar agentes y cambiar el estado del ticket.";
    }

    if (usuario.rol === "AGENTE") {
        if (accionesAgente) accionesAgente.style.display = "block";
        if (mensajeAcciones) mensajeAcciones.textContent = "Puedes trabajar el ticket y actualizar su estado.";
    }

    if (usuario.rol === "CLIENTE") {
        if (mensajeAcciones) mensajeAcciones.textContent = "Puedes consultar el ticket y agregar comentarios publicos.";

        if (tipoComentario) {
            tipoComentario.value = "PUBLICO";
            tipoComentario.disabled = true;
        }
    }
}

async function cargarUsuariosParaAsignar() {
    try {
        const usuario = obtenerSesion();

        if (!usuario || (usuario.rol !== "SUPERVISOR" && usuario.rol !== "ADMIN")) {
            return;
        }

        const response = await fetch(`${API_BASE}/usuarios`);

        if (!response.ok) {
            throw new Error("No se pudieron cargar los usuarios");
        }

        const usuarios = await response.json();
        const select = document.getElementById("agenteId");

        if (!select) {
            return;
        }

        select.innerHTML = `<option value="">Seleccione agente</option>`;

        usuarios.forEach(usuario => {
            const option = document.createElement("option");
            option.value = usuario.id;
            option.textContent = `${usuario.nombre} ${usuario.apellido}`;
            select.appendChild(option);
        });

    } catch (error) {
        console.error("Error cargando usuarios:", error);
    }
}

async function asignarTicket() {
    const agenteId = document.getElementById("agenteId").value;

    if (!agenteId) {
        alert("Selecciona un agente.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/tickets/${ticketId}/asignar`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                agenteId: Number(agenteId)
            })
        });

        if (!response.ok) {
            throw new Error("No se pudo asignar el ticket");
        }

        alert("Ticket asignado correctamente.");
        cargarDetalleTicket();
        cargarHistorial();

    } catch (error) {
        console.error("Error asignando ticket:", error);
        alert("Error asignando ticket.");
    }
}

async function cambiarEstadoTicket() {
    const estado = document.getElementById("nuevoEstado").value;
    const notaResolucion = document.getElementById("notaResolucion")?.value.trim() || "";

    if ((estado === "RESUELTO" || estado === "CERRADO") && !notaResolucion) {
        alert("Debes agregar una nota de resolucion para resolver o cerrar el ticket.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/tickets/${ticketId}/estado`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                estado: estado,
                notaResolucion: notaResolucion
            })
        });

        if (!response.ok) {
            throw new Error("No se pudo cambiar el estado");
        }

        alert("Estado actualizado correctamente.");
        document.getElementById("notaResolucion").value = "";
        cargarDetalleTicket();
        cargarHistorial();

    } catch (error) {
        console.error("Error cambiando estado:", error);
        alert("Error cambiando estado.");
    }
}

async function cambiarPrioridadTicket() {
    const usuario = obtenerSesion();
    const prioridad = document.getElementById("nuevaPrioridad").value;
    const justificacion = document.getElementById("justificacionPrioridad")?.value.trim() || "";

    if (!usuario) {
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/tickets/${ticketId}/prioridad`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prioridad: prioridad,
                usuarioId: usuario.id,
                justificacion: justificacion
            })
        });

        if (!response.ok) {
            throw new Error("No se pudo cambiar la prioridad");
        }

        alert("Prioridad actualizada correctamente.");
        document.getElementById("justificacionPrioridad").value = "";
        cargarDetalleTicket();
        cargarHistorial();

    } catch (error) {
        console.error("Error cambiando prioridad:", error);
        alert("Error cambiando prioridad.");
    }
}

async function cargarComentarios() {
    try {
        const response = await fetch(`${API_BASE}/comentarios/ticket/${ticketId}`);

        if (!response.ok) {
            throw new Error("No se pudieron cargar los comentarios");
        }

        const comentarios = await response.json();

        const contenedor = document.getElementById("listaComentarios");
        contenedor.innerHTML = "";

        if (comentarios.length === 0) {
            contenedor.innerHTML = "<p>No hay comentarios registrados.</p>";
            return;
        }

        comentarios.forEach(comentario => {
            const div = document.createElement("div");
            div.className = "report-item";

            div.innerHTML = `
                <span>
                    <strong>${comentario.tipoComentario}</strong><br>
                    ${comentario.contenido}<br>
                    <small>${comentario.nombreUsuario} - ${formatearFecha(comentario.fechaCreacion)}</small>
                </span>
            `;

            contenedor.appendChild(div);
        });

    } catch (error) {
        console.error("Error cargando comentarios:", error);
    }
}

async function crearComentario() {
    const usuario = obtenerSesion();
    const contenido = document.getElementById("contenidoComentario").value.trim();
    const tipoComentario = document.getElementById("tipoComentario").value;

    if (!usuario) {
        window.location.href = "login.html";
        return;
    }

    if (!contenido) {
        alert("Escribe un comentario.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/comentarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ticketId: Number(ticketId),
                usuarioId: usuario.id,
                contenido: contenido,
                tipoComentario: tipoComentario
            })
        });

        if (!response.ok) {
            throw new Error("No se pudo crear el comentario");
        }

        document.getElementById("contenidoComentario").value = "";

        alert("Comentario agregado correctamente.");
        cargarComentarios();
        cargarHistorial();

    } catch (error) {
        console.error("Error creando comentario:", error);
        alert("Error creando comentario.");
    }
}

async function cargarHistorial() {
    try {
        const response = await fetch(`${API_BASE}/historial-tickets/ticket/${ticketId}`);

        if (!response.ok) {
            throw new Error("No se pudo cargar el historial");
        }

        const historial = await response.json();

        const contenedor = document.getElementById("listaHistorial");
        contenedor.innerHTML = "";

        if (historial.length === 0) {
            contenedor.innerHTML = "<p>No hay historial registrado.</p>";
            return;
        }

        historial.forEach(item => {
            const div = document.createElement("div");
            div.className = "report-item";

            div.innerHTML = `
                <span>
                    <strong>${item.accion}</strong><br>
                    ${item.descripcion}<br>
                    <small>${item.nombreUsuario || "Sistema"} - ${formatearFecha(item.fechaCreacion)}</small>
                </span>
            `;

            contenedor.appendChild(div);
        });

    } catch (error) {
        console.error("Error cargando historial:", error);
    }
}

async function cargarAdjuntosTicket() {
    const tbody = document.getElementById("adjuntosBody");

    if (!tbody) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/adjuntos/ticket/${ticketId}`);

        if (!response.ok) {
            throw new Error("No se pudieron cargar los adjuntos");
        }

        const adjuntos = await response.json();

        tbody.innerHTML = "";

        if (adjuntos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">Este ticket no tiene archivos adjuntos.</td>
                </tr>
            `;
            return;
        }

        adjuntos.forEach(adjunto => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${adjunto.nombreArchivo}</td>
                <td>${adjunto.tipoArchivo || "Archivo"}</td>
                <td>${formatearTamanio(adjunto.tamanio)}</td>
                <td>${formatearFecha(adjunto.fechaSubida)}</td>
                <td>
                    <a
                        class="action-link"
                        href="${API_BASE.replace("/api", "")}${adjunto.urlDescarga}"
                        target="_blank"
                    >
                        Descargar
                    </a>
                </td>
            `;

            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error cargando adjuntos:", error);

        tbody.innerHTML = `
            <tr>
                <td colspan="5">No se pudieron cargar los archivos adjuntos.</td>
            </tr>
        `;
    }
}

async function subirAdjuntoDesdeDetalle() {
    const inputArchivo = document.getElementById("archivoDetalleTicket");

    if (!inputArchivo) {
        alert("No se encontro el campo de archivo.");
        return;
    }

    const archivo = inputArchivo.files[0];

    if (!archivo) {
        alert("Selecciona un archivo primero.");
        return;
    }

    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
        const response = await fetch(`${API_BASE}/adjuntos/ticket/${ticketId}`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const errorTexto = await response.text();
            console.error("Error subiendo archivo:", errorTexto);
            alert("No se pudo subir el archivo adjunto.");
            return;
        }

        alert("Archivo subido correctamente.");

        inputArchivo.value = "";

        await cargarAdjuntosTicket();

    } catch (error) {
        console.error("Error subiendo archivo:", error);
        alert("Error subiendo archivo. Revisa que Spring Boot este corriendo.");
    }
}

function formatearTamanio(bytes) {
    if (!bytes || bytes === 0) {
        return "0 KB";
    }

    const kb = bytes / 1024;

    if (kb < 1024) {
        return `${kb.toFixed(1)} KB`;
    }

    const mb = kb / 1024;

    return `${mb.toFixed(2)} MB`;
}