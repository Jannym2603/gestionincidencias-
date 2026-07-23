const API_PUBLICA = "/api/public/compartidos";

let tokenCompartido = "";
let ticketCompartidoActual = null;

document.addEventListener("DOMContentLoaded", async () => {
    tokenCompartido = obtenerTokenDesdeUrl();

    if (!tokenCompartido) {
        mostrarError(
            "El enlace no contiene un token válido."
        );
        return;
    }

    await cargarTicketCompartido();
});

function obtenerTokenDesdeUrl() {
    const parametros =
        new URLSearchParams(window.location.search);

    return parametros.get("token")?.trim() || "";
}

async function cargarTicketCompartido() {
    mostrarCarga();

    try {
        const response = await fetch(
            `${API_PUBLICA}/${encodeURIComponent(tokenCompartido)}`
        );

        if (!response.ok) {
            const mensaje =
                await obtenerMensajeError(response);

            throw new Error(mensaje);
        }

        ticketCompartidoActual =
            await response.json();

        pintarTicketCompartido(
            ticketCompartidoActual
        );

        mostrarContenido();

    } catch (error) {
        console.error(
            "Error cargando ticket compartido:",
            error
        );

        mostrarError(
            error.message ||
            "No se pudo abrir el ticket compartido."
        );
    }
}

function pintarTicketCompartido(ticket) {
    colocarTexto(
        "numeroTicket",
        ticket.numeroTicket || "Ticket"
    );

    colocarTexto(
        "tituloTicket",
        ticket.titulo || "Sin título"
    );

    colocarTexto(
        "prioridadTicket",
        formatearValor(ticket.prioridad)
    );

    colocarTexto(
        "categoriaTicket",
        ticket.categoria || "Sin categoría"
    );

    colocarTexto(
        "clienteTicket",
        ticket.nombreCliente || "Sin información"
    );

    colocarTexto(
        "agenteTicket",
        ticket.nombreAgente || "Sin asignar"
    );

    colocarTexto(
        "fechaCreacionTicket",
        formatearFecha(ticket.fechaCreacion)
    );

    colocarTexto(
        "fechaExpiracionEnlace",
        ticket.fechaExpiracion
            ? formatearFecha(ticket.fechaExpiracion)
            : "Sin vencimiento"
    );

    colocarTexto(
        "descripcionTicket",
        ticket.descripcion ||
        "Sin descripción disponible."
    );

    pintarEstado(ticket.estado);
    pintarPermisos(ticket);
    configurarSeccionesPorPermisos(ticket);
}

function pintarEstado(estado) {
    const badge =
        document.getElementById("estadoTicket");

    if (!badge) {
        return;
    }

    const estadoNormalizado =
        String(estado || "NUEVO").toUpperCase();

    badge.textContent =
        formatearValor(estadoNormalizado);

    badge.className =
        `badge ${obtenerClaseEstado(estadoNormalizado)}`;
}

function obtenerClaseEstado(estado) {
    const clases = {
        NUEVO: "badge-nuevo",
        ASIGNADO: "badge-asignado",
        EN_PROGRESO: "badge-progreso",
        RESUELTO: "badge-resuelto",
        CERRADO: "badge-cerrado"
    };

    return clases[estado] || "badge-nuevo";
}

function pintarPermisos(ticket) {
    const contenedor =
        document.getElementById("listaPermisos");

    if (!contenedor) {
        return;
    }

    const permisos = [];

    if (ticket.puedeVer) {
        permisos.push("Ver ticket");
    }

    if (ticket.puedeComentar) {
        permisos.push("Agregar comentarios");
    }

    if (ticket.puedeVerAdjuntos) {
        permisos.push("Ver adjuntos");
    }

    if (ticket.puedeSubirAdjuntos) {
        permisos.push("Subir adjuntos");
    }

    if (ticket.puedeCambiarEstado) {
        permisos.push("Cambiar estado");
    }

    if (permisos.length === 0) {
        contenedor.innerHTML = `
            <span class="shared-permission-badge">
                Sin acciones disponibles
            </span>
        `;
        return;
    }

    contenedor.innerHTML = permisos
        .map(
            permiso => `
                <span class="shared-permission-badge">
                    ${escaparHtml(permiso)}
                </span>
            `
        )
        .join("");
}

function configurarSeccionesPorPermisos(ticket) {
    const seccionComentarios =
        document.getElementById(
            "seccionComentariosCompartidos"
        );

    const formularioComentario =
        document.getElementById(
            "formComentarioCompartido"
        );

    const seccionEstado =
        document.getElementById(
            "seccionCambiarEstadoCompartido"
        );

    const seccionAdjuntos =
        document.getElementById(
            "seccionAdjuntosCompartidos"
        );

    const formularioAdjunto =
        document.getElementById(
            "formAdjuntoCompartido"
        );

    /*
     * Comentarios:
     * por ahora se muestra la sección si tiene permiso,
     * pero el envío se activará cuando creemos
     * el endpoint público de comentarios.
     */
    if (seccionComentarios) {
        seccionComentarios.hidden =
            !ticket.puedeComentar;
    }

    if (formularioComentario) {
        formularioComentario.hidden =
            !ticket.puedeComentar;
    }

    /*
     * Cambio de estado:
     * se mostrará solo si el enlace lo permite.
     */
    if (seccionEstado) {
        seccionEstado.hidden =
            !ticket.puedeCambiarEstado;
    }

    /*
     * Adjuntos:
     * se muestra si puede ver o subir archivos.
     */
    const puedeUsarAdjuntos =
        ticket.puedeVerAdjuntos ||
        ticket.puedeSubirAdjuntos;

    if (seccionAdjuntos) {
        seccionAdjuntos.hidden =
            !puedeUsarAdjuntos;
    }

    if (formularioAdjunto) {
        formularioAdjunto.hidden =
            !ticket.puedeSubirAdjuntos;
    }

    configurarFormulariosTemporales();
}

function configurarFormulariosTemporales() {
    const formComentario =
        document.getElementById(
            "formComentarioCompartido"
        );

    const formEstado =
        document.getElementById(
            "formEstadoCompartido"
        );

    const formAdjunto =
        document.getElementById(
            "formAdjuntoCompartido"
        );

    if (formComentario) {
        formComentario.addEventListener(
            "submit",
            manejarComentarioTemporal
        );
    }

    if (formEstado) {
        formEstado.addEventListener(
            "submit",
            manejarEstadoTemporal
        );
    }

    if (formAdjunto) {
        formAdjunto.addEventListener(
            "submit",
            manejarAdjuntoTemporal
        );
    }
}

function manejarComentarioTemporal(event) {
    event.preventDefault();

    mostrarMensaje(
        "mensajeComentarioCompartido",
        "La opción de comentarios estará disponible al conectar el endpoint público.",
        "info"
    );
}

function manejarEstadoTemporal(event) {
    event.preventDefault();

    mostrarMensaje(
        "mensajeEstadoCompartido",
        "La opción de cambio de estado estará disponible al conectar el endpoint público.",
        "info"
    );
}

function manejarAdjuntoTemporal(event) {
    event.preventDefault();

    mostrarMensaje(
        "mensajeAdjuntoCompartido",
        "La opción de adjuntos estará disponible al conectar el endpoint público.",
        "info"
    );
}

function mostrarCarga() {
    cambiarVisibilidad("estadoCarga", false);
    cambiarVisibilidad("estadoError", true);
    cambiarVisibilidad(
        "contenidoTicketCompartido",
        true
    );
}

function mostrarContenido() {
    cambiarVisibilidad("estadoCarga", true);
    cambiarVisibilidad("estadoError", true);
    cambiarVisibilidad(
        "contenidoTicketCompartido",
        false
    );
}

function mostrarError(mensaje) {
    cambiarVisibilidad("estadoCarga", true);
    cambiarVisibilidad("estadoError", false);
    cambiarVisibilidad(
        "contenidoTicketCompartido",
        true
    );

    colocarTexto(
        "mensajeError",
        mensaje
    );
}

function cambiarVisibilidad(id, oculto) {
    const elemento =
        document.getElementById(id);

    if (elemento) {
        elemento.hidden = oculto;
    }
}

function colocarTexto(id, valor) {
    const elemento =
        document.getElementById(id);

    if (elemento) {
        elemento.textContent =
            valor ?? "-";
    }
}

function mostrarMensaje(
        id,
        mensaje,
        tipo = "info") {

    const elemento =
        document.getElementById(id);

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

async function obtenerMensajeError(response) {
    try {
        const contenido =
            await response.json();

        return contenido.message ||
            contenido.error ||
            obtenerMensajePorEstado(
                response.status
            );

    } catch (error) {
        return obtenerMensajePorEstado(
            response.status
        );
    }
}

function obtenerMensajePorEstado(status) {
    if (status === 403) {
        return "El enlace expiró, fue desactivado o no tiene permisos.";
    }

    if (status === 404) {
        return "El enlace compartido no existe.";
    }

    if (status >= 500) {
        return "Ocurrió un error en el servidor.";
    }

    return "No se pudo abrir el ticket compartido.";
}

function formatearFecha(fecha) {
    if (!fecha) {
        return "-";
    }

    const fechaObjeto =
        new Date(fecha);

    if (Number.isNaN(
        fechaObjeto.getTime()
    )) {
        return fecha;
    }

    return fechaObjeto.toLocaleString(
        "es-PA",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

function formatearValor(valor) {
    if (!valor) {
        return "-";
    }

    return String(valor)
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(
            /\b\w/g,
            letra => letra.toUpperCase()
        );
}

function escaparHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}