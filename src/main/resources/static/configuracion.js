document.addEventListener("DOMContentLoaded", async () => {
    inicializarLayout();

    await cargarPerfilConfiguracion();

    configurarCambioPassword();
});

function mostrarSeccionConfig(seccion) {
    const secciones = document.querySelectorAll(".config-section");

    secciones.forEach(item => {
        item.style.display = "none";
    });

    if (seccion === "perfil") {
        document.getElementById("seccionPerfil").style.display = "block";
        cargarPerfilConfiguracion();
    }

    if (seccion === "password") {
        document.getElementById("seccionPassword").style.display = "block";
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

async function cargarPerfilConfiguracion() {
    const usuarioSesion = obtenerSesion();

    if (!usuarioSesion) {
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/usuarios`);

        if (!response.ok) {
            throw new Error("No se pudieron cargar los usuarios.");
        }

        const usuarios = await response.json();

        const usuarioActualizado = usuarios.find(
            usuario => Number(usuario.id) === Number(usuarioSesion.id)
        );

        if (!usuarioActualizado) {
            throw new Error("Usuario no encontrado.");
        }

        const nombreCompleto = `${usuarioActualizado.nombre} ${usuarioActualizado.apellido}`.trim();

        const usuarioSesionActualizada = {
            id: usuarioSesion.id,
            nombre: nombreCompleto,
            correo: usuarioActualizado.correo,
            rol: usuarioSesion.rol
        };

        sessionStorage.setItem("usuarioSistema", JSON.stringify(usuarioSesionActualizada));
        localStorage.removeItem("usuarioSistema");

        pintarDatosPerfil(usuarioSesionActualizada);
        pintarUsuarioHeader();

    } catch (error) {
        console.error("Error cargando perfil:", error);

        pintarDatosPerfil(usuarioSesion);
        pintarUsuarioHeader();
    }
}

function pintarDatosPerfil(usuario) {
    const perfilNombre = document.getElementById("perfilNombre");
    const perfilCorreo = document.getElementById("perfilCorreo");
    const perfilRol = document.getElementById("perfilRol");

    if (perfilNombre) {
        perfilNombre.value = usuario.nombre || "";
    }

    if (perfilCorreo) {
        perfilCorreo.value = usuario.correo || "";
    }

    if (perfilRol) {
        perfilRol.value = usuario.rol || "";
    }
}

function configurarCambioPassword() {
    const form = document.getElementById("configPasswordForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const usuario = obtenerSesion();

        if (!usuario) {
            window.location.href = "login.html";
            return;
        }

        const nuevaPassword = document.getElementById("nuevaPasswordConfig").value.trim();
        const confirmarPassword = document.getElementById("confirmarPasswordConfig").value.trim();

        if (!nuevaPassword || !confirmarPassword) {
            alert("Completa ambos campos.");
            return;
        }

        if (nuevaPassword.length < 6) {
            alert("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (nuevaPassword !== confirmarPassword) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        await cambiarPasswordDesdeConfiguracion(usuario.correo, nuevaPassword);
    });
}

async function cambiarPasswordDesdeConfiguracion(correo, nuevaPassword) {
    try {
        const response = await fetch(`${API_BASE}/auth/cambiar-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                correo: correo,
                nuevaPassword: nuevaPassword
            })
        });

        if (!response.ok) {
            const mensaje = await obtenerMensajeError(response);
            alert(mensaje || "No se pudo cambiar la contraseña.");
            return;
        }

        alert("Contraseña actualizada correctamente. Por seguridad, vuelve a iniciar sesión.");

        sessionStorage.removeItem("usuarioSistema");
        localStorage.removeItem("usuarioSistema");

        window.location.href = "login.html";

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