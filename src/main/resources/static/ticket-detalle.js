let ticketActual = null;
let ticketId = null;

document.addEventListener("DOMContentLoaded", () => {
    inicializarLayout();

    const params = new URLSearchParams(window.location.search);
    ticketId = params.get("id");

    if (!ticketId) {
        alert("No se recibió el ID del ticket.");
        window.location.href = "tickets.html";
        return;
    }

    cargarDetalleTicket();
    cargarComentarios();
    cargarHistorial();
    cargarAdjuntosTicket();
    cargarUsuariosParaAsignar();
    configurarVistaPorRol();
    configurarModalComentario();
});

/* =====================================================
   DETALLE DEL TICKET
===================================================== */

async function cargarDetalleTicket() {
    try {
        const response = await fetch(`${API_BASE}/tickets`);

        if (!response.ok) {
            throw new Error("No se pudieron cargar los tickets.");
        }

        const tickets = await response.json();

        ticketActual = tickets.find(
            ticket => Number(ticket.id) === Number(ticketId)
        );

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
    document.getElementById("ticketNumero").textContent =
        ticket.numeroTicket || `Ticket #${ticket.id}`;

    document.getElementById("ticketTitulo").textContent =
        ticket.titulo || "Sin título";

    document.getElementById("ticketEstado").textContent =
        ticket.estado || "-";

    document.getElementById("ticketPrioridad").textContent =
        ticket.prioridad || "-";

    document.getElementById("ticketTipo").textContent =
        ticket.tipoIncidenciaNombre || "-";

    document.getElementById("ticketFecha").textContent =
        formatearFecha(ticket.fechaCreacion);

    document.getElementById("ticketCliente").textContent =
        ticket.clienteNombre || "-";

    document.getElementById("ticketCorreo").textContent =
        ticket.clienteCorreo || "-";

    document.getElementById("ticketAgente").textContent =
        ticket.agenteNombre || "Sin asignar";

    document.getElementById("ticketDescripcion").textContent =
        ticket.descripcion || "Sin descripción";

    const nuevoEstado = document.getElementById("nuevoEstado");

    if (nuevoEstado && ticket.estado) {
        nuevoEstado.value = ticket.estado;
    }

    const nuevaPrioridad = document.getElementById("nuevaPrioridad");

    if (nuevaPrioridad && ticket.prioridad) {
        nuevaPrioridad.value = ticket.prioridad;
    }
}

/* =====================================================
   VISTA SEGÚN ROL
===================================================== */

function configurarVistaPorRol() {
    const usuario = obtenerSesion();

    const accionesSupervisor =
        document.getElementById("accionesSupervisor");

    const accionesAgente =
        document.getElementById("accionesAgente");

    const mensajeAcciones =
        document.getElementById("mensajeAcciones");

    const tipoComentario =
        document.getElementById("tipoComentario");

    if (!usuario) {
        return;
    }

    if (
        usuario.rol === "SUPERVISOR" ||
        usuario.rol === "ADMIN"
    ) {
        if (accionesSupervisor) {
            accionesSupervisor.style.display = "block";
        }

        if (accionesAgente) {
            accionesAgente.style.display = "block";
        }

        if (mensajeAcciones) {
            mensajeAcciones.textContent =
                "Puedes asignar agentes, cambiar el estado y ajustar la prioridad del ticket.";
        }
    }

    if (usuario.rol === "AGENTE") {
        if (accionesAgente) {
            accionesAgente.style.display = "block";
        }

        if (mensajeAcciones) {
            mensajeAcciones.textContent =
                "Puedes trabajar el ticket, actualizar su estado y ajustar su prioridad.";
        }
    }

    if (usuario.rol === "CLIENTE") {
        if (mensajeAcciones) {
            mensajeAcciones.textContent =
                "Puedes consultar el ticket y agregar comentarios públicos.";
        }

        if (tipoComentario) {
            tipoComentario.value = "PUBLICO";
            tipoComentario.disabled = true;
        }
    }
}

/* =====================================================
   ASIGNACIÓN DE AGENTE
===================================================== */

async function cargarUsuariosParaAsignar() {
    try {
        const usuario = obtenerSesion();

        if (
            !usuario ||
            (
                usuario.rol !== "SUPERVISOR" &&
                usuario.rol !== "ADMIN"
            )
        ) {
            return;
        }

        const response = await fetch(`${API_BASE}/usuarios`);

        if (!response.ok) {
            throw new Error("No se pudieron cargar los usuarios.");
        }

        const usuarios = await response.json();

        const select = document.getElementById("agenteId");

        if (!select) {
            return;
        }

        select.innerHTML =
            `<option value="">Seleccione agente</option>`;

        usuarios.forEach(usuarioItem => {
            const option = document.createElement("option");

            option.value = usuarioItem.id;

            option.textContent =
                `${usuarioItem.nombre} ${usuarioItem.apellido}`;

            select.appendChild(option);
        });

    } catch (error) {
        console.error("Error cargando usuarios:", error);
    }
}

async function asignarTicket() {
    const selectAgente = document.getElementById("agenteId");
    const agenteId = selectAgente?.value;

    if (!agenteId) {
        alert("Selecciona un agente.");
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/tickets/${ticketId}/asignar`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    agenteId: Number(agenteId)
                })
            }
        );

        if (!response.ok) {
            throw new Error("No se pudo asignar el ticket.");
        }

        alert("Ticket asignado correctamente.");

        await cargarDetalleTicket();
        await cargarHistorial();

    } catch (error) {
        console.error("Error asignando ticket:", error);
        alert("Error asignando ticket.");
    }
}

/* =====================================================
   CAMBIO DE ESTADO
===================================================== */

async function cambiarEstadoTicket() {
    const estado =
        document.getElementById("nuevoEstado")?.value;

    const notaResolucion =
        document
            .getElementById("notaResolucion")
            ?.value
            .trim() || "";

    if (
        (estado === "RESUELTO" || estado === "CERRADO") &&
        !notaResolucion
    ) {
        alert(
            "Debes agregar una nota de resolución para resolver o cerrar el ticket."
        );
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/tickets/${ticketId}/estado`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    estado: estado,
                    notaResolucion: notaResolucion
                })
            }
        );

        if (!response.ok) {
            throw new Error("No se pudo cambiar el estado.");
        }

        alert("Estado actualizado correctamente.");

        const notaInput =
            document.getElementById("notaResolucion");

        if (notaInput) {
            notaInput.value = "";
        }

        await cargarDetalleTicket();
        await cargarHistorial();

    } catch (error) {
        console.error("Error cambiando estado:", error);
        alert("Error cambiando estado.");
    }
}

/* =====================================================
   CAMBIO DE PRIORIDAD
===================================================== */

async function cambiarPrioridadTicket() {
    const usuario = obtenerSesion();

    const prioridad =
        document.getElementById("nuevaPrioridad")?.value;

    const justificacion =
        document
            .getElementById("justificacionPrioridad")
            ?.value
            .trim() || "";

    if (!usuario) {
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/tickets/${ticketId}/prioridad`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    prioridad: prioridad,
                    usuarioId: usuario.id,
                    justificacion: justificacion
                })
            }
        );

        if (!response.ok) {
            throw new Error("No se pudo cambiar la prioridad.");
        }

        alert("Prioridad actualizada correctamente.");

        const justificacionInput =
            document.getElementById("justificacionPrioridad");

        if (justificacionInput) {
            justificacionInput.value = "";
        }

        await cargarDetalleTicket();
        await cargarHistorial();

    } catch (error) {
        console.error("Error cambiando prioridad:", error);
        alert("Error cambiando prioridad.");
    }
}

/* =====================================================
   MODAL DE COMENTARIOS
===================================================== */

function configurarModalComentario() {
    const modal = document.getElementById("modalComentario");

    if (!modal) {
        return;
    }

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            cerrarModalComentario();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            cerrarModalComentario();
        }
    });
}

function abrirModalComentario() {
    const modal = document.getElementById("modalComentario");
    const contenido = document.getElementById("contenidoComentario");

    if (!modal) {
        return;
    }

    modal.classList.add("activo");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-abierto");

    setTimeout(() => {
        contenido?.focus();
    }, 100);
}

function cerrarModalComentario() {
    const modal = document.getElementById("modalComentario");

    if (!modal) {
        return;
    }

    modal.classList.remove("activo");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-abierto");
}

/* =====================================================
   COMENTARIOS
===================================================== */

async function cargarComentarios() {
    try {
        const response = await fetch(
            `${API_BASE}/comentarios/ticket/${ticketId}`
        );

        if (!response.ok) {
            throw new Error("No se pudieron cargar los comentarios.");
        }

        const comentarios = await response.json();

        const contenedor =
            document.getElementById("listaComentarios");

        if (!contenedor) {
            return;
        }

        contenedor.innerHTML = "";

        if (comentarios.length === 0) {
            contenedor.innerHTML = `
                <p class="empty-message">
                    No hay comentarios registrados.
                </p>
            `;
            return;
        }

        comentarios.forEach(comentario => {
            const div = document.createElement("div");

            div.className = "ticket-comment-item";

            div.innerHTML = `
                <div class="ticket-comment-header">
                    <strong>
                        ${escaparHtml(comentario.nombreUsuario || "Usuario")}
                    </strong>

                    <span class="ticket-comment-type">
                        ${escaparHtml(comentario.tipoComentario || "PUBLICO")}
                    </span>
                </div>

                <p>
                    ${escaparHtml(comentario.contenido || "")}
                </p>

                <small>
                    ${formatearFecha(comentario.fechaCreacion)}
                </small>
            `;

            contenedor.appendChild(div);
        });

    } catch (error) {
        console.error("Error cargando comentarios:", error);

        const contenedor =
            document.getElementById("listaComentarios");

        if (contenedor) {
            contenedor.innerHTML = `
                <p class="danger-text">
                    No se pudieron cargar los comentarios.
                </p>
            `;
        }
    }
}

async function crearComentario() {
    const usuario = obtenerSesion();

    const contenidoInput =
        document.getElementById("contenidoComentario");

    const tipoComentarioInput =
        document.getElementById("tipoComentario");

    const contenido =
        contenidoInput?.value.trim() || "";

    const tipoComentario =
        tipoComentarioInput?.value || "PUBLICO";

    if (!usuario) {
        window.location.href = "login.html";
        return;
    }

    if (!contenido) {
        alert("Escribe un comentario.");
        contenidoInput?.focus();
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/comentarios`,
            {
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
            }
        );

        if (!response.ok) {
            throw new Error("No se pudo crear el comentario.");
        }

        if (contenidoInput) {
            contenidoInput.value = "";
        }

        cerrarModalComentario();

        alert("Comentario agregado correctamente.");

        await cargarComentarios();
        await cargarHistorial();

    } catch (error) {
        console.error("Error creando comentario:", error);
        alert("Error creando comentario.");
    }
}

/* =====================================================
   HISTORIAL
===================================================== */

async function cargarHistorial() {
    try {
        const response = await fetch(
            `${API_BASE}/historial-tickets/ticket/${ticketId}`
        );

        if (!response.ok) {
            throw new Error("No se pudo cargar el historial.");
        }

        const historial = await response.json();

        const contenedor =
            document.getElementById("listaHistorial");

        if (!contenedor) {
            return;
        }

        contenedor.innerHTML = "";

        if (historial.length === 0) {
            contenedor.innerHTML = `
                <p class="empty-message">
                    No hay historial registrado.
                </p>
            `;
            return;
        }

        historial.forEach(item => {
            const div = document.createElement("div");

            div.className = "ticket-history-item";

            div.innerHTML = `
                <div class="ticket-history-header">
                    <strong>
                        ${escaparHtml(item.accion || "ACTUALIZACIÓN")}
                    </strong>

                    <small>
                        ${formatearFecha(item.fechaCreacion)}
                    </small>
                </div>

                <p>
                    ${escaparHtml(item.descripcion || "")}
                </p>

                <span>
                    ${escaparHtml(item.nombreUsuario || "Sistema")}
                </span>
            `;

            contenedor.appendChild(div);
        });

    } catch (error) {
        console.error("Error cargando historial:", error);

        const contenedor =
            document.getElementById("listaHistorial");

        if (contenedor) {
            contenedor.innerHTML = `
                <p class="danger-text">
                    No se pudo cargar el historial.
                </p>
            `;
        }
    }
}

/* =====================================================
   ARCHIVOS ADJUNTOS
===================================================== */

async function cargarAdjuntosTicket() {
    const tbody = document.getElementById("adjuntosBody");

    if (!tbody) {
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/adjuntos/ticket/${ticketId}`
        );

        if (!response.ok) {
            throw new Error("No se pudieron cargar los adjuntos.");
        }

        const adjuntos = await response.json();

        tbody.innerHTML = "";

        if (adjuntos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        Este ticket no tiene archivos adjuntos.
                    </td>
                </tr>
            `;
            return;
        }

        adjuntos.forEach(adjunto => {
            const tr = document.createElement("tr");

            const nombreArchivoSeguro =
                escaparAtributo(adjunto.nombreArchivo || "archivo");

            tr.innerHTML = `
                <td>
                    ${escaparHtml(adjunto.nombreArchivo || "Archivo")}
                </td>

                <td>
                    ${escaparHtml(adjunto.tipoArchivo || "Archivo")}
                </td>

                <td>
                    ${formatearTamanio(adjunto.tamanio)}
                </td>

                <td>
                    ${formatearFecha(adjunto.fechaSubida)}
                </td>

                <td>
                    <button
                        type="button"
                        class="action-link download-link-btn"
                        onclick="descargarAdjunto(
                            ${Number(adjunto.id)},
                            '${nombreArchivoSeguro}'
                        )"
                    >
                        Descargar
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error cargando adjuntos:", error);

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    No se pudieron cargar los archivos adjuntos.
                </td>
            </tr>
        `;
    }
}

async function subirAdjuntoDesdeDetalle() {
    const inputArchivo =
        document.getElementById("archivoDetalleTicket");

    if (!inputArchivo) {
        alert("No se encontró el campo de archivo.");
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
        const response = await fetch(
            `${API_BASE}/adjuntos/ticket/${ticketId}`,
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {
            const errorTexto = await response.text();

            console.error(
                "Error subiendo archivo:",
                errorTexto
            );

            alert("No se pudo subir el archivo adjunto.");
            return;
        }

        alert("Archivo subido correctamente.");

        inputArchivo.value = "";

        await cargarAdjuntosTicket();

    } catch (error) {
        console.error("Error subiendo archivo:", error);

        alert(
            "Error subiendo archivo. Revisa que Spring Boot esté corriendo."
        );
    }
}

async function descargarAdjunto(adjuntoId, nombreArchivo) {
    try {
        const response = await fetch(
            `${API_BASE}/adjuntos/${adjuntoId}/descargar`
        );

        if (!response.ok) {
            throw new Error("No se pudo descargar el archivo.");
        }

        const blob = await response.blob();
        const urlTemporal = URL.createObjectURL(blob);

        const enlace = document.createElement("a");

        enlace.href = urlTemporal;
        enlace.download = nombreArchivo || "adjunto";

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        URL.revokeObjectURL(urlTemporal);

    } catch (error) {
        console.error("Error descargando adjunto:", error);
        alert("No se pudo descargar el archivo.");
    }
}

/* =====================================================
   UTILIDADES
===================================================== */

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

function escaparHtml(valor) {
    const texto = String(valor ?? "");

    return texto
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escaparAtributo(valor) {
    return String(valor ?? "")
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'")
        .replaceAll("\n", " ")
        .replaceAll("\r", " ");
}