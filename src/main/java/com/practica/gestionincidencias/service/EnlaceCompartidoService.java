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

    private static final int DIAS_EXPIRACION_PREDETERMINADA = 7;
    private static final int DIAS_EXPIRACION_MAXIMA = 30;

    private final EnlaceCompartidoRepository enlaceRepository;
    private final TicketRepository ticketRepository;
    private final UsuarioRepository usuarioRepository;
    private final NotificacionService notificacionService;
    private final AppProperties appProperties;
    private final AccesoProyectoService accesoProyectoService;

    public EnlaceCompartidoService(
            EnlaceCompartidoRepository enlaceRepository,
            TicketRepository ticketRepository,
            UsuarioRepository usuarioRepository,
            NotificacionService notificacionService,
            AppProperties appProperties,
            AccesoProyectoService accesoProyectoService) {

        this.enlaceRepository = enlaceRepository;
        this.ticketRepository = ticketRepository;
        this.usuarioRepository = usuarioRepository;
        this.notificacionService = notificacionService;
        this.appProperties = appProperties;
        this.accesoProyectoService = accesoProyectoService;
    }

    @Transactional
    public EnlaceCompartidoResponseDTO crearEnlace(
            Integer ticketId,
            Integer usuarioId,
            CrearEnlaceCompartidoRequestDTO request) {

        Ticket ticket = obtenerTicket(ticketId);
        Usuario usuario = obtenerUsuario(usuarioId);

        validarPermisoParaCompartir(
                ticket,
                usuario
        );

        LocalDateTime ahora =
                LocalDateTime.now();

        LocalDateTime fechaExpiracion =
                resolverFechaExpiracion(
                        request.getFechaExpiracion(),
                        ahora
                );

        String correoDestinatario =
                request.getCorreoDestinatario() == null
                        ? ""
                        : request.getCorreoDestinatario()
                                .trim()
                                .toLowerCase();

        if (correoDestinatario.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El correo del destinatario es obligatorio."
            );
        }

        /*
         * Por seguridad los enlaces externos quedan en modo
         * SOLO LECTURA.
         *
         * No confiamos en los booleanos que pudiera enviar
         * manualmente el navegador.
         */
        EnlaceCompartido enlace =
                EnlaceCompartido.builder()
                        .ticket(ticket)
                        .creadoPor(usuario)
                        .correoDestinatario(
                                correoDestinatario
                        )
                        .token(generarTokenSeguro())
                        .puedeVer(true)
                        .puedeComentar(false)
                        .puedeVerAdjuntos(false)
                        .puedeSubirAdjuntos(false)
                        .puedeCambiarEstado(false)
                        .fechaCreacion(ahora)
                        .fechaExpiracion(
                                fechaExpiracion
                        )
                        .activo(true)
                        .build();

        EnlaceCompartido enlaceGuardado =
                enlaceRepository.save(enlace);

        String urlCompartida =
                construirUrlCompartida(
                        enlaceGuardado.getToken()
                );

        /*
         * NotificacionService ya maneja internamente
         * los errores de correo sin romper la creación
         * del enlace.
         */
        notificacionService.notificarEnlaceCompartido(
                enlaceGuardado,
                urlCompartida
        );

        return convertirAResponse(
                enlaceGuardado
        );
    }

    @Transactional(readOnly = true)
    public List<EnlaceCompartidoResponseDTO> listarPorTicket(
            Integer ticketId,
            Integer usuarioId) {

        Ticket ticket = obtenerTicket(ticketId);
        Usuario usuario = obtenerUsuario(usuarioId);

        validarPermisoParaCompartir(
                ticket,
                usuario
        );

        return enlaceRepository
                .findByTicketIdOrderByFechaCreacionDesc(
                        ticketId
                )
                .stream()
                .map(this::convertirAResponse)
                .toList();
    }

    @Transactional
    public EnlaceCompartidoResponseDTO desactivarEnlace(
            Long enlaceId,
            Integer usuarioId) {

        EnlaceCompartido enlace =
                enlaceRepository
                        .findById(enlaceId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "No se encontró el enlace compartido."
                                )
                        );

        Usuario usuario =
                obtenerUsuario(usuarioId);

        validarPermisoParaCompartir(
                enlace.getTicket(),
                usuario
        );

        if (!Boolean.TRUE.equals(
                enlace.getActivo()
        )) {
            return convertirAResponse(
                    enlace
            );
        }

        enlace.setActivo(false);

        EnlaceCompartido actualizado =
                enlaceRepository.save(enlace);

        return convertirAResponse(
                actualizado
        );
    }

    @Transactional(readOnly = true)
    public EnlaceCompartido obtenerEnlaceValido(
            String token) {

        if (token == null
                || token.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El token del enlace es obligatorio."
            );
        }

        EnlaceCompartido enlace =
                enlaceRepository
                        .findByToken(
                                token.trim()
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "El enlace no existe."
                                )
                        );

        if (!Boolean.TRUE.equals(
                enlace.getActivo()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "El enlace fue desactivado."
            );
        }

        LocalDateTime fechaExpiracion =
                enlace.getFechaExpiracion();

        if (
                fechaExpiracion != null
                        &&
                !LocalDateTime.now()
                        .isBefore(
                                fechaExpiracion
                        )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "El enlace ha expirado."
            );
        }

        if (!Boolean.TRUE.equals(
                enlace.getPuedeVer()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "El enlace no permite ver el ticket."
            );
        }

        if (
                enlace.getTicket() == null
                        ||
                !Boolean.TRUE.equals(
                        enlace.getTicket()
                                .getProyecto()
                                .getEstado()
                )
                        ||
                enlace.getTicket()
                                .getProyecto()
                                .getCompania()
                        == null
                        ||
                !Boolean.TRUE.equals(
                        enlace.getTicket()
                                .getProyecto()
                                .getCompania()
                                .getEstado()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "El proyecto del ticket no está disponible."
            );
        }

        return enlace;
    }

    @Transactional(readOnly = true)
    public TicketCompartidoResponseDTO consultarTicketCompartido(
            String token) {

        EnlaceCompartido enlace =
                obtenerEnlaceValido(token);

        Ticket ticket =
                enlace.getTicket();

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
                        ? ticket.getTipoIncidencia()
                                .getNombre()
                        : "Sin categoría";

        return TicketCompartidoResponseDTO.builder()
                .ticketId(ticket.getId())
                .numeroTicket(
                        ticket.getNumeroTicket()
                )
                .titulo(ticket.getTitulo())
                .descripcion(
                        ticket.getDescripcion()
                )
                .estado(ticket.getEstado())
                .prioridad(
                        ticket.getPrioridad()
                )
                .categoria(categoria)
                .nombreCliente(nombreCliente)
                .nombreAgente(nombreAgente)
                .puedeVer(true)
                .puedeComentar(false)
                .puedeVerAdjuntos(false)
                .puedeSubirAdjuntos(false)
                .puedeCambiarEstado(false)
                .fechaCreacion(
                        ticket.getFechaCreacion()
                )
                .fechaExpiracion(
                        enlace.getFechaExpiracion()
                )
                .build();
    }

    /*
     * Defensa en profundidad:
     * no basta con que el endpoint tenga @PreAuthorize.
     *
     * ADMIN puede compartir cualquier ticket.
     * SUPERVISOR únicamente tickets pertenecientes
     * a proyectos a los que tiene acceso.
     */
    private void validarPermisoParaCompartir(
            Ticket ticket,
            Usuario usuario) {

        if (ticket == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No se encontró el ticket."
            );
        }

        if (usuario == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "No se encontró el usuario autenticado."
            );
        }

        String rol =
                accesoProyectoService
                        .obtenerRol(usuario);

        if (
                !"ADMIN".equals(rol)
                        &&
                !"SUPERVISOR".equals(rol)
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tu rol no puede compartir tickets."
            );
        }

        accesoProyectoService
                .validarAccesoTicket(
                        usuario,
                        rol,
                        ticket
                );
    }

    private Ticket obtenerTicket(
            Integer ticketId) {

        return ticketRepository
                .findById(ticketId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "No se encontró el ticket."
                        )
                );
    }

    private Usuario obtenerUsuario(
            Integer usuarioId) {

        return usuarioRepository
                .findById(usuarioId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "No se encontró el usuario autenticado."
                        )
                );
    }

    private LocalDateTime resolverFechaExpiracion(
            LocalDateTime solicitada,
            LocalDateTime ahora) {

        LocalDateTime limiteMaximo =
                ahora.plusDays(
                        DIAS_EXPIRACION_MAXIMA
                );

        if (solicitada == null) {
            return ahora.plusDays(
                    DIAS_EXPIRACION_PREDETERMINADA
            );
        }

        if (!solicitada.isAfter(ahora)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La fecha de expiración debe ser posterior a la fecha actual."
            );
        }

        if (solicitada.isAfter(
                limiteMaximo
        )) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El enlace no puede tener una vigencia mayor a 30 días."
            );
        }

        return solicitada;
    }

    private String generarTokenSeguro() {

        return UUID.randomUUID()
                + "-"
                + UUID.randomUUID();
    }

    private String construirUrlCompartida(
            String token) {

        String frontendUrl =
                appProperties.getUrl();

        if (
                frontendUrl == null
                        ||
                frontendUrl.isBlank()
        ) {
            frontendUrl =
                    "http://localhost:8081";
        }

        String urlBase =
                frontendUrl.trim();

        while (
                urlBase.endsWith("/")
        ) {
            urlBase =
                    urlBase.substring(
                            0,
                            urlBase.length() - 1
                    );
        }

        return urlBase
                + "/ticket-compartido.html?token="
                + token;
    }

    private String obtenerNombreCompleto(
            Usuario usuario) {

        if (usuario == null) {
            return "Sin información";
        }

        String nombre =
                usuario.getNombre() != null
                        ? usuario.getNombre()
                                .trim()
                        : "";

        String apellido =
                usuario.getApellido() != null
                        ? usuario.getApellido()
                                .trim()
                        : "";

        String nombreCompleto =
                (nombre + " " + apellido)
                        .trim();

        return nombreCompleto.isBlank()
                ? "Sin información"
                : nombreCompleto;
    }

    private EnlaceCompartidoResponseDTO convertirAResponse(
            EnlaceCompartido enlace) {

        return EnlaceCompartidoResponseDTO.builder()
                .id(enlace.getId())
                .ticketId(
                        enlace.getTicket()
                                .getId()
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
                .puedeVer(true)
                .puedeComentar(false)
                .puedeVerAdjuntos(false)
                .puedeSubirAdjuntos(false)
                .puedeCambiarEstado(false)
                .fechaCreacion(
                        enlace.getFechaCreacion()
                )
                .fechaExpiracion(
                        enlace.getFechaExpiracion()
                )
                .activo(
                        enlace.getActivo()
                )
                .build();
    }
}
