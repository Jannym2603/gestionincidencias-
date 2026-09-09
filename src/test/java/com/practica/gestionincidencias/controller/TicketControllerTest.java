package com.practica.gestionincidencias.controller;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.practica.gestionincidencias.dto.AsignarTicketRequestDTO;
import com.practica.gestionincidencias.entity.Proyecto;
import com.practica.gestionincidencias.entity.Ticket;
import com.practica.gestionincidencias.entity.TipoIncidencia;
import com.practica.gestionincidencias.entity.Usuario;
import com.practica.gestionincidencias.repository.HistorialTicketRepository;
import com.practica.gestionincidencias.repository.ProyectoRepository;
import com.practica.gestionincidencias.repository.SolicitudRecursoRepository;
import com.practica.gestionincidencias.repository.TicketRepository;
import com.practica.gestionincidencias.repository.TipoIncidenciaRepository;
import com.practica.gestionincidencias.repository.UsuarioProyectoRepository;
import com.practica.gestionincidencias.repository.UsuarioRepository;
import com.practica.gestionincidencias.service.AccesoProyectoService;
import com.practica.gestionincidencias.service.NotificacionService;


@ExtendWith(MockitoExtension.class)
class TicketControllerTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private TipoIncidenciaRepository tipoIncidenciaRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private ProyectoRepository proyectoRepository;

    @Mock
    private SolicitudRecursoRepository solicitudRecursoRepository;

    @Mock
    private UsuarioProyectoRepository usuarioProyectoRepository;

    @Mock
    private HistorialTicketRepository historialTicketRepository;

    @Mock
    private NotificacionService notificacionService;

    @Mock
    private AccesoProyectoService accesoProyectoService;


    private TicketController ticketController;

    private Ticket ticket;
    private Usuario agente;
    private Usuario administrador;
    private Proyecto proyecto;
    private Usuario cliente;
    private TipoIncidencia tipoIncidencia;


    @BeforeEach
    void prepararDatos() {

        ticketController =
                new TicketController(
                        ticketRepository,
                        tipoIncidenciaRepository,
                        usuarioRepository,
                        proyectoRepository,
                        solicitudRecursoRepository,
                        usuarioProyectoRepository,
                        historialTicketRepository,
                        notificacionService,
                        accesoProyectoService
                );


        proyecto =
                new Proyecto();

        proyecto.setId(10);
        proyecto.setNombre("Proyecto de prueba");
        proyecto.setEstado(true);


        cliente =
                new Usuario();

        cliente.setId(30);
        cliente.setNombre("Cliente");
        cliente.setApellido("Prueba");
        cliente.setCorreo("cliente@prueba.com");
        cliente.setEstado(true);


        tipoIncidencia =
                new TipoIncidencia();

        tipoIncidencia.setId(1);
        tipoIncidencia.setNombre("Problema técnico");
        tipoIncidencia.setEstado(true);


        ticket =
                new Ticket();

        ticket.setId(1);

        ticket.setNumeroTicket(
                "INC-2026-0001"
        );

        ticket.setTitulo(
                "Problema técnico"
        );

        ticket.setDescripcion(
                "Descripción de prueba"
        );

        ticket.setEstado(
                "NUEVO"
        );

        ticket.setPrioridad(
                "P3_MEDIA"
        );

        ticket.setTipoAtencion(
                "OPERATIVO"
        );

        ticket.setCliente(
                cliente
        );

        ticket.setTipoIncidencia(
                tipoIncidencia
        );

        ticket.setProyecto(
                proyecto
        );

        ticket.setFechaCreacion(
                LocalDateTime.now()
        );

        ticket.setFechaLimiteRespuesta(
                LocalDateTime.now().plusHours(4)
        );

        ticket.setFechaLimiteResolucion(
                LocalDateTime.now().plusHours(24)
        );

        ticket.setAgenteAsignado(
                null
        );


        agente =
                new Usuario();

        agente.setId(20);

        agente.setNombre(
                "Carlos"
        );

        agente.setApellido(
                "Pérez"
        );

        agente.setEstado(
                true
        );


        administrador =
                new Usuario();

        administrador.setId(1);

        administrador.setNombre(
                "Administrador"
        );

        administrador.setEstado(
                true
        );
    }


    /*
     * =====================================================
     * PRUEBA 1
     * Debe permitir asignar un agente válido.
     * =====================================================
     */
    @Test
    void debeAsignarAgenteAlTicket() {

        AsignarTicketRequestDTO request =
                new AsignarTicketRequestDTO();

        request.setAgenteId(
                agente.getId()
        );


        when(
                ticketRepository.findById(1)
        )
                .thenReturn(
                        Optional.of(ticket)
                );


        when(
                usuarioRepository.findById(
                        agente.getId()
                )
        )
                .thenReturn(
                        Optional.of(agente)
                );


        when(
                accesoProyectoService
                        .obtenerUsuarioAutenticado()
        )
                .thenReturn(
                        administrador
                );


        when(
                accesoProyectoService
                        .obtenerRol(
                                administrador
                        )
        )
                .thenReturn(
                        "ADMIN"
                );


        when(
                accesoProyectoService
                        .esRol(
                                agente,
                                "AGENTE"
                        )
        )
                .thenReturn(
                        true
                );


        when(
                accesoProyectoService
                        .usuarioTieneAccesoProyecto(
                                agente.getId(),
                                proyecto.getId()
                        )
        )
                .thenReturn(
                        true
                );


        /*
         * El controlador actual utiliza save(),
         * no saveAndFlush().
         *
         * Mockito debe devolver el mismo Ticket
         * que el controlador manda guardar.
         */
        when(
                ticketRepository.save(
                        any(Ticket.class)
                )
        )
                .thenAnswer(
                        invocation ->
                                invocation.getArgument(0)
                );


        ticketController.asignarTicket(
                1,
                request
        );


        /*
         * Verificamos que el agente
         * realmente quedó asignado.
         */
        assertNotNull(
                ticket.getAgenteAsignado()
        );


        assertEquals(
                agente.getId(),
                ticket.getAgenteAsignado()
                        .getId()
        );


        /*
         * Al asignar por primera vez un ticket NUEVO,
         * debe pasar automáticamente a ASIGNADO.
         */
        assertEquals(
                "ASIGNADO",
                ticket.getEstado()
        );


        /*
         * Verificamos que se guardó una sola vez.
         */
        verify(
                ticketRepository,
                times(1)
        )
                .save(
                        ticket
                );


        /*
         * También debe generarse historial.
         *
         * Al cambiar NUEVO -> ASIGNADO y asignar agente
         * normalmente se generan eventos de historial.
         */
        verify(
                historialTicketRepository,
                times(2)
        )
                .save(
                        any()
                );


        /*
         * Debe ejecutarse la notificación
         * de asignación.
         */
        verify(
                notificacionService,
                times(1)
        )
                .notificarTicketAsignado(
                        ticket,
                        agente
                );
    }


    /*
     * =====================================================
     * PRUEBA 2
     * No permitir agentes inactivos.
     * =====================================================
     */
    @Test
    void noDebeAsignarAgenteInactivo() {

        agente.setEstado(
                false
        );


        AsignarTicketRequestDTO request =
                new AsignarTicketRequestDTO();

        request.setAgenteId(
                agente.getId()
        );


        when(
                ticketRepository.findById(1)
        )
                .thenReturn(
                        Optional.of(ticket)
                );


        when(
                usuarioRepository.findById(
                        agente.getId()
                )
        )
                .thenReturn(
                        Optional.of(agente)
                );


        when(
                accesoProyectoService
                        .obtenerUsuarioAutenticado()
        )
                .thenReturn(
                        administrador
                );


        when(
                accesoProyectoService
                        .obtenerRol(
                                administrador
                        )
        )
                .thenReturn(
                        "ADMIN"
                );


        RuntimeException excepcion =
                assertThrows(
                        RuntimeException.class,
                        () ->
                                ticketController
                                        .asignarTicket(
                                                1,
                                                request
                                        )
                );


        assertEquals(
                "No se puede asignar el ticket a un agente inactivo.",
                excepcion.getMessage()
        );


        verify(
                ticketRepository,
                never()
        )
                .save(
                        any(Ticket.class)
                );


        verify(
                notificacionService,
                never()
        )
                .notificarTicketAsignado(
                        any(Ticket.class),
                        any(Usuario.class)
                );
    }


    /*
     * =====================================================
     * PRUEBA 3
     * No permitir un usuario que no tenga rol AGENTE.
     * =====================================================
     */
    @Test
    void noDebeAsignarUsuarioQueNoSeaAgente() {

        AsignarTicketRequestDTO request =
                new AsignarTicketRequestDTO();

        request.setAgenteId(
                agente.getId()
        );


        when(
                ticketRepository.findById(1)
        )
                .thenReturn(
                        Optional.of(ticket)
                );


        when(
                usuarioRepository.findById(
                        agente.getId()
                )
        )
                .thenReturn(
                        Optional.of(agente)
                );


        when(
                accesoProyectoService
                        .obtenerUsuarioAutenticado()
        )
                .thenReturn(
                        administrador
                );


        when(
                accesoProyectoService
                        .obtenerRol(
                                administrador
                        )
        )
                .thenReturn(
                        "ADMIN"
                );


        when(
                accesoProyectoService
                        .esRol(
                                agente,
                                "AGENTE"
                        )
        )
                .thenReturn(
                        false
                );


        RuntimeException excepcion =
                assertThrows(
                        RuntimeException.class,
                        () ->
                                ticketController
                                        .asignarTicket(
                                                1,
                                                request
                                        )
                );


        assertEquals(
                "El usuario seleccionado no tiene rol AGENTE.",
                excepcion.getMessage()
        );


        verify(
                ticketRepository,
                never()
        )
                .save(
                        any(Ticket.class)
                );


        verify(
                notificacionService,
                never()
        )
                .notificarTicketAsignado(
                        any(Ticket.class),
                        any(Usuario.class)
                );
    }


    /*
     * =====================================================
     * PRUEBA 4
     * No permitir un agente sin acceso al proyecto.
     * =====================================================
     */
    @Test
    void noDebeAsignarAgenteSinAccesoAlProyecto() {

        AsignarTicketRequestDTO request =
                new AsignarTicketRequestDTO();

        request.setAgenteId(
                agente.getId()
        );


        when(
                ticketRepository.findById(1)
        )
                .thenReturn(
                        Optional.of(ticket)
                );


        when(
                usuarioRepository.findById(
                        agente.getId()
                )
        )
                .thenReturn(
                        Optional.of(agente)
                );


        when(
                accesoProyectoService
                        .obtenerUsuarioAutenticado()
        )
                .thenReturn(
                        administrador
                );


        when(
                accesoProyectoService
                        .obtenerRol(
                                administrador
                        )
        )
                .thenReturn(
                        "ADMIN"
                );


        when(
                accesoProyectoService
                        .esRol(
                                agente,
                                "AGENTE"
                        )
        )
                .thenReturn(
                        true
                );


        when(
                accesoProyectoService
                        .usuarioTieneAccesoProyecto(
                                agente.getId(),
                                proyecto.getId()
                        )
        )
                .thenReturn(
                        false
                );


        RuntimeException excepcion =
                assertThrows(
                        RuntimeException.class,
                        () ->
                                ticketController
                                        .asignarTicket(
                                                1,
                                                request
                                        )
                );


        assertEquals(
                "El agente no tiene acceso al proyecto del ticket.",
                excepcion.getMessage()
        );


        verify(
                ticketRepository,
                never()
        )
                .save(
                        any(Ticket.class)
                );


        verify(
                notificacionService,
                never()
        )
                .notificarTicketAsignado(
                        any(Ticket.class),
                        any(Usuario.class)
                );
    }
}