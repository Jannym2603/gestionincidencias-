package com.practica.gestionincidencias.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.practica.gestionincidencias.entity.Ticket;

public interface TicketRepository
        extends JpaRepository<Ticket, Integer> {

    /*
     * Generación del número consecutivo del ticket.
     */
    long countByNumeroTicketStartingWith(
            String prefijo
    );

    /*
     * Conteos generales utilizados en reportes.
     */
    long countByEstado(
            String estado
    );

    long countByPrioridad(
            String prioridad
    );

    /*
     * Obtiene los tickets pertenecientes a una lista
     * de proyectos autorizados.
     *
     * Se utilizará para AGENTE y SUPERVISOR.
     */
    List<Ticket> findByProyectoIdInOrderByFechaCreacionDesc(
            List<Integer> proyectoIds
    );

    /*
     * Obtiene únicamente los tickets creados por un cliente
     * dentro de los proyectos a los que tiene acceso.
     */
    List<Ticket> findByClienteIdAndProyectoIdInOrderByFechaCreacionDesc(
            Integer clienteId,
            List<Integer> proyectoIds
    );

    /*
     * Obtiene los tickets de un proyecto específico.
     */
    List<Ticket> findByProyectoIdOrderByFechaCreacionDesc(
            Integer proyectoId
    );

    /*
     * Obtiene los tickets asignados a un agente,
     * limitados a los proyectos autorizados.
     */
    List<Ticket> findByAgenteAsignadoIdAndProyectoIdInOrderByFechaCreacionDesc(
            Integer agenteId,
            List<Integer> proyectoIds
    );

    /*
     * Reportes generales por estado.
     */
    @Query("""
            SELECT t.estado, COUNT(t)
            FROM Ticket t
            GROUP BY t.estado
            """)
    List<Object[]> contarTicketsPorEstado();

    /*
     * Reportes generales por prioridad.
     */
    @Query("""
            SELECT t.prioridad, COUNT(t)
            FROM Ticket t
            GROUP BY t.prioridad
            """)
    List<Object[]> contarTicketsPorPrioridad();

    /*
     * Reportes generales por tipo de incidencia.
     */
    @Query("""
            SELECT t.tipoIncidencia.nombre, COUNT(t)
            FROM Ticket t
            GROUP BY t.tipoIncidencia.nombre
            """)
    List<Object[]> contarTicketsPorTipoIncidencia();
}