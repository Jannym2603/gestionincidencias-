const API_BASE = "http://localhost:8081/api";

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

    const btnLogout =
        document.getElementById("btnLogout");

    if (btnLogout) {
        btnLogout.addEventListener(
            "click",
            cerrarSesion
        );
    }
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