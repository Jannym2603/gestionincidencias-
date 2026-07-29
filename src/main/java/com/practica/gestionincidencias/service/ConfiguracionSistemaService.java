package com.practica.gestionincidencias.service;

import java.time.LocalDateTime;
import java.util.List;

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

    public List<AuditoriaConfiguracionResponseDTO> obtenerAuditoria() {

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

        Boolean crearTicketAnterior =
                configuracion.getCrearTicketActivo();

        Boolean reportesAnterior =
                configuracion.getReportesActivos();

        Boolean historialAnterior =
                configuracion.getHistorialActivo();

        String varianteAnterior =
                configuracion.getVarianteVisual();

        String varianteNueva =
                dto.varianteVisual()
                        .trim()
                        .toUpperCase();

        boolean huboCambios =
                !crearTicketAnterior.equals(
                        dto.crearTicketActivo()
                ) ||
                !reportesAnterior.equals(
                        dto.reportesActivos()
                ) ||
                !historialAnterior.equals(
                        dto.historialActivo()
                ) ||
                !varianteAnterior.equals(
                        varianteNueva
                );

        /*
         * Si no existe ningún cambio, se devuelve la configuración
         * actual sin actualizar la tabla ni crear una auditoría.
         */
        if (!huboCambios) {
            return convertirADTO(configuracion);
        }

        configuracion.setCrearTicketActivo(
                dto.crearTicketActivo()
        );

        configuracion.setReportesActivos(
                dto.reportesActivos()
        );

        configuracion.setHistorialActivo(
                dto.historialActivo()
        );

        configuracion.setVarianteVisual(
                varianteNueva
        );

        ConfiguracionSistema guardada =
                repository.save(configuracion);

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
                authentication.getDetails() instanceof Integer id) {

            usuarioId = id;
        }

        Usuario usuario =
                usuarioRepository
                        .findByCorreo(correo)
                        .orElse(null);

        String nombreUsuario =
                usuario != null
                        ? (
                            usuario.getNombre() + " " +
                            usuario.getApellido()
                        ).trim()
                        : correo;

        AuditoriaConfiguracion auditoria =
                AuditoriaConfiguracion.builder()
                        .usuarioId(usuarioId)
                        .usuarioNombre(nombreUsuario)
                        .usuarioCorreo(correo)
                        .crearTicketAnterior(crearTicketAnterior)
                        .crearTicketNuevo(crearTicketNuevo)
                        .reportesAnterior(reportesAnterior)
                        .reportesNuevo(reportesNuevo)
                        .historialAnterior(historialAnterior)
                        .historialNuevo(historialNuevo)
                        .varianteAnterior(varianteAnterior)
                        .varianteNueva(varianteNueva)
                        .fechaCambio(LocalDateTime.now())
                        .build();

        auditoriaRepository.save(auditoria);
    }

    private ConfiguracionSistema obtenerOCrearConfiguracion() {

        return repository.findAll()
                .stream()
                .findFirst()
                .orElseGet(this::crearConfiguracionInicial);
    }

    private ConfiguracionSistema crearConfiguracionInicial() {

        ConfiguracionSistema configuracion =
                ConfiguracionSistema.builder()
                        .crearTicketActivo(true)
                        .reportesActivos(true)
                        .historialActivo(true)
                        .varianteVisual("A")
                        .build();

        return repository.save(configuracion);
    }

    private ConfiguracionSistemaDTO convertirADTO(
            ConfiguracionSistema configuracion) {

        return new ConfiguracionSistemaDTO(
                configuracion.getCrearTicketActivo(),
                configuracion.getReportesActivos(),
                configuracion.getHistorialActivo(),
                configuracion.getVarianteVisual()
        );
    }

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
                dto.reportesActivos() == null ||
                dto.historialActivo() == null) {

            throw new IllegalArgumentException(
                    "Todos los estados deben tener un valor."
            );
        }

        if (dto.varianteVisual() == null ||
                dto.varianteVisual().isBlank()) {

            throw new IllegalArgumentException(
                    "La variante visual es obligatoria."
            );
        }

        String variante =
                dto.varianteVisual()
                        .trim()
                        .toUpperCase();

        if (!variante.equals("A") &&
                !variante.equals("B")) {

            throw new IllegalArgumentException(
                    "La variante visual debe ser A o B."
            );
        }
    }
}