document.addEventListener("DOMContentLoaded", () => {
    configurarLogin();
    configurarRecuperacionPassword();
});

function configurarLogin() {
    const form = document.getElementById("loginForm");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const correo = document.getElementById("correo").value.trim().toLowerCase();
        const password = document.getElementById("password").value.trim();

        if (!correo || !password) {
            alert("Debes ingresar correo y contrasena.");
            return;
        }

        await iniciarSesion(correo, password);
    });
}

async function iniciarSesion(correo, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                correo: correo,
                password: password
            })
        });

        if (!response.ok) {
            const mensaje = await obtenerMensajeError(response);
            alert(mensaje || "Correo o contrasena incorrectos.");
            return;
        }

        const usuarioSesion = await response.json();

        guardarSesion(usuarioSesion);
        redirigirSegunRol(usuarioSesion.rol);

    } catch (error) {
        console.error("Error iniciando sesion:", error);
        alert("Error iniciando sesion. Revisa que Spring Boot este corriendo.");
    }
}

function configurarRecuperacionPassword() {
    const btnMostrar = document.getElementById("btnMostrarRecuperar");
    const btnVolver = document.getElementById("btnVolverLogin");
    const btnEnviarCodigo = document.getElementById("btnEnviarCodigoRecuperacion");
    const loginSection = document.getElementById("loginSection");
    const recuperarSection = document.getElementById("recuperarPasswordSection");
    const codigoBox = document.getElementById("codigoRecuperacionBox");
    const form = document.getElementById("recuperarPasswordForm");

    btnMostrar.addEventListener("click", () => {
        loginSection.style.display = "none";
        recuperarSection.style.display = "block";
        codigoBox.style.display = "none";
        btnEnviarCodigo.style.display = "block";
        form.reset();
    });

    btnVolver.addEventListener("click", () => {
        recuperarSection.style.display = "none";
        loginSection.style.display = "block";
        codigoBox.style.display = "none";
        btnEnviarCodigo.style.display = "block";
        form.reset();
    });

    btnEnviarCodigo.addEventListener("click", async () => {
        const correo = document.getElementById("correoRecuperacion").value.trim().toLowerCase();

        if (!correo) {
            alert("Ingresa tu correo registrado.");
            return;
        }

        await solicitarCodigoRecuperacion(correo);
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const correo = document.getElementById("correoRecuperacion").value.trim().toLowerCase();
        const codigo = document.getElementById("codigoRecuperacion").value.trim();
        const nuevaPassword = document.getElementById("nuevaPassword").value.trim();
        const confirmarPassword = document.getElementById("confirmarPassword").value.trim();

        if (!correo || !codigo || !nuevaPassword || !confirmarPassword) {
            alert("Completa todos los campos.");
            return;
        }

        if (codigo.length !== 6) {
            alert("El codigo debe tener 6 digitos.");
            return;
        }

        if (nuevaPassword.length < 6) {
            alert("La contrasena debe tener al menos 6 caracteres.");
            return;
        }

        if (nuevaPassword !== confirmarPassword) {
            alert("Las contrasenas no coinciden.");
            return;
        }

        await confirmarRecuperacionPassword(correo, codigo, nuevaPassword);
    });
}

async function solicitarCodigoRecuperacion(correo) {
    try {
        const response = await fetch(`${API_BASE}/auth/solicitar-recuperacion`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                correo: correo
            })
        });

        if (!response.ok) {
            const mensaje = await obtenerMensajeError(response);
            alert(mensaje || "No se pudo enviar el codigo. Verifica el correo ingresado.");
            return;
        }

        alert("Codigo enviado al correo registrado. Revisa tu bandeja de entrada o spam.");

        document.getElementById("codigoRecuperacionBox").style.display = "block";
        document.getElementById("btnEnviarCodigoRecuperacion").style.display = "none";

    } catch (error) {
        console.error("Error solicitando codigo:", error);
        alert("Error enviando el codigo. Revisa que Spring Boot este corriendo.");
    }
}

async function confirmarRecuperacionPassword(correo, codigo, nuevaPassword) {
    try {
        const response = await fetch(`${API_BASE}/auth/confirmar-recuperacion`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                correo: correo,
                codigo: codigo,
                nuevaPassword: nuevaPassword
            })
        });

        if (!response.ok) {
            const mensaje = await obtenerMensajeError(response);
            alert(mensaje || "No se pudo cambiar la contrasena. Verifica el codigo ingresado.");
            return;
        }

        alert("Contrasena actualizada correctamente. Ahora puedes iniciar sesion.");

        document.getElementById("recuperarPasswordForm").reset();
        document.getElementById("correo").value = correo;
        document.getElementById("password").value = "";

        document.getElementById("codigoRecuperacionBox").style.display = "none";
        document.getElementById("btnEnviarCodigoRecuperacion").style.display = "block";
        document.getElementById("recuperarPasswordSection").style.display = "none";
        document.getElementById("loginSection").style.display = "block";

    } catch (error) {
        console.error("Error cambiando contrasena:", error);
        alert("Error cambiando contrasena. Revisa que Spring Boot este corriendo.");
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

function togglePassword(inputId, boton) {
    const input = document.getElementById(inputId);

    if (input.type === "password") {
        input.type = "text";
        boton.textContent = "🙈";
    } else {
        input.type = "password";
        boton.textContent = "👁";
    }
}
