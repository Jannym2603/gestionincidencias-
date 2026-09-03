package com.practica.gestionincidencias.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.practica.gestionincidencias.dto.UsuarioProyectoRequestDTO;
import com.practica.gestionincidencias.dto.UsuarioProyectoResponseDTO;
import com.practica.gestionincidencias.entity.Proyecto;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.entity.UsuarioProyecto;
import com.practica.gestionincidencias.repository.ProyectoRepository;
import com.practica.gestionincidencias.repository.UsuarioProyectoRepository;
import com.practica.gestionincidencias.repository.UsuarioRepository;
import com.practica.gestionincidencias.service.AccesoProyectoService;

import jakarta.validation.Valid;


@RestController
@RequestMapping("/api/usuario-proyectos")
public class UsuarioProyectoController {

    private final UsuarioProyectoRepository usuarioProyectoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProyectoRepository proyectoRepository;
    private final AccesoProyectoService accesoProyectoService;


    public UsuarioProyectoController(
            UsuarioProyectoRepository usuarioProyectoRepository,
            UsuarioRepository usuarioRepository,
            ProyectoRepository proyectoRepository,
            AccesoProyectoService accesoProyectoService) {

        this.usuarioProyectoRepository =
                usuarioProyectoRepository;

        this.usuarioRepository =
                usuarioRepository;

        this.proyectoRepository =
                proyectoRepository;

        this.accesoProyectoService =
                accesoProyectoService;
    }


    /*
     * =====================================================
     * LISTAR ASIGNACIONES
     * =====================================================
     *
     * ADMIN:
     * puede consultar todas las asignaciones.
     *
     * SUPERVISOR:
     * solamente ve asignaciones pertenecientes
     * a proyectos que él mismo tenga asignados.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public List<UsuarioProyectoResponseDTO> listarAsignaciones() {

        Usuario usuarioAutenticado =
                accesoProyectoService
                        .obtenerUsuarioAutenticado();

        String rol =
                accesoProyectoService
                        .obtenerRol(usuarioAutenticado);


        return usuarioProyectoRepository
                .findAll()
                .stream()

                .filter(asignacion ->
                        puedeVisualizarAsignacion(
                                usuarioAutenticado,
                                rol,
                                asignacion
                        )
                )

                .map(this::convertirADTO)

                .toList();
    }


    /*
     * =====================================================
     * PROYECTOS ACTIVOS DE UN USUARIO
     * =====================================================
     *
     * CLIENTE:
     * solamente puede consultar sus propios proyectos.
     *
     * ADMIN:
     * puede consultar cualquier usuario.
     *
     * SUPERVISOR:
     * puede consultar otro usuario, pero solamente
     * recibirá los proyectos que también pertenezcan
     * al ámbito del supervisor.
     */
    @GetMapping("/usuario/{usuarioId}")
    @PreAuthorize(
            "hasAnyRole('ADMIN', 'SUPERVISOR', 'CLIENTE')"
    )
    public List<UsuarioProyectoResponseDTO> listarPorUsuario(
            @PathVariable Integer usuarioId) {

        validarUsuarioExistente(
                usuarioId
        );


        Usuario usuarioAutenticado =
                accesoProyectoService
                        .obtenerUsuarioAutenticado();


        String rol =
                accesoProyectoService
                        .obtenerRol(usuarioAutenticado);


        /*
         * CLIENTE únicamente puede consultar
         * sus propios proyectos.
         */
        if (
                "CLIENTE".equals(rol)
                        &&
                !usuarioAutenticado
                        .getId()
                        .equals(usuarioId)
        ) {

            throw new RuntimeException(
                    "No tienes permiso para consultar "
                            + "los proyectos de otro usuario."
            );
        }


        return usuarioProyectoRepository

                .findByUsuarioIdAndEstadoTrue(
                        usuarioId
                )

                .stream()

                /*
                 * La asignación, proyecto y compañía
                 * deben encontrarse activos.
                 */
                .filter(
                        this::asignacionDisponible
                )

                /*
                 * El supervisor solamente puede consultar
                 * proyectos dentro de su propio ámbito.
                 */
                .filter(asignacion ->
                        !"SUPERVISOR".equals(rol)
                                ||
                        supervisorTieneAccesoProyecto(
                                usuarioAutenticado,
                                asignacion.getProyecto()
                        )
                )

                .map(this::convertirADTO)

                .toList();
    }


    /*
     * =====================================================
     * MIS PROYECTOS
     * =====================================================
     *
     * Retorna solamente proyectos activos
     * pertenecientes al usuario autenticado.
     */
    @GetMapping("/mis-proyectos")
    @PreAuthorize(
            "hasAnyRole('ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE')"
    )
    public List<UsuarioProyectoResponseDTO> listarMisProyectos() {

        Usuario usuario =
                accesoProyectoService
                        .obtenerUsuarioAutenticado();


        return usuarioProyectoRepository

                .findByUsuarioIdAndEstadoTrue(
                        usuario.getId()
                )

                .stream()

                .filter(
                        this::asignacionDisponible
                )

                .map(this::convertirADTO)

                .toList();
    }


    /*
     * =====================================================
     * TODAS LAS ASIGNACIONES DE UN USUARIO
     * =====================================================
     *
     * Se incluyen asignaciones activas e inactivas.
     *
     * ADMIN:
     * puede consultar todas.
     *
     * SUPERVISOR:
     * solamente las correspondientes a proyectos
     * que él tenga asignados.
     */
    @GetMapping("/usuario/{usuarioId}/todas")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public List<UsuarioProyectoResponseDTO> listarTodasPorUsuario(
            @PathVariable Integer usuarioId) {

        validarUsuarioExistente(
                usuarioId
        );


        Usuario usuarioAutenticado =
                accesoProyectoService
                        .obtenerUsuarioAutenticado();


        String rol =
                accesoProyectoService
                        .obtenerRol(usuarioAutenticado);


        return usuarioProyectoRepository

                .findByUsuarioIdOrderByIdDesc(
                        usuarioId
                )

                .stream()

                .filter(asignacion -> {

                    /*
                     * ADMIN puede consultar
                     * todas las asignaciones.
                     */
                    if ("ADMIN".equals(rol)) {

                        return true;
                    }


                    /*
                     * SUPERVISOR:
                     * solo proyectos pertenecientes
                     * a su ámbito.
                     */
                    return supervisorTieneAccesoProyecto(
                            usuarioAutenticado,
                            asignacion.getProyecto()
                    );
                })

                .map(this::convertirADTO)

                .toList();
    }


    /*
     * =====================================================
     * USUARIOS CON ACCESO A UN PROYECTO
     * =====================================================
     *
     * Este endpoint se utiliza, entre otras cosas,
     * para encontrar los agentes disponibles para
     * asignar un ticket.
     */
    @GetMapping("/proyecto/{proyectoId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public List<UsuarioProyectoResponseDTO> listarPorProyecto(
            @PathVariable Integer proyectoId) {

        Proyecto proyecto =
                obtenerProyecto(
                        proyectoId
                );


        Usuario usuarioAutenticado =
                accesoProyectoService
                        .obtenerUsuarioAutenticado();


        String rol =
                accesoProyectoService
                        .obtenerRol(usuarioAutenticado);


        /*
         * SUPERVISOR:
         *
         * No puede consultar usuarios de
         * un proyecto ajeno.
         */
        if ("SUPERVISOR".equals(rol)) {

            accesoProyectoService
                    .validarAccesoProyecto(
                            usuarioAutenticado,
                            rol,
                            proyecto
                    );
        }


        return usuarioProyectoRepository

                .findByProyectoIdAndEstadoTrue(
                        proyectoId
                )

                .stream()

                /*
                 * Evitamos devolver accesos utilizables
                 * cuando el proyecto o compañía estén inactivos.
                 */
                .filter(
                        this::asignacionDisponible
                )

                .map(this::convertirADTO)

                .toList();
    }


    /*
     * =====================================================
     * ASIGNAR PROYECTO
     * =====================================================
     *
     * ADMIN:
     * puede administrar cualquier proyecto activo.
     *
     * SUPERVISOR:
     * solamente proyectos que él mismo tenga asignados.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public UsuarioProyectoResponseDTO asignarProyecto(
            @Valid
            @RequestBody
            UsuarioProyectoRequestDTO request) {

        Usuario usuarioAutenticado =
                accesoProyectoService
                        .obtenerUsuarioAutenticado();


        String rol =
                accesoProyectoService
                        .obtenerRol(usuarioAutenticado);


        Usuario usuario =
                usuarioRepository
                        .findById(
                                request.getUsuarioId()
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Usuario no encontrado."
                                )
                        );


        Proyecto proyecto =
                proyectoRepository
                        .findById(
                                request.getProyectoId()
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Proyecto no encontrado."
                                )
                        );


        /*
         * El SUPERVISOR solamente puede conceder
         * acceso a proyectos a los que él mismo
         * tenga acceso activo.
         */
        if ("SUPERVISOR".equals(rol)) {

            accesoProyectoService
                    .validarAccesoProyecto(
                            usuarioAutenticado,
                            rol,
                            proyecto
                    );
        }


        /*
         * No permitimos asignar proyectos
         * a usuarios inactivos.
         */
        if (
                !Boolean.TRUE.equals(
                        usuario.getEstado()
                )
        ) {

            throw new RuntimeException(
                    "No se puede asignar un proyecto "
                            + "a un usuario inactivo."
            );
        }


        /*
         * El proyecto debe estar activo.
         */
        if (
                !Boolean.TRUE.equals(
                        proyecto.getEstado()
                )
        ) {

            throw new RuntimeException(
                    "No se puede asignar un proyecto inactivo."
            );
        }


        /*
         * La compañía también debe
         * encontrarse activa.
         */
        if (
                proyecto.getCompania() == null
                        ||
                !Boolean.TRUE.equals(
                        proyecto
                                .getCompania()
                                .getEstado()
                )
        ) {

            throw new RuntimeException(
                    "La compañía del proyecto está inactiva."
            );
        }


        /*
         * Buscamos si ya existe una relación
         * entre ese usuario y proyecto.
         */
        UsuarioProyecto asignacionExistente =
                usuarioProyectoRepository

                        .findByUsuarioIdAndProyectoId(
                                usuario.getId(),
                                proyecto.getId()
                        )

                        .orElse(null);


        /*
         * Si ya existía una asignación.
         */
        if (
                asignacionExistente != null
        ) {

            /*
             * No duplicamos una asignación activa.
             */
            if (
                    Boolean.TRUE.equals(
                            asignacionExistente.getEstado()
                    )
            ) {

                throw new RuntimeException(
                        "El usuario ya tiene acceso "
                                + "a este proyecto."
                );
            }


            /*
             * Si estaba inactiva,
             * la reactivamos.
             */
            asignacionExistente
                    .setEstado(
                            true
                    );


            asignacionExistente
                    .setFechaAsignacion(
                            LocalDateTime.now()
                    );


            UsuarioProyecto reactivada =
                    usuarioProyectoRepository
                            .save(
                                    asignacionExistente
                            );


            return convertirADTO(
                    reactivada
            );
        }


        /*
         * Si nunca existió la relación,
         * creamos una nueva.
         */
        UsuarioProyecto asignacion =
                UsuarioProyecto.builder()

                        .usuario(
                                usuario
                        )

                        .proyecto(
                                proyecto
                        )

                        .fechaAsignacion(
                                LocalDateTime.now()
                        )

                        .estado(
                                true
                        )

                        .build();


        UsuarioProyecto guardada =
                usuarioProyectoRepository
                        .save(
                                asignacion
                        );


        return convertirADTO(
                guardada
        );
    }


    /*
     * =====================================================
     * DESACTIVAR ACCESO
     * =====================================================
     *
     * No eliminamos la relación.
     * Solamente la marcamos como inactiva.
     */
    @PutMapping("/{id}/desactivar")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public UsuarioProyectoResponseDTO desactivarAcceso(
            @PathVariable Integer id) {

        UsuarioProyecto asignacion =
                obtenerAsignacion(
                        id
                );


        Usuario usuarioAutenticado =
                accesoProyectoService
                        .obtenerUsuarioAutenticado();


        String rol =
                accesoProyectoService
                        .obtenerRol(usuarioAutenticado);


        /*
         * El supervisor solamente puede retirar
         * accesos de proyectos que pertenezcan
         * a su ámbito.
         */
        validarGestionAsignacion(
                usuarioAutenticado,
                rol,
                asignacion
        );


        if (
                !Boolean.TRUE.equals(
                        asignacion.getEstado()
                )
        ) {

            throw new RuntimeException(
                    "El acceso ya se encuentra desactivado."
            );
        }


        asignacion.setEstado(
                false
        );


        UsuarioProyecto actualizada =
                usuarioProyectoRepository
                        .save(
                                asignacion
                        );


        return convertirADTO(
                actualizada
        );
    }


    /*
     * =====================================================
     * REACTIVAR ACCESO
     * =====================================================
     */
    @PutMapping("/{id}/activar")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public UsuarioProyectoResponseDTO activarAcceso(
            @PathVariable Integer id) {

        UsuarioProyecto asignacion =
                obtenerAsignacion(
                        id
                );


        Usuario usuarioAutenticado =
                accesoProyectoService
                        .obtenerUsuarioAutenticado();


        String rol =
                accesoProyectoService
                        .obtenerRol(usuarioAutenticado);


        /*
         * Antes de reactivar verificamos
         * que el actor pueda administrar
         * ese proyecto.
         */
        validarGestionAsignacion(
                usuarioAutenticado,
                rol,
                asignacion
        );


        if (
                Boolean.TRUE.equals(
                        asignacion.getEstado()
                )
        ) {

            throw new RuntimeException(
                    "El acceso ya se encuentra activo."
            );
        }


        /*
         * El usuario debe continuar activo.
         */
        if (
                asignacion.getUsuario() == null
                        ||
                !Boolean.TRUE.equals(
                        asignacion
                                .getUsuario()
                                .getEstado()
                )
        ) {

            throw new RuntimeException(
                    "No se puede activar el acceso "
                            + "de un usuario inactivo."
            );
        }


        /*
         * El proyecto debe continuar activo.
         */
        if (
                asignacion.getProyecto() == null
                        ||
                !Boolean.TRUE.equals(
                        asignacion
                                .getProyecto()
                                .getEstado()
                )
        ) {

            throw new RuntimeException(
                    "No se puede activar el acceso "
                            + "a un proyecto inactivo."
            );
        }


        /*
         * La compañía debe continuar activa.
         */
        if (
                asignacion
                        .getProyecto()
                        .getCompania() == null
                        ||
                !Boolean.TRUE.equals(
                        asignacion
                                .getProyecto()
                                .getCompania()
                                .getEstado()
                )
        ) {

            throw new RuntimeException(
                    "No se puede activar el acceso "
                            + "porque la compañía está inactiva."
            );
        }


        asignacion.setEstado(
                true
        );


        asignacion.setFechaAsignacion(
                LocalDateTime.now()
        );


        UsuarioProyecto actualizada =
                usuarioProyectoRepository
                        .save(
                                asignacion
                        );


        return convertirADTO(
                actualizada
        );
    }


    /*
     * =====================================================
     * VALIDAR GESTIÓN DE UNA ASIGNACIÓN
     * =====================================================
     *
     * ADMIN:
     * no necesita pertenecer al proyecto.
     *
     * SUPERVISOR:
     * debe tener acceso activo al proyecto.
     */
    private void validarGestionAsignacion(
            Usuario usuarioAutenticado,
            String rol,
            UsuarioProyecto asignacion) {

        if (
                asignacion == null
                        ||
                asignacion.getProyecto() == null
        ) {

            throw new RuntimeException(
                    "La asignación no tiene "
                            + "un proyecto válido."
            );
        }


        if (
                "ADMIN".equals(rol)
        ) {

            return;
        }


        accesoProyectoService
                .validarAccesoProyecto(
                        usuarioAutenticado,
                        rol,
                        asignacion.getProyecto()
                );
    }


    /*
     * =====================================================
     * VISIBILIDAD DE ASIGNACIONES
     * =====================================================
     *
     * Se utiliza para GET /usuario-proyectos.
     */
    private boolean puedeVisualizarAsignacion(
            Usuario usuarioAutenticado,
            String rol,
            UsuarioProyecto asignacion) {

        if (
                asignacion == null
                        ||
                asignacion.getProyecto() == null
        ) {

            return false;
        }


        if (
                "ADMIN".equals(rol)
        ) {

            return true;
        }


        if (
                !"SUPERVISOR".equals(rol)
        ) {

            return false;
        }


        return supervisorTieneAccesoProyecto(
                usuarioAutenticado,
                asignacion.getProyecto()
        );
    }


    /*
     * =====================================================
     * ACCESO DEL SUPERVISOR A UN PROYECTO
     * =====================================================
     */
    private boolean supervisorTieneAccesoProyecto(
            Usuario supervisor,
            Proyecto proyecto) {

        if (
                supervisor == null
                        ||
                supervisor.getId() == null
                        ||
                proyecto == null
                        ||
                proyecto.getId() == null
        ) {

            return false;
        }


        /*
         * El proyecto y su compañía
         * también deben estar activos.
         */
        if (
                !proyectoDisponible(
                        proyecto
                )
        ) {

            return false;
        }


        return accesoProyectoService
                .usuarioTieneAccesoProyecto(
                        supervisor.getId(),
                        proyecto.getId()
                );
    }


    /*
     * =====================================================
     * PROYECTO DISPONIBLE
     * =====================================================
     */
    private boolean proyectoDisponible(
            Proyecto proyecto) {

        if (
                proyecto == null
                        ||
                !Boolean.TRUE.equals(
                        proyecto.getEstado()
                )
                        ||
                proyecto.getCompania() == null
        ) {

            return false;
        }


        return Boolean.TRUE.equals(
                proyecto
                        .getCompania()
                        .getEstado()
        );
    }


    /*
     * =====================================================
     * ASIGNACIÓN DISPONIBLE
     * =====================================================
     *
     * Para usar una asignación:
     *
     * 1. La asignación debe estar activa.
     * 2. El proyecto debe estar activo.
     * 3. La compañía debe estar activa.
     */
    private boolean asignacionDisponible(
            UsuarioProyecto asignacion) {

        if (
                asignacion == null
                        ||
                !Boolean.TRUE.equals(
                        asignacion.getEstado()
                )
                        ||
                asignacion.getProyecto() == null
        ) {

            return false;
        }


        return proyectoDisponible(
                asignacion.getProyecto()
        );
    }


    /*
     * =====================================================
     * OBTENER ASIGNACIÓN
     * =====================================================
     */
    private UsuarioProyecto obtenerAsignacion(
            Integer id) {

        return usuarioProyectoRepository

                .findById(
                        id
                )

                .orElseThrow(() ->
                        new RuntimeException(
                                "Asignación de proyecto "
                                        + "no encontrada."
                        )
                );
    }


    /*
     * =====================================================
     * OBTENER PROYECTO
     * =====================================================
     */
    private Proyecto obtenerProyecto(
            Integer proyectoId) {

        return proyectoRepository

                .findById(
                        proyectoId
                )

                .orElseThrow(() ->
                        new RuntimeException(
                                "Proyecto no encontrado."
                        )
                );
    }


    /*
     * =====================================================
     * VALIDAR USUARIO
     * =====================================================
     */
    private void validarUsuarioExistente(
            Integer usuarioId) {

        if (
                !usuarioRepository
                        .existsById(
                                usuarioId
                        )
        ) {

            throw new RuntimeException(
                    "Usuario no encontrado."
            );
        }
    }


    /*
     * =====================================================
     * DTO
     * =====================================================
     */
    private UsuarioProyectoResponseDTO convertirADTO(
            UsuarioProyecto asignacion) {

        Usuario usuario =
                asignacion.getUsuario();


        Proyecto proyecto =
                asignacion.getProyecto();


        String nombreUsuario =
                (
                        usuario.getNombre()
                                + " "
                                + usuario.getApellido()
                )
                        .trim();


        return new UsuarioProyectoResponseDTO(

                asignacion.getId(),

                usuario.getId(),
                nombreUsuario,
                usuario.getCorreo(),

                proyecto.getId(),
                proyecto.getNombre(),

                proyecto
                        .getCompania()
                        .getId(),

                proyecto
                        .getCompania()
                        .getNombre(),

                asignacion.getEstado(),
                asignacion.getFechaAsignacion()
        );
    }
}