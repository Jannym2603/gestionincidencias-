package com.practica.gestionincidencias.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.practica.gestionincidencias.dto.ActualizarSolicitudRecursoRequestDTO;
import com.practica.gestionincidencias.dto.SolicitudRecursoResponseDTO;
import com.practica.gestionincidencias.entity.HistorialTicket;
import com.practica.gestionincidencias.entity.Proyecto;
import com.practica.gestionincidencias.entity.SolicitudRecurso;
import com.practica.gestionincidencias.entity.Ticket;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.repository.HistorialTicketRepository;
import com.practica.gestionincidencias.repository.SolicitudRecursoRepository;
import com.practica.gestionincidencias.service.AccesoProyectoService;
import com.practica.gestionincidencias.service.NotificacionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/solicitudes-recursos")
public class SolicitudRecursoController {

    private static final Set<String> ESTADOS_VALIDOS = Set.of(
            "NUEVO",
            "EN_VALIDACION",
            "SOLICITADO_PROVEEDOR",
            "ESPERANDO_PROVEEDOR",
            "RECIBIDO",
            "ENTREGADO",
            "CERRADO",
            "CANCELADO"
    );

    private static final Map<String, Set<String>> TRANSICIONES_VALIDAS =
            Map.of(
                    "NUEVO",
                    Set.of(
                            "EN_VALIDACION",
                            "CANCELADO"
                    ),

                    "EN_VALIDACION",
                    Set.of(
                            "SOLICITADO_PROVEEDOR",
                            "CANCELADO"
                    ),

                    "SOLICITADO_PROVEEDOR",
                    Set.of(
                            "ESPERANDO_PROVEEDOR",
                            "RECIBIDO",
                            "CANCELADO"
                    ),

                    "ESPERANDO_PROVEEDOR",
                    Set.of(
                            "RECIBIDO",
                            "CANCELADO"
                    ),

                    "RECIBIDO",
                    Set.of(
                            "ENTREGADO"
                    ),

                    "ENTREGADO",
                    Set.of(
                            "CERRADO"
                    ),

                    "CERRADO",
                    Set.of(),

                    "CANCELADO",
                    Set.of()
            );

    private final SolicitudRecursoRepository solicitudRecursoRepository;
    private final HistorialTicketRepository historialTicketRepository;
    private final AccesoProyectoService accesoProyectoService;
    private final NotificacionService notificacionService;

    public SolicitudRecursoController(
            SolicitudRecursoRepository solicitudRecursoRepository,
            HistorialTicketRepository historialTicketRepository,
            AccesoProyectoService accesoProyectoService,
            NotificacionService notificacionService) {

        this.solicitudRecursoRepository = solicitudRecursoRepository;
        this.historialTicketRepository = historialTicketRepository;
        this.accesoProyectoService = accesoProyectoService;
        this.notificacionService = notificacionService;
    }

    /*
     * CLIENTE:
     * solo solicitudes de sus propios tickets.
     *
     * AGENTE:
     * solo solicitudes de tickets asignados a él y de
     * proyectos a los que conserve acceso.
     *
     * SUPERVISOR:
     * solicitudes de sus proyectos autorizados.
     *
     * ADMIN:
     * todas las solicitudes.
     */
    @GetMapping
    @PreAuthorize(
            "@moduloAccesoService.puedeVerSolicitudesRecursos(authentication)"
    )
    public List<SolicitudRecursoResponseDTO> listarSolicitudes() {

        Usuario usuario =
                accesoProyectoService.obtenerUsuarioAutenticado();

        String rol =
                accesoProyectoService.obtenerRol(usuario);

        return solicitudRecursoRepository
                .findAll()
                .stream()
                .filter(solicitud ->
                        solicitud != null
                                && solicitud.getTicket() != null
                                && accesoProyectoService.puedeAccederTicket(
                                        usuario,
                                        rol,
                                        solicitud.getTicket()
                                )
                )
                .map(this::convertirADTO)
                .toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize(
            "@moduloAccesoService.puedeVerSolicitudesRecursos(authentication)"
    )
    public SolicitudRecursoResponseDTO obtenerSolicitud(
            @PathVariable Integer id) {

        SolicitudRecurso solicitud =
                buscarSolicitud(id);

        validarAccesoSolicitud(
                solicitud
        );

        return convertirADTO(
                solicitud
        );
    }

    @GetMapping("/ticket/{ticketId}")
    @PreAuthorize(
            "@moduloAccesoService.puedeVerSolicitudesRecursos(authentication)"
    )
    public SolicitudRecursoResponseDTO obtenerPorTicket(
            @PathVariable Integer ticketId) {

        SolicitudRecurso solicitud =
                solicitudRecursoRepository
                        .findByTicketId(ticketId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "El ticket no tiene una solicitud de recurso asociada."
                                )
                        );

        validarAccesoSolicitud(
                solicitud
        );

        return convertirADTO(
                solicitud
        );
    }

    /*
     * Los datos administrativos del proveedor se modifican
     * únicamente por ADMIN o SUPERVISOR.
     *
     * CLIENTE y AGENTE pueden consultar la solicitud,
     * pero no cambiar proveedor, fechas ni flujo interno.
     */
    @PutMapping("/{id}")
    @PreAuthorize(
            "@moduloAccesoService.puedeAdministrarSolicitudesRecursos(authentication)"
    )
    @Transactional
    public SolicitudRecursoResponseDTO actualizarSolicitud(
            @PathVariable Integer id,
            @Valid @RequestBody
            ActualizarSolicitudRecursoRequestDTO request) {

        SolicitudRecurso solicitud =
                buscarSolicitud(id);

        validarAccesoSolicitud(
                solicitud
        );

        Usuario usuario =
                accesoProyectoService
                        .obtenerUsuarioAutenticado();

        SnapshotSolicitudRecurso anterior =
                crearSnapshot(
                        solicitud
                );

        aplicarCambios(
                solicitud,
                request
        );

        solicitud.setFechaActualizacion(
                LocalDateTime.now()
        );

        SolicitudRecurso actualizada =
                solicitudRecursoRepository.save(
                        solicitud
                );

        registrarCambiosEnHistorial(
                actualizada,
                anterior,
                usuario
        );

        notificarCambioEstadoRecursoSiAplica(
                actualizada,
                anterior
        );

        return convertirADTO(
                actualizada
        );
    }

    private SolicitudRecurso buscarSolicitud(
            Integer id) {

        return solicitudRecursoRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Solicitud de recurso no encontrada."
                        )
                );
    }

    private void validarAccesoSolicitud(
            SolicitudRecurso solicitud) {

        if (solicitud == null
                || solicitud.getTicket() == null) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "La solicitud no tiene un ticket asociado."
            );
        }

        Usuario usuario =
                accesoProyectoService.obtenerUsuarioAutenticado();

        String rol =
                accesoProyectoService.obtenerRol(usuario);

        accesoProyectoService.validarAccesoTicket(
                usuario,
                rol,
                solicitud.getTicket()
        );
    }

    private void aplicarCambios(
            SolicitudRecurso solicitud,
            ActualizarSolicitudRecursoRequestDTO request) {

        if (request.getCategoria() != null) {

            String categoria =
                    request.getCategoria()
                            .trim()
                            .toUpperCase();

            if (categoria.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "La categoría no puede quedar vacía."
                );
            }

            solicitud.setCategoria(
                    categoria
            );
        }

        if (request.getRecurso() != null) {

            String recurso =
                    request.getRecurso()
                            .trim();

            if (recurso.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "El recurso no puede quedar vacío."
                );
            }

            solicitud.setRecurso(
                    recurso
            );
        }

        if (request.getCantidad() != null) {

            if (request.getCantidad() < 1) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "La cantidad debe ser mayor o igual a 1."
                );
            }

            solicitud.setCantidad(
                    request.getCantidad()
            );
        }

        if (request.getProveedor() != null) {

            solicitud.setProveedor(
                    normalizarOpcional(
                            request.getProveedor()
                    )
            );
        }

        if (request.getObservaciones() != null) {

            solicitud.setObservaciones(
                    normalizarOpcional(
                            request.getObservaciones()
                    )
            );
        }

        solicitud.setFechaSolicitudProveedor(
                request.getFechaSolicitudProveedor() != null
                        ? request.getFechaSolicitudProveedor()
                        : solicitud.getFechaSolicitudProveedor()
        );

        if (request.getFechaEstimadaEntrega() != null
                && !Objects.equals(
                        request.getFechaEstimadaEntrega(),
                        solicitud.getFechaEstimadaEntrega()
                )) {

            solicitud.setFechaEstimadaEntrega(
                    request.getFechaEstimadaEntrega()
            );

            /*
             * Si la fecha fue reprogramada, permitimos que el sistema
             * pueda generar una nueva alerta si esa nueva fecha vence.
             */
            solicitud.setFechaNotificacionRetraso(
                    null
            );
        }

        solicitud.setFechaRecepcion(
                request.getFechaRecepcion() != null
                        ? request.getFechaRecepcion()
                        : solicitud.getFechaRecepcion()
        );

        solicitud.setFechaEntregaCliente(
                request.getFechaEntregaCliente() != null
                        ? request.getFechaEntregaCliente()
                        : solicitud.getFechaEntregaCliente()
        );

        if (request.getEstadoRecurso() != null) {

            String estadoNuevo =
                    request.getEstadoRecurso()
                            .trim()
                            .toUpperCase();

            cambiarEstado(
                    solicitud,
                    estadoNuevo
            );
        }
    }

    private void cambiarEstado(
            SolicitudRecurso solicitud,
            String nuevoEstado) {

        validarEstado(
                nuevoEstado
        );

        String estadoActual =
                solicitud.getEstadoRecurso() == null
                        ? "NUEVO"
                        : solicitud.getEstadoRecurso()
                                .trim()
                                .toUpperCase();

        validarEstado(
                estadoActual
        );

        if (estadoActual.equals(
                nuevoEstado)) {

            return;
        }

        if (!TRANSICIONES_VALIDAS
                .get(estadoActual)
                .contains(nuevoEstado)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Transición de recurso no permitida: "
                            + estadoActual
                            + " -> "
                            + nuevoEstado
                            + "."
            );
        }

        validarDatosParaEstado(
                solicitud,
                nuevoEstado
        );

        solicitud.setEstadoRecurso(
                nuevoEstado
        );

        LocalDateTime ahora =
                LocalDateTime.now();

        if ("SOLICITADO_PROVEEDOR".equals(
                nuevoEstado)
                && solicitud.getFechaSolicitudProveedor() == null) {

            solicitud.setFechaSolicitudProveedor(
                    ahora
            );
        }

        if ("RECIBIDO".equals(
                nuevoEstado)
                && solicitud.getFechaRecepcion() == null) {

            solicitud.setFechaRecepcion(
                    ahora
            );
        }

        if ("ENTREGADO".equals(
                nuevoEstado)
                && solicitud.getFechaEntregaCliente() == null) {

            solicitud.setFechaEntregaCliente(
                    ahora
            );
        }
    }

    private void validarDatosParaEstado(
            SolicitudRecurso solicitud,
            String nuevoEstado) {

        if (Set.of(
                "SOLICITADO_PROVEEDOR",
                "ESPERANDO_PROVEEDOR",
                "RECIBIDO",
                "ENTREGADO",
                "CERRADO"
        ).contains(nuevoEstado)) {

            if (solicitud.getProveedor() == null
                    || solicitud.getProveedor().isBlank()) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Debes indicar el proveedor antes de avanzar la solicitud."
                );
            }
        }

        if ("ESPERANDO_PROVEEDOR".equals(
                nuevoEstado)
                && solicitud.getFechaEstimadaEntrega() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Debes indicar la fecha estimada de entrega."
            );
        }

        if ("CERRADO".equals(
                nuevoEstado)
                && solicitud.getFechaEntregaCliente() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La solicitud debe haber sido entregada al cliente antes de cerrarla."
            );
        }
    }

    private void validarEstado(
            String estado) {

        if (!ESTADOS_VALIDOS.contains(
                estado)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Estado de recurso no válido."
            );
        }
    }

    private String normalizarOpcional(
            String valor) {

        if (valor == null
                || valor.isBlank()) {

            return null;
        }

        return valor.trim();
    }

    private void notificarCambioEstadoRecursoSiAplica(
            SolicitudRecurso solicitud,
            SnapshotSolicitudRecurso anterior) {

        if (solicitud == null
                || anterior == null) {

            return;
        }

        String estadoAnterior =
                normalizarValorHistorial(
                        anterior.estadoRecurso()
                );

        String estadoNuevo =
                normalizarValorHistorial(
                        solicitud.getEstadoRecurso()
                );

        if (Objects.equals(
                estadoAnterior,
                estadoNuevo
        )) {

            return;
        }

        notificacionService
                .notificarCambioEstadoRecurso(
                        solicitud,
                        estadoAnterior,
                        estadoNuevo
                );
    }


    /*
     * =====================================================
     * HISTORIAL DE SOLICITUDES DE RECURSOS
     * =====================================================
     */

    private SnapshotSolicitudRecurso crearSnapshot(
            SolicitudRecurso solicitud) {

        return new SnapshotSolicitudRecurso(
                solicitud.getCategoria(),
                solicitud.getRecurso(),
                solicitud.getCantidad(),
                solicitud.getProveedor(),
                solicitud.getEstadoRecurso(),
                solicitud.getFechaSolicitudProveedor(),
                solicitud.getFechaEstimadaEntrega(),
                solicitud.getFechaRecepcion(),
                solicitud.getFechaEntregaCliente(),
                solicitud.getObservaciones()
        );
    }


    private void registrarCambiosEnHistorial(
            SolicitudRecurso solicitud,
            SnapshotSolicitudRecurso anterior,
            Usuario usuario) {

        if (solicitud == null
                || solicitud.getTicket() == null
                || anterior == null) {

            return;
        }

        registrarCambioSiAplica(
                solicitud.getTicket(),
                usuario,
                "CAMBIO_CATEGORIA_RECURSO",
                anterior.categoria(),
                solicitud.getCategoria(),
                "Se actualizó la categoría de la solicitud de recurso."
        );

        registrarCambioSiAplica(
                solicitud.getTicket(),
                usuario,
                "CAMBIO_RECURSO",
                anterior.recurso(),
                solicitud.getRecurso(),
                "Se actualizó el recurso solicitado."
        );

        registrarCambioSiAplica(
                solicitud.getTicket(),
                usuario,
                "CAMBIO_CANTIDAD_RECURSO",
                anterior.cantidad(),
                solicitud.getCantidad(),
                "Se actualizó la cantidad solicitada."
        );

        registrarCambioSiAplica(
                solicitud.getTicket(),
                usuario,
                "CAMBIO_PROVEEDOR",
                anterior.proveedor(),
                solicitud.getProveedor(),
                "Se actualizó el proveedor asociado a la solicitud."
        );

        registrarCambioEstadoSiAplica(
                solicitud,
                anterior.estadoRecurso(),
                usuario
        );

        registrarCambioSiAplica(
                solicitud.getTicket(),
                usuario,
                "CAMBIO_FECHA_SOLICITUD_PROVEEDOR",
                anterior.fechaSolicitudProveedor(),
                solicitud.getFechaSolicitudProveedor(),
                "Se actualizó la fecha de solicitud al proveedor."
        );

        registrarCambioSiAplica(
                solicitud.getTicket(),
                usuario,
                "CAMBIO_FECHA_ESTIMADA_RECURSO",
                anterior.fechaEstimadaEntrega(),
                solicitud.getFechaEstimadaEntrega(),
                "Se actualizó la fecha estimada de entrega del recurso."
        );

        registrarCambioSiAplica(
                solicitud.getTicket(),
                usuario,
                "CAMBIO_FECHA_RECEPCION_RECURSO",
                anterior.fechaRecepcion(),
                solicitud.getFechaRecepcion(),
                "Se actualizó la fecha de recepción del recurso."
        );

        registrarCambioSiAplica(
                solicitud.getTicket(),
                usuario,
                "CAMBIO_FECHA_ENTREGA_RECURSO",
                anterior.fechaEntregaCliente(),
                solicitud.getFechaEntregaCliente(),
                "Se actualizó la fecha de entrega del recurso al cliente."
        );

        registrarCambioSiAplica(
                solicitud.getTicket(),
                usuario,
                "CAMBIO_OBSERVACIONES_RECURSO",
                anterior.observaciones(),
                solicitud.getObservaciones(),
                "Se actualizaron las observaciones de la solicitud de recurso."
        );
    }


    private void registrarCambioEstadoSiAplica(
            SolicitudRecurso solicitud,
            String estadoAnterior,
            Usuario usuario) {

        String estadoNuevo =
                solicitud.getEstadoRecurso();

        if (Objects.equals(
                normalizarValorHistorial(estadoAnterior),
                normalizarValorHistorial(estadoNuevo)
        )) {

            return;
        }

        String descripcion =
                descripcionCambioEstadoRecurso(
                        estadoNuevo
                );

        registrarHistorial(
                solicitud.getTicket(),
                usuario,
                "CAMBIO_ESTADO_RECURSO",
                estadoAnterior,
                estadoNuevo,
                descripcion
        );
    }


    private String descripcionCambioEstadoRecurso(
            String estado) {

        String valor =
                estado == null
                        ? ""
                        : estado.trim().toUpperCase();

        return switch (valor) {
            case "EN_VALIDACION" ->
                    "La solicitud de recurso pasó a validación.";

            case "SOLICITADO_PROVEEDOR" ->
                    "La solicitud de recurso fue enviada al proveedor.";

            case "ESPERANDO_PROVEEDOR" ->
                    "La solicitud de recurso quedó en espera del proveedor.";

            case "RECIBIDO" ->
                    "El recurso fue recibido del proveedor.";

            case "ENTREGADO" ->
                    "El recurso fue entregado al cliente.";

            case "CERRADO" ->
                    "La solicitud de recurso fue cerrada.";

            case "CANCELADO" ->
                    "La solicitud de recurso fue cancelada.";

            default ->
                    "Se actualizó el estado de la solicitud de recurso.";
        };
    }


    private void registrarCambioSiAplica(
            Ticket ticket,
            Usuario usuario,
            String accion,
            Object valorAnterior,
            Object valorNuevo,
            String descripcion) {

        String anterior =
                normalizarValorHistorial(
                        valorAnterior
                );

        String nuevo =
                normalizarValorHistorial(
                        valorNuevo
                );

        if (Objects.equals(
                anterior,
                nuevo
        )) {

            return;
        }

        registrarHistorial(
                ticket,
                usuario,
                accion,
                anterior,
                nuevo,
                descripcion
        );
    }


    private void registrarHistorial(
            Ticket ticket,
            Usuario usuario,
            String accion,
            Object valorAnterior,
            Object valorNuevo,
            String descripcion) {

        if (ticket == null) {
            return;
        }

        HistorialTicket historial =
                HistorialTicket.builder()
                        .ticket(ticket)
                        .usuario(usuario)
                        .accion(accion)
                        .valorAnterior(
                                normalizarValorHistorial(
                                        valorAnterior
                                )
                        )
                        .valorNuevo(
                                normalizarValorHistorial(
                                        valorNuevo
                                )
                        )
                        .descripcion(descripcion)
                        .fechaCreacion(
                                LocalDateTime.now()
                        )
                        .build();

        historialTicketRepository.save(
                historial
        );
    }


    private String normalizarValorHistorial(
            Object valor) {

        if (valor == null) {
            return null;
        }

        String texto =
                String.valueOf(
                        valor
                ).trim();

        return texto.isBlank()
                ? null
                : texto;
    }


    private record SnapshotSolicitudRecurso(
            String categoria,
            String recurso,
            Integer cantidad,
            String proveedor,
            String estadoRecurso,
            LocalDateTime fechaSolicitudProveedor,
            LocalDateTime fechaEstimadaEntrega,
            LocalDateTime fechaRecepcion,
            LocalDateTime fechaEntregaCliente,
            String observaciones) {
    }


    private SolicitudRecursoResponseDTO convertirADTO(
            SolicitudRecurso solicitud) {

        Ticket ticket =
                solicitud.getTicket();

        Usuario cliente =
                ticket != null
                        ? ticket.getCliente()
                        : null;

        Proyecto proyecto =
                ticket != null
                        ? ticket.getProyecto()
                        : null;

        String clienteNombre = null;

        if (cliente != null) {

            clienteNombre =
                    (
                            (cliente.getNombre() == null
                                    ? ""
                                    : cliente.getNombre())
                            + " "
                            + (cliente.getApellido() == null
                                    ? ""
                                    : cliente.getApellido())
                    ).trim();
        }

        Integer companiaId = null;
        String companiaNombre = null;

        if (proyecto != null
                && proyecto.getCompania() != null) {

            companiaId =
                    proyecto.getCompania()
                            .getId();

            companiaNombre =
                    proyecto.getCompania()
                            .getNombre();
        }

        return new SolicitudRecursoResponseDTO(
                solicitud.getId(),

                ticket != null
                        ? ticket.getId()
                        : null,

                ticket != null
                        ? ticket.getNumeroTicket()
                        : null,

                ticket != null
                        ? ticket.getTitulo()
                        : null,

                ticket != null
                        ? ticket.getTipoAtencion()
                        : null,

                cliente != null
                        ? cliente.getId()
                        : null,

                clienteNombre,

                proyecto != null
                        ? proyecto.getId()
                        : null,

                proyecto != null
                        ? proyecto.getNombre()
                        : null,

                companiaId,
                companiaNombre,

                solicitud.getCategoria(),
                solicitud.getRecurso(),
                solicitud.getCantidad(),

                solicitud.getProveedor(),
                solicitud.getEstadoRecurso(),
                solicitud.estaRetrasada(),

                solicitud.getFechaSolicitudProveedor(),
                solicitud.getFechaEstimadaEntrega(),
                solicitud.getFechaRecepcion(),
                solicitud.getFechaEntregaCliente(),

                solicitud.getObservaciones(),

                solicitud.getFechaCreacion(),
                solicitud.getFechaActualizacion()
        );
    }
}
