let usuariosOriginales = [];
let usuarioSesionActual = null;
let modoEdicionUsuario = false;

document.addEventListener("DOMContentLoaded", () => {
    inicializarLayout();

    usuarioSesionActual = obtenerSesion();

    if (!usuarioSesionActual) {
        return;
    }

    if (
        usuarioSesionActual.rol !== "ADMIN"
        &&
        usuarioSesionActual.rol !== "SUPERVISOR"
    ) {
        alert("Solo ADMIN y SUPERVISOR pueden acceder a la gestión de usuarios.");
        redirigirSegunRol(usuarioSesionActual.rol);
        return;
    }

    const vistaRol = document.getElementById("vistaRol");

    if (vistaRol) {
        vistaRol.textContent = usuarioSesionActual.rol;
    }

    configurarRolesRegistroPorSesion(usuarioSesionActual.rol);
    configurarBotonesRegistro();
    configurarTablaUsuarios();
    configurarBusquedaUsuarios();
    configurarFormularioRegistro();
    cargarUsuarios();
});

function configurarRolesRegistroPorSesion(rolSesion) {
    const rol = String(rolSesion || "")
        .trim()
        .toUpperCase();

    const select = document.getElementById("rol");

    if (!select) {
        return;
    }

    restaurarOpcionesRol();

    if (rol === "SUPERVISOR") {
        Array.from(select.options).forEach(option => {
            if (
                option.value === "SUPERVISOR"
                ||
                option.value === "ADMIN"
            ) {
                option.remove();
            }
        });

        const descripcion = document.querySelector(".action-bar p");

        if (descripcion) {
            descripcion.textContent =
                "Consulta los usuarios registrados y crea o administra clientes y agentes.";
        }
    }
}

function restaurarOpcionesRol() {
    const select = document.getElementById("rol");

    if (!select) {
        return;
    }

    const rolActual = select.value;

    select.innerHTML = `
        <option value="">Seleccione un rol</option>
        <option value="CLIENTE">CLIENTE</option>
        <option value="AGENTE">AGENTE</option>
        <option value="SUPERVISOR">SUPERVISOR</option>
        <option value="ADMIN">ADMIN</option>
    `;

    if (
        rolActual
        &&
        Array.from(select.options).some(option => option.value === rolActual)
    ) {
        select.value = rolActual;
    }
}

async function cargarUsuarios() {
    try {
        const response = await fetch(`${API_BASE}/usuarios`);

        if (!response.ok) {
            throw new Error(
                await obtenerMensajeErrorUsuario(response)
                || "No se pudieron cargar los usuarios."
            );
        }

        usuariosOriginales = await response.json();

        if (!Array.isArray(usuariosOriginales)) {
            usuariosOriginales = [];
        }

        pintarResumenUsuarios(usuariosOriginales);
        pintarUsuarios(usuariosOriginales);

    } catch (error) {
        console.error("Error cargando usuarios:", error);

        const tbody = document.getElementById("usuariosBody");

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">No se pudieron cargar los usuarios.</td>
                </tr>
            `;
        }
    }
}

function pintarResumenUsuarios(usuarios) {
    const total = usuarios.length;
    const activos = usuarios.filter(usuario => usuario.estado === true).length;
    const inactivos = usuarios.filter(usuario => usuario.estado === false).length;

    const totalUsuariosVista = document.getElementById("totalUsuariosVista");
    const usuariosActivos = document.getElementById("usuariosActivos");
    const usuariosInactivos = document.getElementById("usuariosInactivos");

    if (totalUsuariosVista) {
        totalUsuariosVista.textContent = total;
    }

    if (usuariosActivos) {
        usuariosActivos.textContent = activos;
    }

    if (usuariosInactivos) {
        usuariosInactivos.textContent = inactivos;
    }
}

function pintarUsuarios(usuarios) {
    const tbody = document.getElementById("usuariosBody");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (usuarios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">No hay usuarios registrados.</td>
            </tr>
        `;
        return;
    }

    usuarios.forEach(usuario => {
        const tr = document.createElement("tr");

        const estadoTexto =
            usuario.estado
                ? "ACTIVO"
                : "INACTIVO";

        const estadoClase =
            usuario.estado
                ? "badge-resuelto"
                : "badge-cerrado";

        const rol = String(usuario.rol || "-").toUpperCase();

        const puedeAdministrar =
            puedeAdministrarUsuario(usuario);

        const esMismoUsuario =
            Number(usuario.id) === Number(usuarioSesionActual?.id);

        const botones = puedeAdministrar
            ? `
                <div class="user-actions">
                    <button
                        type="button"
                        class="secondary-btn user-action-btn"
                        data-user-action="edit"
                        data-user-id="${usuario.id}"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        class="secondary-btn user-action-btn ${usuario.estado ? "user-action-danger" : "user-action-success"}"
                        data-user-action="toggle"
                        data-user-id="${usuario.id}"
                        data-user-state="${usuario.estado ? "false" : "true"}"
                        ${esMismoUsuario && usuario.estado ? "disabled title=\"No puedes desactivar tu propia cuenta\"" : ""}
                    >
                        ${usuario.estado ? "Desactivar" : "Activar"}
                    </button>
                </div>
            `
            : `<span class="user-no-actions">Solo lectura</span>`;

        tr.innerHTML = `
            <td>${usuario.id}</td>

            <td>
                ${escaparHtmlUsuario(usuario.nombre)}
                ${escaparHtmlUsuario(usuario.apellido)}
            </td>

            <td>${escaparHtmlUsuario(usuario.correo)}</td>

            <td>${escaparHtmlUsuario(usuario.telefono || "-")}</td>

            <td>
                <span class="badge user-role-badge">
                    ${escaparHtmlUsuario(rol)}
                </span>
            </td>

            <td>
                <span class="badge ${estadoClase}">
                    ${estadoTexto}
                </span>
            </td>

            <td>${formatearFecha(usuario.fechaCreacion)}</td>

            <td>${botones}</td>
        `;

        tbody.appendChild(tr);
    });
}

function puedeAdministrarUsuario(usuario) {
    const rolSesion =
        String(usuarioSesionActual?.rol || "")
            .toUpperCase();

    const rolObjetivo =
        String(usuario?.rol || "")
            .toUpperCase();

    if (rolSesion === "ADMIN") {
        return true;
    }

    if (rolSesion === "SUPERVISOR") {
        return (
            rolObjetivo === "CLIENTE"
            ||
            rolObjetivo === "AGENTE"
        );
    }

    return false;
}

function configurarTablaUsuarios() {
    const tbody = document.getElementById("usuariosBody");

    if (!tbody) {
        return;
    }

    tbody.addEventListener("click", async event => {
        const boton =
            event.target.closest("[data-user-action]");

        if (!boton || boton.disabled) {
            return;
        }

        const usuarioId =
            Number(boton.dataset.userId);

        const accion =
            boton.dataset.userAction;

        if (accion === "edit") {
            abrirEdicionUsuario(usuarioId);
            return;
        }

        if (accion === "toggle") {
            const nuevoEstado =
                boton.dataset.userState === "true";

            await cambiarEstadoUsuario(
                usuarioId,
                nuevoEstado
            );
        }
    });
}

function configurarBusquedaUsuarios() {
    const input = document.getElementById("buscarUsuario");

    if (!input) {
        return;
    }

    input.addEventListener("input", () => {
        const texto =
            input.value
                .trim()
                .toLowerCase();

        const usuariosFiltrados =
            usuariosOriginales.filter(usuario =>
                String(usuario.nombre || "")
                    .toLowerCase()
                    .includes(texto)
                ||
                String(usuario.apellido || "")
                    .toLowerCase()
                    .includes(texto)
                ||
                String(usuario.correo || "")
                    .toLowerCase()
                    .includes(texto)
                ||
                String(usuario.telefono || "")
                    .toLowerCase()
                    .includes(texto)
                ||
                String(usuario.rol || "")
                    .toLowerCase()
                    .includes(texto)
            );

        pintarUsuarios(usuariosFiltrados);
    });
}

function configurarBotonesRegistro() {
    const btnMostrar = document.getElementById("btnMostrarRegistro");
    const btnOcultar = document.getElementById("btnOcultarRegistro");
    const cardRegistro = document.getElementById("registroUsuarioCard");

    if (!cardRegistro) {
        return;
    }

    cardRegistro.classList.add("oculto");

    btnMostrar?.classList.remove("oculto");

    btnMostrar?.addEventListener("click", () => {
        prepararFormularioNuevoUsuario();

        cardRegistro.classList.remove("oculto");
        btnMostrar.classList.add("oculto");

        cardRegistro.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

    btnOcultar?.addEventListener("click", () => {
        cerrarFormularioUsuario();
    });
}

function prepararFormularioNuevoUsuario() {
    modoEdicionUsuario = false;

    const form =
        document.getElementById("registroUsuarioForm");

    form?.reset();

    document.getElementById("usuarioIdEdicion").value = "";

    document.getElementById("tituloFormularioUsuario").textContent =
        "Crear usuario";

    document.getElementById("descripcionFormularioUsuario").textContent =
        "Completa la información para registrar un nuevo usuario.";

    document.getElementById("btnGuardarUsuario").textContent =
        "Crear usuario";

    configurarCamposPassword(false);

    configurarRolesRegistroPorSesion(
        usuarioSesionActual?.rol
    );
}

function abrirEdicionUsuario(usuarioId) {
    const usuario =
        usuariosOriginales.find(
            item => Number(item.id) === Number(usuarioId)
        );

    if (!usuario) {
        alert("No se encontró el usuario seleccionado.");
        return;
    }

    if (!puedeAdministrarUsuario(usuario)) {
        alert("No tienes permiso para editar este usuario.");
        return;
    }

    modoEdicionUsuario = true;

    const card =
        document.getElementById("registroUsuarioCard");

    const btnMostrar =
        document.getElementById("btnMostrarRegistro");

    document.getElementById("usuarioIdEdicion").value =
        usuario.id;

    document.getElementById("nombre").value =
        usuario.nombre || "";

    document.getElementById("apellido").value =
        usuario.apellido || "";

    document.getElementById("correo").value =
        usuario.correo || "";

    document.getElementById("telefono").value =
        usuario.telefono || "";

    restaurarOpcionesRol();

    if (
        usuarioSesionActual?.rol === "SUPERVISOR"
    ) {
        configurarRolesRegistroPorSesion("SUPERVISOR");
    }

    const selectRol =
        document.getElementById("rol");

    if (
        Array.from(selectRol.options)
            .some(option => option.value === usuario.rol)
    ) {
        selectRol.value = usuario.rol;
    }

    document.getElementById("tituloFormularioUsuario").textContent =
        "Editar usuario";

    document.getElementById("descripcionFormularioUsuario").textContent =
        "Modifica los datos generales y el rol del usuario.";

    document.getElementById("btnGuardarUsuario").textContent =
        "Guardar cambios";

    configurarCamposPassword(true);

    card?.classList.remove("oculto");
    btnMostrar?.classList.add("oculto");

    card?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function configurarCamposPassword(esEdicion) {
    const password =
        document.getElementById("password");

    const confirmar =
        document.getElementById("confirmarPassword");

    const labelPassword =
        document.getElementById("labelPasswordUsuario");

    const labelConfirmar =
        document.getElementById("labelConfirmarPasswordUsuario");

    if (!password || !confirmar) {
        return;
    }

    password.value = "";
    confirmar.value = "";

    password.required = !esEdicion;
    confirmar.required = !esEdicion;

    password.placeholder =
        esEdicion
            ? "Déjalo vacío para conservar la contraseña actual"
            : "";

    confirmar.placeholder =
        esEdicion
            ? "Repite la nueva contraseña solo si deseas cambiarla"
            : "";

    if (labelPassword) {
        labelPassword.textContent =
            esEdicion
                ? "Nueva contraseña (opcional)"
                : "Contraseña inicial";
    }

    if (labelConfirmar) {
        labelConfirmar.textContent =
            esEdicion
                ? "Confirmar nueva contraseña"
                : "Confirmar contraseña";
    }
}

function cerrarFormularioUsuario() {
    const cardRegistro =
        document.getElementById("registroUsuarioCard");

    const btnMostrar =
        document.getElementById("btnMostrarRegistro");

    const form =
        document.getElementById("registroUsuarioForm");

    form?.reset();

    document.getElementById("usuarioIdEdicion").value = "";

    modoEdicionUsuario = false;

    cardRegistro?.classList.add("oculto");
    btnMostrar?.classList.remove("oculto");

    configurarCamposPassword(false);

    configurarRolesRegistroPorSesion(
        usuarioSesionActual?.rol
    );
}

function configurarFormularioRegistro() {
    const form =
        document.getElementById("registroUsuarioForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const id =
            Number(
                document.getElementById("usuarioIdEdicion").value
            );

        const data = {
            nombre:
                document.getElementById("nombre")
                    .value
                    .trim(),

            apellido:
                document.getElementById("apellido")
                    .value
                    .trim(),

            correo:
                document.getElementById("correo")
                    .value
                    .trim()
                    .toLowerCase(),

            telefono:
                document.getElementById("telefono")
                    .value
                    .trim(),

            password:
                document.getElementById("password")
                    .value,

            rol:
                document.getElementById("rol")
                    .value
        };

        const confirmarPassword =
            document.getElementById("confirmarPassword")
                .value;

        if (
            !data.nombre
            ||
            !data.apellido
            ||
            !data.correo
            ||
            !data.rol
        ) {
            alert("Completa todos los campos obligatorios.");
            return;
        }

        if (!modoEdicionUsuario && !data.password) {
            alert("La contraseña es obligatoria.");
            return;
        }

        if (
            data.password
            &&
            data.password.length < 6
        ) {
            alert("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (data.password !== confirmarPassword) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        if (modoEdicionUsuario && id) {
            await actualizarUsuario(id, data);
        } else {
            await registrarUsuario(data);
        }
    });
}

async function registrarUsuario(data) {
    try {
        const response =
            await fetch(
                `${API_BASE}/usuarios`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                }
            );

        if (!response.ok) {
            alert(
                await obtenerMensajeErrorUsuario(response)
                ||
                "No se pudo crear el usuario."
            );

            return;
        }

        alert("Usuario creado correctamente.");

        cerrarFormularioUsuario();

        await cargarUsuarios();

    } catch (error) {
        console.error("Error creando usuario:", error);

        alert(
            "No se pudo crear el usuario. Verifica que el backend esté corriendo."
        );
    }
}

async function actualizarUsuario(id, data) {
    try {
        const response =
            await fetch(
                `${API_BASE}/usuarios/${id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                }
            );

        if (!response.ok) {
            alert(
                await obtenerMensajeErrorUsuario(response)
                ||
                "No se pudo actualizar el usuario."
            );

            return;
        }

        alert("Usuario actualizado correctamente.");

        cerrarFormularioUsuario();

        await cargarUsuarios();

    } catch (error) {
        console.error("Error actualizando usuario:", error);

        alert("No se pudo actualizar el usuario.");
    }
}

async function cambiarEstadoUsuario(
    usuarioId,
    nuevoEstado
) {
    const usuario =
        usuariosOriginales.find(
            item =>
                Number(item.id)
                ===
                Number(usuarioId)
        );

    if (!usuario) {
        return;
    }

    const accion =
        nuevoEstado
            ? "activar"
            : "desactivar";

    const confirmado =
        confirm(
            `¿Deseas ${accion} a ${usuario.nombre} ${usuario.apellido}?`
        );

    if (!confirmado) {
        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE}/usuarios/${usuarioId}/estado`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        estado: nuevoEstado
                    })
                }
            );

        if (!response.ok) {
            alert(
                await obtenerMensajeErrorUsuario(response)
                ||
                `No se pudo ${accion} el usuario.`
            );

            return;
        }

        await cargarUsuarios();

    } catch (error) {
        console.error(
            "Error cambiando estado de usuario:",
            error
        );

        alert(
            `No se pudo ${accion} el usuario.`
        );
    }
}

function togglePasswordUsuario(inputId, boton) {
    const input =
        document.getElementById(inputId);

    if (!input) {
        return;
    }

    const mostrar =
        input.type === "password";

    input.type =
        mostrar
            ? "text"
            : "password";

    boton.textContent =
        mostrar
            ? "🙈"
            : "👁";
}

function escaparHtmlUsuario(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function obtenerMensajeErrorUsuario(response) {
    try {
        const data =
            await response.json();

        return (
            data?.message
            ||
            data?.error
            ||
            null
        );

    } catch (error) {
        try {
            return await response.text();
        } catch {
            return null;
        }
    }
}
