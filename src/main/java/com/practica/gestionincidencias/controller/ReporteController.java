package com.practica.gestionincidencias.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.practica.gestionincidencias.dto.ConteoDTO;
import com.practica.gestionincidencias.dto.ReporteResumenDTO;
import com.practica.gestionincidencias.repository.ComentarioRepository;
import com.practica.gestionincidencias.repository.TicketRepository;
import com.practica.gestionincidencias.repository.UsuarioRepository;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    private final TicketRepository ticketRepository;
    private final UsuarioRepository usuarioRepository;
    private final ComentarioRepository comentarioRepository;

    public ReporteController(TicketRepository ticketRepository,
                             UsuarioRepository usuarioRepository,
                             ComentarioRepository comentarioRepository) {
        this.ticketRepository = ticketRepository;
        this.usuarioRepository = usuarioRepository;
        this.comentarioRepository = comentarioRepository;
    }

    @GetMapping("/resumen")
    public ReporteResumenDTO obtenerResumen() {

        long totalTickets = ticketRepository.count();
        long ticketsNuevos = ticketRepository.countByEstado("NUEVO");
        long ticketsAsignados = ticketRepository.countByEstado("ASIGNADO");
        long ticketsEnProgreso = ticketRepository.countByEstado("EN_PROGRESO");
        long ticketsResueltos = ticketRepository.countByEstado("RESUELTO");
        long ticketsCerrados = ticketRepository.countByEstado("CERRADO");

        long totalUsuarios = usuarioRepository.count();
        long totalComentarios = comentarioRepository.count();

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
    public List<ConteoDTO> ticketsPorEstado() {
        return ticketRepository.contarTicketsPorEstado()
                .stream()
                .map(resultado -> new ConteoDTO(
                        resultado[0].toString(),
                        (Long) resultado[1]
                ))
                .collect(Collectors.toList());
    }

    @GetMapping("/tickets-por-prioridad")
    public List<ConteoDTO> ticketsPorPrioridad() {
        return ticketRepository.contarTicketsPorPrioridad()
                .stream()
                .map(resultado -> new ConteoDTO(
                        resultado[0].toString(),
                        (Long) resultado[1]
                ))
                .collect(Collectors.toList());
    }

    @GetMapping("/tickets-por-tipo")
    public List<ConteoDTO> ticketsPorTipo() {
        return ticketRepository.contarTicketsPorTipoIncidencia()
                .stream()
                .map(resultado -> new ConteoDTO(
                        resultado[0].toString(),
                        (Long) resultado[1]
                ))
                .collect(Collectors.toList());
    }
}