package com.practica.gestionincidencias.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.practica.gestionincidencias.entity.SolicitudRecurso;
import com.practica.gestionincidencias.repository.SolicitudRecursoRepository;

@Service
public class AlertaRecursoRetrasadoService {

    private final SolicitudRecursoRepository solicitudRecursoRepository;
    private final NotificacionService notificacionService;

    public AlertaRecursoRetrasadoService(
            SolicitudRecursoRepository solicitudRecursoRepository,
            NotificacionService notificacionService) {

        this.solicitudRecursoRepository = solicitudRecursoRepository;
        this.notificacionService = notificacionService;
    }

    /*
     * Revisa periódicamente las solicitudes cuya fecha estimada venció.
     * La frecuencia puede cambiarse desde application.properties.
     */
    @Scheduled(
            fixedDelayString = "${app.recursos.retrasos.intervalo-ms:3600000}",
            initialDelayString = "${app.recursos.retrasos.delay-inicial-ms:60000}"
    )
    @Transactional
    public void revisarSolicitudesRetrasadas() {

        List<SolicitudRecurso> pendientes =
                solicitudRecursoRepository
                        .findSolicitudesRetrasadasPendientesNotificacion();

        for (SolicitudRecurso solicitud : pendientes) {

            if (solicitud == null
                    || !solicitud.estaRetrasada()) {

                continue;
            }

            boolean enviada =
                    notificacionService
                            .notificarRecursoRetrasado(solicitud);

            if (!enviada) {
                continue;
            }

            solicitud.setFechaNotificacionRetraso(
                    LocalDateTime.now()
            );

            solicitudRecursoRepository.save(solicitud);
        }
    }
}
