package com.practica.gestionincidencias.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.practica.gestionincidencias.dto.CrearEnlaceCompartidoRequestDTO;
import com.practica.gestionincidencias.dto.EnlaceCompartidoResponseDTO;
import com.practica.gestionincidencias.dto.TicketCompartidoResponseDTO;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.service.AccesoProyectoService;
import com.practica.gestionincidencias.service.EnlaceCompartidoService;

import jakarta.validation.Valid;

@RestController
public class EnlaceCompartidoController {

    private final EnlaceCompartidoService enlaceCompartidoService;
    private final AccesoProyectoService accesoProyectoService;

    public EnlaceCompartidoController(
            EnlaceCompartidoService enlaceCompartidoService,
            AccesoProyectoService accesoProyectoService) {

        this.enlaceCompartidoService = enlaceCompartidoService;
        this.accesoProyectoService = accesoProyectoService;
    }

    /*
     * ADMIN y SUPERVISOR pueden generar un enlace externo
     * de solo lectura para un ticket al que tengan acceso.
     */
    @PostMapping("/api/tickets/{ticketId}/compartir")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public EnlaceCompartidoResponseDTO crearEnlace(
            @PathVariable Integer ticketId,
            @Valid @RequestBody CrearEnlaceCompartidoRequestDTO request) {

        Usuario usuario =
                accesoProyectoService.obtenerUsuarioAutenticado();

        return enlaceCompartidoService.crearEnlace(
                ticketId,
                usuario.getId(),
                request
        );
    }

    /*
     * Lista los enlaces creados para el ticket.
     * El servicio vuelve a validar el alcance del usuario.
     */
    @GetMapping("/api/tickets/{ticketId}/enlaces-compartidos")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public List<EnlaceCompartidoResponseDTO> listarEnlaces(
            @PathVariable Integer ticketId) {

        Usuario usuario =
                accesoProyectoService.obtenerUsuarioAutenticado();

        return enlaceCompartidoService.listarPorTicket(
                ticketId,
                usuario.getId()
        );
    }

    /*
     * Revoca un enlace sin eliminar el registro histórico.
     */
    @DeleteMapping("/api/tickets/enlaces-compartidos/{enlaceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public EnlaceCompartidoResponseDTO desactivarEnlace(
            @PathVariable Long enlaceId) {

        Usuario usuario =
                accesoProyectoService.obtenerUsuarioAutenticado();

        return enlaceCompartidoService.desactivarEnlace(
                enlaceId,
                usuario.getId()
        );
    }

    /*
     * Endpoint público.
     * El token actúa como credencial temporal del enlace.
     * No requiere iniciar sesión.
     */
    @GetMapping("/api/public/compartidos/{token}")
    public TicketCompartidoResponseDTO consultarTicketCompartido(
            @PathVariable String token) {

        return enlaceCompartidoService
                .consultarTicketCompartido(token);
    }
}