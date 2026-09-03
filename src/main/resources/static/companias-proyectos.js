let companiasSistema = [];
let proyectosSistema = [];
let usuariosSistema = [];
let accesosUsuarioSistema = [];
let usuarioActual = null;

document.addEventListener("DOMContentLoaded", async () => {
    inicializarLayout();

    usuarioActual = obtenerSesion();

    if (!usuarioActual) return;

    configurarPermisosGestion();
    configurarEventos();
    configurarModales();

    await cargarTodo();
});


function configurarPermisosGestion() {

    const esAdmin =
        String(usuarioActual?.rol || "")
            .toUpperCase() === "ADMIN";

    const btnNuevaCompania =
        document.getElementById("btnNuevaCompania");

    /*
     * Solamente ADMIN puede crear compañías.
     */
    if (btnNuevaCompania) {

        btnNuevaCompania.style.display =
            esAdmin
                ? "inline-flex"
                : "none";
    }
}


function configurarEventos() {

    document
        .getElementById("btnNuevaCompania")
        ?.addEventListener(
            "click",
            abrirNuevaCompania
        );

    document
        .getElementById("btnRecargar")
        ?.addEventListener(
            "click",
            cargarTodo
        );

    document
        .getElementById("formCompania")
        ?.addEventListener(
            "submit",
            guardarCompania
        );

    document
        .getElementById("formProyecto")
        ?.addEventListener(
            "submit",
            guardarProyecto
        );

    document
        .getElementById("accesoUsuarioId")
        ?.addEventListener(
            "change",
            cargarAccesosCompania
        );

    document
        .getElementById("listaCompaniasGestion")
        ?.addEventListener(
            "click",
            manejarAccion
        );

    document
        .getElementById("listaProyectosAccesoCompania")
        ?.addEventListener(
            "click",
            cambiarAcceso
        );
}


function configurarModales() {

    document
        .querySelectorAll("[data-close-modal]")
        .forEach(boton => {

            boton.addEventListener(
                "click",
                () =>
                    cerrarModal(
                        boton.dataset.closeModal
                    )
            );
        });


    document
        .querySelectorAll(".modal-overlay")
        .forEach(modal => {

            modal.addEventListener(
                "click",
                event => {

                    if (event.target === modal) {

                        cerrarModal(
                            modal.id
                        );
                    }
                }
            );
        });


    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {

                document
                    .querySelectorAll(
                        ".modal-overlay.activo"
                    )
                    .forEach(
                        modal =>
                            cerrarModal(
                                modal.id
                            )
                    );
            }
        }
    );
}


async function cargarTodo() {

    try {

        const [
            respuestaCompanias,
            respuestaProyectos,
            respuestaUsuarios
        ] = await Promise.all([

            fetch(
                `${API_BASE}/companias`
            ),

            fetch(
                `${API_BASE}/proyectos`
            ),

            fetch(
                `${API_BASE}/usuarios`
            )
        ]);


        if (!respuestaCompanias.ok) {

            throw new Error(
                await mensajeError(
                    respuestaCompanias
                )
            );
        }


        if (!respuestaProyectos.ok) {

            throw new Error(
                await mensajeError(
                    respuestaProyectos
                )
            );
        }


        if (!respuestaUsuarios.ok) {

            throw new Error(
                await mensajeError(
                    respuestaUsuarios
                )
            );
        }


        companiasSistema =
            await respuestaCompanias.json();

        proyectosSistema =
            await respuestaProyectos.json();

        usuariosSistema =
            await respuestaUsuarios.json();


        if (!Array.isArray(
            companiasSistema
        )) {

            companiasSistema = [];
        }


        if (!Array.isArray(
            proyectosSistema
        )) {

            proyectosSistema = [];
        }


        if (!Array.isArray(
            usuariosSistema
        )) {

            usuariosSistema = [];
        }


        companiasSistema.sort(
            (a, b) =>
                String(
                    a.nombre || ""
                ).localeCompare(
                    String(
                        b.nombre || ""
                    ),
                    "es"
                )
        );


        proyectosSistema.sort(
            (a, b) =>
                String(
                    a.nombre || ""
                ).localeCompare(
                    String(
                        b.nombre || ""
                    ),
                    "es"
                )
        );


        pintarCompanias();

        cargarUsuarios();

    } catch (error) {

        document
            .getElementById(
                "listaCompaniasGestion"
            )
            .innerHTML =
                `<p class="empty-message">
                    ${escapar(error.message)}
                </p>`;
    }
}


function pintarCompanias() {

    const lista =
        document.getElementById(
            "listaCompaniasGestion"
        );


    const esAdmin =
        String(
            usuarioActual?.rol || ""
        ).toUpperCase() === "ADMIN";


    if (!companiasSistema.length) {

        lista.innerHTML =
            '<p class="empty-message">' +
            'No hay compañías registradas.' +
            '</p>';

        return;
    }


    lista.innerHTML =
        companiasSistema
            .map(compania => {

                const proyectos =
                    proyectosSistema.filter(
                        proyecto =>
                            Number(
                                proyecto.companiaId
                            )
                            ===
                            Number(
                                compania.id
                            )
                    );


                return `
                    <article class="company-admin-card">

                        <header class="company-admin-header">

                            <div class="company-admin-title">

                                <div>

                                    <h2>
                                        ${escapar(
                                            compania.nombre
                                        )}
                                    </h2>

                                    <p>
                                        ${escapar(
                                            compania.descripcion
                                            || "Sin descripción"
                                        )}
                                    </p>

                                </div>


                                <span
                                    class="status-pill
                                    ${
                                        compania.estado
                                            ? "active"
                                            : "inactive"
                                    }">

                                    ${
                                        compania.estado
                                            ? "ACTIVA"
                                            : "INACTIVA"
                                    }

                                </span>

                            </div>


                            <div class="company-admin-actions">

                                ${
                                    esAdmin
                                        ? `
                                            <button
                                                class="primary-btn"
                                                type="button"
                                                data-action="add-project"
                                                data-company="${compania.id}">
                                                + Agregar proyecto
                                            </button>
                                        `
                                        : ""
                                }


                                ${
                                    esAdmin
                                        ? `
                                            <button
                                                class="secondary-btn"
                                                type="button"
                                                data-action="edit-company"
                                                data-company="${compania.id}">
                                                Editar compañía
                                            </button>
                                        `
                                        : ""
                                }


                                <button
                                    class="secondary-btn"
                                    type="button"
                                    data-action="access"
                                    data-company="${compania.id}">

                                    Administrar accesos

                                </button>


                                ${
                                    esAdmin
                                        ? `
                                            <button
                                                class="secondary-btn"
                                                type="button"
                                                data-action="toggle-company"
                                                data-company="${compania.id}"
                                                data-state="${!compania.estado}">

                                                ${
                                                    compania.estado
                                                        ? "Desactivar"
                                                        : "Activar"
                                                }

                                            </button>
                                        `
                                        : ""
                                }

                            </div>

                        </header>


                        <section class="company-project-section">

                            <div class="company-project-section-header">

                                <div>

                                    <h3>
                                        Proyectos
                                    </h3>

                                    <p>
                                        ${proyectos.length}
                                        ${
                                            proyectos.length === 1
                                                ? "proyecto registrado"
                                                : "proyectos registrados"
                                        }
                                    </p>

                                </div>

                            </div>


                            <div class="company-project-list">

                                ${
                                    proyectos.length

                                        ? proyectos
                                            .map(
                                                proyecto => `

                                                    <div class="company-project-row">

                                                        <div class="company-project-info">

                                                            <span
                                                                class="organization-project-marker">
                                                            </span>

                                                            <div>

                                                                <strong>
                                                                    ${escapar(
                                                                        proyecto.nombre
                                                                    )}
                                                                </strong>

                                                                <small>
                                                                    ${escapar(
                                                                        proyecto.descripcion
                                                                        || "Sin descripción"
                                                                    )}
                                                                </small>

                                                            </div>

                                                        </div>


                                                        <div class="company-project-actions">

                                                            <span
                                                                class="status-pill
                                                                ${
                                                                    proyecto.estado
                                                                        ? "active"
                                                                        : "inactive"
                                                                }">

                                                                ${
                                                                    proyecto.estado
                                                                        ? "ACTIVO"
                                                                        : "INACTIVO"
                                                                }

                                                            </span>


                                                            ${
                                                                esAdmin
                                                                    ? `
                                                                        <button
                                                                            class="secondary-btn"
                                                                            type="button"
                                                                            data-action="edit-project"
                                                                            data-project="${proyecto.id}">

                                                                            Editar

                                                                        </button>
                                                                    `
                                                                    : ""
                                                            }


                                                            ${
                                                                esAdmin
                                                                    ? `
                                                                        <button
                                                                            class="secondary-btn"
                                                                            type="button"
                                                                            data-action="toggle-project"
                                                                            data-project="${proyecto.id}"
                                                                            data-state="${!proyecto.estado}">

                                                                            ${
                                                                                proyecto.estado
                                                                                    ? "Desactivar"
                                                                                    : "Activar"
                                                                            }

                                                                        </button>
                                                                    `
                                                                    : ""
                                                            }

                                                        </div>

                                                    </div>
                                                `
                                            )
                                            .join("")

                                        : `
                                            <p class="company-project-empty">
                                                Esta compañía todavía
                                                no tiene proyectos.
                                            </p>
                                        `
                                }

                            </div>

                        </section>

                    </article>
                `;
            })
            .join("");
}


function manejarAccion(event) {

    const boton =
        event.target.closest(
            "[data-action]"
        );


    if (!boton) return;


    const action =
        boton.dataset.action;


    if (
        action === "add-project"
    ) {

        abrirNuevoProyecto(
            Number(
                boton.dataset.company
            )
        );
    }


    if (
        action === "edit-company"
    ) {

        abrirEditarCompania(
            Number(
                boton.dataset.company
            )
        );
    }


    if (
        action === "access"
    ) {

        abrirAccesos(
            Number(
                boton.dataset.company
            )
        );
    }


    if (
        action === "toggle-company"
    ) {

        cambiarEstadoCompania(

            Number(
                boton.dataset.company
            ),

            boton.dataset.state
                === "true"
        );
    }


    if (
        action === "edit-project"
    ) {

        abrirEditarProyecto(
            Number(
                boton.dataset.project
            )
        );
    }


    if (
        action === "toggle-project"
    ) {

        cambiarEstadoProyecto(

            Number(
                boton.dataset.project
            ),

            boton.dataset.state
                === "true"
        );
    }
}


function abrirNuevaCompania() {

    document
        .getElementById(
            "formCompania"
        )
        .reset();


    document
        .getElementById(
            "companiaIdEdicion"
        )
        .value = "";


    document
        .getElementById(
            "companiaEstado"
        )
        .value = "true";


    document
        .getElementById(
            "tituloModalCompania"
        )
        .textContent =
            "Nueva compañía";


    document
        .getElementById(
            "btnGuardarCompania"
        )
        .textContent =
            "Guardar compañía";


    abrirModal(
        "modalCompania"
    );
}


function abrirEditarCompania(id) {

    const compania =
        companiasSistema.find(
            elemento =>
                Number(
                    elemento.id
                ) === id
        );


    if (!compania) return;


    document
        .getElementById(
            "companiaIdEdicion"
        )
        .value =
            compania.id;


    document
        .getElementById(
            "companiaNombre"
        )
        .value =
            compania.nombre || "";


    document
        .getElementById(
            "companiaDescripcion"
        )
        .value =
            compania.descripcion || "";


    document
        .getElementById(
            "companiaEstado"
        )
        .value =
            String(
                Boolean(
                    compania.estado
                )
            );


    document
        .getElementById(
            "tituloModalCompania"
        )
        .textContent =
            "Editar compañía";


    document
        .getElementById(
            "btnGuardarCompania"
        )
        .textContent =
            "Actualizar compañía";


    abrirModal(
        "modalCompania"
    );
}


function abrirNuevoProyecto(
    companiaId
) {

    const compania =
        companiasSistema.find(
            elemento =>
                Number(
                    elemento.id
                )
                ===
                companiaId
        );


    if (!compania) return;


    document
        .getElementById(
            "formProyecto"
        )
        .reset();


    document
        .getElementById(
            "proyectoIdEdicion"
        )
        .value = "";


    document
        .getElementById(
            "proyectoCompaniaId"
        )
        .value =
            compania.id;


    document
        .getElementById(
            "proyectoCompaniaNombre"
        )
        .value =
            compania.nombre || "";


    document
        .getElementById(
            "proyectoEstado"
        )
        .value =
            "true";


    document
        .getElementById(
            "tituloModalProyecto"
        )
        .textContent =
            "Nuevo proyecto";


    document
        .getElementById(
            "subtituloModalProyecto"
        )
        .textContent =
            `Agrega un proyecto a ${compania.nombre}.`;


    document
        .getElementById(
            "btnGuardarProyecto"
        )
        .textContent =
            "Guardar proyecto";


    abrirModal(
        "modalProyecto"
    );
}


function abrirEditarProyecto(id) {

    const proyecto =
        proyectosSistema.find(
            elemento =>
                Number(
                    elemento.id
                )
                ===
                id
        );


    if (!proyecto) return;


    document
        .getElementById(
            "proyectoIdEdicion"
        )
        .value =
            proyecto.id;


    document
        .getElementById(
            "proyectoCompaniaId"
        )
        .value =
            proyecto.companiaId;


    document
        .getElementById(
            "proyectoCompaniaNombre"
        )
        .value =
            proyecto.companiaNombre
            || "";


    document
        .getElementById(
            "proyectoNombre"
        )
        .value =
            proyecto.nombre || "";


    document
        .getElementById(
            "proyectoDescripcion"
        )
        .value =
            proyecto.descripcion
            || "";


    document
        .getElementById(
            "proyectoEstado"
        )
        .value =
            String(
                Boolean(
                    proyecto.estado
                )
            );


    document
        .getElementById(
            "tituloModalProyecto"
        )
        .textContent =
            "Editar proyecto";


    document
        .getElementById(
            "subtituloModalProyecto"
        )
        .textContent =
            `Modifica el proyecto de ${proyecto.companiaNombre}.`;


    document
        .getElementById(
            "btnGuardarProyecto"
        )
        .textContent =
            "Actualizar proyecto";


    abrirModal(
        "modalProyecto"
    );
}


function cargarUsuarios() {

    const select =
        document.getElementById(
            "accesoUsuarioId"
        );


    select.innerHTML =

        `<option value="">
            Seleccione un usuario
        </option>`

        +

        usuariosSistema

            .filter(
                usuario =>
                    Boolean(
                        usuario.estado
                    )
            )

            .map(
                usuario => `

                    <option value="${usuario.id}">

                        ${escapar(
                            `${usuario.nombre || ""}
                            ${usuario.apellido || ""}`
                                .trim()
                        )}

                        —

                        ${escapar(
                            usuario.rol || ""
                        )}

                    </option>
                `
            )

            .join("");
}


function abrirAccesos(
    companiaId
) {

    const compania =
        companiasSistema.find(
            elemento =>
                Number(
                    elemento.id
                )
                ===
                companiaId
        );


    if (!compania) return;


    document
        .getElementById(
            "accesoCompaniaActualId"
        )
        .value =
            compania.id;


    document
        .getElementById(
            "tituloModalAccesos"
        )
        .textContent =
            `Accesos de ${compania.nombre}`;


    document
        .getElementById(
            "accesoUsuarioId"
        )
        .value = "";


    document
        .getElementById(
            "listaProyectosAccesoCompania"
        )
        .innerHTML =
            '<p class="empty-message">' +
            'Selecciona un usuario para consultar sus accesos.' +
            '</p>';


    abrirModal(
        "modalAccesosCompania"
    );
}


async function cargarAccesosCompania() {

    const usuarioId =
        Number(
            document
                .getElementById(
                    "accesoUsuarioId"
                )
                .value
        );


    const companiaId =
        Number(
            document
                .getElementById(
                    "accesoCompaniaActualId"
                )
                .value
        );


    const lista =
        document.getElementById(
            "listaProyectosAccesoCompania"
        );


    if (!usuarioId) {

        lista.innerHTML =
            '<p class="empty-message">' +
            'Selecciona un usuario para consultar sus accesos.' +
            '</p>';

        return;
    }


    const respuesta =
        await fetch(
            `${API_BASE}/usuario-proyectos/usuario/${usuarioId}/todas`
        );


    if (!respuesta.ok) {

        lista.innerHTML =
            `<p class="empty-message">
                ${
                    escapar(
                        await mensajeError(
                            respuesta
                        )
                    )
                }
            </p>`;

        return;
    }


    accesosUsuarioSistema =
        await respuesta.json();


    if (
        !Array.isArray(
            accesosUsuarioSistema
        )
    ) {

        accesosUsuarioSistema = [];
    }


    const proyectos =
        proyectosSistema.filter(
            proyecto =>
                Number(
                    proyecto.companiaId
                )
                ===
                companiaId
        );


    lista.innerHTML =

        proyectos.length

            ? proyectos
                .map(proyecto => {

                    const acceso =
                        accesosUsuarioSistema.find(
                            elemento =>
                                Number(
                                    elemento.proyectoId
                                )
                                ===
                                Number(
                                    proyecto.id
                                )
                        );


                    const activo =
                        Boolean(
                            acceso?.estado
                        );


                    return `

                        <div class="project-access-row">

                            <div>

                                <strong>
                                    ${escapar(
                                        proyecto.nombre
                                    )}
                                </strong>

                                <small>
                                    ${escapar(
                                        proyecto.descripcion
                                        || "Sin descripción"
                                    )}
                                </small>

                            </div>


                            <div class="project-access-actions">

                                <span
                                    class="badge-access
                                    ${
                                        activo
                                            ? "activo"
                                            : "inactivo"
                                    }">

                                    ${
                                        activo
                                            ? "ACCESO ACTIVO"

                                            : acceso
                                                ? "ACCESO INACTIVO"

                                                : "SIN ACCESO"
                                    }

                                </span>


                                <button
                                    type="button"
                                    class="${
                                        activo
                                            ? "secondary-btn"
                                            : "primary-btn"
                                    }"

                                    data-access-project="${proyecto.id}"

                                    data-access-id="${
                                        acceso?.id || ""
                                    }"

                                    data-access-active="${activo}"

                                    data-access-exists="${
                                        Boolean(acceso)
                                    }">

                                    ${
                                        activo

                                            ? "Retirar acceso"

                                            : acceso

                                                ? "Reactivar"

                                                : "Asignar acceso"
                                    }

                                </button>

                            </div>

                        </div>
                    `;
                })
                .join("")

            : `
                <p class="empty-message">
                    Esta compañía no tiene proyectos.
                </p>
            `;
}


async function cambiarAcceso(
    event
) {

    const boton =
        event.target.closest(
            "[data-access-project]"
        );


    if (!boton) return;


    const usuarioId =
        Number(
            document
                .getElementById(
                    "accesoUsuarioId"
                )
                .value
        );


    let respuesta;


    /*
     * Si nunca existió una asignación,
     * creamos una nueva.
     */
    if (
        boton.dataset.accessExists
        !==
        "true"
    ) {

        respuesta =
            await fetch(
                `${API_BASE}/usuario-proyectos`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            usuarioId:
                                usuarioId,

                            proyectoId:
                                Number(
                                    boton.dataset
                                        .accessProject
                                )
                        })
                }
            );

    } else {

        /*
         * Si ya existía una asignación,
         * la activamos o desactivamos.
         */
        respuesta =
            await fetch(

                `${API_BASE}/usuario-proyectos/${
                    Number(
                        boton.dataset.accessId
                    )
                }/${
                    boton.dataset.accessActive
                    ===
                    "true"

                        ? "desactivar"

                        : "activar"
                }`,

                {
                    method: "PUT"
                }
            );
    }


    if (!respuesta.ok) {

        alert(
            await mensajeError(
                respuesta
            )
        );

        return;
    }


    await cargarAccesosCompania();
}


async function guardarCompania(
    event
) {

    event.preventDefault();


    const id =
        Number(
            document
                .getElementById(
                    "companiaIdEdicion"
                )
                .value
        );


    const data = {

        nombre:
            document
                .getElementById(
                    "companiaNombre"
                )
                .value
                .trim(),

        descripcion:
            document
                .getElementById(
                    "companiaDescripcion"
                )
                .value
                .trim(),

        estado:
            document
                .getElementById(
                    "companiaEstado"
                )
                .value
            ===
            "true"
    };


    if (!data.nombre) {

        return alert(
            "El nombre de la compañía es obligatorio."
        );
    }


    const respuesta =
        await fetch(

            id

                ? `${API_BASE}/companias/${id}`

                : `${API_BASE}/companias`,

            {

                method:
                    id
                        ? "PUT"
                        : "POST",

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


    if (!respuesta.ok) {

        return alert(
            await mensajeError(
                respuesta
            )
        );
    }


    cerrarModal(
        "modalCompania"
    );


    await cargarTodo();
}


async function guardarProyecto(
    event
) {

    event.preventDefault();


    const id =
        Number(
            document
                .getElementById(
                    "proyectoIdEdicion"
                )
                .value
        );


    const data = {

        companiaId:
            Number(
                document
                    .getElementById(
                        "proyectoCompaniaId"
                    )
                    .value
            ),

        nombre:
            document
                .getElementById(
                    "proyectoNombre"
                )
                .value
                .trim(),

        descripcion:
            document
                .getElementById(
                    "proyectoDescripcion"
                )
                .value
                .trim(),

        estado:
            document
                .getElementById(
                    "proyectoEstado"
                )
                .value
            ===
            "true"
    };


    if (!data.nombre) {

        return alert(
            "El nombre del proyecto es obligatorio."
        );
    }


    const respuesta =
        await fetch(

            id

                ? `${API_BASE}/proyectos/${id}`

                : `${API_BASE}/proyectos`,

            {

                method:
                    id
                        ? "PUT"
                        : "POST",

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


    if (!respuesta.ok) {

        return alert(
            await mensajeError(
                respuesta
            )
        );
    }


    cerrarModal(
        "modalProyecto"
    );


    await cargarTodo();
}


async function cambiarEstadoCompania(
    id,
    estado
) {

    if (
        !confirm(
            estado
                ? "¿Deseas activar esta compañía?"
                : "¿Deseas desactivar esta compañía?"
        )
    ) {

        return;
    }


    const respuesta =
        await fetch(
            `${API_BASE}/companias/${id}/estado`,
            {

                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        estado
                    )
            }
        );


    if (!respuesta.ok) {

        return alert(
            await mensajeError(
                respuesta
            )
        );
    }


    await cargarTodo();
}


async function cambiarEstadoProyecto(
    id,
    estado
) {

    if (
        !confirm(
            estado
                ? "¿Deseas activar este proyecto?"
                : "¿Deseas desactivar este proyecto?"
        )
    ) {

        return;
    }


    const respuesta =
        await fetch(
            `${API_BASE}/proyectos/${id}/estado`,
            {

                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        estado
                    )
            }
        );


    if (!respuesta.ok) {

        return alert(
            await mensajeError(
                respuesta
            )
        );
    }


    await cargarTodo();
}


function abrirModal(id) {

    const modal =
        document.getElementById(id);

    modal.classList.add(
        "activo"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document
        .body
        .classList
        .add(
            "modal-abierto"
        );
}


function cerrarModal(id) {

    const modal =
        document.getElementById(id);

    modal.classList.remove(
        "activo"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    if (
        !document.querySelector(
            ".modal-overlay.activo"
        )
    ) {

        document
            .body
            .classList
            .remove(
                "modal-abierto"
            );
    }
}


async function mensajeError(
    respuesta
) {

    try {

        const data =
            await respuesta.json();


        return (
            data.message
            ||
            data.error
            ||
            `Error ${respuesta.status}`
        );

    } catch {

        return `Error ${respuesta.status}`;
    }
}


function escapar(valor) {

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