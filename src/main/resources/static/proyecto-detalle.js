let proyectoActual = null;
let proyectoId = null;
let ticketsProyecto = [];
let usuarioSesionProyecto = null;


document.addEventListener("DOMContentLoaded", async () => {

    inicializarLayout();

    usuarioSesionProyecto =
        obtenerSesion();


    if (!usuarioSesionProyecto) {

        window.location.href =
            "login.html";

        return;
    }


    const params =
        new URLSearchParams(
            window.location.search
        );


    proyectoId =
        Number(
            params.get("id")
        );


    if (
        !Number.isInteger(proyectoId)
        ||
        proyectoId <= 0
    ) {

        alert(
            "No se recibió un proyecto válido."
        );

        window.location.href =
            "proyectos.html";

        return;
    }


    configurarBotonesProyecto();

    await cargarDashboardProyecto();
});


/* =====================================================
   CARGA GENERAL DEL DASHBOARD
===================================================== */

async function cargarDashboardProyecto() {

    try {

        /*
         * Primero validamos que el usuario
         * realmente pueda acceder al proyecto.
         */
        proyectoActual =
            await cargarProyectoAutorizado();


        if (!proyectoActual) {

            throw new Error(
                "No tienes acceso a este proyecto."
            );
        }


        pintarInformacionProyecto(
            proyectoActual
        );


        /*
         * Después cargamos únicamente los tickets
         * que el backend ya permite ver al usuario.
         */
        ticketsProyecto =
            await cargarTicketsProyecto();


        pintarMetricasProyecto();
        pintarEstadosProyecto();
        pintarSlaProyecto();
        pintarSaludProyectoDetalle();
        pintarTicketsRecientes();


        /*
         * El listado completo del equipo solamente
         * se obtiene para ADMIN y SUPERVISOR.
         */
        await cargarEquipoProyecto();


    } catch (error) {

        console.error(
            "Error cargando dashboard del proyecto:",
            error
        );


        alert(
            error.message ||
            "No se pudo cargar el proyecto."
        );


        window.location.href =
            "proyectos.html";
    }
}


/* =====================================================
   OBTENER PROYECTO AUTORIZADO
===================================================== */

async function cargarProyectoAutorizado() {

    const rol =
        obtenerRolSesionProyecto();


    /*
     * =================================================
     * ADMIN
     * =================================================
     *
     * El administrador puede consultar los proyectos
     * registrados sin necesitar una asignación
     * UsuarioProyecto.
     */
    if (rol === "ADMIN") {

        const [
            responseProyectos,
            responseCompanias
        ] = await Promise.all([

            fetch(
                `${API_BASE}/proyectos`
            ),

            fetch(
                `${API_BASE}/companias`
            )
        ]);


        if (!responseProyectos.ok) {

            throw new Error(
                await obtenerMensajeErrorProyectoDetalle(
                    responseProyectos
                )
            );
        }


        if (!responseCompanias.ok) {

            throw new Error(
                await obtenerMensajeErrorProyectoDetalle(
                    responseCompanias
                )
            );
        }


        const proyectos =
            await responseProyectos.json();


        const companias =
            await responseCompanias.json();


        const proyecto =
            Array.isArray(proyectos)

                ? proyectos.find(
                    item =>
                        Number(
                            item.id
                            ||
                            item.proyectoId
                        )
                        ===
                        Number(
                            proyectoId
                        )
                )

                : null;


        if (!proyecto) {

            throw new Error(
                "Proyecto no encontrado."
            );
        }


        /*
         * No mostramos un proyecto inactivo.
         */
        if (
            proyecto.estado === false
        ) {

            throw new Error(
                "Este proyecto está inactivo."
            );
        }


        const companiaId =
            Number(
                proyecto.companiaId
                ||
                proyecto.compania?.id
            );


        const compania =
            Array.isArray(companias)

                ? companias.find(
                    item =>
                        Number(item.id)
                        ===
                        companiaId
                )

                : null;


        if (
            compania
            &&
            compania.estado === false
        ) {

            throw new Error(
                "La compañía de este proyecto está inactiva."
            );
        }


        return {

            proyectoId:
                Number(
                    proyecto.id
                    ||
                    proyecto.proyectoId
                ),

            proyectoNombre:
                proyecto.nombre
                ||
                proyecto.proyectoNombre
                ||
                "Proyecto",

            descripcion:
                proyecto.descripcion
                ||
                "",

            estado:
                proyecto.estado !== false,

            companiaId:
                companiaId,

            companiaNombre:
                proyecto.companiaNombre
                ||
                proyecto.compania?.nombre
                ||
                compania?.nombre
                ||
                "Compañía"
        };
    }


    /*
     * =================================================
     * CLIENTE / AGENTE / SUPERVISOR
     * =================================================
     *
     * Para estos roles la fuente de verdad es
     * /mis-proyectos.
     */
    const response =
        await fetch(
            `${API_BASE}/usuario-proyectos/mis-proyectos`
        );


    if (!response.ok) {

        throw new Error(
            await obtenerMensajeErrorProyectoDetalle(
                response
            )
        );
    }


    const asignaciones =
        await response.json();


    const asignacion =
        Array.isArray(asignaciones)

            ? asignaciones.find(
                item =>
                    Number(
                        item.proyectoId
                    )
                    ===
                    Number(
                        proyectoId
                    )
                    &&
                    item.estado !== false
            )

            : null;


    if (!asignacion) {

        throw new Error(
            "No tienes acceso a este proyecto."
        );
    }


    return {

        proyectoId:
            Number(
                asignacion.proyectoId
            ),

        proyectoNombre:
            asignacion.proyectoNombre
            ||
            "Proyecto",

        /*
         * UsuarioProyectoResponseDTO actualmente
         * no necesita incluir descripción.
         */
        descripcion:
            asignacion.proyectoDescripcion
            ||
            "",

        estado:
            asignacion.estado !== false,

        companiaId:
            Number(
                asignacion.companiaId
            ),

        companiaNombre:
            asignacion.companiaNombre
            ||
            "Compañía"
    };
}


/* =====================================================
   INFORMACIÓN DEL PROYECTO
===================================================== */

function pintarInformacionProyecto(
    proyecto
) {

    const compania =
        document.getElementById(
            "proyectoCompania"
        );


    const nombre =
        document.getElementById(
            "proyectoNombre"
        );


    const descripcion =
        document.getElementById(
            "proyectoDescripcion"
        );


    const estado =
        document.getElementById(
            "proyectoEstado"
        );


    if (compania) {

        compania.textContent =
            proyecto.companiaNombre
            ||
            "Compañía";
    }


    if (nombre) {

        nombre.textContent =
            proyecto.proyectoNombre
            ||
            "Proyecto";
    }


    if (descripcion) {

        descripcion.textContent =
            proyecto.descripcion
            ||
            "Proyecto disponible para la gestión y seguimiento de incidencias.";
    }


    if (estado) {

        const activo =
            proyecto.estado !== false;


        estado.textContent =
            activo
                ? "ACTIVO"
                : "INACTIVO";


        estado.classList.remove(
            "active",
            "inactive"
        );


        estado.classList.add(
            activo
                ? "active"
                : "inactive"
        );
    }


    /*
     * Actualizamos también el título
     * de la pestaña del navegador.
     */
    document.title =
        `${proyecto.proyectoNombre || "Proyecto"} | Gestión de Incidencias`;
}


/* =====================================================
   TICKETS DEL PROYECTO
===================================================== */

async function cargarTicketsProyecto() {

    const response =
        await fetch(
            `${API_BASE}/tickets`
        );


    if (!response.ok) {

        throw new Error(
            await obtenerMensajeErrorProyectoDetalle(
                response
            )
        );
    }


    const tickets =
        await response.json();


    if (!Array.isArray(tickets)) {

        return [];
    }


    /*
     * Aunque el backend ya filtra los tickets
     * según el rol, aquí todavía limitamos
     * la pantalla al proyecto seleccionado.
     */
    return tickets.filter(
        ticket =>
            Number(
                ticket.proyectoId
            )
            ===
            Number(
                proyectoId
            )
    );
}


/* =====================================================
   MÉTRICAS PRINCIPALES
===================================================== */

function pintarMetricasProyecto() {

    const total =
        ticketsProyecto.length;


    const nuevos =
        contarEstadoProyecto(
            "NUEVO"
        );


    const progreso =
        contarEstadoProyecto("ASIGNADO")
        +
        contarEstadoProyecto("EN_PROGRESO")
        +
        contarEstadoProyecto("RESUELTO");


    const cerrados =
        contarEstadoProyecto(
            "CERRADO"
        );


    ponerTextoProyecto(
        "metricaTotal",
        total
    );


    ponerTextoProyecto(
        "metricaNuevos",
        nuevos
    );


    ponerTextoProyecto(
        "metricaProgreso",
        progreso
    );


    ponerTextoProyecto(
        "metricaCerrados",
        cerrados
    );
}


/* =====================================================
   DISTRIBUCIÓN POR ESTADO
===================================================== */

function pintarEstadosProyecto() {

    const nuevos =
        contarEstadoProyecto(
            "NUEVO"
        );


    const progreso =
        contarEstadoProyecto("ASIGNADO")
        +
        contarEstadoProyecto("EN_PROGRESO")
        +
        contarEstadoProyecto("RESUELTO");


    const cerrados =
        contarEstadoProyecto(
            "CERRADO"
        );


    const abiertos =
        nuevos
        +
        progreso;


    ponerTextoProyecto(
        "estadoNuevo",
        nuevos
    );


    ponerTextoProyecto(
        "estadoProgreso",
        progreso
    );


    ponerTextoProyecto(
        "estadoCerrado",
        cerrados
    );


    ponerTextoProyecto(
        "estadoAbiertos",
        abiertos
    );
}


/* =====================================================
   CONTAR ESTADO
===================================================== */

function contarEstadoProyecto(
    estado
) {

    return ticketsProyecto.filter(
        ticket =>
            String(
                ticket.estado || ""
            )
                .trim()
                .toUpperCase()
            ===
            estado
    ).length;
}


/* =====================================================
   SLA DEL PROYECTO
===================================================== */

function pintarSlaProyecto() {

    /*
     * =================================================
     * SLA DE RESPUESTA
     * =================================================
     */

    const resultadosRespuesta =
        ticketsProyecto

            .map(
                ticket =>
                    obtenerResultadoSlaRespuesta(
                        ticket
                    )
            )

            .filter(
                valor =>
                    valor !== null
            );


    const respuestaCumplida =
        resultadosRespuesta.filter(
            valor =>
                valor === true
        ).length;


    const porcentajeRespuesta =
        resultadosRespuesta.length > 0

            ? Math.round(
                (
                    respuestaCumplida
                    /
                    resultadosRespuesta.length
                )
                *
                100
            )

            : null;


    /*
     * =================================================
     * SLA DE RESOLUCIÓN
     * =================================================
     */

    const resultadosResolucion =
        ticketsProyecto

            .map(
                ticket =>
                    obtenerResultadoSlaResolucion(
                        ticket
                    )
            )

            .filter(
                valor =>
                    valor !== null
            );


    const resolucionCumplida =
        resultadosResolucion.filter(
            valor =>
                valor === true
        ).length;


    const porcentajeResolucion =
        resultadosResolucion.length > 0

            ? Math.round(
                (
                    resolucionCumplida
                    /
                    resultadosResolucion.length
                )
                *
                100
            )

            : null;


    /*
     * =================================================
     * RIESGO Y VENCIMIENTOS
     * =================================================
     *
     * Un ticket se cuenta una sola vez aunque
     * tenga afectado el SLA de respuesta y
     * resolución simultáneamente.
     */

    let enRiesgo = 0;
    let vencidos = 0;


    ticketsProyecto.forEach(
        ticket => {

            const estadoRespuesta =
                calcularEstadoSlaRespuestaFrontend(
                    ticket
                );


            const estadoResolucion =
                calcularEstadoSlaResolucionFrontend(
                    ticket
                );


            const tieneVencimiento =
                estadoRespuesta === "VENCIDO"
                ||
                estadoRespuesta === "INCUMPLIDO"
                ||
                estadoResolucion === "VENCIDO"
                ||
                estadoResolucion === "INCUMPLIDO";


            const tieneRiesgo =
                estadoRespuesta === "EN_RIESGO"
                ||
                estadoResolucion === "EN_RIESGO";


            if (tieneVencimiento) {

                vencidos++;

            } else if (tieneRiesgo) {

                enRiesgo++;
            }
        }
    );


    ponerTextoProyecto(
        "slaRespuesta",
        porcentajeRespuesta === null
            ? "Sin datos"
            : `${porcentajeRespuesta}%`
    );


    ponerTextoProyecto(
        "slaResolucion",
        porcentajeResolucion === null
            ? "Sin datos"
            : `${porcentajeResolucion}%`
    );


    ponerTextoProyecto(
        "slaRiesgo",
        enRiesgo
    );


    ponerTextoProyecto(
        "slaVencidos",
        vencidos
    );


    pintarMensajeSlaProyecto(
        porcentajeRespuesta,
        porcentajeResolucion,
        enRiesgo,
        vencidos
    );
}


/* =====================================================
   RESULTADO SLA RESPUESTA
===================================================== */

function obtenerResultadoSlaRespuesta(
    ticket
) {

    if (
        typeof ticket.slaRespuestaCumplido
        ===
        "boolean"
    ) {

        return ticket.slaRespuestaCumplido;
    }


    /*
     * Si todavía no hubo primera respuesta,
     * no se utiliza para el porcentaje
     * histórico de cumplimiento.
     */
    if (
        !ticket.fechaPrimeraRespuesta
    ) {

        return null;
    }


    if (
        !ticket.fechaLimiteRespuesta
    ) {

        return null;
    }


    const primeraRespuesta =
        new Date(
            ticket.fechaPrimeraRespuesta
        );


    const limite =
        new Date(
            ticket.fechaLimiteRespuesta
        );


    if (
        Number.isNaN(
            primeraRespuesta.getTime()
        )
        ||
        Number.isNaN(
            limite.getTime()
        )
    ) {

        return null;
    }


    return primeraRespuesta <= limite;
}


/* =====================================================
   RESULTADO SLA RESOLUCIÓN
===================================================== */

function obtenerResultadoSlaResolucion(
    ticket
) {

    if (
        typeof ticket.slaResolucionCumplido
        ===
        "boolean"
    ) {

        return ticket.slaResolucionCumplido;
    }


    if (
        !ticket.fechaResolucion
        ||
        !ticket.fechaLimiteResolucion
    ) {

        return null;
    }


    const resolucion =
        new Date(
            ticket.fechaResolucion
        );


    const limite =
        new Date(
            ticket.fechaLimiteResolucion
        );


    if (
        Number.isNaN(
            resolucion.getTime()
        )
        ||
        Number.isNaN(
            limite.getTime()
        )
    ) {

        return null;
    }


    return resolucion <= limite;
}


/* =====================================================
   ESTADO SLA RESPUESTA
===================================================== */

function calcularEstadoSlaRespuestaFrontend(
    ticket
) {

    /*
     * Si el backend ya devuelve el estado,
     * utilizamos ese valor.
     */
    const estadoBackend =
        normalizarEstadoSla(
            ticket.estadoSlaRespuesta
            ||
            ticket.slaEstadoRespuesta
        );


    if (estadoBackend) {

        return estadoBackend;
    }


    /*
     * Si ya hubo primera respuesta.
     */
    if (
        ticket.fechaPrimeraRespuesta
        &&
        ticket.fechaLimiteRespuesta
    ) {

        const respuesta =
            new Date(
                ticket.fechaPrimeraRespuesta
            );


        const limite =
            new Date(
                ticket.fechaLimiteRespuesta
            );


        if (
            !Number.isNaN(
                respuesta.getTime()
            )
            &&
            !Number.isNaN(
                limite.getTime()
            )
        ) {

            return respuesta <= limite
                ? "CUMPLIDO"
                : "INCUMPLIDO";
        }
    }


    return calcularEstadoSlaPendienteFrontend(
        ticket.fechaCreacion,
        ticket.fechaLimiteRespuesta
    );
}


/* =====================================================
   ESTADO SLA RESOLUCIÓN
===================================================== */

function calcularEstadoSlaResolucionFrontend(
    ticket
) {

    const estadoBackend =
        normalizarEstadoSla(
            ticket.estadoSlaResolucion
            ||
            ticket.slaEstadoResolucion
        );


    if (estadoBackend) {

        return estadoBackend;
    }


    /*
     * Si el ticket ya fue resuelto,
     * comparamos las fechas.
     */
    if (
        ticket.fechaResolucion
        &&
        ticket.fechaLimiteResolucion
    ) {

        const resolucion =
            new Date(
                ticket.fechaResolucion
            );


        const limite =
            new Date(
                ticket.fechaLimiteResolucion
            );


        if (
            !Number.isNaN(
                resolucion.getTime()
            )
            &&
            !Number.isNaN(
                limite.getTime()
            )
        ) {

            return resolucion <= limite
                ? "CUMPLIDO"
                : "INCUMPLIDO";
        }
    }


    return calcularEstadoSlaPendienteFrontend(
        ticket.fechaCreacion,
        ticket.fechaLimiteResolucion
    );
}


/* =====================================================
   SLA PENDIENTE
===================================================== */

function calcularEstadoSlaPendienteFrontend(
    fechaInicioValor,
    fechaLimiteValor
) {

    if (
        !fechaInicioValor
        ||
        !fechaLimiteValor
    ) {

        return "SIN_CONFIGURAR";
    }


    const fechaInicio =
        new Date(
            fechaInicioValor
        );


    const fechaLimite =
        new Date(
            fechaLimiteValor
        );


    const ahora =
        new Date();


    if (
        Number.isNaN(
            fechaInicio.getTime()
        )
        ||
        Number.isNaN(
            fechaLimite.getTime()
        )
    ) {

        return "SIN_CONFIGURAR";
    }


    if (
        ahora > fechaLimite
    ) {

        return "VENCIDO";
    }


    const tiempoTotal =
        fechaLimite.getTime()
        -
        fechaInicio.getTime();


    const tiempoConsumido =
        Math.max(
            0,
            ahora.getTime()
            -
            fechaInicio.getTime()
        );


    if (
        tiempoTotal <= 0
    ) {

        return "VENCIDO";
    }


    const porcentajeConsumido =
        tiempoConsumido
        /
        tiempoTotal;


    /*
     * Mismo criterio que utiliza el backend:
     * 75 % o más del tiempo consumido = EN_RIESGO.
     */
    if (
        porcentajeConsumido >= 0.75
    ) {

        return "EN_RIESGO";
    }


    return "EN_TIEMPO";
}


/* =====================================================
   NORMALIZAR ESTADO SLA
===================================================== */

function normalizarEstadoSla(
    estado
) {

    const valor =
        String(
            estado || ""
        )
            .trim()
            .toUpperCase();


    const permitidos =
        [
            "CUMPLIDO",
            "INCUMPLIDO",
            "VENCIDO",
            "EN_RIESGO",
            "EN_TIEMPO",
            "SIN_CONFIGURAR"
        ];


    return permitidos.includes(
        valor
    )
        ? valor
        : "";
}


/* =====================================================
   MENSAJE SLA
===================================================== */

function pintarMensajeSlaProyecto(
    porcentajeRespuesta,
    porcentajeResolucion,
    enRiesgo,
    vencidos
) {

    const mensaje =
        document.getElementById(
            "mensajeSlaProyecto"
        );


    if (!mensaje) {

        return;
    }


    mensaje.classList.remove(
        "success-text",
        "danger-text"
    );


    if (
        ticketsProyecto.length === 0
    ) {

        mensaje.textContent =
            "Este proyecto todavía no tiene tickets para evaluar.";

        return;
    }


    if (
        vencidos > 0
    ) {

        mensaje.textContent =
            `${vencidos} ticket(s) presentan incumplimiento o vencimiento de SLA.`;

        mensaje.classList.add(
            "danger-text"
        );

        return;
    }


    if (
        enRiesgo > 0
    ) {

        mensaje.textContent =
            `${enRiesgo} ticket(s) se encuentran próximos a alcanzar su límite de SLA.`;

        return;
    }


    if (
        porcentajeRespuesta === null
        &&
        porcentajeResolucion === null
    ) {

        mensaje.textContent =
            "Los tickets todavía no cuentan con suficiente información para calcular el cumplimiento histórico del SLA.";

        return;
    }


    mensaje.textContent =
        "El proyecto no presenta tickets en riesgo o vencidos actualmente.";

    mensaje.classList.add(
        "success-text"
    );
}



/* =====================================================
   SALUD DEL PROYECTO
===================================================== */

function pintarSaludProyectoDetalle() {

    const resumen =
        calcularResumenSaludProyecto();


    const salud =
        calcularIndiceSaludProyecto(
            resumen
        );


    ponerTextoProyecto(
        "saludProyectoPuntaje",
        `${salud.puntaje}%`
    );


    ponerTextoProyecto(
        "saludTicketsAbiertos",
        resumen.abiertos
    );


    ponerTextoProyecto(
        "saludSlaRiesgo",
        resumen.enRiesgo
    );


    ponerTextoProyecto(
        "saludSlaVencidos",
        resumen.vencidos
    );


    ponerTextoProyecto(
        "saludCriticos",
        resumen.criticosAbiertos
    );


    const panel =
        document.getElementById(
            "saludProyectoPanel"
        );


    const badge =
        document.getElementById(
            "saludProyectoBadge"
        );


    const barra =
        document.getElementById(
            "saludProyectoBarra"
        );


    const barraContenedor =
        document.getElementById(
            "saludProyectoBarraContenedor"
        );


    const descripcion =
        document.getElementById(
            "saludProyectoDescripcion"
        );


    const explicacion =
        document.getElementById(
            "saludProyectoExplicacion"
        );


    panel?.classList.remove(
        "health-attention-panel",
        "health-critical-panel"
    );


    if (
        salud.estado === "ATENCION"
    ) {

        panel?.classList.add(
            "health-attention-panel"
        );

    } else if (
        salud.estado === "CRITICO"
    ) {

        panel?.classList.add(
            "health-critical-panel"
        );
    }


    if (badge) {

        badge.className =
            `project-health-badge ${salud.claseBadge}`;


        badge.innerHTML = `
            <span class="project-health-dot"></span>
            ${salud.etiqueta}
        `;
    }


    if (barra) {

        barra.className =
            salud.claseBarra;


        barra.style.width =
            `${salud.puntaje}%`;
    }


    if (barraContenedor) {

        barraContenedor.setAttribute(
            "aria-valuenow",
            String(
                salud.puntaje
            )
        );
    }


    if (descripcion) {

        descripcion.textContent =
            salud.descripcion;
    }


    if (explicacion) {

        explicacion.innerHTML =
            construirExplicacionSaludProyecto(
                resumen,
                salud
            );
    }
}


/* =====================================================
   RESUMEN DE SALUD
===================================================== */

function calcularResumenSaludProyecto() {

    const nuevos =
        contarEstadoProyecto(
            "NUEVO"
        );


    const asignados =
        contarEstadoProyecto(
            "ASIGNADO"
        );


    const progreso =
        contarEstadoProyecto(
            "EN_PROGRESO"
        );


    const resueltosHistoricos =
        contarEstadoProyecto(
            "RESUELTO"
        );


    const abiertos =
        nuevos
        +
        asignados
        +
        progreso
        +
        resueltosHistoricos;


    let enRiesgo = 0;
    let vencidos = 0;
    let criticosAbiertos = 0;


    ticketsProyecto.forEach(
        ticket => {

            const estado =
                String(
                    ticket.estado || ""
                )
                    .trim()
                    .toUpperCase();


            const abierto =
                estado === "NUEVO"
                ||
                estado === "ASIGNADO"
                ||
                estado === "EN_PROGRESO"
                ||
                estado === "RESUELTO";


            if (
                abierto
                &&
                esPrioridadCriticaProyecto(
                    ticket.prioridad
                )
            ) {

                criticosAbiertos++;
            }


            const estadoRespuesta =
                calcularEstadoSlaRespuestaFrontend(
                    ticket
                );


            const estadoResolucion =
                calcularEstadoSlaResolucionFrontend(
                    ticket
                );


            const tieneVencimiento =
                estadoRespuesta === "VENCIDO"
                ||
                estadoRespuesta === "INCUMPLIDO"
                ||
                estadoResolucion === "VENCIDO"
                ||
                estadoResolucion === "INCUMPLIDO";


            const tieneRiesgo =
                estadoRespuesta === "EN_RIESGO"
                ||
                estadoResolucion === "EN_RIESGO";


            /*
             * Cada ticket se cuenta una sola vez.
             * Si está vencido, ya no se vuelve a contar como riesgo.
             */
            if (tieneVencimiento) {

                vencidos++;

            } else if (tieneRiesgo) {

                enRiesgo++;
            }
        }
    );


    return {

        total:
            ticketsProyecto.length,

        abiertos,
        enRiesgo,
        vencidos,
        criticosAbiertos
    };
}


/* =====================================================
   CÁLCULO DEL ÍNDICE
===================================================== */

function calcularIndiceSaludProyecto(
    resumen
) {

    /*
     * El índice es una métrica operativa interna.
     * No reemplaza el cumplimiento contractual del SLA.
     */

    if (
        !resumen
        ||
        resumen.total === 0
    ) {

        return {

            puntaje:
                100,

            estado:
                "NORMAL",

            etiqueta:
                "NORMAL",

            claseBadge:
                "health-normal",

            claseBarra:
                "health-bar-normal",

            descripcion:
                "El proyecto no presenta incidencias activas que afecten su operación."
        };
    }


    const proporcionAbiertos =
        resumen.abiertos
        /
        resumen.total;


    const penalizacionAbiertos =
        Math.round(
            proporcionAbiertos
            *
            25
        );


    const penalizacionVencidos =
        Math.min(
            50,
            resumen.vencidos
            *
            20
        );


    const penalizacionRiesgo =
        Math.min(
            30,
            resumen.enRiesgo
            *
            10
        );


    const penalizacionCriticos =
        Math.min(
            30,
            resumen.criticosAbiertos
            *
            15
        );


    const puntaje =
        Math.max(
            0,
            Math.min(
                100,
                100
                -
                penalizacionAbiertos
                -
                penalizacionVencidos
                -
                penalizacionRiesgo
                -
                penalizacionCriticos
            )
        );


    if (
        puntaje < 65
    ) {

        return {

            puntaje,

            estado:
                "CRITICO",

            etiqueta:
                "CRÍTICO",

            claseBadge:
                "health-critical",

            claseBarra:
                "health-bar-critical",

            descripcion:
                "El proyecto requiere atención prioritaria por incidencias o compromisos de servicio afectados."
        };
    }


    if (
        puntaje < 85
    ) {

        return {

            puntaje,

            estado:
                "ATENCION",

            etiqueta:
                "ATENCIÓN",

            claseBadge:
                "health-attention",

            claseBarra:
                "health-bar-attention",

            descripcion:
                "El proyecto presenta factores que conviene atender antes de que afecten más su operación."
        };
    }


    return {

        puntaje,

        estado:
            "NORMAL",

        etiqueta:
            "NORMAL",

        claseBadge:
            "health-normal",

        claseBarra:
            "health-bar-normal",

        descripcion:
            "El proyecto mantiene un estado operativo estable según sus tickets y compromisos SLA."
    };
}


/* =====================================================
   EXPLICACIÓN DEL RESULTADO
===================================================== */

function construirExplicacionSaludProyecto(
    resumen,
    salud
) {

    const factores =
        [];


    if (
        resumen.vencidos > 0
    ) {

        factores.push(
            `<strong>${resumen.vencidos}</strong> ticket(s) con SLA vencido o incumplido`
        );
    }


    if (
        resumen.enRiesgo > 0
    ) {

        factores.push(
            `<strong>${resumen.enRiesgo}</strong> ticket(s) próximo(s) al límite de SLA`
        );
    }


    if (
        resumen.criticosAbiertos > 0
    ) {

        factores.push(
            `<strong>${resumen.criticosAbiertos}</strong> ticket(s) crítico(s) todavía abierto(s)`
        );
    }


    if (
        resumen.abiertos > 0
    ) {

        factores.push(
            `<strong>${resumen.abiertos}</strong> ticket(s) abierto(s) de ${resumen.total}`
        );
    }


    if (
        factores.length === 0
    ) {

        return `
            <strong>Sin factores negativos detectados.</strong>
            El proyecto se encuentra estable según la información disponible.
        `;
    }


    return `
        <strong>${salud.etiqueta}:</strong>
        ${factores.join(" · ")}.
    `;
}


/* =====================================================
   PRIORIDAD CRÍTICA
===================================================== */

function esPrioridadCriticaProyecto(
    prioridad
) {

    const valor =
        String(
            prioridad || ""
        )
            .trim()
            .toUpperCase();


    return (
        valor === "P1_CRITICA"
        ||
        valor === "P1_CRÍTICA"
        ||
        valor === "CRITICA"
        ||
        valor === "CRÍTICA"
    );
}


/* =====================================================
   EQUIPO DEL PROYECTO
===================================================== */

async function cargarEquipoProyecto() {

    const contenedor =
        document.getElementById(
            "equipoProyecto"
        );


    if (!contenedor) {

        return;
    }


    const rol =
        obtenerRolSesionProyecto();


    /*
     * CLIENTE y AGENTE no deben obtener
     * el directorio completo de usuarios
     * de un proyecto.
     */
    if (
        rol !== "ADMIN"
        &&
        rol !== "SUPERVISOR"
    ) {

        pintarEquipoVisibleDesdeTickets();

        return;
    }


    contenedor.innerHTML = `
        <div class="info-box">
            Cargando equipo...
        </div>
    `;


    try {

        const [
            responseAsignaciones,
            responseUsuarios
        ] = await Promise.all([

            fetch(
                `${API_BASE}/usuario-proyectos/proyecto/${proyectoId}`
            ),

            fetch(
                `${API_BASE}/usuarios`
            )
        ]);


        if (!responseAsignaciones.ok) {

            throw new Error(
                await obtenerMensajeErrorProyectoDetalle(
                    responseAsignaciones
                )
            );
        }


        if (!responseUsuarios.ok) {

            throw new Error(
                await obtenerMensajeErrorProyectoDetalle(
                    responseUsuarios
                )
            );
        }


        const asignaciones =
            await responseAsignaciones.json();


        const usuarios =
            await responseUsuarios.json();


        const usuariosPorId =
            new Map();


        if (
            Array.isArray(usuarios)
        ) {

            usuarios.forEach(
                usuario => {

                    usuariosPorId.set(
                        Number(
                            usuario.id
                        ),
                        usuario
                    );
                }
            );
        }


        const equipo =
            Array.isArray(asignaciones)

                ? asignaciones

                    .filter(
                        asignacion =>
                            asignacion.estado !== false
                    )

                    .map(
                        asignacion => {

                            const usuario =
                                usuariosPorId.get(
                                    Number(
                                        asignacion.usuarioId
                                    )
                                );


                            return {

                                id:
                                    Number(
                                        asignacion.usuarioId
                                    ),

                                nombre:
                                    asignacion.usuarioNombre
                                    ||
                                    construirNombreUsuarioProyecto(
                                        usuario
                                    )
                                    ||
                                    "Usuario",

                                correo:
                                    asignacion.usuarioCorreo
                                    ||
                                    usuario?.correo
                                    ||
                                    "",

                                rol:
                                    obtenerRolEntidadProyecto(
                                        usuario
                                    )
                                    ||
                                    "USUARIO"
                            };
                        }
                    )

                : [];


        pintarEquipoProyecto(
            equipo
        );


    } catch (error) {

        console.error(
            "Error cargando equipo del proyecto:",
            error
        );


        contenedor.innerHTML = `
            <div class="info-box">
                No se pudo cargar el equipo completo del proyecto.
            </div>
        `;
    }
}


/* =====================================================
   EQUIPO COMPLETO
===================================================== */

function pintarEquipoProyecto(
    equipo
) {

    const contenedor =
        document.getElementById(
            "equipoProyecto"
        );


    if (!contenedor) {

        return;
    }


    if (
        !Array.isArray(equipo)
        ||
        equipo.length === 0
    ) {

        contenedor.innerHTML = `
            <div class="info-box">
                No hay usuarios con acceso activo a este proyecto.
            </div>
        `;

        return;
    }


    const ordenRol = {

        SUPERVISOR: 1,
        AGENTE: 2,
        CLIENTE: 3,
        ADMIN: 4,
        USUARIO: 5
    };


    equipo.sort(
        (a, b) => {

            const ordenA =
                ordenRol[a.rol]
                ||
                99;


            const ordenB =
                ordenRol[b.rol]
                ||
                99;


            if (
                ordenA !== ordenB
            ) {

                return ordenA - ordenB;
            }


            return String(
                a.nombre || ""
            )
                .localeCompare(
                    String(
                        b.nombre || ""
                    ),
                    "es",
                    {
                        sensitivity:
                            "base"
                    }
                );
        }
    );


    contenedor.innerHTML =
        equipo.map(
            integrante => `

                <article class="ticket-compact-card">

                    <div class="ticket-card-header">

                        <div>

                            <span
                                style="
                                    display:block;
                                    font-size:12px;
                                    font-weight:700;
                                    margin-bottom:6px;
                                    opacity:.7;
                                "
                            >
                                ${
                                    escaparHtmlProyectoDetalle(
                                        formatearRolProyecto(
                                            integrante.rol
                                        )
                                    )
                                }
                            </span>


                            <h3>
                                ${
                                    escaparHtmlProyectoDetalle(
                                        integrante.nombre
                                    )
                                }
                            </h3>

                        </div>

                    </div>


                    <p
                        style="
                            margin:8px 0 0;
                            word-break:break-word;
                        "
                    >
                        ${
                            escaparHtmlProyectoDetalle(
                                integrante.correo
                                ||
                                "Sin correo disponible"
                            )
                        }
                    </p>

                </article>
            `
        )
        .join("");
}


/* =====================================================
   EQUIPO VISIBLE PARA CLIENTE / AGENTE
===================================================== */

function pintarEquipoVisibleDesdeTickets() {

    const contenedor =
        document.getElementById(
            "equipoProyecto"
        );


    if (!contenedor) {

        return;
    }


    const rol =
        obtenerRolSesionProyecto();


    /*
     * Para no exponer el directorio completo,
     * construimos únicamente la información
     * ya visible dentro de los tickets que
     * el backend entregó al usuario.
     */
    const personas =
        new Map();


    ticketsProyecto.forEach(
        ticket => {

            if (
                ticket.agenteId
                &&
                ticket.agenteNombre
            ) {

                personas.set(
                    `AGENTE-${ticket.agenteId}`,
                    {
                        nombre:
                            ticket.agenteNombre,

                        rol:
                            "AGENTE"
                    }
                );
            }


            /*
             * Un AGENTE puede ver los clientes
             * de los tickets que tiene asignados.
             */
            if (
                rol === "AGENTE"
                &&
                ticket.clienteId
                &&
                ticket.clienteNombre
            ) {

                personas.set(
                    `CLIENTE-${ticket.clienteId}`,
                    {
                        nombre:
                            ticket.clienteNombre,

                        rol:
                            "CLIENTE"
                    }
                );
            }
        }
    );


    const visibles =
        Array.from(
            personas.values()
        );


    if (
        visibles.length === 0
    ) {

        contenedor.innerHTML = `
            <div class="info-box">
                No hay integrantes visibles asociados a tus tickets en este proyecto.
            </div>
        `;

        return;
    }


    contenedor.innerHTML =
        visibles.map(
            persona => `

                <article class="ticket-compact-card">

                    <div class="ticket-card-header">

                        <div>

                            <span
                                style="
                                    display:block;
                                    font-size:12px;
                                    font-weight:700;
                                    margin-bottom:6px;
                                    opacity:.7;
                                "
                            >
                                ${
                                    escaparHtmlProyectoDetalle(
                                        formatearRolProyecto(
                                            persona.rol
                                        )
                                    )
                                }
                            </span>


                            <h3>
                                ${
                                    escaparHtmlProyectoDetalle(
                                        persona.nombre
                                    )
                                }
                            </h3>

                        </div>

                    </div>

                </article>
            `
        )
        .join("");
}


/* =====================================================
   ROL DE USUARIO DEL ENDPOINT /usuarios
===================================================== */

function obtenerRolEntidadProyecto(
    usuario
) {

    const valores =
        [];


    if (
        usuario?.rol
    ) {

        if (
            typeof usuario.rol
            ===
            "string"
        ) {

            valores.push(
                usuario.rol
            );

        } else {

            valores.push(
                usuario.rol?.nombre,
                usuario.rol?.name,
                usuario.rol?.descripcion
            );
        }
    }


    valores.push(
        usuario?.nombreRol,
        usuario?.rolNombre,
        usuario?.role,
        usuario?.roleName
    );


    if (
        Array.isArray(
            usuario?.roles
        )
    ) {

        usuario.roles.forEach(
            rol => {

                if (
                    typeof rol
                    ===
                    "string"
                ) {

                    valores.push(
                        rol
                    );

                } else {

                    valores.push(
                        rol?.nombre,
                        rol?.name,
                        rol?.descripcion
                    );
                }
            }
        );
    }


    const rolesPermitidos =
        [
            "ADMIN",
            "SUPERVISOR",
            "AGENTE",
            "CLIENTE"
        ];


    for (
        const valor
        of
        valores
    ) {

        const normalizado =
            String(
                valor || ""
            )
                .trim()
                .toUpperCase();


        if (
            rolesPermitidos.includes(
                normalizado
            )
        ) {

            return normalizado;
        }
    }


    return "";
}


/* =====================================================
   CONSTRUIR NOMBRE
===================================================== */

function construirNombreUsuarioProyecto(
    usuario
) {

    if (!usuario) {

        return "";
    }


    const nombre =
        String(
            usuario.nombre || ""
        )
            .trim();


    const apellido =
        String(
            usuario.apellido || ""
        )
            .trim();


    return `${nombre} ${apellido}`.trim();
}


/* =====================================================
   TICKETS RECIENTES
===================================================== */

function pintarTicketsRecientes() {

    const tbody =
        document.getElementById(
            "ticketsRecientesBody"
        );


    if (!tbody) {

        return;
    }


    tbody.innerHTML = "";


    if (
        ticketsProyecto.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    No hay tickets registrados en este proyecto.
                </td>
            </tr>
        `;

        return;
    }


    const recientes =
        [...ticketsProyecto]

            .sort(
                (a, b) => {

                    const fechaA =
                        new Date(
                            a.fechaCreacion || 0
                        )
                            .getTime();


                    const fechaB =
                        new Date(
                            b.fechaCreacion || 0
                        )
                            .getTime();


                    return fechaB - fechaA;
                }
            )

            .slice(
                0,
                5
            );


    recientes.forEach(
        ticket => {

            const tr =
                document.createElement(
                    "tr"
                );


            tr.innerHTML = `

                <td>
                    ${
                        escaparHtmlProyectoDetalle(
                            ticket.numeroTicket
                            ||
                            `#${ticket.id}`
                        )
                    }
                </td>


                <td>
                    ${
                        escaparHtmlProyectoDetalle(
                            ticket.titulo
                            ||
                            "Sin título"
                        )
                    }
                </td>


                <td>
                    ${
                        escaparHtmlProyectoDetalle(
                            ticket.clienteNombre
                            ||
                            "Sin cliente"
                        )
                    }
                </td>


                <td>
                    ${
                        escaparHtmlProyectoDetalle(
                            ticket.agenteNombre
                            ||
                            "Sin asignar"
                        )
                    }
                </td>


                <td>

                    <span
                        class="badge ${
                            obtenerClaseEstado(
                                ticket.estado
                            )
                        }"
                    >
                        ${
                            escaparHtmlProyectoDetalle(
                                ticket.estado
                                ||
                                "-"
                            )
                        }
                    </span>

                </td>


                <td>

                    <span
                        class="badge ${
                            obtenerClasePrioridad(
                                ticket.prioridad
                            )
                        }"
                    >
                        ${
                            escaparHtmlProyectoDetalle(
                                ticket.prioridad
                                ||
                                "-"
                            )
                        }
                    </span>

                </td>


                <td>
                    ${
                        formatearFecha(
                            ticket.fechaCreacion
                        )
                    }
                </td>


                <td>

                    <a
                        class="action-link"
                        href="ticket-detalle.html?id=${
                            encodeURIComponent(
                                ticket.id
                            )
                        }&proyectoId=${
                            encodeURIComponent(
                                proyectoId
                            )
                        }"
                    >
                        Ver
                    </a>

                </td>
            `;


            tbody.appendChild(
                tr
            );
        }
    );
}


/* =====================================================
   BOTONES
===================================================== */

function configurarBotonesProyecto() {

    const btnVerTodos =
        document.getElementById(
            "btnVerTodosTickets"
        );


    const btnVerRecientes =
        document.getElementById(
            "btnVerTicketsRecientes"
        );


    const abrirTicketsProyecto =
        () => {

            window.location.href =
                `tickets.html?proyectoId=${
                    encodeURIComponent(
                        proyectoId
                    )
                }`;
        };


    btnVerTodos?.addEventListener(
        "click",
        abrirTicketsProyecto
    );


    btnVerRecientes?.addEventListener(
        "click",
        abrirTicketsProyecto
    );
}


/* =====================================================
   ROL DE SESIÓN
===================================================== */

function obtenerRolSesionProyecto() {

    return String(
        usuarioSesionProyecto?.rol
        ||
        ""
    )
        .trim()
        .toUpperCase();
}


/* =====================================================
   FORMATEAR ROL
===================================================== */

function formatearRolProyecto(
    rol
) {

    const valor =
        String(
            rol || ""
        )
            .trim()
            .toUpperCase();


    switch (valor) {

        case "ADMIN":

            return "Administrador";


        case "SUPERVISOR":

            return "Supervisor";


        case "AGENTE":

            return "Agente";


        case "CLIENTE":

            return "Cliente";


        default:

            return "Usuario";
    }
}


/* =====================================================
   CAMBIAR TEXTO
===================================================== */

function ponerTextoProyecto(
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
   MENSAJE DE ERROR DEL BACKEND
===================================================== */

async function obtenerMensajeErrorProyectoDetalle(
    response
) {

    const tipo =
        response.headers.get(
            "content-type"
        )
        ||
        "";


    if (
        tipo.includes(
            "application/json"
        )
    ) {

        try {

            const contenido =
                await response.json();


            return (
                contenido.message
                ||
                contenido.error
                ||
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
            texto
            ||
            `Error ${response.status}`
        );


    } catch (error) {

        return `Error ${response.status}`;
    }
}


/* =====================================================
   ESCAPAR HTML
===================================================== */

function escaparHtmlProyectoDetalle(
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