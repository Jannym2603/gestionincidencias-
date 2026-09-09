const API_BASE = "/api";

const FEATURE_FLAGS_KEY = "gestionIncidenciasFeatureFlags";

const FEATURE_FLAGS_DEFAULT = {
    crearTicket: true,
    solicitudesRecursos: true,
    reportes: true,
    historial: true,

    crearTicketCliente: true,
    crearTicketAgente: true,
    crearTicketSupervisor: true,
    crearTicketAdmin: true,

    solicitudesRecursosCliente: true,
    solicitudesRecursosAgente: true,
    solicitudesRecursosSupervisor: true,
    solicitudesRecursosAdmin: true,

    reportesCliente: true,
    reportesAgente: true,
    reportesSupervisor: true,
    reportesAdmin: true,

    historialCliente: true,
    historialAgente: true,
    historialSupervisor: true,
    historialAdmin: true
};

let featureFlagsActuales = { ...FEATURE_FLAGS_DEFAULT };

function normalizarFeatureFlags(data = {}) {
    return {
        crearTicket:
            data.crearTicketActivo ??
            data.crearTicket ??
            FEATURE_FLAGS_DEFAULT.crearTicket,

        solicitudesRecursos:
            data.solicitudesRecursosActivo ??
            data.solicitudesRecursos ??
            FEATURE_FLAGS_DEFAULT.solicitudesRecursos,

        reportes:
            data.reportesActivos ??
            data.reportes ??
            FEATURE_FLAGS_DEFAULT.reportes,

        historial:
            data.historialActivo ??
            data.historial ??
            FEATURE_FLAGS_DEFAULT.historial,

        crearTicketCliente:
            data.crearTicketCliente ??
            FEATURE_FLAGS_DEFAULT.crearTicketCliente,

        crearTicketAgente:
            data.crearTicketAgente ??
            FEATURE_FLAGS_DEFAULT.crearTicketAgente,

        crearTicketSupervisor:
            data.crearTicketSupervisor ??
            FEATURE_FLAGS_DEFAULT.crearTicketSupervisor,

        crearTicketAdmin:
            data.crearTicketAdmin ??
            FEATURE_FLAGS_DEFAULT.crearTicketAdmin,

        solicitudesRecursosCliente:
            data.solicitudesRecursosCliente ??
            FEATURE_FLAGS_DEFAULT.solicitudesRecursosCliente,

        solicitudesRecursosAgente:
            data.solicitudesRecursosAgente ??
            FEATURE_FLAGS_DEFAULT.solicitudesRecursosAgente,

        solicitudesRecursosSupervisor:
            data.solicitudesRecursosSupervisor ??
            FEATURE_FLAGS_DEFAULT.solicitudesRecursosSupervisor,

        solicitudesRecursosAdmin:
            data.solicitudesRecursosAdmin ??
            FEATURE_FLAGS_DEFAULT.solicitudesRecursosAdmin,

        reportesCliente:
            data.reportesCliente ??
            FEATURE_FLAGS_DEFAULT.reportesCliente,

        reportesAgente:
            data.reportesAgente ??
            FEATURE_FLAGS_DEFAULT.reportesAgente,

        reportesSupervisor:
            data.reportesSupervisor ??
            FEATURE_FLAGS_DEFAULT.reportesSupervisor,

        reportesAdmin:
            data.reportesAdmin ??
            FEATURE_FLAGS_DEFAULT.reportesAdmin,

        historialCliente:
            data.historialCliente ??
            FEATURE_FLAGS_DEFAULT.historialCliente,

        historialAgente:
            data.historialAgente ??
            FEATURE_FLAGS_DEFAULT.historialAgente,

        historialSupervisor:
            data.historialSupervisor ??
            FEATURE_FLAGS_DEFAULT.historialSupervisor,

        historialAdmin:
            data.historialAdmin ??
            FEATURE_FLAGS_DEFAULT.historialAdmin
    };
}

function obtenerFeatureFlags() {
    return { ...featureFlagsActuales };
}

function guardarCacheFeatureFlags(flags) {
    featureFlagsActuales = normalizarFeatureFlags(flags);

    localStorage.setItem(
        FEATURE_FLAGS_KEY,
        JSON.stringify(featureFlagsActuales)
    );

    return obtenerFeatureFlags();
}

function cargarCacheFeatureFlags() {
    const data = localStorage.getItem(FEATURE_FLAGS_KEY);

    if (!data) {
        return guardarCacheFeatureFlags(FEATURE_FLAGS_DEFAULT);
    }

    try {
        return guardarCacheFeatureFlags(JSON.parse(data));
    } catch (error) {
        console.error("La caché de configuración del sistema no es válida:", error);
        localStorage.removeItem(FEATURE_FLAGS_KEY);
        return guardarCacheFeatureFlags(FEATURE_FLAGS_DEFAULT);
    }
}

async function cargarFeatureFlagsGlobales() {
    const cache = cargarCacheFeatureFlags();
    aplicarFeatureFlags(cache);

    try {
        const response = await fetch(`${API_BASE}/configuracion-sistema`);

        if (!response.ok) {
            throw new Error(
                `No se pudo consultar la configuración global (${response.status}).`
            );
        }

        const data = await response.json();
        const flags = guardarCacheFeatureFlags(data);

        aplicarFeatureFlags(flags);

        return flags;

    } catch (error) {
        console.error("Error cargando la configuración global:", error);
        return cache;
    }
}

async function actualizarFeatureFlagsGlobales(flags = {}) {
    const configuracion = normalizarFeatureFlags({
        ...featureFlagsActuales,
        ...flags
    });

    const response = await fetch(`${API_BASE}/configuracion-sistema`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            crearTicketActivo: configuracion.crearTicket,
            solicitudesRecursosActivo: configuracion.solicitudesRecursos,
            reportesActivos: configuracion.reportes,
            historialActivo: configuracion.historial,

            crearTicketCliente: configuracion.crearTicketCliente,
            crearTicketAgente: configuracion.crearTicketAgente,
            crearTicketSupervisor: configuracion.crearTicketSupervisor,
            crearTicketAdmin: configuracion.crearTicketAdmin,

            solicitudesRecursosCliente: configuracion.solicitudesRecursosCliente,
            solicitudesRecursosAgente: configuracion.solicitudesRecursosAgente,
            solicitudesRecursosSupervisor: configuracion.solicitudesRecursosSupervisor,
            solicitudesRecursosAdmin: configuracion.solicitudesRecursosAdmin,

            reportesCliente: configuracion.reportesCliente,
            reportesAgente: configuracion.reportesAgente,
            reportesSupervisor: configuracion.reportesSupervisor,
            reportesAdmin: configuracion.reportesAdmin,

            historialCliente: configuracion.historialCliente,
            historialAgente: configuracion.historialAgente,
            historialSupervisor: configuracion.historialSupervisor,
            historialAdmin: configuracion.historialAdmin
        })
    });

    if (!response.ok) {
        let mensaje = "No se pudo guardar la configuración global.";

        try {
            const data = await response.json();
            mensaje = data.message || mensaje;
        } catch (error) {
        }

        throw new Error(mensaje);
    }

    const data = await response.json();
    const guardadas = guardarCacheFeatureFlags(data);

    aplicarFeatureFlags(guardadas);

    return guardadas;
}

function obtenerPermisosModuloPorRol(configuracion, rol) {
    const rolNormalizado = String(rol || "").trim().toUpperCase();

    const permisos = {
        CLIENTE: {
            crearTicket: configuracion.crearTicketCliente,
            solicitudesRecursos: configuracion.solicitudesRecursosCliente,
            reportes: configuracion.reportesCliente,
            historial: configuracion.historialCliente
        },

        AGENTE: {
            crearTicket: configuracion.crearTicketAgente,
            solicitudesRecursos: configuracion.solicitudesRecursosAgente,
            reportes: configuracion.reportesAgente,
            historial: configuracion.historialAgente
        },

        SUPERVISOR: {
            crearTicket: configuracion.crearTicketSupervisor,
            solicitudesRecursos: configuracion.solicitudesRecursosSupervisor,
            reportes: configuracion.reportesSupervisor,
            historial: configuracion.historialSupervisor
        },

        /*
         * ADMIN siempre conserva acceso por rol.
         * El interruptor global sí puede desactivar el módulo para ADMIN.
         */
        ADMIN: {
            crearTicket: true,
            solicitudesRecursos: true,
            reportes: true,
            historial: true
        }
    };

    return permisos[rolNormalizado] || {
        crearTicket: false,
        solicitudesRecursos: false,
        reportes: false,
        historial: false
    };
}

function obtenerDisponibilidadModulos(configuracion) {
    const usuario = obtenerSesion();

    const permisosRol = obtenerPermisosModuloPorRol(
        configuracion,
        usuario?.rol
    );

    return {
        crearTicket:
            Boolean(configuracion.crearTicket) &&
            Boolean(permisosRol.crearTicket),

        solicitudesRecursos:
            Boolean(configuracion.solicitudesRecursos) &&
            Boolean(permisosRol.solicitudesRecursos),

        reportes:
            Boolean(configuracion.reportes) &&
            Boolean(permisosRol.reportes),

        historial:
            Boolean(configuracion.historial) &&
            Boolean(permisosRol.historial)
    };
}

function aplicarFeatureFlags(flags = obtenerFeatureFlags()) {
    const configuracion = normalizarFeatureFlags(flags);
    const disponibilidad = obtenerDisponibilidadModulos(configuracion);

    const mapaMenu = {
        "crear-ticket": disponibilidad.crearTicket,
        "solicitudes-recursos": disponibilidad.solicitudesRecursos,
        reportes: disponibilidad.reportes,
        historial: disponibilidad.historial
    };

    Object.entries(mapaMenu).forEach(([menu, activo]) => {
        document
            .querySelectorAll(`[data-menu='${menu}']`)
            .forEach(elemento => {
                elemento.style.display =
                    activo ? "block" : "none";
            });
    });

    const mapaAcciones = {
        "crear-ticket": disponibilidad.crearTicket,
        "solicitudes-recursos": disponibilidad.solicitudesRecursos,
        reportes: disponibilidad.reportes,
        historial: disponibilidad.historial
    };

    Object.entries(mapaAcciones).forEach(([modulo, activo]) => {
        document
            .querySelectorAll(
                `[data-feature-action='${modulo}']`
            )
            .forEach(elemento => {
                elemento.style.display =
                    activo ? "" : "none";
            });
    });

    protegerPaginaPorFeatureFlag(disponibilidad);
}

function protegerPaginaPorFeatureFlag(disponibilidad) {
    const paginaActual =
        window.location.pathname.split("/").pop();

    const paginasControladas = {
        "crear-ticket.html": disponibilidad.crearTicket,
        "solicitudes-recursos.html": disponibilidad.solicitudesRecursos,
        "reportes.html": disponibilidad.reportes,
        "historial.html": disponibilidad.historial
    };

    if (
        Object.prototype.hasOwnProperty.call(
            paginasControladas,
            paginaActual
        ) &&
        !paginasControladas[paginaActual]
    ) {
        window.location.replace("dashboard.html");
        return false;
    }

    return true;
}


/*
 * Conservamos la función fetch original del navegador.
 * Después la envolvemos para agregar automáticamente
 * el token JWT en todas las peticiones hacia la API.
 */
const fetchOriginal = window.fetch.bind(window);

window.fetch = async function (url, options = {}) {
    const config = {
        ...options
    };

    const headers = new Headers(config.headers || {});
    const sesion = obtenerSesion();

    const urlTexto =
        typeof url === "string"
            ? url
            : url.url;

    /*
     * Si existe una sesión con token y la petición va hacia
     * nuestro backend, agregamos el encabezado Authorization.
     */
    if (
        sesion?.token &&
        urlTexto.startsWith(API_BASE)
    ) {
        headers.set(
            "Authorization",
            `Bearer ${sesion.token}`
        );
    }

    config.headers = headers;

    const response = await fetchOriginal(url, config);

    /*
     * Si el backend responde 401, significa que el token
     * no existe, venció o no es válido.
     *
     * No aplicamos esta redirección sobre los endpoints públicos
     * de autenticación y recuperación de contraseña.
     */
    if (
        response.status === 401 &&
        !urlTexto.includes("/auth/login") &&
        !urlTexto.includes("/auth/solicitar-recuperacion") &&
        !urlTexto.includes("/auth/confirmar-recuperacion")
    ) {
        sessionStorage.removeItem("usuarioSistema");
        localStorage.removeItem("usuarioSistema");

        if (!window.location.pathname.endsWith("login.html")) {
            alert("Tu sesión venció. Inicia sesión nuevamente.");
            window.location.href = "login.html";
        }
    }

    return response;
};

function guardarSesion(usuario) {
    // Limpia cualquier sesión vieja antes de guardar la nueva
    localStorage.removeItem("usuarioSistema");

    sessionStorage.setItem(
        "usuarioSistema",
        JSON.stringify(usuario)
    );
}

function obtenerSesion() {
    const data = sessionStorage.getItem("usuarioSistema");

    if (!data) {
        return null;
    }

    try {
        return JSON.parse(data);
    } catch (error) {
        console.error("La sesión guardada no es válida:", error);

        sessionStorage.removeItem("usuarioSistema");
        localStorage.removeItem("usuarioSistema");

        return null;
    }
}

function cerrarSesion() {
    sessionStorage.removeItem("usuarioSistema");
    localStorage.removeItem("usuarioSistema");

    window.location.href = "login.html";
}

function validarSesion() {
    const usuario = obtenerSesion();

    if (!usuario || !usuario.token) {
        sessionStorage.removeItem("usuarioSistema");
        localStorage.removeItem("usuarioSistema");

        window.location.href = "login.html";
        return null;
    }

    return usuario;
}

function tieneRol(rolesPermitidos) {
    const usuario = validarSesion();

    if (!usuario) {
        return false;
    }

    if (!rolesPermitidos.includes(usuario.rol)) {
        alert("No tienes permiso para acceder a esta pantalla.");

        redirigirSegunRol(usuario.rol);

        return false;
    }

    return true;
}

function redirigirSegunRol(rol) {
    if (rol === "CLIENTE") {
        window.location.href = "dashboard.html";
    } else if (rol === "AGENTE") {
        window.location.href = "tickets.html";
    } else if (rol === "SUPERVISOR") {
        window.location.href = "dashboard.html";
    } else if (rol === "ADMIN") {
        window.location.href = "dashboard.html";
    } else {
        window.location.href = "login.html";
    }
}

function pintarUsuarioHeader() {
    const usuario = obtenerSesion();

    if (!usuario) {
        return;
    }

    const nombreUsuario =
        document.getElementById("nombreUsuario");

    const rolUsuario =
        document.getElementById("rolUsuario");

    const avatarUsuario =
        document.getElementById("avatarUsuario");

    const userBox =
        document.querySelector(".user-box");

    if (nombreUsuario) {
        nombreUsuario.textContent =
            usuario.nombre || "Usuario";
    }

    if (rolUsuario) {
        rolUsuario.textContent =
            usuario.rol || "Rol";
    }

    if (avatarUsuario) {
        const nombre =
            usuario.nombre || "Usuario";

        const iniciales = nombre
            .split(" ")
            .filter(palabra => palabra.trim() !== "")
            .map(palabra => palabra.charAt(0))
            .join("")
            .substring(0, 2)
            .toUpperCase();

        avatarUsuario.textContent =
            iniciales || "US";
    }

    // Muestra el perfil solo después de cargar el usuario correcto
    if (userBox) {
        userBox.style.visibility = "visible";
    }

    document.body.classList.add("sesion-lista");
}

function configurarMenuPorRol() {
    const usuario = obtenerSesion();

    if (!usuario) {
        return;
    }

    const rol = String(usuario.rol || "")
        .trim()
        .toUpperCase();

    const menu = document.querySelector(".menu");

    if (!menu) {
        return;
    }

    const itemUsuarios =
        document.querySelector("[data-menu='usuarios']");

    const itemReportes =
        document.querySelector("[data-menu='reportes']");

    let itemHistorial =
        document.querySelector("[data-menu='historial']");

    const itemCrearTicket =
        document.querySelector("[data-menu='crear-ticket']");

    let itemSolicitudesRecursos =
        document.querySelector("[data-menu='solicitudes-recursos']");

    if (!itemSolicitudesRecursos) {
        itemSolicitudesRecursos = document.createElement("a");
        itemSolicitudesRecursos.href = "solicitudes-recursos.html";
        itemSolicitudesRecursos.className = "menu-item";
        itemSolicitudesRecursos.dataset.menu = "solicitudes-recursos";
        itemSolicitudesRecursos.textContent = "Solicitudes de Recursos";

        if (itemCrearTicket) {
            itemCrearTicket.insertAdjacentElement(
                "afterend",
                itemSolicitudesRecursos
            );
        } else {
            const itemTickets =
                menu.querySelector("a[href='tickets.html']");

            if (itemTickets) {
                itemTickets.insertAdjacentElement(
                    "afterend",
                    itemSolicitudesRecursos
                );
            } else {
                menu.appendChild(itemSolicitudesRecursos);
            }
        }
    }

    const itemConfiguracion =
        document.querySelector("[data-menu='configuracion']");

    /*
     * HISTORIAL
     *
     * Disponible para todos los roles.
     * El backend limita los eventos según los tickets
     * que cada usuario realmente puede consultar.
     */
    if (!itemHistorial) {
        itemHistorial = document.createElement("a");
        itemHistorial.href = "historial.html";
        itemHistorial.className = "menu-item";
        itemHistorial.dataset.menu = "historial";
        itemHistorial.textContent = "Historial";

        const itemReportesExistente =
            menu.querySelector("[data-menu='reportes']");

        const itemConfiguracionExistente =
            menu.querySelector("[data-menu='configuracion']");

        if (itemReportesExistente) {
            itemReportesExistente.insertAdjacentElement(
                "afterend",
                itemHistorial
            );
        } else if (itemConfiguracionExistente) {
            menu.insertBefore(
                itemHistorial,
                itemConfiguracionExistente
            );
        } else {
            menu.appendChild(itemHistorial);
        }
    }

    /*
     * PROYECTOS
     *
     * Es una opción operativa y debe estar disponible
     * para ADMIN, SUPERVISOR, AGENTE y CLIENTE.
     */
    let itemProyectos =
        document.querySelector("[data-menu='proyectos']");

    if (!itemProyectos) {
        itemProyectos = document.createElement("a");
        itemProyectos.href = "proyectos.html";
        itemProyectos.className = "menu-item";
        itemProyectos.dataset.menu = "proyectos";
        itemProyectos.textContent = "Proyectos";

        const itemTickets =
            menu.querySelector("a[href='tickets.html']");

        if (itemTickets) {
            itemTickets.insertAdjacentElement(
                "afterend",
                itemProyectos
            );
        } else {
            menu.prepend(itemProyectos);
        }
    }

    itemProyectos.style.display = "block";

    if (itemSolicitudesRecursos) {
        itemSolicitudesRecursos.style.display = "block";
    }

    /*
     * GESTIÓN ORGANIZACIONAL
     *
     * Se conserva como opción administrativa.
     */
    let itemCompaniasProyectos =
        document.querySelector("[data-menu='companias-proyectos']");

    if (!itemCompaniasProyectos) {
        itemCompaniasProyectos = document.createElement("a");
        itemCompaniasProyectos.href = "companias-proyectos.html";
        itemCompaniasProyectos.className = "menu-item";
        itemCompaniasProyectos.dataset.menu = "companias-proyectos";
        itemCompaniasProyectos.textContent = "Gestión organizacional";

        const itemConfiguracionExistente =
            menu.querySelector("[data-menu='configuracion']");

        if (itemConfiguracionExistente) {
            menu.insertBefore(
                itemCompaniasProyectos,
                itemConfiguracionExistente
            );
        } else {
            menu.appendChild(itemCompaniasProyectos);
        }
    }

    if (rol === "CLIENTE") {
        if (itemUsuarios) {
            itemUsuarios.style.display = "none";
        }

        if (itemReportes) {
            itemReportes.style.display = "block";
        }

        if (itemHistorial) {
            itemHistorial.style.display = "block";
        }

        if (itemCrearTicket) {
            itemCrearTicket.style.display = "block";
        }

        if (itemConfiguracion) {
            itemConfiguracion.style.display = "block";
        }

        if (itemCompaniasProyectos) {
            itemCompaniasProyectos.style.display = "none";
        }
    }

    if (rol === "AGENTE") {
        if (itemUsuarios) {
            itemUsuarios.style.display = "none";
        }

        if (itemReportes) {
            itemReportes.style.display = "block";
        }

        if (itemHistorial) {
            itemHistorial.style.display = "block";
        }

        if (itemCrearTicket) {
            itemCrearTicket.style.display = "none";
        }

        if (itemConfiguracion) {
            itemConfiguracion.style.display = "block";
        }

        if (itemCompaniasProyectos) {
            itemCompaniasProyectos.style.display = "none";
        }
    }

    if (rol === "SUPERVISOR") {
        if (itemUsuarios) {
            itemUsuarios.style.display = "block";
        }

        if (itemReportes) {
            itemReportes.style.display = "block";
        }

        if (itemHistorial) {
            itemHistorial.style.display = "block";
        }

        if (itemCrearTicket) {
            itemCrearTicket.style.display = "block";
        }

        if (itemConfiguracion) {
            itemConfiguracion.style.display = "block";
        }

        if (itemCompaniasProyectos) {
            itemCompaniasProyectos.style.display = "block";
        }
    }

    if (rol === "ADMIN") {
        if (itemUsuarios) {
            itemUsuarios.style.display = "block";
        }

        if (itemReportes) {
            itemReportes.style.display = "block";
        }

        if (itemHistorial) {
            itemHistorial.style.display = "block";
        }

        if (itemCrearTicket) {
            itemCrearTicket.style.display = "block";
        }

        if (itemConfiguracion) {
            itemConfiguracion.style.display = "block";
        }

        if (itemCompaniasProyectos) {
            itemCompaniasProyectos.style.display = "block";
        }
    }

    /*
     * Cuando estamos en Proyectos o en el detalle de un proyecto,
     * se marca "Proyectos" como la opción activa de la barra.
     */
    const paginaActual =
        window.location.pathname.split("/").pop();

    if (
        paginaActual === "proyectos.html" ||
        paginaActual === "proyecto-detalle.html"
    ) {
        menu.querySelectorAll(".menu-item").forEach(item => {
            item.classList.remove("active");
        });

        itemProyectos.classList.add("active");
    }

    if (paginaActual === "historial.html" && itemHistorial) {
        menu.querySelectorAll(".menu-item").forEach(item => {
            item.classList.remove("active");
        });

        itemHistorial.classList.add("active");
    }

    if (
        paginaActual === "solicitudes-recursos.html" &&
        itemSolicitudesRecursos
    ) {
        menu.querySelectorAll(".menu-item").forEach(item => {
            item.classList.remove("active");
        });

        itemSolicitudesRecursos.classList.add("active");
    }
}

function bloquearPaginasPorRol() {
    const usuario = obtenerSesion();

    if (!usuario) {
        return;
    }

    const rol = String(usuario.rol || "")
        .trim()
        .toUpperCase();

    const paginaActual =
        window.location.pathname.split("/").pop();

    const paginasCliente = [
        "dashboard.html",
        "tickets.html",
        "proyectos.html",
        "proyecto-detalle.html",
        "crear-ticket.html",
        "solicitudes-recursos.html",
        "ticket-detalle.html",
        "reportes.html",
        "historial.html",
        "configuracion.html"
    ];

    const paginasAgente = [
        "dashboard.html",
        "tickets.html",
        "proyectos.html",
        "proyecto-detalle.html",
        "crear-ticket.html",
        "solicitudes-recursos.html",
        "ticket-detalle.html",
        "reportes.html",
        "historial.html",
        "configuracion.html"
    ];

    const paginasSupervisor = [
        "dashboard.html",
        "tickets.html",
        "proyectos.html",
        "proyecto-detalle.html",
        "crear-ticket.html",
        "solicitudes-recursos.html",
        "ticket-detalle.html",
        "usuarios.html",
        "reportes.html",
        "historial.html",
        "configuracion.html",
        "companias-proyectos.html"
    ];

    const paginasAdmin = [
        "dashboard.html",
        "tickets.html",
        "proyectos.html",
        "proyecto-detalle.html",
        "crear-ticket.html",
        "solicitudes-recursos.html",
        "ticket-detalle.html",
        "usuarios.html",
        "reportes.html",
        "historial.html",
        "configuracion.html",
        "companias-proyectos.html"
    ];

    let paginasPermitidas = [];

    if (rol === "CLIENTE") {
        paginasPermitidas = paginasCliente;
    } else if (rol === "AGENTE") {
        paginasPermitidas = paginasAgente;
    } else if (rol === "SUPERVISOR") {
        paginasPermitidas = paginasSupervisor;
    } else if (rol === "ADMIN") {
        paginasPermitidas = paginasAdmin;
    }

    if (!paginasPermitidas.includes(paginaActual)) {
        alert("No tienes permiso para acceder a esta pantalla.");
        redirigirSegunRol(rol);
    }
}

function inicializarLayout() {
    const usuario = validarSesion();

    if (!usuario) {
        return;
    }

    bloquearPaginasPorRol();
    pintarUsuarioHeader();
    configurarMenuPorRol();

    document.querySelectorAll("[data-menu]").forEach(item => {
        item.dataset.ocultoPorRol = String(item.style.display === "none");
    });

    cargarFeatureFlagsGlobales();
    configurarSidebarColapsable();
    configurarTopbarSticky();

    const btnLogout =
        document.getElementById("btnLogout");

    if (btnLogout) {
        btnLogout.addEventListener(
            "click",
            cerrarSesion
        );
    }
}


function configurarTopbarSticky() {
    const topbar = document.querySelector(".topbar");

    if (!topbar) {
        return;
    }

    let actualizando = false;

    const actualizarEstado = () => {
        topbar.classList.toggle("topbar-con-sombra", window.scrollY > 8);
        actualizando = false;
    };

    window.addEventListener(
        "scroll",
        () => {
            if (!actualizando) {
                window.requestAnimationFrame(actualizarEstado);
                actualizando = true;
            }
        },
        { passive: true }
    );

    actualizarEstado();
}



function configurarSidebarColapsable() {
    const sidebar = document.querySelector(".sidebar");
    const appContainer = document.querySelector(".app-container");

    if (!sidebar || !appContainer) {
        return;
    }

    sidebar.querySelectorAll(".menu-item").forEach(item => {
        item.dataset.tooltip = item.textContent.trim();
    });

    let boton = sidebar.querySelector(".sidebar-toggle-btn");

    if (!boton) {
        boton = document.createElement("button");
        boton.type = "button";
        boton.className = "sidebar-toggle-btn";
        boton.setAttribute("aria-label", "Contraer barra lateral");
        boton.setAttribute("title", "Contraer barra lateral");
        boton.innerHTML = `<span class="sidebar-toggle-arrow" aria-hidden="true">‹</span>`;
        sidebar.appendChild(boton);
    }

    const estadoGuardado = localStorage.getItem("sidebarColapsada") === "true";

    if (estadoGuardado && window.innerWidth > 760) {
        appContainer.classList.add("sidebar-colapsada");
        boton.innerHTML = `<span class="sidebar-toggle-arrow" aria-hidden="true">›</span>`;
        boton.setAttribute("aria-label", "Expandir barra lateral");
        boton.setAttribute("title", "Expandir barra lateral");
    }

    boton.addEventListener("click", () => {
        const colapsada = appContainer.classList.toggle("sidebar-colapsada");

        localStorage.setItem("sidebarColapsada", String(colapsada));
        boton.innerHTML = colapsada
            ? `<span class="sidebar-toggle-arrow" aria-hidden="true">›</span>`
            : `<span class="sidebar-toggle-arrow" aria-hidden="true">‹</span>`;
        boton.setAttribute(
            "aria-label",
            colapsada ? "Expandir barra lateral" : "Contraer barra lateral"
        );
        boton.setAttribute(
            "title",
            colapsada ? "Expandir barra lateral" : "Contraer barra lateral"
        );
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth <= 760) {
            appContainer.classList.remove("sidebar-colapsada");
            boton.innerHTML = `<span class="sidebar-toggle-arrow" aria-hidden="true">‹</span>`;
        } else if (localStorage.getItem("sidebarColapsada") === "true") {
            appContainer.classList.add("sidebar-colapsada");
            boton.innerHTML = `<span class="sidebar-toggle-arrow" aria-hidden="true">›</span>`;
        }
    });
}

function obtenerClaseEstado(estado) {
    switch (estado) {
        case "NUEVO":
            return "badge-nuevo";

        case "ASIGNADO":
            return "badge-asignado";

        case "EN_PROGRESO":
            return "badge-progreso";

        case "RESUELTO":
            return "badge-resuelto";

        case "CERRADO":
            return "badge-cerrado";

        default:
            return "badge-cerrado";
    }
}

function obtenerClasePrioridad(prioridad) {
    switch (prioridad) {
        case "P1_CRITICA":
            return "badge-prioridad-critica";

        case "P2_ALTA":
            return "badge-prioridad-alta";

        case "P3_MEDIA":
            return "badge-prioridad-media";

        case "P4_BAJA":
            return "badge-prioridad-baja";

        default:
            return "badge-cerrado";
    }
}

function formatearFecha(fecha) {
    if (!fecha) {
        return "Sin fecha";
    }

    const fechaObj = new Date(fecha);

    if (Number.isNaN(fechaObj.getTime())) {
        return "Fecha inválida";
    }

    return fechaObj.toLocaleDateString("es-PA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
}