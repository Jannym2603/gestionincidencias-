/*
 * MÓDULO PROYECTOS
 * Versión limpia e independiente.
 *
 * Objetivo principal:
 * 1. mostrar proyectos primero;
 * 2. cargar tickets después;
 * 3. nunca dejar la pantalla eternamente en "Cargando".
 */

window.__PROYECTOS_MODULO_CARGADO = true;
console.info("[PROYECTOS] Salud del proyecto activa");

let proyectosDisponibles = [];
let proyectosVisibles = [];
let ticketsDisponibles = [];
let usuarioProyectos = null;


/* =====================================================
   INICIO
===================================================== */

iniciarModuloProyectos();


async function iniciarModuloProyectos() {

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            iniciarPantallaProyectos,
            { once: true }
        );

        return;
    }


    await iniciarPantallaProyectos();
}


async function iniciarPantallaProyectos() {

    try {

        /*
         * No permitimos que un error del layout impida
         * cargar los proyectos.
         */
        try {

            if (
                typeof inicializarLayout
                ===
                "function"
            ) {

                inicializarLayout();
            }

        } catch (errorLayout) {

            console.warn(
                "El layout tuvo un problema, pero Proyectos continuará:",
                errorLayout
            );
        }


        usuarioProyectos =
            obtenerSesionSegura();


        if (!usuarioProyectos) {

            window.location.href =
                "login.html";

            return;
        }


        configurarDescripcion();
        configurarEventos();


        await cargarProyectos();


    } catch (error) {

        mostrarErrorPrincipal(
            error
        );
    }
}


/* =====================================================
   SESIÓN
===================================================== */

function obtenerSesionSegura() {

    try {

        if (
            typeof obtenerSesion
            ===
            "function"
        ) {

            return obtenerSesion();
        }

    } catch (error) {

        console.error(
            "No se pudo leer la sesión:",
            error
        );
    }


    return null;
}


/* =====================================================
   CARGA PRINCIPAL
===================================================== */

async function cargarProyectos() {

    cambiarEstadoCarga(
        "Cargando proyectos..."
    );


    proyectosDisponibles = [];
    proyectosVisibles = [];
    ticketsDisponibles = [];


    const rol =
        rolActual();


    let proyectos;


    if (rol === "ADMIN") {

        proyectos =
            await cargarProyectosAdmin();

    } else {

        proyectos =
            await cargarMisProyectos();
    }


    proyectosDisponibles =
        quitarDuplicados(
            proyectos
        );


    proyectosVisibles =
        [...proyectosDisponibles];


    cargarFiltroCompanias();


    /*
     * MOSTRAMOS LOS PROYECTOS ANTES DE PEDIR TICKETS.
     */
    pintarProyectos(
        proyectosVisibles
    );


    ocultarEstadoCarga();


    /*
     * Las métricas se cargan en segundo plano.
     * Si falla /api/tickets, las tarjetas siguen visibles.
     */
    cargarTicketsParaMetricas();
}


/* =====================================================
   ADMIN
===================================================== */

async function cargarProyectosAdmin() {

    const proyectos =
        await fetchJson(
            `${apiBase()}/proyectos`,
            10000
        );


    /*
     * Compañías es complementario.
     * Si falla, seguimos usando compañía incluida
     * en el objeto proyecto.
     */
    let companias = [];


    try {

        companias =
            await fetchJson(
                `${apiBase()}/companias`,
                8000
            );

    } catch (error) {

        console.warn(
            "No se pudieron cargar compañías:",
            error
        );
    }


    const mapaCompanias =
        new Map();


    if (Array.isArray(companias)) {

        companias.forEach(
            compania => {

                if (
                    compania
                    &&
                    compania.estado !== false
                ) {

                    mapaCompanias.set(
                        Number(compania.id),
                        compania
                    );
                }
            }
        );
    }


    return normalizarLista(
        proyectos
    )
        .filter(
            proyecto =>
                proyecto
                &&
                proyecto.estado !== false
        )
        .map(
            proyecto => {

                const companiaId =
                    Number(
                        proyecto.companiaId
                        ??
                        proyecto.compania?.id
                        ??
                        0
                    );


                const compania =
                    mapaCompanias.get(
                        companiaId
                    );


                return {

                    proyectoId:
                        Number(
                            proyecto.id
                            ??
                            proyecto.proyectoId
                            ??
                            0
                        ),

                    proyectoNombre:
                        proyecto.nombre
                        ??
                        proyecto.proyectoNombre
                        ??
                        "Proyecto",

                    descripcion:
                        proyecto.descripcion
                        ??
                        "",

                    companiaId,

                    companiaNombre:
                        proyecto.companiaNombre
                        ??
                        proyecto.compania?.nombre
                        ??
                        compania?.nombre
                        ??
                        "Compañía",

                    estado:
                        proyecto.estado !== false
                };
            }
        )
        .filter(
            proyecto =>
                proyecto.proyectoId > 0
        );
}


/* =====================================================
   SUPERVISOR / AGENTE / CLIENTE
===================================================== */

async function cargarMisProyectos() {

    const asignaciones =
        await fetchJson(
            `${apiBase()}/usuario-proyectos/mis-proyectos`,
            10000
        );


    return normalizarLista(
        asignaciones
    )
        .filter(
            item =>
                item
                &&
                item.estado !== false
                &&
                Number(
                    item.proyectoId
                    ??
                    item.proyecto?.id
                    ??
                    0
                ) > 0
        )
        .map(
            item => ({

                proyectoId:
                    Number(
                        item.proyectoId
                        ??
                        item.proyecto?.id
                    ),

                proyectoNombre:
                    item.proyectoNombre
                    ??
                    item.proyecto?.nombre
                    ??
                    "Proyecto",

                descripcion:
                    item.proyectoDescripcion
                    ??
                    item.proyecto?.descripcion
                    ??
                    "",

                companiaId:
                    Number(
                        item.companiaId
                        ??
                        item.proyecto?.compania?.id
                        ??
                        0
                    ),

                companiaNombre:
                    item.companiaNombre
                    ??
                    item.proyecto?.compania?.nombre
                    ??
                    "Compañía",

                estado:
                    item.estado !== false
            })
        );
}


/* =====================================================
   TICKETS / MÉTRICAS
===================================================== */

async function cargarTicketsParaMetricas() {

    try {

        const tickets =
            await fetchJson(
                `${apiBase()}/tickets`,
                10000
            );


        ticketsDisponibles =
            normalizarLista(
                tickets
            );


        pintarProyectos(
            proyectosVisibles
        );


    } catch (error) {

        console.warn(
            "Los proyectos se mostraron, pero no se pudieron cargar métricas de tickets:",
            error
        );
    }
}


/* =====================================================
   RENDER
===================================================== */

function pintarProyectos(
    proyectos
) {

    const contenedor =
        document.getElementById(
            "listaProyectos"
        );


    if (!contenedor) {

        return;
    }


    contenedor.innerHTML =
        "";


    if (
        !Array.isArray(proyectos)
        ||
        proyectos.length === 0
    ) {

        contenedor.innerHTML = `
            <div class="info-box">
                No hay proyectos disponibles para tu usuario.
            </div>
        `;

        return;
    }


    const ordenados =
        [...proyectos]
            .sort(
                (a, b) => {

                    const compania =
                        String(
                            a.companiaNombre || ""
                        )
                            .localeCompare(
                                String(
                                    b.companiaNombre || ""
                                ),
                                "es",
                                {
                                    sensitivity:
                                        "base"
                                }
                            );


                    if (compania !== 0) {

                        return compania;
                    }


                    return String(
                        a.proyectoNombre || ""
                    )
                        .localeCompare(
                            String(
                                b.proyectoNombre || ""
                            ),
                            "es",
                            {
                                sensitivity:
                                    "base"
                            }
                        );
                }
            );


    ordenados.forEach(
        proyecto => {

            const resumen =
                resumenProyecto(
                    proyecto.proyectoId
                );


            const salud =
                calcularSalud(
                    resumen
                );


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                `project-card ${salud.claseTarjeta}`;


            card.innerHTML = `

                <div class="project-card-header">

                    <div>

                        <span class="project-company-name">
                            ${
                                escapar(
                                    proyecto.companiaNombre
                                    ||
                                    "Compañía"
                                )
                            }
                        </span>

                        <h3>
                            ${
                                escapar(
                                    proyecto.proyectoNombre
                                    ||
                                    "Proyecto"
                                )
                            }
                        </h3>

                    </div>

                    <span class="status-pill active">
                        ACTIVO
                    </span>

                </div>


                <p class="project-description">
                    ${
                        escapar(
                            proyecto.descripcion
                            ||
                            "Proyecto disponible para la gestión y seguimiento de incidencias."
                        )
                    }
                </p>


                <div class="project-health">

                    <div class="project-health-header">

                        <span class="project-health-title">
                            Salud del proyecto
                        </span>

                        <span class="project-health-badge ${salud.claseBadge}">
                            <span class="project-health-dot"></span>
                            ${salud.etiqueta}
                        </span>

                    </div>


                    <div
                        class="project-health-progress"
                        role="progressbar"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow="${salud.puntaje}"
                    >
                        <span
                            class="${salud.claseBarra}"
                            style="width:${salud.puntaje}%"
                        ></span>
                    </div>


                    <div class="project-health-summary">

                        <strong>
                            ${salud.puntaje}%
                        </strong>

                        <span>
                            ${
                                escapar(
                                    salud.texto
                                )
                            }
                        </span>

                    </div>

                </div>


                <div class="project-stats-grid">

                    ${stat("Total", resumen.total)}
                    ${stat("Nuevos", resumen.nuevos)}
                    ${stat("En progreso", resumen.enProgreso)}
                    ${stat("Resueltos", resumen.resueltos)}

                </div>


                <div class="project-alerts-row">

                    <span class="project-alert-chip ${
                        resumen.vencidos > 0
                            ? "project-alert-danger"
                            : ""
                    }">
                        SLA vencidos:
                        <strong>${resumen.vencidos}</strong>
                    </span>

                    <span class="project-alert-chip ${
                        resumen.enRiesgo > 0
                            ? "project-alert-warning"
                            : ""
                    }">
                        En riesgo:
                        <strong>${resumen.enRiesgo}</strong>
                    </span>

                    <span class="project-alert-chip ${
                        resumen.criticos > 0
                            ? "project-alert-danger"
                            : ""
                    }">
                        Críticos:
                        <strong>${resumen.criticos}</strong>
                    </span>

                </div>


                <div class="project-card-footer">

                    <span class="project-open-count">
                        ${resumen.abiertos}
                        ticket(s) abierto(s)
                    </span>

                    <button
                        type="button"
                        class="primary-btn"
                        data-project-id="${proyecto.proyectoId}"
                    >
                        Ver proyecto
                    </button>

                </div>
            `;


            contenedor.appendChild(
                card
            );
        }
    );
}


function stat(
    etiqueta,
    valor
) {

    return `
        <div class="project-stat">
            <span>${escapar(etiqueta)}</span>
            <strong>${Number(valor) || 0}</strong>
        </div>
    `;
}


/* =====================================================
   RESUMEN
===================================================== */

function resumenProyecto(
    proyectoId
) {

    const tickets =
        ticketsDisponibles.filter(
            ticket =>
                Number(
                    ticket.proyectoId
                    ??
                    ticket.proyecto?.id
                    ??
                    0
                )
                ===
                Number(
                    proyectoId
                )
        );


    const contar =
        estado =>
            tickets.filter(
                ticket =>
                    normalizarEstado(
                        ticket.estado
                    )
                    ===
                    estado
            ).length;


    const nuevos =
        contar("NUEVO");


    const asignados =
        contar("ASIGNADO");


    const enProgreso =
        contar("EN_PROGRESO");


    const resueltos =
        contar("RESUELTO");


    const cerrados =
        contar("CERRADO");


    const abiertos =
        nuevos
        +
        asignados
        +
        enProgreso;


    let enRiesgo = 0;
    let vencidos = 0;
    let criticos = 0;


    tickets.forEach(
        ticket => {

            const estado =
                normalizarEstado(
                    ticket.estado
                );


            const abierto =
                [
                    "NUEVO",
                    "ASIGNADO",
                    "EN_PROGRESO"
                ]
                    .includes(
                        estado
                    );


            if (
                abierto
                &&
                esCritico(
                    ticket.prioridad
                )
            ) {

                criticos++;
            }


            const respuesta =
                normalizarEstadoSla(
                    ticket.estadoSlaRespuesta
                    ??
                    ticket.slaEstadoRespuesta
                );


            const resolucion =
                normalizarEstadoSla(
                    ticket.estadoSlaResolucion
                    ??
                    ticket.slaEstadoResolucion
                );


            if (
                [
                    respuesta,
                    resolucion
                ]
                    .some(
                        valor =>
                            valor === "VENCIDO"
                            ||
                            valor === "INCUMPLIDO"
                    )
            ) {

                vencidos++;

            } else if (
                [
                    respuesta,
                    resolucion
                ]
                    .includes(
                        "EN_RIESGO"
                    )
            ) {

                enRiesgo++;
            }
        }
    );


    return {
        total:
            tickets.length,

        nuevos,
        asignados,
        enProgreso,
        resueltos,
        cerrados,
        abiertos,
        enRiesgo,
        vencidos,
        criticos
    };
}


/* =====================================================
   SALUD
===================================================== */

function calcularSalud(
    resumen
) {

    if (
        resumen.total === 0
    ) {

        return {
            puntaje:
                100,

            etiqueta:
                "NORMAL",

            claseBadge:
                "health-normal",

            claseBarra:
                "health-bar-normal",

            claseTarjeta:
                "project-health-normal",

            texto:
                "Sin incidencias activas"
        };
    }


    const penalizacionAbiertos =
        Math.round(
            (
                resumen.abiertos
                /
                resumen.total
            )
            *
            25
        );


    const penalizacionVencidos =
        Math.min(
            50,
            resumen.vencidos * 20
        );


    const penalizacionRiesgo =
        Math.min(
            30,
            resumen.enRiesgo * 10
        );


    const penalizacionCriticos =
        Math.min(
            30,
            resumen.criticos * 15
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


    let etiqueta =
        "NORMAL";


    let claseBadge =
        "health-normal";


    let claseBarra =
        "health-bar-normal";


    let claseTarjeta =
        "project-health-normal";


    if (puntaje < 65) {

        etiqueta =
            "CRÍTICO";

        claseBadge =
            "health-critical";

        claseBarra =
            "health-bar-critical";

        claseTarjeta =
            "project-health-critical";

    } else if (puntaje < 85) {

        etiqueta =
            "ATENCIÓN";

        claseBadge =
            "health-attention";

        claseBarra =
            "health-bar-attention";

        claseTarjeta =
            "project-health-attention";
    }


    const motivos =
        [];


    if (resumen.vencidos > 0) {

        motivos.push(
            `${resumen.vencidos} SLA vencido(s)`
        );
    }


    if (resumen.enRiesgo > 0) {

        motivos.push(
            `${resumen.enRiesgo} en riesgo`
        );
    }


    if (resumen.criticos > 0) {

        motivos.push(
            `${resumen.criticos} crítico(s)`
        );
    }


    if (
        motivos.length === 0
        &&
        resumen.abiertos > 0
    ) {

        motivos.push(
            `${resumen.abiertos} abierto(s)`
        );
    }


    return {
        puntaje,
        etiqueta,
        claseBadge,
        claseBarra,
        claseTarjeta,

        texto:
            motivos.length > 0
                ? motivos
                    .slice(0, 2)
                    .join(" · ")
                : "Operación estable"
    };
}


/* =====================================================
   FILTROS
===================================================== */

function configurarEventos() {

    document
        .getElementById(
            "buscarProyecto"
        )
        ?.addEventListener(
            "input",
            aplicarFiltros
        );


    document
        .getElementById(
            "filtroCompaniaProyecto"
        )
        ?.addEventListener(
            "change",
            aplicarFiltros
        );


    document
        .getElementById(
            "btnRecargarProyectos"
        )
        ?.addEventListener(
            "click",
            async () => {

                const buscador =
                    document.getElementById(
                        "buscarProyecto"
                    );


                const filtro =
                    document.getElementById(
                        "filtroCompaniaProyecto"
                    );


                if (buscador) {

                    buscador.value = "";
                }


                if (filtro) {

                    filtro.value = "";
                }


                await cargarProyectos();
            }
        );


    document
        .getElementById(
            "listaProyectos"
        )
        ?.addEventListener(
            "click",
            event => {

                const boton =
                    event.target.closest(
                        "[data-project-id]"
                    );


                if (!boton) {

                    return;
                }


                const id =
                    Number(
                        boton.dataset.projectId
                    );


                if (
                    Number.isInteger(id)
                    &&
                    id > 0
                ) {

                    window.location.href =
                        `proyecto-detalle.html?id=${
                            encodeURIComponent(
                                id
                            )
                        }`;
                }
            }
        );
}


function aplicarFiltros() {

    const texto =
        String(
            document
                .getElementById(
                    "buscarProyecto"
                )
                ?.value
                ??
                ""
        )
            .trim()
            .toLowerCase();


    const compania =
        String(
            document
                .getElementById(
                    "filtroCompaniaProyecto"
                )
                ?.value
                ??
                ""
        );


    proyectosVisibles =
        proyectosDisponibles.filter(
            proyecto => {

                const coincideTexto =
                    !texto
                    ||
                    String(
                        proyecto.proyectoNombre
                        ||
                        ""
                    )
                        .toLowerCase()
                        .includes(texto)
                    ||
                    String(
                        proyecto.companiaNombre
                        ||
                        ""
                    )
                        .toLowerCase()
                        .includes(texto);


                const coincideCompania =
                    !compania
                    ||
                    String(
                        proyecto.companiaId
                    )
                    ===
                    compania;


                return (
                    coincideTexto
                    &&
                    coincideCompania
                );
            }
        );


    pintarProyectos(
        proyectosVisibles
    );
}


function cargarFiltroCompanias() {

    const select =
        document.getElementById(
            "filtroCompaniaProyecto"
        );


    if (!select) {

        return;
    }


    const actual =
        select.value;


    const mapa =
        new Map();


    proyectosDisponibles.forEach(
        proyecto => {

            const id =
                Number(
                    proyecto.companiaId
                );


            if (id > 0) {

                mapa.set(
                    id,
                    proyecto.companiaNombre
                    ||
                    "Compañía"
                );
            }
        }
    );


    select.innerHTML =
        `<option value="">Todas las compañías</option>`;


    [...mapa.entries()]
        .sort(
            (a, b) =>
                String(a[1])
                    .localeCompare(
                        String(b[1]),
                        "es",
                        {
                            sensitivity:
                                "base"
                        }
                    )
        )
        .forEach(
            ([id, nombre]) => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    String(id);


                option.textContent =
                    nombre;


                select.appendChild(
                    option
                );
            }
        );


    if (
        [...select.options]
            .some(
                option =>
                    option.value
                    ===
                    actual
            )
    ) {

        select.value =
            actual;
    }
}


/* =====================================================
   DESCRIPCIÓN POR ROL
===================================================== */

function configurarDescripcion() {

    const descripcion =
        document.getElementById(
            "descripcionProyectos"
        );


    if (!descripcion) {

        return;
    }


    switch (rolActual()) {

        case "ADMIN":

            descripcion.textContent =
                "Consulta todos los proyectos activos del sistema y supervisa su estado general.";

            break;


        case "SUPERVISOR":

            descripcion.textContent =
                "Consulta los proyectos que supervisas y revisa sus indicadores.";

            break;


        case "AGENTE":

            descripcion.textContent =
                "Consulta tus proyectos y las incidencias que tienes asignadas.";

            break;


        case "CLIENTE":

            descripcion.textContent =
                "Consulta los proyectos a los que tienes acceso y el estado de tus incidencias.";

            break;


        default:

            descripcion.textContent =
                "Consulta los proyectos disponibles.";
    }
}


/* =====================================================
   FETCH ROBUSTO
===================================================== */

async function fetchJson(
    url,
    timeoutMs
) {

    const controller =
        new AbortController();


    const timer =
        setTimeout(
            () => {

                controller.abort();
            },
            timeoutMs
        );


    try {

        const response =
            await fetch(
                url,
                {
                    signal:
                        controller.signal
                }
            );


        if (!response.ok) {

            const mensaje =
                await leerError(
                    response
                );


            throw new Error(
                `${mensaje} (${response.status})`
            );
        }


        return await response.json();


    } catch (error) {

        if (
            error?.name === "AbortError"
        ) {

            throw new Error(
                `El servidor no respondió a ${url} en ${Math.round(timeoutMs / 1000)} segundos.`
            );
        }


        throw error;


    } finally {

        clearTimeout(
            timer
        );
    }
}


async function leerError(
    response
) {

    try {

        const tipo =
            response.headers
                .get("content-type")
            ||
            "";


        if (
            tipo.includes(
                "application/json"
            )
        ) {

            const json =
                await response.json();


            return (
                json.message
                ||
                json.error
                ||
                "Error del servidor"
            );
        }


        const texto =
            await response.text();


        return (
            texto
            ||
            "Error del servidor"
        );


    } catch {

        return "Error del servidor";
    }
}


/* =====================================================
   UI DE CARGA / ERROR
===================================================== */

function cambiarEstadoCarga(
    texto
) {

    const estado =
        document.getElementById(
            "estadoCargaProyectos"
        );


    if (!estado) {

        return;
    }


    estado.style.display =
        "block";


    estado.classList.remove(
        "danger-text"
    );


    estado.textContent =
        texto;
}


function ocultarEstadoCarga() {

    const estado =
        document.getElementById(
            "estadoCargaProyectos"
        );


    if (estado) {

        estado.style.display =
            "none";
    }
}


function mostrarErrorPrincipal(
    error
) {

    console.error(
        "Error del módulo Proyectos:",
        error
    );


    const estado =
        document.getElementById(
            "estadoCargaProyectos"
        );


    const lista =
        document.getElementById(
            "listaProyectos"
        );


    if (lista) {

        lista.innerHTML =
            "";
    }


    if (estado) {

        estado.style.display =
            "block";


        estado.classList.add(
            "danger-text"
        );


        estado.innerHTML = `
            <strong>No se pudieron cargar los proyectos.</strong>
            <br>
            ${escapar(
                error?.message
                ||
                "Error desconocido."
            )}
        `;
    }
}


/* =====================================================
   UTILIDADES
===================================================== */

function apiBase() {

    try {

        if (
            typeof API_BASE
            !==
            "undefined"
            &&
            API_BASE
        ) {

            return String(
                API_BASE
            )
                .replace(
                    /\/$/,
                    ""
                );
        }

    } catch {
        // usa fallback
    }


    return "/api";
}


function rolActual() {

    return String(
        usuarioProyectos?.rol
        ??
        ""
    )
        .trim()
        .toUpperCase();
}


function normalizarLista(
    valor
) {

    return Array.isArray(valor)
        ? valor
        : [];
}


function quitarDuplicados(
    proyectos
) {

    const mapa =
        new Map();


    normalizarLista(
        proyectos
    )
        .forEach(
            proyecto => {

                const id =
                    Number(
                        proyecto.proyectoId
                    );


                if (
                    Number.isInteger(id)
                    &&
                    id > 0
                ) {

                    mapa.set(
                        id,
                        proyecto
                    );
                }
            }
        );


    return [
        ...mapa.values()
    ];
}


function normalizarEstado(
    estado
) {

    return String(
        estado
        ??
        ""
    )
        .trim()
        .toUpperCase();
}


function normalizarEstadoSla(
    estado
) {

    return normalizarEstado(
        estado
    );
}


function esCritico(
    prioridad
) {

    const valor =
        normalizarEstado(
            prioridad
        );


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


function escapar(
    valor
) {

    return String(
        valor
        ??
        ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
