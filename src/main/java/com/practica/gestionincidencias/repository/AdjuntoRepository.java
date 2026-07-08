package com.practica.gestionincidencias.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practica.gestionincidencias.entity.Adjunto;

public interface AdjuntoRepository extends JpaRepository<Adjunto, Integer> {

    List<Adjunto> findByTicketIdOrderByFechaSubidaDesc(Integer ticketId);
}