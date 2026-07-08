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
            descripcion.textContent = "Registra una nueva incidencia asociada a tu perfil.";
        }

        if (info) {
            info.textContent = "Este ticket se registrará automáticamente a tu nombre. También puedes adjuntar un archivo como evidencia.";
        }
    }

    if (usuarioSesion.rol === "AGENTE") {
        if (descripcion) {
            descripcion.textContent = "Registra una incidencia para seguimiento interno o atención de soporte.";
        }
    }

    if (usuarioSesion.rol === "ADMIN" || usuarioSesion.rol === "SUPERVISOR") {
        if (descripcion) {
            descripcion.textContent = "Registra una nueva incidencia y asígnala al cliente correspondiente.";
        }

        if (info) {
            info.textContent = "El sistema usará el impacto y la urgencia para calcular la prioridad del ticket. Puedes adjuntar un archivo si es necesario.";
        }
    }
}

async function cargarTiposIncidencia() {
    try {
        const response = await fetch(`${API_BASE}/tipos-incidencia`);

        if (!response.ok) {
            throw new Error("No se pudieron cargar los tipos de incidencia");
        }

        const tipos = await response.json();
        const select = document.getElementById("tipoIncidenciaId");

        select.innerHTML = `<option value="">Seleccione un tipo de incidencia</option>`;

        tipos.forEach(tipo => {
            const option = document.createElement("option");
            option.value = tipo.id;
            option.textContent = tipo.nombre;
            select.appendChild(option);
        });

    } catch (error) {
        console.error("Error cargando tipos de incidencia:", error);

        const select = document.getElementById("tipoIncidenciaId");
        select.innerHTML = `<option value="">Error cargando tipos</option>`;
    }
}

async function cargarUsuarios() {
    const usuarioSesion = obtenerSesion();
    const select = document.getElementById("clienteId");
    const grupoCliente = document.getElementById("grupoClienteTicket");

    if (!usuarioSesion || !select) {
        return;
    }

    if (usuarioSesion.rol === "CLIENTE") {
        select.innerHTML = `
            <option value="${usuarioSesion.id}" selected>${usuarioSesion.nombre}</option>
        `;

        select.value = usuarioSesion.id;
        select.disabled = true;

        if (grupoCliente) {
            grupoCliente.style.display = "none";
        }

        return;
    }

    try {
        const response = await fetch(`${API_BASE}/usuarios`);

        if (!response.ok) {
            throw new Error("No se pudieron cargar los usuarios");
        }

        const usuarios = await response.json();

        select.innerHTML = `<option value="">Seleccione un cliente</option>`;

        usuarios.forEach(usuario => {
            const option = document.createElement("option");
            option.value = usuario.id;
            option.textContent = `${usuario.nombre} ${usuario.apellido} - ${usuario.correo}`;
            select.appendChild(option);
        });

        if (grupoCliente) {
            grupoCliente.style.display = "flex";
        }

    } catch (error) {
        console.error("Error cargando usuarios:", error);

        select.innerHTML = `<option value="">Error cargando usuarios</option>`;
    }
}

function configurarFormulario() {
    const form = document.getElementById("crearTicketForm");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const usuarioSesion = obtenerSesion();

        if (!usuarioSesion) {
            window.location.href = "login.html";
            return;
        }

        const titulo = document.getElementById("titulo").value.trim();
        const descripcion = document.getElementById("descripcion").value.trim();
        const tipoIncidenciaId = Number(document.getElementById("tipoIncidenciaId").value);
        const clienteIdSelect = document.getElementById("clienteId");

        const clienteId = usuarioSesion.rol === "CLIENTE"
            ? Number(usuarioSesion.id)
            : Number(clienteIdSelect.value);

        const data = {
            titulo: titulo,
            descripcion: descripcion,
            tipoIncidenciaId: tipoIncidenciaId,
            clienteId: clienteId,
            severidad: document.getElementById("severidad").value,
            criticidad: document.getElementById("criticidad").value,
            impacto: document.getElementById("impacto").value,
            urgencia: document.getElementById("urgencia").value
        };

        if (!data.titulo || !data.descripcion || !data.tipoIncidenciaId || !data.clienteId) {
            alert("Completa todos los campos obligatorios.");
            return;
        }

        await crearTicket(data);
    });
}

async function crearTicket(data) {
    try {
        const response = await fetch(`${API_BASE}/tickets`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error("No se pudo crear el ticket");
        }

        const ticket = await response.json();

        await subirAdjuntoTicket(ticket.id);

        alert(`Ticket creado correctamente: ${ticket.numeroTicket || "#" + ticket.id}`);

        window.location.href = `ticket-detalle.html?id=${ticket.id}`;

    } catch (error) {
        console.error("Error creando ticket:", error);
        alert("Error creando el ticket. Revisa que Spring Boot esté corriendo y que los datos sean válidos.");
    }
}

async function subirAdjuntoTicket(ticketId) {
    const inputArchivo = document.getElementById("archivoTicket");

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
        const response = await fetch(`${API_BASE}/adjuntos/ticket/${ticketId}`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const errorTexto = await response.text();
            console.error("Error subiendo adjunto:", errorTexto);
            alert("El ticket fue creado, pero no se pudo subir el archivo adjunto.");
            return;
        }

        console.log("Archivo adjunto subido correctamente.");

    } catch (error) {
        console.error("Error subiendo adjunto:", error);
        alert("El ticket fue creado, pero ocurrió un error al subir el archivo adjunto.");
    }
}