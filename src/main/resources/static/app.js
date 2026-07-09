const API_BASE = "http://localhost:8081/api";

function guardarSesion(usuario) {
    // Limpia cualquier sesión vieja antes de guardar la nueva
    localStorage.removeItem("usuarioSistema");
    sessionStorage.setItem("usuarioSistema", JSON.stringify(usuario));
}

function obtenerSesion() {
    const data = sessionStorage.getItem("usuarioSistema");

    if (!data) {
        return null;
    }

    return JSON.parse(data);
}

function cerrarSesion() {
    sessionStorage.removeItem("usuarioSistema");
    localStorage.removeItem("usuarioSistema");
    window.location.href = "login.html";
}

function validarSesion() {
    const usuario = obtenerSesion();

    if (!usuario) {
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

    const nombreUsuario = document.getElementById("nombreUsuario");
    const rolUsuario = document.getElementById("rolUsuario");
    const avatarUsuario = document.getElementById("avatarUsuario");
    const userBox = document.querySelector(".user-box");

    if (nombreUsuario) {
        nombreUsuario.textContent = usuario.nombre || "Usuario";
    }

    if (rolUsuario) {
        rolUsuario.textContent = usuario.rol || "Rol";
    }

    if (avatarUsuario) {
        const nombre = usuario.nombre || "Usuario";

        const iniciales = nombre
            .split(" ")
            .map(palabra => palabra.charAt(0))
            .join("")
            .substring(0, 2)
            .toUpperCase();

        avatarUsuario.textContent = iniciales;
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

    const itemUsuarios = document.querySelector("[data-menu='usuarios']");
    const itemReportes = document.querySelector("[data-menu='reportes']");
    const itemHistorial = document.querySelector("[data-menu='historial']");
    const itemCrearTicket = document.querySelector("[data-menu='crear-ticket']");
    const itemConfiguracion = document.querySelector("[data-menu='configuracion']");

    if (rol === "CLIENTE") {
        if (itemUsuarios) itemUsuarios.style.display = "none";
        if (itemReportes) itemReportes.style.display = "none";
        if (itemHistorial) itemHistorial.style.display = "block";
        if (itemCrearTicket) itemCrearTicket.style.display = "block";
        if (itemConfiguracion) itemConfiguracion.style.display = "block";
    }

    if (rol === "AGENTE") {
        if (itemUsuarios) itemUsuarios.style.display = "none";
        if (itemReportes) itemReportes.style.display = "none";
        if (itemHistorial) itemHistorial.style.display = "block";
        if (itemCrearTicket) itemCrearTicket.style.display = "none";
        if (itemConfiguracion) itemConfiguracion.style.display = "block";
    }

    if (rol === "SUPERVISOR") {
        if (itemUsuarios) itemUsuarios.style.display = "block";
        if (itemReportes) itemReportes.style.display = "block";
        if (itemHistorial) itemHistorial.style.display = "block";
        if (itemCrearTicket) itemCrearTicket.style.display = "block";
        if (itemConfiguracion) itemConfiguracion.style.display = "block";
    }

    if (rol === "ADMIN") {
        if (itemUsuarios) itemUsuarios.style.display = "block";
        if (itemReportes) itemReportes.style.display = "block";
        if (itemHistorial) itemHistorial.style.display = "block";
        if (itemCrearTicket) itemCrearTicket.style.display = "block";
        if (itemConfiguracion) itemConfiguracion.style.display = "block";
    }
}

function bloquearPaginasPorRol() {
    const usuario = obtenerSesion();

    if (!usuario) {
        return;
    }

    const rol = usuario.rol;
    const paginaActual = window.location.pathname.split("/").pop();

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

    const btnLogout = document.getElementById("btnLogout");

    if (btnLogout) {
        btnLogout.addEventListener("click", cerrarSesion);
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

    return fechaObj.toLocaleDateString("es-PA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
}