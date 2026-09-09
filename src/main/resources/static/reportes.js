let usuarioReporteActual = null;
let rolReporteActual = "";
let proyectosReporte = [];

document.addEventListener("DOMContentLoaded", async () => {
    try {
        inicializarLayout();
    } catch (error) {
        console.warn("No se pudo inicializar completamente el layout:", error);
    }

    usuarioReporteActual = obtenerSesion();

    if (!usuarioReporteActual) {
        window.location.href = "login.html";
        return;
    }

    rolReporteActual = String(usuarioReporteActual.rol || "")
        .trim()
        .toUpperCase();

    const rolesPermitidos = [
        "ADMIN",
        "SUPERVISOR",
        "AGENTE",
        "CLIENTE"
    ];

    if (!rolesPermitidos.includes(rolReporteActual)) {
        redirigirSegunRol(rolReporteActual);
        return;
    }

    configurarAlcanceReportes(rolReporteActual);
    configurarEventosFiltrosReporte();

    try {
        proyectosReporte = await cargarProyectosDisponiblesReporte(
            rolReporteActual
        );

        pintarFiltrosReporte();
    } catch (error) {
        console.error("No se pudieron cargar los filtros de reportes:", error);
        proyectosReporte = [];
        pintarFiltrosReporte();
    }

    await recargarReportes();
});


function configurarAlcanceReportes(rol) {
    const descripcion = document.getElementById("descripcionReportes");

    if (!descripcion) {
        return;
    }

    switch (rol) {
        case "ADMIN":
            descripcion.textContent =
                "Estás viendo estadísticas de todas las compañías y proyectos disponibles.";
            break;

        case "SUPERVISOR":
            descripcion.textContent =
                "Estás viendo estadísticas de los proyectos que tienes asignados como supervisor.";
            break;

        case "AGENTE":
            descripcion.textContent =
                "Estás viendo estadísticas de los tickets que tienes asignados.";
            break;

        case "CLIENTE":
            descripcion.textContent =
                "Estás viendo estadísticas de tus tickets y solicitudes dentro de tus proyectos.";
            break;

        default:
            descripcion.textContent =
                "Estadísticas disponibles según tus permisos.";
    }
}


async function cargarProyectosDisponiblesReporte(rol) {
    if (rol === "ADMIN") {
        const response = await fetch(`${API_BASE}/proyectos`);

        if (!response.ok) {
            throw new Error(
                await obtenerMensajeErrorReporte(response)
            );
        }

        const proyectos = await response.json();

        if (!Array.isArray(proyectos)) {
            return [];
        }

        return eliminarDuplicadosReporte(
            proyectos
                .filter(proyecto => proyecto && proyecto.estado !== false)
                .map(proyecto => ({
                    proyectoId: Number(
                        proyecto.id
                        || proyecto.proyectoId
                    ),
                    proyectoNombre:
                        proyecto.nombre
                        || proyecto.proyectoNombre
                        || "Proyecto",
                    companiaId: Number(
                        proyecto.companiaId
                        || proyecto.compania?.id
                    ),
                    companiaNombre:
                        proyecto.companiaNombre
                        || proyecto.compania?.nombre
                        || "Compañía"
                }))
                .filter(item => item.proyectoId && item.companiaId)
        );
    }

    const response = await fetch(
        `${API_BASE}/usuario-proyectos/mis-proyectos`
    );

    if (!response.ok) {
        throw new Error(
            await obtenerMensajeErrorReporte(response)
        );
    }

    const asignaciones = await response.json();

    if (!Array.isArray(asignaciones)) {
        return [];
    }

    return eliminarDuplicadosReporte(
        asignaciones
            .filter(asignacion =>
                asignacion
                && asignacion.estado !== false
                && asignacion.proyectoId
                && asignacion.companiaId
            )
            .map(asignacion => ({
                proyectoId: Number(asignacion.proyectoId),
                proyectoNombre:
                    asignacion.proyectoNombre
                    || "Proyecto",
                companiaId: Number(asignacion.companiaId),
                companiaNombre:
                    asignacion.companiaNombre
                    || "Compañía"
            }))
    );
}


function eliminarDuplicadosReporte(proyectos) {
    const mapa = new Map();

    proyectos.forEach(proyecto => {
        if (!mapa.has(proyecto.proyectoId)) {
            mapa.set(proyecto.proyectoId, proyecto);
        }
    });

    return Array.from(mapa.values())
        .sort((a, b) => {
            const compania = String(a.companiaNombre || "")
                .localeCompare(
                    String(b.companiaNombre || ""),
                    "es",
                    { sensitivity: "base" }
                );

            if (compania !== 0) {
                return compania;
            }

            return String(a.proyectoNombre || "")
                .localeCompare(
                    String(b.proyectoNombre || ""),
                    "es",
                    { sensitivity: "base" }
                );
        });
}


function pintarFiltrosReporte() {
    const selectCompania =
        document.getElementById("filtroCompaniaReporte");

    const selectProyecto =
        document.getElementById("filtroProyectoReporte");

    if (!selectCompania || !selectProyecto) {
        return;
    }

    const companias = new Map();

    proyectosReporte.forEach(proyecto => {
        if (
            proyecto.companiaId
            && !companias.has(proyecto.companiaId)
        ) {
            companias.set(
                proyecto.companiaId,
                proyecto.companiaNombre
            );
        }
    });

    selectCompania.innerHTML =
        '<option value="">Todas las compañías</option>';

    Array.from(companias.entries())
        .sort((a, b) =>
            String(a[1]).localeCompare(
                String(b[1]),
                "es",
                { sensitivity: "base" }
            )
        )
        .forEach(([id, nombre]) => {
            const option = document.createElement("option");
            option.value = String(id);
            option.textContent = nombre;
            selectCompania.appendChild(option);
        });

    pintarProyectosFiltroReporte();
}


function pintarProyectosFiltroReporte() {
    const selectCompania =
        document.getElementById("filtroCompaniaReporte");

    const selectProyecto =
        document.getElementById("filtroProyectoReporte");

    if (!selectCompania || !selectProyecto) {
        return;
    }

    const companiaId = Number(selectCompania.value || 0);

    const proyectoSeleccionado =
        String(selectProyecto.value || "");

    const filtrados =
        companiaId
            ? proyectosReporte.filter(
                proyecto =>
                    Number(proyecto.companiaId) === companiaId
            )
            : proyectosReporte;

    selectProyecto.innerHTML =
        '<option value="">Todos los proyectos</option>';

    filtrados.forEach(proyecto => {
        const option = document.createElement("option");
        option.value = String(proyecto.proyectoId);
        option.textContent =
            companiaId
                ? proyecto.proyectoNombre
                : `${proyecto.companiaNombre} — ${proyecto.proyectoNombre}`;

        selectProyecto.appendChild(option);
    });

    if (
        proyectoSeleccionado
        && filtrados.some(
            proyecto =>
                String(proyecto.proyectoId)
                === proyectoSeleccionado
        )
    ) {
        selectProyecto.value = proyectoSeleccionado;
    }
}


function configurarEventosFiltrosReporte() {
    const selectCompania =
        document.getElementById("filtroCompaniaReporte");

    const selectProyecto =
        document.getElementById("filtroProyectoReporte");

    const btnLimpiar =
        document.getElementById("btnLimpiarFiltrosReporte");

    selectCompania?.addEventListener("change", async () => {
        pintarProyectosFiltroReporte();

        if (selectProyecto) {
            selectProyecto.value = "";
        }

        await recargarReportes();
    });

    selectProyecto?.addEventListener("change", async () => {
        const proyectoId =
            Number(selectProyecto.value || 0);

        if (proyectoId && selectCompania) {
            const proyecto =
                proyectosReporte.find(
                    item =>
                        Number(item.proyectoId)
                        === proyectoId
                );

            if (proyecto) {
                selectCompania.value =
                    String(proyecto.companiaId);
            }
        }

        await recargarReportes();
    });

    btnLimpiar?.addEventListener("click", async () => {
        if (selectCompania) {
            selectCompania.value = "";
        }

        pintarProyectosFiltroReporte();

        if (selectProyecto) {
            selectProyecto.value = "";
        }

        await recargarReportes();
    });
}


function obtenerFiltrosReporte() {
    const companiaId =
        Number(
            document.getElementById("filtroCompaniaReporte")
                ?.value
            || 0
        );

    const proyectoId =
        Number(
            document.getElementById("filtroProyectoReporte")
                ?.value
            || 0
        );

    return {
        companiaId: companiaId || null,
        proyectoId: proyectoId || null
    };
}


function construirQueryReporte() {
    const filtros = obtenerFiltrosReporte();
    const params = new URLSearchParams();

    if (filtros.companiaId) {
        params.set(
            "companiaId",
            String(filtros.companiaId)
        );
    }

    if (filtros.proyectoId) {
        params.set(
            "proyectoId",
            String(filtros.proyectoId)
        );
    }

    const query = params.toString();

    return query
        ? `?${query}`
        : "";
}


async function recargarReportes() {
    actualizarTextoAlcanceReporte();

    const query =
        construirQueryReporte();

    const resultados =
        await Promise.allSettled([
            cargarResumenOperacion(query),
            cargarResumenRecursos(query),

            cargarReporteSimple(
                `/reportes/tickets-por-estado${query}`,
                "reporteEstado"
            ),

            cargarReporteSimple(
                `/reportes/tickets-por-prioridad${query}`,
                "reportePrioridad"
            ),

            cargarReporteSimple(
                `/reportes/tickets-por-tipo${query}`,
                "reporteTipo"
            )
        ]);

    const operacion =
        resultados[0].status === "fulfilled"
            ? resultados[0].value
            : null;

    const recursos =
        resultados[1].status === "fulfilled"
            ? resultados[1].value
            : null;

    pintarTablaResumenSeparado(
        operacion,
        recursos
    );
}


function actualizarTextoAlcanceReporte() {
    const filtros = obtenerFiltrosReporte();

    const alcance =
        document.getElementById("alcanceReporteSeleccionado");

    const titulo =
        document.getElementById("tituloResumenReporte");

    const descripcion =
        document.getElementById("descripcionResumenReporte");

    let texto = "Resumen general";
    let tituloTexto = "Resumen del reporte";
    let descripcionTexto =
        "Comparación entre trabajo operativo y recursos externos.";

    if (filtros.proyectoId) {
        const proyecto =
            proyectosReporte.find(
                item =>
                    Number(item.proyectoId)
                    === Number(filtros.proyectoId)
            );

        if (proyecto) {
            texto =
                `${proyecto.companiaNombre} — ${proyecto.proyectoNombre}`;

            tituloTexto =
                `Resumen de ${proyecto.proyectoNombre}`;

            descripcionTexto =
                `Indicadores de ${proyecto.companiaNombre} / ${proyecto.proyectoNombre}.`;
        }
    } else if (filtros.companiaId) {
        const proyecto =
            proyectosReporte.find(
                item =>
                    Number(item.companiaId)
                    === Number(filtros.companiaId)
            );

        if (proyecto) {
            texto = proyecto.companiaNombre;
            tituloTexto =
                `Resumen de ${proyecto.companiaNombre}`;

            descripcionTexto =
                `Indicadores consolidados de los proyectos disponibles dentro de ${proyecto.companiaNombre}.`;
        }
    }

    if (alcance) {
        alcance.textContent = texto;
    }

    if (titulo) {
        titulo.textContent = tituloTexto;
    }

    if (descripcion) {
        descripcion.textContent = descripcionTexto;
    }
}


async function cargarResumenOperacion(query = "") {
    const response =
        await fetch(
            `${API_BASE}/reportes/operacion-resumen${query}`
        );

    if (!response.ok) {
        throw new Error(
            await obtenerMensajeErrorReporte(response)
        );
    }

    const data =
        await response.json();

    ponerTextoReporte(
        "totalOperativos",
        data.totalOperativos
    );

    ponerTextoReporte(
        "ticketsNuevos",
        data.ticketsNuevos
    );

    ponerTextoReporte(
        "ticketsAsignados",
        data.ticketsAsignados
    );

    ponerTextoReporte(
        "ticketsEnProgreso",
        data.ticketsEnProgreso
    );

    ponerTextoReporte(
        "ticketsResueltos",
        data.ticketsResueltos
    );

    ponerTextoReporte(
        "ticketsCerrados",
        data.ticketsCerrados
    );

    return data;
}


async function cargarResumenRecursos(query = "") {
    const response =
        await fetch(
            `${API_BASE}/reportes/recursos-resumen${query}`
        );

    if (!response.ok) {
        throw new Error(
            await obtenerMensajeErrorReporte(response)
        );
    }

    const data =
        await response.json();

    ponerTextoReporte(
        "totalSolicitudesRecursos",
        data.totalSolicitudes
    );

    ponerTextoReporte(
        "recursosEsperandoProveedor",
        data.esperandoProveedor
    );

    ponerTextoReporte(
        "recursosRecibidos",
        data.recibidas
    );

    ponerTextoReporte(
        "recursosEntregados",
        data.entregadas
    );

    ponerTextoReporte(
        "recursosRetrasados",
        data.retrasadas
    );

    ponerTextoReporteDecimal(
        "promedioDiasProveedor",
        data.promedioDiasProveedor
    );

    pintarEstadosRecursos(
        data
    );

    pintarEntregasRecursos(
        data
    );

    return data;
}


function pintarEstadosRecursos(data) {
    const contenedor =
        document.getElementById(
            "reporteEstadosRecursos"
        );

    if (!contenedor) {
        return;
    }

    const filas = [
        ["Nuevo", data.nuevas],
        ["En validación", data.enValidacion],
        ["Solicitado al proveedor", data.solicitadasProveedor],
        ["Esperando proveedor", data.esperandoProveedor],
        ["Recibido", data.recibidas],
        ["Entregado", data.entregadas],
        ["Cerrado", data.cerradas],
        ["Cancelado", data.canceladas]
    ];

    contenedor.innerHTML =
        filas.map(([nombre, valor]) => `
            <div class="report-item">
                <span>${escaparHtmlReporte(nombre)}</span>
                <strong>${normalizarNumeroReporte(valor)}</strong>
            </div>
        `).join("");
}


function pintarEntregasRecursos(data) {
    const contenedor =
        document.getElementById(
            "reporteEntregasRecursos"
        );

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = `
        <div class="report-item">
            <span>Retrasadas</span>
            <strong>${normalizarNumeroReporte(data.retrasadas)}</strong>
        </div>

        <div class="report-item">
            <span>Próximas entregas (7 días)</span>
            <strong>${normalizarNumeroReporte(data.proximasEntregas)}</strong>
        </div>

        <div class="report-item">
            <span>Promedio de proveedor</span>
            <strong>${normalizarDecimalReporte(data.promedioDiasProveedor)} días</strong>
        </div>
    `;
}


function pintarTablaResumenSeparado(
    operacion,
    recursos
) {
    const tbody =
        document.getElementById(
            "tablaResumen"
        );

    if (!tbody) {
        return;
    }

    const op = operacion || {};
    const rec = recursos || {};

    tbody.innerHTML = `
        <tr>
            <td>Operaciones</td>
            <td>Tickets operativos</td>
            <td><strong>${normalizarNumeroReporte(op.totalOperativos)}</strong></td>
            <td>Tickets que dependen directamente del equipo de Operaciones.</td>
        </tr>

        <tr>
            <td>Operaciones</td>
            <td>En progreso</td>
            <td><strong>${normalizarNumeroReporte(op.ticketsEnProgreso)}</strong></td>
            <td>Tickets que se encuentran actualmente en atención.</td>
        </tr>

        <tr>
            <td>Operaciones</td>
            <td>Cerrados</td>
            <td><strong>${normalizarNumeroReporte(op.ticketsCerrados)}</strong></td>
            <td>Tickets operativos finalizados.</td>
        </tr>

        <tr>
            <td>Recursos externos</td>
            <td>Solicitudes</td>
            <td><strong>${normalizarNumeroReporte(rec.totalSolicitudes)}</strong></td>
            <td>Solicitudes asociadas a piezas, equipos u otros recursos externos.</td>
        </tr>

        <tr>
            <td>Recursos externos</td>
            <td>Esperando proveedor</td>
            <td><strong>${normalizarNumeroReporte(rec.esperandoProveedor)}</strong></td>
            <td>Solicitudes cuyo avance depende de un proveedor.</td>
        </tr>

        <tr>
            <td>Recursos externos</td>
            <td>Retrasadas</td>
            <td><strong>${normalizarNumeroReporte(rec.retrasadas)}</strong></td>
            <td>Solicitudes que superaron la fecha estimada y aún no fueron recibidas.</td>
        </tr>

        <tr>
            <td>Recursos externos</td>
            <td>Promedio proveedor</td>
            <td><strong>${normalizarDecimalReporte(rec.promedioDiasProveedor)} días</strong></td>
            <td>Tiempo promedio entre solicitud al proveedor y recepción del recurso.</td>
        </tr>
    `;
}


async function cargarReporteSimple(
    endpoint,
    contenedorId
) {
    const contenedor =
        document.getElementById(
            contenedorId
        );

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML =
        "<p>Cargando datos...</p>";

    try {
        const response =
            await fetch(
                `${API_BASE}${endpoint}`
            );

        if (!response.ok) {
            throw new Error(
                await obtenerMensajeErrorReporte(
                    response
                )
            );
        }

        const data =
            await response.json();

        contenedor.innerHTML = "";

        if (
            !Array.isArray(data)
            || data.length === 0
        ) {
            contenedor.innerHTML =
                "<p>No hay datos disponibles.</p>";
            return;
        }

        data.forEach(item => {
            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "report-item";

            const nombre =
                formatearNombreReporte(
                    item.nombre
                );

            const total =
                normalizarNumeroReporte(
                    item.total
                );

            div.innerHTML = `
                <span>
                    ${escaparHtmlReporte(nombre)}
                </span>

                <strong>
                    ${total}
                </strong>
            `;

            contenedor.appendChild(div);
        });

    } catch (error) {
        console.error(
            `Error cargando ${endpoint}:`,
            error
        );

        contenedor.innerHTML =
            "<p>No se pudo cargar este reporte.</p>";
    }
}


function formatearNombreReporte(valor) {
    const texto =
        String(valor || "")
            .trim();

    const equivalencias = {
        "NUEVO": "Nuevo",
        "ASIGNADO": "Asignado",
        "EN_PROGRESO": "En progreso",
        "RESUELTO": "Resuelto",
        "CERRADO": "Cerrado",
        "P1_CRITICA": "P1 - Crítica",
        "P2_ALTA": "P2 - Alta",
        "P3_MEDIA": "P3 - Media",
        "P4_BAJA": "P4 - Baja"
    };

    return equivalencias[
        texto.toUpperCase()
    ]
    ||
    texto.replaceAll("_", " ");
}


function ponerTextoReporte(id, valor) {
    const elemento =
        document.getElementById(id);

    if (elemento) {
        elemento.textContent =
            normalizarNumeroReporte(
                valor
            );
    }
}


function ponerTextoReporteDecimal(id, valor) {
    const elemento =
        document.getElementById(id);

    if (elemento) {
        elemento.textContent =
            normalizarDecimalReporte(
                valor
            );
    }
}


function normalizarNumeroReporte(valor) {
    const numero =
        Number(valor);

    return Number.isFinite(numero)
        ? Math.trunc(numero)
        : 0;
}


function normalizarDecimalReporte(valor) {
    const numero =
        Number(valor);

    if (!Number.isFinite(numero)) {
        return "0";
    }

    return numero.toLocaleString(
        "es-PA",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
        }
    );
}


async function obtenerMensajeErrorReporte(response) {
    try {
        const tipo =
            response.headers.get(
                "content-type"
            )
            || "";

        if (
            tipo.includes(
                "application/json"
            )
        ) {
            const contenido =
                await response.json();

            return (
                contenido.message
                || contenido.error
                || `Error ${response.status}`
            );
        }

        const texto =
            await response.text();

        return (
            texto
            || `Error ${response.status}`
        );

    } catch (error) {
        return `Error ${response.status}`;
    }
}


function escaparHtmlReporte(valor) {
    return String(
        valor ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
