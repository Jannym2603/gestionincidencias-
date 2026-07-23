package com.practica.gestionincidencias.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.practica.gestionincidencias.config.AppProperties;
import com.practica.gestionincidencias.dto.CrearEnlaceCompartidoRequestDTO;
import com.practica.gestionincidencias.dto.EnlaceCompartidoResponseDTO;
import com.practica.gestionincidencias.dto.TicketCompartidoResponseDTO;
import com.practica.gestionincidencias.entity.EnlaceCompartido;
import com.practica.gestionincidencias.entity.Ticket;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.repository.EnlaceCompartidoRepository;
import com.practica.gestionincidencias.repository.TicketRepository;
import com.practica.gestionincidencias.repository.UsuarioRepository;

@Service
public class EnlaceCompartidoService {

    private final EnlaceCompartidoRepository enlaceRepository;
    private final TicketRepository ticketRepository;
    private final UsuarioRepository usuarioRepository;
    private final NotificacionService notificacionService;
    private final AppProperties appProperties;

    public EnlaceCompartidoService(
            EnlaceCompartidoRepository enlaceRepository,
            TicketRepository ticketRepository,
            UsuarioRepository usuarioRepository,
            NotificacionService notificacionService,
            AppProperties appProperties) {

        this.enlaceRepository = enlaceRepository;
        this.ticketRepository = ticketRepository;
        this.usuarioRepository = usuarioRepository;
        this.notificacionService = notificacionService;
        this.appProperties = appProperties;
    }

    @Transactional
    public EnlaceCompartidoResponseDTO crearEnlace(
            Integer ticketId,
            Integer usuarioId,
            CrearEnlaceCompartidoRequestDTO request) {

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró el ticket"
                ));

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró el usuario autenticado"
                ));

        validarPermisoParaCompartir(ticket, usuario);

        LocalDateTime ahora = LocalDateTime.now();

        if (request.getFechaExpiracion() != null
                && !request.getFechaExpiracion().isAfter(ahora)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La fecha de expiración debe ser posterior a la fecha actual"
            );
        }

        if (request.getCorreoDestinatario() == null
                || request.getCorreoDestinatario().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El correo del destinatario es obligatorio"
            );
        }

        String token = generarTokenSeguro();

        EnlaceCompartido enlace = EnlaceCompartido.builder()
                .ticket(ticket)
                .creadoPor(usuario)
                .correoDestinatario(
                        request.getCorreoDestinatario()
                                .trim()
                                .toLowerCase()
                )
                .token(token)
                .puedeVer(
                        valorBooleano(
                                request.getPuedeVer(),
                                true
                        )
                )
                .puedeComentar(
                        valorBooleano(
                                request.getPuedeComentar(),
                                false
                        )
                )
                .puedeVerAdjuntos(
                        valorBooleano(
                                request.getPuedeVerAdjuntos(),
                                false
                        )
                )
                .puedeSubirAdjuntos(
                        valorBooleano(
                                request.getPuedeSubirAdjuntos(),
                                false
                        )
                )
                .puedeCambiarEstado(
                        valorBooleano(
                                request.getPuedeCambiarEstado(),
                                false
                        )
                )
                .fechaCreacion(ahora)
                .fechaExpiracion(request.getFechaExpiracion())
                .activo(true)
                .build();

        EnlaceCompartido enlaceGuardado =
                enlaceRepository.save(enlace);

        String urlCompartida =
                construirUrlCompartida(
                        enlaceGuardado.getToken()
                );

        notificacionService.notificarEnlaceCompartido(
                enlaceGuardado,
                urlCompartida
        );

        return convertirAResponse(enlaceGuardado);
    }

    @Transactional(readOnly = true)
    public List<EnlaceCompartidoResponseDTO> listarPorTicket(
            Integer ticketId,
            Integer usuarioId) {

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró el ticket"
                ));

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró el usuario autenticado"
                ));

        validarPermisoParaCompartir(ticket, usuario);

        return enlaceRepository
                .findByTicketIdOrderByFechaCreacionDesc(ticketId)
                .stream()
                .map(this::convertirAResponse)
                .toList();
    }

    @Transactional
    public EnlaceCompartidoResponseDTO desactivarEnlace(
            Long enlaceId,
            Integer usuarioId) {

        EnlaceCompartido enlace = enlaceRepository.findById(enlaceId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró el enlace compartido"
                ));

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró el usuario autenticado"
                ));

        validarPermisoParaCompartir(
                enlace.getTicket(),
                usuario
        );

        enlace.setActivo(false);

        EnlaceCompartido actualizado =
                enlaceRepository.save(enlace);

        return convertirAResponse(actualizado);
    }

    @Transactional(readOnly = true)
    public EnlaceCompartido obtenerEnlaceValido(
            String token) {

        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El token del enlace es obligatorio"
            );
        }

        EnlaceCompartido enlace =
                enlaceRepository.findByToken(token.trim())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "El enlace no existe"
                                )
                        );

        if (!Boolean.TRUE.equals(enlace.getActivo())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "El enlace fue desactivado"
            );
        }

        if (enlace.getFechaExpiracion() != null
                && LocalDateTime.now().isAfter(
                        enlace.getFechaExpiracion()
                )) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "El enlace ha expirado"
            );
        }

        if (!Boolean.TRUE.equals(enlace.getPuedeVer())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "El enlace no permite ver el ticket"
            );
        }

        return enlace;
    }

    @Transactional(readOnly = true)
    public TicketCompartidoResponseDTO consultarTicketCompartido(
            String token) {

        EnlaceCompartido enlace =
                obtenerEnlaceValido(token);

        Ticket ticket = enlace.getTicket();

        String nombreCliente =
                obtenerNombreCompleto(
                        ticket.getCliente()
                );

        String nombreAgente =
                ticket.getAgenteAsignado() != null
                        ? obtenerNombreCompleto(
                                ticket.getAgenteAsignado()
                        )
                        : "Sin asignar";

        String categoria =
                ticket.getTipoIncidencia() != null
                        ? ticket.getTipoIncidencia().getNombre()
                        : "Sin categoría";

        return TicketCompartidoResponseDTO.builder()
                .ticketId(ticket.getId())
                .numeroTicket(ticket.getNumeroTicket())
                .titulo(ticket.getTitulo())
                .descripcion(ticket.getDescripcion())
                .estado(ticket.getEstado())
                .prioridad(ticket.getPrioridad())
                .categoria(categoria)
                .nombreCliente(nombreCliente)
                .nombreAgente(nombreAgente)
                .puedeVer(enlace.getPuedeVer())
                .puedeComentar(enlace.getPuedeComentar())
                .puedeVerAdjuntos(
                        enlace.getPuedeVerAdjuntos()
                )
                .puedeSubirAdjuntos(
                        enlace.getPuedeSubirAdjuntos()
                )
                .puedeCambiarEstado(
                        enlace.getPuedeCambiarEstado()
                )
                .fechaCreacion(ticket.getFechaCreacion())
                .fechaExpiracion(
                        enlace.getFechaExpiracion()
                )
                .build();
    }

    private void validarPermisoParaCompartir(
            Ticket ticket,
            Usuario usuario) {

        if (ticket == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No se encontró el ticket"
            );
        }

        if (usuario == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró el usuario autenticado"
            );
        }
    }

    private String generarTokenSeguro() {
        return UUID.randomUUID()
                + "-"
                + UUID.randomUUID();
    }

    private String construirUrlCompartida(
            String token) {

        String frontendUrl = appProperties.getUrl();

        if (frontendUrl == null
                || frontendUrl.isBlank()) {

            frontendUrl = "http://localhost:8081";
        }

        String urlBase = frontendUrl.trim();

        while (urlBase.endsWith("/")) {
            urlBase = urlBase.substring(
                    0,
                    urlBase.length() - 1
            );
        }

        return urlBase
                + "/ticket-compartido.html?token="
                + token;
    }

    private boolean valorBooleano(
            Boolean valor,
            boolean valorPredeterminado) {

        return valor != null
                ? valor
                : valorPredeterminado;
    }

    private String obtenerNombreCompleto(
            Usuario usuario) {

        if (usuario == null) {
            return "Sin información";
        }

        String nombre =
                usuario.getNombre() != null
                        ? usuario.getNombre().trim()
                        : "";

        String apellido =
                usuario.getApellido() != null
                        ? usuario.getApellido().trim()
                        : "";

        String nombreCompleto =
                (nombre + " " + apellido).trim();

        return nombreCompleto.isBlank()
                ? "Sin información"
                : nombreCompleto;
    }

    private EnlaceCompartidoResponseDTO convertirAResponse(
            EnlaceCompartido enlace) {

        return EnlaceCompartidoResponseDTO.builder()
                .id(enlace.getId())
                .ticketId(
                        enlace.getTicket().getId()
                )
                .numeroTicket(
                        enlace.getTicket()
                                .getNumeroTicket()
                )
                .correoDestinatario(
                        enlace.getCorreoDestinatario()
                )
                .token(enlace.getToken())
                .enlace(
                        construirUrlCompartida(
                                enlace.getToken()
                        )
                )
                .puedeVer(enlace.getPuedeVer())
                .puedeComentar(
                        enlace.getPuedeComentar()
                )
                .puedeVerAdjuntos(
                        enlace.getPuedeVerAdjuntos()
                )
                .puedeSubirAdjuntos(
                        enlace.getPuedeSubirAdjuntos()
                )
                .puedeCambiarEstado(
                        enlace.getPuedeCambiarEstado()
                )
                .fechaCreacion(
                        enlace.getFechaCreacion()
                )
                .fechaExpiracion(
                        enlace.getFechaExpiracion()
                )
                .activo(enlace.getActivo())
                .build();
    }
}