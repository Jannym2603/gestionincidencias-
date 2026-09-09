package com.practica.gestionincidencias.controller;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.practica.gestionincidencias.dto.ConteoDTO;
import com.practica.gestionincidencias.dto.ReporteResumenDTO;
import com.practica.gestionincidencias.entity.Ticket;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.entity.UsuarioRol;
import com.practica.gestionincidencias.repository.ComentarioRepository;
import com.practica.gestionincidencias.repository.TicketRepository;
import com.practica.gestionincidencias.repository.UsuarioProyectoRepository;
import com.practica.gestionincidencias.repository.UsuarioRepository;
import com.practica.gestionincidencias.repository.UsuarioRolRepository;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    private final TicketRepository ticketRepository;
    private final UsuarioRepository usuarioRepository;
    private final ComentarioRepository comentarioRepository;
    private final UsuarioProyectoRepository usuarioProyectoRepository;
    private final UsuarioRolRepository usuarioRolRepository;

    public ReporteController(
            TicketRepository ticketRepository,
            UsuarioRepository usuarioRepository,
            ComentarioRepository comentarioRepository,
            UsuarioProyectoRepository usuarioProyectoRepository,
            UsuarioRolRepository usuarioRolRepository) {

        this.ticketRepository = ticketRepository;
        this.usuarioRepository = usuarioRepository;
        this.comentarioRepository = comentarioRepository;
        this.usuarioProyectoRepository = usuarioProyectoRepository;
        this.usuarioRolRepository = usuarioRolRepository;
    }


    /*
     * Resumen utilizado exclusivamente por el Dashboard.
     *
     * Este endpoint NO depende del interruptor del módulo Reportes,
     * porque el Dashboard debe seguir mostrando sus métricas aunque
     * el módulo Reportes esté desactivado.
     */
    @GetMapping("/dashboard-resumen")
    public ReporteResumenDTO obtenerResumenDashboard() {

        Usuario usuarioAutenticado =
                obtenerUsuarioAutenticado();

        String rol =
                obtenerRolUsuario(
                        usuarioAutenticado.getId()
                );

        List<Ticket> tickets =
                obtenerTicketsFiltrados(
                        usuarioAutenticado,
                        rol,
                        null,
                        null
                );

        long totalTickets =
                tickets.size();

        long ticketsNuevos =
                contarEstado(
                        tickets,
                        "NUEVO"
                );

        long ticketsAsignados =
                contarEstado(
                        tickets,
                        "ASIGNADO"
                );

        long ticketsEnProgreso =
                contarEstado(
                        tickets,
                        "EN_PROGRESO"
                );

        long ticketsResueltos =
                contarEstado(
                        tickets,
                        "RESUELTO"
                );

        long ticketsCerrados =
                contarEstado(
                        tickets,
                        "CERRADO"
                );

        long totalUsuarios =
                rol.equals("ADMIN")
                        ? usuarioRepository.count()
                        : contarUsuariosRelacionados(
                                tickets,
                                usuarioAutenticado
                        );

        long totalComentarios =
                contarComentariosPermitidos(
                        tickets,
                        rol
                );

        return new ReporteResumenDTO(
                totalTickets,
                ticketsNuevos,
                ticketsAsignados,
                ticketsEnProgreso,
                ticketsResueltos,
                ticketsCerrados,
                totalUsuarios,
                totalComentarios
        );
    }

    @GetMapping("/resumen")
    @PreAuthorize("@moduloAccesoService.puedeVerReportes(authentication)")
    public ReporteResumenDTO obtenerResumen(
            @RequestParam(required = false) Integer companiaId,
            @RequestParam(required = false) Integer proyectoId) {

        Usuario usuarioAutenticado =
                obtenerUsuarioAutenticado();

        String rol =
                obtenerRolUsuario(
                        usuarioAutenticado.getId()
                );

        List<Ticket> tickets =
                obtenerTicketsFiltrados(
                        usuarioAutenticado,
                        rol,
                        companiaId,
                        proyectoId
                );

        long totalTickets =
                tickets.size();

        long ticketsNuevos =
                contarEstado(
                        tickets,
                        "NUEVO"
                );

        long ticketsAsignados =
                contarEstado(
                        tickets,
                        "ASIGNADO"
                );

        long ticketsEnProgreso =
                contarEstado(
                        tickets,
                        "EN_PROGRESO"
                );

        long ticketsResueltos =
                contarEstado(
                        tickets,
                        "RESUELTO"
                );

        long ticketsCerrados =
                contarEstado(
                        tickets,
                        "CERRADO"
                );

        boolean reporteFiltrado =
                companiaId != null
                        || proyectoId != null;

        long totalUsuarios =
                rol.equals("ADMIN")
                        && !reporteFiltrado

                        ? usuarioRepository.count()

                        : contarUsuariosRelacionados(
                                tickets,
                                usuarioAutenticado
                        );

        long totalComentarios =
                contarComentariosPermitidos(
                        tickets,
                        rol
                );

        return new ReporteResumenDTO(
                totalTickets,
                ticketsNuevos,
                ticketsAsignados,
                ticketsEnProgreso,
                ticketsResueltos,
                ticketsCerrados,
                totalUsuarios,
                totalComentarios
        );
    }

    @GetMapping("/tickets-por-estado")
    @PreAuthorize("@moduloAccesoService.puedeVerReportes(authentication)")
    public List<ConteoDTO> ticketsPorEstado(
            @RequestParam(required = false) Integer companiaId,
            @RequestParam(required = false) Integer proyectoId) {

        Usuario usuarioAutenticado =
                obtenerUsuarioAutenticado();

        String rol =
                obtenerRolUsuario(
                        usuarioAutenticado.getId()
                );

        List<Ticket> tickets =
                obtenerTicketsFiltrados(
                        usuarioAutenticado,
                        rol,
                        companiaId,
                        proyectoId
                );

        Map<String, Long> conteos =
                new LinkedHashMap<>();

        conteos.put(
                "NUEVO",
                contarEstado(
                        tickets,
                        "NUEVO"
                )
        );

        conteos.put(
                "ASIGNADO",
                contarEstado(
                        tickets,
                        "ASIGNADO"
                )
        );

        conteos.put(
                "EN_PROGRESO",
                contarEstado(
                        tickets,
                        "EN_PROGRESO"
                )
        );

        conteos.put(
                "RESUELTO",
                contarEstado(
                        tickets,
                        "RESUELTO"
                )
        );

        conteos.put(
                "CERRADO",
                contarEstado(
                        tickets,
                        "CERRADO"
                )
        );

        return conteos
                .entrySet()
                .stream()
                .map(entry ->
                        new ConteoDTO(
                                entry.getKey(),
                                entry.getValue()
                        )
                )
                .toList();
    }

    @GetMapping("/tickets-por-prioridad")
    @PreAuthorize("@moduloAccesoService.puedeVerReportes(authentication)")
    public List<ConteoDTO> ticketsPorPrioridad(
            @RequestParam(required = false) Integer companiaId,
            @RequestParam(required = false) Integer proyectoId) {

        Usuario usuarioAutenticado =
                obtenerUsuarioAutenticado();

        String rol =
                obtenerRolUsuario(
                        usuarioAutenticado.getId()
                );

        List<Ticket> tickets =
                obtenerTicketsFiltrados(
                        usuarioAutenticado,
                        rol,
                        companiaId,
                        proyectoId
                );

        Map<String, Long> conteos =
                new LinkedHashMap<>();

        conteos.put(
                "P1_CRITICA",
                contarPrioridad(
                        tickets,
                        "P1_CRITICA"
                )
        );

        conteos.put(
                "P2_ALTA",
                contarPrioridad(
                        tickets,
                        "P2_ALTA"
                )
        );

        conteos.put(
                "P3_MEDIA",
                contarPrioridad(
                        tickets,
                        "P3_MEDIA"
                )
        );

        conteos.put(
                "P4_BAJA",
                contarPrioridad(
                        tickets,
                        "P4_BAJA"
                )
        );

        return conteos
                .entrySet()
                .stream()
                .map(entry ->
                        new ConteoDTO(
                                entry.getKey(),
                                entry.getValue()
                        )
                )
                .toList();
    }

    @GetMapping("/tickets-por-tipo")
    @PreAuthorize("@moduloAccesoService.puedeVerReportes(authentication)")
    public List<ConteoDTO> ticketsPorTipo(
            @RequestParam(required = false) Integer companiaId,
            @RequestParam(required = false) Integer proyectoId) {

        Usuario usuarioAutenticado =
                obtenerUsuarioAutenticado();

        String rol =
                obtenerRolUsuario(
                        usuarioAutenticado.getId()
                );

        List<Ticket> tickets =
                obtenerTicketsFiltrados(
                        usuarioAutenticado,
                        rol,
                        companiaId,
                        proyectoId
                );

        Map<String, Long> conteos =
                tickets.stream()

                        .filter(ticket ->
                                ticket.getTipoIncidencia() != null
                                        && ticket
                                                .getTipoIncidencia()
                                                .getNombre() != null
                        )

                        .collect(
                                java.util.stream.Collectors.groupingBy(
                                        ticket ->
                                                ticket
                                                        .getTipoIncidencia()
                                                        .getNombre(),

                                        LinkedHashMap::new,

                                        java.util.stream.Collectors.counting()
                                )
                        );

        return conteos
                .entrySet()
                .stream()
                .map(entry ->
                        new ConteoDTO(
                                entry.getKey(),
                                entry.getValue()
                        )
                )
                .toList();
    }

    private List<Ticket> obtenerTicketsFiltrados(
            Usuario usuarioAutenticado,
            String rol,
            Integer companiaId,
            Integer proyectoId) {

        List<Ticket> tickets =
                obtenerTicketsPermitidos(
                        usuarioAutenticado,
                        rol
                );

        if (
                proyectoId != null
        ) {
            tickets =
                    tickets.stream()

                            .filter(ticket ->
                                    ticket.getProyecto() != null
                                            && ticket
                                                    .getProyecto()
                                                    .getId() != null
                                            && ticket
                                                    .getProyecto()
                                                    .getId()
                                                    .equals(
                                                            proyectoId
                                                    )
                            )

                            .toList();
        }

        if (
                companiaId != null
        ) {
            tickets =
                    tickets.stream()

                            .filter(ticket ->
                                    ticket.getProyecto() != null
                                            && ticket
                                                    .getProyecto()
                                                    .getCompania() != null
                                            && ticket
                                                    .getProyecto()
                                                    .getCompania()
                                                    .getId() != null
                                            && ticket
                                                    .getProyecto()
                                                    .getCompania()
                                                    .getId()
                                                    .equals(
                                                            companiaId
                                                    )
                            )

                            .toList();
        }

        return tickets;
    }

    private List<Ticket> obtenerTicketsPermitidos(
            Usuario usuarioAutenticado,
            String rol) {

        if (rol.equals("ADMIN")) {
            return ticketRepository.findAll();
        }

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

        return switch (rol) {

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
                            "El rol del usuario no tiene acceso a los reportes."
                    );
        };
    }

    private long contarEstado(
            List<Ticket> tickets,
            String estado) {

        return tickets.stream()

                .filter(ticket ->
                        estado.equalsIgnoreCase(
                                String.valueOf(
                                        ticket.getEstado()
                                )
                        )
                )

                .count();
    }

    private long contarPrioridad(
            List<Ticket> tickets,
            String prioridad) {

        return tickets.stream()

                .filter(ticket ->
                        prioridad.equalsIgnoreCase(
                                String.valueOf(
                                        ticket.getPrioridad()
                                )
                        )
                )

                .count();
    }

    private long contarUsuariosRelacionados(
            List<Ticket> tickets,
            Usuario usuarioAutenticado) {

        Set<Integer> usuarios =
                new LinkedHashSet<>();

        if (
                usuarioAutenticado != null
                        && usuarioAutenticado.getId() != null
        ) {
            usuarios.add(
                    usuarioAutenticado.getId()
            );
        }

        tickets.forEach(ticket -> {

            if (
                    ticket.getCliente() != null
                            && ticket.getCliente().getId() != null
            ) {
                usuarios.add(
                        ticket
                                .getCliente()
                                .getId()
                );
            }

            if (
                    ticket.getAgenteAsignado() != null
                            && ticket
                                    .getAgenteAsignado()
                                    .getId() != null
            ) {
                usuarios.add(
                        ticket
                                .getAgenteAsignado()
                                .getId()
                );
            }
        });

        return usuarios.size();
    }

    private long contarComentariosPermitidos(
            List<Ticket> tickets,
            String rol) {

        if (tickets.isEmpty()) {
            return 0L;
        }

        Set<Integer> ticketIds =
                tickets.stream()

                        .filter(ticket ->
                                ticket.getId() != null
                        )

                        .map(
                                Ticket::getId
                        )

                        .collect(
                                java.util.stream.Collectors.toSet()
                        );

        return comentarioRepository
                .findAll()
                .stream()

                .filter(comentario ->
                        comentario != null
                                && comentario.getTicket() != null
                                && comentario.getTicket().getId() != null
                                && ticketIds.contains(
                                        comentario
                                                .getTicket()
                                                .getId()
                                )
                )

                .filter(comentario ->
                        !rol.equals("CLIENTE")
                                || comentario.getTipoComentario() == null
                                || !comentario
                                        .getTipoComentario()
                                        .trim()
                                        .equalsIgnoreCase(
                                                "INTERNO"
                                        )
                )

                .count();
    }

    private Usuario obtenerUsuarioAutenticado() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (
                authentication == null
                        || !authentication.isAuthenticated()
                        || authentication.getName() == null
        ) {
            throw new RuntimeException(
                    "No se pudo identificar al usuario autenticado."
            );
        }

        return usuarioRepository
                .findByCorreo(
                        authentication.getName()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "El usuario autenticado no existe."
                        )
                );
    }

    private String obtenerRolUsuario(
            Integer usuarioId) {

        UsuarioRol usuarioRol =
                usuarioRolRepository
                        .findByUsuarioId(
                                usuarioId
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "El usuario no tiene un rol asignado."
                                )
                        );

        if (
                usuarioRol.getRol() == null
                        || usuarioRol
                                .getRol()
                                .getNombre() == null
        ) {
            throw new RuntimeException(
                    "El rol asignado al usuario no es válido."
            );
        }

        return usuarioRol
                .getRol()
                .getNombre()
                .trim()
                .toUpperCase();
    }
}
