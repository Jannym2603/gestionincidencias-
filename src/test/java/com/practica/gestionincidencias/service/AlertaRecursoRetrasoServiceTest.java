package com.practica.gestionincidencias.service;

import com.practica.gestionincidencias.entity.SolicitudRecurso;
import com.practica.gestionincidencias.repository.SolicitudRecursoRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlertaRecursoRetrasadoServiceTest {

    @Mock
    private SolicitudRecursoRepository solicitudRecursoRepository;

    @Mock
    private NotificacionService notificacionService;

    @InjectMocks
    private AlertaRecursoRetrasadoService alertaRecursoRetrasadoService;

    private SolicitudRecurso solicitudRetrasada;


    @BeforeEach
    void prepararDatos() {

        solicitudRetrasada =
                new SolicitudRecurso();

        solicitudRetrasada.setEstadoRecurso(
                "ESPERANDO_PROVEEDOR"
        );

        solicitudRetrasada.setFechaEstimadaEntrega(
                LocalDateTime.now()
                        .minusDays(1)
        );

        solicitudRetrasada.setFechaNotificacionRetraso(
                null
        );
    }


    @Test
    void debeEnviarAlertaCuandoExisteSolicitudRetrasada() {

        when(
                solicitudRecursoRepository
                        .findSolicitudesRetrasadasPendientesNotificacion()
        )
                .thenReturn(
                        List.of(
                                solicitudRetrasada
                        )
                );

        when(
                notificacionService
                        .notificarRecursoRetrasado(
                                solicitudRetrasada
                        )
        )
                .thenReturn(true);


        alertaRecursoRetrasadoService
                .revisarSolicitudesRetrasadas();


        verify(
                notificacionService,
                times(1)
        )
                .notificarRecursoRetrasado(
                        solicitudRetrasada
                );
    }


    @Test
    void debeGuardarFechaDeNotificacionCuandoCorreoFueEnviado() {

        when(
                solicitudRecursoRepository
                        .findSolicitudesRetrasadasPendientesNotificacion()
        )
                .thenReturn(
                        List.of(
                                solicitudRetrasada
                        )
                );

        when(
                notificacionService
                        .notificarRecursoRetrasado(
                                solicitudRetrasada
                        )
        )
                .thenReturn(true);


        alertaRecursoRetrasadoService
                .revisarSolicitudesRetrasadas();


        assertNotNull(
                solicitudRetrasada
                        .getFechaNotificacionRetraso()
        );

        verify(
                solicitudRecursoRepository,
                times(1)
        )
                .save(
                        solicitudRetrasada
                );
    }


    @Test
    void noDebeGuardarSolicitudCuandoCorreoNoFueEnviado() {

        when(
                solicitudRecursoRepository
                        .findSolicitudesRetrasadasPendientesNotificacion()
        )
                .thenReturn(
                        List.of(
                                solicitudRetrasada
                        )
                );

        when(
                notificacionService
                        .notificarRecursoRetrasado(
                                solicitudRetrasada
                        )
        )
                .thenReturn(false);


        alertaRecursoRetrasadoService
                .revisarSolicitudesRetrasadas();


        verify(
                solicitudRecursoRepository,
                never()
        )
                .save(
                        any(
                                SolicitudRecurso.class
                        )
                );
    }


    @Test
    void noDebeEnviarCorreoSiNoHaySolicitudesRetrasadas() {

        when(
                solicitudRecursoRepository
                        .findSolicitudesRetrasadasPendientesNotificacion()
        )
                .thenReturn(
                        List.of()
                );


        alertaRecursoRetrasadoService
                .revisarSolicitudesRetrasadas();


        verify(
                notificacionService,
                never()
        )
                .notificarRecursoRetrasado(
                        any(
                                SolicitudRecurso.class
                        )
                );

        verify(
                solicitudRecursoRepository,
                never()
        )
                .save(
                        any(
                                SolicitudRecurso.class
                        )
                );
    }


    @Test
    void noDebeEnviarCorreoSiSolicitudYaNoEstaRetrasada() {

        solicitudRetrasada.setFechaEstimadaEntrega(
                LocalDateTime.now()
                        .plusDays(2)
        );

        when(
                solicitudRecursoRepository
                        .findSolicitudesRetrasadasPendientesNotificacion()
        )
                .thenReturn(
                        List.of(
                                solicitudRetrasada
                        )
                );


        alertaRecursoRetrasadoService
                .revisarSolicitudesRetrasadas();


        verify(
                notificacionService,
                never()
        )
                .notificarRecursoRetrasado(
                        any(
                                SolicitudRecurso.class
                        )
                );

        verify(
                solicitudRecursoRepository,
                never()
        )
                .save(
                        any(
                                SolicitudRecurso.class
                        )
                );
    }
}