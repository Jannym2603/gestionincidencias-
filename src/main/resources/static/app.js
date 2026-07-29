const API_BASE = "/api";

const FEATURE_FLAGS_KEY = "gestionIncidenciasFeatureFlags";

const FEATURE_FLAGS_DEFAULT = {
    crearTicket: true,
    reportes: true,
    historial: true,
    varianteVisual: "A"
};

let featureFlagsActuales = { ...FEATURE_FLAGS_DEFAULT };

function normalizarFeatureFlags(data = {}) {
    return {
        crearTicket:
            data.crearTicketActivo ??
            data.crearTicket ??
            FEATURE_FLAGS_DEFAULT.crearTicket,

        reportes:
            data.reportesActivos ??
            data.reportes ??
            FEATURE_FLAGS_DEFAULT.reportes,

        historial:
            data.historialActivo ??
            data.historial ??
            FEATURE_FLAGS_DEFAULT.historial,

        varianteVisual:
            String(
                data.varianteVisual ??
                FEATURE_FLAGS_DEFAULT.varianteVisual
            ).toUpperCase() === "B" ? "B" : "A"
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
        console.error("La caché de funciones experimentales no es válida:", error);
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

async function actualizarFeatureFlagsGlobales(flags) {
    const configuracion = normalizarFeatureFlags(flags);

    const response = await fetch(`${API_BASE}/configuracion-sistema`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            crearTicketActivo: configuracion.crearTicket,
            reportesActivos: configuracion.reportes,
            historialActivo: configuracion.historial,
            varianteVisual: configuracion.varianteVisual
        })
    });

    if (!response.ok) {
        let mensaje = "No se pudo guardar la configuración global.";

        try {
            const data = await response.json();
            mensaje = data.message || mensaje;
        } catch (error) {
            // La respuesta no tenía un cuerpo JSON utilizable.
        }

        throw new Error(mensaje);
    }

    const data = await response.json();
    const guardadas = guardarCacheFeatureFlags(data);
    aplicarFeatureFlags(guardadas);

    return guardadas;
}

function aplicarFeatureFlags(flags = obtenerFeatureFlags()) {
    const configuracion = normalizarFeatureFlags(flags);

    const mapaMenu = {
        "crear-ticket": configuracion.crearTicket,
        reportes: configuracion.reportes,
        historial: configuracion.historial
    };

    Object.entries(mapaMenu).forEach(([menu, activo]) => {
        const elemento = document.querySelector(`[data-menu='${menu}']`);

        if (!elemento) {
            return;
        }

        const ocultoPorRol = elemento.dataset.ocultoPorRol === "true";
        elemento.style.display = activo && !ocultoPorRol ? "block" : "none";
    });

    document.body.classList.toggle(
        "ui-variante-b",
        configuracion.varianteVisual === "B"
    );

    protegerPaginaPorFeatureFlag(configuracion);
}

function protegerPaginaPorFeatureFlag(flags) {
    const paginaActual = window.location.pathname.split("/").pop();

    const paginasControladas = {
        "crear-ticket.html": flags.crearTicket,
        "reportes.html": flags.reportes,
        "historial.html": flags.historial
    };

    if (
        Object.prototype.hasOwnProperty.call(paginasControladas, paginaActual) &&
        !paginasControladas[paginaActual]
    ) {
        alert("Esta función está desactivada temporalmente.");
        window.location.href = "dashboard.html";
    }
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

    const rol = usuario.rol;

    const itemUsuarios =
        document.querySelector("[data-menu='usuarios']");

    const itemReportes =
        document.querySelector("[data-menu='reportes']");

    const itemHistorial =
        document.querySelector("[data-menu='historial']");

    const itemCrearTicket =
        document.querySelector("[data-menu='crear-ticket']");

    const itemConfiguracion =
        document.querySelector("[data-menu='configuracion']");

    if (rol === "CLIENTE") {
        if (itemUsuarios) {
            itemUsuarios.style.display = "none";
        }

        if (itemReportes) {
            itemReportes.style.display = "none";
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
    }

    if (rol === "AGENTE") {
        if (itemUsuarios) {
            itemUsuarios.style.display = "none";
        }

        if (itemReportes) {
            itemReportes.style.display = "none";
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
    }
}

function bloquearPaginasPorRol() {
    const usuario = obtenerSesion();

    if (!usuario) {
        return;
    }

    const rol = usuario.rol;

    const paginaActual =
        window.location.pathname.split("/").pop();

    const paginasCliente = [
        "dashboard.html",
        "tickets.html",
        "crear-ticket.html",
        "ticket-detalle.html",
        "historial.html",
        "configuracion.html"
    ];

    const paginasAgente = [
        "dashboard.html",
        "tickets.html",
        "ticket-detalle.html",
        "historial.html",
        "configuracion.html"
    ];

    const paginasSupervisor = [
        "dashboard.html",
        "tickets.html",
        "crear-ticket.html",
        "ticket-detalle.html",
        "usuarios.html",
        "reportes.html",
        "historial.html",
        "configuracion.html"
    ];

    const paginasAdmin = [
        "dashboard.html",
        "tickets.html",
        "crear-ticket.html",
        "ticket-detalle.html",
        "usuarios.html",
        "reportes.html",
        "historial.html",
        "configuracion.html"
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