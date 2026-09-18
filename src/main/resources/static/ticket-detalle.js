let ticketActual = null;
let ticketId = null;
let enlacesCompartidosActuales = [];
let intervaloSlaTicket = null;
let proyectoOrigenId = null;
let solicitudRecursoActual = null;

document.addEventListener("DOMContentLoaded", async () => {

    try {

        inicializarLayout();

    } catch (errorLayout) {

        console.warn(
            "El layout tuvo un problema, pero el detalle continuará:",
            errorLayout
        );
    }

    const params = new URLSearchParams(window.location.search);
    ticketId = params.get("id");

    const proyectoOrigen =
        Number(
            params.get("proyectoId")
        );

    proyectoOrigenId =
        Number.isInteger(proyectoOrigen)
        &&
        proyectoOrigen > 0
            ? proyectoOrigen
            : null;

    configurarRegresoTickets();

    if (!ticketId) {
        alert("No se recibió el ID del ticket.");
        window.location.href = "tickets.html";
        return;
    }

    configurarVistaPorRol();
    configurarModalHistorial();
    configurarModalComentario();
    configurarModalCompartirTicket();
    configurarFormularioRecursoTicket();

    /*
     * Primero cargamos el ticket específico.
     * Los demás módulos dependen de que ticketActual
     * ya tenga compañía y proyecto.
     */
    const detalleCargado = await cargarDetalleTicket();

    if (!detalleCargado) {
        return;
    }

    await Promise.all([
        cargarComentarios(),
        cargarAdjuntosTicket()
    ]);

    const rol = obtenerRolSesion();

    if (rol === "ADMIN" || rol === "SUPERVISOR") {
        await Promise.all([
            cargarUsuariosParaAsignar(),
            cargarEnlacesCompartidos()
        ]);
    }
});

function obtenerRolSesion() {
    const usuario = obtenerSesion();

    return String(usuario?.rol || "")
        .trim()
        .toUpperCase();
}


/* =====================================================
   FETCH CON TIMEOUT DEL DETALLE
===================================================== */

async function fetchConTimeoutTicket(
    url,
    timeoutMs = 10000
) {

    const controller =
        new AbortController();


    const timer =
        setTimeout(
            () => controller.abort(),
            timeoutMs
        );


    try {

        return await fetch(
            url,
            {
                signal:
                    controller.signal
            }
        );


    } catch (error) {

        if (
            error?.name === "AbortError"
        ) {

            throw new Error(
                `El servidor tardó demasiado en responder a ${url}.`
            );
        }


        throw error;


    } finally {

        clearTimeout(
            timer
        );
    }
}


/* =====================================================
   ERROR VISIBLE EN EL DETALLE
===================================================== */

function mostrarErrorCargaTicket(
    mensaje
) {

    const numero =
        document.getElementById(
            "ticketNumero"
        );


    const titulo =
        document.getElementById(
            "ticketTitulo"
        );


    if (numero) {

        numero.textContent =
            "No se pudo cargar el ticket";
    }


    if (titulo) {

        titulo.textContent =
            mensaje;
    }


    [
        "ticketEstado",
        "ticketPrioridad",
        "ticketTipo",
        "ticketTipoAtencion",
        "ticketFecha",
        "ticketTiempoAbierto",
        "ticketFechaCierre",
        "ticketCompania",
        "ticketProyecto",
        "ticketCliente",
        "ticketCorreo",
        "ticketAgente"
    ]
        .forEach(
            id => {

                const elemento =
                    document.getElementById(
                        id
                    );


                if (elemento) {

                    elemento.textContent =
                        "-";
                }
            }
        );


    const descripcion =
        document.getElementById(
            "ticketDescripcion"
        );


    if (descripcion) {

        descripcion.textContent =
            mensaje;
    }


    const sla =
        document.getElementById(
            "slaMensajeGeneral"
        );


    if (sla) {

        sla.className =
            "ticket-sla-message sla-message-danger";


        sla.textContent =
            "No fue posible calcular el SLA porque el ticket no terminó de cargar.";
    }
}


/* =====================================================
   DETALLE DEL TICKET
===================================================== */

async function cargarDetalleTicket() {

    try {

        /*
         * Cargamos solamente el ticket solicitado.
         *
         * El backend actual ya dispone de:
         * GET /api/tickets/{id}
         *
         * Además, ese endpoint valida que el usuario autenticado
         * tenga permiso para consultar el ticket.
         */
        const response =
            await fetchConTimeoutTicket(
                `${API_BASE}/tickets/${
                    encodeURIComponent(
                        ticketId
                    )
                }`,
                10000
            );


        if (!response.ok) {

            const mensaje =
                await obtenerMensajeErrorRespuesta(
                    response
                );


            if (
                response.status === 403
            ) {

                throw new Error(
                    mensaje
                    ||
                    "No tienes permiso para consultar este ticket."
                );
            }


            if (
                response.status === 404
            ) {

                throw new Error(
                    mensaje
                    ||
                    "El ticket no fue encontrado."
                );
            }


            throw new Error(
                mensaje
                ||
                "No se pudo cargar el detalle del ticket."
            );
        }


        ticketActual =
            await response.json();


        if (
            !ticketActual
            ||
            Number(
                ticketActual.id
            )
            !==
            Number(
                ticketId
            )
        ) {

            throw new Error(
                "La información recibida del ticket no es válida."
            );
        }


        /*
         * PintarDetalle actualiza los datos generales y el contador
         * de tiempo abierto utilizando fechaCreacion y fechaCierre.
         */
        pintarDetalle(
            ticketActual
        );

        await cargarSolicitudRecursoTicket();

        configurarVistaTicketSegunTipo();


        return true;


    } catch (error) {

        console.error(
            "Error cargando detalle:",
            error
        );


        mostrarErrorCargaTicket(
            error.message
            ||
            "Error cargando el detalle del ticket."
        );


        return false;
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

    const tipoAtencion =
        document.getElementById(
            "ticketTipoAtencion"
        );

    if (tipoAtencion) {
        tipoAtencion.textContent =
            esTicketRecursoExterno(ticket)
                ? "Recurso externo"
                : "Operativo";
    }

    document.getElementById("ticketFecha").textContent =
        formatearFecha(ticket.fechaCreacion);

    /*
     * Tiempo total que el ticket permanece abierto.
     * No depende del SLA y solo se detiene al existir fechaCierre.
     */
    pintarTiempoAbiertoTicket(ticket);

    /* NUEVO: compañía y proyecto */
    const compania = document.getElementById("ticketCompania");
    const proyecto = document.getElementById("ticketProyecto");

    if (compania) {
        compania.textContent =
            ticket.companiaNombre || "Sin compañía";
    }

    if (proyecto) {
        proyecto.textContent =
            ticket.proyectoNombre || "Sin proyecto";
    }

    document.getElementById("ticketCliente").textContent =
        ticket.clienteNombre || "-";

    document.getElementById("ticketCorreo").textContent =
        ticket.clienteCorreo || "-";

    document.getElementById("ticketAgente").textContent =
        ticket.agenteNombre || "Sin asignar";

    document.getElementById("ticketDescripcion").textContent =
        ticket.descripcion || "Sin descripción";

    /*
     * El tiempo visible del ticket no depende del SLA.
     * Se actualiza cada minuto y solo se detiene con fechaCierre.
     */
    configurarActualizacionTiempoAbierto();

    const nuevoEstado = document.getElementById("nuevoEstado");

    if (nuevoEstado && ticket.estado) {
        const existeEstado = Array.from(nuevoEstado.options)
            .some(option => option.value === ticket.estado);

        if (existeEstado) {
            nuevoEstado.value = ticket.estado;
        }
    }

    const nuevaPrioridad =
        document.getElementById("nuevaPrioridad");

    if (nuevaPrioridad && ticket.prioridad) {
        nuevaPrioridad.value = ticket.prioridad;
    }

    const selectAgente = document.getElementById("agenteId");

    if (
        selectAgente &&
        ticket.agenteId &&
        Array.from(selectAgente.options)
            .some(option => Number(option.value) === Number(ticket.agenteId))
    ) {
        selectAgente.value = String(ticket.agenteId);
    }
}


/* =====================================================
   TIPO DE ATENCIÓN / SOLICITUD DE RECURSO
===================================================== */

const TRANSICIONES_RECURSO_TICKET = {
    NUEVO: [
        "EN_VALIDACION",
        "CANCELADO"
    ],
    EN_VALIDACION: [
        "SOLICITADO_PROVEEDOR",
        "CANCELADO"
    ],
    SOLICITADO_PROVEEDOR: [
        "ESPERANDO_PROVEEDOR",
        "RECIBIDO",
        "CANCELADO"
    ],
    ESPERANDO_PROVEEDOR: [
        "RECIBIDO",
        "CANCELADO"
    ],
    RECIBIDO: [
        "ENTREGADO"
    ],
    ENTREGADO: [
        "CERRADO"
    ],
    CERRADO: [],
    CANCELADO: []
};


function esTicketRecursoExterno(
    ticket = ticketActual
) {

    return String(
        ticket?.tipoAtencion || "OPERATIVO"
    )
        .trim()
        .toUpperCase()
    === "RECURSO_EXTERNO";
}


function puedeAdministrarRecursoTicket() {

    const rol =
        obtenerRolSesion();

    return rol === "ADMIN"
        || rol === "SUPERVISOR";
}


async function cargarSolicitudRecursoTicket() {

    solicitudRecursoActual =
        null;

    const seccion =
        document.getElementById(
            "seccionSolicitudRecursoTicket"
        );

    /*
     * El propio ticket indica automáticamente si su atención
     * corresponde a un recurso externo. Para tickets operativos
     * no mostramos este módulo.
     */
    if (!esTicketRecursoExterno()) {

        if (seccion) {
            seccion.hidden = true;
        }

        cerrarEdicionRecursoTicket();
        return;
    }

    if (seccion) {
        seccion.hidden = false;
    }

    mostrarMensajeRecursoTicket(
        "Solicitud externa detectada automáticamente. Cargando seguimiento...",
        "info"
    );

    try {

        const response =
            await fetch(
                `${API_BASE}/solicitudes-recursos/ticket/${
                    encodeURIComponent(
                        ticketId
                    )
                }`
            );

        if (response.status === 403) {

            if (seccion) {
                seccion.hidden = true;
            }

            return;
        }

        if (!response.ok) {

            throw new Error(
                await obtenerMensajeErrorRespuesta(
                    response
                )
                ||
                "No se pudo cargar la solicitud de recurso."
            );
        }

        solicitudRecursoActual =
            await response.json();

        pintarSolicitudRecursoTicket(
            solicitudRecursoActual
        );

        mostrarMensajeRecursoTicket(
            "Solicitud externa vinculada a este ticket.",
            "success"
        );

    } catch (error) {

        console.error(
            "Error cargando solicitud de recurso:",
            error
        );

        if (seccion) {
            seccion.hidden = false;
        }

        ponerTextoRecurso(
            "recursoEstado",
            "No disponible"
        );

        ponerTextoRecurso(
            "recursoObservaciones",
            error.message
            ||
            "No se pudo cargar la solicitud."
        );

        mostrarMensajeRecursoTicket(
            error.message
            ||
            "No se pudo cargar la solicitud de recurso.",
            "error"
        );
    }
}


function pintarSolicitudRecursoTicket(
    solicitud
) {

    const seccion =
        document.getElementById(
            "seccionSolicitudRecursoTicket"
        );

    if (!seccion) {
        return;
    }

    seccion.hidden = false;

    ponerTextoRecurso(
        "recursoCategoria",
        formatearTextoRecurso(
            solicitud?.categoria
        )
    );

    ponerTextoRecurso(
        "recursoNombre",
        solicitud?.recurso
        ||
        "-"
    );

    ponerTextoRecurso(
        "recursoCantidad",
        solicitud?.cantidad
        ??
        "-"
    );

    ponerTextoRecurso(
        "recursoProveedor",
        solicitud?.proveedor
        ||
        "Pendiente"
    );

    ponerTextoRecurso(
        "recursoEstado",
        formatearTextoRecurso(
            solicitud?.estadoRecurso
            ||
            "NUEVO"
        )
    );

    ponerTextoRecurso(
        "recursoFechaSolicitudProveedor",
        formatearFechaRecursoTicket(
            solicitud?.fechaSolicitudProveedor
        )
    );

    ponerTextoRecurso(
        "recursoFechaEstimadaOriginal",
        formatearFechaRecursoTicket(
            solicitud?.fechaEstimadaEntregaOriginal
        )
    );

    ponerTextoRecurso(
        "recursoFechaEstimadaEntrega",
        formatearFechaRecursoTicket(
            solicitud?.fechaEstimadaEntrega
        )
    );

    ponerTextoRecurso(
        "recursoSituacionEntrega",
        formatearTextoRecurso(
            solicitud?.situacionEntrega
            ||
            "SIN_FECHA"
        )
    );

    ponerTextoRecurso(
        "recursoDiasRetraso",
        Number(
            solicitud?.diasRetraso
            ||
            0
        )
    );

    ponerTextoRecurso(
        "recursoMotivoRetraso",
        solicitud?.motivoRetraso
            ? formatearTextoRecurso(
                solicitud.motivoRetraso
            )
            : "Sin especificar"
    );

    ponerTextoRecurso(
        "recursoDetalleRetraso",
        solicitud?.detalleRetraso
        ||
        "Sin detalle"
    );

    ponerTextoRecurso(
        "recursoFechaRecepcion",
        formatearFechaRecursoTicket(
            solicitud?.fechaRecepcion
        )
    );

    ponerTextoRecurso(
        "recursoFechaEntregaCliente",
        formatearFechaRecursoTicket(
            solicitud?.fechaEntregaCliente
        )
    );

    ponerTextoRecurso(
        "recursoObservaciones",
        solicitud?.observaciones
        ||
        "Sin observaciones"
    );

    const boton =
        document.getElementById(
            "btnAdministrarSolicitudRecurso"
        );

    if (boton) {

        boton.hidden =
            !puedeAdministrarRecursoTicket();

        boton.textContent =
            "Editar recurso";
    }

    cargarFormularioRecursoTicket(
        solicitud
    );
}


function configurarFormularioRecursoTicket() {

    const boton =
        document.getElementById(
            "btnAdministrarSolicitudRecurso"
        );

    if (boton) {
        boton.addEventListener(
            "click",
            () => {
                alternarEdicionRecursoTicket();
            }
        );
    }

    const cancelar =
        document.getElementById(
            "btnCancelarEdicionRecursoTicket"
        );

    if (cancelar) {
        cancelar.addEventListener(
            "click",
            () => {
                cerrarEdicionRecursoTicket();
                cargarFormularioRecursoTicket(
                    solicitudRecursoActual
                );
            }
        );
    }

    const formulario =
        document.getElementById(
            "formAdministrarRecursoTicket"
        );

    if (formulario) {
        formulario.addEventListener(
            "submit",
            guardarSolicitudRecursoDesdeTicket
        );
    }
}


function alternarEdicionRecursoTicket() {

    if (!puedeAdministrarRecursoTicket()) {
        return;
    }

    const panel =
        document.getElementById(
            "panelAdministrarRecursoTicket"
        );

    const boton =
        document.getElementById(
            "btnAdministrarSolicitudRecurso"
        );

    if (!panel) {
        return;
    }

    const estaAbierto =
        panel.style.display !== "none";

    panel.style.display =
        estaAbierto
            ? "none"
            : "block";

    if (boton) {
        boton.textContent =
            estaAbierto
                ? "Editar recurso"
                : "Ocultar edición";
    }

    if (!estaAbierto) {
        cargarFormularioRecursoTicket(
            solicitudRecursoActual
        );

        panel.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }
}


function cerrarEdicionRecursoTicket() {

    const panel =
        document.getElementById(
            "panelAdministrarRecursoTicket"
        );

    const boton =
        document.getElementById(
            "btnAdministrarSolicitudRecurso"
        );

    if (panel) {
        panel.style.display = "none";
    }

    if (boton) {
        boton.textContent =
            "Editar recurso";
    }
}


function cargarFormularioRecursoTicket(
    solicitud = solicitudRecursoActual
) {

    if (!solicitud) {
        return;
    }

    asignarValorCampoRecurso(
        "recursoEditCategoria",
        solicitud.categoria
    );

    asignarValorCampoRecurso(
        "recursoEditNombre",
        solicitud.recurso
    );

    asignarValorCampoRecurso(
        "recursoEditCantidad",
        solicitud.cantidad
    );

    asignarValorCampoRecurso(
        "recursoEditProveedor",
        solicitud.proveedor
    );

    asignarValorCampoRecurso(
        "recursoEditFechaSolicitudProveedor",
        aValorDatetimeLocal(
            solicitud.fechaSolicitudProveedor
        )
    );

    asignarValorCampoRecurso(
        "recursoEditFechaEstimadaOriginal",
        aValorDatetimeLocal(
            solicitud.fechaEstimadaEntregaOriginal
        )
    );

    asignarValorCampoRecurso(
        "recursoEditFechaEstimadaEntrega",
        aValorDatetimeLocal(
            solicitud.fechaEstimadaEntrega
        )
    );

    asignarValorCampoRecurso(
        "recursoEditFechaRecepcion",
        aValorDatetimeLocal(
            solicitud.fechaRecepcion
        )
    );

    asignarValorCampoRecurso(
        "recursoEditFechaEntregaCliente",
        aValorDatetimeLocal(
            solicitud.fechaEntregaCliente
        )
    );

    asignarValorCampoRecurso(
        "recursoEditDetalleRetraso",
        solicitud.detalleRetraso
    );

    asignarValorCampoRecurso(
        "recursoEditObservaciones",
        solicitud.observaciones
    );

    configurarSelectMotivoRetrasoTicket(
        solicitud.motivoRetraso
    );

    configurarEstadosRecursoTicket(
        solicitud.estadoRecurso
    );
}


function configurarEstadosRecursoTicket(
    estadoActualValor
) {

    const select =
        document.getElementById(
            "recursoEditEstado"
        );

    if (!select) {
        return;
    }

    const estadoActual =
        String(
            estadoActualValor
            ||
            "NUEVO"
        )
            .trim()
            .toUpperCase();

    const siguientes =
        TRANSICIONES_RECURSO_TICKET[
            estadoActual
        ]
        ||
        [];

    const opciones = [
        estadoActual,
        ...siguientes
    ];

    select.innerHTML = "";

    opciones.forEach(
        estado => {

            const option =
                document.createElement(
                    "option"
                );

            option.value = estado;
            option.textContent = estado;

            select.appendChild(
                option
            );
        }
    );

    select.value = estadoActual;

    select.disabled =
        siguientes.length === 0;
}


function configurarSelectMotivoRetrasoTicket(
    valor
) {

    const select =
        document.getElementById(
            "recursoEditMotivoRetraso"
        );

    if (!select) {
        return;
    }

    const normalizado =
        String(valor || "")
            .trim()
            .toUpperCase();

    if (
        normalizado
        &&
        !Array.from(
            select.options
        ).some(
            option =>
                option.value === normalizado
        )
    ) {

        const option =
            document.createElement(
                "option"
            );

        option.value = normalizado;
        option.textContent =
            formatearTextoRecurso(
                normalizado
            );

        select.appendChild(
            option
        );
    }

    select.value = normalizado;
}


async function guardarSolicitudRecursoDesdeTicket(
    event
) {

    event.preventDefault();

    if (
        !solicitudRecursoActual
        ||
        !puedeAdministrarRecursoTicket()
    ) {
        return;
    }

    const boton =
        document.getElementById(
            "btnGuardarRecursoTicket"
        );

    if (boton) {
        boton.disabled = true;
        boton.textContent = "Guardando...";
    }

    try {

        const payload = {
            categoria:
                obtenerValorTextoRecurso(
                    "recursoEditCategoria"
                ),

            recurso:
                obtenerValorTextoRecurso(
                    "recursoEditNombre"
                ),

            cantidad:
                Number(
                    document.getElementById(
                        "recursoEditCantidad"
                    )?.value
                    ||
                    0
                ),

            proveedor:
                obtenerValorTextoRecurso(
                    "recursoEditProveedor"
                ),

            estadoRecurso:
                document.getElementById(
                    "recursoEditEstado"
                )?.value
                ||
                solicitudRecursoActual.estadoRecurso,

            fechaSolicitudProveedor:
                obtenerValorFechaRecurso(
                    "recursoEditFechaSolicitudProveedor"
                ),

            fechaEstimadaEntrega:
                obtenerValorFechaRecurso(
                    "recursoEditFechaEstimadaEntrega"
                ),

            fechaRecepcion:
                obtenerValorFechaRecurso(
                    "recursoEditFechaRecepcion"
                ),

            fechaEntregaCliente:
                obtenerValorFechaRecurso(
                    "recursoEditFechaEntregaCliente"
                ),

            motivoRetraso:
                document.getElementById(
                    "recursoEditMotivoRetraso"
                )?.value
                ||
                "",

            detalleRetraso:
                obtenerValorTextoRecurso(
                    "recursoEditDetalleRetraso"
                ),

            observaciones:
                obtenerValorTextoRecurso(
                    "recursoEditObservaciones"
                )
        };

        if (
            !payload.categoria
            ||
            !payload.recurso
            ||
            !Number.isInteger(
                payload.cantidad
            )
            ||
            payload.cantidad < 1
        ) {
            throw new Error(
                "Completa categoría, recurso y una cantidad válida."
            );
        }

        const response =
            await fetch(
                `${API_BASE}/solicitudes-recursos/${
                    encodeURIComponent(
                        solicitudRecursoActual.id
                    )
                }`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        if (!response.ok) {

            throw new Error(
                await obtenerMensajeErrorRespuesta(
                    response
                )
                ||
                "No se pudieron guardar los cambios del recurso."
            );
        }

        solicitudRecursoActual =
            await response.json();

        pintarSolicitudRecursoTicket(
            solicitudRecursoActual
        );

        cerrarEdicionRecursoTicket();

        mostrarMensajeRecursoTicket(
            "Recurso actualizado correctamente desde el detalle del ticket.",
            "success"
        );

        /*
         * Si la solicitud externa llegó a CERRADO, el backend también
         * cierra el ticket y fija fechaCierre. Recargamos el detalle para
         * que el estado y el tiempo total queden actualizados al instante.
         */
        if (
            String(
                solicitudRecursoActual.estadoRecurso
                ||
                ""
            )
                .trim()
                .toUpperCase()
            ===
            "CERRADO"
        ) {

            await cargarDetalleTicket();
        }

    } catch (error) {

        console.error(
            "Error actualizando recurso desde ticket:",
            error
        );

        mostrarMensajeRecursoTicket(
            error.message
            ||
            "No se pudieron guardar los cambios.",
            "error"
        );

    } finally {

        if (boton) {
            boton.disabled = false;
            boton.textContent =
                "Guardar cambios";
        }
    }
}


function mostrarMensajeRecursoTicket(
    mensaje,
    tipo = "info"
) {

    const elemento =
        document.getElementById(
            "mensajeRecursoTicket"
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


function asignarValorCampoRecurso(
    id,
    valor
) {

    const campo =
        document.getElementById(
            id
        );

    if (!campo) {
        return;
    }

    campo.value =
        valor == null
            ? ""
            : String(valor);
}


function obtenerValorTextoRecurso(
    id
) {

    return String(
        document.getElementById(
            id
        )?.value
        ||
        ""
    ).trim();
}


function obtenerValorFechaRecurso(
    id
) {

    const valor =
        String(
            document.getElementById(
                id
            )?.value
            ||
            ""
        ).trim();

    return valor || null;
}


function aValorDatetimeLocal(
    valor
) {

    if (!valor) {
        return "";
    }

    const texto =
        String(valor).trim();

    /*
     * LocalDateTime de Spring normalmente llega como
     * yyyy-MM-ddTHH:mm:ss. datetime-local acepta yyyy-MM-ddTHH:mm.
     */
    const coincidencia =
        texto.match(
            /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/
        );

    if (coincidencia) {
        return coincidencia[1];
    }

    const fecha =
        new Date(texto);

    if (Number.isNaN(fecha.getTime())) {
        return "";
    }

    const relleno =
        numero =>
            String(numero).padStart(
                2,
                "0"
            );

    return `${fecha.getFullYear()}-${
        relleno(fecha.getMonth() + 1)
    }-${
        relleno(fecha.getDate())
    }T${
        relleno(fecha.getHours())
    }:${
        relleno(fecha.getMinutes())
    }`;
}


function configurarVistaTicketSegunTipo() {

    configurarVistaPorRol();

    const seccion =
        document.getElementById(
            "seccionSolicitudRecursoTicket"
        );

    if (
        !esTicketRecursoExterno()
    ) {

        if (seccion) {
            seccion.hidden = true;
        }

        return;
    }

    if (seccion) {
        seccion.hidden = false;
    }

    /*
     * En un ticket de recurso externo el flujo técnico del ticket
     * no se modifica manualmente desde el selector operativo.
     * El seguimiento se administra desde el módulo de recurso
     * que ya está integrado en este mismo detalle.
     */
    const nuevoEstado =
        document.getElementById(
            "nuevoEstado"
        );

    if (nuevoEstado) {
        nuevoEstado.disabled = true;
    }
}


function ponerTextoRecurso(
    id,
    valor
) {

    const elemento =
        document.getElementById(
            id
        );

    if (elemento) {
        elemento.textContent =
            valor;
    }
}


function formatearTextoRecurso(
    valor
) {

    const texto =
        String(
            valor || "-"
        )
            .trim();

    if (
        !texto
        ||
        texto === "-"
    ) {
        return "-";
    }

    return texto
        .replaceAll(
            "_",
            " "
        )
        .toLowerCase()
        .replace(
            /\b\p{L}/gu,
            letra =>
                letra.toUpperCase()
        );
}


function formatearFechaRecursoTicket(
    valor
) {

    if (!valor) {
        return "Pendiente";
    }

    const fecha =
        new Date(
            valor
        );

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return String(valor);
    }

    return fecha.toLocaleString(
        "es-PA"
    );
}


/* =====================================================
   REGRESO AL LISTADO DE TICKETS
===================================================== */

function configurarRegresoTickets() {

    const boton =
        document.getElementById(
            "btnVolverTickets"
        );


    if (!boton) {

        return;
    }


    boton.addEventListener(
        "click",
        () => {

            window.location.href =
                proyectoOrigenId

                    ? `tickets.html?proyectoId=${
                        encodeURIComponent(
                            proyectoOrigenId
                        )
                    }`

                    : "tickets.html";
        }
    );
}


/* =====================================================
   TIEMPO ABIERTO DEL TICKET
===================================================== */

function pintarTiempoAbiertoTicket(
    ticket = ticketActual
) {

    const elementoTiempo =
        document.getElementById(
            "ticketTiempoAbierto"
        );

    const elementoCierre =
        document.getElementById(
            "ticketFechaCierre"
        );

    if (!ticket) {
        return;
    }

    const inicio = ticket.fechaCreacion
        ? new Date(ticket.fechaCreacion)
        : null;

    const cierre = ticket.fechaCierre
        ? new Date(ticket.fechaCierre)
        : null;

    if (
        !inicio
        || Number.isNaN(inicio.getTime())
    ) {
        if (elementoTiempo) {
            elementoTiempo.textContent =
                "Sin fecha de creación";
        }

        if (elementoCierre) {
            elementoCierre.textContent =
                cierre
                    ? formatearFecha(ticket.fechaCierre)
                    : "Pendiente";
        }

        return;
    }

    const fechaFinal =
        cierre && !Number.isNaN(cierre.getTime())
            ? cierre
            : new Date();

    const duracionMs = Math.max(
        0,
        fechaFinal.getTime() - inicio.getTime()
    );

    const duracion =
        formatearDuracionTiempoAbierto(
            duracionMs
        );

    if (elementoTiempo) {
        elementoTiempo.textContent =
            cierre
                ? `Cerrado · ${duracion}`
                : `Abierto · ${duracion}`;
    }

    if (elementoCierre) {
        elementoCierre.textContent =
            cierre
                ? formatearFecha(ticket.fechaCierre)
                : "Pendiente";
    }
}


function formatearDuracionTiempoAbierto(
    milisegundos
) {

    const totalMinutos = Math.max(
        0,
        Math.floor(
            milisegundos / 60000
        )
    );

    const dias = Math.floor(
        totalMinutos / 1440
    );

    const horas = Math.floor(
        (totalMinutos % 1440) / 60
    );

    const minutos =
        totalMinutos % 60;

    const partes = [];

    if (dias > 0) {
        partes.push(
            `${dias} ${dias === 1 ? "día" : "días"}`
        );
    }

    if (horas > 0 || dias > 0) {
        partes.push(
            `${horas} ${horas === 1 ? "h" : "h"}`
        );
    }

    partes.push(
        `${minutos} min`
    );

    return partes.join(" ");
}


/* =====================================================
   SLA DEL TICKET
===================================================== */

function pintarSlaTicket(
    ticket
) {

    if (!ticket) {
        return;
    }

    const regla =
        obtenerReglaSlaPrioridad(
            ticket.prioridad
        );

    const esRecurso =
        esTicketRecursoExterno(
            ticket
        );

    ponerTextoSla(
        "slaReglaPrioridad",
        regla.nombre
    );

    ponerTextoSla(
        "slaReglaTiempos",
        esRecurso
            ? `Respuesta: ${regla.respuesta} · Resolución: No aplica por dependencia externa`
            : `Respuesta: ${regla.respuesta} · Resolución: ${regla.resolucion}`
    );

    const respuesta =
        construirEstadoSlaVisual({
            fechaInicio:
                ticket.fechaCreacion,

            fechaLimite:
                ticket.fechaLimiteRespuesta,

            fechaEvento:
                ticket.fechaPrimeraRespuesta,

            estadoBackend:
                ticket.estadoSlaRespuesta
                ||
                ticket.slaEstadoRespuesta
                ||
                ""
        });

    pintarBloqueSla(
        "Respuesta",
        respuesta
    );

    ponerTextoSla(
        "slaRespuestaLimite",
        formatearFechaHoraSla(
            ticket.fechaLimiteRespuesta
        )
    );

    ponerTextoSla(
        "slaPrimeraRespuestaFecha",
        ticket.fechaPrimeraRespuesta
            ? formatearFechaHoraSla(
                ticket.fechaPrimeraRespuesta
            )
            : "Pendiente"
    );

    if (esRecurso) {

        pintarResolucionNoAplicaRecurso(
            respuesta
        );

        return;
    }

    const resolucion =
        construirEstadoSlaVisual({
            fechaInicio:
                ticket.fechaCreacion,

            fechaLimite:
                ticket.fechaLimiteResolucion,

            fechaEvento:
                ticket.fechaResolucion,

            estadoBackend:
                ticket.estadoSlaResolucion
                ||
                ticket.slaEstadoResolucion
                ||
                ""
        });

    pintarBloqueSla(
        "Resolucion",
        resolucion
    );

    ponerTextoSla(
        "slaResolucionLimite",
        formatearFechaHoraSla(
            ticket.fechaLimiteResolucion
        )
    );

    ponerTextoSla(
        "slaResolucionFecha",
        ticket.fechaResolucion
            ? formatearFechaHoraSla(
                ticket.fechaResolucion
            )
            : "Pendiente"
    );

    pintarMensajeGeneralSla(
        respuesta,
        resolucion
    );
}


function pintarResolucionNoAplicaRecurso(
    respuesta
) {

    const resolucion = {
        estado:
            "NO_APLICA",

        porcentaje:
            0,

        textoTiempo:
            "Depende de proveedor externo",

        clase:
            "neutral"
    };

    pintarBloqueSla(
        "Resolucion",
        resolucion
    );

    ponerTextoSla(
        "slaResolucionLimite",
        "No aplica"
    );

    ponerTextoSla(
        "slaResolucionFecha",
        "Se controla desde la solicitud de recurso"
    );

    const mensaje =
        document.getElementById(
            "slaMensajeGeneral"
        );

    if (!mensaje) {
        return;
    }

    mensaje.className =
        "ticket-sla-message";

    if (
        respuesta.estado === "VENCIDO"
        ||
        respuesta.estado === "INCUMPLIDO"
    ) {

        mensaje.classList.add(
            "sla-message-danger"
        );

        mensaje.textContent =
            "La primera respuesta presenta incumplimiento. El tiempo de entrega del recurso se mide por separado y el ticket permanece abierto hasta CERRADO.";

        return;
    }

    if (
        respuesta.estado === "EN_RIESGO"
    ) {

        mensaje.classList.add(
            "sla-message-warning"
        );

        mensaje.textContent =
            "La primera respuesta está en riesgo. El seguimiento del recurso se controla de forma independiente y el ticket continúa abierto.";

        return;
    }

    mensaje.classList.add(
        "sla-message-ok"
    );

    mensaje.textContent =
        "El SLA de primera respuesta permanece como indicador. La resolución operativa se controla desde la solicitud de recurso y el ticket permanece abierto hasta CERRADO.";
}


/* =====================================================
   REGLAS SLA SEGÚN PRIORIDAD
===================================================== */

function obtenerReglaSlaPrioridad(
    prioridad
) {

    const valor =
        String(
            prioridad || ""
        )
            .trim()
            .toUpperCase();


    switch (valor) {

        case "P1_CRITICA":

            return {
                nombre:
                    "P1 · Crítica",

                respuesta:
                    "30 min",

                resolucion:
                    "4 h"
            };


        case "P2_ALTA":

            return {
                nombre:
                    "P2 · Alta",

                respuesta:
                    "1 h",

                resolucion:
                    "8 h"
            };


        case "P3_MEDIA":

            return {
                nombre:
                    "P3 · Media",

                respuesta:
                    "4 h",

                resolucion:
                    "24 h"
            };


        case "P4_BAJA":

            return {
                nombre:
                    "P4 · Baja",

                respuesta:
                    "8 h",

                resolucion:
                    "72 h"
            };


        default:

            return {
                nombre:
                    prioridad || "Sin prioridad",

                respuesta:
                    "-",

                resolucion:
                    "-"
            };
    }
}


/* =====================================================
   CONSTRUIR ESTADO VISUAL DEL SLA
===================================================== */

function construirEstadoSlaVisual({
    fechaInicio,
    fechaLimite,
    fechaEvento,
    estadoBackend
}) {

    const estadoNormalizado =
        normalizarEstadoSlaTicket(
            estadoBackend
        );


    const inicio =
        fechaInicio
            ? new Date(fechaInicio)
            : null;


    const limite =
        fechaLimite
            ? new Date(fechaLimite)
            : null;


    const evento =
        fechaEvento
            ? new Date(fechaEvento)
            : null;


    if (
        !inicio
        ||
        !limite
        ||
        Number.isNaN(
            inicio.getTime()
        )
        ||
        Number.isNaN(
            limite.getTime()
        )
    ) {

        return {
            estado:
                estadoNormalizado
                ||
                "SIN_CONFIGURAR",

            porcentaje:
                0,

            textoTiempo:
                "Sin SLA configurado",

            clase:
                "neutral"
        };
    }


    const totalMs =
        Math.max(
            1,
            limite.getTime()
            -
            inicio.getTime()
        );


    /*
     * Si ya ocurrió la primera respuesta o resolución,
     * el SLA deja de correr y se evalúa con la hora
     * real del evento.
     */
    if (
        evento
        &&
        !Number.isNaN(
            evento.getTime()
        )
    ) {

        const consumidoMs =
            Math.max(
                0,
                evento.getTime()
                -
                inicio.getTime()
            );


        const porcentaje =
            Math.min(
                100,
                Math.max(
                    0,
                    Math.round(
                        (
                            consumidoMs
                            /
                            totalMs
                        )
                        *
                        100
                    )
                )
            );


        const cumplido =
            evento <= limite;


        return {
            estado:
                cumplido
                    ? "CUMPLIDO"
                    : "INCUMPLIDO",

            porcentaje:
                porcentaje,

            textoTiempo:
                cumplido
                    ? "Atendido dentro del tiempo acordado"
                    : "Atendido después del tiempo límite",

            clase:
                cumplido
                    ? "ok"
                    : "danger"
        };
    }


    const ahora =
        new Date();


    if (
        ahora > limite
    ) {

        return {
            estado:
                "VENCIDO",

            porcentaje:
                100,

            textoTiempo:
                `Vencido hace ${
                    formatearDuracionSla(
                        ahora.getTime()
                        -
                        limite.getTime()
                    )
                }`,

            clase:
                "danger"
        };
    }


    const consumidoMs =
        Math.max(
            0,
            ahora.getTime()
            -
            inicio.getTime()
        );


    const porcentaje =
        Math.min(
            100,
            Math.max(
                0,
                Math.round(
                    (
                        consumidoMs
                        /
                        totalMs
                    )
                    *
                    100
                )
            )
        );


    const restanteMs =
        Math.max(
            0,
            limite.getTime()
            -
            ahora.getTime()
        );


    const enRiesgo =
        porcentaje >= 75
        ||
        estadoNormalizado === "EN_RIESGO";


    return {
        estado:
            enRiesgo
                ? "EN_RIESGO"
                : "EN_TIEMPO",

        porcentaje:
            porcentaje,

        textoTiempo:
            `${formatearDuracionSla(restanteMs)} restante(s)`,

        clase:
            enRiesgo
                ? "warning"
                : "ok"
    };
}


/* =====================================================
   PINTAR CADA BLOQUE SLA
===================================================== */

function pintarBloqueSla(
    prefijo,
    datos
) {

    const card =
        document.getElementById(
            `sla${prefijo}Card`
        );


    const badge =
        document.getElementById(
            `sla${prefijo}Badge`
        );


    const titulo =
        document.getElementById(
            `sla${prefijo}EstadoTexto`
        );


    const progreso =
        document.getElementById(
            `sla${prefijo}Progreso`
        );


    const barra =
        document.getElementById(
            `sla${prefijo}Barra`
        );


    const tiempo =
        document.getElementById(
            `sla${prefijo}Tiempo`
        );


    const porcentaje =
        document.getElementById(
            `sla${prefijo}Porcentaje`
        );


    const clase =
        datos.clase
        ||
        "neutral";


    if (card) {

        card.classList.remove(
            "sla-card-ok",
            "sla-card-warning",
            "sla-card-danger",
            "sla-card-neutral"
        );


        card.classList.add(
            `sla-card-${clase}`
        );
    }


    if (badge) {

        badge.className =
            `ticket-sla-status sla-status-${clase}`;


        badge.textContent =
            formatearEstadoSlaTicket(
                datos.estado
            );
    }


    if (titulo) {

        titulo.textContent =
            obtenerTituloEstadoSla(
                datos.estado
            );
    }


    if (progreso) {

        progreso.setAttribute(
            "aria-valuenow",
            String(
                datos.porcentaje
            )
        );
    }


    if (barra) {

        barra.className =
            `sla-progress-${clase}`;


        barra.style.width =
            `${datos.porcentaje}%`;
    }


    if (tiempo) {

        tiempo.textContent =
            datos.textoTiempo;
    }


    if (porcentaje) {

        porcentaje.textContent =
            `${datos.porcentaje}% consumido`;
    }
}


/* =====================================================
   MENSAJE GENERAL
===================================================== */

function pintarMensajeGeneralSla(
    respuesta,
    resolucion
) {

    const mensaje =
        document.getElementById(
            "slaMensajeGeneral"
        );


    if (!mensaje) {

        return;
    }


    mensaje.className =
        "ticket-sla-message";


    const estados =
        [
            respuesta.estado,
            resolucion.estado
        ];


    if (
        estados.includes(
            "VENCIDO"
        )
        ||
        estados.includes(
            "INCUMPLIDO"
        )
    ) {

        mensaje.classList.add(
            "sla-message-danger"
        );


        mensaje.textContent =
            "Este ticket supera un objetivo de SLA y requiere atención prioritaria. El ticket permanece abierto hasta que su estado cambie a CERRADO.";

        return;
    }


    if (
        estados.includes(
            "EN_RIESGO"
        )
    ) {

        mensaje.classList.add(
            "sla-message-warning"
        );


        mensaje.textContent =
            "Este ticket está próximo a alcanzar uno de sus objetivos de SLA. Esto no cierra ni detiene el ticket.";

        return;
    }


    if (
        estados.every(
            estado =>
                estado === "CUMPLIDO"
                ||
                estado === "EN_TIEMPO"
        )
    ) {

        mensaje.classList.add(
            "sla-message-ok"
        );


        mensaje.textContent =
            "El ticket se encuentra dentro de los objetivos de servicio. El tiempo abierto continúa hasta CERRADO.";

        return;
    }


    mensaje.textContent =
        "El SLA es un indicador de servicio según la prioridad; no es un vencimiento del ticket. El ticket permanece abierto hasta CERRADO.";
}


/* =====================================================
   ACTUALIZACIÓN AUTOMÁTICA
===================================================== */

function configurarActualizacionTiempoAbierto() {

    if (
        intervaloSlaTicket
    ) {

        clearInterval(
            intervaloSlaTicket
        );
    }


    /*
     * Se actualiza una vez por minuto para que el usuario
     * pueda ver cuándo pasa de EN TIEMPO a EN RIESGO
     * o a VENCIDO sin recargar la página.
     */
    intervaloSlaTicket =
        setInterval(
            () => {

                if (
                    ticketActual
                ) {

                    pintarTiempoAbiertoTicket(
                        ticketActual
                    );
                }
            },
            60000
        );
}


/* =====================================================
   FORMATOS SLA
===================================================== */

function normalizarEstadoSlaTicket(
    estado
) {

    const valor =
        String(
            estado || ""
        )
            .trim()
            .toUpperCase();


    const validos =
        [
            "CUMPLIDO",
            "INCUMPLIDO",
            "VENCIDO",
            "EN_RIESGO",
            "EN_TIEMPO",
            "SIN_CONFIGURAR"
        ];


    return validos.includes(
        valor
    )
        ? valor
        : "";
}


function formatearEstadoSlaTicket(
    estado
) {

    switch (
        normalizarEstadoSlaTicket(
            estado
        )
    ) {

        case "CUMPLIDO":

            return "Cumplido";


        case "INCUMPLIDO":

            return "Incumplido";


        case "VENCIDO":

            return "Vencido";


        case "EN_RIESGO":

            return "En riesgo";


        case "EN_TIEMPO":

            return "En tiempo";


        default:

            return "Sin configurar";
    }
}


function obtenerTituloEstadoSla(
    estado
) {

    switch (
        normalizarEstadoSlaTicket(
            estado
        )
    ) {

        case "CUMPLIDO":

            return "Objetivo cumplido";


        case "INCUMPLIDO":

            return "Objetivo incumplido";


        case "VENCIDO":

            return "Tiempo excedido";


        case "EN_RIESGO":

            return "Próximo al límite";


        case "EN_TIEMPO":

            return "Dentro del tiempo";


        default:

            return "Sin configuración";
    }
}


function formatearFechaHoraSla(
    valor
) {

    if (!valor) {

        return "-";
    }


    const fecha =
        new Date(
            valor
        );


    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {

        return "-";
    }


    return fecha.toLocaleString(
        "es-PA",
        {
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );
}


function formatearDuracionSla(
    milisegundos
) {

    const totalMinutos =
        Math.max(
            0,
            Math.ceil(
                milisegundos
                /
                60000
            )
        );


    if (
        totalMinutos < 60
    ) {

        return `${totalMinutos} min`;
    }


    const horas =
        Math.floor(
            totalMinutos
            /
            60
        );


    const minutos =
        totalMinutos
        %
        60;


    if (
        horas < 24
    ) {

        return minutos > 0
            ? `${horas} h ${minutos} min`
            : `${horas} h`;
    }


    const dias =
        Math.floor(
            horas
            /
            24
        );


    const horasRestantes =
        horas
        %
        24;


    return horasRestantes > 0
        ? `${dias} d ${horasRestantes} h`
        : `${dias} d`;
}


function ponerTextoSla(
    id,
    valor
) {

    const elemento =
        document.getElementById(
            id
        );


    if (elemento) {

        elemento.textContent =
            valor;
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

    const botonHistorial =
        document.querySelector(".ticket-history-link");

    if (!usuario) {
        return;
    }

    const rol = obtenerRolSesion();

    if (botonHistorial) {
        botonHistorial.style.display =
            rol === "ADMIN"
                ? "inline-flex"
                : "none";
    }

    if (accionesSupervisor) {
        accionesSupervisor.style.display = "none";
    }

    if (accionesAgente) {
        accionesAgente.style.display = "none";
    }

    if (seccionEnlacesCompartidos) {
        seccionEnlacesCompartidos.style.display = "none";
    }

    const esSupervisorOAdmin =
        rol === "SUPERVISOR"
        ||
        rol === "ADMIN";

    if (esSupervisorOAdmin) {
        if (accionesSupervisor) {
            accionesSupervisor.style.display = "block";
        }

        if (
            accionesAgente
            &&
            !esTicketRecursoExterno(
                ticketActual
            )
        ) {
            accionesAgente.style.display = "block";
        }

        if (seccionEnlacesCompartidos) {
            seccionEnlacesCompartidos.style.display = "block";
        }

        if (mensajeAcciones) {
            mensajeAcciones.textContent =
                esTicketRecursoExterno(ticketActual)
                    ? "Puedes asignar el ticket y compartirlo. El seguimiento del recurso se administra desde Solicitudes de Recursos."
                    : "Puedes asignar agentes, cambiar el estado, ajustar la prioridad y compartir el ticket.";
        }
    }

    if (rol === "AGENTE") {
        if (
            accionesAgente
            &&
            !esTicketRecursoExterno(
                ticketActual
            )
        ) {
            accionesAgente.style.display = "block";
        }

        if (mensajeAcciones) {
            mensajeAcciones.textContent =
                esTicketRecursoExterno(ticketActual)
                    ? "Este ticket depende de un recurso externo. Puedes consultar su seguimiento, pero el flujo del proveedor es administrado por supervisores y administradores."
                    : "Puedes trabajar el ticket y utilizar las acciones autorizadas para tu rol.";
        }
    }

    if (rol === "CLIENTE") {
        if (mensajeAcciones) {
            mensajeAcciones.textContent =
                esTicketRecursoExterno(ticketActual)
                    ? "Puedes consultar el ticket, seguir el estado del recurso y agregar comentarios públicos."
                    : "Puedes consultar el ticket y agregar comentarios públicos.";
        }

        if (tipoComentario) {
            tipoComentario.innerHTML = `
                <option value="PUBLICO">
                    PÚBLICO
                </option>
            `;

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
    const rol = obtenerRolSesion();

    if (
        !usuario ||
        (rol !== "SUPERVISOR" && rol !== "ADMIN") ||
        !select
    ) {
        return;
    }

    if (!ticketActual?.proyectoId) {
        select.innerHTML = `
            <option value="">
                El ticket no tiene un proyecto válido
            </option>
        `;

        select.disabled = true;
        return;
    }

    try {
        select.disabled = true;
        select.innerHTML = `
            <option value="">
                Cargando agentes...
            </option>
        `;

        /*
         * Mostramos TODOS los usuarios activos con rol AGENTE.
         *
         * También consultamos los accesos actuales del proyecto
         * para saber si el agente ya pertenece al proyecto.
         *
         * Si todavía no tiene acceso, no lo ocultamos:
         * al asignarlo al ticket se le otorgará/reactivará
         * automáticamente el acceso a ese mismo proyecto.
         */
        const [respuestaUsuarios, respuestaAccesos] =
            await Promise.all([
                fetch(`${API_BASE}/usuarios`),
                fetch(
                    `${API_BASE}/usuario-proyectos/proyecto/${ticketActual.proyectoId}`
                )
            ]);

        if (!respuestaUsuarios.ok) {
            throw new Error(
                await obtenerMensajeErrorRespuesta(
                    respuestaUsuarios
                )
            );
        }

        if (!respuestaAccesos.ok) {
            throw new Error(
                await obtenerMensajeErrorRespuesta(
                    respuestaAccesos
                )
            );
        }

        const usuarios =
            await respuestaUsuarios.json();

        const accesos =
            await respuestaAccesos.json();

        const usuariosConAcceso =
            new Set(
                (Array.isArray(accesos) ? accesos : [])
                    .filter(
                        acceso =>
                            Boolean(acceso?.estado)
                    )
                    .map(
                        acceso =>
                            Number(acceso.usuarioId)
                    )
                    .filter(
                        id =>
                            id > 0
                    )
            );

        const agentes =
            Array.isArray(usuarios)
                ? usuarios.filter(
                    usuarioItem => {
                        const rolUsuario =
                            String(
                                usuarioItem.rol || ""
                            )
                                .trim()
                                .toUpperCase();

                        return (
                            rolUsuario === "AGENTE"
                            &&
                            usuarioItem.estado !== false
                        );
                    }
                )
                : [];

        agentes.sort(
            (agenteA, agenteB) => {
                const nombreA =
                    `${agenteA.nombre || ""} ${agenteA.apellido || ""}`
                        .trim()
                        .toLowerCase();

                const nombreB =
                    `${agenteB.nombre || ""} ${agenteB.apellido || ""}`
                        .trim()
                        .toLowerCase();

                return nombreA.localeCompare(
                    nombreB,
                    "es"
                );
            }
        );

        select.innerHTML = `
            <option value="">
                Seleccione agente
            </option>
        `;

        agentes.forEach(
            agente => {
                const option =
                    document.createElement(
                        "option"
                    );

                const nombreCompleto =
                    `${agente.nombre || ""} ${agente.apellido || ""}`
                        .trim();

                const tieneAcceso =
                    usuariosConAcceso.has(
                        Number(agente.id)
                    );

                option.value =
                    String(agente.id);

                option.dataset.tieneAcceso =
                    String(tieneAcceso);

                option.textContent =
                    tieneAcceso
                        ? (nombreCompleto || "Agente")
                        : `${nombreCompleto || "Agente"} — se agregará al proyecto`;

                select.appendChild(
                    option
                );
            }
        );

        if (agentes.length === 0) {
            select.innerHTML = `
                <option value="">
                    No hay usuarios activos con rol AGENTE
                </option>
            `;

            select.disabled = true;

        } else {
            select.disabled = false;

            if (
                ticketActual?.agenteId
                &&
                agentes.some(
                    agente =>
                        Number(agente.id)
                        ===
                        Number(ticketActual.agenteId)
                )
            ) {
                select.value =
                    String(
                        ticketActual.agenteId
                    );
            }
        }

    } catch (error) {
        console.error(
            "Error cargando agentes:",
            error
        );

        select.innerHTML = `
            <option value="">
                Error cargando agentes
            </option>
        `;

        select.disabled = true;
    }
}

async function asignarTicket() {
    const selectAgente =
        document.getElementById(
            "agenteId"
        );

    const agenteId =
        Number(
            selectAgente?.value
        );

    if (!agenteId) {
        alert(
            "Selecciona un agente."
        );

        return;
    }

    if (!ticketActual?.proyectoId) {
        alert(
            "El ticket no tiene un proyecto válido."
        );

        return;
    }

    const opcionSeleccionada =
        selectAgente?.selectedOptions?.[0];

    const agenteYaTieneAcceso =
        opcionSeleccionada?.dataset
            ?.tieneAcceso === "true";

    try {
        /*
         * El backend mantiene la regla de seguridad:
         * un agente debe tener acceso al proyecto antes
         * de quedar asignado al ticket.
         *
         * Para que ADMIN/SUPERVISOR puedan hacer todo
         * desde la misma pantalla, si el agente todavía
         * no pertenece al proyecto creamos o reactivamos
         * ese acceso primero.
         */
        if (!agenteYaTieneAcceso) {
            const respuestaAcceso =
                await fetch(
                    `${API_BASE}/usuario-proyectos`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                usuarioId:
                                    agenteId,
                                proyectoId:
                                    Number(
                                        ticketActual.proyectoId
                                    )
                            })
                    }
                );

            if (!respuestaAcceso.ok) {
                const mensaje =
                    await obtenerMensajeErrorRespuesta(
                        respuestaAcceso
                    );

                /*
                 * Si otra acción acaba de crear el acceso,
                 * continuamos con la asignación.
                 */
                if (
                    !String(mensaje || "")
                        .toLowerCase()
                        .includes(
                            "ya tiene acceso"
                        )
                ) {
                    throw new Error(
                        mensaje
                        ||
                        "No se pudo habilitar al agente en el proyecto."
                    );
                }
            }
        }

        const response =
            await fetch(
                `${API_BASE}/tickets/${ticketId}/asignar`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            agenteId:
                                agenteId
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                await obtenerMensajeErrorRespuesta(
                    response
                )
            );
        }

        alert(
            agenteYaTieneAcceso
                ? "Ticket asignado correctamente."
                : "Agente agregado al proyecto y ticket asignado correctamente."
        );

        await cargarDetalleTicket();
        await cargarUsuariosParaAsignar();
        await cargarHistorial();

    } catch (error) {
        console.error(
            "Error asignando ticket:",
            error
        );

        alert(
            error.message
            ||
            "Error asignando ticket."
        );
    }
}

/* =====================================================
   CAMBIO DE ESTADO
===================================================== */

async function cambiarEstadoTicket() {

    if (
        esTicketRecursoExterno()
    ) {

        alert(
            "Los tickets de recurso externo no utilizan el flujo operativo de estados. Administra el estado desde Solicitudes de Recursos."
        );

        return;
    }

    const estado =
        document.getElementById("nuevoEstado")?.value;

    const notaResolucion =
        document
            .getElementById("notaResolucion")
            ?.value
            .trim() || "";

    if (!estado) {
        alert("Selecciona un estado.");
        return;
    }

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
            throw new Error(
                await obtenerMensajeErrorRespuesta(response)
            );
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

        alert(
            error.message ||
            "Error cambiando estado."
        );
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

    if (!prioridad) {
        alert("Selecciona una prioridad.");
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
            throw new Error(
                await obtenerMensajeErrorRespuesta(response)
            );
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

        alert(
            error.message ||
            "Error cambiando prioridad."
        );
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
                await obtenerMensajeErrorRespuesta(response)
            );
        }

        let comentarios = await response.json();

        if (!Array.isArray(comentarios)) {
            comentarios = [];
        }

        /*
         * Defensa visual adicional.
         * El backend ya filtra los comentarios internos
         * para CLIENTE, pero no los pintamos aunque una
         * respuesta inesperada los incluyera.
         */
        if (obtenerRolSesion() === "CLIENTE") {
            comentarios = comentarios.filter(
                comentario =>
                    String(comentario?.tipoComentario || "PUBLICO")
                        .trim()
                        .toUpperCase() === "PUBLICO"
            );
        }

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
                    ${escaparHtml(
                        error.message ||
                        "No se pudieron cargar los comentarios."
                    )}
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

    const rol = obtenerRolSesion();

    /*
     * CLIENTE siempre envía PUBLICO,
     * aunque el select fuera manipulado manualmente.
     */
    const tipoComentario =
        rol === "CLIENTE"
            ? "PUBLICO"
            : (tipoComentarioInput?.value || "PUBLICO");

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
                await obtenerMensajeErrorRespuesta(response)
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

        alert(
            error.message ||
            "Error creando comentario."
        );
    }
}

function puedeVerHistorial() {
    return obtenerRolSesion() === "ADMIN";
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
    if (!puedeVerHistorial()) {
        return;
    }

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
    if (!puedeVerHistorial()) {
        return;
    }

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

        puedeComentar: false,

        puedeVerAdjuntos: false,

        puedeSubirAdjuntos: false,

        puedeCambiarEstado: false,

        fechaExpiracion: fechaExpiracion
    };

    try {
        if (boton) {
            boton.disabled = true;
            boton.textContent =
                "Generando enlace...";
        }

        mostrarMensajeCompartir(
            "Generando el enlace...",
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
            "El enlace fue generado correctamente. El sistema intentó enviarlo al correo indicado.",
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
                "Generar enlace";
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

async function obtenerMensajeErrorRespuesta(response) {
    const contenidoTipo =
        response.headers.get("content-type") || "";

    if (contenidoTipo.includes("application/json")) {
        try {
            const contenido = await response.json();

            return (
                contenido.message ||
                contenido.error ||
                contenido.detail ||
                `Error ${response.status}`
            );

        } catch (error) {
            return `Error ${response.status}`;
        }
    }

    try {
        const texto = await response.text();

        return texto || `Error ${response.status}`;

    } catch (error) {
        return `Error ${response.status}`;
    }
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