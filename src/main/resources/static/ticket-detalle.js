let ticketActual = null;
let ticketId = null;
let enlacesCompartidosActuales = [];

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
    cargarAdjuntosTicket();
    cargarUsuariosParaAsignar();
    configurarVistaPorRol();
    configurarModalHistorial();
    configurarModalComentario();
    configurarModalCompartirTicket();
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

    const nuevaPrioridad =
        document.getElementById("nuevaPrioridad");

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

    const seccionEnlacesCompartidos =
        document.getElementById("seccionEnlacesCompartidos");

    if (!usuario) {
        return;
    }

    const esSupervisorOAdmin =
        usuario.rol === "SUPERVISOR" ||
        usuario.rol === "ADMIN";

    if (esSupervisorOAdmin) {
        if (accionesSupervisor) {
            accionesSupervisor.style.display = "block";
        }

        if (accionesAgente) {
            accionesAgente.style.display = "block";
        }

        if (seccionEnlacesCompartidos) {
            seccionEnlacesCompartidos.style.display = "block";
        }

        if (mensajeAcciones) {
            mensajeAcciones.textContent =
                "Puedes asignar agentes, cambiar el estado, ajustar la prioridad y compartir el ticket.";
        }

        cargarEnlacesCompartidos();
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
    const usuario = obtenerSesion();
    const select = document.getElementById("agenteId");

    if (
        !usuario ||
        (
            usuario.rol !== "SUPERVISOR" &&
            usuario.rol !== "ADMIN"
        ) ||
        !select
    ) {
        return;
    }

    try {
        select.disabled = true;
        select.innerHTML = `
            <option value="">
                Cargando agentes...
            </option>
        `;

        const response = await fetch(`${API_BASE}/usuarios`);

        if (!response.ok) {
            throw new Error("No se pudieron cargar los usuarios.");
        }

        const usuarios = await response.json();

        const agentes = Array.isArray(usuarios)
            ? usuarios.filter(usuarioItem => {
                const rol = String(usuarioItem.rol || "")
                    .trim()
                    .toUpperCase();

                return (
                    rol === "AGENTE" &&
                    usuarioItem.estado !== false
                );
            })
            : [];

        agentes.sort((agenteA, agenteB) => {
            const nombreA =
                `${agenteA.nombre || ""} ${agenteA.apellido || ""}`
                    .trim()
                    .toLowerCase();

            const nombreB =
                `${agenteB.nombre || ""} ${agenteB.apellido || ""}`
                    .trim()
                    .toLowerCase();

            return nombreA.localeCompare(nombreB, "es");
        });

        select.innerHTML = `
            <option value="">
                Seleccione agente
            </option>
        `;

        agentes.forEach(agente => {
            const option = document.createElement("option");

            const nombreCompleto =
                `${agente.nombre || ""} ${agente.apellido || ""}`
                    .trim();

            option.value = agente.id;
            option.textContent =
                nombreCompleto || "Agente";

            select.appendChild(option);
        });

        if (agentes.length === 0) {
            select.innerHTML = `
                <option value="">
                    No hay agentes registrados
                </option>
            `;

            select.disabled = true;
        } else {
            select.disabled = false;
        }

    } catch (error) {
        console.error("Error cargando agentes:", error);

        select.innerHTML = `
            <option value="">
                Error cargando agentes
            </option>
        `;

        select.disabled = true;
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
            document.getElementById(
                "justificacionPrioridad"
            );

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
    const contenido =
        document.getElementById("contenidoComentario");

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
   MODAL PARA COMPARTIR TICKET
===================================================== */

function configurarModalCompartirTicket() {
    const modal =
        document.getElementById("modalCompartirTicket");

    if (!modal) {
        return;
    }

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            cerrarModalCompartirTicket();
        }
    });

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            modal.classList.contains("activo")
        ) {
            cerrarModalCompartirTicket();
        }
    });
}

function abrirModalCompartirTicket() {
    const usuario = obtenerSesion();

    if (
        !usuario ||
        (
            usuario.rol !== "SUPERVISOR" &&
            usuario.rol !== "ADMIN"
        )
    ) {
        alert(
            "Solo el supervisor o administrador puede compartir tickets."
        );
        return;
    }

    const modal =
        document.getElementById("modalCompartirTicket");

    if (!modal) {
        return;
    }

    limpiarFormularioCompartirTicket();
    configurarFechaMinimaCompartida();

    modal.classList.add("activo");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-abierto");

    setTimeout(() => {
        document
            .getElementById("correoDestinatarioCompartido")
            ?.focus();
    }, 100);
}

function cerrarModalCompartirTicket() {
    const modal =
        document.getElementById("modalCompartirTicket");

    if (!modal) {
        return;
    }

    modal.classList.remove("activo");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-abierto");
}

function configurarFechaMinimaCompartida() {
    const input =
        document.getElementById("fechaExpiracionCompartida");

    if (!input) {
        return;
    }

    const ahora = new Date();

    ahora.setMinutes(
        ahora.getMinutes() - ahora.getTimezoneOffset()
    );

    input.min = ahora.toISOString().slice(0, 16);
}

function limpiarFormularioCompartirTicket() {
    const correo =
        document.getElementById("correoDestinatarioCompartido");

    const fecha =
        document.getElementById("fechaExpiracionCompartida");

    const permisoComentar =
        document.getElementById("permisoComentarTicket");

    const permisoVerAdjuntos =
        document.getElementById("permisoVerAdjuntosTicket");

    const permisoSubirAdjuntos =
        document.getElementById("permisoSubirAdjuntosTicket");

    const permisoCambiarEstado =
        document.getElementById("permisoCambiarEstadoTicket");

    const mensaje =
        document.getElementById("mensajeCompartirTicket");

    const resultado =
        document.getElementById("resultadoEnlaceCompartido");

    const enlaceGenerado =
        document.getElementById("enlaceCompartidoGenerado");

    if (correo) {
        correo.value = "";
    }

    if (fecha) {
        fecha.value = "";
    }

    if (permisoComentar) {
        permisoComentar.checked = false;
    }

    if (permisoVerAdjuntos) {
        permisoVerAdjuntos.checked = false;
    }

    if (permisoSubirAdjuntos) {
        permisoSubirAdjuntos.checked = false;
    }

    if (permisoCambiarEstado) {
        permisoCambiarEstado.checked = false;
    }

    if (mensaje) {
        mensaje.hidden = true;
        mensaje.textContent = "";

        mensaje.classList.remove(
            "success-text",
            "danger-text"
        );
    }

    if (resultado) {
        resultado.hidden = true;
    }

    if (enlaceGenerado) {
        enlaceGenerado.value = "";
    }
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
            throw new Error(
                "No se pudieron cargar los comentarios."
            );
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
                        ${escaparHtml(
                            comentario.nombreUsuario || "Usuario"
                        )}
                    </strong>

                    <span class="ticket-comment-type">
                        ${escaparHtml(
                            comentario.tipoComentario || "PUBLICO"
                        )}
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
        console.error(
            "Error cargando comentarios:",
            error
        );

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
            throw new Error(
                "No se pudo crear el comentario."
            );
        }

        if (contenidoInput) {
            contenidoInput.value = "";
        }

        cerrarModalComentario();

        alert("Comentario agregado correctamente.");

        await cargarComentarios();
        await cargarHistorial();

    } catch (error) {
        console.error(
            "Error creando comentario:",
            error
        );

        alert("Error creando comentario.");
    }
}

/* =====================================================
   MODAL DE HISTORIAL
===================================================== */

function configurarModalHistorial() {
    const modal = document.getElementById("modalHistorial");

    if (!modal) {
        return;
    }

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            cerrarModalHistorial();
        }
    });

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            modal.classList.contains("activo")
        ) {
            cerrarModalHistorial();
        }
    });
}

async function abrirModalHistorial() {
    const modal = document.getElementById("modalHistorial");
    const contenedor = document.getElementById("listaHistorial");

    if (!modal) {
        return;
    }

    modal.classList.add("activo");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-abierto");

    if (contenedor) {
        contenedor.innerHTML = `
            <p class="empty-message">
                Cargando historial...
            </p>
        `;
    }

    await cargarHistorial();
}

function cerrarModalHistorial() {
    const modal = document.getElementById("modalHistorial");

    if (!modal) {
        return;
    }

    modal.classList.remove("activo");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-abierto");
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
            throw new Error(
                "No se pudo cargar el historial."
            );
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
                        ${escaparHtml(
                            item.accion || "ACTUALIZACIÓN"
                        )}
                    </strong>

                    <small>
                        ${formatearFecha(item.fechaCreacion)}
                    </small>
                </div>

                <p>
                    ${escaparHtml(item.descripcion || "")}
                </p>

                <span>
                    ${escaparHtml(
                        item.nombreUsuario || "Sistema"
                    )}
                </span>
            `;

            contenedor.appendChild(div);
        });

    } catch (error) {
        console.error(
            "Error cargando historial:",
            error
        );

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
            throw new Error(
                "No se pudieron cargar los adjuntos."
            );
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
                escaparAtributo(
                    adjunto.nombreArchivo || "archivo"
                );

            tr.innerHTML = `
                <td>
                    ${escaparHtml(
                        adjunto.nombreArchivo || "Archivo"
                    )}
                </td>

                <td>
                    ${escaparHtml(
                        adjunto.tipoArchivo || "Archivo"
                    )}
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
        console.error(
            "Error cargando adjuntos:",
            error
        );

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

            alert(
                "No se pudo subir el archivo adjunto."
            );
            return;
        }

        alert("Archivo subido correctamente.");

        inputArchivo.value = "";

        await cargarAdjuntosTicket();

    } catch (error) {
        console.error(
            "Error subiendo archivo:",
            error
        );

        alert(
            "Error subiendo archivo. Revisa que Spring Boot esté corriendo."
        );
    }
}

async function descargarAdjunto(
        adjuntoId,
        nombreArchivo) {

    try {
        const response = await fetch(
            `${API_BASE}/adjuntos/${adjuntoId}/descargar`
        );

        if (!response.ok) {
            throw new Error(
                "No se pudo descargar el archivo."
            );
        }

        const blob = await response.blob();
        const urlTemporal =
            URL.createObjectURL(blob);

        const enlace = document.createElement("a");

        enlace.href = urlTemporal;
        enlace.download =
            nombreArchivo || "adjunto";

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        URL.revokeObjectURL(urlTemporal);

    } catch (error) {
        console.error(
            "Error descargando adjunto:",
            error
        );

        alert("No se pudo descargar el archivo.");
    }
}

/* =====================================================
   ENLACES COMPARTIDOS
===================================================== */

async function generarEnlaceCompartido() {
    const correoInput =
        document.getElementById(
            "correoDestinatarioCompartido"
        );

    const fechaInput =
        document.getElementById(
            "fechaExpiracionCompartida"
        );

    const boton =
        document.getElementById(
            "btnGenerarEnlaceCompartido"
        );

    const correo =
        correoInput?.value.trim() || "";

    const fechaExpiracion =
        fechaInput?.value || null;

    if (!correo) {
        mostrarMensajeCompartir(
            "Escribe el correo del destinatario.",
            "error"
        );

        correoInput?.focus();
        return;
    }

    if (!validarCorreo(correo)) {
        mostrarMensajeCompartir(
            "El correo ingresado no es válido.",
            "error"
        );

        correoInput?.focus();
        return;
    }

    if (
        fechaExpiracion &&
        new Date(fechaExpiracion) <= new Date()
    ) {
        mostrarMensajeCompartir(
            "La fecha de vencimiento debe ser posterior a la fecha actual.",
            "error"
        );

        fechaInput?.focus();
        return;
    }

    const datos = {
        correoDestinatario: correo,

        puedeVer: true,

        puedeComentar:
            document.getElementById(
                "permisoComentarTicket"
            )?.checked || false,

        puedeVerAdjuntos:
            document.getElementById(
                "permisoVerAdjuntosTicket"
            )?.checked || false,

        puedeSubirAdjuntos:
            document.getElementById(
                "permisoSubirAdjuntosTicket"
            )?.checked || false,

        puedeCambiarEstado:
            document.getElementById(
                "permisoCambiarEstadoTicket"
            )?.checked || false,

        fechaExpiracion: fechaExpiracion
    };

    try {
        if (boton) {
            boton.disabled = true;
            boton.textContent =
                "Generando enlace...";
        }

        mostrarMensajeCompartir(
            "Generando y enviando el enlace...",
            "info"
        );

        const response = await fetch(
            `${API_BASE}/tickets/${ticketId}/compartir`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(datos)
            }
        );

        if (!response.ok) {
            const mensajeError =
                await obtenerMensajeErrorCompartido(
                    response
                );

            throw new Error(mensajeError);
        }

        const enlaceCreado =
            await response.json();

        const inputEnlace =
            document.getElementById(
                "enlaceCompartidoGenerado"
            );

        const resultado =
            document.getElementById(
                "resultadoEnlaceCompartido"
            );

        if (inputEnlace) {
            inputEnlace.value =
                enlaceCreado.enlace || "";
        }

        if (resultado) {
            resultado.hidden = false;
        }

        mostrarMensajeCompartir(
            "El enlace fue generado y enviado correctamente.",
            "success"
        );

        await cargarEnlacesCompartidos();

    } catch (error) {
        console.error(
            "Error generando enlace compartido:",
            error
        );

        mostrarMensajeCompartir(
            error.message ||
            "No se pudo generar el enlace.",
            "error"
        );

    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent =
                "Generar y enviar enlace";
        }
    }
}

async function cargarEnlacesCompartidos() {
    const usuario = obtenerSesion();

    const tbody =
        document.getElementById(
            "enlacesCompartidosBody"
        );

    if (!tbody) {
        return;
    }

    if (
        !usuario ||
        (
            usuario.rol !== "SUPERVISOR" &&
            usuario.rol !== "ADMIN"
        )
    ) {
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="6">
                Cargando enlaces compartidos...
            </td>
        </tr>
    `;

    try {
        const response = await fetch(
            `${API_BASE}/tickets/${ticketId}/enlaces-compartidos`
        );

        if (!response.ok) {
            const mensaje =
                await obtenerMensajeErrorCompartido(
                    response
                );

            throw new Error(mensaje);
        }

        enlacesCompartidosActuales =
            await response.json();

        pintarEnlacesCompartidos(
            enlacesCompartidosActuales
        );

    } catch (error) {
        console.error(
            "Error cargando enlaces compartidos:",
            error
        );

        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    No se pudieron cargar los enlaces compartidos.
                </td>
            </tr>
        `;
    }
}

function pintarEnlacesCompartidos(enlaces) {
    const tbody =
        document.getElementById(
            "enlacesCompartidosBody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (
        !Array.isArray(enlaces) ||
        enlaces.length === 0
    ) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    No se han generado enlaces para este ticket.
                </td>
            </tr>
        `;

        return;
    }

    enlaces.forEach(enlace => {
        const tr =
            document.createElement("tr");

        const permisos =
            construirTextoPermisos(enlace);

        const expirado =
            enlaceEstaExpirado(enlace);

        const estadoActivo =
            enlace.activo && !expirado;

        const textoEstado =
            !enlace.activo
                ? "DESACTIVADO"
                : expirado
                    ? "EXPIRADO"
                    : "ACTIVO";

        const claseEstado =
            estadoActivo
                ? "badge-resuelto"
                : "badge-cerrado";

        tr.innerHTML = `
            <td>
                ${escaparHtml(
                    enlace.correoDestinatario || "-"
                )}
            </td>

            <td>
                ${escaparHtml(permisos)}
            </td>

            <td>
                ${formatearFecha(
                    enlace.fechaCreacion
                )}
            </td>

            <td>
                ${
                    enlace.fechaExpiracion
                        ? formatearFecha(
                            enlace.fechaExpiracion
                        )
                        : "Sin vencimiento"
                }
            </td>

            <td>
                <span class="badge ${claseEstado}">
                    ${textoEstado}
                </span>
            </td>

            <td>
                <div class="shared-links-actions">

                    <button
                        type="button"
                        class="action-link"
                        onclick="copiarEnlaceDesdeListado(
                            ${Number(enlace.id)}
                        )"
                    >
                        Copiar
                    </button>

                    ${
                        estadoActivo
                            ? `
                                <button
                                    type="button"
                                    class="action-link shared-link-danger"
                                    onclick="desactivarEnlaceCompartido(
                                        ${Number(enlace.id)}
                                    )"
                                >
                                    Desactivar
                                </button>
                            `
                            : ""
                    }

                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function construirTextoPermisos(enlace) {
    const permisos = ["Ver ticket"];

    if (enlace.puedeComentar) {
        permisos.push("Comentar");
    }

    if (enlace.puedeVerAdjuntos) {
        permisos.push("Ver adjuntos");
    }

    if (enlace.puedeSubirAdjuntos) {
        permisos.push("Subir adjuntos");
    }

    if (enlace.puedeCambiarEstado) {
        permisos.push("Cambiar estado");
    }

    return permisos.join(", ");
}

function enlaceEstaExpirado(enlace) {
    if (!enlace.fechaExpiracion) {
        return false;
    }

    return (
        new Date(enlace.fechaExpiracion).getTime() <
        new Date().getTime()
    );
}

async function desactivarEnlaceCompartido(
        enlaceId) {

    const confirmado = confirm(
        "¿Deseas desactivar este enlace compartido?"
    );

    if (!confirmado) {
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/tickets/enlaces-compartidos/${enlaceId}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            const mensaje =
                await obtenerMensajeErrorCompartido(
                    response
                );

            throw new Error(mensaje);
        }

        alert(
            "El enlace fue desactivado correctamente."
        );

        await cargarEnlacesCompartidos();

    } catch (error) {
        console.error(
            "Error desactivando enlace:",
            error
        );

        alert(
            error.message ||
            "No se pudo desactivar el enlace."
        );
    }
}

async function copiarEnlaceCompartido() {
    const input =
        document.getElementById(
            "enlaceCompartidoGenerado"
        );

    const enlace =
        input?.value.trim() || "";

    if (!enlace) {
        alert(
            "No hay un enlace disponible para copiar."
        );
        return;
    }

    await copiarTextoAlPortapapeles(enlace);
}

async function copiarEnlaceDesdeListado(
        enlaceId) {

    const enlaceEncontrado =
        enlacesCompartidosActuales.find(
            item =>
                Number(item.id) ===
                Number(enlaceId)
        );

    if (
        !enlaceEncontrado ||
        !enlaceEncontrado.enlace
    ) {
        alert("No se encontró el enlace.");
        return;
    }

    await copiarTextoAlPortapapeles(
        enlaceEncontrado.enlace
    );
}

async function copiarTextoAlPortapapeles(texto) {
    try {
        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {
            await navigator.clipboard.writeText(texto);

        } else {
            const textarea =
                document.createElement("textarea");

            textarea.value = texto;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";

            document.body.appendChild(textarea);

            textarea.focus();
            textarea.select();

            document.execCommand("copy");

            textarea.remove();
        }

        alert("Enlace copiado correctamente.");

    } catch (error) {
        console.error(
            "Error copiando enlace:",
            error
        );

        alert(
            "No se pudo copiar el enlace. Puedes copiarlo manualmente."
        );
    }
}

function mostrarMensajeCompartir(
        mensaje,
        tipo = "info") {

    const elemento =
        document.getElementById(
            "mensajeCompartirTicket"
        );

    if (!elemento) {
        return;
    }

    elemento.hidden = false;
    elemento.textContent = mensaje;

    elemento.classList.remove(
        "success-text",
        "danger-text"
    );

    if (tipo === "success") {
        elemento.classList.add(
            "success-text"
        );
    }

    if (tipo === "error") {
        elemento.classList.add(
            "danger-text"
        );
    }
}

function validarCorreo(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        correo
    );
}

async function obtenerMensajeErrorCompartido(
        response) {

    const contenidoTipo =
        response.headers.get("content-type") || "";

    if (
        contenidoTipo.includes(
            "application/json"
        )
    ) {
        try {
            const contenido =
                await response.json();

            return (
                contenido.message ||
                contenido.error ||
                `Error ${response.status}`
            );

        } catch (error) {
            return `Error ${response.status}`;
        }
    }

    try {
        const texto =
            await response.text();

        return (
            texto ||
            `Error ${response.status}`
        );

    } catch (error) {
        return `Error ${response.status}`;
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