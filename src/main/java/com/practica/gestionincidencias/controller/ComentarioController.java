package com.practica.gestionincidencias.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
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
import com.practica.gestionincidencias.repository.UsuarioRepository;
import com.practica.gestionincidencias.service.NotificacionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/comentarios")
public class ComentarioController {

    private final ComentarioRepository comentarioRepository;
    private final TicketRepository ticketRepository;
    private final UsuarioRepository usuarioRepository;
    private final HistorialTicketRepository historialTicketRepository;
    private final NotificacionService notificacionService;

    public ComentarioController(ComentarioRepository comentarioRepository,
                                TicketRepository ticketRepository,
                                UsuarioRepository usuarioRepository,
                                HistorialTicketRepository historialTicketRepository,
                                NotificacionService notificacionService) {
        this.comentarioRepository = comentarioRepository;
        this.ticketRepository = ticketRepository;
        this.usuarioRepository = usuarioRepository;
        this.historialTicketRepository = historialTicketRepository;
        this.notificacionService = notificacionService;
    }

    @GetMapping
    public List<ComentarioResponseDTO> listarComentarios() {
        return comentarioRepository.findAll()
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    @GetMapping("/ticket/{ticketId}")
    public List<ComentarioResponseDTO> listarComentariosPorTicket(@PathVariable Integer ticketId) {
        return comentarioRepository.findByTicketId(ticketId)
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ComentarioResponseDTO crearComentario(@Valid @RequestBody ComentarioRequestDTO request) {

        Ticket ticket = ticketRepository.findById(request.getTicketId())
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado."));

        Usuario usuario = usuarioRepository.findById(request.getUsuarioId())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado."));

        String tipoComentario = request.getTipoComentario().trim().toUpperCase();

        if (!tipoComentario.equals("PUBLICO") && !tipoComentario.equals("INTERNO")) {
            throw new RuntimeException("Tipo de comentario no valido. Use PUBLICO o INTERNO.");
        }

        Comentario comentario = Comentario.builder()
                .ticket(ticket)
                .usuario(usuario)
                .contenido(request.getContenido().trim())
                .tipoComentario(tipoComentario)
                .fechaCreacion(LocalDateTime.now())
                .build();

        Comentario comentarioGuardado = comentarioRepository.save(comentario);

        ticket.setFechaActualizacion(LocalDateTime.now());
        ticketRepository.save(ticket);

        HistorialTicket historial = HistorialTicket.builder()
                .ticket(ticket)
                .usuario(usuario)
                .accion("COMENTARIO_AGREGADO")
                .valorAnterior(null)
                .valorNuevo(tipoComentario)
                .descripcion("Se agrego un comentario de tipo " + tipoComentario)
                .fechaCreacion(LocalDateTime.now())
                .build();

        historialTicketRepository.save(historial);

        if (tipoComentario.equals("PUBLICO")) {
            notificacionService.notificarComentarioPublico(comentarioGuardado);
        }

        return convertirADTO(comentarioGuardado);
    }

    private ComentarioResponseDTO convertirADTO(Comentario comentario) {

        String nombreUsuario = comentario.getUsuario().getNombre() + " " + comentario.getUsuario().getApellido();

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