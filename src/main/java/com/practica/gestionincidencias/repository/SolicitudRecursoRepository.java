package com.practica.gestionincidencias.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.practica.gestionincidencias.entity.SolicitudRecurso;

public interface SolicitudRecursoRepository
        extends JpaRepository<SolicitudRecurso, Integer> {

    Optional<SolicitudRecurso> findByTicketId(Integer ticketId);

    boolean existsByTicketId(Integer ticketId);


    /*
     * Busca solicitudes cuya fecha base de entrega ya venció.
     *
     * Si existe fecha_estimada_entrega_original,
     * utiliza esa fecha.
     *
     * Para registros antiguos que todavía no tengan
     * fecha original, utiliza fecha_estimada_entrega.
     */
    @Query("""
            SELECT s
            FROM SolicitudRecurso s
            WHERE
                COALESCE(
                    s.fechaEstimadaEntregaOriginal,
                    s.fechaEstimadaEntrega
                ) < :fecha
            AND s.estadoRecurso NOT IN :estadosExcluidos
            """)
    List<SolicitudRecurso> buscarSolicitudesRetrasadas(
            @Param("fecha") LocalDateTime fecha,
            @Param("estadosExcluidos")
            Set<String> estadosExcluidos
    );


    default List<SolicitudRecurso>
            findSolicitudesRetrasadas() {

        return buscarSolicitudesRetrasadas(
                LocalDateTime.now(),
                Set.of(
                        "RECIBIDO",
                        "ENTREGADO",
                        "CERRADO",
                        "CANCELADO"
                )
        );
    }


    /*
     * Igual que la consulta anterior, pero solo devuelve
     * solicitudes a las que todavía no se les haya enviado
     * la notificación automática de retraso.
     */
    @Query("""
            SELECT s
            FROM SolicitudRecurso s
            WHERE
                COALESCE(
                    s.fechaEstimadaEntregaOriginal,
                    s.fechaEstimadaEntrega
                ) < :fecha
            AND s.fechaNotificacionRetraso IS NULL
            AND s.estadoRecurso NOT IN :estadosExcluidos
            """)
    List<SolicitudRecurso>
            buscarSolicitudesRetrasadasPendientesNotificacion(
                    @Param("fecha")
                    LocalDateTime fecha,

                    @Param("estadosExcluidos")
                    Set<String> estadosExcluidos
            );


    default List<SolicitudRecurso>
            findSolicitudesRetrasadasPendientesNotificacion() {

        return buscarSolicitudesRetrasadasPendientesNotificacion(
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