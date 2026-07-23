package com.practica.gestionincidencias.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practica.gestionincidencias.entity.EnlaceCompartido;

public interface EnlaceCompartidoRepository
        extends JpaRepository<EnlaceCompartido, Long> {

    Optional<EnlaceCompartido> findByToken(String token);

    List<EnlaceCompartido> findByTicketIdOrderByFechaCreacionDesc(
            Integer ticketId
    );
}