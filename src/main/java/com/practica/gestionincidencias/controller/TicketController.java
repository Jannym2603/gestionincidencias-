package com.practica.gestionincidencias.controller;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.practica.gestionincidencias.dto.AsignarTicketRequestDTO;
import com.practica.gestionincidencias.dto.CambiarEstadoTicketRequestDTO;
import com.practica.gestionincidencias.dto.CambiarPrioridadTicketRequestDTO;
import com.practica.gestionincidencias.dto.SolicitudRecursoRequestDTO;
import com.practica.gestionincidencias.dto.TicketRequestDTO;
import com.practica.gestionincidencias.dto.TicketResponseDTO;
import com.practica.gestionincidencias.entity.HistorialTicket;
import com.practica.gestionincidencias.entity.Proyecto;
import com.practica.gestionincidencias.entity.SolicitudRecurso;
import com.practica.gestionincidencias.entity.Ticket;
import com.practica.gestionincidencias.entity.TipoIncidencia;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.repository.HistorialTicketRepository;
import com.practica.gestionincidencias.repository.ProyectoRepository;
import com.practica.gestionincidencias.repository.SolicitudRecursoRepository;
import com.practica.gestionincidencias.repository.TicketRepository;
import com.practica.gestionincidencias.repository.TipoIncidenciaRepository;
import com.practica.gestionincidencias.repository.UsuarioProyectoRepository;
import com.practica.gestionincidencias.repository.UsuarioRepository;
import com.practica.gestionincidencias.service.AccesoProyectoService;
import com.practica.gestionincidencias.service.NotificacionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private static final Set<String> PRIORIDADES_VALIDAS = Set.of(
            "P1_CRITICA",
            "P2_ALTA",
            "P3_MEDIA",
            "P4_BAJA"
    );

    private static final Map<String, Set<String>> TRANSICIONES_VALIDAS =
            Map.of(
                    "NUEVO", Set.of("ASIGNADO"),
                    "ASIGNADO", Set.of("EN_PROGRESO"),
                    "EN_PROGRESO", Set.of("RESUELTO"),
                    "RESUELTO", Set.of("CERRADO"),
                    "CERRADO", Set.of()
            );

    private final TicketRepository ticketRepository;
    private final TipoIncidenciaRepository tipoIncidenciaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProyectoRepository proyectoRepository;
    private final SolicitudRecursoRepository solicitudRecursoRepository;
    private final UsuarioProyectoRepository usuarioProyectoRepository;
    private final HistorialTicketRepository historialTicketRepository;
    private final NotificacionService notificacionService;
    private final AccesoProyectoService accesoProyectoService;

    public TicketController(
            TicketRepository ticketRepository,
            TipoIncidenciaRepository tipoIncidenciaRepository,
            UsuarioRepository usuarioRepository,
            ProyectoRepository proyectoRepository,
            SolicitudRecursoRepository solicitudRecursoRepository,
            UsuarioProyectoRepository usuarioProyectoRepository,
            HistorialTicketRepository historialTicketRepository,
            NotificacionService notificacionService,
            AccesoProyectoService accesoProyectoService) {

        this.ticketRepository = ticketRepository;
        this.tipoIncidenciaRepository = tipoIncidenciaRepository;
        this.usuarioRepository = usuarioRepository;
        this.proyectoRepository = proyectoRepository;
        this.solicitudRecursoRepository = solicitudRecursoRepository;
        this.usuarioProyectoRepository = usuarioProyectoRepository;
        this.historialTicketRepository = historialTicketRepository;
        this.notificacionService = notificacionService;
        this.accesoProyectoService = accesoProyectoService;
    }

    @GetMapping
    public List<TicketResponseDTO> listarTickets() {

        Usuario usuarioAutenticado =
                accesoProyectoService.obtenerUsuarioAutenticado();

        String rol =
                accesoProyectoService.obtenerRol(
                        usuarioAutenticado
                );

        List<Ticket> tickets;

        if (rol.equals("ADMIN")) {

            tickets =
                    ticketRepository.findAll();

        } else {

            List<Integer> proyectoIds =
                    usuarioProyectoRepository
                            .findByUsuarioIdAndEstadoTrue(
                                    usuarioAutenticado.getId()
                            )
                            .stream()
                            .filter(asignacion ->
                                    asignacion.getProyecto() != null
                                            && Boolean.TRUE.equals(
                                                    asignacion
                                                            .getProyecto()
                                                            .getEstado()
                                            )
                                            && asignacion
                                                    .getProyecto()
                                                    .getCompania() != null
                                            && Boolean.TRUE.equals(
                                                    asignacion
                                                            .getProyecto()
                                                            .getCompania()
                                                            .getEstado()
                                            )
                            )
                            .map(asignacion ->
                                    asignacion
                                            .getProyecto()
                                            .getId()
                            )
                            .distinct()
                            .toList();

            if (proyectoIds.isEmpty()) {
                return List.of();
            }

            tickets =
                    switch (rol) {

                        case "CLIENTE" ->
                                ticketRepository
                                        .findByClienteIdAndProyectoIdInOrderByFechaCreacionDesc(
                                                usuarioAutenticado.getId(),
                                                proyectoIds
                                        );

                        case "AGENTE" ->
                                ticketRepository
                                        .findByAgenteAsignadoIdAndProyectoIdInOrderByFechaCreacionDesc(
                                                usuarioAutenticado.getId(),
                                                proyectoIds
                                        );

                        case "SUPERVISOR" ->
                                ticketRepository
                                        .findByProyectoIdInOrderByFechaCreacionDesc(
                                                proyectoIds
                                        );

                        default ->
                                throw new RuntimeException(
                                        "El rol del usuario no tiene acceso "
                                                + "al listado de tickets."
                                );
                    };
        }

        return tickets.stream()
                .map(this::convertirADTO)
                .toList();
    }

    @GetMapping("/{id}")
    public TicketResponseDTO obtenerTicket(
            @PathVariable Integer id) {

        Ticket ticket = ticketRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Ticket no encontrado."
                        )
                );

        Usuario usuario =
                accesoProyectoService.obtenerUsuarioAutenticado();

        String rol =
                accesoProyectoService.obtenerRol(usuario);

        accesoProyectoService.validarAccesoTicket(
                usuario,
                rol,
                ticket
        );

        return convertirADTO(ticket);
    }

    @PostMapping
    @Transactional
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(
            "@moduloAccesoService.puedeCrearTicket(authentication)"
    )
    public TicketResponseDTO crearTicket(
            @Valid @RequestBody TicketRequestDTO request) {

        Usuario usuarioAutenticado =
                accesoProyectoService.obtenerUsuarioAutenticado();

        String rolAutenticado =
                accesoProyectoService.obtenerRol(
                        usuarioAutenticado
                );

        TipoIncidencia tipoIncidencia =
                tipoIncidenciaRepository
                        .findById(request.getTipoIncidenciaId())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Tipo de incidencia no encontrado."
                                )
                        );

        Usuario cliente =
                usuarioRepository
                        .findById(request.getClienteId())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Cliente no encontrado."
                                )
                        );

        Proyecto proyecto =
                proyectoRepository
                        .findById(request.getProyectoId())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Proyecto no encontrado."
                                )
                        );

        if ("CLIENTE".equals(rolAutenticado)) {
            if (!usuarioAutenticado.getId().equals(cliente.getId())) {
                throw new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Un cliente solo puede registrar tickets a su propio nombre."
                );
            }

            cliente = usuarioAutenticado;
        }

        if (!accesoProyectoService.esRol(cliente, "CLIENTE")) {
            throw new RuntimeException(
                    "El usuario seleccionado no tiene rol CLIENTE."
            );
        }

        if (!Boolean.TRUE.equals(cliente.getEstado())) {
            throw new RuntimeException(
                    "No se puede registrar un ticket para un cliente inactivo."
            );
        }

        accesoProyectoService.validarProyectoDisponible(proyecto);

        if ("SUPERVISOR".equals(rolAutenticado)
                || "AGENTE".equals(rolAutenticado)) {
            accesoProyectoService.validarAccesoProyecto(
                    usuarioAutenticado,
                    rolAutenticado,
                    proyecto
            );
        }

        boolean clienteTieneAcceso =
                usuarioProyectoRepository
                        .existsByUsuarioIdAndProyectoIdAndEstadoTrue(
                                cliente.getId(),
                                proyecto.getId()
                        );

        if (!clienteTieneAcceso) {
            throw new RuntimeException(
                    "El cliente no tiene acceso al proyecto seleccionado."
            );
        }

        String numeroTicket =
                generarNumeroTicket();

        String prioridadCalculada =
                calcularPrioridad(
                        request.getImpacto(),
                        request.getUrgencia()
                );

        String tipoAtencion =
                normalizarTipoAtencion(
                        request.getTipoAtencion()
                );

        validarSolicitudRecurso(
                tipoAtencion,
                request.getSolicitudRecurso()
        );

        LocalDateTime fechaCreacion =
                LocalDateTime.now();

        Ticket ticket = Ticket.builder()
                .numeroTicket(numeroTicket)
                .titulo(request.getTitulo().trim())
                .descripcion(request.getDescripcion().trim())
                .tipoIncidencia(tipoIncidencia)
                .cliente(cliente)
                .agenteAsignado(null)
                .proyecto(proyecto)
                .tipoAtencion(tipoAtencion)
                .estado("NUEVO")
                .prioridad(prioridadCalculada)
                .severidad(
                        normalizarOpcional(
                                request.getSeveridad()
                        )
                )
                .criticidad(
                        normalizarOpcional(
                                request.getCriticidad()
                        )
                )
                .impacto(
                        request.getImpacto()
                                .trim()
                                .toUpperCase()
                )
                .urgencia(
                        request.getUrgencia()
                                .trim()
                                .toUpperCase()
                )
                .fechaCreacion(fechaCreacion)
                .fechaActualizacion(fechaCreacion)
                .fechaResolucion(null)
                .fechaPrimeraRespuesta(null)
                .slaRespuestaCumplido(null)
                .slaResolucionCumplido(null)
                .build();

        configurarFechasSla(ticket);

        Ticket ticketGuardado =
                ticketRepository.save(ticket);

        if ("RECURSO_EXTERNO".equals(tipoAtencion)) {

            SolicitudRecurso solicitudCreada =
                    crearSolicitudRecurso(
                            ticketGuardado,
                            request.getSolicitudRecurso(),
                            fechaCreacion
                    );

            registrarHistorial(
                    ticketGuardado,
                    usuarioAutenticado,
                    "RECURSO_CREADO",
                    null,
                    "NUEVO",
                    construirDescripcionSolicitudRecursoCreada(
                            solicitudCreada
                    )
            );
        }

        registrarHistorial(
                ticketGuardado,
                usuarioAutenticado,
                "CREACION_TICKET",
                null,
                "NUEVO",
                "Se creó el ticket "
                        + ticketGuardado.getNumeroTicket()
                        + " en el proyecto "
                        + proyecto.getNombre()
                        + ". Tipo de atención: "
                        + tipoAtencion
        );

        notificacionService
                .notificarTicketCreado(ticketGuardado);

        return convertirADTO(ticketGuardado);
    }

    @PutMapping("/{id}/asignar")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public TicketResponseDTO asignarTicket(
            @PathVariable Integer id,
            @Valid @RequestBody AsignarTicketRequestDTO request) {

        Ticket ticket =
                ticketRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Ticket no encontrado."
                                )
                        );

        Usuario usuarioAutenticado =
                accesoProyectoService.obtenerUsuarioAutenticado();

        String rolAutenticado =
                accesoProyectoService.obtenerRol(usuarioAutenticado);

        accesoProyectoService.validarAccesoTicket(
                usuarioAutenticado,
                rolAutenticado,
                ticket
        );

        Usuario agente =
                usuarioRepository
                        .findById(request.getAgenteId())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Agente no encontrado."
                                )
                        );

        if (!Boolean.TRUE.equals(agente.getEstado())) {
            throw new RuntimeException(
                    "No se puede asignar el ticket a un agente inactivo."
            );
        }

        if (!accesoProyectoService.esRol(agente, "AGENTE")) {
            throw new RuntimeException(
                    "El usuario seleccionado no tiene rol AGENTE."
            );
        }

        accesoProyectoService.validarProyectoDisponible(
                ticket.getProyecto()
        );

        if (
                ticket.getProyecto() == null
                        || !accesoProyectoService.usuarioTieneAccesoProyecto(
                                agente.getId(),
                                ticket.getProyecto().getId()
                        )
        ) {
            throw new RuntimeException(
                    "El agente no tiene acceso al proyecto del ticket."
            );
        }

        String agenteAnterior =
                ticket.getAgenteAsignado() != null
                        ? ticket.getAgenteAsignado().getNombre()
                        + " "
                        + ticket.getAgenteAsignado().getApellido()
                        : "SIN_ASIGNAR";

        String agenteNuevo =
                agente.getNombre()
                        + " "
                        + agente.getApellido();

        String estadoAnterior =
                ticket.getEstado();

        /*
         * La asignación de agente se mantiene disponible también para
         * RECURSO_EXTERNO. Es una asignación administrativa de
         * responsabilidad y no sustituye ni modifica el estado del recurso.
         *
         * Conservamos el comportamiento existente de marcar el ticket como
         * ASIGNADO cuando recibe su primer agente. A partir de ahí, el flujo
         * operativo manual queda bloqueado para RECURSO_EXTERNO y el avance
         * real continúa en SolicitudRecurso.estadoRecurso.
         */
        if (ticket.getAgenteAsignado() == null) {

            validarTransicion(
                    estadoAnterior,
                    "ASIGNADO"
            );

            ticket.setEstado("ASIGNADO");
        }

        ticket.setAgenteAsignado(agente);

        ticket.setFechaActualizacion(
                LocalDateTime.now()
        );

        Ticket ticketActualizado =
                ticketRepository.save(ticket);

        registrarHistorial(
                ticketActualizado,
                usuarioAutenticado,
                "ASIGNACION_AGENTE",
                agenteAnterior,
                agenteNuevo,
                "Se asignó el ticket al agente "
                        + agenteNuevo
        );

        if (!estadoAnterior.equals(
                ticketActualizado.getEstado())) {

            registrarHistorial(
                    ticketActualizado,
                    usuarioAutenticado,
                    "CAMBIO_ESTADO",
                    estadoAnterior,
                    ticketActualizado.getEstado(),
                    "Se cambió el estado automáticamente "
                            + "por la asignación del agente."
            );
        }

        notificacionService.notificarTicketAsignado(
                ticketActualizado,
                agente
        );

        return convertirADTO(ticketActualizado);
    }

    @PutMapping("/{id}/estado")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR', 'AGENTE')")
    public TicketResponseDTO cambiarEstado(
            @PathVariable Integer id,
            @Valid @RequestBody CambiarEstadoTicketRequestDTO request) {

        Ticket ticket =
                ticketRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Ticket no encontrado."
                                )
                        );

        Usuario usuarioAutenticado =
                accesoProyectoService.obtenerUsuarioAutenticado();

        String rolAutenticado =
                accesoProyectoService.obtenerRol(usuarioAutenticado);

        accesoProyectoService.validarAccesoTicket(
                usuarioAutenticado,
                rolAutenticado,
                ticket
        );

        /*
         * Los tickets de RECURSO_EXTERNO no utilizan el flujo
         * operativo NUEVO -> ASIGNADO -> EN_PROGRESO -> RESUELTO
         * -> CERRADO.
         *
         * Su avance se administra exclusivamente mediante
         * SolicitudRecurso.estadoRecurso.
         *
         * Esta validación es de backend, por lo que también bloquea
         * llamadas directas al endpoint aunque se intente omitir
         * la restricción del frontend.
         */
        if (esRecursoExterno(ticket)) {

            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Los tickets de recurso externo no utilizan el flujo "
                            + "operativo de estados. Administra el avance desde "
                            + "Solicitudes de Recursos."
            );
        }

        String estadoAnterior =
                ticket.getEstado();

        String nuevoEstado =
                request.getEstado()
                        .trim()
                        .toUpperCase();

        validarEstado(nuevoEstado);

        validarTransicion(
                estadoAnterior,
                nuevoEstado
        );

        String notaResolucion =
                normalizarOpcional(
                        request.getNotaResolucion()
                );

        if (
                (
                        nuevoEstado.equals("RESUELTO")
                                || nuevoEstado.equals("CERRADO")
                )
                        && (
                        notaResolucion == null
                                || notaResolucion.isBlank()
                )
        ) {

            throw new RuntimeException(
                    "Debes agregar una nota de resolución "
                            + "para resolver o cerrar el ticket."
            );
        }

        LocalDateTime ahora =
                LocalDateTime.now();

        ticket.setEstado(nuevoEstado);
        ticket.setFechaActualizacion(ahora);

        if (
                nuevoEstado.equals("RESUELTO")
                        && ticket.getFechaResolucion() == null
        ) {

            ticket.setFechaResolucion(ahora);

            evaluarCumplimientoResolucion(ticket);
        }

        /*
         * El tiempo abierto del ticket termina solamente
         * cuando el ticket llega al estado CERRADO.
         */
        if (nuevoEstado.equals("CERRADO")) {

            /*
             * Protección para tickets antiguos o datos incompletos:
             * si llega al cierre sin fecha de resolución, se registra
             * primero la resolución en el mismo momento.
             */
            if (ticket.getFechaResolucion() == null) {

                ticket.setFechaResolucion(ahora);
                evaluarCumplimientoResolucion(ticket);
            }

            if (ticket.getFechaCierre() == null) {
                ticket.setFechaCierre(ahora);
            }
        }

        Ticket ticketActualizado =
                ticketRepository.save(ticket);

        String descripcion =
                "Se cambió el estado del ticket de "
                        + estadoAnterior
                        + " a "
                        + nuevoEstado;

        if (
                notaResolucion != null
                        && !notaResolucion.isBlank()
        ) {

            descripcion +=
                    ". Nota: " + notaResolucion;
        }

        registrarHistorial(
                ticketActualizado,
                usuarioAutenticado,
                "CAMBIO_ESTADO",
                estadoAnterior,
                nuevoEstado,
                descripcion
        );

        notificacionService.notificarCambioEstado(
                ticketActualizado,
                estadoAnterior,
                nuevoEstado,
                notaResolucion
        );

        return convertirADTO(ticketActualizado);
    }

    @PutMapping("/{id}/prioridad")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR', 'AGENTE')")
    public TicketResponseDTO cambiarPrioridad(
            @PathVariable Integer id,
            @Valid @RequestBody CambiarPrioridadTicketRequestDTO request) {

        Ticket ticket =
                ticketRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Ticket no encontrado."
                                )
                        );

        Usuario usuario =
                accesoProyectoService.obtenerUsuarioAutenticado();

        String rolAutenticado =
                accesoProyectoService.obtenerRol(usuario);

        accesoProyectoService.validarAccesoTicket(
                usuario,
                rolAutenticado,
                ticket
        );

        if (
                request.getUsuarioId() != null
                        && !usuario.getId().equals(request.getUsuarioId())
        ) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "No puedes registrar el cambio a nombre de otro usuario."
            );
        }

        String prioridadAnterior =
                ticket.getPrioridad();

        String prioridadNueva =
                request.getPrioridad()
                        .trim()
                        .toUpperCase();

        if (!PRIORIDADES_VALIDAS.contains(
                prioridadNueva)) {

            throw new RuntimeException(
                    "Prioridad no válida. "
                            + "Use P1_CRITICA, P2_ALTA, "
                            + "P3_MEDIA o P4_BAJA."
            );
        }

        ticket.setPrioridad(prioridadNueva);

        configurarFechasSla(ticket);
        evaluarCumplimientoRespuesta(ticket);
        evaluarCumplimientoResolucion(ticket);

        ticket.setFechaActualizacion(
                LocalDateTime.now()
        );

        Ticket ticketActualizado =
                ticketRepository.save(ticket);

        String justificacion =
                normalizarOpcional(
                        request.getJustificacion()
                );

        String descripcion =
                "Se ajustó manualmente la prioridad de "
                        + prioridadAnterior
                        + " a "
                        + prioridadNueva;

        if (
                justificacion != null
                        && !justificacion.isBlank()
        ) {

            descripcion +=
                    ". Justificación: "
                            + justificacion;
        }

        registrarHistorial(
                ticketActualizado,
                usuario,
                "CAMBIO_PRIORIDAD",
                prioridadAnterior,
                prioridadNueva,
                descripcion
        );

        return convertirADTO(ticketActualizado);
    }

    private void validarSolicitudRecurso(
            String tipoAtencion,
            SolicitudRecursoRequestDTO solicitud) {

        if (!"RECURSO_EXTERNO".equals(tipoAtencion)) {
            return;
        }

        if (solicitud == null) {
            throw new RuntimeException(
                    "Debes completar los datos de la solicitud de recurso."
            );
        }

        if (solicitud.getCategoria() == null
                || solicitud.getCategoria().isBlank()) {
            throw new RuntimeException(
                    "La categoría del recurso es obligatoria."
            );
        }

        if (solicitud.getRecurso() == null
                || solicitud.getRecurso().isBlank()) {
            throw new RuntimeException(
                    "El recurso solicitado es obligatorio."
            );
        }

        if (solicitud.getCantidad() == null
                || solicitud.getCantidad() < 1) {
            throw new RuntimeException(
                    "La cantidad del recurso debe ser mayor o igual a 1."
            );
        }
    }

    private SolicitudRecurso crearSolicitudRecurso(
            Ticket ticket,
            SolicitudRecursoRequestDTO request,
            LocalDateTime fechaCreacion) {

        SolicitudRecurso solicitud =
                SolicitudRecurso.builder()
                        .ticket(ticket)
                        .categoria(
                                request.getCategoria()
                                        .trim()
                                        .toUpperCase()
                        )
                        .recurso(
                                request.getRecurso()
                                        .trim()
                        )
                        .cantidad(
                                request.getCantidad()
                        )
                        .proveedor(null)
                        .estadoRecurso("NUEVO")
                        .fechaSolicitudProveedor(null)
                        .fechaEstimadaEntrega(null)
                        .fechaRecepcion(null)
                        .fechaEntregaCliente(null)
                        .observaciones(
                                normalizarOpcional(
                                        request.getObservaciones()
                                )
                        )
                        .fechaCreacion(fechaCreacion)
                        .fechaActualizacion(fechaCreacion)
                        .build();

        return solicitudRecursoRepository.save(solicitud);
    }

    private String construirDescripcionSolicitudRecursoCreada(
            SolicitudRecurso solicitud) {

        if (solicitud == null) {
            return "Se creó una solicitud de recurso asociada al ticket.";
        }

        String categoria =
                solicitud.getCategoria() != null
                        ? solicitud.getCategoria()
                        : "SIN_CATEGORIA";

        String recurso =
                solicitud.getRecurso() != null
                        ? solicitud.getRecurso()
                        : "Sin recurso";

        Integer cantidad =
                solicitud.getCantidad() != null
                        ? solicitud.getCantidad()
                        : 1;

        String descripcion =
                "Se creó la solicitud de recurso. "
                        + "Categoría: "
                        + categoria
                        + ". Recurso: "
                        + recurso
                        + ". Cantidad: "
                        + cantidad
                        + ". Estado inicial: NUEVO.";

        if (solicitud.getObservaciones() != null
                && !solicitud.getObservaciones().isBlank()) {

            descripcion +=
                    " Observaciones: "
                            + solicitud.getObservaciones()
                            + ".";
        }

        return descripcion;
    }


    private void registrarHistorial(
            Ticket ticket,
            Usuario usuario,
            String accion,
            String valorAnterior,
            String valorNuevo,
            String descripcion) {

        HistorialTicket historial =
                HistorialTicket.builder()
                        .ticket(ticket)
                        .usuario(usuario)
                        .accion(accion)
                        .valorAnterior(valorAnterior)
                        .valorNuevo(valorNuevo)
                        .descripcion(descripcion)
                        .fechaCreacion(LocalDateTime.now())
                        .build();

        historialTicketRepository.save(historial);
    }

    private String generarNumeroTicket() {

        int anio =
                Year.now().getValue();

        String prefijo =
                "INC-" + anio + "-";

        long cantidad =
                ticketRepository
                        .countByNumeroTicketStartingWith(
                                prefijo
                        );

        long siguienteNumero =
                cantidad + 1;

        return prefijo
                + String.format(
                        "%04d",
                        siguienteNumero
                );
    }

    private String calcularPrioridad(
            String impacto,
            String urgencia) {

        String impactoNormalizado =
                impacto.trim().toUpperCase();

        String urgenciaNormalizada =
                urgencia.trim().toUpperCase();

        if (
                impactoNormalizado.equals("ALTO")
                        && urgenciaNormalizada.equals("ALTA")
        ) {

            return "P1_CRITICA";
        }

        if (
                impactoNormalizado.equals("ALTO")
                        && urgenciaNormalizada.equals("MEDIA")
        ) {

            return "P2_ALTA";
        }

        if (
                impactoNormalizado.equals("MEDIO")
                        && urgenciaNormalizada.equals("ALTA")
        ) {

            return "P2_ALTA";
        }

        if (
                impactoNormalizado.equals("MEDIO")
                        && urgenciaNormalizada.equals("MEDIA")
        ) {

            return "P3_MEDIA";
        }

        return "P4_BAJA";
    }

    private void configurarFechasSla(
            Ticket ticket) {

        if (ticket.getFechaCreacion() == null) {

            ticket.setFechaCreacion(
                    LocalDateTime.now()
            );
        }

        LocalDateTime fechaBase =
                ticket.getFechaCreacion();

        switch (ticket.getPrioridad()) {

            case "P1_CRITICA" -> {
                ticket.setFechaLimiteRespuesta(
                        fechaBase.plusMinutes(30)
                );
                ticket.setFechaLimiteResolucion(
                        fechaBase.plusHours(4)
                );
            }

            case "P2_ALTA" -> {
                ticket.setFechaLimiteRespuesta(
                        fechaBase.plusHours(1)
                );
                ticket.setFechaLimiteResolucion(
                        fechaBase.plusHours(8)
                );
            }

            case "P3_MEDIA" -> {
                ticket.setFechaLimiteRespuesta(
                        fechaBase.plusHours(4)
                );
                ticket.setFechaLimiteResolucion(
                        fechaBase.plusHours(24)
                );
            }

            case "P4_BAJA" -> {
                ticket.setFechaLimiteRespuesta(
                        fechaBase.plusHours(8)
                );
                ticket.setFechaLimiteResolucion(
                        fechaBase.plusHours(72)
                );
            }

            default ->
                    throw new RuntimeException(
                            "No se pudo calcular el SLA porque "
                                    + "la prioridad no es válida."
                    );
        }

        if (esRecursoExterno(ticket)) {
            ticket.setFechaLimiteResolucion(null);
            ticket.setSlaResolucionCumplido(null);
        }
    }

    private void evaluarCumplimientoRespuesta(
            Ticket ticket) {

        if (ticket.getFechaPrimeraRespuesta() == null) {

            ticket.setSlaRespuestaCumplido(null);
            return;
        }

        if (ticket.getFechaLimiteRespuesta() == null) {

            configurarFechasSla(ticket);
        }

        boolean cumplido =
                !ticket.getFechaPrimeraRespuesta()
                        .isAfter(
                                ticket.getFechaLimiteRespuesta()
                        );

        ticket.setSlaRespuestaCumplido(cumplido);
    }

    private void evaluarCumplimientoResolucion(
            Ticket ticket) {

        if (esRecursoExterno(ticket)) {
            ticket.setSlaResolucionCumplido(null);
            return;
        }

        if (ticket.getFechaResolucion() == null) {
            ticket.setSlaResolucionCumplido(null);
            return;
        }

        if (ticket.getFechaLimiteResolucion() == null) {
            configurarFechasSla(ticket);
        }

        boolean cumplido =
                !ticket.getFechaResolucion()
                        .isAfter(
                                ticket.getFechaLimiteResolucion()
                        );

        ticket.setSlaResolucionCumplido(cumplido);
    }

    private String calcularEstadoSlaRespuesta(
            Ticket ticket) {

        /*
         * Los tickets creados antes de implementar SLA
         * pueden tener la fecha límite en null.
         */
        if (ticket.getFechaLimiteRespuesta() == null) {

            configurarFechasSla(ticket);
        }

        if (ticket.getFechaPrimeraRespuesta() != null) {

            boolean cumplido =
                    !ticket.getFechaPrimeraRespuesta()
                            .isAfter(
                                    ticket.getFechaLimiteRespuesta()
                            );

            return cumplido
                    ? "CUMPLIDO"
                    : "INCUMPLIDO";
        }

        return calcularEstadoSlaPendiente(
                ticket.getFechaCreacion(),
                ticket.getFechaLimiteRespuesta()
        );
    }

    private String calcularEstadoSlaResolucion(
            Ticket ticket) {

        if (esRecursoExterno(ticket)) {
            return "NO_APLICA";
        }

        if (ticket.getFechaLimiteResolucion() == null) {
            configurarFechasSla(ticket);
        }

        if (ticket.getFechaResolucion() != null) {

            boolean cumplido =
                    !ticket.getFechaResolucion()
                            .isAfter(
                                    ticket.getFechaLimiteResolucion()
                            );

            return cumplido
                    ? "CUMPLIDO"
                    : "INCUMPLIDO";
        }

        return calcularEstadoSlaPendiente(
                ticket.getFechaCreacion(),
                ticket.getFechaLimiteResolucion()
        );
    }

    private String calcularEstadoSlaPendiente(
            LocalDateTime fechaInicio,
            LocalDateTime fechaLimite) {

        if (fechaInicio == null || fechaLimite == null) {

            return "SIN_CONFIGURAR";
        }

        LocalDateTime ahora =
                LocalDateTime.now();

        if (ahora.isAfter(fechaLimite)) {

            return "VENCIDO";
        }

        long minutosTotales =
                Duration.between(
                        fechaInicio,
                        fechaLimite
                ).toMinutes();

        long minutosConsumidos =
                Duration.between(
                        fechaInicio,
                        ahora
                ).toMinutes();

        if (minutosConsumidos < 0) {

            minutosConsumidos = 0;
        }

        if (minutosTotales <= 0) {

            return "VENCIDO";
        }

        double porcentajeConsumido =
                (double) minutosConsumidos
                        / minutosTotales;

        if (porcentajeConsumido >= 0.75) {

            return "EN_RIESGO";
        }

        return "EN_TIEMPO";
    }

    private void validarEstado(
            String estado) {

        if (!TRANSICIONES_VALIDAS.containsKey(
                estado)) {

            throw new RuntimeException(
                    "Estado no válido."
            );
        }
    }

    private void validarTransicion(
            String estadoActual,
            String nuevoEstado) {

        validarEstado(estadoActual);

        if (estadoActual.equals(nuevoEstado)) {

            throw new RuntimeException(
                    "El ticket ya se encuentra "
                            + "en ese estado."
            );
        }

        if (
                !TRANSICIONES_VALIDAS
                        .get(estadoActual)
                        .contains(nuevoEstado)
        ) {

            throw new RuntimeException(
                    "Transición no permitida: "
                            + estadoActual
                            + " -> "
                            + nuevoEstado
                            + "."
            );
        }
    }

    private String normalizarTipoAtencion(
            String tipoAtencion) {

        if (tipoAtencion == null
                || tipoAtencion.isBlank()) {
            return "OPERATIVO";
        }

        String valor =
                tipoAtencion
                        .trim()
                        .toUpperCase();

        if (!Set.of(
                "OPERATIVO",
                "RECURSO_EXTERNO"
        ).contains(valor)) {
            throw new RuntimeException(
                    "Tipo de atención no válido. "
                            + "Use OPERATIVO o RECURSO_EXTERNO."
            );
        }

        return valor;
    }

    private boolean esRecursoExterno(
            Ticket ticket) {

        return ticket != null
                && "RECURSO_EXTERNO".equalsIgnoreCase(
                        ticket.getTipoAtencion()
                );
    }

    private String normalizarOpcional(
            String valor) {

        if (
                valor == null
                        || valor.isBlank()
        ) {

            return null;
        }

        return valor.trim();
    }

    private TicketResponseDTO convertirADTO(
            Ticket ticket) {

        /*
         * Inicializa y guarda las fechas SLA de los tickets
         * creados antes de implementar esta función.
         */
        boolean slaSinConfigurar =
                ticket.getFechaLimiteRespuesta() == null
                        || (
                        !esRecursoExterno(ticket)
                                && ticket.getFechaLimiteResolucion() == null
                );

        if (slaSinConfigurar) {

            configurarFechasSla(ticket);
            evaluarCumplimientoRespuesta(ticket);
            evaluarCumplimientoResolucion(ticket);

            ticketRepository.save(ticket);
        }

        String clienteNombre =
                ticket.getCliente().getNombre()
                        + " "
                        + ticket.getCliente().getApellido();

        Integer agenteId = null;
        String agenteNombre = null;

        Integer proyectoId = null;
        String proyectoNombre = null;
        Integer companiaId = null;
        String companiaNombre = null;

        if (ticket.getProyecto() != null) {

            proyectoId =
                    ticket.getProyecto().getId();

            proyectoNombre =
                    ticket.getProyecto().getNombre();

            if (ticket.getProyecto().getCompania() != null) {

                companiaId =
                        ticket.getProyecto()
                                .getCompania()
                                .getId();

                companiaNombre =
                        ticket.getProyecto()
                                .getCompania()
                                .getNombre();
            }
        }

        if (ticket.getAgenteAsignado() != null) {

            agenteId =
                    ticket.getAgenteAsignado().getId();

            agenteNombre =
                    ticket.getAgenteAsignado().getNombre()
                            + " "
                            + ticket.getAgenteAsignado()
                                    .getApellido();
        }

        return new TicketResponseDTO(
                ticket.getId(),
                ticket.getNumeroTicket(),
                ticket.getTitulo(),
                ticket.getDescripcion(),

                ticket.getTipoIncidencia().getId(),
                ticket.getTipoIncidencia().getNombre(),

                ticket.getCliente().getId(),
                clienteNombre,
                ticket.getCliente().getCorreo(),

                agenteId,
                agenteNombre,

                proyectoId,
                proyectoNombre,

                companiaId,
                companiaNombre,

                ticket.getTipoAtencion(),

                ticket.getEstado(),
                ticket.getPrioridad(),
                ticket.getSeveridad(),
                ticket.getCriticidad(),
                ticket.getImpacto(),
                ticket.getUrgencia(),

                ticket.getFechaCreacion(),
                ticket.getFechaActualizacion(),
                ticket.getFechaResolucion(),
                ticket.getFechaCierre(),

                ticket.getFechaLimiteRespuesta(),
                ticket.getFechaPrimeraRespuesta(),
                ticket.getSlaRespuestaCumplido(),

                ticket.getFechaLimiteResolucion(),
                ticket.getSlaResolucionCumplido(),

                calcularEstadoSlaRespuesta(ticket),
                calcularEstadoSlaResolucion(ticket)
        );
    }
}