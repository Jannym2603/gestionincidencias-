package com.practica.gestionincidencias.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.practica.gestionincidencias.dto.HistorialTicketResponseDTO;
import com.practica.gestionincidencias.entity.HistorialTicket;
import com.practica.gestionincidencias.repository.HistorialTicketRepository;

@RestController
@RequestMapping("/api/historial-tickets")
public class HistorialTicketController {

    private final HistorialTicketRepository historialTicketRepository;

    public HistorialTicketController(HistorialTicketRepository historialTicketRepository) {
        this.historialTicketRepository = historialTicketRepository;
    }

    @GetMapping
    public List<HistorialTicketResponseDTO> listarHistorial() {
        return historialTicketRepository.findAll()
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    @GetMapping("/ticket/{ticketId}")
    public List<HistorialTicketResponseDTO> listarHistorialPorTicket(@PathVariable Integer ticketId) {
        return historialTicketRepository.findByTicketIdOrderByFechaCreacionDesc(ticketId)
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    private HistorialTicketResponseDTO convertirADTO(HistorialTicket historial) {

        Integer usuarioId = null;
        String nombreUsuario = null;

        if (historial.getUsuario() != null) {
            usuarioId = historial.getUsuario().getId();
            nombreUsuario = historial.getUsuario().getNombre() + " " + historial.getUsuario().getApellido();
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