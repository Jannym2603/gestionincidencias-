package com.practica.gestionincidencias.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practica.gestionincidencias.entity.SolicitudRecurso;

public interface SolicitudRecursoRepository
        extends JpaRepository<SolicitudRecurso, Integer> {

    Optional<SolicitudRecurso> findByTicketId(Integer ticketId);

    boolean existsByTicketId(Integer ticketId);

    /*
     * Permite consultar directamente desde la base de datos
     * las solicitudes cuya fecha estimada ya venció y que
     * todavía no se encuentran en un estado finalizado.
     */
    List<SolicitudRecurso>
            findByFechaEstimadaEntregaBeforeAndEstadoRecursoNotIn(
                    LocalDateTime fecha,
                    Set<String> estadosExcluidos
            );

    default List<SolicitudRecurso> findSolicitudesRetrasadas() {

        return findByFechaEstimadaEntregaBeforeAndEstadoRecursoNotIn(
                LocalDateTime.now(),
                Set.of(
                        "RECIBIDO",
                        "ENTREGADO",
                        "CERRADO",
                        "CANCELADO"
                )
        );
    }
    List<SolicitudRecurso>
            findByFechaEstimadaEntregaBeforeAndFechaNotificacionRetrasoIsNullAndEstadoRecursoNotIn(
                    LocalDateTime fecha,
                    Set<String> estadosExcluidos
            );

    default List<SolicitudRecurso>
            findSolicitudesRetrasadasPendientesNotificacion() {

        return findByFechaEstimadaEntregaBeforeAndFechaNotificacionRetrasoIsNullAndEstadoRecursoNotIn(
                LocalDateTime.now(),
                Set.of(
                        "RECIBIDO",
                        "ENTREGADO",
                        "CERRADO",
                        "CANCELADO"
                )
        );
    }

}
