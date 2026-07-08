let usuariosOriginales = [];

document.addEventListener("DOMContentLoaded", () => {
    inicializarLayout();

    const usuario = obtenerSesion();

    if (usuario.rol !== "ADMIN" && usuario.rol !== "SUPERVISOR") {
        alert("Solo ADMIN y SUPERVISOR pueden acceder a la gestión de usuarios.");
        redirigirSegunRol(usuario.rol);
        return;
    }

    document.getElementById("vistaRol").textContent = usuario.rol;

    cargarUsuarios();
    configurarBusquedaUsuarios();
    configurarFormularioRegistro();
    configurarBotonesRegistro();
});

async function cargarUsuarios() {
    try {
        const response = await fetch(`${API_BASE}/usuarios`);

        if (!response.ok) {
            throw new Error("No se pudieron cargar los usuarios");
        }

        usuariosOriginales = await response.json();

        pintarResumenUsuarios(usuariosOriginales);
        pintarUsuarios(usuariosOriginales);

    } catch (error) {
        console.error("Error cargando usuarios:", error);

        const tbody = document.getElementById("usuariosBody");
        tbody.innerHTML = `
            <tr>
                <td colspan="6">No se pudieron cargar los usuarios.</td>
            </tr>
        `;
    }
}

function pintarResumenUsuarios(usuarios) {
    const total = usuarios.length;
    const activos = usuarios.filter(usuario => usuario.estado === true).length;
    const inactivos = usuarios.filter(usuario => usuario.estado === false).length;

    document.getElementById("totalUsuariosVista").textContent = total;
    document.getElementById("usuariosActivos").textContent = activos;
    document.getElementById("usuariosInactivos").textContent = inactivos;
}

function pintarUsuarios(usuarios) {
    const tbody = document.getElementById("usuariosBody");
    tbody.innerHTML = "";

    if (usuarios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">No hay usuarios registrados.</td>
            </tr>
        `;
        return;
    }

    usuarios.forEach(usuario => {
        const tr = document.createElement("tr");

        const estadoTexto = usuario.estado ? "ACTIVO" : "INACTIVO";
        const estadoClase = usuario.estado ? "badge-resuelto" : "badge-cerrado";

        tr.innerHTML = `
            <td>${usuario.id}</td>
            <td>${usuario.nombre} ${usuario.apellido}</td>
            <td>${usuario.correo}</td>
            <td>${usuario.telefono || "-"}</td>
            <td>
                <span class="badge ${estadoClase}">
                    ${estadoTexto}
                </span>
            </td>
            <td>${formatearFecha(usuario.fechaCreacion)}</td>
        `;

        tbody.appendChild(tr);
    });
}

function configurarBusquedaUsuarios() {
    const input = document.getElementById("buscarUsuario");

    input.addEventListener("input", () => {
        const texto = input.value.toLowerCase();

        const usuariosFiltrados = usuariosOriginales.filter(usuario =>
            usuario.nombre.toLowerCase().includes(texto) ||
            usuario.apellido.toLowerCase().includes(texto) ||
            usuario.correo.toLowerCase().includes(texto) ||
            (usuario.telefono && usuario.telefono.toLowerCase().includes(texto))
        );

        pintarUsuarios(usuariosFiltrados);
    });
}

function configurarBotonesRegistro() {
    const btnMostrar = document.getElementById("btnMostrarRegistro");
    const btnOcultar = document.getElementById("btnOcultarRegistro");
    const cardRegistro = document.getElementById("registroUsuarioCard");

    btnMostrar.addEventListener("click", () => {
        cardRegistro.style.display = "block";
        btnMostrar.style.display = "none";
        cardRegistro.scrollIntoView({ behavior: "smooth" });
    });

    btnOcultar.addEventListener("click", () => {
        cardRegistro.style.display = "none";
        btnMostrar.style.display = "inline-block";
    });
}

function configurarFormularioRegistro() {
    const form = document.getElementById("registroUsuarioForm");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = {
            nombre: document.getElementById("nombre").value.trim(),
            apellido: document.getElementById("apellido").value.trim(),
            correo: document.getElementById("correo").value.trim().toLowerCase(),
            telefono: document.getElementById("telefono").value.trim(),
            password: document.getElementById("password").value.trim(),
            rol: document.getElementById("rol").value
        };

        const confirmarPassword = document.getElementById("confirmarPassword").value.trim();

        if (!data.nombre || !data.apellido || !data.correo || !data.password || !data.rol) {
            alert("Completa todos los campos obligatorios.");
            return;
        }

        if (data.password.length < 6) {
            alert("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (data.password !== confirmarPassword) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        await registrarUsuario(data);
    });
}

async function registrarUsuario(data) {
    try {
        const response = await fetch(`${API_BASE}/usuarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            alert("No se pudo registrar el usuario. Revisa si el correo ya existe.");
            return;
        }

        alert("Usuario registrado correctamente.");

        document.getElementById("registroUsuarioForm").reset();

        document.getElementById("registroUsuarioCard").style.display = "none";
        document.getElementById("btnMostrarRegistro").style.display = "inline-block";

        await cargarUsuarios();

    } catch (error) {
        console.error("Error registrando usuario:", error);
        alert("No se pudo registrar el usuario. Verifica que el backend esté corriendo.");
    }
}

function togglePasswordUsuario(inputId, boton) {
    const input = document.getElementById(inputId);

    if (!input) {
        return;
    }

    if (input.type === "password") {
        input.type = "text";
        boton.textContent = "🙈";
    } else {
        input.type = "password";
        boton.textContent = "👁";
    }
}