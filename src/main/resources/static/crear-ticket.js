document.addEventListener("DOMContentLoaded", () => {
    inicializarLayout();
    configurarVistaPorRol();
    cargarTiposIncidencia();
    cargarUsuarios();
    configurarFormulario();
});

function configurarVistaPorRol() {
    const usuarioSesion = obtenerSesion();

    if (!usuarioSesion) {
        window.location.href = "login.html";
        return;
    }

    const descripcion = document.getElementById("descripcionCrearTicket");
    const info = document.getElementById("infoCrearTicket");

    if (usuarioSesion.rol === "CLIENTE") {
        if (descripcion) {
            descripcion.textContent =
                "Registra una nueva incidencia asociada a tu perfil.";
        }

        if (info) {
            info.textContent =
                "Este ticket se registrará automáticamente a tu nombre. También puedes adjuntar un archivo como evidencia.";
        }
    }

    if (usuarioSesion.rol === "AGENTE") {
        if (descripcion) {
            descripcion.textContent =
                "Registra una incidencia para seguimiento interno o atención de soporte.";
        }
    }

    if (
        usuarioSesion.rol === "ADMIN" ||
        usuarioSesion.rol === "SUPERVISOR"
    ) {
        if (descripcion) {
            descripcion.textContent =
                "Registra una nueva incidencia y asígnala al cliente correspondiente.";
        }

        if (info) {
            info.textContent =
                "El sistema usará el impacto y la urgencia para calcular la prioridad del ticket. Puedes adjuntar un archivo si es necesario.";
        }
    }
}

async function cargarTiposIncidencia() {
    const select = document.getElementById("tipoIncidenciaId");

    if (!select) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/tipos-incidencia`);

        if (!response.ok) {
            throw new Error(
                "No se pudieron cargar los tipos de incidencia."
            );
        }

        const tipos = await response.json();

        select.innerHTML = `
            <option value="">
                Seleccione un tipo de incidencia
            </option>
        `;

        tipos.forEach(tipo => {
            const option = document.createElement("option");
            option.value = tipo.id;
            option.textContent = tipo.nombre;
            select.appendChild(option);
        });

    } catch (error) {
        console.error(
            "Error cargando tipos de incidencia:",
            error
        );

        select.innerHTML = `
            <option value="">
                Error cargando tipos
            </option>
        `;
    }
}

async function cargarUsuarios() {
    const usuarioSesion = obtenerSesion();
    const select = document.getElementById("clienteId");
    const grupoCliente = document.getElementById("grupoClienteTicket");

    if (!usuarioSesion || !select) {
        return;
    }

    if (
        String(usuarioSesion.rol || "")
            .trim()
            .toUpperCase() === "CLIENTE"
    ) {
        select.innerHTML = `
            <option value="${usuarioSesion.id}" selected>
                ${escaparHtml(usuarioSesion.nombre || "Cliente")}
            </option>
        `;

        select.value = String(usuarioSesion.id);
        select.disabled = true;

        if (grupoCliente) {
            grupoCliente.style.display = "none";
        }

        return;
    }

    try {
        select.disabled = true;

        select.innerHTML = `
            <option value="">
                Cargando clientes...
            </option>
        `;

        const response = await fetch(`${API_BASE}/usuarios`);

        if (!response.ok) {
            throw new Error("No se pudieron cargar los usuarios.");
        }

        const usuarios = await response.json();

        console.log("Usuarios recibidos:", usuarios);

        const clientes = Array.isArray(usuarios)
            ? usuarios.filter(usuario => tieneRolCliente(usuario))
            : [];

        clientes.sort((clienteA, clienteB) => {
            const nombreA = construirNombreCompleto(clienteA)
                .toLowerCase();

            const nombreB = construirNombreCompleto(clienteB)
                .toLowerCase();

            return nombreA.localeCompare(nombreB, "es");
        });

        select.innerHTML = `
            <option value="">
                Seleccione un cliente
            </option>
        `;

        clientes.forEach(cliente => {
            const option = document.createElement("option");
            const nombreCompleto = construirNombreCompleto(cliente);

            option.value = cliente.id;
            option.textContent =
                `${nombreCompleto} - ${cliente.correo || "Sin correo"}`;

            select.appendChild(option);
        });

        if (clientes.length === 0) {
            select.innerHTML = `
                <option value="">
                    No hay clientes registrados
                </option>
            `;

            select.disabled = true;
        } else {
            select.disabled = false;
        }

        if (grupoCliente) {
            grupoCliente.style.display = "flex";
        }

    } catch (error) {
        console.error("Error cargando clientes:", error);

        select.innerHTML = `
            <option value="">
                Error cargando clientes
            </option>
        `;

        select.disabled = true;
    }
}

function tieneRolCliente(usuario) {
    const valoresRol = [];

    if (usuario?.rol) {
        if (typeof usuario.rol === "string") {
            valoresRol.push(usuario.rol);
        } else {
            valoresRol.push(
                usuario.rol.nombre,
                usuario.rol.name,
                usuario.rol.descripcion
            );
        }
    }

    valoresRol.push(
        usuario?.nombreRol,
        usuario?.rolNombre,
        usuario?.role,
        usuario?.roleName
    );

    if (Array.isArray(usuario?.roles)) {
        usuario.roles.forEach(rol => {
            if (typeof rol === "string") {
                valoresRol.push(rol);
            } else {
                valoresRol.push(
                    rol?.nombre,
                    rol?.name,
                    rol?.descripcion
                );
            }
        });
    }

    return valoresRol.some(valor =>
        String(valor || "")
            .trim()
            .toUpperCase() === "CLIENTE"
    );
}

function configurarFormulario() {
    const form = document.getElementById("crearTicketForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const usuarioSesion = obtenerSesion();

        if (!usuarioSesion) {
            window.location.href = "login.html";
            return;
        }

        const titulo =
            document.getElementById("titulo")?.value.trim() || "";

        const descripcion =
            document.getElementById("descripcion")?.value.trim() || "";

        const tipoIncidenciaId = Number(
            document.getElementById("tipoIncidenciaId")?.value
        );

        const clienteIdSelect =
            document.getElementById("clienteId");

        const clienteId =
            String(usuarioSesion.rol || "").toUpperCase() === "CLIENTE"
                ? Number(usuarioSesion.id)
                : Number(clienteIdSelect?.value);

        const data = {
            titulo,
            descripcion,
            tipoIncidenciaId,
            clienteId,
            severidad:
                document.getElementById("severidad")?.value || "",
            criticidad:
                document.getElementById("criticidad")?.value || "",
            impacto:
                document.getElementById("impacto")?.value || "",
            urgencia:
                document.getElementById("urgencia")?.value || ""
        };

        if (
            !data.titulo ||
            !data.descripcion ||
            !data.tipoIncidenciaId ||
            !data.clienteId
        ) {
            alert("Completa todos los campos obligatorios.");
            return;
        }

        await crearTicket(data);
    });
}

async function crearTicket(data) {
    const form = document.getElementById("crearTicketForm");

    const botonEnviar =
        form?.querySelector('button[type="submit"]');

    try {
        if (botonEnviar) {
            botonEnviar.disabled = true;
            botonEnviar.textContent = "Creando ticket...";
        }

        const response = await fetch(`${API_BASE}/tickets`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const mensajeError =
                await obtenerMensajeError(response);

            throw new Error(mensajeError);
        }

        const ticket = await response.json();

        await subirAdjuntoTicket(ticket.id);

        alert(
            `Ticket creado correctamente: ${
                ticket.numeroTicket || "#" + ticket.id
            }`
        );

        window.location.href =
            `ticket-detalle.html?id=${ticket.id}`;

    } catch (error) {
        console.error("Error creando ticket:", error);

        alert(
            error.message ||
            "Error creando el ticket. Revisa que Spring Boot esté corriendo y que los datos sean válidos."
        );

    } finally {
        if (botonEnviar) {
            botonEnviar.disabled = false;
            botonEnviar.textContent = "Crear ticket";
        }
    }
}

async function subirAdjuntoTicket(ticketId) {
    const inputArchivo =
        document.getElementById("archivoTicket");

    if (!inputArchivo) {
        return;
    }

    const archivo = inputArchivo.files[0];

    if (!archivo) {
        return;
    }

    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
        const response = await fetch(
            `${API_BASE}/adjuntos/ticket/${ticketId}`,
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {
            const errorTexto = await response.text();

            console.error(
                "Error subiendo adjunto:",
                errorTexto
            );

            alert(
                "El ticket fue creado, pero no se pudo subir el archivo adjunto."
            );

            return;
        }

        console.log(
            "Archivo adjunto subido correctamente."
        );

    } catch (error) {
        console.error("Error subiendo adjunto:", error);

        alert(
            "El ticket fue creado, pero ocurrió un error al subir el archivo adjunto."
        );
    }
}

function construirNombreCompleto(usuario) {
    const nombre = String(usuario?.nombre || "").trim();
    const apellido = String(usuario?.apellido || "").trim();

    const nombreCompleto =
        `${nombre} ${apellido}`.trim();

    return nombreCompleto || "Cliente";
}

async function obtenerMensajeError(response) {
    const tipoContenido =
        response.headers.get("content-type") || "";

    if (tipoContenido.includes("application/json")) {
        try {
            const contenido = await response.json();

            return (
                contenido.message ||
                contenido.error ||
                `Error ${response.status}`
            );

        } catch (error) {
            return `Error ${response.status}`;
        }
    }

    try {
        const texto = await response.text();

        return texto || `Error ${response.status}`;

    } catch (error) {
        return `Error ${response.status}`;
    }
}

function escaparHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
