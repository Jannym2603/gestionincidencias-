package com.practica.gestionincidencias.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.practica.gestionincidencias.entity.Ticket;

public interface TicketRepository extends JpaRepository<Ticket, Integer> {

    long countByNumeroTicketStartingWith(String prefijo);

    long countByEstado(String estado);

    long countByPrioridad(String prioridad);

    @Query("SELECT t.estado, COUNT(t) FROM Ticket t GROUP BY t.estado")
    List<Object[]> contarTicketsPorEstado();

    @Query("SELECT t.prioridad, COUNT(t) FROM Ticket t GROUP BY t.prioridad")
    List<Object[]> contarTicketsPorPrioridad();

    @Query("SELECT t.tipoIncidencia.nombre, COUNT(t) FROM Ticket t GROUP BY t.tipoIncidencia.nombre")
    List<Object[]> contarTicketsPorTipoIncidencia();
}