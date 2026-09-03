let asignacionesProyectoCliente = [];
let asignacionesProyectoSupervisor = [];

document.addEventListener("DOMContentLoaded", async () => {

    inicializarLayout();

    const usuarioSesion = obtenerSesion();

    if (!usuarioSesion) {
        window.location.href = "login.html";
        return;
    }

    configurarVistaPorRol();
    configurarTipoAtencion();
    configurarSelectoresProyecto();

    await cargarTiposIncidencia();
    await cargarUsuarios();

    configurarFormulario();
});


function obtenerRolSesion() {

    const usuarioSesion = obtenerSesion();

    return String(
        usuarioSesion?.rol || ""
    )
        .trim()
        .toUpperCase();
}


function configurarVistaPorRol() {

    const usuarioSesion = obtenerSesion();

    if (!usuarioSesion) {

        window.location.href = "login.html";
        return;
    }

    const rol =
        obtenerRolSesion();

    const descripcion =
        document.getElementById(
            "descripcionCrearTicket"
        );

    const info =
        document.getElementById(
            "infoCrearTicket"
        );


    /*
     * CLIENTE
     */
    if (rol === "CLIENTE") {

        if (descripcion) {

            descripcion.textContent =
                "Registra una nueva incidencia asociada a tu perfil.";
        }

        if (info) {

            info.textContent =
                "Este ticket se registrará automáticamente a tu nombre. "
                + "Solo podrás seleccionar compañías y proyectos a los que tengas acceso.";
        }

        return;
    }


    /*
     * ADMIN
     */
    if (rol === "ADMIN") {

        if (descripcion) {

            descripcion.textContent =
                "Registra una nueva incidencia y asígnala al cliente correspondiente.";
        }

        if (info) {

            info.textContent =
                "Selecciona el cliente, la compañía y uno de los proyectos "
                + "a los que ese cliente tenga acceso.";
        }

        return;
    }


    /*
     * AGENTE
     */
    if (rol === "AGENTE") {

        if (descripcion) {
            descripcion.textContent =
                "Registra una incidencia o solicitud de recurso para un cliente de tus proyectos.";
        }

        if (info) {
            info.textContent =
                "Solo podrás seleccionar proyectos que estén asignados "
                + "tanto al cliente como a tu usuario de agente.";
        }

        return;
    }


    /*
     * SUPERVISOR
     */
    if (rol === "SUPERVISOR") {

        if (descripcion) {

            descripcion.textContent =
                "Registra una nueva incidencia para un cliente de tus proyectos.";
        }

        if (info) {

            info.textContent =
                "Solo podrás seleccionar proyectos que estén asignados "
                + "tanto al cliente como a tu usuario de supervisor.";
        }
    }
}


function configurarTipoAtencion() {

    const select =
        document.getElementById(
            "tipoAtencion"
        );

    const bloque =
        document.getElementById(
            "bloqueSolicitudRecurso"
        );

    const categoria =
        document.getElementById(
            "categoriaRecurso"
        );

    const recurso =
        document.getElementById(
            "recursoSolicitado"
        );

    const cantidad =
        document.getElementById(
            "cantidadRecurso"
        );

    const grupoTitulo =
        document.getElementById(
            "grupoTituloTicket"
        );

    const titulo =
        document.getElementById(
            "titulo"
        );

    if (!select || !bloque) {
        return;
    }

    const actualizarVista = () => {

        const esRecurso =
            String(
                select.value || ""
            )
                .trim()
                .toUpperCase()
            ===
            "RECURSO_EXTERNO";

        bloque.hidden =
            !esRecurso;

        if (grupoTitulo) {
            grupoTitulo.hidden =
                esRecurso;
        }

        if (titulo) {
            titulo.required =
                !esRecurso;

            if (esRecurso) {
                titulo.value = "";
            }
        }

        if (categoria) {
            categoria.required = esRecurso;
        }

        if (recurso) {
            recurso.required = esRecurso;
        }

        if (cantidad) {
            cantidad.required = esRecurso;
        }
    };

    select.addEventListener(
        "change",
        actualizarVista
    );

    actualizarVista();
}


function configurarSelectoresProyecto() {

    const selectCliente =
        document.getElementById(
            "clienteId"
        );

    const selectCompania =
        document.getElementById(
            "companiaId"
        );


    /*
     * Cuando ADMIN o SUPERVISOR
     * seleccionan un cliente,
     * cargamos los proyectos permitidos.
     */
    if (selectCliente) {

        selectCliente.addEventListener(
            "change",
            async () => {

                const clienteId =
                    Number(
                        selectCliente.value
                    );

                if (!clienteId) {

                    limpiarSelectoresProyecto(
                        "Seleccione primero un cliente"
                    );

                    return;
                }

                await cargarProyectosAutorizados(
                    clienteId
                );
            }
        );
    }


    /*
     * Al seleccionar compañía,
     * mostramos solamente sus proyectos.
     */
    if (selectCompania) {

        selectCompania.addEventListener(
            "change",
            () => {

                pintarProyectosPorCompania(
                    Number(
                        selectCompania.value
                    )
                );
            }
        );
    }
}


async function cargarProyectosAutorizados(
    clienteId
) {

    const selectCompania =
        document.getElementById(
            "companiaId"
        );

    const selectProyecto =
        document.getElementById(
            "proyectoId"
        );


    if (
        !selectCompania
        ||
        !selectProyecto
    ) {

        return;
    }


    selectCompania.disabled = true;
    selectProyecto.disabled = true;


    selectCompania.innerHTML = `
        <option value="">
            Cargando compañías...
        </option>
    `;


    selectProyecto.innerHTML = `
        <option value="">
            Cargando proyectos...
        </option>
    `;


    try {

        const rol =
            obtenerRolSesion();


        /*
         * ============================
         * CLIENTE
         * ============================
         *
         * Solamente consulta sus propios
         * proyectos mediante /mis-proyectos.
         */
        if (rol === "CLIENTE") {

            const response =
                await fetch(
                    `${API_BASE}/usuario-proyectos/mis-proyectos`
                );


            if (!response.ok) {

                throw new Error(
                    await obtenerMensajeError(
                        response
                    )
                );
            }


            const asignaciones =
                await response.json();


            asignacionesProyectoCliente =
                normalizarAsignaciones(
                    asignaciones
                );
        }


        /*
         * ============================
         * ADMIN
         * ============================
         *
         * Puede crear tickets en cualquiera
         * de los proyectos del cliente.
         */
        else if (rol === "ADMIN") {

            const response =
                await fetch(
                    `${API_BASE}/usuario-proyectos/usuario/${clienteId}`
                );


            if (!response.ok) {

                throw new Error(
                    await obtenerMensajeError(
                        response
                    )
                );
            }


            const asignaciones =
                await response.json();


            asignacionesProyectoCliente =
                normalizarAsignaciones(
                    asignaciones
                );
        }


        /*
         * ============================
         * SUPERVISOR
         * ============================
         *
         * Necesitamos consultar:
         *
         * 1. Proyectos del cliente.
         * 2. Proyectos del supervisor.
         *
         * Después calculamos la intersección.
         */
        else if (rol === "SUPERVISOR" || rol === "AGENTE") {

            const [
                respuestaCliente,
                respuestaSupervisor
            ] = await Promise.all([

                fetch(
                    `${API_BASE}/usuario-proyectos/usuario/${clienteId}`
                ),

                fetch(
                    `${API_BASE}/usuario-proyectos/mis-proyectos`
                )
            ]);


            if (!respuestaCliente.ok) {

                throw new Error(
                    await obtenerMensajeError(
                        respuestaCliente
                    )
                );
            }


            if (!respuestaSupervisor.ok) {

                throw new Error(
                    await obtenerMensajeError(
                        respuestaSupervisor
                    )
                );
            }


            const asignacionesCliente =
                normalizarAsignaciones(
                    await respuestaCliente.json()
                );


            asignacionesProyectoSupervisor =
                normalizarAsignaciones(
                    await respuestaSupervisor.json()
                );


            /*
             * Creamos un Set con los proyectos
             * que tiene permitido el supervisor.
             */
            const proyectosSupervisor =
                new Set(
                    asignacionesProyectoSupervisor
                        .map(
                            asignacion =>
                                Number(
                                    asignacion.proyectoId
                                )
                        )
                );


            /*
             * Solo permanecen los proyectos
             * que tienen ambos:
             *
             * CLIENTE ∩ SUPERVISOR
             */
            asignacionesProyectoCliente =
                asignacionesCliente.filter(
                    asignacion =>
                        proyectosSupervisor.has(
                            Number(
                                asignacion.proyectoId
                            )
                        )
                );
        }


        else {

            throw new Error(
                "Tu rol no tiene permiso para crear tickets."
            );
        }


        /*
         * Si después de aplicar permisos
         * no queda ningún proyecto.
         */
        if (
            asignacionesProyectoCliente.length
            ===
            0
        ) {

            const mensaje =
                (rol === "SUPERVISOR" || rol === "AGENTE")

                    ? "No existen proyectos compartidos entre el cliente y tu usuario"

                    : "El cliente no tiene proyectos asignados";


            limpiarSelectoresProyecto(
                mensaje
            );

            return;
        }


        /*
         * Construimos una lista única
         * de compañías.
         */
        const companiasUnicas =
            new Map();


        asignacionesProyectoCliente
            .forEach(
                asignacion => {

                    companiasUnicas.set(

                        Number(
                            asignacion.companiaId
                        ),

                        asignacion.companiaNombre
                        ||
                        "Compañía"
                    );
                }
            );


        const companiasOrdenadas =
            Array.from(
                companiasUnicas.entries()
            )
                .sort(
                    (a, b) =>
                        String(
                            a[1]
                        )
                            .localeCompare(
                                String(
                                    b[1]
                                ),
                                "es"
                            )
                );


        selectCompania.innerHTML = `
            <option value="">
                Seleccione una compañía
            </option>
        `;


        companiasOrdenadas.forEach(
            ([id, nombre]) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    id;

                option.textContent =
                    nombre;

                selectCompania.appendChild(
                    option
                );
            }
        );


        selectCompania.disabled =
            false;


        /*
         * Si solamente existe una compañía,
         * la seleccionamos automáticamente.
         */
        if (
            companiasOrdenadas.length
            ===
            1
        ) {

            selectCompania.value =
                String(
                    companiasOrdenadas[0][0]
                );


            pintarProyectosPorCompania(
                Number(
                    companiasOrdenadas[0][0]
                )
            );

        } else {

            selectProyecto.innerHTML = `
                <option value="">
                    Seleccione primero una compañía
                </option>
            `;

            selectProyecto.disabled =
                true;
        }


    } catch (error) {

        console.error(
            "Error cargando proyectos autorizados:",
            error
        );


        asignacionesProyectoCliente = [];
        asignacionesProyectoSupervisor = [];


        limpiarSelectoresProyecto(
            error.message
            ||
            "Error cargando proyectos"
        );
    }
}


/*
 * Filtra asignaciones inválidas.
 *
 * El backend ya realiza esta validación,
 * pero también la aplicamos en frontend
 * por seguridad visual.
 */
function normalizarAsignaciones(
    asignaciones
) {

    if (!Array.isArray(
        asignaciones
    )) {

        return [];
    }


    return asignaciones.filter(
        asignacion =>

            Boolean(
                asignacion?.estado
            )

            &&

            Number(
                asignacion?.proyectoId
            ) > 0

            &&

            Number(
                asignacion?.companiaId
            ) > 0
    );
}


function pintarProyectosPorCompania(
    companiaId
) {

    const selectProyecto =
        document.getElementById(
            "proyectoId"
        );


    if (!selectProyecto) {

        return;
    }


    if (!companiaId) {

        selectProyecto.innerHTML = `
            <option value="">
                Seleccione primero una compañía
            </option>
        `;

        selectProyecto.disabled =
            true;

        return;
    }


    /*
     * Filtramos únicamente los proyectos
     * pertenecientes a la compañía seleccionada.
     */
    const proyectos =
        asignacionesProyectoCliente

            .filter(
                asignacion =>
                    Number(
                        asignacion.companiaId
                    )
                    ===
                    Number(
                        companiaId
                    )
            )

            .sort(
                (a, b) =>
                    String(
                        a.proyectoNombre || ""
                    )
                        .localeCompare(
                            String(
                                b.proyectoNombre || ""
                            ),
                            "es"
                        )
            );


    selectProyecto.innerHTML = `
        <option value="">
            Seleccione un proyecto
        </option>
    `;


    proyectos.forEach(
        asignacion => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                asignacion.proyectoId;

            option.textContent =
                asignacion.proyectoNombre
                ||
                "Proyecto";

            selectProyecto.appendChild(
                option
            );
        }
    );


    selectProyecto.disabled =
        proyectos.length === 0;


    /*
     * Si solamente hay uno,
     * lo seleccionamos automáticamente.
     */
    if (
        proyectos.length === 1
    ) {

        selectProyecto.value =
            String(
                proyectos[0].proyectoId
            );
    }
}


function limpiarSelectoresProyecto(
    mensaje
) {

    const selectCompania =
        document.getElementById(
            "companiaId"
        );

    const selectProyecto =
        document.getElementById(
            "proyectoId"
        );


    asignacionesProyectoCliente = [];


    if (selectCompania) {

        selectCompania.innerHTML = `
            <option value="">
                ${escaparHtml(mensaje)}
            </option>
        `;

        selectCompania.disabled =
            true;
    }


    if (selectProyecto) {

        selectProyecto.innerHTML = `
            <option value="">
                Sin proyectos disponibles
            </option>
        `;

        selectProyecto.disabled =
            true;
    }
}


async function cargarTiposIncidencia() {

    const select =
        document.getElementById(
            "tipoIncidenciaId"
        );


    if (!select) {

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/tipos-incidencia`
            );


        if (!response.ok) {

            throw new Error(
                "No se pudieron cargar los tipos de incidencia."
            );
        }


        const tipos =
            await response.json();


        select.innerHTML = `
            <option value="">
                Seleccione un tipo de incidencia
            </option>
        `;


        if (!Array.isArray(tipos)) {

            throw new Error(
                "La respuesta de tipos de incidencia no es válida."
            );
        }


        tipos.forEach(
            tipo => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    tipo.id;

                option.textContent =
                    tipo.nombre;

                select.appendChild(
                    option
                );
            }
        );


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

    const usuarioSesion =
        obtenerSesion();

    const select =
        document.getElementById(
            "clienteId"
        );

    const grupoCliente =
        document.getElementById(
            "grupoClienteTicket"
        );


    if (
        !usuarioSesion
        ||
        !select
    ) {

        return;
    }


    const rol =
        obtenerRolSesion();


    /*
     * ============================
     * CLIENTE
     * ============================
     *
     * El ticket siempre queda
     * registrado a su propio nombre.
     */
    if (
        rol === "CLIENTE"
    ) {

        select.innerHTML = `
            <option
                value="${usuarioSesion.id}"
                selected>

                ${escaparHtml(
                    construirNombreCompleto(
                        usuarioSesion
                    )
                )}

            </option>
        `;


        select.value =
            String(
                usuarioSesion.id
            );


        select.disabled =
            true;


        if (grupoCliente) {

            grupoCliente.style.display =
                "none";
        }


        await cargarProyectosAutorizados(
            Number(
                usuarioSesion.id
            )
        );


        return;
    }


    /*
     * ============================
     * ADMIN / SUPERVISOR / AGENTE
     * ============================
     *
     * Cargamos únicamente usuarios
     * con rol CLIENTE.
     */
    try {

        select.disabled =
            true;


        select.innerHTML = `
            <option value="">
                Cargando clientes...
            </option>
        `;


        const response =
            await fetch(
                `${API_BASE}/usuarios`
            );


        if (!response.ok) {

            throw new Error(
                "No se pudieron cargar los usuarios."
            );
        }


        const usuarios =
            await response.json();


        const clientes =
            Array.isArray(
                usuarios
            )

                ? usuarios.filter(
                    usuario =>

                        Boolean(
                            usuario.estado
                        )

                        &&

                        tieneRolCliente(
                            usuario
                        )
                )

                : [];


        clientes.sort(
            (clienteA, clienteB) => {

                const nombreA =
                    construirNombreCompleto(
                        clienteA
                    )
                        .toLowerCase();


                const nombreB =
                    construirNombreCompleto(
                        clienteB
                    )
                        .toLowerCase();


                return nombreA.localeCompare(
                    nombreB,
                    "es"
                );
            }
        );


        select.innerHTML = `
            <option value="">
                Seleccione un cliente
            </option>
        `;


        clientes.forEach(
            cliente => {

                const option =
                    document.createElement(
                        "option"
                    );


                const nombreCompleto =
                    construirNombreCompleto(
                        cliente
                    );


                option.value =
                    cliente.id;


                option.textContent =
                    `${nombreCompleto} - ${
                        cliente.correo
                        ||
                        "Sin correo"
                    }`;


                select.appendChild(
                    option
                );
            }
        );


        if (
            clientes.length === 0
        ) {

            select.innerHTML = `
                <option value="">
                    No hay clientes activos registrados
                </option>
            `;


            select.disabled =
                true;

        } else {

            select.disabled =
                false;
        }


        if (grupoCliente) {

            grupoCliente.style.display =
                "flex";
        }


        limpiarSelectoresProyecto(
            "Seleccione primero un cliente"
        );


    } catch (error) {

        console.error(
            "Error cargando clientes:",
            error
        );


        select.innerHTML = `
            <option value="">
                Error cargando clientes
            </option>
        `;


        select.disabled =
            true;
    }
}


function tieneRolCliente(
    usuario
) {

    const valoresRol = [];


    if (usuario?.rol) {

        if (
            typeof usuario.rol
            ===
            "string"
        ) {

            valoresRol.push(
                usuario.rol
            );

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


    if (
        Array.isArray(
            usuario?.roles
        )
    ) {

        usuario.roles.forEach(
            rol => {

                if (
                    typeof rol
                    ===
                    "string"
                ) {

                    valoresRol.push(
                        rol
                    );

                } else {

                    valoresRol.push(

                        rol?.nombre,

                        rol?.name,

                        rol?.descripcion
                    );
                }
            }
        );
    }


    return valoresRol.some(
        valor =>
            String(
                valor || ""
            )
                .trim()
                .toUpperCase()
            ===
            "CLIENTE"
    );
}


function configurarFormulario() {

    const form =
        document.getElementById(
            "crearTicketForm"
        );


    if (!form) {

        return;
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const usuarioSesion =
                obtenerSesion();


            if (!usuarioSesion) {

                window.location.href =
                    "login.html";

                return;
            }


            const rol =
                obtenerRolSesion();


            const tipoAtencion =
                String(
                    document
                        .getElementById(
                            "tipoAtencion"
                        )
                        ?.value
                    ||
                    "OPERATIVO"
                )
                    .trim()
                    .toUpperCase();


            let titulo =
                document
                    .getElementById(
                        "titulo"
                    )
                    ?.value
                    .trim()
                ||
                "";


            const descripcion =
                document
                    .getElementById(
                        "descripcion"
                    )
                    ?.value
                    .trim()
                ||
                "";


            const tipoIncidenciaId =
                Number(
                    document
                        .getElementById(
                            "tipoIncidenciaId"
                        )
                        ?.value
                );


            const clienteIdSelect =
                document.getElementById(
                    "clienteId"
                );


            /*
             * CLIENTE:
             * siempre usamos su ID de sesión.
             *
             * ADMIN/SUPERVISOR:
             * utilizamos el cliente seleccionado.
             */
            const clienteId =
                rol === "CLIENTE"

                    ? Number(
                        usuarioSesion.id
                    )

                    : Number(
                        clienteIdSelect?.value
                    );


            const companiaId =
                Number(
                    document
                        .getElementById(
                            "companiaId"
                        )
                        ?.value
                );


            const proyectoId =
                Number(
                    document
                        .getElementById(
                            "proyectoId"
                        )
                        ?.value
                );


            /*
             * Comprobación visual adicional:
             *
             * El proyecto seleccionado debe existir
             * dentro de las asignaciones autorizadas.
             */
            const proyectoPermitido =
                asignacionesProyectoCliente.some(
                    asignacion =>

                        Number(
                            asignacion.proyectoId
                        )
                        ===
                        proyectoId

                        &&

                        Number(
                            asignacion.companiaId
                        )
                        ===
                        companiaId
                );


            if (
                !tipoAtencion
                ||
                !descripcion
                ||
                !tipoIncidenciaId
                ||
                !clienteId
                ||
                !companiaId
                ||
                !proyectoId
            ) {

                alert(
                    "Completa todos los campos obligatorios, incluyendo compañía y proyecto."
                );

                return;
            }


            if (!proyectoPermitido) {

                alert(
                    "El proyecto seleccionado no está autorizado para este usuario."
                );

                return;
            }


            let solicitudRecurso = null;

            if (tipoAtencion === "RECURSO_EXTERNO") {

                const categoria =
                    String(
                        document
                            .getElementById(
                                "categoriaRecurso"
                            )
                            ?.value
                        ||
                        ""
                    )
                        .trim();

                const recurso =
                    String(
                        document
                            .getElementById(
                                "recursoSolicitado"
                            )
                            ?.value
                        ||
                        ""
                    )
                        .trim();

                const cantidad =
                    Number(
                        document
                            .getElementById(
                                "cantidadRecurso"
                            )
                            ?.value
                    );

                const observaciones =
                    String(
                        document
                            .getElementById(
                                "observacionesRecurso"
                            )
                            ?.value
                        ||
                        ""
                    )
                        .trim();

                if (
                    !categoria
                    ||
                    !recurso
                    ||
                    !cantidad
                    ||
                    cantidad < 1
                ) {

                    alert(
                        "Completa la categoría, el recurso solicitado y una cantidad válida."
                    );

                    return;
                }

                titulo =
                    `Solicitud de recurso - ${recurso}`;

                solicitudRecurso = {
                    categoria,
                    recurso,
                    cantidad,
                    observaciones
                };
            }


            if (
                tipoAtencion === "OPERATIVO"
                &&
                !titulo
            ) {

                alert(
                    "Completa el título de la incidencia."
                );

                return;
            }


            const data = {

                titulo:
                    titulo,

                descripcion:
                    descripcion,

                tipoAtencion:
                    tipoAtencion,

                solicitudRecurso:
                    solicitudRecurso,

                tipoIncidenciaId:
                    tipoIncidenciaId,

                clienteId:
                    clienteId,

                proyectoId:
                    proyectoId,

                severidad:
                    document
                        .getElementById(
                            "severidad"
                        )
                        ?.value
                    ||
                    "",

                criticidad:
                    document
                        .getElementById(
                            "criticidad"
                        )
                        ?.value
                    ||
                    "",

                impacto:
                    document
                        .getElementById(
                            "impacto"
                        )
                        ?.value
                    ||
                    "",

                urgencia:
                    document
                        .getElementById(
                            "urgencia"
                        )
                        ?.value
                    ||
                    ""
            };


            await crearTicket(
                data
            );
        }
    );
}


async function crearTicket(
    data
) {

    const form =
        document.getElementById(
            "crearTicketForm"
        );


    const botonEnviar =
        form?.querySelector(
            'button[type="submit"]'
        );


    try {

        if (botonEnviar) {

            botonEnviar.disabled =
                true;

            botonEnviar.textContent =
                "Creando ticket...";
        }


        const response =
            await fetch(
                `${API_BASE}/tickets`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            data
                        )
                }
            );


        if (!response.ok) {

            const mensaje =
                await obtenerMensajeError(
                    response
                );


            throw new Error(
                mensaje
            );
        }


        const ticket =
            await response.json();


        /*
         * Primero se crea el ticket.
         * Después intentamos subir el archivo.
         */
        await subirAdjuntoTicket(
            ticket.id
        );


        alert(
            `Ticket creado correctamente: ${
                ticket.numeroTicket
                ||
                "#" + ticket.id
            }`
        );


        window.location.href =
            `ticket-detalle.html?id=${ticket.id}`;


    } catch (error) {

        console.error(
            "Error creando ticket:",
            error
        );


        alert(
            error.message
            ||
            "Error creando el ticket. Revisa que los datos sean válidos."
        );


    } finally {

        if (botonEnviar) {

            botonEnviar.disabled =
                false;

            botonEnviar.textContent =
                "Crear ticket";
        }
    }
}


async function subirAdjuntoTicket(
    ticketId
) {

    const inputArchivo =
        document.getElementById(
            "archivoTicket"
        );


    if (!inputArchivo) {

        return;
    }


    const archivo =
        inputArchivo.files[0];


    if (!archivo) {

        return;
    }


    const formData =
        new FormData();


    formData.append(
        "archivo",
        archivo
    );


    try {

        const response =
            await fetch(
                `${API_BASE}/adjuntos/ticket/${ticketId}`,
                {

                    method:
                        "POST",

                    body:
                        formData
                }
            );


        if (!response.ok) {

            const mensaje =
                await obtenerMensajeError(
                    response
                );


            console.error(
                "Error subiendo adjunto:",
                mensaje
            );


            alert(
                "El ticket fue creado, pero no se pudo subir el archivo adjunto. "
                + mensaje
            );


            return;
        }


        console.log(
            "Archivo adjunto subido correctamente."
        );


    } catch (error) {

        console.error(
            "Error subiendo adjunto:",
            error
        );


        alert(
            "El ticket fue creado, pero ocurrió un error al subir el archivo adjunto."
        );
    }
}


function construirNombreCompleto(
    usuario
) {

    const nombre =
        String(
            usuario?.nombre || ""
        )
            .trim();


    const apellido =
        String(
            usuario?.apellido || ""
        )
            .trim();


    const nombreCompleto =
        `${nombre} ${apellido}`
            .trim();


    return nombreCompleto
        ||
        "Cliente";
}


async function obtenerMensajeError(
    response
) {

    const tipoContenido =
        response.headers.get(
            "content-type"
        )
        ||
        "";


    if (
        tipoContenido.includes(
            "application/json"
        )
    ) {

        try {

            const contenido =
                await response.json();


            return (
                contenido.message
                ||
                contenido.error
                ||
                `Error ${response.status}`
            );


        } catch (error) {

            return `Error ${response.status}`;
        }
    }


    try {

        const texto =
            await response.text();


        return (
            texto
            ||
            `Error ${response.status}`
        );


    } catch (error) {

        return `Error ${response.status}`;
    }
}


function escaparHtml(
    valor
) {

    return String(
        valor ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}