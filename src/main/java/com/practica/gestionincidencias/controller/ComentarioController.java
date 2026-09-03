package com.practica.gestionincidencias.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.practica.gestionincidencias.dto.ComentarioRequestDTO;
import com.practica.gestionincidencias.dto.ComentarioResponseDTO;
import com.practica.gestionincidencias.entity.Comentario;
import com.practica.gestionincidencias.entity.HistorialTicket;
import com.practica.gestionincidencias.entity.Ticket;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.repository.ComentarioRepository;
import com.practica.gestionincidencias.repository.HistorialTicketRepository;
import com.practica.gestionincidencias.repository.TicketRepository;
import com.practica.gestionincidencias.repository.UsuarioRolRepository;
import com.practica.gestionincidencias.service.AccesoProyectoService;
import com.practica.gestionincidencias.service.NotificacionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/comentarios")
public class ComentarioController {

    private static final Set<String> ROLES_RESPUESTA_SLA =
            Set.of(
                    "AGENTE",
                    "SUPERVISOR",
                    "ADMIN"
            );

    private final ComentarioRepository comentarioRepository;
    private final TicketRepository ticketRepository;
    private final UsuarioRolRepository usuarioRolRepository;
    private final HistorialTicketRepository historialTicketRepository;
    private final NotificacionService notificacionService;
    private final AccesoProyectoService accesoProyectoService;

    public ComentarioController(
            ComentarioRepository comentarioRepository,
            TicketRepository ticketRepository,
            UsuarioRolRepository usuarioRolRepository,
            HistorialTicketRepository historialTicketRepository,
            NotificacionService notificacionService,
            AccesoProyectoService accesoProyectoService) {

        this.comentarioRepository = comentarioRepository;
        this.ticketRepository = ticketRepository;
        this.usuarioRolRepository = usuarioRolRepository;
        this.historialTicketRepository = historialTicketRepository;
        this.notificacionService = notificacionService;
        this.accesoProyectoService = accesoProyectoService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public List<ComentarioResponseDTO> listarComentarios() {

        return comentarioRepository.findAll()
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    @GetMapping("/ticket/{ticketId}")
    public List<ComentarioResponseDTO> listarComentariosPorTicket(
            @PathVariable Integer ticketId) {

        Ticket ticket = ticketRepository
                .findById(ticketId)
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

        return comentarioRepository
                .findByTicketId(ticketId)
                .stream()
                .filter(comentario ->
                        !"CLIENTE".equals(rol)
                                || "PUBLICO".equalsIgnoreCase(
                                        comentario.getTipoComentario()
                                )
                )
                .map(this::convertirADTO)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ComentarioResponseDTO crearComentario(
            @Valid @RequestBody ComentarioRequestDTO request) {

        Ticket ticket =
                ticketRepository
                        .findById(request.getTicketId())
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

        if (
                request.getUsuarioId() != null
                        && !usuario.getId().equals(request.getUsuarioId())
        ) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "No puedes publicar comentarios a nombre de otro usuario."
            );
        }

        String tipoComentario =
                request.getTipoComentario()
                        .trim()
                        .toUpperCase();

        if (
                !tipoComentario.equals("PUBLICO")
                        && !tipoComentario.equals("INTERNO")
        ) {

            throw new RuntimeException(
                    "Tipo de comentario no válido. "
                            + "Use PUBLICO o INTERNO."
            );
        }

        if (
                "CLIENTE".equals(rol)
                        && "INTERNO".equals(tipoComentario)
        ) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Los clientes solo pueden agregar comentarios públicos."
            );
        }

        String contenido =
                request.getContenido() != null
                        ? request.getContenido().trim()
                        : "";

        if (contenido.isBlank()) {
            throw new RuntimeException(
                    "El comentario no puede estar vacío."
            );
        }

        LocalDateTime fechaComentario =
                LocalDateTime.now();

        Comentario comentario =
                Comentario.builder()
                        .ticket(ticket)
                        .usuario(usuario)
                        .contenido(contenido)
                        .tipoComentario(tipoComentario)
                        .fechaCreacion(fechaComentario)
                        .build();

        Comentario comentarioGuardado =
                comentarioRepository.save(comentario);

        /*
         * Solo un comentario público realizado por soporte
         * cuenta como primera respuesta al cliente.
         */
        if (
                ticket.getFechaPrimeraRespuesta() == null
                        && tipoComentario.equals("PUBLICO")
                        && usuarioEsPersonalSoporte(usuario)
        ) {

            registrarPrimeraRespuestaSla(
                    ticket,
                    fechaComentario
            );

            registrarHistorialPrimeraRespuesta(
                    ticket,
                    usuario,
                    fechaComentario
            );
        }

        ticket.setFechaActualizacion(
                fechaComentario
        );

        ticketRepository.save(ticket);

        HistorialTicket historial =
                HistorialTicket.builder()
                        .ticket(ticket)
                        .usuario(usuario)
                        .accion("COMENTARIO_AGREGADO")
                        .valorAnterior(null)
                        .valorNuevo(tipoComentario)
                        .descripcion(
                                "Se agregó un comentario de tipo "
                                        + tipoComentario
                        )
                        .fechaCreacion(fechaComentario)
                        .build();

        historialTicketRepository.save(historial);

        /*
         * La notificación se ejecuta después de guardar
         * correctamente el comentario.
         */
        if (tipoComentario.equals("PUBLICO")) {

            notificacionService
                    .notificarComentarioPublico(
                            comentarioGuardado
                    );
        }

        return convertirADTO(
                comentarioGuardado
        );
    }

    private boolean usuarioEsPersonalSoporte(
            Usuario usuario) {

        if (usuario == null || usuario.getId() == null) {
            return false;
        }

        return usuarioRolRepository
                .findByUsuarioId(usuario.getId())
                .map(usuarioRol -> {

                    if (
                            usuarioRol.getRol() == null
                                    || usuarioRol
                                            .getRol()
                                            .getNombre() == null
                    ) {
                        return false;
                    }

                    String nombreRol =
                            usuarioRol
                                    .getRol()
                                    .getNombre()
                                    .trim()
                                    .toUpperCase();

                    return ROLES_RESPUESTA_SLA
                            .contains(nombreRol);
                })
                .orElse(false);
    }

    private void registrarPrimeraRespuestaSla(
            Ticket ticket,
            LocalDateTime fechaPrimeraRespuesta) {

        ticket.setFechaPrimeraRespuesta(
                fechaPrimeraRespuesta
        );

        LocalDateTime fechaLimite =
                ticket.getFechaLimiteRespuesta();

        if (fechaLimite == null) {

            fechaLimite =
                    calcularFechaLimiteRespuesta(
                            ticket.getFechaCreacion(),
                            ticket.getPrioridad()
                    );

            ticket.setFechaLimiteRespuesta(
                    fechaLimite
            );
        }

        boolean cumplido =
                !fechaPrimeraRespuesta
                        .isAfter(fechaLimite);

        ticket.setSlaRespuestaCumplido(
                cumplido
        );
    }

    private LocalDateTime calcularFechaLimiteRespuesta(
            LocalDateTime fechaCreacion,
            String prioridad) {

        LocalDateTime fechaBase =
                fechaCreacion != null
                        ? fechaCreacion
                        : LocalDateTime.now();

        if (prioridad == null) {
            return fechaBase.plusHours(8);
        }

        return switch (
                prioridad.trim().toUpperCase()
        ) {

            case "P1_CRITICA" ->
                    fechaBase.plusMinutes(30);

            case "P2_ALTA" ->
                    fechaBase.plusHours(1);

            case "P3_MEDIA" ->
                    fechaBase.plusHours(4);

            case "P4_BAJA" ->
                    fechaBase.plusHours(8);

            default ->
                    fechaBase.plusHours(8);
        };
    }

    private void registrarHistorialPrimeraRespuesta(
            Ticket ticket,
            Usuario usuario,
            LocalDateTime fechaRespuesta) {

        String resultado =
                Boolean.TRUE.equals(
                        ticket.getSlaRespuestaCumplido()
                )
                        ? "CUMPLIDO"
                        : "INCUMPLIDO";

        HistorialTicket historial =
                HistorialTicket.builder()
                        .ticket(ticket)
                        .usuario(usuario)
                        .accion("PRIMERA_RESPUESTA_SLA")
                        .valorAnterior(null)
                        .valorNuevo(resultado)
                        .descripcion(
                                "Se registró la primera respuesta "
                                        + "del ticket. Estado SLA: "
                                        + resultado
                        )
                        .fechaCreacion(fechaRespuesta)
                        .build();

        historialTicketRepository.save(historial);
    }

    private ComentarioResponseDTO convertirADTO(
            Comentario comentario) {

        String nombreUsuario =
                comentario.getUsuario().getNombre()
                        + " "
                        + comentario.getUsuario().getApellido();

        return new ComentarioResponseDTO(
                comentario.getId(),
                comentario.getTicket().getId(),
                comentario.getTicket().getNumeroTicket(),
                comentario.getUsuario().getId(),
                nombreUsuario,
                comentario.getContenido(),
                comentario.getTipoComentario(),
                comentario.getFechaCreacion()
        );
    }
}