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

    public ConfiguracionSistemaDTO obtenerConfiguracion() {

        ConfiguracionSistema configuracion =
                obtenerOCrearConfiguracion();

        return convertirADTO(configuracion);
    }

    public List<AuditoriaConfiguracionResponseDTO>
            obtenerAuditoria() {

        return auditoriaRepository
                .findAllByOrderByFechaCambioDesc()
                .stream()
                .map(this::convertirAuditoriaADTO)
                .toList();
    }

    @Transactional
    public ConfiguracionSistemaDTO actualizarConfiguracion(
            ConfiguracionSistemaDTO dto) {

        validarConfiguracion(dto);

        ConfiguracionSistema configuracion =
                obtenerOCrearConfiguracion();

        /*
         * =========================
         * VALORES ANTERIORES
         * =========================
         */

        Boolean crearTicketAnterior =
                configuracion.getCrearTicketActivo();

        Boolean solicitudesRecursosAnterior =
                configuracion.getSolicitudesRecursosActivo();

        Boolean reportesAnterior =
                configuracion.getReportesActivos();

        Boolean historialAnterior =
                configuracion.getHistorialActivo();

        String varianteAnterior =
                configuracion.getVarianteVisual();


        /*
         * =========================
         * NUEVOS VALORES
         * =========================
         */

        Boolean crearTicketActivo =
                dto.crearTicketActivo();

        Boolean solicitudesRecursosActivo =
                dto.solicitudesRecursosActivo();

        Boolean reportesActivos =
                dto.reportesActivos();

        Boolean historialActivo =
                dto.historialActivo();


        /*
         * Si alguno de los permisos por rol no viene
         * en la petición, conservamos el valor actual.
         */

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


        /*
         * Ya no utilizamos prueba visual A/B.
         * Se conserva A únicamente para mantener
         * compatibilidad con la estructura existente.
         */
        String varianteNueva = "A";


        /*
         * =========================
         * DETECTAR CAMBIOS
         * =========================
         */

        boolean huboCambios =

                !Objects.equals(
                        configuracion.getCrearTicketActivo(),
                        crearTicketActivo
                )

                ||

                !Objects.equals(
                        configuracion.getSolicitudesRecursosActivo(),
                        solicitudesRecursosActivo
                )

                ||

                !Objects.equals(
                        configuracion.getReportesActivos(),
                        reportesActivos
                )

                ||

                !Objects.equals(
                        configuracion.getHistorialActivo(),
                        historialActivo
                )

                ||

                !Objects.equals(
                        configuracion.getCrearTicketCliente(),
                        crearTicketCliente
                )

                ||

                !Objects.equals(
                        configuracion.getCrearTicketAgente(),
                        crearTicketAgente
                )

                ||

                !Objects.equals(
                        configuracion.getCrearTicketSupervisor(),
                        crearTicketSupervisor
                )

                ||

                !Objects.equals(
                        configuracion.getCrearTicketAdmin(),
                        crearTicketAdmin
                )

                ||

                !Objects.equals(
                        configuracion.getSolicitudesRecursosCliente(),
                        solicitudesRecursosCliente
                )

                ||

                !Objects.equals(
                        configuracion.getSolicitudesRecursosAgente(),
                        solicitudesRecursosAgente
                )

                ||

                !Objects.equals(
                        configuracion.getSolicitudesRecursosSupervisor(),
                        solicitudesRecursosSupervisor
                )

                ||

                !Objects.equals(
                        configuracion.getSolicitudesRecursosAdmin(),
                        solicitudesRecursosAdmin
                )

                ||

                !Objects.equals(
                        configuracion.getReportesCliente(),
                        reportesCliente
                )

                ||

                !Objects.equals(
                        configuracion.getReportesAgente(),
                        reportesAgente
                )

                ||

                !Objects.equals(
                        configuracion.getReportesSupervisor(),
                        reportesSupervisor
                )

                ||

                !Objects.equals(
                        configuracion.getReportesAdmin(),
                        reportesAdmin
                )

                ||

                !Objects.equals(
                        configuracion.getHistorialCliente(),
                        historialCliente
                )

                ||

                !Objects.equals(
                        configuracion.getHistorialAgente(),
                        historialAgente
                )

                ||

                !Objects.equals(
                        configuracion.getHistorialSupervisor(),
                        historialSupervisor
                )

                ||

                !Objects.equals(
                        configuracion.getHistorialAdmin(),
                        historialAdmin
                );

        if (!huboCambios) {
            return convertirADTO(configuracion);
        }


        /*
         * =========================
         * GUARDAR ESTADOS GLOBALES
         * =========================
         */

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


        /*
         * =========================
         * CREAR TICKET POR ROL
         * =========================
         */

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


        /*
         * =========================
         * SOLICITUDES DE RECURSOS
         * POR ROL
         * =========================
         */

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


        /*
         * =========================
         * REPORTES POR ROL
         * =========================
         */

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


        /*
         * =========================
         * HISTORIAL POR ROL
         * =========================
         */

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

        configuracion.setVarianteVisual(
                varianteNueva
        );


        ConfiguracionSistema guardada =
                repository.save(configuracion);


        /*
         * Por ahora conservamos la auditoría existente.
         *
         * En el siguiente paso ampliaremos
         * AuditoriaConfiguracion para que también registre
         * exactamente qué permiso por rol fue modificado.
         */
        registrarAuditoria(
                crearTicketAnterior,
                guardada.getCrearTicketActivo(),
                reportesAnterior,
                guardada.getReportesActivos(),
                historialAnterior,
                guardada.getHistorialActivo(),
                varianteAnterior,
                guardada.getVarianteVisual()
        );

        return convertirADTO(guardada);
    }


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


    private void registrarAuditoria(
            Boolean crearTicketAnterior,
            Boolean crearTicketNuevo,
            Boolean reportesAnterior,
            Boolean reportesNuevo,
            Boolean historialAnterior,
            Boolean historialNuevo,
            String varianteAnterior,
            String varianteNueva) {

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

        AuditoriaConfiguracion auditoria =
                AuditoriaConfiguracion.builder()
                        .usuarioId(usuarioId)
                        .usuarioNombre(nombreUsuario)
                        .usuarioCorreo(correo)
                        .crearTicketAnterior(
                                crearTicketAnterior
                        )
                        .crearTicketNuevo(
                                crearTicketNuevo
                        )
                        .reportesAnterior(
                                reportesAnterior
                        )
                        .reportesNuevo(
                                reportesNuevo
                        )
                        .historialAnterior(
                                historialAnterior
                        )
                        .historialNuevo(
                                historialNuevo
                        )
                        .varianteAnterior(
                                varianteAnterior
                        )
                        .varianteNueva(
                                varianteNueva
                        )
                        .fechaCambio(
                                LocalDateTime.now()
                        )
                        .build();

        auditoriaRepository.save(auditoria);
    }


    private ConfiguracionSistema
            obtenerOCrearConfiguracion() {

        return repository
                .findAll()
                .stream()
                .findFirst()
                .orElseGet(
                        this::crearConfiguracionInicial
                );
    }


    private ConfiguracionSistema
            crearConfiguracionInicial() {

        ConfiguracionSistema configuracion =
                ConfiguracionSistema.builder()

                        /*
                         * Estados globales
                         */
                        .crearTicketActivo(true)
                        .solicitudesRecursosActivo(true)
                        .reportesActivos(true)
                        .historialActivo(true)

                        /*
                         * Crear Ticket
                         */
                        .crearTicketCliente(true)
                        .crearTicketAgente(true)
                        .crearTicketSupervisor(true)
                        .crearTicketAdmin(true)

                        /*
                         * Solicitudes de Recursos
                         */
                        .solicitudesRecursosCliente(true)
                        .solicitudesRecursosAgente(true)
                        .solicitudesRecursosSupervisor(true)
                        .solicitudesRecursosAdmin(true)

                        /*
                         * Reportes
                         */
                        .reportesCliente(true)
                        .reportesAgente(true)
                        .reportesSupervisor(true)
                        .reportesAdmin(true)

                        /*
                         * Historial
                         */
                        .historialCliente(true)
                        .historialAgente(true)
                        .historialSupervisor(true)
                        .historialAdmin(true)

                        /*
                         * Compatibilidad anterior
                         */
                        .varianteVisual("A")

                        .build();

        return repository.save(configuracion);
    }


    private ConfiguracionSistemaDTO convertirADTO(
            ConfiguracionSistema configuracion) {

        return new ConfiguracionSistemaDTO(

                /*
                 * Estados globales
                 */
                valorSeguro(
                        configuracion
                                .getCrearTicketActivo()
                ),

                valorSeguro(
                        configuracion
                                .getSolicitudesRecursosActivo()
                ),

                valorSeguro(
                        configuracion
                                .getReportesActivos()
                ),

                valorSeguro(
                        configuracion
                                .getHistorialActivo()
                ),


                /*
                 * Crear Ticket
                 */
                valorSeguro(
                        configuracion
                                .getCrearTicketCliente()
                ),

                valorSeguro(
                        configuracion
                                .getCrearTicketAgente()
                ),

                valorSeguro(
                        configuracion
                                .getCrearTicketSupervisor()
                ),

                valorSeguro(
                        configuracion
                                .getCrearTicketAdmin()
                ),


                /*
                 * Solicitudes de Recursos
                 */
                valorSeguro(
                        configuracion
                                .getSolicitudesRecursosCliente()
                ),

                valorSeguro(
                        configuracion
                                .getSolicitudesRecursosAgente()
                ),

                valorSeguro(
                        configuracion
                                .getSolicitudesRecursosSupervisor()
                ),

                valorSeguro(
                        configuracion
                                .getSolicitudesRecursosAdmin()
                ),


                /*
                 * Reportes
                 */
                valorSeguro(
                        configuracion
                                .getReportesCliente()
                ),

                valorSeguro(
                        configuracion
                                .getReportesAgente()
                ),

                valorSeguro(
                        configuracion
                                .getReportesSupervisor()
                ),

                valorSeguro(
                        configuracion
                                .getReportesAdmin()
                ),


                /*
                 * Historial
                 */
                valorSeguro(
                        configuracion
                                .getHistorialCliente()
                ),

                valorSeguro(
                        configuracion
                                .getHistorialAgente()
                ),

                valorSeguro(
                        configuracion
                                .getHistorialSupervisor()
                ),

                valorSeguro(
                        configuracion
                                .getHistorialAdmin()
                ),

                "A"
        );
    }


    private Boolean valorSeguro(
            Boolean valor) {

        return valor == null
                ? true
                : valor;
    }


    private AuditoriaConfiguracionResponseDTO
            convertirAuditoriaADTO(
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
                auditoria.getVarianteAnterior(),
                auditoria.getVarianteNueva(),
                auditoria.getFechaCambio()
        );
    }


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
         * Los permisos por rol pueden venir null
         * por compatibilidad con configuraciones antiguas.
         *
         * En ese caso se conserva el valor actual.
         */
    }
}