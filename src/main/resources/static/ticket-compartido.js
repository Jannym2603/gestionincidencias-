const API_PUBLICA = "/api/public/compartidos";

let tokenCompartido = "";

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

        const ticket =
            await response.json();

        pintarTicketCompartido(ticket);
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

    if (
        Number.isNaN(
            fechaObjeto.getTime()
        )
    ) {
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
