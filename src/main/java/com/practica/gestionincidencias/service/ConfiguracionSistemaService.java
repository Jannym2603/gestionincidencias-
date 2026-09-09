package com.practica.gestionincidencias.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.practica.gestionincidencias.dto.AuditoriaConfiguracionResponseDTO;
import com.practica.gestionincidencias.dto.ConfiguracionSistemaDTO;
import com.practica.gestionincidencias.entity.AuditoriaConfiguracion;
import com.practica.gestionincidencias.entity.ConfiguracionSistema;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.repository.AuditoriaConfiguracionRepository;
import com.practica.gestionincidencias.repository.ConfiguracionSistemaRepository;
import com.practica.gestionincidencias.repository.UsuarioRepository;

@Service
public class ConfiguracionSistemaService {

    private final ConfiguracionSistemaRepository repository;
    private final AuditoriaConfiguracionRepository auditoriaRepository;
    private final UsuarioRepository usuarioRepository;

    public ConfiguracionSistemaService(
            ConfiguracionSistemaRepository repository,
            AuditoriaConfiguracionRepository auditoriaRepository,
            UsuarioRepository usuarioRepository) {

        this.repository = repository;
        this.auditoriaRepository = auditoriaRepository;
        this.usuarioRepository = usuarioRepository;
    }


    // =====================================================
    // OBTENER CONFIGURACIÓN
    // =====================================================

    public ConfiguracionSistemaDTO obtenerConfiguracion() {

        ConfiguracionSistema configuracion =
                obtenerOCrearConfiguracion();

        return convertirADTO(configuracion);
    }


    // =====================================================
    // OBTENER AUDITORÍA
    // =====================================================

    public List<AuditoriaConfiguracionResponseDTO> obtenerAuditoria() {

        return auditoriaRepository
                .findAllByOrderByFechaCambioDesc()
                .stream()
                .map(this::convertirAuditoriaADTO)
                .toList();
    }


    // =====================================================
    // ACTUALIZAR CONFIGURACIÓN
    // =====================================================

    @Transactional
    public ConfiguracionSistemaDTO actualizarConfiguracion(
            ConfiguracionSistemaDTO dto) {

        validarConfiguracion(dto);

        ConfiguracionSistema configuracion =
                obtenerOCrearConfiguracion();


        // =================================================
        // GUARDAR ESTADO ANTERIOR
        // =================================================

        EstadoConfiguracion anterior =
                EstadoConfiguracion.desde(configuracion);


        // =================================================
        // ESTADOS GLOBALES
        // =================================================

        Boolean crearTicketActivo =
                dto.crearTicketActivo();

        Boolean solicitudesRecursosActivo =
                dto.solicitudesRecursosActivo();

        Boolean reportesActivos =
                dto.reportesActivos();

        Boolean historialActivo =
                dto.historialActivo();


        // =================================================
        // CREAR TICKET POR ROL
        // =================================================

        Boolean crearTicketCliente =
                resolverBooleano(
                        dto.crearTicketCliente(),
                        configuracion.getCrearTicketCliente()
                );

        Boolean crearTicketAgente =
                resolverBooleano(
                        dto.crearTicketAgente(),
                        configuracion.getCrearTicketAgente()
                );

        Boolean crearTicketSupervisor =
                resolverBooleano(
                        dto.crearTicketSupervisor(),
                        configuracion.getCrearTicketSupervisor()
                );

        Boolean crearTicketAdmin =
                resolverBooleano(
                        dto.crearTicketAdmin(),
                        configuracion.getCrearTicketAdmin()
                );


        // =================================================
        // SOLICITUDES DE RECURSOS POR ROL
        // =================================================

        Boolean solicitudesRecursosCliente =
                resolverBooleano(
                        dto.solicitudesRecursosCliente(),
                        configuracion.getSolicitudesRecursosCliente()
                );

        Boolean solicitudesRecursosAgente =
                resolverBooleano(
                        dto.solicitudesRecursosAgente(),
                        configuracion.getSolicitudesRecursosAgente()
                );

        Boolean solicitudesRecursosSupervisor =
                resolverBooleano(
                        dto.solicitudesRecursosSupervisor(),
                        configuracion.getSolicitudesRecursosSupervisor()
                );

        Boolean solicitudesRecursosAdmin =
                resolverBooleano(
                        dto.solicitudesRecursosAdmin(),
                        configuracion.getSolicitudesRecursosAdmin()
                );


        // =================================================
        // REPORTES POR ROL
        // =================================================

        Boolean reportesCliente =
                resolverBooleano(
                        dto.reportesCliente(),
                        configuracion.getReportesCliente()
                );

        Boolean reportesAgente =
                resolverBooleano(
                        dto.reportesAgente(),
                        configuracion.getReportesAgente()
                );

        Boolean reportesSupervisor =
                resolverBooleano(
                        dto.reportesSupervisor(),
                        configuracion.getReportesSupervisor()
                );

        Boolean reportesAdmin =
                resolverBooleano(
                        dto.reportesAdmin(),
                        configuracion.getReportesAdmin()
                );


        // =================================================
        // HISTORIAL POR ROL
        // =================================================

        Boolean historialCliente =
                resolverBooleano(
                        dto.historialCliente(),
                        configuracion.getHistorialCliente()
                );

        Boolean historialAgente =
                resolverBooleano(
                        dto.historialAgente(),
                        configuracion.getHistorialAgente()
                );

        Boolean historialSupervisor =
                resolverBooleano(
                        dto.historialSupervisor(),
                        configuracion.getHistorialSupervisor()
                );

        Boolean historialAdmin =
                resolverBooleano(
                        dto.historialAdmin(),
                        configuracion.getHistorialAdmin()
                );
        // =================================================
        // COMPROBAR SI REALMENTE HUBO CAMBIOS
        // =================================================

        boolean huboCambios =

                !Objects.equals(
                        anterior.crearTicketActivo(),
                        crearTicketActivo
                )

                ||

                !Objects.equals(
                        anterior.solicitudesRecursosActivo(),
                        solicitudesRecursosActivo
                )

                ||

                !Objects.equals(
                        anterior.reportesActivos(),
                        reportesActivos
                )

                ||

                !Objects.equals(
                        anterior.historialActivo(),
                        historialActivo
                )

                ||

                !Objects.equals(
                        anterior.crearTicketCliente(),
                        crearTicketCliente
                )

                ||

                !Objects.equals(
                        anterior.crearTicketAgente(),
                        crearTicketAgente
                )

                ||

                !Objects.equals(
                        anterior.crearTicketSupervisor(),
                        crearTicketSupervisor
                )

                ||

                !Objects.equals(
                        anterior.crearTicketAdmin(),
                        crearTicketAdmin
                )

                ||

                !Objects.equals(
                        anterior.solicitudesRecursosCliente(),
                        solicitudesRecursosCliente
                )

                ||

                !Objects.equals(
                        anterior.solicitudesRecursosAgente(),
                        solicitudesRecursosAgente
                )

                ||

                !Objects.equals(
                        anterior.solicitudesRecursosSupervisor(),
                        solicitudesRecursosSupervisor
                )

                ||

                !Objects.equals(
                        anterior.solicitudesRecursosAdmin(),
                        solicitudesRecursosAdmin
                )

                ||

                !Objects.equals(
                        anterior.reportesCliente(),
                        reportesCliente
                )

                ||

                !Objects.equals(
                        anterior.reportesAgente(),
                        reportesAgente
                )

                ||

                !Objects.equals(
                        anterior.reportesSupervisor(),
                        reportesSupervisor
                )

                ||

                !Objects.equals(
                        anterior.reportesAdmin(),
                        reportesAdmin
                )

                ||

                !Objects.equals(
                        anterior.historialCliente(),
                        historialCliente
                )

                ||

                !Objects.equals(
                        anterior.historialAgente(),
                        historialAgente
                )

                ||

                !Objects.equals(
                        anterior.historialSupervisor(),
                        historialSupervisor
                )

                ||

                !Objects.equals(
                        anterior.historialAdmin(),
                        historialAdmin
                );


        if (!huboCambios) {
            return convertirADTO(configuracion);
        }


        // =================================================
        // GUARDAR NUEVOS VALORES
        // =================================================

        configuracion.setCrearTicketActivo(
                crearTicketActivo
        );

        configuracion.setSolicitudesRecursosActivo(
                solicitudesRecursosActivo
        );

        configuracion.setReportesActivos(
                reportesActivos
        );

        configuracion.setHistorialActivo(
                historialActivo
        );


        configuracion.setCrearTicketCliente(
                crearTicketCliente
        );

        configuracion.setCrearTicketAgente(
                crearTicketAgente
        );

        configuracion.setCrearTicketSupervisor(
                crearTicketSupervisor
        );

        configuracion.setCrearTicketAdmin(
                crearTicketAdmin
        );


        configuracion.setSolicitudesRecursosCliente(
                solicitudesRecursosCliente
        );

        configuracion.setSolicitudesRecursosAgente(
                solicitudesRecursosAgente
        );

        configuracion.setSolicitudesRecursosSupervisor(
                solicitudesRecursosSupervisor
        );

        configuracion.setSolicitudesRecursosAdmin(
                solicitudesRecursosAdmin
        );


        configuracion.setReportesCliente(
                reportesCliente
        );

        configuracion.setReportesAgente(
                reportesAgente
        );

        configuracion.setReportesSupervisor(
                reportesSupervisor
        );

        configuracion.setReportesAdmin(
                reportesAdmin
        );


        configuracion.setHistorialCliente(
                historialCliente
        );

        configuracion.setHistorialAgente(
                historialAgente
        );

        configuracion.setHistorialSupervisor(
                historialSupervisor
        );

        configuracion.setHistorialAdmin(
                historialAdmin
        );
        ConfiguracionSistema guardada =
                repository.save(configuracion);


        // =================================================
        // REGISTRAR AUDITORÍA DETALLADA
        // =================================================

        EstadoConfiguracion nuevo =
                EstadoConfiguracion.desde(guardada);

        registrarCambiosAuditoria(
                anterior,
                nuevo
        );


        return convertirADTO(guardada);
    }


    // =====================================================
    // AUDITORÍA DETALLADA
    // =====================================================

    private void registrarCambiosAuditoria(
            EstadoConfiguracion anterior,
            EstadoConfiguracion nuevo) {

        DatosUsuarioAuditoria usuario =
                obtenerDatosUsuarioAuditoria();


        // -------------------------
        // GLOBALES
        // -------------------------

        registrarCambioSiAplica(
                usuario,
                "CREAR_TICKET",
                "GLOBAL",
                anterior.crearTicketActivo(),
                nuevo.crearTicketActivo(),
                anterior,
                nuevo
        );

        registrarCambioSiAplica(
                usuario,
                "SOLICITUDES_RECURSOS",
                "GLOBAL",
                anterior.solicitudesRecursosActivo(),
                nuevo.solicitudesRecursosActivo(),
                anterior,
                nuevo
        );

        registrarCambioSiAplica(
                usuario,
                "REPORTES",
                "GLOBAL",
                anterior.reportesActivos(),
                nuevo.reportesActivos(),
                anterior,
                nuevo
        );

        registrarCambioSiAplica(
                usuario,
                "HISTORIAL",
                "GLOBAL",
                anterior.historialActivo(),
                nuevo.historialActivo(),
                anterior,
                nuevo
        );


        // -------------------------
        // CREAR TICKET
        // -------------------------

        registrarCambioSiAplica(
                usuario,
                "CREAR_TICKET",
                "CLIENTE",
                anterior.crearTicketCliente(),
                nuevo.crearTicketCliente(),
                anterior,
                nuevo
        );

        registrarCambioSiAplica(
                usuario,
                "CREAR_TICKET",
                "AGENTE",
                anterior.crearTicketAgente(),
                nuevo.crearTicketAgente(),
                anterior,
                nuevo
        );

        registrarCambioSiAplica(
                usuario,
                "CREAR_TICKET",
                "SUPERVISOR",
                anterior.crearTicketSupervisor(),
                nuevo.crearTicketSupervisor(),
                anterior,
                nuevo
        );

        registrarCambioSiAplica(
                usuario,
                "CREAR_TICKET",
                "ADMIN",
                anterior.crearTicketAdmin(),
                nuevo.crearTicketAdmin(),
                anterior,
                nuevo
        );


        // -------------------------
        // SOLICITUDES DE RECURSOS
        // -------------------------

        registrarCambioSiAplica(
                usuario,
                "SOLICITUDES_RECURSOS",
                "CLIENTE",
                anterior.solicitudesRecursosCliente(),
                nuevo.solicitudesRecursosCliente(),
                anterior,
                nuevo
        );

        registrarCambioSiAplica(
                usuario,
                "SOLICITUDES_RECURSOS",
                "AGENTE",
                anterior.solicitudesRecursosAgente(),
                nuevo.solicitudesRecursosAgente(),
                anterior,
                nuevo
        );

        registrarCambioSiAplica(
                usuario,
                "SOLICITUDES_RECURSOS",
                "SUPERVISOR",
                anterior.solicitudesRecursosSupervisor(),
                nuevo.solicitudesRecursosSupervisor(),
                anterior,
                nuevo
        );

        registrarCambioSiAplica(
                usuario,
                "SOLICITUDES_RECURSOS",
                "ADMIN",
                anterior.solicitudesRecursosAdmin(),
                nuevo.solicitudesRecursosAdmin(),
                anterior,
                nuevo
        );


        // -------------------------
        // REPORTES
        // -------------------------

        registrarCambioSiAplica(
                usuario,
                "REPORTES",
                "CLIENTE",
                anterior.reportesCliente(),
                nuevo.reportesCliente(),
                anterior,
                nuevo
        );

        registrarCambioSiAplica(
                usuario,
                "REPORTES",
                "AGENTE",
                anterior.reportesAgente(),
                nuevo.reportesAgente(),
                anterior,
                nuevo
        );

        registrarCambioSiAplica(
                usuario,
                "REPORTES",
                "SUPERVISOR",
                anterior.reportesSupervisor(),
                nuevo.reportesSupervisor(),
                anterior,
                nuevo
        );

        registrarCambioSiAplica(
                usuario,
                "REPORTES",
                "ADMIN",
                anterior.reportesAdmin(),
                nuevo.reportesAdmin(),
                anterior,
                nuevo
        );


        // -------------------------
        // HISTORIAL
        // -------------------------

        registrarCambioSiAplica(
                usuario,
                "HISTORIAL",
                "CLIENTE",
                anterior.historialCliente(),
                nuevo.historialCliente(),
                anterior,
                nuevo
        );

        registrarCambioSiAplica(
                usuario,
                "HISTORIAL",
                "AGENTE",
                anterior.historialAgente(),
                nuevo.historialAgente(),
                anterior,
                nuevo
        );

        registrarCambioSiAplica(
                usuario,
                "HISTORIAL",
                "SUPERVISOR",
                anterior.historialSupervisor(),
                nuevo.historialSupervisor(),
                anterior,
                nuevo
        );

        registrarCambioSiAplica(
                usuario,
                "HISTORIAL",
                "ADMIN",
                anterior.historialAdmin(),
                nuevo.historialAdmin(),
                anterior,
                nuevo
        );
    }


    private void registrarCambioSiAplica(
            DatosUsuarioAuditoria usuario,
            String modulo,
            String rol,
            Object valorAnterior,
            Object valorNuevo,
            EstadoConfiguracion anterior,
            EstadoConfiguracion nuevo) {

        if (Objects.equals(
                valorAnterior,
                valorNuevo
        )) {
            return;
        }


        AuditoriaConfiguracion auditoria =
                AuditoriaConfiguracion.builder()

                        .usuarioId(
                                usuario.usuarioId()
                        )

                        .usuarioNombre(
                                usuario.nombre()
                        )

                        .usuarioCorreo(
                                usuario.correo()
                        )


                        // Campos anteriores
                        .crearTicketAnterior(
                                valorSeguro(
                                        anterior.crearTicketActivo()
                                )
                        )

                        .crearTicketNuevo(
                                valorSeguro(
                                        nuevo.crearTicketActivo()
                                )
                        )

                        .reportesAnterior(
                                valorSeguro(
                                        anterior.reportesActivos()
                                )
                        )

                        .reportesNuevo(
                                valorSeguro(
                                        nuevo.reportesActivos()
                                )
                        )

                        .historialAnterior(
                                valorSeguro(
                                        anterior.historialActivo()
                                )
                        )

                        .historialNuevo(
                                valorSeguro(
                                        nuevo.historialActivo()
                                )
                        )

                        .compatibilidadVisualAnterior("A")

                        .compatibilidadVisualNueva("A")


                        // Auditoría detallada
                        .modulo(
                                modulo
                        )

                        .rol(
                                rol
                        )

                        .valorAnterior(
                                String.valueOf(
                                        valorAnterior
                                )
                        )

                        .valorNuevo(
                                String.valueOf(
                                        valorNuevo
                                )
                        )


                        .fechaCambio(
                                LocalDateTime.now()
                        )

                        .build();


        auditoriaRepository.save(
                auditoria
        );
    }


    // =====================================================
    // DATOS DEL USUARIO QUE REALIZÓ EL CAMBIO
    // =====================================================

    private DatosUsuarioAuditoria obtenerDatosUsuarioAuditoria() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();


        String correo =
                authentication != null
                        ? authentication.getName()
                        : "desconocido";


        Integer usuarioId = null;


        if (authentication != null &&
                authentication.getDetails()
                        instanceof Integer id) {

            usuarioId = id;
        }


        Usuario usuario =
                usuarioRepository
                        .findByCorreo(correo)
                        .orElse(null);


        String nombreUsuario =
                usuario != null
                        ? (
                            usuario.getNombre()
                            + " "
                            + usuario.getApellido()
                        ).trim()
                        : correo;


        return new DatosUsuarioAuditoria(
                usuarioId,
                nombreUsuario,
                correo
        );
    }


    // =====================================================
    // RESOLVER BOOLEANOS
    // =====================================================

    private Boolean resolverBooleano(
            Boolean nuevoValor,
            Boolean valorActual) {

        if (nuevoValor != null) {
            return nuevoValor;
        }

        if (valorActual != null) {
            return valorActual;
        }

        return true;
    }


    // =====================================================
    // OBTENER O CREAR CONFIGURACIÓN
    // =====================================================

    private ConfiguracionSistema obtenerOCrearConfiguracion() {

        return repository
                .findAll()
                .stream()
                .findFirst()
                .orElseGet(
                        this::crearConfiguracionInicial
                );
    }


    // =====================================================
    // CONFIGURACIÓN INICIAL
    // =====================================================

    private ConfiguracionSistema crearConfiguracionInicial() {

        ConfiguracionSistema configuracion =
                ConfiguracionSistema.builder()

                        // Global
                        .crearTicketActivo(true)
                        .solicitudesRecursosActivo(true)
                        .reportesActivos(true)
                        .historialActivo(true)

                        // Crear Ticket
                        .crearTicketCliente(true)
                        .crearTicketAgente(true)
                        .crearTicketSupervisor(true)
                        .crearTicketAdmin(true)

                        // Solicitudes Recursos
                        .solicitudesRecursosCliente(true)
                        .solicitudesRecursosAgente(true)
                        .solicitudesRecursosSupervisor(true)
                        .solicitudesRecursosAdmin(true)

                        // Reportes
                        .reportesCliente(true)
                        .reportesAgente(true)
                        .reportesSupervisor(true)
                        .reportesAdmin(true)

                        // Historial
                        .historialCliente(true)
                        .historialAgente(true)
                        .historialSupervisor(true)
                        .historialAdmin(true)

                        // Compatibilidad con el esquema actual
                        .compatibilidadVisual("A")

                        .build();


        return repository.save(
                configuracion
        );
    }


    // =====================================================
    // CONFIGURACIÓN -> DTO
    // =====================================================

    private ConfiguracionSistemaDTO convertirADTO(
            ConfiguracionSistema configuracion) {

        return new ConfiguracionSistemaDTO(

                // Global
                valorSeguro(
                        configuracion.getCrearTicketActivo()
                ),

                valorSeguro(
                        configuracion.getSolicitudesRecursosActivo()
                ),

                valorSeguro(
                        configuracion.getReportesActivos()
                ),

                valorSeguro(
                        configuracion.getHistorialActivo()
                ),


                // Crear Ticket
                valorSeguro(
                        configuracion.getCrearTicketCliente()
                ),

                valorSeguro(
                        configuracion.getCrearTicketAgente()
                ),

                valorSeguro(
                        configuracion.getCrearTicketSupervisor()
                ),

                valorSeguro(
                        configuracion.getCrearTicketAdmin()
                ),


                // Solicitudes Recursos
                valorSeguro(
                        configuracion.getSolicitudesRecursosCliente()
                ),

                valorSeguro(
                        configuracion.getSolicitudesRecursosAgente()
                ),

                valorSeguro(
                        configuracion.getSolicitudesRecursosSupervisor()
                ),

                valorSeguro(
                        configuracion.getSolicitudesRecursosAdmin()
                ),


                // Reportes
                valorSeguro(
                        configuracion.getReportesCliente()
                ),

                valorSeguro(
                        configuracion.getReportesAgente()
                ),

                valorSeguro(
                        configuracion.getReportesSupervisor()
                ),

                valorSeguro(
                        configuracion.getReportesAdmin()
                ),


                // Historial
                valorSeguro(
                        configuracion.getHistorialCliente()
                ),

                valorSeguro(
                        configuracion.getHistorialAgente()
                ),

                valorSeguro(
                        configuracion.getHistorialSupervisor()
                ),

                valorSeguro(
                        configuracion.getHistorialAdmin()
                )
        );
    }


    // =====================================================
    // BOOLEANO SEGURO
    // =====================================================

    private Boolean valorSeguro(
            Boolean valor) {

        return valor == null
                ? true
                : valor;
    }


    // =====================================================
    // AUDITORÍA -> DTO
    // =====================================================

    private AuditoriaConfiguracionResponseDTO convertirAuditoriaADTO(
            AuditoriaConfiguracion auditoria) {

        return new AuditoriaConfiguracionResponseDTO(

                auditoria.getId(),

                auditoria.getUsuarioId(),

                auditoria.getUsuarioNombre(),

                auditoria.getUsuarioCorreo(),

                auditoria.getCrearTicketAnterior(),

                auditoria.getCrearTicketNuevo(),

                auditoria.getReportesAnterior(),

                auditoria.getReportesNuevo(),

                auditoria.getHistorialAnterior(),

                auditoria.getHistorialNuevo(),

                auditoria.getModulo(),

                auditoria.getRol(),

                auditoria.getValorAnterior(),

                auditoria.getValorNuevo(),

                auditoria.getFechaCambio()
        );
    }


    // =====================================================
    // VALIDACIÓN
    // =====================================================

    private void validarConfiguracion(
            ConfiguracionSistemaDTO dto) {

        if (dto == null) {

            throw new IllegalArgumentException(
                    "La configuración es obligatoria."
            );
        }


        if (dto.crearTicketActivo() == null ||
                dto.solicitudesRecursosActivo() == null ||
                dto.reportesActivos() == null ||
                dto.historialActivo() == null) {

            throw new IllegalArgumentException(
                    "Los estados globales de los módulos son obligatorios."
            );
        }


        /*
         * Los permisos por rol pueden venir null.
         * En ese caso se conserva el valor actual.
         */
    }


    // =====================================================
    // SNAPSHOT DE CONFIGURACIÓN
    // =====================================================

    private record EstadoConfiguracion(

            Boolean crearTicketActivo,
            Boolean solicitudesRecursosActivo,
            Boolean reportesActivos,
            Boolean historialActivo,

            Boolean crearTicketCliente,
            Boolean crearTicketAgente,
            Boolean crearTicketSupervisor,
            Boolean crearTicketAdmin,

            Boolean solicitudesRecursosCliente,
            Boolean solicitudesRecursosAgente,
            Boolean solicitudesRecursosSupervisor,
            Boolean solicitudesRecursosAdmin,

            Boolean reportesCliente,
            Boolean reportesAgente,
            Boolean reportesSupervisor,
            Boolean reportesAdmin,

            Boolean historialCliente,
            Boolean historialAgente,
            Boolean historialSupervisor,
            Boolean historialAdmin

    ) {

        private static EstadoConfiguracion desde(
                ConfiguracionSistema configuracion) {

            return new EstadoConfiguracion(

                    configuracion.getCrearTicketActivo(),
                    configuracion.getSolicitudesRecursosActivo(),
                    configuracion.getReportesActivos(),
                    configuracion.getHistorialActivo(),

                    configuracion.getCrearTicketCliente(),
                    configuracion.getCrearTicketAgente(),
                    configuracion.getCrearTicketSupervisor(),
                    configuracion.getCrearTicketAdmin(),

                    configuracion.getSolicitudesRecursosCliente(),
                    configuracion.getSolicitudesRecursosAgente(),
                    configuracion.getSolicitudesRecursosSupervisor(),
                    configuracion.getSolicitudesRecursosAdmin(),

                    configuracion.getReportesCliente(),
                    configuracion.getReportesAgente(),
                    configuracion.getReportesSupervisor(),
                    configuracion.getReportesAdmin(),

                    configuracion.getHistorialCliente(),
                    configuracion.getHistorialAgente(),
                    configuracion.getHistorialSupervisor(),
                    configuracion.getHistorialAdmin()
            );
        }
    }


    // =====================================================
    // DATOS USUARIO AUDITORÍA
    // =====================================================

    private record DatosUsuarioAuditoria(

            Integer usuarioId,
            String nombre,
            String correo

    ) {
    }
}