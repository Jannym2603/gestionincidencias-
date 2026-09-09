package com.practica.gestionincidencias.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practica.gestionincidencias.entity.HistorialTicket;

public interface HistorialTicketRepository extends JpaRepository<HistorialTicket, Integer> {

    List<HistorialTicket> findByTicketIdOrderByFechaCreacionDesc(Integer ticketId);
}
