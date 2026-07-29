package com.practica.gestionincidencias.controller;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
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
import com.practica.gestionincidencias.dto.TicketRequestDTO;
import com.practica.gestionincidencias.dto.TicketResponseDTO;
import com.practica.gestionincidencias.entity.HistorialTicket;
import com.practica.gestionincidencias.entity.Ticket;
import com.practica.gestionincidencias.entity.TipoIncidencia;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.repository.HistorialTicketRepository;
import com.practica.gestionincidencias.repository.TicketRepository;
import com.practica.gestionincidencias.repository.TipoIncidenciaRepository;
import com.practica.gestionincidencias.repository.UsuarioRepository;
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
    private final HistorialTicketRepository historialTicketRepository;
    private final NotificacionService notificacionService;

    public TicketController(
            TicketRepository ticketRepository,
            TipoIncidenciaRepository tipoIncidenciaRepository,
            UsuarioRepository usuarioRepository,
            HistorialTicketRepository historialTicketRepository,
            NotificacionService notificacionService) {

        this.ticketRepository = ticketRepository;
        this.tipoIncidenciaRepository = tipoIncidenciaRepository;
        this.usuarioRepository = usuarioRepository;
        this.historialTicketRepository = historialTicketRepository;
        this.notificacionService = notificacionService;
    }

    @GetMapping
    public List<TicketResponseDTO> listarTickets() {

        return ticketRepository.findAll()
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketResponseDTO crearTicket(
            @Valid @RequestBody TicketRequestDTO request) {

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

        String numeroTicket =
                generarNumeroTicket();

        String prioridadCalculada =
                calcularPrioridad(
                        request.getImpacto(),
                        request.getUrgencia()
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

        registrarHistorial(
                ticketGuardado,
                cliente,
                "CREACION_TICKET",
                null,
                "NUEVO",
                "Se creó el ticket "
                        + ticketGuardado.getNumeroTicket()
        );

        notificacionService
                .notificarTicketCreado(ticketGuardado);

        return convertirADTO(ticketGuardado);
    }

    @PutMapping("/{id}/asignar")
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

        Usuario agente =
                usuarioRepository
                        .findById(request.getAgenteId())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Agente no encontrado."
                                )
                        );

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
                agente,
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
                    agente,
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
                (
                        nuevoEstado.equals("RESUELTO")
                                || nuevoEstado.equals("CERRADO")
                )
                        && ticket.getFechaResolucion() == null
        ) {

            ticket.setFechaResolucion(ahora);

            evaluarCumplimientoResolucion(ticket);
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
                ticketActualizado.getAgenteAsignado(),
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
                usuarioRepository
                        .findById(request.getUsuarioId())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Usuario no encontrado."
                                )
                        );

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

        /*
         * Los tickets creados antes de implementar SLA
         * pueden tener la fecha límite en null.
         */
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
                        || ticket.getFechaLimiteResolucion() == null;

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

                ticket.getEstado(),
                ticket.getPrioridad(),
                ticket.getSeveridad(),
                ticket.getCriticidad(),
                ticket.getImpacto(),
                ticket.getUrgencia(),

                ticket.getFechaCreacion(),
                ticket.getFechaActualizacion(),
                ticket.getFechaResolucion(),

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