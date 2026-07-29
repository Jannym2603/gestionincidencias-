document.addEventListener("DOMContentLoaded", async () => {
    inicializarLayout();
    configurarAccesoFeatureFlags();
    await cargarPerfilConfiguracion();
    configurarCambioPassword();
    configurarFeatureFlags();
    configurarModalAuditoria();
});

function mostrarSeccionConfig(seccion) {
    document.querySelectorAll(".config-section").forEach(item => {
        item.style.display = "none";
    });

    const mapa = {
        perfil: "seccionPerfil",
        password: "seccionPassword",
        features: "seccionFeatures"
    };

    const id = mapa[seccion];
    const destino = id ? document.getElementById(id) : null;

    if (destino) {
        destino.style.display = "block";
    }

    if (seccion === "perfil") {
        cargarPerfilConfiguracion();
    }

    if (seccion === "features") {
        cargarFeatureFlagsEnFormulario();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function configurarAccesoFeatureFlags() {
    const usuario = obtenerSesion();
    const opcion = document.getElementById("opcionFeatureFlags");
    const autorizado = usuario && ["ADMIN", "SUPERVISOR"].includes(usuario.rol);

    if (opcion) {
        opcion.style.display = autorizado ? "block" : "none";
    }
}

function configurarFeatureFlags() {
    const form = document.getElementById("featureFlagsForm");
    const btnRestablecer = document.getElementById("btnRestablecerFeatures");
    const btnVerAuditoria = document.getElementById("btnVerAuditoria");

    if (!form) {
        return;
    }

    cargarFeatureFlagsEnFormulario();

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const usuario = obtenerSesion();

        if (!usuario || !["ADMIN", "SUPERVISOR"].includes(usuario.rol)) {
            mostrarMensajeFeatures(
                "No tienes permiso para modificar esta configuración.",
                true
            );
            return;
        }

        const variante = document.querySelector(
            'input[name="varianteVisual"]:checked'
        );

        const botonGuardar = form.querySelector('button[type="submit"]');

        if (botonGuardar) {
            botonGuardar.disabled = true;
            botonGuardar.textContent = "Guardando...";
        }

        try {
            const flags = await actualizarFeatureFlagsGlobales({
                crearTicket: document.getElementById("flagCrearTicket").checked,
                reportes: document.getElementById("flagReportes").checked,
                historial: document.getElementById("flagHistorial").checked,
                varianteVisual: variante ? variante.value : "A"
            });

            cargarFeatureFlagsEnFormulario(flags);
            mostrarMensajeFeatures(
                "Configuración global guardada en PostgreSQL."
            );
        } catch (error) {
            console.error("Error guardando Feature Flags:", error);
            mostrarMensajeFeatures(error.message, true);
        } finally {
            if (botonGuardar) {
                botonGuardar.disabled = false;
                botonGuardar.textContent = "Guardar configuración";
            }
        }
    });

    if (btnVerAuditoria) {
        btnVerAuditoria.addEventListener("click", abrirModalAuditoria);
    }

    if (btnRestablecer) {
        btnRestablecer.addEventListener("click", async () => {
            const confirmar = window.confirm(
                "¿Deseas restablecer la configuración global predeterminada?"
            );

            if (!confirmar) {
                return;
            }

            btnRestablecer.disabled = true;

            try {
                const flags = await actualizarFeatureFlagsGlobales({
                    ...FEATURE_FLAGS_DEFAULT
                });

                cargarFeatureFlagsEnFormulario(flags);
                mostrarMensajeFeatures(
                    "Se restablecieron los valores globales predeterminados."
                );
            } catch (error) {
                console.error("Error restableciendo Feature Flags:", error);
                mostrarMensajeFeatures(error.message, true);
            } finally {
                btnRestablecer.disabled = false;
            }
        });
    }
}

async function cargarFeatureFlagsEnFormulario(flags = null) {
    let configuracion = flags;

    if (!configuracion) {
        configuracion = await cargarFeatureFlagsGlobales();
    }

    const crear = document.getElementById("flagCrearTicket");
    const reportes = document.getElementById("flagReportes");
    const historial = document.getElementById("flagHistorial");
    const variante = document.querySelector(
        `input[name="varianteVisual"][value="${configuracion.varianteVisual}"]`
    );

    if (crear) crear.checked = Boolean(configuracion.crearTicket);
    if (reportes) reportes.checked = Boolean(configuracion.reportes);
    if (historial) historial.checked = Boolean(configuracion.historial);
    if (variante) variante.checked = true;
}

function mostrarMensajeFeatures(mensaje, esError = false) {
    const elemento = document.getElementById("featureFlagsMensaje");

    if (!elemento) {
        return;
    }

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

    if (registro.varianteAnterior !== registro.varianteNueva) {
        cambios.push({
            nombre: "Variante visual",
            anterior: `Variante ${registro.varianteAnterior || "—"}`,
            nuevo: `Variante ${registro.varianteNueva || "—"}`
        });
    }

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
    if (!usuarioSesion) { window.location.href = "login.html"; return; }

    try {
        const response = await fetch(`${API_BASE}/usuarios`);
        if (!response.ok) throw new Error(await obtenerMensajeError(response) || "No se pudieron cargar los usuarios.");
        const usuarios = await response.json();
        const usuarioActualizado = usuarios.find(usuario => Number(usuario.id) === Number(usuarioSesion.id));
        if (!usuarioActualizado) throw new Error("Usuario no encontrado.");

        const usuarioSesionActualizada = {
            id: usuarioSesion.id,
            nombre: `${usuarioActualizado.nombre} ${usuarioActualizado.apellido}`.trim(),
            correo: usuarioActualizado.correo,
            rol: usuarioSesion.rol,
            token: usuarioSesion.token
        };

        guardarSesion(usuarioSesionActualizada);
        pintarDatosPerfil(usuarioSesionActualizada);
        pintarUsuarioHeader();
    } catch (error) {
        console.error("Error cargando perfil:", error);
        pintarDatosPerfil(usuarioSesion);
        pintarUsuarioHeader();
    }
}

function pintarDatosPerfil(usuario) {
    const campos = { perfilNombre: usuario.nombre, perfilCorreo: usuario.correo, perfilRol: usuario.rol };
    Object.entries(campos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.value = valor || "";
    });
}

function configurarCambioPassword() {
    const form = document.getElementById("configPasswordForm");
    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();
        const usuario = obtenerSesion();
        if (!usuario) { window.location.href = "login.html"; return; }

        const nuevaPassword = document.getElementById("nuevaPasswordConfig").value.trim();
        const confirmarPassword = document.getElementById("confirmarPasswordConfig").value.trim();

        if (!nuevaPassword || !confirmarPassword) return alert("Completa ambos campos.");
        if (nuevaPassword.length < 6) return alert("La contraseña debe tener al menos 6 caracteres.");
        if (nuevaPassword !== confirmarPassword) return alert("Las contraseñas no coinciden.");

        await cambiarPasswordDesdeConfiguracion(usuario.correo, nuevaPassword);
    });
}

async function cambiarPasswordDesdeConfiguracion(correo, nuevaPassword) {
    try {
        const response = await fetch(`${API_BASE}/auth/cambiar-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ correo, nuevaPassword })
        });

        if (!response.ok) {
            alert(await obtenerMensajeError(response) || "No se pudo cambiar la contraseña.");
            return;
        }

        alert("Contraseña actualizada correctamente. Por seguridad, vuelve a iniciar sesión.");
        cerrarSesion();
    } catch (error) {
        console.error("Error cambiando contraseña:", error);
        alert("Error cambiando contraseña. Revisa que Spring Boot esté corriendo.");
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
