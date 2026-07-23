package com.practica.gestionincidencias.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.practica.gestionincidencias.entity.IntegracionAranda;

public interface IntegracionArandaRepository
        extends JpaRepository<IntegracionAranda, Long> {

    Optional<IntegracionAranda> findByTicketId(
            Integer ticketId
    );

    Optional<IntegracionAranda> findByArandaItemId(
            Long arandaItemId
    );

    boolean existsByTicketId(
            Integer ticketId
    );
}