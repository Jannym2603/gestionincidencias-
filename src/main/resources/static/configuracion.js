document.addEventListener("DOMContentLoaded", async () => {
    inicializarLayout();
    configurarAccesoAdministracionSistema();
    await cargarPerfilConfiguracion();
    configurarCambioPassword();
    configurarAdministracionSistema();
    configurarAcordeonModulos();
    configurarEtiquetasEstado();
    configurarModalAuditoria();
});

function mostrarSeccionConfig(seccion) {
    document.querySelectorAll(".config-section").forEach(item => {
        item.style.display = "none";
    });

    const mapa = {
        perfil: "seccionPerfil",
        password: "seccionPassword",
        sistema: "seccionSistema"
    };

    const id = mapa[seccion];
    const destino = id ? document.getElementById(id) : null;

    if (destino) {
        destino.style.display = "block";
    }

    if (seccion === "perfil") {
        cargarPerfilConfiguracion();
    }

    if (seccion === "sistema") {
        cargarModulosSistema();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function configurarAccesoAdministracionSistema() {
    const usuario = obtenerSesion();
    const opcion = document.getElementById("opcionAdministracionSistema");
    const seccion = document.getElementById("seccionSistema");
    const autorizado = usuario?.rol === "ADMIN";

    if (opcion) {
        opcion.style.display = autorizado ? "block" : "none";
    }

    if (!autorizado && seccion) {
        seccion.style.display = "none";
    }
}


function actualizarEtiquetasEstado() {
    document.querySelectorAll("[data-status-for]").forEach(etiqueta => {
        const checkbox = document.getElementById(
            etiqueta.dataset.statusFor
        );

        if (!checkbox) {
            return;
        }

        const activo = checkbox.checked;

        etiqueta.textContent = activo
            ? "ACTIVO"
            : "INACTIVO";

        etiqueta.classList.toggle(
            "inactivo",
            !activo
        );
    });
}


function configurarAcordeonModulos() {
    const items =
        document.querySelectorAll(".modulo-acordeon-item");

    items.forEach(item => {
        const boton =
            item.querySelector(".modulo-acordeon-header");

        const panel =
            item.querySelector(".modulo-acordeon-panel");

        if (!boton || !panel) {
            return;
        }

        boton.addEventListener("click", () => {
            const estabaAbierto =
                item.classList.contains("abierto");

            items.forEach(otro => {
                otro.classList.remove("abierto");

                const otroBoton =
                    otro.querySelector(".modulo-acordeon-header");

                if (otroBoton) {
                    otroBoton.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                }
            });

            if (!estabaAbierto) {
                item.classList.add("abierto");
                boton.setAttribute(
                    "aria-expanded",
                    "true"
                );
            }
        });
    });
}


function configurarEtiquetasEstado() {
    document.querySelectorAll("[data-status-for]").forEach(etiqueta => {
        const checkbox = document.getElementById(
            etiqueta.dataset.statusFor
        );

        if (!checkbox || checkbox.dataset.estadoConfigurado === "true") {
            return;
        }

        checkbox.addEventListener(
            "change",
            actualizarEtiquetasEstado
        );

        checkbox.dataset.estadoConfigurado = "true";
    });

    actualizarEtiquetasEstado();
}


function configurarAdministracionSistema() {
    const form = document.getElementById("modulosSistemaForm");
    const btnRestablecer = document.getElementById("btnRestablecerModulos");
    const btnVerAuditoria = document.getElementById("btnVerAuditoria");
    const usuario = obtenerSesion();

    if (!form || !usuario || usuario.rol !== "ADMIN") {
        return;
    }

    cargarModulosSistema();

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const botonGuardar = form.querySelector('button[type="submit"]');

        if (botonGuardar) {
            botonGuardar.disabled = true;
            botonGuardar.textContent = "Guardando...";
        }

        try {
            const flags = await actualizarFeatureFlagsGlobales({
                crearTicket: obtenerChecked("flagCrearTicket"),
                solicitudesRecursos: obtenerChecked("flagSolicitudesRecursos"),
                reportes: obtenerChecked("flagReportes"),
                historial: obtenerChecked("flagHistorial"),

                crearTicketCliente: obtenerChecked("flagCrearTicketCliente"),
                crearTicketAgente: obtenerChecked("flagCrearTicketAgente"),
                crearTicketSupervisor: obtenerChecked("flagCrearTicketSupervisor"),
                crearTicketAdmin: true,

                solicitudesRecursosCliente: obtenerChecked("flagSolicitudesRecursosCliente"),
                solicitudesRecursosAgente: obtenerChecked("flagSolicitudesRecursosAgente"),
                solicitudesRecursosSupervisor: obtenerChecked("flagSolicitudesRecursosSupervisor"),
                solicitudesRecursosAdmin: true,

                reportesCliente: obtenerChecked("flagReportesCliente"),
                reportesAgente: obtenerChecked("flagReportesAgente"),
                reportesSupervisor: obtenerChecked("flagReportesSupervisor"),
                reportesAdmin: true,

                historialCliente: obtenerChecked("flagHistorialCliente"),
                historialAgente: obtenerChecked("flagHistorialAgente"),
                historialSupervisor: obtenerChecked("flagHistorialSupervisor"),
                historialAdmin: true,

                varianteVisual: "A"
            });

            cargarModulosSistema(flags);
            mostrarMensajeModulos("Configuración del sistema guardada correctamente.");
        } catch (error) {
            console.error("Error guardando configuración del sistema:", error);
            mostrarMensajeModulos(error.message, true);
        } finally {
            if (botonGuardar) {
                botonGuardar.disabled = false;
                botonGuardar.textContent = "Guardar cambios";
            }
        }
    });

    btnVerAuditoria?.addEventListener("click", abrirModalAuditoria);

    btnRestablecer?.addEventListener("click", async () => {
        const confirmar = window.confirm(
            "¿Deseas activar nuevamente Crear Ticket, Solicitudes de Recursos, Reportes e Historial para todos los roles configurables?"
        );

        if (!confirmar) return;

        btnRestablecer.disabled = true;

        try {
            const flags = await actualizarFeatureFlagsGlobales({
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
                historialAdmin: true,

                varianteVisual: "A"
            });

            cargarModulosSistema(flags);
            mostrarMensajeModulos("Se restablecieron los módulos del sistema.");
        } catch (error) {
            console.error("Error restableciendo módulos:", error);
            mostrarMensajeModulos(error.message, true);
        } finally {
            btnRestablecer.disabled = false;
        }
    });
}

function obtenerChecked(id) {
    return Boolean(
        document.getElementById(id)?.checked
    );
}

function asignarChecked(id, valor) {
    const checkbox = document.getElementById(id);

    if (checkbox) {
        checkbox.checked = Boolean(valor);
    }
}

async function cargarModulosSistema(flags = null) {
    const usuario = obtenerSesion();

    if (!usuario || usuario.rol !== "ADMIN") {
        return;
    }

    const configuracion = flags || await cargarFeatureFlagsGlobales();

    asignarChecked("flagCrearTicket", configuracion.crearTicket);
    asignarChecked("flagSolicitudesRecursos", configuracion.solicitudesRecursos);
    asignarChecked("flagReportes", configuracion.reportes);
    asignarChecked("flagHistorial", configuracion.historial);

    asignarChecked("flagCrearTicketCliente", configuracion.crearTicketCliente);
    asignarChecked("flagCrearTicketAgente", configuracion.crearTicketAgente);
    asignarChecked("flagCrearTicketSupervisor", configuracion.crearTicketSupervisor);

    asignarChecked("flagSolicitudesRecursosCliente", configuracion.solicitudesRecursosCliente);
    asignarChecked("flagSolicitudesRecursosAgente", configuracion.solicitudesRecursosAgente);
    asignarChecked("flagSolicitudesRecursosSupervisor", configuracion.solicitudesRecursosSupervisor);

    asignarChecked("flagReportesCliente", configuracion.reportesCliente);
    asignarChecked("flagReportesAgente", configuracion.reportesAgente);
    asignarChecked("flagReportesSupervisor", configuracion.reportesSupervisor);

    asignarChecked("flagHistorialCliente", configuracion.historialCliente);
    asignarChecked("flagHistorialAgente", configuracion.historialAgente);
    asignarChecked("flagHistorialSupervisor", configuracion.historialSupervisor);

    actualizarEtiquetasEstado();
}

function mostrarMensajeModulos(mensaje, esError = false) {
    const elemento = document.getElementById("modulosSistemaMensaje");

    if (!elemento) return;

    elemento.textContent = mensaje;
    elemento.classList.toggle("error", esError);
    elemento.classList.add("visible");

    window.setTimeout(() => {
        elemento.classList.remove("visible");
        elemento.classList.remove("error");
    }, 4000);
}

function configurarModalAuditoria() {
    const modal = document.getElementById("modalAuditoriaConfiguracion");
    const btnCerrar = document.getElementById("btnCerrarAuditoria");
    const btnCerrarInferior = document.getElementById("btnCerrarAuditoriaInferior");
    const btnActualizar = document.getElementById("btnActualizarAuditoria");

    if (!modal) {
        return;
    }

    btnCerrar?.addEventListener("click", cerrarModalAuditoria);
    btnCerrarInferior?.addEventListener("click", cerrarModalAuditoria);
    btnActualizar?.addEventListener("click", cargarAuditoriaConfiguracion);

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            cerrarModalAuditoria();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && modal.classList.contains("activo")) {
            cerrarModalAuditoria();
        }
    });
}

async function abrirModalAuditoria() {
    const modal = document.getElementById("modalAuditoriaConfiguracion");

    if (!modal) {
        return;
    }

    modal.classList.add("activo");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-abierto");

    await cargarAuditoriaConfiguracion();
}

function cerrarModalAuditoria() {
    const modal = document.getElementById("modalAuditoriaConfiguracion");

    if (!modal) {
        return;
    }

    modal.classList.remove("activo");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-abierto");
}

async function cargarAuditoriaConfiguracion() {
    const lista = document.getElementById("listaAuditoriaConfiguracion");
    const total = document.getElementById("totalCambiosAuditoria");

    if (!lista) {
        return;
    }

    lista.innerHTML = '<p class="empty-message">Cargando historial...</p>';

    try {
        const response = await fetch(`${API_BASE}/configuracion-sistema/auditoria`);

        if (!response.ok) {
            throw new Error(
                await obtenerMensajeError(response) ||
                "No se pudo cargar el historial de cambios."
            );
        }

        const registros = await response.json();
        pintarAuditoriaConfiguracion(registros);

        if (total) {
            total.textContent = `${registros.length} ${registros.length === 1 ? "cambio registrado" : "cambios registrados"}`;
        }
    } catch (error) {
        console.error("Error cargando auditoría:", error);
        lista.innerHTML = `<p class="empty-message audit-error">${escaparHTML(error.message)}</p>`;

        if (total) {
            total.textContent = "No se pudo cargar el historial";
        }
    }
}

function pintarAuditoriaConfiguracion(registros) {
    const lista = document.getElementById("listaAuditoriaConfiguracion");

    if (!lista) {
        return;
    }

    if (!Array.isArray(registros) || registros.length === 0) {
        lista.innerHTML = '<p class="empty-message">Todavía no hay cambios registrados.</p>';
        return;
    }

    lista.innerHTML = registros.map(registro => {
        const cambios = obtenerCambiosAuditoria(registro);
        const cambiosHTML = cambios.length > 0
            ? cambios.map(cambio => `
                <div class="audit-change-row">
                    <span>${escaparHTML(cambio.nombre)}</span>
                    <div class="audit-change-values">
                        <strong class="audit-value previous">${escaparHTML(cambio.anterior)}</strong>
                        <span aria-hidden="true">→</span>
                        <strong class="audit-value current">${escaparHTML(cambio.nuevo)}</strong>
                    </div>
                </div>
            `).join("")
            : '<p class="audit-no-change">Se guardó la configuración sin modificar valores.</p>';

        return `
            <article class="audit-item">
                <div class="audit-item-header">
                    <div>
                        <strong>${escaparHTML(registro.usuarioNombre || "Usuario")}</strong>
                        <small>${escaparHTML(registro.usuarioCorreo || "Sin correo")}</small>
                    </div>
                    <time>${escaparHTML(formatearFechaHoraAuditoria(registro.fechaCambio))}</time>
                </div>
                <div class="audit-changes">${cambiosHTML}</div>
            </article>
        `;
    }).join("");
}

function obtenerCambiosAuditoria(registro) {
    const cambios = [];

    agregarCambioBooleano(cambios, "Crear Ticket", registro.crearTicketAnterior, registro.crearTicketNuevo);
    agregarCambioBooleano(cambios, "Reportes", registro.reportesAnterior, registro.reportesNuevo);
    agregarCambioBooleano(cambios, "Historial", registro.historialAnterior, registro.historialNuevo);

    return cambios;
}

function agregarCambioBooleano(cambios, nombre, anterior, nuevo) {
    if (Boolean(anterior) === Boolean(nuevo)) {
        return;
    }

    cambios.push({
        nombre,
        anterior: anterior ? "Activo" : "Inactivo",
        nuevo: nuevo ? "Activo" : "Inactivo"
    });
}

function formatearFechaHoraAuditoria(fecha) {
    if (!fecha) {
        return "Sin fecha";
    }

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
        return "Fecha inválida";
    }

    return valor.toLocaleString("es-PA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function cargarPerfilConfiguracion() {
    const usuarioSesion = obtenerSesion();

    if (!usuarioSesion) {
        window.location.href = "login.html";
        return;
    }

    try {
        /*
         * El perfil se consulta directamente desde el usuario
         * autenticado. Ya no se descarga la lista completa
         * de usuarios del sistema.
         */
        const response =
            await fetch(`${API_BASE}/usuarios/me`);

        if (!response.ok) {
            throw new Error(
                await obtenerMensajeError(response)
                || "No se pudo cargar el perfil."
            );
        }

        const usuarioActualizado =
            await response.json();

        const usuarioSesionActualizada = {
            id: usuarioActualizado.id,
            nombre: `${usuarioActualizado.nombre || ""} ${usuarioActualizado.apellido || ""}`.trim(),
            correo: usuarioActualizado.correo,
            rol: usuarioActualizado.rol || usuarioSesion.rol,
            token: usuarioSesion.token
        };

        guardarSesion(
            usuarioSesionActualizada
        );

        pintarDatosPerfil({
            ...usuarioSesionActualizada,
            telefono: usuarioActualizado.telefono || "-"
        });

        pintarUsuarioHeader();

    } catch (error) {
        console.error(
            "Error cargando perfil:",
            error
        );

        pintarDatosPerfil(
            usuarioSesion
        );

        pintarUsuarioHeader();
    }
}

function pintarDatosPerfil(usuario) {
    const campos = {
        perfilNombre: usuario.nombre,
        perfilCorreo: usuario.correo,
        perfilTelefono: usuario.telefono,
        perfilRol: usuario.rol
    };
    Object.entries(campos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.value = valor || "";
    });
}

function configurarCambioPassword() {
    const form = document.getElementById("configPasswordForm");
    const btnRecuperar = document.getElementById("btnRecuperarPasswordConfig");

    if (btnRecuperar) {
        btnRecuperar.addEventListener("click", () => {
            const continuar = window.confirm(
                "Para recuperar tu contraseña por correo debes salir de la sesión actual. ¿Deseas continuar?"
            );

            if (continuar) {
                cerrarSesion();
            }
        });
    }

    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const usuario = obtenerSesion();

        if (!usuario) {
            window.location.href = "login.html";
            return;
        }

        const passwordActual =
            document.getElementById("passwordActualConfig").value.trim();

        const nuevaPassword =
            document.getElementById("nuevaPasswordConfig").value.trim();

        const confirmarPassword =
            document.getElementById("confirmarPasswordConfig").value.trim();

        if (!passwordActual || !nuevaPassword || !confirmarPassword) {
            alert("Completa los tres campos.");
            return;
        }

        if (nuevaPassword.length < 6) {
            alert("La nueva contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (passwordActual === nuevaPassword) {
            alert("La nueva contraseña debe ser diferente de la contraseña actual.");
            return;
        }

        if (nuevaPassword !== confirmarPassword) {
            alert("La nueva contraseña y la confirmación no coinciden.");
            return;
        }

        await cambiarPasswordDesdeConfiguracion(
            passwordActual,
            nuevaPassword
        );
    });
}

async function cambiarPasswordDesdeConfiguracion(
    passwordActual,
    nuevaPassword
) {
    try {
        const response = await fetch(
            `${API_BASE}/auth/cambiar-password`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    passwordActual,
                    nuevaPassword
                })
            }
        );

        if (!response.ok) {
            alert(
                await obtenerMensajeError(response)
                || "No se pudo cambiar la contraseña."
            );
            return;
        }

        alert(
            "Contraseña actualizada correctamente. Por seguridad, vuelve a iniciar sesión."
        );

        cerrarSesion();

    } catch (error) {
        console.error(
            "Error cambiando contraseña:",
            error
        );

        alert(
            "Error cambiando contraseña. Revisa que Spring Boot esté corriendo."
        );
    }
}

async function obtenerMensajeError(response) {
    try {
        const data = await response.json();
        return data.message || null;
    } catch (error) {
        return null;
    }
}

function togglePasswordConfig(inputId, boton) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const mostrar = input.type === "password";
    input.type = mostrar ? "text" : "password";
    boton.textContent = mostrar ? "🙈" : "👁";
}
