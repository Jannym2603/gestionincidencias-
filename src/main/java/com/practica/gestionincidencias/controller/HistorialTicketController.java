package com.practica.gestionincidencias.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.practica.gestionincidencias.dto.HistorialTicketResponseDTO;
import com.practica.gestionincidencias.entity.HistorialTicket;
import com.practica.gestionincidencias.entity.Ticket;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.repository.HistorialTicketRepository;
import com.practica.gestionincidencias.repository.TicketRepository;
import com.practica.gestionincidencias.service.AccesoProyectoService;

@RestController
@RequestMapping("/api/historial-tickets")
public class HistorialTicketController {

    private final HistorialTicketRepository historialTicketRepository;
    private final TicketRepository ticketRepository;
    private final AccesoProyectoService accesoProyectoService;

    public HistorialTicketController(
            HistorialTicketRepository historialTicketRepository,
            TicketRepository ticketRepository,
            AccesoProyectoService accesoProyectoService) {

        this.historialTicketRepository = historialTicketRepository;
        this.ticketRepository = ticketRepository;
        this.accesoProyectoService = accesoProyectoService;
    }

    /*
     * Historial consolidado:
     * ADMIN y SUPERVISOR pueden consultar los eventos
     * correspondientes a los tickets a los que tienen acceso.
     *
     * Además, el módulo Historial debe estar habilitado
     * globalmente y para el rol autenticado.
     */
    @GetMapping
    @PreAuthorize(
            "@moduloAccesoService.puedeVerHistorial(authentication) "
                    + "and hasAnyRole('ADMIN', 'SUPERVISOR')"
    )
    public List<HistorialTicketResponseDTO> listarHistorial() {

        Usuario usuario =
                accesoProyectoService.obtenerUsuarioAutenticado();

        String rol =
                accesoProyectoService.obtenerRol(usuario);

        return historialTicketRepository
                .findAll()
                .stream()
                .filter(historial ->
                        historial.getTicket() != null
                                && accesoProyectoService.puedeAccederTicket(
                                        usuario,
                                        rol,
                                        historial.getTicket()
                                )
                )
                .map(this::convertirADTO)
                .toList();
    }

    /*
     * Historial de un ticket específico.
     *
     * CLIENTE:
     * - Solo puede entrar a tickets propios.
     * - Dentro del ticket solo verá eventos registrados
     *   por su propio usuario.
     *
     * AGENTE:
     * - Solo tickets que tiene asignados.
     *
     * SUPERVISOR:
     * - Tickets de proyectos a los que tiene acceso.
     *
     * ADMIN:
     * - Todos los tickets.
     *
     * En todos los casos el módulo Historial debe estar
     * habilitado globalmente y para el rol autenticado.
     */
    @GetMapping("/ticket/{ticketId}")
    @PreAuthorize(
            "@moduloAccesoService.puedeVerHistorial(authentication)"
    )
    public List<HistorialTicketResponseDTO> listarHistorialPorTicket(
            @PathVariable Integer ticketId) {

        Ticket ticket =
                ticketRepository
                        .findById(ticketId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
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

        return historialTicketRepository
                .findByTicketIdOrderByFechaCreacionDesc(ticketId)
                .stream()
                .filter(historial ->
                        !"CLIENTE".equals(rol)
                                || eventoPerteneceAlCliente(
                                        historial,
                                        usuario
                                )
                )
                .map(this::convertirADTO)
                .toList();
    }

    private boolean eventoPerteneceAlCliente(
            HistorialTicket historial,
            Usuario cliente) {

        if (historial == null
                || cliente == null
                || cliente.getId() == null
                || historial.getUsuario() == null
                || historial.getUsuario().getId() == null) {

            return false;
        }

        return cliente.getId().equals(
                historial.getUsuario().getId()
        );
    }

    private HistorialTicketResponseDTO convertirADTO(
            HistorialTicket historial) {

        Integer usuarioId = null;
        String nombreUsuario = null;

        if (historial.getUsuario() != null) {

            usuarioId =
                    historial.getUsuario().getId();

            String nombre =
                    historial.getUsuario().getNombre();

            String apellido =
                    historial.getUsuario().getApellido();

            nombreUsuario =
                    (
                            (nombre == null ? "" : nombre)
                            + " "
                            + (apellido == null ? "" : apellido)
                    ).trim();
        }

        return new HistorialTicketResponseDTO(
                historial.getId(),
                historial.getTicket().getId(),
                historial.getTicket().getNumeroTicket(),
                usuarioId,
                nombreUsuario,
                historial.getAccion(),
                historial.getValorAnterior(),
                historial.getValorNuevo(),
                historial.getDescripcion(),
                historial.getFechaCreacion()
        );
    }
}
