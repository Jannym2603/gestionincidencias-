let solicitudesRecursos = [];
let solicitudesFiltradas = [];
let solicitudSeleccionada = null;
let ticketOrigenSolicitudId = null;
let aperturaDirectaPendiente = false;

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        inicializarLayout();

        const usuario =
            obtenerSesion();

        if (!usuario) {

            window.location.href =
                "login.html";

            return;
        }

        configurarContextoTicketOrigen();
        configurarVistaPorRolRecursos();
        configurarEventosRecursos();

        await cargarSolicitudesRecursos();
    }
);


function configurarContextoTicketOrigen() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const ticketId =
        Number(
            params.get("ticketId")
        );

    ticketOrigenSolicitudId =
        Number.isInteger(ticketId)
        &&
        ticketId > 0
            ? ticketId
            : null;

    aperturaDirectaPendiente =
        Boolean(
            ticketOrigenSolicitudId
        );

    const contexto =
        document.getElementById(
            "contextoTicketSolicitud"
        );

    const btnVolver =
        document.getElementById(
            "btnVolverTicketSolicitud"
        );

    if (!ticketOrigenSolicitudId) {

        if (contexto) {
            contexto.hidden = true;
        }

        if (btnVolver) {
            btnVolver.hidden = true;
        }

        return;
    }

    if (contexto) {
        contexto.hidden = false;
        contexto.textContent =
            "Mostrando la solicitud asociada al ticket seleccionado.";
    }

    if (btnVolver) {

        btnVolver.hidden =
            false;

        btnVolver.addEventListener(
            "click",
            volverAlTicketOrigen
        );
    }
}


function volverAlTicketOrigen() {

    if (!ticketOrigenSolicitudId) {

        window.location.href =
            "tickets.html";

        return;
    }

    window.location.href =
        `ticket-detalle.html?id=${
            encodeURIComponent(
                ticketOrigenSolicitudId
            )
        }`;
}


function obtenerRolRecursos() {

    const usuario =
        obtenerSesion();

    return String(
        usuario?.rol || ""
    )
        .trim()
        .toUpperCase();
}


function puedeEditarSolicitud() {

    const rol =
        obtenerRolRecursos();

    return rol === "ADMIN"
        || rol === "SUPERVISOR";
}


function configurarVistaPorRolRecursos() {

    const rol =
        obtenerRolRecursos();

    const descripcion =
        document.getElementById(
            "descripcionSolicitudes"
        );

    const info =
        document.getElementById(
            "infoSolicitudes"
        );

    if (rol === "CLIENTE") {

        if (descripcion) {
            descripcion.textContent =
                "Consulta el seguimiento de tus solicitudes de recursos.";
        }

        if (info) {
            info.textContent =
                "Puedes consultar el estado de tus solicitudes, "
                + "pero los datos internos del proveedor son administrados por el equipo responsable.";
        }

        return;
    }

    if (rol === "AGENTE") {

        if (descripcion) {
            descripcion.textContent =
                "Consulta las solicitudes asociadas a los tickets que tienes asignados.";
        }

        if (info) {
            info.textContent =
                "La administración del proveedor y los cambios del flujo corresponden a supervisores y administradores.";
        }

        return;
    }

    if (rol === "SUPERVISOR") {

        if (descripcion) {
            descripcion.textContent =
                "Administra las solicitudes de recursos de tus proyectos.";
        }

        return;
    }

    if (rol === "ADMIN") {

        if (descripcion) {
            descripcion.textContent =
                "Administra todas las solicitudes de recursos y su seguimiento con proveedores.";
        }
    }
}


function configurarEventosRecursos() {

    [
        "buscarSolicitud",
        "filtroEstadoRecurso",
        "filtroRetrasoRecurso",
        "filtroCategoriaRecurso",
        "filtroCompaniaRecurso",
        "filtroProyectoRecurso"
    ].forEach(id => {

        const elemento =
            document.getElementById(id);

        if (!elemento) {
            return;
        }

        const evento =
            elemento.tagName === "INPUT"
                ? "input"
                : "change";

        elemento.addEventListener(
            evento,
            aplicarFiltrosRecursos
        );
    });

    const btnCerrar =
        document.getElementById(
            "btnCerrarPanelSolicitud"
        );

    if (btnCerrar) {

        btnCerrar.addEventListener(
            "click",
            () => {

                if (ticketOrigenSolicitudId) {

                    volverAlTicketOrigen();

                    return;
                }

                cerrarPanelSolicitud();
            }
        );
    }

    const form =
        document.getElementById(
            "formSolicitudRecurso"
        );

    if (form) {

        form.addEventListener(
            "submit",
            guardarSolicitudRecurso
        );
    }
}


async function cargarSolicitudesRecursos() {

    const tbody =
        document.getElementById(
            "solicitudesBody"
        );

    if (tbody) {

        tbody.innerHTML =
            `<tr>
                <td colspan="12">
                    Cargando solicitudes...
                </td>
            </tr>`;
    }

    try {

        const response =
            await fetch(
                `${API_BASE}/solicitudes-recursos`
            );

        if (!response.ok) {

            throw new Error(
                await obtenerMensajeErrorRecursos(
                    response
                )
            );
        }

        const data =
            await response.json();

        solicitudesRecursos =
            Array.isArray(data)
                ? data
                : [];

        construirFiltrosRecursos();

        if (aperturaDirectaPendiente) {

            abrirSolicitudDesdeTicketOrigen();

        } else {

            aplicarFiltrosRecursos();
        }

    } catch (error) {

        console.error(
            "Error cargando solicitudes de recursos:",
            error
        );

        if (tbody) {

            tbody.innerHTML =
                `<tr>
                    <td colspan="12">
                        ${escaparHtmlRecursos(
                            error.message
                            || "No se pudieron cargar las solicitudes."
                        )}
                    </td>
                </tr>`;
        }
    }
}


function abrirSolicitudDesdeTicketOrigen() {

    aperturaDirectaPendiente =
        false;

    if (!ticketOrigenSolicitudId) {

        aplicarFiltrosRecursos();

        return;
    }

    const solicitud =
        solicitudesRecursos.find(
            item =>
                Number(
                    item.ticketId
                )
                ===
                Number(
                    ticketOrigenSolicitudId
                )
        );

    if (!solicitud) {

        aplicarFiltrosRecursos();

        const contexto =
            document.getElementById(
                "contextoTicketSolicitud"
            );

        if (contexto) {

            contexto.hidden =
                false;

            contexto.textContent =
                "No se encontró una solicitud de recurso disponible para el ticket seleccionado.";
        }

        return;
    }

    /*
     * Dejamos los filtros exactamente en el contexto de la
     * solicitud seleccionada para que el listado muestre
     * únicamente ese ticket.
     */
    const buscar =
        document.getElementById(
            "buscarSolicitud"
        );

    const filtroCompania =
        document.getElementById(
            "filtroCompaniaRecurso"
        );

    const filtroProyecto =
        document.getElementById(
            "filtroProyectoRecurso"
        );

    const filtroCategoria =
        document.getElementById(
            "filtroCategoriaRecurso"
        );

    const filtroEstado =
        document.getElementById(
            "filtroEstadoRecurso"
        );

    if (buscar) {
        buscar.value =
            solicitud.numeroTicket
            ||
            "";
    }

    if (
        filtroCompania
        &&
        solicitud.companiaId
    ) {
        filtroCompania.value =
            String(
                solicitud.companiaId
            );
    }

    actualizarFiltroProyectos();

    if (
        filtroProyecto
        &&
        solicitud.proyectoId
    ) {
        filtroProyecto.value =
            String(
                solicitud.proyectoId
            );
    }

    if (
        filtroCategoria
        &&
        solicitud.categoria
    ) {
        filtroCategoria.value =
            String(
                solicitud.categoria
            );
    }

    if (
        filtroEstado
        &&
        solicitud.estadoRecurso
    ) {
        filtroEstado.value =
            String(
                solicitud.estadoRecurso
            );
    }

    aplicarFiltrosRecursos();

    abrirSolicitudRecurso(
        solicitud.id
    );

    const contexto =
        document.getElementById(
            "contextoTicketSolicitud"
        );

    if (contexto) {

        contexto.hidden =
            false;

        contexto.textContent =
            `Solicitud abierta directamente desde ${
                solicitud.numeroTicket
                || "el ticket seleccionado"
            }.`;
    }
}


function construirFiltrosRecursos() {

    poblarFiltroUnico(
        "filtroCategoriaRecurso",
        solicitudesRecursos
            .map(item => item.categoria),
        "Todas"
    );

    const companias =
        new Map();

    solicitudesRecursos.forEach(item => {

        if (
            item.companiaId
            &&
            item.companiaNombre
        ) {

            companias.set(
                String(item.companiaId),
                item.companiaNombre
            );
        }
    });

    poblarFiltroMapa(
        "filtroCompaniaRecurso",
        companias,
        "Todas"
    );

    actualizarFiltroProyectos();
}


function actualizarFiltroProyectos() {

    const selectCompania =
        document.getElementById(
            "filtroCompaniaRecurso"
        );

    const companiaId =
        selectCompania?.value || "";

    const proyectos =
        new Map();

    solicitudesRecursos
        .filter(item =>
            !companiaId
            ||
            String(item.companiaId)
                ===
            String(companiaId)
        )
        .forEach(item => {

            if (
                item.proyectoId
                &&
                item.proyectoNombre
            ) {

                proyectos.set(
                    String(item.proyectoId),
                    item.proyectoNombre
                );
            }
        });

    poblarFiltroMapa(
        "filtroProyectoRecurso",
        proyectos,
        "Todos"
    );
}


function poblarFiltroUnico(
    id,
    valores,
    textoTodos
) {

    const select =
        document.getElementById(id);

    if (!select) {
        return;
    }

    const valorActual =
        select.value;

    const unicos =
        [...new Set(
            valores
                .filter(Boolean)
                .map(valor =>
                    String(valor)
                        .trim()
                )
        )]
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        "es"
                    )
            );

    select.innerHTML =
        `<option value="">
            ${textoTodos}
        </option>`;

    unicos.forEach(valor => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            valor;

        option.textContent =
            valor;

        select.appendChild(
            option
        );
    });

    if (
        unicos.includes(
            valorActual
        )
    ) {

        select.value =
            valorActual;
    }
}


function poblarFiltroMapa(
    id,
    mapa,
    textoTodos
) {

    const select =
        document.getElementById(id);

    if (!select) {
        return;
    }

    const valorActual =
        select.value;

    const entradas =
        Array.from(
            mapa.entries()
        )
            .sort(
                (a, b) =>
                    String(a[1])
                        .localeCompare(
                            String(b[1]),
                            "es"
                        )
            );

    select.innerHTML =
        `<option value="">
            ${textoTodos}
        </option>`;

    entradas.forEach(
        ([idValor, nombre]) => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                idValor;

            option.textContent =
                nombre;

            select.appendChild(
                option
            );
        }
    );

    if (
        entradas.some(
            ([idValor]) =>
                String(idValor)
                ===
                String(valorActual)
        )
    ) {

        select.value =
            valorActual;
    }
}


function aplicarFiltrosRecursos() {

    const companiaAnterior =
        document.getElementById(
            "filtroCompaniaRecurso"
        )?.value || "";

    actualizarFiltroProyectos();

    const texto =
        String(
            document
                .getElementById(
                    "buscarSolicitud"
                )
                ?.value
            || ""
        )
            .trim()
            .toLowerCase();

    const estado =
        document
            .getElementById(
                "filtroEstadoRecurso"
            )
            ?.value
        || "";

    const seguimiento =
        document
            .getElementById(
                "filtroRetrasoRecurso"
            )
            ?.value
        || "";

    const categoria =
        document
            .getElementById(
                "filtroCategoriaRecurso"
            )
            ?.value
        || "";

    const companiaId =
        companiaAnterior;

    const proyectoId =
        document
            .getElementById(
                "filtroProyectoRecurso"
            )
            ?.value
        || "";

    solicitudesFiltradas =
        solicitudesRecursos.filter(
            item => {

                const coincideTexto =
                    !texto
                    ||
                    [
                        item.numeroTicket,
                        item.tituloTicket,
                        item.clienteNombre,
                        item.companiaNombre,
                        item.proyectoNombre,
                        item.categoria,
                        item.recurso,
                        item.proveedor,
                        item.estadoRecurso
                    ]
                        .some(valor =>
                            String(
                                valor || ""
                            )
                                .toLowerCase()
                                .includes(texto)
                        );

                const coincideEstado =
                    !estado
                    ||
                    String(
                        item.estadoRecurso || ""
                    )
                        .toUpperCase()
                    ===
                    String(estado)
                        .toUpperCase();

                const retrasada =
                    esSolicitudRetrasada(
                        item
                    );

                const coincideSeguimiento =
                    !seguimiento
                    ||
                    (
                        seguimiento === "RETRASADO"
                        &&
                        retrasada
                    )
                    ||
                    (
                        seguimiento === "EN_TIEMPO"
                        &&
                        !retrasada
                    );

                const coincideCategoria =
                    !categoria
                    ||
                    String(
                        item.categoria || ""
                    )
                    ===
                    String(categoria);

                const coincideCompania =
                    !companiaId
                    ||
                    String(
                        item.companiaId || ""
                    )
                    ===
                    String(companiaId);

                const coincideProyecto =
                    !proyectoId
                    ||
                    String(
                        item.proyectoId || ""
                    )
                    ===
                    String(proyectoId);

                return coincideTexto
                    && coincideEstado
                    && coincideSeguimiento
                    && coincideCategoria
                    && coincideCompania
                    && coincideProyecto;
            }
        );

    pintarSolicitudesRecursos(
        solicitudesFiltradas
    );
}


function pintarSolicitudesRecursos(
    solicitudes
) {

    const tbody =
        document.getElementById(
            "solicitudesBody"
        );

    const resumen =
        document.getElementById(
            "resumenSolicitudes"
        );

    if (resumen) {

        const totalRetrasadas =
            solicitudes.filter(
                esSolicitudRetrasada
            ).length;

        resumen.textContent =
            `${solicitudes.length} solicitud(es) encontrada(s). `
            + `${totalRetrasadas} retrasada(s).`;
    }

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (solicitudes.length === 0) {

        tbody.innerHTML =
            `<tr>
                <td colspan="12">
                    No hay solicitudes de recursos para mostrar.
                </td>
            </tr>`;

        return;
    }

    solicitudes.forEach(
        solicitud => {

            const tr =
                document.createElement(
                    "tr"
                );

            const textoAccion =
                puedeEditarSolicitud()
                    ? "Administrar"
                    : "Ver";

            tr.innerHTML = `
                <td>
                    ${escaparHtmlRecursos(
                        solicitud.numeroTicket
                        || "-"
                    )}
                </td>

                <td>
                    ${escaparHtmlRecursos(
                        solicitud.clienteNombre
                        || "-"
                    )}
                </td>

                <td>
                    ${escaparHtmlRecursos(
                        solicitud.companiaNombre
                        || "-"
                    )}
                </td>

                <td>
                    ${escaparHtmlRecursos(
                        solicitud.proyectoNombre
                        || "-"
                    )}
                </td>

                <td>
                    ${escaparHtmlRecursos(
                        solicitud.categoria
                        || "-"
                    )}
                </td>

                <td>
                    ${escaparHtmlRecursos(
                        solicitud.recurso
                        || "-"
                    )}
                </td>

                <td>
                    ${escaparHtmlRecursos(
                        solicitud.cantidad
                        ?? "-"
                    )}
                </td>

                <td>
                    ${escaparHtmlRecursos(
                        solicitud.proveedor
                        || "Pendiente"
                    )}
                </td>

                <td>
                    <span class="badge">
                        ${escaparHtmlRecursos(
                            solicitud.estadoRecurso
                            || "NUEVO"
                        )}
                    </span>
                </td>

                <td>
                    ${formatearFechaRecurso(
                        solicitud.fechaEstimadaEntrega
                    )}
                </td>

                <td>
                    <span class="badge">
                        ${esSolicitudRetrasada(solicitud)
                            ? "RETRASADO"
                            : obtenerTextoSeguimientoRecurso(solicitud)}
                    </span>
                </td>

                <td>
                    <button
                        type="button"
                        class="action-link"
                        data-solicitud-id="${solicitud.id}">
                        ${textoAccion}
                    </button>
                </td>
            `;

            const boton =
                tr.querySelector(
                    "[data-solicitud-id]"
                );

            boton?.addEventListener(
                "click",
                () =>
                    abrirSolicitudRecurso(
                        solicitud.id
                    )
            );

            tbody.appendChild(
                tr
            );
        }
    );
}


function abrirSolicitudRecurso(
    solicitudId
) {

    const solicitud =
        solicitudesRecursos.find(
            item =>
                Number(item.id)
                ===
                Number(solicitudId)
        );

    if (!solicitud) {
        return;
    }

    solicitudSeleccionada =
        solicitud;

    const panel =
        document.getElementById(
            "panelSolicitud"
        );

    if (!panel) {
        return;
    }

    asignarValor(
        "solicitudRecursoId",
        solicitud.id
    );

    asignarValor(
        "detalleNumeroTicket",
        solicitud.numeroTicket
    );

    asignarValor(
        "detalleCliente",
        solicitud.clienteNombre
    );

    asignarValor(
        "detalleCompania",
        solicitud.companiaNombre
    );

    asignarValor(
        "detalleProyecto",
        solicitud.proyectoNombre
    );

    asignarValor(
        "detalleCategoria",
        solicitud.categoria
    );

    asignarValor(
        "detalleRecurso",
        solicitud.recurso
    );

    asignarValor(
        "detalleCantidad",
        solicitud.cantidad
    );

    asignarValor(
        "detalleProveedor",
        solicitud.proveedor
    );

    asignarValor(
        "detalleEstadoRecurso",
        solicitud.estadoRecurso
        || "NUEVO"
    );

    asignarValor(
        "detalleFechaSolicitudProveedor",
        fechaParaInput(
            solicitud.fechaSolicitudProveedor
        )
    );

    asignarValor(
        "detalleFechaEstimadaEntrega",
        fechaParaInput(
            solicitud.fechaEstimadaEntrega
        )
    );

    asignarValor(
        "detalleSeguimientoEntrega",
        esSolicitudRetrasada(solicitud)
            ? "RETRASADO"
            : obtenerTextoSeguimientoRecurso(solicitud)
    );

    asignarValor(
        "detalleFechaRecepcion",
        fechaParaInput(
            solicitud.fechaRecepcion
        )
    );

    asignarValor(
        "detalleFechaEntregaCliente",
        fechaParaInput(
            solicitud.fechaEntregaCliente
        )
    );

    asignarValor(
        "detalleObservaciones",
        solicitud.observaciones
    );

    const titulo =
        document.getElementById(
            "tituloPanelSolicitud"
        );

    if (titulo) {

        titulo.textContent =
            `Solicitud ${
                solicitud.numeroTicket
                || "#" + solicitud.id
            }`;
    }

    const subtitulo =
        document.getElementById(
            "subtituloPanelSolicitud"
        );

    if (subtitulo) {

        subtitulo.textContent =
            puedeEditarSolicitud()
                ? "Administra el seguimiento del recurso y los datos del proveedor."
                : "Consulta el seguimiento de esta solicitud de recurso.";
    }

    configurarEdicionPanel();

    panel.hidden =
        false;

    panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function configurarEdicionPanel() {

    const editable =
        puedeEditarSolicitud();

    [
        "detalleCategoria",
        "detalleRecurso",
        "detalleCantidad",
        "detalleProveedor",
        "detalleEstadoRecurso",
        "detalleFechaSolicitudProveedor",
        "detalleFechaEstimadaEntrega",
        "detalleFechaRecepcion",
        "detalleFechaEntregaCliente",
        "detalleObservaciones"
    ].forEach(id => {

        const elemento =
            document.getElementById(id);

        if (!elemento) {
            return;
        }

        elemento.disabled =
            !editable;
    });

    const acciones =
        document.getElementById(
            "accionesEdicionSolicitud"
        );

    if (acciones) {

        acciones.hidden =
            !editable;
    }
}


function cerrarPanelSolicitud() {

    const panel =
        document.getElementById(
            "panelSolicitud"
        );

    if (panel) {
        panel.hidden = true;
    }

    solicitudSeleccionada =
        null;
}


async function guardarSolicitudRecurso(
    event
) {

    event.preventDefault();

    if (!puedeEditarSolicitud()) {

        alert(
            "Tu rol no tiene permiso para modificar solicitudes de recursos."
        );

        return;
    }

    const id =
        Number(
            document
                .getElementById(
                    "solicitudRecursoId"
                )
                ?.value
        );

    if (!id) {

        alert(
            "No se pudo identificar la solicitud."
        );

        return;
    }

    const data = {

        categoria:
            valorTexto(
                "detalleCategoria"
            ),

        recurso:
            valorTexto(
                "detalleRecurso"
            ),

        cantidad:
            Number(
                document
                    .getElementById(
                        "detalleCantidad"
                    )
                    ?.value
            ),

        proveedor:
            valorTexto(
                "detalleProveedor"
            ),

        estadoRecurso:
            valorTexto(
                "detalleEstadoRecurso"
            ),

        fechaSolicitudProveedor:
            fechaParaBackend(
                "detalleFechaSolicitudProveedor"
            ),

        fechaEstimadaEntrega:
            fechaParaBackend(
                "detalleFechaEstimadaEntrega"
            ),

        fechaRecepcion:
            fechaParaBackend(
                "detalleFechaRecepcion"
            ),

        fechaEntregaCliente:
            fechaParaBackend(
                "detalleFechaEntregaCliente"
            ),

        observaciones:
            valorTexto(
                "detalleObservaciones"
            )
    };

    if (
        !data.categoria
        ||
        !data.recurso
        ||
        !data.cantidad
        ||
        data.cantidad < 1
    ) {

        alert(
            "Completa categoría, recurso y una cantidad válida."
        );

        return;
    }

    const boton =
        document.getElementById(
            "btnGuardarSolicitud"
        );

    try {

        if (boton) {

            boton.disabled =
                true;

            boton.textContent =
                "Guardando...";
        }

        const response =
            await fetch(
                `${API_BASE}/solicitudes-recursos/${id}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            data
                        )
                }
            );

        if (!response.ok) {

            throw new Error(
                await obtenerMensajeErrorRecursos(
                    response
                )
            );
        }

        const actualizada =
            await response.json();

        const indice =
            solicitudesRecursos.findIndex(
                item =>
                    Number(item.id)
                    ===
                    Number(actualizada.id)
            );

        if (indice >= 0) {

            solicitudesRecursos[indice] =
                actualizada;
        }

        construirFiltrosRecursos();
        aplicarFiltrosRecursos();

        abrirSolicitudRecurso(
            actualizada.id
        );

        alert(
            "Solicitud actualizada correctamente."
        );

        if (ticketOrigenSolicitudId) {

            const contexto =
                document.getElementById(
                    "contextoTicketSolicitud"
                );

            if (contexto) {
                contexto.textContent =
                    `Solicitud ${
                        actualizada.numeroTicket
                        || ""
                    } actualizada correctamente.`;
            }
        }

    } catch (error) {

        console.error(
            "Error actualizando solicitud:",
            error
        );

        alert(
            error.message
            || "No se pudo actualizar la solicitud."
        );

    } finally {

        if (boton) {

            boton.disabled =
                false;

            boton.textContent =
                "Guardar cambios";
        }
    }
}


function asignarValor(
    id,
    valor
) {

    const elemento =
        document.getElementById(id);

    if (!elemento) {
        return;
    }

    elemento.value =
        valor ?? "";
}


function valorTexto(id) {

    return String(
        document
            .getElementById(id)
            ?.value
        || ""
    )
        .trim();
}


function fechaParaBackend(id) {

    const valor =
        document
            .getElementById(id)
            ?.value;

    if (!valor) {
        return null;
    }

    return valor.length === 16
        ? `${valor}:00`
        : valor;
}


function fechaParaInput(valor) {

    if (!valor) {
        return "";
    }

    const texto =
        String(valor);

    return texto.length >= 16
        ? texto.substring(0, 16)
        : texto;
}


function esSolicitudRetrasada(
    solicitud
) {

    return solicitud?.retrasada === true;
}


function obtenerTextoSeguimientoRecurso(
    solicitud
) {

    if (
        !solicitud
        ||
        !solicitud.fechaEstimadaEntrega
    ) {
        return "SIN FECHA";
    }

    const estado =
        String(
            solicitud.estadoRecurso
            || "NUEVO"
        )
            .trim()
            .toUpperCase();

    if (
        [
            "RECIBIDO",
            "ENTREGADO",
            "CERRADO"
        ].includes(estado)
    ) {
        return "COMPLETADO";
    }

    if (
        estado === "CANCELADO"
    ) {
        return "CANCELADO";
    }

    return "EN TIEMPO";
}


function formatearFechaRecurso(
    valor
) {

    if (!valor) {
        return "Pendiente";
    }

    const fecha =
        new Date(valor);

    if (Number.isNaN(
        fecha.getTime()
    )) {

        return escaparHtmlRecursos(
            valor
        );
    }

    return fecha.toLocaleString(
        "es-PA"
    );
}


async function obtenerMensajeErrorRecursos(
    response
) {

    const contentType =
        response.headers.get(
            "content-type"
        )
        || "";

    if (
        contentType.includes(
            "application/json"
        )
    ) {

        try {

            const data =
                await response.json();

            return data.message
                || data.error
                || `Error ${response.status}`;

        } catch (error) {

            return `Error ${response.status}`;
        }
    }

    try {

        const texto =
            await response.text();

        return texto
            || `Error ${response.status}`;

    } catch (error) {

        return `Error ${response.status}`;
    }
}


function escaparHtmlRecursos(
    valor
) {

    return String(
        valor ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}
