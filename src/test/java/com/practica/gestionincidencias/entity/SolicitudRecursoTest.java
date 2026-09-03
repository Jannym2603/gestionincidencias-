package com.practica.gestionincidencias.entity;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SolicitudRecursoTest {

    @Test
    void debeEstarRetrasadaCuandoLaFechaYaVencio() {

        // 1. Creamos una solicitud de recurso para la prueba
        SolicitudRecurso solicitud =
                new SolicitudRecurso();

        // 2. Indicamos que todavía está esperando al proveedor
        solicitud.setEstadoRecurso(
                "ESPERANDO_PROVEEDOR"
        );

        // 3. Colocamos una fecha que ya pasó
        solicitud.setFechaEstimadaEntrega(
                LocalDateTime.now()
                        .minusDays(1)
        );

        // 4. Verificamos que el sistema la detecte como retrasada
        assertTrue(
                solicitud.estaRetrasada()
        );
    }


    @Test
    void noDebeEstarRetrasadaCuandoLaFechaTodaviaNoVence() {

        SolicitudRecurso solicitud =
                new SolicitudRecurso();

        solicitud.setEstadoRecurso(
                "ESPERANDO_PROVEEDOR"
        );

        // Fecha futura
        solicitud.setFechaEstimadaEntrega(
                LocalDateTime.now()
                        .plusDays(2)
        );

        assertFalse(
                solicitud.estaRetrasada()
        );
    }


    @Test
    void noDebeEstarRetrasadaCuandoNoTieneFechaEstimada() {

        SolicitudRecurso solicitud =
                new SolicitudRecurso();

        solicitud.setEstadoRecurso(
                "ESPERANDO_PROVEEDOR"
        );

        solicitud.setFechaEstimadaEntrega(
                null
        );

        assertFalse(
                solicitud.estaRetrasada()
        );
    }


    @Test
    void noDebeEstarRetrasadaCuandoYaFueRecibida() {

        SolicitudRecurso solicitud =
                new SolicitudRecurso();

        solicitud.setEstadoRecurso(
                "RECIBIDO"
        );

        // Aunque la fecha haya vencido,
        // ya fue recibido y no debe considerarse retrasado
        solicitud.setFechaEstimadaEntrega(
                LocalDateTime.now()
                        .minusDays(3)
        );

        assertFalse(
                solicitud.estaRetrasada()
        );
    }


    @Test
    void noDebeEstarRetrasadaCuandoEstaCerrada() {

        SolicitudRecurso solicitud =
                new SolicitudRecurso();

        solicitud.setEstadoRecurso(
                "CERRADO"
        );

        solicitud.setFechaEstimadaEntrega(
                LocalDateTime.now()
                        .minusDays(5)
        );

        assertFalse(
                solicitud.estaRetrasada()
        );
    }


    @Test
    void noDebeEstarRetrasadaCuandoEstaCancelada() {

        SolicitudRecurso solicitud =
                new SolicitudRecurso();

        solicitud.setEstadoRecurso(
                "CANCELADO"
        );

        solicitud.setFechaEstimadaEntrega(
                LocalDateTime.now()
                        .minusDays(2)
        );

        assertFalse(
                solicitud.estaRetrasada()
        );
    }
}